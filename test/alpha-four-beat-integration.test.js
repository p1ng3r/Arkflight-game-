import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createAlphaSession,dispatchAlphaCommand} from "../src/alpha/combat.js";
import {FOUR_BEAT_EXPERIENCE,consumeCrewCheckBonus} from "../src/alpha/four-beat.js";
const entries=[
 {id:"dawn",name:"Dawn Runner",team:"party",hullId:"brigantine",pose:{q:0,r:0,heading:0}},
 {id:"night",name:"Night Heron",team:"enemy",hullId:"cutter",pose:{q:6,r:0,heading:3}}
];
function session(experience=FOUR_BEAT_EXPERIENCE){
 const s=createAlphaSession(entries,{id:"four-beat-test",seed:13,roundFlow:2,combatFlow:3,experience});
 s.phase="card-planning";s.cardLocks={};s.cardPlans={dawn:[],night:[]};return s;
}
test("new manual session opts in without changing earlier combatFlow 3 saved games",()=>{
 const a=session(),b=session(null);
 assert.equal(a.experience,FOUR_BEAT_EXPERIENCE);
 assert.equal(b.experience,undefined);
 assert.equal(a.ships.dawn.hand.length,5);
 assert.equal(a.ships.dawn.profile.roundDraw,2);
 assert.deepEqual(b.ships.dawn.crewCalls,{});
});
test("free crew contribution changes real session revision and not AP or card hand",async()=>{
 let s=session(),beforeAP=s.ships.dawn.ap,hand=[...s.ships.dawn.hand];
 s=await dispatchAlphaCommand(s,{type:"crew-call",shipId:"dawn",station:"captain",choice:"focus-guns",encounterId:s.id,revision:s.revision});
 assert.equal(s.revision,1);
 assert.equal(s.ships.dawn.ap,beforeAP);
 assert.deepEqual(s.ships.dawn.hand,hand);
 assert.equal(s.ships.dawn.crewCalls.captain.id,"focus-guns");
 assert.equal(consumeCrewCheckBonus(s,s.ships.dawn,"battlewatch"),1);
 assert.equal(consumeCrewCheckBonus(s,s.ships.dawn,"battlewatch"),0);
 await assert.rejects(dispatchAlphaCommand(s,{type:"crew-call",shipId:"dawn",station:"captain",choice:"shield-wall",encounterId:s.id,revision:s.revision}),/already used/);
});
test("existing sessions cannot use experimental contributions",async()=>{
 const s=session(null);
 await assert.rejects(dispatchAlphaCommand(s,{type:"crew-call",shipId:"dawn",station:"engineer",choice:"vent-heat",encounterId:s.id,revision:s.revision}),/unavailable/);
});
test("the core Four-Beat HUD is opt-in and main template blocks remain paired",()=>{
 const src=readFileSync(new URL("../templates/alpha-round-deck.hbs",import.meta.url),"utf8");
 const start=src.indexOf('{{#if showHand}}'),calls=src.indexOf('class="four-crew-calls"'),maneuver=src.indexOf('class="four-maneuver"');
 assert.ok(start>=0&&calls>start&&maneuver>start);
 assert.match(src,/\{\{#if fourBeat\}\}\{\{#if maneuverStep\}\}|\{\{#if maneuverStep\}\}\{\{#if fourBeat\}\}/);
 assert.match(src,/data-round-action="crew-call"/);
 assert.match(src,/data-round-action="route"/);
 const stack=[];
 for(const match of src.matchAll(/\{\{\s*([#/])(if|each|unless|with)(?=[\s}])[^}]*\}\}/g)){
  const [,type,name]=match;if(type==="#")stack.push(name);
  else assert.equal(stack.pop(),name,`Unbalanced Handlebars block near char ${match.index}`);
 }
 assert.deepEqual(stack,[]);
});
test("the experimental CSS is registered after the existing canvas HUD skins",()=>{
 const manifest=JSON.parse(readFileSync(new URL("../module.json",import.meta.url),"utf8"));
 const idx=manifest.styles.indexOf("styles/alpha-four-beat.css");
 assert.ok(idx>manifest.styles.indexOf("styles/alpha-ornate-hud.css"));
 const css=readFileSync(new URL("../styles/alpha-four-beat.css",import.meta.url),"utf8");
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/data-four-beat="true"/);
 assert.match(css,/four-beat-instant-glow/);
});
