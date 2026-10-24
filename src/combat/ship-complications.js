import { SHIP_COMPLICATION_CARDS, COMPLICATION_SCENARIOS, COMPLICATION_CATALOG_VERSION } from "../content/ship-complications.js";
import { DEGREE_OF_SUCCESS } from "./check-resolution.js";

const copy = value => structuredClone(value);
const tracks = ["hull", "lifeveil", "morale", "strain", "supplies"];
const movementRules = ["max-turns", "travel-reduction", "move-before-turn", "no-pivot"];
const rules = new Set([...movementRules, "no-bonus-weapon-damage", "no-coordinated-captain", "no-coordinated-engineer", "no-coordinated-veil", "different-battery-targets", "captain-after-other-station", "engineer-after-other-station", "veilwarden-after-other-station", "battery-after-other-station", "battery-range-reduction", "extra-reload", "extra-card-strain", "veil-restoration-reduction", "bonus-travel-reduction"]);
const stats = new Set(["structure", "initiative", "captain", "engineer", "navigator", "veilwarden", "battlewatch", "battery-attack", "coordinated"]);
const opportunityRules = new Set(["boarding-opening", "resistance-gap", "dr-gap", "attack-opening", "defensive-opening"]);
const catalog = new Map(SHIP_COMPLICATION_CARDS.map(card => [card.id, card]));
function id(value, label) { if (typeof value !== "string" || !value.trim() || value.length > 200) throw new Error(`Invalid ${label}.`); }

export function validateComplicationCatalog(cards = SHIP_COMPLICATION_CARDS) {
  if (!Array.isArray(cards) || cards.length !== 24 || new Set(cards.map(c => c.id)).size !== 24) throw new Error("Provide 24 distinct complication cards.");
  function effect(e, nested = false) {
    if (!e || typeof e !== "object") throw new Error("Missing complication effect.");
    if (e.kind === "choice") {
      if (nested || !Array.isArray(e.options) || e.options.length !== 2 || new Set(e.options.map(o => o.id)).size !== 2) throw new Error("A choice needs two distinct, non-nested options.");
      for (const option of e.options) { id(option.id, "option ID"); id(option.label, "option label"); effect(option.effect, true); }
    } else if (e.kind === "resource") {
      if (!tracks.includes(e.track) || !Number.isFinite(e.amount) || e.amount === 0 || !["percent", "points"].includes(e.unit) || (e.track === "strain" ? e.amount < 0 : e.amount > 0)) throw new Error("Invalid resource complication.");
    } else {
      if (e.expires !== "end-next-round" || e.uses !== 1) throw new Error("Temporary effects need a bounded duration and one use.");
      if (e.kind === "modifier") { if (!stats.has(e.stat) || ![-1, -2].includes(e.amount)) throw new Error("Invalid complication modifier."); }
      else if (e.kind === "restriction") { if (!rules.has(e.rule) || !Number.isInteger(e.value) || e.value < 1 || e.value > 5) throw new Error("Invalid complication restriction."); }
      else if (e.kind === "opportunity") { if (!opportunityRules.has(e.rule) || e.apCost !== 1 || ![1, 2].includes(e.value)) throw new Error("Invalid paid opportunity."); }
      else throw new Error("Unknown complication effect kind.");
    }
  }
  for (const card of cards) {
    id(card.id, "card ID"); id(card.name, "card name");
    if (Object.keys(card.entries ?? {}).sort().join() !== Object.keys(COMPLICATION_SCENARIOS).sort().join()) throw new Error(`${card.id} needs all six scenarios.`);
    for (const outcome of Object.values(card.entries)) {
      id(outcome.title, "outcome title"); id(outcome.text, "outcome description"); effect(outcome.effect);
      if (outcome.requires) {
        if (outcome.requires !== "alongside" || !outcome.fallback) throw new Error("Conditional outcomes need an alongside fallback.");
        effect(outcome.fallback.effect);
      }
    }
  }
  return true;
}
validateComplicationCatalog();

function random(state) {
  let value = state.randomState;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  state.randomState = value >>> 0;
  return state.randomState / 4294967296;
}
function shuffle(state, source) {
  const result = [...source];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random(state) * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
function assertState(state) {
  if (state?.schemaVersion !== 1 || state.catalogVersion !== COMPLICATION_CATALOG_VERSION || !Number.isSafeInteger(state.round) || state.round < 1) throw new Error("Unsupported complication encounter.");
  const zones = [...state.drawPile, ...state.discardPile];
  if (zones.length !== 24 || new Set(zones).size !== 24 || zones.some(key => !catalog.has(key))) throw new Error("The complication deck is incomplete or duplicated.");
}
function shipFor(state, shipId) {
  const ship = state.ships.find(row => row.id === shipId);
  if (!ship) throw new Error("Unknown complication ship.");
  return ship;
}
function trackChange(ship, operation) {
  const track = ship.resources[operation.track];
  const amount = operation.unit === "percent" ? Math.sign(operation.amount) * Math.ceil(track.max * Math.abs(operation.amount) / 100) : operation.amount;
  const value = track.value + amount;
  if (operation.cost && (value < 0 || value > track.max || (operation.track === "hull" && value === 0))) throw new Error("This resource option cannot be paid; choose the alternative.");
  return { track: operation.track, before: track.value, after: Math.min(track.max, Math.max(0, value)), amount };
}

/** A separate, serializable encounter snapshot; never mutates a campaign Actor. */
export function createComplicationEncounter({ id: encounterId, ships, seed = 1 }) {
  id(encounterId, "encounter ID");
  if (!Array.isArray(ships) || !ships.length || new Set(ships.map(s => s.id)).size !== ships.length) throw new Error("Provide different complication ships.");
  const snapshots = ships.map(source => {
    id(source.id, "ship ID"); id(source.name, "ship name"); id(source.team, "ship team");
    for (const key of tracks) {
      const track = source.resources?.[key];
      if (!Number.isFinite(track?.value) || !Number.isFinite(track?.max) || track.max <= 0 || track.value < 0 || track.value > track.max) throw new Error(`Invalid ${key} track.`);
    }
    const batteries = copy(source.batteries ?? []);
    if (batteries.some(b => typeof b.id !== "string" || !b.id) || new Set(batteries.map(b => b.id)).size !== batteries.length) throw new Error("Provide different battery IDs.");
    return { id: source.id, name: source.name, team: source.team, resources: copy(source.resources), batteries, ap: Number.isSafeInteger(source.ap) && source.ap >= 0 ? source.ap : 4 };
  });
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 0xffffffff) throw new Error("Use a nonzero 32-bit complication seed.");
  const state = { schemaVersion: 1, catalogVersion: COMPLICATION_CATALOG_VERSION, id: encounterId, round: 1, revision: 0, randomState: seed, ships: snapshots, drawPile: [], discardPile: [], history: [], effects: [], choices: [], sequence: 0, complete: false };
  state.drawPile = shuffle(state, SHIP_COMPLICATION_CARDS.map(c => c.id));
  return state;
}
function batterySpecific(effect) { return effect.stat === "battery-attack" || ["no-bonus-weapon-damage", "battery-range-reduction", "extra-reload", "battery-after-other-station"].includes(effect.rule); }
function normalizeEffect(effect, ship, scenario, context) {
  const next = copy(effect);
  if (next.kind === "choice") {
    for (const option of next.options) option.effect = normalizeEffect(option.effect, ship, scenario, context);
    return next;
  }
  if (batterySpecific(next)) {
    const battery = ship.batteries.find(b => b.id === context.batteryId) ?? [...ship.batteries].sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!battery) return { kind: "modifier", stat: scenario === "impact" ? "structure" : scenario, amount: -1, expires: "end-next-round", uses: 1 };
    next.batteryId = battery.id;
  }
  return next;
}
function apply(state, operation, receipt) {
  const ship = shipFor(state, receipt.shipId);
  if (operation.kind === "resource") {
    const changed = trackChange(ship, operation);
    ship.resources[changed.track].value = changed.after;
    receipt.resourceChanges.push(changed);
  } else if (operation.kind === "choice") {
    const choice = { id: `choice-${++state.sequence}`, receiptId: receipt.id, shipId: ship.id, options: copy(operation.options), status: "pending" };
    state.choices.push(choice); receipt.choiceId = choice.id;
  } else {
    const timing = movementRules.includes(operation.rule) || operation.stat === "initiative";
    const existing = state.effects.find(e => e.shipId === ship.id && e.kind === operation.kind && e.rule === operation.rule && e.stat === operation.stat && e.batteryId === operation.batteryId && e.opponentId === receipt.opponentId && !e.claimedBy);
    if (existing) {
      existing.expiresRound = Math.max(existing.expiresRound, state.round + 1);
      // Each occurrence is still "next": a later draw does not postpone an already active effect.
      existing.notBeforeRound = Math.min(existing.notBeforeRound, timing ? state.round + 1 : state.round);
      if (operation.kind === "modifier") existing.amount = Math.min(existing.amount, operation.amount);
      else if (operation.rule === "max-turns") existing.value = Math.min(existing.value, operation.value);
      else existing.value = Math.max(existing.value, operation.value);
      receipt.effectId = existing.id;
    } else {
      const record = { ...copy(operation), id: `effect-${++state.sequence}`, shipId: ship.id, receiptId: receipt.id, opponentId: receipt.opponentId, createdRound: state.round, notBeforeRound: timing ? state.round + 1 : state.round, expiresRound: state.round + 1 };
      state.effects.push(record); receipt.effectId = record.id;
    }
  }
}

/** Supply final degrees from the authoritative check resolver, never a raw natural die. */
export function resolveShipComplication(before, { eventId, shipId, scenario, degree, source = "card", opponentId = null, alongside = false, batteryId = null }) {
  assertState(before); id(eventId, "source event ID");
  shipFor(before, shipId);
  if (!Object.hasOwn(COMPLICATION_SCENARIOS, scenario) || ![-1, 0, 1, 2].includes(degree)) throw new Error("Provide a scenario and final degree of success.");
  if (!["card", "attack", "collision"].includes(source) || (scenario === "impact") !== (source === "collision")) throw new Error("Complications require an authored card, attack or collision source.");
  if (source === "attack" && scenario !== "battlewatch") throw new Error("Weapon attack complications use Battle Watch.");
  if (before.complete) throw new Error("This complication encounter has ended.");
  const previous = before.history.find(row => row.eventId === eventId && row.shipId === shipId);
  if (previous) return { state: copy(before), receipt: copy(previous), duplicate: true };
  if (degree !== DEGREE_OF_SUCCESS.CRITICAL_FAILURE) return { state: copy(before), receipt: { drawn: false, eventId, shipId, degree }, duplicate: false };
  if (before.choices.some(c => c.shipId === shipId && c.status === "pending")) throw new Error("Resolve this ship's pending complication choice first.");
  if (opponentId != null) {
    const opponent = shipFor(before, opponentId);
    if (opponent.team === shipFor(before, shipId).team || opponent.id === shipId) throw new Error("Choose an opposing ship.");
  }
  const state = copy(before), ship = shipFor(state, shipId);
  if (!state.drawPile.length) { state.drawPile = shuffle(state, state.discardPile); state.discardPile = []; }
  const cardId = state.drawPile.pop(), card = catalog.get(cardId);
  let outcome = card.entries[scenario];
  const fallback = outcome.requires === "alongside" && !(alongside && opponentId);
  if (fallback) outcome = outcome.fallback;
  const receipt = { id: `draw-${++state.sequence}`, eventId, shipId, scenario, source, degree, cardId, name: card.name, title: outcome.title, text: outcome.text, fallback, opponentId, round: state.round, drawn: true, resourceChanges: [] };
  state.discardPile.push(cardId); state.history.push(receipt);
  apply(state, normalizeEffect(outcome.effect, ship, scenario, { batteryId }), receipt);
  state.revision++;
  return { state, receipt: copy(receipt), duplicate: false };
}

export function complicationChoiceOptions(state, choiceId) {
  const choice = state.choices.find(c => c.id === choiceId);
  if (!choice) return [];
  return choice.options.map(option => {
    let available = true;
    try { if (option.effect.kind === "resource") trackChange(shipFor(state, choice.shipId), option.effect); } catch { available = false; }
    return { id: option.id, label: option.label, available };
  });
}
export function chooseShipComplication(before, { choiceId, optionId, shipId }) {
  assertState(before);
  if (before.complete) throw new Error("This complication encounter has ended.");
  const original = before.choices.find(c => c.id === choiceId && c.shipId === shipId);
  if (!original) throw new Error("Unknown complication choice.");
  if (original.status === "resolved") {
    if (original.selected !== optionId) throw new Error("This complication choice was already resolved.");
    return copy(before);
  }
  const option = original.options.find(row => row.id === optionId);
  if (!option || !complicationChoiceOptions(before, choiceId).find(row => row.id === optionId)?.available) throw new Error("This option cannot be paid; choose the alternative.");
  const state = copy(before), choice = state.choices.find(c => c.id === choiceId), receipt = state.history.find(r => r.id === choice.receiptId);
  apply(state, option.effect, receipt);
  choice.selected = optionId; choice.status = "resolved";
  receipt.selectedOption = option.label;
  state.revision++;
  return state;
}

export function activeShipComplications(state, shipId) {
  assertState(state); shipFor(state, shipId);
  return copy(state.effects.filter(e => e.shipId === shipId && e.notBeforeRound <= state.round && e.expiresRound >= state.round));
}
export function complicationCheckModifier(state, shipId, stat, { batteryId = null, coordinated = false } = {}) {
  if (!stats.has(stat)) throw new Error("Unknown complication check stat.");
  const effects = activeShipComplications(state, shipId).filter(e => e.kind === "modifier" && (e.stat === stat || (coordinated && e.stat === "coordinated")) && (!e.batteryId || e.batteryId === batteryId));
  return { amount: Math.min(0, ...effects.map(e => e.amount)), effectIds: effects.map(e => e.id) };
}
/** The combat controller calls this only after the matching action actually resolves. */
export function consumeShipComplications(before, { shipId, effectIds }) {
  assertState(before); shipFor(before, shipId);
  if (!Array.isArray(effectIds) || new Set(effectIds).size !== effectIds.length) throw new Error("Provide distinct effect IDs.");
  const active = activeShipComplications(before, shipId);
  if (effectIds.some(id => !active.some(e => e.id === id))) throw new Error("Only this ship's active effects may be consumed.");
  const state = copy(before);
  state.effects = state.effects.filter(e => !effectIds.includes(e.id));
  if (effectIds.length) state.revision++;
  return state;
}
/** Claims grant one bounded permission to the future action controller, never a free attack. */
export function claimComplicationOpportunity(before, { effectId, opponentId, alongside = false }) {
  assertState(before);
  const effect = before.effects.find(e => e.id === effectId);
  if (!effect || effect.kind !== "opportunity" || effect.notBeforeRound > before.round || effect.expiresRound < before.round) throw new Error("No active opportunity to claim.");
  if (effect.claimedBy) {
    if (effect.claimedBy !== opponentId) throw new Error("This opportunity was already claimed.");
    return copy(before);
  }
  const owner = shipFor(before, effect.shipId), opponent = shipFor(before, opponentId);
  if (owner.team === opponent.team || owner.id === opponent.id || (effect.opponentId && effect.opponentId !== opponentId) || (effect.rule === "boarding-opening" && !alongside)) throw new Error("This opponent cannot exploit that opening.");
  if (opponent.ap < effect.apCost) throw new Error("The opponent needs 1 available AP.");
  const state = copy(before);
  shipFor(state, opponentId).ap -= effect.apCost;
  state.effects.find(e => e.id === effectId).claimedBy = opponentId;
  state.revision++;
  return state;
}
export function advanceComplicationRound(before) {
  assertState(before);
  if (before.complete) throw new Error("This complication encounter has ended.");
  if (before.choices.some(c => c.status === "pending")) throw new Error("Resolve pending choices before the next round.");
  const state = copy(before); state.round++;
  state.effects = state.effects.filter(e => e.expiresRound >= state.round);
  state.revision++;
  return state;
}
export function endComplicationEncounter(before) {
  assertState(before);
  if (before.choices.some(c => c.status === "pending")) throw new Error("Resolve pending choices before ending the encounter.");
  if (before.complete) return copy(before);
  const state = copy(before);
  state.complete = true; state.effects = []; state.revision++;
  return state;
}
