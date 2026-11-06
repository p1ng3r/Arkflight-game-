import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {alphaRecapMarkup} from "../src/ui/alpha-recap-render.js";

const state=(phase="cleanup")=>({
 id:"crew-test",round:3,phase,
 ships:{
  a:{name:"Dawn <Runner>",batteries:[{id:"port",name:"Port <Broadside>"}]},
  b:{name:"Night Heron",batteries:[]}
 },
 roundEvents:[
  {round:3,text:"Damage applied <b>normally</b>",detail:{kind:"damage",shipId:"a",targetId:"b",batteryId:"port",degree:1,formula:"2d6+4",rolled:9,raw:9,resistance:2,dr:1,mitigated:3,damage:6}}
 ],
 log:[]
});

test("recap markup preserves damage narrative, exact log, and escaped player data",()=>{
 const html=alphaRecapMarkup(state(),{gm:true,journal:{journalId:"journal-3"},results:[{shipName:"<Test>",targetName:"Other",check:true,station:"Engineer",label:"Success",die:17,modifier:10,total:27,dc:20}]});
 assert.match(html,/Round 3/);
 assert.match(html,/Damage applied &lt;b&gt;normally&lt;\/b&gt;/);
 assert.match(html,/Dawn &lt;Runner&gt;/);
 assert.match(html,/Port &lt;Broadside&gt;/);
 assert.match(html,/&lt;Test&gt;/);
 assert.ok(!html.includes("<Test>"));
 assert.ok(!html.includes("Damage applied <b>"));
 assert.match(html,/data-round-action="open-journal"/);
 assert.match(html,/data-round-action="round"/);
});

test("cleanup displays journal retry and respects incomplete/complete restrictions",()=>{
 const s=state();
 const html=alphaRecapMarkup(s,{gm:true,unsettled:true});
 assert.match(html,/retry-recap/);
 assert.match(html,/data-round-action="round" disabled/);
 const ended=alphaRecapMarkup({...s,phase:"complete"},{gm:true,complete:true});
 assert.doesNotMatch(ended,/data-round-action="round"/);
 const observer=alphaRecapMarkup(s,{gm:false});
 assert.doesNotMatch(observer,/retry-recap|data-round-action="round"/);
 assert.equal(alphaRecapMarkup({...s,phase:"damage"}), "");
});

test("round HUD recap uses pre-rendered safe markup without nested cleanup template helpers",()=>{
 const source=readFileSync(new URL("../templates/alpha-round-deck.hbs",import.meta.url),"utf8");
 assert.match(source,/\{\{\{recapMarkup\}\}\}/);
 assert.doesNotMatch(source,/\{\{#if recap\}\}/);
 assert.doesNotMatch(source,/\{\{#each recapNarrative\}\}/);
 assert.doesNotMatch(source,/\{\{#each recapLines\}\}/);
});
