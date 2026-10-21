import { nextDemoStep } from "../cards/guided-combat-demo.js";
import { getOrderQueue } from "../cards/committed-orders.js";
import { cardAvailability } from "../cards/card-library.js";
import { PLAYTEST_COMBAT_CARDS } from "../content/combat-cards-playtest.js";
import { showCardWeaponOverlay, showCardFireOverlay, hideCardWeaponOverlay } from "./card-combat-canvas-overlays.js";
import { motionPreferences } from "./card-combat-motion.js";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
let instance;
export class GuidedCombatDemoWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { id: "arkflight-guided-combat", classes: ["arkflight-guided-combat"], window: { title: "Arkflight — Guided Combat Test", icon: "fa-solid fa-flask", resizable: true }, position: { width: 420, height: 650 } };
  static PARTS = { main: { template: "modules/arkflight-game/templates/guided-combat-demo.hbs" } };
  busy = false;
  fresh = false;
  error = "";
  onlyReady = false;
  openSections = new Set();
  selectedShip = null;
  constructor(options = {}) {
    super({ ...options, position: { width: Math.min(420, innerWidth - 40), height: Math.min(650, innerHeight - 80), top: 35, left: Math.max(20, innerWidth - 730), ...options.position } });
    if (!instance?.rendered) instance = this;
  }
  async render(options = {}) { return instance?.rendered && instance !== this ? instance.render(options) : super.render(options); }
  async _prepareContext(options) {
    const context = await super._prepareContext(options), state = game.arkflight.cardCombat.state();
    const demo = !this.fresh ? state?.guidedDemo : null, next = demo ? nextDemoStep(state) : null;
    if (next?.orders) next.orders = next.orders.map(order => ({ ...order, name: PLAYTEST_COMBAT_CARDS.find(c => c.id === order.abilityId)?.name ?? order.abilityId.replaceAll("-", " ") }));
    const running = demo?.status === "running", blocked = !running && state?.id && state.phase !== "complete";
    const selected = this.selectedShip && state?.ships[this.selectedShip] ? this.selectedShip : demo?.last.shipId ?? Object.keys(state?.ships ?? {})[0];
    const ship = demo ? state.ships[selected] : null;
    const cards = ship ? ["ap", "rp"].flatMap(deck => ship.cardDecks.hands[deck].map(id => {
      const card = PLAYTEST_COMBAT_CARDS.find(c => c.id === id), availability = cardAvailability(ship, PLAYTEST_COMBAT_CARDS, id);
      return { name: card.name, type: card.type, deck: deck.toUpperCase(), ready: availability.ok, status: availability.ok ? "Ready" : availability.readyRound ? `Ready R${availability.readyRound}` : availability.reason.replaceAll("-", " ") };
    })).filter(c => !this.onlyReady || c.ready) : [];
    return { ...context, demo, next, error: this.error, busy: this.busy, paused: game.paused, blocked, running, done: demo?.status === "complete", stopped: demo?.status === "stopped", disabled: this.busy || game.paused || blocked || Boolean(demo && !running), onlyReady: this.onlyReady,
      rounds: [1, 2, 3].map(number => ({ number, current: running && Math.min(state.round, 3) === number, complete: Boolean(demo && (state.round > number || demo.status === "complete")) })),
      nextTitle: next?.title ?? (demo ? "Test finished — review results or reset" : "Prepare the test scene and four ships"),
      nextDetail: next?.explanation ?? "Create or reset dedicated demo vessels and view their separate hex scene. Your campaign ships and current scene content are preserved. Fixed test rolls make this walkthrough repeatable.",
      ships: demo ? Object.entries(state.ships).map(([id, s]) => ({ id, name: s.cardPlay.name, selected: id === selected, ap: getOrderQueue(s).ap.remaining, rp: s.cardPlay.rp, hull: s.resources.hull.value, lifeveil: s.resources.lifeveil.value, strain: s.resources.strain.value, morale: s.resources.morale.value, supply: s.resources.supplies.value })) : [], cards,
      weapons: ship?.cardPlay.weapons.map(w => ({ ...w, status: w.readyRound <= state.round ? "Ready" : `Ready R${w.readyRound}`, ready: w.readyRound <= state.round })) ?? [],
      history: [...(demo?.history ?? [])].reverse(), last: demo?.last, checks: demo?.checks,
      round: demo ? Math.min(state.round, 3) : 1, step: demo?.step ?? 0, nextNumber: (demo?.step ?? 0) + 1 };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const section of this.element.querySelectorAll("[data-demo-details]")) {
      section.open = this.openSections.has(section.dataset.demoDetails);
      section.addEventListener("toggle", () => { if (section.open) this.openSections.add(section.dataset.demoDetails); else this.openSections.delete(section.dataset.demoDetails); });
    }
    this.element.querySelector("[data-demo-next]").addEventListener("click", () => this.act("next"));
    this.element.querySelector("[data-demo-stop]")?.addEventListener("click", () => this.act("stop"));
    this.element.querySelector("[data-demo-reset]")?.addEventListener("click", () => this.act("reset"));
    this.element.querySelector("[data-demo-reopen-hud]")?.addEventListener("click", () => game.arkflight.cardCombat.open());
    this.element.querySelector("[data-demo-ship]")?.addEventListener("change", event => { this.selectedShip = event.target.value; this.render({ force: true }); });
    this.element.querySelector("[data-demo-ready]")?.addEventListener("change", event => { this.onlyReady = event.target.checked; this.render({ force: true }); });
    this.element.querySelector("[data-demo-arcs]")?.addEventListener("click", () => { if (this.selectedShip ?? context.ships.find(s => s.selected)?.id) showCardWeaponOverlay(this.selectedShip ?? context.ships.find(s => s.selected).id); });
  }
  async act(action) {
    if (this.busy) return;
    this.busy = true; this.error = ""; await this.render({ force: true });
    try {
      const api = game.arkflight.cardCombat, before = api.state(), demo = !this.fresh && before?.guidedDemo;
      if (action === "reset") {
        if (demo?.status === "running") await api.request({ type: "demo-stop", sessionId: before.id, revision: before.revision });
        hideCardWeaponOverlay(); this.fresh = true; this.selectedShip = null;
      } else if (action === "stop") {
        await api.request({ type: "demo-stop", sessionId: before.id, revision: before.revision }); hideCardWeaponOverlay();
      } else {
        const state = await api.request(demo ? { type: "demo-next", sessionId: before.id, revision: before.revision } : { type: "demo-start" });
        this.fresh = false;
        const last = state.guidedDemo.last, upcoming = nextDemoStep(state);
        const planning = ["lock", "bonus"].includes(upcoming?.kind);
        this.selectedShip = (planning ? upcoming.shipId : last.shipId) ?? state.turnOrder[state.turnIndex] ?? Object.keys(state.ships)[0];
        if (state.guidedDemo.status === "running") {
          const hud = await api.open(); hud.selectedShipId = this.selectedShip;
          if (planning) hud.selectedFilter = "all";
          await hud.render({ force: true });
          if (!planning && ["lock", "bonus"].includes(last.kind)) hud.layoutController?.setHandMinimized(true, { automatic: true });
          if (last.kind === "movement") {
            const token = canvas.tokens.get(state.ships[last.shipId].cardPlay.tokenId);
            if (token) await canvas.animatePan({ ...(token.document?.getCenterPoint?.() ?? token.center), duration: motionPreferences().mode === "off" ? 0 : 250 });
          }
          if (last.kind === "coverage") {
            const ship = state.ships[last.shipId];
            if (last.selection.assignments) showCardFireOverlay(last.shipId, last.selection.assignments);
            else showCardWeaponOverlay(last.shipId, ship.cardPlay.weapons.find(w => w.mount === last.selection.batteryId && w.readyRound <= state.round)?.key);
          } else hideCardWeaponOverlay();
        } else hideCardWeaponOverlay();
      }
    } catch (error) { this.error = error.message; }
    finally { this.busy = false; if (this.rendered) await this.render({ force: true }); }
  }
  async close(options = {}) { hideCardWeaponOverlay(); return super.close(options); }
}
Hooks.once("init", () => game.settings.registerMenu("arkflight-game", "guidedCombatDemo", { name: "Guided Combat Test", label: "Open 3-Round Test", hint: "GM-only combat walkthrough. You click Next Step for each action.", icon: "fa-solid fa-flask", type: GuidedCombatDemoWindow, restricted: true }));
Hooks.once("ready", () => {
  game.arkflight.cardCombat = Object.freeze({ ...game.arkflight.cardCombat, async openGuidedDemo() {
    if (!game.user.isGM) throw new Error("Only the GM may run the guided test.");
    instance ??= new GuidedCombatDemoWindow();
    await instance.render({ force: true }); if (instance.minimized) await instance.maximize(); return instance;
  } });
});
Hooks.on("arkflightCardCombatChanged", () => { if (instance?.rendered) void instance.render({ force: true }); });
Hooks.on("pauseGame", () => { if (instance?.rendered) void instance.render({ force: true }); });
