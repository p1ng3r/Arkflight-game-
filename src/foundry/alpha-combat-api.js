import { showAlphaCardRolls } from "./alpha-card-dice.js";
import { dispatchAlphaCommand } from "../alpha/combat.js";
import { ALPHA_CARDS, ALPHA_SKILLS } from "../alpha/cards.js";
import { ALPHA_HULLS, ALPHA_UPGRADES, ALPHA_TALENTS } from "../alpha/hulls.js";
import { LIBRARY_COMMANDS } from "../alpha/ship-library.js";
import { libraryShips, viewShipLibrary, handleLibraryCommand } from "./alpha-ship-library.js";
import { prepareAlphaFleet, alphaCanvas, alphaObstacleTest, assertAlphaNativePositions, expectedAlphaTokens, alphaNativePose, runAlphaMovementJournal, restoreAlphaMovementJournal, syncAlphaTracker } from "./alpha-combat-canvas.js";

export const ALPHA_BUILD="alpha-vent-fitted-20261028";
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
  if(["start","move","begin-damage","round","end","assign-station","resume-movement","restore-movement","pause-boarding","resume-boarding"].includes(cmd.type))throw new Error("The GM controls this alpha phase.");
  const ship=s?.ships?.[cmd.shipId];if(!ship||!owns(user,ship.actorId))throw new Error("You do not own this alpha ship.");
  let station;
  if(cmd.type==="play")station=ALPHA_CARDS[ship.instances[cmd.instanceId]]?.stations[0];
  else if(["fire","attack"].includes(cmd.type))station="battlewatch";
  else if(cmd.type==="plan")station="navigator";
  else if(["lock","finish-card"].includes(cmd.type))station="captain";
  if(station&&ship.stationActors[station]&&!owns(user,ship.stationActors[station]))throw new Error(`The assigned ${station} player executes this contribution.`);
  if(cmd.type==="attack"&&s.attacks[s.attackIndex]?.shipId!==ship.id)throw new Error("Only the attacking crew may resolve its attack.");
}
export function alphaPlayerState(user=game.user){
  const value=raw();if(!value?.id)return null;
  const s=copy(value);if(user.isGM)return s;
  delete s.randomState;
  for(const ship of Object.values(s.ships)){
    ship.drawCount=ship.drawPile.length;
    if(!owns(user,ship.actorId)){ship.hand=[];ship.drawPile=[];ship.instances={};ship.library=[];if(s.phase==="planning")delete s.plans[ship.id];}
  }
  delete s.complications.randomState;return s;
}
async function operatorModifier(ship,station,skill){
  const ref=ship.stationActors[station];
  if(!ref)return station==="battlewatch"?ship.profile.attack:ship.profile.support;
  const actor=game.actors.get(ref);if(!actor)throw new Error("The assigned crew Actor is missing; reassign that station during planning.");
  const name=skill==="warfare-lore"?(Object.keys(actor.skills??actor.system?.skills??{}).find(k=>["warfare-lore","warfare"].includes(k))??skill):skill;
  const row=actor.skills?.[name]??actor.system?.skills?.[name];
  const attributes={diplomacy:"cha",intimidation:"cha",society:"int",crafting:"int",arcana:"int",thievery:"dex",survival:"wis",nature:"wis",occultism:"int",medicine:"wis",athletics:"str","warfare-lore":"int"};
  const rank=Math.max(0,Math.min(4,Number(row?.rank??0))), attribute=Number(actor.system?.abilities?.[row?.attribute??attributes[skill]]?.mod??0);
  if(!Number.isFinite(rank)||!Number.isFinite(attribute))throw new Error("The crew skill data is invalid.");
  return ship.profile.level+rank*2+attribute+(station==="battlewatch"?0:ship.profile.support-(ship.profile.level+8));
}
export async function operatorBreakdown(ship,station,skill){
  const modifier=await operatorModifier(ship,station,skill),actor=game.actors.get(ship.stationActors[station]);
  if(!actor)return [{label:"Ship crew baseline",value:modifier}];
  const name=skill==="warfare-lore"?(Object.keys(actor.skills??actor.system?.skills??{}).find(k=>["warfare-lore","warfare"].includes(k))??skill):skill;
  const row=actor.skills?.[name]??actor.system?.skills?.[name],rank=Math.max(0,Math.min(4,Number(row?.rank??0)));
  const level=ship.profile.level,training=rank*2,fit=station==="battlewatch"?0:ship.profile.support-(level+8);
  return [{label:"Ship level",value:level},{label:"Crew proficiency",value:training},{label:"Crew attribute",value:modifier-level-training-fit},{label:"Ship support adjustment",value:fit}];
}
async function saved(value){
  await game.settings.set(MODULE,STATE,value);
  const actual=raw();if(actual?.id!==value.id||actual?.revision!==value.revision)throw new Error("Alpha encounter save was not confirmed.");
}
async function completeJournal(job){
  try{
    await runAlphaMovementJournal(job,value=>game.settings.set(MODULE,JOURNAL,value));
    await saved(job.next);await game.settings.set(MODULE,JOURNAL,{});
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
  if(game.paused&&!["plan","lock","mulligan","assign-station","end"].includes(cmd.type))throw new Error("Unpause Foundry before executing alpha actions.");
  if(cmd.type==="start"){
    if(before?.id&&!before.complete)throw new Error("End the current alpha encounter before resetting the test fleet.");
    const next=await prepareAlphaFleet(cmd);await saved(next);Hooks.callAll("arkflightAlphaChanged");return next;
  }
  if(!before?.id||cmd.encounterId!==before.id||cmd.revision!==before.revision)throw new Error("The alpha encounter changed; refresh before acting.");
  if(cmd.type==="assign-station"){
    if(before.phase!=="planning"||!before.ships[cmd.shipId]||!Object.hasOwn(ALPHA_SKILLS,cmd.station))throw new Error("Assign crew during planning.");
    if(cmd.actorId&&!game.actors.get(cmd.actorId))throw new Error("Choose a valid crew Actor.");
    before.ships[cmd.shipId].stationActors[cmd.station]=cmd.actorId||null;before.revision++;
    await saved(before);Hooks.callAll("arkflightAlphaChanged");return before;
  }
  if(cmd.type!=="end")assertAlphaNativePositions(before);
  const evaluated=[];
  const next=await dispatchAlphaCommand(before,cmd,{roll:async formula=>{const roll=await new Roll(formula).evaluate();evaluated.push(roll);return Number(roll.total);},operatorModifier,operatorBreakdown,isBlocked:cmd.type==="end"?()=>false:alphaObstacleTest(before)});
  if(JSON.stringify(raw())!==JSON.stringify(before))throw new Error("The encounter changed while resolving this action; retry from the saved state.");
  if(next.movement){
    const job={id:foundry.utils.randomID(),before,next,start:expectedAlphaTokens(before),step:0,error:null};
    await game.settings.set(MODULE,JOURNAL,job);return completeJournal(job);
  }
  await saved(next);
  try{await syncAlphaTracker(next);}catch(error){console.error("Arkflight | Alpha tracker",error);ui.notifications.warn("Alpha action saved; native combat tracker synchronization will retry.");}
  if(cmd.type==="play"&&before.ships[cmd.shipId]?.instances[cmd.instanceId]==="vent")await showAlphaCardRolls(evaluated,{user,actorId:before.ships[cmd.shipId].stationActors.engineer??before.ships[cmd.shipId].actorId,shipName:before.ships[cmd.shipId].name});
  Hooks.callAll("arkflightAlphaChanged");return next;
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
  game.arkflight??={};game.arkflight.alphaCombat=Object.freeze({build:ALPHA_BUILD,state:alphaPlayerState,request,diagnostics:alphaDiagnostics,get cards(){if(game.user.isGM)return ALPHA_CARDS;const known=new Set(libraryShips().flatMap(s=>viewShipLibrary(s.id).learned));return Object.fromEntries(Object.entries(ALPHA_CARDS).filter(([id])=>known.has(id)));},library:Object.freeze({ships:libraryShips,view:viewShipLibrary}),hulls:ALPHA_HULLS,upgrades:ALPHA_UPGRADES,talents:ALPHA_TALENTS,recovery:()=>game.user.isGM?copy(journal()):{pending:Boolean(journal()?.next)},ownsShip:shipId=>canOperateAlphaShip(raw(),shipId,null),canOperate:(shipId,station)=>canOperateAlphaShip(raw(),shipId,station)});
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
