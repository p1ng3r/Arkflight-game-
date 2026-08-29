import { CREW_EDGE_HAND_MAX, getCrewEdgeCard } from "../content/crew-edge-cards.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { deriveShip } from "../ship/derive-ship.js";

const MODULE_ID = "arkflight-game";

function cloneList(value) {
  return Array.isArray(value) ? value.map((entry) => ({ ...entry })) : [];
}

export function rewardPackage({
  gold = 0,
  valuables = [],
  pf2eItems = [],
  salvage = [],
  shipComponents = [],
  faction = [],
  routeKnowledge = [],
  boons = [],
  edgeCards = []
} = {}) {
  const normalizedGold = Math.max(0, Number(gold) || 0);
  for (const tacticId of edgeCards) {
    if (!getCrewEdgeCard(tacticId)) throw new Error(`Unknown Crew Tactic: ${tacticId}`);
  }
  return Object.freeze({
    gold: normalizedGold,
    valuables: Object.freeze(cloneList(valuables)),
    pf2eItems: Object.freeze(cloneList(pf2eItems)),
    salvage: Object.freeze(cloneList(salvage)),
    shipComponents: Object.freeze(cloneList(shipComponents)),
    faction: Object.freeze(cloneList(faction)),
    routeKnowledge: Object.freeze(cloneList(routeKnowledge)),
    boons: Object.freeze(cloneList(boons)),
    edgeCards: Object.freeze([...edgeCards])
  });
}

export function endingDefinition({ id, label, bands, vignette, rewards = rewardPackage() }) {
  if (!id || !label) throw new Error("Event ending requires id and label");
  if (!Array.isArray(bands) || bands.length < 1) throw new Error(`Event ending ${id} requires one or more final round bands`);
  const sentenceCount = String(vignette ?? "").split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length;
  if (sentenceCount < 3 || sentenceCount > 6) throw new Error(`Event ending ${id} vignette must be 3-6 sentences; received ${sentenceCount}`);
  return Object.freeze({ id, label, bands: Object.freeze([...bands]), vignette, rewards });
}

export function resolveEventEnding(event, finalBandId) {
  const ending = Object.values(event?.endings ?? {}).find((entry) => entry?.bands?.includes(finalBandId));
  if (!ending) throw new Error(`Event ${event?.id ?? "unknown"} has no ending authored for final band ${finalBandId}`);
  return ending;
}

export function crewTacticHandMax() {
  const actor = globalThis.game?.arkflight?.activeShip ?? null;
  const ship = actor?.flags?.[MODULE_ID]?.ship ?? null;
  if (!ship) return CREW_EDGE_HAND_MAX;
  try {
    const bonus = Number(deriveShip(ship, SHIP_CATALOGS).stats?.crewTacticCapacity ?? 0);
    return Math.max(1, CREW_EDGE_HAND_MAX + bonus);
  } catch (_error) {
    return CREW_EDGE_HAND_MAX;
  }
}

function awardTactics(state, tacticIds = []) {
  const handMax = crewTacticHandMax();
  const currentHand = [...(state?.crewEdgeHand ?? [])].filter((id) => getCrewEdgeCard(id));
  const awardedEdgeCards = [];
  const overflowEdgeCards = [];
  for (const tacticId of tacticIds) {
    if (currentHand.length < handMax) {
      currentHand.push(tacticId);
      awardedEdgeCards.push(tacticId);
    } else {
      overflowEdgeCards.push(tacticId);
    }
  }
  return { crewEdgeHand: currentHand, awardedEdgeCards, overflowEdgeCards, handMax };
}

export function applyRoundRewardPackageToState(state, rewards, { roundId = null, bandId = null } = {}) {
  const award = awardTactics(state, rewards?.edgeCards ?? []);
  return {
    ...state,
    crewEdgeHand: award.crewEdgeHand,
    crewTacticHandMax: award.handMax,
    roundRewards: {
      ...(rewards ?? rewardPackage()),
      roundId,
      bandId,
      awardedEdgeCards: award.awardedEdgeCards,
      overflowEdgeCards: award.overflowEdgeCards,
      crewTacticHandMax: award.handMax
    }
  };
}

export function applyRewardPackageToState(state, rewards) {
  const award = awardTactics(state, rewards?.edgeCards ?? []);
  return {
    ...state,
    crewEdgeHand: award.crewEdgeHand,
    crewTacticHandMax: award.handMax,
    eventRewards: {
      ...(rewards ?? rewardPackage()),
      awardedEdgeCards: award.awardedEdgeCards,
      overflowEdgeCards: award.overflowEdgeCards,
      crewTacticHandMax: award.handMax,
      granted: false
    }
  };
}

export function rewardRows(rewards) {
  if (!rewards) return [];
  const rows = [];
  if (Number(rewards.gold ?? 0) > 0) rows.push({ type: "gold", label: `${Number(rewards.gold)} gp`, detail: "Coin / liquid reward" });
  for (const entry of rewards.valuables ?? []) rows.push({ type: "valuable", label: entry.name ?? "Valuable", detail: entry.valueGp ? `${entry.valueGp} gp value` : entry.description ?? "" });
  for (const entry of rewards.pf2eItems ?? []) rows.push({ type: "item", label: entry.name ?? entry.uuid ?? "PF2e Item", detail: entry.quantity && entry.quantity > 1 ? `×${entry.quantity}` : entry.description ?? "" });
  for (const entry of rewards.salvage ?? []) rows.push({ type: "salvage", label: entry.name ?? "Salvage", detail: entry.description ?? (entry.valueGp ? `${entry.valueGp} gp value` : "") });
  for (const entry of rewards.shipComponents ?? []) rows.push({ type: "ship", label: entry.name ?? entry.id ?? "Ship Component", detail: entry.description ?? entry.kind ?? "" });
  for (const entry of rewards.faction ?? []) rows.push({ type: "faction", label: entry.name ?? "Faction Reward", detail: entry.description ?? "" });
  for (const entry of rewards.routeKnowledge ?? []) rows.push({ type: "route", label: entry.name ?? "Route Knowledge", detail: entry.description ?? "" });
  for (const entry of rewards.boons ?? []) rows.push({ type: "boon", label: entry.name ?? "Boon", detail: entry.description ?? "" });
  for (const tacticId of rewards.awardedEdgeCards ?? rewards.edgeCards ?? []) {
    const tactic = getCrewEdgeCard(tacticId);
    if (tactic) rows.push({ type: "edge", label: `Crew Tactic — ${tactic.name}`, detail: `${tactic.trigger} ${tactic.effect}` });
  }
  const handMax = Number(rewards.crewTacticHandMax ?? CREW_EDGE_HAND_MAX);
  for (const tacticId of rewards.overflowEdgeCards ?? []) {
    const tactic = getCrewEdgeCard(tacticId);
    if (tactic) rows.push({ type: "edge-overflow", label: `Crew Tactic Overflow — ${tactic.name}`, detail: `The shared Tactics pool is full (${handMax}); replace or discard a Tactic before keeping this reward.` });
  }
  return rows;
}

export function crewEdgeHandRows(state) {
  return [...(state?.crewEdgeHand ?? [])]
    .map((id) => getCrewEdgeCard(id))
    .filter(Boolean)
    .map((tactic) => ({ ...tactic }));
}

export const crewTacticRows = crewEdgeHandRows;
