// Arkflight 1.1 rules foundation. Not yet connected to the live combat adapter.
export const CARD_STATIONS = Object.freeze(["captain", "engineer", "navigator", "battlewatch", "veilwarden"]);
export const CARD_TYPES = Object.freeze(["general", "flux", "signature"]);
export const CARD_DEGREES = Object.freeze(["criticalSuccess", "success", "failure", "criticalFailure"]);
const DECKS = ["ap", "rp"];
const AP_START = Object.freeze({ general: 8, flux: 3, signature: 1 });
const RP_START = Object.freeze({ general: 3, flux: 2, signature: 1 });

function integer(value, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`Invalid ${label}.`);
  return value;
}

export function cardHandCapacity(level = 1) {
  integer(level, "ship level", 1, 20);
  const ap = { ...AP_START };
  for (let milestone = 2; milestone <= level; milestone += 2) {
    const position = milestone % 10;
    ap[position === 0 ? "signature" : position === 4 || position === 8 ? "flux" : "general"]++;
  }
  return { ap, rp: { ...RP_START } };
}

export function validateCardCatalog(cards) {
  if (!Array.isArray(cards)) throw new Error("Provide a card catalog.");
  const ids = new Set();
  for (const card of cards) {
    if (!card || typeof card.id !== "string" || !card.id.trim() || ids.has(card.id)) throw new Error("Card IDs must be unique nonempty strings.");
    ids.add(card.id);
    if (typeof card.name !== "string" || !card.name.trim()) throw new Error(`Card ${card.id} needs a name.`);
    if (!DECKS.includes(card.deck) || !CARD_TYPES.includes(card.type)) throw new Error(`Invalid deck or type for ${card.id}.`);
    if (!Array.isArray(card.stations) || new Set(card.stations).size !== card.stations.length || card.stations.some(id => !CARD_STATIONS.includes(id)) || (card.deck === "ap" && card.stations.length === 0)) throw new Error(`Invalid stations for ${card.id}.`);
    integer(card.minLevel ?? 1, "card minimum level", 1, 20);
    if (card.type === "flux") integer(card.cooldownRounds, "Flux cooldown", 2, 5);
    else if (card.cooldownRounds !== undefined && card.cooldownRounds !== 0) throw new Error("Only Flux cards have a cooldown.");
    for (const degree of CARD_DEGREES) {
      if (typeof card.outcomes?.[degree] !== "string" || !card.outcomes[degree].trim()) throw new Error(`Card ${card.id} needs a written ${degree} outcome.`);
    }
  }
  return cards;
}

function catalogMap(cards) {
  return new Map(validateCardCatalog(cards).map(card => [card.id, card]));
}

function deckState(ship) {
  if (!ship.cardDecks || ship.cardDecks.version !== 1) throw new Error("This ship has no initialized card decks.");
  return structuredClone(ship.cardDecks);
}

function cardFrom(catalog, id) {
  const card = catalog.get(id);
  if (!card) throw new Error(`Unknown card: ${id}.`);
  return card;
}

function shuffle(cards, rng) {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("Random values must be in [0, 1).");
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function take(cards, count, label) {
  if (cards.length < count) throw new Error(`Not enough eligible ${label} cards: need ${count}, found ${cards.length}.`);
  return cards.slice(0, count);
}

// At most 32 coverage states. Unlike a greedy deal, this finds a feasible cover
// even when multi-station cards would otherwise leave a role without an option.
function coveringGeneralHand(cards, stations, count) {
  const target = (1 << stations.length) - 1;
  const covers = new Map([[0, []]]);
  for (const card of cards) {
    const bits = stations.reduce((mask, id, i) => mask | (card.stations.includes(id) ? 1 << i : 0), 0);
    for (const [mask, hand] of [...covers]) {
      const next = mask | bits;
      const candidate = [...hand, card];
      if (candidate.length <= count && (!covers.has(next) || covers.get(next).length > candidate.length)) covers.set(next, candidate);
    }
  }
  const selected = covers.get(target);
  if (!selected) throw new Error("Cannot deal a General hand covering every installed station.");
  const selectedIds = new Set(selected.map(card => card.id));
  return [...selected, ...take(cards.filter(card => !selectedIds.has(card.id)), count - selected.length, "AP General")];
}

export function generateShipCardDecks(ship, cards, { stationIds, isEligible, rng = Math.random } = {}) {
  if (ship.cardDecks) throw new Error("Card generation cannot reroll an existing ship's library.");
  if (!Array.isArray(stationIds) || stationIds.length === 0 || new Set(stationIds).size !== stationIds.length || stationIds.some(id => !CARD_STATIONS.includes(id))) throw new Error("Provide the installed station types.");
  if (typeof isEligible !== "function") throw new Error("Provide an equipment eligibility check before dealing cards.");
  validateCardCatalog(cards);
  const level = ship.progression?.level ?? 1;
  cardHandCapacity(level);
  const eligible = cards.filter(card => (card.minLevel ?? 1) <= level && (card.stations.length === 0 || card.stations.some(id => stationIds.includes(id))) && isEligible(card, ship));
  const hands = { ap: [], rp: [] };
  for (const deck of DECKS) {
    for (const type of CARD_TYPES) {
      const pool = shuffle(eligible.filter(card => card.deck === deck && card.type === type), rng);
      const count = (deck === "ap" ? AP_START : RP_START)[type];
      const selected = deck === "ap" && type === "general" ? coveringGeneralHand(pool, stationIds, count) : take(pool, count, `${deck.toUpperCase()} ${type}`);
      hands[deck].push(...selected.map(card => card.id));
    }
  }
  // Level progression adds capacity, not free cards. Fresh generation deals the
  // starter quantities; higher-level empty slots can be filled by later rewards.
  return { ...ship, cardDecks: { version: 1, library: structuredClone(hands), hands, runtime: null } };
}

export function awardShipCard(ship, cards, id) {
  const card = cardFrom(catalogMap(cards), id);
  const state = deckState(ship);
  if (!state.library[card.deck].includes(id)) state.library[card.deck].push(id);
  return { ...ship, cardDecks: state };
}

export function equipCardHand(ship, cards, deck, ids, { isEligible } = {}) {
  const catalog = catalogMap(cards);
  const state = deckState(ship);
  if (state.runtime?.combatId) throw new Error("Card hands are locked during combat.");
  if (!DECKS.includes(deck)) throw new Error("Unknown card deck.");
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw new Error("Choose different cards.");
  if (typeof isEligible !== "function") throw new Error("Provide an equipment eligibility check before equipping cards.");
  const capacity = cardHandCapacity(ship.progression?.level ?? 1)[deck];
  const counts = { general: 0, flux: 0, signature: 0 };
  for (const id of ids) {
    const card = cardFrom(catalog, id);
    if (card.deck !== deck || !state.library[deck].includes(id)) throw new Error("Equip learned cards belonging to this deck.");
    if ((card.minLevel ?? 1) > (ship.progression?.level ?? 1) || !isEligible(card, ship)) throw new Error(`Card ${id} is not eligible for this ship.`);
    if (++counts[card.type] > capacity[card.type]) throw new Error(`Not enough ${card.type} slots.`);
  }
  state.hands[deck] = [...ids];
  return { ...ship, cardDecks: state };
}

export function beginCardCombat(ship, combatId) {
  if (typeof combatId !== "string" || !combatId.trim()) throw new Error("Provide a combat ID.");
  const state = deckState(ship);
  if (state.runtime?.combatId) {
    if (state.runtime.combatId !== combatId) throw new Error("End the active card combat before starting another.");
    return { ...ship, cardDecks: state };
  }
  state.runtime = { combatId, round: 0, usedRound: {}, readyRound: {}, spentSignatures: [] };
  return { ...ship, cardDecks: state };
}

export function advanceCardRound(ship, round) {
  integer(round, "combat round", 1);
  const state = deckState(ship);
  if (!state.runtime?.combatId) throw new Error("Start card combat before advancing rounds.");
  if (round < state.runtime.round) throw new Error("Card rounds cannot go backwards.");
  state.runtime.round = round;
  return { ...ship, cardDecks: state };
}

export function cardAvailability(ship, cards, id) {
  const card = cardFrom(catalogMap(cards), id);
  const state = deckState(ship);
  if (!state.hands[card.deck].includes(id)) return { ok: false, reason: "not-in-hand" };
  const runtime = state.runtime;
  if (!runtime?.combatId || runtime.round < 1) return { ok: false, reason: "no-active-round" };
  if (runtime.spentSignatures.includes(id)) return { ok: false, reason: "signature-spent" };
  if (runtime.usedRound[id] === runtime.round) return { ok: false, reason: "used-this-round" };
  if ((runtime.readyRound[id] ?? 0) > runtime.round) return { ok: false, reason: "cooldown", readyRound: runtime.readyRound[id] };
  return { ok: true };
}

// Call only after an order executes. Locking or skipping an order must not call
// this function: neither event spends a card use or starts its cooldown.
export function useShipCard(ship, cards, id) {
  const available = cardAvailability(ship, cards, id);
  if (!available.ok) throw new Error(`Card unavailable: ${available.reason}.`);
  const card = cardFrom(catalogMap(cards), id);
  const state = deckState(ship);
  state.runtime.usedRound[id] = state.runtime.round;
  if (card.type === "flux") state.runtime.readyRound[id] = state.runtime.round + card.cooldownRounds;
  if (card.type === "signature") state.runtime.spentSignatures.push(id);
  return { ...ship, cardDecks: state };
}

export function endCardCombat(ship) {
  const state = deckState(ship);
  state.runtime = null;
  return { ...ship, cardDecks: state };
}
