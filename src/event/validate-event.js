import { STATIONS, ROUND_BANDS, RISK_TIERS } from "./event-schema.js";

export function validateEventDefinition(event, { riskBenefits = {} } = {}) {
  const errors = [];
  const warnings = [];
  const push = (path, message) => errors.push({ path, message });

  if (!event?.id) push("id", "Event id is required.");
  if (!event?.title) push("title", "Event title is required.");
  if (!event?.image) push("image", "Event image is required.");
  if (!event?.goal) push("goal", "Event goal is required.");

  const sentences = String(event?.openingVignette ?? "").split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
  if (sentences < 3 || sentences > 6) push("openingVignette", `Opening vignette must contain 3-6 sentences; found ${sentences}.`);
  if (event?.planningSeconds !== 180) push("planningSeconds", "Crew planning must be 180 seconds.");
  if (!Array.isArray(event?.rounds) || !event.rounds.length) push("rounds", "Event requires at least one round.");

  for (const [roundIndex, round] of (event?.rounds ?? []).entries()) {
    const base = `rounds[${roundIndex}]`;
    if (!round?.id || !round?.title) push(base, "Round requires id and title.");

    for (const station of STATIONS) {
      const actions = round?.stationActions?.[station];
      if (!Array.isArray(actions) || actions.length !== 3) {
        push(`${base}.stationActions.${station}`, "Exactly 3 authored actions are required.");
        continue;
      }

      for (const [actionIndex, action] of actions.entries()) {
        const ap = `${base}.stationActions.${station}[${actionIndex}]`;
        if (action.station !== station) push(`${ap}.station`, `Action station must be ${station}.`);
        if (!Array.isArray(action.skills) || action.skills.length < 2 || action.skills.length > 3) push(`${ap}.skills`, "Authored actions should offer 2-3 skill choices.");

        for (const [skillIndex, skill] of (action.skills ?? []).entries()) {
          const sp = `${ap}.skills[${skillIndex}]`;
          for (const bid of skill.riskBids ?? []) {
            if (!RISK_TIERS.includes(bid.tier)) push(`${sp}.riskBids`, `Unsupported Risk tier ${bid.tier}.`);
            const benefit = riskBenefits[bid.benefitId];
            if (!benefit) push(`${sp}.riskBids`, `Unknown Risk benefit ${bid.benefitId}.`);
            else {
              if (benefit.tier !== bid.tier) push(`${sp}.riskBids`, `Benefit ${benefit.id} is tier ${benefit.tier}, not ${bid.tier}.`);
              if (!benefit.success || !benefit.criticalSuccess) push(`${sp}.riskBids`, `Benefit ${benefit.id} requires Success and Critical Success effects.`);
              if (benefit.success === benefit.criticalSuccess) push(`${sp}.riskBids`, `Benefit ${benefit.id} Critical Success must be extraordinary.`);
            }
          }
        }
      }
    }

    for (const band of ROUND_BANDS) {
      if (!round?.outcomes?.[band.id]) push(`${base}.outcomes.${band.id}`, "Authored consequence is required for every universal band.");
    }
  }

  if (!event?.endings || typeof event.endings !== "object" || !Object.keys(event.endings).length) {
    warnings.push({ path: "endings", message: "Event has no authored ending conditions yet." });
  }

  return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
}
