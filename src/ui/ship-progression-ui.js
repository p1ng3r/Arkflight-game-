import { deriveShip, syncResourceMaxima } from "../ship/derive-ship.js";
import { progressionView, clampShipLevel, validateProgression } from "../ship/progression.js";
import { shipModSlotClass } from "../ship/ship-mod-slots.js";
import { hullCombatProfile } from "../combat/combat-schema.js";
import { SHIP_TALENT_TIERS } from "../content/ship-talents.js";
import { SHIP_CATALOGS } from "../content/index.js";

const MODULE_ID = "arkflight-game";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

function shipFlag(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function isShip(actor) { return actor?.type === "vehicle" && (actor?.flags?.[MODULE_ID]?.isArkflightShip === true || Boolean(shipFlag(actor))); }
function signed(value) { const n = Number(value || 0); return `${n >= 0 ? "+" : ""}${n}`; }

function talentRows(ship) {
  const view = progressionView(ship);
  return Object.values(SHIP_TALENT_TIERS).map((tier) => ({
    ...tier,
    active: view.level >= tier.minLevel,
    talents: view.talents.filter((talent) => talent.tier === tier.id).map((talent) => ({
      ...talent,
      canBuy: !talent.owned && !talent.locked && view.available >= talent.cost,
      canRemove: talent.owned,
      stateLabel: talent.owned ? "OWNED" : talent.locked ? `LEVEL ${tier.minLevel}` : view.available < talent.cost ? "NEED TP" : "BUY"
    }))
  }));
}

function statPreview(derived, ship) {
  const stats = derived.stats ?? {};
  const profile = hullCombatProfile(ship);
  const slots = stats.modSlotBonuses ?? {};
  const station = stats.stationBonuses ?? {};
  const pillar = stats.pillarBonuses ?? {};
  return {
    core: [
      ["AC", stats.armorClass], ["Hull", stats.hullIntegrity], ["Lifeveil", stats.lifeveilCapacity],
      ["Speed", stats.combatSpeed], ["Maneuverability", stats.maneuverability], ["Strain Limit", stats.strainCapacity],
      ["Hardness Bonus", signed(stats.hardness)], ["Weapon Attack", signed(stats.weaponAttackBonus)],
      ["Actions / Round", profile.actions], ["Reactions / Round", profile.reactions], ["Crew Tactics", signed(stats.crewTacticCapacity)]
    ].map(([label, value]) => ({ label, value })),
    stations: ["captain", "engineer", "navigator", "battlewatch", "veilwarden"].map((id) => ({
      id, label: id.charAt(0).toUpperCase() + id.slice(1), base: signed(Number(station[id] || 0) + Number(stats.allStationBonus || 0)),
      voyage: signed(Number(station[id] || 0) + Number(stats.allStationBonus || 0) + Number(pillar.voyage || 0)),
      combat: signed(Number(station[id] || 0) + Number(stats.allStationBonus || 0) + Number(pillar.combat || 0))
    })),
    slots: Object.entries(slots).map(([id, value]) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), value: signed(value) }))
  };
}

export class ArkflightShipProgressionApp extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-ship-progression",
    classes: ["arkflight", "arkflight-ship-progression"],
    position: { width: 1120, height: 820 },
    window: { title: "Arkflight Ship Progression", icon: "fa-solid fa-star" }
  };

  static PARTS = { main: { template: "modules/arkflight-game/templates/ship/ship-progression.hbs" } };

  constructor(actor, options = {}) { super(options); this.actor = actor; }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const ship = shipFlag(this.actor);
    const progression = progressionView(ship);
    const derived = deriveShip(ship, SHIP_CATALOGS);
    return {
      ...context,
      actor: this.actor,
      isGM: game.user.isGM,
      canSpend: this.actor?.isOwner || game.user.isGM,
      progression,
      tiers: talentRows(ship),
      preview: statPreview(derived, ship),
      selectedCount: ship?.progression?.talentIds?.length ?? 0
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

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

    for (const button of root.querySelectorAll("[data-talent-id]")) {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        if (!(this.actor?.isOwner || game.user.isGM)) return;
        const id = event.currentTarget.dataset.talentId;
        const ship = structuredClone(shipFlag(this.actor));
        ship.progression ??= { level: 1, talentIds: [], arkcraftUpgrades: {} };
        const ids = new Set(ship.progression.talentIds ?? []);
        if (ids.has(id)) ids.delete(id); else ids.add(id);
        ship.progression.talentIds = [...ids];
        const check = validateProgression(ship);
        if (!check.ok) { ui.notifications?.warn(check.errors.join(" ")); return; }
        await this._saveShip(ship);
      });
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
