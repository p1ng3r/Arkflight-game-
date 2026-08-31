import { SHIP_CATALOGS } from "../content/index.js";
import { resolveEngineeringInstallOutcome } from "../ship/refit-engineering.js";

const MODULE_ID = "arkflight-game";

function rootForActor(actor) {
  const element = actor?.sheet?.element?.[0] ?? actor?.sheet?.element ?? null;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function catalogForFamily(family) {
  if (family === "shipMod") return SHIP_CATALOGS.shipMods ?? {};
  if (family === "arkengineMod") return SHIP_CATALOGS.arkengineMods ?? {};
  return {};
}

async function resolveActorReference(reference) {
  if (!reference) return null;
  if (reference?.documentName === "Actor") return reference;

  if (typeof reference === "object") {
    const nested = reference.actorUuid ?? reference.uuid ?? reference.actorId ?? reference.id ?? reference.name ?? null;
    return nested ? resolveActorReference(nested) : null;
  }

  const direct = game.actors?.get?.(reference)
    ?? game.actors?.contents?.find?.((actor) => actor.uuid === reference || actor.name === reference)
    ?? null;
  if (direct) return direct;

  if (typeof reference !== "string") return null;
  try {
    const resolved = await fromUuid(reference);
    return resolved?.documentName === "Actor" ? resolved : null;
  } catch {
    return null;
  }
}

async function assignedEngineer(ship) {
  return resolveActorReference(ship?.crew?.stations?.engineer ?? null);
}

function installationSpec(assignment) {
  return catalogForFamily(assignment?.family)?.[assignment?.componentId]?.data?.refit?.install ?? null;
}

function physicalCount(ship, assignment) {
  const bucket = assignment?.family === "shipMod" ? "shipMods" : "arkengineMods";
  return Math.max(0, Math.trunc(Number(ship?.inventory?.[bucket]?.[assignment?.componentId] ?? 0)));
}

function salvageParts(ship) {
  return Math.max(0, Math.trunc(Number(ship?.resources?.salvageParts?.value ?? 0)));
}

async function rollEngineeringCheck(engineer, assignment) {
  const spec = installationSpec(assignment);
  const skill = engineer?.skills?.crafting;
  if (!skill?.proficient || !skill?.check?.roll) {
    throw new Error(`${engineer?.name ?? "The assigned Engineer"} is not proficient in Crafting.`);
  }
  const item = catalogForFamily(assignment.family)?.[assignment.componentId];
  const dcValue = Math.max(0, Math.trunc(Number(spec?.dc ?? 0)));
  const options = engineer.getRollOptions?.(["all", "skill-check", "crafting"]) ?? [];
  options.push("action:arkflight-install-mod", `arkflight:component:${assignment.componentId}`);

  return new Promise((resolve, reject) => {
    Promise.resolve(skill.check.roll({
      dc: { value: dcValue, visible: true },
      extraRollOptions: options,
      callback: (_roll, outcome, message) => resolve({ outcome, message, dc: dcValue, item })
    })).catch(reject);
  });
}

async function advanceInstallTime(hours) {
  const amount = Math.max(0, Number(hours ?? 0));
  if (!amount) return;
  if (typeof game.time?.advance !== "function") throw new Error("Foundry world-time advancement is unavailable.");
  await game.time.advance(Math.round(amount * 3600));
}

async function recordCriticalFailure(actor, engineer, assignment, item) {
  const complication = await game.arkflight?.refit?.recordInstallComplication?.(actor, assignment, {
    workerActorUuid: engineer.uuid,
    outcome: "criticalFailure"
  });
  if (!complication?.ok) throw new Error(`Engineering complication could not be recorded: ${complication?.reason ?? "unknown error"}.`);
  ui.notifications?.warn?.(`${engineer.name} critically failed the Engineering Check for ${item.name}. The Mod remains intact and no Parts were spent, but an installation complication was recorded.`);
  actor.sheet?.render?.({ force: true });
}

async function installStagedMod(actor, draft) {
  const ship = shipPayload(actor);
  if (!ship || !draft?.assignments?.length) return;
  if (draft.assignments.length !== 1) {
    ui.notifications?.warn?.("Install one staged Mod at a time so each fitting receives its own Engineering check.");
    return;
  }

  const assignment = draft.assignments[0];
  const item = catalogForFamily(assignment.family)?.[assignment.componentId];
  const spec = installationSpec(assignment);
  if (!item || !spec) {
    ui.notifications?.warn?.("That staged fitting has no installation specification.");
    return;
  }
  if (physicalCount(ship, assignment) < 1) {
    ui.notifications?.warn?.(`${item.name} is no longer available in the physical fitting inventory.`);
    return;
  }
  if (salvageParts(ship) < Number(spec.partsCost ?? 0)) {
    ui.notifications?.warn?.(`Installing ${item.name} needs ${spec.partsCost} Salvage Parts; only ${salvageParts(ship)} are available.`);
    return;
  }

  const engineer = await assignedEngineer(ship);
  if (!engineer) {
    ui.notifications?.warn?.(`Assign an Engineer to ${actor.name} before installing a Mod.`);
    return;
  }

  ui.notifications?.info?.(`${engineer.name} attempts an Engineering Check (Crafting DC ${spec.dc}) to install ${item.name}.`);
  const check = await rollEngineeringCheck(engineer, assignment);
  const outcome = resolveEngineeringInstallOutcome(check.outcome, spec.timeHours);

  if (!outcome.install) {
    if (outcome.complication) {
      await recordCriticalFailure(actor, engineer, assignment, item);
    } else {
      ui.notifications?.warn?.(`${item.name} was not installed. No Salvage Parts were spent, no time passed, and the fitting remains staged.`);
    }
    Hooks.callAll("arkflightRefitEngineeringResolved", { actor, engineer, assignment, outcome, installed: false });
    return;
  }

  const queued = await game.arkflight?.refit?.beginInstallDraft?.(actor, { assignments: [assignment] }, { method: "crew" });
  if (!queued?.ok || !queued.jobs?.length) {
    const detail = queued?.reason === "insufficient-salvage-parts"
      ? `Need ${queued.required} Salvage Parts; only ${queued.available} remain.`
      : `Could not create the installation work order: ${queued?.reason ?? "unknown error"}.`;
    ui.notifications?.warn?.(detail);
    return;
  }

  const job = queued.jobs[0];
  const completed = await game.arkflight.refit.completeWork(actor, job.id, {
    result: {
      outcome: check.outcome,
      workerActorUuid: engineer.uuid,
      engineeringSkill: "crafting",
      baseDurationHours: job.durationHours,
      elapsedHours: outcome.timeHours,
      timeMultiplier: outcome.timeMultiplier
    }
  });
  if (!completed?.ok) throw new Error(`Installation work order could not complete: ${completed?.reason ?? "unknown error"}.`);

  await advanceInstallTime(outcome.timeHours);
  rootForActor(actor)?.querySelector?.('[data-refit-draft-action="reset"]')?.click();
  const speedText = check.outcome === "criticalSuccess" ? " Critical Success halves the installation time." : "";
  ui.notifications?.info?.(`${item.name} installed by ${engineer.name}. ${job.partsCost} Salvage Parts spent; ${outcome.timeHours} hours pass.${speedText}`);
  actor.sheet?.render?.({ force: true });
  Hooks.callAll("arkflightRefitEngineeringResolved", { actor, engineer, assignment, outcome, installed: true, job: completed.job });
  Hooks.callAll("arkflightRefitModInstalled", { actor, engineer, assignment, job: completed.job, outcome: check.outcome });
}

Hooks.on("arkflightRefitInstallRequested", async ({ actor, draft }) => {
  if (!actor || !draft?.assignments?.length) return;
  if (!game.user?.isGM) {
    ui.notifications?.warn?.("Only the GM can resolve Engineering installation checks during Refit Alpha.");
    return;
  }
  try {
    await installStagedMod(actor, draft);
  } catch (error) {
    console.error("Arkflight | Could not resolve Mod installation", error);
    ui.notifications?.error?.(error.message ?? "Could not install Mod.");
  }
});

function clarifyRefitLanguage(root) {
  const coreSave = root.querySelector('[data-action="commission-vessel"]');
  if (coreSave && /apply refit/i.test(coreSave.textContent ?? "")) {
    coreSave.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> SAVE CORE BUILD`;
    coreSave.title = "Save hull, pattern, Arkengine, and other core vessel configuration. Mods are installed with INSTALL MOD.";
  }

  const notice = root.querySelector(".arkflight-commissioning-main > .arkflight-panel-heading small");
  if (notice && /apply refit/i.test(notice.textContent ?? "")) {
    notice.textContent = "Core-build changes use Save Core Build. Staged fittings use Install Mod.";
  }
}

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app?.actor ?? app?.document;
  const ship = shipPayload(actor);
  if (!ship) return;
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return;
  const root = element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
  if (!root) return;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clarifyRefitLanguage(root);
    if (!ship.refit?.workOrders?.length) return;
    const right = root.querySelector(".arkflight-shipwright-bay-active .arkflight-bay-right") ?? root.querySelector(".arkflight-bay-right");
    if (!right || right.querySelector(".arkflight-refit-work-orders")) return;
    const active = ship.refit.workOrders.filter((job) => job.status !== "complete");
    if (!active.length) return;
    const panel = document.createElement("section");
    panel.className = "arkflight-refit-work-orders";
    panel.innerHTML = `<div class="arkflight-bay-section-title"><span>WORK ORDERS</span><strong>${active.length} active</strong></div>${active.map((job) => `<div class="arkflight-refit-work-order"><span>${String(job.type).toUpperCase()}</span><strong>${job.componentId || "Ship repair"}</strong><small>${job.status} · ${job.remainingHours}h · ${job.partsCost} Parts</small></div>`).join("")}`;
    const actions = right.querySelector(".arkflight-bay-actions");
    if (actions) actions.before(panel); else right.append(panel);
  }));
});
