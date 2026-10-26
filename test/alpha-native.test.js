import test from "node:test";
import assert from "node:assert/strict";
import { alphaWorld,installAlphaHooks } from "./helpers/alpha-world.js";
installAlphaHooks();
const {authorizeAlphaCommand}=await import("../src/foundry/alpha-combat-api.js");
const {alphaSuggestedStep}=await import("../src/alpha/combat.js");
const {expectedAlphaTokens,alphaNativePose}=await import("../src/foundry/alpha-combat-canvas.js");
const M="arkflight-game";
function command(api,type,extra={}){const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...extra});}
async function next(api){const s=api.state(),step=alphaSuggestedStep(s);assert.ok(step);return command(api,step.command.type,step.command);}
async function ready(api){while(api.state().phase==="planning")await next(api);}

test("native alpha uses only dedicated fixtures, runs three rounds and preserves campaign documents",async()=>{
  const w=alphaWorld(),api=w.initialize();game.actors.contents.push({id:"campaign",name:"Campaign ship",flags:{campaign:true}});
  let s=await command(api,"start");const campaign=structuredClone(game.actors.get("campaign"));let steps=0;
  while(s.round<=3&&!s.complete&&steps++<180)s=await next(api);
  assert.ok(steps<180);assert.ok(s.round>3||s.complete);assert.ok(w.counts.moves>2);assert.equal(w.counts.scenes,1);assert.equal(w.counts.actors,2);
  assert.deepEqual(game.actors.get("campaign"),campaign);assert.equal(s.ships["alpha-0"].profile.maxHull,120);
  for(const row of expectedAlphaTokens(s)){const actual=alphaNativePose(canvas.scene.tokens.get(row.tokenId),canvas.grid);assert.equal(actual.q,row.q);assert.equal(actual.r,row.r);assert.equal(actual.rotation,row.rotation);}
});
test("one- to three-hex hulls use matching marker counts and retain exact native positions",async()=>{
  const w=alphaWorld(),api=w.initialize();let s=await command(api,"start",{hullId:"dread-caravel",enemyHullId:"cathedral-ship"});
  assert.equal(s.ships["alpha-0"].tokenIds.length,3);assert.equal(s.ships["alpha-1"].tokenIds.length,3);
  for(const id of Object.keys(s.ships)){await command(api,"plan",{shipId:id,maneuverId:"straight-1"});await command(api,"lock",{shipId:id});}
  s=await command(api,"move");assert.equal(s.phase,"cards");
  for(const row of expectedAlphaTokens(s)){const pose=alphaNativePose(canvas.scene.tokens.get(row.tokenId),canvas.grid);assert.deepEqual([pose.q,pose.r,pose.rotation],[row.q,row.r,row.rotation]);}
});
test("blocked partial native movement keeps resolved intent for resume without rerolling or spending twice",async()=>{
  const w=alphaWorld(),api=w.initialize();await command(api,"start");
  while(!Object.values(api.state().ships).every(x=>api.state().locked[x.id]))await next(api);
  const before=api.state();w.faults.blockMove=before.ships["alpha-0"].tokenIds[0];
  await assert.rejects(()=>command(api,"move"),/stopped|prevented|match/);
  const rolls=w.counts.rolls,job=api.recovery();assert.ok(job.next);assert.deepEqual(api.state(),before);
  await assert.rejects(()=>command(api,"plan",{shipId:"alpha-0",maneuverId:"hold"}),/saved movement/);
  w.faults.blockMove=false;const s=await command(api,"resume-movement");assert.equal(w.counts.rolls,rolls);assert.deepEqual(s,job.next);assert.equal(api.recovery().next,undefined);
});
test("a failed encounter save is recoverable after native movement and restore returns initial poses",async()=>{
  const w=alphaWorld(),api=w.initialize();await command(api,"start");
  while(!Object.values(api.state().ships).every(x=>api.state().locked[x.id]))await next(api);
  const before=api.state();w.faults.failState=true;await assert.rejects(()=>command(api,"move"),/storage rejected/);assert.ok(api.recovery().next);
  await command(api,"restore-movement");assert.deepEqual(api.state(),before);assert.equal(api.recovery().next,undefined);
  for(const row of expectedAlphaTokens(before)){const actual=alphaNativePose(canvas.scene.tokens.get(row.tokenId),canvas.grid);assert.equal(actual.q,row.q);assert.equal(actual.r,row.r);}
});
test("native acknowledgement survives mutated payloads and pending completion wrappers",async()=>{
  const w=alphaWorld(),api=w.initialize();await command(api,"start");w.faults.mutatePayload=true;w.faults.pendingMove=true;
  await ready(api);assert.equal(api.state().phase,"cards");assert.equal(api.recovery().next,undefined);
});
test("stale double actions, manual token movement, paused execution and unauthorized actors reject",async()=>{
  const w=alphaWorld(),api=w.initialize();const s=await command(api,"start"),input={type:"plan",shipId:"alpha-0",maneuverId:"straight-1",encounterId:s.id,revision:s.revision};
  const result=await Promise.allSettled([api.request(input),api.request(input)]);assert.equal(result.filter(x=>x.status==="fulfilled").length,1);
  const token=canvas.scene.tokens.get(s.ships["alpha-0"].tokenIds[0]),x=token.x;await token.update({x:x+100},{});assert.equal(token.x,x);
  game.paused=true;await assert.rejects(()=>command(api,"start"),/Unpause/);game.paused=false;
  const player=game.users.get("player");assert.throws(()=>authorizeAlphaCommand(api.state(),{type:"move"},player),/GM/);
  assert.throws(()=>authorizeAlphaCommand(api.state(),{type:"fire",shipId:"alpha-1"},player),/do not own/);
  assert.doesNotThrow(()=>authorizeAlphaCommand(api.state(),{type:"fire",shipId:"alpha-0"},player));
});
test("recovery settings survive reopening and another setup cannot overwrite a pending move",async()=>{
  const w=alphaWorld(),api=w.initialize();await command(api,"start");while(!Object.values(api.state().ships).every(x=>api.state().locked[x.id]))await next(api);
  w.faults.blockMove=true;await assert.rejects(()=>command(api,"move"));const job=structuredClone(game.settings.get(M,"alphaMovementJournal"));
  await assert.rejects(()=>command(api,"start"),/saved movement/);assert.deepEqual(api.recovery(),job);
});
test("assigned Navigator and Captain permissions distinguish staging from locking",async()=>{
  const w=alphaWorld(),api=w.initialize();await command(api,"start");const s=api.state();
  game.actors.contents.push({id:"navpc",testUserPermission:u=>u.id==="navigator"},{id:"cappc",testUserPermission:u=>u.id==="captain"});
  s.ships["alpha-0"].stationActors={navigator:"navpc",captain:"cappc"};
  const nav={id:"navigator",active:true,isGM:false},cap={id:"captain",active:true,isGM:false};
  assert.doesNotThrow(()=>authorizeAlphaCommand(s,{type:"plan",shipId:"alpha-0"},nav));
  assert.throws(()=>authorizeAlphaCommand(s,{type:"plan",shipId:"alpha-0"},cap),/assigned navigator/);
  assert.doesNotThrow(()=>authorizeAlphaCommand(s,{type:"lock",shipId:"alpha-0"},cap));
  assert.throws(()=>authorizeAlphaCommand(s,{type:"lock",shipId:"alpha-0"},nav),/assigned captain/);
});
