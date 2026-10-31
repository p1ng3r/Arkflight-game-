import test from "node:test";
import assert from "node:assert/strict";
import {alphaWorld,installAlphaHooks} from "./helpers/alpha-world.js";
import {alphaSuggestedStep} from "../src/alpha/combat.js";
import {actionReceiptContent} from "../src/foundry/alpha-crew-chat.js";
installAlphaHooks();await import("../src/foundry/alpha-combat-api.js");
const M="arkflight-game";
const send=(api,type,data={})=>{const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...data});};
const relay=(api,command)=>new Promise(resolve=>{const s=api.state();Hooks.callAll("createChatMessage",{author:{id:"player"},flags:{[M]:{alphaCommand:{requestId:foundry.utils.randomID(),command:{encounterId:s.id,revision:s.revision,...command}}}},async update(changes){resolve(changes[`flags.${M}.alphaResult`]);}},{},"player");});
function chat(){const messages=[];globalThis.ChatMessage={async create(data){const message={...data,id:`message-${messages.length}`,async update(changes){Object.assign(this,changes);}};messages.push(message);return message;}};return messages;}
async function setup(){
  const w=alphaWorld(),api=w.initialize();await send(api,"start");
  game.actors.contents.push({id:"ada",name:"Ada <Engineer>",type:"character",skills:{crafting:{rank:2},arcana:{rank:1}},system:{abilities:{int:{mod:3}}},testUserPermission:u=>u.id==="player"});
  await send(api,"assign-station",{shipId:"alpha-0",station:"engineer",actorId:"ada"});
  game.actors.get(api.state().ships['alpha-0'].actorId).ownership.player=3;
  while(api.state().phase==='planning'){const step=alphaSuggestedStep(api.state());await send(api,step.command.type,step.command);}
  const s=api.state(),ship=s.ships['alpha-0'],instance=Object.keys(ship.instances).find(id=>ship.instances[id]==='vent');
  if(!ship.hand.includes(instance)){ship.drawPile=ship.drawPile.filter(id=>id!==instance);ship.drawPile.push(ship.hand.pop());ship.hand.push(instance);}ship.resources.strain.value=5;w.values.set('alphaCombat',s);
  return{w,api,ship,instance};
}
test("GM guide waits for assigned PC; player chooses skill, spends once, and gets one named chat receipt",async()=>{
  const {w,api,ship,instance}=await setup(),messages=chat(),beforeRolls=w.counts.rolls;
  const queued=await send(api,'play',{shipId:ship.id,instanceId:instance,skill:'crafting'}),request=queued.pendingCrewAction;
  assert.ok(request);assert.equal(request.station,'engineer');assert.equal(w.counts.rolls,beforeRolls);assert.equal(queued.ships[ship.id].ap,4);assert.ok(queued.ships[ship.id].hand.includes(instance));
  assert.equal(messages.length,1);assert.match(messages[0].content,/Vent Strain/);assert.match(messages[0].content,/Ada &lt;Engineer&gt;/);
  await assert.rejects(send(api,'finish-card',{shipId:ship.id}),/Waiting for the assigned station/);
  const invalid=await relay(api,{type:'roll-crew',shipId:ship.id,requestId:request.id,skill:'athletics'});assert.equal(invalid.ok,false);assert.equal(w.counts.rolls,beforeRolls);
  const result=await relay(api,{type:'roll-crew',shipId:ship.id,requestId:request.id,skill:'arcana'});assert.equal(result.ok,true,result.error);
  const s=api.state(),receipt=s.log.findLast(e=>e.detail?.instanceId===instance&&e.detail.kind==='check').detail;
  assert.equal(s.pendingCrewAction,undefined);assert.equal(s.ships[ship.id].ap,3);assert.equal(w.counts.rolls-beforeRolls,2);assert.equal(receipt.skill,'arcana');assert.equal(receipt.modifier,10);
  const cards=messages.filter(m=>m.flags?.[M]?.alphaRollReceipt);assert.equal(cards.length,1);assert.match(cards[0].content,/Vent Strain/);assert.match(cards[0].content,/Rum Runner/);assert.match(cards[0].content,/Engineer/);assert.match(cards[0].content,/arcana/);assert.match(cards[0].content,/vs DC/);assert.equal(cards[0].rolls,undefined);
  const repeat=await relay(api,{type:'roll-crew',shipId:ship.id,requestId:request.id,skill:'arcana'});assert.equal(repeat.ok,false);assert.equal(w.counts.rolls-beforeRolls,2);delete globalThis.ChatMessage;
});
test("Wrong crew cannot resolve; cancel spends nothing; two clicks cannot resolve twice",async()=>{
  const {w,api,ship,instance}=await setup();chat();let s=await send(api,'play',{shipId:ship.id,instanceId:instance}),request=s.pendingCrewAction;
  game.actors.get('ada').testUserPermission=()=>false;
  let result=await relay(api,{type:'roll-crew',shipId:ship.id,requestId:request.id,skill:'crafting'});assert.equal(result.ok,false);assert.match(result.error,/assigned engineer/);
  await send(api,'cancel-crew',{shipId:ship.id,requestId:request.id});assert.equal(api.state().ships[ship.id].ap,4);assert.ok(api.state().ships[ship.id].hand.includes(instance));
  game.actors.get('ada').testUserPermission=u=>u.id==='player';s=await send(api,'play',{shipId:ship.id,instanceId:instance});request=s.pendingCrewAction;
  const before=w.counts.rolls;const input={type:'roll-crew',shipId:ship.id,requestId:request.id,skill:'crafting'};
  const results=await Promise.all([relay(api,input),relay(api,input)]);assert.equal(results.filter(r=>r.ok).length,1);assert.equal(w.counts.rolls-before,2);assert.equal(api.state().ships[ship.id].ap,3);delete globalThis.ChatMessage;
});
test("NPC checks remain GM-operated and produce public result cards",async()=>{
  const w=alphaWorld(),api=w.initialize();await send(api,'start');while(api.state().phase==='planning'){const step=alphaSuggestedStep(api.state());await send(api,step.command.type,step.command);}
  const s=api.state(),ship=s.ships[s.turnOrder[s.turnIndex]],instance=Object.keys(ship.instances).find(id=>ship.instances[id]==='acquire');if(!ship.hand.includes(instance)){ship.drawPile=ship.drawPile.filter(id=>id!==instance);ship.drawPile.push(ship.hand.pop());ship.hand.push(instance);}w.values.set('alphaCombat',s);const messages=chat();
  const next=await send(api,'play',{shipId:ship.id,instanceId:instance,skill:'crafting'});assert.equal(next.pendingCrewAction,undefined);assert.equal(messages.filter(m=>m.flags?.[M]?.alphaRollReceipt).length,1);assert.match(messages[0].content,/NPC ship crew/);delete globalThis.ChatMessage;
});
test("Chat failure cannot reroll or undo the saved result",async()=>{
  const {w,api,ship,instance}=await setup();chat();const queued=await send(api,'play',{shipId:ship.id,instanceId:instance});const before=w.counts.rolls;
  globalThis.ChatMessage.create=async()=>{throw Error('Chat unavailable');};const warn=console.warn;console.warn=()=>{};
  try{await send(api,'roll-crew',{shipId:ship.id,requestId:queued.pendingCrewAction.id,skill:'crafting'});}finally{console.warn=warn;delete globalThis.ChatMessage;}
  assert.equal(api.state().ships[ship.id].ap,3);assert.equal(w.counts.rolls-before,2);assert.ok(w.notifications.some(t=>t.includes('chat receipt')));
});
test("Assigned Battle Watch chooses its attack skill without paying the committed shot AP twice",async()=>{
  const w=alphaWorld(),api=w.initialize();await send(api,'start');
  game.actors.contents.push({id:'gunner',name:'Gunner',type:'character',skills:{crafting:{rank:0},athletics:{rank:3}},system:{abilities:{int:{mod:1},str:{mod:4}}},testUserPermission:u=>u.id==='player'});
  await send(api,'assign-station',{shipId:'alpha-0',station:'battlewatch',actorId:'gunner'});game.actors.get(api.state().ships['alpha-0'].actorId).ownership.player=3;const messages=chat();
  let attackRequest;
  for(let i=0;i<150;i++){
    const s=api.state(),request=s.pendingCrewAction;
    if(request){if(request.kind==='attack'){attackRequest=request;break;}const done=await relay(api,{type:'roll-crew',shipId:request.shipId,requestId:request.id,skill:'athletics'});assert.equal(done.ok,true,done.error);}
    else {const step=alphaSuggestedStep(s);if(!step)break;await send(api,step.command.type,step.command);}
  }
  assert.ok(attackRequest,'An assigned player must receive the attack request');
  const ap=api.state().ships['alpha-0'].ap,before=w.counts.rolls;
  const result=await relay(api,{type:'roll-crew',shipId:'alpha-0',requestId:attackRequest.id,skill:'athletics'});assert.equal(result.ok,true,result.error);
  const s=api.state(),receipt=s.log.findLast(e=>e.detail?.kind==='check'&&e.detail.shipId==='alpha-0'&&e.detail.batteryId).detail;
  assert.equal(receipt.skill,'athletics');assert.deepEqual(receipt.components.slice(0,3).map(c=>c.value),[5,6,4]);assert.equal(s.ships['alpha-0'].ap,ap);assert.ok(w.counts.rolls>before);
  assert.ok(messages.some(m=>m.flags?.[M]?.alphaRollReceipt&&m.content.includes('attack &amp; damage')));delete globalThis.ChatMessage;
});
