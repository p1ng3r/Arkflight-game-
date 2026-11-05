import test from "node:test";
import assert from "node:assert/strict";
import {alphaWorld,installAlphaHooks} from "./helpers/alpha-world.js";
installAlphaHooks();
const {ALPHA_REQUEST_ACCEPT_MS,ALPHA_REQUEST_PROCESS_MS}=await import("../src/foundry/alpha-combat-api.js");

test("GM acknowledges an incoming player command before returning its authoritative result",async()=>{
 const world=alphaWorld(),api=world.initialize();
 let s=await api.request({type:"start",roundFlow:2});
 game.actors.get(s.ships["alpha-0"].actorId).ownership.player=3;
 const received=[];
 globalThis.ChatMessage={async create(data){
  const caller=game.user;
  const message={author:{id:caller.id},flags:structuredClone(data.flags),async update(change){
   if(change["flags.arkflight-game.alphaAccepted"])this.flags["arkflight-game"].alphaAccepted=change["flags.arkflight-game.alphaAccepted"];
   if(change["flags.arkflight-game.alphaResult"])this.flags["arkflight-game"].alphaResult=change["flags.arkflight-game.alphaResult"];
   received.push(change);
   Hooks.callAll("updateChatMessage",this,change,{},"gm");
   return this;
  }};
  game.user=game.users.get("gm");Hooks.callAll("createChatMessage",message,{},caller.id);game.user=caller;
  return message;
 }};
 game.user=game.users.get("player");
 s=await api.request({type:"plan",shipId:"alpha-0",maneuverId:"hold",encounterId:s.id,revision:s.revision});
 assert.equal(s.plans["alpha-0"],"hold");
 assert.ok(received.length>=2);
 assert.ok(received[0]["flags.arkflight-game.alphaAccepted"]?.requestId);
 assert.equal(received.at(-1)["flags.arkflight-game.alphaResult"].ok,true);
 game.user=game.users.get("gm");
});
test("request timeout states distinguish unacknowledged traffic from GM-side processing",()=>{
 assert.equal(ALPHA_REQUEST_ACCEPT_MS,30000);
 assert.equal(ALPHA_REQUEST_PROCESS_MS,120000);
});
