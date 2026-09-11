export const SHIP_MOD_SLOT_CLASSES = Object.freeze([
  "weapon",
  "structural",
  "rigging",
  "lifeveil",
  "support",
  "utility",
  "exploration",
  "expedition"
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
  if (tags.has("exploration") || tags.has("survey") || tags.has("cartography") || tags.has("anomaly-detection")) return "exploration";
  if (tags.has("expedition") || tags.has("field-operations") || tags.has("field-logistics")) return "expedition";
  if (tags.has("weapon") || tags.has("military")) return "weapon";
  if (tags.has("structural") || tags.has("hull") || tags.has("bulkhead")) return "structural";
  if (tags.has("rigging") || tags.has("helm") || tags.has("sailSystem") || tags.has("maneuvering") || tags.has("propulsionSupport")) return "rigging";
  if (tags.has("lifeveil") || tags.has("veil")) return "lifeveil";
  if (tags.has("cargo") || tags.has("logistics") || tags.has("repair") || tags.has("support") || tags.has("detection") || tags.has("command")) return "support";
  return "utility";
}

export function shipModSpecializedSlotClasses(mod) {
  if (!mod) return Object.freeze([]);
  const tags = new Set([...(mod.tags ?? []), ...(mod.traits ?? [])].map((value) => String(value).toLowerCase()));
  const capabilities = new Set([...(mod.capabilities ?? [])].map((value) => String(value).toLowerCase()));
  const text = `${mod.name ?? ""} ${mod.description ?? ""}`.toLowerCase();
  const classes = [];

  const exploration = ["exploration", "survey", "cartography", "anomaly-detection", "scanning"].some((tag) => tags.has(tag))
    || (tags.has("detection") && (tags.has("navigation") || /survey|anomal|scout|chart|observ/.test(text)))
    || [...capabilities].some((value) => /survey|anomal|scout|cartograph|detect/.test(value));
  if (exploration) classes.push("exploration");

  const expedition = ["expedition", "field-operations", "field-logistics", "salvage", "repair", "docking"].some((tag) => tags.has(tag))
    || /field lab|laboratory|medical bay|workshop|salvage|repair store|shore-party|expedition/.test(text)
    || [...capabilities].some((value) => /field|salvage|repair|docking|expedition/.test(value));
  if (expedition) classes.push("expedition");

  return Object.freeze(classes);
}

export function shipModCompatibleSlotClasses(mod) {
  const primary = String(mod?.data?.refit?.slotClass ?? shipModSlotClass(mod) ?? "utility");
  return Object.freeze([...new Set([primary, ...shipModSpecializedSlotClasses(mod)])]);
}

export function shipModFitsSocketType(mod, socketType = "generic") {
  const type = String(socketType ?? "generic");
  if (type === "generic" || type === "flexible") return true;
  return shipModCompatibleSlotClasses(mod).includes(type);
}

export function shipModSocketRows(ship, catalogs, derived) {
  const summary = shipModSlotSummary(ship, catalogs, derived);
  const rows = [];
  const push = (type, count) => {
    for (let i = 0; i < Math.max(0, Math.trunc(Number(count) || 0)); i += 1) {
      rows.push(Object.freeze({ index: rows.length, type, typeIndex: i }));
    }
  };
  push("generic", summary.generic);
  for (const type of SHIP_MOD_SLOT_CLASSES) push(type, summary.typed[type]);
  push("flexible", summary.flexible);
  return Object.freeze(rows);
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
