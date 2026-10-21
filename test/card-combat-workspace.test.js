import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWorkspace, workspacePanelBox, CardCombatWorkspace } from "../src/ui/card-combat-workspace.js";
import { CombatAudio, combatSoundCues, soundRecipe } from "../src/ui/card-combat-audio.js";

const bounds = { left: 100, right: 1300, top: 80, bottom: 900, width: 1200, height: 820 };
test("compact defaults keep systems closed, preserve readable cards and fold after locking", () => {
  const value = normalizeWorkspace();
  assert.equal(value.shipVisible, false); assert.equal(value.hand.width, 900);
  assert.equal(value.hand.minimized, false); assert.equal(value.autoMinimize, true); assert.equal(value.scale, 100);
});
test("stored panels are sanitized independently of ship and combat data", () => {
  const value = normalizeWorkspace({ scale: 400, autoMinimize: false, hand: { width: -100, height: NaN, position: { x: -20, y: 4 }, pinned: true }, ship: { position: { x: "bad", y: 0 } } });
  assert.equal(value.scale, 140); assert.equal(value.autoMinimize, false);
  assert.equal(value.hand.width, 300); assert.equal(value.hand.height, 330);
  assert.deepEqual(value.hand.position, { x: 0, y: 1 }); assert.equal(value.ship.position, null);
});
test("card hand docks low while on-demand systems open below the command strip", () => {
  const defaults = normalizeWorkspace();
  assert.equal(workspacePanelBox(bounds, defaults.hand, 1, "hand").top, 570);
  assert.equal(workspacePanelBox(bounds, defaults.ship, 1, "ship").top, 80);
});
test("scaling and restored drag positions fit a newly narrowed viewport", () => {
  const pref = normalizeWorkspace({ hand: { position: { x: 1, y: 1 } } }).hand;
  const box = workspacePanelBox({ ...bounds, right: 700, width: 600 }, pref, 1.4, "hand");
  assert.equal(box.left, 100); assert.equal(box.width, 600); assert.ok(box.top + box.height <= 900);
});
test("manual minimize persists while temporary reactions leave the saved choice unchanged", () => {
  const saved = globalThis.game;
  globalThis.game = { settings: { get: () => undefined, set: async () => {} } };
  const layout = new CardCombatWorkspace();
  layout.apply = () => {}; layout.update = () => {}; layout.save = () => {};
  try {
    layout.workspace.autoMinimize = false; layout.setHandMinimized(true, { automatic: true }); assert.equal(layout.workspace.hand.minimized, false);
    layout.setHandMinimized(true); layout.reactionOpen = true; assert.equal(layout.workspace.hand.minimized, true);
    layout.reactionOpen = false; assert.equal(layout.workspace.hand.minimized, true);
  } finally { globalThis.game = saved; }
});
test("pinned panels reject pointer operations and reset restores a recoverable layout", () => {
  const saved = globalThis.game; globalThis.game = { settings: { get: () => undefined } };
  const layout = new CardCombatWorkspace(); layout.apply = () => {}; layout.update = () => {}; layout.save = () => {};
  try {
    layout.workspace.hand.pinned = true; layout.bounds = bounds;
    layout.start({ button: 0 }, "hand", "drag"); assert.equal(layout.operation, undefined);
    layout.workspace.hand.minimized = true; layout.workspace.scale = 140; layout.reset();
    assert.equal(layout.workspace.hand.pinned, false); assert.equal(layout.workspace.hand.minimized, false); assert.equal(layout.workspace.scale, 100);
  } finally { globalThis.game = saved; }
});
test("panel resize and movement preserve a clamped normalized anchor", () => {
  const saved = globalThis.game; globalThis.game = { settings: { get: () => undefined } };
  const layout = new CardCombatWorkspace(); layout.bounds = bounds; layout.update = () => {};
  try {
    layout.adjust("hand", "resize", { left: 200, top: 200, width: 600, height: 300 }, 100, 30);
    assert.equal(layout.workspace.hand.width, 700); assert.equal(layout.workspace.hand.height, 330);
    const position = layout.workspace.hand.position; assert.ok(position.x >= 0 && position.x <= 1 && position.y >= 0 && position.y <= 1);
    layout.adjust("hand", "drag", { left: 200, top: 200, width: 600, height: 300 }, -1000, 2000);
    assert.deepEqual(layout.workspace.hand.position, { x: 0, y: 1 });
  } finally { globalThis.game = saved; }
});

function audioFixture() {
  const calls = [], parameter = () => ({ value: 0, setValueAtTime: (...args) => calls.push(["set", ...args]), linearRampToValueAtTime: (...args) => calls.push(["linear", ...args]), exponentialRampToValueAtTime: (...args) => calls.push(["ramp", ...args]) });
  const node = () => ({ connect() {}, disconnect() { calls.push(["disconnect"]); }, start(at) { calls.push(["start", at]); }, stop() { calls.push(["stop"]); }, frequency: parameter(), gain: parameter() });
  const context = { state: "suspended", currentTime: 2, sampleRate: 8000, destination: {}, resume: async () => { context.state = "running"; }, createOscillator: node, createGain: node, createBufferSource: node, createBiquadFilter: node, createBuffer: (_, length) => ({ getChannelData: () => new Float32Array(length) }) };
  return { context, calls, player: new CombatAudio({ contextFactory: () => context }) };
}
test("audio waits for user unlock and a zero volume remains silent", async () => {
  const { player, calls } = audioFixture();
  assert.equal(player.play("fire"), false); await player.unlock();
  assert.equal(player.play("fire", 0), false); assert.equal(calls.length, 0);
});
test("cannons combine a transient, low rumble and pitched body without blocking", async () => {
  const { player, calls } = audioFixture(); await player.unlock();
  assert.equal(player.play("fire", .15), true); assert.equal(calls.filter(c => c[0] === "start").length, 3);
  assert.equal(player.voices.size, 3); player.stop(); assert.equal(player.voices.size, 0);
});
test("mute/cleanup cancels every active source and repeated cleanup is safe", async () => {
  const { player } = audioFixture(); await player.unlock(); player.play("signature"); player.play("incoming");
  assert.ok(player.voices.size > 0); player.stop(); player.stop(); assert.equal(player.voices.size, 0);
});
test("rapid cosmetic clicks cannot create an unbounded audio queue", async () => {
  const { player } = audioFixture(); await player.unlock();
  for (let i = 0; i < 100; i++) player.play("select");
  assert.ok(player.voices.size <= 24); player.stop();
});
test("every named effect has a short finite envelope and unknown effects are silent", () => {
  for (const kind of ["select", "deselect", "open", "close", "pin", "lock", "fire", "incoming", "reaction", "impact", "ward", "move", "signature", "ready", "success", "failure", "criticalSuccess", "criticalFailure"]) {
    assert.ok(soundRecipe(kind).length);
    for (const part of soundRecipe(kind)) assert.ok(part.duration > 0 && part.duration + part.delay < 1 && part.gain > 0 && part.gain <= .5);
  }
  assert.deepEqual(soundRecipe("unknown"), []);
});
test("one split volley schedules one firing cue and at most one secondary alert", () => {
  assert.deepEqual(combatSoundCues([{ kind: "fire" }, { kind: "incoming" }, { kind: "resource", resource: "hull", delta: -10 }]), ["fire", "incoming"]);
  assert.deepEqual(combatSoundCues([]), []);
});
test("critical outcomes and ward reactions select distinct authored sound effects", () => {
  assert.deepEqual(combatSoundCues([{ kind: "outcome", result: { degree: 2 } }]), ["criticalSuccess"]);
  assert.deepEqual(combatSoundCues([{ kind: "outcome", result: { degree: -1 } }]), ["criticalFailure"]);
  assert.deepEqual(combatSoundCues([{ kind: "outcome", cardId: "emergency-ward", attack: {}, result: { degree: 1 } }]), ["ward"]);
});
test("missing or broken browser audio fails silently without affecting a command", async () => {
  const unavailable = new CombatAudio({ contextFactory: () => null }); await unavailable.unlock(); assert.equal(unavailable.play("lock"), false);
  const broken = new CombatAudio({ contextFactory: () => { throw Error("unavailable"); } }); await broken.unlock(); assert.equal(broken.play("fire"), false);
});
