import { ALPHA_HULLS, ALPHA_UPGRADES, ALPHA_TALENTS } from "../alpha/hulls.js";
import { validateLibraryDeck } from "../alpha/ship-library.js";
import { alphaCardArt } from "./alpha-combat-ui.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
let instance;
export class AlphaShipLibraryWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { id: "arkflight-alpha-library", classes: ["arkflight-alpha-combat", "arkflight-alpha-library"], window: { title: "Arkflight — Ship Library & Decks", icon: "fa-solid fa-book-open", resizable: true }, position: { width: 620, height: 660 } };
  static PARTS = { main: { template: "modules/arkflight-game/templates/alpha-ship-library.hbs" } };
  actorId = null; loadoutId = null; draft = null; baseRevision = null; configDraft = null; dirty = false; configDirty = false; busy = false; error = ""; search = "";
  constructor(options = {}) { super({ ...options, position: { width: Math.min(620, innerWidth - 32), height: Math.min(660, innerHeight - 70), ...options.position } }); }
  resetDraft() { this.draft = null; this.configDraft = null; this.baseRevision = null; this.dirty = false; this.configDirty = false; }
  async _prepareContext(options) {
    const base = await super._prepareContext(options), api = game.arkflight.alphaCombat.library, ships = api.ships();
    if (!ships.some(s => s.id === this.actorId)) { this.actorId = ships[0]?.id ?? null; this.loadoutId = null; this.resetDraft(); }
    if (!this.actorId) return { ...base, ships: [], error: this.error, gm: game.user.isGM };
    let view;
    try { view = api.view(this.actorId); } catch (error) { return { ...base, ships: ships.map(s => ({ ...s, selected: s.id === this.actorId })), error: error.message, gm: game.user.isGM }; }
    this.loadoutId ??= view.activeLoadoutId;
    const saved = view.loadouts.find(d => d.id === this.loadoutId) ?? view.loadouts[0];
    this.loadoutId = saved.id;
    if (!this.draft || !this.dirty && !this.configDirty && this.baseRevision !== view.revision) {
      this.draft = { id: saved.id, name: saved.name, cards: [...saved.cards] };
      this.baseRevision = view.revision; this.configDraft = structuredClone(view.config);
    }
    const stale = this.baseRevision !== view.revision, locked = Boolean(view.locked), editable = view.initialized && !locked && !stale && !this.busy;
    const issues = validateLibraryDeck(view, this.draft), counts = new Map();
    for (const id of this.draft.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
    const unavailable = [...counts].filter(([id]) => !view.learned.includes(id) || !view.catalog.some(c => c.id === id)).map(([id, count]) => ({ id, count }));
    const catalog = view.catalog.filter(c => c.name.toLowerCase().includes(this.search.toLowerCase())).map(c => ({ ...c, learned: view.learned.includes(c.id), count: counts.get(c.id) ?? 0, max: c.unique ? 1 : 2, art: alphaCardArt(c), editable: editable && view.learned.includes(c.id) }));
    return { ...base, view, ships: ships.map(s => ({ ...s, selected: s.id === this.actorId })), gm: game.user.isGM, error: this.error, busy: this.busy, stale, editable, dirty: this.dirty || this.configDirty, locked, draft: this.draft, count: this.draft.cards.length, issues, unavailable, search: this.search, catalog,
      canInitialize: game.user.isGM && !view.initialized && !locked && !this.busy,
      canSaveDeck: editable && !this.configDirty, canRefit: editable && !this.dirty,
      canSelect: editable && !this.dirty && !this.configDirty && issues.length === 0 && saved.id !== view.activeLoadoutId,
      canGrant: game.user.isGM && editable && !this.dirty && !this.configDirty, config: this.configDraft,
      loadouts: view.loadouts.map(d => ({ ...d, selected: d.id === saved.id, invalid: d.issues.length > 0 })),
      hulls: Object.values(ALPHA_HULLS).map(h => ({ ...h, selected: h.id === this.configDraft.hullId })),
      upgrades: Object.entries(ALPHA_UPGRADES).map(([id, item]) => ({ id, ...item, checked: this.configDraft.upgrades.includes(id) })),
      talents: Object.entries(ALPHA_TALENTS).map(([id, item]) => ({ id, ...item, checked: this.configDraft.talents.includes(id) })) };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    root.querySelector("[data-library-ship]")?.addEventListener("change", e => { this.actorId = e.target.value; this.loadoutId = null; this.resetDraft(); this.error = ""; void this.render({ force: true }); });
    root.querySelector("[data-library-loadout]")?.addEventListener("change", e => { this.loadoutId = e.target.value; this.resetDraft(); this.error = ""; void this.render({ force: true }); });
    root.querySelector("[data-library-name]")?.addEventListener("input", e => { this.draft.name = e.target.value; this.dirty = true; });
    root.querySelector("[data-library-name]")?.addEventListener("change", () => void this.render({ force: true }));
    root.querySelector("[data-library-search]")?.addEventListener("change", e => { this.search = e.target.value; void this.render({ force: true }); });
    for (const input of root.querySelectorAll("[data-library-count]")) input.addEventListener("change", e => {
      const id = e.target.dataset.libraryCount, n = Number(e.target.value);
      if (!Number.isInteger(n) || n < 0 || n > 2) { e.target.value = this.draft.cards.filter(c => c === id).length; return; }
      this.draft.cards = [...this.draft.cards.filter(c => c !== id), ...Array(n).fill(id)]; this.dirty = true; void this.render({ force: true });
    });
    for (const input of root.querySelectorAll("[data-library-config]")) input.addEventListener("change", e => { const key = e.target.dataset.libraryConfig; this.configDraft[key] = key === "level" ? Number(e.target.value) : e.target.value; this.configDirty = true; void this.render({force:true}); });
    for (const input of root.querySelectorAll("[data-library-fitting]")) input.addEventListener("change", e => { const key = e.target.dataset.libraryFitting; this.configDraft[key] = [...root.querySelectorAll(`[data-library-fitting="${key}"]:checked`)].map(i => i.value); this.configDirty = true; void this.render({force:true}); });
    for (const button of root.querySelectorAll("[data-library-action]")) button.addEventListener("click", () => void this.act(button.dataset.libraryAction, button.dataset));
  }
  async act(action, data = {}) {
    if (this.busy) return;
    if (action === "reload") { this.resetDraft(); this.error = ""; await this.render({ force: true }); return; }
    if (action === "remove-unavailable") { this.draft.cards = this.draft.cards.filter(id => id !== data.cardId); this.dirty = true; await this.render({ force: true }); return; }
    if (action === "minimize") { await this.minimize(); return; }
    this.busy = true; this.error = ""; await this.render({ force: true });
    try {
      if ((["grant", "remove", "refit"].includes(action) && this.dirty) || (["save", "select", "grant", "remove"].includes(action) && this.configDirty)) throw new Error("Save or reload your current draft before this operation.");
      const command = { actorId: this.actorId, libraryRevision: this.baseRevision };
      if (action === "initialize") command.type = "library-initialize";
      else if (action === "save") Object.assign(command, { type: "library-save", loadoutId: this.loadoutId, name: this.draft.name, cards: [...this.draft.cards] });
      else if (action === "select") Object.assign(command, { type: "library-select", loadoutId: this.loadoutId });
      else if (["grant", "remove"].includes(action)) Object.assign(command, { type: `library-${action}`, cardId: data.cardId });
      else if (action === "refit") Object.assign(command, { type: "library-refit", config: structuredClone(this.configDraft) });
      else throw new Error("Unknown library action.");
      await game.arkflight.alphaCombat.request(command);
      this.resetDraft();
    } catch (error) { this.error = error.message; }
    finally { this.busy = false; if (this.rendered) await this.render({ force: true }); }
  }
}
Hooks.once("init", () => game.settings.registerMenu("arkflight-game", "alphaLibraryWindow", { name: "Arkflight Ship Library", label: "Open Ship Library", hint: "Learned cards and three saved combat loadouts.", icon: "fa-solid fa-book-open", type: AlphaShipLibraryWindow, restricted: false }));
Hooks.once("ready", () => {
  const api = game.arkflight.alphaCombat, descriptors = Object.getOwnPropertyDescriptors(api);
  descriptors.library = { value: Object.freeze({ ...api.library, async open(actorId) {
    instance ??= new AlphaShipLibraryWindow();
    if (actorId && actorId !== instance.actorId) { instance.actorId = actorId; instance.loadoutId = null; instance.resetDraft(); }
    await instance.render({ force: true }); if (instance.minimized) await instance.maximize(); instance.bringToFront(); return instance;
  } }), enumerable: true };
  game.arkflight.alphaCombat = Object.freeze(Object.defineProperties({}, descriptors));
});
Hooks.on("arkflightAlphaChanged", () => { if (instance?.rendered && !instance.busy) void instance.render({ force: true }); });
