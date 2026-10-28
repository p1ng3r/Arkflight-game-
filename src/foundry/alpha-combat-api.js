import {currentPlannedCard} from "../alpha/round-flow.js";
import {recordAlphaRound} from "./alpha-round-journal.js";
import {postCrewRequest,finishCrewRequest,postActionReceipt,bindCrewChat,crewActionName} from "./alpha-crew-chat.js";
import { showAlphaCardRolls } from "./alpha-card-dice.js";
import { dispatchAlphaCommand } from "../alpha/combat.js";
import { ALPHA_CARDS, ALPHA_SKILLS } from "../alpha/cards.js";
import { ALPHA_HULLS, ALPHA_UPGRADES, ALPHA_TALENTS } from "../alpha/hulls.js";
import { LIBRARY_COMMANDS } from "../alpha/ship-library.js";
import { libraryShips, viewShipLibrary, handleLibraryCommand } from "./alpha-ship-library.js";
import { prepareAlphaFleet, alphaCanvas, alphaObstacleTest, assertAlphaNativePositions, expectedAlphaTokens, alphaNativePose, runAlphaMovementJournal, restoreAlphaMovementJournal, syncAlphaTracker } from "./alpha-combat-canvas.js";

export const ALPHA_BUILD="alpha-round-deck-20261028";
const MODULE="arkflight-game", STATE="alphaCombat", JOURNAL="alphaMovementJournal", pending=new Map();
let queue=Promise.resolve();
const copy=x=>structuredClone(x), raw=()=>game.settings.get(MODULE,STATE), journal=()=>game.settings.get(MODULE,JOURNAL);
const primary=()=>[...game.users].filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
const owns=(user,id)=>Boolean(id&&game.actors.get(id)?.testUserPermission(user,"OWNER"));
export function canOperateAlphaShip(s,shipId,station,user=game.user){
  const ship=s?.ships?.[shipId];
  return Boolean(user?.active&&ship&&(user.isGM||owns(user,ship.actorId)&&(!ship.stationActors[station]||owns(user,ship.stationActors[station]))));
}
export function authorizeAlphaCommand(s,cmd,user){
  if(!user?.active)throw new Error("An active authenticated user is required.");
  if(user.isGM)return;
  if(["start","move","begin-damage","round","retry-recap","end","reset","assign-station","resume-movement","restore-movement","pause-boarding","resume-boarding"].includes(cmd.type))throw new Error("The GM controls this alpha phase.");
  const ship=s?.ships?.[cmd.shipId];if(!ship||!owns(user,ship.actorId))throw new Error("You do not own this alpha ship.");
  let station;
  if(cmd.type==="roll-crew"){if(s.pendingCrewAction?.shipId!==ship.id)throw new Error("This crew request belongs to another ship.");station=s.pendingCrewAction.station;}
  else if(cmd.type==="cancel-crew")station="captain";
  else if(["play","resolve-card"].includes(cmd.type))station=ALPHA_CARDS[ship.instances[cmd.instanceId]]?.stations[0];
  else if(["fire","attack","damage"].includes(cmd.type))station="battlewatch";
  else if(cmd.type==="plan")station="navigator";
  else if(["lock","finish-card","lock-cards","finish-firing","skip-card"].includes(cmd.type))station="captain";
  if(station&&ship.stationActors[station]&&!owns(user,ship.stationActors[station]))throw new Error(`The assigned ${station} player executes this contribution.`);
  if(["attack","damage"].includes(cmd.type)&&s.attacks[s.attackIndex]?.shipId!==ship.id)throw new Error("Only the attacking crew may resolve its attack.");
}
export function alphaPlayerState(user=game.user){
  const value=raw();if(!value?.id)return null;
  const s=copy(value);if(user.isGM)return s;
  delete s.randomState;
  if(s.pendingCrewAction&&!owns(user,s.ships[s.pendingCrewAction.shipId]?.actorId))delete s.pendingCrewAction.command;
  for(const ship of Object.values(s.ships)){
    ship.drawCount=ship.drawPile.length;
    if(!owns(user,ship.actorId)){if(s.cardPlans)delete s.cardPlans[ship.id];ship.hand=[];ship.drawPile=[];ship.instances={};ship.library=[];if(s.phase==="planning")delete s.plans[ship.id];}
  }
  if(!['cleanup','complete'].includes(s.phase))for(const key of ['log','roundEvents'])if(s[key])s[key]=s[key].filter(e=>e.detail?.kind!=="plan"||owns(user,s.ships[e.detail.shipId]?.actorId));
  delete s.complications.randomState;return s;
}
async function operatorModifier(ship,station,skill){
  const ref=ship.stationActors[station];
  if(!ref)return station==="battlewatch"?ship.profile.attack:ship.profile.support;
  const actor=game.actors.get(ref);if(!actor)throw new Error("The assigned crew Actor is missing; reassign that station during planning.");
  const name=skill==="warfare-lore"?(Object.keys(actor.skills??actor.system?.skills??{}).find(k=>["warfare-lore","warfare"].includes(k))??skill):skill;
  const row=actor.skills?.[name]??actor.system?.skills?.[name];
  if(actor.type==="npc"){
    const total=Number(row?.mod??row?.totalModifier??row?.value),level=Number(actor.level??actor.system?.details?.level?.value);
    if(!Number.isFinite(total)||!Number.isFinite(level))throw new Error("This NPC needs a modifier for the chosen skill and a level.");
    return total-level+ship.profile.level+(station==="battlewatch"?0:ship.profile.support-(ship.profile.level+8));
  }
  const attributes={diplomacy:"cha",intimidation:"cha",society:"int",crafting:"int",arcana:"int",thievery:"dex",survival:"wis",nature:"wis",occultism:"int",medicine:"wis",athletics:"str","warfare-lore":"int"};
  const rank=Math.max(0,Math.min(4,Number(row?.rank??0))), attribute=Number(actor.system?.abilities?.[row?.attribute??attributes[skill]]?.mod??0);
  if(!Number.isFinite(rank)||!Number.isFinite(attribute))throw new Error("The crew skill data is invalid.");
  return ship.profile.level+rank*2+attribute+(station==="battlewatch"?0:ship.profile.support-(ship.profile.level+8));
}
export async function operatorBreakdown(ship,station,skill){
  const modifier=await operatorModifier(ship,station,skill),actor=game.actors.get(ship.stationActors[station]);
  if(!actor)return [{label:"Ship crew baseline",value:modifier}];
  const name=skill==="warfare-lore"?(Object.keys(actor.skills??actor.system?.skills??{}).find(k=>["warfare-lore","warfare"].includes(k))??skill):skill;
  if(actor.type==="npc"){
    const row=actor.skills?.[name]??actor.system?.skills?.[name],level=Number(actor.level??actor.system?.details?.level?.value),total=Number(row?.mod??row?.totalModifier??row?.value);
    return [{label:"NPC skill modifier",value:total},{label:"Replace NPC level",value:-level},{label:"Ship level",value:ship.profile.level},{label:"Ship support adjustment",value:modifier-total+level-ship.profile.level}];
  }
  const row=actor.skills?.[name]??actor.system?.skills?.[name],rank=Math.max(0,Math.min(4,Number(row?.rank??0)));
  const level=ship.profile.level,training=rank*2,fit=station==="battlewatch"?0:ship.profile.support-(level+8);
  return [{label:"Ship level",value:level},{label:"Crew proficiency",value:training},{label:"Crew attribute",value:modifier-level-training-fit},{label:"Ship support adjustment",value:fit}];
}
async function saved(value){
  await game.settings.set(MODULE,STATE,value);
  const actual=raw();if(actual?.id!==value.id||actual?.revision!==value.revision)throw new Error("Alpha encounter save was not confirmed.");
}
function stageNextCrewRequest(next){
 if(next.roundFlow!==2||next.pendingCrewAction||next.pendingDiscard||next.complications.choices.some(c=>c.status==='pending'))return false;
 let ship,station,command,name;
 if(next.phase==='resolving'){
  const row=currentPlannedCard(next);ship=next.ships[next.turnOrder[next.turnIndex]];const card=row&&ALPHA_CARDS[ship.instances[row.instanceId]];
  if(!card||card.role==='Attack'&&card.stations.length===1)return false;
  station=card.stations[0];name=card.name;command={type:'resolve-card',shipId:ship.id,instanceId:row.instanceId};for(const key of ['batteryId','targetId','adjustment','attackSkill'])if(row[key]!=null)command[key]=row[key];
 }else if(next.phase==='response'){
  const attack=next.attacks[next.attackIndex];if(!attack?.responses[attack.targetId])return false;ship=next.ships[attack.shipId];station='battlewatch';command={type:'attack',shipId:ship.id};name=crewActionName(next,command);
 }else return false;
 if(game.actors.get(ship.stationActors[station])?.type!=='character')return false;
 next.pendingCrewAction={id:foundry.utils.randomID(),shipId:ship.id,station,kind:command.type,name,command};return true;
}
async function announceNextCrew(next,staged){if(staged)try{await postCrewRequest(next,next.pendingCrewAction,primary());}catch(error){console.warn("Arkflight | Station prompt retained in HUD",error);}}
async function persistRoundRecap(next){
 if(next.roundFlow!==2)return;
 try{if(await recordAlphaRound(next))await saved(next);}catch(error){next.roundJournalError=error.message;await saved(next);console.warn("Arkflight | Round journal retained for retry",error);}
}
async function completeJournal(job){
  try{
    await runAlphaMovementJournal(job,value=>game.settings.set(MODULE,JOURNAL,value));
    const autoPrompt=stageNextCrewRequest(job.next);await saved(job.next);await announceNextCrew(job.next,autoPrompt);await persistRoundRecap(job.next);await game.settings.set(MODULE,JOURNAL,{});
    await syncAlphaTracker(job.next);Hooks.callAll("arkflightAlphaChanged");return job.next;
  }catch(error){job.error=error.message;await game.settings.set(MODULE,JOURNAL,job);Hooks.callAll("arkflightAlphaChanged");throw error;}
}
async function handle(cmd,user){
  if(!cmd||JSON.stringify(cmd).length>50000)throw new Error("Invalid alpha request.");
  if(LIBRARY_COMMANDS.has(cmd.type))return handleLibraryCommand(cmd,user);
  const before=copy(raw());authorizeAlphaCommand(before,cmd,user);
  if(cmd.type==="resume-movement"){
    const job=copy(journal());if(!job?.next)throw new Error("There is no saved movement to resume.");return completeJournal(job);
  }
  if(cmd.type==="restore-movement"){
    const job=copy(journal());if(!job?.before)throw new Error("There is no saved movement to restore.");await restoreAlphaMovementJournal(job);await saved(job.before);await game.settings.set(MODULE,JOURNAL,{});Hooks.callAll("arkflightAlphaChanged");return job.before;
  }
  if(journal()?.next)throw new Error("Resume or restore the saved movement before another action.");
  if(game.paused&&!["plan","lock","mulligan","assign-station","end","reset"].includes(cmd.type))throw new Error("Unpause Foundry before executing alpha actions.");
  if(cmd.type==="start"||cmd.type==="reset"){
    if(cmd.type==="start"&&before?.id&&!before.complete)throw new Error("End the current alpha encounter before resetting the test fleet.");
    if(cmd.type==="reset"){if(cmd.encounterId!==before?.id||cmd.revision!==before?.revision)throw new Error("The encounter changed; refresh before resetting.");if(!before?.id)throw new Error("Start an alpha encounter first.");cmd={type:"start",count:Object.keys(before.ships).length,useSavedShips:true,roundFlow:cmd.roundFlow??before.roundFlow??1};}
    const next=await prepareAlphaFleet(cmd);await saved(next);if(before?.pendingCrewAction){try{await finishCrewRequest(before.pendingCrewAction.id,true);}catch(error){console.warn("Arkflight | Cancelled crew chat",error);}}Hooks.callAll("arkflightAlphaChanged");return next;
  }
  if(!before?.id||cmd.encounterId!==before.id||cmd.revision!==before.revision)throw new Error("The alpha encounter changed; refresh before acting.");
  if(cmd.type==="retry-recap"){if(!["cleanup","complete"].includes(before.phase))throw Error("No completed round is ready.");await persistRoundRecap(before);Hooks.callAll("arkflightAlphaChanged");return before;}
  if(before.pendingCrewAction&&!['roll-crew','cancel-crew','end','reset'].includes(cmd.type))throw new Error("Waiting for the assigned station to choose a skill and roll.");
  if(cmd.type==="cancel-crew"){
    if(!before.pendingCrewAction||cmd.requestId!==before.pendingCrewAction.id)throw new Error("That crew request is no longer active.");
    const next=copy(before),id=next.pendingCrewAction.id;delete next.pendingCrewAction;next.revision++;await saved(next);
    try{await finishCrewRequest(id,true);}catch(error){console.warn("Arkflight | Crew chat",error);}Hooks.callAll("arkflightAlphaChanged");return next;
  }
  let resolvingRequest=null,effectiveBefore=before;
  if(cmd.type==="roll-crew"){
    const request=before.pendingCrewAction;
    if(!request||cmd.requestId!==request.id||cmd.shipId!==request.shipId)throw new Error("That crew request is no longer active.");
    if(!ALPHA_SKILLS[request.station].includes(cmd.skill))throw new Error("Choose one of this station's three skills.");
    resolvingRequest=request;cmd={...request.command,skill:cmd.skill,encounterId:before.id,revision:before.revision};effectiveBefore=copy(before);delete effectiveBefore.pendingCrewAction;
    if(cmd.type==="attack")effectiveBefore.attacks[effectiveBefore.attackIndex].skill=cmd.skill;
  }
  if(cmd.type==="assign-station"){
    if(!["opening","planning","card-planning","cards","cleanup"].includes(before.phase)||!before.ships[cmd.shipId]||!Object.hasOwn(ALPHA_SKILLS,cmd.station))throw new Error("Assign crew during planning, Card phase or cleanup; finish the current attack first.");
    if(cmd.actorId&&!game.actors.get(cmd.actorId))throw new Error("Choose a valid crew Actor.");
    before.ships[cmd.shipId].stationActors[cmd.station]=cmd.actorId||null;before.revision++;
    await saved(before);
    try{await game.actors.get(before.ships[cmd.shipId].actorId)?.update({[`flags.${MODULE}.alphaStationActors`]:before.ships[cmd.shipId].stationActors});}catch(error){console.warn("Arkflight | Crew saved for this encounter only",error);ui.notifications.warn("Crew assigned for this encounter, but could not be saved for the next test.");}
    Hooks.callAll("arkflightAlphaChanged");return before;
  }
  if(!resolvingRequest&&user.isGM&&["play","resolve-card","attack"].includes(cmd.type)){
    const ship=before.ships[cmd.shipId],card=["play","resolve-card"].includes(cmd.type)?ALPHA_CARDS[ship?.instances[cmd.instanceId]]:null;
    const station=cmd.type==="attack"?"battlewatch":card?.stations[0],actor=game.actors.get(ship?.stationActors[station]);
    const needsCheck=cmd.type==="attack"||card&&!(card.role==="Attack"&&card.stations.length===1);
    if(needsCheck&&actor?.type==="character"){
      if(["play","resolve-card"].includes(cmd.type)&&(!ship.hand.includes(cmd.instanceId)||(cmd.type==="play"&&ship.ap<card.ap)))throw new Error("Choose an affordable card in the ship's hand.");
      if(cmd.type==="play"&&card.timing!=="instant"&&(before.phase!=="cards"||before.turnOrder[before.turnIndex]!==ship.id))throw new Error("Wait for this ship's Card phase.");
      if(cmd.type==="play"&&card.timing==="instant"&&(before.phase!=="response"||before.attacks[before.attackIndex]?.targetId!==ship.id||before.attacks[before.attackIndex].responses[ship.id]))throw new Error("Wait for this ship's incoming response window.");
      if(cmd.type==="attack"&&(before.phase!=="response"||before.attacks[before.attackIndex]?.shipId!==ship.id||!before.attacks[before.attackIndex]?.responses[before.attacks[before.attackIndex]?.targetId]))throw new Error("Finish the defender's response before requesting the attack roll.");
      if(cmd.type==="resolve-card"&&(before.phase!=="resolving"||before.turnOrder[before.turnIndex]!==ship.id||before.cardPlans?.[ship.id]?.find(c=>!c.resolved)?.instanceId!==cmd.instanceId))throw Error("Wait for this card’s resolution.");
      assertAlphaNativePositions(before);
      const next=copy(before),command={type:cmd.type,shipId:ship.id};
      for(const key of ['instanceId','batteryId','targetId','adjustment','exploitEffectId','attackSkill'])if(cmd[key]!=null)command[key]=cmd[key];
      next.pendingCrewAction={id:foundry.utils.randomID(),shipId:ship.id,station,kind:cmd.type,name:crewActionName(before,cmd),command};next.revision++;
      await saved(next);try{await postCrewRequest(next,next.pendingCrewAction,user);}catch(error){console.warn("Arkflight | Crew request chat",error);ui.notifications.warn("Crew request saved. Use the HUD; its chat prompt could not be posted.");}Hooks.callAll("arkflightAlphaChanged");return next;
    }
  }
  if(cmd.type==="end"&&before.pendingCrewAction){effectiveBefore=copy(before);delete effectiveBefore.pendingCrewAction;}
  if(cmd.type!=="end")assertAlphaNativePositions(before);
  const evaluated=[];
  const next=await dispatchAlphaCommand(effectiveBefore,cmd,{roll:async (formula,context={})=>{const roll=await new Roll(formula).evaluate(),ship=before.ships[context.shipId??cmd.shipId];evaluated.push({roll,actorId:ship?.stationActors[context.station]??ship?.actorId,shipName:ship?.name});return Number(roll.total);},operatorModifier,operatorBreakdown,isBlocked:cmd.type==="end"?()=>false:alphaObstacleTest(before)});
  if(JSON.stringify(raw())!==JSON.stringify(before))throw new Error("The encounter changed while resolving this action; retry from the saved state.");
  if(next.movement){
    const job={id:foundry.utils.randomID(),before,next,start:expectedAlphaTokens(before),step:0,error:null};
    await game.settings.set(MODULE,JOURNAL,job);const result=await completeJournal(job);await showAlphaCardRolls(evaluated,{user});await publishReceipts(before,result,cmd,user,resolvingRequest,evaluated);return result;
  }
  const autoPrompt=stageNextCrewRequest(next);await saved(next);await announceNextCrew(next,autoPrompt);await persistRoundRecap(next);
  try{await syncAlphaTracker(next);}catch(error){console.error("Arkflight | Alpha tracker",error);ui.notifications.warn("Alpha action saved; native combat tracker synchronization will retry.");}
  await showAlphaCardRolls(evaluated,{user});
  await publishReceipts(before,next,cmd,user,resolvingRequest,evaluated);
  Hooks.callAll("arkflightAlphaChanged");return next;
}
async function publishReceipts(before,next,cmd,user,request,evaluated){
  try{if(request)await finishCrewRequest(request.id);else if(cmd.type==="end"&&before.pendingCrewAction)await finishCrewRequest(before.pendingCrewAction.id,true);await postActionReceipt(before,next,cmd,user,evaluated);}catch(error){console.warn("Arkflight | Saved roll chat",error);ui.notifications.warn("Roll saved, but its chat receipt could not be posted. The HUD Log retains the result.");}
}
function enqueue(cmd,user){const task=queue.catch(()=>{}).then(()=>handle(copy(cmd),user));queue=task;return task;}
export function alphaDiagnostics(){
  const s=raw(),j=journal(),report={build:ALPHA_BUILD,encounterId:s?.id??null,phase:s?.phase??null,round:s?.round??null,revision:s?.revision??null,recovery:j?.next?{id:j.id,step:j.step,totalSteps:j.next.movement.frames.length,error:j.error}:null,ships:[]};
  if(!s?.id)return report;
  try{const c=alphaCanvas(s);report.ships=expectedAlphaTokens(s).map(e=>{const token=c.scene.tokens.get(e.tokenId);return{tokenId:e.tokenId,expected:{q:e.q,r:e.r,rotation:e.rotation},actual:token?alphaNativePose(token,c.grid):null};});}catch(error){report.canvasError=error.message;}
  return report;
}
async function request(cmd){
  const gm=primary();if(!gm)throw new Error("An active GM must run the alpha encounter.");
  if(gm.id===game.user.id)return enqueue(cmd,game.user);
  const requestId=foundry.utils.randomID();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error("Alpha request timed out. Reopen the HUD before retrying."));},30000);pending.set(requestId,{resolve,reject,timer});
    ChatMessage.create({author:game.user.id,whisper:[gm.id],content:"Arkflight alpha request",flags:{[MODULE]:{alphaCommand:{requestId,command:cmd}}}}).catch(error=>{clearTimeout(timer);pending.delete(requestId);reject(error);});
  });
}
Hooks.once("init",()=>{
  for(const key of [STATE,JOURNAL])game.settings.register(MODULE,key,{name:key,scope:"world",config:false,type:Object,default:{}});
});
Hooks.once("ready",()=>{
  game.arkflight??={};game.arkflight.alphaCombat=Object.freeze({build:ALPHA_BUILD,state:alphaPlayerState,request,diagnostics:alphaDiagnostics,get cards(){if(game.user.isGM)return ALPHA_CARDS;const known=new Set(libraryShips().flatMap(s=>viewShipLibrary(s.id).learned));return Object.fromEntries(Object.entries(ALPHA_CARDS).filter(([id])=>known.has(id)));},library:Object.freeze({ships:libraryShips,view:viewShipLibrary}),async crewCheck(shipId,station,skill){const s=raw();if(!canOperateAlphaShip(s,shipId,null))throw new Error("You do not own this ship.");if(!ALPHA_SKILLS[station]?.includes(skill))throw new Error("Choose a valid station skill.");const ship=s.ships[shipId],actor=game.actors.get(ship.stationActors[station]),modifier=await operatorModifier(ship,station,skill);return{name:actor?.name??"NPC ship crew",kind:actor?.type??"ship baseline",skill,modifier,components:await operatorBreakdown(ship,station,skill),modifierText:`${modifier>=0?"+":""}${modifier}`};},hulls:ALPHA_HULLS,upgrades:ALPHA_UPGRADES,talents:ALPHA_TALENTS,recovery:()=>game.user.isGM?copy(journal()):{pending:Boolean(journal()?.next)},ownsShip:shipId=>canOperateAlphaShip(raw(),shipId,null),canOperate:(shipId,station)=>canOperateAlphaShip(raw(),shipId,station)});
});
Hooks.on("createChatMessage",(message,_options,userId)=>{
  const input=message.flags?.[MODULE]?.alphaCommand;if(!input||primary()?.id!==game.user.id)return;
  const user=game.users.get(userId),author=message.author?.id??message.user?.id??message.user;
  if(!user?.active||author!==userId)return;
  enqueue(input.command,user).then(()=>message.update({[`flags.${MODULE}.alphaResult`]:{requestId:input.requestId,ok:true},content:"Alpha request resolved"}),error=>message.update({[`flags.${MODULE}.alphaResult`]:{requestId:input.requestId,ok:false,error:error.message},content:"Alpha request rejected"})).catch(error=>console.error("Arkflight | Alpha relay",error));
});
Hooks.on("updateChatMessage",(message,_changes,_options,userId)=>{
  if(!game.users.get(userId)?.isGM)return;const result=message.flags?.[MODULE]?.alphaResult,job=pending.get(result?.requestId);if(!job)return;
  clearTimeout(job.timer);pending.delete(result.requestId);result.ok?job.resolve(alphaPlayerState()):job.reject(new Error(result.error));
});
Hooks.on("renderChatMessageHTML",(message,html)=>{if(message.flags?.[MODULE]?.alphaCommand)html.style.display="none";});
Hooks.on("updateSetting",setting=>{if([`${MODULE}.${STATE}`,`${MODULE}.${JOURNAL}`].includes(setting.key))Hooks.callAll("arkflightAlphaChanged");});
Hooks.on("preUpdateToken",(token,changes,options)=>{
  if(options?.arkflightAlpha&&game.user.isGM)return;
  const s=raw();if(!s?.id||s.complete||token.parent?.id!==s.canvas?.sceneId||!Object.values(s.ships).some(ship=>ship.tokenIds.includes(token.id)))return;
  if(["x","y","rotation","width","height","actorId","actorLink"].some(key=>key in changes)){ui.notifications.warn("Use the alpha maneuver/card controls while this encounter is running.");return false;}
});
Hooks.on("preUpdateCombat",(combat,changes,options)=>{if(combat.flags?.[MODULE]?.alphaCombat&&!options?.arkflightAlpha&&["round","turn"].some(key=>key in changes)){ui.notifications.warn("Advance alpha phases in the Arkflight HUD.");return false;}});

Hooks.on("updateActor",(_actor,changes)=>{if(Object.keys(changes).some(key=>key==="name"||key==="ownership"||key.startsWith("ownership.")||key.startsWith(`flags.${MODULE}.`)||key==="flags"&&Object.hasOwn(changes.flags??{},MODULE)))Hooks.callAll("arkflightAlphaChanged");});

Hooks.on("renderChatMessageHTML",bindCrewChat);
