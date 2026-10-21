import { PLAYTEST_COMBAT_CARDS as CARDS } from "../content/combat-cards-playtest.js";
import { cardAvailability } from "./card-library.js";
import { getOrderQueue, availableOrderResources } from "./committed-orders.js";
import { CARD_SKILLS, batteryOptions, movePlaytestShip, weaponCoverage } from "./card-playtest-session.js";
import { dispatchPlaytestCommand } from "./playtest-commands.js";

const card = id => CARDS.find(c => c.id === id);
const title = id => card(id)?.name ?? String(id).replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
const degree = d => ({ 2: "Critical success", 1: "Success", 0: "Failure", "-1": "Critical failure" }[d]);
export function assertDemoStartAllowed(user, current, paused, nativeCombatRunning = false) {
  if (!user?.isGM) throw new Error("Only the GM may start the guided combat test.");
  if (paused) throw new Error("Unpause Foundry before advancing the guided test.");
  if (current?.id && current.phase !== "complete") throw new Error("End the running encounter before starting or resetting the guided test.");
  if (nativeCombatRunning) throw new Error("Finish the active Foundry encounter before starting the guided test.");
}
const PLAN = {
  wayfarer: [["breakaway-vector", "feed-the-guns", "fire-battery", "work-the-guns"], ["vent-strain", "acquire-target", "drive-the-crew", "fire-battery"], ["breakaway-vector", "acquire-target", "fire-battery"]],
  swiftwake: [["rally-crew", "mend-lifeveil", "fire-battery"], ["healing-lifeveil", "charted-course", "fire-battery"], ["redistribute-power", "rally-crew", "fire-battery"]],
  ironspear: [["coordinate-assault", "ready-broadside", "fire-battery"], ["issue-order", "fire-battery", "damage-control"], ["vent-strain", "ready-broadside", "fire-battery"]],
  resolute: [["reinforce-lifeveil", "fire-battery"], ["mend-lifeveil", "fire-battery"], ["healing-lifeveil", "fire-battery"]]
};
export function equipDemoShip(source, role) {
  if (!PLAN[role]) throw new Error("Unknown demonstration vessel.");
  const ship = structuredClone(source), wanted = new Set(PLAN[role].flat());
  const ap = ["general", "flux", "signature"].flatMap(type => {
    const pool = CARDS.filter(c => c.deck === "ap" && c.type === type).sort((a, b) => Number(wanted.has(b.id)) - Number(wanted.has(a.id)));
    return pool.slice(0, { general: 8, flux: 3, signature: 1 }[type]).map(c => c.id);
  });
  ship.cardDecks.library = { ap: CARDS.filter(c => c.deck === "ap").map(c => c.id), rp: CARDS.filter(c => c.deck === "rp").map(c => c.id) };
  ship.cardDecks.hands = { ap, rp: [...ship.cardDecks.library.rp] };
  ship.resources.hull.value = Math.ceil(ship.resources.hull.max * .85);
  ship.resources.lifeveil.value = 65; ship.resources.morale.value = 65;
  ship.resources.strain.value = 4;
  return ship;
}
export function initializeDemo(session, roles) {
  const next = structuredClone(session);
  next.guidedDemo = { version: 1, status: "running", step: 0, roles, rollIndex: 0, seen: {}, history: [], last: { title: "Test fleet ready", lines: ["Four dedicated demonstration ships. Fixed test rolls; normal combat rules. Nothing advances until Next Step."], round: 1, kind: "setup" } };
  return next;
}
function order(ship, id) {
  const definition = card(id), station = definition?.stations[0] ?? (id === "damage-control" ? "engineer" : ["full-thrust", "hard-turn"].includes(id) ? "navigator" : "battlewatch");
  return { kind: definition ? "card" : "basic", abilityId: id, station, operatorId: ship.crew.stations[station] };
}
function fireSelection(state, id) {
  const ship = state.ships[id], enemies = Object.keys(state.ships).filter(other => state.ships[other].cardPlay.team !== ship.cardPlay.team);
  const mounts = [...new Set(ship.cardPlay.weapons.map(w => w.mount))].sort((a, b) => Number(["port", "starboard"].includes(b)) - Number(["port", "starboard"].includes(a)));
  for (const batteryId of mounts) {
    const targets = enemies.map(targetId => ({ targetId, guns: batteryOptions(state, id, targetId, batteryId) })).filter(t => t.guns.length);
    if (!targets.length) continue;
    if (state.round === 1 && state.guidedDemo.roles[id] === "wayfarer" && ["port", "starboard"].includes(batteryId) && targets.length > 1) {
      const assigned = new Set(), assignments = [];
      for (const t of targets) { const gun = t.guns.find(w => w.arcTemplate === "broadside" && !assigned.has(w.key)); if (gun) { assigned.add(gun.key); assignments.push({ weaponKey: gun.key, targetId: t.targetId }); } }
      if (assignments.length > 1) return { batteryId, assignments };
    }
    return { batteryId, targetId: targets[0].targetId };
  }
  return null;
}
function firingCourse(state, id) {
  const queue = [{ state, path: [] }], visited = new Set();
  for (let i = 0; i < queue.length && i < 500; i++) {
    const current = queue[i], m = current.state.ships[id].cardPlay.motion;
    const key = `${m.q},${m.r},${m.heading},${m.used},${m.turns},${m.lastTurnCell}`;
    if (visited.has(key)) continue; visited.add(key);
    if (current.path.length && fireSelection(current.state, id)) return current.path[0];
    if (current.path.length >= 5) continue;
    for (const direction of ["forward", "left", "right"]) {
      try { queue.push({ state: movePlaytestShip(current.state, id, direction), path: [...current.path, direction] }); } catch { /* Illegal courses are not candidates. */ }
    }
  }
  return null;
}
const step = (kind, shipId, heading, explanation, extra = {}) => ({ kind, shipId, title: heading, explanation, ...extra });
export function nextDemoStep(state) {
  const demo = state?.guidedDemo;
  if (!demo || demo.status !== "running") return null;
  if (state.round > 3 || state.phase === "complete") return step("finish", null, "Finish the three-round test", "End the demonstration and review its checks and resource totals.", { command: { type: "end" } });
  if (state.pendingAttack) {
    const id = state.pendingAttack.targetId, ship = state.ships[id], available = availableOrderResources(ship);
    const preferences = state.round === 1 ? ["emergency-ward", "brace-impact"] : state.round === 2 ? ["last-bastion", "deflect-impact", "evasive-maneuver"] : ["hold-together", "brace-impact"];
    const chosen = ship.cardPlay.rp > 0 ? preferences.find(id => cardAvailability(ship, CARDS, id).ok && Object.entries(card(id).costs ?? {}).every(([key, cost]) => available[key] >= cost)) : null;
    const station = card(chosen)?.originStation ?? "captain";
    return step("reaction", id, chosen ? `React: ${title(chosen)}` : "Pass on this attack", "Resolve just this defender. AP and RP are separate; split volleys give each target its own response.", { command: { type: "respond", response: { cardId: chosen ?? null, station, skill: CARD_SKILLS[station][0] } } });
  }
  if (state.phase === "planning") {
    const id = Object.keys(state.ships).find(id => getOrderQueue(state.ships[id]).phase === "planning");
    if (!id) throw new Error("The demonstration has no Captain able to lock.");
    const ship = state.ships[id], q = getOrderQueue(ship);
    const orders = PLAN[demo.roles[id]][state.round - 1].filter(id => !card(id) || cardAvailability(ship, CARDS, id).ok).map(id => order(ship, id));
    return step("lock", id, `Lock ${ship.cardPlay.name}'s plan`, "Reserve the listed AP orders. Targets stay undecided. The final Captain's lock also rolls this round's initiative.", { orders, command: { type: "lock", request: { round: q.round, revision: q.revision, orders } } });
  }
  const id = state.turnOrder[state.turnIndex], ship = state.ships[id], q = getOrderQueue(ship), key = `${state.round}:${id}`;
  const helm = (direction, flag = null) => step("movement", id, direction === "forward" ? "Move one hex" : `Turn ${direction} 60°`, "Use the real Navigator allowance and native token movement. Movement can stop for an attack and continue afterward.", { flag, command: { type: "helm", direction } });
  if (!demo.seen[`${key}:approach`]) {
    try { movePlaytestShip(state, id, "forward"); return helm("forward", `${key}:approach`); } catch { return step("inspect", id, "Inspect the blocked approach", "This hex is occupied or movement is unavailable; no movement is spent.", { flag: `${key}:approach` }); }
  }
  if (q.ap.bonusAvailable > 0) {
    const orders = ["damage-control", "full-thrust", "hard-turn"].slice(0, q.ap.bonusAvailable).map(id => order(ship, id));
    return step("bonus", id, "Commit the Signature's additional AP", "Drive the Crew granted AP. Commit three basic orders without restoring the original AP or refreshing the Signature.", { orders, command: { type: "lock", request: { round: q.round, revision: q.revision, orders, bonus: true } } });
  }
  const pending = q.orders.find(o => o.status === "pending");
  if (pending) {
    const selection = { skill: CARD_SKILLS[pending.station][0] };
    if (pending.abilityId === "fire-battery") {
      const fire = fireSelection(state, id);
      if (!fire) {
        const direction = firingCourse(state, id);
        if (direction) return helm(direction);
        return step("skip", id, "Skip an unavailable battery", "No ready weapon can reach a legal target within the remaining movement/turn allowance. The real controller skips the order; it does not invent a hit or refund committed AP.", { command: { type: "skip", request: { round: q.round, revision: q.revision, orderId: pending.id, reason: "No ready battery can acquire a target this turn." } } });
      }
      const flag = `${key}:coverage:${pending.id}`;
      if (!demo.seen[flag]) return step("coverage", id, "Inspect firing arcs and range", "Highlight legal coverage before firing. This inspection spends no AP or RP. Press Next Step again to actually fire.", { flag, selection: fire });
      Object.assign(selection, fire);
    }
    if (pending.abilityId === "issue-order") selection.choice = "battlewatch";
    if (pending.abilityId === "redistribute-power") selection.choice = "weapons";
    if (pending.abilityId === "work-the-guns") {
      const gun = ship.cardPlay.weapons.find(w => w.readyRound > state.round);
      if (gun) selection.choice = gun.key;
    }
    return step("execute", id, `Execute ${title(pending.abilityId)}`, card(pending.abilityId)?.description ?? "Resolve this committed basic order through the normal combat controller.", { abilityId: pending.abilityId, command: { type: "resolve", request: { round: q.round, revision: q.revision, orderId: pending.id, selection } } });
  }
  if (demo.roles[id] === "wayfarer" && !demo.seen[`${key}:continue`]) {
    try { movePlaytestShip(state, id, "forward"); return helm("forward", `${key}:continue`); } catch { return step("inspect", id, "Inspect remaining movement", "Continuing movement is blocked or exhausted. Nothing is spent.", { flag: `${key}:continue` }); }
  }
  if (demo.roles[id] === "wayfarer" && !demo.seen[`${key}:turn`]) {
    for (const direction of ["right", "left"]) { try { movePlaytestShip(state, id, direction); return helm(direction, `${key}:turn`); } catch {} }
    return step("inspect", id, "Inspect remaining facing allowance", "No legal turn remains; heading is unchanged.", { flag: `${key}:turn` });
  }
  return step("advance", id, "Finish this ship's turn", "Pass to the next ship. After the final ship, restore round budgets and return to Captain planning; initiative is rolled again after the new plans lock.", { command: { type: "advance" } });
}
export function demoSummary(state) {
  const history = state.guidedDemo.history;
  return [
    ["Three rounds completed", state.round > 3], ["Fresh initiative each round", [1, 2, 3].every(r => history.some(s => s.initiative && s.round === r))],
    ["Native movement and facing exercised", history.some(s => s.kind === "movement")], ["Coverage shown before attacks", history.some(s => s.kind === "coverage")],
    ["Defenders resolved attacks", history.some(s => s.kind === "reaction")], ["Signature earned an additional plan", history.some(s => s.kind === "bonus")],
    ["Flux 2 recovered in round 3", history.some(s => s.round === 3 && s.abilityId === "breakaway-vector" && s.resolved)],
    ["Reload advancement exercised", history.some(s => s.abilityId === "work-the-guns" && s.resolved)]
  ].map(([name, passed]) => ({ name, passed }));
}
export async function runDemoStep(input, adapters) {
  if (!adapters.user?.isGM) throw new Error("Only the GM may advance the guided test.");
  const action = nextDemoStep(input); if (!action) throw new Error("Start or reset the guided test first.");
  const meta = structuredClone(input.guidedDemo), rolls = [];
  const roll = async formula => {
    const match = /^(\d+)d(\d+)([+-]\d+)?$/.exec(formula.replaceAll(" ", ""));
    if (!match) throw new Error("Unsupported demonstration roll.");
    const [, count, sides, bonus] = match;
    const dice = Array.from({ length: Number(count) }, () => { const i = meta.rollIndex++; return Number(sides) === 20 ? [18, 13, 9, 5, 20, 1, 15, 11][i % 8] : 1 + ((i * 7 + 3) % Number(sides)); });
    const total = dice.reduce((sum, n) => sum + n, Number(bonus ?? 0)); rolls.push(`${formula}: ${dice.join(" + ")}${bonus ?? ""} = ${total}`); return total;
  };
  const command = action.command ? { ...action.command, shipId: action.shipId, sessionId: input.id, revision: input.revision } : null;
  const next = command ? await dispatchPlaytestCommand(input, command, { ...adapters, roll }) : structuredClone(input);
  if (!command) next.revision++;
  if (action.flag) meta.seen[action.flag] = true;
  const lines = [action.explanation], entry = next.log.at(-1);
  if (entry && entry !== input.log.at(-1) && JSON.stringify(entry) !== JSON.stringify(input.log.at(-1))) {
    if (entry.results) lines.push(`Initiative: ${entry.results.map(r => `${next.ships[r.id].cardPlay.name} ${r.die + r.modifier}`).join(" · ")}`);
    const result = entry.result;
    if (result?.degree !== undefined) lines.push(`${degree(result.degree)}: d20 ${result.die} + ${result.modifier} = ${result.total} vs ${result.dc !== undefined ? "DC " + result.dc : "AC " + result.ac}.`);
    if (result?.damage !== undefined && result.degree === undefined) lines.push(`Attack: d20 ${result.die} + ${result.total - result.die} = ${result.total}; rolled battery damage ${result.damage}. Damage waits for the defending crew's response.`);
    if (card(action.abilityId)?.outcomes && result?.degree !== undefined) lines.push(card(action.abilityId).outcomes[["criticalFailure", "failure", "success", "criticalSuccess"][result.degree + 1]]);
    if (action.kind === "reaction") {
      const attack = input.pendingAttack, multiplier = result.degree === 2 ? 2 : result.degree >= 1 ? 1 : 0;
      lines.push(`Battery ${attack.damage} × ${multiplier} = ${attack.damage * multiplier}; defenses prevented ${Math.max(0, attack.damage * multiplier - result.damage)}; final Hull damage ${result.damage}.`);
      if (result.reaction) lines.push(`Reaction: ${degree(result.reaction.degree)}, ${result.reaction.total} vs DC ${result.reaction.dc}.`);
    }
  }
  if (action.kind === "lock" || action.kind === "bonus") lines.push(`Committed ${action.orders.length} AP: ${action.orders.map(o => title(o.abilityId)).join(", ")}.`);
  if (action.kind === "movement") {
    const before = input.ships[action.shipId].cardPlay.motion, after = next.ships[action.shipId].cardPlay.motion;
    lines.push(`Hex (${before.q}, ${before.r}) → (${after.q}, ${after.r}); facing ${input.canvas?.headings?.[before.heading] ?? before.heading * 60}° → ${next.canvas?.headings?.[after.heading] ?? after.heading * 60}°. Free movement ${after.used}/${after.speed + after.extra}; turns ${after.turns}/${after.baseTurns + after.bonusTurns}. No AP spent.`);
  }
  if (action.kind === "coverage") lines.push(`${weaponCoverage(input, action.shipId).length} weapon/hex coverage entries. ${action.selection.assignments ? "Split broadside: different installations assigned to different enemies." : "Concentrated fire: one selected enemy."}`);
  const resolvedOrder = action.command?.request?.orderId && action.shipId ? getOrderQueue(next.ships[action.shipId]).orders.find(o => o.id === action.command.request.orderId) : null;
  if (resolvedOrder?.status === "skipped") lines.push(`Skipped: ${resolvedOrder.reason}. Committed AP is not refunded.`);
  if (resolvedOrder?.status === "resolved" && card(action.abilityId)) {
    const availability = cardAvailability(next.ships[action.shipId], CARDS, action.abilityId);
    if (!availability.ok) lines.push(availability.readyRound ? `${title(action.abilityId)} returns in round ${availability.readyRound}.` : `${title(action.abilityId)}: ${availability.reason.replaceAll("-", " ")}.`);
  }
  for (const [id, ship] of Object.entries(next.ships)) {
    for (const key of ["hull", "lifeveil", "strain", "morale", "supplies"]) {
      const delta = ship.resources[key].value - input.ships[id].resources[key].value;
      if (delta) lines.push(`${ship.cardPlay.name}: ${key} ${delta > 0 ? "+" : ""}${delta} → ${ship.resources[key].value}.`);
    }
    const rpDelta = ship.cardPlay.rp - input.ships[id].cardPlay.rp; if (rpDelta) lines.push(`${ship.cardPlay.name}: RP ${rpDelta > 0 ? "+" : ""}${rpDelta} → ${ship.cardPlay.rp}.`);
  }
  meta.step++; meta.last = { ...action, resolved: resolvedOrder?.status === "resolved", round: Math.min(3, input.round), lines, rolls, number: meta.step, initiative: entry?.label === "Initiative" && JSON.stringify(entry) !== JSON.stringify(input.log.at(-1)) };
  delete meta.last.command;
  meta.history.push(meta.last); meta.history = meta.history.slice(-200);
  if (action.kind === "finish") meta.status = "complete";
  next.guidedDemo = meta;
  if (meta.status === "complete") meta.checks = demoSummary(next);
  return next;
}
