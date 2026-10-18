import { PLAYTEST_COMBAT_CARDS } from "../content/combat-cards-playtest.js";
import { CARD_SKILLS } from "../cards/card-playtest-session.js";
import { cardAvailability } from "../cards/card-library.js";
import { BASIC_CARD_ORDERS, getOrderQueue } from "../cards/committed-orders.js";
import { shipAbilityBonus } from "../combat/ship-ability-rules.js";

import { STATION_PRESENTATION, cardArt, resourceMeters } from "./card-combat-presentation.js";

const MODULE = "arkflight-game";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
let windowInstance = null;
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
  constructor(options = {}) {
    const width = Math.min(1260, Math.max(480, (globalThis.innerWidth ?? 1400) - 40));
    const height = Math.min(850, Math.max(400, (globalThis.innerHeight ?? 940) - 70));
    super({ ...options, position: { width, height, ...options.position } });
    windowInstance = this;
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options), api = game.arkflight.cardCombat, state = api.state();
    const active = state?.phase !== "complete" && state?.id;
    const selectable = game.actors.contents.filter(actor => actor.flags?.[MODULE]?.ship).map((actor, i) => ({ id: actor.id, name: actor.name, team: actor.flags[MODULE].cardCombatTestTeam ?? (i === 0 ? "A" : "B"), role: actor.flags[MODULE].cardCombatTestRole }));
    if (!state) return { ...context, isGM: game.user.isGM, selectable, empty: true };
    const shipIds = Object.keys(state.ships);
    if (!shipIds.includes(this.selectedShipId)) this.selectedShipId = state.turnOrder[state.turnIndex] ?? shipIds[0];
    const ship = state.ships[this.selectedShipId], q = getOrderQueue(ship), owns = id => api.ownsOperator(game.user, id);
    const captain = game.user.isGM || owns(ship.crew.stations.captain);
    const turn = state.phase === "execution" && state.turnOrder[state.turnIndex] === this.selectedShipId && !state.pendingAttack;
    const canPlan = captain && !state.pendingAttack && (state.phase === "planning" && q.phase === "planning" || turn && q.ap.bonusAvailable > 0);
    const crew = Object.entries(ship.crew.stations).map(([station, id]) => ({ id, station, name: `${label(station)}: ${actorName(id)}` }));
    const cards = ship.cardDecks.hands.ap.map(id => {
      const card = cardById(id), check = cardAvailability(ship, PLAYTEST_COMBAT_CARDS, id);
      const committed = q.orders.some(order => order.kind === "card" && order.abilityId === id && order.status !== "skipped");
      return { ...card, art: cardArt(card), filter: card.stations[0], stationLabel: label(card.stations[0]), enabled: canPlan && check.ok && !committed, status: committed ? "Committed" : check.ok ? "Ready" : check.readyRound ? `Ready: Round ${check.readyRound}` : label(check.reason), typeLabel: card.type === "flux" ? `Flux ${card.cooldownRounds}` : label(card.type) };
    });
    const reactions = ship.cardDecks.hands.rp.map(id => {
      const card = cardById(id), check = cardAvailability(ship, PLAYTEST_COMBAT_CARDS, id);
      return { ...card, art: cardArt(card), typeLabel: card.type === "flux" ? `Flux ${card.cooldownRounds}` : label(card.type), status: check.ok ? "Ready" : check.readyRound ? `Ready: Round ${check.readyRound}` : label(check.reason) };
    });
    const targets = Object.entries(state.ships).filter(([id, target]) => id !== this.selectedShipId && target.cardPlay.team !== ship.cardPlay.team && target.resources.hull.value > 0).map(([id, target]) => ({ id, name: target.cardPlay.name }));
    const batteries = [...new Set(ship.cardPlay.weapons.map(w => w.mount))].map(id => ({ id, name: label(id) }));
    const orders = q.orders.map(order => {
      const card = cardById(order.abilityId), basic = BASIC_CARD_ORDERS.find(b => b.id === order.abilityId);
      let choices = [];
      if (card?.selection === "station") choices = Object.keys(CARD_SKILLS).map(id => ({ id, name: label(id) }));
      if (card?.selection === "route") choices = ["propulsion", "weapons", "veil"].map(id => ({ id, name: label(id) }));
      if (card?.selection === "weapon") choices = ship.cardPlay.weapons.filter(w => w.readyRound > state.round).map(w => ({ id: w.key, name: `${w.name} · Round ${w.readyRound}` }));
      return { ...order, art: card ? cardArt(card) : STATION_PRESENTATION.find(s => s.id === order.station)?.art, name: card?.name ?? basic?.name ?? order.abilityId, operatorName: actorName(order.operatorId), requested: Boolean(order.requestedBy), canResolve: turn && order.status === "pending" && (game.user.isGM || owns(order.operatorId)), canManage: turn && captain && order.status === "pending", skills: CARD_SKILLS[order.station].map(id => ({ id, name: label(id) })), choices, needsChoice: Boolean(card?.selection), multiRoute: card?.selection === "route" && Number(ship.progression?.level ?? 1) >= 10, fire: order.abilityId === "fire-battery" };
    });
    const pendingAttack = state.pendingAttack;
    let response = null;
    if (pendingAttack) {
      const defender = state.ships[pendingAttack.targetId];
      const stations = Object.entries(defender.crew.stations).filter(([, id]) => game.user.isGM || owns(id)).map(([id]) => ({ id, name: label(id) }));
      response = { name: defender.cardPlay.name, total: pendingAttack.total, damage: pendingAttack.damage, canRespond: stations.length > 0, stations, skills: CARD_SKILLS[stations[0]?.id ?? "captain"].map(id => ({ id, name: label(id) })), cards: defender.cardDecks.hands.rp.map(id => ({ ...cardById(id), enabled: defender.cardPlay.rp > 0 && cardAvailability(defender, PLAYTEST_COMBAT_CARDS, id).ok })) };
    }
    const ships = Object.entries(state.ships).map(([id, row]) => ({ id, name: row.cardPlay.name, selected: id === this.selectedShipId, current: id === state.turnOrder[state.turnIndex], team: row.cardPlay.team, hull: row.resources.hull.value, hullMax: row.resources.hull.max, planning: getOrderQueue(row).phase === "planning", x: 1.5 * row.cardPlay.motion.q * 30, y: Math.sqrt(3) * (row.cardPlay.motion.r + row.cardPlay.motion.q / 2) * 30, rotation: row.cardPlay.motion.heading * 60 }));
    const bounds = { left: Math.min(...ships.map(s => s.x)) - 90, top: Math.min(...ships.map(s => s.y)) - 90, width: Math.max(...ships.map(s => s.x)) - Math.min(...ships.map(s => s.x)) + 180, height: Math.max(...ships.map(s => s.y)) - Math.min(...ships.map(s => s.y)) + 180 };
    const budget = canPlan ? (q.phase === "planning" ? q.ap.remaining : q.ap.bonusAvailable) : 0;
    const phaseLabel = state.pendingAttack ? "Incoming fire" : state.phase === "planning" ? q.phase === "planning" ? "Plan together" : "Plan locked" : state.phase === "complete" ? "Encounter complete" : turn ? "Your ship's turn" : "Ship turn in progress";
    const phaseHint = state.pendingAttack ? "Defending crew: choose a reaction or pass to resolve the attack." : state.phase === "planning" ? q.phase === "planning" ? "Choose cards and basic orders. All Captains lock before initiative rolls." : "Orders committed. Waiting for the other Captains to lock their plans." : state.phase === "complete" ? "Review the log, then prepare another encounter." : turn ? "Move, execute orders in any sequence, then finish the ship turn." : "Follow the active vessel. Your committed orders stay visible here.";
    const stations = STATION_PRESENTATION.map(station => ({ ...station, operator: actorName(ship.crew.stations[station.id]), count: cards.filter(card => card.filter === station.id).length }));
    return { ...context, budget, phaseLabel, phaseHint, stations, meters: resourceMeters(ship.resources), pendingCount: orders.filter(order => order.status === "pending").length, state, isGM: game.user.isGM, selectable, active, complete: state.phase === "complete", shipName: ship.cardPlay.name, ships, selectedShipId: this.selectedShipId, cards, reactions, orders, crew, targets, batteries, response, canPlan, bonus: q.phase === "execution", ap: q.ap, rp: ship.cardPlay.rp, b: shipAbilityBonus(ship.progression?.level), resources: ship.resources, motion: { ...ship.cardPlay.motion, allowance: ship.cardPlay.motion.speed + ship.cardPlay.motion.extra, turnAllowance: ship.cardPlay.motion.baseTurns + ship.cardPlay.motion.bonusTurns }, canMove: turn && (game.user.isGM || owns(ship.crew.stations.navigator)), canEnd: turn && captain, basics: BASIC_CARD_ORDERS.map(b => ({ ...b, max: canPlan ? (q.phase === "planning" ? q.ap.remaining : q.ap.bonusAvailable) : 0 })), log: [...state.log].reverse().slice(0, 15).map(entry => ({ ...entry, label: cardById(entry.label)?.name ?? label(entry.label), name: state.ships[entry.shipId]?.cardPlay.name, text: logText(entry, state) })), viewBox: `${bounds.left} ${bounds.top} ${bounds.width} ${bounds.height}` };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    const key = `${context.state?.id}:${context.state?.round}:${this.selectedShipId}`;
    const scroll = this.scrollDrafts[key] ??= {};
    for (const selector of [".card-command-rail", ".card-command-deck", ".card-hand-scroll"]) {
      const panel = this.element.querySelector(selector);
      if (!panel) continue;
      panel.scrollTop = scroll[selector] ?? 0;
      panel.addEventListener("scroll", () => { scroll[selector] = panel.scrollTop; }, { passive: true });
    }
    const draft = this.planDrafts[key] ??= { cards: [], basics: {} };
    const updateBudget = () => {
      const count = this.element.querySelectorAll("[data-plan-card]:checked").length + [...this.element.querySelectorAll("[data-plan-basic]")].reduce((sum, input) => sum + Math.max(0, Number(input.value) || 0), 0);
      const meter = this.element.querySelector("[data-plan-budget]");
      if (meter) { meter.textContent = `${count} / ${context.budget} AP selected`; meter.classList.toggle("over-budget", count > context.budget); }
      const lock = this.element.querySelector('[data-card-command="lock"]');
      if (lock) lock.disabled = !context.canPlan || count > context.budget;
      for (const input of this.element.querySelectorAll("[data-plan-card]")) input.closest("article").classList.toggle("is-selected", input.checked);
    };
    const applyFilter = filter => {
      this.selectedFilter = filter;
      for (const panel of this.element.querySelectorAll("[data-hand-panel]")) panel.hidden = panel.dataset.handPanel !== (filter === "reactions" ? "rp" : "ap");
      for (const card of this.element.querySelectorAll("[data-card-filter]")) card.hidden = filter !== "all" && card.dataset.cardFilter !== filter;
      for (const button of this.element.querySelectorAll("[data-station-filter]")) button.setAttribute("aria-pressed", String(button.dataset.stationFilter === filter));
      const title = this.element.querySelector("[data-hand-title]");
      if (title) title.textContent = filter === "reactions" ? "Shared reactions" : filter === "all" ? "Crew hand" : `${STATION_PRESENTATION.find(s => s.id === filter)?.name} hand`;
    };
    for (const button of this.element.querySelectorAll("[data-station-filter]")) button.addEventListener("click", () => {
      applyFilter(button.dataset.stationFilter);
      const hand = this.element.querySelector(".card-hand-scroll");
      if (hand) hand.scrollTop = 0;
    });
    for (const button of this.element.querySelectorAll("[data-view-ship]")) button.addEventListener("click", () => { this.selectedShipId = button.dataset.viewShip; this.render({ force: true }); });
    for (const input of this.element.querySelectorAll("[data-plan-card]")) {
      input.checked = !input.disabled && draft.cards.includes(input.value);
      input.addEventListener("change", () => { draft.cards = [...this.element.querySelectorAll("[data-plan-card]:checked")].map(input => input.value); updateBudget(); });
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
    }
    this.element.querySelector("[data-ship-picker]")?.addEventListener("change", event => { this.selectedShipId = event.target.value; this.render({ force: true }); });
    this.element.querySelector("[data-response-station]")?.addEventListener("change", event => {
      const select = this.element.querySelector("[data-response-skill]");
      select.replaceChildren(...CARD_SKILLS[event.target.value].map(id => new Option(label(id), id)));
    });
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
    if (type === "start") command = { type, entries: [...this.element.querySelectorAll("[data-start-ship]:checked")].map(input => ({ id: input.value, team: input.closest("label").querySelector("[data-start-team]").value })) };
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
      if (row.querySelector("[data-target]")) { selection.targetId = row.querySelector("[data-target]").value; selection.batteryId = row.querySelector("[data-battery]").value; }
      command.request = request({ orderId, selection, operatorId: row.querySelector("[data-replacement]")?.value, reason: "Captain skipped this order" });
    }
    if (type === "helm") command.direction = button.dataset.direction;
    if (type === "respond") command.response = { cardId: this.element.querySelector("[data-response-card]").value || null, station: this.element.querySelector("[data-response-station]").value, skill: this.element.querySelector("[data-response-skill]").value };
    await api.request(command);
    if (type === "lock") delete this.planDrafts[`${state.id}:${state.round}:${command.shipId}`];
  }
}
Hooks.once("init", () => game.settings.registerMenu(MODULE, "cardCombatWindow", { name: "Card Combat Playtest", label: "Open Card Combat", hint: "Test the connected card system with selected ships and crew.", icon: "fa-solid fa-layer-group", type: ArkflightCardCombatWindow, restricted: false }));
Hooks.once("ready", () => {
  game.arkflight.cardCombat = Object.freeze({ ...game.arkflight.cardCombat, async open() { windowInstance ??= new ArkflightCardCombatWindow(); await windowInstance.render({ force: true }); if (windowInstance.minimized) await windowInstance.maximize(); return windowInstance; } });
});
Hooks.on("arkflightCardCombatChanged", () => { if (windowInstance?.rendered) windowInstance.render({ force: true }); });

Hooks.on("createActor", actor => { if (actor.flags?.[MODULE]?.cardCombatTestShip && windowInstance?.rendered) windowInstance.render({ force: true }); });
