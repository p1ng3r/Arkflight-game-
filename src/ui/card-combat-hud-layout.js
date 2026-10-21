const MODULE = "arkflight-game";
const SETTING = "cardCombatHUDLayout";
const GAP = 12;
const LEFT = "#controls, #scene-controls, #ui-left, [data-region='scene-controls']";
const RIGHT = "#sidebar, #sidebar-content, #sidebar-tabs, #ui-right, #chat, #chat-notifications, #chat-controls, #chat-form, #chat-message, #chat-input, .chat-sidebar, .chat-popout";
const TOP = "#navigation, #scene-navigation";
const BOTTOM = "#hotbar, #action-bar";
const ANCHORS = [LEFT, RIGHT, TOP, BOTTOM].join(", ");
const OWN_UI = ".arkflight-card-canvas, .cc-motion-layer";
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const rectOK = r => r && [r.left, r.right, r.top, r.bottom].every(Number.isFinite) && r.right > r.left && r.bottom > r.top;
export function normalizeDashboardLayout(value) {
  const p = value?.position;
  return { version: 1, collapsed: value?.collapsed === true, position: p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) } : null };
}
// Coordinates are browser CSS pixels, never screen/desktop pixels.
export function hudSafeBounds({ width, height, leftRects = [], rightRects = [], topRects = [], bottomRects = [], gap = GAP }) {
  width = Math.max(1, finite(width, 1)); height = Math.max(1, finite(height, 1));
  gap = clamp(finite(gap, GAP), 0, Math.min(width, height) / 4);
  let left = gap, right = width - gap, top = gap, bottom = height - gap;
  for (const r of leftRects.filter(rectOK)) if (r.left < width * 0.45 && r.right < width * 0.45 && r.bottom > 0 && r.top < height) left = Math.max(left, r.right + gap);
  for (const r of rightRects.filter(rectOK)) if (r.left >= width * 0.45 && r.left < width && r.bottom > 0 && r.top < height) right = Math.min(right, r.left - gap);
  for (const r of topRects.filter(rectOK)) if (r.top < height * 0.25 && r.bottom < height * 0.4 && r.right > left && r.left < right) top = Math.max(top, r.bottom + gap);
  for (const r of bottomRects.filter(rectOK)) if (r.top > height * 0.6 && r.right > left && r.left < right) bottom = Math.min(bottom, r.top - gap);
  left = clamp(left, 0, width - 1); right = clamp(right, left + 1, width);
  top = clamp(top, 0, height - 1); bottom = clamp(bottom, top + 1, height);
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}
export function dashboardPlacement(bounds, size, position = null, handTop = bounds.bottom) {
  const width = Math.min(bounds.width, Math.max(1, finite(size.width, 1)));
  const height = Math.min(bounds.height, Math.max(1, finite(size.height, 1)));
  const saved = normalizeDashboardLayout({ position }).position;
  return {
    left: clamp(saved ? bounds.left + saved.x * (bounds.width - width) : bounds.left, bounds.left, bounds.right - width),
    top: clamp(saved ? bounds.top + saved.y * (bounds.height - height) : handTop - height - 10, bounds.top, bounds.bottom - height),
    width, height
  };
}
export function dashboardPosition(bounds, box) {
  return { x: bounds.width > box.width ? clamp((box.left - bounds.left) / (bounds.width - box.width), 0, 1) : 0, y: bounds.height > box.height ? clamp((box.top - bounds.top) / (bounds.height - box.height), 0, 1) : 0 };
}
function visibleRect(node) {
  if (!node?.isConnected || node.closest?.(OWN_UI) || node.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) === false) return null;
  const style = getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return null;
  const rect = node.getBoundingClientRect();
  return rectOK(rect) ? rect : null;
}
function readLayout() {
  try { return normalizeDashboardLayout(game.settings.get(MODULE, SETTING)); } catch { return normalizeDashboardLayout(null); }
}
export class CardCombatHUDLayout {
  constructor() {
    this.preference = readLayout();
    this.observed = new Set();
    this.toolsOpen = false;
    this.saving = Promise.resolve();
  }
  bind(root) {
    this.unbind();
    this.root = root;
    this.panel = root.querySelector(".cc-ship-dashboard");
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };
    const handle = root.querySelector("[data-dashboard-drag]");
    handle?.addEventListener("pointerdown", event => this.startDrag(event, handle), options);
    handle?.addEventListener("pointermove", event => this.moveDrag(event), options);
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) handle?.addEventListener(name, event => this.endDrag(event), options);
    handle?.addEventListener("keydown", event => {
      if (event.key === "Home") { event.preventDefault(); this.reset(); return; }
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!delta || !this.bounds || !this.panel) return;
      event.preventDefault(); event.stopPropagation();
      const box = this.panel.getBoundingClientRect(), step = event.shiftKey ? 40 : 10;
      const placed = dashboardPlacement(this.dashboardBounds, box, dashboardPosition(this.dashboardBounds, { width: box.width, height: box.height, left: box.left + delta[0] * step, top: box.top + delta[1] * step }));
      this.preference.position = dashboardPosition(this.dashboardBounds, placed); this.update(); this.save();
    }, options);
    root.querySelector("[data-dashboard-collapse]")?.addEventListener("click", () => {
      this.preference.collapsed = !this.preference.collapsed; this.applyCollapse(); this.update(); this.save();
    }, options);
    root.querySelector("[data-dashboard-reset]")?.addEventListener("click", () => this.reset(), options);
    const tools = root.querySelector(".cc-dashboard-tools");
    if (tools) {
      tools.open = this.toolsOpen;
      tools.addEventListener("toggle", () => { this.toolsOpen = tools.open; this.schedule(); }, options);
    }
    window.addEventListener("resize", () => this.schedule(), options);
    globalThis.visualViewport?.addEventListener("resize", () => this.schedule(), options);
    this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => this.schedule()) : null;
    this.mutationObserver = typeof MutationObserver === "function" ? new MutationObserver(records => {
      if (records.some(record => this.relevantMutation(record))) this.schedule();
    }) : null;
    this.mutationObserver?.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
    this.applyCollapse(); this.update();
  }
  relevantMutation(record) {
    const node = record.target;
    if (node.closest?.(OWN_UI)) return false;
    if (node === document.body || node === document.documentElement || node.closest?.(ANCHORS)) return true;
    return [...(record.addedNodes ?? []), ...(record.removedNodes ?? [])].some(child => child.matches?.(ANCHORS) || child.querySelector?.(ANCHORS));
  }
  applyCollapse() {
    this.panel?.classList.toggle("is-collapsed", this.preference.collapsed);
    const button = this.root?.querySelector("[data-dashboard-collapse]");
    if (button) { button.textContent = this.preference.collapsed ? "Expand ship" : "Collapse"; button.setAttribute("aria-expanded", String(!this.preference.collapsed)); }
    for (const body of this.root?.querySelectorAll("[data-dashboard-expanded]") ?? []) body.hidden = this.preference.collapsed;
  }
  reset() {
    this.preference.position = null; this.preference.collapsed = false;
    this.applyCollapse(); this.update(); this.save();
  }
  schedule() {
    if (this.frame || !this.root) return;
    this.frame = requestAnimationFrame(() => { this.frame = null; this.update(); });
  }
  update() {
    if (!this.root?.isConnected) return;
    const root = this.root, width = window.innerWidth, height = window.innerHeight;
    const nodes = [...document.querySelectorAll(ANCHORS)].filter(node => !node.closest?.(OWN_UI));
    const rectangles = selector => nodes.filter(node => node.matches(selector)).map(visibleRect).filter(Boolean);
    const bounds = this.bounds = hudSafeBounds({ width, height, leftRects: rectangles(LEFT), rightRects: rectangles(RIGHT), topRects: rectangles(TOP), bottomRects: rectangles(BOTTOM) });
    const px = (key, value) => root.style.setProperty(key, Math.round(value) + "px");
    px("--cc-safe-left", bounds.left); px("--cc-safe-right", width - bounds.right);
    px("--cc-safe-top", bounds.top); px("--cc-safe-bottom", height - bounds.bottom);
    px("--cc-available-width", bounds.width);
    // Apply width before measuring wrapping and dashboard height.
    if (this.panel) this.panel.style.width = Math.min(this.preference.collapsed ? 400 : 1040, bounds.width) + "px";
    const hand = root.querySelector(".cc-hand-dock")?.getBoundingClientRect();
    const ribbon = root.querySelector(".cc-round-ribbon")?.getBoundingClientRect();
    const floor = Math.max(bounds.top + 1, (hand?.top ?? bounds.bottom) - 10);
    const dashboardTop = Math.min((ribbon?.bottom ?? bounds.top + 65) + 8, floor - 1);
    this.dashboardBounds = { ...bounds, top: dashboardTop, bottom: floor, height: floor - dashboardTop };
    if (this.panel) {
      this.panel.style.maxHeight = Math.round(this.dashboardBounds.height) + "px";
      const box = this.panel.getBoundingClientRect();
      const placed = dashboardPlacement(this.dashboardBounds, box, this.preference.position, hand?.top ?? bounds.bottom);
      this.panel.style.left = Math.round(placed.left) + "px"; this.panel.style.top = Math.round(placed.top) + "px";
    }
    const ordersTop = (ribbon?.bottom ?? bounds.top + 65) + 8;
    px("--cc-orders-top", ordersTop);
    const orders = root.querySelector(".cc-orders-panel")?.getBoundingClientRect();
    const detailTop = Math.min(ordersTop + 80, Math.max(bounds.top + 40, floor - 130));
    px("--cc-detail-top", detailTop);
    px("--cc-detail-height", Math.max(50, floor - detailTop));
    const responseTop = Math.min((orders?.bottom ?? ordersTop + 70) + 8, Math.max(bounds.top + 40, floor - 130));
    px("--cc-response-top", responseTop); px("--cc-response-height", Math.max(50, floor - responseTop));
    root.dataset.ccLayoutReady = "true";
    const observed = new Set([...nodes, this.panel, root.querySelector(".cc-hand-dock"), root.querySelector(".cc-orders-panel"), root.querySelector(".cc-round-ribbon")].filter(Boolean));
    for (const node of this.observed) if (!observed.has(node)) this.resizeObserver?.unobserve(node);
    for (const node of observed) if (!this.observed.has(node)) this.resizeObserver?.observe(node);
    this.observed = observed;
  }
  startDrag(event, handle) {
    if (event.button !== 0 || !this.panel || !this.dashboardBounds) return;
    event.preventDefault(); event.stopPropagation();
    const box = this.panel.getBoundingClientRect();
    this.drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, left: box.left, top: box.top, width: box.width, height: box.height };
    handle.setPointerCapture?.(event.pointerId); this.panel.classList.add("is-dragging");
  }
  moveDrag(event) {
    if (!this.drag || event.pointerId !== this.drag.id || !this.bounds) return;
    event.preventDefault(); event.stopPropagation();
    const d = this.drag;
    const box = { left: clamp(d.left + event.clientX - d.startX, this.dashboardBounds.left, this.dashboardBounds.right - d.width), top: clamp(d.top + event.clientY - d.startY, this.dashboardBounds.top, this.dashboardBounds.bottom - d.height), width: d.width, height: d.height };
    this.preference.position = dashboardPosition(this.dashboardBounds, box);
    this.panel.style.left = Math.round(box.left) + "px"; this.panel.style.top = Math.round(box.top) + "px";
  }
  endDrag(event) {
    if (!this.drag || event && event.pointerId !== this.drag.id) return;
    this.drag = null; this.panel?.classList.remove("is-dragging"); this.save(); this.schedule();
  }
  save() {
    const value = structuredClone(this.preference);
    this.saving = this.saving.catch(() => {}).then(() => game.settings.set(MODULE, SETTING, value)).catch(error => console.warn("Arkflight | Could not save HUD position", error));
  }
  unbind() {
    if (this.drag) { this.drag = null; this.save(); }
    this.controller?.abort(); this.resizeObserver?.disconnect(); this.mutationObserver?.disconnect();
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null; this.observed?.clear();
  }
  destroy() { this.unbind(); this.root = null; this.panel = null; }
}
globalThis.Hooks?.once("init", () => {
  game.settings.register(MODULE, SETTING, { name: "Card combat dashboard layout", scope: "client", config: false, type: Object, default: normalizeDashboardLayout(null) });
});
