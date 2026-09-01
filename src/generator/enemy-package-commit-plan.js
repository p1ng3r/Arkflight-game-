const STATIONS = Object.freeze(["captain", "engineer", "navigator", "watchmaster", "veilwarden"]);

function assertPreview(preview) {
  if (!preview?.ship?.identity?.name) throw new Error("Generated package requires a named ship preview.");
  if (!Array.isArray(preview?.crew?.officers) || preview.crew.officers.length !== STATIONS.length) throw new Error("Generated package requires all five station officer previews.");
}

export function buildEnemyPackageCommitPlan(preview, { folderConflict = "error" } = {}) {
  assertPreview(preview);
  const officers = Object.freeze(preview.crew.officers.map((officer) => Object.freeze({
    station: officer.station,
    name: officer.name,
    actorData: officer.actorData,
    autoAssignToStation: true,
    signatureGear: officer.signatureGear,
    combatMathMode: officer.signatureGear?.combatMathMode ?? "npc-benchmark-independent",
    recoveryPolicy: officer.signatureGear?.recoveryPolicy ?? "reward-system-decision"
  })));
  const selectedTemplates = Object.freeze((preview.crew.templates ?? [])
    .filter((template) => template.selected)
    .map((template) => Object.freeze({ type: template.type, label: template.label, actorData: template.actorData })));

  return Object.freeze({
    version: 2,
    shipName: preview.ship.identity.name,
    folder: Object.freeze({ rootName: "Arkflight", shipFolderName: preview.ship.identity.name, conflictPolicy: folderConflict }),
    ship: Object.freeze({ source: preview.ship, classification: "npc" }),
    officers,
    permanentStationBindings: Object.freeze(Object.fromEntries(STATIONS.map((station) => {
      const officer = officers.find((entry) => entry.station === station);
      return [station, Object.freeze({ officerName: officer?.name ?? null, resolveCreatedActorId: true })];
    }))),
    crewTemplates: selectedTemplates,
    ordinaryCrewCount: preview.crew.ordinaryCrew,
    loot: preview.loot,
    recovery: Object.freeze({
      signatureGear: Object.freeze({ autoAward: false, decisionOwner: "reward-system" }),
      salvage: preview.loot?.salvageValuePolicy ?? null
    }),
    canPersist: Boolean(preview.canCommit),
    blockers: Object.freeze([...(preview.blockers ?? [])])
  });
}

export const GENERATED_PACKAGE_STATIONS = STATIONS;
