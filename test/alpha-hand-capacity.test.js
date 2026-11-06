import test from 'node:test';
import assert from 'node:assert/strict';
import {ALPHA_HULLS,deriveAlphaProfile} from '../src/alpha/hulls.js';
import {createAlphaSession,dispatchAlphaCommand,activeAlphaShip} from '../src/alpha/combat.js';
import {alphaWorld} from './helpers/alpha-world.js';
const fixture=()=>createAlphaSession([{id:'a',name:'Crew',team:'crew',hullId:'brigantine',pose:{q:0,r:0,heading:0}},{id:'b',name:'Enemy',team:'enemy',hullId:'cutter',pose:{q:3,r:-6,heading:3}}],{id:'hand-five',seed:25});
const send=(s,type,extra={})=>dispatchAlphaCommand(s,{type,encounterId:s.id,revision:s.revision,...extra},{roll:async()=>10});
async function endRound(s){
 for(const ship of Object.values(s.ships)){s=await send(s,'plan',{shipId:ship.id,maneuverId:'hold'});s=await send(s,'lock',{shipId:ship.id});}
 s=await send(s,'move');while(s.phase==='cards')s=await send(s,'finish-card',{shipId:activeAlphaShip(s)});
 return send(s,'begin-damage');
}
test('all unmodified hulls open at five and cap at five; explicit capacity upgrade does not add opening cards or AP',()=>{
 for(const hullId of Object.keys(ALPHA_HULLS)){const p=deriveAlphaProfile({hullId});assert.equal(p.hand,5);assert.equal(p.opening,5);assert.equal(p.ap,4);}
 const p=deriveAlphaProfile({hullId:'brigantine',upgrades:['command-relay']});assert.equal(p.hand,6);assert.equal(p.opening,5);assert.equal(p.ap,4);
});
test('full hands still draw, retain overflow through play, then every ship must discard during Cleanup before refresh',async()=>{
 let s=await endRound(fixture());assert.equal(s.pendingDiscard,null);s=await send(s,'round');assert.equal(s.ships.a.hand.length,6);assert.equal(s.ships.b.hand.length,6);assert.equal(s.pendingDiscard,null);
 s=await endRound(s);assert.equal(s.phase,'cleanup');assert.equal(s.pendingDiscard.count,1);await assert.rejects(send(s,'round'),/Discard/);
 for(let n=0;n<2;n++){const id=s.pendingDiscard.shipId,card=s.ships[id].hand[0];s=await send(s,'discard',{shipId:id,instances:[card]});assert.equal(s.ships[id].hand.length,5);assert.ok(s.ships[id].discard.includes(card));}
 assert.equal(s.pendingDiscard,null);s=await send(s,'round');assert.equal(s.round,3);assert.equal(s.ships.a.hand.length,6);assert.equal(s.pendingDiscard,null);
});
test('reset recalculates old saved encounter capacity and keeps crew and learned library',async()=>{
 const w=alphaWorld();await import('../src/foundry/alpha-combat-api.js');const api=w.initialize();let s=await api.request({type:'start'});const id='alpha-0',library=s.ships[id].library;
 s.ships[id].profile.hand=7;w.values.set('alphaCombat',s);
 s=await api.request({type:'reset',encounterId:s.id,revision:s.revision});assert.equal(s.round,1);assert.equal(s.ships[id].profile.hand,5);assert.equal(s.ships[id].hand.length,5);assert.deepEqual(s.ships[id].library,library);
});
