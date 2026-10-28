import {ALPHA_CARDS} from './cards.js';
const copy=x=>structuredClone(x),alive=s=>s.resources.hull.value>0;
export const roundShips=s=>Object.values(s.ships).filter(alive);
export function currentPlannedCard(s){const ship=s?.ships[s.turnOrder[s.turnIndex]];return ship&&(s.cardPlans?.[ship.id]??[]).find(c=>!c.resolved);}
export function advanceCardResolution(s){while(s.turnIndex<s.turnOrder.length){const ship=s.ships[s.turnOrder[s.turnIndex]];if(alive(ship)&&currentPlannedCard(s))return;s.turnIndex++;}s.phase='firing';s.firingIndex=0;s.turnIndex=0;}
export function roundReadiness(s){return roundShips(s).map(ship=>{
 const active=s.turnOrder[s.turnIndex],attack=s.attacks[s.attackIndex];
 let ready=s.phase==='opening'?ship.mulliganDone:s.phase==='draw'?ship.drawnRound===s.round:s.phase==='planning'?!!s.locked[ship.id]:s.phase==='card-planning'?!!s.cardLocks?.[ship.id]:false,label=ready?'Ready':'Waiting';
 if(s.phase==='resolving'){ready=s.turnOrder.indexOf(ship.id)<s.turnIndex;label=ship.id===active?'Station roll':ready?'Resolved':'Waiting turn';}
 if(s.phase==='firing'){ready=s.turnOrder.indexOf(ship.id)<s.firingIndex;label=ship.id===s.turnOrder[s.firingIndex]?'Choose weapons':ready?'Firing complete':'Waiting turn';}
 if(['response','damage','retarget'].includes(s.phase)){ready=![attack?.shipId,attack?.targetId].includes(ship.id);label=ship.id===attack?.targetId?(attack.responses[ship.id]?'Response complete':'Response needed'):ship.id===attack?.shipId?(s.phase==='damage'?'Damage roll':'Attack roll'):'Standing by';}
 if(s.phase==='cleanup'||s.complete){ready=s.pendingDiscard?.shipId!==ship.id;label=ready?'Round complete':'Discard overflow';}
 if(s.pendingCrewAction){ready=ship.id!==s.pendingCrewAction.shipId;label=ready?'Waiting for crew':`${s.pendingCrewAction.station} roll`;}
 return {id:ship.id,name:ship.name,ready,label};
});}
/** Versioned crew flow; old saved alpha encounters keep their rules until explicitly reset. */
export async function dispatchRoundCommand(before,cmd,services,deps){
 if(cmd.encounterId!==before.id||cmd.revision!==before.revision)throw Error('Encounter changed; refresh before acting.');
 let s=copy(before),ship=s.ships[cmd.shipId];s.movement=null;s.actionEvent=null;
 const {legacy,draw,shuffle,assertSettled,log,nextAttack,refresh}=deps;
 if(cmd.shipId&&!ship)throw Error('Unknown ship.');
 if(s.complete&&!['end','choose-complication','discard'].includes(cmd.type))throw Error('Encounter ended.');
 if(!['end','choose-complication','discard'].includes(cmd.type))assertSettled(s);
 const revise=()=>{if(s.phase==='cleanup'&&!s.pendingDiscard){const x=roundShips(s).find(x=>x.hand.length>x.profile.hand);if(x)s.pendingDiscard={shipId:x.id,count:x.hand.length-x.profile.hand};}s.revision=before.revision+1;return s;};
 const stage=async(type,phase,data={})=>{const shadow=copy(s);shadow.phase=phase;return legacy(shadow,{...cmd,...data,type,revision:shadow.revision},services);};
 if(cmd.type==='mulligan'){
  if(s.phase!=='opening'||!alive(ship)||ship.mulliganDone)throw Error('Opening choice is closed.');
  const ids=cmd.instances??[];if(!Array.isArray(ids)||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!ship.hand.includes(id)))throw Error('Return up to two different cards.');
  ship.hand=ship.hand.filter(id=>!ids.includes(id));draw(s,ship,ids.length);ship.drawPile=shuffle(s,[...ship.drawPile,...ids]);ship.mulliganDone=true;log(s,`${ship.name} kept its opening hand after replacing ${ids.length} cards.`);
  if(roundShips(s).every(x=>x.mulliganDone))s.phase='planning';return revise();
 }
 if(cmd.type==='draw-round'){
  if(s.phase!=='draw'||!alive(ship)||ship.drawnRound===s.round)throw Error('This round’s draw is already complete or unavailable.');
  const count=ship.hand.length;draw(s,ship,ship.profile.roundDraw??1);ship.drawnRound=s.round;log(s,`${ship.name}: ${ship.hand.length-count} card(s) drawn${ship.hand.length===count?' — deck empty':''}.`);
  if(roundShips(s).every(x=>x.drawnRound===s.round))s.phase='planning';return revise();
 }
 if(['queue-card','unqueue-card','move-card','lock-cards'].includes(cmd.type)){
  if(s.phase!=='card-planning'||!alive(ship)||s.cardLocks[ship.id])throw Error('This card plan is closed.');
  const plan=s.cardPlans[ship.id]??=[];
  if(cmd.type==='queue-card'){
   const card=ALPHA_CARDS[ship.instances[cmd.instanceId]];
   if(!card||!ship.hand.includes(cmd.instanceId)||plan.some(c=>c.instanceId===cmd.instanceId)||card.timing==='instant')throw Error('Choose an uncommitted Standard card.');
   if(ship.ap<card.ap)throw Error('Insufficient AP. Keep AP for firing and Instants.');
   if(card.role==='Attack'){const b=ship.batteries.find(b=>b.id===cmd.batteryId);if(!b||b.readyRound>s.round||b.firedRound===s.round||plan.some(c=>c.batteryId===b.id&&ALPHA_CARDS[ship.instances[c.instanceId]].role==='Attack'))throw Error('Choose a ready, uncommitted battery.');if(card.id==='all-hands'&&b.id==='fore')throw Error('All Hands requires a broadside.');}
   if(card.dr&&plan.some(c=>ALPHA_CARDS[ship.instances[c.instanceId]].dr))throw Error('Only one DR card per round.');
   const row={instanceId:cmd.instanceId,cost:card.ap,resolved:false};for(const key of ['batteryId','adjustment','targetId','attackSkill'])if(cmd[key]!=null)row[key]=cmd[key];ship.ap-=card.ap;plan.push(row);log(s,`${ship.name} committed ${card.name} for ${card.ap} AP.`);
  }else if(cmd.type==='unqueue-card'){const i=plan.findIndex(c=>c.instanceId===cmd.instanceId);if(i<0)throw Error('Card is not queued.');ship.ap+=plan[i].cost;plan.splice(i,1);
  }else if(cmd.type==='move-card'){const i=plan.findIndex(c=>c.instanceId===cmd.instanceId),to=i+(cmd.direction===-1?-1:1);if(i<0||to<0||to>=plan.length)throw Error('Card cannot move there.');[plan[i],plan[to]]=[plan[to],plan[i]];
  }else{s.cardLocks[ship.id]=true;if(roundShips(s).every(x=>s.cardLocks[x.id])){s.phase='resolving';s.turnIndex=0;advanceCardResolution(s);}}
  return revise();
 }
 if(['resolve-card','skip-card'].includes(cmd.type)){
  const row=currentPlannedCard(s);if(s.phase!=='resolving'||s.turnOrder[s.turnIndex]!==ship?.id||!row||row.instanceId!==cmd.instanceId)throw Error('Only the current queued card can resolve.');
  if(cmd.type==='skip-card'){ship.hand=ship.hand.filter(id=>id!==row.instanceId);(ALPHA_CARDS[ship.instances[row.instanceId]].burn?ship.burned:ship.discard).push(row.instanceId);row.resolved=true;log(s,`${ship.name}: ${ALPHA_CARDS[ship.instances[row.instanceId]].name} skipped; committed AP remains spent.`);
  }else{ship.ap+=row.cost;s=await stage('play','cards',{...row,skill:cmd.skill});s.phase='resolving';s.cardPlans[ship.id].find(c=>c.instanceId===row.instanceId).resolved=true;}
  advanceCardResolution(s);return revise();
 }
 if(cmd.type==='fire'){if(s.phase!=='firing'||s.turnOrder[s.firingIndex]!==ship?.id)throw Error('Wait for this ship’s Firing phase.');s.turnIndex=s.firingIndex;s=await stage('fire','cards');s.phase='firing';return revise();}
 if(cmd.type==='target'){if(s.phase!=='firing'||s.turnOrder[s.firingIndex]!==ship?.id)throw Error('Choose targets during this ship’s Firing phase.');s=await stage('target','targeting');s.phase='firing';return revise();}
 if(cmd.type==='finish-firing'){if(s.phase!=='firing'||s.turnOrder[s.firingIndex]!==ship?.id)throw Error('Wait for this ship’s firing.');if(s.attacks.some(a=>a.shipId===ship.id&&!a.resolved&&!a.targetId))throw Error('Choose legal targets or hold the shots.');nextAttack(s);return revise();}
 if(cmd.type==='damage'){if(s.phase!=='damage'||s.attacks[s.attackIndex]?.shipId!==ship?.id)throw Error('No saved hit is waiting for damage.');s=await stage('attack','response');return revise();}
 if(cmd.type==='round'){if(s.phase!=='cleanup')throw Error('Complete this round first.');s.roundEvents=[];delete s.roundJournal;delete s.roundJournalError;refresh(s);s.phase='draw';s.cardPlans={};s.cardLocks={};s.firingIndex=0;return revise();}
 if(['play','regroup','finish-card','begin-damage'].includes(cmd.type)&&!(cmd.type==='play'&&ALPHA_CARDS[ship?.instances[cmd.instanceId]]?.timing==='instant'))throw Error('Use the plan and resolution controls.');
 if(cmd.type==='move'){s=await legacy(s,cmd,services);if(!s.complete){s.phase='card-planning';s.cardPlans={};s.cardLocks={};}return revise();}
 if(cmd.type==='hold-order'&&s.phase==='firing'){if(s.turnOrder[s.firingIndex]!==ship?.id)throw Error('Wait for this ship’s firing.');s=await stage('hold-order','targeting');s.phase='firing';return revise();}
 s=await legacy(s,cmd,services);return revise();
}
