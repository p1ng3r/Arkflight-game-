export const SHIP_MOD_SLOT_CLASSES = Object.freeze([
  "weapon",
  "structural",
  "rigging",
  "lifeveil",
  "support",
  "utility"
]);

const TYPE_CLASS = Object.freeze({
  military: "weapon",
  weapon: "weapon",
  structural: "structural",
  helmSystem: "rigging",
  sailSystem: "rigging",
  propulsionSupport: "rigging",
  mobility: "rigging",
  lifeveil: "lifeveil",
  defensive: "lifeveil",
  cargo: "support",
  logistics: "support",
  support: "support",
  lookout: "support",
  detection: "support",
  command: "support"
});

export function shipModSlotClass(mod) {
  if (!mod) return "utility";
  const type = mod.data?.modType ?? "";
  if (TYPE_CLASS[type]) return TYPE_CLASS[type];
  const tags = new Set([...(mod.tags ?? []), ...(mod.traits ?? [])]);
  if (tags.has("weapon") || tags.has("military")) return "weapon";
  if (tags.has("structural") || tags.has("hull") || tags.has("bulkhead")) return "structural";
  if (tags.has("rigging") || tags.has("helm") || tags.has("sailSystem") || tags.has("maneuvering") || tags.has("propulsionSupport")) return "rigging";
  if (tags.has("lifeveil") || tags.has("veil")) return "lifeveil";
  if (tags.has("cargo") || tags.has("logistics") || tags.has("repair") || tags.has("support") || tags.has("detection") || tags.has("command")) return "support";
  return "utility";
}

export function shipModSlotSummary(ship, catalogs, derived) {
  const bonuses = derived?.stats?.modSlotBonuses ?? {};
  const typed = Object.fromEntries(SHIP_MOD_SLOT_CLASSES.map((key) => [key, Math.max(0, Number(bonuses[key] ?? 0))]));
  const flexible = Math.max(0, Number(bonuses.flexible ?? 0));
  const earnedTotal = Object.values(typed).reduce((sum, value) => sum + value, 0) + flexible;
  const totalCapacity = Math.max(0, Number(derived?.stats?.shipModCapacity ?? 0));
  const generic = Math.max(0, totalCapacity - earnedTotal);
  const installed = Object.fromEntries(SHIP_MOD_SLOT_CLASSES.map((key) => [key, 0]));

  for (const id of ship?.shipMods ?? []) {
    const mod = catalogs?.shipMods?.[id];
    const slotClass = shipModSlotClass(mod);
    installed[slotClass] = Number(installed[slotClass] ?? 0) + Number(mod?.capacityCost ?? 1);
  }

  const totalUsed = Object.values(installed).reduce((sum, value) => sum + value, 0);
  const overflow = Math.max(0, totalUsed - generic);
  let typedMatches = 0;
  let unmatchedInstalled = totalUsed;
  for (const key of SHIP_MOD_SLOT_CLASSES) {
    const matched = Math.min(installed[key], typed[key]);
    typedMatches += matched;
    unmatchedInstalled -= matched;
  }
  const flexibleMatches = Math.min(flexible, Math.max(0, unmatchedInstalled));
  const matchedOverflow = typedMatches + flexibleMatches;

  return Object.freeze({
    generic,
    typed: Object.freeze(typed),
    flexible,
    totalCapacity,
    installed: Object.freeze(installed),
    totalUsed,
    overflow,
    matchedOverflow,
    legal: totalUsed <= totalCapacity && matchedOverflow >= overflow
  });
}

export function shipModSlotRows(ship, catalogs, derived) {
  const summary = shipModSlotSummary(ship, catalogs, derived);
  return Object.freeze([
    Object.freeze({ id: "generic", label: "General", used: Math.min(summary.totalUsed, summary.generic), max: summary.generic }),
    ...SHIP_MOD_SLOT_CLASSES.map((id) => Object.freeze({ id, label: id.charAt(0).toUpperCase() + id.slice(1), used: Math.min(summary.installed[id], summary.typed[id]), max: summary.typed[id] })),
    Object.freeze({ id: "flexible", label: "Flexible", used: Math.min(summary.flexible, Math.max(0, summary.overflow - Object.values(summary.typed).reduce((sum, value, index) => sum + Math.min(Object.values(summary.installed)[index] ?? 0, value), 0))), max: summary.flexible })
  ]);
}
