import { SHIP_CATALOGS } from "../content/index.js";

const MODULE_ID = "arkflight-game";
const SETTING = "campaignRewardLedger";

function cloneEntry(entry) { return entry && typeof entry === "object" ? structuredClone(entry) : null; }
function entryKey(entry) { return String(entry?.id ?? entry?.name ?? "").trim().toLowerCase(); }

export function normalizeCampaignRewardLedger(value = {}) {
  return Object.freeze({
    faction: Object.freeze([...(value.faction ?? [])].map(cloneEntry).filter(Boolean)),
    routeKnowledge: Object.freeze([...(value.routeKnowledge ?? [])].map(cloneEntry).filter(Boolean)),
    boons: Object.freeze([...(value.boons ?? [])].map(cloneEntry).filter(Boolean))
  });
}

function mergeUniqueEntries(current = [], incoming = []) {
  const rows = current.map(cloneEntry).filter(Boolean);
  const byKey = new Map(rows.map((entry, index) => [entryKey(entry) || `row-${index}`, index]));
  for (const raw of incoming ?? []) {
    const entry = cloneEntry(raw);
    if (!entry) continue;
    const key = entryKey(entry);
    if (!key || !byKey.has(key)) {
      rows.push(entry);
      if (key) byKey.set(key, rows.length - 1);
      continue;
    }
    const index = byKey.get(key);
    const existing = rows[index] ?? {};
    const existingValue = Number(existing.value ?? existing.amount);
    const incomingValue = Number(entry.value ?? entry.amount);
    rows[index] = Number.isFinite(existingValue) && Number.isFinite(incomingValue)
      ? { ...existing, ...entry, value: existingValue + incomingValue }
      : { ...existing, ...entry };
  }
  return rows;
}

export function mergeCampaignRewards(ledger, rewards = {}) {
  const current = normalizeCampaignRewardLedger(ledger);
  return normalizeCampaignRewardLedger({
    faction: mergeUniqueEntries(current.faction, rewards.faction),
    routeKnowledge: mergeUniqueEntries(current.routeKnowledge, rewards.routeKnowledge),
    boons: mergeUniqueEntries(current.boons, rewards.boons)
  });
}

export function campaignRewardEntries(rewards = {}) {
  return Object.freeze({
    faction: Object.freeze([...(rewards.faction ?? [])]),
    routeKnowledge: Object.freeze([...(rewards.routeKnowledge ?? [])]),
    boons: Object.freeze([...(rewards.boons ?? [])])
  });
}

function componentFamily(componentId) {
  if (SHIP_CATALOGS.shipMods?.[componentId]) return "shipMod";
  if (SHIP_CATALOGS.arkengineMods?.[componentId]) return "arkengineMod";
  if (SHIP_CATALOGS.weapons?.[componentId]) return "weapon";
  return null;
}

export function shipRewardPlan(rewards = {}) {
  const direct = [];
  const pending = [];
  for (const entry of rewards.shipComponents ?? []) {
    const componentId = String(entry?.catalogId ?? entry?.componentId ?? "").trim();
    const family = entry?.family ?? componentFamily(componentId);
    const kind = String(entry?.kind ?? "").toLowerCase();
    if (!componentId || !family || kind.includes("table") || kind.includes("choice")) {
      pending.push(cloneEntry(entry));
      continue;
    }
    if (kind.includes("blueprint")) direct.push(Object.freeze({ type: "blueprint", family, componentId, entry: cloneEntry(entry) }));
    else if (kind.includes("component")) direct.push(Object.freeze({ type: "component", family, componentId, quantity: Math.max(1, Math.trunc(Number(entry?.quantity) || 1)), entry: cloneEntry(entry) }));
    else pending.push(cloneEntry(entry));
  }
  return Object.freeze({ direct: Object.freeze(direct), pending: Object.freeze(pending) });
}

export async function grantShipRewards(actor, rewards = {}) {
  const plan = shipRewardPlan(rewards);
  const granted = [];
  if (plan.direct.length && !actor) throw new Error("No active Arkflight ship is bound for ship rewards.");
  for (const item of plan.direct) {
    if (item.type === "blueprint") {
      const result = await game.arkflight?.refit?.learnBlueprint?.(actor, item.family, item.componentId);
      if (!result?.ok) throw new Error(`Could not learn Arkflight blueprint ${item.componentId}: ${result?.reason ?? "unknown error"}`);
      granted.push({ type: "blueprint", family: item.family, componentId: item.componentId, name: result.component?.name ?? item.entry?.name ?? item.componentId });
    } else {
      const result = await game.arkflight?.refit?.acquireComponent?.(actor, item.family, item.componentId, item.quantity);
      if (!result?.ok) throw new Error(`Could not acquire Arkflight component ${item.componentId}: ${result?.reason ?? "unknown error"}`);
      granted.push({ type: "component", family: item.family, componentId: item.componentId, quantity: item.quantity, name: result.component?.name ?? item.entry?.name ?? item.componentId });
    }
  }
  return Object.freeze({ granted: Object.freeze(granted), pending: plan.pending });
}

export async function grantCampaignRewards(rewards = {}) {
  if (!game.user?.isGM) throw new Error("Only the GM may grant Arkflight campaign-layer rewards.");
  const before = normalizeCampaignRewardLedger(game.settings.get(MODULE_ID, SETTING));
  const after = mergeCampaignRewards(before, rewards);
  await game.settings.set(MODULE_ID, SETTING, after);
  return Object.freeze({ before, after });
}

export function campaignRewardLedger() {
  return normalizeCampaignRewardLedger(game.settings.get(MODULE_ID, SETTING));
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING, {
    name: "Arkflight Campaign Reward Ledger",
    scope: "world",
    config: false,
    type: Object,
    default: { faction: [], routeKnowledge: [], boons: [] }
  });
});

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.campaignRewards = Object.freeze({
    get: campaignRewardLedger,
    grant: grantCampaignRewards,
    grantShipRewards,
    planShipRewards: shipRewardPlan
  });
});
