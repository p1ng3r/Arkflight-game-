import test from 'node:test';import assert from 'node:assert/strict';
import {alphaWorld,installAlphaHooks} from './helpers/alpha-world.js';
import {nextGuidedStep} from '../src/alpha/guided-test.js';
installAlphaHooks();await import('../src/foundry/alpha-combat-api.js');
const send=(api,type,data={})=>{const s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...data});};
function journals(){game.journal={contents:[]};globalThis.JournalEntry={async create(data){const j={...data,id:'j1',pages:{contents:[]},async createEmbeddedDocuments(_,rows){const page={...rows[0],id:`p${this.pages.contents.length}`};this.pages.contents.push(page);return[page];}};game.journal.contents.push(j);return j;}};}
test('two level-5 ships with ten real NPC station fixtures complete exactly three guided rounds',async()=>{
 const w=alphaWorld(),api=w.initialize();journals();let s=await send(api,'guided-start');assert.equal(s.roundFlow,2);assert.equal(s.phase,'opening');assert.equal(Object.keys(s.ships).length,2);
 const crew=game.actors.contents.filter(a=>a.flags?.['arkflight-game']?.alphaGuidedCrew);assert.equal(crew.length,10);assert.ok(crew.every(a=>a.type==='npc'&&a.system.details.level.value===5));
 for(const ship of Object.values(s.ships)){assert.equal(ship.profile.level,5);assert.equal(Object.keys(ship.stationActors).length,5);assert.equal(ship.hand.length,5);assert.ok(ship.batteries.every(b=>b.formula==='2d6+4'));for(const station of Object.keys(ship.stationActors)){const c=await api.crewCheck(ship.id,station,station==='captain'?'diplomacy':station==='engineer'?'crafting':station==='navigator'?'survival':station==='veilwarden'?'arcana':'crafting');assert.equal(c.modifier,13);}}
 await assert.rejects(send(api,'round'),/Use Next Step/);const phases=new Set(),stations=new Set();
 for(let steps=0;steps<180&&s.guidedTest.status==='running';steps++){assert.ok(nextGuidedStep(s));phases.add(s.phase);s=await send(api,'guided-next');const d=api.diagnostics();assert.equal(d.canvasError,undefined);assert.ok(d.ships.every(x=>x.expected.q===x.actual.q&&x.expected.r===x.actual.r));for(const e of s.log)if(e.detail?.kind==='check'&&e.detail.skill)stations.add(e.detail.station);}
 assert.equal(s.guidedTest.status,'complete');assert.equal(s.round,3);assert.equal(s.complete,true);assert.ok(['opening','planning','card-planning','resolving','firing','response','damage','cleanup','draw'].every(p=>phases.has(p)));assert.equal(stations.size,5);assert.equal(game.journal.contents[0].pages.contents.length,3);assert.ok(w.counts.rolls>20);
 await assert.rejects(send(api,'guided-next'),/changed/);delete globalThis.JournalEntry;
});
test('guided fixtures reuse only marked test actors; stale Next and Stop preserve valid state',async()=>{
 const w=alphaWorld(),api=w.initialize();journals();const campaign=await Actor.create({name:'Campaign hero',type:'character',flags:{},system:{details:{level:{value:12}}}});const before=structuredClone(campaign.system);let s=await send(api,'guided-start'),old=s;
 s=await send(api,'guided-next');await assert.rejects(api.request({type:'guided-next',encounterId:old.id,revision:old.revision}),/changed/);s=await send(api,'guided-stop');assert.equal(s.guidedTest.status,'stopped');assert.equal(s.complete,true);const actors=game.actors.contents.length;s=await send(api,'guided-start');assert.equal(game.actors.contents.length,actors);assert.deepEqual(campaign.system,before);assert.equal(s.guidedTest.step,0);delete globalThis.JournalEntry;
});
for(const die of [1,20])test(`guided test remains three rounds when every d20 is ${die}`,async()=>{
 const w=alphaWorld(),api=w.initialize();journals();w.faults.d20=Array(600).fill(die);let s=await send(api,'guided-start');
 for(let steps=0;steps<240&&s.guidedTest.status==='running';steps++){const step=nextGuidedStep(s);try{s=await send(api,'guided-next');}catch(error){throw Error(`R${s.round} ${s.phase}: ${step.label}: ${error.message}`);}}
 assert.equal(s.guidedTest.status,'complete');assert.equal(s.round,3);assert.ok(Object.values(s.ships).every(ship=>ship.resources.hull.value>0));delete globalThis.JournalEntry;
});
