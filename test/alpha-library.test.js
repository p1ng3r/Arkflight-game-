import test from "node:test";
import assert from "node:assert/strict";
import { ALPHA_CARDS, ALPHA_STARTER_DECK } from "../src/alpha/cards.js";
import { createShipLibrary, changeShipLibrary, assertShipLibrary, validateLibraryDeck, selectedLibraryDeck } from "../src/alpha/ship-library.js";

const config = { hullId: "brigantine", level: 5 };
const apply = (data, type, extra = {}) => changeShipLibrary(data, { type, libraryRevision: data.revision, ...extra });

test("one learned unlock permits two ordinary copies, three independent named loadouts and one active selection", () => {
  let data = createShipLibrary(config);
  assert.equal(data.learned.filter(id => id === "patch").length, 1);
  assert.equal(data.loadouts.length, 3); assert.equal(selectedLibraryDeck(data).filter(id => id === "patch").length, 2);
  data = apply(data, "library-save", { loadoutId: "deck-2", name: "Boarding party", cards: [...ALPHA_STARTER_DECK] });
  data = apply(data, "library-select", { loadoutId: "deck-2" });
  assert.equal(data.activeLoadoutId, "deck-2"); assert.equal(data.loadouts[1].name, "Boarding party"); assert.equal(data.loadouts[0].name, "Standard");
  const snapshot = JSON.parse(JSON.stringify(data)); assert.deepEqual(assertShipLibrary(snapshot), data);
});
test("removing knowledge preserves all deck entries and flags them; granting restores validity without duplicate unlocks", () => {
  let data = createShipLibrary(config), decks = structuredClone(data.loadouts);
  data = apply(data, "library-remove", { cardId: "patch" });
  assert.deepEqual(data.loadouts, decks); assert.ok(data.loadouts.every(d => validateLibraryDeck(data, d).some(i => i.code === "unlearned")));
  assert.throws(() => selectedLibraryDeck(data), /invalid/);
  data = apply(data, "library-grant", { cardId: "patch" }); data = apply(data, "library-grant", { cardId: "patch" });
  assert.equal(data.learned.filter(id => id === "patch").length, 1); assert.deepEqual(selectedLibraryDeck(data), decks[0].cards);
});
test("refits retain all 19 cards when capacity falls, with launch blocked until the crew corrects its saved draft", () => {
  const cards = [...ALPHA_STARTER_DECK, "ram", "ahead", "chainshot", "harmonic"];
  let data = createShipLibrary({ ...config, level: 20 }, cards);
  data = apply(data, "library-refit", { config: { ...config, level: 1 } });
  assert.equal(data.loadouts[0].cards.length, 19); assert.ok(validateLibraryDeck(data, data.loadouts[0]).some(i => i.code === "capacity"));
  assert.throws(() => selectedLibraryDeck(data), /at most 15/);
  data = apply(data, "library-save", { loadoutId: "deck-1", name: "Reduced complement", cards: cards.slice(0, 15) });
  assert.equal(selectedLibraryDeck(data).length, 15); assert.equal(data.loadouts[1].cards.length, 19);
});
test("invalid drafts can be saved, but cannot be selected or launched; unique and ordinary copy limits remain distinct", () => {
  let data = createShipLibrary(config);
  data = apply(data, "library-save", { loadoutId: "deck-2", name: "Work in progress", cards: ["all-hands", "all-hands", "patch", "patch", "patch", "future-card"] });
  const errors = validateLibraryDeck(data, data.loadouts[1]);
  assert.ok(errors.some(i => i.code === "minimum")); assert.equal(errors.filter(i => i.code === "copies").length, 2); assert.ok(errors.some(i => i.code === "unlearned"));
  assert.throws(() => apply(data, "library-select", { loadoutId: "deck-2" }), /at least 15/); assert.equal(data.loadouts[1].cards.length, 6);
  assert.equal(data.activeLoadoutId, "deck-1"); assert.equal(selectedLibraryDeck(data).length, 15);
});
test("authored card requirements revalidate after a profile change without modifying any deck", () => {
  let data = createShipLibrary(config);
  const catalog = { ...ALPHA_CARDS, patch: { ...ALPHA_CARDS.patch, requirements: { level: 6, upgrades: ["ward-emitters"] } } };
  assert.ok(validateLibraryDeck(data, data.loadouts[0], catalog).some(e => e.code === "level"));
  assert.ok(validateLibraryDeck(data, data.loadouts[0], catalog).some(e => e.code === "upgrade"));
  const cards = [...data.loadouts[0].cards];
  data = apply(data, "library-refit", { config: { ...config, level: 6, upgrades: ["ward-emitters"] } });
  assert.deepEqual(validateLibraryDeck(data, data.loadouts[0], catalog), []); assert.deepEqual(data.loadouts[0].cards, cards);
});
test("stale saves, prototype keys and malformed loadouts fail without mutating the stored library", () => {
  const data = createShipLibrary(config), before = structuredClone(data);
  assert.throws(() => changeShipLibrary(data, { type: "library-save", libraryRevision: 0 }), /changed/);
  assert.throws(() => apply(data, "library-save", { loadoutId: "deck-1", name: "Bad", cards: ["__proto__"] }), /valid card IDs/);
  assert.throws(() => apply(data, "library-save", { loadoutId: "deck-4", name: "Extra", cards: [] }), /three loadout/);
  assert.throws(() => apply(data, "library-save", { loadoutId: "deck-1", name: " ", cards: [] }), /1–48/);
  assert.throws(() => apply(data, "library-grant", { cardId: "constructor" }), /alpha catalog/);
  assert.deepEqual(data, before);
});

test("permanent knowledge can grow beyond the planned 75-card collection without expanding a combat deck", () => {
  const data = createShipLibrary(config), deck = [...selectedLibraryDeck(data)];
  data.learned.push(...Array.from({ length: 100 }, (_, i) => `expansion-${i}`));
  assert.doesNotThrow(() => assertShipLibrary(data));
  assert.deepEqual(selectedLibraryDeck(data), deck);
  assert.equal(JSON.parse(JSON.stringify(data)).learned.length, data.learned.length);
});
