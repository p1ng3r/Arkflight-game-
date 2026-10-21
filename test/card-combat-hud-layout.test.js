import test from "node:test";
import assert from "node:assert/strict";
import { setMaxListeners } from "node:events";
import { hudSafeBounds, dashboardPlacement, dashboardPosition, normalizeDashboardLayout, CardCombatHUDLayout } from "../src/ui/card-combat-hud-layout.js";

const rect = (left, top, right, bottom) => ({ left, top, right, bottom, width: right - left, height: bottom - top });
test("floating chat input narrows the hand beyond the main sidebar", () => {
  const result = hudSafeBounds({ width: 1600, height: 1000, rightRects: [rect(1280, 0, 1600, 1000), rect(1160, 800, 1400, 960)] });
  assert.equal(result.right, 1148);
});
test("expanded tool columns reserve their full width", () => {
  const result = hudSafeBounds({ width: 1600, height: 1000, leftRects: [rect(0, 20, 48, 700), rect(48, 70, 110, 500)] });
  assert.equal(result.left, 122);
});
test("navigation and hotbar bound the HUD in browser CSS pixels", () => {
  const result = hudSafeBounds({ width: 1366, height: 768, topRects: [rect(150, 0, 700, 40)], bottomRects: [rect(200, 700, 1000, 768)] });
  assert.equal(result.top, 52); assert.equal(result.bottom, 688);
});
test("full-screen containers, hidden zero rectangles and offscreen chat do not swallow the hand", () => {
  const result = hudSafeBounds({ width: 1366, height: 768, rightRects: [rect(0, 0, 1366, 768), rect(1200, 0, 1200, 0), rect(1500, 0, 1800, 768)] });
  assert.equal(result.right, 1354);
});
test("closing or shrinking chat returns the available width", () => {
  const closed = hudSafeBounds({ width: 1366, height: 768 }), open = hudSafeBounds({ width: 1366, height: 768, rightRects: [rect(980, 0, 1366, 768)] });
  assert.ok(closed.width > open.width); assert.equal(open.right, 968);
});
test("layout bounds stay finite across laptop, desktop, browser zoom and narrow viewports", () => {
  for (const [width, height] of [[2560, 1440], [1600, 1000], [1366, 768], [900, 600], [320, 400], [1, 1]]) {
    const bounds = hudSafeBounds({ width, height });
    assert.ok(bounds.left >= 0 && bounds.right <= width && bounds.width > 0);
    assert.ok(bounds.top >= 0 && bounds.bottom <= height && bounds.height > 0);
  }
});
test("the default dashboard docks directly above the cards", () => {
  const bounds = { left: 100, right: 1100, top: 100, bottom: 600, width: 1000, height: 500 };
  const placed = dashboardPlacement(bounds, { width: 900, height: 120 }, null, 600);
  assert.equal(placed.left, 100); assert.equal(placed.top, 470);
});
test("saved dashboard positions scale and clamp when a sidebar opens", () => {
  const bounds = { left: 100, right: 1000, top: 100, bottom: 600, width: 900, height: 500 };
  const placed = dashboardPlacement(bounds, { width: 400, height: 100 }, { x: 1, y: 1 });
  assert.equal(placed.left, 600); assert.equal(placed.top, 500);
  const narrower = dashboardPlacement({ ...bounds, right: 400, width: 300 }, { width: 400, height: 100 }, { x: 1, y: 1 });
  assert.equal(narrower.left, 100); assert.equal(narrower.width, 300);
});
test("dashboard positions round-trip without storing desktop pixel offsets", () => {
  const bounds = { left: 100, right: 1000, top: 100, bottom: 600, width: 900, height: 500 };
  const box = { left: 350, top: 300, width: 400, height: 100 };
  assert.deepEqual(dashboardPlacement(bounds, box, dashboardPosition(bounds, box)), box);
});
test("corrupt preferences are sanitized without moving the ship or writing combat state", () => {
  assert.deepEqual(normalizeDashboardLayout({ collapsed: "yes", position: { x: "bad", y: null } }), { version: 1, collapsed: false, position: null });
  assert.deepEqual(normalizeDashboardLayout({ collapsed: true, position: { x: -10, y: 2 } }), { version: 1, collapsed: true, position: { x: 0, y: 1 } });
});

// Small DOM doubles test lifecycle and pointer behavior without claiming browser rendering.
class NodeDouble {
  constructor(id = "", own = false) { this.id = id; this.own = own; this.isConnected = true; this.hidden = false; this.open = false; this.listeners = new Map(); this.values = {}; this.dataset = {}; this.tokens = new Set(); this.style = { setProperty: (key, value) => { this.values[key] = value; } }; this.classList = { toggle: (key, on) => on ? this.tokens.add(key) : this.tokens.delete(key), add: key => this.tokens.add(key), remove: key => this.tokens.delete(key) }; }
  matches(selector) { return selector.split(",").some(s => s.trim() === "#" + this.id); }
  closest(selector) { return this.own && selector.includes(".arkflight-card-canvas") || this.matches(selector) ? this : null; }
  addEventListener(name, callback, options = {}) {
    const values = this.listeners.get(name) ?? new Set(); values.add(callback); this.listeners.set(name, values);
    if (options.signal) setMaxListeners(0, options.signal);
    options.signal?.addEventListener("abort", () => values.delete(callback), { once: true });
  }
  emit(name, values = {}) {
    const event = { button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {}, ...values };
    for (const callback of this.listeners.get(name) ?? []) callback(event);
  }
  setAttribute(key, value) { this.values[key] = value; }
  setPointerCapture() {}
  getBoundingClientRect() { return this.box; }
}
function fixture() {
  const original = new Map(), frames = new Map(), writes = [], observers = [];
  let preference = null, frameId = 0;
  const win = new NodeDouble(); win.innerWidth = 1366; win.innerHeight = 768;
  const toolbar = new NodeDouble("controls"); toolbar.box = rect(0, 30, 100, 600);
  const sidebar = new NodeDouble("sidebar"); sidebar.box = rect(1100, 0, 1366, 768);
  const chat = new NodeDouble("chat-message"); chat.box = rect(980, 620, 1200, 740);
  const hotbar = new NodeDouble("hotbar"); hotbar.box = rect(200, 710, 900, 768);
  const anchors = [toolbar, sidebar, chat, hotbar];
  const root = new NodeDouble("root", true), panel = new NodeDouble("panel", true), body = new NodeDouble("body", true), tools = new NodeDouble("tools", true), handle = new NodeDouble("handle", true), collapse = new NodeDouble("collapse", true), reset = new NodeDouble("reset", true), hand = new NodeDouble("hand", true), ribbon = new NodeDouble("ribbon", true), orders = new NodeDouble("orders", true);
  const elements = new Map([[".cc-ship-dashboard", panel], [".cc-vessel-body", body], [".cc-dashboard-tools", tools], ["[data-dashboard-drag]", handle], ["[data-dashboard-collapse]", collapse], ["[data-dashboard-reset]", reset], [".cc-hand-dock", hand], [".cc-round-ribbon", ribbon], [".cc-orders-panel", orders]]);
  root.querySelector = selector => elements.get(selector) ?? null;
  root.querySelectorAll = selector => selector === "[data-dashboard-expanded]" ? [body, tools] : [];
  panel.getBoundingClientRect = () => {
    const width = parseFloat(panel.style.width) || 1040, max = parseFloat(panel.style.maxHeight) || 700, height = Math.min(max, panel.tokens.has("is-collapsed") ? 64 : 128), left = parseFloat(panel.style.left) || 112, top = parseFloat(panel.style.top) || 150;
    return rect(left, top, left + width, top + height);
  };
  hand.getBoundingClientRect = () => rect(parseFloat(root.values["--cc-safe-left"]) || 0, win.innerHeight - (parseFloat(root.values["--cc-safe-bottom"]) || 83) - 320, win.innerWidth - (parseFloat(root.values["--cc-safe-right"]) || 0), win.innerHeight - (parseFloat(root.values["--cc-safe-bottom"]) || 83));
  ribbon.getBoundingClientRect = () => rect(112, 12, 968, 80);
  orders.getBoundingClientRect = () => rect(112, 88, 968, 168);
  const doc = { body: new NodeDouble("document-body"), documentElement: new NodeDouble("html"), querySelectorAll: () => anchors };
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; this.nodes = new Set(); observers.push(this); }
    observe(node) { this.nodes.add(node); }
    unobserve(node) { this.nodes.delete(node); }
    disconnect() { this.disconnected = true; this.nodes.clear(); }
  }
  const globals = { window: win, document: doc, game: { settings: { get: () => preference, async set(module, key, value) { writes.push({ module, key, value }); preference = structuredClone(value); } } }, ResizeObserver: Observer, MutationObserver: Observer, requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; }, cancelAnimationFrame: id => frames.delete(id), getComputedStyle: () => ({ display: "block", visibility: "visible" }) };
  for (const [key, value] of Object.entries(globals)) { original.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); }
  return { win, root, panel, handle, collapse, reset, tools, chat, sidebar, writes, observers, frames, flush() { const list = [...frames.values()]; frames.clear(); list.forEach(callback => callback()); }, restore() { for (const [key, descriptor] of original) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } } };
}
test("dashboard collapse, pointer dragging and client-only persistence survive a HUD rebind", async () => {
  const f = fixture(), layout = new CardCombatHUDLayout();
  try {
    layout.bind(f.root); f.collapse.emit("click"); assert.equal(layout.preference.collapsed, true);
    assert.equal(f.panel.style.width, "400px");
    f.handle.emit("pointerdown", { clientX: 120, clientY: 300 });
    f.handle.emit("pointermove", { clientX: 450, clientY: 150 });
    f.handle.emit("pointerup");
    await layout.saving;
    assert.ok(layout.preference.position.x > 0);
    assert.ok(f.writes.every(row => row.module === "arkflight-game" && row.key === "cardCombatHUDLayout"));
    const saved = structuredClone(layout.preference);
    layout.bind(f.root);
    assert.deepEqual(layout.preference, saved);
    assert.equal(f.panel.tokens.has("is-collapsed"), true);
    const resumed = new CardCombatHUDLayout(); assert.deepEqual(resumed.preference, saved); resumed.destroy();
  } finally { layout.destroy(); await layout.saving; f.restore(); }
});
test("resize/chat changes reflow the HUD without rerendering its hand or modifying drafts", () => {
  const f = fixture(), layout = new CardCombatHUDLayout();
  try {
    layout.bind(f.root); assert.equal(f.root.values["--cc-safe-right"], "398px");
    f.chat.box = rect(850, 620, 1200, 740); f.win.emit("resize"); f.flush();
    assert.equal(f.root.values["--cc-safe-right"], "528px");
    assert.equal(f.writes.length, 0);
    assert.equal(layout.relevantMutation({ target: f.panel }), false);
    assert.equal(layout.relevantMutation({ target: f.chat }), true);
  } finally { layout.destroy(); f.restore(); }
});
test("keyboard movement, reset and close release listeners, observers and queued frames", async () => {
  const f = fixture(), layout = new CardCombatHUDLayout();
  try {
    layout.bind(f.root); f.collapse.emit("click");
    f.handle.emit("keydown", { key: "ArrowRight" }); assert.ok(layout.preference.position.x > 0);
    f.handle.emit("keydown", { key: "Home" }); assert.equal(layout.preference.position, null); assert.equal(layout.preference.collapsed, false);
    layout.schedule(); assert.equal(f.frames.size, 1);
    layout.destroy(); await layout.saving;
    assert.equal(f.frames.size, 0); assert.ok(f.observers.every(observer => observer.disconnected));
    assert.equal([...f.handle.listeners.values()].reduce((n, set) => n + set.size, 0), 0);
  } finally { layout.destroy(); await layout.saving; f.restore(); }
});
