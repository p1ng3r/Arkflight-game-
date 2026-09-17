import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";
import { normalizeShip } from "../ship/ship-schema.js";

const MODULE_ID = "arkflight-game";

function shipFlag(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function needsCommissioning(actor) {
  const ship = shipFlag(actor);
  return Boolean(ship && (!ship.hull?.chassisId || !ship.arkengine?.chassisId));
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
  const parts = [
    hull.description,
    Number.isFinite(Number(stats.hullIntegrity)) ? `Hull ${stats.hullIntegrity}` : null,
    Number.isFinite(Number(stats.armorClass)) ? `AC ${stats.armorClass}` : null,
    Number.isFinite(Number(stats.combatSpeed)) ? `Speed ${stats.combatSpeed}` : null,
    Number.isFinite(Number(stats.maneuverability)) ? `Maneuver ${stats.maneuverability}` : null,
    Number.isFinite(Number(stats.cargoCapacity)) ? `Cargo ${stats.cargoCapacity}` : null
  ].filter(Boolean);
  return parts.join(" · ");
}

function engineSummary(engine) {
  if (!engine) return "";
  const stats = engine.data ?? {};
  const parts = [
    engine.description,
    Number.isFinite(Number(stats.modCapacity)) ? `Mod Capacity ${stats.modCapacity}` : null,
    Number.isFinite(Number(stats.fuelSlots)) ? `Fuel Slots ${stats.fuelSlots}` : null
  ].filter(Boolean);
  return parts.join(" · ");
}

function selectedValue(result, key) {
  return String(result?.[key] ?? result?.get?.(key) ?? "").trim();
}

async function commissioningDialog(actor) {
  const current = shipFlag(actor);
  if (!current) throw new Error("This vehicle has no Arkflight ship data.");
  if (!game.user?.isGM && !actor.isOwner) throw new Error("You must own this Arkflight vessel to commission it.");

  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.input) throw new Error("Foundry DialogV2.input is unavailable.");

  let hullId = current.hull?.chassisId || "";
  let hullPatternId = current.hull?.patternId || "standard";
  let engineId = current.arkengine?.chassisId || "";
  let enginePatternId = current.arkengine?.patternId || "standard";

  while (true) {
    const hullOptions = `<option value="">Choose a hull…</option>${optionRows(SHIP_CATALOGS.hulls, hullId)}`;
    const hullPatternOptions = optionRows(SHIP_CATALOGS.hullPatterns, hullPatternId);
    const engineOptions = `<option value="">Choose an Arkengine…</option>${optionRows(SHIP_CATALOGS.arkengines, engineId)}`;
    const enginePatternOptions = optionRows(SHIP_CATALOGS.arkenginePatterns, enginePatternId);

    const selectedHull = SHIP_CATALOGS.hulls?.[hullId] ?? null;
    const selectedEngine = SHIP_CATALOGS.arkengines?.[engineId] ?? null;
    const result = await DialogV2.input({
      window: { title: `Commission Arkflight Vessel — ${actor.name}` },
      content: `
        <div class="standard-form arkflight-commission-vessel">
          <p><strong>Build the vessel's core.</strong> Choose the hull, hull pattern, Arkengine, and Arkengine pattern. Nothing is chosen automatically.</p>
          <div class="form-group"><label>Hull Chassis</label><div class="form-fields"><select name="hullId" autofocus>${hullOptions}</select></div><p class="hint">${escape(hullSummary(selectedHull) || "Choose the physical hull chassis.")}</p></div>
          <div class="form-group"><label>Hull Pattern</label><div class="form-fields"><select name="hullPatternId">${hullPatternOptions}</select></div></div>
          <div class="form-group"><label>Arkengine</label><div class="form-fields"><select name="engineId">${engineOptions}</select></div><p class="hint">${escape(engineSummary(selectedEngine) || "Choose the vessel's Arkengine.")}</p></div>
          <div class="form-group"><label>Arkengine Pattern</label><div class="form-fields"><select name="enginePatternId">${enginePatternOptions}</select></div></div>
          <p class="hint">Hull/Arkengine compatibility is checked before commissioning. You may choose any compatible combination; Arkflight will never silently pick a chassis for you.</p>
        </div>`,
      ok: { label: "Commission Vessel" },
      rejectClose: false,
      modal: true
    });

    if (!result) return false;

    hullId = selectedValue(result, "hullId");
    hullPatternId = selectedValue(result, "hullPatternId") || "standard";
    engineId = selectedValue(result, "engineId");
    enginePatternId = selectedValue(result, "enginePatternId") || "standard";

    const hull = SHIP_CATALOGS.hulls?.[hullId];
    const engine = SHIP_CATALOGS.arkengines?.[engineId];
    if (!hull) {
      ui.notifications?.warn?.("Choose a Hull Chassis before commissioning.");
      continue;
    }
    if (!SHIP_CATALOGS.hullPatterns?.[hullPatternId]) {
      ui.notifications?.warn?.("Choose a valid Hull Pattern.");
      continue;
    }
    if (!engine) {
      ui.notifications?.warn?.("Choose an Arkengine before commissioning.");
      continue;
    }
    if (!SHIP_CATALOGS.arkenginePatterns?.[enginePatternId]) {
      ui.notifications?.warn?.("Choose a valid Arkengine Pattern.");
      continue;
    }

    const allowed = hull.data?.allowedArkengines ?? [];
    if (allowed.length && !allowed.includes(engineId)) {
      const names = allowed.map((id) => SHIP_CATALOGS.arkengines?.[id]?.name ?? id).join(", ");
      ui.notifications?.warn?.(`${engine.name} is not compatible with ${hull.name}. Compatible Arkengines: ${names}.`);
      continue;
    }

    const next = normalizeShip(structuredClone(current));
    next.hull = { ...(next.hull ?? {}), chassisId: hullId, patternId: hullPatternId };
    next.arkengine = { ...(next.arkengine ?? {}), chassisId: engineId, patternId: enginePatternId, modIds: [...(next.arkengine?.modIds ?? [])] };
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

Hooks.once("ready", () => {
  const originalOpen = game.arkflight?.openShipwrightWorkspace;
  if (typeof originalOpen !== "function") {
    console.warn("Arkflight | Commissioning bridge could not find the Shipwright Workspace opener.");
    return;
  }

  game.arkflight.openShipwrightWorkspace = async (actor) => {
    if (needsCommissioning(actor)) {
      try {
        const commissioned = await commissioningDialog(actor);
        if (!commissioned) return null;
      } catch (error) {
        console.error("Arkflight | Vessel commissioning failed", error);
        ui.notifications?.error?.(error?.message ?? "Vessel commissioning failed.");
        return null;
      }
    }
    return originalOpen(actor);
  };

  game.arkflight.commissionShip = commissioningDialog;
});
