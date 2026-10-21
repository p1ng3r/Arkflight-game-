import test from "node:test";
import assert from "node:assert/strict";
import { buildCardCombatTestFleet, CARD_COMBAT_TEST_SHIPS } from "../src/content/card-combat-test-ships.js";
import { SHIP_CATALOGS } from "../src/content/index.js";
import { validateShip } from "../src/ship/validate-ship.js";
import { importCardCombatTestFleet } from "../src/foundry/card-combat-test-fleet.js";
import { CARD_SKILLS, createPlaytestSession } from "../src/cards/card-playtest-session.js";
import { weaponDamageProfile } from "../src/combat/weapon-combat.js";

function mockWorld({ isGM = true, failAt = null } = {}) {
  const actors = [], folders = [], writes = [], settingsWrites = [];
  let serial = 0, attempts = 0, saved = {};
  const gm = { id: "gm", isGM, active: true };
  const callbacks = new Map();
  globalThis.Hooks = { once(event, fn) { const list = callbacks.get(event) ?? []; list.push(fn); callbacks.set(event, list); }, on() {}, callAll() {} };
  globalThis.game = { user: gm, users: { [Symbol.iterator]: function* () { yield gm; }, get: id => id === gm.id ? gm : null }, actors: { contents: actors, get: id => actors.find(actor => actor.id === id) }, folders: { contents: folders }, settings: { register() {}, get: () => structuredClone(saved), async set(...args) { settingsWrites.push(args); saved = structuredClone(args[2]); } }, arkflight: {} };
  globalThis.foundry = { utils: { randomID: () => `session-${++serial}` } };
  globalThis.Folder = { async create(data) { const folder = { id: `folder-${++serial}`, ...structuredClone(data) }; folders.push(folder); return folder; } };
  globalThis.Actor = { async create(data) { if (++attempts === failAt) throw new Error("Simulated create failure"); const actor = { id: `actor-${++serial}`, ...structuredClone(data), async update(patch) { writes.push(this.id); for (const [path, value] of Object.entries(patch)) { const keys = path.split("."), last = keys.pop(), parent = keys.reduce((obj, key) => obj[key] ??= {}, this); parent[last] = structuredClone(value); } } }; actors.push(actor); return actor; } };
  return { actors, folders, writes, settingsWrites, callbacks, gm };
}

test("four distinct level-five test ships are legal, armed and ready with independent card libraries", () => {
  const fleet = buildCardCombatTestFleet({ rng: () => .7 });
  assert.equal(fleet.length, 4);
  assert.equal(new Set(fleet.map(e => e.id)).size, 4);
  assert.deepEqual(fleet.map(e => e.team), ["A", "A", "B", "B"]);
  for (const entry of fleet) {
    const ship = entry.ship;
    assert.equal(ship.progression.level, 5);
    assert.equal(validateShip(ship, SHIP_CATALOGS).ok, true);
    assert.equal(ship.weapons.length, 6);
    for (const key of ["hull", "lifeveil", "drive", "arkengine", "morale", "supplies"]) assert.equal(ship.resources[key].value, ship.resources[key].max, `${entry.id}: ${key}`);
    assert.equal(ship.resources.strain.value, 0);
    assert.equal(ship.cardDecks.hands.ap.length, 12);
    assert.equal(ship.cardDecks.hands.rp.length, 6);
    assert.ok(Object.values(ship.crew.stations).every(id => id === null));
  }
  fleet[0].ship.cardDecks.hands.ap.pop();
  assert.equal(fleet[1].ship.cardDecks.hands.ap.length, 12);
});

test("the packaged fleet starts a four-ship encounter with real catalog weapons and NPC fallback", () => {
  const entries = buildCardCombatTestFleet({ rng: () => .7 }).map(entry => {
    const ship = entry.ship;
    for (const station of Object.keys(CARD_SKILLS)) ship.crew.stations[station] = `npc:${entry.id}:${station}`;
    const weapons = ship.weapons.map(install => { const weapon = SHIP_CATALOGS.weapons[install.id], combat = weapon.data.combat; return { key: install.instanceId, name: weapon.name, mount: install.mount, dice: weaponDamageProfile(weapon, install).dice, minRange: combat.rangeHexes.min, maxRange: combat.rangeHexes.max, reloadRounds: combat.reloadRounds, potency: 0 }; });
    return { ...entry, stats: validateShip(ship, SHIP_CATALOGS).derived.stats, weapons };
  });
  const session = createPlaytestSession(entries, { id: "fleet", rng: () => .7 });
  assert.equal(Object.keys(session.ships).length, 4);
  assert.ok(Object.values(session.ships).every(ship => ship.resources.hull.value > 0 && ship.cardPlay.weapons.length === 6));
});

test("repeat imports reuse marked ships after renames and preserve edits and same-name campaign ships", async () => {
  const world = mockWorld();
  world.actors.push({ id: "campaign", name: CARD_COMBAT_TEST_SHIPS[0].name, flags: { "arkflight-game": { ship: { campaign: true } } } });
  const first = await importCardCombatTestFleet();
  const actor = world.actors.find(a => a.id === first.actorIds[0]);
  actor.name = "Renamed test ship"; actor.flags["arkflight-game"].ship.resources.hull.value = 1;
  const before = structuredClone(actor.flags);
  const again = await importCardCombatTestFleet();
  assert.deepEqual(again.actorIds, first.actorIds);
  assert.deepEqual(again.createdIds, []);
  assert.deepEqual(actor.flags, before);
  assert.equal(world.folders.length, 1);
  assert.equal(world.actors.length, 5);
  assert.deepEqual(world.writes, []);
  assert.deepEqual(world.settingsWrites, []);
});

test("retry after a partial import creates only the missing vessels", async () => {
  const world = mockWorld({ failAt: 3 });
  await assert.rejects(importCardCombatTestFleet(), /Simulated/);
  assert.equal(world.actors.length, 2);
  const retry = await importCardCombatTestFleet();
  assert.equal(retry.createdIds.length, 2);
  assert.equal(world.actors.length, 4);
  assert.equal(world.folders.length, 1);
});

test("test fleet uses overhead rotating tokens while retaining the original Actor portrait", async () => {
  const world = mockWorld(); await importCardCombatTestFleet();
  for (const actor of world.actors) {
    assert.equal(actor.img, "modules/arkflight-game/assets/ui/stations/voyage_vessel_icon.webp");
    assert.equal(actor.prototypeToken.texture.src, "modules/arkflight-game/assets/ui/stations/voyage_vessel_token_topdown.webp");
    assert.equal(actor.prototypeToken.lockRotation, false);
    assert.equal(actor.prototypeToken.rotation, 0);
  }
});

test("repeat import upgrades only default art on marked test Actors and linked tokens, preserving customizations", async () => {
  const world = mockWorld(), first = await importCardCombatTestFleet();
  const portrait = "modules/arkflight-game/assets/ui/stations/voyage_vessel_icon.webp", topdown = "modules/arkflight-game/assets/ui/stations/voyage_vessel_token_topdown.webp";
  const actor = world.actors[0], custom = world.actors[1];
  actor.prototypeToken.texture = { src: portrait, scaleX: 1.7 }; actor.prototypeToken.rotation = 120; actor.prototypeToken.lockRotation = true;
  custom.prototypeToken.texture.src = "worlds/custom-ship.webp";
  const resources = structuredClone(actor.flags), customPrototype = structuredClone(custom.prototypeToken);
  const tokens = [
    { id: "default", actorId: actor.id, actorLink: true, texture: { src: portrait, scaleX: 2 }, rotation: 240, x: 200, y: 350 },
    { id: "custom", actorId: actor.id, actorLink: true, texture: { src: "worlds/my-token.webp" }, rotation: 60 },
    { id: "campaign", actorId: "campaign", actorLink: true, texture: { src: portrait } },
    { id: "unlinked", actorId: actor.id, actorLink: false, texture: { src: portrait } }
  ];
  const untouched = structuredClone(tokens.slice(1)), sceneWrites = [];
  game.scenes = { contents: [{ tokens: { contents: tokens }, async updateEmbeddedDocuments(type, patches) {
    assert.equal(type, "Token"); sceneWrites.push(...patches);
    for (const patch of patches) { const token = tokens.find(t => t.id === patch._id); token.texture.src = patch["texture.src"]; token.lockRotation = patch.lockRotation; }
  } }] };
  const again = await importCardCombatTestFleet();
  assert.deepEqual(again.actorIds, first.actorIds); assert.deepEqual(again.createdIds, []);
  assert.equal(actor.prototypeToken.texture.src, topdown); assert.equal(actor.prototypeToken.texture.scaleX, 1.7); assert.equal(actor.prototypeToken.rotation, 120);
  assert.deepEqual(actor.flags, resources); assert.deepEqual(custom.prototypeToken, customPrototype);
  assert.equal(tokens[0].texture.src, topdown); assert.equal(tokens[0].lockRotation, false); assert.equal(tokens[0].rotation, 240);
  assert.equal(tokens[0].x, 200); assert.equal(tokens[0].y, 350); assert.equal(tokens[0].texture.scaleX, 2);
  assert.deepEqual(tokens.slice(1), untouched); assert.equal(sceneWrites.length, 1); assert.deepEqual(world.writes, [actor.id]);
  await importCardCombatTestFleet(); assert.equal(sceneWrites.length, 1); assert.deepEqual(world.writes, [actor.id]);
  delete game.scenes;
});

test("players cannot import test ships", async () => {
  const world = mockWorld({ isGM: false });
  await assert.rejects(importCardCombatTestFleet(), /Only the GM/);
  assert.equal(world.actors.length, 0);
  assert.equal(world.folders.length, 0);
});

test("the registered command imports serially without altering the encounter and rejects player requests", async () => {
  const world = mockWorld();
  await import("../src/foundry/card-combat-playtest-api.js?test-fleet-api");
  for (const callback of world.callbacks.get("init")) callback();
  for (const callback of world.callbacks.get("ready")) callback();
  await Promise.all([game.arkflight.cardCombat.importTestShips(), game.arkflight.cardCombat.importTestShips()]);
  assert.equal(world.actors.length, 4);
  assert.equal(world.folders.length, 1);
  assert.deepEqual(world.settingsWrites, []);
  const original = world.actors.map(actor => structuredClone(actor.flags["arkflight-game"].ship));
  await game.arkflight.cardCombat.request({ type: "start", entries: world.actors.map(actor => ({ id: actor.id, team: actor.flags["arkflight-game"].cardCombatTestTeam })) });
  assert.equal(game.arkflight.cardCombat.state().phase, "planning");
  assert.equal(Object.keys(game.arkflight.cardCombat.state().ships).length, 4);
  assert.deepEqual(world.actors.map(actor => actor.flags["arkflight-game"].ship), original);
  game.user = { ...world.gm, isGM: false };
  await assert.rejects(game.arkflight.cardCombat.importTestShips(), /Only the GM/);
});
