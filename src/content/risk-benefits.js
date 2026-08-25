function benefit(id, name, tier, tags, success, criticalSuccess, target = "self", timing = "immediate") {
  return Object.freeze({ id, name, tier, tags: Object.freeze(tags), success, criticalSuccess, target, timing });
}

const B = benefit;
export const RISK_BENEFITS = Object.freeze([
  B("aid-next-1","Open the Way",2,["next-station","aid"],"Next station gains +1 to its check.","Next station gains +2 to its check.","next-station"),
  B("aid-next-2","Clear the Line",5,["next-station","aid"],"Next station gains +2 to its check.","Next station gains +3 and ignores one minor Hazard modifier.","next-station"),
  B("aid-next-3","Perfect Setup",8,["next-station","aid"],"Next station gains +3 to its check.","Next station gains +5 to its check.","next-station"),
  B("dc-next-1","Ease Their Burden",2,["next-station","dc"],"Reduce the next station's DC by 1.","Reduce it by 2.","next-station"),
  B("dc-next-2","Create the Opening",5,["next-station","dc"],"Reduce the next station's DC by 2.","Reduce it by 3 and grant +1 Momentum.","next-station"),
  B("dc-next-3","Impossible Opening",8,["next-station","dc"],"Reduce the next station's DC by 3.","Reduce it by 5.","next-station"),
  B("momentum-1","Catch the Rhythm",2,["momentum"],"Gain +1 Momentum.","Gain +1 Momentum and preserve it from the next round-band loss."),
  B("momentum-2","Crew in Motion",5,["momentum","teamwork"],"Gain +1 Momentum and the next station gains +1.","Gain +2 Momentum before clamping and the next station gains +2.","crew"),
  B("momentum-3","Perfect Cadence",8,["momentum","teamwork"],"Set Momentum to at least 2.","Set Momentum to 3 and grant +1 to every unresolved station.","crew"),
  B("pressure-drop-1","Bleed Pressure",2,["pressure"],"Reduce 1 Pressure from an authored system.","Reduce 2 Pressure from that system."),
  B("pressure-drop-2","Stabilize the Crisis",5,["pressure"],"Reduce 2 Pressure split among authored systems.","Reduce 3 Pressure split among authored systems."),
  B("pressure-drop-3","Master the Strain",8,["pressure"],"Reduce 3 Pressure split among authored systems.","Reduce 4 Pressure and suppress one pressure-triggered Hazard this round."),
  B("pressure-guard-1","Brace the System",2,["pressure","guard"],"Prevent the next 1 Pressure that would hit the authored system.","Prevent the next 2 Pressure."),
  B("pressure-guard-2","Hold the Line",5,["pressure","guard"],"Prevent up to 2 Pressure this round.","Prevent up to 3 Pressure this round."),
  B("pressure-guard-3","Unbreakable",8,["pressure","guard"],"The authored system cannot gain Pressure from the next consequence.","It cannot gain Pressure for the rest of the round."),
  B("hazard-suppress-1","Buy a Moment",2,["hazard","control"],"Suppress one minor Hazard effect for the next station.","Suppress it for the rest of the round."),
  B("hazard-suppress-2","Contain the Threat",5,["hazard","control"],"Suppress one Hazard for the rest of the round.","Suppress it and reduce 1 related Pressure."),
  B("hazard-remove-1","Break the Hazard",8,["hazard","control"],"Remove one eligible Hazard.","Remove it and gain +1 Momentum."),
  B("hazard-reveal-1","See It Coming",2,["hazard","information"],"Reveal one hidden/upcoming Hazard hook.","Reveal it and grant +1 to the first station that addresses it."),
  B("hazard-turn-1","Turn Danger to Advantage",5,["hazard","teamwork"],"Choose one Hazard; the next station that addresses it gains +2.","That station gains +3 and removes the Hazard on Success."),
  B("hazard-deny-risk","Keep the Window Open",8,["hazard","risk"],"Ignore one Hazard that would block a Heroic/Risk option this round.","Ignore it and one unresolved station may use a Risk tier it normally lacks."),
  B("signature-preserve","Hold Something Back",2,["signature"],"If you use your Signature this resolution, do not expend it on a Critical Success.","Do not expend it regardless of this check's degree."),
  B("signature-refresh-self","Second Wind",5,["signature","refresh"],"Refresh your expended Signature Ability.","Refresh it and grant +1 Momentum."),
  B("signature-refresh-other","Pass the Spark",8,["signature","refresh","teamwork"],"Refresh another station's expended Signature Ability.","Refresh another station's Signature and your own.","other-station"),
  B("ship-ability-refresh","Reset the Mechanism",8,["ship-ability","refresh"],"Refresh one eligible expended one-use ship/component ability.","Refresh it and reduce 1 Pressure tied to that component."),
  B("order-shift-self","Slip the Order",2,["order"],"After resolving, move one unresolved station one position earlier or later.","Move any unresolved station to any remaining position."),
  B("order-swap","Tactical Reorder",5,["order","teamwork"],"Swap two unresolved stations.","Reorder all unresolved stations."),
  B("order-followup","Ride the Wake",5,["order","next-station"],"Choose the next station; it gains +2 if it resolves immediately after you.","It gains +3 and -1 DC if it resolves immediately after you.","next-station"),
  B("chain-1","Pass the Advantage",2,["chain","teamwork"],"If the next station succeeds, the station after it gains +1.","If the next station succeeds, the station after it gains +2."),
  B("chain-2","Rolling Advantage",5,["chain","teamwork"],"Each later station gains +1 if the immediately previous station succeeded.","The chain bonus becomes +2 after the first chained success.","crew"),
  B("chain-3","Crew Cascade",8,["chain","teamwork"],"Every unresolved station gains +1 while the success chain remains unbroken.","Every unresolved station gains +2 while the chain remains unbroken.","crew"),
  B("reroll-next","Give Them Another Chance",5,["reroll","next-station"],"Next station may reroll its check and keep the new result.","Next station may reroll and keep the better result.","next-station"),
  B("degree-shield","Catch the Fall",5,["degree","guard"],"Next station treats a Critical Failure as a Failure.","Next station also treats a Failure as a Success if its roll misses by 1.","next-station"),
  B("degree-lift","Set Up Greatness",8,["degree","next-station"],"If next station succeeds, improve its degree by one step.","Improve the next station's degree by one step, up to Critical Success.","next-station"),
  B("arkengine-vent","Vent the Core",2,["arkengine","pressure"],"Reduce Arkengine Pressure by 1.","Reduce Arkengine Pressure by 2."),
  B("arkengine-overdrive","Controlled Overdrive",5,["arkengine","risk"],"Next Engineer or Navigator action gains +2.","It gains +3 and Arkengine Pressure cannot increase from that action.","crew"),
  B("arkengine-master","Master the Arkengine",8,["arkengine","signature"],"Refresh an Engineer Signature or reduce Arkengine Pressure by 2.","Do both and gain +1 Momentum."),
  B("lifeveil-steady","Steady the Lifeveil",2,["lifeveil","pressure"],"Reduce Lifeveil Pressure by 1.","Reduce Lifeveil Pressure by 2."),
  B("lifeveil-ward","Veil Shelter",5,["lifeveil","guard"],"One unresolved station ignores one void/aetheric Hazard effect.","All unresolved stations ignore that Hazard effect this round.","crew"),
  B("lifeveil-miracle","Aegis of the Veil",8,["lifeveil","guard"],"Prevent the next Lifeveil breach consequence.","Prevent it and remove 1 active void/aetheric Hazard."),
  B("hull-brace","Brace the Hull",2,["hull","guard"],"Prevent 1 Hull Pressure.","Prevent 2 Hull Pressure."),
  B("rigging-clear","Clear the Rigging",2,["rigging","hazard"],"Reduce a Rigging Hazard's effect for one station.","Suppress it for the round."),
  B("helm-line","True the Helm",2,["helm","navigation"],"Next Navigator check gains +1 or -1 DC.","It gains +2 and -1 DC.","navigator"),
  B("weapons-opening","Mark the Opening",2,["watchmaster","combat","aid"],"Next attack-oriented station action gains +1.","It gains +2 and ignores one cover-like Hazard effect.","next-station"),
  B("information-next-round","Read Ahead",5,["information","event-state"],"Reveal the next round's situation or one authored danger hook.","Reveal it plus one station's strongest upcoming action option.","crew"),
  B("information-choice","Know the Weak Point",2,["information"],"Reveal which one of two authored options carries lower hidden consequence.","Reveal it and grant +1 when acting on that knowledge."),
  B("progress-1","Press the Advantage",5,["progress","round-score"],"Add +1 to the final round score after all five stations resolve.","Add +2 instead."),
  B("progress-2","Seize the Moment",8,["progress","round-score"],"Add +2 to final round score.","Add +3 and treat a final score of 6 as Extraordinary."),
  B("mixed-softener","Make It Count",2,["round-outcome","pressure"],"If the round ends Mixed Success, reduce its authored Pressure increase by 1.","If Mixed, remove the Pressure increase entirely."),
  B("failure-softener","Refuse the Worst",5,["round-outcome","guard"],"If the round ends Failure, reduce one authored consequence in severity.","If Failure, treat its Momentum loss as 0 and reduce one Pressure."),
  B("disaster-buffer","Against Disaster",8,["round-outcome","guard"],"If the round ends Disaster, suppress one Hazard it would create.","If Disaster, also reduce its Pressure increase by 1."),
  B("resource-recover","Recover Supplies",2,["resource","recovery"],"Recover a small authored expendable ship resource.","Recover twice that amount or one rarer authored resource."),
  B("condition-suppress","Work Around the Damage",5,["condition","ship"],"Ignore one damaged component's penalty for the rest of the round.","Ignore it for the rest of the encounter."),
  B("condition-stabilize","Keep It Functional",8,["condition","ship"],"Prevent one damaged component from worsening this round.","Also restore it from disabled to damaged for the encounter if eligible."),
  B("fallback-upgrade","Make the Basics Count",2,["fallback","station"],"If the next station uses its fallback action, it gains +2.","It gains +3 and may use one authored +2 Risk option if eligible.","next-station"),
  B("risk-open-2","Open a Heroic Window",5,["risk","unlock"],"One unresolved station may use an authored +2 Risk tier otherwise unavailable this round.","It may use +2 or +5 if that action has a compatible benefit.","other-station"),
  B("risk-open-3","Dare the Impossible",8,["risk","unlock"],"One unresolved station may use an authored +5 Risk tier otherwise unavailable.","It may instead access an authored +8 tier if one exists for that skill.","other-station"),
  B("bonus-self-1","Exacting Execution",2,["self","bonus"],"Gain +1 to one follow-up check this round if the event grants one.","Gain +2 instead."),
  B("bonus-other-3","Hero's Gift",8,["other-station","bonus"],"Choose another station; it gains +3 this round.","It gains +5 this round.","other-station"),
  B("pressure-transfer","Take the Load",5,["pressure","teamwork"],"Move 1 Pressure from one authored system to another eligible system.","Move up to 2 without triggering the destination threshold immediately."),
  B("hazard-delay","Delay the Crisis",2,["hazard","timing"],"One Hazard does not trigger until after the next station resolves.","Delay it until end of round."),
  B("hazard-opportunity","Exploit the Hazard",5,["hazard","opportunity"],"Turn one Hazard into +2 for a specifically related station action.","The bonus is +3 and Success suppresses the Hazard."),
  B("crew-shield","Cover the Crew",5,["teamwork","guard"],"Choose two unresolved stations; each ignores the first -1 penalty this round.","All unresolved stations ignore their first -1 penalty this round.","crew"),
  B("crew-surge","All Together",8,["teamwork","bonus"],"All unresolved stations gain +1.","All unresolved stations gain +2.","crew"),
  B("narrative-breakthrough","Cinematic Breakthrough",8,["event-state","narrative"],"Trigger an authored breakthrough state if this event supports one.","Trigger its exceptional version and gain +1 Momentum."),
  B("pressure-threshold-raise","Reinforce the Limit",5,["pressure","threshold"],"Raise one authored Pressure threshold by 1 for this round.","Raise it by 2 for this round."),
  B("pressure-threshold-raise-big","Beyond Safe Limits",8,["pressure","threshold"],"Raise one authored Pressure threshold by 2 for the encounter.","Raise it by 3 for the encounter, then reduce that system's Pressure by 1."),
  B("hazard-emergency-action","Create an Answer",5,["hazard","action"],"Unlock one authored emergency action against an active Hazard.","Unlock it and give its user +2."),
  B("station-link-strong","Forge the Link",5,["station-link","teamwork"],"Create an authored +2 station link between two stations this round.","The link is +3 and persists into next round if both stations succeeded.","crew"),
  B("station-link-legend","Perfect Coordination",8,["station-link","teamwork"],"Create an authored +3 station link between two stations.","Create +5 and gain +1 Momentum if both stations succeed.","crew")
]);

export const RISK_BENEFIT_BY_ID = Object.freeze(Object.fromEntries(RISK_BENEFITS.map(item => [item.id, item])));

export function getRiskBenefit(id) {
  return RISK_BENEFIT_BY_ID[id] ?? null;
}

export function riskBenefitsByTag(tag) {
  return RISK_BENEFITS.filter(item => item.tags.includes(tag));
}
