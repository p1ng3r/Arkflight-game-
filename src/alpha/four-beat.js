/**
 * Arkflight Four-Beat experiment: a thin presentation and crew-contribution layer
 * over the established roundFlow 2 / combatFlow 3 engine.
 * No existing encounters or guided-test rules are migrated implicitly.
 */
export const FOUR_BEAT_EXPERIENCE = "four-beat";
export const FOUR_BEATS = Object.freeze([
  Object.freeze({id:"maneuver",name:"Maneuver",subtitle:"Chart a course",icon:"fa-compass"}),
  Object.freeze({id:"strategy",name:"Strategy",subtitle:"Draw & commit",icon:"fa-layer-group"}),
  Object.freeze({id:"resolve",name:"Resolve",subtitle:"Roll & fire",icon:"fa-dice-d20"}),
  Object.freeze({id:"recover",name:"Recover",subtitle:"Assess & reset",icon:"fa-rotate"})
]);
const BEAT_BY_PHASE=Object.freeze({
  opening:"maneuver",planning:"maneuver",
  "draw-reveal":"strategy","card-planning":"strategy",
  resolving:"resolve",firing:"resolve",response:"resolve",retarget:"resolve",damage:"resolve",boarding:"resolve",
  cleanup:"recover",complete:"recover"
});
export const CREW_CALLS=Object.freeze({
  captain:Object.freeze([
    Object.freeze({id:"focus-guns",label:"Focus Guns",hint:"+1 to the first Battle Watch check this round"}),
    Object.freeze({id:"shield-wall",label:"Shield Wall",hint:"+1 to the first Lifeveil Warden check"})
  ]),
  engineer:Object.freeze([
    Object.freeze({id:"calibrate",label:"Calibrate",hint:"+1 to the first Engineer check"}),
    Object.freeze({id:"vent-heat",label:"Vent Heat",hint:"Remove 1 Strain immediately"})
  ]),
  battlewatch:Object.freeze([
    Object.freeze({id:"mark-target",label:"Mark Target",hint:"+1 on your first shot against this target"})
  ]),
  veilwarden:Object.freeze([
    Object.freeze({id:"brace-veil",label:"Brace Veil",hint:"Reduce the next incoming Hull hit by 1"}),
    Object.freeze({id:"attune-veil",label:"Attune Veil",hint:"+1 to the first Lifeveil Warden check"})
  ])
});
export const CREW_CALL_ORDER=Object.freeze(["captain","engineer","battlewatch","veilwarden"]);
export const crewCallAllowed=(s,ship,station)=>s?.experience===FOUR_BEAT_EXPERIENCE&&s.phase==="card-planning"&&!!ship&&ship.resources.hull.value>0&&CREW_CALL_ORDER.includes(station)&&!ship.crewCalls?.[station]&&!s.cardLocks?.[ship.id];
export function fourBeatModel(s){
 if(!s)return {active:"maneuver",steps:FOUR_BEATS.map((step,i)=>({...step,number:i+1,active:i===0,done:false})),progress:0};
 const active=BEAT_BY_PHASE[s.phase]??"maneuver",index=Math.max(0,FOUR_BEATS.findIndex(x=>x.id===active));
 return {active,number:index+1,progress:(index+1)/FOUR_BEATS.length,round:s.round,steps:FOUR_BEATS.map((b,i)=>({...b,number:i+1,active:i===index,done:i<index}))};
}
/** Mutate only an engine-owned session copy. Repeated calls cannot give another bonus. */
export function applyCrewCall(s,ship,command){
 const {station,choice,targetId}=command;
 if(!crewCallAllowed(s,ship,station))throw new Error("This free station contribution is unavailable or already used this round.");
 if(!CREW_CALLS[station].some(row=>row.id===choice))throw new Error("Choose a valid crew contribution.");
 if(station==="battlewatch"){
  const target=s.ships[targetId];
  if(!target||target.team===ship.team||target.resources.hull.value<=0)throw new Error("Mark a living enemy ship.");
 }
 const calls=ship.crewCalls??={};
 calls[station]={id:choice,round:s.round,used:false,...(station==="battlewatch"?{targetId}:{})};
 if(choice==="vent-heat"){
   ship.resources.strain.value=Math.max(0,ship.resources.strain.value-1);
   calls[station].used=true;
 }
 return {station,choice,targetId};
}
/** Called on the only actual PF2e roll, never on an interface preview or on saves. */
export function consumeCrewCheckBonus(s,ship,station,{targetId=null}={}){
 if(s?.experience!==FOUR_BEAT_EXPERIENCE)return 0;
 let amount=0;
 const calls=ship.crewCalls??{};
 for(const [owner,call] of Object.entries(calls)){
  if(!call||call.used||call.round!==s.round)continue;
  const matching=(
   owner==="captain"&&(call.id==="focus-guns"&&station==="battlewatch"||call.id==="shield-wall"&&station==="veilwarden")||
   owner==="engineer"&&call.id==="calibrate"&&station==="engineer"||
   owner==="battlewatch"&&call.id==="mark-target"&&station==="battlewatch"&&call.targetId===targetId||
   owner==="veilwarden"&&call.id==="attune-veil"&&station==="veilwarden"
  );
  if(matching){call.used=true;amount++;}
 }
 return amount;
}
/** Consumed only on a real hit; additive DR is clamped to one use per round. */
export function consumeCrewHitProtection(s,ship,rawDamage){
 if(s?.experience!==FOUR_BEAT_EXPERIENCE||rawDamage<=0)return 0;
 const call=ship.crewCalls?.veilwarden;
 if(!call||call.round!==s.round||call.id!=="brace-veil"||call.used)return 0;
 call.used=true;
 return 1;
}
export function crewCallView(s,ship,canOperate=()=>false){
 if(!s||!ship||s.experience!==FOUR_BEAT_EXPERIENCE)return [];
 return CREW_CALL_ORDER.map(station=>{
  const call=ship.crewCalls?.[station],allowed=crewCallAllowed(s,ship,station)&&canOperate(station);
  return {station,label:({captain:"Captain",engineer:"Engineer",battlewatch:"Battle Watch",veilwarden:"Lifeveil Warden"})[station],
   selected:call?CREW_CALLS[station].find(x=>x.id===call.id)?.label:null,used:!!call?.used,
   available:allowed,options:CREW_CALLS[station].map(x=>({...x,available:allowed,selected:call?.id===x.id})),
   targets:station==="battlewatch"?Object.values(s.ships).filter(t=>t.team!==ship.team&&t.resources.hull.value>0).map(t=>({id:t.id,name:t.name,selected:call?.targetId===t.id})):[]
  };
 });
}
