export const STATIONS = Object.freeze(["captain", "engineer", "navigator", "watchmaster", "veilwarden"]);
export const DEGREE_SCORES = Object.freeze({ criticalSuccess: 2, success: 1, failure: 0, criticalFailure: -1 });
export const ROUND_BANDS = Object.freeze([
  { id: "extraordinary", min: 7, max: 10, momentum: 2 },
  { id: "strong-success", min: 4, max: 6, momentum: 1 },
  { id: "mixed-success", min: 2, max: 3, momentum: 0 },
  { id: "failure", min: 0, max: 1, momentum: -1 },
  { id: "disaster", min: -5, max: -1, momentum: -2 }
]);
export const RISK_TIERS = Object.freeze([2, 5, 8]);
export const PLANNING_SECONDS = 180;

export function riskBid({ tier, benefitId, parameters = {}, narrativeHook = "" }) {
  if (!RISK_TIERS.includes(tier)) throw new Error(`Unsupported Risk Bid tier: ${tier}`);
  if (!benefitId) throw new Error("Risk Bid requires benefitId");
  return Object.freeze({ tier, benefitId, parameters: Object.freeze({ ...parameters }), narrativeHook });
}

export function skillChoice({ id, label, skill, dc, traits = [], riskBids = [] }) {
  if (!id || !label || !skill) throw new Error("Skill choice requires id, label, and skill");
  if (!Number.isFinite(dc)) throw new Error(`Skill choice ${id} requires numeric dc`);
  return Object.freeze({ id, label, skill, dc, traits: Object.freeze([...traits]), riskBids: Object.freeze([...riskBids]) });
}

export function stationAction({ id, station, name, description, skills, consequences = {}, tags = [] }) {
  if (!STATIONS.includes(station)) throw new Error(`Unknown station: ${station}`);
  if (!id || !name || !description) throw new Error("Station action requires id, name, and description");
  if (!Array.isArray(skills) || skills.length < 1) throw new Error(`Action ${id} requires skill choices`);
  return Object.freeze({ id, station, name, description, skills: Object.freeze([...skills]), consequences: Object.freeze({ ...consequences }), tags: Object.freeze([...tags]) });
}

export function roundDefinition({ id, title, situation = "", image = "", stationActions, outcomes, narrativeHooks = {} }) {
  if (!id || !title) throw new Error("Round requires id and title");
  for (const station of STATIONS) {
    const actions = stationActions?.[station];
    if (!Array.isArray(actions) || actions.length !== 3) throw new Error(`Round ${id} must author exactly 3 ${station} actions`);
  }
  for (const band of ROUND_BANDS) {
    if (!outcomes?.[band.id]) throw new Error(`Round ${id} missing outcome for ${band.id}`);
  }
  return Object.freeze({ id, title, situation, image, stationActions: Object.freeze({ ...stationActions }), outcomes: Object.freeze({ ...outcomes }), narrativeHooks: Object.freeze({ ...narrativeHooks }) });
}

export function eventDefinition({ id, title, image, openingVignette, goal, startingState = {}, rounds, endings = {} }) {
  if (!id || !title || !image || !openingVignette || !goal) throw new Error("Event requires id, title, image, openingVignette, and goal");
  const sentenceCount = String(openingVignette).split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
  if (sentenceCount < 3 || sentenceCount > 6) throw new Error(`Opening vignette must be 3-6 sentences; received ${sentenceCount}`);
  if (!Array.isArray(rounds) || rounds.length < 1) throw new Error("Event requires at least one round");
  return Object.freeze({
    id,
    title,
    image,
    openingVignette,
    goal,
    planningSeconds: PLANNING_SECONDS,
    startingState: Object.freeze({ momentum: 0, pressure: {}, hazards: [], ...startingState }),
    rounds: Object.freeze([...rounds]),
    endings: Object.freeze({ ...endings })
  });
}

export function scoreRound(degrees) {
  const score = degrees.reduce((sum, degree) => {
    if (!(degree in DEGREE_SCORES)) throw new Error(`Unknown degree: ${degree}`);
    return sum + DEGREE_SCORES[degree];
  }, 0);
  const band = ROUND_BANDS.find((entry) => score >= entry.min && score <= entry.max);
  if (!band) throw new Error(`No round band for score ${score}`);
  return Object.freeze({ score, bandId: band.id, momentumDelta: band.momentum });
}

export function clampMomentum(value) {
  return Math.max(0, Math.min(3, Number(value) || 0));
}
