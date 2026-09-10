import { spendPoints, weaponReloadRemaining } from "./combatant-state.js";

function uniqueWeaponKeys(values = []) {
  return [...new Set((values ?? []).map((value) => String(value ?? "").trim()).filter(Boolean))];
}

export function coordinatedSalvoPlan(state, weaponKeys, round = 1) {
  const keys = uniqueWeaponKeys(weaponKeys);
  if (keys.length < 2) throw new Error("A Coordinated Salvo requires at least two installed weapons.");
  const combatRound = Math.max(1, Math.trunc(Number(round) || 1));
  const weapons = keys.map((key) => {
    const weapon = state?.weapons?.[key];
    if (!weapon) throw new Error(`Unknown installed weapon: ${key}`);
    if (weaponReloadRemaining(weapon, combatRound) > 0) throw new Error(`${weapon.name} is still reloading.`);
    return weapon;
  });
  const mount = weapons[0]?.mount ?? null;
  if (!mount || weapons.some((weapon) => weapon.mount !== mount)) {
    throw new Error("All weapons in a Coordinated Salvo must be mounted on the same facing.");
  }
  const totalAP = weapons.reduce((sum, weapon) => sum + Math.max(1, Math.trunc(Number(weapon.fireAP) || 1)), 0);
  if (Number(state?.economy?.ap?.value ?? 0) < totalAP) throw new Error(`Not enough AP for this Coordinated Salvo (${totalAP} AP required).`);
  return Object.freeze({ keys: Object.freeze(keys), weapons: Object.freeze(weapons), mount, totalAP, round: combatRound });
}

export function fireCoordinatedSalvo(state, weaponKeys, round = 1) {
  const plan = coordinatedSalvoPlan(state, weaponKeys, round);
  let next = spendPoints(state, "ap", plan.totalAP);
  const updatedWeapons = { ...next.weapons };
  for (const key of plan.keys) {
    const weapon = updatedWeapons[key];
    const readyRound = plan.round + Math.max(0, Math.trunc(Number(weapon.reloadRounds) || 0)) + 1;
    updatedWeapons[key] = Object.freeze({ ...weapon, readyRound, lastFiredRound: plan.round });
  }
  return Object.freeze({
    ...next,
    weapons: Object.freeze(updatedWeapons),
    log: Object.freeze([...(next.log ?? []), Object.freeze({
      round: plan.round,
      kind: "coordinated-salvo",
      weaponKeys: plan.keys,
      mount: plan.mount,
      ap: plan.totalAP
    })])
  });
}
