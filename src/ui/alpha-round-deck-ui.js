import {complicationCheckModifier} from "../combat/ship-complications.js";
import {AlphaCombatWindow,alphaCardArt} from './alpha-combat-ui.js';
import {ALPHA_CARDS,ALPHA_SKILLS} from '../alpha/cards.js';
import {alphaCardFor,alphaTargetLegal,alphaRangeBand} from '../alpha/combat.js';
import {currentPlannedCard,roundReadiness} from '../alpha/round-flow.js';
import {cardBand,cardTheme,cardOutcomes,stationName} from './alpha-combat-presentation.js';
import {alphaWindowPosition,bindAlphaPreferences,alphaSound} from './alpha-combat-effects.js';
import {showAlphaBattery,showAlphaManeuver,clearAlphaOverlay} from './alpha-combat-overlays.js';
import {roundRecap,roundRecapHTML,recapEscape} from '../foundry/alpha-round-journal.js';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
let dock,tracker,portrait;
const labels={opening:'Opening hand',draw:'Draw',planning:'Maneuver','card-planning':'Plan cards',resolving:'Station rolls',firing:'Firing',response:'Instant response',retarget:'Retarget',damage:'Damage',cleanup:'Round recap',complete:'Encounter ended',boarding:'Boarding'};
export function roundPhaseSteps(s){const phases=[s?.round===1?'opening':'draw','planning','card-planning','resolving','firing','cleanup'],current=phases.indexOf(['response','retarget','damage'].includes(s?.phase)?'firing':s?.phase);return phases.map((id,i)=>({id,label:labels[id],active:i===current,done:i<current,number:i+1}));}
export class AlphaRoundDeckWindow extends AlphaCombatWindow{
 static DEFAULT_OPTIONS={id:'arkflight-round-deck',classes:['arkflight-alpha-combat','alpha-command-deck','arkflight-round-deck'],window:{title:'Arkflight · Crew hand',icon:'fa-solid fa-layer-group',resizable:true},position:{width:960,height:450}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-round-deck.hbs'}};
 followPhase=false;resolutionOnly=false;movePromptKey=null;recapKey=null;
 constructor(o={}){super({...o,position:alphaWindowPosition(960,450,o.position)});}
 async _prepareContext(options){
  const api=game.arkflight.alphaCombat,s=api.state(),request=s?.pendingCrewAction,row=currentPlannedCard(s??{ships:{},turnOrder:[],turnIndex:0});
  if(this.resolutionOnly&&s?.roundFlow===2){if(request&&api.ownsShip(request.shipId)){this.shipId=request.shipId;this.inspectId=request.command.instanceId??null;}else if(s.phase==='resolving'&&row&&api.ownsShip(s.turnOrder[s.turnIndex])){this.shipId=s.turnOrder[s.turnIndex];this.inspectId=row.instanceId;}}
  const c=await super._prepareContext(options),ship=c.ship,phase=s?.phase,plan=s?.cardPlans?.[ship?.id]??[],planned=new Set(plan.filter(r=>!r.resolved).map(r=>r.instanceId));
  let card=c.card;if(this.resolutionOnly&&this.inspectId&&ship){const raw=alphaCardFor(ship,this.inspectId);if(raw)card={...raw,instanceId:this.inspectId,art:alphaCardArt(raw),band:cardBand(raw),theme:cardTheme(raw),outcomes:cardOutcomes(raw),stationLabel:raw.stations.map(stationName).join(' + '),needsBattery:raw.role==='Attack'||raw.id==='work-guns',attackOnly:raw.role==='Attack'&&raw.stations.length===1,movementCard:['helm','ahead','breakaway'].includes(raw.id)};}
  const station=request?.station??card?.stations[0]??'captain',chosen=request?this.pendingSkills[request.id]??'':this.skills[station]??'',actor=ship&&game.actors.get(ship.stationActors[station]);
  let breakdown;if((card||request)&&chosen&&ship){try{breakdown=await api.crewCheck(ship.id,station,chosen);}catch(e){breakdown={error:e.message};}}
  const pending=s?.attacks?.[s.attackIndex],firingShip=s?.turnOrder?.[s.firingIndex],responding=phase==='response'&&pending?.targetId===ship?.id&&!pending.responses[ship.id],allowed=ship&&api.canOperate(ship.id,station);
  if(breakdown&&!breakdown.error){
   const attack=request?.kind==='attack'?pending:null,mods=complicationCheckModifier(s.complications,ship.id,attack?'battery-attack':station,{batteryId:attack?.batteryId,coordinated:!!attack&&['volley','all-hands','breakaway'].includes(attack.cardId)}),morale=ship.resources.morale.value<=25?-2:ship.resources.morale.value<=50?-1:0;
   const penalty=Math.min(mods.amount,morale);let bonus=0,range=0,dc=ship.profile.dc;
   if(attack){const target=s.ships[attack.targetId],effects=s.complications.effects.filter(e=>e.forAttack===attack.id&&e.claimedBy);bonus=Math.max(attack.accuracy??0,...ship.effects.filter(e=>e.kind==='accuracy').map(e=>e.amount))+Math.max(0,...effects.filter(e=>e.rule==='attack-opening').map(e=>e.value));range=alphaRangeBand(s,ship.id,attack.batteryId,target.id).penalty;dc=target.profile.ac+Math.max(0,...target.effects.filter(e=>e.kind==='ac').map(e=>e.amount))+Math.max(0,...effects.filter(e=>e.rule==='defensive-opening').map(e=>e.value));}
   const total=breakdown.modifier+penalty+bonus+range;breakdown={...breakdown,modifier:total,modifierText:`${total>=0?'+':''}${total}`,dc,dcLabel:attack?'Target AC':'Support DC',components:[...breakdown.components,{label:'Morale / complication (strongest)',value:penalty},...(attack?[{label:'Action accuracy',value:bonus},{label:'Range band',value:range}]:[])]};
  }
  const resolving=phase==='resolving'&&s.turnOrder[s.turnIndex]===ship?.id&&row?.instanceId===this.inspectId;
  const receipt=card?[...(s?.log??[])].reverse().find(e=>e.detail?.instanceId===card.instanceId&&e.detail.shipId===ship?.id)?.detail:null;
  const primary=[...game.users].filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id===game.user.id;
  return {...c,crewPanel:this.crewPanel??false,canAssignCrew:game.user.isGM&&['opening','planning','card-planning','cleanup'].includes(phase),card,panelOnly:this.resolutionOnly,roundFlow:s?.roundFlow===2,phaseLabel:labels[phase]??'Take command',
   hand:c.hand.map(h=>({...h,queued:planned.has(h.instanceId),respondable:responding&&h.timing==='instant'&&ship.ap>=h.ap&&api.canOperate(ship.id,h.stations[0])&&(h.id!=='shield'||ship.resources.lifeveil.value>=5)})),
   opening:phase==='opening',drawStep:phase==='draw',canDraw:phase==='draw'&&ship&&ship.drawnRound!==s.round,maneuverStep:phase==='planning',planningCards:phase==='card-planning',resolvingCards:phase==='resolving',firing:phase==='firing',damageStep:phase==='damage',recap:phase==='cleanup'||s?.complete,
   canMulligan:phase==='opening'&&ship&&!ship.mulliganDone,planLocked:s?.cardLocks?.[ship?.id],committedAP:plan.reduce((n,r)=>n+r.cost,0),
   cardPlans:plan.map((r,i)=>({...r,index:i+1,name:ALPHA_CARDS[ship.instances[r.instanceId]].name,canRemove:phase==='card-planning'&&!s.cardLocks[ship.id],first:i===0,last:i===plan.length-1})),
   canLockCards:ship&&api.canOperate(ship.id,'captain')&&!s?.cardLocks?.[ship.id],canQueue:card&&phase==='card-planning'&&!s.cardLocks[ship?.id]&&!planned.has(card.instanceId)&&card.timing!=='instant'&&ship.ap>=card.ap,
   isOwnResolve:resolving,canResolve:resolving&&allowed&&!!chosen,canSkip:resolving&&api.canOperate(ship.id,'captain'),canInstant:card&&responding&&card.timing==='instant'&&allowed&&ship.ap>=card.ap&&!!chosen,
   canSubmitRoll:request?api.canOperate(request.shipId,request.station)&&!!chosen:allowed&&!!chosen,requestId:request?.id,skills:ALPHA_SKILLS[station].map(id=>({id,name:id,selected:id===chosen})),breakdown,crewActor:actor?.name??'Ship crew',crewPortrait:actor?.img,receipt,
   canFireNow:phase==='firing'&&firingShip===ship?.id&&api.canOperate(ship.id,'battlewatch')&&ship.ap>=1,canFinishFiring:phase==='firing'&&firingShip===ship?.id&&api.canOperate(ship.id,'captain'),canAttack:phase==='response'&&!request&&pending?.responses[pending.targetId]&&api.canOperate(pending.shipId,'battlewatch'),canDamage:phase==='damage'&&api.canOperate(pending?.shipId,'battlewatch'),hit:pending?.hit,
   discardCards:(ship?.discard??[]).map(id=>({id,name:ALPHA_CARDS[ship.instances[id]].name})),
   orders:(s?.attacks??[]).filter(a=>a.shipId===ship?.id&&!a.resolved).map(a=>({...a,name:ship.batteries.find(b=>b.id===a.batteryId)?.name??a.batteryId,targets:Object.values(s.ships).filter(t=>alphaTargetLegal(s,ship.id,a.batteryId,t.id)).map(t=>{const r=alphaRangeBand(s,ship.id,a.batteryId,t.id);return{id:t.id,name:`${t.name} · ${r.distance} hex · ${r.penalty} range`,selected:a.targetId===t.id};})})),
   canInspectCurrent:s&&api.ownsShip(s.turnOrder[s.turnIndex]),primary,allLocked:phase==='planning'&&roundReadiness(s).every(r=>r.ready),currentCardName:row&&s?ALPHA_CARDS[s.ships[s.turnOrder[s.turnIndex]].instances[row.instanceId]]?.name??'Enemy station action':'',
   phaseInstruction:request?`Waiting for ${c.crewRequest.actorName} to roll.`:({opening:'Keep your hand or replace up to two cards.',draw:'Click the deck to draw this round’s card.',planning:'Choose a course. Movement waits until every ship locks.','card-planning':'Commit cards in order. Keep AP for firing and Instants.',resolving:`${s?.ships[s?.turnOrder?.[s?.turnIndex]]?.name??''} · resolve the next queued card.`,firing:`${s?.ships[firingShip]?.name??''} · choose weapons and targets.`,response:'Respond to incoming fire or pass.',damage:'The attack die is saved. Resolve damage without rerolling.',cleanup:'Discard overflow, review the round and start the next.'}[phase]??'Choose your ship.'),
   unsettled:!!s?.pendingDiscard||!!s?.pendingCrewAction||s?.complications?.choices.some(x=>x.status==='pending'),recapNarrative:s?.roundFlow===2?roundRecap(s).narrative:[],recapLines:(s?.roundEvents??s?.log??[]).filter(e=>e.round===s?.round),journal:s?.roundJournal,
   showHand:!!ship&&(!!c.pendingDiscard||['opening','draw','card-planning','response'].includes(phase)),drawCount:ship?.drawCount??ship?.drawPile.length??0};
 }
 async _onRender(c){
  const root=this.element;bindAlphaPreferences(root,()=>this.render({force:true}));
  for(const el of root.querySelectorAll('[data-alpha-assign]'))el.addEventListener('change',()=>void this.roundAction('assign-station',{station:el.dataset.alphaAssign,actorId:el.value}));
  root.querySelector('[data-alpha-ship]')?.addEventListener('change',e=>{this.shipId=e.target.value;this.inspectId=null;this.selections.clear();void this.render({force:true});});
  for(const el of root.querySelectorAll('[data-round-action]'))el.addEventListener('click',()=>void this.roundAction(el.dataset.roundAction,el.dataset));
  for(const el of root.querySelectorAll('[data-alpha-card]'))el.addEventListener('click',()=>{const id=el.dataset.alphaCard;if(c.opening&&c.canMulligan||c.pendingDiscard){if(c.pendingDiscard&&c.hand.find(h=>h.instanceId===id)?.queued)return;if(this.selections.has(id))this.selections.delete(id);else this.selections.add(id);alphaSound('select');void this.render({force:true});}else void openRoundCard(this.shipId,id);});
  root.querySelector('[data-round-skill]')?.addEventListener('change',e=>{if(c.requestId)this.pendingSkills[c.requestId]=e.target.value;else this.skills[c.card.stations[0]]=e.target.value;void this.render({force:true});});
  for(const el of root.querySelectorAll('[data-round-order]'))el.addEventListener('change',()=>void this.roundAction('target',{attackId:el.dataset.roundOrder,targetId:el.value}));
  for(const el of root.querySelectorAll('[data-round-build]'))el.addEventListener('change',()=>{this.build[el.dataset.roundBuild]=['count','level'].includes(el.dataset.roundBuild)?Number(el.value):el.value;void this.render({force:true});});
  for(const [selector,key] of [['[data-alpha-battery]','batteryId'],['[data-alpha-adjustment]','adjustment'],['[data-alpha-target]','targetId']])root.querySelector(selector)?.addEventListener('change',e=>{this[key]=e.target.value;});
  const hand=root.querySelector('.round-hand');if(hand)hand.scrollLeft=this.restoreScroll?.hand??0;this.effectsEngine.update(root,c.s,c.ship?.id);
  if(!this.resolutionOnly&&c.primary&&c.allLocked&&!this.busy&&this.movePromptKey!==`${c.s.id}:${c.s.round}`){this.movePromptKey=`${c.s.id}:${c.s.round}`;queueMicrotask(()=>void this.roundAction('confirm-move'));}
  if(!this.resolutionOnly&&c.recap&&!c.unsettled&&c.s?.roundFlow===2&&this.recapKey!==`${c.s.id}:${c.s.round}`){this.recapKey=`${c.s.id}:${c.s.round}`;const journal=c.journal?`<p>Journal ${recapEscape(c.journal.journalId)} · Page ${recapEscape(c.journal.pageId)}</p>`:'<p>Journal pending; recap retained for retry.</p>';if(foundry.applications.api.DialogV2?.prompt)queueMicrotask(()=>void foundry.applications.api.DialogV2.prompt({window:{title:`Round ${c.s.round} · Ship’s log`},content:roundRecapHTML(c.s)+journal,ok:{label:'Return to battle'}}).catch(()=>{}));}
 }
 async roundAction(type,data={}){
  if(this.busy)return;const api=game.arkflight.alphaCombat,s=api.state(),ship=s?.ships[this.shipId];
  if(type==='inspect-current'){const row=currentPlannedCard(s);if(row&&api.ownsShip(s.turnOrder[s.turnIndex]))await openRoundCard(s.turnOrder[s.turnIndex],row.instanceId);return;}
  if(type==='close-card'){await this.close();return;}if(type==='minimize'){await this.minimize();return;}if(type==='tracker'){await openRoundTracker();return;}
  if(type==='library'){await api.library.open(ship?.actorId);return;}if(type==='crew'){this.crewPanel=!this.crewPanel;await this.render({force:true});return;}if(type==='open-journal'){await game.journal.get(s.roundJournal.journalId)?.sheet.render(true);return;}
  if(type==='arcs'){showAlphaBattery(s,ship.id,data.batteryId);return;}if(type==='clear-arcs'){clearAlphaOverlay();return;}
  if(type==='route'){this.maneuvers[ship.id]=data.route;const route=(await this._prepareContext({})).routes.find(r=>r.id===data.route);if(route)showAlphaManeuver(s,ship.id,route);alphaSound('select');await this.render({force:true});return;}
  if(type==='confirm-move'){const users=[...game.users].map(u=>`${recapEscape(u.name??u.id)} — ${u.active?'connected':'offline'}`).join('<br>');const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Reveal fleet maneuvers'},content:`<p>All ships locked. Move the fleet together?</p><p>${users}</p>`,yes:{label:'Yes · move fleet'},no:{label:'No · wait'}}):globalThis.confirm('All ships locked. Move the fleet together?');if(!yes)return;type='move';}
  if(type==='reset'){const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Restart test encounter'},content:'<p>Restart with fresh hands and resources? Keep libraries, loadouts and crew.</p>'}):globalThis.confirm('Restart test encounter?');if(!yes)return;}
  this.busy=true;this.error='';
  try{
   let command={type,shipId:this.shipId};
   if(type==='start')command={type,roundFlow:2,...this.build};if(type==='reset')command={type,roundFlow:2};
   if(type==='lock'&&api.canOperate(ship.id,'navigator')){const a=api.state();await api.request({type:'plan',shipId:ship.id,encounterId:a.id,revision:a.revision,maneuverId:this.maneuvers[ship.id]??s.plans[ship.id]??'hold'});}
   if(type==='plan')command.maneuverId=this.maneuvers[ship.id]??'hold';if(['mulligan','discard'].includes(type))command.instances=[...this.selections];
   if(type==='queue-card')Object.assign(command,{instanceId:this.inspectId,batteryId:this.batteryId,adjustment:this.adjustment,targetId:this.targetId});
   if(['unqueue-card','move-card','hold-order','target'].includes(type))Object.assign(command,{instanceId:data.instanceId,direction:Number(data.direction),attackId:data.attackId,targetId:data.targetId});
   if(['resolve-card','skip-card','play'].includes(type)){const card=alphaCardFor(ship,this.inspectId);Object.assign(command,{instanceId:this.inspectId,skill:this.skills[card.stations[0]]??'',batteryId:this.batteryId,adjustment:this.adjustment});}
   if(['roll-crew','cancel-crew'].includes(type)){const r=api.state().pendingCrewAction;command={type,requestId:r.id,shipId:r.shipId,skill:this.pendingSkills[r.id]??''};}
   if(type==='choose-complication')Object.assign(command,{shipId:data.shipId,choiceId:data.choiceId,optionId:data.optionId});if(type==='retarget')Object.assign(command,{shipId:data.shipId,targetId:data.targetId});
   if(type==='assign-station')Object.assign(command,{station:data.station,actorId:data.actorId});
   if(type==='fire')command.batteryId=data.batteryId;if(['attack','damage'].includes(type))command.shipId=s.attacks[s.attackIndex].shipId;
   const visual=this.resolutionOnly&&['resolve-card','play','roll-crew'].includes(type)?this.element.querySelector('.round-art-card'):null,rect=visual?.getBoundingClientRect(),snapshot=visual?.cloneNode(true);
   const fresh=api.state(),result=await api.request({encounterId:fresh?.id,revision:fresh?.revision,...command});this.selections.clear();if(snapshot&&fresh.ships[this.shipId]?.hand.includes(this.inspectId)&&!result.ships[this.shipId]?.hand.includes(this.inspectId))void this.effectsEngine.flyCard({getBoundingClientRect:()=>rect,cloneNode:()=>snapshot.cloneNode(true)},dock?.element?.querySelector('.round-discard-pile'));alphaSound(['lock','lock-cards'].includes(type)?'commit':type==='draw-round'?'ready':'select');
   if(type==='queue-card'&&this.resolutionOnly)await this.close();if(['start','reset'].includes(type))await openRoundTracker();if(result?.phase==='planning')clearAlphaOverlay();
  }catch(e){this.error=e.message;ui.notifications.warn(e.message);}finally{this.busy=false;if(this.rendered)await this.render({force:true});}
 }
}
export class AlphaRoundCardWindow extends AlphaRoundDeckWindow{
 static DEFAULT_OPTIONS={id:'arkflight-round-card',classes:['arkflight-alpha-combat','alpha-command-deck','arkflight-round-deck','round-portrait-window'],window:{title:'Arkflight · Station card',icon:'fa-solid fa-dice-d20',resizable:true},position:{width:420,height:660}};
 resolutionOnly=true;constructor(o={}){super({...o,position:alphaWindowPosition(420,660,o.position)});}
}
export async function openRoundCard(shipId,instanceId){portrait??=new AlphaRoundCardWindow();portrait.shipId=shipId;portrait.inspectId=instanceId;await portrait.render({force:true});if(portrait.minimized)await portrait.maximize();portrait.bringToFront();return portrait;}
export class AlphaRoundTrackerWindow extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'arkflight-round-tracker',classes:['arkflight-alpha-combat','alpha-command-deck','round-tracker-window'],window:{title:'Arkflight · Round',resizable:true},position:{width:620,height:150,left:80,top:65}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-round-tracker.hbs'}};
 async _prepareContext(){const s=game.arkflight.alphaCombat.state();return{s,label:labels[s?.phase],steps:roundPhaseSteps(s),rows:s?.roundFlow===2?roundReadiness(s):[]};}
 async _onRender(){this.element.querySelector('[data-round-open]')?.addEventListener('click',()=>void openRoundDeck());}
}
export async function openRoundTracker(){tracker??=new AlphaRoundTrackerWindow();await tracker.render({force:true});if(tracker.minimized)await tracker.maximize();return tracker;}
export async function openRoundDeck(){dock??=new AlphaRoundDeckWindow();await dock.render({force:true});if(dock.minimized)await dock.maximize();dock.bringToFront();await openRoundTracker();return dock;}
Hooks.once('init',()=>game.settings.registerMenu('arkflight-game','roundDeckWindow',{name:'Arkflight · Crew card table',label:'Open crew card table',icon:'fa-solid fa-layer-group',type:AlphaRoundDeckWindow,restricted:false}));
Hooks.once('ready',()=>{
 const api=game.arkflight.alphaCombat,d=Object.getOwnPropertyDescriptors(api);delete d.open;
 game.arkflight.alphaCombat=Object.freeze(Object.defineProperties({open:async({tab}={})=>tab==='tracker'?openRoundTracker():openRoundDeck()},d));
 // Compatibility for existing macros: every combat launcher opens the same current table.
 game.arkflight.cardCombat=Object.freeze({open:openRoundDeck,state:()=>null,openGuidedDemo:()=>game.arkflight.alphaCombat.guided.open()});
 game.arkflight.openCombatConsole=openRoundDeck;game.arkflight.combatConsole=Object.freeze({open:openRoundDeck,get application(){return dock;}});
});
let lastPrompt;
Hooks.on('arkflightAlphaChanged',()=>{for(const w of [dock,tracker,portrait])if(w?.rendered&&!w.busy)void w.render({force:true});const api=game.arkflight?.alphaCombat,s=api?.state(),r=s?.pendingCrewAction;if(s?.roundFlow===2&&r&&r.id!==lastPrompt&&api.canOperate(r.shipId,r.station)){lastPrompt=r.id;void openRoundCard(r.shipId,r.command.instanceId??null);}});
