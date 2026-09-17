import {
  adjacencyDistanceLimit,
  breakGrappleOutcome,
  degreeOfSuccess,
  grappleOutcome,
  isAdjacentShip,
  normalizeEngagementState,
  ramDamageAmounts,
  ramImpactProfile,
  shipCollisionDC,
  shipGrappleDC,
  shipManeuverSaveModifier
} from "../combat/index.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";
const SOCKET = `module.${MODULE_ID}`;
const ENGAGEMENT_PATH = `flags.${MODULE_ID}.combatEngagement`;
const PAIR_REQUEST = "combat-engagement-pair-request";
const PAIR_RESULT = "combat-engagement-pair-result";
const PENDING = new Map();
const DEGREE_LABEL = Object.freeze({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" });

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function activePrimaryGM() {
  return [...(game.users ?? [])]
    .filter((user) => user?.active && user?.isGM)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function userOwnsActor(user, actor) {
  if (!user || !actor) return false;
  if (user.isGM) return true;
  try { return actor.testUserPermission?.(user, "OWNER") === true; }
  catch (_error) { return false; }
}

function canUpdate(user, document) {
  if (!user || !document) return false;
  if (user.isGM) return true;
  try {
    if (typeof document.canUserModify === "function") return document.canUserModify(user, "update") === true;
    return document.testUserPermission?.(user, "OWNER") === true;
  } catch (_error) {
    return false;
  }
}

function combatant(reference) {
  if (reference?.documentName === "Combatant") return reference;
  if (!reference) return null;
  return game.combat?.combatants?.get?.(reference)
    ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.id === reference || entry.actorId === reference || entry.actor?.id === reference)
    ?? null;
}

function tokenCenter(entry) {
  const objectCenter = entry?.token?.object?.center;
  if (objectCenter) return { x: Number(objectCenter.x), y: Number(objectCenter.y) };
  const token = entry?.token;
  const size = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  return {
    x: Number(token?.x ?? 0) + Number(token?.width ?? 1) * size / 2,
    y: Number(token?.y ?? 0) + Number(token?.height ?? 1) * size / 2
  };
}

function distanceHexes(source, target) {
  const from = tokenCenter(source);
  const to = tokenCenter(target);
  try {
    const measured = canvas?.grid?.measurePath?.([from, to])?.distance;
    const unitsPerHex = Number(canvas?.scene?.grid?.distance ?? 1) || 1;
    if (Number.isFinite(Number(measured))) return Math.max(0, Number(measured) / unitsPerHex);
  } catch (_error) { /* fallback below */ }
  const pixelsPerHex = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  return Math.hypot(to.x - from.x, to.y - from.y) / pixelsPerHex;
}

function tokenDimensions(entry) {
  return {
    width: Math.max(1, Number(entry?.token?.width ?? 1) || 1),
    height: Math.max(1, Number(entry?.token?.height ?? 1) || 1)
  };
}

function adjacent(source, target) {
  const a = tokenDimensions(source);
  const b = tokenDimensions(target);
  return isAdjacentShip({
    distanceHexes: distanceHexes(source, target),
    sourceWidth: a.width,
    sourceHeight: a.height,
    targetWidth: b.width,
    targetHeight: b.height
  });
}

function engagementState(entry) {
  return normalizeEngagementState(entry?.flags?.[MODULE_ID]?.combatEngagement ?? {});
}

function isMoored(entry) {
  return Boolean(engagementState(entry).mooredTo);
}

function isMooredWith(entry, target) {
  return engagementState(entry).mooredTo === target?.id;
}

function navigatorActor(actor) {
  const reference = shipPayload(actor)?.crew?.stations?.navigator ?? null;
  if (!reference) return actor;
  return game.actors?.get?.(reference)
    ?? game.actors?.contents?.find?.((entry) => entry.uuid === reference || entry.name === reference)
    ?? actor;
}

function safeDerived(entry) {
  const ship = shipPayload(entry?.actor);
  if (!ship) throw new Error(`${entry?.name ?? "Ship"} has no Arkflight ship state.`);
  return { ship, derived: deriveShip(ship, SHIP_CATALOGS) };
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `engagement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pairState(kind, entry, other, options = {}) {
  const current = engagementState(entry);
  if (kind === "moor") {
    return normalizeEngagementState({
      mooredTo: other.id,
      boardingActive: false,
      boardingInitiator: null,
      boardingOpportunity: Boolean(options.boardingOpportunityFor === entry.id)
    });
  }
  if (kind === "board") {
    return normalizeEngagementState({
      ...current,
      mooredTo: other.id,
      boardingActive: true,
      boardingInitiator: options.initiatorId ?? entry.id
    });
  }
  return normalizeEngagementState({});
}

async function applyPairMutation(kind, source, target, options = {}) {
  if (!source || !target) throw new Error("Arkflight engagement pair could not be resolved.");
  if (kind === "moor") {
    if (isMoored(source) || isMoored(target)) throw new Error("One of these ships is already Moored.");
  } else if (!isMooredWith(source, target) || !isMooredWith(target, source)) {
    throw new Error("These ships are not mutually Moored.");
  }

  const updates = [
    source.update({ [ENGAGEMENT_PATH]: pairState(kind, source, target, options) }),
    target.update({ [ENGAGEMENT_PATH]: pairState(kind, target, source, options) })
  ];
  await Promise.all(updates);
  Hooks.callAll("arkflightCombatEngagementChanged", {
    combat: game.combat,
    kind,
    source,
    target,
    sourceState: engagementState(source),
    targetState: engagementState(target),
    options
  });
}

async function mutatePair(kind, source, target, options = {}, requesterUserId = game.user?.id ?? null) {
  if (canUpdate(game.user, source) && canUpdate(game.user, target)) {
    await applyPairMutation(kind, source, target, options);
    return true;
  }
  const gm = activePrimaryGM();
  if (!gm) throw new Error("An active GM is required to synchronize this ship engagement.");
  const id = requestId();
  const promise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      PENDING.delete(id);
      reject(new Error("The GM did not resolve the ship engagement request."));
    }, 8000);
    PENDING.set(id, { resolve, reject, timeout });
  });
  game.socket?.emit?.(SOCKET, {
    type: PAIR_REQUEST,
    requestId: id,
    userId: requesterUserId,
    combatId: game.combat?.id ?? null,
    sourceId: source.id,
    targetId: target.id,
    kind,
    options
  });
  return promise;
}

function preflight(resolver, sourceReference, targetReference) {
  const source = combatant(sourceReference);
  const target = combatant(targetReference);
  if (!source || !target) return Object.freeze({ ok: false, reason: "Choose two Arkflight ship combatants.", source, target });
  if (source.id === target.id) return Object.freeze({ ok: false, reason: "A ship cannot target itself.", source, target });
  if (!shipPayload(source.actor) || !shipPayload(target.actor)) return Object.freeze({ ok: false, reason: "Both combatants must be Arkflight ships.", source, target });

  if (resolver === "ramShip") {
    if (!adjacent(source, target)) return Object.freeze({ ok: false, reason: "Ram requires an adjacent ship.", source, target });
    if (isMoored(source) || isMoored(target)) return Object.freeze({ ok: false, reason: "A Moored ship cannot Ram.", source, target });
    const movementUsed = Number(game.arkflight?.combat?.state?.(source)?.mobility?.movement?.used ?? 0);
    if (movementUsed < 1) return Object.freeze({ ok: false, reason: "Ram requires at least 1 hex of movement this turn.", source, target });
  }

  if (resolver === "grappleShip") {
    if (!adjacent(source, target)) return Object.freeze({ ok: false, reason: "Grapple Ship requires an adjacent target.", source, target });
    if (isMoored(source) || isMoored(target)) return Object.freeze({ ok: false, reason: "One of these ships is already Moored.", source, target });
  }

  if (resolver === "breakGrapple" || resolver === "boardShip") {
    if (!isMooredWith(source, target) || !isMooredWith(target, source)) {
      return Object.freeze({ ok: false, reason: "Choose the ship currently Moored to this vessel.", source, target });
    }
    if (resolver === "boardShip" && engagementState(source).boardingActive) {
      return Object.freeze({ ok: false, reason: "Boarding is already active between these ships.", source, target });
    }
  }

  return Object.freeze({ ok: true, reason: null, source, target });
}

async function maneuverSaveRoll(target, dc, { label, requesterUserId }) {
  const { ship, derived } = safeDerived(target);
  const modifier = shipManeuverSaveModifier({ ship, derived });
  const roll = await new Roll("1d20 + @modifier", { modifier }).evaluate();
  const die = Number(roll.dice?.[0]?.total ?? roll.terms?.find?.((term) => term?.faces === 20)?.total ?? 0);
  const degree = degreeOfSuccess(Number(roll.total), die, dc);
  const esc = foundry.utils.escapeHTML;
  await roll.toMessage({
    user: requesterUserId,
    speaker: ChatMessage.getSpeaker({ actor: navigatorActor(target.actor) }),
    flavor: `<strong>${esc(target.name)} — Maneuver Save</strong><br>${esc(label)} · +${modifier} vs DC ${dc}: <strong>${DEGREE_LABEL[degree]}</strong>`
  });
  return Object.freeze({ roll, modifier, dc, degree });
}

async function postHullDamageCard({ target, amount, label, detail, requesterUserId, source = "collision" }) {
  const hullDamage = Math.max(0, Math.trunc(Number(amount) || 0));
  if (hullDamage <= 0) return null;
  const roll = await new Roll("@damage", { damage: hullDamage }).evaluate();
  const esc = foundry.utils.escapeHTML;
  await roll.toMessage({
    user: requesterUserId,
    speaker: ChatMessage.getSpeaker({ actor: target.actor }),
    flavor: `<strong>${esc(label)} — ${esc(target.name)}</strong><br>${esc(detail)}<br><strong>${hullDamage} Hull</strong> awaits Apply Damage.`,
    flags: {
      [MODULE_ID]: {
        shipDamage: {
          combatId: game.combat?.id ?? null,
          attackerId: null,
          targetId: target.id,
          targetActorId: target.actor?.id ?? null,
          targetName: target.name,
          weaponName: label,
          degree: 0,
          systemThreat: "hull",
          hullDamage,
          effectIds: [],
          effectSnapshots: [],
          source
        }
      }
    }
  });
  return roll;
}

async function resolveRam(source, target, { requesterUserId }) {
  const sourceData = safeDerived(source);
  const targetData = safeDerived(target);
  const sourceState = game.arkflight?.combat?.state?.(source);
  const movementUsed = Number(sourceState?.mobility?.movement?.used ?? 0);
  const hull = SHIP_CATALOGS.hulls?.[sourceData.ship.hull?.chassisId] ?? null;
  const ramship = Boolean(hull?.tags?.includes?.("ramship") || hull?.traits?.includes?.("ramship"));
  const profile = ramImpactProfile({ hullTier: hull?.data?.tier ?? 1, movementUsed, ramship });
  const dc = shipCollisionDC({ ship: sourceData.ship, derived: sourceData.derived });
  const save = await maneuverSaveRoll(target, dc, { label: `${source.name} attempts to Ram`, requesterUserId });
  const impactRoll = await new Roll(profile.formula).evaluate();
  const amounts = ramDamageAmounts({
    rolled: impactRoll.total,
    targetSaveDegree: save.degree,
    targetHardness: targetData.derived.stats?.hardness,
    attackerHardness: sourceData.derived.stats?.hardness,
    recoilFactor: profile.recoilFactor
  });

  const esc = foundry.utils.escapeHTML;
  await impactRoll.toMessage({
    user: requesterUserId,
    speaker: ChatMessage.getSpeaker({ actor: navigatorActor(source.actor) }),
    flavor: `<strong>${esc(source.name)} rams ${esc(target.name)}</strong><br>${profile.formula} impact · ${DEGREE_LABEL[save.degree]} Maneuver Save · target ${amounts.targetIncoming} before Hardness · recoil ${amounts.recoilIncoming} before Hardness.`
  });

  await postHullDamageCard({
    target,
    amount: amounts.targetHullDamage,
    label: "Ram Collision",
    detail: `${source.name} impact; ${amounts.targetIncoming} collision damage before ${Math.max(0, Number(targetData.derived.stats?.hardness) || 0)} Hardness.`,
    requesterUserId,
    source: "ram-target"
  });
  await postHullDamageCard({
    target: source,
    amount: amounts.attackerHullDamage,
    label: "Ram Recoil",
    detail: `${profile.ramship ? "Reinforced ramship recoil" : "Collision recoil"}; ${amounts.recoilIncoming} before ${Math.max(0, Number(sourceData.derived.stats?.hardness) || 0)} Hardness.`,
    requesterUserId,
    source: "ram-recoil"
  });

  Hooks.callAll("arkflightShipRamResolved", { combat: game.combat, source, target, save, profile, amounts });
  return Object.freeze({
    notes: Object.freeze([
      `Target Maneuver Save: ${DEGREE_LABEL[save.degree]} vs Collision DC ${dc}.`,
      `Ram impact ${profile.formula}: ${impactRoll.total}.`,
      `Target: ${amounts.targetHullDamage} Hull after Hardness; recoil: ${amounts.attackerHullDamage} Hull after Hardness. Damage is applied from chat.`
    ]),
    save,
    profile,
    amounts
  });
}

async function resolveGrapple(source, target, { requesterUserId }) {
  const sourceData = safeDerived(source);
  const dc = shipGrappleDC({ ship: sourceData.ship, derived: sourceData.derived });
  const save = await maneuverSaveRoll(target, dc, { label: `${source.name} throws grappling lines`, requesterUserId });
  const outcome = grappleOutcome(save.degree);
  if (outcome.moored) {
    await mutatePair("moor", source, target, {
      boardingOpportunityFor: outcome.boardingOpportunity ? source.id : null
    }, requesterUserId);
  }
  Hooks.callAll("arkflightShipGrappleResolved", { combat: game.combat, source, target, save, outcome });
  return Object.freeze({ notes: Object.freeze([`Target Maneuver Save: ${DEGREE_LABEL[save.degree]} vs Grapple DC ${dc}.`, outcome.label]), save, outcome });
}

async function resolveBreakGrapple(source, target, { requesterUserId }) {
  const targetData = safeDerived(target);
  const dc = shipGrappleDC({ ship: targetData.ship, derived: targetData.derived });
  const save = await maneuverSaveRoll(source, dc, { label: `${source.name} attempts to break the grapple`, requesterUserId });
  const outcome = breakGrappleOutcome(save.degree);
  if (outcome.escaped) await mutatePair("clear", source, target, {}, requesterUserId);
  Hooks.callAll("arkflightShipGrappleBreakResolved", { combat: game.combat, source, target, save, outcome });
  return Object.freeze({ notes: Object.freeze([`Maneuver Save: ${DEGREE_LABEL[save.degree]} vs Grapple DC ${dc}.`, outcome.label]), save, outcome });
}

async function resolveBoard(source, target, { requesterUserId }) {
  await mutatePair("board", source, target, { initiatorId: source.id }, requesterUserId);
  const esc = foundry.utils.escapeHTML;
  await ChatMessage.create({
    user: requesterUserId,
    speaker: ChatMessage.getSpeaker({ actor: source.actor }),
    content: `<div class="arkflight-chat-card"><strong>${esc(source.name)} boards ${esc(target.name)}</strong><hr><p>The ships are Moored and boarding is established. Resolve character-scale movement, attacks, initiative, and encounters with normal PF2e rules. Ship Combat keeps the paired vessels Moored until the grapple is broken.</p></div>`
  });
  Hooks.callAll("arkflightBoardingEstablished", { combat: game.combat, source, target });
  return Object.freeze({ notes: Object.freeze(["Boarding established. Character-scale play now uses normal PF2e rules while the ships remain Moored."]) });
}

async function resolve(resolver, sourceReference, targetReference, options = {}) {
  const check = preflight(resolver, sourceReference, targetReference);
  if (!check.ok) throw new Error(check.reason);
  const requesterUserId = options.requesterUserId ?? game.user?.id ?? null;
  if (resolver === "ramShip") return resolveRam(check.source, check.target, { requesterUserId });
  if (resolver === "grappleShip") return resolveGrapple(check.source, check.target, { requesterUserId });
  if (resolver === "breakGrapple") return resolveBreakGrapple(check.source, check.target, { requesterUserId });
  if (resolver === "boardShip") return resolveBoard(check.source, check.target, { requesterUserId });
  throw new Error(`Unknown Arkflight engagement resolver: ${resolver}`);
}

function eligibleTargets(resolver, sourceReference) {
  const source = combatant(sourceReference);
  if (!source) return Object.freeze([]);
  return Object.freeze([...game.combat?.combatants ?? []]
    .filter((target) => target.id !== source.id && shipPayload(target.actor))
    .filter((target) => preflight(resolver, source, target).ok));
}

async function handleSocket(payload) {
  if (!payload?.type) return;
  if (payload.type === PAIR_RESULT && payload.userId === game.user?.id) {
    const pending = PENDING.get(payload.requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    PENDING.delete(payload.requestId);
    if (payload.ok) pending.resolve(true);
    else pending.reject(new Error(payload.error ?? "Ship engagement mutation failed."));
    return;
  }

  if (payload.type !== PAIR_REQUEST || !game.user?.isGM) return;
  const primary = activePrimaryGM();
  if (!primary || primary.id !== game.user.id) return;
  const requester = game.users?.get?.(payload.userId) ?? null;
  const source = combatant(payload.sourceId);
  const target = combatant(payload.targetId);
  let ok = false;
  let error = null;
  try {
    if (!source || !target || payload.combatId !== game.combat?.id) throw new Error("Ship engagement request is stale.");
    if (!requester || !userOwnsActor(requester, source.actor)) throw new Error("Requester does not own the acting ship.");
    await applyPairMutation(payload.kind, source, target, payload.options ?? {});
    ok = true;
  } catch (err) {
    error = err?.message ?? "Ship engagement mutation failed.";
  }
  game.socket?.emit?.(SOCKET, {
    type: PAIR_RESULT,
    requestId: payload.requestId,
    userId: payload.userId,
    ok,
    error
  });
}

Hooks.once("init", () => {
  game.arkflight ??= {};
  game.arkflight.combatEngagement = Object.freeze({
    state: engagementState,
    isMoored,
    isMooredWith,
    distanceHexes,
    adjacencyLimit(sourceReference, targetReference) {
      const source = combatant(sourceReference);
      const target = combatant(targetReference);
      if (!source || !target) return 0;
      const a = tokenDimensions(source);
      const b = tokenDimensions(target);
      return adjacencyDistanceLimit({ sourceWidth: a.width, sourceHeight: a.height, targetWidth: b.width, targetHeight: b.height });
    },
    adjacent,
    preflight,
    eligibleTargets,
    resolve
  });
  game.socket?.on?.(SOCKET, handleSocket);
});
