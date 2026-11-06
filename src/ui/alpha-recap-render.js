import {roundRecapHTML,recapEscape} from "../foundry/alpha-round-journal.js";

/** Build HTML exclusively from escaped encounter data; no nested recap Handlebars helpers. */
export function alphaRecapMarkup(s,{gm=false,complete=false,unsettled=false,journal=null,results=[]}={}){
 if(!s||!["cleanup","complete"].includes(s.phase))return "";
 const latest=results.map(r=>{
   const name=recapEscape(r.shipName??"Ship"),target=r.targetName?` → ${recapEscape(r.targetName)}`:"";
   const message=r.check?`${recapEscape(r.station)} · ${recapEscape(r.label)} · d20 ${recapEscape(r.die)} + ${recapEscape(r.modifier)} = ${recapEscape(r.total)} vs ${recapEscape(r.dc)}`:`${recapEscape(r.raw)} raw · ${recapEscape(r.damage)} Hull damage`;
   return `<article class="hud-recap-exchange"><b>${name}${target}</b><p>${message}</p></article>`;
 }).join("");
 const recent=`<details><summary>Recent exchanges · checks &amp; damage</summary>${latest||"<p>No recent exchanges for this ship.</p>"}</details>`;
 const actions=journal?.journalId?`<button data-round-action="open-journal">Open journal · ${recapEscape(journal.journalId)}</button>`:gm?`<button data-round-action="retry-recap">Save / retry journal</button>`:"";
 const next=gm&&!complete?`<button class="round-primary" data-round-action="round" ${unsettled?"disabled":""}>Start next round</button>`:"";
 return `<section class="round-recap">${roundRecapHTML(s)}${recent}${actions}${next}</section>`;
}
