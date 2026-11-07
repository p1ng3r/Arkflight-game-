import {usableInstant} from "./alpha-instant-readiness.js";
export {usableInstant} from "./alpha-instant-readiness.js";
import {openHudTools} from './alpha-hud-tools.js';
import {complicationCheckModifier} from "../combat/ship-complications.js";
import {AlphaCombatWindow,alphaCardArt} from './alpha-combat-ui.js';
import {ALPHA_CARDS,ALPHA_SKILLS} from '../alpha/cards.js';
import {decoratedCard} from '../alpha/card-taxonomy.js';
import {alphaCardFor,alphaTargetLegal,alphaRangeBand,alphaComplications} from '../alpha/combat.js';
import {legalHullManeuvers} from '../alpha/maneuvers.js';
import {currentPlannedCard,roundReadiness} from '../alpha/round-flow.js';
import {FOUR_BEAT_EXPERIENCE,fourBeatModel,crewCallView} from '../alpha/four-beat.js';
import {cardBand,cardTheme,cardOutcomes,stationName} from './alpha-combat-presentation.js';
import {alphaWindowPosition,bindAlphaPreferences,alphaSound} from './alpha-combat-effects.js';
import {showAlphaBattery,showAlphaTargeting,showAlphaManeuver,clearAlphaOverlay,alphaBatteryVisible} from './alpha-combat-overlays.js';
import {roundRecap,roundRecapHTML,recapEscape} from '../foundry/alpha-round-journal.js';
import {alphaRecapMarkup} from './alpha-recap-render.js';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
let dock,portrait;
export const HUD_PANELS=Object.freeze(['tracker','ship','hand','orders']);
export function hudPanelLayout(value={}){return Object.fromEntries(HUD_PANELS.map(id=>[id,value?.[id]===true]));}
const cardScenes={patch:"patch-hull",shield:"shield-pulse","all-hands":"all-hands-broadside"};

export const alphaCardScene=card=>`modules/arkflight-game/assets/ui/canvas-hud/${cardScenes[card.id]??`${card.stations[0]}-scene`}.webp`;
const labels={opening:'Opening hand',draw:'Draw',planning:'Maneuver','card-planning':'Plan cards',resolving:'Station rolls',firing:'Firing',response:'Instant response',retarget:'Retarget',damage:'Damage','draw-reveal':'Card reveal',cleanup:'Round recap',complete:'Encounter ended',boarding:'Boarding'};
export function roundPhaseSteps(s){
 if(s?.experience===FOUR_BEAT_EXPERIENCE)return fourBeatModel(s).steps;
 if(s?.combatFlow===3){
  const phases=['plan','execute','recover'],current=s.complete||s.phase==='cleanup'?2:['resolving','firing','response','retarget','damage'].includes(s.phase)?1:0;
  return phases.map((id,i)=>({id,label:id.toUpperCase(),active:i===current,done:i<current,number:i+1}));
 }
 const phases=[s?.round===1?'opening':'draw','planning','card-planning','resolving','firing','cleanup'],current=phases.indexOf(['response','retarget','damage'].includes(s?.phase)?'firing':s?.phase);
 return phases.map((id,i)=>({id,label:labels[id],active:i===current,done:i<current,number:i+1}));
}
export function fleetManeuverSummary(s){return Object.values(s.ships).filter(ship=>ship.resources.hull.value>0).map(ship=>{const id=s.plans[ship.id],route=legalHullManeuvers(ship,alphaComplications(s,ship.id)).find(r=>r.id===id);return {shipId:ship.id,name:ship.name,routeId:id,routeName:route?.name??'No legal saved route',description:route?.description??'Choose a template again',locked:!!s.locked[ship.id]};});}
export class AlphaRoundDeckWindow extends AlphaCombatWindow{
 static DEFAULT_OPTIONS={id:'arkflight-round-deck',classes:['arkflight-alpha-combat','alpha-command-deck','arkflight-round-deck'],window:{title:'Arkflight · Canvas command HUD',frame:false,resizable:false},position:{width:960,height:450}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-round-deck.hbs'}};
 weaponTargets={};helpOpen=false;followPhase=false;resolutionOnly=false;movePromptKey=null;recapKey=null;
 constructor(o={}){super({...o,position:alphaWindowPosition(960,450,o.position)});}
 async _prepareContext(options){
  const api=game.arkflight.alphaCombat,s=api.state(),request=s?.pendingCrewAction,row=currentPlannedCard(s??{ships:{},turnOrder:[],turnIndex:0});
  if(!this.resolutionOnly&&s?.phase==='firing'){const key=`${s.id}:${s.round}:${s.firingIndex}`;if(this.firingFocusKey!==key){this.firingFocusKey=key;const active=s.turnOrder[s.firingIndex];if(api.ownsShip(active))this.shipId=active;}}
  if(!this.resolutionOnly&&s?.phase==='response'){const a=s.attacks[s.attackIndex],key=`${s.id}:${a?.id}`;if(this.responseFocusKey!==key){this.responseFocusKey=key;if(a&&!a.responses[a.targetId]&&api.ownsShip(a.targetId))this.shipId=a.targetId;}}
  if(this.resolutionOnly&&!this.guidedHold&&s?.roundFlow===2){if(request&&api.ownsShip(request.shipId)){this.shipId=request.shipId;this.inspectId=request.command.instanceId??null;}else if(s.phase==='resolving'&&!s.cardFollowup&&row&&api.ownsShip(s.turnOrder[s.turnIndex])){this.shipId=s.turnOrder[s.turnIndex];this.inspectId=row.instanceId;}}
  const draftKey=`${s?.id??'none'}:${s?.round??0}`;if(this.maneuverDraftKey!==draftKey){this.maneuverDraftKey=draftKey;this.maneuvers={};}
  const c=await super._prepareContext(options),ship=c.ship,phase=s?.phase,plan=s?.cardPlans?.[ship?.id]??[],planned=new Set(plan.filter(r=>!r.resolved).map(r=>r.instanceId));
  let card=c.card;if(this.resolutionOnly&&this.inspectId&&ship){const raw=alphaCardFor(ship,this.inspectId);if(raw)card={...decoratedCard(raw),instanceId:this.inspectId,sceneArt:alphaCardScene(raw),art:alphaCardArt(raw),band:cardBand(raw),theme:cardTheme(raw),outcomes:cardOutcomes(raw),stationLabel:raw.stations.map(stationName).join(' + '),needsBattery:raw.role==='Attack'||raw.id==='work-guns',attackOnly:raw.role==='Attack'&&raw.stations.length===1,movementCard:['helm','ahead','breakaway'].includes(raw.id)};}
  const station=request?.station??(this.guidedAttackId?'battlewatch':card?.stations[0])??'captain',chosen=request?this.pendingSkills[request.id]??'':this.skills[station]??'',actor=ship&&game.actors.get(ship.stationActors[station]);
  let breakdown;if((card||request||this.guidedAttackId)&&chosen&&ship){try{breakdown=await api.crewCheck(ship.id,station,chosen);}catch(e){breakdown={error:e.message};}}
  const pending=(this.guidedAttackId?s?.attacks?.find(a=>a.id===this.guidedAttackId):null)??s?.attacks?.[s.attackIndex],firingShip=s?.turnOrder?.[s.firingIndex],responding=phase==='response'&&pending?.targetId===ship?.id&&!pending.responses[ship.id],allowed=ship&&api.canOperate(ship.id,station);
  if(breakdown&&!breakdown.error){
   const attack=request?.kind==='attack'||this.guidedAttackId?pending:null,mods=complicationCheckModifier(s.complications,ship.id,attack?'battery-attack':station,{batteryId:attack?.batteryId,coordinated:!!attack&&['volley','all-hands','breakaway'].includes(attack.cardId)}),morale=ship.resources.morale.value<=25?-2:ship.resources.morale.value<=50?-1:0;
   const penalty=Math.min(mods.amount,morale);let bonus=0,range=0,dc=ship.profile.dc;
   if(attack){const target=s.ships[attack.targetId],effects=s.complications.effects.filter(e=>e.forAttack===attack.id&&e.claimedBy);bonus=Math.max(attack.accuracy??0,...ship.effects.filter(e=>e.kind==='accuracy').map(e=>e.amount))+Math.max(0,...effects.filter(e=>e.rule==='attack-opening').map(e=>e.value));range=alphaRangeBand(s,ship.id,attack.batteryId,target.id).penalty;dc=target.profile.ac+Math.max(0,...target.effects.filter(e=>e.kind==='ac').map(e=>e.amount))+Math.max(0,...effects.filter(e=>e.rule==='defensive-opening').map(e=>e.value));}
   const total=breakdown.modifier+penalty+bonus+range;breakdown={...breakdown,modifier:total,modifierText:`${total>=0?'+':''}${total}`,dc,dcLabel:attack?'Target AC':'Support DC',components:[...breakdown.components,{label:'Morale / complication (strongest)',value:penalty},...(attack?[{label:'Action accuracy',value:bonus},{label:'Range band',value:range}]:[])]};
  }
  let gunnery=null;if(ship&&api.crewCheck){try{gunnery=await api.crewCheck(ship.id,'battlewatch',this.skills.battlewatch??ALPHA_SKILLS.battlewatch[0]);}catch{}}
  const followup=s?.cardFollowup===ship?.id;
  const resolving=phase==='resolving'&&s.turnOrder[s.turnIndex]===ship?.id&&row?.instanceId===this.inspectId;
  const receipt=card?[...(s?.log??[])].reverse().find(e=>e.detail?.instanceId===card.instanceId&&e.detail.shipId===ship?.id)?.detail:this.guidedAttackId?pending?.hit:null;
  const primary=[...game.users].filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id===game.user.id;
  const guidedRunning=s?.guidedTest?.status==='running'&&!s.guidedTest.manual;
  const selectedManeuver=this.maneuvers[ship?.id]??s?.plans?.[ship?.id];
  const crewRail=Object.entries(ALPHA_SKILLS).map(([station])=>{const a=game.actors.get(ship?.stationActors[station]);return {station,label:stationName(station),actorId:a?.id,name:a?.name??'Unassigned',img:a?.img,pending:request?.station===station&&request.shipId===ship?.id};});
  const choice=s?.pendingCardChoice,canChoose=choice&&choice.shipId===ship?.id&&api.canOperate(ship.id,choice.station);
  const reveal=s?.phase==='draw-reveal'?s.drawReveal?.ships?.[ship?.id]:null;
  const revealCards=(reveal?.ids??[]).map(id=>{const raw=ALPHA_CARDS[ship.instances[id]];return {...decoratedCard(raw),instanceId:id,art:alphaCardArt(raw),sceneArt:alphaCardScene(raw)};});
  const fourBeat=s?.experience===FOUR_BEAT_EXPERIENCE;
  const priority=["hold","straight-2","straight-1","port-s-3","starboard-s-3","port-hard","starboard-hard"];
  const ranked=[...c.routes].sort((a,b)=>{
   const ia=priority.indexOf(a.id),ib=priority.indexOf(b.id);return (ia<0?100:ia)-(ib<0?100:ib);
  });
  let featuredRoutes=ranked.slice(0,5);
  if(fourBeat&&selectedManeuver&&!featuredRoutes.some(r=>r.id===selectedManeuver)){
   const selected=c.routes.find(r=>r.id===selectedManeuver);if(selected)featuredRoutes=[...featuredRoutes.slice(0,4),selected];
  }
  const extraRoutes=c.routes.filter(r=>!featuredRoutes.some(f=>f.id===r.id));
  const navigatorActor=ship&&game.actors.get(ship.stationActors.navigator);
  const navigatorHint=ship&&!api.canOperate(ship.id,"navigator")?
   api.ownsShip(ship.id)?`Navigator assigned to ${navigatorActor?.name??"another crewmate"} · ask the GM to assign your character or Ship baseline.`:"You do not control this ship.":null;
  const crewCalls=crewCallView(s,ship,station=>api.canOperate(ship?.id,station));
  const panels=hudPanelLayout(game.settings.get('arkflight-game','alphaHudPanels'));
  const context={...c,fourBeat,beat:fourBeat?fourBeatModel(s):null,featuredRoutes,extraRoutes,navigatorHint,crewCalls,crewCallCount:crewCalls.filter(x=>x.selected).length,gunnery,layoutIllustrated:c.preferences?.layout==='illustrated',layoutMinimalist:c.preferences?.layout==='minimalist',soundFull:c.preferences?.preference==='full',soundSubtle:c.preferences?.preference==='subtle',soundOff:c.preferences?.preference==='off',buildFour:c.build?.count===4,panels,autoTesting:api.guided?.auto?.status()?.active??false,panelButtons:HUD_PANELS.map(id=>({id,label:({tracker:'Phases',ship:'Ship',hand:'Cards',orders:'Orders'})[id],collapsed:panels[id],expanded:!panels[id]})),helpOpen:this.helpOpen,activeEffects:ship?[...ship.effects.map(e=>({label:e.kind,amount:e.amount,until:`through round ${e.expiresRound}`,uses:e.uses})),...ship.prepared.map(e=>({label:`Prepared ${e.kind}`,amount:e.amount,until:`round ${e.start}–${e.end}`})),...c.effects.map(e=>({label:e.label,amount:e.amount??e.value,until:`through round ${e.expiresRound}`,uses:e.uses}))]:[],crewVisible:game.settings.get('arkflight-game','alphaCrewVisible')??false,shipArt:game.actors.get(ship?.actorId)?.img,
   meters:c.meters.map(m=>({...m,icon:({hull:'fa-shield-halved',lifeveil:'fa-droplet',morale:'fa-flag',strain:'fa-bolt',supplies:'fa-boxes-stacked'})[m.name],segments:Array.from({length:10},(_,i)=>({filled:i<Math.ceil(m.percent/10)}))})),
   routes:c.routes.map(r=>({...r,selected:r.id===selectedManeuver})),route:selectedManeuver?c.route:null,canLock:c.canLock&&!!selectedManeuver,followup,hudHidden:this.hudHidden??false,phaseSteps:roundPhaseSteps(s),readiness:s?roundReadiness(s):[],crewRail,cardChoice:canChoose?{...choice,isSurvey:choice.kind==='survey',options:choice.options.map(id=>({id,name:ALPHA_CARDS[ship.instances[id]].name,art:alphaCardArt(ALPHA_CARDS[ship.instances[id]])}))}:null,guidedRunning,guidedTest:s?.guidedTest,crewPanel:this.crewPanel??false,canAssignCrew:game.user.isGM&&['opening','planning','card-planning','cleanup'].includes(phase),card:card&&{...card,isBoarding:card.id==='boarding'},panelOnly:this.resolutionOnly,roundFlow:s?.roundFlow===2,phaseLabel:labels[phase]??'Take command',
   hand:c.hand.map((h,i)=>({...h,isInstant:h.timing==='instant',sceneArt:alphaCardScene(h),tilt:Math.max(-4,Math.min(4,(i-(c.hand.length-1)/2)*1.25)),queued:planned.has(h.instanceId),respondable:usableInstant(s,ship,h,api)})),
   opening:phase==='opening',drawStep:phase==='draw',canDraw:phase==='draw'&&ship&&ship.drawnRound!==s.round,maneuverStep:phase==='planning',planningCards:phase==='card-planning'||followup,resolvingCards:phase==='resolving'&&!followup,firing:phase==='firing',damageStep:phase==='damage',recap:phase==='cleanup'||s?.complete,
   canMulligan:phase==='opening'&&ship&&!ship.mulliganDone,planLocked:!followup&&s?.cardLocks?.[ship?.id],committedAP:plan.reduce((n,r)=>n+r.cost,0),
   cardPlans:plan.map((r,i)=>({...r,index:i+1,name:ALPHA_CARDS[ship.instances[r.instanceId]].name,canRemove:phase==='card-planning'&&!s.cardLocks[ship.id],first:i===0,last:i===plan.length-1})),
   canLockCards:ship&&api.canOperate(ship.id,'captain')&&(followup||!s?.cardLocks?.[ship.id]),canQueue:card&&(phase==='card-planning'||followup&&s.followupCards.includes(card.instanceId))&&(followup||!s.cardLocks[ship?.id])&&!plan.some(r=>r.instanceId===card.instanceId)&&card.timing!=='instant'&&ship.ap>=card.ap,
   isOwnResolve:resolving,canResolve:resolving&&allowed&&!!chosen,canSkip:resolving&&api.canOperate(ship.id,'captain'),canInstant:usableInstant(s,ship,card,api)&&!!chosen,
   canSubmitRoll:request?api.canOperate(request.shipId,request.station)&&!!chosen:allowed&&!!chosen,requestId:request?.id,skills:ALPHA_SKILLS[station].map(id=>({id,name:id,selected:id===chosen})),breakdown,crewActor:actor?.name??'Ship crew',crewPortrait:actor?.img,receipt,
   canCycle:phase==='card-planning'&&ship&&ship.cycledRound!==s.round&&card?.instanceId&&ship.hand.includes(card.instanceId)&&api.ownsShip(ship.id)&&!planned.has(card.instanceId),
   canFireNow:phase==='firing'&&firingShip===ship?.id&&api.canOperate(ship.id,'battlewatch')&&ship.ap>=1,canFinishFiring:phase==='firing'&&firingShip===ship?.id&&api.canOperate(ship.id,'captain'),canAttack:phase==='response'&&!request&&pending?.responses[pending.targetId]&&api.canOperate(pending.shipId,'battlewatch'),canDamage:phase==='damage'&&api.canOperate(pending?.shipId,'battlewatch'),hit:pending?.hit,
   responseSummary:pending?{weapon:s.ships[pending.shipId]?.batteries.find(b=>b.id===pending.batteryId)?.name,attacker:s.ships[pending.shipId]?.name,target:s.ships[pending.targetId]?.name,formula:s.ships[pending.shipId]?.batteries.find(b=>b.id===pending.batteryId)?.formula,waiting:!pending.responses[pending.targetId],passed:!!pending.responses[pending.targetId]}:null,
   discardCards:(ship?.discard??[]).map(id=>({id,name:ALPHA_CARDS[ship.instances[id]].name})),
   orders:(s?.attacks??[]).filter(a=>a.shipId===ship?.id&&!a.resolved).map(a=>({...a,name:ship.batteries.find(b=>b.id===a.batteryId)?.name??a.batteryId,targetName:s.ships[a.targetId]?.name??'Not yet selected',targets:Object.values(s.ships).filter(t=>alphaTargetLegal(s,ship.id,a.batteryId,t.id)).map(t=>{const r=alphaRangeBand(s,ship.id,a.batteryId,t.id);return{id:t.id,name:`${t.name} · ${r.distance} hex · ${r.penalty} range`,selected:a.targetId===t.id};})})),
   canInspectCurrent:s&&api.ownsShip(s.turnOrder[s.turnIndex]),primary,allLocked:phase==='planning'&&roundReadiness(s).every(r=>r.ready),currentCardName:row&&s?ALPHA_CARDS[s.ships[s.turnOrder[s.turnIndex]].instances[row.instanceId]]?.name??'Enemy station action':'',
   phaseInstruction:followup?'Newly drawn cards may join your orders. Commit or keep them, then lock.':request?`Waiting for ${c.crewRequest.actorName} to roll.`:({opening:'Keep your hand or replace up to two cards.',draw:'Click the deck to draw this round’s card.',planning:'Choose a course. Movement waits until every ship locks.','card-planning':'Commit cards in order. Keep AP for firing and Instants.',resolving:`${s?.ships[s?.turnOrder?.[s?.turnIndex]]?.name??''} · resolve the next queued card.`,firing:`${s?.ships[firingShip]?.name??''} · choose weapons and targets.`,response:'Respond to incoming fire or pass.',damage:'The attack die is saved. Resolve damage without rerolling.',cleanup:'Discard overflow, review the round and start the next.'}[phase]??'Choose your ship.'),
   unsettled:!!s?.pendingCardChoice||!!s?.pendingDiscard||!!s?.pendingCrewAction||s?.complications?.choices.some(x=>x.status==='pending'),recapNarrative:s?.roundFlow===2?roundRecap(s).narrative:[],recapLines:(s?.roundEvents??s?.log??[]).filter(e=>e.round===s?.round),journal:s?.roundJournal,
   fleetDial:phase==='planning'&&s?.combatFlow===3?roundReadiness(s).map(r=>({...r,art:game.actors.get(s.ships[r.id]?.actorId)?.img??'modules/arkflight-game/assets/art/ships/tokens/sirocco.webp'})):[],fleetCountdown:phase==='planning'&&!!s?.maneuverCountdown,fleetDeadline:s?.maneuverCountdown?.deadline??null,
   revealCards,drawReveal:phase==='draw-reveal',revealCanReady:!!reveal?.required?.includes(game.user.id)&&!reveal.ready.includes(game.user.id),revealReady:reveal?.ready.length??0,revealRequired:reveal?.required.length??0,revealDeadline:reveal?.deadline??null,revealWaiting:phase==='draw-reveal'&&!reveal,
   showHand:!!ship,drawCount:ship?.drawCount??ship?.drawPile.length??0};
  if(c.choices.length)for(const key of ['canResolve','canQueue','canAttack','canDamage','canFireNow','canFinishFiring','canLockCards','canInstant','canSubmitRoll'])context[key]=false;
  if(guidedRunning)for(const key of ['canAssignCrew','canMulligan','canQueue','canLockCards','canPlan','canLock','canFireNow','canFinishFiring','canResolve','canSubmitRoll','canRespond','canAttack','canDamage','canSkip','canDraw'])context[key]=false;
  context.batteries=c.batteries.map(b=>{const selected=this.weaponTargets[`${ship.id}:${b.id}`],targets=Object.values(s?.ships??{}).filter(t=>alphaTargetLegal(s,ship.id,b.id,t.id)).map(t=>{const r=alphaRangeBand(s,ship.id,b.id,t.id);return{id:t.id,name:t.name,distance:r.distance,penalty:r.penalty,selected:t.id===selected};}),target=targets.find(t=>t.selected),hasLegalTarget=targets.length>0;return {...b,targets,target,arcVisible:alphaBatteryVisible(s,ship.id,b.id),hasLegalTarget,canCommit:!!context.canFireNow&&b.ready&&!!target};});
  context.recapMarkup=alphaRecapMarkup(s,{gm:game.user.isGM,complete:!!s?.complete,unsettled:context.unsettled,journal:s?.roundJournal,results:context.results??[]});
  context.eligibleInstants=context.hand.filter(h=>h.respondable);
  return context;
 }
 async _onRender(c){
  const root=this.element;root.dataset.fourBeat=String(Boolean(c.fourBeat));if(!this.resolutionOnly){const side=document.querySelector('#sidebar')?.getBoundingClientRect(),tools=document.querySelector('#controls')?.getBoundingClientRect();root.style.setProperty('--hud-right',`${Math.max(18,side?.width?innerWidth-side.left+14:18)}px`);root.style.setProperty('--hud-left',`${Math.max(16,(tools?.right??54)+12)}px`);for(const id of HUD_PANELS)root.dataset[`fold${id[0].toUpperCase()+id.slice(1)}`]=String(c.panels[id]);root.dataset.instantReady=String(c.eligibleInstants.length>0);root.dataset.crewOpen=String(!!c.crewVisible);root.classList.toggle('hud-is-hidden',!!this.hudHidden);root.dataset.hudPhase=c.s?.phase??'welcome';}
  bindAlphaPreferences(root,()=>this.render({force:true}));
  for(const el of root.querySelectorAll('[data-alpha-assign]'))el.addEventListener('change',()=>void this.roundAction('assign-station',{station:el.dataset.alphaAssign,actorId:el.value}));
  root.querySelector('[data-alpha-ship]')?.addEventListener('change',e=>{this.shipId=e.target.value;clearAlphaOverlay();this.inspectId=null;this.selections.clear();void this.render({force:true});});
  for(const el of root.querySelectorAll('[data-round-action]'))el.addEventListener('click',()=>void this.roundAction(el.dataset.roundAction,el.dataset));
  if(c.fourBeat&&c.maneuverStep&&c.ship&&c.canPlan){
   const routes=legalHullManeuvers(c.ship,alphaComplications(c.s,c.ship.id));
   const restore=()=>{
    const saved=this.maneuvers[c.ship.id]??c.s.plans[c.ship.id];
    const original=routes.find(r=>r.id===saved);
    if(original)showAlphaManeuver(c.s,c.ship.id,original);else clearAlphaOverlay();
   };
   for(const el of root.querySelectorAll('.four-maneuver-choice[data-route]')){
    const preview=()=>{if(el.disabled)return;const route=routes.find(r=>r.id===el.dataset.route);if(route)showAlphaManeuver(c.s,c.ship.id,route);};
    el.addEventListener('pointerenter',preview);
    el.addEventListener('focus',preview);
    el.addEventListener('pointerleave',restore);
    el.addEventListener('blur',restore);
   }
  }

  for(const el of root.querySelectorAll('[data-alpha-card]'))el.addEventListener('click',()=>{const id=el.dataset.alphaCard;if(c.opening&&c.canMulligan||c.pendingDiscard){if(c.pendingDiscard&&c.hand.find(h=>h.instanceId===id)?.queued)return;if(this.selections.has(id))this.selections.delete(id);else this.selections.add(id);alphaSound('select');void this.render({force:true});}else void openRoundCard(this.shipId,id);});
  root.querySelector('[data-round-skill]')?.addEventListener('change',e=>{if(c.requestId)this.pendingSkills[c.requestId]=e.target.value;else this.skills[c.card?.stations[0]??'battlewatch']=e.target.value;void this.render({force:true});});
  for(const el of root.querySelectorAll('[data-round-build]'))el.addEventListener('change',()=>{this.build[el.dataset.roundBuild]=['count','level'].includes(el.dataset.roundBuild)?Number(el.value):el.value;void this.render({force:true});});
  for(const [selector,key] of [['[data-alpha-battery]','batteryId'],['[data-alpha-adjustment]','adjustment'],['[data-alpha-target]','targetId']])root.querySelector(selector)?.addEventListener('change',e=>{this[key]=e.target.value;});
  const hand=root.querySelector('.round-hand');if(hand)hand.scrollLeft=this.restoreScroll?.hand??0;this.effectsEngine.update(root,c.s,c.ship?.id);
  if(this.fleetTick){clearInterval(this.fleetTick);this.fleetTick=null;}
  const fleetClock=root.querySelector('[data-fleet-countdown]');
  if(fleetClock&&c.fleetDeadline){
   const update=()=>{fleetClock.textContent=String(Math.max(0,Math.ceil((c.fleetDeadline-Date.now())/1000)));};
   update();this.fleetTick=setInterval(update,250);
  }
  if(this.revealTick){clearInterval(this.revealTick);this.revealTick=null;}
  const clock=root.querySelector('[data-draw-countdown]');
  if(clock&&c.revealDeadline){
   const update=()=>{clock.textContent=String(Math.max(0,Math.ceil((c.revealDeadline-Date.now())/1000)));};
   update();this.revealTick=setInterval(update,250);
   const key=`${c.s?.id}:${c.s?.round}:${c.ship?.id}`;
   if(this.lastRevealKey!==key){this.lastRevealKey=key;alphaSound('open');}
  }
  if(c.fourBeat&&this.lastBeat!==c.beat?.active){
   this.lastBeat=c.beat?.active;alphaSound("ready");
   const rail=root.querySelector(".hud-phase-bar");
   if(rail&&root.dataset.alphaMotion!=="off"&&typeof rail.animate==="function"){
    rail.animate([{filter:"brightness(1.5)"},{filter:"brightness(1)"}],{duration:700,easing:"ease-out"});
   }
  }
  if(!this.resolutionOnly&&!c.guidedRunning&&c.primary&&c.allLocked&&c.s.combatFlow!==3&&!this.busy&&this.movePromptKey!==`${c.s.id}:${c.s.round}`){this.movePromptKey=`${c.s.id}:${c.s.round}`;queueMicrotask(()=>void this.roundAction('confirm-move'));}
  if(!this.resolutionOnly&&!c.autoTesting&&c.recap&&!c.unsettled&&c.s?.roundFlow===2&&this.recapKey!==`${c.s.id}:${c.s.round}`){this.recapKey=`${c.s.id}:${c.s.round}`;const journal=c.journal?`<p>Journal ${recapEscape(c.journal.journalId)} · Page ${recapEscape(c.journal.pageId)}</p>`:'<p>Journal pending; recap retained for retry.</p>';if(foundry.applications.api.DialogV2?.prompt)queueMicrotask(()=>void foundry.applications.api.DialogV2.prompt({window:{title:`Round ${c.s.round} · Ship’s log`},content:roundRecapHTML(c.s)+journal,ok:{label:'Return to battle'}}).catch(()=>{}));}
 }
 async minimize(...args){this.clearRevealClocks();return super.minimize(...args);}
 async close(options={}){this.clearRevealClocks();return super.close(options);}
 clearRevealClocks(){
  if(this.revealTick){clearInterval(this.revealTick);this.revealTick=null;}
  if(this.fleetTick){clearInterval(this.fleetTick);this.fleetTick=null;}
 }
 async roundAction(type,data={}){
  if(this.busy)return;const api=game.arkflight.alphaCombat,s=api.state(),ship=s?.ships[data.shipId??this.shipId];
   const prototypeStart=type==='prototype-reset';if(prototypeStart){if(!game.user.isGM)throw Error('Only the GM can start a new combat prototype.');type='reset';}
  if(type==='toggle-panel'||type==='focus-layout'||type==='reset-layout'){const panels=hudPanelLayout(game.settings.get('arkflight-game','alphaHudPanels'));if(type==='toggle-panel'){if(!HUD_PANELS.includes(data.panel))return;panels[data.panel]=!panels[data.panel];}else for(const id of HUD_PANELS)panels[id]=type==='focus-layout';await game.settings.set('arkflight-game','alphaHudPanels',panels);await this.render({force:true});return;}
  if(type==='ship-art'||type==='deck-browser'){await openHudTools(ship?.id,type==='ship-art'?'art':'piles',()=>this.render({force:true}));return;}
  if(type==='help'){this.helpOpen=!this.helpOpen;await this.render({force:true});return;}
  if(type==='aim-order-canvas'){const order=s.attacks.find(a=>a.id===data.attackId&&a.shipId===ship.id&&!a.resolved);if(!order)return;showAlphaTargeting(s,ship.id,order.batteryId,{selectedTargetId:order.targetId,onTarget:targetId=>void this.roundAction('target',{attackId:order.id,targetId})});return;}
  if(type==='aim-canvas'){showAlphaTargeting(s,ship.id,data.batteryId,{selectedTargetId:this.weaponTargets[`${ship.id}:${data.batteryId}`],onTarget:targetId=>void this.roundAction('aim',{batteryId:data.batteryId,targetId})});await this.render({force:true});return;}
  if(type==='aim'){if(!ship||!alphaTargetLegal(s,ship.id,data.batteryId,data.targetId)){this.error='Choose a target inside this weapon’s arc and range.';await this.render({force:true});return;}this.weaponTargets[`${ship.id}:${data.batteryId}`]=data.targetId;showAlphaTargeting(s,ship.id,data.batteryId,{selectedTargetId:data.targetId,onTarget:targetId=>void this.roundAction('aim',{batteryId:data.batteryId,targetId})});await this.render({force:true});return;}
  if(type==='open-complications'){await syncComplicationWindow(true);return;}
  if(type==='guided-test'){await api.guided.open();return;}if(type==='download-debug'){api.guided.download();return;}
  if(type==='inspect-attack'){const a=s.attacks[s.attackIndex];await openRoundCard(a.shipId,null,{attackId:a.id});return;}
  if(type==='inspect-current'){const row=currentPlannedCard(s);if(row&&api.ownsShip(s.turnOrder[s.turnIndex]))await openRoundCard(s.turnOrder[s.turnIndex],row.instanceId);return;}
  if(type==='toggle-crew'){const visible=game.settings.get('arkflight-game','alphaCrewVisible')??false;await game.settings.set('arkflight-game','alphaCrewVisible',!visible);await this.render({force:true});return;}
  if(type==='toggle-hud'){this.hudHidden=!this.hudHidden;await this.render({force:true});return;}
  if(type==='sheet'||type==='crew-sheet'){const actor=game.actors.get(type==='sheet'?ship?.actorId:data.actorId);if(actor)await actor.sheet.render(true);return;}
  if(type==='weapons'){this.weaponsOpen=!this.weaponsOpen;await this.render({force:true});return;}
  if(type==='close-card'){await this.close();return;}if(type==='minimize'){if(!this.resolutionOnly)await this.roundAction('toggle-panel',{panel:'ship'});else await this.minimize();return;}if(type==='tracker'){await openRoundTracker();return;}
  if(type==='library'){await api.library.open(ship?.actorId);return;}if(type==='crew'){this.crewPanel=!this.crewPanel;await this.render({force:true});return;}if(type==='open-journal'){await game.journal.get(s.roundJournal.journalId)?.sheet.render(true);return;}
  if(type==='arcs'){showAlphaBattery(s,ship.id,data.batteryId);await this.render({force:true});return;}if(type==='clear-arcs'){clearAlphaOverlay();await this.render({force:true});return;}
  if(type==='route'){const route=legalHullManeuvers(ship,alphaComplications(s,ship.id)).find(r=>r.id===data.route);if(!route){ui.notifications.warn('Choose a legal template for this ship.');return;}this.maneuvers[ship.id]=data.route;showAlphaManeuver(s,ship.id,route);alphaSound('select');await this.render({force:true});return;}
  if(type==='confirm-move'){const users=[...game.users].map(u=>`${recapEscape(u.name??u.id)} — ${u.active?'connected':'offline'}`).join('<br>');const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Reveal fleet maneuvers'},content:`<p>All ships locked. Check each saved route before moving:</p><ul>${fleetManeuverSummary(s).map(r=>`<li><b>${recapEscape(r.name)}</b>: ${recapEscape(r.routeName)}<br>${recapEscape(r.description)}</li>`).join('')}</ul><p>Ships move together in time, following their own templates. Collisions or conditions can shorten a route.</p><p>${users}</p>`,yes:{label:'Yes · move fleet'},no:{label:'No · wait'}}):globalThis.confirm('All ships locked. Move the fleet together?');api.guided?.record({kind:'fleet route confirmation',accepted:yes,routes:fleetManeuverSummary(s)});if(!yes)return;type='move';}
  if(type==='reset'){const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Restart test encounter'},content:'<p>Restart with fresh hands and resources? Keep libraries, loadouts and crew.</p>'}):globalThis.confirm('Restart test encounter?');if(!yes)return;}
  this.busy=true;this.error='';
  try{
   let command={type,shipId:ship?.id??this.shipId};
   if(type==='start')command={type,roundFlow:2,combatFlow:3,experience:FOUR_BEAT_EXPERIENCE,...this.build};if(type==='reset')command={type,roundFlow:2,combatFlow:prototypeStart?3:s?.combatFlow??2,experience:prototypeStart?FOUR_BEAT_EXPERIENCE:s?.experience??null};
   if(type==='lock'&&api.canOperate(ship.id,'navigator')){if(!(this.maneuvers[ship.id]??s.plans[ship.id]))throw Error('Choose a maneuver template for this ship this round before locking.');const a=api.state();await api.request({type:'plan',shipId:ship.id,encounterId:a.id,revision:a.revision,maneuverId:this.maneuvers[ship.id]??s.plans[ship.id]??'hold'});}
   if(type==='plan'){command.maneuverId=this.maneuvers[ship.id]??s.plans[ship.id];if(!command.maneuverId)throw Error('Choose a maneuver template for this ship this round.');}if(['mulligan','discard'].includes(type))command.instances=[...this.selections];
   if(type==='ready-draw')command.shipId=ship.id;
   if(type==='crew-call')Object.assign(command,{station:data.station,choice:data.choice,targetId:data.targetId});
   if(type==='cycle-card')command.instanceId=this.inspectId;
   if(type==='queue-card')Object.assign(command,{instanceId:this.inspectId,batteryId:this.batteryId,adjustment:this.adjustment,targetId:this.targetId});
   if(['unqueue-card','move-card','hold-order','target'].includes(type))Object.assign(command,{instanceId:data.instanceId,direction:Number(data.direction),attackId:data.attackId,targetId:data.targetId});
   if(['resolve-card','skip-card','play'].includes(type)){const card=alphaCardFor(ship,this.inspectId);Object.assign(command,{instanceId:this.inspectId,skill:this.skills[card.stations[0]]??'',batteryId:this.batteryId,adjustment:this.adjustment});}
   if(['roll-crew','cancel-crew'].includes(type)){const r=api.state().pendingCrewAction;command={type,requestId:r.id,shipId:r.shipId,skill:this.pendingSkills[r.id]??''};}
   if(type==='choose-complication')Object.assign(command,{shipId:data.shipId,choiceId:data.choiceId,optionId:data.optionId});if(type==='retarget')Object.assign(command,{shipId:data.shipId,targetId:data.targetId});
   if(type==='choose-card')command.instanceId=data.instanceId;
   if(type==='assign-station')Object.assign(command,{station:data.station,actorId:data.actorId});
   if(type==='attack')command.skill=this.skills.battlewatch;
   if(type==='fire'){command.batteryId=data.batteryId;if(data.targetId&&!alphaTargetLegal(s,ship.id,data.batteryId,data.targetId))throw Error('Target is no longer in arc or range. No AP was spent.');}if(['attack','damage'].includes(type))command.shipId=s.attacks[s.attackIndex].shipId;
   const visual=this.resolutionOnly&&['resolve-card','play','roll-crew'].includes(type)?this.element.querySelector('.round-art-card'):null,rect=visual?.getBoundingClientRect(),snapshot=visual?.cloneNode(true);
   const fresh=api.state(),result=await api.request({encounterId:fresh?.id,revision:fresh?.revision,...command});if(type==='fire'&&data.targetId){const attack=result.attacks.find(a=>a.shipId===ship.id&&a.batteryId===data.batteryId&&!fresh.attacks.some(old=>old.id===a.id));if(!attack)throw Error('Shot was committed; choose its target in the firing orders.');try{await api.request({type:'target',shipId:ship.id,attackId:attack.id,targetId:data.targetId,encounterId:result.id,revision:result.revision});}catch(e){throw Error(`Shot committed for 1 AP; select its target or Hold shot below. ${e.message}`);}}this.selections.clear();if(snapshot&&fresh.ships[this.shipId]?.hand.includes(this.inspectId)&&!result.ships[this.shipId]?.hand.includes(this.inspectId))void this.effectsEngine.flyCard({getBoundingClientRect:()=>rect,cloneNode:()=>snapshot.cloneNode(true)},dock?.element?.querySelector('.round-discard-pile'));if(['lock','lock-cards','queue-card'].includes(type))alphaSound('lock');else if(type==='draw-round')alphaSound('ready');
   if(type==='queue-card'&&this.resolutionOnly)await this.close();if(['start','reset'].includes(type))await openRoundTracker();if(result?.phase==='planning')clearAlphaOverlay();
  }catch(e){this.error=e.message;ui.notifications.warn(e.message);}finally{this.busy=false;if(this.rendered)await this.render({force:true});}
 }
}
export class AlphaRoundCardWindow extends AlphaRoundDeckWindow{
 static DEFAULT_OPTIONS={id:'arkflight-round-card',classes:['arkflight-alpha-combat','alpha-command-deck','arkflight-round-deck','round-portrait-window'],window:{frame:true,title:'Arkflight · Station card',icon:'fa-solid fa-dice-d20',resizable:true},position:{width:420,height:660}};
 resolutionOnly=true;constructor(o={}){super({...o,position:alphaWindowPosition(420,660,o.position)});}
}
export async function openRoundCard(shipId,instanceId,{hold=false,attackId=null}={}){portrait??=new AlphaRoundCardWindow();portrait.shipId=shipId;portrait.inspectId=instanceId;portrait.guidedHold=hold;portrait.guidedAttackId=attackId;await portrait.render({force:true});if(portrait.minimized)await portrait.maximize();portrait.bringToFront();return portrait;}
/** Compatibility launcher: tracker macros use the current HUD, not a second window. */
export async function openRoundTracker(){return openRoundDeck(false);}
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
Hooks.on('arkflightAlphaChanged',()=>{void syncComplicationWindow();const state=game.arkflight?.alphaCombat?.state();if(state?.roundFlow===2&&!state.complete&&(!dock?.rendered))void openRoundDeck(false);if(state?.complete&&dock){dock.hudHidden=true;if(portrait?.rendered)void portrait.close();}for(const w of [dock,portrait])if(w?.rendered&&!w.busy)void w.render({force:true});const api=game.arkflight?.alphaCombat,s=api?.state(),r=s?.pendingCrewAction;if(s?.roundFlow===2&&r&&r.id!==lastPrompt&&api.canOperate(r.shipId,r.station)){lastPrompt=r.id;void openRoundCard(r.shipId,r.command.instanceId??null);}});

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

Hooks.once('init',()=>game.settings.register('arkflight-game','alphaHudPanels',{scope:'client',config:false,type:Object,default:{tracker:false,ship:false,hand:false,orders:false}}));
