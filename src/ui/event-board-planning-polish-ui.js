import { getMasteryTechnique } from "../content/base-mastery.js";
import { getCrewEdgeCard } from "../content/crew-edge-cards.js";
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

function compactUtility(root) {
  const strip = root.querySelector(".arkflight-utility-strip");
  if (!strip || strip.dataset.planningPolished === "true") return;
  strip.classList.add("arkflight-planning-utility-compact", "arkflight-planning-utility-no-mastery");
  strip.dataset.planningPolished = "true";
  strip.querySelector(".arkflight-mastery-panel")?.remove();
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

async function openActorDocument(actor) {
  if (!actor) return;
  try {
    console.log("Arkflight | Force-opening assigned officer sheet", { actorId: actor.id, actorName: actor.name });
    const sheet = actor.sheet;
    if (!sheet || typeof sheet.render !== "function") {
      throw new Error("Assigned PF2e Actor has no renderable sheet API.");
    }

    // PF2e v8.4.1 uses the legacy CharacterSheetPF2e application. Passing true is
    // the important part: it forces a closed sheet to open rather than merely
    // requesting a refresh of an already-rendered application.
    const result = sheet.render(true);
    if (result?.then) await result;

    console.log("Arkflight | Assigned officer sheet force-open requested", {
      actorId: actor.id,
      actorName: actor.name,
      sheetClass: sheet.constructor?.name,
      rendered: sheet.rendered
    });
  } catch (error) {
    console.error("Arkflight | Could not open assigned officer sheet", error);
    ui.notifications?.warn?.(`Could not open ${actor.name}'s character sheet.`);
  }
}

function installPortraitButton(row, focus, state, stationId) {
  let portraitButton = row.querySelector(":scope > .arkflight-portrait-sheet-button");
  if (portraitButton) return;

  const avatar = focus.querySelector(".arkflight-planning-avatar");
  if (!avatar) return;

  const actorId = state.assignments?.[stationId]?.actorId ?? null;
  const actor = actorId ? game.actors.get(actorId) : null;

  const slot = document.createElement("span");
  slot.className = "arkflight-planning-avatar-slot";
  slot.setAttribute("aria-hidden", "true");
  avatar.replaceWith(slot);

  portraitButton = document.createElement("button");
  portraitButton.type = "button";
  portraitButton.className = "arkflight-portrait-sheet-button";
  portraitButton.dataset.actorId = actorId ?? "";
  portraitButton.title = actor ? `Open ${actor.name}'s character sheet` : "No assigned officer";
  portraitButton.setAttribute("aria-label", actor ? `Open ${actor.name}'s character sheet` : "No assigned officer");
  portraitButton.append(avatar);
  row.append(portraitButton);

  portraitButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const currentActorId = state.assignments?.[stationId]?.actorId ?? portraitButton.dataset.actorId ?? null;
    const currentActor = currentActorId ? game.actors.get(currentActorId) : null;
    if (!currentActor) {
      ui.notifications?.warn?.("No PF2e character is assigned to this station.");
      return;
    }
    await openActorDocument(currentActor);
  });
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
    row.dataset.stationId = stationId;
    readyNode?.remove();

    if (masteryNode) masteryNode.remove();
    if (details && !row.querySelector(":scope > .arkflight-rail-mastery-link")) {
      const masteryButton = document.createElement("button");
      masteryButton.type = "button";
      masteryButton.className = "arkflight-rail-mastery-link";
      masteryButton.dataset.stationMastery = stationId;
      masteryButton.innerHTML = `<span>${details.mastery.name}</span><strong>${details.expended ? "USED" : "READY"}</strong>`;
      masteryButton.title = "Click for Mastery details";
      masteryButton.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await showMastery(state, stationId);
      });
      const controls = row.querySelector(":scope > .arkflight-planning-order-controls");
      row.insertBefore(masteryButton, controls ?? null);
    }

    installPortraitButton(row, focus, state, stationId);
  }
}

function expandStationHitArea(root) {
  for (const row of root.querySelectorAll(".arkflight-planning-station-row")) {
    if (row.dataset.hitAreaBound === "true") continue;
    row.dataset.hitAreaBound = "true";
    row.addEventListener("click", (event) => {
      if (event.target.closest(".arkflight-planning-order-controls")) return;
      if (event.target.closest(".arkflight-rail-mastery-link")) return;
      if (event.target.closest(".arkflight-portrait-sheet-button")) return;
      if (event.target.closest(".arkflight-planning-station-focus")) return;
      row.querySelector(".arkflight-planning-station-focus")?.click();
    });
  }
}

function polishPlanning(root, controller) {
  if (controller.state?.phase !== "planning") return;
  root.querySelector(".arkflight-order-bar")?.remove();
  root.querySelector(".arkflight-score-key")?.remove();
  compactUtility(root);
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
