import { CombatAudio } from "./card-combat-audio.js";
import { combatPresentationEvents } from "./alpha-combat-presentation.js";
const MODULE = "arkflight-game", audio = new CombatAudio();
let audioGeneration=0;
const stopAudio=()=>{audioGeneration++;audio.stop();};
const setting = (key, fallback) => { try { return game.settings.get(MODULE, key) ?? fallback; } catch { return fallback; } };
export function alphaWindowPosition(width,height,overrides={}){
  const w=globalThis.innerWidth??1280,h=globalThis.innerHeight??720,sidebar=globalThis.document?.querySelector?.("#sidebar")?.getBoundingClientRect?.(),controls=globalThis.document?.querySelector?.("#controls")?.getBoundingClientRect?.();
  const right=sidebar&&sidebar.width>0&&sidebar.left>360?Math.min(w,sidebar.left):w,left=Math.min(90,Math.max(16,(controls?.right??54)+12)),size=Math.min(width,right-left-20),tall=Math.min(height,h-90);
  return{width:Math.max(300,size),height:tall,left,top:Math.max(20,h-tall-70),...overrides};
}
export function alphaPreferences() {
  const preference = setting("alphaMotion", "full"), reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  return { mode: reduced || !["full", "subtle"].includes(preference) ? "off" : preference, preference, reduced, sound: setting("alphaSound", false), volume: setting("alphaVolume", .15) };
}
export function alphaSound(kind) {
  if (!alphaPreferences().sound || globalThis.document?.hidden) return;
  const generation=audioGeneration;
  // Loading/unlocking audio never blocks a command or changes combat state.
  void audio.unlock().then(() => { if (generation===audioGeneration&&alphaPreferences().sound && !document.hidden) audio.play(kind, alphaPreferences().volume); }).catch(() => {});
}
export function bindAlphaPreferences(root, render) {
  const prefs = alphaPreferences(); root.dataset.alphaMotion = prefs.mode;
  if(!root.alphaAudioBound){root.alphaAudioBound=true;root.addEventListener("pointerdown", () => { if (alphaPreferences().sound) void audio.unlock(); });}
  root.querySelector("[data-alpha-sound]")?.addEventListener("click", async () => { const enabled = !alphaPreferences().sound; if (enabled) void audio.unlock(); await game.settings.set(MODULE, "alphaSound", enabled); if (!enabled) stopAudio(); else alphaSound("select"); await render(); });
  root.querySelector("[data-alpha-motion]")?.addEventListener("change", async e => { await game.settings.set(MODULE, "alphaMotion", e.target.value); Hooks.callAll("arkflightAlphaPresentationChanged"); await render(); });
  root.querySelector("[data-alpha-volume]")?.addEventListener("change", async e => { await game.settings.set(MODULE, "alphaVolume", Number(e.target.value)); alphaSound("select"); });
}
export class AlphaCombatEffects {
  previous = null; shipId = null; animations = new Set(); nodes = new Set();
  animate(element, frames, duration = 420) {
    if (!element?.animate || alphaPreferences().mode === "off" || document.hidden) return;
    try { const animation = element.animate(frames, { duration: alphaPreferences().mode === "subtle" ? Math.min(180, duration) : duration, easing: "cubic-bezier(.2,.8,.2,1)" }); if(!animation?.finished)return;this.animations.add(animation); void animation.finished.catch(() => {}).finally(() => this.animations.delete(animation)); } catch { /* Effects cannot prevent gameplay. */ }
  }
  update(root, state, shipId) {
    const events = this.shipId === shipId ? combatPresentationEvents(this.previous, state, shipId) : [];
    this.previous = state; this.shipId = shipId;
    if (!events.length || document.hidden) return;
    if (events.some(e => e.kind === "phase")) this.animate(root.querySelector(".alpha-phase-rail"), [{ opacity: .3 }, { opacity: 1 }]);
    if(events.some(e=>e.kind==="ap"))this.animate(root.querySelector(".alpha-ap"),[{filter:"brightness(1.8)"},{filter:"brightness(1)"}]);
    for (const e of events.filter(e => e.kind === "draw")) for (const [i, id] of e.ids.entries()) this.animate([...root.querySelectorAll("[data-alpha-card]")].find(n => n.dataset.alphaCard === id), [{ opacity: 0, transform: "translateY(35px) rotate(6deg)" }, { opacity: 1, transform: "translateY(0) rotate(0deg)" }], 400 + i * 45);
    for (const e of events.filter(e => e.kind === "resource")) this.animate(root.querySelector(`[data-alpha-meter="${e.key}"]`), [{ filter: "brightness(2)", transform: "translateY(-2px)" }, { filter: "brightness(1)", transform: "translateY(0)" }]);
    if (events.some(e => ["check", "damage"].includes(e.kind))) this.animate(root.querySelector(".alpha-result-card"), [{ opacity: .2, transform: "translateY(12px) scale(.96)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], 500);
    const check = events.findLast(e => e.kind === "check"&&e.station!=="initiative"), damage = events.find(e => e.kind === "damage");
    if (damage) alphaSound(damage.degree >= 1 ? "fire" : "failure");
    else if (events.some(e => e.kind === "complication")) alphaSound("criticalFailure");
    else if (events.some(e => e.kind === "play" && e.burn)) alphaSound("signature");
    else if (events.some(e => e.kind === "draw")) alphaSound("ready");
    else if(events.some(e=>e.kind==="move"))alphaSound("move");
    else if (check) alphaSound({ "-1": "criticalFailure", 0: "failure", 1: "success", 2: "criticalSuccess" }[check.degree]);
    else if (events.some(e => e.kind === "play")) alphaSound("lock");
  }
  async flyCard(card, destination) {
    if (!card || alphaPreferences().mode !== "full" || document.hidden) return;
    try {
      const from = card.getBoundingClientRect(), to = destination?.getBoundingClientRect() ?? { left: from.left + 150, top: from.top - 80 };
      const ghost = card.cloneNode(true); ghost.removeAttribute("data-alpha-card"); ghost.setAttribute("aria-hidden", "true"); ghost.tabIndex = -1; ghost.classList.add("alpha-flying-card");
      Object.assign(ghost.style, { position: "fixed", left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, pointerEvents: "none", zIndex: "10000", margin: "0" }); document.body.append(ghost); this.nodes.add(ghost);
      const animation = ghost.animate([{ opacity: .95, transform: "translate(0,0) scale(1) rotate(0deg)" }, { opacity: 0, transform: `translate(${to.left - from.left}px,${to.top - from.top}px) scale(.2) rotate(15deg)` }], { duration: 500, easing: "ease-in" });
      this.animations.add(animation); await animation.finished.catch(() => {}); this.animations.delete(animation); ghost.remove(); this.nodes.delete(ghost);
    } catch { this.clear(false); }
  }
  clear(reset = true) { for (const a of this.animations) a.cancel(); this.animations.clear(); for (const n of this.nodes) n.remove(); this.nodes.clear(); stopAudio(); if (reset) { this.previous = null; this.shipId = null; } }
}
Hooks.once("init", () => {
  game.settings.register(MODULE, "alphaMotion", { name: "Arkflight alpha motion", scope: "client", config: true, type: String, choices: { full: "Full", subtle: "Subtle", off: "Off" }, default: "full" });
  game.settings.register(MODULE, "alphaSound", { name: "Arkflight alpha sound", scope: "client", config: true, type: Boolean, default: false });
  game.settings.register(MODULE, "alphaVolume", { name: "Arkflight alpha volume", scope: "client", config: true, type: Number, range: { min: 0, max: .4, step: .01 }, default: .15 });
});
globalThis.document?.addEventListener("visibilitychange", () => { if (document.hidden) stopAudio(); });
globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.addEventListener?.("change",()=>Hooks.callAll("arkflightAlphaPresentationChanged"));
