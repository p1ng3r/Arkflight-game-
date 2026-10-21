import test from "node:test";
import assert from "node:assert/strict";
const callbacks = new Map();
globalThis.Hooks = { on(name, fn) { const rows = callbacks.get(name) ?? []; rows.push(fn); callbacks.set(name, rows); }, once(name, fn) { this.on(name, fn); }, callAll(name, ...args) { for (const fn of callbacks.get(name) ?? []) fn(...args); } };
await import("../src/foundry/card-combat-playtest-api.js");
const M = "arkflight-game";
function collection() { const contents = []; return { contents, get: id => contents.find(d => d.id === id), [Symbol.iterator]: () => contents[Symbol.iterator]() }; }
function world() {
  let serial = 0; const values = new Map(), users = new Map([["gm", { id: "gm", isGM: true, active: true }]]), counts = { move: 0, scene: 0, actor: 0, writes: 0 };
  const point = c => ({ x: 1300 + c.q * 75, y: 1000 + (c.r + c.q / 2) * Math.sqrt(7500) });
  const grid = { type: 4, size: 100, isHexagonal: true, getCenterPoint: point, getCube(p) { const q = Math.round((p.x - 1300) / 75), r = Math.round((p.y - 1000) / Math.sqrt(7500) - q / 2); return { q, r, s: -q - r }; }, getAdjacentCubes: () => [[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]].map(([q,r]) => ({ q,r,s:-q-r })) };
  globalThis.game = { user: users.get("gm"), users: { get: id => users.get(id), [Symbol.iterator]: () => users.values() }, paused: false, actors: collection(), scenes: collection(), combats: collection(), arkflight: {}, settings: { register(m,k,d) { values.set(k, structuredClone(d.default)); }, get(m,k) { return structuredClone(values.get(k)); }, async set(m,k,value) { counts.writes++; if (counts.failWrite) { counts.failWrite = false; throw Error("storage rejected"); } values.set(k, structuredClone(value)); } } };
  globalThis.ui = { notifications: { warn() {}, error() {} } };
  globalThis.foundry = { utils: { randomID: () => `id${++serial}` } };
  function token(source, scene) {
    const doc = { x: 0, y: 0, rotation: 0, flags: {}, ...structuredClone(source), id: source._id ?? `token${++serial}`, parent: scene,
      getCenterPoint(position = {}) { return { x: (position.x ?? this.x) + 50, y: (position.y ?? this.y) + 50 }; }, toObject() { const { x,y,rotation,actorId,actorLink,flags,width=1,height=1 } = this; return { x,y,rotation,actorId,actorLink,flags,width,height }; },
      async update(change) { Object.assign(this, change); return this; }, async move(pose) { counts.move++; Object.assign(this, { x: pose.x, y: pose.y, rotation: pose.rotation }); return true; } };
    return doc;
  }
  globalThis.Actor = { async create(source) { counts.actor++; const actor = { ...structuredClone(source), id: `actor${++serial}`, async getTokenDocument(options) { return token({ ...this.prototypeToken, ...options, actorId: this.id }, null); } }; game.actors.contents.push(actor); return actor; } };
  globalThis.Scene = { async create(source) {
    counts.scene++; const scene = { ...structuredClone(source), id: `scene${++serial}`, tokens: collection(), walls: new Map(), async view() { globalThis.canvas = { scene: this, grid, dimensions: { sceneRect: { x: 0,y: 0,width: 2600,height: 2000 } } }; return this; }, async createEmbeddedDocuments(type, rows) { const docs = rows.map(row => token(row, this)); this.tokens.contents.push(...docs); return docs; } };
    game.scenes.contents.push(scene); return scene;
  } };
  globalThis.Combat = { async create(source) { const combatants = source.combatants.map((row,i) => ({ ...row,id:`combatant${i}` })); const combat = { ...source,id:`combat${++serial}`,combatants, get turns() { return [...combatants].sort((a,b)=>(b.initiative??0)-(a.initiative??0)); }, get started() { return this.round > 0; }, async update(changes) { Object.assign(this,changes); }, async updateEmbeddedDocuments(type, rows) { for(const row of rows)Object.assign(combatants.find(c=>c.id===row._id),row); }, async delete() { game.combats.contents.splice(game.combats.contents.indexOf(this),1); } }; game.combats.contents.push(combat); return combat; } };
  for (const fn of callbacks.get("init") ?? []) fn();
  for (const fn of callbacks.get("ready") ?? []) fn();
  return { counts, api: game.arkflight.cardCombat };
}
function next(api) { const s = api.state(); return api.request({ type:"demo-next",sessionId:s.id,revision:s.revision }); }
test("Next drives the native adapter through three rounds and reset reuses only demo fixtures", async () => {
  const { api, counts } = world(); let state = await api.request({ type:"demo-start" });
  const originalActors = structuredClone(game.actors.contents.map(a=>a.flags));
  assert.equal(counts.actor,4); assert.equal(counts.scene,1); assert.equal(game.scenes.contents[0].active,false);
  let steps=0; while(state.guidedDemo.status==="running" && steps++<180) state=await next(api);
  assert.equal(state.guidedDemo.status,"complete"); assert.ok(state.guidedDemo.checks.every(c=>c.passed)); assert.ok(counts.move>8);
  assert.deepEqual(game.actors.contents.map(a=>a.flags),originalActors,"combat leaves permanent Actor data unchanged");
  await api.request({ type:"demo-start" }); assert.equal(counts.actor,4); assert.equal(counts.scene,1); assert.equal(game.scenes.contents[0].tokens.contents.length,4);
  await api.request({ type:"demo-stop",sessionId:api.state().id,revision:api.state().revision });
});
test("stale/double Next, manual orders and paused steps cannot advance the demo", async () => {
  const { api }=world(); const initial=await api.request({type:"demo-start"});
  const command={type:"demo-next",sessionId:initial.id,revision:initial.revision};
  const results=await Promise.allSettled([api.request(command),api.request(command)]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1); assert.equal(api.state().guidedDemo.step,1);
  await assert.rejects(()=>api.request({type:"advance",sessionId:api.state().id,revision:api.state().revision}),/Use Next Step/);
  game.paused=true;const snapshot=api.state();await assert.rejects(()=>next(api),/Unpause/);assert.deepEqual(api.state(),snapshot);
  await api.request({type:"demo-stop",sessionId:snapshot.id,revision:snapshot.revision});assert.equal(api.state().guidedDemo.status,"stopped");
});
test("failed movement persistence rolls native tokens back and keeps the same pending step", async () => {
  const { api,counts }=world();await api.request({type:"demo-start"});
  while(api.state().phase==="planning")await next(api);
  const before=api.state(), token=canvas.scene.tokens.get(before.ships[before.turnOrder[0]].cardPlay.tokenId), pose={x:token.x,y:token.y,rotation:token.rotation};
  counts.failWrite=true;await assert.rejects(()=>next(api),/storage rejected/);
  assert.deepEqual(api.state(),before);assert.deepEqual({x:token.x,y:token.y,rotation:token.rotation},pose);
  await next(api);assert.equal(api.state().guidedDemo.step,before.guidedDemo.step+1);
});
test("starting the demo refuses both card and native campaign encounters before creating documents", async () => {
  const {api,counts}=world();game.combats.contents.push({id:"campaign",active:true,started:true});
  await assert.rejects(()=>api.request({type:"demo-start"}),/active Foundry/);assert.equal(counts.scene,0);assert.equal(counts.actor,0);
});
