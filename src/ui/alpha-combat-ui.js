import { ALPHA_HULLS, ALPHA_UPGRADES, ALPHA_TALENTS, deriveAlphaProfile } from "../alpha/hulls.js";
import { ALPHA_CARDS, ALPHA_SKILLS, ALPHA_STARTER_DECK } from "../alpha/cards.js";
import { activeAlphaShip, alphaCardFor, alphaComplications, alphaTargetLegal, alphaReplacementTargetLegal, alphaSuggestedStep } from "../alpha/combat.js";
import { legalHullManeuvers, previewManeuver } from "../alpha/maneuvers.js";
import { complicationChoiceOptions } from "../combat/ship-complications.js";
import { SHIP_COMPLICATION_CARDS } from "../content/ship-complications.js";
import { cardArt } from "./card-combat-presentation.js";
import { showAlphaManeuver, showAlphaBattery, clearAlphaOverlay } from "./alpha-combat-overlays.js";

const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
let instance;
const words=value=>String(value??"").replace(/([a-z])([A-Z])/g,"$1 $2").replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase());
const names={planning:"Maneuver Planning",cards:"Card Phase",targeting:"Declare Targets",response:"Incoming Attack",retarget:"Replacement Target",cleanup:"Round Complete",complete:"Encounter Complete",boarding:"Deck Encounter / Ship Battle Paused"};
const artIds={acquire:"acquire-target",patch:"work-the-guns",brace:"brace-impact",prepare:"issue-order",shield:"emergency-ward",helm:"evasive-maneuver",volley:"ready-broadside",harmonic:"reinforce-lifeveil","all-hands":"drive-the-crew",evasive:"attack-vector",read:"charted-course",chainshot:"ready-broadside",breakaway:"breakaway-vector",ahead:"charted-course",overcharge:"feed-the-guns",mend:"mend-lifeveil",rally:"rally-crew",boarding:"rally-crew",ram:"brace-impact",vent:"vent-strain","work-guns":"work-the-guns"};
function glyph(m){
  const preview=previewManeuver({q:0,r:0,heading:0},m), points=preview.trace.map(p=>({x:p.q*1.5,y:p.q*.866+p.r*1.732}));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs)-1,maxX=Math.max(...xs)+1,minY=Math.min(...ys)-1,maxY=Math.max(...ys)+1;
  const scale=Math.min(130/(maxX-minX),100/(maxY-minY)),xy=p=>`${20+(p.x-minX)*scale},${10+(p.y-minY)*scale}`;
  return `<svg viewBox="0 0 175 125" aria-hidden="true"><polyline points="${points.map(xy).join(" ")}" fill="none" stroke="#79cfd5" stroke-width="3"/>${points.map((p,i)=>{const[x,y]=xy(p).split(",");return `<circle cx="${x}" cy="${y}" r="7" fill="${i===points.length-1?"#dcb76f":"#183b47"}" stroke="#79cfd5"/><text x="${x}" y="${Number(y)+3}" fill="#fff" text-anchor="middle" font-size="9">${i}</text>`;}).join("")}</svg>`;
}
export class AlphaCombatWindow extends HandlebarsApplicationMixin(ApplicationV2){
  static DEFAULT_OPTIONS={id:"arkflight-alpha-combat",classes:["arkflight-alpha-combat"],window:{title:"Arkflight — 1.1 Alpha",icon:"fa-solid fa-compass",resizable:true},position:{width:650,height:640}};
  static PARTS={main:{template:"modules/arkflight-game/templates/alpha-combat.hbs"}};
  shipId=null;tab="plan";busy=false;guideOpen=true;report="";error="";inspectId=null;selections=new Set();maneuvers={};skills={};batteryId="starboard";targetId="";adjustment="forward";
  boardingSceneId="";
  build={hullId:"brigantine",enemyHullId:"cutter",level:5,count:2,upgrades:[],talents:[],deck:[...ALPHA_STARTER_DECK]};
  constructor(options={}){super({...options,position:{width:Math.min(560,innerWidth-32),height:Math.min(600,innerHeight-70),...options.position}});}
  async _prepareContext(options){
    const base=await super._prepareContext(options),api=game.arkflight.alphaCombat,s=api.state();
    const accessibleShips=Object.values(s?.ships??{}).filter(x=>api.ownsShip(x.id));
    this.shipId=accessibleShips.some(x=>x.id===this.shipId)?this.shipId:accessibleShips[0]?.id;
    const ship=s?.ships[this.shipId],pending=s?.attacks[s.attackIndex],canControl=ship&&api.ownsShip(ship.id);
    let profile,buildError="";try{profile=deriveAlphaProfile(this.build);if(this.build.deck.length<15||this.build.deck.length>profile.deck)buildError=`Choose 15–${profile.deck} cards.`;}catch(e){buildError=e.message;profile=deriveAlphaProfile({hullId:this.build.hullId,level:this.build.level});}
    const routes=ship&&api.canOperate(ship.id,"navigator")?legalHullManeuvers(ship,alphaComplications(s,ship.id)):[];
    const selectedRoute=routes.find(m=>m.id===(this.maneuvers[ship?.id]??s?.plans[ship?.id]))??routes[0];
    const selected=ship?.hand.find(id=>id===this.inspectId),card=selected?alphaCardFor(ship,selected):null;
    const station=card?.stations[0]??"battlewatch";
    const choices=s?(s.complications.choices.filter(c=>c.status==="pending").map(c=>({id:c.id,shipId:c.shipId,name:s.ships[c.shipId].name,allowed:api.ownsShip(c.shipId),options:complicationChoiceOptions(s.complications,c.id)}))):[];
    const phase=s?.phase, active=activeAlphaShip(s??{turnOrder:[],turnIndex:0});
    const playerActors=game.actors.contents.filter(a=>a.type==="character");
    const attacked=phase==="response"&&pending?.targetId===ship?.id;
    const isInstant=card?.timing==="instant", playable=canControl&&card&&api.canOperate(ship.id,station)&&ship.ap>=card.ap&&(isInstant?attacked&&!pending.responses[ship.id]:phase==="cards"&&active===ship.id)&&!s.pendingDiscard&&!choices.length;
    const targets=ship?Object.values(s.ships).filter(x=>x.team!==ship.team).map(x=>({id:x.id,name:x.name,selected:x.id===this.targetId})):[];
    return {...base,s,ship,buildId:api.build,report:this.report,guideOpen:this.guideOpen,suggestion:s?alphaSuggestedStep(s):null,gm:game.user.isGM,busy:this.busy,error:this.error,buildError,profile,recovery:api.recovery(),hasRecovery:Boolean(api.recovery()?.next??api.recovery()?.pending),phaseName:names[phase]??"Create a Test Fleet",paused:game.paused,tab:this.tab,
      tabs:[{id:"plan",name:"Maneuver"},{id:"hand",name:"Cards"},{id:"ship",name:"Ship / Crew"},{id:"log",name:"Log"},{id:"build",name:"Builder"}].map(t=>({...t,selected:t.id===this.tab})),
      showBuild:!s||this.tab==="build"||(s.complete&&this.tab==="plan"),showPlan:s&&this.tab==="plan"&&!s.complete,showHand:s&&this.tab==="hand",showShip:s&&this.tab==="ship",showLog:s&&this.tab==="log",
      hulls:Object.values(ALPHA_HULLS).map(h=>({...h,selected:h.id===this.build.hullId,enemySelected:h.id===this.build.enemyHullId})),
      upgrades:Object.entries(ALPHA_UPGRADES).map(([id,item])=>({id,...item,checked:this.build.upgrades.includes(id)})),talents:Object.entries(ALPHA_TALENTS).map(([id,item])=>({id,...item,checked:this.build.talents.includes(id)})),
      deckOptions:Object.values(ALPHA_CARDS).map(c=>({...c,count:this.build.deck.filter(id=>id===c.id).length,max:c.unique?1:2})),deckCount:this.build.deck.length,build:this.build,canStart:game.user.isGM&&(!s||s.complete)&&!buildError,
      ships:accessibleShips.map(x=>({id:x.id,name:x.name,selected:x.id===this.shipId,ap:x.ap,hull:x.resources.hull.value,locked:s.locked[x.id],active:x.id===active})),
      meters:ship?Object.entries(ship.resources).map(([name,r])=>({name,...r,percent:100*r.value/r.max,warning:name==="strain"?r.value/r.max>=.5:r.value/r.max<=.5})):[],
      planning:phase==="planning",cardPhase:phase==="cards",targeting:phase==="targeting",responding:phase==="response",canRollAttack:pending&&api.ownsShip(pending.shipId),retargeting:phase==="retarget",cleanup:phase==="cleanup",complete:s?.complete,
      activeName:s?.ships[active]?.name,pending:pending&&{...pending,attacker:s.ships[pending.shipId].name,defender:s.ships[pending.targetId]?.name,ready:Boolean(pending.responses[pending.targetId])},
      canControl,canPlan:ship&&api.canOperate(ship.id,"navigator"),canLock:ship&&api.canOperate(ship.id,"captain"),canFinish:canControl&&api.canOperate(ship.id,"captain")&&phase==="cards"&&active===ship.id,canRespond:canControl&&attacked&&!pending.responses[ship.id],
      routes:routes.map(m=>({...m,selected:m.id===selectedRoute?.id})),route:selectedRoute&&{...selectedRoute,svg:glyph(selectedRoute)},locked:s?.locked[ship?.id],
      hand:(ship?.hand??[]).map(id=>{const c=alphaCardFor(ship,id);return{...c,instanceId:id,selected:this.selections.has(id),inspect:id===this.inspectId,art:cardArt({id:artIds[c.id],stations:c.stations}),band:c.burn?"BURN":c.delayed?"PREPARE":c.timing.toUpperCase()};}),
      card:card&&{...card,instanceId:selected,art:cardArt({id:artIds[card.id],stations:card.stations}),failure:card.role==="Attack"&&card.stations.length===1?"Miss; normal ammunition and reload apply.":card.id==="boarding"?"Boarding lines are not secured.":`Base effect works; ${station==="captain"?"lose 2% Morale":station==="engineer"?"gain 1 Strain":station==="navigator"?"lose 1 Supply":station==="veilwarden"?"lose 2% Lifeveil":"take 2 Hull wear"}.`},playable,
      skillOptions:ALPHA_SKILLS[station].map(id=>({id,name:words(id),selected:id===(this.skills[station]??ALPHA_SKILLS[station][0])})),attackSkillOptions:ALPHA_SKILLS.battlewatch.map(id=>({id,name:words(id),selected:id===(this.skills.attack??ALPHA_SKILLS.battlewatch[0])})),
      batteries:(ship?.batteries??[]).map(b=>({...b,selected:b.id===this.batteryId,ready:b.readyRound<=s.round&&b.firedRound!==s.round&&!s.attacks.some(a=>a.shipId===ship.id&&a.batteryId===b.id)})),targets,
      orders:(s?.attacks??[]).filter(a=>!a.resolved&&(phase!=="targeting"||api.ownsShip(a.shipId))).map(a=>({...a,name:`${s.ships[a.shipId].name} · ${a.batteryId}`,allowed:api.ownsShip(a.shipId),targets:Object.values(s.ships).filter(t=>alphaTargetLegal(s,a.shipId,a.batteryId,t.id)).map(t=>({id:t.id,name:t.name,selected:t.id===a.targetId}))})),
      retargets:pending?Object.values(s.ships).filter(t=>alphaReplacementTargetLegal(s,pending,t.id)).map(t=>({id:t.id,name:t.name})):[],
      canRetarget:pending&&api.ownsShip(pending.shipId),
      pendingDiscard:ship&&s?.pendingDiscard?.shipId===ship.id?s.pendingDiscard.count:0,canMulligan:canControl&&s?.round===1&&phase==="planning"&&!ship.mulliganDone&&!s.locked[ship.id],
      choices,effects:ship?alphaComplications(s,ship.id).map(e=>({...e,label:s.complications.history.find(r=>r.id===e.receiptId)?.title??words(e.rule??e.stat)})):[],
      adjustments:[{id:"forward",name:"Forward"},{id:"port",name:"Port 60°"},{id:"starboard",name:"Starboard 60°"},{id:"forward-port",name:"Forward + Port on critical success"},{id:"forward-starboard",name:"Forward + Starboard on critical success"}].map(a=>({...a,selected:a.id===this.adjustment})),
      weaponDetails:ship?.batteries??[],
      stations:ship?Object.entries(ALPHA_SKILLS).map(([id,skills])=>({id,name:words(id),skills:skills.map(words).join(" / "),actors:playerActors.map(a=>({id:a.id,name:a.name,selected:a.id===ship.stationActors[id]}))})):[],
      exploits:s&&pending?s.complications.effects.filter(e=>e.kind==="opportunity"&&!e.claimedBy&&e.notBeforeRound<=s.round&&e.expiresRound>=s.round&&[pending.shipId,pending.targetId].includes(e.shipId)).map(e=>({...e,name:words(e.rule),payer:e.rule==="defensive-opening"?pending.targetId:pending.shipId})).filter(e=>api.ownsShip(e.payer)):[],
      boarding:s?.boarding??[],boardingPaused:phase==="boarding",boardingScenes:game.scenes.contents.filter(scene=>scene.id!==s?.canvas?.sceneId).map(scene=>({id:scene.id,name:scene.name,selected:scene.id===this.boardingSceneId})),
      boardingExploits:s&&card?.id==="boarding"?s.complications.effects.filter(e=>e.rule==="boarding-opening"&&e.shipId===this.targetId&&!e.claimedBy&&e.expiresRound>=s.round):[],
      prepared:ship?.prepared??[],history:[...(s?.log??[])].reverse(),canMove:game.user.isGM&&phase==="planning"&&Object.values(s.ships).filter(x=>x.resources.hull.value>0).every(x=>s.locked[x.id])};
  }
  async _onRender(context,options){
    await super._onRender(context,options);
    const root=this.element;
    root.querySelector(".alpha-guide")?.addEventListener("toggle",e=>{this.guideOpen=e.target.open;});
    root.querySelector("[data-alpha-boarding-scene]")?.addEventListener("change",e=>{this.boardingSceneId=e.target.value;});
    root.querySelector("[data-alpha-ship]")?.addEventListener("change",e=>{this.shipId=e.target.value;this.selections.clear();this.inspectId=null;void this.render({force:true});});
    root.querySelector("[data-alpha-maneuver]")?.addEventListener("change",e=>{this.maneuvers[this.shipId]=e.target.value;void this.render({force:true});});
    root.querySelector("[data-alpha-skill]")?.addEventListener("change",e=>{const c=alphaCardFor(game.arkflight.alphaCombat.state().ships[this.shipId],this.inspectId);this.skills[c?.stations[0]??"battlewatch"]=e.target.value;});
    root.querySelector("[data-alpha-attack-skill]")?.addEventListener("change",e=>{this.skills.attack=e.target.value;});
    root.querySelector("[data-alpha-battery]")?.addEventListener("change",e=>{this.batteryId=e.target.value;});
    root.querySelector("[data-alpha-target]")?.addEventListener("change",e=>{this.targetId=e.target.value;});
    root.querySelector("[data-alpha-adjustment]")?.addEventListener("change",e=>{this.adjustment=e.target.value;});
    for(const el of root.querySelectorAll("[data-alpha-tab]"))el.addEventListener("click",()=>{this.tab=el.dataset.alphaTab;clearAlphaOverlay();void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-card]"))el.addEventListener("click",()=>{
      const id=el.dataset.alphaCard,s=game.arkflight.alphaCombat.state(),ship=s.ships[this.shipId],multi=Boolean(s.pendingDiscard?.shipId===ship.id||s.round===1&&!ship.mulliganDone&&s.phase==="planning");
      const had=this.selections.has(id);if(!multi)this.selections.clear();if(had)this.selections.delete(id);else this.selections.add(id);this.inspectId=id;void this.render({force:true});
    });
    for(const el of root.querySelectorAll("[data-alpha-cmd]"))el.addEventListener("click",()=>this.act(el.dataset.alphaCmd,el.dataset));
    for(const el of root.querySelectorAll("[data-alpha-order-target]"))el.addEventListener("change",()=>this.act("target",{attackId:el.dataset.alphaOrderTarget,shipId:el.dataset.shipId,targetId:el.value}));
    for(const el of root.querySelectorAll("[data-alpha-assign]"))el.addEventListener("change",()=>this.act("assign-station",{station:el.dataset.alphaAssign,actorId:el.value}));
    for(const el of root.querySelectorAll("[data-alpha-build]"))el.addEventListener("change",()=>{const k=el.dataset.alphaBuild;this.build[k]=["level","count"].includes(k)?Number(el.value):el.value;void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-fit]"))el.addEventListener("change",()=>{const key=el.dataset.alphaFit;this.build[key]=[...root.querySelectorAll(`[data-alpha-fit="${key}"]:checked`)].map(n=>n.value);void this.render({force:true});});
    for(const el of root.querySelectorAll("[data-alpha-deck]"))el.addEventListener("change",()=>{this.build.deck=[...root.querySelectorAll("[data-alpha-deck]")].flatMap(n=>Array(Math.max(0,Math.min(2,Number(n.value)||0))).fill(n.dataset.alphaDeck));void this.render({force:true});});
  }
  async act(type,data={}){
    if(this.busy)return;
    const api=game.arkflight.alphaCombat,s=api.state(),ship=s?.ships[this.shipId];
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
        return api.request({encounterId:current?.id,revision:current?.revision,shipId:this.shipId,...command});
      };
      let result;
      if(type==="next-step"){const step=alphaSuggestedStep(api.state());if(!step)throw new Error("No suggested action remains.");result=await send(step.command);}
      else if(type==="start")result=await send({type,...this.build});
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
        const c=alphaCardFor(ship,this.inspectId);result=await send({type,instanceId:this.inspectId,skill:this.skills[c.stations[0]]??ALPHA_SKILLS[c.stations[0]][0],attackSkill:this.skills.attack??ALPHA_SKILLS.battlewatch[0],batteryId:this.batteryId,targetId:this.targetId,adjustment:this.adjustment,exploitEffectId:data.effectId});this.selections.clear();this.inspectId=null;
      }else if(type==="mulligan"||type==="discard"){
        result=await send({type,instances:[...this.selections]});this.selections.clear();this.inspectId=null;
      }else if(type==="regroup"){
        result=await send({type,instanceId:this.inspectId});this.selections.clear();this.inspectId=null;
      }else result=await send({type,batteryId:this.batteryId,attackSkill:this.skills.attack??ALPHA_SKILLS.battlewatch[0],...data});
      if(result?.phase==="cards"){const active=activeAlphaShip(result);if(api.ownsShip(active))this.shipId=active;this.tab="hand";}
      else if(result?.phase==="response"){const target=result.attacks[result.attackIndex]?.targetId;if(api.ownsShip(target))this.shipId=target;this.tab="hand";}
      else if(result?.phase==="planning")this.tab="plan";
      else if(result?.phase==="targeting"||result?.phase==="retarget")this.tab="plan";
      else if(result?.phase==="cleanup"||result?.complete)this.tab="log";
    }catch(error){this.error=error.message;}finally{if(folded&&this.minimized)await this.maximize();this.busy=false;if(this.rendered)await this.render({force:true});if(type==="start"||folded)await this.focusFleet(api.state());}
  }
  async focusFleet(s){
    if(!s?.canvas||canvas?.scene?.id!==s.canvas.sceneId)return;
    const points=Object.values(s.ships).map(ship=>canvas.tokens.get(ship.tokenIds[0])?.center).filter(Boolean);if(!points.length)return;
    const rect=this.element.getBoundingClientRect(),sidebar=document.querySelector("#sidebar")?.getBoundingClientRect(),right=sidebar&&sidebar.width>0?sidebar.left:innerWidth;
    const free=right-rect.right-20, targetX=free>=240?rect.right+free/2:innerWidth/2;
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),spanX=Math.max(...xs)-Math.min(...xs),spanY=Math.max(...ys)-Math.min(...ys);
    const scale=Math.max(.3,Math.min(.8,(Math.max(240,free)-60)/(spanX+160),(innerHeight-130)/(spanY+160)));
    await canvas.animatePan({x:(Math.min(...xs)+Math.max(...xs))/2-(targetX-innerWidth/2)/scale,y:(Math.min(...ys)+Math.max(...ys))/2,scale,duration:350});
  }
  async close(options={}){clearAlphaOverlay();return super.close(options);}
}
Hooks.once("init",()=>game.settings.registerMenu("arkflight-game","alphaCombatWindow",{name:"Arkflight 1.1 Alpha Combat",label:"Open 1.1 Alpha",hint:"Dedicated test ships, hull maneuvers and phased deck combat.",icon:"fa-solid fa-compass",type:AlphaCombatWindow,restricted:false}));
Hooks.once("ready",()=>{
  game.arkflight.alphaCombat=Object.freeze({...game.arkflight.alphaCombat,async open(){instance??=new AlphaCombatWindow();await instance.render({force:true});if(instance.minimized)await instance.maximize();instance.bringToFront();return instance;}});
});
Hooks.on("arkflightAlphaChanged",()=>{if(instance?.rendered&&!instance.busy)void instance.render({force:true});});
