import { getMasteryTechnique } from "../content/base-mastery.js";
import { activeStationId } from "../event/resolution-state.js";
import { stationPresentation } from "./station-presentation.js";

const STYLE_ID = "arkflight-mastery-clarity-style";

function ownerLevel() { return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3; }
function ownsActor(actor) { return Boolean(actor?.isOwner || actor?.testUserPermission?.(game.user, ownerLevel())); }
function ownsStation(state, stationId) {
  if (game.user.isGM) return true;
  const actorId = state?.assignments?.[stationId]?.actorId;
  return Boolean(actorId && ownsActor(game.actors.get(actorId)));
}
function ready(state, stationId) {
  const masteryId = state?.masterySelections?.[stationId] ?? null;
  return Boolean(masteryId && !state?.masteryUses?.[stationId]);
}
function stationName(id) { return stationPresentation(id)?.displayName ?? id; }

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .arkflight-score-key{margin:7px 0 10px;padding:6px 8px;border:1px solid rgba(195,155,82,.28);background:rgba(0,0,0,.18);font-size:10px;color:#b9ae99;letter-spacing:.02em}
    .arkflight-score-key strong{color:#e7d39a}
    .arkflight-mastery-now{margin:12px 0;padding:11px 12px;border:1px solid #d0a945;background:linear-gradient(90deg,rgba(104,75,23,.38),rgba(38,31,19,.82));box-shadow:0 0 0 1px rgba(208,169,69,.16) inset,0 0 14px rgba(208,169,69,.08)}
    .arkflight-mastery-now .arkflight-mastery-now-kicker{font-size:10px;letter-spacing:.16em;color:#f0c969;font-weight:800}
    .arkflight-mastery-now strong{display:block;margin-top:3px;font-size:14px;color:#fff0c4}
    .arkflight-mastery-now p{margin:4px 0 8px!important;font-size:11px!important;line-height:1.4!important;color:#d9cfb8!important}
    .arkflight-mastery-now button{width:100%;min-height:34px;border:1px solid #d0a945;background:#5d4825;color:#fff3cf;font-weight:800;cursor:pointer}
    .arkflight-mastery-now button:hover{background:#765b2c}
    .arkflight-mastery-chip.available-now{border-color:#d0a945!important;box-shadow:0 0 0 1px rgba(208,169,69,.25) inset,0 0 10px rgba(208,169,69,.12);background:rgba(91,67,24,.28)!important}
    .arkflight-mastery-chip.available-now::after{content:'AVAILABLE NOW';display:block;margin-top:3px;color:#f0c969;font-size:9px;font-weight:800;letter-spacing:.08em}
  `;
  document.head.append(style);
}

function currentOpportunity(state) {
  if (!state?.setupLocked || state.phase !== "resolution") return null;
  const active = activeStationId(state);
  if (!active) return null;

  if (ready(state, "engineer") && ownsStation(state, "engineer") && state.masterySelections.engineer === "engineer-redline-the-arkengine" && ["engineer", "navigator"].includes(active)) {
    return {
      ownerStation: "engineer",
      masteryId: "engineer-redline-the-arkengine",
      text: `${stationName(active)} is about to roll. Improve the final degree by one step; Arkengine Pressure +1 afterward.`,
      label: `REDLINE ${stationName(active).toUpperCase()}`,
      options: { targetStationId: active }
    };
  }

  if (ready(state, "navigator") && ownsStation(state, "navigator") && state.masterySelections.navigator === "navigator-find-another-way") {
    return {
      ownerStation: "navigator",
      masteryId: "navigator-find-another-way",
      text: `${stationName(active)} is about to roll. Find a better line and add +3 to this PF2e check.`,
      label: `GIVE ${stationName(active).toUpperCase()} +3`,
      options: { targetStationId: active }
    };
  }

  if (ready(state, "watchmaster") && ownsStation(state, "watchmaster") && state.masterySelections.watchmaster === "watchmaster-call-the-true-opening" && Number(state.selections?.[active]?.riskTier ?? 0) > 0) {
    const tier = Number(state.selections[active].riskTier);
    const reduced = tier === 2 ? 0 : tier === 5 ? 2 : 5;
    return {
      ownerStation: "watchmaster",
      masteryId: "watchmaster-call-the-true-opening",
      text: `${stationName(active)} is attempting a +${tier} Heroic Bid. Reduce the Risk increase to +${reduced}; keep the original Heroic payoff.`,
      label: `REDUCE HEROIC +${tier} TO +${reduced}`,
      options: { targetStationId: active }
    };
  }

  if (ready(state, "veilwarden") && ownsStation(state, "veilwarden") && state.masterySelections.veilwarden === "veilwarden-sanctuary" && (state.encounter?.hazards?.length ?? 0) > 0) {
    return {
      ownerStation: "veilwarden",
      masteryId: "veilwarden-sanctuary",
      text: `${stationName(active)} is about to roll while Hazards are active. Ignore active Hazard penalties and authored restrictions for this check.`,
      label: `SANCTUARY FOR ${stationName(active).toUpperCase()}`,
      options: { targetStationId: active }
    };
  }

  return null;
}

function decorateSetup(root, state) {
  for (const select of root.querySelectorAll("select[data-ark-setup='mastery']")) {
    const stationId = select.dataset.station;
    const mastery = getMasteryTechnique(stationId, select.value || state.masterySelections?.[stationId]);
    if (!mastery) continue;
    select.title = `TRIGGER: ${mastery.triggerLabel ?? mastery.timing}\n${mastery.description}`;
  }
}

function addScoreKey(root) {
  if (root.querySelector(".arkflight-score-key")) return;
  const order = root.querySelector(".arkflight-order-bar");
  if (!order) return;
  const key = document.createElement("div");
  key.className = "arkflight-score-key";
  key.innerHTML = `<strong>ROUND SCORE</strong> &nbsp; Critical Success +2 · Success +1 · Failure −1 · Critical Failure −2 &nbsp; <strong>0 = Narrow Success</strong>`;
  order.insertAdjacentElement("afterend", key);
}

function labelNarrowSuccess(root, state) {
  if (state?.phase !== "round-result" || state?.roundResult?.bandId !== "mixed-success") return;
  const panel = root.querySelector(".arkflight-round-result-panel h2");
  if (panel) panel.textContent = panel.textContent.replace(/mixed-success/ig, "Narrow Success");
}

function decorateOpportunity(root, controller) {
  root.querySelectorAll(".arkflight-mastery-chip.available-now").forEach((node) => node.classList.remove("available-now"));
  root.querySelector(".arkflight-mastery-now")?.remove();

  const state = controller.state;
  const opportunity = currentOpportunity(state);
  if (!opportunity) return;
  const mastery = getMasteryTechnique(opportunity.ownerStation, opportunity.masteryId);
  if (!mastery) return;

  for (const chip of root.querySelectorAll(".arkflight-mastery-chip")) {
    if (chip.textContent.includes(mastery.name)) chip.classList.add("available-now");
  }

  const focus = root.querySelector(".arkflight-resolution-focus");
  if (!focus) return;
  const box = document.createElement("section");
  box.className = "arkflight-mastery-now";
  box.innerHTML = `<div class="arkflight-mastery-now-kicker">◆★ MASTERY AVAILABLE NOW — ${stationName(opportunity.ownerStation).toUpperCase()}</div><strong>${mastery.name}</strong><p>${opportunity.text}</p><button type="button"><i class="fa-solid fa-star"></i> ${opportunity.label}</button>`;
  box.querySelector("button").addEventListener("click", async () => {
    try {
      await controller.command({ type: "use-mastery", station: opportunity.ownerStation, options: opportunity.options });
    } catch (error) {
      console.error("Arkflight | Mastery availability action failed", error);
      ui.notifications?.warn(error.message);
    }
  });
  const finalDc = focus.querySelector(".arkflight-resolution-final-dc");
  if (finalDc) finalDc.insertAdjacentElement("afterend", box);
  else focus.append(box);
}

Hooks.once("init", ensureStyles);
Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== "arkflight-event-board") return;
  const root = element instanceof HTMLElement ? element : element?.[0] instanceof HTMLElement ? element[0] : app.element;
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state) return;
  decorateSetup(root, controller.state);
  addScoreKey(root);
  labelNarrowSuccess(root, controller.state);
  decorateOpportunity(root, controller);
});
