import { commandFocus } from "./alpha-command-focus.js";
import { fleetReadiness } from "./alpha-fleet-status.js";
import { ventCardModel, masterCardPosition } from "./alpha-master-card.js";
import { ALPHA_HULLS, ALPHA_UPGRADES, ALPHA_TALENTS, deriveAlphaProfile } from "../alpha/hulls.js";
import { ALPHA_CARDS, ALPHA_SKILLS, ALPHA_STARTER_DECK } from "../alpha/cards.js";
import { activeAlphaShip, alphaCardFor, alphaComplications, alphaTargetLegal, alphaReplacementTargetLegal, alphaSuggestedStep } from "../alpha/combat.js";
import { legalHullManeuvers, previewManeuver } from "../alpha/maneuvers.js";
import { complicationChoiceOptions } from "../combat/ship-complications.js";
import { SHIP_COMPLICATION_CARDS } from "../content/ship-complications.js";
import { cardArt } from "./card-combat-presentation.js";
import { showAlphaManeuver, showAlphaBattery, clearAlphaOverlay } from "./alpha-combat-overlays.js";
import { stationName, cardBand, cardTheme, cardOutcomes, phasePresentation, combatPiles, inspectCombatPile, latestCombatResults } from "./alpha-combat-presentation.js";
import { AlphaCombatEffects, alphaPreferences, alphaSound, bindAlphaPreferences, alphaWindowPosition } from "./alpha-combat-effects.js";

const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
let instance,masterInstance,trackerInstance;
const words=value=>String(value??"").replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase());
const names={planning:"Maneuver Planning",cards:"Card Phase",targeting:"Declare Targets",response:"Incoming Attack",retarget:"Replacement Target",cleanup:"Round Complete",complete:"Encounter Complete",boarding:"Deck Encounter / Ship Battle Paused"};
const artIds={acquire:"acquire-target",patch:"work-the-guns",brace:"brace-impact",prepare:"issue-order",shield:"emergency-ward",helm:"evasive-maneuver",volley:"ready-broadside",harmonic:"reinforce-lifeveil","all-hands":"drive-the-crew",evasive:"attack-vector",read:"charted-course",chainshot:"ready-broadside",breakaway:"breakaway-vector",ahead:"charted-course",overcharge:"feed-the-guns",mend:"mend-lifeveil",rally:"rally-crew",boarding:"rally-crew",ram:"brace-impact",vent:"vent-strain","work-guns":"work-the-guns"};
export const alphaCardArt=card=>card.id==="vent"?"modules/arkflight-game/assets/ui/card-forge/vent-strain-art.webp":cardArt({id:artIds[card.id],stations:card.stations});
function glyph(m){
  const preview=previewManeuver({q:0,r:0,heading:0},m), points=preview.trace.map(p=>({x:p.q*1.5,y:p.q*.866+p.r*1.732}));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs)-1,maxX=Math.max(...xs)+1,minY=Math.min(...ys)-1,maxY=Math.max(...ys)+1;
  const scale=Math.min(130/(maxX-minX),100/(maxY-minY)),xy=p=>`${20+(p.x-minX)*scale},${10+(p.y-minY)*scale}`;
  return `<svg viewBox="0 0 175 125" aria-hidden="true"><polyline points="${points.map(xy).join(" ")}" fill="none" stroke="#79cfd5" stroke-width="3"/>${points.map((p,i)=>{const[x,y]=xy(p).split(",");return `<circle cx="${x}" cy="${y}" r="7" fill="${i===points.length-1?"#dcb76f":"#183b47"}" stroke="#79cfd5"/><text x="${x}" y="${Number(y)+3}" fill="#fff" text-anchor="middle" font-size="9">${i}</text>`;}).join("")}</svg>`;
}
export class AlphaCombatWindow extends HandlebarsApplicationMixin(ApplicationV2){
  static DEFAULT_OPTIONS={id:"arkflight-alpha-combat",classes:["arkflight-alpha-combat","alpha-command-deck"],window:{title:"Arkflight — Command Deck",icon:"fa-solid fa-compass",resizable:true},position:{width:900,height:610}};
  static PARTS={main:{template:"modules/arkflight-game/templates/alpha-combat.hbs"}};
  shipId=null;tab="plan";busy=false;guideOpen=false;report="";error="";inspectId=null;selections=new Set();maneuvers={};skills={};pendingSkills={};batteryId="starboard";targetId="";adjustment="forward";
  boardingSceneId="";
  followPhase=true; focusKey=null; fleetOpen=false; weaponsOpen=false;
  effectsEngine=new AlphaCombatEffects(); resultsOpen=false; handFolded=false; pileId=null; compact=false; expandedHeight=null;
  build={hullId:"brigantine",enemyHullId:"cutter",level:5,count:2,upgrades:[],talents:[],deck:[...ALPHA_STARTER_DECK]};
  constructor(options={}){super({...options,position:alphaWindowPosition(900,610,options.position)});}
  async _prepareContext(options){
    const base=await super._prepareContext(options),api=game.arkflight.alphaCombat,s=api.state();
    const accessibleShips=Object.values(s?.ships??{}).filter(x=>api.ownsShip(x.id));
    this.shipId=accessibleShips.some(x=>x.id===this.shipId)?this.shipId:accessibleShips[0]?.id;
    const ship=s?.ships[this.shipId],pending=s?.attacks[s.attackIndex],canControl=ship&&api.ownsShip(ship.id);
    let profile,buildError="";try{profile=deriveAlphaProfile(this.build);if(this.build.deck.length<15||this.build.deck.length>profile.deck)buildError=`Choose 15–${profile.deck} cards.`;}catch(e){buildError=e.message;profile=deriveAlphaProfile({hullId:this.build.hullId,level:this.build.level});}
    const routes=ship&&api.canOperate(ship.id,"navigator")?legalHullManeuvers(ship,alphaComplications(s,ship.id)):[];
    const selectedRoute=routes.find(m=>m.id===(this.maneuvers[ship?.id]??s?.plans[ship?.id]))??routes[0];
    const selected=ship?.hand.find(id=>id===this.inspectId)??(this.masterReceiptId===this.inspectId&&ship?.instances[this.inspectId]==="vent"&&ship?.discard.includes(this.inspectId)?this.inspectId:null),card=selected?alphaCardFor(ship,selected):null;
    const station=card?.stations[0]??"battlewatch";
    let crewCheck=null;
    if(card&&ship&&api.crewCheck){try{crewCheck=await api.crewCheck(ship.id,station,(card.role==="Attack"&&card.stations.length===1?this.skills.attack:this.skills[station])??ALPHA_SKILLS[station][0]);}catch(e){crewCheck={error:e.message};}}
    const choices=s?(s.complications.choices.filter(c=>c.status==="pending").map(c=>({id:c.id,shipId:c.shipId,name:s.ships[c.shipId].name,allowed:api.ownsShip(c.shipId),options:complicationChoiceOptions(s.complications,c.id)}))):[];
    const phase=s?.phase;
    const focus=commandFocus(s,ship,{canOperate:(id,station)=>api.canOperate(id,station)});
    const focusKey=s?`${s.id}:${s.round}:${phase}:${s.pendingCrewAction?.id??""}:${s.pendingDiscard?.shipId??""}`:"none";
    if(this.followPhase&&this.focusKey!==focusKey&&!this.preview&&this.tab!=="forge")this.tab=focus.tab;
    this.focusKey=focusKey;
    const scrollKey=`${this.shipId}:${this.tab}`;this.restoreScroll=this.scrollKey===scrollKey?{body:this.element?.querySelector?.(".alpha-body")?.scrollTop??0,hand:this.element?.querySelector?.(".alpha-hand")?.scrollLeft??0}:{body:0,hand:0};this.scrollKey=scrollKey;
    const active=activeAlphaShip(s??{turnOrder:[],turnIndex:0});
    const playerActors=game.actors.contents.filter(a=>["character","npc"].includes(a.type));
    const attacked=phase==="response"&&pending?.targetId===ship?.id;
    const isInstant=card?.timing==="instant";
    const targets=ship?Object.values(s.ships).filter(x=>x.team!==ship.team).map(x=>({id:x.id,name:x.name,selected:x.id===this.targetId})):[];
    const hasPending=Boolean(s?.pendingCrewAction||s?.pendingDiscard||choices.length), turn=phase==="cards"&&active===ship?.id;
    const selectedBattery=ship?.batteries.find(b=>b.id===this.batteryId);
    const batteryReady=selectedBattery&&selectedBattery.readyRound<=s.round&&selectedBattery.firedRound!==s.round&&!s.attacks.some(a=>a.shipId===ship.id&&a.batteryId===selectedBattery.id);
    let cardHint=card&&!ship.hand.includes(selected)?"This card has resolved and is in the Discard pile.":!card?"Select a card to inspect its effects.":!canControl?"Only this ship's owning crew can play its cards.":!api.canOperate(ship.id,station)?`The assigned ${stationName(station)} crew plays this card.`:ship.ap<card.ap?`This card needs ${card.ap} AP.`:hasPending?"Resolve the pending choice or discard first.":isInstant?(!attacked||pending.responses[ship.id]?"This Instant is available before an incoming attack, once per response.":""):!turn?"Wait for this ship's Card phase.":"";
    if(card&&!cardHint){
      if(card.role==="Attack"&&!batteryReady)cardHint="Choose a ready, uncommitted battery.";
      else if(card.id==="all-hands"&&selectedBattery?.id==="fore")cardHint="All Hands requires a port or starboard broadside.";
      else if(card.id==="chainshot"&&!ship.ammo.chainshot)cardHint="No Chainshot charges remain.";
      else if(["shield","harmonic"].includes(card.id)&&ship.resources.lifeveil.value<5)cardHint="This card needs 5% Lifeveil.";
      else if(card.id==="patch"&&(ship.resources.supplies.value<1||ship.resources.hull.value>=ship.resources.hull.max))cardHint="Patch Hull needs missing Hull and 1 Supply.";
      else if(card.id==="overcharge"&&ship.resources.strain.value>=ship.resources.strain.max)cardHint="Vent Strain before overcharging at full capacity.";
      else if(card.dr&&ship.drPlayedRound===s.round)cardHint="This ship has already played a DR card this round.";
      else if(card.id==="boarding"&&!this.targetId)cardHint="Choose an opposing ship alongside as the boarding target.";
    }
    const playable=Boolean(card&&!cardHint&&!crewCheck?.error);
    const canFire=turn&&ship&&api.canOperate(ship.id,"battlewatch")&&!hasPending&&ship.ap>=1;
    const fireHint=!turn?"Wait for this ship's Card phase.":!ship||!api.canOperate(ship.id,"battlewatch")?"The assigned Battle Watch crew commits weapons.":hasPending?"Resolve the pending choice first.":ship.ap<1?"No AP remains.":"Commit a shot now; choose its target after all ships finish their Card phase.";
    const request=s?.pendingCrewAction,requestShip=request&&s.ships[request.shipId],requestActor=requestShip&&game.actors.get(requestShip.stationActors[request.station]);
    const requestSkill=request?this.pendingSkills[request.id]??"":"";
    const crewRequest=request&&{...request,attack:request.kind==="attack",shipName:requestShip.name,actorName:requestActor?.name??"assigned crew",stationLabel:stationName(request.station),canRoll:api.canOperate(request.shipId,request.station),canSubmit:api.canOperate(request.shipId,request.station)&&ALPHA_SKILLS[request.station].includes(requestSkill),canCancel:game.user.isGM||api.canOperate(request.shipId,"captain"),skills:ALPHA_SKILLS[request.station].map(id=>({id,name:words(id),selected:id===requestSkill}))};
    const crewRequestMatches=Boolean(request&&request.shipId===ship?.id&&request.command?.instanceId===selected);
    const fleet=fleetReadiness(s);
    for(const row of fleet.rows){if(!api.ownsShip(row.id))continue;const crew=s.ships[row.id];if(request?.shipId===row.id){row.operator=requestActor?.name??stationName(request.station);continue;}
      if(phase==="planning"&&!row.ready){const role=s.plans[row.id]?"captain":"navigator";row.operator=`${stationName(role)}: ${game.actors.get(crew.stationActors[role])?.name??"ship crew"}`;}
      else if(phase==="cards"&&row.active)row.operator=`Captain: ${game.actors.get(crew.stationActors.captain)?.name??"ship crew"}`;
    }
    return {...base,s,ship,buildId:api.build,report:this.report,guideOpen:this.guideOpen,suggestion:s&&!s.pendingCrewAction?alphaSuggestedStep(s):null,gm:game.user.isGM,busy:this.busy,error:this.error,buildError,profile,recovery:api.recovery(),hasRecovery:Boolean(api.recovery()?.next??api.recovery()?.pending),phaseName:names[phase]??"Take Command",paused:game.paused,tab:this.tab,
      focus,followPhase:this.followPhase,fleetOpen:this.fleetOpen,weaponsOpen:this.weaponsOpen,
      masterPreview:this.tab==="forge",masterCard:card?.id==="vent",ventMaster:ventCardModel({s,ship,instanceId:selected,preview:this.tab==="forge"}),masterDetails:this.masterDetails??false,dice3dReady:Boolean(game.dice3d?.animateRoll||game.dice3d?.showForRoll),crewRequest,crewRequestMatches,crewCheck,fleet,confirmReset:this.confirmReset??false,canAssignCrew:game.user.isGM&&["planning","cards","cleanup"].includes(phase),resultsOpen:this.resultsOpen,presentation:phasePresentation(s,ship?.id),preferences:alphaPreferences(),handFolded:this.handFolded,compact:this.compact,piles:combatPiles(s,ship),pile:inspectCombatPile(s,ship,this.pileId),results:latestCombatResults(s,ship?.id),canFire,fireHint,
      selectedBattery:selectedBattery?.name,selectionCount:this.selections.size,canConfirmMulligan:this.selections.size<=2,canDiscard:this.selections.size===s?.pendingDiscard?.count,cardHint:crewCheck?.error??cardHint,canRegroup:turn&&card&&!hasPending&&ship.ap>=1&&ship.regroupRound!==s.round,
      handOverflow:ship?Math.max(0,ship.hand.length-ship.profile.hand):0,
      apPips:ship?Array.from({length:Math.max(ship.profile.ap,ship.ap)},(_,i)=>({spent:i>=ship.ap})):[],
      tabs:[{id:"plan",name:"Maneuver"},{id:"hand",name:"Cards"},{id:"ship",name:"Ship / Crew"},{id:"log",name:"Log"},{id:"forge",name:"Card Forge"},...(game.user.isGM?[{id:"build",name:"Builder"}]:[])].map(t=>({...t,selected:t.id===this.tab})),
      showBuild:this.tab!=="forge"&&game.user.isGM&&(!s||this.tab==="build"||(s.complete&&this.tab==="plan")),showPlan:s&&this.tab==="plan"&&!s.complete,showHand:s&&this.tab==="hand",showShip:s&&this.tab==="ship",showLog:s&&this.tab==="log",
      hulls:Object.values(ALPHA_HULLS).map(h=>({...h,selected:h.id===this.build.hullId,enemySelected:h.id===this.build.enemyHullId})),
      upgrades:Object.entries(ALPHA_UPGRADES).map(([id,item])=>({id,...item,checked:this.build.upgrades.includes(id)})),talents:Object.entries(ALPHA_TALENTS).map(([id,item])=>({id,...item,checked:this.build.talents.includes(id)})),
      deckOptions:Object.values(ALPHA_CARDS).map(c=>({...c,count:this.build.deck.filter(id=>id===c.id).length,max:c.unique?1:2})),deckCount:this.build.deck.length,build:this.build,canStart:game.user.isGM&&(!s||s.complete)&&!buildError,
      ships:accessibleShips.map(x=>({id:x.id,name:x.name,selected:x.id===this.shipId,ap:x.ap,hull:x.resources.hull.value,locked:s.locked[x.id],active:x.id===active})),
      meters:ship?Object.entries(ship.resources).map(([name,r])=>({name,label:{hull:"Hull",lifeveil:"Lifeveil",morale:"Morale",strain:"Strain",supplies:"Supply"}[name],...r,percent:100*r.value/r.max,warning:name==="strain"?r.value/r.max>=.5:r.value/r.max<=.5})):[],
      planning:phase==="planning",cardPhase:phase==="cards",targeting:phase==="targeting",responding:phase==="response",canRollAttack:!hasPending&&pending&&api.canOperate(pending.shipId,"battlewatch"),retargeting:phase==="retarget",cleanup:phase==="cleanup",complete:s?.complete,
      activeName:s?.ships[active]?.name,pending:pending&&{...pending,attacker:s.ships[pending.shipId].name,defender:s.ships[pending.targetId]?.name,ready:Boolean(pending.responses[pending.targetId])},
      canControl,canPlan:ship&&api.canOperate(ship.id,"navigator"),canLock:ship&&api.canOperate(ship.id,"captain"),canFinish:!hasPending&&canControl&&api.canOperate(ship.id,"captain")&&phase==="cards"&&active===ship.id,canRespond:!hasPending&&canControl&&attacked&&!pending.responses[ship.id],
      routes:routes.map(m=>({...m,svg:glyph(m),selected:m.id===selectedRoute?.id})),route:selectedRoute&&{...selectedRoute,svg:glyph(selectedRoute)},locked:s?.locked[ship?.id],
      hand:(ship?.hand??[]).map(id=>{const c=alphaCardFor(ship,id);return{...c,instanceId:id,selected:this.selections.has(id),inspect:id===this.inspectId,art:alphaCardArt(c),master:c.id==="vent",band:cardBand(c),theme:cardTheme(c),stationLabel:c.stations.map(stationName).join(" + "),respondable:focus.instantIds.includes(id),affordable:ship.ap>=c.ap};}),
      card:card&&{...card,instanceId:selected,art:alphaCardArt(card),band:cardBand(card),theme:cardTheme(card),outcomes:cardOutcomes(card),coordinated:card.stations.length>1,stationLabel:card.stations.map(stationName).join(" + "),attackOnly:card.role==="Attack"&&card.stations.length===1,needsBattery:card.role==="Attack"||card.id==="work-guns",movementCard:["helm","breakaway","ahead"].includes(card.id)},playable,
      skillOptions:ALPHA_SKILLS[station].map(id=>({id,name:words(id),selected:id===(this.skills[station]??ALPHA_SKILLS[station][0])})),attackSkillOptions:ALPHA_SKILLS.battlewatch.map(id=>({id,name:words(id),selected:id===(this.skills.attack??ALPHA_SKILLS.battlewatch[0])})),
      batteries:(ship?.batteries??[]).map(b=>{const committed=s.attacks.some(a=>a.shipId===ship.id&&a.batteryId===b.id),ready=b.readyRound<=s.round&&b.firedRound!==s.round&&!committed;return{...b,selected:b.id===this.batteryId,committed,ready,canCommit:canFire&&ready,status:committed?"Committed":ready?"Ready":`Reload · R${b.readyRound}`};}),targets,
      orders:(s?.attacks??[]).filter(a=>!a.resolved&&(phase!=="targeting"||api.ownsShip(a.shipId))).map(a=>({...a,name:`${s.ships[a.shipId].name} · ${a.batteryId}`,allowed:api.ownsShip(a.shipId),targets:Object.values(s.ships).filter(t=>alphaTargetLegal(s,a.shipId,a.batteryId,t.id)).map(t=>({id:t.id,name:t.name,selected:t.id===a.targetId}))})),
      retargets:pending?Object.values(s.ships).filter(t=>alphaReplacementTargetLegal(s,pending,t.id)).map(t=>({id:t.id,name:t.name})):[],
      canRetarget:pending&&api.ownsShip(pending.shipId),
      pendingDiscard:ship&&s?.pendingDiscard?.shipId===ship.id?s.pendingDiscard.count:0,canMulligan:canControl&&s?.round===1&&phase==="planning"&&!ship.mulliganDone&&!s.locked[ship.id],
      choices,effects:ship?alphaComplications(s,ship.id).map(e=>({...e,label:s.complications.history.find(r=>r.id===e.receiptId)?.title??words(e.rule??e.stat)})):[],
      adjustments:[{id:"forward",name:"Forward"},{id:"port",name:"Port 60°"},{id:"starboard",name:"Starboard 60°"},{id:"forward-port",name:"Forward + Port on critical success"},{id:"forward-starboard",name:"Forward + Starboard on critical success"}].map(a=>({...a,selected:a.id===this.adjustment})),
      weaponDetails:ship?.batteries??[],
      stations:ship?Object.entries(ALPHA_SKILLS).map(([id,skills])=>({id,name:words(id),actorName:game.actors.get(ship.stationActors[id])?.name??"NPC ship crew",skills:skills.map(words).join(" / "),actors:playerActors.map(a=>({id:a.id,name:`${a.name} · ${a.type==="npc"?"NPC":"PC"}`,selected:a.id===ship.stationActors[id]}))})):[],
      exploits:s&&pending?s.complications.effects.filter(e=>e.kind==="opportunity"&&!e.claimedBy&&e.notBeforeRound<=s.round&&e.expiresRound>=s.round&&[pending.shipId,pending.targetId].includes(e.shipId)).map(e=>({...e,name:words(e.rule),payer:e.rule==="defensive-opening"?pending.targetId:pending.shipId})).filter(e=>api.ownsShip(e.payer)):[],
      boarding:s?.boarding??[],boardingPaused:phase==="boarding",boardingScenes:game.scenes.contents.filter(scene=>scene.id!==s?.canvas?.sceneId).map(scene=>({id:scene.id,name:scene.name,selected:scene.id===this.boardingSceneId})),
      boardingExploits:s&&card?.id==="boarding"?s.complications.effects.filter(e=>e.rule==="boarding-opening"&&e.shipId===this.targetId&&!e.claimedBy&&e.expiresRound>=s.round):[],
      prepared:ship?.prepared??[],history:[...(s?.log??[])].reverse(),canMove:game.user.isGM&&phase==="planning"&&Object.values(s.ships).filter(x=>x.resources.hull.value>0).every(x=>s.locked[x.id])};
  }
  // Shared context for the current dock. The retired dashboard has no live handlers or launchers.
  async _onRender(){}
  async minimize(...args){this.effectsEngine.clear(false);return super.minimize(...args);}
  async close(options={}){this.effectsEngine.clear();clearAlphaOverlay();return super.close(options);}
}
/** One portrait, separate from the combat dashboard; actions still use its controller. */
export class AlphaMasterCardWindow extends AlphaCombatWindow {
  static DEFAULT_OPTIONS={id:"arkflight-alpha-master-card",classes:["arkflight-alpha-combat","alpha-command-deck","alpha-master-window"],window:{title:"Arkflight — Vent Strain",icon:"fa-solid fa-dice-d20",resizable:false},position:{width:370,height:633}};
  followPhase=false;preview=true;masterDetails=false;receiptKey=null;
  constructor(options={}){const {cardWidth,...position}=masterCardPosition();super({...options,position:{...position,...options.position}});}
  async _prepareContext(options){
    this.tab=this.preview?"forge":"hand";
    const c=await super._prepareContext(options);
    const receipt=c.ventMaster.receipt,key=receipt?`${c.s?.id}:${this.inspectId}:${receipt.die}:${receipt.total}`:null;
    if(key&&key!==this.receiptKey)this.masterDetails=true;
    this.receiptKey=key;
    return {...c,masterOnly:true,masterPreview:this.preview,masterDetails:this.masterDetails,playable:!this.preview&&c.masterCard&&c.playable,cardHint:c.masterCard?c.cardHint:"This card is no longer available in this ship's hand."};
  }
  fitCard(){if(this.minimized)return;const {cardWidth,...position}=masterCardPosition({left:this.position?.left,top:this.position?.top});this.setPosition?.(position);this.element?.style.setProperty("--alpha-master-card-width",`${cardWidth}px`);}
  async _onRender(context,options){
    await super._onRender(context,options);this.fitCard();
    if(!this.resizeListener){this.resizeListener=()=>this.fitCard();globalThis.addEventListener?.("resize",this.resizeListener);}
  }
  async maximize(...args){const result=await super.maximize(...args);this.fitCard();return result;}
  async act(type,data={}){if(type==="close-inspector"){await this.close();return;}return super.act(type,data);}
  async close(options={}){if(this.resizeListener){globalThis.removeEventListener?.("resize",this.resizeListener);this.resizeListener=null;}return super.close(options);}
}
export async function openMasterCard({preview=true,shipId=null,instanceId=null,skill}={}){
  if(masterInstance?.busy){masterInstance.bringToFront();return masterInstance;}
  masterInstance??=new AlphaMasterCardWindow();masterInstance.preview=preview;masterInstance.shipId=shipId;masterInstance.inspectId=instanceId;masterInstance.masterReceiptId=null;masterInstance.masterDetails=false;masterInstance.receiptKey=null;masterInstance.error="";
  if(skill)masterInstance.skills.engineer=skill;
  await masterInstance.render({force:true});if(masterInstance.minimized)await masterInstance.maximize();masterInstance.bringToFront();return masterInstance;
}
export class AlphaPhaseTrackerWindow extends AlphaCombatWindow {
  static DEFAULT_OPTIONS={id:"arkflight-alpha-phase-tracker",classes:["arkflight-alpha-combat","alpha-command-deck","alpha-phase-window"],window:{title:"Arkflight — Fleet status",icon:"fa-solid fa-flag",resizable:true},position:{width:440,height:235}};
  followPhase=false;
  constructor(options={}){super({...options,position:{width:Math.min(440,innerWidth-32),height:235,left:Math.min(80,Math.max(8,innerWidth-Math.min(440,innerWidth-32)-16)),top:18,...options.position}});}
  async _prepareContext(options){return {...await super._prepareContext(options),trackerOnly:true};}
  async _onRender(c,o){await super._onRender(c,o);if(!this.minimized){const rows=Math.ceil((c.fleet.rows.length||1)/((this.position?.width??440)<340?1:2));this.setPosition?.({height:Math.min(innerHeight-60,Math.max(235,160+rows*60))});}}
}
export async function openPhaseTracker(){trackerInstance??=new AlphaPhaseTrackerWindow();await trackerInstance.render({force:true});if(trackerInstance.minimized)await trackerInstance.maximize();trackerInstance.bringToFront();return trackerInstance;}
// Runtime entry points are registered exclusively by alpha-round-deck-ui.js.
