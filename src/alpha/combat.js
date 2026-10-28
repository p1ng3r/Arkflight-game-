import { ALPHA_DIRECTIONS, deriveAlphaProfile } from "./hulls.js";
import { ALPHA_CARDS, ALPHA_SKILLS, ALPHA_STARTER_DECK } from "./cards.js";
import { hullManeuvers, legalHullManeuvers, previewManeuver, resolveManeuvers, occupiedHexes, hexDistance } from "./maneuvers.js";
import { degreeOfSuccess } from "../combat/check-resolution.js";
import { createComplicationEncounter, resolveShipComplication, chooseShipComplication, activeShipComplications, complicationCheckModifier, consumeShipComplications, advanceComplicationRound, claimComplicationOpportunity } from "../combat/ship-complications.js";

const copy=v=>structuredClone(v), clamp=(v,max)=>Math.max(0,Math.min(max,v));
const isId=v=>typeof v==="string"&&!Object.hasOwn(Object.prototype,v)&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const living=s=>s.resources.hull.value>0;
const log=(s,text,detail=null)=>{s.logSerial=(s.logSerial??s.log.length)+1;s.log.push({id:`log-${s.logSerial}`,round:s.round,text,...(detail?{detail}: {})});if(s.log.length>100)s.log.shift();};
function random(s){let x=s.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;s.randomState=x>>>0;return s.randomState/4294967296;}
function shuffle(s,values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function dice(s,formula){if(!/^\d+d\d+(?:\+\d+d\d+|\+\d+)*$/.test(formula))throw new Error("Unsupported alpha dice formula.");return formula.split("+").reduce((n,term)=>{if(!term.includes("d"))return n+Number(term);const [count,sides]=term.split("d").map(Number);for(let i=0;i<count;i++)n+=1+Math.floor(random(s)*sides);return n;},0);}
async function roll(s,formula,services,context={}){const result=services.roll?await services.roll(formula,context):dice(s,formula);if(!Number.isFinite(result))throw new Error("The dice result was invalid.");return result;}
function track(ship,key,delta){const t=ship.resources[key];t.value=clamp(t.value+delta,t.max);}
function compIn(s){for(const ship of Object.values(s.ships)){const row=s.complications.ships.find(r=>r.id===ship.id);row.resources=copy(ship.resources);row.ap=ship.ap;}}
function compOut(s){for(const row of s.complications.ships){s.ships[row.id].resources=copy(row.resources);s.ships[row.id].ap=row.ap;}}
export function alphaComplications(s,shipId){return activeShipComplications(s.complications,shipId);}
function consume(s,shipId,effects){if(effects.length)s.complications=consumeShipComplications(s.complications,{shipId,effectIds:effects.map(e=>typeof e==="string"?e:e.id)});}
function effect(s,ship,kind,amount,uses=1,extra={}){ship.effects.push({id:`buff-${++s.serial}`,kind,amount,uses,expiresRound:s.round,...extra});}
function best(ship,kind){return Math.max(0,...ship.effects.filter(e=>e.kind===kind).map(e=>e.amount));}
function useBuff(ship,kind){const list=ship.effects.filter(e=>e.kind===kind);const amount=Math.max(0,...list.map(e=>e.amount));for(const e of list)if(e.uses!=null&&--e.uses<=0)ship.effects=ship.effects.filter(x=>x!==e);return amount;}
function source(s,ship,scenario,degree,eventId,extra={}){if(degree===-1)s.complicationQueue.push({shipId:ship.id,scenario,degree,eventId,source:"card",...extra});}
function settle(s){
  while(s.complicationQueue.length){
    const next=s.complicationQueue[0];
    if(s.complications.choices.some(c=>c.shipId===next.shipId&&c.status==="pending"))break;
    compIn(s);const result=resolveShipComplication(s.complications,next);s.complications=result.state;compOut(s);s.complicationQueue.shift();
    if(result.receipt.drawn&&!result.duplicate){log(s,`${s.ships[next.shipId].name}: ${result.receipt.name} — ${result.receipt.title}.`);for(const e of s.complications.effects)if(e.alphaCreatedAction==null)e.alphaCreatedAction=s.actionSerial;}
  }
  // Schedule reload damage on a currently loading battery immediately; ready batteries keep the descriptor until firing.
  for(const ship of Object.values(s.ships))for(const e of alphaComplications(s,ship.id))if(e.rule==="extra-reload"){
    const b=ship.batteries.find(b=>b.id===e.batteryId);if(b&&b.readyRound>s.round){b.readyRound+=e.value;consume(s,ship.id,[e]);}
  }
}
function assertSettled(s){if(s.complicationQueue.length||s.complications.choices.some(c=>c.status==="pending"))throw new Error("Resolve the pending complication choices first.");if(s.pendingDiscard)throw new Error("Discard the required cards first.");}
async function check(s,ship,station,skill,services,{dc=ship.profile.dc,batteryId=null,coordinated=false,bonus=0,save=false,cardId=null,instanceId=null}={}){
  if(ALPHA_SKILLS[station]&&!ALPHA_SKILLS[station].includes(skill??ALPHA_SKILLS[station][0]))throw new Error("Choose one of this station's three skills.");
  const baseline=save&&station==="engineer"?ship.profile.engineer:save&&station==="veilwarden"?ship.profile.veil:station==="structure"?ship.profile.structure:station==="initiative"?ship.profile.level+2:station==="battlewatch"?ship.profile.attack:ship.profile.support;
  const base=!save&&ALPHA_SKILLS[station]&&services.operatorModifier?await services.operatorModifier(ship,station,skill??ALPHA_SKILLS[station][0]):baseline;
  if(!Number.isFinite(base))throw new Error("Invalid crew modifier.");
  const modifier=save&&station!=="structure"?{amount:0,effectIds:[]}:complicationCheckModifier(s.complications,ship.id,station==="battlewatch"&&batteryId?"battery-attack":station,{batteryId,coordinated});
  const components=!save&&ALPHA_SKILLS[station]&&services.operatorBreakdown?await services.operatorBreakdown(ship,station,skill??ALPHA_SKILLS[station][0]):[{label:save?"Ship save":"Ship crew baseline",value:base}];
  const die=await roll(s,"1d20",services,{shipId:ship.id,station});if(!Number.isInteger(die)||die<1||die>20)throw new Error("A check requires a d20 result.");
  const morale=!save&&ALPHA_SKILLS[station]?(ship.resources.morale.value<=25?-2:ship.resources.morale.value<=50?-1:0):0;
  const penalty=Math.min(modifier.amount,morale);
  const total=die+base+penalty+bonus;
  consume(s,ship.id,modifier.effectIds);
  const result={die,modifier:base+penalty+bonus,total,dc,degree:degreeOfSuccess(total,die,dc),skill:skill??ALPHA_SKILLS[station]?.[0]??null,cardId,instanceId,components:[...components,{label:"Morale / complication (strongest)",value:penalty},{label:"Action bonus",value:bonus}]};
  log(s,`${ship.name} · ${station}: d20 ${die} ${result.modifier>=0?"+":""}${result.modifier} = ${total} vs ${dc} (${["critical failure","failure","success","critical success"][result.degree+1]}).`,{kind:"check",shipId:ship.id,targetId:station==="battlewatch"&&batteryId?s.attacks[s.attackIndex]?.targetId??null:null,station,batteryId,...result});
  return result;
}
function draw(s,ship,n){for(let i=0;i<n;i++){if(!ship.drawPile.length){ship.drawPile=shuffle(s,ship.discard);ship.discard=[];}if(ship.drawPile.length)ship.hand.push(ship.drawPile.pop());}}
export function alphaCardFor(ship,instance){return ALPHA_CARDS[ship.instances[instance]];}
function starter(entries,profile){
  const deck=entries??ALPHA_STARTER_DECK;
  if(!Array.isArray(deck)||deck.length<15||deck.length>profile.deck)throw new Error(`Choose 15–${profile.deck} combat cards.`);
  const counts={};for(const id of deck){const card=Object.hasOwn(ALPHA_CARDS,id)?ALPHA_CARDS[id]:null;if(!card)throw new Error("Unknown alpha card.");counts[id]=(counts[id]??0)+1;if(counts[id]>(card.unique?1:2))throw new Error("Combat deck exceeds a card's copy limit.");}
  return [...deck];
}
function batteries(profile){
  const small=["void-skiff","sloop","cutter"].includes(profile.id), heavy=profile.footprint>1||profile.id==="galleon";
  const power=2+Math.floor(profile.level/2);
  return [
    {id:"port",name:"Port Broadside",mount:"port",arc:90,range:small?4:5,formula:small?`${power}d8+6`:heavy?`${power+2}d8+10`:`${power}d10+8`,reload:heavy?2:1,readyRound:1,firedRound:0},
    {id:"starboard",name:"Starboard Broadside",mount:"starboard",arc:90,range:small?4:5,formula:small?`${power}d8+6`:heavy?`${power+2}d8+10`:`${power}d10+8`,reload:heavy?2:1,readyRound:1,firedRound:0},
    {id:"fore",name:"Fore Swivel",mount:"fore",arc:180,range:4,formula:`${Math.max(2,power-1)}d6+6`,reload:1,readyRound:1,firedRound:0}
  ];
}
export function createAlphaSession(entries,{id,seed=1,directions=ALPHA_DIRECTIONS,headings=[0,60,120,180,240,300],basis={q:{x:1.5,y:Math.sqrt(3)/2},r:{x:0,y:Math.sqrt(3)}}}={}){
  if(!isId(id)||!Number.isSafeInteger(seed)||seed<1||seed>0xffffffff)throw new Error("Provide an encounter ID and nonzero 32-bit seed.");
  if(!Array.isArray(entries)||entries.length<2||entries.length>8||new Set(entries.map(e=>e.id)).size!==entries.length||new Set(entries.map(e=>e.team)).size<2)throw new Error("Choose two to eight distinct ships on opposing teams.");
  const s={schemaVersion:1,id,revision:0,round:1,phase:"planning",ships:{},plans:{},locked:{},turnOrder:[],turnIndex:0,attacks:[],attackIndex:0,damage:[],serial:0,actionSerial:0,actions:[],complicationQueue:[],pendingDiscard:null,log:[],movement:null,boarding:[],directions:copy(directions),headings:[...headings],basis:copy(basis),randomState:seed,complete:false};
  for(const [i,e] of entries.entries()){
    if(!isId(e.id)||typeof e.name!=="string"||!e.name.trim()||!isId(e.team))throw new Error("Provide valid ship IDs, names and teams.");
    const profile=deriveAlphaProfile(e), pose=e.pose??{q:i%2?4:0,r:Math.floor(i/2)*4,heading:i%2?5:2};
    if(![pose.q,pose.r,pose.heading].every(Number.isSafeInteger)||pose.heading<0||pose.heading>5)throw new Error("Invalid starting hex/facing.");
    const deck=starter(e.deck,profile), instances=Object.fromEntries(deck.map((c,n)=>[`${c}-${n}`,c]));
    const ship={id:e.id,name:e.name,team:e.team,actorId:e.actorId??null,stationActors:copy(e.stationActors??{}),profile,pose:{...pose},resources:{hull:{value:profile.maxHull,max:profile.maxHull},lifeveil:{value:100,max:100},morale:{value:100,max:100},strain:{value:0,max:profile.strain},supplies:{value:20,max:20}},ap:profile.ap,instances,library:[...new Set(e.learned??deck)],loadoutId:e.loadoutId??null,libraryRevision:e.libraryRevision??null,drawPile:shuffle(s,Object.keys(instances)),hand:[],discard:[],burned:[],prepared:[],effects:[],batteries:batteries(profile),ammo:{chainshot:2},mulliganDone:false,drPlayedRound:0,regroupRound:0,bonusTravel:0,bonusTurns:0};
    s.ships[e.id]=ship;draw(s,ship,profile.opening);
  }
  s.complications=createComplicationEncounter({id,ships:Object.values(s.ships).map(ship=>({id:ship.id,name:ship.name,team:ship.team,resources:ship.resources,ap:ship.ap,batteries:ship.batteries})),seed:seed===0xffffffff?1:seed+1});
  log(s,"Alpha encounter ready. Choose opening mulligans and hull maneuvers.");return s;
}
export function activeAlphaShip(s){return s.turnOrder[s.turnIndex]??null;}
export function alphaAlongside(s,a,b){return occupiedHexes(s.ships[a].pose,s.ships[a].profile.footprint,s.directions).some(x=>occupiedHexes(s.ships[b].pose,s.ships[b].profile.footprint,s.directions).some(y=>hexDistance(x,y)===1));}
function battery(s,ship,id){const b=ship.batteries.find(b=>b.id===id);if(!b)throw new Error("Choose an installed battery.");return b;}
export function alphaTargetLegal(s,shipId,batteryId,targetId){
  const ship=s.ships[shipId],target=s.ships[targetId];if(!ship||!target||ship.team===target.team||!living(target))return false;
  return occupiedHexes(target.pose,target.profile.footprint,s.directions).some(cell=>alphaCellInBattery(s,shipId,batteryId,cell));
}
export function alphaReplacementTargetLegal(s,order,targetId){
  return alphaTargetLegal(s,order.shipId,order.batteryId,targetId)&&!alphaComplications(s,order.shipId).some(e=>e.rule==="different-battery-targets"&&e.firstTarget===targetId);
}
export function alphaCellInBattery(s,shipId,batteryId,cell){
  const ship=s.ships[shipId];
  const b=battery(s,ship,batteryId), origin=ship.pose, distance=hexDistance(origin,cell);
  const reduction=Math.max(0,...alphaComplications(s,shipId).filter(e=>e.rule==="battery-range-reduction"&&e.batteryId===batteryId).map(e=>e.value));
  if(distance<1||distance>Math.max(1,b.range-reduction))return false;
  const dq=cell.q-origin.q, dr=cell.r-origin.r, dx=dq*s.basis.q.x+dr*s.basis.r.x, dy=dq*s.basis.q.y+dr*s.basis.r.y;
  const bearing=(Math.atan2(dx,-dy)*180/Math.PI+360)%360, offset={fore:0,port:-90,starboard:90}[b.mount], facing=s.headings[origin.heading];
  return Math.abs((bearing-facing-offset+540)%360-180)<=b.arc/2+1e-6;
}
function validateShot(s,ship,cmd,card){
  if(cmd.attackSkill&&!ALPHA_SKILLS.battlewatch.includes(cmd.attackSkill))throw new Error("Choose a valid Battle Watch attack skill.");
  const b=battery(s,ship,cmd.batteryId);
  if(b.readyRound>s.round||b.firedRound===s.round||s.attacks.some(a=>a.shipId===ship.id&&a.batteryId===b.id))throw new Error("That battery is reloading or already committed this round.");
  if(card?.id==="all-hands"&&!["port","starboard"].includes(b.id))throw new Error("All Hands requires a broadside battery.");
  if(card?.ammo&&ship.ammo[card.ammo]<1)throw new Error("No matching special-ammunition charges remain.");
  return b;
}
function queueShot(s,ship,cmd,card,degree,eventId){
  const b=validateShot(s,ship,cmd,card);
  s.attacks.push({id:`attack-${++s.serial}`,eventId,shipId:ship.id,batteryId:b.id,targetId:null,skill:cmd.attackSkill??ALPHA_SKILLS.battlewatch[0],cardId:card?.id??null,formula:card?.id==="chainshot"?`${Math.max(2,Math.floor(ship.profile.level/2))}d10+8`:b.formula,bonusDice:card?.id==="all-hands"?`${Math.max(4,Math.ceil(ship.profile.level/4)+2)}d10`:["volley","breakaway","harmonic"].includes(card?.id)?`${Math.max(2,Math.ceil(ship.profile.level/5))}d8`:null,accuracy:card?.id==="all-hands"?(degree===2?2:1):card?.id==="volley"&&degree===2?1:0,penetration:card?.id==="harmonic"?(degree===2?3:2):0,ammo:card?.ammo??null,responses:{},resolved:false});
}
function standardTurn(s,ship){if(s.phase!=="cards"||activeAlphaShip(s)!==ship.id)throw new Error("Wait for this ship's Card phase.");if(!living(ship))throw new Error("A disabled ship cannot take Standard actions.");}
function spend(ship,ap){if(ship.ap<ap)throw new Error("Insufficient shared AP.");ship.ap-=ap;}
function cardRestrictions(s,ship,card){
  const effects=alphaComplications(s,ship.id);
  for(const e of effects){
    if(e.rule?.startsWith("no-coordinated-")&&card.stations.length>1){const station={"no-coordinated-veil":"veilwarden","no-coordinated-engineer":"engineer","no-coordinated-captain":"captain"}[e.rule];if(card.stations.includes(station))throw new Error("A complication prevents this station joining a Coordinated card until its next eligible action or expiry.");}
    if(e.rule?.endsWith("after-other-station")){
      const station=e.rule.split("-after")[0], relevant=station==="battery"?card.role==="Attack":card.stations.includes(station);
      if(relevant&&card.timing!=="instant"&&!s.actions.some(a=>a.shipId===ship.id&&a.seq>(e.alphaCreatedAction??0)&&a.station!==station&&a.station!==card.stations[0]))throw new Error("Another station must complete a Standard action first, or wait for this complication to expire.");
    }
  }
}
async function move(s,services,{shipId=null,steps=null}={}){
  const movementId=`movement-${++s.serial}`, routes=shipId?{[shipId]:{id:"card-adjustment",steps,ap:0}}:{};
  const plans=shipId?Object.fromEntries(Object.keys(s.ships).map(id=>[id,"hold"])):s.plans;
  const restrictions=Object.fromEntries(Object.keys(s.ships).map(id=>[id,shipId?[]:[...alphaComplications(s,id),...(s.ships[id].slow? [{rule:"travel-reduction",value:s.ships[id].slow}]:[])]]));
  const result=await resolveManeuvers(s.ships,plans,{directions:s.directions,restrictions,routeOverrides:routes,isBlocked:services.isBlocked,contest:async contact=>{
    const targets=contact.ids.map(id=>s.ships[id]), results=[];
    const severity=contact.kind==="head-on"?1:0, tier=Math.floor(Math.max(...targets.map(t=>t.profile.level))/4);
    const damage=await roll(s,`${1+tier+severity}d10+${2+2*tier+2*severity}`,services);
    for(const target of targets){
      const other=targets.find(x=>x.id!==target.id), dc=other?.profile.dc??target.profile.dc;
      const save=await check(s,target,"structure",null,services,{dc});
      const ram=(other&&contact.kind==="head-on"?other.profile.ramBonus:0)+(other?.prepared.filter(p=>p.kind==="ram"&&p.start===s.round).reduce((n,p)=>Math.max(n,p.amount),0)??0);
      const suffered=save.degree===2?0:save.degree===1?Math.floor((damage+ram)/2):damage+ram;
      track(target,"hull",-suffered);results.push({id:target.id,...save,damage:suffered});
      source(s,target,"impact",save.degree,`${movementId}-${contact.beat}-${contact.ids.join("_")}`,{source:"collision",opponentId:other?.id??null,alongside:false});
      if(other)for(const p of other.prepared.filter(p=>p.kind==="ram"&&p.start===s.round)){p.used=true;}
      log(s,`${target.name}: impact ${suffered} Hull damage (${target.resources.hull.value} remaining).`);
    }
    contact.results=results;
    if(results.length!==2)return null;
    const [a,b]=results, rank=a.degree-b.degree||a.total-b.total;
    const winner=rank>0?a.id:rank<0?b.id:null;
    log(s,winner?`${s.ships[winner].name} wins the impact contest; the other ship stops.`:"Impact saves tied: both ships stop.");
    return winner&&living(s.ships[winner])?winner:null;
  }});
  for(const [id,pose]of Object.entries(result.poses)){s.ships[id].pose=pose;s.ships[id].ap-=result.costs[id];if(!shipId){s.ships[id].slow=0;consume(s,id,alphaComplications(s,id).filter(e=>["max-turns","travel-reduction","move-before-turn","no-pivot"].includes(e.rule)));}}
  for(const pending of s.complicationQueue)if(pending.scenario==="impact"&&pending.opponentId)pending.alongside=alphaAlongside(s,pending.shipId,pending.opponentId);
  s.movement={id:movementId,frames:result.frames,contacts:result.contacts};
}
async function adjust(s,ship,cmd,services,degree=1,count=null){
  let moves=count??(cmd.adjustment?.startsWith("forward")?1:0), facing=cmd.adjustment?.endsWith("port")?-1:cmd.adjustment?.endsWith("starboard")?1:0;
  if(count==null&&!cmd.adjustment) moves=1;
  if(count==null&&moves&&facing&&degree!==2)facing=0; // Printed critical option falls back to the normal forward move.
  if(facing&&ship.bonusTurns>=1)throw new Error("The ship has used its bonus facing change this round.");
  const reduction=Math.max(0,...alphaComplications(s,ship.id).filter(e=>e.rule==="bonus-travel-reduction").map(e=>e.value));
  moves=Math.max(0,Math.min(moves,ship.profile.maxBonusMove-ship.bonusTravel)-reduction);
  const steps=[];if(moves)steps.push({kind:"forward",count:moves});if(facing)steps.push({kind:"turn",direction:facing});
  if(!steps.length)throw new Error("No legal bonus movement/facing remains.");
  ship.bonusTravel+=moves;if(facing)ship.bonusTurns++;
  await move(s,services,{shipId:ship.id,steps});
  if(moves||reduction)consume(s,ship.id,alphaComplications(s,ship.id).filter(e=>e.rule==="bonus-travel-reduction"));
}
function normalFailure(ship,station){if(station==="captain")track(ship,"morale",-2);else if(station==="engineer")track(ship,"strain",1);else if(station==="navigator")track(ship,"supplies",-1);else if(station==="veilwarden")track(ship,"lifeveil",-2);else track(ship,"hull",-2);}
async function play(s,ship,cmd,services){
  const card=alphaCardFor(ship,cmd.instanceId);if(!card||!ship.hand.includes(cmd.instanceId))throw new Error("Choose a card in this ship's hand.");
  const pending=s.attacks[s.attackIndex];
  if(card.timing==="instant"){
    if(s.phase!=="response"||pending?.targetId!==ship.id||pending.responses[ship.id])throw new Error("This Instant requires the incoming-attack response window.");
  }else standardTurn(s,ship);
  cardRestrictions(s,ship,card);
  if(card.role==="Attack")validateShot(s,ship,cmd,card);
  if(["prepare","ram"].includes(card.id)&&ship.prepared.some(p=>p.kind===(card.id==="prepare"?"ap":"ram")&&p.start===s.round+1))throw new Error("An identical preparation cannot stack.");
  if(card.id==="boarding"&&(!s.ships[cmd.targetId]||s.ships[cmd.targetId].team===ship.team||!alphaAlongside(s,ship.id,cmd.targetId)))throw new Error("Boarding requires an opposing ship alongside.");
  if(card.dr&&ship.drPlayedRound===s.round)throw new Error("This ship already played a DR card this round.");
  if(card.id==="patch"&&(ship.resources.supplies.value<1||ship.resources.hull.value>=ship.resources.hull.max))throw new Error("Patch Hull requires missing Hull and 1 Supply.");
  if(["shield","harmonic"].includes(card.id)&&ship.resources.lifeveil.value<5)throw new Error("Shield Pulse requires 5% Lifeveil.");
  spend(ship,card.ap);
  if(card.id==="patch")track(ship,"supplies",-1);
  if(["shield","harmonic"].includes(card.id))track(ship,"lifeveil",-5);
  if(card.id==="overcharge"){
    if(ship.resources.strain.value>=ship.resources.strain.max)throw new Error("Vent Strain before overcharging at full capacity.");
    const extra=alphaComplications(s,ship.id).filter(e=>e.rule==="extra-card-strain");track(ship,"strain",1+Math.max(0,...extra.map(e=>e.value)));consume(s,ship.id,extra);
  }
  const eventId=`action-${++s.serial}`, station=card.stations[0];s.actionEvent=eventId;
  let boardingBonus=ship.profile.boardingBonus,boardingOpening=null;
  if(card.id==="boarding"&&cmd.exploitEffectId){
    const e=s.complications.effects.find(e=>e.id===cmd.exploitEffectId&&e.shipId===cmd.targetId&&e.rule==="boarding-opening");
    if(!e)throw new Error("No boarding opening applies to that target.");
    compIn(s);s.complications=claimComplicationOpportunity(s.complications,{effectId:e.id,opponentId:ship.id,alongside:true});compOut(s);boardingBonus+=e.value;boardingOpening=e;
  }
  const attackOnly=card.role==="Attack"&&card.stations.length===1;
  const result=attackOnly?{degree:1}:await check(s,ship,station,cmd.skill,services,{cardId:card.id,instanceId:cmd.instanceId,bonus:card.id==="boarding"?boardingBonus:0,coordinated:card.stations.length>1,dc:card.id==="boarding"?s.ships[cmd.targetId]?.profile.dc??ship.profile.dc:ship.profile.dc});
  const degree=result.degree;
  if(!attackOnly&&degree===0&&card.id!=="boarding")normalFailure(ship,station);
  if(!attackOnly)source(s,ship,station,degree,eventId,{batteryId:cmd.batteryId??null});
  if(card.id==="acquire")effect(s,ship,"accuracy",degree===2?2:1);
  if(card.id==="patch")track(ship,"hull",await roll(s,degree===2?"2d10+4":"1d10+4",services));
  if(card.id==="brace"){ship.drPlayedRound=s.round;ship.prepared.push({instance:cmd.instanceId,kind:"dr",amount:degree===2?4:3,start:s.round+1,end:s.round+1});}
  if(card.id==="prepare"){
    if(ship.prepared.some(p=>p.kind==="ap"&&p.start===s.round+1))throw new Error("The same AP preparation cannot stack.");
    ship.prepared.push({instance:cmd.instanceId,kind:"ap",amount:degree===2?2:1,start:s.round+1,end:s.round+1});
  }
  if(card.id==="ram")ship.prepared.push({instance:cmd.instanceId,kind:"ram",amount:degree===2?4:2,start:s.round+1,end:s.round+1});
  if(card.id==="shield")pending.resistance=Math.max(pending.resistance??0,(degree===2?7:5)+ship.profile.resistanceBonus);
  if(card.id==="evasive")effect(s,ship,"ac",degree===2?2:1,null);
  if(card.id==="overcharge")effect(s,ship,"damage-die",degree===2?10:8,2);
  if(card.id==="mend"){
    const reductions=alphaComplications(s,ship.id).filter(e=>e.rule==="veil-restoration-reduction");
    track(ship,"lifeveil",Math.max(0,await roll(s,degree===2?"2d10+5":"1d10+5",services)-Math.max(0,...reductions.map(e=>e.value))));consume(s,ship.id,reductions);
  }
  if(card.id==="rally")track(ship,"morale",await roll(s,degree===2?"2d10+5":"1d10+5",services));
  if(card.id==="vent")track(ship,"strain",-(await roll(s,degree===2?"2d4+1":"1d4+1",services)+Math.floor(ship.profile.level/4)));
  if(card.id==="work-guns"){const b=battery(s,ship,cmd.batteryId);b.readyRound=Math.max(s.round,b.readyRound-(degree===2?2:1));}
  if(card.id==="read"){draw(s,ship,degree===2?2:1);if(degree===2&&ship.hand.length)s.pendingDiscard={shipId:ship.id,count:1};}
  if(["helm","breakaway"].includes(card.id))await adjust(s,ship,cmd,services,degree);
  if(card.id==="ahead")await adjust(s,ship,cmd,services,degree,(degree===2?3:2)+ship.profile.bonusMove);
  if(card.role==="Attack")queueShot(s,ship,cmd,card,degree,eventId);
  if(card.id==="boarding"){
    const target=s.ships[cmd.targetId];if(!target||target.team===ship.team||!alphaAlongside(s,ship.id,target.id))throw new Error("Boarding requires an opposing ship alongside.");
    if(degree>=1){s.boarding.push({shipId:ship.id,targetId:target.id,round:s.round,critical:degree===2});log(s,`${ship.name} secured boarding lines to ${target.name}. Deck combat is now an available branch.`);}
  }
  if(boardingOpening)consume(s,boardingOpening.shipId,[boardingOpening]);
  ship.hand=ship.hand.filter(id=>id!==cmd.instanceId);
  if(!card.delayed)(card.burn?ship.burned:ship.discard).push(cmd.instanceId);
  if(s.pendingDiscard?.shipId===ship.id){s.pendingDiscard.count=Math.min(ship.hand.length,card.id==="read"&&degree===2?1:0);if(!s.pendingDiscard.count)s.pendingDiscard=null;}
  if(card.timing==="instant")pending.responses[ship.id]=card.id;
  else s.actions.push({seq:++s.actionSerial,shipId:ship.id,station,eventId});
  const used=alphaComplications(s,ship.id).filter(e=>e.rule?.endsWith("after-other-station")&&e.rule.startsWith(station)||e.rule===`no-coordinated-${station==="veilwarden"?"veil":station}`);
  consume(s,ship.id,used);
  log(s,`${ship.name}: ${card.name} (${card.ap} AP).`,{kind:"card",shipId:ship.id,cardId:card.id,degree,cost:card.ap});
}
function finishExchange(s){
  for(const hit of s.damage){track(s.ships[hit.targetId],"hull",-hit.damage);if(hit.slow)s.ships[hit.targetId].slow=Math.max(s.ships[hit.targetId].slow??0,hit.slow);}
  log(s,`Exchange applied simultaneously: ${s.damage.map(d=>`${s.ships[d.targetId].name} −${d.damage} Hull`).join("; ")||"no damage"}.`);
  const teams=new Set(Object.values(s.ships).filter(living).map(ship=>ship.team));
  if(teams.size<=1){s.phase="complete";s.complete=true;log(s,teams.size?`Encounter ended. Remaining side: ${[...teams][0]}.`:"Encounter ended: mutual destruction.");}
  else s.phase="cleanup";
}
function nextAttack(s){
  while(s.attackIndex<s.attacks.length&&s.attacks[s.attackIndex].resolved)s.attackIndex++;
  if(s.attackIndex>=s.attacks.length){finishExchange(s);return;}
  const order=s.attacks[s.attackIndex];s.phase="response";
  if(!alphaTargetLegal(s,order.shipId,order.batteryId,order.targetId))s.phase="retarget";
}
async function resolveAttack(s,services){
  const order=s.attacks[s.attackIndex], attacker=s.ships[order.shipId], target=s.ships[order.targetId], b=battery(s,attacker,order.batteryId);
  if(!order.responses[target.id])throw new Error("The defending crew must play an Instant or pass first.");
  if(!alphaTargetLegal(s,attacker.id,b.id,target.id)||alphaComplications(s,attacker.id).some(e=>e.rule==="different-battery-targets"&&e.firstTarget===target.id)){s.phase="retarget";return;}
  if(order.ammo&&attacker.ammo[order.ammo]<1||!order.ammo&&attacker.resources.supplies.value<1){order.resolved=true;log(s,"Shot held because ammunition ran out: no reload incurred.");nextAttack(s);return;}
  let ac=target.profile.ac+best(target,"ac"), attackBonus=Math.max(order.accuracy,useBuff(attacker,"accuracy"));
  const opportunities=s.complications.effects.filter(e=>e.forAttack===order.id&&e.claimedBy);
  attackBonus+=Math.max(0,...opportunities.filter(e=>e.rule==="attack-opening").map(e=>e.value));
  ac+=Math.max(0,...opportunities.filter(e=>e.rule==="defensive-opening").map(e=>e.value));
  s.actionEvent=order.eventId;
  const result=await check(s,attacker,"battlewatch",order.skill,services,{dc:ac,bonus:attackBonus,batteryId:b.id,coordinated:["volley","all-hands","breakaway"].includes(order.cardId)});
  // Keep the actual target AC and the complete attack modifier visible.
  log(s,`${b.name}: attack bonus +${attackBonus}, target AC ${ac}.`);
  let bonus=order.bonusDice, overcharge=useBuff(attacker,"damage-die");
  const restrictions=alphaComplications(s,attacker.id).filter(e=>e.batteryId===b.id);
  if(restrictions.some(e=>e.rule==="no-bonus-weapon-damage")){bonus=null;overcharge=0;}
  let formula=order.formula+(bonus?`+${bonus}`:"")+(overcharge?`+1d${overcharge}`:"")+(attacker.profile.damageBonus?`+${attacker.profile.damageBonus}`:"");
  const rolled=result.degree>=1?await roll(s,formula,services):0;
  const raw=result.degree===2?rolled*2:rolled;
  const drGap=Math.max(0,...opportunities.filter(e=>e.rule==="dr-gap").map(e=>e.value)), resistanceGap=Math.max(0,...opportunities.filter(e=>e.rule==="resistance-gap").map(e=>e.value));
  const dr=Math.max(0,...target.prepared.filter(p=>p.kind==="dr"&&p.start<=s.round&&p.end>=s.round).map(p=>p.amount));
  const damage=Math.max(0,raw-Math.max(0,(order.resistance??0)-resistanceGap)-Math.max(0,dr-drGap-(order.penetration??0)));
  if(order.ammo)attacker.ammo[order.ammo]--;else track(attacker,"supplies",-1);
  const extraReload=Math.max(0,...restrictions.filter(e=>e.rule==="extra-reload").map(e=>e.value));
  b.readyRound=s.round+b.reload+extraReload;b.firedRound=s.round;
  consume(s,attacker.id,restrictions.filter(e=>["no-bonus-weapon-damage","battery-range-reduction","extra-reload","battery-after-other-station"].includes(e.rule)));
  for(const e of opportunities)consume(s,e.shipId,[e]);
  s.damage.push({shipId:attacker.id,targetId:target.id,batteryId:b.id,degree:result.degree,raw,damage,slow:order.cardId==="chainshot"&&result.degree>=1?(result.degree===2?2:1):0});
  const different=alphaComplications(s,attacker.id).find(e=>e.rule==="different-battery-targets");if(different){const record=s.complications.effects.find(e=>e.id===different.id);if(record.firstTarget)consume(s,attacker.id,[different]);else record.firstTarget=target.id;}
  source(s,attacker,"battlewatch",result.degree,order.eventId,{source:"attack",batteryId:b.id});
  order.resolved=true;log(s,`${attacker.name} → ${target.name}: ${raw} raw, ${damage} Hull damage pending exchange.`,{kind:"damage",shipId:attacker.id,targetId:target.id,batteryId:b.id,formula,rolled,degree:result.degree,raw,damage,mitigated:raw-damage});nextAttack(s);
}
function refresh(s){
  compIn(s);s.complications=advanceComplicationRound(s.complications);s.round++;
  s.phase="planning";s.plans={};s.locked={};s.attacks=[];s.damage=[];s.attackIndex=0;s.turnOrder=[];s.turnIndex=0;s.actions=[];
  for(const ship of Object.values(s.ships)){
    delete ship.initiative;ship.effects=ship.effects.filter(e=>e.expiresRound>=s.round);ship.bonusTravel=0;ship.bonusTurns=0;
    ship.ap=ship.profile.ap+Math.min(2,ship.prepared.filter(p=>p.kind==="ap"&&p.start===s.round).reduce((n,p)=>n+p.amount,0));
    const ended=ship.prepared.filter(p=>p.kind==="ap"&&p.start===s.round||p.end<s.round||p.used);
    for(const p of ended)ship.discard.push(p.instance);ship.prepared=ship.prepared.filter(p=>!ended.includes(p));
    if(living(ship))draw(s,ship,1);
  }
  compIn(s);log(s,`Round ${s.round}: AP refreshed, delayed effects activated, one card drawn per surviving ship.`);
}

function dangerBand(track,key){
  const ratio=track.value/track.max;
  return key==="strain"?(ratio>=.9?3:ratio>=.75?2:ratio>=.5?1:0):(ratio<=.1?3:ratio<=.25?2:ratio<=.5?1:0);
}
async function resolveSystemRisks(s,before,services){
  s.systemSaves??={};
  for(const ship of Object.values(s.ships))for(const [key,station,scenario,penalty]of [["hull","structure","impact","battery-attack"],["strain","engineer","engineer","engineer"],["lifeveil","veilwarden","veilwarden","veilwarden"]]){
    const old=before.ships[ship.id].resources[key], current=ship.resources[key], worse=key==="strain"?current.value>old.value:current.value<old.value;
    const band=dangerBand(current,key), identity=`${ship.id}:${key}`, prior=s.systemSaves[identity];
    if(!worse||!band||!living(ship)||prior?.round===s.round&&prior.band>=band)continue;
    // The impact's Structure save already covers Hull damage from that same contact.
    if(key==="hull"&&s.movement?.contacts.some(c=>c.ids.includes(ship.id))){s.systemSaves[identity]={round:s.round,band};continue;}
    const result=await check(s,ship,station,null,services,{dc:ship.profile.dc+(band-1)*2,save:true});
    s.systemSaves[identity]={round:s.round,band,...result};
    if(result.degree===0){
      s.complications.effects.push({kind:"modifier",stat:penalty,amount:-1,uses:1,expires:"end-next-round",id:`risk-${++s.complications.sequence}`,shipId:ship.id,receiptId:null,opponentId:null,createdRound:s.round,notBeforeRound:s.round,expiresRound:s.round+1,alphaCreatedAction:s.actionSerial});
      log(s,`${ship.name}: ${key} setback, -1 to the next matching check; expires after next round.`);
    }else if(result.degree===-1)source(s,ship,scenario,-1,s.actionEvent??`risk-${s.round}-${ship.id}-${key}-${band}`,{source:"system"});
  }
}

/** All rules mutations happen on a copy. The Foundry adapter authenticates the command author. */
export async function dispatchAlphaCommand(before,cmd,services={}){
  if(!before?.id||cmd.encounterId!==before.id||cmd.revision!==before.revision)throw new Error("Encounter changed; refresh before acting.");
  const s=copy(before), ship=cmd.shipId?s.ships[cmd.shipId]:null;s.movement=null;s.actionEvent=null;
  if(cmd.shipId&&!Object.hasOwn(s.ships,cmd.shipId))throw new Error("Unknown alpha ship.");
  if(s.complete&&!["end","choose-complication","discard"].includes(cmd.type))throw new Error("This alpha encounter has ended.");
  if(!["choose-complication","discard","end"].includes(cmd.type))assertSettled(s);
  if(cmd.type==="mulligan"){
    if(s.phase!=="planning"||s.round!==1||ship.mulliganDone||s.locked[ship.id])throw new Error("The opening mulligan is closed.");
    const ids=cmd.instances??[];if(!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!ship.hand.includes(id)))throw new Error("Return up to two different opening cards.");
    ship.hand=ship.hand.filter(id=>!ids.includes(id));ship.drawPile=shuffle(s,[...ship.drawPile,...ids]);draw(s,ship,ids.length);ship.mulliganDone=true;
  }else if(cmd.type==="plan"){
    if(s.phase!=="planning"||s.locked[ship.id])throw new Error("This maneuver is locked.");
    const m=legalHullManeuvers(ship,alphaComplications(s,ship.id)).find(m=>m.id===cmd.maneuverId);if(!m||m.ap>ship.ap||(!living(ship)&&m.id!=="hold"))throw new Error("Choose a legal affordable hull maneuver.");
    s.plans[ship.id]=m.id;
  }else if(cmd.type==="lock"){
    if(s.phase!=="planning"||!s.plans[ship.id])throw new Error("Choose a maneuver before locking.");s.locked[ship.id]=true;ship.mulliganDone=true;
  }else if(cmd.type==="move"){
    if(s.phase!=="planning"||Object.keys(s.ships).some(id=>living(s.ships[id])&&!s.locked[id]))throw new Error("All surviving ships must lock maneuvers first.");
    for(const x of Object.values(s.ships))if(!living(x))s.plans[x.id]="hold";
    const initiatives=[];for(const x of Object.values(s.ships))if(living(x)){const r=await check(s,x,"initiative",null,services);x.initiative=r.total;initiatives.push({id:x.id,total:r.total});}
    await move(s,services);
    s.turnOrder=initiatives.sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id)).map(x=>x.id).filter(id=>living(s.ships[id]));s.turnIndex=0;s.phase="cards";
    if(new Set(Object.values(s.ships).filter(living).map(x=>x.team)).size<2){s.phase="complete";s.complete=true;}
  }else if(cmd.type==="play")await play(s,ship,cmd,services);
  else if(cmd.type==="fire"){
    standardTurn(s,ship);cardRestrictions(s,ship,{role:"Attack",stations:["battlewatch"],timing:"standard"});spend(ship,1);queueShot(s,ship,cmd,null,1,`action-${++s.serial}`);s.actions.push({seq:++s.actionSerial,shipId:ship.id,station:"battlewatch"});
  }else if(cmd.type==="regroup"){
    standardTurn(s,ship);if(ship.regroupRound===s.round||!ship.hand.includes(cmd.instanceId))throw new Error("Regroup once per round: choose a card to discard.");spend(ship,1);ship.hand=ship.hand.filter(id=>id!==cmd.instanceId);ship.discard.push(cmd.instanceId);draw(s,ship,1);ship.regroupRound=s.round;
  }else if(cmd.type==="finish-card"){
    standardTurn(s,ship);s.turnIndex++;if(s.turnIndex>=s.turnOrder.length)s.phase="targeting";
  }else if(cmd.type==="target"){
    if(s.phase!=="targeting")throw new Error("Declare targets in the target declaration phase.");
    const a=s.attacks.find(a=>a.id===cmd.attackId&&a.shipId===ship.id);if(!a||!alphaTargetLegal(s,ship.id,a.batteryId,cmd.targetId))throw new Error("Choose an enemy within this battery's range and firing arc.");
    const different=alphaComplications(s,ship.id).find(e=>e.rule==="different-battery-targets");
    if(different&&(different.firstTarget===cmd.targetId||s.attacks.some(other=>!other.resolved&&other.id!==a.id&&other.shipId===ship.id&&other.targetId===cmd.targetId)))throw new Error("Crossed Sights requires different targets for the next two battery attacks.");
    a.targetId=cmd.targetId;
  }else if(cmd.type==="hold-order"){
    const a=s.attacks.find(a=>a.id===cmd.attackId&&a.shipId===ship.id&&!a.resolved);
    if(!a||!["targeting","response","retarget"].includes(s.phase))throw new Error("No unrolled shot can be held.");
    for(const e of s.complications.effects.filter(e=>e.forAttack===a.id&&e.claimedBy)){s.ships[e.claimedBy].ap+=e.apCost;delete e.claimedBy;delete e.forAttack;}
    a.resolved=true;log(s,"Shot held: AP spent; ammunition and reload remain unspent.");if(s.phase!=="targeting")nextAttack(s);
  }else if(cmd.type==="begin-damage"){
    if(s.phase!=="targeting"||s.attacks.some(a=>!a.targetId&&!a.resolved))throw new Error("Declare all battery targets before any attack rolls.");nextAttack(s);
  }else if(cmd.type==="pass-response"){
    const a=s.attacks[s.attackIndex];if(s.phase!=="response"||a.targetId!==ship.id||a.responses[ship.id])throw new Error("No incoming response to pass.");a.responses[ship.id]="pass";
  }else if(cmd.type==="attack"){
    if(s.phase!=="response")throw new Error("No attack is ready to resolve.");await resolveAttack(s,services);
  }else if(cmd.type==="retarget"){
    if(s.phase!=="retarget")throw new Error("No interrupted attack needs a replacement target.");
    const a=s.attacks[s.attackIndex];if(a.shipId!==ship.id)throw new Error("Only the attacking crew chooses a replacement.");
    if(cmd.targetId){if(a.retargeted||!alphaReplacementTargetLegal(s,a,cmd.targetId))throw new Error("Choose one legal replacement target.");a.targetId=cmd.targetId;a.retargeted=true;s.phase="response";}
    else{for(const e of s.complications.effects.filter(e=>e.forAttack===a.id&&e.claimedBy)){s.ships[e.claimedBy].ap+=e.apCost;delete e.claimedBy;delete e.forAttack;}a.resolved=true;log(s,"Interrupted attack held: AP remains spent; ammunition and reload remain unspent.");nextAttack(s);}
  }else if(cmd.type==="exploit"){
    if(s.phase!=="response")throw new Error("Exploit an opening after targets are declared, before its attack roll.");
    const a=s.attacks[s.attackIndex], e=s.complications.effects.find(e=>e.id===cmd.effectId);
    const legal=e&&(e.rule==="defensive-opening"?e.shipId===a.shipId&&ship.id===a.targetId:e.shipId===a.targetId&&ship.id===a.shipId)&&["attack-opening","defensive-opening","resistance-gap","dr-gap"].includes(e.rule);
    if(!legal)throw new Error("This opening does not apply to the pending attack.");
    compIn(s);s.complications=claimComplicationOpportunity(s.complications,{effectId:e.id,opponentId:ship.id});compOut(s);s.complications.effects.find(x=>x.id===e.id).forAttack=a.id;
  }else if(cmd.type==="choose-complication"){
    compIn(s);s.complications=chooseShipComplication(s.complications,{shipId:ship.id,choiceId:cmd.choiceId,optionId:cmd.optionId});compOut(s);
  }else if(cmd.type==="discard"){
    if(s.pendingDiscard?.shipId!==ship.id)throw new Error("This ship has no pending discard.");
    const ids=cmd.instances;if(!Array.isArray(ids)||ids.length!==s.pendingDiscard.count||new Set(ids).size!==ids.length||ids.some(id=>!ship.hand.includes(id)))throw new Error(`Choose exactly ${s.pendingDiscard.count} different cards to discard.`);
    ship.hand=ship.hand.filter(id=>!ids.includes(id));ship.discard.push(...ids);s.pendingDiscard=null;

  }else if(cmd.type==="round"){
    if(s.phase!=="cleanup")throw new Error("Finish the simultaneous damage exchange first.");refresh(s);
  }else if(cmd.type==="pause-boarding"){
    if(!s.boarding.length||s.phase==="boarding")throw new Error("Secure boarding lines before opening a deck encounter.");
    s.pausedPhase=s.phase;s.phase="boarding";log(s,"Ship battle paused for an optional PF2e deck encounter.");
  }else if(cmd.type==="resume-boarding"){
    if(s.phase!=="boarding"||!s.pausedPhase)throw new Error("No deck encounter is awaiting return.");s.phase=s.pausedPhase;delete s.pausedPhase;log(s,"Returned from deck combat; the saved ship battle resumes.");
  }else if(cmd.type==="end"){s.phase="complete";s.complete=true;log(s,"Alpha encounter stopped. Campaign resource data was not modified.");}
  else throw new Error("Unknown alpha command.");
  if(!["choose-complication","discard","end"].includes(cmd.type))await resolveSystemRisks(s,before,services);
  settle(s);
  if(s.phase==="cards"){
    for(const order of s.attacks)if(!living(s.ships[order.shipId]))order.resolved=true;
    while(s.turnIndex<s.turnOrder.length&&!living(s.ships[s.turnOrder[s.turnIndex]]))s.turnIndex++;
    if(s.turnIndex>=s.turnOrder.length)s.phase="targeting";
    if(new Set(Object.values(s.ships).filter(living).map(x=>x.team)).size<2){s.phase="complete";s.complete=true;log(s,"Encounter ended after a ship was disabled outside the damage exchange.");}
  }
  // Capacity is enforced at Cleanup; explicit card discards still resolve immediately.
  if(s.phase==="cleanup"&&!s.pendingDiscard){
    const overflow=Object.values(s.ships).find(x=>living(x)&&x.hand.length>x.profile.hand);
    if(overflow)s.pendingDiscard={shipId:overflow.id,count:overflow.hand.length-overflow.profile.hand};
  }
  s.revision=before.revision+1;return s;
}

/** Optional GM walkthrough: one visible legal suggestion, never autoplay or hidden-plan prediction. */
export function alphaSuggestedStep(s){
  if(!s||s.complete)return null;
  const suggestion=(label,command)=>({label,command});
  const pending=s.complications.choices.find(c=>c.status==="pending");
  if(pending)return suggestion(`${s.ships[pending.shipId].name}: take the non-resource complication option`,{type:"choose-complication",shipId:pending.shipId,choiceId:pending.id,optionId:"alternative"});
  if(s.pendingDiscard)return suggestion("Discard down to hand capacity",{type:"discard",shipId:s.pendingDiscard.shipId,instances:s.ships[s.pendingDiscard.shipId].hand.slice(0,s.pendingDiscard.count)});
  if(s.phase==="planning"){
    const ship=Object.values(s.ships).find(x=>living(x)&&!s.locked[x.id]);
    if(!ship)return suggestion("Reveal locked plans and move the fleet together",{type:"move"});
    if(s.plans[ship.id])return suggestion(`${ship.name}: lock the chosen maneuver`,{type:"lock",shipId:ship.id});
    const enemies=Object.values(s.ships).filter(x=>x.team!==ship.team&&living(x));
    const candidates=legalHullManeuvers(ship,alphaComplications(s,ship.id)).filter(m=>m.ap<=ship.ap).map(m=>{
      const pose=previewManeuver(ship.pose,m,s.directions).end, projected={...s,ships:{...s.ships,[ship.id]:{...ship,pose}}};
      const guns=ship.batteries.filter(b=>enemies.some(t=>alphaTargetLegal(projected,ship.id,b.id,t.id))).length;
      const distance=Math.min(...enemies.map(t=>hexDistance(pose,t.pose)));
      return {m,score:guns*20-Math.abs(distance-3)-m.ap*8};
    }).sort((a,b)=>b.score-a.score||a.m.id.localeCompare(b.m.id));
    return suggestion(`${ship.name}: choose ${candidates[0].m.name}`,{type:"plan",shipId:ship.id,maneuverId:candidates[0].m.id});
  }
  if(s.phase==="cards"){
    const ship=s.ships[activeAlphaShip(s)],reserve=ship.hand.some(id=>alphaCardFor(ship,id).id==="shield")&&ship.resources.lifeveil.value>=5?1:0;
    const ready=ship.batteries.find(b=>b.readyRound<=s.round&&b.firedRound!==s.round&&!s.attacks.some(a=>a.shipId===ship.id&&a.batteryId===b.id)&&Object.keys(s.ships).some(id=>alphaTargetLegal(s,ship.id,b.id,id)));
    function use(id,needed=true){
      const instance=ship.hand.find(i=>alphaCardFor(ship,i).id===id),card=ALPHA_CARDS[id];
      if(!needed||!instance||ship.ap<card.ap)return null;
      try{cardRestrictions(s,ship,card);if(card.role==="Attack")validateShot(s,ship,{batteryId:ready?.id},card);}catch{return null;}
      return suggestion(`${ship.name}: ${card.name}`,{type:"play",shipId:ship.id,instanceId:instance,batteryId:ready?.id??"port",skill:ALPHA_SKILLS[card.stations[0]][0],adjustment:"forward"});
    }
    let choice=use("patch",ship.resources.hull.value<ship.resources.hull.max*.6&&ship.resources.supplies.value>1);if(choice)return choice;
    choice=use("vent",ship.resources.strain.value>=ship.resources.strain.max*.5);if(choice)return choice;
    choice=use("all-hands",ready&&ready.id!=="fore"&&ship.ap>=3+reserve);if(choice)return choice;
    choice=use("volley",ready&&ship.ap>=2+reserve);if(choice)return choice;
    choice=use("acquire",ready&&ship.ap>=2+reserve&&!best(ship,"accuracy"));if(choice)return choice;
    if(ready&&ship.ap>reserve&&ship.resources.supplies.value>0){try{cardRestrictions(s,ship,{role:"Attack",stations:["battlewatch"],timing:"standard"});return suggestion(`${ship.name}: commit ${ready.name}`,{type:"fire",shipId:ship.id,batteryId:ready.id});}catch{/* Another station may still help. */}}
    choice=use("brace",ship.ap>reserve&&ship.drPlayedRound!==s.round);if(choice)return choice;
    choice=use("prepare",ship.ap>reserve&&!ship.prepared.some(p=>p.kind==="ap"&&p.start===s.round+1));if(choice)return choice;
    return suggestion(`${ship.name}: finish Card phase and retain remaining AP for Instants`,{type:"finish-card",shipId:ship.id});
  }
  if(s.phase==="targeting"){
    const a=s.attacks.find(a=>!a.resolved&&!a.targetId);
    if(!a)return suggestion("Lock all declared targets",{type:"begin-damage"});
    const targets=Object.keys(s.ships).filter(id=>alphaTargetLegal(s,a.shipId,a.batteryId,id));
    const restriction=alphaComplications(s,a.shipId).some(e=>e.rule==="different-battery-targets");
    const target=targets.find(id=>!alphaComplications(s,a.shipId).some(e=>e.rule==="different-battery-targets"&&e.firstTarget===id)&&(!restriction||!s.attacks.some(x=>x.shipId===a.shipId&&x.targetId===id)));
    return target?suggestion(`${s.ships[a.shipId].name}: target ${s.ships[target].name}`,{type:"target",shipId:a.shipId,attackId:a.id,targetId:target}):suggestion("Hold a shot without a legal firing solution",{type:"hold-order",shipId:a.shipId,attackId:a.id});
  }
  if(s.phase==="response"){
    const a=s.attacks[s.attackIndex],ship=s.ships[a.targetId];
    if(a.responses[ship.id])return suggestion(`${s.ships[a.shipId].name}: roll the prepared battery attack`,{type:"attack",shipId:a.shipId});
    const shield=ship.hand.find(id=>alphaCardFor(ship,id).id==="shield");
    if(shield&&ship.ap>=1&&ship.resources.lifeveil.value>=5)return suggestion(`${ship.name}: spend 1 AP and 5% Lifeveil on Shield Pulse`,{type:"play",shipId:ship.id,instanceId:shield,skill:ALPHA_SKILLS.veilwarden[0]});
    return suggestion(`${ship.name}: pass this response`,{type:"pass-response",shipId:ship.id});
  }
  if(s.phase==="retarget"){
    const a=s.attacks[s.attackIndex],target=Object.keys(s.ships).find(id=>alphaReplacementTargetLegal(s,a,id));
    return suggestion("Resolve the interrupted firing solution",{type:"retarget",shipId:a.shipId,targetId:a.retargeted?null:target??null});
  }
  if(s.phase==="cleanup")return suggestion("Apply the next round's refresh, delayed effects and draw",{type:"round"});
  return null;
}
