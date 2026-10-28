import { ALPHA_CARDS } from "../alpha/cards.js";
import { cardOutcomes } from "./alpha-combat-presentation.js";

/** All labels are live data; images contain neither rules nor costs. */
export function ventCardModel({s,ship,instanceId,preview=false}={}) {
  const card=ALPHA_CARDS.vent;
  const receipt=!preview&&(s?.log??[]).findLast(e=>e.detail?.kind==="check"&&e.detail.shipId===ship?.id&&e.detail.instanceId===instanceId)?.detail;
  return {...card,preview,art:"modules/arkflight-game/assets/ui/card-forge/vent-strain-art.webp",frame:"modules/arkflight-game/assets/ui/card-forge/engineer-frame.webp",outcomes:cardOutcomes(card),receipt:receipt&&{...receipt,label:["Critical failure","Failure","Success","Critical success"][receipt.degree+1],skillName:String(receipt.skill??"Crew check").replace(/\b\w/g,c=>c.toUpperCase()),components:(receipt.components??[{label:"Check modifier",value:receipt.modifier}]).map(c=>({...c,display:`${c.value>=0?"+":""}${c.value}`}))}};
}
