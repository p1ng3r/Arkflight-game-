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
