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
  game.actors.get(s.ships["alpha-0"].actorId).ownership.player=3;
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
  Object.assign(game.actors.get(s.ships["alpha-0"].actorId).ownership,{navigator:3,captain:3});
  assert.doesNotThrow(()=>authorizeAlphaCommand(s,{type:"plan",shipId:"alpha-0"},nav));
  assert.throws(()=>authorizeAlphaCommand(s,{type:"plan",shipId:"alpha-0"},cap),/assigned navigator/);
  assert.doesNotThrow(()=>authorizeAlphaCommand(s,{type:"lock",shipId:"alpha-0"},cap));
  assert.throws(()=>authorizeAlphaCommand(s,{type:"lock",shipId:"alpha-0"},nav),/assigned captain/);
});

test("test ships require GM-granted ownership; owning a Navigator alone grants no vessel access",async()=>{
  const w=alphaWorld(),api=w.initialize();await command(api,"start");const s=api.state(),player=game.users.get("player");
  for(const ship of Object.values(s.ships))assert.equal(game.actors.get(ship.actorId).ownership.default,0);
  game.actors.contents.push({id:"nav-owned",testUserPermission:u=>u.id==="player"});
  s.ships["alpha-0"].stationActors.navigator="nav-owned";
  assert.throws(()=>authorizeAlphaCommand(s,{type:"plan",shipId:"alpha-0"},player),/do not own/);
  game.actors.get(s.ships["alpha-0"].actorId).ownership.player=3;
  assert.doesNotThrow(()=>authorizeAlphaCommand(s,{type:"plan",shipId:"alpha-0"},player));
  for(const type of ["plan","lock","fire"])assert.throws(()=>authorizeAlphaCommand(s,{type,shipId:"alpha-1"},player),/do not own/);
  for(const type of ["move","begin-damage","round","assign-station","restore-movement"])assert.throws(()=>authorizeAlphaCommand(s,{type,shipId:"alpha-0"},player),/GM/);
});

test("player HUD shows only owned ships and the assigned Navigator's legal hull menu; GM retains all ships",async()=>{
  class Base{constructor(options){this.options=options;}async _prepareContext(){return{};}}
  globalThis.innerWidth=1366;globalThis.innerHeight=768;
  const w=alphaWorld({applicationAPI:{ApplicationV2:Base,HandlebarsApplicationMixin:x=>x}});
  const {AlphaCombatWindow}=await import("../src/ui/alpha-combat-ui.js");
  const api=w.initialize();await command(api,"start",{hullId:"dread-caravel",count:4});
  const original=api.state(),ship=original.ships["alpha-0"],actor=game.actors.get(ship.actorId);
  actor.ownership.player=3;
  game.actors.contents.push({id:"navigator-pc",name:"Navigator",type:"character",testUserPermission:u=>u.id==="player"},{id:"other-pc",name:"Other Navigator",type:"character",testUserPermission:()=>false});
  await command(api,"assign-station",{shipId:ship.id,station:"navigator",actorId:"navigator-pc"});
  game.user=game.users.get("player");
  const hud=new AlphaCombatWindow();hud.shipId="alpha-1";
  let context=await hud._prepareContext({});assert.deepEqual(context.ships.map(s=>s.id),[ship.id]);assert.equal(hud.shipId,ship.id);assert.equal(context.canPlan,true);assert.ok(context.routes.length>0);assert.ok(context.routes.every(m=>!m.id.includes("hard")&&!m.id.includes("pivot")));assert.equal(context.canMove,false);
  assert.equal(context.s.plans["alpha-1"],undefined);assert.equal(context.targets.length,2,"opponents remain targetable without maneuver access");
  game.user=game.users.get("gm");await command(api,"assign-station",{shipId:ship.id,station:"navigator",actorId:"other-pc"});
  game.user=game.users.get("player");context=await hud._prepareContext({});assert.equal(context.canPlan,false);assert.deepEqual(context.routes,[]);assert.equal(context.route,undefined);assert.equal(context.canLock,true);
  delete actor.ownership.player;context=await hud._prepareContext({});assert.deepEqual(context.ships,[]);assert.equal(context.ship,undefined);assert.deepEqual(context.routes,[]);
  game.user=game.users.get("gm");context=await hud._prepareContext({});assert.equal(context.ships.length,4);assert.ok(context.routes.length>0);assert.equal(context.canPlan,true);
});

test("the GM relay rejects forged enemy plans and hull-incompatible routes without saving changes",async()=>{
  const w=alphaWorld(),api=w.initialize();await command(api,"start");const s=api.state();game.actors.get(s.ships["alpha-0"].actorId).ownership.player=3;
  const relay=input=>new Promise(resolve=>Hooks.callAll("createChatMessage",{author:{id:"player"},flags:{[M]:{alphaCommand:{requestId:"permission-probe",command:{encounterId:api.state().id,revision:api.state().revision,...input}}}},update:async changes=>resolve(changes[`flags.${M}.alphaResult`])},{},"player"));
  let result=await relay({type:"plan",shipId:"alpha-1",maneuverId:"hold"});assert.equal(result.ok,false);assert.match(result.error,/do not own/);assert.deepEqual(api.state(),s);
  result=await relay({type:"plan",shipId:"alpha-0",maneuverId:"skiff-quick-port"});assert.equal(result.ok,false);assert.match(result.error,/legal affordable hull maneuver/);assert.deepEqual(api.state(),s);
  result=await relay({type:"plan",shipId:"alpha-0",maneuverId:"straight-1"});assert.equal(result.ok,true);assert.equal(api.state().plans["alpha-0"],"straight-1");
  game.actors.get(s.ships["alpha-0"].actorId).ownership.player=0;
  const before=api.state();result=await relay({type:"plan",shipId:"alpha-0",maneuverId:"hold"});assert.equal(result.ok,false);assert.deepEqual(api.state(),before);
});
