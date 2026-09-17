function normalizeAngle(value) {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

export function helmBearing(origin, target) {
  const dx = Number(target?.x ?? 0) - Number(origin?.x ?? 0);
  const dy = Number(target?.y ?? 0) - Number(origin?.y ?? 0);
  if (!dx && !dy) return 0;
  return normalizeAngle(Math.atan2(dx, -dy) * 180 / Math.PI);
}

export function signedHelmDelta(from, to) {
  const a = normalizeAngle(from);
  const b = normalizeAngle(to);
  let delta = ((b - a + 540) % 360) - 180;
  if (delta === -180) delta = 180;
  return delta;
}

function rankedCandidates(origin, candidates, heading) {
  return candidates
    .map((candidate, index) => {
      const bearing = helmBearing(origin, candidate.center ?? candidate);
      const delta = signedHelmDelta(heading, bearing);
      return Object.freeze({
        ...candidate,
        index,
        bearing,
        delta,
        angularDistance: Math.abs(delta)
      });
    })
    .sort((a, b) => a.angularDistance - b.angularDistance || a.delta - b.delta);
}

function nearestPair(origin, candidates, heading, epsilon = 1) {
  const ranked = rankedCandidates(origin, candidates, heading);
  if (!ranked.length) return Object.freeze([]);
  const nearest = ranked[0].angularDistance;
  return Object.freeze(ranked.filter((entry) => Math.abs(entry.angularDistance - nearest) <= epsilon).slice(0, 2));
}

function directionalOptions(origin, candidates, heading, prefix) {
  const nearest = nearestPair(origin, candidates, heading);
  if (nearest.length <= 1) {
    const entry = nearest[0];
    return Object.freeze(entry ? [Object.freeze({ ...entry, id: prefix, side: "center" })] : []);
  }

  return Object.freeze(nearest.map((entry) => {
    const side = entry.delta < 0 ? "left" : "right";
    return Object.freeze({ ...entry, id: `${prefix}-${side}`, side });
  }).sort((a, b) => {
    const order = { left: 0, center: 1, right: 2 };
    return order[a.side] - order[b.side];
  }));
}

/**
 * Rank Foundry-provided adjacent hex centers against an Arkflight ship heading.
 * This deliberately does not assume flat-top or pointy-top hex orientation.
 */
export function shipHelmDirections(origin, candidates, heading) {
  const bow = normalizeAngle(heading);
  const stern = normalizeAngle(bow + 180);
  return Object.freeze({
    heading: bow,
    forward: directionalOptions(origin, candidates, bow, "forward"),
    reverse: directionalOptions(origin, candidates, stern, "reverse")
  });
}
