import {complicationCheckModifier} from "../combat/ship-complications.js";
import {AlphaCombatWindow,alphaCardArt} from './alpha-combat-ui.js';
import {ALPHA_CARDS,ALPHA_SKILLS} from '../alpha/cards.js';
import {alphaCardFor,alphaTargetLegal,alphaRangeBand,alphaComplications} from '../alpha/combat.js';
import {legalHullManeuvers} from '../alpha/maneuvers.js';
import {currentPlannedCard,roundReadiness} from '../alpha/round-flow.js';
import {cardBand,cardTheme,cardOutcomes,stationName} from './alpha-combat-presentation.js';
import {alphaWindowPosition,bindAlphaPreferences,alphaSound} from './alpha-combat-effects.js';
import {showAlphaBattery,showAlphaManeuver,clearAlphaOverlay,alphaBatteryVisible} from './alpha-combat-overlays.js';
import {roundRecap,roundRecapHTML,recapEscape} from '../foundry/alpha-round-journal.js';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
let dock,tracker,portrait;
const cardScenes={patch:"patch-hull",shield:"shield-pulse","all-hands":"all-hands-broadside"};
export const alphaCardScene=card=>`modules/arkflight-game/assets/ui/canvas-hud/${cardScenes[card.id]??`${card.stations[0]}-scene`}.webp`;
const labels={opening:'Opening hand',draw:'Draw',planning:'Maneuver','card-planning':'Plan cards',resolving:'Station rolls',firing:'Firing',response:'Instant response',retarget:'Retarget',damage:'Damage',cleanup:'Round recap',complete:'Encounter ended',boarding:'Boarding'};
export function roundPhaseSteps(s){const phases=[s?.round===1?'opening':'draw','planning','card-planning','resolving','firing','cleanup'],current=phases.indexOf(['response','retarget','damage'].includes(s?.phase)?'firing':s?.phase);return phases.map((id,i)=>({id,label:labels[id],active:i===current,done:i<current,number:i+1}));}
export function fleetManeuverSummary(s){return Object.values(s.ships).filter(ship=>ship.resources.hull.value>0).map(ship=>{const id=s.plans[ship.id],route=legalHullManeuvers(ship,alphaComplications(s,ship.id)).find(r=>r.id===id);return {shipId:ship.id,name:ship.name,routeId:id,routeName:route?.name??'No legal saved route',description:route?.description??'Choose a template again',locked:!!s.locked[ship.id]};});}
export class AlphaRoundDeckWindow extends AlphaCombatWindow{
 static DEFAULT_OPTIONS={id:'arkflight-round-deck',classes:['arkflight-alpha-combat','alpha-command-deck','arkflight-round-deck'],window:{title:'Arkflight · Canvas command HUD',frame:false,resizable:false},position:{width:960,height:450}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-round-deck.hbs'}};
 followPhase=false;resolutionOnly=false;movePromptKey=null;recapKey=null;
 constructor(o={}){super({...o,position:alphaWindowPosition(960,450,o.position)});}
 async _prepareContext(options){
  const api=game.arkflight.alphaCombat,s=api.state(),request=s?.pendingCrewAction,row=currentPlannedCard(s??{ships:{},turnOrder:[],turnIndex:0});
  if(!this.resolutionOnly&&s?.phase==='firing'){const key=`${s.id}:${s.round}:${s.firingIndex}`;if(this.firingFocusKey!==key){this.firingFocusKey=key;const active=s.turnOrder[s.firingIndex];if(api.ownsShip(active))this.shipId=active;}}
  if(this.resolutionOnly&&!this.guidedHold&&s?.roundFlow===2){if(request&&api.ownsShip(request.shipId)){this.shipId=request.shipId;this.inspectId=request.command.instanceId??null;}else if(s.phase==='resolving'&&!s.cardFollowup&&row&&api.ownsShip(s.turnOrder[s.turnIndex])){this.shipId=s.turnOrder[s.turnIndex];this.inspectId=row.instanceId;}}
  const draftKey=`${s?.id??'none'}:${s?.round??0}`;if(this.maneuverDraftKey!==draftKey){this.maneuverDraftKey=draftKey;this.maneuvers={};}
  const c=await super._prepareContext(options),ship=c.ship,phase=s?.phase,plan=s?.cardPlans?.[ship?.id]??[],planned=new Set(plan.filter(r=>!r.resolved).map(r=>r.instanceId));
  let card=c.card;if(this.resolutionOnly&&this.inspectId&&ship){const raw=alphaCardFor(ship,this.inspectId);if(raw)card={...raw,instanceId:this.inspectId,sceneArt:alphaCardScene(raw),art:alphaCardArt(raw),band:cardBand(raw),theme:cardTheme(raw),outcomes:cardOutcomes(raw),stationLabel:raw.stations.map(stationName).join(' + '),needsBattery:raw.role==='Attack'||raw.id==='work-guns',attackOnly:raw.role==='Attack'&&raw.stations.length===1,movementCard:['helm','ahead','breakaway'].includes(raw.id)};}
  const station=request?.station??(this.guidedAttackId?'battlewatch':card?.stations[0])??'captain',chosen=request?this.pendingSkills[request.id]??'':this.skills[station]??'',actor=ship&&game.actors.get(ship.stationActors[station]);
  let breakdown;if((card||request||this.guidedAttackId)&&chosen&&ship){try{breakdown=await api.crewCheck(ship.id,station,chosen);}catch(e){breakdown={error:e.message};}}
  const pending=(this.guidedAttackId?s?.attacks?.find(a=>a.id===this.guidedAttackId):null)??s?.attacks?.[s.attackIndex],firingShip=s?.turnOrder?.[s.firingIndex],responding=phase==='response'&&pending?.targetId===ship?.id&&!pending.responses[ship.id],allowed=ship&&api.canOperate(ship.id,station);
  if(breakdown&&!breakdown.error){
   const attack=request?.kind==='attack'||this.guidedAttackId?pending:null,mods=complicationCheckModifier(s.complications,ship.id,attack?'battery-attack':station,{batteryId:attack?.batteryId,coordinated:!!attack&&['volley','all-hands','breakaway'].includes(attack.cardId)}),morale=ship.resources.morale.value<=25?-2:ship.resources.morale.value<=50?-1:0;
   const penalty=Math.min(mods.amount,morale);let bonus=0,range=0,dc=ship.profile.dc;
   if(attack){const target=s.ships[attack.targetId],effects=s.complications.effects.filter(e=>e.forAttack===attack.id&&e.claimedBy);bonus=Math.max(attack.accuracy??0,...ship.effects.filter(e=>e.kind==='accuracy').map(e=>e.amount))+Math.max(0,...effects.filter(e=>e.rule==='attack-opening').map(e=>e.value));range=alphaRangeBand(s,ship.id,attack.batteryId,target.id).penalty;dc=target.profile.ac+Math.max(0,...target.effects.filter(e=>e.kind==='ac').map(e=>e.amount))+Math.max(0,...effects.filter(e=>e.rule==='defensive-opening').map(e=>e.value));}
   const total=breakdown.modifier+penalty+bonus+range;breakdown={...breakdown,modifier:total,modifierText:`${total>=0?'+':''}${total}`,dc,dcLabel:attack?'Target AC':'Support DC',components:[...breakdown.components,{label:'Morale / complication (strongest)',value:penalty},...(attack?[{label:'Action accuracy',value:bonus},{label:'Range band',value:range}]:[])]};
  }
  const followup=s?.cardFollowup===ship?.id;
  const resolving=phase==='resolving'&&s.turnOrder[s.turnIndex]===ship?.id&&row?.instanceId===this.inspectId;
  const receipt=card?[...(s?.log??[])].reverse().find(e=>e.detail?.instanceId===card.instanceId&&e.detail.shipId===ship?.id)?.detail:this.guidedAttackId?pending?.hit:null;
  const primary=[...game.users].filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id===game.user.id;
  const guidedRunning=s?.guidedTest?.status==='running'&&!s.guidedTest.manual;
  const selectedManeuver=this.maneuvers[ship?.id]??s?.plans?.[ship?.id];
  const crewRail=Object.entries(ALPHA_SKILLS).map(([station])=>{const a=game.actors.get(ship?.stationActors[station]);return {station,label:stationName(station),actorId:a?.id,name:a?.name??'Unassigned',img:a?.img,pending:request?.station===station&&request.shipId===ship?.id};});
  const choice=s?.pendingCardChoice,canChoose=choice&&choice.shipId===ship?.id&&api.canOperate(ship.id,choice.station);
  const context={...c,crewVisible:game.settings.get('arkflight-game','alphaCrewVisible')??false,shipArt:game.actors.get(ship?.actorId)?.img,
   meters:c.meters.map(m=>({...m,icon:({hull:'fa-shield-halved',lifeveil:'fa-droplet',morale:'fa-flag',strain:'fa-bolt',supplies:'fa-boxes-stacked'})[m.name],segments:Array.from({length:10},(_,i)=>({filled:i<Math.ceil(m.percent/10)}))})),
   routes:c.routes.map(r=>({...r,selected:r.id===selectedManeuver})),route:selectedManeuver?c.route:null,canLock:c.canLock&&!!selectedManeuver,followup,hudHidden:this.hudHidden??false,phaseSteps:roundPhaseSteps(s),readiness:s?roundReadiness(s):[],crewRail,cardChoice:canChoose?{...choice,options:choice.options.map(id=>({id,name:ALPHA_CARDS[ship.instances[id]].name,art:alphaCardArt(ALPHA_CARDS[ship.instances[id]])}))}:null,guidedRunning,guidedTest:s?.guidedTest,crewPanel:this.crewPanel??false,canAssignCrew:game.user.isGM&&['opening','planning','card-planning','cleanup'].includes(phase),card,panelOnly:this.resolutionOnly,roundFlow:s?.roundFlow===2,phaseLabel:labels[phase]??'Take command',
   hand:c.hand.map((h,i)=>({...h,sceneArt:alphaCardScene(h),tilt:Math.max(-4,Math.min(4,(i-(c.hand.length-1)/2)*1.25)),queued:planned.has(h.instanceId),respondable:responding&&h.timing==='instant'&&ship.ap>=h.ap&&api.canOperate(ship.id,h.stations[0])&&(h.id!=='shield'||ship.resources.lifeveil.value>=5)})),
   opening:phase==='opening',drawStep:phase==='draw',canDraw:phase==='draw'&&ship&&ship.drawnRound!==s.round,maneuverStep:phase==='planning',planningCards:phase==='card-planning'||followup,resolvingCards:phase==='resolving'&&!followup,firing:phase==='firing',damageStep:phase==='damage',recap:phase==='cleanup'||s?.complete,
   canMulligan:phase==='opening'&&ship&&!ship.mulliganDone,planLocked:!followup&&s?.cardLocks?.[ship?.id],committedAP:plan.reduce((n,r)=>n+r.cost,0),
   cardPlans:plan.map((r,i)=>({...r,index:i+1,name:ALPHA_CARDS[ship.instances[r.instanceId]].name,canRemove:phase==='card-planning'&&!s.cardLocks[ship.id],first:i===0,last:i===plan.length-1})),
   canLockCards:ship&&api.canOperate(ship.id,'captain')&&(followup||!s?.cardLocks?.[ship.id]),canQueue:card&&(phase==='card-planning'||followup&&s.followupCards.includes(card.instanceId))&&(followup||!s.cardLocks[ship?.id])&&!plan.some(r=>r.instanceId===card.instanceId)&&card.timing!=='instant'&&ship.ap>=card.ap,
   isOwnResolve:resolving,canResolve:resolving&&allowed&&!!chosen,canSkip:resolving&&api.canOperate(ship.id,'captain'),canInstant:card&&responding&&card.timing==='instant'&&allowed&&ship.ap>=card.ap&&!!chosen,
   canSubmitRoll:request?api.canOperate(request.shipId,request.station)&&!!chosen:allowed&&!!chosen,requestId:request?.id,skills:ALPHA_SKILLS[station].map(id=>({id,name:id,selected:id===chosen})),breakdown,crewActor:actor?.name??'Ship crew',crewPortrait:actor?.img,receipt,
   canFireNow:phase==='firing'&&firingShip===ship?.id&&api.canOperate(ship.id,'battlewatch')&&ship.ap>=1,canFinishFiring:phase==='firing'&&firingShip===ship?.id&&api.canOperate(ship.id,'captain'),canAttack:phase==='response'&&!request&&pending?.responses[pending.targetId]&&api.canOperate(pending.shipId,'battlewatch'),canDamage:phase==='damage'&&api.canOperate(pending?.shipId,'battlewatch'),hit:pending?.hit,
   discardCards:(ship?.discard??[]).map(id=>({id,name:ALPHA_CARDS[ship.instances[id]].name})),
   orders:(s?.attacks??[]).filter(a=>a.shipId===ship?.id&&!a.resolved).map(a=>({...a,name:ship.batteries.find(b=>b.id===a.batteryId)?.name??a.batteryId,targets:Object.values(s.ships).filter(t=>alphaTargetLegal(s,ship.id,a.batteryId,t.id)).map(t=>{const r=alphaRangeBand(s,ship.id,a.batteryId,t.id);return{id:t.id,name:`${t.name} · ${r.distance} hex · ${r.penalty} range`,selected:a.targetId===t.id};})})),
   canInspectCurrent:s&&api.ownsShip(s.turnOrder[s.turnIndex]),primary,allLocked:phase==='planning'&&roundReadiness(s).every(r=>r.ready),currentCardName:row&&s?ALPHA_CARDS[s.ships[s.turnOrder[s.turnIndex]].instances[row.instanceId]]?.name??'Enemy station action':'',
   phaseInstruction:followup?'Newly drawn cards may join your orders. Commit or keep them, then lock.':request?`Waiting for ${c.crewRequest.actorName} to roll.`:({opening:'Keep your hand or replace up to two cards.',draw:'Click the deck to draw this round’s card.',planning:'Choose a course. Movement waits until every ship locks.','card-planning':'Commit cards in order. Keep AP for firing and Instants.',resolving:`${s?.ships[s?.turnOrder?.[s?.turnIndex]]?.name??''} · resolve the next queued card.`,firing:`${s?.ships[firingShip]?.name??''} · choose weapons and targets.`,response:'Respond to incoming fire or pass.',damage:'The attack die is saved. Resolve damage without rerolling.',cleanup:'Discard overflow, review the round and start the next.'}[phase]??'Choose your ship.'),
   unsettled:!!s?.pendingCardChoice||!!s?.pendingDiscard||!!s?.pendingCrewAction||s?.complications?.choices.some(x=>x.status==='pending'),recapNarrative:s?.roundFlow===2?roundRecap(s).narrative:[],recapLines:(s?.roundEvents??s?.log??[]).filter(e=>e.round===s?.round),journal:s?.roundJournal,
   showHand:!!ship,drawCount:ship?.drawCount??ship?.drawPile.length??0};
  if(c.choices.length)for(const key of ['canResolve','canQueue','canAttack','canDamage','canFireNow','canFinishFiring','canLockCards','canInstant','canSubmitRoll'])context[key]=false;
  if(guidedRunning)for(const key of ['canAssignCrew','canMulligan','canQueue','canLockCards','canPlan','canLock','canFireNow','canFinishFiring','canResolve','canSubmitRoll','canRespond','canAttack','canDamage','canSkip','canDraw'])context[key]=false;
  context.batteries=c.batteries.map(b=>{const hasLegalTarget=Object.keys(s?.ships??{}).some(id=>alphaTargetLegal(s,ship.id,b.id,id));return {...b,arcVisible:alphaBatteryVisible(s,ship.id,b.id),hasLegalTarget,canCommit:!!context.canFireNow&&b.ready&&hasLegalTarget};});
  return context;
 }
 async _onRender(c){
  const root=this.element;if(!this.resolutionOnly){const side=document.querySelector('#sidebar')?.getBoundingClientRect(),tools=document.querySelector('#controls')?.getBoundingClientRect();root.style.setProperty('--hud-right',`${Math.max(18,side?.width?innerWidth-side.left+14:18)}px`);root.style.setProperty('--hud-left',`${Math.max(16,(tools?.right??54)+12)}px`);root.dataset.crewOpen=String(!!c.crewVisible);root.classList.toggle('hud-is-hidden',!!this.hudHidden);root.dataset.hudPhase=c.s?.phase??'welcome';}
  bindAlphaPreferences(root,()=>this.render({force:true}));
  for(const el of root.querySelectorAll('[data-alpha-assign]'))el.addEventListener('change',()=>void this.roundAction('assign-station',{station:el.dataset.alphaAssign,actorId:el.value}));
  root.querySelector('[data-alpha-ship]')?.addEventListener('change',e=>{this.shipId=e.target.value;clearAlphaOverlay();this.inspectId=null;this.selections.clear();void this.render({force:true});});
  for(const el of root.querySelectorAll('[data-round-action]'))el.addEventListener('click',()=>void this.roundAction(el.dataset.roundAction,el.dataset));
  for(const el of root.querySelectorAll('[data-alpha-card]'))el.addEventListener('click',()=>{const id=el.dataset.alphaCard;if(c.opening&&c.canMulligan||c.pendingDiscard){if(c.pendingDiscard&&c.hand.find(h=>h.instanceId===id)?.queued)return;if(this.selections.has(id))this.selections.delete(id);else this.selections.add(id);alphaSound('select');void this.render({force:true});}else void openRoundCard(this.shipId,id);});
  root.querySelector('[data-round-skill]')?.addEventListener('change',e=>{if(c.requestId)this.pendingSkills[c.requestId]=e.target.value;else this.skills[c.card?.stations[0]??'battlewatch']=e.target.value;void this.render({force:true});});
  for(const el of root.querySelectorAll('[data-round-order]'))el.addEventListener('change',()=>void this.roundAction('target',{attackId:el.dataset.roundOrder,targetId:el.value}));
  for(const el of root.querySelectorAll('[data-round-build]'))el.addEventListener('change',()=>{this.build[el.dataset.roundBuild]=['count','level'].includes(el.dataset.roundBuild)?Number(el.value):el.value;void this.render({force:true});});
  for(const [selector,key] of [['[data-alpha-battery]','batteryId'],['[data-alpha-adjustment]','adjustment'],['[data-alpha-target]','targetId']])root.querySelector(selector)?.addEventListener('change',e=>{this[key]=e.target.value;});
  const hand=root.querySelector('.round-hand');if(hand)hand.scrollLeft=this.restoreScroll?.hand??0;this.effectsEngine.update(root,c.s,c.ship?.id);
  if(!this.resolutionOnly&&!c.guidedRunning&&c.primary&&c.allLocked&&!this.busy&&this.movePromptKey!==`${c.s.id}:${c.s.round}`){this.movePromptKey=`${c.s.id}:${c.s.round}`;queueMicrotask(()=>void this.roundAction('confirm-move'));}
  if(!this.resolutionOnly&&c.recap&&!c.unsettled&&c.s?.roundFlow===2&&this.recapKey!==`${c.s.id}:${c.s.round}`){this.recapKey=`${c.s.id}:${c.s.round}`;const journal=c.journal?`<p>Journal ${recapEscape(c.journal.journalId)} · Page ${recapEscape(c.journal.pageId)}</p>`:'<p>Journal pending; recap retained for retry.</p>';if(foundry.applications.api.DialogV2?.prompt)queueMicrotask(()=>void foundry.applications.api.DialogV2.prompt({window:{title:`Round ${c.s.round} · Ship’s log`},content:roundRecapHTML(c.s)+journal,ok:{label:'Return to battle'}}).catch(()=>{}));}
 }
 async roundAction(type,data={}){
  if(this.busy)return;const api=game.arkflight.alphaCombat,s=api.state(),ship=s?.ships[data.shipId??this.shipId];
  if(type==='open-complications'){await syncComplicationWindow(true);return;}
  if(type==='guided-test'){await api.guided.open();return;}if(type==='download-debug'){api.guided.download();return;}
  if(type==='inspect-attack'){const a=s.attacks[s.attackIndex];await openRoundCard(a.shipId,null,{attackId:a.id});return;}
  if(type==='inspect-current'){const row=currentPlannedCard(s);if(row&&api.ownsShip(s.turnOrder[s.turnIndex]))await openRoundCard(s.turnOrder[s.turnIndex],row.instanceId);return;}
  if(type==='toggle-crew'){const visible=game.settings.get('arkflight-game','alphaCrewVisible')??false;await game.settings.set('arkflight-game','alphaCrewVisible',!visible);await this.render({force:true});return;}
  if(type==='toggle-hud'){this.hudHidden=!this.hudHidden;await this.render({force:true});return;}
  if(type==='sheet'||type==='crew-sheet'){const actor=game.actors.get(type==='sheet'?ship?.actorId:data.actorId);if(actor)await actor.sheet.render(true);return;}
  if(type==='weapons'){this.weaponsOpen=!this.weaponsOpen;await this.render({force:true});return;}
  if(type==='close-card'){await this.close();return;}if(type==='minimize'){if(!this.resolutionOnly){this.hudHidden=true;await this.render({force:true});}else await this.minimize();return;}if(type==='tracker'){await openRoundTracker();return;}
  if(type==='library'){await api.library.open(ship?.actorId);return;}if(type==='crew'){this.crewPanel=!this.crewPanel;await this.render({force:true});return;}if(type==='open-journal'){await game.journal.get(s.roundJournal.journalId)?.sheet.render(true);return;}
  if(type==='arcs'){showAlphaBattery(s,ship.id,data.batteryId);await this.render({force:true});return;}if(type==='clear-arcs'){clearAlphaOverlay();await this.render({force:true});return;}
  if(type==='route'){const route=legalHullManeuvers(ship,alphaComplications(s,ship.id)).find(r=>r.id===data.route);if(!route){ui.notifications.warn('Choose a legal template for this ship.');return;}this.maneuvers[ship.id]=data.route;showAlphaManeuver(s,ship.id,route);alphaSound('select');await this.render({force:true});return;}
  if(type==='confirm-move'){const users=[...game.users].map(u=>`${recapEscape(u.name??u.id)} — ${u.active?'connected':'offline'}`).join('<br>');const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Reveal fleet maneuvers'},content:`<p>All ships locked. Check each saved route before moving:</p><ul>${fleetManeuverSummary(s).map(r=>`<li><b>${recapEscape(r.name)}</b>: ${recapEscape(r.routeName)}<br>${recapEscape(r.description)}</li>`).join('')}</ul><p>Ships move together in time, following their own templates. Collisions or conditions can shorten a route.</p><p>${users}</p>`,yes:{label:'Yes · move fleet'},no:{label:'No · wait'}}):globalThis.confirm('All ships locked. Move the fleet together?');api.guided?.record({kind:'fleet route confirmation',accepted:yes,routes:fleetManeuverSummary(s)});if(!yes)return;type='move';}
  if(type==='reset'){const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Restart test encounter'},content:'<p>Restart with fresh hands and resources? Keep libraries, loadouts and crew.</p>'}):globalThis.confirm('Restart test encounter?');if(!yes)return;}
  this.busy=true;this.error='';
  try{
   let command={type,shipId:ship?.id??this.shipId};
   if(type==='start')command={type,roundFlow:2,...this.build};if(type==='reset')command={type,roundFlow:2};
   if(type==='lock'&&api.canOperate(ship.id,'navigator')){if(!(this.maneuvers[ship.id]??s.plans[ship.id]))throw Error('Choose a maneuver template for this ship this round before locking.');const a=api.state();await api.request({type:'plan',shipId:ship.id,encounterId:a.id,revision:a.revision,maneuverId:this.maneuvers[ship.id]??s.plans[ship.id]??'hold'});}
   if(type==='plan'){command.maneuverId=this.maneuvers[ship.id]??s.plans[ship.id];if(!command.maneuverId)throw Error('Choose a maneuver template for this ship this round.');}if(['mulligan','discard'].includes(type))command.instances=[...this.selections];
   if(type==='queue-card')Object.assign(command,{instanceId:this.inspectId,batteryId:this.batteryId,adjustment:this.adjustment,targetId:this.targetId});
   if(['unqueue-card','move-card','hold-order','target'].includes(type))Object.assign(command,{instanceId:data.instanceId,direction:Number(data.direction),attackId:data.attackId,targetId:data.targetId});
   if(['resolve-card','skip-card','play'].includes(type)){const card=alphaCardFor(ship,this.inspectId);Object.assign(command,{instanceId:this.inspectId,skill:this.skills[card.stations[0]]??'',batteryId:this.batteryId,adjustment:this.adjustment});}
   if(['roll-crew','cancel-crew'].includes(type)){const r=api.state().pendingCrewAction;command={type,requestId:r.id,shipId:r.shipId,skill:this.pendingSkills[r.id]??''};}
   if(type==='choose-complication')Object.assign(command,{shipId:data.shipId,choiceId:data.choiceId,optionId:data.optionId});if(type==='retarget')Object.assign(command,{shipId:data.shipId,targetId:data.targetId});
   if(type==='choose-card')command.instanceId=data.instanceId;
   if(type==='assign-station')Object.assign(command,{station:data.station,actorId:data.actorId});
   if(type==='attack')command.skill=this.skills.battlewatch;
   if(type==='fire')command.batteryId=data.batteryId;if(['attack','damage'].includes(type))command.shipId=s.attacks[s.attackIndex].shipId;
   const visual=this.resolutionOnly&&['resolve-card','play','roll-crew'].includes(type)?this.element.querySelector('.round-art-card'):null,rect=visual?.getBoundingClientRect(),snapshot=visual?.cloneNode(true);
   const fresh=api.state(),result=await api.request({encounterId:fresh?.id,revision:fresh?.revision,...command});this.selections.clear();if(snapshot&&fresh.ships[this.shipId]?.hand.includes(this.inspectId)&&!result.ships[this.shipId]?.hand.includes(this.inspectId))void this.effectsEngine.flyCard({getBoundingClientRect:()=>rect,cloneNode:()=>snapshot.cloneNode(true)},dock?.element?.querySelector('.round-discard-pile'));if(['lock','lock-cards','queue-card'].includes(type))alphaSound('lock');else if(type==='draw-round')alphaSound('ready');
   if(type==='queue-card'&&this.resolutionOnly)await this.close();if(['start','reset'].includes(type))await openRoundTracker();if(result?.phase==='planning')clearAlphaOverlay();
  }catch(e){this.error=e.message;ui.notifications.warn(e.message);}finally{this.busy=false;if(this.rendered)await this.render({force:true});}
 }
}
export class AlphaRoundCardWindow extends AlphaRoundDeckWindow{
 static DEFAULT_OPTIONS={id:'arkflight-round-card',classes:['arkflight-alpha-combat','alpha-command-deck','arkflight-round-deck','round-portrait-window'],window:{frame:true,title:'Arkflight · Station card',icon:'fa-solid fa-dice-d20',resizable:true},position:{width:420,height:660}};
 resolutionOnly=true;constructor(o={}){super({...o,position:alphaWindowPosition(420,660,o.position)});}
}
export async function openRoundCard(shipId,instanceId,{hold=false,attackId=null}={}){portrait??=new AlphaRoundCardWindow();portrait.shipId=shipId;portrait.inspectId=instanceId;portrait.guidedHold=hold;portrait.guidedAttackId=attackId;await portrait.render({force:true});if(portrait.minimized)await portrait.maximize();portrait.bringToFront();return portrait;}
export class AlphaRoundTrackerWindow extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'arkflight-round-tracker',classes:['arkflight-alpha-combat','alpha-command-deck','round-tracker-window'],window:{title:'Arkflight · Round',resizable:true},position:{width:620,height:150,left:80,top:65}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-round-tracker.hbs'}};
 async _prepareContext(){const s=game.arkflight.alphaCombat.state();return{s,label:labels[s?.phase],steps:roundPhaseSteps(s),rows:s?.roundFlow===2?roundReadiness(s):[]};}
 async _onRender(){this.element.querySelector('[data-round-open]')?.addEventListener('click',()=>void openRoundDeck());}
}
export async function openRoundTracker(){if(tracker?.rendered)await tracker.close();return openRoundDeck(false);}
export async function focusRoundShip(id){if(dock&&id){dock.shipId=id;await dock.render({force:true});}return dock;}
export async function foldRoundCard(){if(portrait?.rendered&&!portrait.minimized)await portrait.minimize();}
export async function openRoundDeck(reveal=true){dock??=new AlphaRoundDeckWindow();if(reveal)dock.hudHidden=false;await dock.render({force:true});if(dock.minimized)await dock.maximize();dock.bringToFront();return dock;}
Hooks.once('init',()=>game.settings.registerMenu('arkflight-game','roundDeckWindow',{name:'Arkflight · Crew card table',label:'Open crew card table',icon:'fa-solid fa-layer-group',type:AlphaRoundDeckWindow,restricted:false}));
Hooks.once('ready',()=>{
 const api=game.arkflight.alphaCombat,d=Object.getOwnPropertyDescriptors(api);delete d.open;
 game.arkflight.alphaCombat=Object.freeze(Object.defineProperties({open:async({tab}={})=>tab==='tracker'?openRoundTracker():openRoundDeck()},d));
 // Compatibility for existing macros: every combat launcher opens the same current table.
 game.arkflight.cardCombat=Object.freeze({open:openRoundDeck,state:()=>null,openGuidedDemo:()=>game.arkflight.alphaCombat.guided.open()});
 game.arkflight.openCombatConsole=openRoundDeck;game.arkflight.combatConsole=Object.freeze({open:openRoundDeck,get application(){return dock;}});
});
let lastPrompt;
Hooks.on('arkflightAlphaChanged',()=>{void syncComplicationWindow();const state=game.arkflight?.alphaCombat?.state();if(state?.roundFlow===2&&!state.complete&&(!dock?.rendered))void openRoundDeck(false);if(state?.complete&&dock){dock.hudHidden=true;if(portrait?.rendered)void portrait.close();}for(const w of [dock,tracker,portrait])if(w?.rendered&&!w.busy)void w.render({force:true});const api=game.arkflight?.alphaCombat,s=api?.state(),r=s?.pendingCrewAction;if(s?.roundFlow===2&&r&&r.id!==lastPrompt&&api.canOperate(r.shipId,r.station)){lastPrompt=r.id;void openRoundCard(r.shipId,r.command.instanceId??null);}});

Hooks.on('renderTokenHUD',(hud,html)=>{
 const actor=hud.object?.actor??hud.object?.document?.actor;if(!actor?.flags?.['arkflight-game']?.alphaCombatShip&&!actor?.flags?.['arkflight-game']?.ship)return;
 const root=html?.querySelector?html:html?.[0],column=root?.querySelector('.col.right');if(!column||column.querySelector('[data-arkflight-crew-table]'))return;
 const button=document.createElement('button');button.type='button';button.className='control-icon';button.dataset.arkflightCrewTable='true';button.title='Open Arkflight crew card table';button.setAttribute('aria-label',button.title);button.innerHTML='<i class="fa-solid fa-layer-group" aria-hidden="true"></i>';
 button.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();await openRoundDeck();const s=game.arkflight.alphaCombat.state(),ship=Object.values(s?.ships??{}).find(x=>x.actorId===actor.id);if(ship&&game.arkflight.alphaCombat.ownsShip(ship.id))await focusRoundShip(ship.id);});column.append(button);
});

Hooks.once('ready',()=>{const s=game.arkflight?.alphaCombat?.state();if(s?.roundFlow===2&&!s.complete)void openRoundDeck(false);});

let complicationWindow;
export class AlphaComplicationWindow extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'arkflight-complication-choice',classes:['arkflight-alpha-combat','arkflight-complication-choice'],window:{title:'Arkflight · Resolve Complication',icon:'fa-solid fa-triangle-exclamation',resizable:true},position:{width:470,height:360}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-complication-choice.hbs'}};
 busy=false;error='';
 async _prepareContext(){const api=game.arkflight.alphaCombat,s=api.state(),choice=s?.complications.choices.find(c=>c.status==='pending'&&api.ownsShip(c.shipId));const row=choice&&(await import('../combat/ship-complications.js')).complicationChoiceOptions(s.complications,choice.id);const receipt=choice&&s.complications.history.find(r=>r.id===choice.receiptId);return{choice,receipt,ship:choice&&s.ships[choice.shipId].name,options:row,busy:this.busy,error:this.error};}
 async _onRender(){for(const button of this.element.querySelectorAll('[data-complication-option]'))button.addEventListener('click',()=>void this.choose(button.dataset));}
 async choose(data){if(this.busy)return;this.busy=true;this.error='';try{const api=game.arkflight.alphaCombat,s=api.state();await api.request({type:'choose-complication',shipId:data.shipId,choiceId:data.choiceId,optionId:data.complicationOption,encounterId:s.id,revision:s.revision});}catch(error){this.error=error.message;}finally{this.busy=false;await syncComplicationWindow(true);}}
}
export async function syncComplicationWindow(force=false){const api=game.arkflight?.alphaCombat,s=api?.state(),choice=s?.complications.choices.find(c=>c.status==='pending'&&api.ownsShip(c.shipId));if(complicationWindow?.busy)return;if(!choice){if(complicationWindow?.rendered)await complicationWindow.close();return;}complicationWindow??=new AlphaComplicationWindow();if(force||!complicationWindow.rendered||complicationWindow.choiceId!==choice.id){complicationWindow.choiceId=choice.id;await complicationWindow.render({force:true});complicationWindow.bringToFront();}}
Hooks.once('ready',()=>void syncComplicationWindow());

Hooks.once('init',()=>game.settings.register('arkflight-game','alphaCrewVisible',{scope:'client',config:false,type:Boolean,default:false}));
