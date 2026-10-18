import { resolveCanvasBindings, bindCanvasSession, assertCanvasPositions, moveCanvasToken, createCanvasCombat, syncCanvasCombat, placeSelectedCanvasShips, boundShipForToken } from "./card-combat-canvas.js";
import { importCardCombatTestFleet } from "./card-combat-test-fleet.js";
import { PLAYTEST_COMBAT_CARDS } from "../content/combat-cards-playtest.js";
import { generateShipCardDecks } from "../cards/card-library.js";
import { CARD_SKILLS, createPlaytestSession } from "../cards/card-playtest-session.js";
import { dispatchPlaytestCommand } from "../cards/playtest-commands.js";
import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { weaponDamageProfile } from "../combat/weapon-combat.js";

const MODULE = "arkflight-game", SETTING = "cardCombatPlaytest";
let commandQueue = Promise.resolve();
const pending = new Map();
const clone = value => structuredClone(value);
function primaryGM() { return [...game.users].filter(u => u.active && u.isGM).sort((a, b) => a.id.localeCompare(b.id))[0] ?? null; }
function actorFrom(reference) {
  return game.actors.get(reference) ?? game.actors.contents.find(a => a.uuid === reference || a.name === reference) ?? null;
}
export function ownsCardOperator(user, reference) {
  if (!reference) return false;
  return user?.isGM || actorFrom(reference)?.testUserPermission?.(user, "OWNER") === true;
}
function operatorEligible(id, _station, ship) { return Object.values(ship.crew?.stations ?? {}).includes(id); }
export function cardOperatorRank(ship, station, skill, operatorId = null) {
  const actor = actorFrom(operatorId ?? ship.crew?.stations?.[station]);
  if (!actor) return 1; // Explicit NPC-crew playtest default for an unassigned slot.
  const key = skill === "warfare-lore" ? Object.keys(actor.system?.skills ?? {}).find(k => k === "warfare-lore" || k === "warfare") : skill;
  const rank = Number(actor.skills?.[key]?.rank ?? actor.system?.skills?.[key]?.rank ?? 0);
  return Math.max(0, Math.min(4, Number.isFinite(rank) ? rank : 0));
}
async function roll(formula) {
  const result = await new Roll(formula).evaluate();
  return Number(result.total);
}
export function authenticateCardRequest(message, userId, users) {
  const user = users.get(userId);
  const authorId = message.author?.id ?? message.user?.id ?? message.user;
  if (!user?.active || authorId !== userId) return null;
  return user;
}
function weaponEntries(ship) {
  return (ship.weapons ?? []).map((install, index) => {
    const id = typeof install === "string" ? install : install.id;
    const weapon = SHIP_CATALOGS.weapons[id];
    if (!weapon) throw new Error(`Unknown installed weapon: ${id}`);
    const profile = weaponDamageProfile(weapon, install), combat = weapon.data?.combat ?? {};
    if (!/^\d+d\d+(?:[+-]\d+)?$/.test(String(profile.dice).replaceAll(" ", ""))) throw new Error(`Unsupported damage formula for ${weapon.name}.`);
    return { key: install.instanceId ?? `${id}-${index}`, name: weapon.name, mount: install.mount ?? install.arc ?? "deck", dice: profile.dice, potency: Number(install.upgrades?.potency ?? 0), minRange: Number(combat.rangeHexes?.min ?? 1), maxRange: Number(combat.rangeHexes?.max ?? 6), reloadRounds: Math.max(0, Number(combat.reloadRounds ?? 1)) };
  });
}
async function startEncounter(command, user) {
  if (!user.isGM) throw new Error("The GM selects ships and starts the card playtest.");
  const current = game.settings.get(MODULE, SETTING);
  if (current?.id && current.phase !== "complete") throw new Error("End the current card encounter before starting another.");
  if (!Array.isArray(command.entries) || command.entries.length < 2 || command.entries.length > 8 || new Set(command.entries.map(e => e.id)).size !== command.entries.length) throw new Error("Choose two to eight different ships.");
  if (new Set(command.entries.map(e => e.team)).size < 2) throw new Error("Assign at least two opposing sides.");
  // Validate every selected ship before permanently dealing any first library.
  const entries = command.entries.map(entry => {
    const actor = game.actors.get(entry.id), source = actor?.flags?.[MODULE]?.ship;
    if (!source) throw new Error("Choose an Arkflight ship Actor.");
    const ship = clone(source), stats = deriveShip(ship, SHIP_CATALOGS).stats, weapons = weaponEntries(ship);
    if (!weapons.length) throw new Error(`${actor.name} needs an installed weapon for this batch.`);
    if (!(Number(ship.resources?.hull?.value) > 0)) throw new Error(`${actor.name} needs Hull above zero for this playtest.`);
    return { id: actor.id, name: actor.name, team: String(entry.team ?? "").trim(), ship, stats, weapons };
  });
  const binding = command.sceneId ? resolveCanvasBindings(entries, command) : null;
  for (const entry of entries) {
    if (!entry.team) throw new Error("Assign a side to every ship.");
    const actor = game.actors.get(entry.id);
    if (!entry.ship.cardDecks) {
      entry.ship = generateShipCardDecks(entry.ship, PLAYTEST_COMBAT_CARDS, { stationIds: Object.keys(CARD_SKILLS), isEligible: () => true });
      await actor.update({ [`flags.${MODULE}.ship.cardDecks`]: entry.ship.cardDecks });
    }
    for (const station of Object.keys(CARD_SKILLS)) entry.ship.crew.stations[station] ??= `npc:${entry.id}:${station}`;
  }
  const session = createPlaytestSession(entries, { id: foundry.utils.randomID() });
  return binding ? bindCanvasSession(session, binding) : session;
}
async function handle(command, user) {
  if (!command || JSON.stringify(command).length > 30000) throw new Error("Invalid card command.");
  if (command.type === "place-ships") return placeSelectedCanvasShips(command, user);
  if (command.type === "import-test-ships") {
    if (!user.isGM) throw new Error("Only the GM may import the combat test fleet.");
    return importCardCombatTestFleet();
  }
  const before = clone(game.settings.get(MODULE, SETTING));
  if (command.type !== "start" && command.type !== "end") assertCanvasPositions(before);
  let next;
  if (command.type === "start") next = await startEncounter(command, user);
  else next = await dispatchPlaytestCommand(before, command, { user, ownsOperator: ownsCardOperator, isEligibleOperator: operatorEligible, rank: cardOperatorRank, roll });
  // One primary GM serializes all commands, including both ships in a shot.
  if (JSON.stringify(game.settings.get(MODULE, SETTING)) !== JSON.stringify(before)) throw new Error("Encounter changed during this command; retry from its latest state.");
  let rollback = async () => {};
  if (command.type === "start" && next.canvas) rollback = await createCanvasCombat(next);
  else if (before?.canvas && ["helm", "canvas-move"].includes(command.type)) rollback = await moveCanvasToken(before, next, command.shipId);
  try { await game.settings.set(MODULE, SETTING, next); }
  catch (error) { await rollback(); throw error; }
  try { await syncCanvasCombat(next); }
  catch (error) { console.error("Arkflight | Card combat tracker sync failed", error); ui.notifications?.warn("Card order saved. Foundry's tracker will retry synchronization on the next command."); }
  Hooks.callAll("arkflightCardCombatChanged", next);
  return next;
}
function enqueue(command, user) {
  const next = commandQueue.catch(() => {}).then(() => handle(clone(command), user));
  commandQueue = next;
  return next;
}
async function request(command) {
  const gm = primaryGM();
  if (!gm) throw new Error("An active GM is needed to run the shared card encounter.");
  if (gm.id === game.user.id) return enqueue(command, game.user);
  const requestId = foundry.utils.randomID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error("Card request timed out; refresh the encounter before retrying.")); }, 30000);
    pending.set(requestId, { resolve, reject, timeout });
    // The server's document-creation userId authenticates this request. No
    // client-supplied user ID or raw socket identity is accepted as authority.
    ChatMessage.create({ author: game.user.id, whisper: [gm.id], content: "Arkflight card command", flags: { [MODULE]: { cardCommand: { requestId, command } } } }).catch(error => {
      clearTimeout(timeout); pending.delete(requestId); reject(error);
    });
  });
}

Hooks.once("init", () => game.settings.register(MODULE, SETTING, { name: "Arkflight Card Combat Playtest", scope: "world", config: false, type: Object, default: {} }));
Hooks.once("ready", () => {
  game.arkflight.cardCombat = Object.freeze({ cards: PLAYTEST_COMBAT_CARDS, state: () => { const state = game.settings.get(MODULE, SETTING); return state?.id ? clone(state) : null; }, request, isCanvasToken: token => Boolean(boundShipForToken(token)), placeShips: actorIds => request({ type: "place-ships", sceneId: globalThis.canvas?.scene?.id, actorIds }), importTestShips: () => request({ type: "import-test-ships" }), ownsOperator: ownsCardOperator });
});
Hooks.on("createChatMessage", (message, _options, userId) => {
  const request = message.flags?.[MODULE]?.cardCommand;
  if (!request || primaryGM()?.id !== game.user.id) return;
  const user = authenticateCardRequest(message, userId, game.users);
  if (!user) return;
  enqueue(request.command, user).then(
    () => message.update({ [`flags.${MODULE}.cardResult`]: { requestId: request.requestId, ok: true }, content: "Arkflight card command resolved" }),
    error => message.update({ [`flags.${MODULE}.cardResult`]: { requestId: request.requestId, ok: false, error: error.message }, content: "Arkflight card command rejected" })
  ).catch(error => console.error("Arkflight | Card request reply failed", error));
});
Hooks.on("updateChatMessage", (message, _changes, _options, userId) => {
  if (!game.users.get(userId)?.isGM) return;
  const result = message.flags?.[MODULE]?.cardResult, waiting = pending.get(result?.requestId);
  if (!waiting) return;
  clearTimeout(waiting.timeout); pending.delete(result.requestId);
  if (result.ok) waiting.resolve(game.arkflight.cardCombat.state());
  else waiting.reject(new Error(result.error));
});
Hooks.on("renderChatMessageHTML", (message, html) => {
  if (message.flags?.[MODULE]?.cardCommand) html.style.display = "none";
});
Hooks.on("updateSetting", setting => {
  if (setting.key === `${MODULE}.${SETTING}`) Hooks.callAll("arkflightCardCombatChanged", game.arkflight?.cardCombat?.state());
});

Hooks.on("canvasReady", () => {
  const state = game.arkflight?.cardCombat?.state();
  if (game.user?.id === primaryGM()?.id && state?.canvas?.sceneId === globalThis.canvas?.scene?.id) void syncCanvasCombat(state).catch(error => console.error("Arkflight | Card tracker resume failed", error));
});
