import { CardCombatWorkspace } from "./card-combat-workspace.js";
import { showCardWeaponOverlay, showCardFireOverlay, clearCardFirePreview, hideCardWeaponOverlay, cardWeaponOverlayVisible } from "./card-combat-canvas-overlays.js";
import { bindFireControls, readFireSelection } from "./card-combat-fire-ui.js";
import { weaponArcCheck } from "../combat/weapon-targeting.js";
import { PLAYTEST_COMBAT_CARDS } from "../content/combat-cards-playtest.js";
import { CARD_SKILLS } from "../cards/card-playtest-session.js";
import { cardAvailability } from "../cards/card-library.js";
import { BASIC_CARD_ORDERS, getOrderQueue } from "../cards/committed-orders.js";
import { shipAbilityBonus } from "../combat/ship-ability-rules.js";
import { nextDemoStep } from "../cards/guided-combat-demo.js";

import { STATION_PRESENTATION, cardArt, resourceMeters } from "./card-combat-presentation.js";

import { cardCooldown } from "./card-combat-motion-state.js";
import { decorateCombatMotion, lastCombatOutcome, motionPreferences, revealCombatHand, combatPanelFeedback, playCombatSound } from "./card-combat-motion.js";

const MODULE = "arkflight-game";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
let windowInstance = null;
let openingWindow = null;
let autoOpenedSession = null;
const label = id => String(id ?? "").replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
const actorName = id => game.actors.get(id)?.name ?? game.actors.contents.find(a => a.uuid === id || a.name === id)?.name ?? (String(id).startsWith("npc:") ? "Ship crew (NPC)" : id);
const cardById = id => PLAYTEST_COMBAT_CARDS.find(card => card.id === id);
const degreeName = degree => ({ 2: "Critical success", 1: "Success", 0: "Failure", "-1": "Critical failure" }[degree]);
function logText(entry, state) {
  const result = entry.result, card = cardById(entry.label);
  if (entry.results) return entry.results.map(row => `${state.ships[row.id].cardPlay.name}: ${row.die + row.modifier}`).join(" · ");
  const pieces = [];
  if (result?.reaction) pieces.push(`${degreeName(result.reaction.degree)} reaction`);
  if (result?.degree !== undefined) pieces.push(`${degreeName(result.degree)} · ${result.total} vs ${result.dc ?? result.ac}`);
  if (result?.degree !== undefined && card?.deck === "ap") pieces.push(card.outcomes[["criticalFailure", "failure", "success", "criticalSuccess"][result.degree + 1]]);
  if (result?.damage !== undefined) pieces.push(`Damage ${result.damage}${result.degree === undefined ? " before defenses; awaiting response" : " to Hull"}`);
  for (const [key, delta] of Object.entries(entry.changes ?? {})) pieces.push(`${label(key)} ${delta > 0 ? "+" : ""}${delta}`);
  if (entry.bonusAP) pieces.push(`+${entry.bonusAP} AP for additional orders`);
  return pieces.join(" · ") || "Order executed";
}

export class ArkflightCardCombatWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = { id: "arkflight-card-combat", classes: ["arkflight", "arkflight-card-combat"], position: { width: 1260, height: 850 }, window: { title: "Arkflight — Card Combat Playtest", icon: "fa-solid fa-layer-group", resizable: true } };
  static PARTS = { main: { template: "modules/arkflight-game/templates/card-combat-playtest.hbs" } };
  selectedShipId = null;
  selectedFilter = "all";
  planDrafts = {};
  executionDrafts = {};
  scrollDrafts = {};
  responseDrafts = {};
  expandedCardId = null;
  expandedOrderId = null;
  selectedWeaponKey = "";
  handCollapsed = false;
  lastAttackKey = null;
  constructor(options = {}) {
    const width = Math.min(1260, Math.max(480, (globalThis.innerWidth ?? 1400) - 40));
    const height = Math.min(850, Math.max(400, (globalThis.innerHeight ?? 940) - 70));
    super({ ...options, position: { width, height, ...options.position } });
    if (!windowInstance?.rendered) windowInstance = this;
  }
  async render(options = {}) {
    const api = game.arkflight?.cardCombat, state = api?.state();
    if (api?.open && (windowInstance?.rendered && windowInstance !== this || !(this instanceof ArkflightCardCanvasHUD) && state?.canvas && state.phase !== "complete")) return api.open();
    return super.render(options);
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options), api = game.arkflight.cardCombat, state = api.state();
    const active = state?.phase !== "complete" && state?.id;
    const scene = globalThis.canvas?.scene;
    const selectable = game.actors.contents.filter(actor => actor.flags?.[MODULE]?.ship).map((actor, i) => {
      const tokens = (scene?.tokens?.contents ?? []).filter(token => token.actorId === actor.id && token.actorLink !== false);
      return { id: actor.id, name: actor.name, team: actor.flags[MODULE].cardCombatTestTeam ?? (i === 0 ? "A" : "B"), role: actor.flags[MODULE].cardCombatTestRole, tokens: tokens.map(token => ({ id: token.id, name: token.name })), multipleTokens: tokens.length > 1, noToken: tokens.length === 0 };
    });
    if (!state) return { ...context, isGM: game.user.isGM, selectable, sceneName: scene?.name, sceneReady: Boolean(globalThis.canvas?.grid?.isHexagonal), empty: true };
    if (this instanceof ArkflightCardCanvasHUD && state.pendingAttack) {
      const attackKey = `${state.id}:${state.round}:${state.revision}`;
      const defender = state.ships[state.pendingAttack.targetId];
      if (attackKey !== this.lastAttackKey && Object.values(defender.crew.stations).some(id => game.user.isGM || api.ownsOperator(game.user, id))) {
        hideCardWeaponOverlay(); this.selectedWeaponKey = "";
        this.selectedShipId = state.pendingAttack.targetId;
        this.selectedFilter = "reactions"; this.expandedCardId = null; this.expandedOrderId = null;
      }
      this.lastAttackKey = attackKey;
    }
    const shipIds = Object.keys(state.ships);
    if (!shipIds.includes(this.selectedShipId)) this.selectedShipId = state.turnOrder[state.turnIndex] ?? shipIds[0];
    const ship = state.ships[this.selectedShipId], q = getOrderQueue(ship), owns = id => api.ownsOperator(game.user, id);
    const guided = state.guidedDemo?.status === "running";
    const captain = game.user.isGM || owns(ship.crew.stations.captain);
    const turn = state.phase === "execution" && state.turnOrder[state.turnIndex] === this.selectedShipId && !state.pendingAttack;
    const canPlan = !guided && captain && !state.pendingAttack && (state.phase === "planning" && q.phase === "planning" || turn && q.ap.bonusAvailable > 0);
    const crew = Object.entries(ship.crew.stations).map(([station, id]) => ({ id, station, name: `${label(station)}: ${actorName(id)}` }));
    const cards = ship.cardDecks.hands.ap.map(id => {
      const card = cardById(id), check = cardAvailability(ship, PLAYTEST_COMBAT_CARDS, id);
      const committed = q.orders.some(order => order.kind === "card" && order.abilityId === id && order.status !== "skipped");
      return { ...card, cooldown: cardCooldown(ship, card, state.round), art: cardArt(card), filter: card.stations[0], stationLabel: label(card.stations[0]), enabled: canPlan && check.ok && !committed, status: committed ? "Committed" : check.ok ? "Ready" : check.readyRound ? `Ready: Round ${check.readyRound}` : label(check.reason), typeLabel: card.type === "flux" ? `Flux ${card.cooldownRounds}` : label(card.type) };
    });
    const reactions = ship.cardDecks.hands.rp.map(id => {
      const card = cardById(id), check = cardAvailability(ship, PLAYTEST_COMBAT_CARDS, id);
      return { ...card, cooldown: cardCooldown(ship, card, state.round), art: cardArt(card), typeLabel: card.type === "flux" ? `Flux ${card.cooldownRounds}` : label(card.type), status: check.ok ? "Ready" : check.readyRound ? `Ready: Round ${check.readyRound}` : label(check.reason) };
    });
    const ownedStations = crew.filter(row => owns(row.id)).map(row => row.station);
    const targets = Object.entries(state.ships).filter(([id, target]) => id !== this.selectedShipId && target.cardPlay.team !== ship.cardPlay.team && target.resources.hull.value > 0).map(([id, target]) => ({ id, name: target.cardPlay.name }));
    const batteries = [...new Set(ship.cardPlay.weapons.map(w => w.mount))].map(id => ({ id, name: label(id) }));
    const orders = q.orders.map(order => {
      const card = cardById(order.abilityId), basic = BASIC_CARD_ORDERS.find(b => b.id === order.abilityId);
      let choices = [];
      if (card?.selection === "station") choices = Object.keys(CARD_SKILLS).map(id => ({ id, name: label(id) }));
      if (card?.selection === "route") choices = ["propulsion", "weapons", "veil"].map(id => ({ id, name: label(id) }));
      if (card?.selection === "weapon") choices = ship.cardPlay.weapons.filter(w => w.readyRound > state.round).map(w => ({ id: w.key, name: `${w.name} · Round ${w.readyRound}` }));
      return { ...order, art: card ? cardArt(card) : STATION_PRESENTATION.find(s => s.id === order.station)?.art, name: card?.name ?? basic?.name ?? order.abilityId, operatorName: actorName(order.operatorId), requested: Boolean(order.requestedBy), canResolve: !guided && turn && order.status === "pending" && (game.user.isGM || owns(order.operatorId)), canManage: !guided && turn && captain && order.status === "pending", skills: CARD_SKILLS[order.station].map(id => ({ id, name: label(id) })), choices, needsChoice: Boolean(card?.selection), multiRoute: card?.selection === "route" && Number(ship.progression?.level ?? 1) >= 10, fire: order.abilityId === "fire-battery" };
    });
    const pendingAttack = state.pendingAttack;
    let response = null;
    if (pendingAttack) {
      const defender = state.ships[pendingAttack.targetId];
      const stations = Object.entries(defender.crew.stations).filter(([, id]) => game.user.isGM || owns(id)).map(([id]) => ({ id, name: label(id) }));
      response = { name: defender.cardPlay.name, total: pendingAttack.total, damage: pendingAttack.damage, remainingTargets: state.queuedAttacks?.length ?? 0, canRespond: stations.length > 0, stations, skills: CARD_SKILLS[stations[0]?.id ?? "captain"].map(id => ({ id, name: label(id) })), cards: defender.cardDecks.hands.rp.map(id => ({ ...cardById(id), enabled: defender.cardPlay.rp > 0 && cardAvailability(defender, PLAYTEST_COMBAT_CARDS, id).ok })) };
    }
    const ships = Object.entries(state.ships).map(([id, row]) => ({ id, name: row.cardPlay.name, selected: id === this.selectedShipId, current: id === state.turnOrder[state.turnIndex], team: row.cardPlay.team, hull: row.resources.hull.value, hullMax: row.resources.hull.max, planning: getOrderQueue(row).phase === "planning", x: 1.5 * row.cardPlay.motion.q * 30, y: Math.sqrt(3) * (row.cardPlay.motion.r + row.cardPlay.motion.q / 2) * 30, rotation: state.canvas?.headings?.[row.cardPlay.motion.heading] ?? row.cardPlay.motion.heading * 60 }));
    const bounds = { left: Math.min(...ships.map(s => s.x)) - 90, top: Math.min(...ships.map(s => s.y)) - 90, width: Math.max(...ships.map(s => s.x)) - Math.min(...ships.map(s => s.x)) + 180, height: Math.max(...ships.map(s => s.y)) - Math.min(...ships.map(s => s.y)) + 180 };
    const budget = canPlan ? (q.phase === "planning" ? q.ap.remaining : q.ap.bonusAvailable) : 0;
    const phaseLabel = state.pendingAttack ? "Incoming fire" : state.phase === "planning" ? q.phase === "planning" ? "Plan together" : "Plan locked" : state.phase === "complete" ? "Encounter complete" : turn ? "Your ship's turn" : "Ship turn in progress";
    const phaseShort = state.pendingAttack ? "React" : state.phase === "planning" ? q.phase === "planning" ? "Plan" : "Locked" : state.phase === "complete" ? "Complete" : turn ? "Your Turn" : "Executing";
    const phaseHint = state.pendingAttack ? "Defending crew: choose a reaction or pass to resolve the attack." : state.phase === "planning" ? q.phase === "planning" ? "Choose cards and basic orders. All Captains lock before initiative rolls." : "Orders committed. Waiting for the other Captains to lock their plans." : state.phase === "complete" ? "Review the log, then prepare another encounter." : turn ? "Move, execute orders in any sequence, then finish the ship turn." : "Follow the active vessel. Your committed orders stay visible here.";
    const stations = STATION_PRESENTATION.map(station => ({ ...station, operator: actorName(ship.crew.stations[station.id]), count: cards.filter(card => card.filter === station.id).length }));
    const previewCard = cardById(this.expandedCardId);
    const focusedOrder = orders.find(order => order.id === this.expandedOrderId) ?? null;
    const preview = previewCard ? { ...previewCard, art: cardArt(previewCard), stationLabel: label(previewCard.originStation ?? previewCard.stations[0]), pool: previewCard.deck.toUpperCase(), status: [...cards, ...reactions].find(c => c.id === previewCard.id)?.status, typeLabel: previewCard.type === "flux" ? `Flux ${previewCard.cooldownRounds}` : label(previewCard.type) } : focusedOrder ? { name: focusedOrder.name, description: "Basic ship order · 1 AP committed. Targets and batteries are selected now.", art: focusedOrder.art, type: "general", typeLabel: "Basic", pool: "AP", stationLabel: label(focusedOrder.station), status: label(focusedOrder.status) } : null;
    const upcoming = guided ? nextDemoStep(state) : null;
    const guidedOrders = ["lock", "bonus"].includes(upcoming?.kind) && upcoming.shipId === this.selectedShipId ? upcoming.orders : [];
    const guidedPlan = guidedOrders.filter(o => o.kind === "card").map(o => o.abilityId);
    const weaponChoices = ship.cardPlay.weapons.map(weapon => ({ id: weapon.key, name: `${label(weapon.mount)} · ${weapon.name} · ${label(weapon.arcTemplate ?? "wide")} ${2 * weaponArcCheck({ arcTemplate: weapon.arcTemplate ?? "wide" }).halfWidth}° · ${weapon.minRange}–${weapon.maxRange} hex · ${weapon.readyRound <= state.round ? "Ready" : `Ready R${weapon.readyRound}`}`, selected: weapon.key === this.selectedWeaponKey }));
    const canvasBound = Boolean(state.canvas), sceneMatches = canvasBound && state.canvas.sceneId === scene?.id;
    return { ...context, guided, guidedPlan, guidedPlanCount: guidedOrders.length, phaseShort: guided ? "Guided Test" : phaseShort, motionPreferences: motionPreferences(), lastOutcome: lastCombatOutcome(state, this.selectedShipId), canAddPreview: canPlan && previewCard?.deck === "ap", canChoosePreviewReaction: !guided && response?.canRespond && previewCard?.deck === "rp", preview, focusedOrders: focusedOrder ? [focusedOrder] : [], ownedStations, handCollapsed: this.handCollapsed, weaponChoices, arcsVisible: cardWeaponOverlayVisible(this.selectedShipId), canvasBound, sceneMatches, sceneName: scene?.name, sceneReady: Boolean(globalThis.canvas?.grid?.isHexagonal), budget, phaseLabel, phaseHint, stations, meters: resourceMeters(ship.resources), pendingCount: orders.filter(order => order.status === "pending").length, state, isGM: game.user.isGM, selectable, active, complete: state.phase === "complete", shipName: ship.cardPlay.name, ships, selectedShipId: this.selectedShipId, cards: cards.map(card => ({ ...card, dragOrderId: orders.find(order => order.abilityId === card.id && order.status === "pending")?.id })), reactions: reactions.map(card => ({ ...card, canDragReaction: !guided && response?.canRespond && state.pendingAttack?.targetId === this.selectedShipId && ship.cardPlay.rp > 0 && card.status === "Ready" })), orders, crew, targets, batteries, response, canPlan, bonus: q.phase === "execution", ap: q.ap, rp: ship.cardPlay.rp, b: shipAbilityBonus(ship.progression?.level), resources: ship.resources, motion: { ...ship.cardPlay.motion, allowance: ship.cardPlay.motion.speed + ship.cardPlay.motion.extra, turnAllowance: ship.cardPlay.motion.baseTurns + ship.cardPlay.motion.bonusTurns }, canMove: !guided && turn && (game.user.isGM || owns(ship.crew.stations.navigator)), canEnd: !guided && turn && captain, basics: BASIC_CARD_ORDERS.map(b => ({ ...b, max: canPlan ? (q.phase === "planning" ? q.ap.remaining : q.ap.bonusAvailable) : 0 })), log: [...state.log].reverse().slice(0, 15).map(entry => ({ ...entry, label: cardById(entry.label)?.name ?? label(entry.label), name: state.ships[entry.shipId]?.cardPlay.name, text: logText(entry, state) })), viewBox: `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}` };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    const part = this.element.querySelector(".cc-canvas-shell,.card-combat-shell");
    if (this.boundPart === part && part) return;
    this.boundPart = part;
    this.element.querySelector("[data-guided-demo]")?.addEventListener("click", () => { void game.arkflight.cardCombat.openGuidedDemo().catch(error => ui.notifications.error(error.message)); });
    const key = `${context.state?.id}:${context.state?.round}:${this.selectedShipId}`;
    const scroll = this.scrollDrafts[key] ??= {};
    for (const selector of [".card-command-rail", ".card-command-deck", ".card-hand-scroll", ".cc-preview-content"]) {
      const panel = this.element.querySelector(selector);
      if (!panel) continue;
      const scrollKey = selector === ".cc-preview-content" ? `${selector}:${this.expandedCardId ?? this.expandedOrderId ?? ""}` : selector;
      panel.scrollTop = scroll[scrollKey]?.top ?? 0;
      panel.scrollLeft = scroll[scrollKey]?.left ?? 0;
      panel.addEventListener("scroll", () => { scroll[scrollKey] = { top: panel.scrollTop, left: panel.scrollLeft }; }, { passive: true });
    }
    const draft = this.planDrafts[key] ??= { cards: [], basics: {} };
    const updateBudget = () => {
      const count = this.element.querySelectorAll("[data-plan-card]:checked").length + [...this.element.querySelectorAll("[data-plan-basic]")].reduce((sum, input) => sum + Math.max(0, Number(input.value) || 0), 0);
      const meter = this.element.querySelector("[data-plan-budget]");
      if (meter) { meter.textContent = context.guided ? context.guidedPlanCount ? `Scripted plan · ${context.guidedPlanCount} AP · Use Next Step` : "Guided test · Manual selection locked" : `${count} / ${context.budget} AP selected`; meter.classList.toggle("over-budget", !context.guided && count > context.budget); }
      const lock = this.element.querySelector('[data-card-command="lock"]');
      if (lock) lock.disabled = !context.canPlan || count > context.budget;
      for (const input of this.element.querySelectorAll("[data-plan-card]")) {
        const card = input.closest("article"), scripted = context.guided && context.guidedPlan?.includes(input.value);
        card.classList.toggle("is-selected", input.checked); card.classList.toggle("is-scripted", Boolean(scripted));
        const button = card.querySelector("[data-select-card]"); button?.setAttribute("aria-pressed", String(input.checked));
        const status = card.querySelector("[data-card-selection-status]");
        if (status) status.textContent = scripted ? "Next scripted choice" : context.guided ? "Guided · Inspect only" : input.checked ? "Selected" : input.disabled ? card.dataset.cardStatus : "Select";
      }
      const add = this.element.querySelector('[data-hud-action="add-plan"]');
      if (add) { const selected = [...this.element.querySelectorAll("[data-plan-card]")].some(i => i.value === this.expandedCardId && i.checked); add.textContent = selected ? "Remove From Plan" : "Select for Plan · 1 AP"; add.setAttribute("aria-pressed", String(selected)); }
    };
    const applyFilter = filter => {
      this.selectedFilter = filter;
      const planFooter = this.element.querySelector("[data-plan-footer]"), reactionFooter = this.element.querySelector("[data-reaction-footer]");
      if (planFooter) planFooter.hidden = filter === "reactions";
      if (reactionFooter) reactionFooter.hidden = filter !== "reactions";
      for (const panel of this.element.querySelectorAll("[data-hand-panel]")) panel.hidden = panel.dataset.handPanel !== (filter === "reactions" ? "rp" : "ap");
      for (const card of this.element.querySelectorAll("[data-card-filter]")) card.hidden = filter !== "all" && card.dataset.cardFilter !== filter && !(filter === "mine" && context.ownedStations?.includes(card.dataset.cardFilter));
      for (const button of this.element.querySelectorAll("[data-station-filter]")) button.setAttribute("aria-pressed", String(button.dataset.stationFilter === filter));
      const title = this.element.querySelector("[data-hand-title]");
      if (title) title.textContent = filter === "reactions" ? "Shared reactions" : filter === "all" ? "Crew hand" : filter === "mine" ? "My stations" : `${STATION_PRESENTATION.find(s => s.id === filter)?.name} hand`;
    };
    for (const button of this.element.querySelectorAll("[data-station-filter]")) button.addEventListener("click", () => {
      applyFilter(button.dataset.stationFilter);
      revealCombatHand(this.element);
      const hand = this.element.querySelector(".card-hand-scroll");
      if (hand) { hand.scrollTop = 0; hand.scrollLeft = 0; }
    });
    const filterSelect = this.element.querySelector("[data-hand-station]");
    if (filterSelect) { filterSelect.value = this.selectedFilter === "reactions" ? "all" : this.selectedFilter; filterSelect.addEventListener("change", () => { applyFilter(filterSelect.value); revealCombatHand(this.element); }); }
    for (const button of this.element.querySelectorAll("[data-view-ship]")) button.addEventListener("click", () => { hideCardWeaponOverlay(); this.selectedShipId = button.dataset.viewShip; this.render({ force: true }); });
    for (const input of this.element.querySelectorAll("[data-plan-card]")) {
      input.checked = !input.disabled && draft.cards.includes(input.value);
      input.addEventListener("change", () => { draft.cards = [...this.element.querySelectorAll("[data-plan-card]:checked")].map(input => input.value); updateBudget(); playCombatSound(input.checked ? "select" : "deselect"); });
    }
    for (const input of this.element.querySelectorAll("[data-plan-basic]")) {
      input.value = input.disabled ? 0 : draft.basics[input.dataset.planBasic] ?? 0;
      input.addEventListener("input", () => { draft.basics[input.dataset.planBasic] = input.value; updateBudget(); });
    }
    updateBudget();
    applyFilter(this.selectedFilter);
    for (const row of this.element.querySelectorAll("[data-order-row]")) {
      const orderKey = `${key}:${row.dataset.orderRow}`;
      const saved = this.executionDrafts[orderKey] ??= {};
      for (const field of ["skill", "choice", "target", "battery", "replacement"]) {
        const select = row.querySelector(`[data-${field}]`);
        if (!select) continue;
        if (saved[field] !== undefined) {
          if (select.multiple) for (const option of select.options) option.selected = saved[field].includes(option.value);
          else if ([...select.options].some(option => option.value === saved[field])) select.value = saved[field];
        }
        select.addEventListener("change", () => { saved[field] = select.multiple ? [...select.selectedOptions].map(option => option.value) : select.value; });
      }
      if (row.querySelector("[data-fire-mode]")) bindFireControls(row, context.state, this.selectedShipId, saved, {
        changed: clearCardFirePreview,
        preview: assignments => {
          if (!showCardFireOverlay(this.selectedShipId, assignments.map(a => ({ weaponKey: a.weapon.key, targetId: a.targetId })))) ui.notifications.warn("View the encounter scene to preview selected fire.");
        }
      });
    }
    this.element.querySelector("[data-ship-picker]")?.addEventListener("change", event => { hideCardWeaponOverlay(); this.selectedWeaponKey = ""; this.expandedOrderId = null; this.expandedCardId = null; this.selectedShipId = event.target.value; this.render({ force: true }); });
    this.element.querySelector("[data-response-station]")?.addEventListener("change", event => {
      const select = this.element.querySelector("[data-response-skill]");
      select.replaceChildren(...CARD_SKILLS[event.target.value].map(id => new Option(label(id), id)));
    });
    if (context.response) {
      const responseKey = `${context.state.id}:${context.state.revision}`;
      const saved = this.responseDrafts[responseKey] ??= {};
      for (const field of ["station", "skill", "card"]) {
        const select = this.element.querySelector(`[data-response-${field}]`);
        if (!select) continue;
        if (saved[field] !== undefined && [...select.options].some(option => option.value === saved[field] && !option.disabled)) {
          select.value = saved[field];
          if (field === "station") this.element.querySelector("[data-response-skill]").replaceChildren(...CARD_SKILLS[select.value].map(id => new Option(label(id), id)));
        }
        select.addEventListener("change", () => {
          saved[field] = select.value;
          if (field === "station") saved.skill = this.element.querySelector("[data-response-skill]").value;
          this.updateReactionCards?.();
        });
      }
    }
    for (const button of this.element.querySelectorAll("[data-card-command]")) button.addEventListener("click", async event => {
      event.preventDefault(); button.disabled = true;
      try { await this.command(button, context); }
      catch (error) { ui.notifications.error(error.message); }
      finally { if (this.rendered) this.render({ force: true }); }
    });
  }
  async command(button, context) {
    const api = game.arkflight.cardCombat, state = api.state(), type = button.dataset.cardCommand;
    if (type === "import-test-ships") {
      await api.importTestShips();
      ui.notifications.info("Test fleet ready. Select your ships and opposing sides, then launch the encounter.");
      return;
    }
    let command = { type, sessionId: state?.id, revision: state?.revision, shipId: this.selectedShipId };
    const ship = state?.ships[this.selectedShipId], q = ship ? getOrderQueue(ship) : null;
    const request = extra => ({ round: q.round, revision: q.revision, ...extra });
    if (type === "place-ships") { await api.placeShips([...this.element.querySelectorAll("[data-start-ship]:checked")].map(input => input.value)); return; }
    if (type === "start" && !globalThis.canvas?.grid?.isHexagonal) throw new Error("Open a hex-grid scene before launching ship combat.");
    if (type === "start") command = { type, sceneId: canvas.scene.id, entries: [...this.element.querySelectorAll("[data-start-ship]:checked")].map(input => ({ id: input.value, team: input.closest("label").querySelector("[data-start-team]").value, tokenId: input.closest("label").querySelector("[data-start-token]")?.value || undefined })) };
    if (type === "lock") {
      const orders = [...this.element.querySelectorAll("[data-plan-card]:checked")].map(input => { const card = cardById(input.value), station = card.stations[0]; return { kind: "card", abilityId: card.id, station, operatorId: ship.crew.stations[station] }; });
      for (const input of this.element.querySelectorAll("[data-plan-basic]")) {
        const basic = BASIC_CARD_ORDERS.find(b => b.id === input.dataset.planBasic);
        const count = Number(input.value);
        if (!Number.isInteger(count) || count < 0 || count > 20) throw new Error("Choose a valid basic-order count.");
        for (let n = 0; n < count; n++) orders.push({ kind: "basic", abilityId: basic.id, station: basic.stations[0], operatorId: ship.crew.stations[basic.stations[0]] });
      }
      command.request = request({ orders, bonus: q.phase === "execution" });
    }
    if (["resolve", "request", "reassign", "skip"].includes(type)) {
      const row = button.closest("[data-order-row]"), orderId = row.dataset.orderRow;
      const selection = { skill: row.querySelector("[data-skill]").value };
      const choice = row.querySelector("[data-choice]");
      if (choice) selection.choice = choice.multiple ? [...choice.selectedOptions].map(o => o.value) : choice.value;
      if (row.querySelector("[data-target]")) Object.assign(selection, readFireSelection(row));
      command.request = request({ orderId, selection, operatorId: row.querySelector("[data-replacement]")?.value, reason: "Captain skipped this order" });
    }
    if (type === "helm") command.direction = button.dataset.direction;
    if (type === "respond") command.response = { cardId: this.element.querySelector("[data-response-card]").value || null, station: this.element.querySelector("[data-response-station]").value, skill: this.element.querySelector("[data-response-skill]").value };
    await api.request(command);
    if (type === "end" || type === "start" && api.state()?.canvas) await api.open();
    if (type === "lock") { delete this.planDrafts[`${state.id}:${state.round}:${command.shipId}`]; this.layoutController?.setHandMinimized(true, { automatic: true }); }
  }
}
async function openCardWindow() {
  if (openingWindow) return openingWindow;
  openingWindow = (async () => {
    if (game.arkflight.combatConsole?.application?.rendered) await game.arkflight.combatConsole.application.close();
    const state = game.arkflight.cardCombat.state(), HUD = Boolean(state?.canvas && state.phase !== "complete");
    if (windowInstance && (windowInstance instanceof ArkflightCardCanvasHUD) !== HUD) { await windowInstance.close(); windowInstance = null; }
    windowInstance ??= HUD ? new ArkflightCardCanvasHUD() : new ArkflightCardCombatWindow();
    await windowInstance.render({ force: true });
    if (windowInstance.minimized) await windowInstance.maximize();
    return windowInstance;
  })();
  try { return await openingWindow; } finally { openingWindow = null; }
}
function refreshCardInterface() {
  const api = game.arkflight?.cardCombat, state = api?.state();
  if (state?.guidedDemo && state.guidedDemo.status !== "running" && windowInstance instanceof ArkflightCardCanvasHUD) { if (windowInstance.rendered) void windowInstance.close(); return; }
  const HUD = Boolean(state?.canvas && state.phase !== "complete");
  if (HUD && autoOpenedSession !== state.id) {
    autoOpenedSession = state.id;
    if (game.user.isGM || Object.values(state.ships).some(ship => Object.values(ship.crew.stations).some(id => api.ownsOperator(game.user, id)))) { void api.open(); return; }
  }
  if (!windowInstance?.rendered) return;
  if ((windowInstance instanceof ArkflightCardCanvasHUD) !== HUD) void api.open();
  else windowInstance.render({ force: true });
}
Hooks.once("init", () => game.settings.registerMenu(MODULE, "cardCombatWindow", { name: "Card Combat Playtest", label: "Open Card Combat", hint: "Test the connected card system with selected ships and crew.", icon: "fa-solid fa-layer-group", type: ArkflightCardCombatWindow, restricted: false }));
Hooks.once("ready", () => {
  game.arkflight.cardCombat = Object.freeze({ ...game.arkflight.cardCombat,
    open: openCardWindow,
    async showReaction(shipId, cardId) {
      const state = game.arkflight.cardCombat.state(), app = await game.arkflight.cardCombat.open();
      if (!(app instanceof ArkflightCardCanvasHUD) || state.pendingAttack?.targetId !== shipId) throw new Error("Choose a reaction for the defending ship.");
      app.selectedShipId = shipId; app.selectedFilter = "reactions"; app.expandedCardId = cardId; app.expandedOrderId = null;
      (app.responseDrafts[`${state.id}:${state.revision}`] ??= {}).card = cardId;
      await app.render({ force: true });
    },
    async showOrder(shipId, orderId, targetId = null) {
      const app = await game.arkflight.cardCombat.open();
      if (!(app instanceof ArkflightCardCanvasHUD)) throw new Error("Start an encounter on the canvas first.");
      await app.focusOrder(shipId, orderId, targetId);
    }
  });
  refreshCardInterface();
});
Hooks.on("arkflightCardCombatChanged", refreshCardInterface);
Hooks.on("arkflightCardCombatMotionChanged", refreshCardInterface);

Hooks.on("createActor", actor => { if (actor.flags?.[MODULE]?.cardCombatTestShip && windowInstance?.rendered) windowInstance.render({ force: true }); });

export class ArkflightCardCanvasHUD extends ArkflightCardCombatWindow {
  static DEFAULT_OPTIONS = { ...ArkflightCardCombatWindow.DEFAULT_OPTIONS, id: "arkflight-card-canvas", classes: ["arkflight", "arkflight-card-combat", "arkflight-card-canvas"], window: { frame: false, positioned: false, minimizable: false, resizable: false }, position: { top: 0, left: 0, width: "auto", height: "auto" } };
  static PARTS = { main: { template: "modules/arkflight-game/templates/card-combat-canvas-hud.hbs" } };
  async focusOrder(shipId, orderId, targetId = null) {
    const state = game.arkflight.cardCombat.state(), order = state?.ships[shipId] ? getOrderQueue(state.ships[shipId]).orders.find(row => row.id === orderId) : null;
    if (!order) throw new Error("That committed order is no longer available.");
    if (this.expandedOrderId !== orderId) playCombatSound("open");
    this.selectedShipId = shipId;
    this.expandedOrderId = orderId;
    this.expandedCardId = order.kind === "card" ? order.abilityId : null;
    if (targetId) {
      const key = `${state.id}:${state.round}:${shipId}:${orderId}`;
      (this.executionDrafts[key] ??= {}).target = targetId;
      this.executionDrafts[key].fireMode = "concentrate";
    }
    await this.render({ force: true });
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    const part = this.element.querySelector(".cc-canvas-shell");
    if (this.hudBoundPart === part && part) return;
    this.hudBoundPart = part;
    decorateCombatMotion(this.element, context);
    const motionView = `${this.selectedShipId}:${this.handCollapsed}`;
    if (this.motionView && this.motionView !== motionView && !this.handCollapsed) revealCombatHand(this.element);
    this.motionView = motionView;
    this.layoutController ??= new CardCombatWorkspace({ feedback: combatPanelFeedback });
    this.layoutController.bind(this.element, context);
    for (const button of this.element.querySelectorAll("[data-inspect-card]")) {
      button.addEventListener("click", () => {
        playCombatSound("open"); this.expandedCardId = button.dataset.inspectCard;
        const order = context.orders.find(row => row.abilityId === this.expandedCardId && row.status === "pending");
        this.expandedOrderId = order?.id ?? null;
        this.render({ force: true });
      });
    }
    for (const button of this.element.querySelectorAll("[data-select-card]")) button.addEventListener("click", () => {
      const input = [...this.element.querySelectorAll("[data-plan-card]")].find(i => i.value === button.dataset.selectCard);
      if (!input || input.disabled) return;
      input.checked = !input.checked; input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    this.updateReactionCards = () => {
      const selected = this.element.querySelector("[data-response-card]")?.value;
      for (const button of this.element.querySelectorAll("[data-select-reaction]")) {
        const active = button.getAttribute("aria-disabled") === "false" && button.dataset.selectReaction === selected;
        button.setAttribute("aria-pressed", String(active)); button.closest("article").classList.toggle("is-selected", active);
        const status = button.closest("article").querySelector("[data-card-selection-status]");
        status.textContent = context.guided ? "Guided · Inspect only" : active ? "Reaction selected" : button.getAttribute("aria-disabled") === "true" ? "Inspect only" : "Choose reaction";
      }
    };
    for (const button of this.element.querySelectorAll("[data-select-reaction]")) button.addEventListener("click", () => {
      const select = this.element.querySelector("[data-response-card]"); if (!select || button.getAttribute("aria-disabled") === "true") return;
      select.value = select.value === button.dataset.selectReaction ? "" : button.dataset.selectReaction;
      select.dispatchEvent(new Event("change")); playCombatSound(select.value ? "select" : "deselect"); this.updateReactionCards();
    });
    this.updateReactionCards();
    for (const button of this.element.querySelectorAll("[data-preview-order]")) button.addEventListener("click", () => this.focusOrder(this.selectedShipId, button.dataset.previewOrder).catch(error => ui.notifications.error(error.message)));
    for (const card of this.element.querySelectorAll("[data-drag-order]")) {
      card.addEventListener("dragstart", event => {
        const orderId = card.dataset.dragOrder;
        if (!orderId) { event.preventDefault(); return; }
        event.dataTransfer.setData("text/plain", JSON.stringify({ type: "ArkflightCardOrder", sessionId: context.state.id, revision: context.state.revision, shipId: this.selectedShipId, orderId }));
        event.dataTransfer.effectAllowed = "copy";
      });
    }
    for (const card of this.element.querySelectorAll("[data-drag-reaction]")) card.addEventListener("dragstart", event => {
      if (card.getAttribute("draggable") !== "true") { event.preventDefault(); return; }
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "ArkflightReactionCard", sessionId: context.state.id, revision: context.state.revision, shipId: this.selectedShipId, cardId: card.dataset.dragReaction }));
      event.dataTransfer.effectAllowed = "copy";
    });
    for (const button of this.element.querySelectorAll("[data-hud-action]")) button.addEventListener("click", async () => {
      try {
        switch (button.dataset.hudAction) {
          case "basic-orders": this.element.querySelector('[data-station-filter="all"]').click(); this.element.querySelector(".cc-basic-orders")?.scrollIntoView({ block: "nearest", inline: "end", behavior: motionPreferences().mode === "off" ? "instant" : "smooth" }); break;
          case "close-preview": playCombatSound("close"); clearCardFirePreview(); this.expandedCardId = null; this.expandedOrderId = null; await this.render({ force: true }); break;
          case "toggle-hand": this.layoutController?.setHandMinimized(!this.layoutController.workspace.hand.minimized); break;
          case "close": await this.close(); break;
          case "setup": await game.arkflight.cardCombat.open(); break;
          case "view-scene": await game.scenes.get(context.state.canvas.sceneId)?.view(); break;
          case "focus-token": {
            const token = canvas.tokens.get(context.state.ships[this.selectedShipId].cardPlay.tokenId);
            if (token) { await canvas.animatePan({ ...token.center, duration: motionPreferences().mode === "off" ? 0 : 300 }); if (token.isOwner) token.control({ releaseOthers: true }); }
            break;
          }
          case "arcs": {
            this.selectedWeaponKey = this.element.querySelector("[data-overlay-weapon]").value;
            if (cardWeaponOverlayVisible(this.selectedShipId)) hideCardWeaponOverlay();
            else if (!showCardWeaponOverlay(this.selectedShipId, this.selectedWeaponKey || null)) throw new Error("View the bound encounter scene to display weapon coverage.");
            await this.render({ force: true }); break;
          }
          case "use-target": {
            const target = [...game.user.targets].find(token => context.targets.some(row => context.state.ships[row.id].cardPlay.tokenId === token.id));
            if (!target) throw new Error("Target an enemy ship token on the Foundry canvas first.");
            const id = context.targets.find(row => context.state.ships[row.id].cardPlay.tokenId === target.id).id;
            await this.focusOrder(this.selectedShipId, this.expandedOrderId, id); break;
          }
          case "add-plan": {
            const input = [...this.element.querySelectorAll("[data-plan-card]")].find(input => input.value === this.expandedCardId);
            if (!input || input.disabled) throw new Error("This card cannot be added to the current plan.");
            input.checked = !input.checked; input.dispatchEvent(new Event("change", { bubbles: true })); break;
          }
          case "choose-reaction": {
            const select = this.element.querySelector("[data-response-card]");
            const option = [...(select?.options ?? [])].find(row => row.value === this.expandedCardId);
            if (!option || option.disabled) throw new Error("This reaction is not available for the pending attack.");
            select.value = option.value; select.dispatchEvent(new Event("change")); break;
          }
        }
      } catch (error) { ui.notifications.error(error.message); }
    });
    this.element.querySelector("[data-overlay-weapon]")?.addEventListener("change", event => { this.selectedWeaponKey = event.target.value; if (cardWeaponOverlayVisible(this.selectedShipId)) showCardWeaponOverlay(this.selectedShipId, this.selectedWeaponKey || null); });
  }
  async close(options = {}) { this.layoutController?.destroy(); hideCardWeaponOverlay(); return super.close(options); }
}
Hooks.on("controlToken", (token, controlled) => {
  const state = game.arkflight?.cardCombat?.state();
  if (!controlled || !(windowInstance instanceof ArkflightCardCanvasHUD) || !state?.canvas || !windowInstance.rendered) return;
  const id = Object.keys(state.ships).find(id => state.ships[id].cardPlay.tokenId === token.id);
  if (id && id !== windowInstance.selectedShipId) { hideCardWeaponOverlay(); windowInstance.selectedWeaponKey = ""; windowInstance.selectedShipId = id; windowInstance.expandedOrderId = null; windowInstance.expandedCardId = null; windowInstance.render({ force: true }); }
});
Hooks.on("dropCanvasData", (_canvas, data) => {
  if (!["ArkflightCardOrder", "ArkflightReactionCard"].includes(data.type)) return;
  const state = game.arkflight?.cardCombat?.state();
  if (!state?.canvas || state.id !== data.sessionId || state.revision !== data.revision || state.canvas.sceneId !== canvas.scene?.id) { ui.notifications.warn("The encounter changed. Pick up the card again."); return false; }
  const token = canvas.tokens.placeables.find(token => token.isVisible !== false && token.bounds.contains(data.x, data.y) && Object.values(state.ships).some(ship => ship.cardPlay.tokenId === token.id));
  const targetId = token ? Object.keys(state.ships).find(id => state.ships[id].cardPlay.tokenId === token.id) : null;
  if (!targetId) { ui.notifications.warn("Drop the order onto an encounter ship token."); return false; }
  if (data.type === "ArkflightReactionCard") {
    if (state.pendingAttack?.targetId !== data.shipId || targetId !== data.shipId) { ui.notifications.warn("Drop the reaction on the defending ship."); return false; }
    void game.arkflight.cardCombat.showReaction(data.shipId, data.cardId).catch(error => ui.notifications.error(error.message));
    return false;
  }
  const ship = state.ships[data.shipId], order = ship ? getOrderQueue(ship).orders.find(order => order.id === data.orderId && order.status === "pending") : null;
  if (!order) { ui.notifications.warn("Commit the card before dragging it to a target."); return false; }
  if (order.abilityId === "fire-battery" && (targetId === data.shipId || state.ships[targetId].cardPlay.team === ship.cardPlay.team)) { ui.notifications.warn("Choose an enemy ship for Fire Battery."); return false; }
  if (order.abilityId !== "fire-battery" && targetId !== data.shipId) { ui.notifications.warn("This support order affects its own ship. Drop it on that ship or click to inspect it."); return false; }
  token.setTarget(true, { releaseOthers: true });
  void game.arkflight.cardCombat.showOrder(data.shipId, data.orderId, order.abilityId === "fire-battery" ? targetId : null).catch(error => ui.notifications.error(error.message));
  return false;
});
Hooks.on("targetToken", (_user, token, targeted) => {
  if (_user?.id !== game.user.id || !targeted || !(windowInstance instanceof ArkflightCardCanvasHUD) || !windowInstance.rendered || !windowInstance.expandedOrderId) return;
  const state = game.arkflight.cardCombat.state(), shipId = windowInstance.selectedShipId;
  if (!state?.ships[shipId]) return;
  const order = getOrderQueue(state.ships[shipId]).orders.find(row => row.id === windowInstance.expandedOrderId);
  const targetId = Object.keys(state.ships).find(id => state.ships[id].cardPlay.tokenId === token.id);
  if (order?.abilityId === "fire-battery" && targetId && state.ships[targetId].cardPlay.team !== state.ships[shipId].cardPlay.team) void windowInstance.focusOrder(shipId, order.id, targetId);
});
Hooks.on("renderTokenHUD", (hud, html) => {
  const token = hud?.object?.document ?? hud?.object;
  if (!game.arkflight?.cardCombat?.isCanvasToken(token)) return;
  const root = html?.querySelector ? html : html?.[0] ?? hud.element;
  if (!root?.querySelector || root.querySelector("[data-card-canvas-open]")) return;
  for (const control of root.querySelectorAll("[data-arkflight-combat-console],[data-arkflight-token-weapon-arcs],.arkflight-helm-ring")) control.remove();
  const button = document.createElement("button"); button.type = "button"; button.className = "control-icon"; button.dataset.cardCanvasOpen = "true"; button.title = "Open crew card HUD"; button.setAttribute("aria-label", button.title); button.innerHTML = '<i class="fa-solid fa-layer-group"></i>';
  button.addEventListener("click", async event => { event.preventDefault(); const app = await game.arkflight.cardCombat.open(); const state = game.arkflight.cardCombat.state(); app.selectedShipId = Object.keys(state.ships).find(id => state.ships[id].cardPlay.tokenId === token.id); app.render({ force: true }); });
  (root.querySelector(".right") ?? root).append(button);
});
Hooks.on("canvasReady", () => { if (windowInstance?.rendered) windowInstance.render({ force: true }); });
Hooks.on("createToken", () => { if (windowInstance?.rendered && !(windowInstance instanceof ArkflightCardCanvasHUD)) windowInstance.render({ force: true }); });
