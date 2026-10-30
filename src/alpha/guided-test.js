import {ALPHA_CARDS,ALPHA_SKILLS} from './cards.js';
import {alphaCardFor,alphaComplications,alphaTargetLegal,alphaActionBlockReason} from './combat.js';
import {currentPlannedCard} from './round-flow.js';
import {complicationChoiceOptions} from '../combat/ship-complications.js';
export const GUIDED_ROUNDS=3;
export const GUIDED_DECK=Object.freeze(['vent','vent','brace','brace','acquire','acquire','evasive','evasive','mend','mend','rally','rally','shield','shield','read']);
const schedules=[['vent','brace'],['acquire','evasive'],['mend','rally']];
export function initializeGuidedTest(s,crew){
 for(const [index,ship] of Object.values(s.ships).entries()){
  ship.stationActors=crew[ship.id];ship.instances=Object.fromEntries(GUIDED_DECK.map((id,i)=>[`${id}-${i}`,id]));ship.library=[...new Set(GUIDED_DECK)];
  const used=new Set();ship.hand=['vent','brace','acquire','evasive','shield'].map(card=>{const id=Object.keys(ship.instances).find(id=>ship.instances[id]===card&&!used.has(id));used.add(id);return id;});
  const rest=Object.keys(ship.instances).filter(id=>!used.has(id)),mend=rest.find(id=>ship.instances[id]==='mend'),rally=rest.find(id=>ship.instances[id]==='rally');
  ship.drawPile=[...rest.filter(id=>id!==mend&&id!==rally),rally,mend];ship.discard=[];ship.burned=[];ship.prepared=[];ship.resources.strain.value=3;
  for(const b of ship.batteries){b.productionFormula=b.formula;b.formula='2d6+4';b.training=true;}
  ship.guidedSchedule=index===0?schedules:[schedules[1],schedules[0],schedules[2]];
 }
 s.guidedTest={version:1,status:'running',step:0,roundLimit:GUIDED_ROUNDS,startedAt:new Date().toISOString(),lastLabel:'Test ready',exerciseBattery:'Training batteries: 2d6+4. Real dice, limited lethality so all three rounds can be observed.'};
 return s;
}
const firstSkill=station=>ALPHA_SKILLS[station][0];
export function nextGuidedStep(s){
 if(s?.guidedTest?.status!=='running')return null;
 const result=(label,type,data={})=>({label,command:{type,...data}}),ships=Object.values(s.ships);
 if(s.complete)return result('Finish the test and export results','guided-finish');
 if(s.pendingCrewAction){const r=s.pendingCrewAction;return result(`Roll ${r.name} with ${firstSkill(r.station)}`,'roll-crew',{shipId:r.shipId,requestId:r.id,skill:firstSkill(r.station)});}
 const choice=s.complications.choices.find(c=>c.status==='pending');
 if(choice){const options=complicationChoiceOptions(s.complications,choice.id),option=options.find(o=>o.id==='alternative')??options[0];return result(`Resolve complication: ${option.label}`,'choose-complication',{shipId:choice.shipId,choiceId:choice.id,optionId:option.id});}
 if(s.pendingDiscard){const d=s.pendingDiscard,ship=s.ships[d.shipId],reserved=new Set((s.cardPlans[ship.id]??[]).filter(c=>!c.resolved).map(c=>c.instanceId));return result(`${ship.name}: discard ${d.count} overflow card(s)`,'discard',{shipId:ship.id,instances:ship.hand.filter(id=>!reserved.has(id)).slice(0,d.count)});}
 if(s.phase==='opening'){const ship=ships.find(x=>!x.mulliganDone);return result(`${ship.name}: keep the five-card opening hand`,'mulligan',{shipId:ship.id,instances:[]});}
 if(s.phase==='draw'){const ship=ships.find(x=>x.drawnRound!==s.round);return result(`${ship.name}: click the deck and draw this round’s card`,'draw-round',{shipId:ship.id});}
 if(s.phase==='planning'){
  const route=s.round===2?'port-s-3':'straight-1',ship=ships.find(x=>!s.locked[x.id]);
  if(!ship)return result('Confirm and move both ships together on the canvas','move');
  if(s.plans[ship.id]!==route)return result(`${ship.name}: preview/stage ${route}`,'plan',{shipId:ship.id,maneuverId:route});
  return result(`${ship.name}: lock its maneuver`,'lock',{shipId:ship.id});
 }
 if(s.phase==='card-planning'){
  const ship=ships.find(x=>!s.cardLocks[x.id]),plan=s.cardPlans[ship.id]??[],wanted=ship.guidedSchedule[s.round-1];
  const id=ship.hand.find(id=>wanted.includes(ship.instances[id])&&!plan.some(c=>c.instanceId===id));
  if(id&&ship.ap>=alphaCardFor(ship,id).ap)return result(`${ship.name}: commit ${alphaCardFor(ship,id).name}`,'queue-card',{shipId:ship.id,instanceId:id});
  return result(`${ship.name}: lock its card plan`,'lock-cards',{shipId:ship.id});
 }
 if(s.phase==='resolving'){
  const ship=s.ships[s.turnOrder[s.turnIndex]],row=currentPlannedCard(s),card=alphaCardFor(ship,row.instanceId),reason=alphaActionBlockReason(s,ship.id,card,row);
  return reason?result(`${ship.name}: skip ${card.name} (${reason})`,'skip-card',{shipId:ship.id,instanceId:row.instanceId}):result(`${ship.name}: ${card.name} — roll ${firstSkill(card.stations[0])}`,'resolve-card',{shipId:ship.id,instanceId:row.instanceId,skill:firstSkill(card.stations[0])});
 }
 if(s.phase==='firing'){
  const ship=s.ships[s.turnOrder[s.firingIndex]],orders=s.attacks.filter(a=>a.shipId===ship.id&&!a.resolved),order=orders.find(a=>!a.targetId);
  if(order){const target=ships.find(t=>alphaTargetLegal(s,ship.id,order.batteryId,t.id));return target?result(`${ship.name}: target ${target.name}`,'target',{shipId:ship.id,attackId:order.id,targetId:target.id}):result(`${ship.name}: hold the shot — no legal target`,'hold-order',{shipId:ship.id,attackId:order.id});}
  if(!s.attacks.some(a=>a.shipId===ship.id)&&ship.ap>=1&&!alphaActionBlockReason(s,ship.id,{role:'Attack',stations:['battlewatch'],timing:'standard'})){
   const b=ship.batteries.find(b=>b.readyRound<=s.round&&b.firedRound!==s.round&&ships.some(t=>alphaTargetLegal(s,ship.id,b.id,t.id)));
   if(b)return result(`${ship.name}: commit ${b.name} for 1 AP`,'fire',{shipId:ship.id,batteryId:b.id});
  }
  return result(`${ship.name}: finish firing declarations`,'finish-firing',{shipId:ship.id});
 }
 if(s.phase==='response'){
  const attack=s.attacks[s.attackIndex],ship=s.ships[attack.targetId];
  if(!attack.responses[ship.id]){
   const id=ship.hand.find(id=>ship.instances[id]==='shield');
   if(id&&ship.ap>=1&&ship.resources.lifeveil.value>=5&&!alphaActionBlockReason(s,ship.id,ALPHA_CARDS.shield))return result(`${ship.name}: Shield Pulse — Lifeveil Warden rolls ${firstSkill('veilwarden')}`,'play',{shipId:ship.id,instanceId:id,skill:firstSkill('veilwarden')});
   return result(`${ship.name}: pass response`,'pass-response',{shipId:ship.id});
  }
  return result(`${s.ships[attack.shipId].name}: Battle Watch rolls to hit`,'attack',{shipId:attack.shipId});
 }
 if(s.phase==='damage')return result('Roll damage using the saved hit; show mitigation','damage',{shipId:s.attacks[s.attackIndex].shipId});
 if(s.phase==='retarget'){const a=s.attacks[s.attackIndex];return result('Hold a shot whose firing solution changed','retarget',{shipId:a.shipId});}
 if(s.phase==='cleanup')return s.round>=GUIDED_ROUNDS?result('Complete round three and finish the test','end'):result(`Review round ${s.round}; start round ${s.round+1}`,'round');
 throw Error(`Guided test cannot advance from ${s.phase}.`);
}
