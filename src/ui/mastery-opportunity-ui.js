import { getMasteryTechnique } from "../content/base-mastery.js";
import { activeStationId } from "../event/resolution-state.js";
import { stationPresentation } from "./station-presentation.js";

const seen = new Set();
const hazardSnapshots = new Map();

function ownerLevel() { return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3; }
function ownsActor(actor) { return Boolean(actor?.isOwner || actor?.testUserPermission?.(game.user, ownerLevel())); }
function ownsStation(state, stationId) {
  const actorId = state?.assignments?.[stationId]?.actorId;
  return Boolean(actorId && ownsActor(game.actors.get(actorId)));
}
function ready(state, stationId, masteryId) {
  return state?.masterySelections?.[stationId] === masteryId && !state?.masteryUses?.[stationId];
}
function unresolved(state) { return (state?.order ?? []).filter((id) => !state?.results?.[id]); }
function stationName(id) { return stationPresentation(id)?.displayName ?? id; }
function optionRows(ids) { return ids.map((id) => `<option value="${id}">${stationName(id)}</option>`).join(""); }
function systemRows(ids) { return ids.map((id) => `<option value="${id}">${String(id).replaceAll("-", " ")}</option>`).join(""); }

async function confirmOpportunity({ key, title, text, useLabel = "Use Mastery", onUse, onDecline = null }) {
  if (seen.has(key)) return;
  seen.add(key);
  const yes = await foundry.applications.api.DialogV2.confirm({
    window: { title },
    classes: ["arkflight", "arkflight-mastery-dialog"],
    content: `<div class="arkflight-mastery-preview"><strong>MASTERY AVAILABLE</strong><p>${text}</p></div>`,
    modal: false,
    rejectClose: false,
    yes: { label: useLabel, icon: "fa-solid fa-star" },
    no: { label: "Not Now" }
  });
  if (yes) await onUse();
  else if (onDecline) await onDecline();
}

async function selectOpportunity({ key, title, text, label, optionsHtml, useLabel = "Use Mastery", onUse, onDecline = null }) {
  if (seen.has(key)) return;
  seen.add(key);
  const form = await foundry.applications.api.DialogV2.input({
    window: { title },
    classes: ["arkflight", "arkflight-mastery-dialog"],
    content: `<div class="arkflight-mastery-preview"><strong>MASTERY AVAILABLE</strong><p>${text}</p></div><label>${label}<select name="choice">${optionsHtml}</select></label>`,
    modal: false,
    rejectClose: false,
    ok: { label: useLabel, icon: "fa-solid fa-star" }
  });
  if (form?.choice) await onUse(form.choice);
  else if (onDecline) await onDecline();
}

async function pressureRedirectOpportunity({ controller, window, mastery, all = false }) {
  const systems = window.pressureSystems ?? [];
  if (!systems.length) return;
  const key = `${controller.state.eventId}:${window.id}`;
  if (all) {
    await selectOpportunity({
      key,
      title: mastery.name,
      text: mastery.description,
      label: "Pressure source",
      optionsHtml: systemRows(systems),
      onUse: async (fromSystem) => controller.command({ type: "use-mastery", station: window.stationId, windowId: window.id, options: { fromSystem } }),
      onDecline: async () => controller.command({ type: "dismiss-mastery-window", station: window.stationId, windowId: window.id })
    });
    return;
  }

  if (seen.has(key)) return;
  seen.add(key);
  const allSystems = ["hull", "arkengine", "lifeveil", "rigging"];
  const form = await foundry.applications.api.DialogV2.input({
    window: { title: mastery.name },
    classes: ["arkflight", "arkflight-mastery-dialog"],
    content: `<div class="arkflight-mastery-preview"><strong>MASTERY AVAILABLE</strong><p>${mastery.description}</p></div><label>Pressure source<select name="fromSystem">${systemRows(systems)}</select></label><label>Redirect to<select name="toSystem">${systemRows(allSystems)}</select></label>`,
    modal: false,
    rejectClose: false,
    ok: { label: "Crosswire Systems", icon: "fa-solid fa-star" }
  });
  if (form?.fromSystem && form?.toSystem && form.fromSystem !== form.toSystem) {
    await controller.command({ type: "use-mastery", station: window.stationId, windowId: window.id, options: { fromSystem: form.fromSystem, toSystem: form.toSystem } });
  } else {
    await controller.command({ type: "dismiss-mastery-window", station: window.stationId, windowId: window.id });
  }
}

async function promptPendingWindows(controller) {
  const state = controller.state;
  for (const window of state.pendingMasteryWindows ?? []) {
    if (!ownsStation(state, window.stationId)) continue;
    const mastery = getMasteryTechnique(window.stationId, window.masteryId);
    if (!mastery) continue;
    const key = `${state.eventId}:${window.id}`;
    if (window.masteryId === "captain-not-like-this") {
      const result = state.results?.[window.sourceStationId];
      const after = result?.degreeKey === "criticalFailure" ? "Failure" : "Success";
      await confirmOpportunity({
        key, title: mastery.name,
        text: `${stationName(window.sourceStationId)} rolled ${String(result?.degreeKey ?? "failure").replace(/([A-Z])/g, " $1")}. Improve it one step to <strong>${after}</strong>?`,
        onUse: () => controller.command({ type: "use-mastery", station: "captain", windowId: window.id, options: { sourceStationId: window.sourceStationId } }),
        onDecline: () => controller.command({ type: "dismiss-mastery-window", station: "captain", windowId: window.id })
      });
    } else if (window.masteryId === "engineer-crosswire-the-systems") {
      await pressureRedirectOpportunity({ controller, window, mastery, all: false });
    } else if (window.masteryId === "veilwarden-stand-between") {
      await pressureRedirectOpportunity({ controller, window, mastery, all: true });
    } else if (window.masteryId === "veilwarden-seal-the-impossible") {
      await confirmOpportunity({
        key, title: mastery.name, text: mastery.description,
        onUse: () => controller.command({ type: "use-mastery", station: "veilwarden", windowId: window.id, options: {} }),
        onDecline: () => controller.command({ type: "dismiss-mastery-window", station: "veilwarden", windowId: window.id })
      });
    }
  }
}

async function promptAfterResult(controller) {
  const state = controller.state;
  if (state.phase !== "resolution" || !state.lastResolvedStationId) return;
  const sourceId = state.lastResolvedStationId;
  const result = state.results?.[sourceId];
  const targets = unresolved(state);
  if (!result || !targets.length) return;
  const token = `${state.eventId}:${state.roundIndex}:${state.lastResolvedAt}`;

  if (ownsStation(state, "captain") && ready(state, "captain", "captain-carry-the-deed") && result.riskEarned) {
    const mastery = getMasteryTechnique("captain", "captain-carry-the-deed");
    await selectOpportunity({
      key: `${token}:carry`, title: mastery.name,
      text: `${stationName(sourceId)} earned <strong>${result.riskBenefitName}</strong>. Extend that same Heroic payoff to another unresolved station?`,
      label: "Carry the deed to", optionsHtml: optionRows(targets),
      onUse: (targetStationId) => controller.command({ type: "use-mastery", station: "captain", options: { sourceStationId: sourceId, targetStationId } })
    });
  }
  if (ownsStation(state, "captain") && ready(state, "captain", "captain-not-like-this") && ["failure", "criticalFailure"].includes(result.degreeKey)) {
    const mastery = getMasteryTechnique("captain", "captain-not-like-this");
    await confirmOpportunity({
      key: `${token}:not-like-this`, title: mastery.name,
      text: `${stationName(sourceId)} just rolled ${result.degreeKey === "criticalFailure" ? "Critical Failure" : "Failure"}. Improve it by one degree before the next station acts?`,
      onUse: () => controller.command({ type: "use-mastery", station: "captain", options: { sourceStationId: sourceId } })
    });
  }
  if (ownsStation(state, "watchmaster") && ready(state, "watchmaster", "watchmaster-exploit-the-break") && result.degreeKey === "criticalSuccess") {
    const mastery = getMasteryTechnique("watchmaster", "watchmaster-exploit-the-break");
    await selectOpportunity({
      key: `${token}:exploit`, title: mastery.name,
      text: `${stationName(sourceId)} critically succeeded. Move one unresolved station to the front of the remaining order?`,
      label: "Act next", optionsHtml: optionRows(targets),
      onUse: (targetStationId) => controller.command({ type: "use-mastery", station: "watchmaster", options: { sourceStationId: sourceId, targetStationId } })
    });
  }
}

async function promptBeforeActiveCheck(controller) {
  const state = controller.state;
  if (state.phase !== "resolution") return;
  const active = activeStationId(state);
  if (!active) return;
  const token = `${state.eventId}:${state.roundIndex}:${active}:${Object.keys(state.results ?? {}).length}`;

  if (ownsStation(state, "engineer") && ready(state, "engineer", "engineer-redline-the-arkengine") && ["engineer", "navigator"].includes(active)) {
    const mastery = getMasteryTechnique("engineer", "engineer-redline-the-arkengine");
    await confirmOpportunity({ key: `${token}:redline`, title: mastery.name, text: `${stationName(active)} is about to roll. ${mastery.description}`, onUse: () => controller.command({ type: "use-mastery", station: "engineer", options: { targetStationId: active } }) });
  }
  if (ownsStation(state, "watchmaster") && ready(state, "watchmaster", "watchmaster-call-the-true-opening") && Number(state.selections?.[active]?.riskTier ?? 0) > 0) {
    const mastery = getMasteryTechnique("watchmaster", "watchmaster-call-the-true-opening");
    const tier = Number(state.selections[active].riskTier);
    const reduced = tier === 2 ? 0 : tier === 5 ? 2 : 5;
    await confirmOpportunity({ key: `${token}:true-opening`, title: mastery.name, text: `${stationName(active)} is attempting a +${tier} Heroic Bid. Reduce the Risk increase to +${reduced} while keeping the original Heroic payoff?`, onUse: () => controller.command({ type: "use-mastery", station: "watchmaster", options: { targetStationId: active } }) });
  }
  if (ownsStation(state, "veilwarden") && ready(state, "veilwarden", "veilwarden-sanctuary") && (state.encounter?.hazards?.length ?? 0) > 0) {
    const mastery = getMasteryTechnique("veilwarden", "veilwarden-sanctuary");
    await confirmOpportunity({ key: `${token}:sanctuary`, title: mastery.name, text: `${stationName(active)} is about to act while Hazards are active. ${mastery.description}`, onUse: () => controller.command({ type: "use-mastery", station: "veilwarden", options: { targetStationId: active } }) });
  }
  if (ownsStation(state, "navigator") && ready(state, "navigator", "navigator-impossible-passage") && (state.encounter?.hazards?.length ?? 0) > 0) {
    const mastery = getMasteryTechnique("navigator", "navigator-impossible-passage");
    await confirmOpportunity({ key: `${token}:passage`, title: mastery.name, text: `${stationName(active)} is facing active Hazards. ${mastery.description}`, onUse: () => controller.command({ type: "use-mastery", station: "navigator", options: { targetStationId: active } }) });
  }
}

async function promptAfterPlanLock(controller) {
  const state = controller.state;
  if (state.phase !== "locked" || !ownsStation(state, "navigator")) return;
  const masteryId = state.masterySelections?.navigator;
  if (!ready(state, "navigator", masteryId)) return;
  const mastery = getMasteryTechnique("navigator", masteryId);
  if (!mastery || !["navigator-find-another-way", "navigator-read-the-current"].includes(masteryId)) return;
  const targets = unresolved(state);
  await selectOpportunity({
    key: `${state.eventId}:${state.roundIndex}:locked:${masteryId}`,
    title: mastery.name, text: mastery.description,
    label: masteryId === "navigator-find-another-way" ? "Reopen station plan" : "Move station to the front",
    optionsHtml: optionRows(targets),
    onUse: (targetStationId) => controller.command({ type: "use-mastery", station: "navigator", options: { targetStationId } })
  });
}

async function promptNewHazard(controller) {
  const state = controller.state;
  const snapshotKey = `${state.eventId}:${state.roundIndex}`;
  const current = [...(state.encounter?.hazards ?? [])].sort().join("|");
  const previous = hazardSnapshots.get(snapshotKey);
  hazardSnapshots.set(snapshotKey, current);
  if (previous === undefined || previous === current || !["locked", "resolution"].includes(state.phase)) return;
  if (!ownsStation(state, "watchmaster") || !ready(state, "watchmaster", "watchmaster-nothing-surprises-me")) return;
  const active = activeStationId(state) ?? unresolved(state)[0];
  if (!active) return;
  const mastery = getMasteryTechnique("watchmaster", "watchmaster-nothing-surprises-me");
  await confirmOpportunity({
    key: `${snapshotKey}:hazard:${current}:${active}`,
    title: mastery.name,
    text: `A new threat has appeared after planning. Reopen ${stationName(active)}'s Action, Skill, and Heroic/Risk choices before it rolls?`,
    onUse: () => controller.command({ type: "use-mastery", station: "watchmaster", options: { targetStationId: active } })
  });
}

function enableReopenedControls(root, controller) {
  if (!root || !["locked", "resolution"].includes(controller.state?.phase)) return;
  for (const stationId of Object.keys(controller.state.reopenedStations ?? {})) {
    if (!ownsStation(controller.state, stationId)) continue;
    for (const select of root.querySelectorAll(`select[data-station="${stationId}"][data-ark-select]`)) {
      select.disabled = false;
      select.title = "Mastery Technique reopened this station's plan. You may make one final change before it resolves.";
    }
  }
}

export function installMasteryOpportunityUI() {
  Hooks.on("renderApplicationV2", async (app, element) => {
    if (game.user.isGM || app?.id !== "arkflight-event-board") return;
    const root = element instanceof HTMLElement ? element : element?.[0] instanceof HTMLElement ? element[0] : app.element;
    const controller = game.arkflight?.controller;
    if (!root || !controller?.state?.setupLocked) return;
    enableReopenedControls(root, controller);
    try {
      await promptPendingWindows(controller);
      await promptAfterPlanLock(controller);
      await promptNewHazard(controller);
      await promptAfterResult(controller);
      await promptBeforeActiveCheck(controller);
    } catch (error) {
      console.error("Arkflight | Mastery opportunity prompt failed", error);
      ui.notifications?.warn(error.message);
    }
  });
}
