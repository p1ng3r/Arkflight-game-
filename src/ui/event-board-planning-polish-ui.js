import { getMasteryTechnique } from "../content/base-mastery.js";
import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { STATIONS } from "../event/event-schema.js";
import { stationPresentation } from "./station-presentation.js";

function rootFor(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

async function showAbilityDetails({ title, kicker, description, trigger, effect, status }) {
  const DialogV2 = foundry.applications.api.DialogV2;
  await DialogV2.input({
    window: { title },
    classes: ["arkflight", "arkflight-ability-info-dialog"],
    modal: true,
    rejectClose: false,
    content: `<div class="arkflight-ability-info"><div class="arkflight-kicker">${kicker}</div><h3>${title}</h3>${status ? `<p><strong>Status:</strong> ${status}</p>` : ""}${description ? `<p>${description}</p>` : ""}${trigger ? `<p><strong>Trigger:</strong> ${trigger}</p>` : ""}${effect ? `<p><strong>Effect:</strong> ${effect}</p>` : ""}</div>`,
    ok: { label: "Close", icon: "fa-solid fa-xmark" }
  });
}

function masteryDetails(state, stationId) {
  const mastery = getMasteryTechnique(stationId, state.masterySelections?.[stationId]);
  if (!mastery) return null;
  return {
    mastery,
    expended: Boolean(state.masteryUses?.[stationId]),
    stationName: stationPresentation(stationId)?.displayName ?? stationId
  };
}

async function showMastery(state, stationId) {
  const details = masteryDetails(state, stationId);
  if (!details) return;
  await showAbilityDetails({
    title: details.mastery.name,
    kicker: `${details.stationName} Mastery`,
    description: details.mastery.description,
    trigger: details.mastery.triggerLabel ?? details.mastery.timing ?? "See trigger",
    status: details.expended ? "Used" : "Ready"
  });
}

function compactMasteries(strip, state) {
  const chips = [...strip.querySelectorAll(".arkflight-mastery-chip")];
  for (const chip of chips) {
    const stationId = STATIONS.find((id) => {
      const mastery = getMasteryTechnique(id, state.masterySelections?.[id]);
      return mastery && chip.textContent.includes(mastery.name);
    });
    if (!stationId) continue;
    const details = masteryDetails(state, stationId);
    if (!details) continue;
    chip.innerHTML = `<span class="arkflight-ability-info-link" role="link" tabindex="0"></span><span class="arkflight-ability-state">${details.expended ? "USED" : "READY"}</span>`;
    const link = chip.querySelector(".arkflight-ability-info-link");
    link.textContent = `${details.stationName} — ${details.mastery.name}`;
    const open = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await showMastery(state, stationId);
    };
    link.addEventListener("click", open, true);
    link.addEventListener("keydown", async (event) => { if (event.key === "Enter" || event.key === " ") await open(event); }, true);
  }
}

function compactTactics(strip) {
  const chips = [...strip.querySelectorAll(".arkflight-tactic-chip")];
  for (const chip of chips) {
    const tacticId = chip.dataset.useTactic;
    const tactic = getCrewEdgeCard(tacticId);
    if (!tactic) continue;
    chip.innerHTML = `<span class="arkflight-ability-info-link" role="link" tabindex="0"></span><span class="arkflight-tactic-play">PLAY</span>`;
    const link = chip.querySelector(".arkflight-ability-info-link");
    link.textContent = tactic.name;
    const open = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      await showAbilityDetails({ title: tactic.name, kicker: `Crew Tactic — ${String(tactic.theater ?? "").replace("-", " ")}`, trigger: tactic.trigger, effect: tactic.effect, status: "Ready" });
    };
    link.addEventListener("click", open, true);
    link.addEventListener("keydown", async (event) => { if (event.key === "Enter" || event.key === " ") await open(event); }, true);
  }
  strip.querySelector(".arkflight-tactics-panel")?.classList.toggle("is-empty", chips.length === 0);
}

function compactUtility(root, state) {
  const strip = root.querySelector(".arkflight-utility-strip");
  if (!strip || strip.dataset.planningPolished === "true") return;
  strip.classList.add("arkflight-planning-utility-compact");
  strip.dataset.planningPolished = "true";
  compactMasteries(strip, state);
  compactTactics(strip);
}

function bindMasteryCard(root, state) {
  const card = root.querySelector(".arkflight-planning-mastery-card");
  if (!card || card.dataset.infoBound === "true") return;
  const focused = root.querySelector(".arkflight-planning-station-row.is-focused [data-arkflight-focus-station]")?.dataset.arkflightFocusStation;
  if (!focused) return;
  const details = masteryDetails(state, focused);
  if (!details) return;
  card.dataset.infoBound = "true";
  card.title = "Click for Mastery details";
  card.addEventListener("click", () => showMastery(state, focused));
}

function compactStationRows(root, state) {
  for (const row of root.querySelectorAll(".arkflight-planning-station-row")) {
    const focus = row.querySelector("[data-arkflight-focus-station]");
    const stationId = focus?.dataset.arkflightFocusStation;
    if (!focus || !stationId) continue;

    const summary = focus.querySelector(".arkflight-planning-summary");
    const masteryNode = summary?.querySelector(".arkflight-planning-mastery");
    const readyNode = focus.querySelector(".arkflight-planning-ready-state");
    const details = masteryDetails(state, stationId);

    row.classList.add("arkflight-command-summary-row");
    readyNode?.remove();

    if (masteryNode && details && masteryNode.dataset.masteryLink !== "true") {
      masteryNode.dataset.masteryLink = "true";
      masteryNode.classList.add("arkflight-rail-mastery-link");
      masteryNode.setAttribute("role", "link");
      masteryNode.setAttribute("tabindex", "0");
      masteryNode.innerHTML = `<span>${details.mastery.name}</span><strong>${details.expended ? "USED" : "READY"}</strong>`;
      const open = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        await showMastery(state, stationId);
      };
      masteryNode.addEventListener("click", open, true);
      masteryNode.addEventListener("keydown", async (event) => { if (event.key === "Enter" || event.key === " ") await open(event); }, true);
    }
  }
}

function expandStationHitArea(root) {
  for (const row of root.querySelectorAll(".arkflight-planning-station-row")) {
    if (row.dataset.hitAreaBound === "true") continue;
    row.dataset.hitAreaBound = "true";
    row.addEventListener("click", (event) => {
      if (event.target.closest(".arkflight-planning-order-controls")) return;
      if (event.target.closest(".arkflight-rail-mastery-link")) return;
      if (event.target.closest(".arkflight-planning-station-focus")) return;
      row.querySelector(".arkflight-planning-station-focus")?.click();
    });
  }
}

function polishPlanning(root, controller) {
  if (controller.state?.phase !== "planning") return;
  root.querySelector(".arkflight-order-bar")?.remove();
  root.querySelector(".arkflight-score-key")?.remove();
  compactUtility(root, controller.state);
  compactStationRows(root, controller.state);
  expandStationHitArea(root);
  bindMasteryCard(root, controller.state);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootFor(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller?.state) return;
  requestAnimationFrame(() => polishPlanning(root, controller));
});
