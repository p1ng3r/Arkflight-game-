import { CREW_EDGE_HAND_MAX, getCrewEdgeCard } from "../content/crew-edge-cards.js";

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
  for (const edgeId of edgeCards) {
    if (!getCrewEdgeCard(edgeId)) throw new Error(`Unknown Crew Edge card: ${edgeId}`);
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

function awardEdgeCards(state, edgeCards = []) {
  const currentHand = [...(state?.crewEdgeHand ?? [])].filter((id) => getCrewEdgeCard(id));
  const awardedEdgeCards = [];
  const overflowEdgeCards = [];
  for (const edgeId of edgeCards) {
    if (currentHand.length < CREW_EDGE_HAND_MAX) {
      currentHand.push(edgeId);
      awardedEdgeCards.push(edgeId);
    } else {
      overflowEdgeCards.push(edgeId);
    }
  }
  return { crewEdgeHand: currentHand, awardedEdgeCards, overflowEdgeCards };
}

export function applyRoundRewardPackageToState(state, rewards, { roundId = null, bandId = null } = {}) {
  const award = awardEdgeCards(state, rewards?.edgeCards ?? []);
  return {
    ...state,
    crewEdgeHand: award.crewEdgeHand,
    roundRewards: {
      ...(rewards ?? rewardPackage()),
      roundId,
      bandId,
      awardedEdgeCards: award.awardedEdgeCards,
      overflowEdgeCards: award.overflowEdgeCards
    }
  };
}

export function applyRewardPackageToState(state, rewards) {
  const award = awardEdgeCards(state, rewards?.edgeCards ?? []);
  return {
    ...state,
    crewEdgeHand: award.crewEdgeHand,
    eventRewards: {
      ...(rewards ?? rewardPackage()),
      awardedEdgeCards: award.awardedEdgeCards,
      overflowEdgeCards: award.overflowEdgeCards,
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
  for (const edgeId of rewards.awardedEdgeCards ?? rewards.edgeCards ?? []) {
    const card = getCrewEdgeCard(edgeId);
    if (card) rows.push({ type: "edge", label: `Crew Edge — ${card.name}`, detail: `${card.trigger} ${card.effect}` });
  }
  for (const edgeId of rewards.overflowEdgeCards ?? []) {
    const card = getCrewEdgeCard(edgeId);
    if (card) rows.push({ type: "edge-overflow", label: `Crew Edge Overflow — ${card.name}`, detail: "Shared hand is full (3 cards); the GM must replace or discard a card before keeping this reward." });
  }
  return rows;
}

export function crewEdgeHandRows(state) {
  return [...(state?.crewEdgeHand ?? [])]
    .map((id) => getCrewEdgeCard(id))
    .filter(Boolean)
    .map((card) => ({ ...card }));
}
