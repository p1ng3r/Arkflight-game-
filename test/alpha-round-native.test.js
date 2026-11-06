import test from 'node:test';import assert from 'node:assert/strict';import {alphaWorld,installAlphaHooks} from './helpers/alpha-world.js';
installAlphaHooks();await import('../src/foundry/alpha-combat-api.js');
const send=(api,type,extra={})=>{const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...extra});};
test('new native flow retains prepaid AP through PC prompt, authenticated player roll and reset',async()=>{
 const w=alphaWorld(),api=w.initialize();let s=await send(api,'start',{roundFlow:2});assert.equal(s.phase,'opening');const id='alpha-0';game.actors.get(s.ships[id].actorId).ownership.player=3;
 game.actors.contents.push({id:'pc',name:'Ada',type:'character',skills:{crafting:{rank:2}},system:{abilities:{int:{mod:3}}},testUserPermission:u=>u.id==='player'||u.isGM});await send(api,'assign-station',{shipId:id,station:'engineer',actorId:'pc'});
 for(const shipId of Object.keys(api.state().ships))await send(api,'mulligan',{shipId,instances:[]});for(const shipId of Object.keys(api.state().ships)){await send(api,'plan',{shipId,maneuverId:'hold'});await send(api,'lock',{shipId});}await send(api,'move');s=api.state();const ship=s.ships[id],vent=Object.keys(ship.instances).find(i=>ship.instances[i]==='vent');if(!ship.hand.includes(vent)){const old=ship.hand.pop();ship.drawPile=ship.drawPile.filter(i=>i!==vent);ship.drawPile.push(old);ship.hand.push(vent);}ship.resources.strain.value=4;w.values.set('alphaCombat',s);
 await send(api,'queue-card',{shipId:id,instanceId:vent});for(const shipId of ['alpha-0','alpha-1'])await send(api,'lock-cards',{shipId});const rolls=w.counts.rolls;s=api.state();assert.ok(s.pendingCrewAction);await assert.rejects(send(api,'resolve-card',{shipId:id,instanceId:vent}),/Waiting for the assigned/);assert.equal(w.counts.rolls,rolls);assert.equal(s.ships[id].ap,3);
 const result=await new Promise(resolve=>{const state=api.state();Hooks.callAll('createChatMessage',{author:{id:'player'},flags:{'arkflight-game':{alphaCommand:{requestId:foundry.utils.randomID(),command:{type:'roll-crew',encounterId:state.id,revision:state.revision,shipId:id,requestId:state.pendingCrewAction.id,skill:'crafting'}}}},async update(changes){const result=changes['flags.arkflight-game.alphaResult'];if(result)resolve(result);}},{},'player');});assert.equal(result.ok,true,result.error);s=api.state();assert.equal(s.ships[id].ap,3);assert.equal(s.phase,'firing');assert.ok(s.ships[id].discard.includes(vent));s=await send(api,'reset');assert.equal(s.phase,'opening');assert.equal(s.ships[id].stationActors.engineer,'pc');
});
test('player snapshots hide opposing card plans, commitment logs and hand instances',async()=>{
 const w=alphaWorld(),api=w.initialize();await send(api,'start',{roundFlow:2});
 for(const shipId of Object.keys(api.state().ships))await send(api,'mulligan',{shipId,instances:[]});for(const shipId of Object.keys(api.state().ships)){await send(api,'plan',{shipId,maneuverId:'hold'});await send(api,'lock',{shipId});}await send(api,'move');
 const s=api.state(),enemy=s.ships['alpha-1'],instance=Object.keys(enemy.instances).find(i=>enemy.instances[i]==='vent');if(!enemy.hand.includes(instance)){const old=enemy.hand.pop();enemy.drawPile=enemy.drawPile.filter(i=>i!==instance);enemy.drawPile.push(old);enemy.hand.push(instance);}w.values.set('alphaCombat',s);await send(api,'queue-card',{shipId:enemy.id,instanceId:instance});game.actors.get(s.ships['alpha-0'].actorId).ownership.player=3;game.user=game.users.get('player');
 const view=api.state();assert.equal(view.cardPlans['alpha-1'],undefined);assert.deepEqual(view.ships['alpha-1'].instances,{});assert.equal(view.log.some(e=>e.detail?.kind==='plan'&&e.detail.shipId==='alpha-1'),false);assert.equal(view.roundEvents.some(e=>e.detail?.kind==='plan'&&e.detail.shipId==='alpha-1'),false);
});

test('player snapshots show draw counts, never ordered future draws, without affecting the GM state',async()=>{
 const w=alphaWorld(),api=w.initialize();await send(api,'start',{roundFlow:2});
 const authoritative=api.state(),own=authoritative.ships['alpha-0'],enemy=authoritative.ships['alpha-1'];
 assert.ok(own.drawPile.length>0);assert.ok(enemy.drawPile.length>0);
 game.actors.get(own.actorId).ownership.player=3;game.user=game.users.get('player');
 const view=api.state();
 assert.equal(view.ships[own.id].drawCount,own.drawPile.length);
 assert.deepEqual(view.ships[own.id].drawPile,[]);
 assert.deepEqual(view.ships[own.id].hand,own.hand);
 assert.deepEqual(view.ships[own.id].instances,own.instances);
 assert.equal(view.ships[enemy.id].drawCount,enemy.drawPile.length);
 assert.deepEqual(view.ships[enemy.id].drawPile,[]);
 assert.deepEqual(view.ships[enemy.id].hand,[]);
 assert.deepEqual(view.ships[enemy.id].instances,{});
 assert.deepEqual(api.state().ships[own.id].drawPile,[]); // repeated reads / reconnect-style projection
 game.user=game.users.get('gm');
 assert.deepEqual(api.state().ships[own.id].drawPile,own.drawPile);
 assert.deepEqual(api.state().ships[enemy.id].drawPile,enemy.drawPile);
});

test('private card offers and fresh-card windows are hidden from other crews and restricted to the assigned station owner',async()=>{
 const w=alphaWorld(),api=w.initialize();let s=await send(api,'start',{roundFlow:2});const a=s.ships['alpha-0'],b=s.ships['alpha-1'];game.actors.get(a.actorId).ownership.player=3;
 s.pendingCardChoice={shipId:b.id,station:'navigator',kind:'survey',options:['secret-offer']};s.cardFollowup=b.id;s.followupCards=['secret-fresh'];w.values.set('alphaCombat',s);game.user=game.users.get('player');assert.equal(api.state().pendingCardChoice,undefined);assert.equal(api.state().followupCards,undefined);
 const {authorizeAlphaCommand}=await import('../src/foundry/alpha-combat-api.js');assert.throws(()=>authorizeAlphaCommand(s,{type:'choose-card',shipId:b.id},game.user),/do not own/);
 a.stationActors.navigator=b.actorId;s.pendingCardChoice={shipId:a.id,station:'navigator',kind:'survey',options:['own-offer']};assert.throws(()=>authorizeAlphaCommand(s,{type:'choose-card',shipId:a.id},game.user),/assigned navigator/);a.stationActors.navigator=a.actorId;assert.doesNotThrow(()=>authorizeAlphaCommand(s,{type:'choose-card',shipId:a.id},game.user));
});
