import { SHIP_COMPLICATION_CARDS, COMPLICATION_SCENARIOS } from "../content/ship-complications.js";
import { complicationChoiceOptions } from "../combat/ship-complications.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
function optionLabels(outcome) {
  return outcome?.effect.kind === "choice" ? outcome.effect.options.map(option => option.label) : [];
}
let instance;
export class ShipComplicationLabWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "arkflight-complication-lab", classes: ["arkflight-complication-lab"],
    window: { title: "Arkflight — Ship Complication Lab", icon: "fa-solid fa-layer-group", resizable: true },
    position: { width: 510, height: 640 }
  };
  static PARTS = { main: { template: "modules/arkflight-game/templates/ship-complication-lab.hbs" } };
  scenario = "impact";
  degree = -1;
  browseId = "";
  busy = false;
  message = "";
  error = "";
  showFull = false;
  constructor(options = {}) {
    super({ ...options, position: { width: Math.min(510, globalThis.innerWidth - 40), height: Math.min(640, globalThis.innerHeight - 80), ...options.position } });
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options), state = game.arkflight.complications.state();
    const receipt = state?.history.at(-1), card = SHIP_COMPLICATION_CARDS.find(c => c.id === (this.browseId || receipt?.cardId));
    const scenario = this.browseId ? this.scenario : receipt?.scenario ?? this.scenario;
    const outcome = card?.entries[scenario];
    return {
      ...context, state, busy: this.busy, message: this.message, error: this.error, showFull: this.showFull,
      drawCount: state?.drawPile.length ?? 24, discardCount: state?.discardPile.length ?? 0,
      scenarios: Object.entries(COMPLICATION_SCENARIOS).map(([id, name]) => ({ id, name, selected: id === this.scenario })),
      degrees: [{ value: -1, name: "Critical failure" }, { value: 0, name: "Failure — no draw" }, { value: 1, name: "Success — no draw" }, { value: 2, name: "Critical success — no draw" }].map(d => ({ ...d, selected: d.value === this.degree })),
      catalog: SHIP_COMPLICATION_CARDS.map(c => ({ id: c.id, name: c.name, selected: c.id === this.browseId })),
      card: card && { name: card.name, scenario: COMPLICATION_SCENARIOS[scenario], title: !this.browseId && receipt?.fallback ? receipt.title : outcome.title, text: !this.browseId && receipt?.fallback ? receipt.text : outcome.text,
        options: optionLabels(outcome),
        entries: Object.entries(card.entries).map(([key, e]) => ({ scenario: COMPLICATION_SCENARIOS[key], selected: key === scenario, title: e.title, text: e.text, options: optionLabels(e) })) },
      resources: state?.ships[0] ? Object.entries(state.ships[0].resources).map(([name, track]) => ({ name, ...track })) : [],
      opponentAP: state?.ships[1]?.ap ?? 4,
      choices: (state?.choices ?? []).filter(c => c.status === "pending").map(c => ({ id: c.id, options: complicationChoiceOptions(state, c.id) })),
      effects: (state?.effects ?? []).map(e => ({ ...e, scheduled: e.notBeforeRound > state.round, isOpportunity: e.kind === "opportunity", active: e.notBeforeRound <= state.round, label: `${e.kind}: ${e.rule ?? e.stat}${e.batteryId ? ` · ${e.batteryId}` : ""}`, claimed: Boolean(e.claimedBy) })),
      history: (state?.history ?? []).slice(-8).reverse().map(r => ({ name: r.name, scenario: COMPLICATION_SCENARIOS[r.scenario], round: r.round, selectedOption: r.selectedOption, changes: r.resourceChanges.map(c => `${c.track}: ${c.before} → ${c.after}`).join(" · ") }))
    };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("[data-lab-scenario]")?.addEventListener("change", event => { this.scenario = event.target.value; void this.render({ force: true }); });
    this.element.querySelector("[data-lab-degree]")?.addEventListener("change", event => { this.degree = Number(event.target.value); });
    this.element.querySelector("[data-lab-browse]")?.addEventListener("change", event => { this.browseId = event.target.value; void this.render({ force: true }); });
    this.element.querySelector("[data-lab-full]")?.addEventListener("toggle", event => { this.showFull = event.target.open; });
    this.element.querySelector("[data-lab-minimize]")?.addEventListener("click", () => this.minimize());
    for (const button of this.element.querySelectorAll("[data-lab-command]")) button.addEventListener("click", () => this.act(button.dataset.labCommand, button.dataset));
  }
  async act(type, data = {}) {
    if (this.busy) return;
    this.busy = true; this.error = ""; this.message = "";
    await this.render({ force: true });
    try {
      const api = game.arkflight.complications, state = api.state();
      const result = await api.request({ type, encounterId: state?.id, revision: state?.revision, scenario: this.scenario, degree: this.degree, choiceId: data.choiceId, optionId: data.optionId, effectId: data.effectId });
      if (type === "resolve") {
        this.browseId = "";
        this.message = result.receipt.drawn ? `${result.receipt.name} · ${COMPLICATION_SCENARIOS[result.receipt.scenario]}` : "No complication drawn. Only a critical failure draws.";
      } else if (type === "reset") { this.browseId = ""; this.message = "Fresh sample ships and shuffled deck."; }
      else if (type === "exploit") this.message = "Sparring Cutter spent 1 AP to claim this one-use opportunity.";
      else if (type === "consume") this.message = "Simulated the matching action and cleared its one-use effect.";
    } catch (error) { this.error = error.message; }
    finally { this.busy = false; if (this.rendered) await this.render({ force: true }); }
  }
}
Hooks.once("init", () => game.settings.registerMenu("arkflight-game", "shipComplicationLabWindow", {
  name: "Ship Complication Lab", label: "Open Complication Lab", hint: "Inspect 24 draft cards and test six scenarios with sample ships.",
  icon: "fa-solid fa-layer-group", type: ShipComplicationLabWindow, restricted: true
}));
Hooks.once("ready", () => {
  game.arkflight.complications = Object.freeze({ ...game.arkflight.complications, async open() {
    if (!game.user.isGM) throw new Error("Only the GM may use the Complication Lab.");
    const api = game.arkflight.complications;
    if (!api.state()) await api.request({ type: "reset" });
    instance ??= new ShipComplicationLabWindow();
    await instance.render({ force: true });
    if (instance.minimized) await instance.maximize();
    instance.bringToFront();
    return instance;
  } });
});
