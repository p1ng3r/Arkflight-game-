const V1_KEY = "arkflight.planningLayoutTuner.v1";
const V2_KEY = "arkflight.planningLayoutTuner.v2";
const LEGACY_TARGETS = ["banner", "rail", "detail", "footer", "workspace"];

function hasLegacyAdjustment(state) {
  if (!state || typeof state !== "object") return false;
  return LEGACY_TARGETS.some((target) => Object.values(state[target] ?? {}).some((value) => Number(value) !== 0));
}

function migratePlanningLayout() {
  try {
    const legacy = JSON.parse(localStorage.getItem(V1_KEY) || "null");
    if (!legacy || typeof legacy !== "object" || !hasLegacyAdjustment(legacy)) return;

    const current = JSON.parse(localStorage.getItem(V2_KEY) || "null");
    // Only restore the old board geometry when v2 has no meaningful board tuning yet.
    // This preserves any new corner-art values the GM may already have changed.
    if (hasLegacyAdjustment(current)) return;

    const migrated = current && typeof current === "object" ? structuredClone(current) : {};
    for (const target of LEGACY_TARGETS) {
      if (legacy[target] && typeof legacy[target] === "object") migrated[target] = structuredClone(legacy[target]);
    }
    localStorage.setItem(V2_KEY, JSON.stringify(migrated));
    console.info("Arkflight | Restored Planning layout while preserving v2 corner controls.");
  } catch (error) {
    console.warn("Arkflight | Could not migrate Planning layout tuner state", error);
  }
}

migratePlanningLayout();
