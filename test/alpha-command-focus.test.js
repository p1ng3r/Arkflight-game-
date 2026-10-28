import test from "node:test";
import assert from "node:assert/strict";
import { createAlphaSession } from "../src/alpha/combat.js";
import { commandFocus } from "../src/ui/alpha-command-focus.js";
const fixture=()=>createAlphaSession([{id:"a",name:"Crew",team:"crew",hullId:"brigantine",pose:{q:0,r:0,heading:0}},{id:"b",name:"Enemy",team:"enemy",hullId:"cutter",pose:{q:3,r:-6,heading:3}}],{id:"focus",seed:25});
test("response highlights require an eligible defender, AP, resources and station ownership",()=>{
 const s=fixture(),ship=s.ships.a;ship.instances.test="shield";ship.hand.push("test");s.phase="response";s.attacks=[{id:"shot",shipId:"b",targetId:"a",responses:{}}];s.attackIndex=0;
 const view=()=>commandFocus(s,ship,{canOperate:()=>true});assert.ok(view().instantIds.includes("test"));assert.equal(commandFocus(s,ship,{canOperate:()=>false}).instantIds.length,0);
 ship.ap=0;assert.equal(view().instantIds.length,0);ship.ap=4;ship.resources.lifeveil.value=0;assert.equal(view().instantIds.includes("test"),false);ship.resources.lifeveil.value=100;
 s.attacks[0].responses.a=true;assert.equal(view().instantIds.length,0);
 delete s.attacks[0].responses.a;s.pendingCrewAction={shipId:"a",name:"Check"};assert.equal(view().instantIds.length,0);
});
test("phase guidance shows authoritative committed shots and never alters encounter state",()=>{
 const s=fixture(),ship=s.ships.a;s.phase="cards";s.turnOrder=["a","b"];s.turnIndex=0;s.attacks=[{id:"shot",shipId:"a",batteryId:"starboard",targetId:null,formula:"4d6",resolved:false}];
 const before=structuredClone(s),view=commandFocus(s,ship);assert.equal(view.tab,"hand");assert.match(view.title,/Your ship/);assert.equal(view.shots[0].battery,ship.batteries.find(b=>b.id==="starboard").name);assert.match(view.shots[0].target,/next phase/);assert.deepEqual(s,before);
 s.pendingDiscard={shipId:"a",count:2};assert.match(commandFocus(s,ship).hint,/exactly 2/);s.pendingDiscard=null;s.phase="cleanup";assert.equal(commandFocus(s,ship).tab,"log");
});
