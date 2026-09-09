export function stationEffectProfile(level = 1) {
  const shipLevel = Math.max(1, Math.min(20, Math.trunc(Number(level) || 1)));
  const bonus = shipLevel >= 20 ? 3 : shipLevel >= 10 ? 2 : 1;
  const tier = shipLevel >= 20 ? 5 : shipLevel >= 15 ? 4 : shipLevel >= 10 ? 3 : shipLevel >= 5 ? 2 : 1;
  return Object.freeze({
    level: shipLevel,
    tier,
    bonus,
    advanced: shipLevel >= 5,
    expert: shipLevel >= 10,
    master: shipLevel >= 15,
    legendary: shipLevel >= 20
  });
}

export function stationBonus(level = 1) {
  return stationEffectProfile(level).bonus;
}

export function stationEffectCharges(actionId, level = 1) {
  const profile = stationEffectProfile(level);
  if (actionId === "captain-coordinate-assault") return profile.advanced ? 2 : 1;
  if ([
    "captain-issue-order",
    "battlewatch-acquire-target",
    "battlewatch-ready-broadside",
    "captain-brace-for-impact",
    "engineer-emergency-bypass",
    "navigator-evasive-maneuver",
    "battlewatch-spoil-their-aim",
    "veilwarden-emergency-ward"
  ].includes(actionId)) return 1;
  return null;
}

export function stationEffectMagnitude(effect, fallbackLevel = 1) {
  const level = Math.max(1, Math.trunc(Number(effect?.shipLevel) || Number(fallbackLevel) || 1));
  const base = stationBonus(level);
  const boost = Math.max(0, Math.trunc(Number(effect?.boost) || 0));
  return Math.max(1, Math.min(3, base + boost));
}

export function stationMitigationValue(kind, level = 1, boost = 0) {
  const magnitude = Math.max(1, Math.min(3, stationBonus(level) + Math.max(0, Math.trunc(Number(boost) || 0))));
  if (kind === "brace") return 3 * magnitude;
  if (kind === "emergency-ward") return 4 * magnitude;
  if (kind === "ward") return 2 * magnitude;
  return magnitude;
}