import test from 'node:test';import assert from 'node:assert/strict';
import {ALPHA_STARTER_DECK,ALPHA_CARDS} from '../src/alpha/cards.js';
import {ALPHA_HULLS,deriveAlphaProfile} from '../src/alpha/hulls.js';
import {hullManeuvers,previewManeuver} from '../src/alpha/maneuvers.js';
import {createAlphaSession,dispatchAlphaCommand} from '../src/alpha/combat.js';
const fleet=()=>createAlphaSession([{id:'a',team:'crew',name:'A',hullId:'brigantine',pose:{q:0,r:0,heading:0}},{id:'b',team:'enemy',name:'B',hullId:'brigantine',pose:{q:2,r:0,heading:3}}],{id:'deck-v2',seed:41,roundFlow:2});
const send=(s,type,shipId,extra={})=>dispatchAlphaCommand(s,{encounterId:s.id,revision:s.revision,type,shipId,...extra},{roll:async f=>f==='1d20'?10:6});
function place(s,id,where='hand'){const x=s.ships.a;let instance=Object.keys(x.instances).find(i=>x.instances[i]===id);if(!instance){instance=id+'-fixture';x.instances[instance]=id;}for(const zone of ['hand','drawPile','discard','burned'])x[zone]=x[zone].filter(i=>i!==instance);x[where].push(instance);return instance;}
function plan(s,id){const instanceId=place(s,id);s.phase='resolving';s.turnOrder=['a','b'];s.turnIndex=0;s.cardPlans={a:[{instanceId,cost:1,resolved:false}],b:[]};s.cardLocks={a:true,b:true};s.ships.a.ap=3;return instanceId;}
function zones(s){const x=s.ships.a;return [...x.hand,...x.drawPile,...x.discard,...x.burned,...x.prepared.map(p=>p.instance),...(s.pendingCardChoice?.kind==='survey'?s.pendingCardChoice.options:[])].sort();}
test('fresh starter is 20 cards with five-card hand; each hull exposes ten curated legal routes plus earned unlocks',()=>{
 assert.equal(ALPHA_STARTER_DECK.length,20);const s=fleet();assert.equal(s.ships.a.hand.length,5);assert.equal(s.ships.a.drawPile.length,15);
 for(const hullId of Object.keys(ALPHA_HULLS)){const p=deriveAlphaProfile({hullId});p.maneuverSetVersion=2;const routes=hullManeuvers(p);assert.equal(routes.length,10,hullId);assert.equal(new Set(routes.map(r=>r.id)).size,10);for(const m of routes){const preview=previewManeuver({q:0,r:0,heading:0},m);assert.ok(preview.distance<=p.speed);if(p.handling==='capital')assert.ok(preview.turns<=1);}}
 const p=deriveAlphaProfile({hullId:'brigantine',upgrades:['responsive-helm']});p.maneuverSetVersion=2;assert.equal(hullManeuvers(p).length,12);
});
test('draw-two conserves instances, spends AP once and allows only newly drawn Standards into a follow-up plan',async()=>{
 let s=fleet(),id=plan(s,'dispatch'),before=zones(s);s=await send(s,'resolve-card','a',{instanceId:id,skill:'diplomacy'});assert.deepEqual(zones(s),before);assert.equal(s.ships.a.ap,3);assert.equal(s.cardFollowup,'a');assert.ok(s.ships.a.hand.length>5);
 const fresh=s.followupCards[0];assert.ok(fresh);s=await send(s,'queue-card','a',{instanceId:fresh,batteryId:'starboard'});assert.equal(s.ships.a.ap,3-ALPHA_CARDS[s.ships.a.instances[fresh]].ap);
 const kept=s.ships.a.hand.find(i=>!s.followupCards.includes(i));if(kept)await assert.rejects(send(s,'queue-card','a',{instanceId:kept}),/Only cards drawn/);
 s=await send(s,'lock-cards','a');assert.equal(s.cardFollowup,undefined);assert.equal(s.phase,'resolving');
});
test('look-and-choose holds cards in escrow, blocks progression, rejects forged options, and returns unchosen cards to bottom',async()=>{
 let s=fleet(),id=plan(s,'survey'),before=zones(s);s=await send(s,'resolve-card','a',{instanceId:id,skill:'survival'});const c=s.pendingCardChoice;assert.equal(c.options.length,3);assert.deepEqual(zones(s),before);await assert.rejects(send(s,'finish-firing','a'),/pending selection/);await assert.rejects(send(s,'choose-card','a',{instanceId:'forged'}),/offered/);await assert.rejects(send(s,'choose-card','b',{instanceId:c.options[0]}),/offered/);
 s=await send(s,'choose-card','a',{instanceId:c.options[0]});assert.deepEqual(zones(s),before);assert.ok(s.ships.a.hand.includes(c.options[0]));assert.deepEqual(s.ships.a.drawPile.slice(0,2),c.options.slice(1));
});
test('recovery returns a selected discarded instance without duplicating it or making Burn cards recoverable',async()=>{
 let s=fleet(),id=plan(s,'recover'),target=place(s,'patch','discard'),burn=place(s,'all-hands','burned');const before=zones(s);s=await send(s,'resolve-card','a',{instanceId:id,skill:'diplomacy'});assert.ok(!s.pendingCardChoice.options.includes(burn));s=await send(s,'choose-card','a',{instanceId:target});assert.ok(s.ships.a.hand.includes(target));assert.deepEqual(zones(s),before);
});
test('Engineer charge is applied once and Battle Watch can link a unique extra die without AP or card duplication',async()=>{
 let s=fleet(),id=plan(s,'tune');s=await send(s,'resolve-card','a',{instanceId:id,skill:'crafting'});assert.equal(s.ships.a.resources.strain.value,1);assert.ok(s.ships.a.effects.some(e=>e.kind==='capacitor'&&e.amount===6));
 delete s.cardFollowup;id=plan(s,'exploit');s=await send(s,'resolve-card','a',{instanceId:id,skill:'crafting'});assert.ok(s.ships.a.effects.some(e=>e.kind==='capacitor-link'&&e.amount===6));assert.ok(s.ships.a.effects.some(e=>e.kind==='accuracy'));
 delete s.cardFollowup;s.phase='firing';s.turnOrder=['a','b'];s.firingIndex=0;s.ships.a.ap=4;s=await send(s,'fire','a',{batteryId:'starboard'});s=await send(s,'target','a',{attackId:s.attacks[0].id,targetId:'b'});s=await send(s,'finish-firing','a');s=await send(s,'pass-response','b');s=await send(s,'attack','a');assert.ok(s.attacks[0].hit.degree>=1);s=await send(s,'damage','a');assert.ok(!s.ships.a.effects.some(e=>['capacitor','capacitor-link'].includes(e.kind)));const receipt=s.log.findLast(e=>e.detail?.kind==='damage').detail;assert.ok(receipt.formula.includes('+1d6+1d6'));

});
test('critical recovery chooses the discarded card before an empty deck can reshuffle it',async()=>{
 let s=fleet(),id=plan(s,'recover'),target=place(s,'patch','discard');s.ships.a.hand.push(...s.ships.a.drawPile);s.ships.a.drawPile=[];const before=zones(s);
 s=await dispatchAlphaCommand(s,{type:'resolve-card',shipId:'a',instanceId:id,skill:'diplomacy',encounterId:s.id,revision:s.revision},{roll:async()=>20});assert.ok(s.pendingCardChoice.options.includes(target));assert.ok(s.ships.a.discard.includes(target));const handCount=s.ships.a.hand.length;s=await send(s,'choose-card','a',{instanceId:target});assert.equal(s.ships.a.hand.length,handCount+2);assert.ok(s.ships.a.hand.includes(target));assert.deepEqual(zones(s),before);assert.equal(s.pendingCardChoice,undefined);
});
