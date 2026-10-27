import test from "node:test";
import assert from "node:assert/strict";
import { ALPHA_CARDS } from "../src/alpha/cards.js";
import { createAlphaSession, dispatchAlphaCommand, alphaSuggestedStep } from "../src/alpha/combat.js";
import { cardBand, cardTheme, cardOutcomes, phasePresentation, combatPiles, inspectCombatPile, latestCombatResults, combatPresentationEvents } from "../src/ui/alpha-combat-presentation.js";

const fixture=()=>createAlphaSession([{id:"a",name:"Crew",team:"crew",hullId:"brigantine",pose:{q:0,r:0,heading:0}},{id:"b",name:"Enemy",team:"enemy",hullId:"cutter",pose:{q:3,r:-6,heading:3}}],{id:"presentation-test",seed:25});
test("all alpha cards have clear type bands and four station-appropriate authored outcome views",()=>{
  for(const c of Object.values(ALPHA_CARDS)){
    assert.ok(cardBand(c));assert.ok(cardTheme(c));const outcomes=cardOutcomes(c);assert.deepEqual(outcomes.map(o=>o.degree),[2,1,0,-1]);assert.ok(outcomes.every(o=>o.text&&o.label));
  }
  assert.equal(cardBand(ALPHA_CARDS.shield),"Instant");assert.equal(cardBand(ALPHA_CARDS.brace),"Prepared");assert.equal(cardBand(ALPHA_CARDS["all-hands"]),"Burn");
  assert.match(cardOutcomes(ALPHA_CARDS.overcharge)[0].text,/1d10/);assert.match(cardOutcomes(ALPHA_CARDS.vent)[2].text,/Strain/);assert.match(cardOutcomes(ALPHA_CARDS.chainshot)[2].text,/Miss/);
});
test("pile inspection never reveals the draw order, draws a card or mutates the encounter",()=>{
  const s=fixture(),before=structuredClone(s),ship=s.ships.a;
  assert.equal(combatPiles(s,ship).length,5);assert.equal(combatPiles(s,ship).find(p=>p.id==="draw").count,10);
  const draw=inspectCombatPile(s,ship,"draw");assert.deepEqual(draw.cards,[]);assert.ok(!("drawPile" in draw));
  assert.equal(inspectCombatPile(s,ship,"complications").count,24);assert.deepEqual(s,before);
});
test("opening/reopening, stale revisions and changing encounters produce no replayed presentation events",()=>{
  const s=fixture();assert.deepEqual(combatPresentationEvents(null,s,"a"),[]);assert.deepEqual(combatPresentationEvents(s,s,"a"),[]);
  const next=structuredClone(s);next.id="another";next.revision++;assert.deepEqual(combatPresentationEvents(s,next,"a"),[]);
  assert.equal(phasePresentation(s,"a").steps.filter(p=>p.active).length,1);
});
test("presentation differences follow actual card zones and resource deltas, without spending or rolling",()=>{
  const before=fixture(),after=structuredClone(before),card=after.ships.a.hand.pop();after.ships.a.burned.push(card);after.ships.a.resources.hull.value-=9;after.revision++;
  const snapshot=structuredClone(after),events=combatPresentationEvents(before,after,"a");assert.ok(events.some(e=>e.kind==="play"&&e.burn));assert.ok(events.some(e=>e.kind==="resource"&&e.key==="hull"&&e.delta===-9));assert.deepEqual(after,snapshot);
});
test("visible receipts use the authoritative dice and damage results, including incoming attacks",async()=>{
  let s=fixture(),rolls=0;
  for(let n=0;n<120&&!s.complete&&s.round<=2;n++){
    const step=alphaSuggestedStep(s);assert.ok(step);s=await dispatchAlphaCommand(s,{...step.command,encounterId:s.id,revision:s.revision},{roll:async formula=>{rolls++;return formula==="1d20"?10:16;}});
  }
  const checks=s.log.filter(e=>e.detail?.kind==="check");assert.ok(checks.length);assert.ok(checks.every(e=>e.detail.die===10&&e.detail.total===10+e.detail.modifier));
  const damage=s.log.filter(e=>e.detail?.kind==="damage");assert.ok(damage.length);assert.ok(damage.every(e=>e.detail.degree<1?e.detail.rolled===0:e.detail.rolled===16));assert.ok(rolls>=checks.length);
  const before=structuredClone(s);const results=latestCombatResults(s,"b");assert.ok(results.some(r=>r.shipId==="a"||r.targetId==="b"));assert.deepEqual(s,before);
  assert.ok(s.log.every(e=>e.id));assert.equal(new Set(s.log.map(e=>e.id)).size,s.log.length);
});
