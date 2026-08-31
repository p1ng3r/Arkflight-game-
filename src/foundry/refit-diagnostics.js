import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { normalizeShip, SHIP_SCHEMA_VERSION } from "../ship/ship-schema.js";

const MODULE_ID = "arkflight-game";

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function resolveShipActor(actor = null) {
  if (actor?.documentName === "Actor" && shipPayload(actor)) return actor;
  const controlled = canvas?.tokens?.controlled?.map((token) => token.actor).find((candidate) => shipPayload(candidate));
  if (controlled) return controlled;
  const viewed = game?.actors?.filter?.((candidate) => candidate?.sheet?.rendered && shipPayload(candidate))?.[0];
  if (viewed) return viewed;
  throw new Error("Select an Arkflight ship token, open its sheet, or pass the Vehicle Actor to game.arkflight.refitDiagnostics.audit(actor).");
}

function workOrderSummary(ship) {
  return (ship?.refit?.workOrders ?? []).map((job) => ({
    id: job.id,
    type: job.type,
    method: job.method,
    componentFamily: job.componentFamily,
    componentId: job.componentId,
    status: job.status,
    remainingHours: job.remainingHours,
    partsSpent: job.reservation?.partsSpent ?? 0,
    componentHeld: Boolean(job.reservation?.componentHeld)
  }));
}

function check(label, ok, detail = "") {
  return Object.freeze({ label, ok: Boolean(ok), detail });
}

function baseAudit(target) {
  const raw = shipPayload(target);
  const ship = normalizeShip(raw);
  const api = game?.arkflight?.refit;
  let derived = null;
  let deriveError = null;
  try { derived = deriveShip(ship, SHIP_CATALOGS); }
  catch (error) { deriveError = error; }

  const checks = [
    check("Arkflight Vehicle Actor", Boolean(target?.update && raw), target?.name ?? ""),
    check("Schema migrated", Number(ship.schemaVersion) === SHIP_SCHEMA_VERSION, `v${ship.schemaVersion} / expected v${SHIP_SCHEMA_VERSION}`),
    check("Salvage Parts present", Number.isFinite(Number(ship.resources?.salvageParts?.value)), String(ship.resources?.salvageParts?.value ?? "missing")),
    check("Blueprint state present", Array.isArray(ship.blueprints?.shipModIds) && Array.isArray(ship.blueprints?.arkengineModIds)),
    check("Physical component inventory present", Boolean(ship.inventory?.shipMods && ship.inventory?.arkengineMods)),
    check("Work-order state present", Array.isArray(ship.refit?.workOrders), `${ship.refit?.workOrders?.length ?? 0} orders`),
    check("Installed Ship Mods valid", Array.isArray(ship.shipMods), `${ship.shipMods?.length ?? 0} installed`),
    check("Installed Arkengine Mods valid", Array.isArray(ship.arkengine?.modIds), `${ship.arkengine?.modIds?.length ?? 0} installed`),
    check("Refit API loaded", Boolean(api?.getInventory && api?.beginInstallDraft && api?.completeWork)),
    check("General time API loaded", Boolean(api?.advanceWorkTime), "advanceWorkTime"),
    check("Crew failure settlement loaded", Boolean(api?.recordInstallFailure), "failure spends Parts/time"),
    check("deriveShip succeeds", Boolean(derived) && !deriveError, deriveError?.message ?? "ok")
  ];

  return { raw, ship, api, derived, checks };
}

function auditActor(actor) {
  const target = resolveShipActor(actor);
  const { ship, derived, checks } = baseAudit(target);

  const result = Object.freeze({
    ok: checks.every((entry) => entry.ok),
    actor: Object.freeze({ id: target.id, uuid: target.uuid, name: target.name, type: target.type }),
    schemaVersion: ship.schemaVersion,
    salvageParts: ship.resources?.salvageParts?.value ?? 0,
    blueprints: Object.freeze({
      shipMods: Object.freeze([...(ship.blueprints?.shipModIds ?? [])]),
      arkengineMods: Object.freeze([...(ship.blueprints?.arkengineModIds ?? [])])
    }),
    inventory: Object.freeze({
      shipMods: Object.freeze({ ...(ship.inventory?.shipMods ?? {}) }),
      arkengineMods: Object.freeze({ ...(ship.inventory?.arkengineMods ?? {}) })
    }),
    installed: Object.freeze({
      shipMods: Object.freeze([...(ship.shipMods ?? [])]),
      arkengineMods: Object.freeze([...(ship.arkengine?.modIds ?? [])])
    }),
    workOrders: Object.freeze(workOrderSummary(ship)),
    derivedStats: Object.freeze({ ...(derived?.stats ?? {}) }),
    checks: Object.freeze(checks)
  });

  console.group(`Arkflight Refit Integration Audit — ${target.name}`);
  console.table(checks);
  console.log("Refit snapshot", result);
  console.groupEnd();
  if (result.ok) ui?.notifications?.info?.(`Arkflight Refit audit passed for ${target.name}.`);
  else ui?.notifications?.warn?.(`Arkflight Refit audit found ${checks.filter((entry) => !entry.ok).length} problem(s). See console.`);
  return result;
}

function alphaReadiness(actor = null) {
  const target = resolveShipActor(actor);
  const { ship, api, derived, checks: baseChecks } = baseAudit(target);
  const methods = new Set((ship.refit?.workOrders ?? []).map((job) => job.method));
  const extra = [
    check("Crew installation path available", Boolean(api?.beginInstallDraft && api?.recordInstallFailure), "PF2e Crafting path"),
    check("Shipyard installation path available", Boolean(api?.beginInstallDraft), methods.has("shipyard") ? "shipyard job observed" : "engine ready"),
    check("Time passage can progress work", Boolean(api?.advanceWorkTime), "Foundry world-time bridge loaded"),
    check("Portrait/token separation supported", Boolean(target?.img !== undefined && target?.prototypeToken?.texture), "actor.img / prototypeToken.texture.src"),
    check("Derived vessel state available", Boolean(derived?.stats), `${Object.keys(derived?.stats ?? {}).length} derived stats`)
  ];
  const checks = [...baseChecks, ...extra];
  const result = Object.freeze({ ok: checks.every((entry) => entry.ok), actor: target.name, checks: Object.freeze(checks), workOrders: Object.freeze(workOrderSummary(ship)) });
  console.group(`Arkflight Refit Alpha Readiness — ${target.name}`);
  console.table(checks);
  console.groupEnd();
  if (result.ok) ui?.notifications?.info?.(`${target.name} passes the Refit Alpha readiness audit.`);
  else ui?.notifications?.warn?.(`${target.name} has ${checks.filter((entry) => !entry.ok).length} Refit Alpha readiness problem(s).`);
  return result;
}

Hooks.once("ready", () => {
  if (!game.arkflight) return;
  game.arkflight.refitDiagnostics = Object.freeze({
    audit: auditActor,
    alphaReady: alphaReadiness,
    snapshot(actor = null) {
      const target = resolveShipActor(actor);
      const ship = normalizeShip(shipPayload(target));
      return Object.freeze({
        actor: target,
        ship,
        workOrders: Object.freeze(workOrderSummary(ship)),
        derived: deriveShip(ship, SHIP_CATALOGS)
      });
    }
  });
  console.info("Arkflight | Refit diagnostics ready: game.arkflight.refitDiagnostics.audit() / alphaReady()");
});
