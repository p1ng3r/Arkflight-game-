import { createAlphaSession } from "../alpha/combat.js";
import { deriveAlphaProfile } from "../alpha/hulls.js";
import { occupiedHexes } from "../alpha/maneuvers.js";
import { gridGeometry } from "./card-combat-canvas.js";
import { prepareStoredShip } from "./alpha-ship-library.js";

const MODULE="arkflight-game", FLAG="alphaCombatFixture", ART="modules/arkflight-game/assets/art/ships/tokens/sirocco.webp";
const angle=x=>(x%360+360)%360;
export function alphaCanvas(state){
  const c=globalThis.canvas;
  if(!state.canvas||c?.scene?.id!==state.canvas.sceneId||!c.grid?.isHexagonal)throw new Error("The primary GM must view the alpha encounter's hex scene.");
  if(c.grid.type!==state.canvas.gridType||c.grid.size!==state.canvas.gridSize)throw new Error("The alpha grid changed; restore it before continuing.");
  return c;
}
export function alphaNativePose(token,grid){
  const source=token.toObject(), center=token.getCenterPoint(source), cell=grid.getCube(center);
  return {q:cell.q,r:cell.r,rotation:Number(source.rotation??0),x:source.x,y:source.y};
}
function fixtureToken(state,id){
  const c=alphaCanvas(state), token=c.scene.tokens.get(id);
  if(!token||token.flags?.[MODULE]?.[FLAG]!==true)throw new Error("An original alpha fixture token is missing or was replaced.");
  const row=Object.values(state.ships).find(s=>s.tokenIds?.includes(id));
  if(!row||token.actorId!==row.actorId||token.actorLink===false)throw new Error("An alpha token's Actor binding changed.");
  return token;
}
function matches(token,expected,grid){const p=alphaNativePose(token,grid);return p.q===expected.q&&p.r===expected.r&&Math.abs((angle(p.rotation)-angle(expected.rotation)+540)%360-180)<.1;}
export function expectedAlphaTokens(state,poses=Object.fromEntries(Object.entries(state.ships).map(([id,s])=>[id,s.pose]))){
  const rows=[];
  for(const [id,ship]of Object.entries(state.ships)){
    const cells=occupiedHexes(poses[id],ship.profile.footprint,state.directions);
    if(ship.tokenIds?.length!==cells.length)throw new Error("The ship footprint marker count changed.");
    for(const [i,cell]of cells.entries())rows.push({tokenId:ship.tokenIds[i],...cell,rotation:state.headings[poses[id].heading]});
  }
  return rows;
}
export function assertAlphaNativePositions(state){
  if(!state?.canvas||state.complete)return;
  const c=alphaCanvas(state);
  for(const expected of expectedAlphaTokens(state))if(!matches(fixtureToken(state,expected.tokenId),expected,c.grid))throw new Error("An alpha token moved outside its saved maneuver. Use the recovery controls before continuing.");
}
function pixelDestination(token,expected,grid){
  const center=grid.getCenterPoint({q:expected.q,r:expected.r,s:-expected.q-expected.r}), old=token.getCenterPoint();
  // Capture immutable intent before passing fresh objects to native document code.
  return {x:center.x-(old.x-token.x),y:center.y-(old.y-token.y),rotation:expected.rotation};
}
export function alphaObstacleTest(state){
  const c=alphaCanvas(state), rect=c.dimensions.sceneRect;
  const boundIds=new Set(Object.values(state.ships).flatMap(s=>s.tokenIds));
  const extra=c.scene.tokens.contents.filter(t=>!boundIds.has(t.id)).map(t=>alphaNativePose(t,c.grid));
  return ({shipId,fromCells,toCells})=>{
    const anchor=fixtureToken(state,state.ships[shipId].tokenIds[0]);
    return toCells.some((cell,index)=>{
      const point=c.grid.getCenterPoint({q:cell.q,r:cell.r,s:-cell.q-cell.r});
      const start=fromCells[index],origin=c.grid.getCenterPoint({q:start.q,r:start.r,s:-start.q-start.r});
      return point.x<rect.x||point.y<rect.y||point.x>rect.x+rect.width||point.y>rect.y+rect.height||extra.some(t=>t.q===cell.q&&t.r===cell.r)||Boolean(anchor.object?.checkCollision?.(point,{origin,type:"move",mode:"any"}));
    });
  };
}

/** A bounded native batch; acknowledgement and final pose are separate from animation completion. */
export async function moveAlphaNativeBatch(state,expected,{animate=true,operationId=foundry.utils.randomID()}={}){
  const c=alphaCanvas(state), needed=expected.filter(e=>!matches(fixtureToken(state,e.tokenId),e,c.grid));
  if(!needed.length)return;
  const instructions=Object.fromEntries(needed.map(e=>[e.tokenId,{id:foundry.utils.randomID(),destination:pixelDestination(fixtureToken(state,e.tokenId),e,c.grid)}]));
  let timer,acknowledge;
  const ack=new Promise(resolve=>{acknowledge=resolve;});
  const allMatch=()=>needed.every(e=>matches(fixtureToken(state,e.tokenId),e,c.grid));
  const onMove=(_token,_changes,options)=>{try{if(options?.arkflightAlphaOperationId===operationId&&allMatch())acknowledge(true);}catch{ /* Final validation reports a missing or replaced token without throwing inside Foundry hooks. */ }};
  Hooks.on("updateToken",onMove);
  try{
    const operation=Promise.resolve().then(()=>c.scene.moveTokens(structuredClone(instructions),{animate,autoRotate:false,pan:false,showRuler:false,arkflightAlpha:true,arkflightAlphaOperationId:operationId,animation:{movementSpeed:3}})).then(result=>{
      if(Object.values(result??{}).some(done=>done===false))throw new Error("Foundry stopped or prevented an alpha token's move.");
      return true;
    });
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Foundry did not confirm this movement. The resolved move is saved for recovery.")),6000);});
    await Promise.race([operation,ack,timeout]);
    if(!allMatch())throw new Error("Native tokens do not match the resolved hexes/facings. The move remains recoverable.");
    const animations=needed.map(e=>c.scene.tokens.get(e.tokenId)?.object?.movementAnimationPromise).filter(Boolean);
    if(animations.length)await Promise.race([Promise.all(animations),timeout]);
    if(!allMatch())throw new Error("A token changed after movement confirmation; recover the saved move.");
  }finally{clearTimeout(timer);Hooks.off("updateToken",onMove);}
}
export async function runAlphaMovementJournal(journal,saveProgress){
  const next=journal.next;
  for(let index=journal.step;index<next.movement.frames.length;index++){
    const previous=index?expectedAlphaTokens(next,next.movement.frames[index-1]):journal.start;
    const expected=expectedAlphaTokens(next,next.movement.frames[index]), c=alphaCanvas(next);
    // A partially applied batch may contain previous and intended positions, never unrelated drift.
    for(const row of expected){const token=fixtureToken(next,row.tokenId),prior=previous.find(p=>p.tokenId===row.tokenId);if(!matches(token,row,c.grid)&&!matches(token,prior,c.grid))throw new Error("A token is outside both the saved and intended step. Restore the initial positions first.");}
    await moveAlphaNativeBatch(next,expected);
    journal.step=index+1;journal.error=null;await saveProgress(structuredClone(journal));
  }
  assertAlphaNativePositions(next);
}
export async function restoreAlphaMovementJournal(journal){
  await moveAlphaNativeBatch(journal.before,journal.start,{animate:false});
  assertAlphaNativePositions(journal.before);
}

export async function prepareAlphaFleet(command){
  if(!game.user.isGM)throw new Error("Only a GM may create the alpha test fleet.");
  const count=command.count===4?4:2, level=Number(command.level??5);
  const specs=Array.from({length:count},(_,i)=>({id:`alpha-${i}`,name:["[Alpha] Rum Runner","[Alpha] Needlewake","[Alpha] Swiftwake","[Alpha] IronSpear"][i],team:i%2?"enemy":"crew",hullId:i===0?(command.hullId??"brigantine"):i===1?(command.enemyHullId??"cutter"):i===2?"cutter":"frigate",level,upgrades:i===0?command.upgrades??[]:[],talents:i===0?command.talents??[]:[],deck:i===0?command.deck:undefined}));
  for(const spec of specs)deriveAlphaProfile(spec);
  if(game.combats.contents.some(c=>c.active&&c.started&&!c.flags?.[MODULE]?.alphaCombat))throw new Error("End the other active Foundry encounter before creating the alpha test.");
  let scene=game.scenes.contents.find(s=>s.flags?.[MODULE]?.alphaCombatScene===true);
  if(scene&&scene.tokens.contents.some(t=>!t.flags?.[MODULE]?.[FLAG]))throw new Error("The alpha scene contains other tokens. Use a clean dedicated alpha scene before resetting fixtures.");
  if(!scene)scene=await Scene.create({name:"[Alpha] Arkflight — Ship Combat",width:3200,height:2600,padding:.1,active:false,navigation:true,backgroundColor:"#081925",grid:{type:4,size:100,distance:1,units:"hex",color:"#74949f",alpha:.3},flags:{[MODULE]:{alphaCombatScene:true}}});
  await scene.view();
  const c=globalThis.canvas;if(c?.scene?.id!==scene.id||!c.grid?.isHexagonal)throw new Error("Wait for the alpha hex scene to load, then retry setup.");
  const geometry=gridGeometry(c.grid), rect=c.dimensions.sceneRect, origin=c.grid.getCube({x:rect.x+rect.width/2,y:rect.y+rect.height/2});
  const entries=[];
  for(const [i,spec]of specs.entries()){
    let actor=game.actors.contents.find(a=>a.flags?.[MODULE]?.alphaCombatShip===spec.id);
    const art=i%2?"modules/arkflight-game/assets/art/ships/tokens/rime-serpent.webp":ART;
    if(!actor)actor=await Actor.create({name:spec.name,type:"vehicle",img:art,ownership:{default:0},prototypeToken:{texture:{src:art},width:1,height:1,lockRotation:false,flags:{pf2e:{linkToActorSize:false,autoscale:false}}},flags:{[MODULE]:{alphaCombatShip:spec.id,alphaShip:spec}}},{renderSheet:false});
    const pose={q:origin.q+(i%2?0:-3),r:origin.r+(i%2?-4:2)+Math.floor(i/2)*7,heading:i%2?3:0};
    const persisted=await prepareStoredShip(actor,spec,{useSavedShips:command.useSavedShips===true});
    entries.push({...persisted,actorId:actor.id,pose,stationActors:actor.flags?.[MODULE]?.alphaStationActors??{}});
  }
  const state=createAlphaSession(entries,{id:foundry.utils.randomID(),seed:Math.floor(Math.random()*0xffffffff)+1,...geometry});
  state.canvas={sceneId:scene.id,gridType:c.grid.type,gridSize:c.grid.size};
  const retained=new Set();
  for(const entry of entries){
    const ship=state.ships[entry.id], actor=game.actors.get(entry.actorId), cells=occupiedHexes(ship.pose,ship.profile.footprint,state.directions);ship.tokenIds=[];
    for(const [section,cell]of cells.entries()){
      let token=scene.tokens.contents.find(t=>t.flags?.[MODULE]?.[FLAG]&&t.actorId===actor.id&&t.flags?.[MODULE]?.alphaSection===section);
      if(!token){
        const doc=await actor.getTokenDocument({actorLink:true,name:section?`${ship.name} · Hull ${section+1}`:ship.name,width:1,height:1,rotation:state.headings[ship.pose.heading],texture:{src:section?"icons/svg/shield.svg":actor.img},alpha:section?.3:1,flags:{[MODULE]:{[FLAG]:true,alphaSection:section},pf2e:{linkToActorSize:false,autoscale:false}}});
        const source=doc.toObject();delete source._id;const point=c.grid.getCenterPoint({q:cell.q,r:cell.r,s:-cell.q-cell.r}), center=doc.getCenterPoint();source.x=point.x-(center.x-doc.x);source.y=point.y-(center.y-doc.y);
        [token]=await scene.createEmbeddedDocuments("Token",[source]);
      }else{
        await token.update({width:1,height:1,"flags.pf2e.linkToActorSize":false,"flags.pf2e.autoscale":false},{arkflightAlpha:true,animate:false});
        await token.update(pixelDestination(token,{...cell,rotation:state.headings[ship.pose.heading]},c.grid),{arkflightAlpha:true,animate:false});
      }
      retained.add(token.id);ship.tokenIds.push(token.id);
    }
  }
  const obsolete=scene.tokens.contents.filter(t=>t.flags?.[MODULE]?.[FLAG]&&!retained.has(t.id));
  if(obsolete.length)await scene.deleteEmbeddedDocuments("Token",obsolete.map(t=>t.id));
  let combat=game.combats.contents.find(c=>c.flags?.[MODULE]?.alphaCombat===true&&c.scene?.id===scene.id);
  if(combat)await combat.delete({arkflightAlpha:true});
  combat=await Combat.create({scene:scene.id,active:true,round:0,turn:null,combatants:entries.map(e=>({actorId:e.actorId,tokenId:state.ships[e.id].tokenIds[0],name:e.name})),flags:{[MODULE]:{alphaCombat:true,alphaSessionId:state.id}}});
  state.canvas.combatId=combat.id;assertAlphaNativePositions(state);return state;
}
export async function syncAlphaTracker(state){
  const combat=game.combats.get(state.canvas?.combatId);if(!combat)return;
  {
    const updates=Object.values(state.ships).map(ship=>{const row=combat.combatants.find(c=>c.tokenId===ship.tokenIds[0]);return row?{_id:row.id,initiative:ship.initiative??null,defeated:!livingHull(ship)}:null;}).filter(Boolean);
    if(updates.length)await combat.updateEmbeddedDocuments("Combatant",updates,{arkflightAlpha:true});
  }
  const actorId=state.ships[state.turnOrder[state.turnIndex]]?.actorId, turn=actorId?combat.turns.findIndex(c=>c.actorId===actorId):0;
  await combat.update({active:!state.complete&&state.phase!=="boarding",round:state.round,turn:Math.max(0,turn),[`flags.${MODULE}.alphaPhase`]:state.phase},{arkflightAlpha:true});
}
const livingHull=ship=>ship.resources.hull.value>0;
