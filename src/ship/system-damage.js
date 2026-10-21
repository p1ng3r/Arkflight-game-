import { SYSTEM_FAULTS, SYSTEM_FAULT_TABLES } from "../content/system-faults.js";

export const SYSTEM_KEYS = Object.freeze(["hull", "drive", "arkengine", "lifeveil", "morale"]);
export const SYSTEM_STATIONS = Object.freeze({ hull: "battlewatch", drive: "navigator", arkengine: "engineer", lifeveil: "veilwarden", morale: "captain" });
export const SYSTEM_LABELS = Object.freeze({ hull: "Hull", drive: "Drive / Rigging", arkengine: "Arkengine", lifeveil: "Lifeveil", morale: "Morale" });
const labels = {
  hull: ["Sound", "Scuffed", "Battered", "Damaged", "Critical", "Wrecked"],
  drive: ["Sound", "Scuffed", "Battered", "Damaged", "Critical", "Disabled"],
  arkengine: ["Sound", "Scuffed", "Battered", "Damaged", "Critical", "Disabled"],
  lifeveil: ["Stable", "Weakened", "Fraying", "Unstable", "Critical", "Collapsed"],
  morale: ["Inspired", "Confident", "Steady", "Shaken", "Faltering", "Broken"]
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
export const systemShipBonus = level => Math.ceil(clamp(level || 1, 1, 20) / 4);
export const systemSaveDC = level => 14 + systemShipBonus(level);

export function normalizeSystemDamage(value = {}) {
  value ??= {};
  return { version: 1, faults: [...new Set((value.faults ?? []).filter(id => typeof id === "string"))], checks: Object.fromEntries(Object.entries(value.checks ?? {}).slice(-64)), history: [...(value.history ?? [])].slice(-30) };
}
export function systemIntegrity(ship, system) {
  if (!SYSTEM_KEYS.includes(system)) throw new Error(`Unknown ship system: ${system}`);
  const r = ship?.resources?.[system];
  const max = system === "hull" ? Math.max(0, Number(r?.max) || 0) : 100;
  const value = clamp(r?.value ?? (system === "hull" ? 0 : 100), 0, max);
  const percent = max > 0 ? value / max * 100 : 0;
  const band = percent >= 100 ? 0 : percent >= 75 ? 1 : percent >= 50 ? 2 : percent >= 25 ? 3 : percent >= 10 ? 4 : 5;
  return { system, value, max, percent, band, label: labels[system][band], damaged: percent < 100, terminal: band === 5 };
}
export function activeSystemFaults(ship, system = null) {
  return normalizeSystemDamage(ship?.systemDamage).faults.map(id => SYSTEM_FAULTS[id]).filter(f => f && (!system || f.system === system));
}
export function systemFaultModifiers(ship) {
  const result = { stations: {}, saves: {}, stats: {} };
  for (const f of activeSystemFaults(ship)) for (const [key, value] of Object.entries(f.effects)) {
    const group = Object.values(SYSTEM_STATIONS).includes(key) ? result.stations : key.endsWith("Save") ? result.saves : result.stats;
    const target = key.endsWith("Save") ? key.slice(0, -4) : key;
    group[target] = (group[target] ?? 0) + value;
  }
  // Different faults accumulate, but modifiers have a bounded first-pass ceiling.
  for (const group of Object.values(result)) for (const key of Object.keys(group)) group[key] = clamp(group[key], -4, 3);
  return result;
}
export function componentSystemSaveBonuses(hull, engine, system) {
  const ht = new Set(hull?.tags ?? []), et = new Set(engine?.tags ?? []);
  const any = (set, names) => names.some(n => set.has(n));
  let h = hull ? 1 : 0, e = engine ? 1 : 0;
  if (system === "hull" && (Number(hull?.data?.tier) >= 2 || any(ht, ["durable", "capital"]))) h++;
  if (system === "drive" && any(ht, ["fast", "scout", "courier"])) h++;
  if (system === "arkengine" && any(ht, ["workhorse", "industrial", "heavy-cargo"])) h++;
  if (system === "lifeveil" && any(ht, ["lifeveil", "sanctuary"])) h++;
  if (system === "morale" && any(ht, ["flagship", "support-flagship"])) h++;
  if (et.has("reliable")) e++;
  if (system === "arkengine") { e += Math.min(2, Math.floor(Number(engine?.data?.tier ?? 0) / 2)); if (et.has("unstable")) e--; }
  if (system === "lifeveil" && any(et, ["veil", "lifeveil", "deepveil", "sanctum"])) e++;
  if (system === "drive" && any(et, ["aggressive", "assault-pattern", "riftburn"])) e++;
  if (system === "hull" && any(et, ["heavy", "militarized"])) e++;
  if (system === "morale" && any(et, ["ritual", "sanctum", "choirbound"])) e++;
  return { hull: Number(hull?.data?.systemSaves?.[system] ?? h), arkengine: Number(engine?.data?.systemSaves?.[system] ?? e) };
}
export function systemSaveProfile(ship, system, { catalogs = {}, derived = null } = {}) {
  if (!SYSTEM_KEYS.includes(system)) throw new Error(`Unknown ship system: ${system}`);
  const bonus = systemShipBonus(ship?.progression?.level), stats = derived?.stats ?? {};
  const component = componentSystemSaveBonuses(catalogs.hulls?.[ship?.hull?.chassisId], catalogs.arkengines?.[ship?.arkengine?.chassisId], system);
  const upgrades = Number(stats.systemSaveBonuses?.[system] ?? 0) + Number(stats.defensiveCheckBonus ?? 0);
  const faults = systemFaultModifiers(ship).saves[system] ?? 0;
  return { system, station: SYSTEM_STATIONS[system], bonus, components: component, upgrades, faults, modifier: bonus + component.hull + component.arkengine + upgrades + faults, dc: systemSaveDC(ship?.progression?.level) };
}
export function systemSaveEligible(before, after, system, roundKey) {
  if (!roundKey) throw new Error("System saves require an encounter/round key.");
  const old = systemIntegrity(before, system), next = systemIntegrity(after, system);
  return next.value < old.value && next.percent <= 50 && !normalizeSystemDamage(after?.systemDamage).checks[roundKey]?.includes(system);
}
export function resolveSystemSave(ship, system, { roundKey, die, faultRolls = [], profile } = {}) {
  if (!roundKey || !Number.isInteger(die) || die < 1 || die > 20 || !profile || profile.system !== system) throw new Error("Invalid ship system save.");
  const next = structuredClone(ship), state = normalizeSystemDamage(next.systemDamage);
  if (state.checks[roundKey]?.includes(system)) return { ship: next, skipped: true };
  const total = die + profile.modifier, success = die === 20 || (die !== 1 && total >= profile.dc);
  let fault = null;
  const available = SYSTEM_FAULT_TABLES[system].filter(f => !state.faults.includes(f.id));
  if (!success && available.length) {
    for (const n of faultRolls) {
      if (!Number.isInteger(n) || n < 1 || n > 12) throw new Error("Invalid d12 fault roll.");
      const candidate = SYSTEM_FAULT_TABLES[system][n - 1];
      if (!state.faults.includes(candidate.id)) { fault = candidate; break; }
    }
    if (!fault) throw new Error("Failed save requires a new d12 fault; reroll duplicates.");
    state.faults.push(fault.id);
  }
  state.checks[roundKey] = [...(state.checks[roundKey] ?? []), system];
  const result = { system, roundKey, die, total, dc: profile.dc, modifier: profile.modifier, success, faultId: fault?.id ?? null };
  state.history.push(result);
  next.systemDamage = normalizeSystemDamage(state);
  return { ship: next, ...result, fault };
}
export function repairSystemFault(ship, id) {
  const next = structuredClone(ship), state = normalizeSystemDamage(next.systemDamage), fault = SYSTEM_FAULTS[id];
  if (!fault || !state.faults.includes(id)) throw new Error("Choose an active ship fault.");
  state.faults = state.faults.filter(value => value !== id);
  next.systemDamage = state;
  return { ship: next, fault };
}
export function isFaultRepairSelection(ship, selection) {
  return typeof selection === "string" && selection.startsWith("fault:") && activeSystemFaults(ship).some(f => `fault:${f.id}` === selection);
}
export function damageSystemIntegrity(ship, system, amount) {
  const current = systemIntegrity(ship, system);
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("System damage must be a positive finite amount.");
  const next = structuredClone(ship);
  next.resources ??= {};
  next.resources[system] = { value: Math.max(0, current.value - Number(amount)), max: current.max };
  return next;
}

/** Recovery stays available even when normal operations are disabled. */
export function systemOperationBlock(ship, action = {}) {
  const id = typeof action === "string" ? action : action.id;
  if (["engineer-emergency-repair", "captain-rally-crew", "engineer-vent-strain", "veilwarden-mend-lifeveil", "veilwarden-renewal-wave", "veilwarden-healing-lifeveil", "common-break-grapple", "navigator-break-grapple"].includes(id)) return null;
  const hull = systemIntegrity(ship, "hull");
  if (hull.max > 0 && hull.terminal) return "hull-wrecked";
  const station = action.rules?.originStation ?? action.station;
  if ((station === "navigator" || id === "move" || ["movement", "maneuver"].includes(action.category)) && systemIntegrity(ship, "drive").terminal) return "drive-disabled";
  if ((station === "engineer" || id === "move") && systemIntegrity(ship, "arkengine").terminal) return "arkengine-disabled";
  if (station === "veilwarden" && systemIntegrity(ship, "lifeveil").terminal) return "lifeveil-collapsed";
  if (station === "captain" && systemIntegrity(ship, "morale").terminal) return "morale-broken";
  return null;
}
