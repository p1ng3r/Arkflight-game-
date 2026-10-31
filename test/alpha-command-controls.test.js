import test from "node:test";
import assert from "node:assert/strict";
import {alphaWorld,installAlphaHooks} from "./helpers/alpha-world.js";
import {alphaSuggestedStep} from "../src/alpha/combat.js";
import {fleetReadiness} from "../src/ui/alpha-fleet-status.js";
import {soundRecipe,cardSoundSamples} from "../src/ui/card-combat-audio.js";
installAlphaHooks();
const {operatorBreakdown,authorizeAlphaCommand}=await import("../src/foundry/alpha-combat-api.js");
const send=(api,type,data={})=>{const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...data});};
async function cards(api){while(api.state().phase==="planning"){const step=alphaSuggestedStep(api.state());await send(api,step.command.type,step.command);}}
test("Fleet status tracks locks and turns without exposing routes",async()=>{
  const w=alphaWorld(),api=w.initialize();let s=await send(api,"start");
  assert.equal(fleetReadiness(s).waiting,2);
  await send(api,"plan",{shipId:"alpha-0",maneuverId:"hold"});await send(api,"lock",{shipId:"alpha-0"});
  s=api.state();assert.equal(fleetReadiness(s).waiting,1);assert.equal(fleetReadiness(s).rows[0].label,"Course locked");
  assert.equal(JSON.stringify(fleetReadiness(s)).includes('maneuverId'),false);
  await cards(api);s=api.state();assert.equal(fleetReadiness(s).rows.filter(r=>r.active).length,1);
  const current=s.turnOrder[s.turnIndex];await send(api,"finish-card",{shipId:current});
  assert.equal(fleetReadiness(api.state()).rows.find(r=>r.id===current).label,"Cards complete");
});
test("Crew can be assigned in Card phase and remains assigned after confirmed reset",async()=>{
  const w=alphaWorld(),api=w.initialize();await send(api,"start");await cards(api);
  game.actors.contents.push({id:"pc",name:"Ada",type:"character",skills:{crafting:{rank:2}},system:{abilities:{int:{mod:3}}},testUserPermission:()=>true});
  await send(api,"assign-station",{shipId:"alpha-0",station:"engineer",actorId:"pc"});
  let s=api.state();assert.equal(s.ships['alpha-0'].stationActors.engineer,'pc');
  const preview=await api.crewCheck('alpha-0','engineer','crafting');assert.equal(preview.name,'Ada');assert.equal(preview.modifier,12);
  const originalLibrary=game.actors.get(s.ships['alpha-0'].actorId).flags['arkflight-game'].alphaLibrary;
  s=await send(api,'reset');assert.equal(s.round,1);assert.equal(s.phase,'planning');assert.equal(s.ships['alpha-0'].ap,4);assert.equal(s.ships['alpha-0'].stationActors.engineer,'pc');
  assert.deepEqual(game.actors.get(s.ships['alpha-0'].actorId).flags['arkflight-game'].alphaLibrary,originalLibrary);
  assert.throws(()=>authorizeAlphaCommand(s,{type:'reset'},game.users.get('player')),/GM/);
});
test("Assigned NPC uses its selected skill with personal level replaced once by ship level",async()=>{
  const w=alphaWorld(),api=w.initialize();await send(api,"start");
  game.actors.contents.push({id:'npc',name:'Bosun',type:'npc',level:3,skills:{crafting:{mod:11},arcana:{mod:8}},testUserPermission:()=>true});
  await send(api,'assign-station',{shipId:'alpha-0',station:'engineer',actorId:'npc'});
  const ship=api.state().ships['alpha-0'];const breakdown=await operatorBreakdown(ship,'engineer','crafting');
  assert.equal(breakdown.reduce((n,c)=>n+c.value,0),13);
  assert.equal((await api.crewCheck(ship.id,'engineer','arcana')).modifier,10);
});
test("Non-Vent skills and actual attacks/damage animate already-evaluated dice without extra rolls",async()=>{
  const w=alphaWorld(),api=w.initialize();let s=await send(api,'start');const seen=[];
  game.dice3d={async animateRoll(roll,data){seen.push({roll,data});}};
  await cards(api);s=api.state();const ship=s.ships[s.turnOrder[s.turnIndex]],acquire=Object.keys(ship.instances).find(i=>ship.instances[i]==='acquire');
  if(!ship.hand.includes(acquire)){const old=ship.hand.pop();ship.drawPile=ship.drawPile.filter(i=>i!==acquire);ship.drawPile.push(old);ship.hand.push(acquire);}w.values.set('alphaCombat',s);
  const before=w.counts.rolls,shown=seen.length;await send(api,'play',{shipId:ship.id,instanceId:acquire,skill:'crafting'});
  assert.equal(seen.length-shown,1);assert.equal(w.counts.rolls-before,1);assert.equal(seen.at(-1).roll.formula,'1d20');
  // Drive the ordinary controller through its first firing exchange.
  for(let i=0;i<80&&!api.state().log.some(e=>e.detail?.kind==='damage');i++){
    const step=alphaSuggestedStep(api.state());if(!step)break;await send(api,step.command.type,step.command);
  }
  assert.ok(api.state().log.some(e=>e.detail?.kind==='damage'));
  assert.ok(seen.some(x=>x.roll.formula!=='1d20'));
});
test("Submit cue is an authored command effect rather than paper foley",()=>{
  assert.equal(cardSoundSamples('commit').length,0);assert.ok(soundRecipe('commit').length>=3);
  assert.ok(soundRecipe('commit').some(x=>x.frequency<=130));
});
