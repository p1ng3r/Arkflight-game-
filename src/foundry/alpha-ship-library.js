import { ALPHA_CARDS, ALPHA_STARTER_DECK } from "../alpha/cards.js";
import { deriveAlphaProfile } from "../alpha/hulls.js";
import { LIBRARY_COMMANDS, assertShipLibrary, createShipLibrary, changeShipLibrary, validateLibraryDeck, selectedLibraryDeck } from "../alpha/ship-library.js";

const MODULE = "arkflight-game", FLAG = "alphaLibrary";
export const actorLibrary = actor => actor.flags?.[MODULE]?.[FLAG];
function shipActor(actorId) {
  const actor = game.actors.get(actorId);
  if (!actor || actor.type !== "vehicle" || !actor.flags?.[MODULE]?.alphaCombatShip) throw new Error("Choose an alpha ship Actor. Campaign migration is not enabled.");
  return actor;
}
function permitted(actor, user) { return Boolean(user?.active && (user.isGM || actor.testUserPermission(user, "OWNER"))); }
export function libraryLock(actorId) {
  const state = game.settings.get(MODULE, "alphaCombat"), job = game.settings.get(MODULE, "alphaMovementJournal");
  const includes = value => Object.values(value?.ships ?? {}).some(ship => ship.actorId === actorId);
  if (job?.next && (includes(job.before) || includes(job.next))) return "Finish or restore the saved movement before changing this ship.";
  if (state?.id && !state.complete && includes(state)) return "Library and loadout edits are locked until this ship battle ends, including boarding pauses.";
  if (game.combats.contents.some(c => c.started && !c.flags?.[MODULE]?.alphaCombat && [...c.combatants].some(row => row.actorId === actorId))) return "End this ship's Foundry encounter before changing its library.";
  return null;
}
export function libraryShips(user = game.user) {
  return game.actors.contents.filter(a => a.type === "vehicle" && a.flags?.[MODULE]?.alphaCombatShip && permitted(a, user)).map(a => ({ id: a.id, name: a.name, initialized: Boolean(actorLibrary(a)), locked: Boolean(libraryLock(a.id)) }));
}
function seedFor(actor) {
  const state = game.settings.get(MODULE, "alphaCombat"), ship = Object.values(state?.ships ?? {}).find(s => s.actorId === actor.id);
  if (ship) return createShipLibrary({ hullId: ship.profile.id, level: ship.profile.level, upgrades: ship.profile.upgrades, talents: ship.profile.talents }, Object.values(ship.instances));
  const spec = actor.flags[MODULE].alphaShip;
  if (!spec?.hullId) throw new Error("This test ship has no profile to adopt.");
  return createShipLibrary(spec, spec.deck ?? ALPHA_STARTER_DECK);
}
export function viewShipLibrary(actorId, user = game.user) {
  const actor = shipActor(actorId);
  if (!permitted(actor, user)) throw new Error("You do not own this alpha ship.");
  const stored = actorLibrary(actor), data = stored ? structuredClone(assertShipLibrary(stored)) : seedFor(actor);
  const cards = Object.values(ALPHA_CARDS).filter(c => user.isGM || data.learned.includes(c.id));
  return { actorId: actor.id, name: actor.name, initialized: Boolean(stored), ...data, revision: stored ? data.revision : 0, profile: deriveAlphaProfile(data.config), locked: libraryLock(actor.id), canGrant: user.isGM, catalog: structuredClone(cards), loadouts: data.loadouts.map(deck => ({ ...deck, active: deck.id === data.activeLoadoutId, issues: validateLibraryDeck(data, deck) })) };
}
export async function writeShipLibrary(actor, data) {
  assertShipLibrary(data);
  await actor.update({ [`flags.${MODULE}.${FLAG}`]: structuredClone(data) }, { arkflightAlphaLibrary: true });
  if (JSON.stringify(actorLibrary(actor)) !== JSON.stringify(data)) throw new Error("The ship library save was not confirmed. Reopen it before retrying.");
  Hooks.callAll("arkflightAlphaChanged");
}
export async function handleLibraryCommand(command, user) {
  if (!LIBRARY_COMMANDS.has(command.type)) throw new Error("Unknown library command.");
  const actor = shipActor(command.actorId);
  if (!permitted(actor, user)) throw new Error("You do not own this alpha ship.");
  if (["library-initialize", "library-grant", "library-remove", "library-refit"].includes(command.type) && !user.isGM) throw new Error("Only the GM may grant/remove learned cards, adopt a ship or refit its profile.");
  const locked = libraryLock(actor.id); if (locked) throw new Error(locked);
  const stored = actorLibrary(actor);
  let next;
  if (command.type === "library-initialize") {
    if (stored || command.libraryRevision !== 0) throw new Error("The ship library changed. Reopen it before initializing.");
    next = seedFor(actor);
  } else {
    if (!stored) throw new Error("Ask the GM to initialize this ship's library first.");
    next = changeShipLibrary(stored, command);
  }
  await writeShipLibrary(actor, next);
  return viewShipLibrary(actor.id, user);
}
/** Called only by the primary GM during fixture setup; a saved deck is never silently replaced. */
export async function prepareStoredShip(actor, spec, { useSavedShips = false } = {}) {
  const stored = actorLibrary(actor);
  let data = stored ? structuredClone(assertShipLibrary(stored)) : createShipLibrary(spec, spec.deck ?? ALPHA_STARTER_DECK);
  if (stored && !useSavedShips) {
    const next = changeShipLibrary(data, { type: "library-refit", libraryRevision: data.revision, config: spec });
    if (JSON.stringify(next.config) !== JSON.stringify(data.config)) { await writeShipLibrary(actor, next); data = next; }
  }
  const deck = selectedLibraryDeck(data);
  if (!stored) await writeShipLibrary(actor, data);
  return { ...spec, ...data.config, deck, learned: [...data.learned], libraryRevision: data.revision, loadoutId: data.activeLoadoutId };
}
Hooks.on("preUpdateActor", (actor, changes) => {
  const touchesLibrary = Object.keys(changes).some(key => key === `flags.${MODULE}.${FLAG}` || key.startsWith(`flags.${MODULE}.${FLAG}.`) || key === `flags.${MODULE}` && Object.hasOwn(changes[key] ?? {}, FLAG) || key === "flags" && Object.hasOwn(changes.flags?.[MODULE] ?? {}, FLAG));
  if (touchesLibrary && !game.user.isGM) { ui.notifications.warn("Use the ship library controls; the GM validates and saves library changes."); return false; }
});
