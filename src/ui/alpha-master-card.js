import { ALPHA_CARDS } from "../alpha/cards.js";
import { cardOutcomes } from "./alpha-combat-presentation.js";

/** All labels are live data; images contain neither rules nor costs. */
export function ventCardModel({s,ship,instanceId,preview=false}={}) {
  const card=ALPHA_CARDS.vent;
  const receipt=!preview&&!ship?.hand?.includes(instanceId)&&(s?.log??[]).findLast(e=>e.detail?.kind==="check"&&e.detail.shipId===ship?.id&&e.detail.instanceId===instanceId)?.detail;
  const bonus=ship?.profile?.level!=null?1+Math.floor(ship.profile.level/4):null;
  return {...card,preview,summary:`Remove 1d4 + ${bonus??"ship bonus"} Strain.`,criticalSummary:`Critical: remove 2d4 + ${bonus??"ship bonus"} Strain.`,art:"modules/arkflight-game/assets/ui/card-forge/vent-strain-art.webp",frame:"modules/arkflight-game/assets/ui/card-forge/engineer-frame.webp",outcomes:cardOutcomes(card),receipt:receipt&&{...receipt,label:["Critical failure","Failure","Success","Critical success"][receipt.degree+1],skillName:String(receipt.skill??"Crew check").replace(/\b\w/g,c=>c.toUpperCase()),components:(receipt.components??[{label:"Check modifier",value:receipt.modifier}]).map(c=>({...c,display:`${c.value>=0?"+":""}${c.value}`}))}};
}

/** Fit the entire portrait plus native chrome, status and hint inside the viewport. */
export function masterCardPosition({width=globalThis.innerWidth??1280,height=globalThis.innerHeight??800,left,top}={}){
  const cardWidth=Math.max(160,Math.min(390,width-44,(height-145)*2/3));
  const windowWidth=cardWidth+20,windowHeight=Math.ceil(cardWidth*1.5+108);
  return {width:windowWidth,height:windowHeight,left:Math.max(8,Math.min(left??(width-windowWidth)/2,width-windowWidth-8)),top:Math.max(8,Math.min(top??(height-windowHeight)/2,height-windowHeight-8)),cardWidth};
}
