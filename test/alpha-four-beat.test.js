import test from "node:test";
import assert from "node:assert/strict";
import {FOUR_BEAT_EXPERIENCE,FOUR_BEATS,CREW_CALLS,fourBeatModel,applyCrewCall,crewCallView,consumeCrewCheckBonus,consumeCrewHitProtection} from "../src/alpha/four-beat.js";
const make=()=>({
 experience:FOUR_BEAT_EXPERIENCE,phase:"card-planning",round:2,cardLocks:{},
 ships:{a:{id:"a",team:"p",ap:4,resources:{hull:{value:120},strain:{value:3}}},b:{id:"b",team:"e",resources:{hull:{value:90}}}}
});
const call=(s,station,choice,more={})=>applyCrewCall(s,s.ships.a,{station,choice,...more});
test("four visible steps use the existing phases without changing the underlying engine",()=>{
 assert.deepEqual(FOUR_BEATS.map(x=>x.id),["maneuver","strategy","resolve","recover"]);
 for(const [phase,expected] of [["opening","maneuver"],["planning","maneuver"],["draw-reveal","strategy"],["card-planning","strategy"],["resolving","resolve"],["firing","resolve"],["response","resolve"],["damage","resolve"],["cleanup","recover"],["complete","recover"]]){
  const view=fourBeatModel({phase,round:2});
  assert.equal(view.active,expected,phase);
  assert.equal(view.steps.filter(x=>x.active).length,1,phase);
 }
});
test("free station choices consume neither AP nor PF2e dice; once per round only",()=>{
 const s=make(),ship=s.ships.a,ap=ship.ap;
 call(s,"captain","focus-guns");call(s,"engineer","vent-heat");
 assert.equal(ship.ap,ap);assert.equal(ship.resources.strain.value,2);
 assert.throws(()=>call(s,"engineer","calibrate"),/already used/);
 assert.throws(()=>call(s,"captain","illegal"),/already used/);
 call(s,"battlewatch","mark-target",{targetId:"b"});
 call(s,"veilwarden","brace-veil");
 assert.equal(crewCallView(s,ship,()=>true).length,4);
 assert.equal(consumeCrewCheckBonus(s,ship,"battlewatch",{targetId:"b"}),2);
 assert.equal(consumeCrewCheckBonus(s,ship,"battlewatch",{targetId:"b"}),0);
 assert.equal(consumeCrewHitProtection(s,ship,12),1);
 assert.equal(consumeCrewHitProtection(s,ship,12),0);
 assert.equal(ship.ap,ap);
});
test("station ownership and locked strategy are enforced by the session command guard",()=>{
 const s=make();
 assert.equal(crewCallView(s,s.ships.a,station=>station==="engineer").find(x=>x.station==="engineer").available,true);
 assert.equal(crewCallView(s,s.ships.a,station=>station==="engineer").find(x=>x.station==="captain").available,false);
 assert.throws(()=>call(s,"battlewatch","mark-target",{targetId:"a"}),/living enemy/);
 assert.throws(()=>call(s,"battlewatch","mark-target",{targetId:"missing"}),/living enemy/);
 s.cardLocks.a=true;
 assert.throws(()=>call(s,"captain","focus-guns"),/unavailable/);
 s.cardLocks.a=false;s.phase="planning";
 assert.throws(()=>call(s,"captain","focus-guns"),/unavailable/);
});
test("brace ignores missed shots and signals reset naturally when round changes",()=>{
 const s=make();call(s,"veilwarden","brace-veil");
 assert.equal(consumeCrewHitProtection(s,s.ships.a,0),0);
 assert.equal(s.ships.a.crewCalls.veilwarden.used,false);
 s.round++;
 assert.equal(consumeCrewHitProtection(s,s.ships.a,12),0);
 assert.equal(consumeCrewCheckBonus(s,s.ships.a,"veilwarden"),0);
});
test("choice labels remain explicit without ambiguous ownership",()=>{
 assert.equal(CREW_CALLS.captain.length,2);
 assert.equal(CREW_CALLS.engineer.length,2);
 assert.equal(CREW_CALLS.battlewatch.length,1);
 assert.equal(CREW_CALLS.veilwarden.length,2);
});
