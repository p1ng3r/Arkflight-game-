import {ALPHA_CARDS,ALPHA_SKILLS} from "../alpha/cards.js";
const MODULE="arkflight-game",requests=new Map();
const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const crewStationName=id=>({captain:"Captain",engineer:"Engineer",navigator:"Navigator",battlewatch:"Battle Watch",veilwarden:"Lifeveil Warden",structure:"Structure",initiative:"Initiative"}[id]??id);
export function crewActionName(s,cmd){
  const ship=s.ships[cmd.shipId];
  if(cmd.type==="play")return ALPHA_CARDS[ship.instances[cmd.instanceId]]?.name??"Station action";
  if(cmd.type==="attack"){const a=s.attacks[s.attackIndex],b=ship.batteries.find(b=>b.id===a?.batteryId);return `${b?.name??a?.batteryId??"Battery"} · attack & damage`;}
  return "Ship check";
}
export async function postCrewRequest(s,request,user){
  if(!globalThis.ChatMessage?.create)return;
  const ship=s.ships[request.shipId],actor=game.actors.get(ship.stationActors[request.station]);
  const options=ALPHA_SKILLS[request.station].map(skill=>`<option value="${escape(skill)}">${escape(skill)}</option>`).join("");
  const content=`<article class="arkflight-crew-chat"><header>${escape(ship.name)} · ${escape(crewStationName(request.station))}</header><h3>${escape(request.name)}</h3><p>Waiting for ${escape(actor?.name??"assigned crew")} to choose a skill and roll.</p><label>Station skill<select class="alpha-crew-chat-skill"><option value="">Choose skill…</option>${options}</select></label><button type="button" class="alpha-crew-chat-roll" data-request-id="${escape(request.id)}">Roll station check</button><small>${request.kind==="attack"?"Shot already committed; no additional AP to roll.":"AP and card effects resolve once, when the check is rolled."}</small></article>`;
  const message=await ChatMessage.create({author:user.id,speaker:{actor:ship.stationActors[request.station]??ship.actorId,alias:ship.name},content,flags:{[MODULE]:{alphaCrewRequest:{id:request.id,shipId:request.shipId,station:request.station}}}});
  requests.set(request.id,message);
}
export async function finishCrewRequest(id,cancelled=false){
  const message=requests.get(id)??game.messages?.contents?.find(m=>m.flags?.[MODULE]?.alphaCrewRequest?.id===id);
  if(message?.update)await message.update({content:`<article class="arkflight-crew-chat"><p>Station roll request ${cancelled?"cancelled · no additional AP spent":"resolved · result below"}.</p></article>`});
  requests.delete(id);
}
export function actionReceiptContent(before,after,cmd,evaluated=[]){
  const old=new Set((before.log??[]).map(e=>e.id));
  const entries=after.log.filter(e=>!old.has(e.id)&&["check","damage"].includes(e.detail?.kind));
  if(!entries.length)return null;
  const shipBefore=before.ships[cmd.shipId],shipAfter=after.ships[cmd.shipId];
  const changes=shipBefore&&shipAfter?Object.entries(shipBefore.resources).filter(([key,r])=>r.value!==shipAfter.resources[key].value).map(([key,r])=>`${key}: ${r.value} → ${shipAfter.resources[key].value}`).join(" · "):"";
  const effects=cmd.type==="play"?evaluated.map(e=>e.roll??e).filter(r=>r.formula!=="1d20").map(r=>`${r.formula} = ${r.total}`).join(" · "):"";
  const apSpent=shipBefore&&shipAfter?shipBefore.ap-shipAfter.ap:0;
  const extra=`${apSpent>0?`<p>${apSpent} AP spent</p>`:""}${effects?`<p>Effect dice: ${escape(effects)}</p>`:""}${cmd.type==="play"&&before.ships[cmd.shipId]?.instances[cmd.instanceId]==="vent"?`<small>Additional ship-level relief bonus: +${Math.floor(shipBefore.profile.level/4)}</small>`:""}${changes?`<p>${escape(changes)}</p>`:""}`;
  return `<article class="arkflight-crew-chat"><header>Arkflight · Round ${after.round}</header>${entries.map(e=>{
    const d=e.detail,ship=after.ships[d.shipId],station=d.station??"battlewatch",actor=game.actors.get(ship?.stationActors[station]);
    const shipCheck=d.kind==="check"&&d.skill==null;
    const source=shipCheck?(station==="initiative"?"Ship initiative":`${crewStationName(station)} ship save`):ALPHA_CARDS[d.cardId]?.name??(cmd.type==="play"||cmd.type==="attack"?crewActionName(before,cmd):d.batteryId?`${d.batteryId} battery`:crewStationName(station));
    const degree=["Critical failure","Failure","Success","Critical success"][d.degree+1];
    if(d.kind==="damage")return `<section><h3>${escape(ship?.name)} · ${escape(source)}</h3><p>${escape(d.formula)} → ${escape(d.rolled)} rolled · ${escape(d.mitigated)} mitigated · <strong>${escape(d.damage)} Hull damage</strong></p><small>Applied with the simultaneous exchange.</small></section>`;
    return `<section><h3>${escape(source)}</h3><p>${escape(ship?.name)} · ${escape(crewStationName(station))} · ${escape(shipCheck?"Ship systems":actor?.name??"NPC ship crew")}</p><p>${d.skill?`Skill: ${escape(d.skill)}`:"Ship-held check"} · <strong>${escape(degree)}</strong></p><p>d20 ${escape(d.die)} ${d.modifier>=0?"+":""}${escape(d.modifier)} = <strong>${escape(d.total)}</strong> vs ${d.batteryId&&station==="battlewatch"?"AC":"DC"} ${escape(d.dc)}</p><details><summary>Roll breakdown</summary><dl>${(d.components??[]).map(c=>`<dt>${escape(c.label)}</dt><dd>${c.value>=0?"+":""}${escape(c.value)}</dd>`).join("")}</dl></details></section>`;
  }).join("")}${extra}</article>`;
}
export async function postActionReceipt(before,after,cmd,user,evaluated=[]){
  const content=actionReceiptContent(before,after,cmd,evaluated);
  if(!content||!globalThis.ChatMessage?.create)return;
  // No rolls array: the same evaluated dice were already animated by Dice So Nice.
  await ChatMessage.create({author:user.id,speaker:{actor:after.ships[cmd.shipId]?.actorId,alias:"Arkflight"},content,flags:{[MODULE]:{alphaRollReceipt:{encounterId:after.id,revision:after.revision}}}});
}
export function bindCrewChat(message,html){
  const ref=message.flags?.[MODULE]?.alphaCrewRequest;if(!ref)return;
  const author=typeof message.author==="string"?message.author:message.author?.id??message.user?.id??message.user;
  if(!game.users.get(author)?.isGM)return;
  const root=html?.querySelector?html:html?.[0];if(!root)return;
  const button=root.querySelector(".alpha-crew-chat-roll"),select=root.querySelector(".alpha-crew-chat-skill");if(!button||!select)return;
  const api=game.arkflight.alphaCombat,s=api.state(),active=s?.pendingCrewAction?.id===ref.id,allowed=active&&api.canOperate(ref.shipId,ref.station);
  button.disabled=!allowed||!ALPHA_SKILLS[ref.station].includes(select.value);select.disabled=!allowed;
  if(button.dataset.alphaCrewBound)return;button.dataset.alphaCrewBound="true";
  select.addEventListener("change",()=>{button.disabled=!(api.state()?.pendingCrewAction?.id===ref.id&&api.canOperate(ref.shipId,ref.station)&&ALPHA_SKILLS[ref.station].includes(select.value));});
  if(!active)button.textContent="Request no longer active";
  button.addEventListener("click",async()=>{
    button.disabled=true;
    try{const current=api.state();await api.request({type:"roll-crew",encounterId:current?.id,revision:current?.revision,shipId:ref.shipId,requestId:ref.id,skill:select.value});}
    catch(error){ui.notifications.warn(error.message);button.disabled=!(api.state()?.pendingCrewAction?.id===ref.id&&api.canOperate(ref.shipId,ref.station));}
  });
}
