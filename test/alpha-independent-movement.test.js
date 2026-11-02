import test from 'node:test';import assert from 'node:assert/strict';
import {alphaWorld,installAlphaHooks} from './helpers/alpha-world.js';
import {legalHullManeuvers,previewManeuver} from '../src/alpha/maneuvers.js';
installAlphaHooks();await import('../src/foundry/alpha-combat-api.js');
const send=(api,type,data={})=>{const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...data});};
test('different per-ship templates move real token documents along different routes in two successive rounds',async()=>{
 const w=alphaWorld(),api=w.initialize();game.journal={contents:[]};globalThis.JournalEntry={async create(data){const j={...data,id:'movement-journal',pages:{contents:[]},async createEmbeddedDocuments(_,rows){const page={...rows[0],id:'p'+this.pages.contents.length};this.pages.contents.push(page);return[page];}};game.journal.contents.push(j);return j;}};let s=await send(api,'guided-start',{manual:true});const ids=Object.keys(s.ships);for(const shipId of ids)await send(api,'mulligan',{shipId,instances:[]});
 const routes=[['straight-1','port-s-3'],['hold','straight-2']];
 for(let round=0;round<2;round++){
  const before=api.state(),expected={};
  for(const [i,shipId]of ids.entries()){const ship=before.ships[shipId],route=legalHullManeuvers(ship).find(r=>r.id===routes[round][i]);expected[shipId]=previewManeuver(ship.pose,route,before.directions).end;await send(api,'plan',{shipId,maneuverId:route.id});await send(api,'lock',{shipId});}
  s=await send(api,'move');assert.deepEqual(ids.map(id=>s.plans[id]),routes[round]);
  for(const shipId of ids)assert.deepEqual(s.ships[shipId].pose,expected[shipId]);const d=api.diagnostics();for(const ship of d.ships){assert.equal(ship.expected.q,ship.actual.q);assert.equal(ship.expected.r,ship.actual.r);assert.equal(ship.expected.rotation,ship.actual.rotation);}
  const delta=ids.map(id=>[s.ships[id].pose.q-before.ships[id].pose.q,s.ships[id].pose.r-before.ships[id].pose.r]);assert.notDeepEqual(delta[0],delta[1]);
  if(round===0){for(const shipId of ids)await send(api,'lock-cards',{shipId});while(api.state().phase==='firing')await send(api,'finish-firing',{shipId:api.state().turnOrder[api.state().firingIndex]});await send(api,'round');for(const shipId of ids)await send(api,'draw-round',{shipId});assert.deepEqual(api.state().plans,{});await assert.rejects(send(api,'lock',{shipId:ids[0]}),/Choose a maneuver/);}
 }
 assert.ok(w.counts.moves>0);delete globalThis.JournalEntry;
});
