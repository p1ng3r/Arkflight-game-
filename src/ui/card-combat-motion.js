import { CombatAudio, combatSoundCues } from "./card-combat-audio.js";
import { createMotionTracker, effectiveMotion } from "./card-combat-motion-state.js";
import { PLAYTEST_COMBAT_CARDS } from "../content/combat-cards-playtest.js";

const MODULE = "arkflight-game";
const ART = "modules/arkflight-game/assets/ui/card-combat/animation-art/";
const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
const tracker = createMotionTracker();
const live = new Set();
const delivered = new Map();
const audioEngine = new CombatAudio();
let recent = null, sessionId = null, toastCancel = null;
const names = { hull: "Hull", lifeveil: "Lifeveil", strain: "Strain", morale: "Morale", supplies: "Supplies" };
const card = id => PLAYTEST_COMBAT_CARDS.find(row => row.id === id);
const degreeName = degree => ({ 2: "Critical success", 1: "Success", 0: "Failure", "-1": "Critical failure" }[degree]);
function setting(key, fallback) {
  try { return game.settings.get(MODULE, key) ?? fallback; } catch { return fallback; }
}
export function motionPreferences() {
  const preference = setting("cardCombatMotion", "full"), reduced = reducedMotion?.matches ?? false;
  return { preference, mode: effectiveMotion(preference, reduced), reduced, sound: setting("cardCombatSound", false) };
}
function safely(fn) {
  try { fn(); } catch (error) { console.warn("Arkflight | Cosmetic combat effect skipped", error); }
}
function animate(element, frames, duration = 550) {
  if (!element?.animate || motionPreferences().mode === "off") return;
  const animation = element.animate(frames, { duration: motionPreferences().mode === "subtle" ? Math.min(duration, 250) : duration, easing: "ease-out" });
  const cancel = () => animation.cancel(); live.add(cancel);
  animation.finished.then(() => live.delete(cancel), () => live.delete(cancel));
}
export function clearCombatMotion() {
  audioEngine.stop();
  for (const cancel of [...live]) cancel();
  live.clear(); recent = null; delivered.clear();
  document.querySelectorAll(".cc-motion-layer").forEach(layer => layer.remove());
}
function layer() {
  let root = document.querySelector(".cc-motion-layer");
  if (!root) {
    root = document.createElement("div"); root.className = "cc-motion-layer";
    root.setAttribute("aria-hidden", "true"); document.body.append(root);
  }
  return root;
}
// Use the scene transform every frame: effects follow token movement and camera pan/zoom.
export function tokenScreenPoint(state, shipId) {
  const canvas = globalThis.canvas;
  if (!state?.canvas || state.canvas.sceneId !== canvas?.scene?.id || !canvas.ready) return null;
  const token = canvas.tokens?.get(state.ships?.[shipId]?.cardPlay?.tokenId);
  const m = canvas.stage?.worldTransform, p = token?.center;
  if (!p || !m) return null;
  const view = canvas.app?.canvas ?? canvas.app?.view;
  const rect = view?.getBoundingClientRect();
  const screen = canvas.app?.renderer?.screen;
  const sx = rect && screen?.width ? rect.width / screen.width : 1;
  const sy = rect && screen?.height ? rect.height / screen.height : 1;
  return { x: (rect?.left ?? 0) + (m.a * p.x + m.c * p.y + m.tx) * sx, y: (rect?.top ?? 0) + (m.b * p.x + m.d * p.y + m.ty) * sy, size: Math.max(24, (token.w ?? canvas.grid.size ?? 100) * Math.hypot(m.a, m.b) * sx), rotation: token.document?.rotation ?? 0 };
}
// All effects are disposable DOM overlays, never TokenDocuments or scene templates.
function transient(className, duration, draw) {
  if (motionPreferences().mode === "off" || document.hidden) return;
  const element = document.createElement("div"); element.className = className;
  layer().append(element);
  let frame, stopped = false;
  const started = performance.now();
  const cancel = () => { stopped = true; cancelAnimationFrame(frame); element.remove(); live.delete(cancel); };
  live.add(cancel);
  const tick = now => {
    if (stopped) return;
    const progress = Math.min(1, (now - started) / duration);
    let keep = false;
    safely(() => { keep = progress < 1 && element.isConnected && motionPreferences().mode !== "off" && draw(element, progress); });
    if (!keep) { cancel(); return; }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
function tokenArt(state, shipId, file, { duration = 800, scale = 1.5, rotation = 0, stern = false } = {}) {
  transient("cc-token-effect", duration, (element, t) => {
    const p = tokenScreenPoint(state, shipId); if (!p) return false;
    const size = p.size * scale * (0.8 + t * 0.35);
    const angle = (p.rotation + 90) * Math.PI / 180, offset = stern ? p.size * 0.6 : 0;
    element.style.cssText = `background-image:url("${ART}${file}.webp");left:${p.x + Math.cos(angle) * offset}px;top:${p.y + Math.sin(angle) * offset}px;width:${size}px;height:${size}px;transform:translate(-50%,-50%) rotate(${stern ? p.rotation : rotation}deg);opacity:${Math.sin(Math.PI * t)};`;
    return true;
  });
}
function tokenRing(state, shipId, color, duration = 700) {
  transient("cc-token-ring", duration, (element, t) => {
    const p = tokenScreenPoint(state, shipId); if (!p) return false;
    const size = p.size * (1.05 + t * 0.2);
    element.style.cssText = `left:${p.x}px;top:${p.y}px;width:${size}px;height:${size}px;border-color:${color};opacity:${1 - t};transform:translate(-50%,-50%);`;
    return true;
  });
}
function floating(state, event) {
  transient("cc-resource-float", 1100, (element, t) => {
    const p = tokenScreenPoint(state, event.shipId); if (!p) return false;
    element.textContent = `${event.delta > 0 ? "+" : "−"}${Math.abs(event.delta)} ${names[event.resource] ?? event.resource}`;
    // Stack all changed systems, rather than printing five labels over one another.
    const index = Object.keys(names).indexOf(event.resource);
    element.style.cssText = `left:${p.x}px;top:${p.y - p.size / 2 - index * 19 - t * 28}px;opacity:${Math.min(1, (1 - t) * 4)};color:${event.delta > 0 === (event.resource !== "strain") ? "#b4ecce" : "#ffc3ab"};`;
    return true;
  });
}
function volley(state, event, subtle) {
  for (const target of event.targets) {
    const guns = target.weaponKeys?.length ?? 1;
    const count = subtle ? 1 : Math.min(4, guns);
    for (let index = 0; index < count; index++) {
      const duration = subtle ? 300 : 600 + index * 90;
      transient("cc-projectile", duration, (element, progress) => {
        const a = tokenScreenPoint(state, event.shipId), b = tokenScreenPoint(state, target.targetId);
        if (!a || !b) return false;
        const t = Math.max(0, (progress - index * 0.09) / (1 - index * 0.09));
        const angle = Math.atan2(b.y - a.y, b.x - a.x), offset = (index - (count - 1) / 2) * a.size * 0.16;
        const x = a.x + (b.x - a.x) * t - Math.sin(angle) * offset;
        const y = a.y + (b.y - a.y) * t + Math.cos(angle) * offset;
        element.style.cssText = `left:${x}px;top:${y}px;transform:translate(-50%,-50%) rotate(${angle * 180 / Math.PI}deg);opacity:${t === 0 ? 0 : 1 - t * 0.65};`;
        return true;
      });
    }
    if (!subtle) transient("cc-token-effect cc-muzzle", 320, (element, t) => {
      const a = tokenScreenPoint(state, event.shipId), b = tokenScreenPoint(state, target.targetId);
      if (!a || !b) return false;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      element.style.cssText = `background-image:url("${ART}cannon-muzzle-flash.webp");left:${a.x + Math.cos(angle) * a.size * 0.38}px;top:${a.y + Math.sin(angle) * a.size * 0.38}px;width:${a.size * 1.2}px;height:${a.size * 0.6}px;transform:translate(0,-50%) rotate(${angle * 180 / Math.PI}deg);transform-origin:left center;opacity:${1 - t};`;
      return true;
    });
  }
}
function unlockAudio(force = false) {
  if (force || setting("cardCombatSound", false)) void audioEngine.unlock();
}
export function playCombatSound(kind, delay = 0) {
  safely(() => { if (setting("cardCombatSound", false) && !document.hidden) audioEngine.play(kind, setting("cardCombatSoundVolume", .15), delay); });
}
export function combatPanelFeedback(kind, element) {
  playCombatSound(kind);
  safely(() => {
    if (!element || motionPreferences().mode === "off") return;
    if (kind !== "close") { animate(element, [{ opacity: .4, transform: "translateY(5px)" }, { opacity: 1, transform: "none" }], 180); return; }
    const box = element.getBoundingClientRect(); if (!box.width || !box.height) return;
    const ghost = document.createElement("div"); ghost.className = "cc-panel-ghost";
    ghost.style.cssText = `position:fixed;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;pointer-events:none;border:1px solid #b99b60;border-radius:9px;background:#102735cc;z-index:100;`;
    ghost.setAttribute("aria-hidden", "true"); document.body.append(ghost);
    const animation = ghost.animate([{ opacity: .8, transform: "scale(1)" }, { opacity: 0, transform: "scale(.96)" }], { duration: 160, easing: "ease-out" });
    const cancel = () => { animation.cancel(); ghost.remove(); live.delete(cancel); }; live.add(cancel);
    animation.finished.then(cancel, cancel);
  });
}
function playEvent(state, event) {
  const mode = motionPreferences().mode;
  if (mode === "off") return;
  const subtle = mode === "subtle";
  if (event.kind === "turn") tokenRing(state, event.shipId, "#86e6db");
  if (event.kind === "incoming") tokenRing(state, event.shipId, "#f2b66b", 850);
  if (event.kind === "fire") volley(state, event, subtle);
  if (event.kind === "move" && !subtle) tokenArt(state, event.shipId, "arkengine-flare", { scale: 1.1, duration: 500, stern: true });
  if (event.kind === "resource") floating(state, event);
  if (event.kind === "outcome" && event.attack) {
    if (event.attack.degree >= 1) tokenRing(state, event.shipId, "#e8a77f", 500);
    // A green Lifeveil impact only accompanies a ward reaction/effect, not every Hull hit.
    if (!subtle && ["emergency-ward", "deflect-impact"].includes(event.cardId)) tokenArt(state, event.shipId, "lifeveil-impact");
  }
  if (event.kind === "signature" && !subtle) tokenArt(state, event.shipId, card(event.cardId)?.stations?.[0] === "veilwarden" ? "lifeveil-impact" : "signature-burst", { scale: 1.8, duration: 950 });
}
function showOutcomeToast(state, event, hud) {
  if (!hud || document.hidden) return;
  toastCancel?.();
  const definition = card(event.cardId), result = event.result;
  const box = hud.querySelector(".cc-round-ribbon")?.getBoundingClientRect();
  if (!box) return;
  const toast = document.createElement("div"); toast.className = "cc-outcome-toast"; toast.setAttribute("role", "status");
  const title = document.createElement("strong"), text = document.createElement("span");
  title.textContent = `${state.ships[event.shipId]?.cardPlay.name ?? "Ship"} · ${definition?.name ?? "Attack"} · ${degreeName(result.degree) ?? "Resolved"}`;
  text.textContent = definition?.outcomes?.[["criticalFailure", "failure", "success", "criticalSuccess"][result.degree + 1]] ?? (event.attack ? `${event.attack.damage ?? 0} Hull damage after defenses.` : `Total ${result.total}`);
  toast.append(title, text); toast.style.left = `${box.left}px`; toast.style.maxWidth = `${Math.min(420, parseFloat(getComputedStyle(hud).getPropertyValue("--cc-available-width")) || 420)}px`;
  document.body.append(toast); toast.style.top = `${Math.max(12, box.top - toast.getBoundingClientRect().height - 8)}px`; animate(toast, [{ opacity: .3 }, { opacity: 1 }], 180);
  const timer = setTimeout(() => cancel(), 4000);
  const cancel = () => { clearTimeout(timer); toast.remove(); live.delete(cancel); if (toastCancel === cancel) toastCancel = null; };
  toastCancel = cancel; live.add(cancel);
}
function receive(state) {
  safely(() => {
    if (sessionId !== state?.id) { clearCombatMotion(); sessionId = state?.id; }
    const events = tracker.observe(state);
    if (!state || state.phase === "complete") { clearCombatMotion(); return; }
    if (!events.length) return;
    const hud = document.querySelector(".arkflight-card-canvas");
    for (const event of events.filter(row => row.kind === "lock" && row.shipId === hud?.dataset.ccShip)) {
      event.origins = event.orders.map(order => {
        const node = selectByData(hud, "data-preview-card", order.abilityId), rect = node?.getBoundingClientRect();
        return rect?.width && rect?.height ? { id: order.id, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, art: node.querySelector(".cc-card-illustration img")?.src } : null;
      }).filter(Boolean);
    }
    recent = { id: state.id, revision: state.revision, time: performance.now(), events };
    if (state.canvas?.sceneId !== globalThis.canvas?.scene?.id) return;
    events.forEach(event => safely(() => playEvent(state, event)));
    const outcome = events.find(event => event.kind === "outcome");
    if (outcome) showOutcomeToast(state, outcome, hud);
    combatSoundCues(events).forEach((cue, index) => playCombatSound(cue, index * .08));
  });
}
function selectByData(root, key, value) { return [...root.querySelectorAll(`[${key}]`)].find(node => node.getAttribute(key) === value); }
function pulse(element) { animate(element, [{ boxShadow: "0 0 0 1px #b9eee0, 0 0 18px #73dcc577" }, { boxShadow: "0 0 0 0 transparent" }]); }
export function revealCombatHand(root) {
  safely(() => animate(root.querySelector(".card-hand-scroll"), [{ opacity: 0.7, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], 220));
}
export function decorateCombatMotion(root, context) {
  safely(() => {
    const prefs = motionPreferences(); root.dataset.ccMotion = prefs.mode;
    root.dataset.ccShip = context.selectedShipId; root.dataset.ccRevision = String(context.state?.revision);
    const active = context.state?.phase === "execution" && context.state.turnOrder?.[context.state.turnIndex] === context.selectedShipId;
    root.querySelector(".cc-vessel-panel")?.classList.toggle("cc-active-vessel", Boolean(active));
    const outcomes = root.querySelector("[data-outcome-card]");
    if (outcomes && context.lastOutcome && context.lastOutcome.cardId === outcomes.dataset.outcomeCard) {
      const row = [...outcomes.querySelectorAll("[data-degree]")].find(node => Number(node.dataset.degree) === context.lastOutcome.degree);
      row?.classList.add("cc-current-result"); row?.nextElementSibling?.classList.add("cc-current-result");
    }
    const preference = root.querySelector("select[data-cc-motion]");
    if (preference) { preference.value = prefs.preference; preference.addEventListener("change", async () => { await game.settings.set(MODULE, "cardCombatMotion", preference.value); }); }
    const soundButton = root.querySelector("[data-cc-sound]");
    if (soundButton) {
      soundButton.textContent = prefs.sound ? "Sound on" : "Sound off"; soundButton.setAttribute("aria-pressed", String(prefs.sound));
      soundButton.addEventListener("click", async () => { const enabled = !setting("cardCombatSound", false); if (enabled) safely(() => unlockAudio(true)); await game.settings.set(MODULE, "cardCombatSound", enabled); });
    }
    const volume = root.querySelector("[data-cc-volume]"), volumeLabel = root.querySelector("[data-volume-label]");
    if (volume) {
      volume.value = Math.round(Math.max(0, Math.min(.4, setting("cardCombatSoundVolume", .15))) * 250);
      if (volumeLabel) volumeLabel.textContent = `${volume.value}%`;
      volume.addEventListener("input", () => { if (volumeLabel) volumeLabel.textContent = `${volume.value}%`; });
      volume.addEventListener("change", () => { void game.settings.set(MODULE, "cardCombatSoundVolume", Number(volume.value) / 250); });
    }
    const events = recent?.id === context.state?.id && recent.revision === context.state?.revision && performance.now() - recent.time < 1800 ? recent.events.filter(event => event.shipId === context.selectedShipId) : [];
    const key = `${context.state?.id}:${context.state?.revision}:${context.selectedShipId}`;
    if (prefs.mode === "off" || delivered.has(key)) return;
    delivered.set(key, true); if (delivered.size > 100) delivered.delete(delivered.keys().next().value);
    for (const event of events) {
      if (event.kind === "lock") {
        pulse(root.querySelector("[data-orders-toggle]"));
        animate(root.querySelector(".cc-lock-bolt"), [{ transform: "translateX(-65%)" }, { transform: "translateX(0)" }], 450);
        for (const order of event.orders) animate(selectByData(root, "data-preview-order", order.id), [{ opacity: 0, transform: "translateY(24px) scale(.9)" }, { opacity: 1, transform: "none" }], 450);
        if (prefs.mode === "full") for (const origin of event.origins ?? []) {
          const target = selectByData(root, "data-preview-order", origin.id)?.getBoundingClientRect();
          if (!target) continue;
          transient("cc-order-flight", 440, (element, t) => {
            const { rect, art } = origin;
            element.style.cssText = `left:${rect.x + (target.x - rect.x) * t}px;top:${rect.y + (target.y - rect.y) * t}px;width:${rect.width + (target.width - rect.width) * t}px;height:${rect.height + (target.height - rect.height) * t}px;opacity:${1 - t * 0.6};background-image:url("${art}"),url("${ART}ability-card-frame.webp");`;
            return true;
          });
        }
      }
      if (event.kind === "pool") {
        const pool = root.querySelector(`[data-cc-pool="${event.pool}"]`); pulse(pool);
        if (prefs.mode === "full" && event.delta < 0 && pool) {
          const from = pool.getBoundingClientRect(), to = root.querySelector(event.pool === "ap" ? ".cc-orders-panel" : ".cc-response-panel")?.getBoundingClientRect();
          if (to) transient(`cc-pool-flight cc-pool-${event.pool}`, 420, (element, t) => { element.style.cssText = `left:${from.x + from.width / 2 + (to.x + to.width / 2 - from.x - from.width / 2) * t}px;top:${from.y + (to.y - from.y) * t}px;opacity:${1 - t * 0.5};`; return true; });
        }
      }
      if (event.kind === "resource") {
        const bar = root.querySelector(`.resource-${event.resource} .card-resource-track i`), meter = root.querySelector(`.resource-${event.resource}`);
        if (bar && event.max > 0) animate(bar, [{ width: `${Math.max(0, Math.min(100, event.from / event.max * 100))}%` }, { width: bar.style.width }], 700);
        pulse(meter);
      }
      if (event.kind === "incoming") {
        animate(root.querySelector(".cc-response-panel"), [{ opacity: 0.6, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }]);
        revealCombatHand(root);
        pulse(root.querySelector(".cc-hand-dock"));
      }
      if (event.kind === "ready" || event.kind === "signature") pulse(selectByData(root, "data-preview-card", event.cardId));
      if (event.kind === "outcome") {
        pulse(root.querySelector(".cc-last-outcome"));
        const preview = root.querySelector("[data-outcome-card]");
        if (preview?.dataset.outcomeCard === event.cardId) {
          const degree = event.result.degree;
          const row = [...preview.querySelectorAll("[data-degree]")].find(node => Number(node.dataset.degree) === degree);
          pulse(row);
        }
      }
      if (event.kind === "turn") pulse(root.querySelector(".cc-round-ribbon"));
    }
  });
}
// Last result remains readable after its reveal, including with motion disabled.
export function lastCombatOutcome(state, shipId) {
  const entry = [...(state?.log ?? [])].reverse().find(row => row.shipId === shipId && row.result);
  if (!entry) return null;
  const definition = card(entry.label), result = entry.result.reaction ?? entry.result;
  const outcome = ["criticalFailure", "failure", "success", "criticalSuccess"][result.degree + 1];
  return { cardId: entry.label, name: definition?.name ?? (entry.result.attackerId ? "Incoming attack" : entry.label), degree: result.degree, label: degreeName(result.degree) ?? "Attack roll", die: result.die, total: result.total, text: definition?.outcomes?.[outcome], round: entry.round };
}

Hooks.once("init", () => {
  const refresh = () => { clearCombatMotion(); Hooks.callAll("arkflightCardCombatMotionChanged"); };
  game.settings.register(MODULE, "cardCombatMotion", { name: "Card combat motion", hint: "Full effects, subtle feedback, or no animation. OS reduced motion always disables movement.", scope: "client", config: true, type: String, choices: { full: "Full", subtle: "Subtle", off: "Off" }, default: "full", onChange: refresh });
  game.settings.register(MODULE, "cardCombatSound", { name: "Card combat sounds", hint: "Layered cannon, impact, crystal, card and panel effects. Requires a click in this browser to enable audio.", scope: "client", config: true, type: Boolean, default: false, onChange: refresh });
  game.settings.register(MODULE, "cardCombatSoundVolume", { name: "Card combat sound volume", scope: "client", config: true, type: Number, range: { min: 0, max: 0.4, step: 0.05 }, default: 0.15 });
});
Hooks.once("ready", () => {
  tracker.observe(game.arkflight?.cardCombat?.state());
  // Warm the cache without holding up Foundry's ready hook or the next command.
  for (const file of ["cannon-muzzle-flash", "arkengine-flare", "lifeveil-impact", "signature-burst"]) {
    const image = new Image(); image.src = `${ART}${file}.webp`;
  }
  document.addEventListener("pointerdown", () => safely(unlockAudio), { passive: true });
  document.addEventListener("keydown", () => safely(unlockAudio), { passive: true });
  reducedMotion?.addEventListener("change", () => { clearCombatMotion(); Hooks.callAll("arkflightCardCombatMotionChanged"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearCombatMotion(); });
});
Hooks.on("arkflightCardCombatChanged", state => receive(state ?? game.arkflight?.cardCombat?.state()));
Hooks.on("canvasTearDown", () => { clearCombatMotion(); tracker.reset(); });
Hooks.on("canvasReady", () => tracker.observe(game.arkflight?.cardCombat?.state()));
