import test from "node:test";
import assert from "node:assert/strict";
import {createAlphaSession,dispatchAlphaCommand} from "../src/alpha/combat.js";
import {activeShipCrewUsers,configureDrawControllers,createDrawReveal,acknowledgeDraw,settleDrawReveals,DRAW_ACK_TIMEOUT_MS} from "../src/alpha/draw-reveal.js";
import {FOUR_BEAT_EXPERIENCE} from "../src/alpha/four-beat.js";
const session=()=>createAlphaSession([
 {id:"a",name:"Player frigate",team:"party",hullId:"brigantine",actorId:"shipA",pose:{q:0,r:0,heading:0}},
 {id:"b",name:"Enemy cutter",team:"enemy",hullId:"cutter",actorId:"shipB",pose:{q:7,r:0,heading:3}}
],{id:"shared-reveal",roundFlow:2,combatFlow:3,seed:11});
const send=(s,type,shipId,data={})=>dispatchAlphaCommand(s,{type,shipId,encounterId:s.id,revision:s.revision,...data},{roll:async f=>f==="1d20"?10:12});
async function maneuver(s,when){
 for(const id of ["a","b"])s=await send(s,"plan",id,{maneuverId:"hold"});
 s=await send(s,"lock","a",{now:when});
 s=await send(s,"lock","b",{now:when});
 assert.equal(s.maneuverCountdown.deadline,when+5000);
 await assert.rejects(send(s,"move",null,{now:when+4999}),/five-second/);
 s=await send(s,"move",null,{now:when+5000});
 return s;
}
test("movement-first flow starts with a five-second lock gate and no draw before movement",async()=>{
 let s=session();
 assert.equal(s.phase,"opening");assert.equal(s.ships.a.hand.length,5);
 assert.equal(s.ships.a.profile.roundDraw,2);
 for(const id of ["a","b"])s=await send(s,"mulligan",id,{instances:[]});
 assert.equal(s.phase,"planning");
 s=await maneuver(s,1000);
 assert.equal(s.phase,"card-planning");
 assert.equal(s.ships.a.hand.length,5);
 assert.ok(!s.maneuverCountdown);
 s=await send(s,"lock-cards","a");s=await send(s,"lock-cards","b");
 while(s.phase==="firing")s=await send(s,"finish-firing",s.turnOrder[s.firingIndex]);
 assert.equal(s.phase,"cleanup");
 s=await send(s,"round",null);
 assert.equal(s.phase,"planning");
 assert.equal(s.ships.a.hand.length,5);
 s=await maneuver(s,10000);
 assert.equal(s.phase,"draw-reveal");
 assert.equal(s.ships.a.pendingDraw.length,2);
 assert.equal(s.ships.a.hand.length,5);
 assert.equal(s.ships.b.hand.length,5);
 assert.equal(s.drawReveal.ships.a.ids.length,2);
 configureDrawControllers(s,{a:["user1","user2"],b:[]},15001);
 assert.equal(s.ships.b.hand.length,7);
 assert.equal(s.ships.a.hand.length,5);
 assert.equal(s.phase,"draw-reveal");
 s=await send(s,"ready-draw","a",{userId:"user1",now:16000});
 assert.equal(s.ships.a.hand.length,5);
 assert.equal(s.drawReveal.ships.a.ready.length,1);
 await assert.rejects(send(s,"ready-draw","a",{userId:"spectator",now:16001}),/not an active controller/);
 s=await send(s,"ready-draw","a",{userId:"user2",now:16002});
 assert.equal(s.phase,"card-planning");
 assert.equal(s.ships.a.hand.length,7);
 assert.ok(!s.ships.a.pendingDraw);
 assert.ok(!s.drawReveal);
 const discardId=s.ships.a.hand[0],ap=s.ships.a.ap;
 s=await send(s,"cycle-card","a",{instanceId:discardId,now:20000});
 assert.equal(s.ships.a.ap,ap);
 assert.equal(s.ships.a.cycledRound,2);
 assert.ok(s.ships.a.discard.includes(discardId));
 assert.equal(s.phase,"draw-reveal");
 await assert.rejects(send(s,"cycle-card","a",{instanceId:s.ships.a.hand[0],now:20001}),/unlocked Strategy/);
 configureDrawControllers(s,{a:["user1"]},20001);
 s=await send(s,"ready-draw","a",{userId:"user1",now:20002});
 assert.equal(s.phase,"card-planning");
 await assert.rejects(send(s,"cycle-card","a",{instanceId:s.ships.a.hand[0],now:20003}),/already cycled/);
});
test("four-beat opening waits for maneuver, then deck click deals five before Strategy",async()=>{
 let s=createAlphaSession([
  {id:"a",name:"Player frigate",team:"party",hullId:"brigantine",actorId:"shipA",pose:{q:0,r:0,heading:0}},
  {id:"b",name:"Enemy cutter",team:"enemy",hullId:"cutter",actorId:"shipB",pose:{q:7,r:0,heading:3}}
 ],{id:"four-beat-deal",roundFlow:2,combatFlow:3,experience:FOUR_BEAT_EXPERIENCE,seed:17});
 assert.equal(s.phase,"planning");
 assert.equal(s.ships.a.hand.length,0);
 assert.equal(s.ships.b.hand.length,0);
 s=await maneuver(s,1000);
 assert.equal(s.phase,"draw");
 assert.equal(s.ships.a.hand.length,0);
 s=await send(s,"draw-round","a",{now:7000});
 assert.equal(s.phase,"draw-reveal");
 assert.equal(s.ships.a.pendingDraw.length,5);
 assert.equal(s.ships.a.hand.length,0);
 assert.equal(s.drawReveal.cinematic,true);
 configureDrawControllers(s,{a:["user1"]},7000);
 s=await send(s,"timeout-draw",null,{now:9600});
 assert.equal(s.phase,"draw");
 assert.equal(s.ships.a.hand.length,5);
 s=await send(s,"draw-round","b",{now:9700});
 configureDrawControllers(s,{b:[]},9700);
 assert.equal(s.phase,"card-planning");
 assert.equal(s.ships.b.hand.length,5);
});

test("AFK countdown unblocks a ship even if another controller never clicks Ready",async()=>{
 const s={phase:"draw-reveal",ships:{a:{hand:["existing"],pendingDraw:["new1","new2"]}},drawReveal:createDrawReveal({a:["new1","new2"]},1000)};
 assert.equal(DRAW_ACK_TIMEOUT_MS,12000);
 configureDrawControllers(s,{a:["alice","bob"]},1000);
 acknowledgeDraw(s,"a","alice",1500);
 assert.equal(s.ships.a.hand.length,1);
 assert.equal(settleDrawReveals(s,12999),false);
 assert.equal(settleDrawReveals(s,13000),true);
 assert.deepEqual(s.ships.a.hand,["existing","new1","new2"]);
 assert.equal(s.phase,"card-planning");
});
test("only online ship crew controllers are asked; no offline users or spectators",()=>{
 const ship={actorId:"shipA",stationActors:{captain:"pcA",engineer:"pcB",navigator:"npc"}};
 const users=[
  {id:"alice",active:true,isGM:false},
  {id:"bob",active:true,isGM:false},
  {id:"afk",active:false,isGM:false},
  {id:"spectator",active:true,isGM:false},
  {id:"gm",active:true,isGM:true}
 ];
 const own={alice:["shipA","pcA"],bob:["shipA","pcB"],afk:["shipA","pcA"],spectator:[],gm:["shipA","pcA"]};
 const actual=activeShipCrewUsers(ship,users,(u,id)=>own[u.id].includes(id));
 assert.deepEqual(actual,["alice","bob"]);
 assert.deepEqual(activeShipCrewUsers({...ship,stationActors:{}},users,(u,id)=>own[u.id].includes(id)),["alice","bob"]);
});
