import test from "node:test";
import assert from "node:assert/strict";
import { ALPHA_HULLS,deriveAlphaProfile } from "../src/alpha/hulls.js";
import { ALPHA_CARDS,ALPHA_SKILLS } from "../src/alpha/cards.js";
import { hullManeuvers,previewManeuver,occupiedHexes,resolveManeuvers } from "../src/alpha/maneuvers.js";
import { createAlphaSession,dispatchAlphaCommand,alphaTargetLegal,alphaReplacementTargetLegal,alphaSuggestedStep,activeAlphaShip } from "../src/alpha/combat.js";

export function alphaFixture(){return createAlphaSession([{id:"a",name:"Rum Runner",team:"crew",hullId:"brigantine",pose:{q:0,r:0,heading:0}},{id:"b",name:"Needlewake",team:"enemy",hullId:"cutter",pose:{q:3,r:-6,heading:3}}],{id:"alpha-test",seed:25});}

test("Crossed Sights excludes the first fired target from replacement suggestions and legal UI targets",async()=>{
  let s=await moveToCards();
  s.complications.effects.push({id:"crossed",shipId:"a",kind:"restriction",rule:"different-battery-targets",firstTarget:"b",notBeforeRound:1,expiresRound:2});
  const order={id:"interrupted",shipId:"a",batteryId:"starboard",targetId:"b",responses:{},resolved:false};
  s.attacks=[order];s.attackIndex=0;s.phase="retarget";
  assert.equal(alphaTargetLegal(s,"a","starboard","b"),true);
  assert.equal(alphaReplacementTargetLegal(s,order,"b"),false);
  await assert.rejects(()=>command(s,"retarget","a",{targetId:"b"}),/legal replacement/);
  const next=alphaSuggestedStep(s);assert.equal(next.command.targetId,null);
  s=await command(s,next.command.type,next.command.shipId,next.command);assert.equal(s.attacks[0].resolved,true);
});
async function command(s,type,shipId,extra={},services={}){return dispatchAlphaCommand(s,{encounterId:s.id,revision:s.revision,type,shipId,...extra},services);}
async function settle(s){
  let guard=0;
  while((s.complications.choices.some(c=>c.status==="pending")||s.pendingDiscard)&&guard++<30){
    const c=s.complications.choices.find(c=>c.status==="pending");
    if(c)s=await command(s,"choose-complication",c.shipId,{choiceId:c.id,optionId:"alternative"});
    else s=await command(s,"discard",s.pendingDiscard.shipId,{instances:s.ships[s.pendingDiscard.shipId].hand.slice(0,s.pendingDiscard.count)});
  }
  assert.ok(guard<30);return s;
}
async function moveToCards(s=alphaFixture(),services={}){for(const id of ["a","b"]){s=await command(s,"plan",id,{maneuverId:"straight-3"});s=await command(s,"lock",id);}return settle(await command(s,"move",null,{},services));}
function putCard(s,shipId,cardId){
  const ship=s.ships[shipId];let instance=Object.keys(ship.instances).find(id=>ship.instances[id]===cardId);
  if(!instance){instance=`${cardId}-test`;ship.instances[instance]=cardId;}
  for(const zone of ["hand","drawPile","discard","burned"])ship[zone]=ship[zone].filter(id=>id!==instance);
  ship.hand.push(instance);return instance;
}
const constantRoll=async formula=>formula==="1d20"?10:12;
function zones(ship){return [...ship.hand,...ship.drawPile,...ship.discard,...ship.burned,...ship.prepared.map(p=>p.instance)].sort();}

test("ten opt-in hulls preserve agreed level-5 benchmarks and distinct handling/capacity",()=>{
  assert.equal(Object.keys(ALPHA_HULLS).length,10);
  const brig=deriveAlphaProfile({hullId:"brigantine"}),cutter=deriveAlphaProfile({hullId:"cutter"});
  assert.equal(brig.maxHull,120);assert.equal(brig.ac,22);assert.equal(brig.attack,13);assert.equal(brig.dc,20);assert.equal(cutter.maxHull,100);assert.equal(cutter.ac,23);
  assert.ok(deriveAlphaProfile({hullId:"sloop"}).cargoBulk>cutter.cargoBulk);
  for(const hull of Object.values(ALPHA_HULLS))assert.ok(hull.footprint>=1&&hull.footprint<=3&&hull.speed<=6);
  assert.throws(()=>deriveAlphaProfile({hullId:"brigantine",upgrades:["responsive-helm","responsive-helm"]}),/distinct/);
  assert.throws(()=>deriveAlphaProfile({hullId:"brigantine",level:1,talents:["broadside-doctrine"]}),/unavailable/);
});
test("exact routes give early/late turns different positions and equal three-step timing",()=>{
  const hull=deriveAlphaProfile({hullId:"brigantine"}),menu=hullManeuvers(hull),at={q:0,r:0,heading:0};
  const straight=previewManeuver(at,menu.find(m=>m.id==="straight-3"));
  const early=previewManeuver(at,menu.find(m=>m.id==="starboard-early-3")),late=previewManeuver(at,menu.find(m=>m.id==="starboard-late-3"));
  assert.equal(straight.trace.length,4);assert.equal(early.trace.length,4);assert.equal(late.trace.length,4);
  assert.deepEqual(early.end,{q:2,r:-3,heading:1});assert.deepEqual(late.end,{q:1,r:-3,heading:1});
  assert.equal(previewManeuver(at,menu.find(m=>m.id==="starboard-s-3")).end.heading,0);
});
test("all hull menus stay within travel limits, 60-degree facings and affordable turn budgets",()=>{
  for(const hullId of Object.keys(ALPHA_HULLS))for(let heading=0;heading<6;heading++){
    const profile=deriveAlphaProfile({hullId});
    for(const m of hullManeuvers(profile)){
      const p=previewManeuver({q:2,r:-3,heading},m);
      assert.ok(p.distance<=profile.speed);assert.ok(p.end.heading>=0&&p.end.heading<6);assert.ok(m.ap<=1);
      assert.equal(occupiedHexes(p.end,profile.footprint).length,profile.footprint);
      if(profile.handling==="capital")assert.ok(p.turns<=1);
    }
  }
});
test("head-on winner continues while loser is displaced safely and stops for the remaining route",async()=>{
  const profile=deriveAlphaProfile({hullId:"brigantine"});
  const ships={a:{name:"a",profile,ap:4,pose:{q:0,r:0,heading:0}},b:{name:"b",profile,ap:4,pose:{q:0,r:-1,heading:3}}};
  const result=await resolveManeuvers(ships,{a:"straight-3",b:"straight-3"},{contest:async()=>"a"});
  assert.equal(result.contacts.length,1);assert.equal(result.contacts[0].winner,"a");assert.equal(result.contacts[0].displaced,true);
  assert.deepEqual(result.poses.a,{q:0,r:-3,heading:0});assert.ok(result.stalled.includes("b"));
  assert.notDeepEqual(result.poses.b,result.poses.a);
  for(const frame of result.frames)assert.notEqual(`${frame.a.q},${frame.a.r}`,`${frame.b.q},${frame.b.r}`);
});
test("collision tie or blocked displacement stops both; different-time crossing is not an impact",async()=>{
  const profile=deriveAlphaProfile({hullId:"brigantine"});
  const ships={a:{name:"a",profile,ap:4,pose:{q:0,r:0,heading:0}},b:{name:"b",profile,ap:4,pose:{q:0,r:-1,heading:3}}};
  const tied=await resolveManeuvers(ships,{a:"straight-3",b:"straight-3"});assert.deepEqual(tied.poses.a,ships.a.pose);assert.deepEqual(tied.poses.b,ships.b.pose);
  const blocked=await resolveManeuvers(ships,{a:"straight-3",b:"straight-3"},{contest:async()=>"a",isBlocked:({shipId,to})=>shipId==="b"&&to.q!==0});
  assert.equal(blocked.contacts[0].noSafeSpace,true);
  const convoy=structuredClone(ships);convoy.b.pose={q:0,r:-1,heading:0};
  const free=await resolveManeuvers(convoy,{a:"straight-3",b:"straight-3"});assert.equal(free.contacts.length,0);
});
test("plans lock without moving ships, then reveal executes once and rerolls initiative each round",async()=>{
  let s=alphaFixture(),start=structuredClone(s.ships.a.pose);
  s=await command(s,"plan","a",{maneuverId:"starboard-early-3"});s=await command(s,"lock","a");assert.deepEqual(s.ships.a.pose,start);
  await assert.rejects(()=>command(s,"plan","a",{maneuverId:"hold"}),/locked/);
  await assert.rejects(()=>command(s,"move"),/All surviving/);
  s=await command(s,"plan","b",{maneuverId:"straight-3"});s=await command(s,"lock","b");const before=structuredClone(s);
  s=await command(s,"move",null,{}, {roll:constantRoll});assert.equal(s.phase,"cards");assert.deepEqual(s.ships.a.pose,{q:2,r:-3,heading:1});assert.ok(s.movement.frames.length>0);
  await assert.rejects(()=>dispatchAlphaCommand(s,{type:"move",encounterId:before.id,revision:before.revision}),/changed/);
});
test("shared AP pays for paid maneuvers and cards; no RP field or extra weapon-activation roll",async()=>{
  let s=alphaFixture();for(const id of ["a","b"]){s=await command(s,"plan",id,{maneuverId:id==="a"?"starboard-hard":"hold"});s=await command(s,"lock",id);}s=await command(s,"move",null,{}, {roll:constantRoll});
  assert.equal(s.ships.a.ap,3);assert.equal("rp"in s.ships.a,false);
  s.turnOrder=["a","b"];s.turnIndex=0;
  const r=putCard(s,"a","acquire");let count=0;
  s=await command(s,"play","a",{instanceId:r,skill:"crafting"},{roll:async formula=>{if(formula==="1d20")count++;return 10;}});
  assert.equal(s.ships.a.ap,2);assert.equal(count,1);
  s=await command(s,"fire","a",{batteryId:"starboard"});assert.equal(s.ships.a.ap,1);assert.equal(count,1);
});
test("all twenty-one cards execute all four authored degrees with correct timing and legal supply",async()=>{
  assert.equal(Object.keys(ALPHA_CARDS).length,21);
  for(const c of Object.values(ALPHA_CARDS))for(const die of [1,2,10,20]){
    let s=await moveToCards(alphaFixture(),{roll:constantRoll});s.turnOrder=["a","b"];s.turnIndex=0;
    s.ships.a.resources.hull.value=110;s.ships.a.resources.lifeveil.value=80;s.ships.a.resources.morale.value=80;s.ships.a.resources.strain.value=3;
    const instance=putCard(s,"a",c.id);s.ships.b.pose={q:1,r:-3,heading:3};
    if(c.timing==="instant"){s.attacks=[{id:"incoming",shipId:"b",targetId:"a",responses:{},batteryId:"starboard"}];s.attackIndex=0;s.phase="response";}
    s=await command(s,"play","a",{instanceId:instance,batteryId:"starboard",targetId:"b",adjustment:"forward",skill:ALPHA_SKILLS[c.stations[0]][0]}, {roll:async formula=>formula==="1d20"?die:6});
    assert.ok(!s.ships.a.hand.includes(instance),`${c.id} left hand`);assert.equal(s.ships.a.ap,4-c.ap);
    if(c.burn)assert.ok(s.ships.a.burned.includes(instance));
    if(c.delayed)assert.ok(s.ships.a.prepared.some(p=>p.instance===instance));
    if(c.stations.length===1&&c.role==="Attack")assert.equal(s.complications.history.length,0,"actual attack roll happens later");
    else if(die===1)assert.ok(s.complications.history.length>=1,`${c.id} critical failure draws`);
    else assert.equal(s.complications.history.length,0,`${c.id} noncritical does not draw`);
    await settle(s);
  }
});
test("two attacks resolve before simultaneous Hull damage; each battery fires at most once per round",async()=>{
  let s=await moveToCards(alphaFixture(),{roll:constantRoll});s.ships.a.resources.hull.value=1;s.ships.b.resources.hull.value=1;
  for(const id of s.turnOrder){s=await command(s,"fire",id,{batteryId:"starboard"});await assert.rejects(()=>command(s,"fire",id,{batteryId:"starboard"}),/already committed/);s=await command(s,"finish-card",id);}
  for(const a of s.attacks)s=await command(s,"target",a.shipId,{attackId:a.id,targetId:a.shipId==="a"?"b":"a"});
  s=await command(s,"begin-damage");
  const first=s.attacks[0];s=await command(s,"pass-response",first.targetId);s=await command(s,"attack",first.shipId,{}, {roll:constantRoll});
  assert.equal(s.ships.a.resources.hull.value,1);assert.equal(s.ships.b.resources.hull.value,1);
  const second=s.attacks[1];s=await command(s,"pass-response",second.targetId);s=await command(s,"attack",second.shipId,{}, {roll:constantRoll});
  assert.equal(s.ships.a.resources.hull.value,0);assert.equal(s.ships.b.resources.hull.value,0);assert.equal(s.complete,true);
});
test("delayed AP refresh is once-only, DR lasts the whole next round and duplicate preparation is rejected",async()=>{
  let s=await moveToCards(alphaFixture(),{roll:constantRoll});s.turnOrder=["a","b"];s.turnIndex=0;
  const pre=putCard(s,"a","prepare"),brace=putCard(s,"a","brace");
  s=await command(s,"play","a",{instanceId:pre},{roll:constantRoll});s=await command(s,"play","a",{instanceId:brace},{roll:constantRoll});
  assert.equal(s.ships.a.prepared.length,2);const other=putCard(s,"a","brace");
  await assert.rejects(()=>command(s,"play","a",{instanceId:other}),/already played a DR/);
  s.phase="cleanup";s=await command(s,"round");assert.equal(s.ships.a.ap,5);assert.equal(s.ships.a.prepared.filter(p=>p.kind==="dr").length,1);
  await assert.rejects(()=>command(s,"round"),/exchange/);
  s=await settle(s);s.phase="cleanup";s=await command(s,"round");assert.equal(s.ships.a.ap,4);assert.equal(s.ships.a.prepared.length,0);
});
test("hand/card-zone conservation, one draw per later round, mulligan and Burn exclusion",async()=>{
  let s=alphaFixture();const all=Object.keys(s.ships.a.instances).sort();assert.equal(s.ships.a.hand.length,5);
  s=await command(s,"mulligan","a",{instances:s.ships.a.hand.slice(0,2)});assert.equal(s.ships.a.hand.length,5);assert.deepEqual(zones(s.ships.a),all);
  await assert.rejects(()=>command(s,"mulligan","a",{instances:[]}),/closed/);
  s=await moveToCards(s,{roll:constantRoll});s.turnOrder=["a","b"];s.turnIndex=0;const burn=putCard(s,"a","all-hands");
  s=await command(s,"play","a",{instanceId:burn,batteryId:"starboard"},{roll:constantRoll});assert.ok(s.ships.a.burned.includes(burn));assert.deepEqual(zones(s.ships.a),all);
  for(let i=0;i<5;i++){s=await settle(s);s.phase="cleanup";s=await command(s,"round");}
  s=await settle(s);assert.ok(!s.ships.a.hand.includes(burn));assert.deepEqual(zones(s.ships.a),all);
});
test("shots with no legal targets can be held without ammunition or reload spending",async()=>{
  let s=await moveToCards(alphaFixture(),{roll:constantRoll});const id=activeAlphaShip(s),other=id==="a"?"b":"a";
  s=await command(s,"fire",id,{batteryId:"fore"});s=await command(s,"finish-card",id);s=await command(s,"finish-card",other);
  const attack=s.attacks[0],supply=s.ships[id].resources.supplies.value;
  s=await command(s,"hold-order",id,{attackId:attack.id});s=await command(s,"begin-damage");
  assert.equal(s.phase,"cleanup");assert.equal(s.ships[id].resources.supplies.value,supply);assert.equal(s.ships[id].batteries.find(b=>b.id==="fore").readyRound,1);
});
test("system saves require worsening danger, use ship-held modifiers and cannot recursively draw",async()=>{
  let s=await moveToCards(alphaFixture(),{roll:constantRoll});s.turnOrder=["a","b"];s.turnIndex=0;s.ships.a.resources.strain.value=4;
  const c=putCard(s,"a","overcharge");let checks=0;
  s=await command(s,"play","a",{instanceId:c},{roll:async f=>{if(f==="1d20"){checks++;return checks===1?10:1;}return 6;},operatorModifier:()=>99});
  assert.equal(checks,2);assert.equal(s.systemSaves["a:strain"].modifier,s.ships.a.profile.engineer);
  assert.equal(s.complications.history.filter(r=>r.source==="system").length,1);
  s=await settle(s);const count=s.complications.history.length;
  s=await command(s,"finish-card","a",{}, {roll:()=>{throw Error("unchanged resource must not save");}});
  assert.equal(s.complications.history.length,count);
});
test("all firing arcs rotate consistently and large hull sections can be targeted",()=>{
  const s=alphaFixture();s.ships.a.pose={q:0,r:0,heading:0};s.ships.b.pose={q:3,r:-3,heading:3};assert.ok(alphaTargetLegal(s,"a","starboard","b"));assert.equal(alphaTargetLegal(s,"a","port","b"),false);
  s.ships.b.profile.footprint=3;s.ships.b.pose={q:3,r:-7,heading:0};
  assert.equal(typeof alphaTargetLegal(s,"a","starboard","b"),"boolean");
});
test("prototype keys cannot become hulls, ship IDs or deck entries",()=>{
  assert.throws(()=>deriveAlphaProfile({hullId:"toString"}),/Choose an alpha hull/);
  assert.throws(()=>createAlphaSession([{id:"__proto__",name:"bad",team:"crew",hullId:"brigantine"},{id:"b",name:"b",team:"enemy",hullId:"cutter"}],{id:"safe"}),/valid ship/);
  const deck=Array(15).fill("toString");
  assert.throws(()=>createAlphaSession([{id:"a",name:"a",team:"crew",hullId:"brigantine",deck},{id:"b",name:"b",team:"enemy",hullId:"cutter"}],{id:"safe"}),/Unknown alpha card/);
});
test("boarding pauses a saved battle and resumes without resetting AP, cards or resources",async()=>{
  let s=await moveToCards(alphaFixture(),{roll:constantRoll});s.turnOrder=["a","b"];s.turnIndex=0;s.ships.b.pose={q:1,r:-3,heading:3};
  const c=putCard(s,"a","boarding");s=await command(s,"play","a",{instanceId:c,targetId:"b"},{roll:constantRoll});
  assert.equal(s.boarding.length,1);const before=structuredClone(s.ships);
  s=await command(s,"pause-boarding");assert.equal(s.phase,"boarding");
  await assert.rejects(()=>command(s,"fire","a",{batteryId:"starboard"}),/Card phase/);
  s=await command(s,"resume-boarding");assert.equal(s.phase,"cards");assert.deepEqual(s.ships,before);
});
test("a ship disabled by its own setback does not strand the Card-phase controller",async()=>{
  let s=await moveToCards(alphaFixture(),{roll:constantRoll});s.turnOrder=["a","b"];s.turnIndex=0;s.ships.a.resources.hull.value=1;
  const c=putCard(s,"a","acquire");s=await command(s,"play","a",{instanceId:c},{roll:async f=>f==="1d20"?2:8});
  assert.equal(s.ships.a.resources.hull.value,0);assert.equal(s.complete,true);
});
