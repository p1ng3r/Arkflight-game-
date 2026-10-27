import test from "node:test";
import assert from "node:assert/strict";
import { alphaWorld, installAlphaHooks } from "./helpers/alpha-world.js";
installAlphaHooks();
const { authorizeAlphaCommand }=await import("../src/foundry/alpha-combat-api.js");
const { alphaSuggestedStep }=await import("../src/alpha/combat.js");
class Base{constructor(options){this.options=options;}async _prepareContext(){return{};}}
const command=(api,type,extra={})=>{const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...extra});};
test("Battle Watch can commit a weapon while a different Captain controls finishing the Card phase",async()=>{
  const w=alphaWorld({applicationAPI:{ApplicationV2:Base,HandlebarsApplicationMixin:x=>x}});
  globalThis.innerWidth=1366;globalThis.innerHeight=850;
  const {AlphaCombatWindow}=await import("../src/ui/alpha-combat-ui.js");
  const api=w.initialize();let s=await command(api,"start");const party=s.ships["alpha-0"];
  game.actors.get(party.actorId).ownership.player=3;
  game.actors.contents.push({id:"watch",type:"character",name:"Gunner",testUserPermission:u=>u.id==="player"},{id:"captain",type:"character",name:"Captain",testUserPermission:()=>false});
  await command(api,"assign-station",{shipId:party.id,station:"battlewatch",actorId:"watch"});await command(api,"assign-station",{shipId:party.id,station:"captain",actorId:"captain"});
  while(api.state().phase==="planning"){const step=alphaSuggestedStep(api.state());await command(api,step.command.type,step.command);}
  game.user=game.users.get("player");const hud=new AlphaCombatWindow();hud.shipId=party.id;hud.tab="hand";const context=await hud._prepareContext({});
  assert.equal(context.canFire,true);assert.equal(context.canFinish,false);assert.ok(context.batteries.every(b=>b.canCommit));
  assert.doesNotThrow(()=>authorizeAlphaCommand(api.state(),{type:"fire",shipId:party.id},game.user));assert.throws(()=>authorizeAlphaCommand(api.state(),{type:"finish-card",shipId:party.id},game.user),/captain/);
});
test("motion preferences and presentation effects never change dice, AP, revision or card zones",async()=>{
  const w=alphaWorld(),api=w.initialize();const {alphaPreferences,AlphaCombatEffects}=await import("../src/ui/alpha-combat-effects.js");
  const s=await command(api,"start"),snapshot=structuredClone(s);let animations=0;
  const priorDocument=globalThis.document,priorMatch=globalThis.matchMedia;
  globalThis.document={hidden:false};globalThis.matchMedia=()=>({matches:false});
  try{
    const node={animate:()=>{animations++;return{finished:Promise.resolve(),cancel(){}};}},root={querySelector:()=>node,querySelectorAll:()=>[]},fx=new AlphaCombatEffects();
    fx.update(root,s,"alpha-0");assert.equal(animations,0);
    const next=structuredClone(s);next.revision++;next.ships["alpha-0"].resources.hull.value--;fx.update(root,next,"alpha-0");assert.equal(animations,1);
    await game.settings.set("arkflight-game","alphaMotion","off");const off=structuredClone(next);off.revision++;off.ships["alpha-0"].resources.hull.value--;fx.update(root,off,"alpha-0");assert.equal(animations,1);
    await game.settings.set("arkflight-game","alphaMotion","full");globalThis.matchMedia=()=>({matches:true});assert.equal(alphaPreferences().mode,"off");
    fx.clear();assert.deepEqual(api.state(),snapshot);assert.equal(w.counts.rolls,0);assert.equal(alphaPreferences().sound,false);
  }finally{globalThis.document=priorDocument;globalThis.matchMedia=priorMatch;}
});
