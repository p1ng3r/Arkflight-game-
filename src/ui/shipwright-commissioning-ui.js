import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { createShip, normalizeShip } from "../ship/ship-schema.js";

const MODULE_ID = "arkflight-game";

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

export function needsCommissioning(actor) {
  if (actor?.type !== "vehicle") return false;
  const marked = actor?.flags?.[MODULE_ID]?.isArkflightShip === true;
  const ship = shipFlag(actor);
  if (!ship) return marked;
  return !ship.hull?.chassisId || !ship.arkengine?.chassisId;
}

function escape(value) {
  const raw = String(value ?? "");
  return foundry?.utils?.escapeHTML
    ? foundry.utils.escapeHTML(raw)
    : raw.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function optionRows(catalog, selectedId = "") {
  return Object.values(catalog ?? {})
    .sort((a, b) => String(a.name ?? a.id).localeCompare(String(b.name ?? b.id)))
    .map((item) => `<option value="${escape(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escape(item.name ?? item.id)}</option>`)
    .join("");
}

function hullSummary(hull) {
  if (!hull) return "";
  const stats = hull.data?.baseStats ?? {};
  return [
    hull.description,
    Number.isFinite(Number(stats.hullIntegrity)) ? `Hull ${stats.hullIntegrity}` : null,
    Number.isFinite(Number(stats.armorClass)) ? `AC ${stats.armorClass}` : null,
    Number.isFinite(Number(stats.combatSpeed)) ? `Speed ${stats.combatSpeed}` : null,
    Number.isFinite(Number(stats.maneuverability)) ? `Maneuver ${stats.maneuverability}` : null,
    Number.isFinite(Number(stats.cargoCapacity)) ? `Cargo ${stats.cargoCapacity}` : null
  ].filter(Boolean).join(" · ");
}

function engineSummary(engine) {
  if (!engine) return "";
  const stats = engine.data ?? {};
  return [
    engine.description,
    Number.isFinite(Number(stats.modCapacity)) ? `Mod Capacity ${stats.modCapacity}` : null,
    Number.isFinite(Number(stats.fuelSlots)) ? `Fuel Slots ${stats.fuelSlots}` : null
  ].filter(Boolean).join(" · ");
}

function askForCommissioningChoices(actor, state) {
  const { DialogV2 } = foundry.applications.api;
  const selectedHull = SHIP_CATALOGS.hulls?.[state.hullId] ?? null;
  const selectedEngine = SHIP_CATALOGS.arkengines?.[state.engineId] ?? null;

  const content = `
    <form class="standard-form arkflight-commission-vessel">
      <p><strong>Build the vessel's core.</strong> Choose the hull, hull pattern, Arkengine, and Arkengine pattern. Nothing is chosen automatically.</p>
      <div class="form-group">
        <label>Hull Chassis</label>
        <div class="form-fields"><select name="hullId" autofocus><option value="">Choose a hull…</option>${optionRows(SHIP_CATALOGS.hulls, state.hullId)}</select></div>
        <p class="hint">${escape(hullSummary(selectedHull) || "Choose the physical hull chassis.")}</p>
      </div>
      <div class="form-group">
        <label>Hull Pattern</label>
        <div class="form-fields"><select name="hullPatternId">${optionRows(SHIP_CATALOGS.hullPatterns, state.hullPatternId)}</select></div>
      </div>
      <div class="form-group">
        <label>Arkengine</label>
        <div class="form-fields"><select name="engineId"><option value="">Choose an Arkengine…</option>${optionRows(SHIP_CATALOGS.arkengines, state.engineId)}</select></div>
        <p class="hint">${escape(engineSummary(selectedEngine) || "Choose the vessel's Arkengine.")}</p>
      </div>
      <div class="form-group">
        <label>Arkengine Pattern</label>
        <div class="form-fields"><select name="enginePatternId">${optionRows(SHIP_CATALOGS.arkenginePatterns, state.enginePatternId)}</select></div>
      </div>
      <p class="hint">Hull/Arkengine compatibility is checked before commissioning. Arkflight will never silently choose a hull or Arkengine for you.</p>
    </form>`;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    new DialogV2({
      window: { title: `Commission Arkflight Vessel — ${actor.name}` },
      content,
      buttons: [
        { action: "cancel", label: "Cancel", callback: () => finish(null) },
        {
          action: "confirm",
          label: "Commission Vessel",
          icon: "fa-solid fa-ship",
          default: true,
          callback: (_event, _button, dialog) => {
            const root = dialog.element;
            finish({
              hullId: String(root.querySelector('[name="hullId"]')?.value ?? "").trim(),
              hullPatternId: String(root.querySelector('[name="hullPatternId"]')?.value ?? "standard").trim() || "standard",
              engineId: String(root.querySelector('[name="engineId"]')?.value ?? "").trim(),
              enginePatternId: String(root.querySelector('[name="enginePatternId"]')?.value ?? "standard").trim() || "standard"
            });
          }
        }
      ],
      close: () => finish(null)
    }).render({ force: true });
  });
}

export async function commissioningDialog(actor) {
  if (actor?.type !== "vehicle") throw new Error("Arkflight ships must be PF2e Vehicle Actors.");
  if (!game.user?.isGM && !actor.isOwner) throw new Error("You must own this Arkflight vessel to commission it.");

  let current = shipFlag(actor);
  if (!current) {
    current = createShip({ identity: { name: actor.name || "Unnamed Vessel" } });
    await actor.update({
      [`flags.${MODULE_ID}.isArkflightShip`]: true,
      [`flags.${MODULE_ID}.ship`]: current
    });
  } else if (actor?.flags?.[MODULE_ID]?.isArkflightShip !== true) {
    await actor.update({ [`flags.${MODULE_ID}.isArkflightShip`]: true });
  }

  const state = {
    hullId: current.hull?.chassisId || "",
    hullPatternId: current.hull?.patternId || "standard",
    engineId: current.arkengine?.chassisId || "",
    enginePatternId: current.arkengine?.patternId || "standard"
  };

  while (true) {
    const result = await askForCommissioningChoices(actor, state);
    if (!result) return false;
    Object.assign(state, result);

    const hull = SHIP_CATALOGS.hulls?.[state.hullId];
    const engine = SHIP_CATALOGS.arkengines?.[state.engineId];

    if (!hull) {
      ui.notifications?.warn?.("Choose a Hull Chassis before commissioning.");
      continue;
    }
    if (!SHIP_CATALOGS.hullPatterns?.[state.hullPatternId]) {
      ui.notifications?.warn?.("Choose a valid Hull Pattern.");
      continue;
    }
    if (!engine) {
      ui.notifications?.warn?.("Choose an Arkengine before commissioning.");
      continue;
    }
    if (!SHIP_CATALOGS.arkenginePatterns?.[state.enginePatternId]) {
      ui.notifications?.warn?.("Choose a valid Arkengine Pattern.");
      continue;
    }

    const allowed = hull.data?.allowedArkengines ?? [];
    if (allowed.length && !allowed.includes(state.engineId)) {
      const names = allowed.map((id) => SHIP_CATALOGS.arkengines?.[id]?.name ?? id).join(", ");
      ui.notifications?.warn?.(`${engine.name} is not compatible with ${hull.name}. Compatible Arkengines: ${names}.`);
      continue;
    }

    const next = normalizeShip(structuredClone(current));
    next.hull = { ...(next.hull ?? {}), chassisId: state.hullId, patternId: state.hullPatternId };
    next.arkengine = { ...(next.arkengine ?? {}), chassisId: state.engineId, patternId: state.enginePatternId, modIds: [...(next.arkengine?.modIds ?? [])] };
    next.identity = { ...(next.identity ?? {}), name: actor.name || next.identity?.name || "Unnamed Vessel" };

    const derived = deriveShip(next, SHIP_CATALOGS);
    const stats = derived.stats ?? {};
    next.resources ??= {};
    next.resources.hull = { value: Number(stats.hullIntegrity ?? 0), max: Number(stats.hullIntegrity ?? 0) };
    next.resources.lifeveil = { value: 100, max: 100 };
    next.resources.strain = { value: 0, max: Number(stats.strainCapacity ?? 0) };
    next.resources.supplies = { value: Number(next.resources.supplies?.value ?? 0), max: Number(stats.cargoCapacity ?? 0) * 10 };
    next.resources.morale = { value: Number(next.resources.morale?.value ?? 60), max: 100 };

    await actor.update({ [`flags.${MODULE_ID}.ship`]: next });
    ui.notifications?.info?.(`${actor.name} commissioned: ${hull.name} · ${engine.name}.`);
    return true;
  }
}
