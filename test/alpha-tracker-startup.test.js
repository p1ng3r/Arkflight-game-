import test from "node:test";
import assert from "node:assert/strict";
import {alphaWorld,installAlphaHooks} from "./helpers/alpha-world.js";
installAlphaHooks();
await import("../src/foundry/alpha-combat-api.js");

test("new Arkflight combat begins at a valid started Foundry tracker round and turn",async()=>{
 const world=alphaWorld(),api=world.initialize();
 const s=await api.request({type:"start",roundFlow:2});
 const combat=game.combats.get(s.canvas.combatId);
 assert.ok(combat);
 assert.equal(combat.active,true);
 assert.equal(combat.started,true);
 assert.equal(combat.round,1);
 assert.equal(combat.turn,0);
 assert.equal(s.round,1);
 assert.equal(s.phase,"opening");
});

test("starting a guided session deactivates the old encounter without intermediate tracker rendering",async()=>{
 const world=alphaWorld(),api=world.initialize();
 const first=await api.request({type:"start",roundFlow:2});
 const old=game.combats.get(first.canvas.combatId);
 const updates=[];
 const update=old.update.bind(old);
 old.update=async (changes,options)=>{updates.push({changes,options});return update(changes,options);};
 const next=await api.request({type:"guided-start"});
 assert.ok(next.canvas.combatId);
 assert.notEqual(first.canvas.combatId,next.canvas.combatId);
 assert.ok(updates.some(x=>x.changes.active===false&&x.options?.render===false&&x.options?.arkflightAlpha===true));
 const current=game.combats.get(next.canvas.combatId);
 assert.equal(current.started,true);
 assert.equal(current.turn,0);
});


test("PF2e never receives started turn events inside Combat.create; activation happens after creation",async()=>{
 const world=alphaWorld(),api=world.initialize();
 const originalCreate=Combat.create.bind(Combat),events=[];
 Combat.create=async (source,options)=>{
  events.push({stage:"create",active:source.active,round:source.round,turn:source.turn,render:options?.render});
  // Model the Foundry v14 error: calling #triggerTurnEvents during an already-started _onCreate.
  if(source.round>0||source.turn!==null||source.active!==false)throw new Error("PF2e _onCreate turn lifecycle ran before initialization.");
  const created=await originalCreate(source);
  const originalUpdate=created.update.bind(created);
  created.update=async(changes,settings)=>{
   events.push({stage:"update",active:changes.active,round:changes.round,turn:changes.turn,render:settings?.render,arkflightAlpha:settings?.arkflightAlpha});
   return originalUpdate(changes,settings);
  };
  return created;
 };
 const s=await api.request({type:"start",roundFlow:2});
 const combat=game.combats.get(s.canvas.combatId);
 assert.ok(combat.started);
 assert.deepEqual(events.slice(0,2),[
  {stage:"create",active:false,round:0,turn:null,render:false},
  {stage:"update",active:true,round:1,turn:0,render:false,arkflightAlpha:true}
 ]);
});
