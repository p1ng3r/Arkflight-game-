import { hudSafeBounds, dashboardPlacement, dashboardPosition } from "./card-combat-hud-layout.js";

const MODULE = "arkflight-game", SETTING = "cardCombatWorkspace";
const ANCHORS = {
  left: "#controls, #scene-controls, #ui-left",
  right: "#sidebar, #sidebar-content, #sidebar-tabs, #ui-right, #chat, #chat-notifications, #chat-controls, #chat-message, #chat-form, #chat-input, .chat-sidebar, .chat-popout",
  top: "#navigation, #scene-navigation", bottom: "#hotbar, #action-bar"
};
const ALL = Object.values(ANCHORS).join(", "), OWN = ".arkflight-card-canvas, .cc-motion-layer";
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
const number = (value, fallback, min, max) => Number.isFinite(value) ? clamp(value, min, max) : fallback;
const position = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) } : null;
export function normalizeWorkspace(value = {}) {
  const panel = (p, width, height) => ({ position: position(p?.position), pinned: p?.pinned === true, width: number(p?.width, width, 300, 1300), height: number(p?.height, height, 220, 650) });
  return { version: 1, scale: number(value?.scale, 100, 85, 140), autoMinimize: value?.autoMinimize !== false, shipVisible: value?.shipVisible === true, hand: { ...panel(value?.hand, 900, 330), minimized: value?.hand?.minimized === true }, ship: panel(value?.ship, 650, 220) };
}
export function workspacePanelBox(bounds, preference, scale, kind) {
  const width = Math.min(bounds.width, preference.width * scale), height = Math.min(bounds.height, preference.height * scale);
  const saved = preference.position ?? (kind === "hand" ? { x: 0, y: 1 } : { x: 0, y: 0 });
  return dashboardPlacement(bounds, { width, height }, saved);
}
function visible(node) {
  if (!node?.isConnected || node.closest?.(OWN) || node.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) === false) return null;
  const style = getComputedStyle(node), box = node.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 ? box : null;
}
export class CardCombatWorkspace {
  constructor({ feedback = () => {} } = {}) {
    try { this.workspace = normalizeWorkspace(game.settings.get(MODULE, SETTING)); } catch { this.workspace = normalizeWorkspace(); }
    this.feedback = feedback; this.saving = Promise.resolve(); this.observed = new Set(); this.ordersOpen = false; this.optionsOpen = false;
  }
  cue(kind, element) { try { this.feedback(kind, element); } catch (error) { console.warn("Arkflight | Panel feedback skipped", error); } }
  on(selector, name, fn) {
    for (const node of this.root.querySelectorAll(selector)) node.addEventListener(name, fn, { signal: this.abort.signal });
  }
  bind(root, context = {}) {
    this.unbind(); this.root = root; this.abort = new AbortController();
    const reactionKey = context.response?.canRespond && context.state?.pendingAttack?.targetId === context.selectedShipId ? `${context.state.id}:${context.state.revision}:${context.selectedShipId}` : null;
    if (reactionKey !== this.reactionKey) { this.reactionKey = reactionKey; this.reactionOpen = Boolean(reactionKey); }
    this.hand = root.querySelector(".cc-hand-dock"); this.ship = root.querySelector(".cc-ship-dashboard");
    this.on("[data-hand-toggle]", "click", () => this.setHandMinimized(!this.workspace.hand.minimized));
    this.on("[data-hand-restore]", "click", () => this.setHandMinimized(false));
    this.on("[data-hand-minimize]", "click", () => this.setHandMinimized(true));
    this.on("[data-dashboard-collapse]", "click", () => this.setShipVisible(false));
    this.on("[data-ship-toggle]", "click", () => this.setShipVisible(!this.workspace.shipVisible));
    this.on("[data-orders-toggle]", "click", () => { this.ordersOpen = !this.ordersOpen; this.apply(); this.update(); this.cue(this.ordersOpen ? "open" : "close", root.querySelector(".cc-orders-panel")); });
    this.on("[data-workspace-reset]", "click", () => this.reset());
    this.on("[data-panel-pin]", "click", event => {
      const key = event.currentTarget.dataset.panelPin, pref = this.workspace[key];
      pref.pinned = !pref.pinned; this.apply(); this.save(); this.cue("pin", this[key]);
    });
    this.on("[data-hud-scale]", "input", event => { this.workspace.scale = Number(event.target.value); this.update(); });
    this.on("[data-hud-scale]", "change", () => this.save());
    this.on("[data-auto-minimize]", "change", event => { this.workspace.autoMinimize = event.target.checked; this.save(); });
    for (const kind of ["hand", "ship"]) for (const mode of ["drag", "resize"]) {
      const selector = `[data-panel-${mode}="${kind}"]`;
      this.on(selector, "pointerdown", event => this.start(event, kind, mode));
      this.on(selector, "pointermove", event => this.move(event));
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) this.on(selector, name, event => this.finish(event));
      this.on(selector, "keydown", event => this.keyMove(event, kind, mode));
    }
    const options = root.querySelector(".cc-hud-options");
    if (options) { options.open = this.optionsOpen; options.addEventListener("toggle", () => { this.optionsOpen = options.open; }, { signal: this.abort.signal }); }
    const scale = root.querySelector("[data-hud-scale]"); if (scale) scale.value = this.workspace.scale;
    const auto = root.querySelector("[data-auto-minimize]"); if (auto) auto.checked = this.workspace.autoMinimize;
    window.addEventListener("resize", () => this.schedule(), { signal: this.abort.signal });
    globalThis.visualViewport?.addEventListener("resize", () => this.schedule(), { signal: this.abort.signal });
    this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => this.schedule()) : null;
    this.mutationObserver = typeof MutationObserver === "function" ? new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.(OWN) && (record.target === document.body || record.target.closest?.(ALL) || [...record.addedNodes, ...record.removedNodes].some(node => node.matches?.(ALL) || node.querySelector?.(ALL))))) this.schedule();
    }) : null;
    this.mutationObserver?.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    this.apply(); this.update();
  }
  apply() {
    if (!this.root) return;
    const scaleControl = this.root.querySelector("[data-hud-scale]"); if (scaleControl) scaleControl.value = this.workspace.scale;
    const autoControl = this.root.querySelector("[data-auto-minimize]"); if (autoControl) autoControl.checked = this.workspace.autoMinimize;
    const minimized = this.workspace.hand.minimized && !this.reactionOpen;
    if (this.hand) { this.hand.hidden = minimized; this.hand.classList.remove("is-collapsed"); }
    const tab = this.root.querySelector(".cc-hand-tab"); if (tab) tab.hidden = !minimized;
    if (this.ship) this.ship.hidden = !this.workspace.shipVisible;
    const orders = this.root.querySelector(".cc-orders-panel"); if (orders) orders.hidden = !this.ordersOpen;
    for (const key of ["hand", "ship"]) {
      this[key]?.classList.toggle("is-pinned", this.workspace[key].pinned);
      for (const node of this.root.querySelectorAll(`[data-panel-pin="${key}"]`)) { node.setAttribute("aria-pressed", String(this.workspace[key].pinned)); node.textContent = this.workspace[key].pinned ? "Unpin" : "Pin"; }
      for (const node of this.root.querySelectorAll(`[data-panel-drag="${key}"],[data-panel-resize="${key}"]`)) node.disabled = this.workspace[key].pinned;
    }
    for (const node of this.root.querySelectorAll("[data-ship-toggle]")) node.setAttribute("aria-expanded", String(this.workspace.shipVisible));
    for (const node of this.root.querySelectorAll("[data-orders-toggle]")) node.setAttribute("aria-expanded", String(this.ordersOpen));
    for (const node of this.root.querySelectorAll("[data-hand-toggle]")) node.setAttribute("aria-expanded", String(!minimized));
    this.root.dataset.ccHandMinimized = String(minimized);
  }
  setHandMinimized(minimized, { automatic = false } = {}) {
    if (automatic && !this.workspace.autoMinimize) return;
    this.cue(minimized ? "close" : "open", this.hand);
    if (minimized) this.reactionOpen = false;
    this.workspace.hand.minimized = minimized; this.apply(); this.update(); this.save();
  }
  setShipVisible(visible) {
    this.cue(visible ? "open" : "close", this.ship);
    this.workspace.shipVisible = visible; this.apply(); this.update(); this.save();
  }
  reset() { this.workspace = normalizeWorkspace(); this.apply(); this.update(); this.save(); this.cue("open", this.hand); }
  update() {
    if (!this.root?.isConnected) return;
    const root = this.root, width = window.innerWidth, height = window.innerHeight, scale = this.workspace.scale / 100;
    const nodes = [...document.querySelectorAll(ALL)].filter(node => !node.closest?.(OWN));
    const rectangles = key => nodes.filter(node => node.matches(ANCHORS[key])).map(visible).filter(Boolean);
    const safe = hudSafeBounds({ width, height, leftRects: rectangles("left"), rightRects: rectangles("right"), topRects: rectangles("top"), bottomRects: rectangles("bottom") });
    const px = (key, value) => root.style.setProperty(key, `${Math.round(value)}px`);
    root.style.setProperty("--cc-ui-scale", String(scale));
    px("--cc-safe-left", safe.left); px("--cc-safe-right", width - safe.right); px("--cc-safe-top", safe.top); px("--cc-safe-bottom", height - safe.bottom); px("--cc-available-width", safe.width);
    const ribbon = root.querySelector(".cc-round-ribbon")?.getBoundingClientRect();
    const top = Math.min((ribbon?.bottom ?? safe.top + 44) + 10, safe.bottom - 1);
    this.bounds = { ...safe, top, height: safe.bottom - top };
    const box = workspacePanelBox(this.bounds, this.workspace.hand, scale, "hand");
    this.place(this.hand, box); this.place(this.ship, workspacePanelBox(this.bounds, this.workspace.ship, scale, "ship"));
    const tab = root.querySelector(".cc-hand-tab");
    if (tab) { tab.style.left = `${Math.round(box.left)}px`; tab.style.top = `${Math.round(box.top + box.height - 42 * scale)}px`; tab.style.maxWidth = `${safe.width}px`; }
    const floor = this.hand && !this.hand.hidden ? box.top - 8 : safe.bottom;
    px("--cc-detail-top", top); px("--cc-detail-height", Math.max(120, Math.min(520 * scale, floor - top)));
    px("--cc-response-top", top); px("--cc-response-height", Math.max(120, Math.min(300 * scale, floor - top)));
    px("--cc-orders-top", top);
    const label = root.querySelector("[data-scale-label]"); if (label) label.textContent = `${this.workspace.scale}%`;
    root.dataset.ccLayoutReady = "true";
    const observed = new Set([...nodes, root.querySelector(".cc-round-ribbon")].filter(Boolean));
    for (const node of this.observed) if (!observed.has(node)) this.resizeObserver?.unobserve(node);
    for (const node of observed) if (!this.observed.has(node)) this.resizeObserver?.observe(node);
    this.observed = observed;
  }
  place(node, box) { if (node) for (const key of ["left", "top", "width", "height"]) node.style[key] = `${Math.round(box[key])}px`; }
  schedule() { if (!this.frame && this.root) this.frame = requestAnimationFrame(() => { this.frame = null; this.update(); }); }
  start(event, kind, mode) {
    if (event.button !== 0 || this.workspace[kind].pinned || !this.bounds) return;
    event.preventDefault(); event.stopPropagation();
    const box = this[kind].getBoundingClientRect();
    this.operation = { kind, mode, axis: event.currentTarget.dataset.resizeAxis, id: event.pointerId, x: event.clientX, y: event.clientY, box };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  move(event) {
    const operation = this.operation;
    if (!operation || operation.id !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    this.adjust(operation.kind, operation.mode, operation.box, operation.axis === "y" ? 0 : event.clientX - operation.x, operation.axis === "x" ? 0 : event.clientY - operation.y);
  }
  adjust(kind, mode, box, dx, dy) {
    const pref = this.workspace[kind], scale = this.workspace.scale / 100;
    if (mode === "resize") {
      pref.width = clamp((box.width + dx) / scale, 300, 1300); pref.height = clamp((box.height + dy) / scale, 220, 650);
      pref.position = dashboardPosition(this.bounds, { left: box.left, top: box.top, width: Math.min(pref.width * scale, this.bounds.width), height: Math.min(pref.height * scale, this.bounds.height) });
    } else pref.position = dashboardPosition(this.bounds, { left: box.left + dx, top: box.top + dy, width: box.width, height: box.height });
    this.update();
  }
  finish(event) { if (this.operation && this.operation.id === event.pointerId) { this.operation = null; this.save(); } }
  keyMove(event, kind, mode) {
    if (this.workspace[kind].pinned) return;
    if (event.key === "Home") { event.preventDefault(); this.workspace[kind].position = null; this.update(); this.save(); return; }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? 40 : 10;
    this.adjust(kind, mode, this[kind].getBoundingClientRect(), direction[0] * step, direction[1] * step); this.save();
  }
  save() { const value = structuredClone(this.workspace); this.saving = this.saving.catch(() => {}).then(() => game.settings.set(MODULE, SETTING, value)).catch(error => console.warn("Arkflight | Could not save combat workspace", error)); }
  unbind() {
    if (this.operation) { this.operation = null; this.save(); }
    this.abort?.abort(); this.resizeObserver?.disconnect(); this.mutationObserver?.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame); this.frame = null; this.observed.clear();
  }
  destroy() { this.unbind(); this.root = this.hand = this.ship = null; }
}
globalThis.Hooks?.once("init", () => game.settings.register(MODULE, SETTING, { name: "Compact combat workspace", scope: "client", config: false, type: Object, default: normalizeWorkspace() }));
