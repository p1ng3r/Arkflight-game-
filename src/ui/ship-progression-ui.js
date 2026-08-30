import { deriveShip, syncResourceMaxima } from "../ship/derive-ship.js";
import { progressionView, clampShipLevel, validateProgression } from "../ship/progression.js";
import { shipModSlotClass, shipModSlotRows } from "../ship/ship-mod-slots.js";
import { hullCombatProfile } from "../combat/combat-schema.js";
import { SHIP_TALENT_TIERS, SHIP_TALENTS } from "../content/ship-talents.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { CREW_EDGE_HAND_MAX } from "../content/crew-edge-cards.js";

const MODULE_ID = "arkflight-game";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

const TIER_ICONS = Object.freeze({
  foundation: "fa-solid fa-compass-drafting",
  specialist: "fa-solid fa-star-of-life",
  legendary: "fa-solid fa-crown",
  mythic: "fa-solid fa-sparkles"
});

const FILTERS = Object.freeze([
  { id: "all", label: "All", iconClass: "fa-solid fa-border-all" },
  { id: "station", label: "Station", iconClass: "fa-solid fa-users-gear" },
  { id: "voyage", label: "Voyage", iconClass: "fa-solid fa-route" },
  { id: "combat", label: "Combat", iconClass: "fa-solid fa-crosshairs" },
  { id: "durability", label: "Durability", iconClass: "fa-solid fa-shield-halved" },
  { id: "movement", label: "Movement", iconClass: "fa-solid fa-wind" },
  { id: "arkcraft", label: "Arkcraft", iconClass: "fa-solid fa-wand-sparkles" },
  { id: "tactics", label: "Tactics", iconClass: "fa-solid fa-chess-knight" },
  { id: "mod-slots", label: "Mod Slots", iconClass: "fa-solid fa-gears" },
  { id: "repair", label: "Repair", iconClass: "fa-solid fa-hammer" }
]);

const CATEGORY_ICON = Object.freeze({
  station: "fa-solid fa-users-gear",
  voyage: "fa-solid fa-route",
  combat: "fa-solid fa-crosshairs",
  durability: "fa-solid fa-shield-halved",
  movement: "fa-solid fa-wind",
  arkcraft: "fa-solid fa-wand-sparkles",
  tactics: "fa-solid fa-chess-knight",
  "mod-slots": "fa-solid fa-gears",
  repair: "fa-solid fa-hammer",
  utility: "fa-solid fa-toolbox"
});

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function isShip(actor) { return actor?.type === "vehicle" && (actor?.flags?.[MODULE_ID]?.isArkflightShip === true || Boolean(shipFlag(actor))); }
function signed(value) { const n = Number(value || 0); return `${n >= 0 ? "+" : ""}${n}`; }
function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

function talentCategory(talent) {
  const effects = talent?.effects ?? [];
  if (effects.some((effect) => ["unlockArkcraft", "upgradeArkcraft"].includes(effect.mode)) || /arkcraft/i.test(talent.name)) return "arkcraft";
  if (effects.some((effect) => effect.mode === "modSlot") || /refit|mod slot|bay|mount/i.test(`${talent.name} ${talent.description}`)) return "mod-slots";
  if (effects.some((effect) => effect.target === "crewTacticCapacity")) return "tactics";
  if (effects.some((effect) => ["combatSpeed", "maneuverability"].includes(effect.target))) return "movement";
  if (effects.some((effect) => effect.mode === "stationBonus")) return "station";
  if (effects.some((effect) => effect.mode === "pillarBonus" && effect.pillar === "voyage")) return "voyage";
  if (effects.some((effect) => effect.mode === "pillarBonus" && effect.pillar === "combat")) return "combat";
  if (effects.some((effect) => ["armorClass", "weaponAttackBonus", "actionBonus", "reactionBonus"].includes(effect.target))) return "combat";
  if (effects.some((effect) => ["hullIntegrity", "lifeveilCapacity", "hardness", "strainCapacity", "moraleCapacity"].includes(effect.target))) return "durability";
  if (effects.some((effect) => /repair/i.test(effect.target ?? ""))) return "repair";
  return "utility";
}

function talentFlavor(talent) {
  const category = talentCategory(talent);
  const flavor = {
    station: "The crew drills this station until ship and officer answer as one.",
    voyage: "Charts, routines, and practiced instincts turn hard passages into familiar work.",
    combat: "The vessel is tuned for moments when hesitation is measured in splinters and fire.",
    durability: "Shipwrights reinforce the vessel where strain and the Void most often collect their due.",
    movement: "The riggers recut control runs and rebalance the vessel so the helm answers faster and cleaner.",
    arkcraft: "The crew inscribes a deeper Arkflight technique into the vessel's working tradition.",
    tactics: "Codified maneuvers and battle drills expand the crew's shared tactical repertoire.",
    "mod-slots": "The shipwright opens new housings, hardpoints, and service channels for future refits.",
    repair: "Tool discipline, spare planning, and practiced crews make damage easier to put right.",
    utility: "A practical refinement gives the vessel more room to do its work well."
  };
  return flavor[category] ?? flavor.utility;
}

function talentInPlay(talent) {
  const category = talentCategory(talent);
  const text = {
    station: "This bonus follows the named station wherever Arkflight asks that station to roll, including Voyage and Ship Combat.",
    voyage: "Every station benefits during Voyage Events, and this stacks with station-specific ship bonuses.",
    combat: "This changes the vessel's tactical numbers or combat economy directly; it is visible whenever Ship Combat uses that statistic.",
    durability: "This increases the ship's persistent capacity or resistance; percentage increases are calculated from the chassis base value.",
    movement: "This changes the ship's operating envelope in tactical movement. Maneuverability also governs facing control.",
    arkcraft: "This expands or improves the once-per-Event Arkcraft choices available during Crew Muster.",
    tactics: "This increases how many shared Crew Tactics the crew can carry and use as earned opportunities.",
    "mod-slots": "This changes the physical refit space available to the ship. Typed slots only support Mods of the matching identity unless a Flexible slot is used.",
    repair: "This applies during persistent ship repair and maintenance rather than ordinary PF2e character healing.",
    utility: "The effect is applied directly to the persistent vessel and is included whenever Arkflight derives the ship."
  };
  return text[category] ?? text.utility;
}

function talentRows(ship, selectedTalentId) {
  const view = progressionView(ship);
  return Object.values(SHIP_TALENT_TIERS).map((tier) => ({
    ...tier,
    iconClass: TIER_ICONS[tier.id] ?? "fa-solid fa-star",
    active: view.level >= tier.minLevel,
    talents: view.talents.filter((talent) => talent.tier === tier.id).map((talent) => {
      const category = talentCategory(talent);
      return {
        ...talent,
        category,
        categoryLabel: FILTERS.find((entry) => entry.id === category)?.label ?? titleCase(category),
        iconClass: CATEGORY_ICON[category] ?? CATEGORY_ICON.utility,
        selected: talent.id === selectedTalentId,
        searchText: `${talent.name} ${talent.description} ${category}`.toLowerCase(),
        canBuy: !talent.owned && !talent.locked && view.available >= talent.cost,
        canRemove: talent.owned,
        stateLabel: talent.owned ? "OWNED" : talent.locked ? `LEVEL ${tier.minLevel}` : view.available < talent.cost ? "NEED TP" : "BUY"
      };
    })
  }));
}

function statSnapshot(ship) {
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const stats = derived.stats ?? {};
  const profile = hullCombatProfile(ship);
  const station = stats.stationBonuses ?? {};
  const pillar = stats.pillarBonuses ?? {};
  const snapshot = {
    armorClass: Number(stats.armorClass ?? 0),
    hullIntegrity: Number(stats.hullIntegrity ?? 0),
    lifeveilCapacity: Number(stats.lifeveilCapacity ?? 0),
    combatSpeed: Number(stats.combatSpeed ?? 0),
    maneuverability: Number(stats.maneuverability ?? 0),
    strainCapacity: Number(stats.strainCapacity ?? 0),
    hardness: Number(stats.hardness ?? 0),
    weaponAttackBonus: Number(stats.weaponAttackBonus ?? 0),
    actions: Number(profile.actions ?? 0),
    reactions: Number(profile.reactions ?? 0),
    crewTactics: Number(CREW_EDGE_HAND_MAX) + Number(stats.crewTacticCapacity ?? 0),
    cargoCapacity: Number(stats.cargoCapacity ?? 0),
    supplyCapacity: Number(stats.supplyCapacity ?? 0),
    moraleCapacity: Number(stats.moraleCapacity ?? ship.resources?.morale?.max ?? 0),
    arkengineModCapacity: Number(stats.arkengineModCapacity ?? 0),
    shipModCapacity: Number(stats.shipModCapacity ?? 0),
    station: {},
    slots: Object.fromEntries(shipModSlotRows(ship, SHIP_CATALOGS, derived).map((row) => [row.id, { used: row.used, max: row.max }]))
  };
  for (const id of ["captain", "engineer", "navigator", "battlewatch", "veilwarden"]) {
    const base = Number(station[id] || 0) + Number(stats.allStationBonus || 0);
    snapshot.station[id] = { base, voyage: base + Number(pillar.voyage || 0), combat: base + Number(pillar.combat || 0) };
  }
  return { derived, stats, snapshot };
}

function statPreview(derivedData, ship, highlightKeys = new Set()) {
  const { derived, stats, snapshot } = derivedData;
  const slotIcons = {
    generic: "fa-solid fa-boxes-stacked", weapon: "fa-solid fa-crosshairs", structural: "fa-solid fa-shield-halved",
    rigging: "fa-solid fa-wind", lifeveil: "fa-solid fa-circle-nodes", support: "fa-solid fa-box-open",
    utility: "fa-solid fa-screwdriver-wrench", flexible: "fa-solid fa-arrows-rotate"
  };
  const currentHull = Number(ship.resources?.hull?.value ?? snapshot.hullIntegrity);
  const currentLifeveil = Number(ship.resources?.lifeveil?.value ?? snapshot.lifeveilCapacity);
  const core = [
    { key: "hullIntegrity", label: "Hull", value: `${currentHull} / ${snapshot.hullIntegrity}`, iconClass: "fa-solid fa-shield" },
    { key: "lifeveilCapacity", label: "Lifeveil", value: `${currentLifeveil} / ${snapshot.lifeveilCapacity}`, iconClass: "fa-solid fa-circle-nodes" },
    { key: "armorClass", label: "AC", value: snapshot.armorClass, iconClass: "fa-solid fa-shield-halved" },
    { key: "hardness", label: "Hardness", value: snapshot.hardness, iconClass: "fa-solid fa-cube" },
    { key: "combatSpeed", label: "Speed", value: snapshot.combatSpeed, iconClass: "fa-solid fa-gauge-high" },
    { key: "maneuverability", label: "Maneuverability", value: snapshot.maneuverability, iconClass: "fa-solid fa-wind" },
    { key: "strainCapacity", label: "Strain Limit", value: snapshot.strainCapacity, iconClass: "fa-solid fa-bolt" },
    { key: "actions", label: "Actions", value: snapshot.actions, iconClass: "fa-solid fa-play" },
    { key: "reactions", label: "Reactions", value: snapshot.reactions, iconClass: "fa-solid fa-reply" },
    { key: "crewTactics", label: "Crew Tactics", value: snapshot.crewTactics, iconClass: "fa-solid fa-chess-knight" }
  ].map((row) => ({ ...row, highlight: highlightKeys.has(row.key), breakdown: `Derived from chassis, installed components, Mods, condition, and purchased Talents. Current derived ${row.label}: ${row.value}.` }));

  const slots = shipModSlotRows(ship, SHIP_CATALOGS, derived)
    .filter((row) => row.id === "generic" || row.max > 0 || row.used > 0)
    .map((row) => ({ id: row.id, label: row.label, value: `${row.used} / ${row.max}`, iconClass: slotIcons[row.id] ?? "fa-solid fa-gear" }));

  const identities = [
    { label: "Voyage", value: signed(stats.pillarBonuses?.voyage), iconClass: "fa-solid fa-route" },
    { label: "Combat", value: signed(stats.pillarBonuses?.combat), iconClass: "fa-solid fa-crosshairs" },
    { label: "Maneuverability", value: snapshot.maneuverability, iconClass: "fa-solid fa-wind" },
    { label: "Lifeveil", value: snapshot.lifeveilCapacity, iconClass: "fa-solid fa-circle-nodes" }
  ];

  return {
    core,
    stations: Object.entries(snapshot.station).map(([id, value]) => ({ id, label: titleCase(id), base: signed(value.base), voyage: signed(value.voyage), combat: signed(value.combat) })),
    slots,
    identity: identities
  };
}

function simulatedShip(ship, talentId) {
  const copy = structuredClone(ship);
  copy.progression ??= { level: 1, talentIds: [], arkcraftUpgrades: {} };
  const ids = new Set(copy.progression.talentIds ?? []);
  if (ids.has(talentId)) ids.delete(talentId); else ids.add(talentId);
  copy.progression.talentIds = [...ids];
  return copy;
}

function changeRows(current, next) {
  const labels = {
    armorClass: "Armor Class", hullIntegrity: "Hull Maximum", lifeveilCapacity: "Lifeveil Maximum", combatSpeed: "Speed",
    maneuverability: "Maneuverability", strainCapacity: "Strain Limit", hardness: "Hardness", weaponAttackBonus: "Weapon Attack",
    actions: "Actions / Round", reactions: "Reactions / Round", crewTactics: "Crew Tactics", cargoCapacity: "Cargo Capacity",
    supplyCapacity: "Supply Capacity", moraleCapacity: "Morale Maximum", arkengineModCapacity: "Arkengine Mod Capacity", shipModCapacity: "Ship Mod Capacity"
  };
  const rows = [];
  for (const [key, label] of Object.entries(labels)) {
    if (Number(current[key] ?? 0) !== Number(next[key] ?? 0)) rows.push({ key, label, before: current[key], after: next[key] });
  }
  for (const id of ["captain", "engineer", "navigator", "battlewatch", "veilwarden"]) {
    for (const mode of ["base", "voyage", "combat"]) {
      const before = Number(current.station?.[id]?.[mode] ?? 0);
      const after = Number(next.station?.[id]?.[mode] ?? 0);
      if (before !== after) rows.push({ key: `station.${id}.${mode}`, label: `${titleCase(id)} ${titleCase(mode)}`, before: signed(before), after: signed(after) });
    }
  }
  for (const id of new Set([...Object.keys(current.slots ?? {}), ...Object.keys(next.slots ?? {})])) {
    const before = current.slots?.[id]?.max ?? 0;
    const after = next.slots?.[id]?.max ?? 0;
    if (before !== after) rows.push({ key: `slot.${id}`, label: `${titleCase(id)} Mod Slots`, before, after });
  }
  return rows;
}

function effectText(talent) {
  return (talent?.effects ?? []).map((effect) => {
    if (effect.mode === "unlockArkcraft") return `Unlock ${effect.ids?.length ?? 1} ${titleCase(effect.station)} Arkcraft Skill.`;
    if (effect.mode === "upgradeArkcraft") return `Upgrade ${effect.ids?.length ?? 1} ${titleCase(effect.station)} Arkcraft Skill.`;
    if (effect.mode === "modSlot") return `Gain ${signed(effect.value ?? 1)} ${titleCase(effect.slotType)} Mod slot.`;
    if (effect.mode === "stationBonus") return `${signed(effect.value)} to ${titleCase(effect.station)} station rolls.`;
    if (effect.mode === "pillarBonus") return `${signed(effect.value)} to all ${titleCase(effect.pillar)} station rolls.`;
    if (effect.mode === "percentBase") return `${signed(effect.value)}% of base ${titleCase(effect.target)}.`;
    if (effect.mode === "add") return `${signed(effect.value)} ${titleCase(effect.target)}.`;
    return talent.description;
  }).join(" ") || talent?.description || "";
}

function selectionPreview(ship, talentId) {
  const talent = SHIP_TALENTS[talentId];
  if (!talent) return null;
  const currentView = progressionView(ship);
  const owned = Boolean(ship.progression?.talentIds?.includes(talentId));
  const proposed = simulatedShip(ship, talentId);
  const currentData = statSnapshot(ship);
  const nextData = statSnapshot(proposed);
  const changes = changeRows(currentData.snapshot, nextData.snapshot);
  const category = talentCategory(talent);
  const pointsAfter = owned ? currentView.available + Number(talent.cost || 0) : currentView.available - Number(talent.cost || 0);
  return {
    ...talent,
    owned,
    category,
    iconClass: CATEGORY_ICON[category] ?? CATEGORY_ICON.utility,
    flavor: talentFlavor(talent),
    inPlay: talentInPlay(talent),
    effectText: effectText(talent),
    changes,
    pointsBefore: currentView.available,
    pointsAfter,
    canBuy: owned || (!currentView.talents.find((entry) => entry.id === talentId)?.locked && pointsAfter >= 0)
  };
}

export class ArkflightShipProgressionApp extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-ship-progression",
    classes: ["arkflight", "arkflight-ship-progression"],
    position: { width: 1460, height: 900 },
    window: { title: "Arkflight Ship Progression", icon: "fa-solid fa-star" }
  };

  static PARTS = { main: { template: "modules/arkflight-game/templates/ship/ship-progression.hbs" } };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.selectedTalentId = null;
    this.tierFilter = "all";
    this.categoryFilter = "all";
    this.searchTerm = "";
  }

  _defaultSelection(ship) {
    if (this.selectedTalentId && SHIP_TALENTS[this.selectedTalentId]) return this.selectedTalentId;
    const view = progressionView(ship);
    const preferred = view.talents.find((talent) => !talent.owned && !talent.locked && view.available >= talent.cost)
      ?? view.talents.find((talent) => talent.owned)
      ?? view.talents.find((talent) => !talent.locked)
      ?? view.talents[0];
    return preferred?.id ?? null;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ship = shipFlag(this.actor);
    this.selectedTalentId = this._defaultSelection(ship);
    const progression = progressionView(ship);
    const selection = this.selectedTalentId ? selectionPreview(ship, this.selectedTalentId) : null;
    const changedKeys = new Set(selection?.changes?.map((row) => row.key) ?? []);
    const currentData = statSnapshot(ship);
    return {
      ...context,
      actor: this.actor,
      isGM: game.user.isGM,
      canSpend: this.actor?.isOwner || game.user.isGM,
      progression: {
        ...progression,
        levelPercent: Math.max(5, Math.round((progression.level / 20) * 100)),
        nextLevel: progression.level < 20 ? progression.level + 1 : null
      },
      tiers: talentRows(ship, this.selectedTalentId),
      filters: FILTERS,
      preview: statPreview(currentData, ship, changedKeys),
      selection,
      selectedCount: ship?.progression?.talentIds?.length ?? 0
    };
  }

  _applyClientFilters(root) {
    const search = this.searchTerm.trim().toLowerCase();
    let visible = 0;
    for (const card of root.querySelectorAll("[data-talent-card]")) {
      const tierMatch = this.tierFilter === "all" || card.dataset.tier === this.tierFilter;
      const categoryMatch = this.categoryFilter === "all" || card.dataset.category === this.categoryFilter;
      const searchMatch = !search || String(card.dataset.search ?? "").includes(search);
      const show = tierMatch && categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    }
    for (const section of root.querySelectorAll("[data-tier-section]")) {
      const hasVisible = [...section.querySelectorAll("[data-talent-card]")].some((card) => !card.hidden);
      section.hidden = !hasVisible;
    }
    const empty = root.querySelector("[data-no-talents]");
    if (empty) empty.hidden = visible > 0;
    for (const button of root.querySelectorAll("[data-tier-filter]")) button.classList.toggle("is-filtered", this.tierFilter === button.dataset.tierFilter);
    for (const button of root.querySelectorAll("[data-category-filter]")) button.classList.toggle("is-filtered", this.categoryFilter === button.dataset.categoryFilter);
  }

  async _toggleTalent(id) {
    if (!(this.actor?.isOwner || game.user.isGM)) return;
    const ship = structuredClone(shipFlag(this.actor));
    ship.progression ??= { level: 1, talentIds: [], arkcraftUpgrades: {} };
    const ids = new Set(ship.progression.talentIds ?? []);
    if (ids.has(id)) ids.delete(id); else ids.add(id);
    ship.progression.talentIds = [...ids];
    const check = validateProgression(ship);
    if (!check.ok) { ui.notifications?.warn(check.errors.join(" ")); return; }
    this.selectedTalentId = id;
    await this._saveShip(ship);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    this._applyClientFilters(root);

    root.querySelector("[data-ship-level]")?.addEventListener("change", async (event) => {
      if (!game.user.isGM) return;
      const ship = structuredClone(shipFlag(this.actor));
      ship.progression ??= { level: 1, talentIds: [], arkcraftUpgrades: {} };
      ship.progression.level = clampShipLevel(event.currentTarget.value);
      const check = validateProgression(ship);
      if (!check.ok) {
        ui.notifications?.warn(`Cannot lower ship level: ${check.errors.join(" ")}`);
        this.render({ force: true });
        return;
      }
      await this._saveShip(ship);
    });

    for (const button of root.querySelectorAll("[data-preview-talent]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation();
        this.selectedTalentId = event.currentTarget.dataset.previewTalent;
        this.render({ force: true });
      });
    }
    for (const card of root.querySelectorAll("[data-talent-card]")) {
      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        this.selectedTalentId = card.dataset.talentCard;
        this.render({ force: true });
      });
    }
    for (const button of root.querySelectorAll("[data-buy-talent]")) {
      button.addEventListener("click", async (event) => {
        event.preventDefault(); event.stopPropagation();
        await this._toggleTalent(event.currentTarget.dataset.buyTalent);
      });
    }
    root.querySelector("[data-toggle-selected-talent]")?.addEventListener("click", async (event) => {
      event.preventDefault();
      if (this.selectedTalentId) await this._toggleTalent(this.selectedTalentId);
    });
    root.querySelector("[data-clear-talent-preview]")?.addEventListener("click", (event) => {
      event.preventDefault();
      this.selectedTalentId = null;
      this.render({ force: true });
    });

    for (const button of root.querySelectorAll("[data-tier-filter]")) {
      button.addEventListener("click", () => {
        this.tierFilter = this.tierFilter === button.dataset.tierFilter ? "all" : button.dataset.tierFilter;
        this._applyClientFilters(root);
      });
    }
    for (const button of root.querySelectorAll("[data-category-filter]")) {
      button.addEventListener("click", () => {
        this.categoryFilter = button.dataset.categoryFilter;
        this._applyClientFilters(root);
      });
    }
    const search = root.querySelector("[data-talent-search]");
    if (search) {
      search.value = this.searchTerm;
      search.addEventListener("input", () => { this.searchTerm = search.value; this._applyClientFilters(root); });
    }
  }

  async _saveShip(ship) {
    const derived = deriveShip(ship, SHIP_CATALOGS);
    const saved = syncResourceMaxima(ship, derived);
    await this.actor.update({ [`flags.${MODULE_ID}.ship`]: saved });
    this.render({ force: true });
    this.actor.sheet?.render?.(false);
  }
}

const OPEN_APPS = new Map();
export function openShipProgression(actor) {
  if (!isShip(actor)) { ui.notifications?.warn("Choose an Arkflight PF2e Vehicle Actor first."); return null; }
  let app = OPEN_APPS.get(actor.uuid);
  if (!app) { app = new ArkflightShipProgressionApp(actor); OPEN_APPS.set(actor.uuid, app); }
  app.render({ force: true });
  return app;
}

function sheetElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function repairShipwrightCapacity(app, root, actor) {
  const draft = app?._draftShip ?? shipFlag(actor);
  if (!draft?.hull?.chassisId) return;
  let derived;
  try { derived = deriveShip(draft, SHIP_CATALOGS); } catch (_error) { return; }

  const engine = SHIP_CATALOGS.arkengines?.[draft.arkengine?.chassisId] ?? null;
  const engineMax = Number(engine?.data?.modCapacity ?? 0) + Number(derived.stats?.arkengineModCapacity ?? 0);
  const engineUsed = Number(derived.usage?.arkengineMods ?? 0);
  const engineButtons = [...root.querySelectorAll('[data-fitting-kind="arkengineMod"]')];
  for (const button of engineButtons) {
    const id = button.dataset.id;
    const installed = draft.arkengine?.modIds?.includes(id);
    const cost = Number(SHIP_CATALOGS.arkengineMods?.[id]?.capacityCost ?? 1);
    button.disabled = !installed && engineUsed + cost > engineMax;
    const state = button.querySelector(".arkflight-fitting-state");
    if (state && !installed) state.textContent = button.disabled ? "CAPACITY FULL" : "INSTALL";
  }
  const engineMeter = engineButtons[0]?.closest(".arkflight-commission-stage")?.querySelector(".arkflight-capacity-meter strong");
  if (engineMeter) engineMeter.textContent = `${engineUsed} / ${engineMax}`;

  for (const button of root.querySelectorAll('[data-fitting-kind="shipMod"]')) {
    const id = button.dataset.id;
    const mod = SHIP_CATALOGS.shipMods?.[id];
    if (!mod) continue;
    const slotClass = shipModSlotClass(mod);
    button.dataset.slotClass = slotClass;
    const small = button.querySelector("small");
    if (small && !small.textContent.includes("slot class")) small.textContent = `${small.textContent} · ${slotClass} slot class`;
  }
}

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app?.actor ?? app?.document;
  if (!isShip(actor)) return;
  const root = sheetElement(html);
  if (!root) return;
  repairShipwrightCapacity(app, root, actor);

  if (root.querySelector("[data-action='arkflight-progression']")) return;
  const header = root.querySelector(".arkflight-ship-header-actions") ?? root.querySelector(".window-content") ?? root;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "arkflight-progression-launch";
  button.dataset.action = "arkflight-progression";
  button.innerHTML = '<i class="fa-solid fa-star"></i> SHIP LEVEL UP';
  button.addEventListener("click", (event) => { event.preventDefault(); openShipProgression(actor); });
  header.append(button);
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.openShipProgression = openShipProgression;
});
