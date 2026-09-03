const MODULE_ID = "arkflight-game";

function requireGM() {
  if (!game.user?.isGM) throw new Error("Only the GM may manage Arkflight ship initiative.");
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function resolveShipActor(reference) {
  if (reference?.documentName === "Actor") return reference;
  if (reference?.actor?.documentName === "Actor") return reference.actor;
  if (typeof reference === "string") {
    return game.actors?.get(reference)
      ?? game.actors?.find((actor) => actor.uuid === reference || actor.name === reference)
      ?? null;
  }
  return null;
}

function battlewatchActor(shipActor) {
  const ship = shipPayload(shipActor);
  const actorId = ship?.crew?.stations?.battlewatch ?? null;
  return actorId ? game.actors?.get(actorId) ?? null : null;
}

function perceptionModifier(actor) {
  if (!actor) return null;
  const statistic = actor.getStatistic?.("perception") ?? actor.perception ?? null;
  const candidates = [
    statistic?.mod,
    statistic?.modifier,
    actor.system?.perception?.mod,
    actor.system?.attributes?.perception?.value
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function initiativeProfile(reference) {
  const shipActor = resolveShipActor(reference);
  if (!shipActor || !shipPayload(shipActor)) throw new Error("Choose an Arkflight ship Actor.");
  const ship = shipPayload(shipActor);
  const battlewatch = battlewatchActor(shipActor);
  if (!battlewatch) throw new Error(`${shipActor.name} has no Battlewatch officer assigned.`);
  const perception = perceptionModifier(battlewatch);
  if (perception == null) throw new Error(`${battlewatch.name}'s PF2e Perception modifier could not be resolved.`);
  const shipLevel = Math.max(1, Math.trunc(Number(ship.progression?.level) || 1));
  return Object.freeze({
    shipActor,
    battlewatch,
    shipLevel,
    perception,
    modifier: perception + shipLevel,
    formula: `1d20 + ${perception} + ${shipLevel}`
  });
}

function shipToken(shipActor) {
  const controlled = canvas?.tokens?.controlled?.find((token) => token.actor?.id === shipActor.id);
  if (controlled?.document) return controlled.document;
  const placed = canvas?.tokens?.placeables?.find((token) => token.actor?.id === shipActor.id);
  return placed?.document ?? null;
}

async function ensureCombat() {
  if (game.combat) return game.combat;
  if (!canvas?.scene) throw new Error("Open the scene containing the Arkflight ships before starting combat.");
  const CombatClass = CONFIG?.Combat?.documentClass ?? globalThis.Combat;
  if (!CombatClass?.create) throw new Error("Foundry Combat API is unavailable.");
  return CombatClass.create({ scene: canvas.scene.id, active: true });
}

async function ensureShipCombatant(reference, { combat = null } = {}) {
  requireGM();
  const shipActor = resolveShipActor(reference);
  if (!shipActor || !shipPayload(shipActor)) throw new Error("Choose an Arkflight ship Actor.");
  const activeCombat = combat ?? await ensureCombat();
  const existing = activeCombat.combatants?.find((entry) =>
    entry.actorId === shipActor.id
    || entry.flags?.[MODULE_ID]?.shipActorUuid === shipActor.uuid
  );
  if (existing) return existing;

  const token = shipToken(shipActor);
  if (!token) throw new Error(`Place ${shipActor.name}'s linked ship token on the active scene before adding it to initiative.`);

  const [created] = await activeCombat.createEmbeddedDocuments("Combatant", [{ 
    tokenId: token.id,
    sceneId: token.parent?.id ?? canvas.scene?.id ?? null,
    actorId: shipActor.id,
    name: shipActor.name,
    img: token.texture?.src ?? shipActor.img,
    flags: {
      [MODULE_ID]: {
        shipCombatant: true,
        shipActorUuid: shipActor.uuid
      }
    }
  }]);
  return created;
}

async function rollShipInitiative(reference, { combat = null, combatant = null, createCombatant = true } = {}) {
  requireGM();
  const profile = initiativeProfile(reference);
  const activeCombat = combat ?? game.combat ?? (createCombatant ? await ensureCombat() : null);
  if (!activeCombat) throw new Error("No active Foundry combat exists.");
  const entry = combatant
    ?? activeCombat.combatants?.find((row) => row.actorId === profile.shipActor.id || row.flags?.[MODULE_ID]?.shipActorUuid === profile.shipActor.uuid)
    ?? (createCombatant ? await ensureShipCombatant(profile.shipActor, { combat: activeCombat }) : null);
  if (!entry) throw new Error(`${profile.shipActor.name} is not in the Foundry Combat Tracker.`);

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

function isArkflightCombatant(combatant) {
  return Boolean(combatant?.flags?.[MODULE_ID]?.shipCombatant);
}

Hooks.once("ready", () => {
  game.arkflight ??= {};
  const tracker = Object.freeze({
    initiativeProfile,
    battlewatchActor,
    ensureCombat,
    ensureShipCombatant,
    rollShipInitiative,
    isArkflightCombatant
  });
  game.arkflight.combatTracker = tracker;
  if (game.arkflight.combat) game.arkflight.combat.tracker = tracker;
});

Hooks.on("updateCombat", (combat, changes) => {
  if (!game.user?.isGM) return;
  if (!(Object.hasOwn(changes ?? {}, "round") || Object.hasOwn(changes ?? {}, "turn"))) return;
  const combatant = combat.combatant ?? null;
  if (!isArkflightCombatant(combatant)) return;
  Hooks.callAll("arkflightCombatTrackerTurnChanged", {
    combat,
    combatant,
    round: combat.round,
    turn: combat.turn,
    shipActor: combatant.actor ?? null
  });
});
