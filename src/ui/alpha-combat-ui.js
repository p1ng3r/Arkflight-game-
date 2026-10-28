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
  static DEFAULT_OPTIONS={id:"arkflight-alpha-combat",classes:["arkflight-alpha-combat","alpha-command-deck"],window:{title:"Arkflight — Command Deck",icon:"fa-solid fa-compass",resizable:true},position:{width:760,height:650}};
  static PARTS={main:{template:"modules/arkflight-game/templates/alpha-combat.hbs"}};
  shipId=null;tab="plan";busy=false;guideOpen=false;report="";error="";inspectId=null;selections=new Set();maneuvers={};skills={};pendingSkills={};batteryId="starboard";targetId="";adjustment="forward";
  boardingSceneId="";
  effectsEngine=new AlphaCombatEffects(); resultsOpen=false; handFolded=false; pileId=null; compact=false; expandedHeight=null;
  build={hullId:"brigantine",enemyHullId:"cutter",level:5,count:2,upgrades:[],talents:[],deck:[...ALPHA_STARTER_DECK]};
  constructor(options={}){super({...options,position:alphaWindowPosition(760,650,options.position)});}
  async _prepareContext(options){
    const scrollKey=`${this.shipId}:${this.tab}`;this.restoreScroll=this.scrollKey===scrollKey?{body:this.element?.querySelector?.(".alpha-body")?.scrollTop??0,hand:this.element?.querySelector?.(".alpha-hand")?.scrollLeft??0}:{body:0,hand:0};this.scrollKey=scrollKey;
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
    const phase=s?.phase, active=activeAlphaShip(s??{turnOrder:[],turnIndex:0});
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
      masterPreview:this.tab==="forge",masterCard:card?.id==="vent",ventMaster:ventCardModel({s,ship,instanceId:selected,preview:this.tab==="forge"}),masterDetails:this.masterDetails??false,dice3dReady:Boolean(game.dice3d?.animateRoll||game.dice3d?.showForRoll),crewRequest,crewRequestMatches,crewCheck,fleet,confirmReset:this.confirmReset??false,canAssignCrew:game.user.isGM&&["planning","cards","cleanup"].includes(phase),resultsOpen:this.resultsOpen,presentation:phasePresentation(s,ship?.id),preferences:alphaPreferences(),handFolded:this.handFolded,compact:this.compact,piles:combatPiles(s,ship),pile:inspectCombatPile(s,ship,this.pileId),results:latestCombatResults(s,ship?.id),canFire,fireHint,
      selectedBattery:selectedBattery?.name,selectionCount:this.selections.size,canConfirmMulligan:this.selections.size<=2,canDiscard:this.selections.size===s?.pendingDiscard?.count,cardHint:crewCheck?.error??cardHint,canRegroup:turn&&card&&!hasPending&&ship.ap>=1&&ship.regroupRound!==s.round,
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
      hand:(ship?.hand??[]).map(id=>{const c=alphaCardFor(ship,id);return{...c,instanceId:id,selected:this.selections.has(id),inspect:id===this.inspectId,art:alphaCardArt(c),master:c.id==="vent",band:cardBand(c),theme:cardTheme(c),stationLabel:c.stations.map(stationName).join(" + "),affordable:ship.ap>=c.ap};}),
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
  async _onRender(context,options){
    await super._onRender(context,options);
    const root=this.element;
    bindAlphaPreferences(root,()=>this.render({force:true}));
    root.querySelector(".alpha-recent-results")?.addEventListener("toggle",e=>{this.resultsOpen=e.target.open;});
    root.querySelector(".alpha-guide")?.addEventListener("toggle",e=>{this.guideOpen=e.target.open;});
    root.querySelector("[data-alpha-boarding-scene]")?.addEventListener("change",e=>{this.boardingSceneId=e.target.value;});
    root.querySelector("[data-alpha-ship]")?.addEventListener("change",e=>{this.shipId=e.target.value;this.selections.clear();this.inspectId=null;void this.render({force:true});});
    root.querySelector("[data-alpha-maneuver]")?.addEventListener("change",e=>{this.maneuvers[this.shipId]=e.target.value;void this.render({force:true});});
    root.querySelector("[data-alpha-skill]")?.addEventListener("change",e=>{const c=alphaCardFor(game.arkflight.alphaCombat.state().ships[this.shipId],this.inspectId);this.skills[c?.stations[0]??"battlewatch"]=e.target.value;void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-crew-skill]"))el.addEventListener("change",e=>{this.pendingSkills[el.dataset.alphaCrewSkill]=e.target.value;void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-attack-skill]"))el.addEventListener("change",e=>{this.skills.attack=e.target.value;void this.render({force:true});});
    root.querySelector("[data-alpha-battery]")?.addEventListener("change",e=>{this.batteryId=e.target.value;void this.render({force:true});});
    root.querySelector("[data-alpha-target]")?.addEventListener("change",e=>{this.targetId=e.target.value;void this.render({force:true});});
    root.querySelector("[data-alpha-adjustment]")?.addEventListener("change",e=>{this.adjustment=e.target.value;});
    for(const el of root.querySelectorAll("[data-alpha-tab]"))el.addEventListener("click",()=>{if(el.dataset.alphaTab==="forge"){void openMasterCard({preview:true});return;}this.tab=el.dataset.alphaTab;if(this.compact)this.toggleCompact();clearAlphaOverlay();alphaSound("open");void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-pile]"))el.addEventListener("click",()=>{this.pileId=this.pileId===el.dataset.alphaPile?null:el.dataset.alphaPile;alphaSound("open");void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-card]"))el.addEventListener("click",()=>{
      const id=el.dataset.alphaCard,s=game.arkflight.alphaCombat.state(),ship=s.ships[this.shipId],multi=Boolean(s.pendingDiscard?.shipId===ship.id||s.round===1&&!ship.mulliganDone&&s.phase==="planning");
      const had=this.selections.has(id);if(!multi)this.selections.clear();if(had)this.selections.delete(id);else this.selections.add(id);this.inspectId=had&&this.inspectId===id?null:id;this.revealInspector=Boolean(this.inspectId);alphaSound(had?"deselect":"select");
      if(alphaCardFor(ship,id)?.id==="vent"&&!had){void openMasterCard({preview:false,shipId:ship.id,instanceId:id,skill:this.skills.engineer});this.inspectId=null;this.revealInspector=false;if(!multi)this.selections.clear();}
      void this.render({force:true});
    });
    for(const el of root.querySelectorAll("[data-alpha-route]"))el.addEventListener("click",()=>{if(context.locked||!context.canPlan)return;this.maneuvers[this.shipId]=el.dataset.alphaRoute;const route=legalHullManeuvers(context.ship,alphaComplications(context.s,this.shipId)).find(r=>r.id===el.dataset.alphaRoute);if(route)showAlphaManeuver(context.s,this.shipId,route);alphaSound("select");void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-cmd]"))el.addEventListener("click",()=>this.act(el.dataset.alphaCmd,el.dataset));
    for(const el of root.querySelectorAll("[data-alpha-order-target]"))el.addEventListener("change",()=>this.act("target",{attackId:el.dataset.alphaOrderTarget,shipId:el.dataset.shipId,targetId:el.value}));
    for(const el of root.querySelectorAll("[data-alpha-assign]"))el.addEventListener("change",()=>this.act("assign-station",{station:el.dataset.alphaAssign,actorId:el.value}));
    for(const el of root.querySelectorAll("[data-alpha-build]"))el.addEventListener("change",()=>{const k=el.dataset.alphaBuild;this.build[k]=["level","count"].includes(k)?Number(el.value):el.value;void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-fit]"))el.addEventListener("change",()=>{const key=el.dataset.alphaFit;this.build[key]=[...root.querySelectorAll(`[data-alpha-fit="${key}"]:checked`)].map(n=>n.value);void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-deck]"))el.addEventListener("change",()=>{this.build.deck=[...root.querySelectorAll("[data-alpha-deck]")].flatMap(n=>Array(Math.max(0,Math.min(2,Number(n.value)||0))).fill(n.dataset.alphaDeck));void this.render({force:true});});
    const body=root.querySelector(".alpha-body"),hand=root.querySelector(".alpha-hand");if(body)body.scrollTop=this.restoreScroll?.body??0;if(hand)hand.scrollLeft=this.restoreScroll?.hand??0;
    if(this.revealInspector){root.querySelector(".alpha-card-detail")?.scrollIntoView?.({block:"nearest",behavior:alphaPreferences().mode==="off"?"instant":"smooth"});root.querySelector('.alpha-card-detail [data-alpha-cmd="close-inspector"]')?.focus({preventScroll:true});this.revealInspector=false;}
    if(!this.minimized)this.effectsEngine.update(root,context.s,context.ship?.id);else{this.effectsEngine.previous=context.s;this.effectsEngine.shipId=context.ship?.id;}
    if(!root.alphaEscapeBound){root.alphaEscapeBound=true;root.addEventListener("keydown",e=>{if(e.key==="Escape"&&(this.inspectId||this.pileId)){e.stopPropagation();this.dismissInspection();void this.render({force:true});}});}
  }
  async act(type,data={}){
    if(this.busy)return;
    const api=game.arkflight.alphaCombat,s=api.state(),ship=s?.ships[this.shipId];
    if(type==="open-command"){const hud=await game.arkflight.alphaCombat.open();hud.tab="plan";await hud.render({force:true});return;}
    if(type==="phase-tracker"){await openPhaseTracker();return;}
    if(type==="reset-panel"){this.confirmReset=!this.confirmReset;await this.render({force:true});return;}
    if(type==="master-details"){this.masterDetails=!this.masterDetails;await this.render({force:true});return;}
    if(type==="fire"&&data.batteryId)this.batteryId=data.batteryId;
    if(type==="show-weapons"){this.element.querySelector(".alpha-armory")?.scrollIntoView({block:"start",behavior:alphaPreferences().mode==="off"?"instant":"smooth"});return;}
    if(type==="fold-hand"){this.handFolded=!this.handFolded;alphaSound(this.handFolded?"close":"ready");await this.render({force:true});return;}
    if(type==="compact"){this.toggleCompact();await this.render({force:true});return;}
    if(type==="close-inspector"){this.dismissInspection();alphaSound("close");await this.render({force:true});return;}
    if(type==="library"){await api.library.open(ship?.actorId);return;}
    if(type==="preview"){if(!ship||!api.canOperate(ship.id,"navigator"))return;const m=legalHullManeuvers(ship,alphaComplications(s,ship.id)).find(m=>m.id===(this.maneuvers[ship.id]??s.plans[ship.id]??"hold"));showAlphaManeuver(s,ship.id,m);return;}
    if(type==="arcs"){showAlphaBattery(s,ship.id,data.batteryId??this.batteryId);return;}
    if(type==="hide-overlay"){clearAlphaOverlay();return;}
    if(type==="report"){const report=JSON.stringify(api.diagnostics(),null,2);try{await navigator.clipboard.writeText(report);this.report="";}catch{this.report=report;}await this.render({force:true});return;}
    if(type==="scene"){await game.scenes.get(s.canvas.sceneId)?.view();return;}
    if(type==="minimize"){await this.minimize();return;}
    if(type==="find"){const token=canvas.tokens.get(ship.tokenIds[0]);token?.control({releaseOthers:true});if(token)await canvas.animatePan(token.center);return;}
    let folded=false;
    this.busy=true;this.error="";await this.render({force:true});
    try{
      const send=async(command)=>{
        const current=api.state(),owner=current?.ships[command.shipId??this.shipId],c=command.instanceId&&owner?alphaCardFor(owner,command.instanceId):null;
        if((command.type==="move"||command.type==="play"&&["helm","breakaway","ahead"].includes(c?.id))&&!this.minimized){folded=true;await this.minimize();}
        const cardElement=command.type==="play"?(this.inspectId===command.instanceId?this.element.querySelector(".alpha-inspector-face"):null)??[...this.element.querySelectorAll("[data-alpha-card]")].find(n=>n.dataset.alphaCard===command.instanceId):null;
        const destination=this.element.querySelector(`[data-alpha-pile="${c?.burn?"burned":c?.delayed?"prepared":"discard"}"]`);
        const result=await api.request({encounterId:current?.id,revision:current?.revision,shipId:this.shipId,...command});
        if(cardElement)void this.effectsEngine.flyCard(cardElement,destination);
        return result;
      };
      let result;
      if(type==="next-step"){const step=alphaSuggestedStep(api.state());if(!step)throw new Error("No suggested action remains.");result=await send(step.command);}
      else if(type==="roll-crew"||type==="cancel-crew"){
        const request=api.state().pendingCrewAction;if(!request)throw new Error("No station check is waiting.");
        result=await send({type,shipId:request.shipId,requestId:request.id,skill:this.pendingSkills[request.id]??""});
      }
      else if(type==="reset"){result=await send({type:"reset"});this.confirmReset=false;this.inspectId=null;this.selections.clear();await masterInstance?.close();}
      else if(type==="start")result=await send({type,...this.build});
      else if(type==="start-saved")result=await send({type:"start",count:Object.keys(s?.ships??{}).length,useSavedShips:true});
      else if(type==="open-boarding"){if(!this.boardingSceneId)throw new Error("Choose a prepared deck scene first.");result=await send({type:"pause-boarding"});await game.scenes.get(this.boardingSceneId)?.view();this.tab="ship";}
      else if(type==="return-boarding"){await game.scenes.get(s.canvas.sceneId)?.view();result=await send({type:"resume-boarding"});}
      else if(type==="plan")result=await send({type:"plan",maneuverId:this.maneuvers[ship.id]??s.plans[ship.id]??"hold"});
      else if(type==="lock"){
        if(api.canOperate(ship.id,"navigator"))await send({type:"plan",maneuverId:this.maneuvers[ship.id]??s.plans[ship.id]??"hold"});
        result=await send({type:"lock"});
      }else if(type==="ready-enemies"){
        for(const enemy of Object.values(s.ships).filter(x=>x.team==="enemy"&&!s.locked[x.id]&&x.resources.hull.value>0)){
          const route=legalHullManeuvers(enemy,alphaComplications(s,enemy.id)).find(m=>m.id===`straight-${Math.min(3,enemy.profile.speed)}`)??{id:"hold"};
          await send({type:"plan",shipId:enemy.id,maneuverId:route.id});result=await send({type:"lock",shipId:enemy.id});
        }
      }else if(type==="play"){
        const c=alphaCardFor(ship,this.inspectId),resolvedInstance=this.inspectId;result=await send({type,instanceId:this.inspectId,skill:this.skills[c.stations[0]]??ALPHA_SKILLS[c.stations[0]][0],attackSkill:this.skills.attack??ALPHA_SKILLS.battlewatch[0],batteryId:this.batteryId,targetId:this.targetId,adjustment:this.adjustment,exploitEffectId:data.effectId});this.selections.clear();if(c.id==="vent"){this.masterReceiptId=resolvedInstance;this.inspectId=resolvedInstance;}else{this.masterReceiptId=null;this.inspectId=null;}
      }else if(type==="mulligan"||type==="discard"){
        result=await send({type,instances:[...this.selections]});this.selections.clear();this.inspectId=null;
      }else if(type==="regroup"){
        result=await send({type,instanceId:this.inspectId});this.selections.clear();this.inspectId=null;
      }else result=await send({type,batteryId:this.batteryId,attackSkill:this.skills.attack??ALPHA_SKILLS.battlewatch[0],...data});
      if(type==="assign-station")this.tab="ship";
      else if(result?.phase==="cards"){const active=activeAlphaShip(result);if(api.ownsShip(active))this.shipId=active;this.tab="hand";}
      else if(result?.phase==="response"){const target=result.attacks[result.attackIndex]?.targetId;if(api.ownsShip(target))this.shipId=target;this.tab="hand";}
      else if(result?.phase==="planning")this.tab="plan";
      else if(result?.phase==="targeting"||result?.phase==="retarget")this.tab="plan";
      else if(result?.phase==="cleanup"||result?.complete)this.tab="log";
    }catch(error){this.error=error.message;alphaSound("failure");}finally{if(folded&&this.minimized)await this.maximize();this.busy=false;if(this.rendered)await this.render({force:true});if(type==="start"||type==="start-saved"||type==="reset"){await openPhaseTracker();}if(type==="start"||type==="start-saved"||folded)await this.focusFleet(api.state());}
  }
  toggleCompact(){const old=this.position?.height??this.options.position.height;this.compact=!this.compact;if(this.compact)this.expandedHeight=old;const height=this.compact?220:Math.min(this.expandedHeight??650,innerHeight-70),top=Math.max(20,Math.min(innerHeight-height-30,(this.position?.top??20)+old-height));this.setPosition?.({height,top});}
  dismissInspection(){const s=game.arkflight.alphaCombat.state(),ship=s?.ships[this.shipId],multi=ship&&(s.pendingDiscard?.shipId===ship.id||s.round===1&&!ship.mulliganDone&&s.phase==="planning");this.inspectId=null;this.pileId=null;if(!multi)this.selections.clear();}
  async focusFleet(s){
    if(!s?.canvas||canvas?.scene?.id!==s.canvas.sceneId)return;
    const points=Object.values(s.ships).map(ship=>canvas.tokens.get(ship.tokenIds[0])?.center).filter(Boolean);if(!points.length)return;
    const rect=this.element.getBoundingClientRect(),sidebar=document.querySelector("#sidebar")?.getBoundingClientRect(),right=sidebar&&sidebar.width>0?sidebar.left:innerWidth;
    const free=right-rect.right-20, targetX=free>=240?rect.right+free/2:innerWidth/2;
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),spanX=Math.max(...xs)-Math.min(...xs),spanY=Math.max(...ys)-Math.min(...ys);
    const scale=Math.max(.3,Math.min(.8,(Math.max(240,free)-60)/(spanX+160),(innerHeight-130)/(spanY+160)));
    await canvas.animatePan({x:(Math.min(...xs)+Math.max(...xs))/2-(targetX-innerWidth/2)/scale,y:(Math.min(...ys)+Math.max(...ys))/2,scale,duration:350});
  }
  async minimize(...args){this.effectsEngine.clear(false);return super.minimize(...args);}
  async close(options={}){this.effectsEngine.clear();clearAlphaOverlay();return super.close(options);}
}
/** One portrait, separate from the combat dashboard; actions still use its controller. */
export class AlphaMasterCardWindow extends AlphaCombatWindow {
  static DEFAULT_OPTIONS={id:"arkflight-alpha-master-card",classes:["arkflight-alpha-combat","alpha-command-deck","alpha-master-window"],window:{title:"Arkflight — Vent Strain",icon:"fa-solid fa-dice-d20",resizable:false},position:{width:370,height:633}};
  preview=true;masterDetails=false;receiptKey=null;
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
  constructor(options={}){super({...options,position:{width:Math.min(440,innerWidth-32),height:235,left:Math.min(80,Math.max(8,innerWidth-Math.min(440,innerWidth-32)-16)),top:18,...options.position}});}
  async _prepareContext(options){return {...await super._prepareContext(options),trackerOnly:true};}
  async _onRender(c,o){await super._onRender(c,o);if(!this.minimized){const rows=Math.ceil((c.fleet.rows.length||1)/((this.position?.width??440)<340?1:2));this.setPosition?.({height:Math.min(innerHeight-60,Math.max(235,160+rows*60))});}}
}
export async function openPhaseTracker(){trackerInstance??=new AlphaPhaseTrackerWindow();await trackerInstance.render({force:true});if(trackerInstance.minimized)await trackerInstance.maximize();trackerInstance.bringToFront();return trackerInstance;}
Hooks.once("init",()=>game.settings.registerMenu("arkflight-game","alphaCombatWindow",{name:"Arkflight 1.1 Alpha Combat",label:"Open 1.1 Alpha",hint:"Dedicated test ships, hull maneuvers and phased deck combat.",icon:"fa-solid fa-compass",type:AlphaCombatWindow,restricted:false}));
Hooks.once("ready",()=>{
  game.arkflight.alphaCombat=Object.freeze(Object.defineProperties({async open({tab}={}){if(tab==="forge")return openMasterCard({preview:true});if(tab==="tracker")return openPhaseTracker();instance??=new AlphaCombatWindow();await instance.render({force:true});if(instance.minimized)await instance.maximize();instance.bringToFront();return instance;}},Object.getOwnPropertyDescriptors(game.arkflight.alphaCombat)));
});
Hooks.on("arkflightAlphaChanged",()=>{if(instance?.rendered&&!instance.busy)void instance.render({force:true});if(masterInstance?.rendered&&!masterInstance.busy)void masterInstance.render({force:true});if(trackerInstance?.rendered&&!trackerInstance.busy)void trackerInstance.render({force:true});});
Hooks.on("arkflightAlphaPresentationChanged",()=>{if(instance?.rendered){instance.effectsEngine.clear(false);void instance.render({force:true});}});

let lastCrewPrompt=null;
Hooks.on("arkflightAlphaChanged",()=>{
  const api=game.arkflight?.alphaCombat,s=api?.state(),r=s?.pendingCrewAction;
  if(!r||game.user.isGM||r.id===lastCrewPrompt||!api.canOperate(r.shipId,r.station))return;
  lastCrewPrompt=r.id;instance??=new AlphaCombatWindow();instance.shipId=r.shipId;instance.tab="hand";instance.inspectId=null;
  void instance.render({force:true}).then(()=>{if(instance.minimized)return instance.maximize();}).then(()=>instance.bringToFront());
});
