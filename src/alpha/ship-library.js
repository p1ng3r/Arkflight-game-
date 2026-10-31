import { ALPHA_CARDS, ALPHA_STARTER_DECK } from "./cards.js";
import { deriveAlphaProfile } from "./hulls.js";

export const LIBRARY_COMMANDS = new Set(["library-initialize", "library-save", "library-select", "library-grant", "library-remove", "library-refit"]);
const slots = ["deck-1", "deck-2", "deck-3"];
const copy = value => structuredClone(value);
const validId = value => typeof value === "string" && !Object.hasOwn(Object.prototype, value) && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
function cardIds(cards, limit = 60) {
  if (!Array.isArray(cards) || cards.length > limit || cards.some(id => !validId(id))) throw new Error(`Provide at most ${limit} valid card IDs.`);
  return [...cards];
}
export function libraryConfig(value) {
  const config = { hullId: value.hullId, level: value.level ?? 5, upgrades: copy(value.upgrades ?? []), talents: copy(value.talents ?? []) };
  deriveAlphaProfile(config);
  return config;
}
function title(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 48) throw new Error("Name the loadout using 1–48 characters.");
  return value.trim();
}
export function assertShipLibrary(data) {
  if (!data || data.schemaVersion !== 1 || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new Error("Unrecognized ship library. Preserve its data and ask the GM to review it.");
  libraryConfig(data.config);
  cardIds(data.learned, 2048);
  if (new Set(data.learned).size !== data.learned.length || !Array.isArray(data.loadouts) || data.loadouts.length !== 3 || new Set(data.loadouts.map(d => d.id)).size !== 3 || !slots.includes(data.activeLoadoutId)) throw new Error("The ship library must contain three distinct loadouts.");
  for (const deck of data.loadouts) {
    if (!slots.includes(deck.id)) throw new Error("Unknown loadout slot.");
    title(deck.name); cardIds(deck.cards);
  }
  return data;
}
/** Learning is an unlock, not a consumable card count. Each encounter owns separate card instances. */
export function createShipLibrary(config, cards = ALPHA_STARTER_DECK) {
  const selected = cardIds(cards);
  if (selected.some(id => !Object.hasOwn(ALPHA_CARDS, id))) throw new Error("A new library requires known alpha cards.");
  const data = { schemaVersion: 1, revision: 1, config: libraryConfig(config), learned: [...new Set(selected)], activeLoadoutId: slots[0], loadouts: slots.map((id, i) => ({ id, name: ["Standard", "Alternative", "Reserve"][i], cards: [...selected] })) };
  assertShipLibrary(data);
  const errors = validateLibraryDeck(data, data.loadouts[0]);
  if (errors.length) throw new Error(errors.map(e => e.text).join(" "));
  return data;
}
export function validateLibraryDeck(data, deck, catalog = ALPHA_CARDS) {
  const profile = deriveAlphaProfile(data.config), errors = [], counts = new Map();
  const issue = (code, text, cardId = null) => errors.push({ code, text, cardId });
  if (deck.cards.length < 15) issue("minimum", "Choose at least 15 cards.");
  if (deck.cards.length > profile.deck) issue("capacity", `This ship can equip at most ${profile.deck} cards.`);
  for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, count] of counts) {
    const card = Object.hasOwn(catalog, id) ? catalog[id] : null;
    if (!card || !data.learned.includes(id)) { issue("unlearned", "The deck contains an unavailable or unlearned card.", id); continue; }
    if (count > (card.unique ? 1 : 2)) issue("copies", `${card.name}: at most ${card.unique ? 1 : 2} copies.`, id);
    // Authored requirements can be extended by later equipment/card packs without changing saved decks.
    const required = card.requirements ?? {};
    if (profile.level < (required.level ?? 1)) issue("level", `${card.name} requires ship level ${required.level}.`, id);
    if ((required.upgrades ?? []).some(key => !profile.upgrades.includes(key))) issue("upgrade", `${card.name} requires a missing upgrade.`, id);
    if ((required.mounts ?? []).some(key => !(profile.mounts[key] > 0))) issue("mount", `${card.name} requires a missing weapon mount.`, id);
  }
  return errors;
}
export function selectedLibraryDeck(data) {
  assertShipLibrary(data);
  const deck = data.loadouts.find(d => d.id === data.activeLoadoutId), errors = validateLibraryDeck(data, deck);
  if (errors.length) throw new Error(`Selected loadout “${deck.name}” is invalid: ${errors.map(e => e.text).join(" ")}`);
  return [...deck.cards];
}
/** Invalid drafts remain saved in full. Selecting/launching one requires correcting its issues. */
export function changeShipLibrary(before, command) {
  assertShipLibrary(before);
  if (command.libraryRevision !== before.revision) throw new Error("The ship library changed. Reload the saved loadout before editing again.");
  const next = copy(before);
  if (command.type === "library-save") {
    const deck = next.loadouts.find(d => d.id === command.loadoutId);
    if (!deck) throw new Error("Choose one of the three loadout slots.");
    deck.name = title(command.name); deck.cards = cardIds(command.cards);
  } else if (command.type === "library-select") {
    const deck = next.loadouts.find(d => d.id === command.loadoutId);
    if (!deck) throw new Error("Choose one of the three loadout slots.");
    const errors = validateLibraryDeck(next, deck);
    if (errors.length) throw new Error(errors.map(e => e.text).join(" "));
    next.activeLoadoutId = deck.id;
  } else if (["library-grant", "library-remove"].includes(command.type)) {
    if (!validId(command.cardId) || !Object.hasOwn(ALPHA_CARDS, command.cardId)) throw new Error("Choose a card from the alpha catalog.");
    if (command.type === "library-grant") next.learned = [...new Set([...next.learned, command.cardId])];
    else next.learned = next.learned.filter(id => id !== command.cardId);
  } else if (command.type === "library-refit") next.config = libraryConfig(command.config);
  else throw new Error("Unknown ship library operation.");
  next.revision++; assertShipLibrary(next);
  return next;
}
