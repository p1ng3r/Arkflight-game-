/** A ship crew's *online controllers*, not a claim that a physical token is aboard. */
export function activeShipCrewUsers(ship, users, ownsActor){
 if(!ship||typeof ownsActor!=="function")return [];
 const active=[...users].filter(u=>u?.active&&!u.isGM&&u.id&&ship.actorId&&ownsActor(u,ship.actorId));
 const crew=Object.values(ship.stationActors??{}).filter(Boolean);
 const stationed=crew.length?active.filter(u=>crew.some(id=>ownsActor(u,id))):[];
 // Actor ownership of an assigned station is more precise than general vessel ownership.
 // A ship with NPC/unowned assignments still permits its actual online ship controllers.
 const selected=stationed.length?stationed:active;
 return [...new Set(selected.map(u=>u.id))].sort();
}
export const DRAW_ACK_TIMEOUT_MS=12000;
/** Immutable-session-safe presentation state: cards are not yet in the hand. */
export function createDrawReveal(shipDraws, now, timeout=DRAW_ACK_TIMEOUT_MS){
 if(!Number.isFinite(now)||!Number.isFinite(timeout)||timeout<1000)throw new Error("Invalid card reveal deadline.");
 const ships={};
 for(const [id,ids] of Object.entries(shipDraws)){
  if(!Array.isArray(ids)||!ids.length)continue;
  ships[id]={ids:[...ids],required:[],ready:[],deadline:now+timeout};
 }
 return {ships};
}
export function configureDrawControllers(state,controllerMap,now){
 if(!state?.drawReveal)throw new Error("No cards are waiting to be revealed.");
 for(const [shipId,reveal] of Object.entries(state.drawReveal.ships)){
  reveal.required=[...new Set(controllerMap[shipId]??[])].sort();
 }
 return settleDrawReveals(state,now);
}
export function acknowledgeDraw(state,shipId,userId,now){
 const reveal=state?.drawReveal?.ships?.[shipId];
 if(!reveal||state.phase!=="draw-reveal")throw new Error("No card reveal is waiting for this ship.");
 if(!reveal.required.includes(userId))throw new Error("You are not an active controller of this ship.");
 if(!reveal.ready.includes(userId))reveal.ready.push(userId);
 return settleDrawReveals(state,now);
}
export function settleDrawReveals(state,now){
 if(!state?.drawReveal)return false;
 let changed=false;
 for(const [shipId,reveal] of Object.entries(state.drawReveal.ships)){
  if(!reveal.required.every(id=>reveal.ready.includes(id))&&now<reveal.deadline)continue;
  const ship=state.ships[shipId];
  if(!ship||JSON.stringify(ship.pendingDraw??[])!==JSON.stringify(reveal.ids))throw new Error("Pending cards changed during presentation.");
  ship.hand.push(...ship.pendingDraw);delete ship.pendingDraw;
  delete state.drawReveal.ships[shipId];changed=true;
 }
 if(!Object.keys(state.drawReveal.ships).length){delete state.drawReveal;if(state.phase==="draw-reveal")state.phase="card-planning";}
 return changed;
}
