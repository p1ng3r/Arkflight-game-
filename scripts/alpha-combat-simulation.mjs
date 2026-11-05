import { createAlphaSession, dispatchAlphaCommand, alphaSuggestedStep } from "../src/alpha/combat.js";

// Legacy flow-1 pacing probe; this is not current roundFlow=2 acceptance.
// Deterministic rules-only pacing probe. No Foundry documents, forced hits or hidden-plan prediction.
const samples = Number(process.argv[2] ?? 12);
if (!Number.isInteger(samples) || samples < 1 || samples > 200) throw new Error("Choose 1–200 samples.");
const results = [];
for (let seed = 1; seed <= samples; seed++) {
  let state = createAlphaSession([
    { id: "a", name: "Rum Runner", team: "crew", hullId: "brigantine", pose: { q: 0, r: 0, heading: 0 } },
    { id: "b", name: "Needlewake", team: "enemy", hullId: "cutter", pose: { q: 3, r: -6, heading: 3 } }
  ], { id: `pacing-${seed}`, seed });
  let steps = 0;
  while (!state.complete && state.round <= 20 && steps < 1200) {
    const suggestion = alphaSuggestedStep(state);
    if (!suggestion) throw new Error(`Seed ${seed}: no action in ${state.phase}.`);
    try {
      state = await dispatchAlphaCommand(state, {
        ...suggestion.command, encounterId: state.id, revision: state.revision
      });
    } catch (error) {
      throw new Error(`Seed ${seed}, round ${state.round}, ${suggestion.label}: ${error.message}`, { cause: error });
    }
    steps++;
  }
  if (!state.complete) throw new Error(`Seed ${seed}: encounter did not finish within the pacing limit.`);
  results.push({ seed, rounds: state.round, steps, hull: Object.fromEntries(Object.values(state.ships).map(s => [s.id, s.resources.hull.value])) });
}
console.log(JSON.stringify({
  roundFlow: 1, legacy: true,
  scenario: "Legacy alpha flow 1: Level-5 Brigantine versus Cutter; default decks; suggestion policy; seeds 1..N",
  samples, meanRounds: results.reduce((n, r) => n + r.rounds, 0) / samples,
  minimum: Math.min(...results.map(r => r.rounds)), maximum: Math.max(...results.map(r => r.rounds)),
  withinFourToSix: results.filter(r => r.rounds >= 4 && r.rounds <= 6).length,
  limitation: "Legacy roundFlow=1 only. One policy/matchup; not current roundFlow=2 balance or live Foundry acceptance.",
  results
}, null, 2));
