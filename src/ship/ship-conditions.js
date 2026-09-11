export const SHIP_CONDITION_SYSTEMS = Object.freeze(["hull", "drive", "weapons"]);

export const SHIP_CONDITION_TRACKS = Object.freeze({
  hull: Object.freeze([
    Object.freeze({ id: "sound", label: "Sound", severity: 0, hardnessMultiplier: 1 }),
    Object.freeze({ id: "battered", label: "Battered", severity: 1, hardnessMultiplier: 0.75 }),
    Object.freeze({ id: "breached", label: "Breached", severity: 2, hardnessMultiplier: 0.5 }),
    Object.freeze({ id: "shattered", label: "Shattered", severity: 3, hardnessMultiplier: 0 })
  ]),
  drive: Object.freeze([
    Object.freeze({ id: "responsive", label: "Responsive", severity: 0, speedPenalty: 0, maneuverPenalty: 0 }),
    Object.freeze({ id: "sluggish", label: "Sluggish", severity: 1, speedPenalty: 1, maneuverPenalty: 0 }),
    Object.freeze({ id: "faltering", label: "Faltering", severity: 2, speedPenalty: 2, maneuverPenalty: 1 }),
    Object.freeze({ id: "unresponsive", label: "Unresponsive", severity: 3, speedPenalty: 3, maneuverPenalty: 2 })
  ]),
  weapons: Object.freeze([
    Object.freeze({ id: "ready", label: "Ready", severity: 0, attackPenalty: 0, reloadPenalty: 0 }),
    Object.freeze({ id: "fouled", label: "Fouled", severity: 1, attackPenalty: 1, reloadPenalty: 1 }),
    Object.freeze({ id: "malfunctioning", label: "Malfunctioning", severity: 2, attackPenalty: 2, reloadPenalty: 2 }),
    Object.freeze({ id: "barely-operable", label: "Barely Operable", severity: 3, attackPenalty: 3, reloadPenalty: 3 })
  ])
});

const LEGACY_AREA_SEVERITY = Object.freeze({
  stable: 0,
  stressed: 1,
  damaged: 2,
  critical: 3,
  disabled: 4,
  functional: 0,
  destroyed: 4
});

const LEGACY_TARGET_ALIASES = Object.freeze({
  arkengine: "drive",
  rigging: "drive",
  helm: "drive",
  propulsion: "drive",
  command: "morale"
});

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function track(system) {
  const value = SHIP_CONDITION_TRACKS[system];
  if (!value) throw new Error(`Unknown Arkflight Ship Condition system: ${system}`);
  return value;
}

function rawConditionId(value) {
  if (typeof value === "string") return value;
  return value?.id ?? value?.slug ?? value?.state ?? null;
}

function normalizeConditionId(system, value) {
  const rows = track(system);
  const id = rawConditionId(value);
  return rows.some((row) => row.id === id) ? id : rows[0].id;
}

function legacySeverity(value) {
  return LEGACY_AREA_SEVERITY[String(value ?? "stable").toLowerCase()] ?? 0;
}

function conditionForLegacySeverity(system, severity) {
  const rows = track(system);
  return rows[Math.min(rows.length - 1, Math.max(0, Math.trunc(Number(severity) || 0)))]?.id ?? rows[0].id;
}

export function canonicalDamageTarget(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return LEGACY_TARGET_ALIASES[raw] ?? raw;
}

export function normalizeShipConditions(ship = {}) {
  const authored = ship.shipConditions ?? {};
  const legacyAreas = ship.areas ?? {};
  const legacySystems = ship.systems ?? {};

  const hullLegacy = legacySeverity(legacyAreas.hull?.state ?? legacySystems.hull);
  const driveLegacy = Math.max(
    legacySeverity(legacyAreas.arkengine?.state ?? legacySystems.arkengine),
    legacySeverity(legacyAreas.rigging?.state ?? legacySystems.rigging ?? legacySystems.helm)
  );
  const weaponLegacy = legacySeverity(legacySystems.weapons);

  return Object.freeze({
    hull: authored.hull ? normalizeConditionId("hull", authored.hull) : conditionForLegacySeverity("hull", hullLegacy),
    drive: authored.drive ? normalizeConditionId("drive", authored.drive) : conditionForLegacySeverity("drive", driveLegacy),
    weapons: authored.weapons ? normalizeConditionId("weapons", authored.weapons) : conditionForLegacySeverity("weapons", weaponLegacy)
  });
}

export function shipConditionProfile(ship, system) {
  const conditions = normalizeShipConditions(ship);
  const id = normalizeConditionId(system, conditions[system]);
  return track(system).find((row) => row.id === id) ?? track(system)[0];
}

export function conditionProfileById(system, id) {
  const normalized = normalizeConditionId(system, id);
  return track(system).find((row) => row.id === normalized) ?? track(system)[0];
}

export function setShipCondition(ship, system, conditionId) {
  if (!SHIP_CONDITION_SYSTEMS.includes(system)) throw new Error(`Unknown Arkflight Ship Condition system: ${system}`);
  return {
    ...ship,
    shipConditions: {
      ...normalizeShipConditions(ship),
      [system]: normalizeConditionId(system, conditionId)
    }
  };
}

export function worsenShipCondition(ship, system, steps = 1) {
  const rows = track(system);
  const current = shipConditionProfile(ship, system);
  const targetIndex = Math.min(rows.length - 1, current.severity + Math.max(1, Math.trunc(Number(steps) || 1)));
  const target = rows[targetIndex];
  return Object.freeze({
    ship: setShipCondition(ship, system, target.id),
    system,
    previous: current,
    condition: target,
    changed: target.id !== current.id
  });
}

export function improveShipCondition(ship, system, steps = 1) {
  const rows = track(system);
  const current = shipConditionProfile(ship, system);
  const targetIndex = Math.max(0, current.severity - Math.max(1, Math.trunc(Number(steps) || 1)));
  const target = rows[targetIndex];
  return Object.freeze({
    ship: setShipCondition(ship, system, target.id),
    system,
    previous: current,
    condition: target,
    changed: target.id !== current.id
  });
}

export function effectiveHullHardness(baseHardness, ship) {
  const base = Math.max(0, Math.trunc(Number(baseHardness) || 0));
  const multiplier = Number(shipConditionProfile(ship, "hull").hardnessMultiplier ?? 1);
  return Math.max(0, Math.floor(base * multiplier));
}

export function driveConditionPenalties(ship) {
  const profile = shipConditionProfile(ship, "drive");
  return Object.freeze({
    speedPenalty: Math.max(0, Number(profile.speedPenalty) || 0),
    maneuverPenalty: Math.max(0, Number(profile.maneuverPenalty) || 0)
  });
}

export function weaponConditionModifiers(ship) {
  const profile = shipConditionProfile(ship, "weapons");
  return Object.freeze({
    attackPenalty: Math.max(0, Number(profile.attackPenalty) || 0),
    reloadPenalty: Math.max(0, Number(profile.reloadPenalty) || 0)
  });
}

export function lifeveilCondition(value) {
  const percent = clampPercent(value);
  if (percent === 0) return Object.freeze({ id: "collapsed", label: "Collapsed", severity: 3, value: percent });
  if (percent <= 50) return Object.freeze({ id: "critical", label: "Critical", severity: 2, value: percent });
  if (percent <= 75) return Object.freeze({ id: "degraded", label: "Degraded", severity: 1, value: percent });
  return Object.freeze({ id: "stable", label: "Stable", severity: 0, value: percent });
}

export function moraleCondition(value) {
  const percent = clampPercent(value);
  if (percent === 0) return Object.freeze({ id: "broken", label: "Broken", severity: 5, value: percent });
  if (percent < 40) return Object.freeze({ id: "faltering", label: "Faltering", severity: 4, value: percent });
  if (percent < 60) return Object.freeze({ id: "shaken", label: "Shaken", severity: 3, value: percent });
  if (percent < 80) return Object.freeze({ id: "steady", label: "Steady", severity: 2, value: percent });
  if (percent < 100) return Object.freeze({ id: "confident", label: "Confident", severity: 1, value: percent });
  return Object.freeze({ id: "inspired", label: "Inspired", severity: 0, value: percent });
}

export function activeShipConditionViews(ship = {}) {
  const hull = shipConditionProfile(ship, "hull");
  const drive = shipConditionProfile(ship, "drive");
  const weapons = shipConditionProfile(ship, "weapons");
  const lifeveil = lifeveilCondition(ship?.resources?.lifeveil?.value ?? 0);
  const morale = moraleCondition(ship?.resources?.morale?.value ?? 0);
  return Object.freeze([
    Object.freeze({ system: "hull", ...hull }),
    Object.freeze({ system: "drive", ...drive }),
    Object.freeze({ system: "weapons", ...weapons }),
    Object.freeze({ system: "lifeveil", ...lifeveil }),
    Object.freeze({ system: "morale", ...morale })
  ]);
}

export function applyShipSystemDegradation(ship, target, { chosenTarget = null } = {}) {
  let system = canonicalDamageTarget(target);
  if (system === "player-choice") system = canonicalDamageTarget(chosenTarget);
  if (!["hull", "drive", "weapons", "lifeveil", "morale"].includes(system)) {
    throw new Error(`Unknown Arkflight degradation target: ${target}`);
  }

  if (SHIP_CONDITION_SYSTEMS.includes(system)) {
    const result = worsenShipCondition(ship, system, 1);
    return Object.freeze({ ...result, target: system });
  }

  const next = structuredClone(ship);
  next.resources ??= {};
  if (system === "lifeveil") {
    const before = clampPercent(next.resources?.lifeveil?.value ?? 0);
    const after = clampPercent(before - 25);
    next.resources.lifeveil = { ...(next.resources.lifeveil ?? {}), value: after, max: 100 };
    return Object.freeze({ ship: next, target: system, previous: lifeveilCondition(before), condition: lifeveilCondition(after), changed: after !== before, amountLost: before - after });
  }

  const before = clampPercent(next.resources?.morale?.value ?? 0);
  const after = clampPercent(before - 20);
  next.resources.morale = { ...(next.resources.morale ?? {}), value: after, max: 100 };
  return Object.freeze({ ship: next, target: system, previous: moraleCondition(before), condition: moraleCondition(after), changed: after !== before, amountLost: before - after });
}
