import test from "node:test";
import assert from "node:assert/strict";
import { createShip, normalizeShip } from "../src/ship/ship-schema.js";
import {
  CARD_STATIONS, cardHandCapacity, validateCardCatalog, generateShipCardDecks,
  awardShipCard, equipCardHand, beginCardCombat, advanceCardRound,
  cardAvailability, useShipCard, endCardCombat
} from "../src/cards/card-library.js";

// Synthetic definitions exercise rules, not proposed gameplay content.
const card = (id, deck, type, stations, cooldownRounds = 2) => ({
  id, name: id, deck, type, stations,
  ...(type === "flux" ? { cooldownRounds } : {}),
  outcomes: { criticalSuccess: "Normal effect and a unique benefit.", success: "Normal effect.", failure: "Normal effect and a drawback.", criticalFailure: "Normal effect and a complication." }
});
function catalog() {
  const cards = [];
  for (const station of CARD_STATIONS) {
    for (const [type, count] of [["general", 8], ["flux", 5], ["signature", 2]]) {
      for (let n = 0; n < count; n++) cards.push(card(`${station}-${type}-${n}`, "ap", type, [station], 2 + n % 4));
    }
  }
  for (const [type, count] of [["general", 16], ["flux", 10], ["signature", 4]]) {
    for (let n = 0; n < count; n++) cards.push(card(`reaction-${type}-${n}`, "rp", type, [], 2 + n % 4));
  }
  return cards;
}
const eligible = () => true;
const options = { stationIds: CARD_STATIONS, isEligible: eligible, rng: () => 0.4 };
function generated(cards = catalog()) {
  return generateShipCardDecks({ progression: { level: 1 }, identity: { name: "Test Vessel" } }, cards, options);
}
function inRound(cards, round = 1) {
  return advanceCardRound(beginCardCombat(generated(cards), "combat-1"), round);
}

test("slot progression repeats after ten and never awards cards", () => {
  const expected = { 1: [8, 3, 1], 2: [9, 3, 1], 4: [9, 4, 1], 6: [10, 4, 1], 8: [10, 5, 1], 10: [10, 5, 2], 12: [11, 5, 2], 14: [11, 6, 2], 16: [12, 6, 2], 18: [12, 7, 2], 20: [12, 7, 3] };
  for (const [level, counts] of Object.entries(expected)) {
    const slots = cardHandCapacity(Number(level));
    assert.deepEqual(Object.values(slots.ap), counts);
    assert.deepEqual(slots.rp, { general: 3, flux: 2, signature: 1 });
  }
  for (const level of [0, 21, 1.5, NaN, Infinity]) assert.throws(() => cardHandCapacity(level));
  const ship = generated();
  const higher = { ...ship, progression: { level: 20 } };
  assert.equal(higher.cardDecks.library.ap.length, 12);
});

test("generation deals distinct 8/3/1 AP and 3/2/1 RP cards and covers all five stations", () => {
  const cards = catalog();
  for (let seed = 1; seed <= 50; seed++) {
    let value = seed;
    const rng = () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const original = { progression: { level: 1 } };
    const ship = generateShipCardDecks(original, cards, { ...options, rng });
    assert.equal(original.cardDecks, undefined);
    assert.equal(new Set(ship.cardDecks.hands.ap).size, 12);
    assert.equal(new Set(ship.cardDecks.hands.rp).size, 6);
    for (const [deck, expected] of [["ap", [8, 3, 1]], ["rp", [3, 2, 1]]]) {
      const selected = cards.filter(card => ship.cardDecks.hands[deck].includes(card.id));
      assert.deepEqual(["general", "flux", "signature"].map(type => selected.filter(card => card.type === type).length), expected);
    }
    const generals = cards.filter(card => ship.cardDecks.hands.ap.includes(card.id) && card.type === "general");
    for (const station of CARD_STATIONS) assert.ok(generals.some(card => card.stations.includes(station)));
  }
});

test("generation enforces equipment, level, available stations and fails atomically without coverage", () => {
  const cards = catalog();
  cards.push(card("uninstalled", "ap", "general", ["engineer"]));
  cards.push({ ...card("too-high", "ap", "general", ["engineer"]), minLevel: 2 });
  const ship = generateShipCardDecks({}, cards, { ...options, isEligible: card => card.id !== "uninstalled" });
  assert.ok(!ship.cardDecks.library.ap.includes("uninstalled"));
  assert.ok(!ship.cardDecks.library.ap.includes("too-high"));
  const original = {};
  assert.throws(() => generateShipCardDecks(original, cards, { ...options, isEligible: card => !card.stations.includes("navigator") }), /covering/);
  assert.deepEqual(original, {});
  const smaller = generateShipCardDecks({}, cards, { ...options, stationIds: ["engineer", "captain"] });
  for (const id of smaller.cardDecks.hands.ap) assert.ok(cards.find(card => card.id === id).stations.some(id => ["engineer", "captain"].includes(id)));
  assert.throws(() => generateShipCardDecks({}, cards, { stationIds: CARD_STATIONS }), /eligibility/);
  assert.throws(() => generateShipCardDecks({}, cards, { ...options, rng: () => 1 }), /Random/);
  assert.throws(() => generateShipCardDecks(ship, cards, options), /cannot reroll/);
});

test("multi-station General cards can cover a ship when independent station cards are absent", () => {
  const cards = catalog().filter(card => card.deck !== "ap" || card.type !== "general");
  cards.push(card("crew-wide", "ap", "general", [...CARD_STATIONS]));
  for (let n = 0; n < 7; n++) cards.push(card(`engineer-only-${n}`, "ap", "general", ["engineer"]));
  const ship = generated(cards);
  assert.equal(ship.cardDecks.hands.ap.length, 12);
  assert.ok(ship.cardDecks.hands.ap.includes("crew-wide"));
});

test("existing ship normalization preserves dealt libraries and active cooldowns without rerolling", () => {
  const cards = catalog();
  let ship = generateShipCardDecks(createShip(), cards, options);
  ship = advanceCardRound(beginCardCombat(ship, "saved-combat"), 1);
  const id = ship.cardDecks.hands.ap.find(id => cards.find(card => card.id === id).type === "flux");
  ship = useShipCard(ship, cards, id);
  const reloaded = normalizeShip(JSON.parse(JSON.stringify(ship)));
  assert.deepEqual(reloaded.cardDecks, ship.cardDecks);
  assert.equal(cardAvailability(advanceCardRound(reloaded, 2), cards, id).ok, false);
});

test("catalogs require valid stations, unique IDs, four written outcomes and Flux 2–5", () => {
  const cards = catalog();
  assert.equal(validateCardCatalog(cards), cards);
  assert.throws(() => validateCardCatalog([...cards, cards[0]]), /unique/);
  assert.throws(() => validateCardCatalog([{ ...cards[0], outcomes: { success: "Works" } }]), /outcome/);
  assert.throws(() => validateCardCatalog([{ ...cards[0], stations: ["watchmaster"] }]), /stations/);
  for (const cooldownRounds of [1, 6, 2.5]) assert.throws(() => validateCardCatalog([card("bad", "ap", "flux", ["captain"], cooldownRounds)]), /cooldown/);
});

test("rewards enter a permanent library; swaps preserve ownership and respect deck/type capacities", () => {
  const cards = catalog();
  const ship = generated(cards);
  const reward = cards.find(card => card.deck === "ap" && card.type === "general" && !ship.cardDecks.library.ap.includes(card.id));
  const awarded = awardShipCard(ship, cards, reward.id);
  assert.equal(ship.cardDecks.library.ap.length, 12);
  assert.equal(awarded.cardDecks.library.ap.length, 13);
  assert.deepEqual(awardShipCard(awarded, cards, reward.id), awarded);
  const old = cards.find(card => card.type === "general" && awarded.cardDecks.hands.ap.includes(card.id)).id;
  const hand = awarded.cardDecks.hands.ap.map(id => id === old ? reward.id : id);
  const equipped = equipCardHand(awarded, cards, "ap", hand, { isEligible: eligible });
  assert.ok(equipped.cardDecks.library.ap.includes(old));
  assert.ok(!equipped.cardDecks.hands.ap.includes(old));
  assert.throws(() => equipCardHand(awarded, cards, "ap", [...awarded.cardDecks.hands.ap, reward.id], { isEligible: eligible }), /slots/);
  assert.throws(() => equipCardHand(awarded, cards, "rp", hand, { isEligible: eligible }), /deck/);
  assert.throws(() => equipCardHand(awarded, cards, "ap", hand, { isEligible: () => false }), /eligible/);
  assert.throws(() => equipCardHand(awarded, cards, "ap", [old, old], { isEligible: eligible }), /different/);
});

test("General uses persist across repeated round updates and initiative rerolls", () => {
  const cards = catalog();
  let ship = inRound(cards);
  const id = ship.cardDecks.hands.ap.find(id => cards.find(card => card.id === id).type === "general");
  const before = structuredClone(ship);
  ship = useShipCard(ship, cards, id);
  assert.deepEqual(cardAvailability(before, cards, id), { ok: true });
  assert.throws(() => useShipCard(ship, cards, id), /used-this-round/);
  ship = beginCardCombat(advanceCardRound(ship, 1), "combat-1");
  assert.equal(cardAvailability(ship, cards, id).ok, false);
  assert.equal(cardAvailability(advanceCardRound(ship, 2), cards, id).ok, true);
  assert.throws(() => advanceCardRound(advanceCardRound(ship, 2), 1), /backwards/);
});

test("Flux cooldowns return at round used + printed cooldown in either deck", () => {
  for (const deck of ["ap", "rp"]) {
    for (const cooldown of [2, 3, 4, 5]) {
      const cards = catalog().map(card => card.type === "flux" ? { ...card, cooldownRounds: cooldown } : card);
      let ship = inRound(cards);
      const id = ship.cardDecks.hands[deck].find(id => cards.find(card => card.id === id).type === "flux");
      ship = useShipCard(ship, cards, id);
      for (let round = 2; round < 1 + cooldown; round++) assert.deepEqual(cardAvailability(advanceCardRound(ship, round), cards, id), { ok: false, reason: "cooldown", readyRound: 1 + cooldown });
      assert.equal(cardAvailability(advanceCardRound(ship, 1 + cooldown), cards, id).ok, true);
    }
  }
});

test("Signatures stay spent across rounds; combat locks swaps but not rewards", () => {
  const cards = catalog();
  let ship = inRound(cards);
  for (const deck of ["ap", "rp"]) {
    const id = ship.cardDecks.hands[deck].find(id => cards.find(card => card.id === id).type === "signature");
    ship = useShipCard(ship, cards, id);
    assert.equal(cardAvailability(advanceCardRound(ship, 20), cards, id).reason, "signature-spent");
  }
  assert.throws(() => equipCardHand(ship, cards, "ap", [], { isEligible: eligible }), /locked/);
  assert.throws(() => beginCardCombat(ship, "different-combat"), /active/);
  const reward = cards.find(card => card.deck === "rp" && !ship.cardDecks.library.rp.includes(card.id));
  const awarded = awardShipCard(ship, cards, reward.id);
  assert.ok(awarded.cardDecks.library.rp.includes(reward.id));
  assert.equal(cardAvailability(awarded, cards, reward.id).reason, "not-in-hand");
  const nextCombat = advanceCardRound(beginCardCombat(endCardCombat(awarded), "combat-2"), 1);
  for (const id of nextCombat.cardDecks.hands.ap) assert.equal(cardAvailability(nextCombat, cards, id).ok, true);
});
