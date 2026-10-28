import test from "node:test";
import assert from "node:assert/strict";
import { alphaWorld, installAlphaHooks } from "./helpers/alpha-world.js";
import { alphaSuggestedStep } from "../src/alpha/combat.js";
import { ventCardModel } from "../src/ui/alpha-master-card.js";
import { showAlphaCardRolls } from "../src/foundry/alpha-card-dice.js";
installAlphaHooks();
const {authorizeAlphaCommand}=await import("../src/foundry/alpha-combat-api.js");
class Base{constructor(options){this.options=options;}async _prepareContext(){return{};}}
const {AlphaCombatWindow}=await import("../src/ui/alpha-combat-ui.js").catch(async()=>{
  globalThis.foundry={applications:{api:{ApplicationV2:Base,HandlebarsApplicationMixin:x=>x}}};return import("../src/ui/alpha-combat-ui.js?master");
});
const command=(api,type,extra={})=>{const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...extra});};
test("Vent master uses actual card data; preview never borrows a live receipt",()=>{
  const detail={kind:"check",shipId:"ship",instanceId:"vent-1",die:12,modifier:11,total:23,dc:20,degree:1,skill:"crafting",components:[{label:"Ship level",value:5},{label:"Training",value:6}]};
  const s={log:[{detail}]};const model=ventCardModel({s,ship:{id:"ship"},instanceId:"vent-1"});
  assert.equal(model.ap,1);assert.equal(model.receipt.total,23);assert.equal(model.receipt.components[1].display,"+6");
  assert.equal(ventCardModel({s,ship:{id:"ship"},instanceId:"vent-2"}).receipt,undefined);
  assert.equal(ventCardModel({s,ship:{id:"ship"},instanceId:"vent-1",preview:true}).receipt,false);
});
test("Owner-gated master rolls once, spends once, retains exact bonus receipt and animates evaluated dice",async()=>{
  const w=alphaWorld({applicationAPI:{ApplicationV2:Base,HandlebarsApplicationMixin:x=>x}}),api=w.initialize();
  globalThis.innerWidth=1366;globalThis.innerHeight=850;
  let s=await command(api,"start"),ship=s.ships["alpha-0"];
  game.actors.get(ship.actorId).ownership.player=3;
  game.actors.contents.push({id:"engineer",type:"character",name:"Engineer",skills:{crafting:{rank:2,attribute:"int"}},system:{abilities:{int:{mod:3}}},testUserPermission:u=>u.id==="player"});
  await command(api,"assign-station",{shipId:ship.id,station:"engineer",actorId:"engineer"});
  while(api.state().phase==="planning"){const step=alphaSuggestedStep(api.state());await command(api,step.command.type,step.command);}
  s=api.state();ship=s.ships[ship.id];const instance=Object.keys(ship.instances).find(i=>ship.instances[i]==="vent");
  if(!ship.hand.includes(instance)){const swap=ship.hand.pop();ship.drawPile=ship.drawPile.filter(i=>i!==instance);ship.drawPile.push(swap);ship.hand.push(instance);}
  ship.resources.strain.value=5;w.values.set("alphaCombat",s);
  const seen=[];game.dice3d={async animateRoll(roll,data,options){seen.push({roll,data,options});}};
  game.user=game.users.get("player");
  const hud=new AlphaCombatWindow();hud.shipId=ship.id;hud.tab="hand";hud.inspectId=instance;
  assert.equal((await hud._prepareContext({})).playable,true);
  const beforeRolls=w.counts.rolls,priorAP=ship.ap;
  authorizeAlphaCommand(api.state(),{type:"play",shipId:ship.id,instanceId:instance},game.user);
  game.user=game.users.get("gm");
  const relayResult=await new Promise(resolve=>Hooks.callAll("createChatMessage",{author:{id:"player"},flags:{"arkflight-game":{alphaCommand:{requestId:"master-test",command:{type:"play",encounterId:s.id,revision:s.revision,shipId:ship.id,instanceId:instance,skill:"crafting"}}}},update:async changes=>resolve(changes["flags.arkflight-game.alphaResult"])},{},"player"));
  assert.equal(relayResult.ok,true,relayResult.error);const next=api.state();
  const receipt=next.log.findLast(e=>e.detail?.instanceId===instance&&e.detail.kind==="check").detail;
  assert.equal(w.counts.rolls-beforeRolls,2);assert.equal(next.ships[ship.id].ap,priorAP-1);
  assert.equal(receipt.components.reduce((n,c)=>n+c.value,0),receipt.modifier);
  assert.deepEqual(receipt.components.slice(0,3).map(c=>c.value),[5,4,3]);
  assert.equal(seen.length,2);assert.equal(seen[0].roll.total,receipt.die);assert.equal(seen[0].data.author,"player");assert.equal(seen[0].options.messageMode,"public");
  hud.masterReceiptId=instance;const context=await hud._prepareContext({});assert.equal(context.masterCard,true);assert.equal(context.playable,false);assert.equal(context.ventMaster.receipt.total,receipt.total);
  await assert.rejects(command(api,"play",{shipId:ship.id,instanceId:instance,skill:"crafting"}),/hand/);
  assert.equal(w.counts.rolls-beforeRolls,2);
  // A ship owner assigned elsewhere cannot bypass the station requirement.
  game.user=game.users.get("player");game.actors.get("engineer").testUserPermission=()=>false;
  assert.throws(()=>authorizeAlphaCommand(api.state(),{type:"play",shipId:ship.id,instanceId:instance},game.user),/engineer/);
});
test("Optional 3D display falls back without changing evaluated totals or throwing",async()=>{
  alphaWorld();const roll={total:17,formula:"1d20"};let calls=0;
  game.dice3d={async showForRoll(r,user,sync){assert.equal(r,roll);assert.equal(sync,true);calls++;}};
  await showAlphaCardRolls([roll],{user:game.user});assert.equal(calls,1);
  const warn=console.warn;console.warn=()=>{};
  try{game.dice3d={animateRoll:async()=>{throw Error("Renderer unavailable");}};await showAlphaCardRolls([roll],{user:game.user});}finally{console.warn=warn;}
  assert.equal(roll.total,17);delete game.dice3d;await showAlphaCardRolls([roll]);
});
