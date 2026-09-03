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
  spendPoints,
  weaponReloadRemaining,
  workTheGuns
} from "../combat/index.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { validateShip } from "../ship/validate-ship.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;

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

function launchBlockers(actor) {
  const blockers = [];
  const ship = shipPayload(actor);
  if (!ship) return [`${actor?.name ?? "Selected Actor"} is not an Arkflight ship.`];
  if (!(ship.hull?.chassisId && ship.arkengine?.chassisId)) blockers.push("Ship commissioning is incomplete.");

  const validation = validateShip(ship, SHIP_CATALOGS);
  if (!validation.ok) blockers.push(...validation.errors);

  const serviceEntry = game.arkflight?.ships?.get?.(actor.id) ?? null;
  if (serviceEntry && !serviceEntry.player) blockers.push("Only a player-classified Arkflight ship may be launched from GM Operations.");
  if (serviceEntry && !serviceEntry.crew?.ready) blockers.push(`${serviceEntry.crew?.assigned ?? 0}/${serviceEntry.crew?.total ?? 0} permanent stations assigned.`);
  if (game.arkflight?.controller?.state?.eventId) blockers.push("A Voyage Event is already active.");
  if (!shipToken(actor)) blockers.push("Place the ship's linked token on the active scene.");
  if (!battlewatchActor(actor)) blockers.push("Assign a Battlewatch officer before rolling ship initiative.");
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
    launchBlockers(reference) {
      const actor = resolveShipActor(reference);
      return actor ? launchBlockers(actor) : ["Choose an Arkflight ship Actor for combat."];
    },
    state(reference = null) {
      const combatant = reference ? findCombatant(reference) : game.combat?.combatant ?? null;
      return combatantState(combatant);
    },
    async start(reference, options = {}) {
      requireGM();
      const actor = resolveShipActor(reference);
      if (!actor) throw new Error("Choose an Arkflight ship Actor for combat.");
      const blockers = launchBlockers(actor);
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
