import { reduceWeaponReload, stationEffectProfile, workTheGuns as workTheGunsState } from "../combat/index.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function shipLevel(actor) {
  return Math.max(1, Math.min(20, Math.trunc(Number(shipPayload(actor)?.progression?.level) || 1)));
}

function resolveCombatant(base, reference = null) {
  if (reference?.documentName === "Combatant") return reference;
  return reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
}

Hooks.once("ready", () => {
  const base = game.arkflight?.combat;
  if (!base) return;
  const originalStationAction = base.stationAction?.bind(base);

  async function scaledWorkTheGuns(weaponKey, reference = null) {
    if (!game.user?.isGM) throw new Error("Only the GM may resolve Arkflight gunnery work.");
    const combatant = resolveCombatant(base, reference);
    if (!combatant) throw new Error("Choose an Arkflight ship Combatant.");
    const round = Math.max(1, Number(game.combat?.round ?? 1));
    const profile = stationEffectProfile(shipLevel(combatant.actor));
    const before = base.state(combatant);
    let next = workTheGunsState(before, weaponKey, round);
    next = reduceWeaponReload(next, weaponKey, round, Math.max(0, profile.bonus - 1));
    await combatant.update({ [STATE_PATH]: next });

    const weapon = next.weapons?.[weaponKey];
    const remaining = Math.max(0, Number(weapon?.readyRound ?? round) - round);
    Hooks.callAll("arkflightStationActionResolved", {
      combat: game.combat,
      combatant,
      actor: combatant.actor,
      action: base.actions?.["battlewatch-reload-weapon"] ?? null,
      selection: weaponKey,
      state: next,
      notes: [`Reload reduced by ${profile.bonus} round${profile.bonus === 1 ? "" : "s"}; ${remaining} remaining.`]
    });
    return next;
  }

  game.arkflight.combat = Object.freeze({
    ...base,
    workTheGuns: scaledWorkTheGuns,
    stationAction(actionId, options = {}, reference = null) {
      if (actionId === "battlewatch-reload-weapon") {
        if (!options.weaponKey) throw new Error("Work the Guns requires an installed weapon.");
        return scaledWorkTheGuns(options.weaponKey, reference);
      }
      return originalStationAction(actionId, options, reference);
    }
  });
});
