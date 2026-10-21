import test from "node:test";
import assert from "node:assert/strict";
import { deriveBuild } from "../scripts/combat-build-lab.mjs";
import { CARD_SKILLS, batteryOptions, weaponCoverage, movePlaytestShipTo } from "../src/cards/card-playtest-session.js";
import { getOrderQueue } from "../src/cards/committed-orders.js";
const hooks = new Map();
globalThis.Hooks = { once: add, on: add, off(name, fn) { hooks.set(name, (hooks.get(name) ?? []).filter(row => row !== fn)); }, callAll(name, ...args) { for (const fn of hooks.get(name) ?? []) fn(...args); } };
function add(name, fn) { const list = hooks.get(name) ?? []; list.push(fn); hooks.set(name, list); }
const bridge = await import("../src/foundry/card-combat-canvas.js");
await import("../src/foundry/card-combat-playtest-api.js");
function grid(type = 4) {
  const flat = type >= 4, scale = 60;
  function point({ q, r }) { return flat ? { x: 1.5 * q * scale + 500, y: Math.sqrt(3) * (r + q / 2) * scale + 500 } : { x: Math.sqrt(3) * (q + r / 2) * scale + 500, y: 1.5 * r * scale + 500 }; }
  function cell(p) {
    const x = (p.x - 500) / scale, y = (p.y - 500) / scale;
    const q = flat ? 2 / 3 * x : x / Math.sqrt(3) - y / 3, r = flat ? y / Math.sqrt(3) - x / 3 : 2 / 3 * y;
    let a = Math.round(q), b = Math.round(r), c = Math.round(-q - r);
    if (Math.abs(a - q) > Math.abs(b - r) && Math.abs(a - q) > Math.abs(c + q + r)) a = -b - c;
    else if (Math.abs(b - r) > Math.abs(c + q + r)) b = -a - c;
    return { q: a, r: b, s: -a - b };
  }
  return { type, size: 120, isHexagonal: true, getCenterPoint: point, getCube: cell, getAdjacentCubes: () => [[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]].map(([q,r]) => ({q,r,s:-q-r})) };
}
function world(type = 4) {
  let stored = {}, serial = 0;
  const writes = [], moves = [], notifications = [], combatDocs = new Map();
  const gm = { id: "gm", active: true, isGM: true }, users = { [Symbol.iterator]: function* () { yield gm; }, get: id => id === "gm" ? gm : null };
  const actors = ["a", "b"].map(id => { const ship = structuredClone(deriveBuild("rum-stock-l5").ship); ship.crew.stations = Object.fromEntries(Object.keys(CARD_SKILLS).map(st => [st, `${id}-${st}`])); return { id, name: id, flags: { "arkflight-game": { ship } }, async update() { throw Error("Existing card library should be installed below"); } }; });
  const scene = { id: "scene", width: 2000, height: 2000, tokens: { contents: [], get(id) { return this.contents.find(t => t.id === id); } } };
  const g = grid(type);
  function token(actor, id, q, r, rotation = 120) {
    const p = g.getCenterPoint({q,r});
    const t = { id, name: id, actorId: actor.id, actor, actorLink: true, parent: scene, x: p.x - 60, y: p.y - 60, rotation, width: 1, height: 1, getCenterPoint(data = {}) { return { x: (data.x ?? this.x) + 60, y: (data.y ?? this.y) + 60 }; }, object: { checkCollision: () => t.blocked ?? false }, async update(patch, options = {}) {
      if ("x" in patch || "y" in patch) {
        const denied = (hooks.get("preMoveToken") ?? []).some(fn => fn(t, { destination: patch }, options) === false);
        assert.equal(denied, false, "authority update passes native movement routing");
        moves.push({ id, pose: patch, options });
        if (this.failNext) { this.failNext = false; this.x += 15; return this; }
      }
      if ((hooks.get("preUpdateToken") ?? []).some(fn => fn(t, patch, options) === false)) return this;
      Object.assign(this, patch); return this;
    }, async move(pose, options) {
      assert.equal(options.method, "hud"); assert.equal(options.autoRotate, false);
      const denied = (hooks.get("preMoveToken") ?? []).some(fn => fn(t, { destination: pose }, options) === false);
      assert.equal(denied, false, "authority move bypasses only the local routing hook");
      moves.push({ id, pose, options });
      if (this.failNext) { this.failNext = false; this.x += 15; return false; }
      Object.assign(this, pose); return true;
    } };
    scene.tokens.contents.push(t); return t;
  }
  const a = token(actors[0], "token-a", 0, 0), b = token(actors[1], "token-b", 4, 0, 300);
  globalThis.canvas = { scene, grid: g, dimensions: { sceneRect: { x:0,y:0,width:2000,height:2000 } } };
  const w = { actors, scene, a, b, moves, writes, notifications, failWrite: false, get stored() { return structuredClone(stored); }, token };
  globalThis.ui = { notifications: { error: text => notifications.push(text), warn: text => notifications.push(text) } };
  globalThis.game = { user: gm, users, actors: { contents: actors, get: id => actors.find(a => a.id === id) ?? { name:id, testUserPermission: user => user.id === id, skills: { survival: { rank: 2 } } } }, combats: { contents: [], get: id => combatDocs.get(id) }, settings: { register() {}, get: () => structuredClone(stored), async set(_m,_k,value) { if (w.failWrite) { w.failWrite = false; throw Error("Persistence failure"); } stored = structuredClone(value); writes.push(structuredClone(value)); } }, arkflight: {} };
  globalThis.foundry = { utils: { randomID: () => `id-${++serial}` } };
  globalThis.Roll = class { constructor(f) { this.f = f; } async evaluate() { this.total = this.f === "1d20" ? 12 : 4; return this; } };
  globalThis.Combat = { async create(data) {
    const combat = { id: `combat-${++serial}`, ...data, round: 0, turn: null, async updateEmbeddedDocuments(_type, rows) { for (const patch of rows) Object.assign(this.combatants.find(row => row.id === patch._id), patch); }, async update(patch, options) { assert.equal(options.arkflightCardSync, true); Object.assign(this, patch); }, async delete() { combatDocs.delete(this.id); }, get turns() { return [...this.combatants].sort((a,b) => (b.initiative ?? 0) - (a.initiative ?? 0)); } };
    combat.combatants = data.combatants.map((source,i) => ({ ...source, id: `c-${i}`, parent: combat, actor: actors.find(a => a.id === source.actorId) }));
    combatDocs.set(combat.id, combat); game.combats.contents.push(combat); game.combat = combat; return combat;
  } };
  for (const fn of hooks.get("init") ?? []) fn(); for (const fn of hooks.get("ready") ?? []) fn();
  w.api = game.arkflight.cardCombat;
  return w;
}
async function start(w) {
  const { generateShipCardDecks } = await import("../src/cards/card-library.js"), { PLAYTEST_COMBAT_CARDS } = await import("../src/content/combat-cards-playtest.js");
  for (const actor of w.actors) actor.flags["arkflight-game"].ship = generateShipCardDecks(actor.flags["arkflight-game"].ship, PLAYTEST_COMBAT_CARDS, { stationIds: Object.keys(CARD_SKILLS), isEligible:()=>true, rng:()=>.7 });
  await w.api.request({ type: "start", sceneId: "scene", entries: [{id:"a",team:"A",tokenId:"token-a"},{id:"b",team:"B",tokenId:"token-b"}] });
}
async function execution(w) {
  await start(w);
  for (const shipId of ["a","b"]) { const s=w.api.state(), q=getOrderQueue(s.ships[shipId]); await w.api.request({type:"lock",sessionId:s.id,revision:s.revision,shipId,request:{round:q.round,revision:q.revision,orders:[]}}); }
}
function cmd(w, type, extra = {}) { const s=w.api.state(); return {type,sessionId:s.id,revision:s.revision,shipId:"a",...extra}; }

test("both hex orientations and offset parities produce six native directions and legal bearing bases", () => {
  for (const type of [2,3,4,5]) { const g=grid(type), geometry=bridge.gridGeometry(g); assert.equal(new Set(geometry.headings.map(v=>Math.round(v))).size,6); for (let i=0;i<6;i++) {const [q,r]=geometry.directions[i],p=g.getCenterPoint({q,r}),o=g.getCenterPoint({q:0,r:0});assert.ok(Math.abs((Math.atan2(p.x-o.x,o.y-p.y)*180/Math.PI+360)%360-geometry.headings[i])<1e-6);} }
});
test("binding requires explicit linked scene tokens and rejects ambiguous or overlapping ships", () => {
  const w=world(), entries=w.actors.map(a=>({id:a.id,name:a.name}));
  w.token(w.actors[0],"a-copy",2,1);
  assert.throws(()=>bridge.resolveCanvasBindings(entries,{sceneId:"scene",entries:[{id:"a"},{id:"b"}]}),/Choose one linked/);
  const binding=bridge.resolveCanvasBindings(entries,{sceneId:"scene",entries:[{id:"a",tokenId:"token-a"},{id:"b",tokenId:"token-b"}]});assert.equal(binding.tokens.a.q,0);
  w.b.x=w.a.x;w.b.y=w.a.y;
  assert.throws(()=>bridge.resolveCanvasBindings(entries,{sceneId:"scene",entries:[{id:"a",tokenId:"token-a"},{id:"b",tokenId:"token-b"}]}),/different hex/);
  canvas.grid.isHexagonal=false;assert.throws(()=>bridge.canvasGrid("scene"),/hex-grid/);
});
test("canvas launch mirrors real token positions, snaps facings and creates a marked native combat", async () => {
  const w=world(2);await start(w);const s=w.api.state();
  assert.equal(s.canvas.sceneId,"scene");assert.equal(s.ships.a.cardPlay.motion.q,0);assert.equal(s.ships.b.cardPlay.motion.q,4);
  assert.ok(s.canvas.headings.includes(w.a.rotation));assert.equal(game.combat.flags["arkflight-game"].cardCombatSession,s.id);assert.equal(game.combat.combatants.length,2);assert.equal(game.combat.turn,null);
  bridge.assertCanvasPositions(s);
  const {syncCombatantLoadout}=await import("../src/foundry/combat-loadout-sync.js");assert.equal(await syncCombatantLoadout(game.combat.combatants[0]),false);
});
test("multi-hex forward drag spends movement once and the native combat follows the active ship", async () => {
  const w=world();await execution(w);const s=w.api.state(),m=s.ships.a.cardPlay.motion,[q,r]=s.canvas.directions[m.heading];
  await w.api.request(cmd(w,"canvas-move",{destination:{q:m.q+2*q,r:m.r+2*r}}));
  assert.equal(w.api.state().ships.a.cardPlay.motion.used,2);assert.equal(bridge.tokenCell(w.a,canvas.grid).q,m.q+2*q);assert.equal(getOrderQueue(w.api.state().ships.a).ap.remaining,4);assert.equal(game.combat.turns[game.combat.turn].actorId,"a");
  assert.throws(()=>movePlaytestShipTo(w.api.state(),"a",{q:0,r:1}),/course|allowance/);
});
test("normal native token drag is routed through the authenticated command queue", async () => {
  const w=world();await execution(w);const s=w.api.state(),m=s.ships.a.cardPlay.motion,[q,r]=s.canvas.directions[m.heading];const point=canvas.grid.getCenterPoint({q:m.q+q,r:m.r+r});
  const result=(hooks.get("preMoveToken")??[]).map(fn=>fn(w.a,{destination:{x:point.x-60,y:point.y-60}}));assert.ok(result.includes(false));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(w.api.state().ships.a.cardPlay.motion.used,1);assert.equal(w.notifications.length,0);
});
test("walls, occupied cells and player permissions prevent movement without spending budgets", async () => {
  const w=world();await execution(w);const original=w.api.state();w.a.blocked=true;
  await assert.rejects(w.api.request(cmd(w,"helm",{direction:"forward"})),/wall/);assert.deepEqual(w.api.state(),original);w.a.blocked=false;
  const m=original.ships.a.cardPlay.motion,[q,r]=original.canvas.directions[m.heading];w.token(w.actors[1],"obstacle",m.q+q,m.r+r);
  await assert.rejects(w.api.request(cmd(w,"helm",{direction:"forward"})),/occupied/);assert.deepEqual(w.api.state(),original);
  game.user={id:"gm",active:true,isGM:false};await assert.rejects(w.api.request(cmd(w,"helm",{direction:"forward"})),/Navigator/);assert.deepEqual(w.api.state(),original);
});
test("a prevented native move and a persistence failure restore token position without charging movement", async () => {
  const w=world();await execution(w);const original=w.api.state(),x=w.a.x,y=w.a.y;
  w.a.failNext=true;await assert.rejects(w.api.request(cmd(w,"helm",{direction:"forward"})),/prevented/);assert.equal(w.a.x,x);assert.equal(w.a.y,y);assert.deepEqual(w.api.state(),original);
  w.failWrite=true;await assert.rejects(w.api.request(cmd(w,"helm",{direction:"forward"})),/Persistence/);assert.equal(w.a.x,x);assert.equal(w.a.y,y);assert.deepEqual(w.api.state(),original);
});
test("token facing uses the separate turn allowance and native tracker controls cannot bypass plans", async () => {
  const w=world();await execution(w);await w.api.request(cmd(w,"helm",{direction:"left"}));const s=w.api.state();assert.equal(s.ships.a.cardPlay.motion.turns,1);assert.equal(w.a.rotation,s.canvas.headings[s.ships.a.cardPlay.motion.heading]);
  await assert.rejects(w.api.request(cmd(w,"helm",{direction:"right"})),/another hex/);
  assert.ok((hooks.get("preUpdateCombat")??[]).some(fn=>fn(game.combat,{turn:1},{})===false));
  assert.ok((hooks.get("preUpdateToken")??[]).some(fn=>fn(w.a,{width:2},{})===false));
});
test("weapon coverage cells exactly match battery range/arc checks on either hex orientation", async () => {
  for(const type of [2,4]) {const w=world(type);await execution(w);const state=w.api.state();state.ships.a.cardPlay.weapons=[{key:"gun",mount:"fore",minRange:2,maxRange:4,readyRound:1}];
    const coverage=new Set(weaponCoverage(state,"a","gun").map(c=>`${c.q},${c.r}`));const origin=state.ships.a.cardPlay.motion;
    for(let q=-5;q<=5;q++)for(let r=-5;r<=5;r++){const p={q:origin.q+q,r:origin.r+r};state.ships.b.cardPlay.motion={...state.ships.b.cardPlay.motion,...p};assert.equal(coverage.has(`${p.q},${p.r}`),batteryOptions(state,"a","b","fore").length>0);}
    state.ships.a.cardPlay.effects.push({kind:"arc",amount:30,uses:null});assert.ok(weaponCoverage(state,"a","gun").length>=coverage.size);
    state.ships.a.cardPlay.weapons[0].readyRound=3;assert.ok(weaponCoverage(state,"a").every(c=>!c.ready));
  }
});

test("selected-ship deployment creates linked tokens once and leaves existing scene placements alone", async () => {
  const w = world(); w.scene.tokens.contents.length = 0;
  for (const actor of w.actors) actor.getTokenDocument = async overrides => ({
    x: 0, y: 0, getCenterPoint: () => ({ x: 60, y: 60 }),
    toObject: () => ({ actorId: actor.id, name: actor.name, ...overrides })
  });
  let created = 0;
  w.scene.createEmbeddedDocuments = async (type, sources) => {
    assert.equal(type, "Token");
    return sources.map(source => {
      assert.equal(source.actorLink, true); assert.equal(source.width, 1); assert.equal(source.height, 1);
      const cell = canvas.grid.getCube({ x: source.x + 60, y: source.y + 60 });
      return w.token(w.actors.find(actor => actor.id === source.actorId), `placed-${++created}`, cell.q, cell.r, source.rotation);
    });
  };
  await w.api.placeShips(["a", "b"]);
  assert.equal(w.scene.tokens.contents.length, 2);
  const positions = w.scene.tokens.contents.map(token => [token.x, token.y]);
  await w.api.placeShips(["a", "b"]);
  assert.equal(created, 2); assert.deepEqual(w.scene.tokens.contents.map(token => [token.x, token.y]), positions);
  assert.deepEqual(w.writes, []);
  game.user = { id: "gm", isGM: false };
  await assert.rejects(w.api.placeShips(["a"]), /Only the GM/);
});
