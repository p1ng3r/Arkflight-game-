import test from "node:test";
import assert from "node:assert/strict";
import { getOrderQueue } from "../src/cards/committed-orders.js";
const callbacks = new Map();
globalThis.Hooks = { on(name, fn) { const rows = callbacks.get(name) ?? []; rows.push(fn); callbacks.set(name, rows); }, off(name, fn) { callbacks.set(name, (callbacks.get(name) ?? []).filter(row => row !== fn)); }, once(name, fn) { this.on(name, fn); }, callAll(name, ...args) { for (const fn of callbacks.get(name) ?? []) fn(...args); } };
await import("../src/foundry/card-combat-playtest-api.js");
const M = "arkflight-game";
function collection() { const contents = []; return { contents, get: id => contents.find(d => d.id === id), [Symbol.iterator]: () => contents[Symbol.iterator]() }; }
function world() {
  let serial = 0; const values = new Map(), users = new Map([["gm", { id: "gm", isGM: true, active: true }]]), counts = { move: 0, scene: 0, actor: 0, writes: 0, notifications: [] };
  const point = c => ({ x: 1300 + c.q * 75, y: 1000 + (c.r + c.q / 2) * Math.sqrt(7500) });
  const grid = { type: 4, size: 100, isHexagonal: true, getCenterPoint: point, getCube(p) { const q = Math.round((p.x - 1300) / 75), r = Math.round((p.y - 1000) / Math.sqrt(7500) - q / 2); return { q, r, s: -q - r }; }, getAdjacentCubes: () => [[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]].map(([q,r]) => ({ q,r,s:-q-r })) };
  globalThis.game = { user: users.get("gm"), users: { get: id => users.get(id), [Symbol.iterator]: () => users.values() }, paused: false, actors: collection(), scenes: collection(), combats: collection(), arkflight: {}, settings: { register(m,k,d) { values.set(k, structuredClone(d.default)); }, get(m,k) { return structuredClone(values.get(k)); }, async set(m,k,value) { counts.writes++; if (counts.failWrite) { counts.failWrite = false; throw Error("storage rejected"); } values.set(k, structuredClone(value)); } } };
  globalThis.ui = { notifications: { warn(message) { counts.notifications.push(message); }, error(message) { counts.notifications.push(message); } } };
  globalThis.foundry = { utils: { randomID: () => `id${++serial}` } };
  function token(source, scene) {
    const doc = { x: 0, y: 0, rotation: 0, flags: {}, ...structuredClone(source), id: source._id ?? `token${++serial}`, parent: scene,
      getCenterPoint(position = {}) { return { x: (position.x ?? this.x) + 50 * (this.width ?? 1), y: (position.y ?? this.y) + 50 * (this.height ?? 1) }; }, toObject() { const { x,y,rotation,actorId,actorLink,flags,width=1,height=1 } = this; return { x,y,rotation,actorId,actorLink,flags,width,height }; },
      async update(change, options = {}) {
        if ("x" in change || "y" in change) {
          counts.move++;
          if ((callbacks.get("preMoveToken") ?? []).some(fn => fn(this, { destination: change }, options) === false)) return this;
        }
        if ((callbacks.get("preUpdateToken") ?? []).some(fn => fn(this, change, options) === false)) return this;
        for (const [key, value] of Object.entries(change)) {
          const parts = key.split("."), leaf = parts.pop(); let target = this;
          for (const part of parts) target = target[part] ??= {};
          target[leaf] = value;
        }
        Hooks.callAll("updateToken", this, change, options, game.user.id);
        return this;
      }, async move(pose, options = {}) {
        counts.move++;
        if ((callbacks.get("preMoveToken") ?? []).some(fn => fn(this, { destination: pose }, options) === false)) return false;
        const changes = { x: pose.x, y: pose.y, rotation: pose.rotation };
        if ((callbacks.get("preUpdateToken") ?? []).some(fn => fn(this, changes, options) === false)) return false;
        Object.assign(this, changes); return true;
      } };
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
  assert.deepEqual(counts.notifications, [], "native Next hooks never submit rejected manual orders");
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
test("native drag and rotation during the guide stay local without queuing rejected commands", async () => {
  const { api, counts } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  const before = api.state(), ship = before.ships[before.turnOrder[0]], token = canvas.scene.tokens.get(ship.cardPlay.tokenId);
  const submitted = [];
  game.arkflight.cardCombat = Object.freeze({ ...api, request(command) { submitted.push(command); return api.request(command); } });
  for (let i = 0; i < 6; i++) {
    assert.ok((callbacks.get("preMoveToken") ?? []).some(fn => fn(token, { destination: { x: token.x + 75, y: token.y } }, {}) === false));
    assert.ok((callbacks.get("preUpdateToken") ?? []).some(fn => fn(token, { rotation: token.rotation + 60 }, {}) === false));
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(submitted, []); assert.deepEqual(counts.notifications, []); assert.deepEqual(api.state(), before);
  await next(api); assert.equal(api.state().guidedDemo.step, before.guidedDemo.step + 1);
});
test("marked native callbacks after a Next move do not become another helm order", async () => {
  const { api, counts } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  await next(api);
  const before = api.state(), token = canvas.scene.tokens.get(before.ships[before.turnOrder[0]].cardPlay.tokenId), submitted = [];
  game.arkflight.cardCombat = Object.freeze({ ...api, request(command) { submitted.push(command); return api.request(command); } });
  const options = { arkflightCardSync: true };
  assert.ok((callbacks.get("preMoveToken") ?? []).every(fn => fn(token, { destination: token.getCenterPoint() }, options) !== false));
  assert.ok((callbacks.get("preUpdateToken") ?? []).every(fn => fn(token, { rotation: token.rotation + 60 }, options) !== false));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(submitted, []); assert.deepEqual(counts.notifications, []); assert.deepEqual(api.state(), before);
});

test("Step 5 restores a drifted demo token before automatically moving it", async () => {
  const { api, counts } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  const before = api.state(), id = before.turnOrder[0], token = canvas.scene.tokens.get(before.ships[id].cardPlay.tokenId);
  assert.equal(before.guidedDemo.step, 4);
  token.x += 17; token.rotation += 60;
  const { assertCanvasPositions } = await import("../src/foundry/card-combat-canvas.js");
  assert.throws(() => assertCanvasPositions(before), /out of sync/);
  const after = await next(api);
  assert.equal(after.guidedDemo.step, 5); assert.equal(after.guidedDemo.last.kind, "movement");
  assertCanvasPositions(after);
  assert.deepEqual(getOrderQueue(after.ships[id]).ap, getOrderQueue(before.ships[id]).ap);
  assert.deepEqual(counts.notifications, []);
});

test("the complete guide recovers repeated fixture drift without adopting it into combat", async () => {
  const { api, counts } = world(); let state = await api.request({ type: "demo-start" }), steps = 0;
  while (state.guidedDemo.status === "running" && steps++ < 180) {
    const ship = Object.values(state.ships)[steps % 4], token = canvas.scene.tokens.get(ship.cardPlay.tokenId);
    token.x += 150; token.y += 87; token.rotation += 120;
    state = await next(api);
  }
  assert.equal(state.guidedDemo.status, "complete"); assert.equal(state.guidedDemo.step, 108);
  assert.ok(state.guidedDemo.checks.every(c => c.passed)); assert.deepEqual(counts.notifications, []);
});

test("fixture synchronization refuses campaign tokens, stale requests and paused advancement", async () => {
  const { api } = world(); await api.request({ type: "demo-start" });
  const before = api.state(), token = canvas.scene.tokens.get(Object.values(before.ships)[0].cardPlay.tokenId);
  token.x += 17; const drifted = token.x;
  await assert.rejects(() => api.request({ type: "demo-next", sessionId: before.id, revision: before.revision - 1 }), /changed/);
  assert.equal(token.x, drifted);
  game.paused = true; await assert.rejects(() => next(api), /Unpause/); assert.equal(token.x, drifted); game.paused = false;
  const second = canvas.scene.tokens.contents[1]; second.flags[M].guidedCombatDemo = false;
  await assert.rejects(() => next(api), /original marked demo tokens/);
  assert.equal(token.x, drifted, "all fixture identities validate before any correction");
  assert.deepEqual(api.state(), before);
  second.flags[M].guidedCombatDemo = true; canvas.scene.flags[M].guidedCombatDemo = false;
  await assert.rejects(() => next(api), /marked demo scene/); assert.equal(token.x, drifted);
});

test("blocked fixture correction keeps the pending step and reports an actionable error", async () => {
  const { api } = world(); await api.request({ type: "demo-start" });
  const before = api.state(), token = canvas.scene.tokens.get(Object.values(before.ships)[0].cardPlay.tokenId);
  token.x += 150; token.update = async () => token;
  await assert.rejects(() => next(api), /prevented guided token synchronization/);
  assert.deepEqual(api.state(), before);
});

test("reset fixes resized fixtures and disables actor-size linking on demo tokens only", async () => {
  const { api } = world(); await api.request({ type: "demo-start" });
  await api.request({ type: "demo-stop", sessionId: api.state().id, revision: api.state().revision });
  const actors = structuredClone(game.actors.contents.map(a => a.flags));
  for (const token of canvas.scene.tokens.contents) {
    token.width = 4; token.height = 2;
    token.flags.pf2e = { linkToActorSize: true, autoscale: true };
  }
  const state = await api.request({ type: "demo-start" });
  for (const token of canvas.scene.tokens.contents) {
    assert.equal(token.width, 1); assert.equal(token.height, 1);
    assert.equal(token.flags.pf2e.linkToActorSize, false); assert.equal(token.flags.pf2e.autoscale, false);
  }
  const { assertCanvasPositions } = await import("../src/foundry/card-combat-canvas.js");
  assertCanvasPositions(state); assert.deepEqual(game.actors.contents.map(a => a.flags), actors);
});

test("a committed native move advances Step 5 without waiting on movement-completion callbacks", async () => {
  const { api, counts } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  const before = api.state(), id = before.turnOrder[0], token = canvas.scene.tokens.get(before.ships[id].cardPlay.tokenId);
  const update = token.update.bind(token);
  // Foundry can commit the document position while its movement lifecycle is
  // still pending. This reproduces saved Step 4 / actual token one hex ahead.
  token.move = async pose => { await update(pose, { arkflightCardSync: true }); return new Promise(() => {}); };
  let timeout;
  try {
    await Promise.race([next(api), new Promise((_, reject) => { timeout = setTimeout(() => reject(Error("Native move reached its destination but Step 5 never committed")), 1000); })]);
  } finally { clearTimeout(timeout); }
  const moved = api.state(), pose = { x: token.x, y: token.y, rotation: token.rotation };
  assert.equal(moved.guidedDemo.step, 5); assert.equal(moved.revision, before.revision + 1);
  assert.equal(moved.ships[id].cardPlay.motion.used, 1);
  const moves = counts.move;
  await next(api);
  assert.equal(api.state().guidedDemo.step, 6);
  assert.deepEqual({ x: token.x, y: token.y, rotation: token.rotation }, pose, "the following support step never resets the committed movement");
  assert.equal(counts.move, moves, "the following step does not issue a corrective token update");
  assert.deepEqual(getOrderQueue(api.state().ships[id]).ap, getOrderQueue(moved.ships[id]).ap);
});

test("Step 5 commits when updateToken confirms the write but the update wrapper remains pending", async () => {
  const { api, counts } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  const before = api.state(), id = before.turnOrder[0], token = canvas.scene.tokens.get(before.ships[id].cardPlay.tokenId), update = token.update.bind(token);
  token.update = async (changes, options) => {
    const result = await update(changes, options);
    if ("x" in changes || "y" in changes) return new Promise(() => {});
    return result;
  };
  let timeout;
  try {
    await Promise.race([next(api), new Promise((_, reject) => { timeout = setTimeout(() => reject(Error("Position committed, update wrapper pending, encounter still at Step 4")), 1000); })]);
  } finally { clearTimeout(timeout); }
  assert.equal(api.state().guidedDemo.step, 5); assert.equal(api.state().revision, 5);
  const pose = { x: token.x, y: token.y, rotation: token.rotation }, moves = counts.move;
  await next(api);
  assert.equal(api.state().guidedDemo.step, 6); assert.equal(counts.move, moves);
  assert.deepEqual({ x: token.x, y: token.y, rotation: token.rotation }, pose);
  assert.equal((callbacks.get("updateToken") ?? []).length, 0, "commit observer is removed even though the wrapper never settles");
});

test("native token anchoring survives all three guided rounds without correction on support steps", async () => {
  const { api, counts } = world(); let state = await api.request({ type: "demo-start" });
  for (const token of canvas.scene.tokens.contents) {
    const update = token.update.bind(token);
    token.update = (changes, options) => update("x" in changes ? {
      ...changes, x: Math.round(changes.x) + 3, y: Math.round(changes.y) + 3
    } : changes, options);
  }
  while (state.guidedDemo.step < 4) state = await next(api);
  state = await next(api);
  assert.equal(state.guidedDemo.step, 5); assert.equal(state.revision, 5);
  const token = canvas.scene.tokens.get(state.ships[state.turnOrder[0]].cardPlay.tokenId);
  const pose = { x: token.x, y: token.y }, moves = counts.move;
  const report = api.diagnostics(); report.progress.destination.q = -999;
  assert.notEqual(api.diagnostics().progress.destination.q, -999, "diagnostics cannot mutate the recorded destination");
  state = await next(api);
  assert.equal(state.guidedDemo.step, 6); assert.equal(counts.move, moves);
  assert.deepEqual({ x: token.x, y: token.y }, pose, "support never recenters a valid token");
  assert.equal(api.diagnostics().progress.destination, null, "a later command never reports a stale destination");
  let steps = 0;
  while (state.guidedDemo.status === "running" && steps++ < 180) state = await next(api);
  assert.equal(state.guidedDemo.step, 108); assert.equal(state.guidedDemo.status, "complete");
  assert.ok(state.guidedDemo.checks.every(check => check.passed)); assert.deepEqual(counts.notifications, []);
});

test("an unrelated update event cannot confirm the pending token operation", async () => {
  const { api } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  const before = api.state(), token = canvas.scene.tokens.get(before.ships[before.turnOrder[0]].cardPlay.tokenId);
  token.update = async (changes, options) => {
    Object.assign(token, changes);
    Hooks.callAll("updateToken", token, changes, { ...options, arkflightCardUpdateId: "different-operation" }, game.user.id);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(api.state().revision, before.revision, "an unrelated hook never commits the encounter");
    throw Error("the actual document update failed");
  };
  // Restore rollback through a real update after the deliberate rejection.
  const failing = token.update;
  token.update = (changes, options) => options.animate === false ? (Object.assign(token, changes), Promise.resolve(token)) : failing(changes, options);
  await assert.rejects(() => next(api), /actual document update failed/);
  assert.deepEqual(api.state(), before); assert.equal((callbacks.get("updateToken") ?? []).length, 0);
});

test("debug reports expose the loaded build, command stage and saved/actual positions read-only", async () => {
  const { api, counts } = world(); await api.request({ type: "demo-start" });
  const before = api.state(), writes = counts.writes, moves = counts.move, report = api.diagnostics();
  assert.equal(report.build, "hex-movement-20261021"); assert.equal(report.progress.stage, "Complete");
  assert.equal(report.ships.length, 4); assert.equal(report.step, 0);
  assert.equal(counts.writes, writes); assert.equal(counts.move, moves); assert.deepEqual(api.state(), before);
  report.ships[0].saved.q = -999; assert.deepEqual(api.state(), before);
});

test("an intermediate waypoint from the right operation does not finish or roll back the step", async () => {
  const { api } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  const before = api.state(), token = canvas.scene.tokens.get(before.ships[before.turnOrder[0]].cardPlay.tokenId), update = token.update.bind(token);
  token.update = async (changes, options) => {
    if (("x" in changes || "y" in changes) && options.animate !== false) {
      await update({ ...changes, x: token.x + (changes.x - token.x) / 4, y: token.y + (changes.y - token.y) / 4 }, options);
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.equal(api.state().revision, before.revision);
    }
    return update(changes, options);
  };
  await next(api);
  assert.equal(api.state().guidedDemo.step, 5);
  assert.equal((callbacks.get("updateToken") ?? []).length, 0);
});

test("a silently unchanged encounter save reports failure and restores the token", async () => {
  const { api } = world(); await api.request({ type: "demo-start" });
  while (api.state().phase === "planning") await next(api);
  const before = api.state(), token = canvas.scene.tokens.get(before.ships[before.turnOrder[0]].cardPlay.tokenId), pose = { x: token.x, y: token.y, rotation: token.rotation };
  game.settings.set = async () => before;
  await assert.rejects(() => next(api), /save was not confirmed: expected revision 5, found 4/);
  assert.deepEqual(api.state(), before);
  assert.deepEqual({ x: token.x, y: token.y, rotation: token.rotation }, pose);
  assert.equal(api.diagnostics().progress.stage, "Failed");
});
