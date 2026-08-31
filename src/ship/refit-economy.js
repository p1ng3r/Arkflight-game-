import { SHIP_CATALOGS } from "../content/index.js";
import {
  REFIT_COMPONENT_FAMILIES,
  componentQuantity,
  grantComponent,
  knowsBlueprint,
  salvageParts,
  spendSalvageParts,
  unlockBlueprint
} from "./refit-state.js";

function positiveQuantity(value = 1) {
  return Math.max(1, Math.trunc(Number(value) || 1));
}

function catalogKey(family) {
  if (family === REFIT_COMPONENT_FAMILIES.SHIP_MOD) return "shipMods";
  if (family === REFIT_COMPONENT_FAMILIES.ARKENGINE_MOD) return "arkengineMods";
  throw new Error(`Unknown Arkflight refit component family: ${family}`);
}

export function resolveRefitComponent(family, componentId, catalogs = SHIP_CATALOGS) {
  const id = String(componentId ?? "").trim();
  if (!id) return null;
  return catalogs?.[catalogKey(family)]?.[id] ?? null;
}

export function learnBlueprint(ship, family, componentId, catalogs = SHIP_CATALOGS) {
  const component = resolveRefitComponent(family, componentId, catalogs);
  if (!component) {
    return Object.freeze({ ok: false, reason: "unknown-component", family, componentId: String(componentId ?? ""), ship });
  }
  return Object.freeze({
    ok: true,
    learned: !knowsBlueprint(ship, family, component.id),
    component,
    ship: unlockBlueprint(ship, family, component.id)
  });
}

export function buildComponentQuote(ship, family, componentId, quantity = 1, catalogs = SHIP_CATALOGS) {
  const component = resolveRefitComponent(family, componentId, catalogs);
  if (!component) return Object.freeze({ ok: false, reason: "unknown-component", family, componentId: String(componentId ?? "") });

  const refit = component.data?.refit;
  if (!refit) return Object.freeze({ ok: false, reason: "missing-refit-spec", component });

  const count = positiveQuantity(quantity);
  const requiresBlueprint = refit.blueprintRequired !== false;
  const blueprintKnown = !requiresBlueprint || knowsBlueprint(ship, family, component.id);
  if (!blueprintKnown) return Object.freeze({ ok: false, reason: "blueprint-required", component, quantity: count });

  const partsCost = Number(refit.build?.partsCost ?? 0) * count;
  const availableParts = salvageParts(ship);
  return Object.freeze({
    ok: true,
    component,
    family,
    quantity: count,
    blueprintKnown,
    partsCost,
    availableParts,
    canAfford: availableParts >= partsCost,
    timeHours: Number(refit.build?.timeHours ?? 0) * count,
    craftingDC: Number(refit.build?.dc ?? 0),
    shipyardGold: Number(refit.build?.shipyardGold ?? 0) * count
  });
}

// Part 3 settlement primitive. Part 6 work orders will call this only when a
// build job completes; until then it also provides a deterministic domain
// operation for tests, GM tools, rewards, and future UI wiring.
export function buildComponentFromBlueprint(ship, family, componentId, quantity = 1, catalogs = SHIP_CATALOGS) {
  const quote = buildComponentQuote(ship, family, componentId, quantity, catalogs);
  if (!quote.ok) return Object.freeze({ ...quote, ship });
  if (!quote.canAfford) {
    return Object.freeze({
      ok: false,
      reason: "insufficient-salvage-parts",
      component: quote.component,
      quantity: quote.quantity,
      required: quote.partsCost,
      available: quote.availableParts,
      ship
    });
  }

  const spent = spendSalvageParts(ship, quote.partsCost);
  if (!spent.ok) return spent;
  const nextShip = grantComponent(spent.ship, family, quote.component.id, quote.quantity);
  return Object.freeze({
    ok: true,
    component: quote.component,
    family,
    quantity: quote.quantity,
    partsSpent: quote.partsCost,
    timeHours: quote.timeHours,
    craftingDC: quote.craftingDC,
    shipyardGold: quote.shipyardGold,
    ship: nextShip
  });
}

export function acquireIntactComponent(ship, family, componentId, quantity = 1, catalogs = SHIP_CATALOGS) {
  const component = resolveRefitComponent(family, componentId, catalogs);
  if (!component) {
    return Object.freeze({ ok: false, reason: "unknown-component", family, componentId: String(componentId ?? ""), ship });
  }
  const count = positiveQuantity(quantity);
  return Object.freeze({
    ok: true,
    component,
    family,
    quantity: count,
    ship: grantComponent(ship, family, component.id, count)
  });
}

export function availableComponentEntries(ship, family, catalogs = SHIP_CATALOGS) {
  const catalog = catalogs?.[catalogKey(family)] ?? {};
  return Object.freeze(Object.values(catalog)
    .map((component) => Object.freeze({
      family,
      id: component.id,
      component,
      quantity: componentQuantity(ship, family, component.id),
      refit: component.data?.refit ?? null
    }))
    .filter((entry) => entry.quantity > 0)
    .sort((a, b) => a.component.name.localeCompare(b.component.name)));
}

export function knownBlueprintEntries(ship, family, catalogs = SHIP_CATALOGS) {
  const catalog = catalogs?.[catalogKey(family)] ?? {};
  return Object.freeze(Object.values(catalog)
    .filter((component) => knowsBlueprint(ship, family, component.id))
    .map((component) => Object.freeze({ family, id: component.id, component, refit: component.data?.refit ?? null }))
    .sort((a, b) => a.component.name.localeCompare(b.component.name)));
}

export function availableRefitInventory(ship, catalogs = SHIP_CATALOGS) {
  return Object.freeze({
    shipMods: availableComponentEntries(ship, REFIT_COMPONENT_FAMILIES.SHIP_MOD, catalogs),
    arkengineMods: availableComponentEntries(ship, REFIT_COMPONENT_FAMILIES.ARKENGINE_MOD, catalogs)
  });
}
