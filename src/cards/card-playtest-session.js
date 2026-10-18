import { PLAYTEST_COMBAT_CARDS } from "../content/combat-cards-playtest.js";
import { generateShipCardDecks, cardAvailability, useShipCard } from "./card-library.js";
import { createOrderController } from "./order-controller.js";
import { getOrderQueue, startOrderRound, beginOrderExecution, finishOrderTurn, availableOrderResources } from "./committed-orders.js";
import { shipAbilityBonus, shipAbilityDC } from "../combat/ship-ability-rules.js";
import { degreeOfSuccess } from "../combat/check-resolution.js";

export const CARD_SKILLS = Object.freeze({
  captain: ["diplomacy", "intimidation", "society"], engineer: ["crafting", "arcana", "thievery"],
  navigator: ["survival", "nature", "arcana"], battlewatch: ["crafting", "athletics", "warfare-lore"],
  veilwarden: ["arcana", "occultism", "medicine"]
});
const DIRECTIONS = [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]];
const copy = value => structuredClone(value);
const value = (ship, key) => Number(ship.resources?.[key]?.value ?? 0);
function change(ship, key, delta) {
  const track = ship.resources[key];
  const maximum = Number(track?.max ?? 100);
  ship.resources[key] = { ...track, value: Math.max(0, Math.min(maximum, value(ship, key) + delta)) };
}
function effect(ship, kind, amount, uses = 1, station = null) {
  ship.cardPlay.effects.push({ kind, amount, uses, station, expiresTurn: ship.cardPlay.turnCount + 1 });
}
function strongest(ship, kind, station = null, consume = false) {
  const matching = ship.cardPlay.effects.filter(e => e.kind === kind && (e.station == null || e.station === station));
  const positive = matching.filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount)[0];
  const negative = matching.filter(e => e.amount < 0).sort((a, b) => a.amount - b.amount)[0];
  if (consume) for (const item of [positive, negative].filter(Boolean)) if (item.uses !== null && --item.uses <= 0) ship.cardPlay.effects.splice(ship.cardPlay.effects.indexOf(item), 1);
  return (positive?.amount ?? 0) + (negative?.amount ?? 0);
}
function extraMovement(ship, spaces) {
  const m = ship.cardPlay.motion;
  const added = Math.max(0, Math.min(spaces, m.speed - m.extra));
  m.extra += added;
  return added;
}
function assertTurn(session, shipId) {
  if (session.phase !== "execution" || session.turnOrder[session.turnIndex] !== shipId || session.pendingAttack) throw new Error("Wait for this ship's turn and finish any pending attack.");
  if (value(session.ships[shipId], "hull") <= 0) throw new Error("Restore Hull before moving a disabled ship.");
}
export function hexDistance(a, b) { const q = a.q - b.q, r = a.r - b.r; return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); }
function roleCheck(ship, station, selection, rank) {
  const skill = selection.skill ?? CARD_SKILLS[station]?.[0];
  if (!CARD_SKILLS[station]?.includes(skill)) throw new Error("Choose one of this station's three skills.");
  const result = Number(rank(ship, station, skill));
  if (!Number.isInteger(result) || result < 0 || result > 4) throw new Error("Invalid operator proficiency rank.");
  return { skill, rank: result };
}
export function movePlaytestShip(session, shipId, direction) {
  assertTurn(session, shipId);
  const next = copy(session), ship = next.ships[shipId], m = ship.cardPlay.motion;
  if (direction === "forward") {
    if (m.used >= m.speed + m.extra) throw new Error("Movement allowance exhausted.");
    const [q, r] = session.canvas?.directions?.[m.heading] ?? DIRECTIONS[m.heading];
    const destination = { q: m.q + q, r: m.r + r };
    if (Object.entries(next.ships).some(([id, other]) => id !== shipId && other.cardPlay.motion.q === destination.q && other.cardPlay.motion.r === destination.r)) throw new Error("That hex is occupied.");
    m.q = destination.q; m.r = destination.r; m.used++;
  } else if (["left", "right"].includes(direction)) {
    if (m.turns >= m.baseTurns + m.bonusTurns) throw new Error("Facing allowance exhausted.");
    if (m.lastTurnCell === `${m.q},${m.r}`) throw new Error("Move to another hex before turning again.");
    m.heading = (m.heading + (direction === "right" ? 1 : 5)) % 6;
    m.turns++; m.lastTurnCell = `${m.q},${m.r}`;
  } else throw new Error("Unknown helm command.");
  return next;
}

export function weaponHexInArc(session, shipId, destination, mount) {
  const ship = session.ships[shipId], a = ship.cardPlay.motion;
  const dq = destination.q - a.q, dr = destination.r - a.r;
  const basis = session.canvas?.basis ?? { q: { x: 1.5, y: Math.sqrt(3) / 2 }, r: { x: 0, y: Math.sqrt(3) } };
  const dx = dq * basis.q.x + dr * basis.r.x, dy = dq * basis.q.y + dr * basis.r.y;
  const bearing = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  const heading = session.canvas?.headings?.[a.heading] ?? a.heading * 60;
  const center = heading + ({ fore: 0, port: -90, starboard: 90, aft: 180, deck: 0 }[mount] ?? 0);
  const difference = Math.abs(((bearing - center + 540) % 360) - 180);
  return mount === "deck" || difference <= 60 + strongest(ship, "arc") + 1e-7;
}

export function movePlaytestShipTo(session, shipId, destination) {
  const a = session.ships[shipId]?.cardPlay.motion;
  if (!a || !Number.isSafeInteger(destination?.q) || !Number.isSafeInteger(destination?.r)) throw new Error("Choose a valid destination hex.");
  const steps = hexDistance(a, destination);
  if (steps < 1 || steps > a.speed + a.extra - a.used) throw new Error("Drag within the ship's remaining movement allowance.");
  const [dq, dr] = session.canvas?.directions?.[a.heading] ?? DIRECTIONS[a.heading];
  if (a.q + steps * dq !== destination.q || a.r + steps * dr !== destination.r) throw new Error("Turn with the HUD before dragging along a new course. Drag forward along the current heading.");
  let next = session;
  for (let i = 0; i < steps; i++) next = movePlaytestShip(next, shipId, "forward");
  return next;
}

export function weaponCoverage(session, shipId, weaponKey = null) {
  const ship = session.ships[shipId];
  if (!ship) return [];
  const weapons = ship.cardPlay.weapons.filter(w => !weaponKey || w.key === weaponKey);
  const cells = [];
  for (const weapon of weapons) {
    const radius = Math.ceil(weapon.maxRange);
    if (!Number.isFinite(radius) || radius < 0 || radius > 60) throw new Error("Weapon overlay range is outside the supported 0–60 hexes.");
    const origin = ship.cardPlay.motion;
    for (let q = -radius; q <= radius; q++) for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const cell = { q: origin.q + q, r: origin.r + r }, distance = hexDistance(origin, cell);
      if (distance && distance >= weapon.minRange && distance <= weapon.maxRange && weaponHexInArc(session, shipId, cell, weapon.mount)) cells.push({ ...cell, mount: weapon.mount, ready: weapon.readyRound <= session.round, weaponKey: weapon.key });
    }
  }
  return cells;
}

export function batteryOptions(session, shipId, targetId, mount) {
  const ship = session.ships[shipId], target = session.ships[targetId];
  if (!ship || !target || shipId === targetId || ship.cardPlay.team === target.cardPlay.team || value(target, "hull") <= 0) return [];
  const a = ship.cardPlay.motion, b = target.cardPlay.motion;
  const distance = hexDistance(a, b);
  if (distance === 0) return [];
  if (!weaponHexInArc(session, shipId, b, mount)) return [];

  return ship.cardPlay.weapons.filter(w => w.mount === mount && w.readyRound <= session.round && distance >= w.minRange && distance <= w.maxRange);
}

export function createPlaytestSession(entries, { id, rng = Math.random } = {}) {
  if (typeof id !== "string" || !id) throw new Error("Provide an encounter ID.");
  if (!Array.isArray(entries) || entries.length < 2 || entries.length > 8 || new Set(entries.map(e => e.id)).size !== entries.length) throw new Error("Select two to eight different ships.");
  if (new Set(entries.map(e => e.team)).size < 2) throw new Error("Choose at least two opposing sides.");
  const ships = {};
  for (const [i, entry] of entries.entries()) {
    if (!entry.weapons?.length) throw new Error(`${entry.name} needs an installed weapon for this combat batch.`);
    let ship = copy(entry.ship);
    if (value(ship, "hull") <= 0) throw new Error(`${entry.name} needs Hull above zero to enter this playtest.`);
    if (!ship.cardDecks) ship = generateShipCardDecks(ship, PLAYTEST_COMBAT_CARDS, { stationIds: Object.keys(CARD_SKILLS), isEligible: () => true, rng });
    const known = new Set(PLAYTEST_COMBAT_CARDS.map(card => card.id));
    if ([...ship.cardDecks.hands.ap, ...ship.cardDecks.hands.rp].some(id => !known.has(id))) throw new Error("This hand contains cards outside the current playtest batch.");
    ship = { ...ship, cardDecks: { ...ship.cardDecks, runtime: { combatId: id, round: 0, usedRound: {}, readyRound: {}, spentSignatures: [] } } };
    ship.resources.strain = { value: value(ship, "strain"), max: Math.max(1, Number(entry.stats.strainCapacity) || 1) };
    const giant = ["dread-caravel", "cathedral-ship", "leviathan-class-platform"].includes(ship.hull?.chassisId);
    const speed = Math.max(0, Math.min(6, Number(entry.stats.combatSpeed) || 0));
    ship.cardPlay = {
      actorId: entry.id, name: entry.name, team: entry.team, stats: copy(entry.stats), effects: [], turnCount: 0, rp: 1,
      weapons: entry.weapons.map(w => ({ ...copy(w), readyRound: 1 })),
      motion: { q: i % 2 === 0 ? 0 : 4, r: Math.floor(i / 2) * 3, heading: i % 2 === 0 ? 2 : 5, speed: giant ? Math.min(3, speed) : speed, baseTurns: giant ? 1 : 2, used: 0, extra: 0, turns: 0, bonusTurns: 0, lastTurnCell: null }
    };
    ships[entry.id] = startOrderRound(ship, 1, { ap: 4 });
  }
  return { id, revision: 0, round: 1, phase: "planning", ships, turnOrder: [], turnIndex: 0, pendingAttack: null, log: [], winner: null };
}

function log(session, entry) { session.log.push({ round: session.round, ...entry }); session.log = session.log.slice(-100); }
async function check(ship, station, selection, rank, roll, attack = false) {
  const selected = roleCheck(ship, station, selection, rank), b = shipAbilityBonus(ship.progression?.level);
  const modifier = b + selected.rank + strongest(ship, "check", station, true) + Number(ship.cardPlay.stats.stationBonuses?.[station] ?? 0) + Number(ship.cardPlay.stats.allStationBonus ?? 0);
  const dc = shipAbilityDC(ship.progression?.level);
  const die = await roll("1d20");
  if (!Number.isInteger(die) || die < 1 || die > 20) throw new Error("Invalid d20 result.");
  return { die, total: die + modifier, modifier, dc, degree: degreeOfSuccess(die + modifier, die, dc), skill: selected.skill, attack };
}

async function applySupport(ship, id, result, selection, roll, freeSupplies) {
  const b = shipAbilityBonus(ship.progression?.level), d = result.degree, crit = d === 2, fail = d === 0, bad = d === -1;
  const supplyLoss = n => change(ship, "supplies", -Math.min(n, freeSupplies));
  let bonusAP = 0;
  switch (id) {
    case "rally-crew": change(ship, "morale", await roll("1d8") * b + (crit ? 5 : 0)); if (bad) change(ship, "morale", -5); if (fail) change(ship, "strain", 1); break;
    case "issue-order": effect(ship, "check", b + (crit ? 1 : 0), 1, selection.choice); if (fail || bad) change(ship, "morale", bad ? -5 : -2); break;
    case "coordinate-assault": effect(ship, "penetration", b + (crit ? 1 : 0), 2); if (fail || bad) change(ship, "morale", bad ? -5 : -2); break;
    case "vent-strain": change(ship, "strain", -(await roll("1d4") + b + (crit ? 1 : 0))); if (fail) supplyLoss(1); if (bad) change(ship, "hull", -(await roll("1d4"))); break;
    case "feed-the-guns": effect(ship, "damage", b + (crit ? 1 : 0), 2); change(ship, "strain", bad ? 3 : fail ? 2 : 1); break;
    case "redistribute-power": {
      const routes = Array.isArray(selection.choice) ? selection.choice : [selection.choice];
      for (const route of routes) {
        if (route === "propulsion") extraMovement(ship, 2);
        if (route === "weapons") effect(ship, "damage", 2 * b, 2);
        if (route === "veil") effect(ship, "ward", 2 * b, 2);
      }
      change(ship, "strain", crit ? 0 : bad ? 3 : fail ? 2 : 1); break;
    }
    case "charted-course": extraMovement(ship, crit ? 3 : 2); effect(ship, "attack", 1); if (fail) supplyLoss(1); if (bad) change(ship, "hull", -(await roll("1d8"))); break;
    case "attack-vector": effect(ship, "arc", crit ? 60 : 30, null); if (fail || bad) supplyLoss(bad ? 2 : 1); break;
    case "breakaway-vector": extraMovement(ship, 3); effect(ship, "ac", crit ? 2 : 1, null); if (fail) supplyLoss(1); if (bad) change(ship, "hull", -(await roll("1d8"))); break;
    case "acquire-target": effect(ship, "attack", b + (crit ? 1 : 0)); if (fail) change(ship, "strain", 1); if (bad) change(ship, "hull", -b); break;
    case "ready-broadside": effect(ship, "damage", 2 * b + (crit ? 2 : 0)); if (fail) change(ship, "strain", 1); if (bad) change(ship, "hull", -b); break;
    case "work-the-guns": {
      const weapon = ship.cardPlay.weapons.find(w => w.key === selection.choice);
      weapon.readyRound = Math.max(0, weapon.readyRound - (crit ? 2 : 1));
      if (fail) effect(ship, "attack", -1); if (bad) change(ship, "hull", -b); break;
    }
    case "mend-lifeveil": change(ship, "lifeveil", await roll("1d4") * b + (crit ? b : 0)); if (bad) change(ship, "lifeveil", -b); if (fail) change(ship, "strain", 1); break;
    case "healing-lifeveil": change(ship, "hull", await roll("1d6") * b + (crit ? b : 0)); if (fail || bad) change(ship, "lifeveil", bad ? -5 : -2); break;
    case "reinforce-lifeveil": effect(ship, "ward", 3 * Math.max(1, Math.floor(Number(ship.progression?.level ?? 1) / 5)), null); if (crit) change(ship, "lifeveil", 5); if (fail || bad) change(ship, "lifeveil", bad ? -5 : -2); break;
    case "drive-the-crew": bonusAP = 3; change(ship, "strain", 2); if (crit) change(ship, "morale", 15); if (fail || bad) change(ship, "morale", bad ? -10 : -5); break;
    default: throw new Error("Unimplemented card effect.");
  }
  return bonusAP;
}

function prepareDriver(session, abilityId, rank, roll) {
  return {
    preflight({ ship, selection, order }) {
      if (value(ship, "hull") <= 0 && !["damage-control", "healing-lifeveil"].includes(abilityId)) return { ok: false, impossible: true, reason: "The ship needs Hull recovery first." };
      roleCheck(ship, order.station, selection, (s, st, sk) => rank(s, st, sk, order.operatorId));
      if (abilityId === "issue-order" && !CARD_SKILLS[selection.choice]) return { ok: false, reason: "Choose a station for Issue Order." };
      if (abilityId === "redistribute-power") {
        const routes = Array.isArray(selection.choice) ? selection.choice : [selection.choice];
        const maximum = Number(ship.progression?.level ?? 1) >= 10 ? 2 : 1;
        if (!routes.length || routes.length > maximum || new Set(routes).size !== routes.length || routes.some(r => !["propulsion", "weapons", "veil"].includes(r))) return { ok: false, reason: "Choose eligible, different power routes." };
      }
      if (abilityId === "work-the-guns") {
        const weapons = ship.cardPlay.weapons.filter(w => w.readyRound > session.round);
        if (!weapons.length) return { ok: false, impossible: true, reason: "No weapon is reloading." };
        if (!weapons.some(w => w.key === selection.choice)) return { ok: false, reason: "Choose a reloading weapon." };
      }
      if (abilityId === "full-thrust" && ship.cardPlay.motion.extra >= ship.cardPlay.motion.speed) return { ok: false, impossible: true, reason: "Additional movement cap reached." };
      if (abilityId === "hard-turn" && ship.cardPlay.motion.bonusTurns >= 1) return { ok: false, impossible: true, reason: "Additional turn already granted." };
      return { ok: true };
    },
    async execute({ ship, order, selection, availableResources }) {
      let result = null, bonusAP = 0;
      const before = Object.fromEntries(["hull", "lifeveil", "strain", "morale", "supplies"].map(key => [key, value(ship, key)]));
      if (order.kind === "basic") {
        if (abilityId === "full-thrust") extraMovement(ship, 2);
        else if (abilityId === "hard-turn") ship.cardPlay.motion.bonusTurns = 1;
        else if (abilityId === "damage-control") change(ship, "hull", await roll("1d4") * shipAbilityBonus(ship.progression?.level));
      } else {
        result = await check(ship, order.station, selection, (s, st, sk) => rank(s, st, sk, order.operatorId), roll);
        bonusAP = await applySupport(ship, abilityId, result, selection, roll, availableResources.supplies);
      }
      const changes = Object.fromEntries(Object.keys(before).map(key => [key, value(ship, key) - before[key] - Number(order.costs[key] ?? 0)]).filter(([, delta]) => delta !== 0));
      log(session, { shipId: ship.cardPlay.actorId, label: abilityId, result, changes, bonusAP });
      return { ship, bonusAP, details: result };
    }
  };
}

export function createPlaytestController(session, { user, ownsOperator, isEligibleOperator, rank, roll }) {
  const drivers = Object.fromEntries(PLAYTEST_COMBAT_CARDS.filter(c => c.deck === "ap").map(c => [`card:${c.id}`, prepareDriver(session, c.id, rank, roll)]));
  for (const id of ["full-thrust", "hard-turn", "damage-control"]) drivers[`basic:${id}`] = prepareDriver(session, id, rank, roll);
  drivers["basic:fire-battery"] = {
    preflight({ ship, selection, order }) {
      if (value(ship, "hull") <= 0) return { ok: false, impossible: true, reason: "Restore Hull before firing a disabled ship." };
      roleCheck(ship, "battlewatch", selection, (s, st, sk) => rank(s, st, sk, order.operatorId));
      const target = session.ships[selection.targetId];
      if (!target) return { ok: false, reason: "Choose an enemy target." };
      const legal = batteryOptions(session, ship.cardPlay.actorId, selection.targetId, selection.batteryId);
      if (!legal.length) return { ok: false, reason: "Choose a ready battery with its target in range and arc." };
      if (selection.weaponKeys && (new Set(selection.weaponKeys).size !== selection.weaponKeys.length || !selection.weaponKeys.length || selection.weaponKeys.some(key => !legal.some(w => w.key === key)))) return { ok: false, reason: "Choose different ready weapons in this battery." };
      return { ok: true };
    },
    async execute({ ship, selection, order }) {
      const target = session.ships[selection.targetId], id = ship.cardPlay.actorId;
      const selected = roleCheck(ship, "battlewatch", selection, (s, st, sk) => rank(s, st, sk, order.operatorId));
      const guns = batteryOptions(session, id, selection.targetId, selection.batteryId).filter(w => !selection.weaponKeys || selection.weaponKeys.includes(w.key));
      const b = shipAbilityBonus(ship.progression?.level), level = Number(ship.progression?.level ?? 1);
      const modifier = level + 4 + b + selected.rank + Number(ship.cardPlay.stats.weaponAttackBonus ?? 0) + Math.min(...guns.map(w => w.potency ?? 0)) + strongest(ship, "attack", null, true) + strongest(ship, "check", "battlewatch", true);
      const die = await roll("1d20");
      const rolled = await Promise.all(guns.map(w => roll(w.dice)));
      const descending = [...rolled].sort((a, b) => b - a);
      const damage = descending[0] + descending.slice(1).reduce((sum, n) => sum + Math.floor(n / 2), 0) + strongest(ship, "damage", null, true);
      const penetration = strongest(ship, "penetration", null, true);
      for (const gun of guns) ship.cardPlay.weapons.find(w => w.key === gun.key).readyRound = session.round + gun.reloadRounds;
      session.pendingAttack = { attackerId: id, targetId: selection.targetId, battery: selection.batteryId, die, modifier, total: die + modifier, damage, penetration };
      log(session, { shipId: id, label: "Fire Battery", result: { die, total: die + modifier, damage }, targetId: selection.targetId });
      return { ship, details: session.pendingAttack };
    }
  };
  return createOrderController({
    cards: PLAYTEST_COMBAT_CARDS, drivers, ownsOperator, isEligibleOperator,
    read: id => copy(session.ships[id]),
    write: (id, ship, { expectedShip }) => {
      if (JSON.stringify(expectedShip) !== JSON.stringify(session.ships[id])) throw new Error("Ship changed during resolution.");
      session.ships[id] = copy(ship);
    },
    getContext: () => ({ user, combatId: session.id, round: session.round, phase: session.phase, initiativeReady: session.phase === "execution", activeShipId: session.turnOrder[session.turnIndex] ?? null })
  });
}

export async function rollPlaytestInitiative(session, roll, rank) {
  if (session.phase !== "planning" || Object.values(session.ships).some(ship => getOrderQueue(ship).phase !== "locked")) throw new Error("All Captains must lock plans before initiative.");
  const next = copy(session), results = [];
  for (const [id, ship] of Object.entries(next.ships)) if (value(ship, "hull") > 0) {
    const modifier = Number(ship.progression?.level ?? 1) + shipAbilityBonus(ship.progression?.level) + Number(rank(ship, "navigator", "survival"));
    results.push({ id, die: await roll("1d20"), modifier });
  }
  if (!results.length) throw new Error("No operational ships remain.");
  results.sort((a, b) => (b.die + b.modifier) - (a.die + a.modifier) || a.id.localeCompare(b.id));
  next.turnOrder = results.map(result => result.id); next.turnIndex = 0; next.phase = "execution";
  log(next, { label: "Initiative", results });
  openTurn(next);
  return next;
}
function openTurn(session) {
  const id = session.turnOrder[session.turnIndex], ship = session.ships[id];
  ship.cardPlay.turnCount++;
  ship.cardPlay.effects = ship.cardPlay.effects.filter(e => e.expiresTurn > ship.cardPlay.turnCount);
  session.ships[id] = beginOrderExecution(ship);
}
export function advancePlaytestTurn(session) {
  if (session.phase !== "execution" || session.pendingAttack) throw new Error("Finish the pending attack before advancing.");
  const next = copy(session), current = next.turnOrder[next.turnIndex];
  next.ships[current] = finishOrderTurn(next.ships[current]);
  do { next.turnIndex++; } while (next.turnIndex < next.turnOrder.length && value(next.ships[next.turnOrder[next.turnIndex]], "hull") <= 0);
  const aliveTeams = [...new Set(Object.values(next.ships).filter(ship => value(ship, "hull") > 0).map(ship => ship.cardPlay.team))];
  if (aliveTeams.length <= 1) { next.phase = "complete"; next.winner = aliveTeams[0] ?? "No surviving side"; return next; }
  if (next.turnIndex < next.turnOrder.length) { openTurn(next); return next; }
  next.round++; next.phase = "planning"; next.turnOrder = []; next.turnIndex = 0;
  for (const [id, ship] of Object.entries(next.ships)) {
    // Destroyed ships have no next turn, so expire/skip their old plans as well.
    let base = ship;
    if (getOrderQueue(base).phase !== "complete") base = finishOrderTurn(beginOrderExecution(base));
    base.cardPlay.rp = 1;
    Object.assign(base.cardPlay.motion, { used: 0, extra: 0, turns: 0, bonusTurns: 0, lastTurnCell: null });
    next.ships[id] = startOrderRound(base, next.round);
    if (value(base, "hull") <= 0) next.ships[id] = { ...next.ships[id], cardDecks: { ...next.ships[id].cardDecks, runtime: { ...next.ships[id].cardDecks.runtime, orderQueue: { ...getOrderQueue(next.ships[id]), phase: "locked" } } } };
  }
  return next;
}

export async function resolvePlaytestAttack(session, { cardId = null, station = "captain", skill } = {}, { rank, roll }) {
  if (!session.pendingAttack) throw new Error("No attack awaits a response.");
  const next = copy(session), attack = next.pendingAttack, ship = next.ships[attack.targetId];
  const b = shipAbilityBonus(ship.progression?.level);
  let reduction = 0, ac = Number(ship.cardPlay.stats.armorClass) + strongest(ship, "ac"), reactionResult = null;
  if (cardId) {
    const card = PLAYTEST_COMBAT_CARDS.find(c => c.id === cardId && c.deck === "rp");
    if (!card || ship.cardPlay.rp < 1 || !cardAvailability(ship, PLAYTEST_COMBAT_CARDS, cardId).ok) throw new Error("Reaction is unavailable.");
    const available = availableOrderResources(ship);
    for (const [key, cost] of Object.entries(card.costs ?? {})) if (available[key] < cost) throw new Error("Reaction would spend a reserved resource.");
    reactionResult = await check(ship, station, { skill }, rank, roll);
    for (const [key, cost] of Object.entries(card.costs ?? {})) change(ship, key, -cost);
    const d = reactionResult.degree, critical = d === 2, failed = d === 0, bad = d === -1;
    if (cardId === "brace-impact") { reduction = 3 * b + (critical ? 2 : 0); if (failed || bad) change(ship, "morale", bad ? -5 : -2); }
    if (cardId === "evasive-maneuver") { ac += b + (critical ? 1 : 0); change(ship, "strain", 1); if (failed || bad) change(ship, "supplies", -Math.min(available.supplies, bad ? 2 : 1)); }
    if (cardId === "emergency-ward") { reduction = 4 * b + (critical ? 2 : 0); if (failed || bad) change(ship, "lifeveil", bad ? -5 : -2); }
    if (cardId === "deflect-impact") { reduction = 5 * b + (critical ? 2 : 0); change(ship, "strain", bad ? 4 : failed ? 3 : 2); }
    if (cardId === "hold-together") { change(ship, "hull", await roll("1d6") * b + (critical ? b : 0)); if (failed) change(ship, "strain", 1); if (bad) change(ship, "morale", -5); }
    if (cardId === "last-bastion") { reduction = 8 * b; if (critical) change(ship, "lifeveil", b); if (failed) change(ship, "strain", 1); if (bad) change(ship, "lifeveil", -5); }
    ship.cardPlay.rp--;
    next.ships[attack.targetId] = useShipCard(ship, PLAYTEST_COMBAT_CARDS, cardId);
  }
  const defender = next.ships[attack.targetId], degree = degreeOfSuccess(attack.total, attack.die, ac);
  let damage = 0;
  if (degree >= 1) {
    const ward = strongest(defender, "ward", null, true);
    damage = Math.max(0, attack.damage * (degree === 2 ? 2 : 1) - Math.max(0, Number(defender.cardPlay.stats.hardness ?? 0) - attack.penetration) - ward - reduction);
    change(defender, "hull", -damage);
  }
  log(next, { shipId: attack.targetId, label: cardId ?? "No reaction", result: { ...attack, ac, degree, damage, reaction: reactionResult } });
  next.pendingAttack = null;
  return next;
}
