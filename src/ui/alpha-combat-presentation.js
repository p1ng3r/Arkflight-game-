import { ALPHA_CARDS } from "../alpha/cards.js";

export const stationName = id => ({ captain: "Captain", engineer: "Engineer", navigator: "Navigator", battlewatch: "Battle Watch", veilwarden: "Lifeveil Warden", structure: "Structure", initiative: "Initiative" }[id] ?? id);
export const cardBand = card => card.burn ? "Burn" : card.delayed ? "Prepared" : card.timing === "instant" ? "Instant" : "Standard";
export const cardTheme = card => card.burn ? "burn" : card.delayed ? "prepared" : card.timing === "instant" ? "instant" : "standard";
const critical = {
  acquire: "+2 accuracy to one battery attack this round.", patch: "Restore 2d10+4 Hull for 1 Supply.", brace: "Prepare DR 4 for the entire next round.", prepare: "+2 AP after next round's refresh; prepared AP is capped at +2.", shield: "Resistance 7, plus ship bonuses, for this incoming attack.", helm: "Move one hex and rotate 60°, subject to legal geometry.", volley: "The prepared +2d8 shot also gains +1 accuracy at level 5.", harmonic: "The prepared shot bypasses 3 DR instead of 2.", "all-hands": "The prepared broadside gains +2 accuracy instead of +1; Burn still applies.", evasive: "+2 AC through this round.", read: "Draw two cards, then discard one; enforce hand capacity.", chainshot: "Double complete damage; reduce the next maneuver by 2 hexes.", breakaway: "Move one hex and rotate 60°, then prepare the bonus-damage shot.", ahead: "Move three extra hexes, plus ship bonuses, within the round's travel cap.", overcharge: "+1d10 instead of +1d8 on the next two battery attacks this round.", mend: "Restore 2d10+5 percentage points of Lifeveil, up to 100%.", rally: "Restore 2d10+5 percentage points of Morale, up to 100%.", vent: "Remove 2d4 plus ship bonus Strain.", "work-guns": "Reduce this battery's reload by two rounds; once-per-round firing still applies.", boarding: "Secure boarding lines with a critical success; deck combat remains optional.", ram: "Prepare +4 impact damage against the other ship in next round's first collision."
};
export function cardOutcomes(card) {
  const attack = card.role === "Attack" && card.stations.length === 1;
  const station = card.stations[0], setback = { captain: "lose 2% Morale", engineer: "gain 1 Strain", navigator: "lose 1 Supply", veilwarden: "lose 2% Lifeveil", battlewatch: "take 2 Hull wear" }[station];
  return [
    { degree: 2, label: "Critical success", theme: "critical", text: critical[card.id] ?? "Apply the printed critical benefit." },
    { degree: 1, label: "Success", theme: "success", text: attack ? "Hit for the printed damage and apply the hit effect." : card.id === "boarding" ? "Secure boarding lines to the adjacent enemy ship." : "Apply this card’s printed base effect." },
    { degree: 0, label: "Failure", theme: "failure", text: attack ? "Miss. Normal ammunition and reload apply." : card.id === "boarding" ? "The lines do not secure." : `The base effect still works; ${setback}.` },
    { degree: -1, label: "Critical failure", theme: "fumble", text: attack ? "Miss and draw a Battle Watch Complication; ammunition and reload apply." : card.id === "boarding" ? "The lines do not secure; draw a Battle Watch Complication." : `The base effect still works. Draw one ${stationName(station)} Complication instead of the fixed negative kicker.` }
  ];
}
export function phasePresentation(s, shipId) {
  const phases = ["planning", "cards", "targeting", "response", "cleanup"], current = phases.indexOf(s?.phase === "retarget" ? "response" : s?.phase);
  const active = s?.ships[s.turnOrder[s.turnIndex]];
  const hint = !s ? "Build a test fleet to take command." : ({
    planning: "Choose a complete route. The Captain locks it; the GM reveals all movement together.",
    cards: `${active?.name ?? "The active ship"} spends AP. Commit weapons now; declare their targets in the next phase.`,
    targeting: "Choose a target for every committed shot, then lock the exchange.",
    response: "The defender may play one Instant or pass. The attacker then rolls to hit and damage.",
    retarget: "The firing solution changed. Choose one replacement target or hold the shot.",
    cleanup: "The exchange is complete. The GM can start the next round.", complete: "Encounter complete. Review results or prepare the next loadout.", boarding: "Ship combat is paused for the deck encounter."
  }[s.phase] ?? "Follow the current phase.");
  return { hint, yourTurn: active?.id === shipId, steps: phases.map((id, n) => ({ id, label: { planning: "Plan / Move", cards: "Cards", targeting: "Targets", response: "Damage", cleanup: "Cleanup" }[id], number: n + 1, active: n === current, done: n < current || s?.complete })) };
}
export function combatPiles(s, ship) {
  if (!s || !ship) return [];
  return [
    { id: "draw", name: "Draw", count: ship.drawCount ?? ship.drawPile.length, theme: "standard", hint: "Hidden order · draw one at the beginning of later rounds" },
    { id: "discard", name: "Discard", count: ship.discard.length, theme: "standard", hint: "Eligible to reshuffle when the draw pile empties" },
    { id: "prepared", name: "Prepared", count: ship.prepared.length, theme: "prepared", hint: "Effects scheduled for a later round" },
    { id: "burned", name: "Burned", count: ship.burned.length, theme: "burn", hint: "Out of this encounter · permanent knowledge is preserved" },
    { id: "complications", name: "Complications", count: s.complications.drawPile.length, theme: "complication", hint: "Shared 24-card deck · only a final critical failure draws" }
  ];
}
export function inspectCombatPile(s, ship, id) {
  const pile = combatPiles(s, ship).find(p => p.id === id);
  if (!pile) return null;
  if (id === "draw") return { ...pile, cards: [], emptyText: "The next card stays hidden. Cards are drawn by the rules, not by clicking this pile." };
  if (id === "complications") {
    const receipt = s.complications.history.at(-1);
    return { ...pile, cards: [], receipt: receipt && { ...receipt, station: stationName(receipt.scenario) }, emptyText: "No Complication has been revealed this encounter." };
  }
  const ids = id === "prepared" ? ship.prepared.map(p => p.instance) : ship[id];
  return { ...pile, cards: ids.map(instance => ({ ...ALPHA_CARDS[ship.instances[instance]], instance })), emptyText: "This pile is empty." };
}
export function latestCombatResults(s, shipId) {
  return (s?.log ?? []).filter(e => e.detail && e.detail.station!=="initiative" && ["check", "damage"].includes(e.detail.kind) && [e.detail.shipId, e.detail.targetId].includes(shipId)).slice(-3).reverse().map(e => {
    const d = e.detail, outcome = ["Critical failure", "Failure", "Success", "Critical success"][d.degree + 1];
    return { ...d, id: e.id, round: e.round, check: d.kind === "check", damageResult: d.kind === "damage", label: outcome, theme: ["fumble", "failure", "success", "critical"][d.degree + 1], station: stationName(d.station), shipName: s.ships[d.shipId]?.name, targetName: s.ships[d.targetId]?.name, pendingDamage: e.round === s.round && ["response", "retarget"].includes(s.phase), modifierText: `${(d.modifier??0) >= 0 ? "+" : ""}${d.modifier??0}`, missed: d.degree < 1 };
  });
}
/** Presentation events are derived from authoritative snapshots; never roll, draw or spend here. */
export function combatPresentationEvents(before, after, shipId) {
  if (!before || !after || before.id !== after.id || after.revision <= before.revision || !before.ships[shipId] || !after.ships[shipId]) return [];
  const a = before.ships[shipId], b = after.ships[shipId], events = [];
  if (a.ap !== b.ap) events.push({kind:"ap"});
  if (JSON.stringify(a.pose)!==JSON.stringify(b.pose))events.push({kind:"move"});
  if (before.phase !== after.phase || before.round !== after.round) events.push({ kind: "phase" });
  const entered = b.hand.filter(id => !a.hand.includes(id)); if (entered.length) events.push({ kind: "draw", ids: entered });
  const gone = a.hand.filter(id => !b.hand.includes(id) && [...b.discard, ...b.burned, ...b.prepared.map(p => p.instance)].includes(id));
  if (gone.length) events.push({ kind: "play", ids: gone, burn: gone.some(id => b.burned.includes(id)) });
  for (const [key, resource] of Object.entries(b.resources)) if (resource.value !== a.resources[key].value) events.push({ kind: "resource", key, delta: resource.value - a.resources[key].value });
  const seen = new Set(before.log.map(e => e.id).filter(Boolean));
  for (const e of after.log) if (e.id && !seen.has(e.id) && e.detail && [e.detail.shipId, e.detail.targetId].includes(shipId)) events.push({ ...e.detail });
  if (after.complications.history.length > before.complications.history.length) events.push({ kind: "complication" });
  return events;
}
