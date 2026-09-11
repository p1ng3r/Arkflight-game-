import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import {
  STATION_BONUS_DEFINITION,
  stationActionEconomy,
  stationActionRulesText
} from "../combat/station-action-economy.js";
import { stationEffectProfile } from "../combat/station-effect-rules.js";

const MODULE_ID = "arkflight-game";
const HUD_ID = "arkflight-combat-console";

function hudRoot(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  if (id !== HUD_ID) return null;
  return app?.element?.querySelector?.(".afcs-shell") ? app.element : null;
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function activeCombatant(actor) {
  if (!actor || !game.combat) return null;
  return game.arkflight?.combat?.findCombatant?.(actor)
    ?? [...(game.combat?.combatants ?? [])].find((entry) => entry.actorId === actor.id)
    ?? null;
}

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function derivedMaximum(resource, derived, statKey, current = 0) {
  const direct = numeric(resource?.max, 0);
  if (direct > 0) return direct;
  const fromDerived = numeric(derived?.stats?.[statKey], 0);
  if (fromDerived > 0) return fromDerived;
  return Math.max(0, numeric(current, 0));
}

function vitalPair(actor, state, key) {
  const ship = shipPayload(actor);
  if (!ship) return { value: 0, max: 0 };
  const derived = deriveShip(ship, SHIP_CATALOGS);
  const resources = ship.resources ?? {};

  if (key === "strain") {
    const value = Math.max(0, numeric(state?.strain?.value ?? resources.strain?.value, 0));
    const max = Math.max(0, numeric(state?.strain?.max, 0) || derivedMaximum(resources.strain, derived, "strainCapacity", value));
    return { value, max };
  }

  const map = {
    hull: ["hull", "hullIntegrity"],
    lifeveil: ["lifeveil", null],
    morale: ["morale", null],
    supplies: ["supplies", "cargoCapacity"]
  };
  const [resourceKey, statKey] = map[key] ?? [key, null];
  const resource = resources[resourceKey] ?? {};
  const value = Math.max(0, numeric(resource.value, 0));
  const max = Math.max(0, derivedMaximum(resource, derived, statKey, value));
  return { value, max };
}

function updateVitals(app, root) {
  const actor = app.actor ?? (app.actorId ? game.actors?.get(app.actorId) : null);
  const combatant = activeCombatant(actor);
  const state = combatant ? game.arkflight?.combat?.state?.(combatant) : null;

  for (const vital of root.querySelectorAll("[data-afch-vital]")) {
    const key = vital.dataset.afchVital;
    const { value, max } = vitalPair(actor, state, key);
    const percent = max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    const fill = vital.querySelector(".afch-meter > i");
    const text = vital.querySelector("strong");
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${value} / ${max}`;
  }
}

function shipLevel(actor) {
  return Math.max(1, Math.min(20, Math.trunc(numeric(shipPayload(actor)?.progression?.level, 1))));
}

function resolvedStationEffect(action, actor, state) {
  const level = shipLevel(actor);
  const profile = stationEffectProfile(level);
  const bonus = profile.bonus;
  const speed = Math.max(0, numeric(state?.mobility?.speed, 0));
  const maneuverability = Math.max(0, numeric(state?.mobility?.maneuverability, 0));
  const charges = profile.advanced ? 2 : 1;
  const cost = stationActionEconomy(action, level);

  const effects = {
    "captain-issue-order": `Chosen station's next qualifying check or attack: +${bonus} circumstance bonus. Expires after that roll or before this ship's next turn.`,
    "captain-rally-crew": profile.master
      ? `Spend 1 Supply. Restore ${20 * bonus}% Morale OR restore Morale; if you improve the area, also restore ${20 * bonus}% Morale.`
      : `Spend 1 Supply. Restore ${20 * bonus}% Morale OR improve the Morale 1 damage step.`,
    "captain-drive-the-crew": `Gain 1 AP this turn. Spend 20% Morale and gain ${cost.strain} Strain. Once per round.`,
    "captain-coordinate-assault": `Mark one hostile vessel. Its Hardness is reduced by ${bonus} against the next ${charges} qualifying weapon attack${charges === 1 ? "" : "s"} before this ship's next turn.`,
    "captain-brace-for-impact": `Reaction: reduce incoming Hull damage by ${3 * bonus} after Hardness.`,

    "engineer-vent-strain": `Reduce ship Strain by ${1 + bonus}, to a minimum of 0.`,
    "engineer-overcharge-arkengine": `Gain another full Helm block this turn: +${speed} movement and +${maneuverability} facing step${maneuverability === 1 ? "" : "s"}. Gain 2 Strain. Once per round.`,
    "engineer-emergency-repair": profile.master
      ? `Spend 2 Supplies. Choose Hull, Arkengine, Rigging, or Lifeveil and improve that area's damage state by 2 steps.`
      : `Spend 2 Supplies. Choose Hull, Arkengine, Rigging, or Lifeveil and improve that area's damage state by 1 step.`,
    "engineer-redistribute-power": `Gain 1 Strain. Choose: Propulsion = +${bonus} movement and +1 maneuver step now; Weapons = +${bonus} damage on next ${charges} attack${charges === 1 ? "" : "s"}; Lifeveil = reduce next ${charges} wardable hit${charges === 1 ? "" : "s"} by ${2 * bonus}.`,
    "engineer-emergency-bypass": `Reaction: reduce Strain from an Engineer action by ${bonus}, to a minimum of 0.`,

    "navigator-move": `Gain +${speed} movement this turn (one additional Combat Speed block). May interleave movement, legal turns, and weapon fire.`,
    "navigator-maneuver": `Gain +${maneuverability} facing step${maneuverability === 1 ? "" : "s"} this turn and may pivot in place.`,
    "navigator-hard-turn": `Gain +${maneuverability + bonus} facing steps this turn (${maneuverability} Maneuverability + ${bonus} Station Bonus), may pivot in place, and gain 1 Rigging Strain.`,
    "navigator-set-attack-vector": `Choose one facing. Its weapons gain +${15 * bonus}° firing-arc tolerance until the heading changes or this ship's next turn.`,
    "navigator-evasive-maneuver": `Reaction: when targeted, gain +${bonus} AC against that attack, then gain 1 Rigging Strain.`,

    "battlewatch-acquire-target": `Choose an enemy vessel. The next weapon attack against it gains +${bonus} circumstance bonus to the attack roll.`,
    "battlewatch-fire-weapon": `Fire one ready installed weapon at a legal target. Cost is that weapon's Fire AP; range, arc, attack, damage, Hardness and reload resolve automatically.`,
    "battlewatch-reload-weapon": `Spend 1 Supply. Reduce one installed weapon's remaining reload by ${bonus} round${bonus === 1 ? "" : "s"}, to a minimum of 0.`,
    "battlewatch-ready-broadside": profile.master
      ? `Spend 1 Supply. Choose Port or Starboard. Next shot gains +${2 * bonus} damage and reduces its resulting reload by 1 round.`
      : `Spend 1 Supply. Choose Port or Starboard. Next shot gains +${2 * bonus} damage.`,
    "battlewatch-spoil-their-aim": `Reaction: when an enemy declares a weapon attack against this ship, that attack takes −${bonus} circumstance penalty.`,

    "veilwarden-reinforce-lifeveil": `Spend 5 Lifeveil. Reduce damage from the next ${charges} wardable hit${charges === 1 ? "" : "s"} by ${2 * bonus} before Hardness. Expires before this ship's next turn.`,
    "veilwarden-mend-lifeveil": `Restore ${5 * bonus} Lifeveil, up to the vessel's current maximum.`,
    "veilwarden-focus-ward": `Spend 10 Lifeveil. Choose an area or energy type. Reduce damage from the next ${charges} matching hit${charges === 1 ? "" : "s"} by ${3 * bonus} before Hardness.`,
    "veilwarden-purge-interference": `Remove 1 tracked supernatural, aetheric, or environmental ship condition interfering with the vessel or Lifeveil.`,
    "veilwarden-emergency-ward": `Reaction: spend 5 Lifeveil and reduce this incoming wardable hit by ${4 * bonus} before Hardness.`
  };

  return effects[action.id] ?? stationActionRulesText(action) ?? "Use this station action.";
}

function actionRuleChips(action, actor) {
  const level = shipLevel(actor);
  const profile = stationEffectProfile(level);
  const rules = action.rules ?? {};
  const cost = stationActionEconomy(action, level);
  const chips = [];

  if (action.id === "captain-drive-the-crew") chips.push({ label: "+1 AP", tone: "free" });
  else {
    if (cost.ap > 0) chips.push({ label: `${cost.ap} AP`, tone: "cost" });
    if (cost.rp > 0) chips.push({ label: `${cost.rp} RP`, tone: "reaction" });
  }
  if (cost.morale > 0) chips.push({ label: `−${cost.morale}% Morale`, tone: "morale" });
  if (cost.supplies > 0) chips.push({ label: `−${cost.supplies} ${cost.supplies === 1 ? "Supply" : "Supplies"}`, tone: "supply" });
  if (cost.lifeveil > 0) chips.push({ label: `−${cost.lifeveil}% Lifeveil`, tone: "lifeveil" });
  if (cost.strain > 0) chips.push({ label: `+${cost.strain} Strain`, tone: "strain" });
  if (!chips.length) chips.push({ label: "No fixed cost", tone: "free" });

  chips.push({ label: action.timing === "reaction" ? "Reaction" : "Action", tone: action.timing === "reaction" ? "reaction" : "timing" });
  chips.push({ label: `Station Bonus +${profile.bonus}`, tone: "bonus", title: STATION_BONUS_DEFINITION });

  if (rules.oncePerRound) chips.push({ label: "Once / Round", tone: "limit" });
  if (rules.chooseStation) chips.push({ label: "Choose Station", tone: "choice" });
  if (rules.chooseTarget) chips.push({ label: "Choose Target", tone: "choice" });
  if (rules.chooseWeapon) chips.push({ label: "Choose Weapon", tone: "choice" });
  if (rules.chooseSystem) chips.push({ label: "Choose System", tone: "choice" });
  if (rules.chooseFacing) chips.push({ label: "Choose Facing", tone: "choice" });
  if (rules.chooseAreaOrEnergy) chips.push({ label: "Choose Threat", tone: "choice" });
  if (rules.expires === "next-turn") chips.push({ label: "Until Next Turn", tone: "duration" });
  if (rules.expires === "heading-change-or-next-turn") chips.push({ label: "Until Turn / Heading", tone: "duration" });
  if (rules.expires === "fired-or-next-turn") chips.push({ label: "Next Shot", tone: "duration" });
  if (rules.expires === "charges-or-next-turn") chips.push({ label: profile.advanced ? "2 Uses" : "1 Use", tone: "duration" });
  if (rules.trigger) chips.push({ label: "Triggered", tone: "reaction" });

  return chips;
}

function ensureStationBonusHelp(root, actor) {
  const list = root.querySelector(".afcs-action-list");
  if (!list) return;
  const profile = stationEffectProfile(shipLevel(actor));
  let help = root.querySelector(".afcs-station-bonus-help");
  if (!help) {
    help = document.createElement("aside");
    help.className = "afcs-station-bonus-help";
    list.before(help);
  }
  help.innerHTML = `<strong>Station Bonus +${profile.bonus}</strong><span>${STATION_BONUS_DEFINITION}</span>`;
}

function decorateActionCards(app, root) {
  const actor = app.actor ?? (app.actorId ? game.actors?.get(app.actorId) : null);
  const combatant = activeCombatant(actor);
  const state = combatant ? game.arkflight?.combat?.state?.(combatant) : null;
  const actions = game.arkflight?.combat?.actions ?? {};
  ensureStationBonusHelp(root, actor);

  for (const card of root.querySelectorAll("[data-action-card]")) {
    const actionId = card.querySelector("[data-station-action]")?.dataset.stationAction;
    const action = actionId ? actions[actionId] : null;
    if (!action) continue;

    const text = card.querySelector(".afcs-action-text");
    if (!text) continue;
    const oldSummary = text.querySelector(":scope > span");
    if (oldSummary) {
      oldSummary.classList.add("afcs-action-effect");
      oldSummary.textContent = resolvedStationEffect(action, actor, state);
    }

    let chips = text.querySelector(".afcs-rule-chips");
    if (!chips) {
      chips = document.createElement("div");
      chips.className = "afcs-rule-chips";
      text.append(chips);
    }
    chips.replaceChildren(...actionRuleChips(action, actor).map(({ label, tone, title }) => {
      const chip = document.createElement("span");
      chip.className = `afcs-rule-chip is-${tone}`;
      chip.textContent = label;
      if (title) chip.title = title;
      return chip;
    }));

    const metaCost = card.querySelector(".afcs-action-meta > em");
    if (metaCost) {
      const cost = stationActionEconomy(action, shipLevel(actor));
      const parts = [];
      if (action.id === "captain-drive-the-crew") parts.push("+1 AP");
      else {
        if (cost.ap) parts.push(`${cost.ap} AP`);
        if (cost.rp) parts.push(`${cost.rp} RP`);
      }
      if (cost.morale) parts.push(`−${cost.morale}% Morale`);
      if (cost.supplies) parts.push(`−${cost.supplies} Supply`);
      if (cost.lifeveil) parts.push(`−${cost.lifeveil}% Lifeveil`);
      if (cost.strain) parts.push(`+${cost.strain} Strain`);
      metaCost.textContent = parts.join(" · ") || "No cost";
    }

    let details = text.querySelector(".afcs-action-full-rules");
    if (!details) {
      details = document.createElement("details");
      details.className = "afcs-action-full-rules";
      const summary = document.createElement("summary");
      summary.textContent = "Full Rules";
      const paragraph = document.createElement("p");
      details.append(summary, paragraph);
      text.append(details);
    }
    const paragraph = details.querySelector("p");
    if (paragraph) paragraph.textContent = stationActionRulesText(action);
    card.title = "";
  }
}

function bindCommandStations(app, root) {
  for (const button of root.querySelectorAll("[data-command-station]")) {
    if (button.dataset.afchBound === "true") continue;
    button.dataset.afchBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      app.selectedStation = button.dataset.commandStation;
      app.openPanel = "stations";
      app.render?.({ force: true });
    });
  }
}

function bindClose(app, root) {
  const button = root.querySelector("[data-afch-close]");
  if (!button || button.dataset.afchBound === "true") return;
  button.dataset.afchBound = "true";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    app.close?.();
  });
}

function bindEndTurn(app, root) {
  const button = root.querySelector("[data-end-turn]");
  if (!button || button.dataset.afchTurnBound === "true") return;
  button.dataset.afchTurnBound = "true";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const combat = game.combat;
    if (!combat) {
      ui.notifications?.warn("No active Foundry combat exists.");
      return;
    }
    if (!combat.started) {
      ui.notifications?.warn("Start the Foundry combat encounter before ending a ship turn.");
      return;
    }

    const api = game.arkflight?.combat;
    const combatant = combat.combatant ?? null;
    if (!api?.canEndTurn?.(combatant)) {
      ui.notifications?.warn("You may only end the active turn for a ship you own.");
      return;
    }

    button.disabled = true;
    try {
      const advanced = await api.endTurn(combatant);
      if (advanced === false) {
        button.disabled = false;
        app.render?.({ force: true });
        return;
      }
      if (game.user?.isGM) {
        const next = combat.combatant ?? null;
        if (next?.actor && shipPayload(next.actor)) app.setReference?.(next.actor);
        else app.render?.({ force: true });
      }
    } catch (error) {
      console.error("Arkflight | End Turn failed", error);
      ui.notifications?.error(error?.message ?? "Could not advance to the next combatant.");
      button.disabled = false;
    }
  }, { capture: true });
}

function followActiveShip(app) {
  const current = game.combat?.combatant ?? null;
  if (!current?.actor || !shipPayload(current.actor)) return;
  if (app.actorId === current.actor.id) return;
  app.setReference?.(current.actor);
}

function enhance(app) {
  const root = hudRoot(app);
  if (!root) return;
  updateVitals(app, root);
  decorateActionCards(app, root);
  bindCommandStations(app, root);
  bindClose(app, root);
  bindEndTurn(app, root);
}

Hooks.on("renderApplicationV2", enhance);
Hooks.on("renderApplication", enhance);
Hooks.on("arkflightCombatTurnChanged", ({ combatant }) => {
  const app = game.arkflight?.combatConsole?.application ?? null;
  if (!app?.rendered || !combatant?.actor || !shipPayload(combatant.actor)) return;
  if (app.actorId !== combatant.actor.id) app.setReference?.(combatant.actor);
});
Hooks.on("updateCombat", (combat, changes) => {
  if (!(Object.hasOwn(changes ?? {}, "turn") || Object.hasOwn(changes ?? {}, "round"))) return;
  const app = game.arkflight?.combatConsole?.application ?? null;
  if (app?.rendered && combat === game.combat) requestAnimationFrame(() => followActiveShip(app));
});
