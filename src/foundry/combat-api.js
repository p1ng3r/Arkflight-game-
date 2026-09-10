import {
  COMBAT_ACTIONS,
  beginCombatantTurn,
  createCombatantState,
  fireWeapon,
  headingStepDistance,
  normalizeHexHeading,
  persistentStrainPatch,
  purchaseManeuver,
  purchaseMovement,
  recordFacingChange,
  recordMovement,
  applyHardnessToDamage,
  shipWeaponAttackBonus,
  spendPoints,
  targetBearing,
  weaponDamageProfile,
  weaponReloadRemaining,
  weaponTargetingSolution,
  workTheGuns
} from "../combat/index.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { validateShip } from "../ship/validate-ship.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const TURN_START_SNAPSHOTS = new Map();

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM may change Arkflight ship combat state.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function resolveShipActor(reference) {
  if (reference?.documentName === "Actor") return reference;
  if (reference?.documentName === "Combatant") return reference.actor ?? null;
  if (reference?.documentName === "Token") return reference.actor ?? null;
  if (reference?.actor?.documentName === "Actor") return reference.actor;
  if (typeof reference === "string") {
    return game.actors?.get(reference)
      ?? game.actors?.find((actor) => actor.uuid === reference || actor.name === reference)
      ?? null;
  }
  return null;
}

function isArkflightCombatant(combatant) {
  return Boolean(combatant?.flags?.[MODULE_ID]?.shipCombatant && shipPayload(combatant.actor));
}

function combatantState(combatant) {
  return combatant?.flags?.[MODULE_ID]?.combatState ?? null;
}

function findCombatant(reference, combat = game.combat) {
  if (!combat) return null;
  if (reference?.documentName === "Combatant") return reference.parent?.id === combat.id ? reference : null;
  const actor = resolveShipActor(reference);
  if (!actor) return null;
  return combat.combatants?.find((entry) =>
    entry.actorId === actor.id
    || entry.flags?.[MODULE_ID]?.shipActorUuid === actor.uuid
  ) ?? null;
}

function shipToken(shipActor) {
  const controlled = canvas?.tokens?.controlled?.find((token) => token.actor?.id === shipActor.id);
  if (controlled?.document) return controlled.document;
  const placed = canvas?.tokens?.placeables?.find((token) => token.actor?.id === shipActor.id);
  return placed?.document ?? null;
}

function battlewatchActor(shipActor) {
  const actorId = shipPayload(shipActor)?.crew?.stations?.battlewatch ?? null;
  return actorId ? game.actors?.get(actorId) ?? null : null;
}

function perceptionModifier(actor) {
  if (!actor) return null;
  const statistic = actor.getStatistic?.("perception") ?? actor.perception ?? null;
  for (const candidate of [statistic?.mod, statistic?.modifier, actor.system?.perception?.mod, actor.system?.attributes?.perception?.value]) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function tokenCenter(combatant) {
  const objectCenter = combatant?.token?.object?.center;
  if (objectCenter) return { x: Number(objectCenter.x), y: Number(objectCenter.y) };
  const token = combatant?.token;
  const size = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  return { x: Number(token?.x ?? 0) + Number(token?.width ?? 1) * size / 2, y: Number(token?.y ?? 0) + Number(token?.height ?? 1) * size / 2 };
}

function tokenDistanceHexes(source, target) {
  const from = tokenCenter(source);
  const to = tokenCenter(target);
  try {
    const measured = canvas?.grid?.measurePath?.([from, to])?.distance;
    const unitsPerHex = Number(canvas?.scene?.grid?.distance ?? 1) || 1;
    if (Number.isFinite(Number(measured))) return Math.max(0, Number(measured) / unitsPerHex);
  } catch (_error) { /* pixel fallback below */ }
  const pixelsPerHex = Number(canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100) || 100;
  return Math.hypot(to.x - from.x, to.y - from.y) / pixelsPerHex;
}

function targetSolution(attacker, target, weaponKey) {
  if (!isArkflightCombatant(attacker) || !isArkflightCombatant(target)) throw new Error("Choose two Arkflight ship combatants.");
  if (attacker.id === target.id) throw new Error("A ship cannot target itself.");
  const state = combatantState(attacker);
  const weaponState = state?.weapons?.[weaponKey];
  const weapon = SHIP_CATALOGS.weapons?.[weaponState?.id];
  if (!weaponState || !weapon) throw new Error(`Unknown installed weapon: ${weaponKey}`);
  const from = tokenCenter(attacker);
  const to = tokenCenter(target);
  const distanceHexes = tokenDistanceHexes(attacker, target);
  const bearing = targetBearing(from, to);
  const solution = weaponTargetingSolution({ weapon, weaponState, heading: state.mobility.heading, distanceHexes, bearing });
  return Object.freeze({ ...solution, attacker, target, weapon, weaponState });
}

function degreeOfSuccess(total, die, dc) {
  let degree = total >= dc + 10 ? 2 : total >= dc ? 1 : total <= dc - 10 ? -1 : 0;
  if (die === 20) degree += 1;
  if (die === 1) degree -= 1;
  return Math.max(-1, Math.min(2, degree));
}

const DEGREE_LABEL = Object.freeze({ "-1": "Critical Failure", 0: "Failure", 1: "Success", 2: "Critical Success" });

async function fireAtTarget(weaponKey, targetReference, attackerReference = null) {
  requireGM();
  const attacker = await requireCombatant(attackerReference);
  const target = findCombatant(targetReference);
  if (!target) throw new Error("Choose a target ship in the current combat.");
  const solution = targetSolution(attacker, target, weaponKey);
  if (!solution.range.legal) throw new Error(`${solution.weapon.name}: target is ${solution.range.label.toLowerCase()} (${solution.distanceHexes.toFixed(1)} hex).`);
  if (!solution.arc.legal) throw new Error(`${solution.weapon.name}: target is outside the ${solution.weaponState.mount ?? "fore"} ${solution.arc.arcTemplate} firing arc.`);
  // Preflight AP and reload before any roll or target mutation. The resulting
  // state is persisted only once the attack and any damage roll resolve.
  const next = fireWeapon(combatantState(attacker), weaponKey, game.combat?.round ?? 1);

  const battlewatch = battlewatchActor(attacker.actor);
  const perception = perceptionModifier(battlewatch);
  if (perception == null) throw new Error(`${attacker.name} needs an assigned Battlewatch officer with PF2e Perception.`);
  const attackerDerived = deriveShip(shipPayload(attacker.actor), SHIP_CATALOGS);
  const targetDerived = deriveShip(shipPayload(target.actor), SHIP_CATALOGS);
  const attackBonus = shipWeaponAttackBonus({ battlewatchPerception: perception, shipWeaponAttackBonus: attackerDerived.stats.weaponAttackBonus, install: { upgrades: solution.weaponState.upgrades } });
  const attack = await new Roll("1d20 + @attackBonus", { attackBonus }).evaluate();
  const die = Number(attack.dice?.[0]?.total ?? attack.terms?.find?.((term) => term?.faces === 20)?.total ?? 0);
  const ac = Math.max(0, Number(targetDerived.stats.armorClass) || 0);
  const degree = degreeOfSuccess(Number(attack.total), die, ac);
  let damage = null;
  if (degree >= 1) {
    const profile = weaponDamageProfile(solution.weapon, { upgrades: solution.weaponState.upgrades });
    const damageRoll = await new Roll(degree === 2 ? `2 * (${profile.dice})` : profile.dice).evaluate();
    const reduced = applyHardnessToDamage(damageRoll.total, targetDerived.stats.hardness);
    const targetShip = shipPayload(target.actor);
    const before = Math.max(0, Number(targetShip.resources?.hull?.value) || 0);
    const after = Math.max(0, before - reduced.hullDamage);
    damage = Object.freeze({ ...reduced, roll: damageRoll, before, after, type: profile.type ?? "damage" });
  }
  await updateCombatantState(attacker, next);
  if (damage) await target.actor.update({ [`flags.${MODULE_ID}.ship.resources.hull.value`]: damage.after });
  const esc = foundry.utils.escapeHTML;
  const damageLine = damage ? `<br><strong>Damage:</strong> ${damage.incoming} ${esc(damage.type)} − ${damage.absorbed} Hardness = ${damage.hullDamage} Hull (${damage.before} → ${damage.after})` : "";
  await attack.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: battlewatch }),
    flavor: `<strong>${esc(attacker.name)} fires ${esc(solution.weapon.name)} at ${esc(target.name)}</strong><br>${solution.distanceHexes.toFixed(1)} hex · ${esc(solution.range.label)} · ${esc(solution.weaponState.mount ?? "fore")} ${esc(solution.arc.arcTemplate)} arc<br>Attack ${attack.total} vs AC ${ac}: <strong>${DEGREE_LABEL[degree]}</strong>${damageLine}`
  });
  return Object.freeze({ state: next, attack, attackBonus, ac, degree, solution, damage });
}

function initiativeProfile(reference) {
  const shipActor = resolveShipActor(reference);
  if (!shipActor || !shipPayload(shipActor)) throw new Error("Choose an Arkflight ship Actor.");
  const battlewatch = battlewatchActor(shipActor);
  if (!battlewatch) throw new Error(`${shipActor.name} has no Battlewatch officer assigned.`);
  const perception = perceptionModifier(battlewatch);
  if (perception == null) throw new Error(`${battlewatch.name}'s PF2e Perception modifier could not be resolved.`);
  const shipLevel = Math.max(1, Math.trunc(Number(shipPayload(shipActor).progression?.level) || 1));
  return Object.freeze({ shipActor, battlewatch, perception, shipLevel, modifier: perception + shipLevel });
}

async function ensureCombat() {
  if (game.combat) return game.combat;
  if (!canvas?.scene) throw new Error("Open the scene containing the Arkflight ships before starting combat.");
  const CombatClass = CONFIG?.Combat?.documentClass ?? globalThis.Combat;
  if (!CombatClass?.create) throw new Error("Foundry Combat API is unavailable.");
  return CombatClass.create({ scene: canvas.scene.id, active: true });
}

function freshState(shipActor, token) {
  const ship = shipPayload(shipActor);
  const derived = deriveShip(ship, SHIP_CATALOGS);
  return createCombatantState(ship, {
    derived,
    catalogs: SHIP_CATALOGS,
    rotation: token?.rotation ?? 0
  });
}

async function ensureShipCombatant(reference, { combat = null } = {}) {
  requireGM();
  const shipActor = resolveShipActor(reference);
  if (!shipActor || !shipPayload(shipActor)) throw new Error("Choose an Arkflight ship Actor.");
  const activeCombat = combat ?? await ensureCombat();
  const existing = findCombatant(shipActor, activeCombat);
  if (existing) {
    if (!combatantState(existing)) await existing.update({ [STATE_PATH]: freshState(shipActor, existing.token) });
    return existing;
  }

  const token = shipToken(shipActor);
  if (!token) throw new Error(`Place ${shipActor.name}'s linked ship token on the active scene before adding it to combat.`);
  const state = freshState(shipActor, token);
  const [created] = await activeCombat.createEmbeddedDocuments("Combatant", [{
    tokenId: token.id,
    sceneId: token.parent?.id ?? canvas.scene?.id ?? null,
    actorId: shipActor.id,
    name: shipActor.name,
    img: token.texture?.src ?? shipActor.img,
    flags: {
      [MODULE_ID]: {
        shipCombatant: true,
        shipActorUuid: shipActor.uuid,
        combatState: state
      }
    }
  }]);
  return created;
}

async function updateCombatantState(combatant, state, { persistStrain = false } = {}) {
  await combatant.update({ [STATE_PATH]: state });
  if (persistStrain) {
    const actor = combatant.actor;
    const ship = shipPayload(actor);
    if (actor && ship) {
      const patched = persistentStrainPatch(ship, state);
      await actor.update({ [`flags.${MODULE_ID}.ship.resources.strain.value`]: patched.resources.strain.value });
    }
  }
  return state;
}

function tokenTurnSnapshot(combatant, combat = game.combat) {
  const token = combatant?.token;
  const state = combatantState(combatant);
  if (!combatant?.id || !token || !state) return null;
  return Object.freeze({
    combatId: combat?.id ?? null,
    combatantId: combatant.id,
    round: Math.max(1, Number(combat?.round ?? 1)),
    turn: Number(combat?.turn ?? 0),
    x: Number(token.x ?? 0),
    y: Number(token.y ?? 0),
    rotation: normalizeHexHeading(token.rotation ?? state.mobility?.heading ?? 0),
    heading: normalizeHexHeading(state.mobility?.heading ?? token.rotation ?? 0),
    movementUsed: Math.max(0, Math.trunc(Number(state.mobility?.movement?.used) || 0)),
    movementPurchases: Math.max(0, Math.trunc(Number(state.mobility?.movement?.purchases) || 0)),
    movementAllowance: Math.max(0, Math.trunc(Number(state.mobility?.movement?.allowance) || 0)),
    maneuverUsed: Math.max(0, Math.trunc(Number(state.mobility?.maneuver?.used) || 0)),
    maneuverPurchases: Math.max(0, Math.trunc(Number(state.mobility?.maneuver?.purchases) || 0)),
    maneuverAllowance: Math.max(0, Math.trunc(Number(state.mobility?.maneuver?.allowance) || 0))
  });
}

function ensureTurnStartSnapshot(combatant, combat = game.combat) {
  if (!combatant?.id) return null;
  const existing = TURN_START_SNAPSHOTS.get(combatant.id);
  const round = Math.max(1, Number(combat?.round ?? 1));
  const turn = Number(combat?.turn ?? 0);
  if (existing?.combatId === combat?.id && existing.round === round && existing.turn === turn) return existing;
  const snapshot = tokenTurnSnapshot(combatant, combat);
  if (snapshot) TURN_START_SNAPSHOTS.set(combatant.id, snapshot);
  return snapshot;
}

function movementUndoStatus(combatant) {
  const snapshot = combatant?.id ? TURN_START_SNAPSHOTS.get(combatant.id) : null;
  const token = combatant?.token;
  const state = combatantState(combatant);
  if (!snapshot || !token || !state) return Object.freeze({ canUndoMove: false, canUndoFacing: false, canResetPosition: false });
  const moved = Number(token.x ?? 0) !== snapshot.x || Number(token.y ?? 0) !== snapshot.y || Number(state.mobility?.movement?.used ?? 0) !== snapshot.movementUsed;
  const turned = normalizeHexHeading(token.rotation ?? state.mobility?.heading ?? 0) !== snapshot.rotation
    || normalizeHexHeading(state.mobility?.heading ?? 0) !== snapshot.heading
    || Number(state.mobility?.maneuver?.used ?? 0) !== snapshot.maneuverUsed;
  return Object.freeze({ canUndoMove: moved, canUndoFacing: turned, canResetPosition: moved || turned });
}

async function restoreTurnStart(combatant, { move = false, facing = false } = {}) {
  requireGM();
  if (!combatant?.id) throw new Error("Choose an Arkflight ship Combatant.");
  const snapshot = TURN_START_SNAPSHOTS.get(combatant.id);
  if (!snapshot) throw new Error("No turn-start position has been recorded for this ship.");
  const token = combatant.token;
  const state = combatantState(combatant);
  if (!token || !state) throw new Error("Ship token or combat state is unavailable.");

  const tokenChanges = {};
  if (move) {
    tokenChanges.x = snapshot.x;
    tokenChanges.y = snapshot.y;
  }
  if (facing) tokenChanges.rotation = snapshot.rotation;
  if (Object.keys(tokenChanges).length) {
    await token.update(tokenChanges, { arkflightCombatUndo: true, arkflightCombatFacing: true });
  }

  const mobility = state.mobility ?? {};
  const movement = mobility.movement ?? {};
  const maneuver = mobility.maneuver ?? {};
  const moveRefund = move
    ? Math.max(0, Math.trunc(Number(movement.purchases) || 0) - snapshot.movementPurchases)
    : 0;
  const facingRefund = facing
    ? Math.max(0, Math.trunc(Number(maneuver.purchases) || 0) - snapshot.maneuverPurchases)
    : 0;
  const apRefund = moveRefund + facingRefund;
  const ap = state.economy?.ap ?? { value: 0, max: 0 };
  const apMax = Math.max(0, Math.trunc(Number(ap.max) || 0));
  const apValue = Math.max(0, Math.trunc(Number(ap.value) || 0));

  const next = Object.freeze({
    ...state,
    economy: Object.freeze({
      ...(state.economy ?? {}),
      ap: Object.freeze({
        ...ap,
        value: Math.min(apMax, apValue + apRefund),
        max: apMax
      })
    }),
    mobility: Object.freeze({
      ...mobility,
      heading: facing ? snapshot.heading : mobility.heading,
      movement: Object.freeze({
        ...movement,
        purchases: move ? snapshot.movementPurchases : Math.max(0, Math.trunc(Number(movement.purchases) || 0)),
        allowance: move
          ? Math.max(snapshot.movementAllowance, Math.max(0, Math.trunc(Number(movement.allowance) || 0)) - moveRefund * Math.max(1, Math.trunc(Number(mobility.speed) || 1)))
          : Math.max(0, Math.trunc(Number(movement.allowance) || 0)),
        used: move ? snapshot.movementUsed : Math.max(0, Math.trunc(Number(movement.used) || 0))
      }),
      maneuver: Object.freeze({
        ...maneuver,
        purchases: facing ? snapshot.maneuverPurchases : Math.max(0, Math.trunc(Number(maneuver.purchases) || 0)),
        allowance: facing
          ? Math.max(snapshot.maneuverAllowance, Math.max(0, Math.trunc(Number(maneuver.allowance) || 0)) - facingRefund * Math.max(1, Math.trunc(Number(mobility.maneuverability) || 1)))
          : Math.max(0, Math.trunc(Number(maneuver.allowance) || 0)),
        used: facing ? snapshot.maneuverUsed : Math.max(0, Math.trunc(Number(maneuver.used) || 0))
      })
    })
  });
  await updateCombatantState(combatant, next);
  try { await token.clearMovementHistory?.(); } catch (_error) { /* convenience only */ }
  Hooks.callAll("arkflightCombatPositionUndone", { combatant, move, facing, snapshot, state: next, apRefund });
  return next;
}

async function rollShipInitiative(reference, { combat = null, combatant = null } = {}) {
  requireGM();
  const profile = initiativeProfile(reference);
  const activeCombat = combat ?? await ensureCombat();
  const entry = combatant ?? await ensureShipCombatant(profile.shipActor, { combat: activeCombat });
  const roll = await new Roll("1d20 + @perception + @shipLevel", {
    perception: profile.perception,
    shipLevel: profile.shipLevel
  }).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: profile.battlewatch }),
    flavor: `<strong>Arkflight Ship Initiative — ${foundry.utils.escapeHTML(profile.shipActor.name)}</strong><br>${foundry.utils.escapeHTML(profile.battlewatch.name)}: Perception +${profile.perception}; Ship Level +${profile.shipLevel}`
  });
  await activeCombat.setInitiative(entry.id, roll.total);
  return Object.freeze({ ...profile, combat: activeCombat, combatant: entry, roll, total: roll.total });
}

function launchBlockers(actor, { allowNPC = false } = {}) {
  const blockers = [];
  const ship = shipPayload(actor);
  if (!ship) return [`${actor?.name ?? "Selected Actor"} is not an Arkflight ship.`];
  if (!(ship.hull?.chassisId && ship.arkengine?.chassisId)) blockers.push("Ship commissioning is incomplete.");

  const validation = validateShip(ship, SHIP_CATALOGS);
  if (!validation.ok) blockers.push(...validation.errors);

  const serviceEntry = game.arkflight?.ships?.get?.(actor.id) ?? null;
  if (serviceEntry && !serviceEntry.player && !allowNPC) blockers.push("Only a player-classified Arkflight ship may be launched as the Current Ship.");
  if (serviceEntry && !serviceEntry.crew?.ready) blockers.push(`${serviceEntry.crew?.assigned ?? 0}/${serviceEntry.crew?.total ?? 0} permanent stations assigned.`);
  if (game.arkflight?.controller?.state?.eventId) blockers.push("A Voyage Event is already active.");
  if (!shipToken(actor)) blockers.push("Place the ship's linked token on the active scene.");
  if (!battlewatchActor(actor) && !allowNPC) blockers.push("Assign a Battlewatch officer before rolling ship initiative.");
  return [...new Set(blockers)];
}

async function requireCombatant(reference = null) {
  const combat = game.combat;
  if (!combat) throw new Error("No active Foundry combat exists.");
  const combatant = reference ? findCombatant(reference, combat) : combat.combatant;
  if (!isArkflightCombatant(combatant)) throw new Error("Choose an Arkflight ship Combatant.");
  if (!combatantState(combatant)) await combatant.update({ [STATE_PATH]: freshState(combatant.actor, combatant.token) });
  return combatant;
}

async function beginTurn(combatant, round) {
  if (!isArkflightCombatant(combatant)) return null;
  const current = combatantState(combatant) ?? freshState(combatant.actor, combatant.token);
  const next = beginCombatantTurn(current, round);
  if (next !== current) await updateCombatantState(combatant, next);
  try { await combatant.token?.clearMovementHistory?.(); } catch (_error) { /* movement history is convenience only */ }
  ensureTurnStartSnapshot(combatant, game.combat);
  return next;
}

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.combat = Object.freeze({
    actions: COMBAT_ACTIONS,
    isArkflightCombatant,
    initiativeProfile,
    findCombatant,
    ensureCombat,
    ensureShipCombatant,
    rollShipInitiative,
    launchBlockers(reference, options = {}) {
      const actor = resolveShipActor(reference);
      return actor ? launchBlockers(actor, options) : ["Choose an Arkflight ship Actor for combat."];
    },
    state(reference = null) {
      const combatant = reference ? findCombatant(reference) : game.combat?.combatant ?? null;
      return combatantState(combatant);
    },
    targets(reference = null) {
      const attacker = reference ? findCombatant(reference) : game.combat?.combatant ?? null;
      return Object.freeze([...(game.combat?.combatants ?? [])].filter((entry) => isArkflightCombatant(entry) && entry.id !== attacker?.id));
    },
    async start(reference, options = {}) {
      requireGM();
      const actor = resolveShipActor(reference);
      if (!actor) throw new Error("Choose an Arkflight ship Actor for combat.");
      const blockers = launchBlockers(actor, options);
      if (blockers.length) throw new Error(`Cannot add Arkflight ship to combat: ${blockers.join(" ")}`);
      const combat = await ensureCombat();
      const combatant = await ensureShipCombatant(actor, { combat });
      let initiative = null;
      if (options.rollInitiative !== false) initiative = await rollShipInitiative(actor, { combat, combatant });
      ui.notifications?.info(`${actor.name} added to Foundry combat.`);
      return Object.freeze({ combat, combatant, state: combatantState(combatant), initiative });
    },
    async buyMovement(reference = null) {
      requireGM();
      const combatant = await requireCombatant(reference);
      return updateCombatantState(combatant, purchaseMovement(combatantState(combatant)));
    },
    async buyManeuver(reference = null) {
      requireGM();
      const combatant = await requireCombatant(reference);
      return updateCombatantState(combatant, purchaseManeuver(combatantState(combatant)));
    },
    async spendAP(amount = 1, reference = null) {
      requireGM();
      const combatant = await requireCombatant(reference);
      return updateCombatantState(combatant, spendPoints(combatantState(combatant), "ap", amount));
    },
    async spendRP(amount = 1, reference = null) {
      requireGM();
      const combatant = await requireCombatant(reference);
      return updateCombatantState(combatant, spendPoints(combatantState(combatant), "rp", amount));
    },
    async turn(steps = 1, reference = null) {
      requireGM();
      const combatant = await requireCombatant(reference);
      const state = combatantState(combatant);
      const signedSteps = Math.trunc(Number(steps) || 0);
      const targetHeading = normalizeHexHeading(state.mobility.heading + signedSteps * 60);
      const next = recordFacingChange(state, Math.abs(signedSteps), targetHeading);
      if (combatant.token) await combatant.token.update({ rotation: targetHeading }, { arkflightCombatFacing: true });
      return updateCombatantState(combatant, next);
    },
    async fireWeapon(weaponKey, reference = null) {
      requireGM();
      const combatant = await requireCombatant(reference);
      const next = fireWeapon(combatantState(combatant), weaponKey, game.combat?.round ?? 1);
      return updateCombatantState(combatant, next);
    },
    targets(reference = null) {
      const attacker = reference ? findCombatant(reference) : game.combat?.combatant ?? null;
      return Object.freeze([...game.combat?.combatants ?? []].filter((entry) => isArkflightCombatant(entry) && entry.id !== attacker?.id));
    },
    targetingSolution(weaponKey, targetReference, attackerReference = null) {
      const attacker = attackerReference ? findCombatant(attackerReference) : game.combat?.combatant ?? null;
      const target = findCombatant(targetReference);
      return targetSolution(attacker, target, weaponKey);
    },
    fireAtTarget,
    async workTheGuns(weaponKey, reference = null) {
      requireGM();
      const combatant = await requireCombatant(reference);
      const next = workTheGuns(combatantState(combatant), weaponKey, game.combat?.round ?? 1);
      return updateCombatantState(combatant, next);
    },
    reloadRemaining(weaponKey, reference = null) {
      const combatant = reference ? findCombatant(reference) : game.combat?.combatant ?? null;
      const weapon = combatantState(combatant)?.weapons?.[weaponKey];
      return weapon ? weaponReloadRemaining(weapon, game.combat?.round ?? 1) : null;
    },
    movementUndoStatus(reference = null) {
      const combatant = reference ? findCombatant(reference) : game.combat?.combatant ?? null;
      return movementUndoStatus(combatant);
    },
    async undoMove(reference = null) {
      const combatant = await requireCombatant(reference);
      return restoreTurnStart(combatant, { move: true, facing: false });
    },
    async undoFacing(reference = null) {
      const combatant = await requireCombatant(reference);
      return restoreTurnStart(combatant, { move: false, facing: true });
    },
    async resetTurnPosition(reference = null) {
      const combatant = await requireCombatant(reference);
      return restoreTurnStart(combatant, { move: true, facing: true });
    },
    async nextRound() {
      requireGM();
      if (!game.combat) throw new Error("No active Foundry combat exists.");
      return game.combat.nextRound();
    },
    async stop() {
      requireGM();
      const combat = game.combat;
      if (!combat) return;
      await combat.delete();
      ui.notifications?.info("Arkflight combat ended.");
    }
  });
  const current = game.combat?.combatant ?? null;
  if (isArkflightCombatant(current)) ensureTurnStartSnapshot(current, game.combat);
});

Hooks.on("updateCombat", async (combat, changes) => {
  if (!game.user?.isGM) return;
  if (!(Object.hasOwn(changes ?? {}, "round") || Object.hasOwn(changes ?? {}, "turn"))) return;
  const combatant = combat.combatant ?? null;
  if (!isArkflightCombatant(combatant)) return;
  const state = await beginTurn(combatant, combat.round);
  Hooks.callAll("arkflightCombatTurnChanged", { combat, combatant, state, round: combat.round, turn: combat.turn, shipActor: combatant.actor ?? null });
});

Hooks.on("preMoveToken", (token, movement) => {
  const combat = game.combat;
  const combatant = combat?.combatants?.find((entry) => entry.tokenId === token.id && isArkflightCombatant(entry));
  if (!combatant || combat.combatant?.id !== combatant.id) return;
  movement.autoRotate = false;
  const state = combatantState(combatant);
  if (!state) return;
  const pending = Math.max(0, Math.trunc(Number(movement.pending?.spaces) || 0));
  const history = Math.max(0, Math.trunc(Number(movement.history?.spaces) || 0));
  const planned = Math.max(state.mobility.movement.used + pending, history);
  if (planned <= state.mobility.movement.allowance) return;
  ui.notifications?.warn(`Movement blocked: ${combatant.name} has ${Math.max(0, state.mobility.movement.allowance - state.mobility.movement.used)} hex${Math.max(0, state.mobility.movement.allowance - state.mobility.movement.used) === 1 ? "" : "es"} remaining. Spend 1 AP on Move for another ${state.mobility.speed}.`);
  return false;
});

Hooks.on("moveToken", async (token, movement) => {
  if (!game.user?.isGM) return;
  const combat = game.combat;
  const combatant = combat?.combatants?.find((entry) => entry.tokenId === token.id && isArkflightCombatant(entry));
  if (!combatant || combat.combatant?.id !== combatant.id) return;
  const state = combatantState(combatant);
  if (!state) return;
  const total = Math.max(0, Math.trunc(Number(movement.history?.spaces) || 0));
  const delta = Math.max(0, total - state.mobility.movement.used);
  if (!delta) return;
  try { await updateCombatantState(combatant, recordMovement(state, delta)); }
  catch (error) { console.warn("Arkflight | Could not record ship movement", error); }
});

Hooks.on("preUpdateToken", (token, changes, options) => {
  if (changes?.rotation == null || options?.arkflightCombatFacing) return;
  const combat = game.combat;
  const combatant = combat?.combatants?.find((entry) => entry.tokenId === token.id && isArkflightCombatant(entry));
  if (!combatant || combat.combatant?.id !== combatant.id) return;
  const state = combatantState(combatant);
  if (!state) return;
  const requested = Number(changes.rotation);
  const snapped = normalizeHexHeading(requested);
  if (((requested % 360) + 360) % 360 !== snapped) {
    ui.notifications?.warn("Arkflight ship facing must use 60° hex headings during combat.");
    return false;
  }
  const steps = headingStepDistance(state.mobility.heading, snapped);
  if (state.mobility.maneuver.used + steps <= state.mobility.maneuver.allowance) return;
  ui.notifications?.warn(`Facing change blocked: spend 1 AP on Maneuver for ${state.mobility.maneuverability} facing step${state.mobility.maneuverability === 1 ? "" : "s"}.`);
  return false;
});

Hooks.on("updateToken", async (token, changes, options) => {
  if (!game.user?.isGM || changes?.rotation == null || options?.arkflightCombatFacing) return;
  const combat = game.combat;
  const combatant = combat?.combatants?.find((entry) => entry.tokenId === token.id && isArkflightCombatant(entry));
  if (!combatant || combat.combatant?.id !== combatant.id) return;
  const state = combatantState(combatant);
  if (!state) return;
  const heading = normalizeHexHeading(changes.rotation);
  const steps = headingStepDistance(state.mobility.heading, heading);
  if (!steps) return;
  try { await updateCombatantState(combatant, recordFacingChange(state, steps, heading)); }
  catch (error) { console.warn("Arkflight | Could not record ship facing", error); }
});


Hooks.on("deleteCombat", () => TURN_START_SNAPSHOTS.clear());
