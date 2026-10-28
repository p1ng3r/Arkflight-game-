const MODULE='arkflight-game';
export const recapEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function roundRecap(s){const events=(s.roundEvents??s.log).filter(e=>e.round===s.round),narrative=events.filter(e=>e.detail?.kind==='damage').map(e=>{const d=e.detail,a=s.ships[d.shipId],b=s.ships[d.targetId],battery=a.batteries.find(b=>b.id===d.batteryId)?.name??d.batteryId;return d.degree<1?`${a.name} fired its ${battery} at ${b.name}, but missed.`:`${a.name}'s ${battery} struck ${b.name}: ${d.formula} rolled ${d.rolled}${d.degree===2?', doubled on a critical hit':''}, for ${d.raw} raw damage. ${d.resistance??0} resistance and ${d.dr??0} DR prevented ${d.mitigated}; ${d.damage} Hull damage reached the ship.`;});if(!narrative.length)narrative.push('The crews completed the round without a resolved battery hit.');return {key:`${s.id}:${s.round}`,title:`Arkflight · Round ${s.round}`,narrative,events};}
export function roundRecapHTML(s){const r=roundRecap(s);return `<section><h2>${recapEscape(r.title)}</h2>${r.narrative.map(t=>`<p>${recapEscape(t)}</p>`).join('')}<h3>Exact round record</h3><ol>${r.events.map(e=>`<li>${recapEscape(e.text)}</li>`).join('')}</ol></section>`;}
/** Idempotent per-round pages; a Journal failure never rerolls combat. */
export async function recordAlphaRound(s){
 if(s.roundFlow!==2||!['cleanup','complete'].includes(s.phase)||s.pendingDiscard||s.pendingCrewAction||s.complications.choices.some(c=>c.status==='pending'))return false;
 const key=`${s.id}:${s.round}`;if(s.roundJournal?.key===key)return false;
 if(!globalThis.JournalEntry?.create)throw Error('Journal unavailable; recap retained in encounter state.');
 let journal=game.journal?.contents?.find(j=>j.flags?.[MODULE]?.alphaEncounter===s.id);
 if(!journal)journal=await JournalEntry.create({name:`Arkflight · ${s.ships[Object.keys(s.ships)[0]].name} · ${s.id}`,ownership:{default:2},flags:{[MODULE]:{alphaEncounter:s.id}}});
 let page=journal.pages?.contents?.find(p=>p.flags?.[MODULE]?.alphaRound===key);
 if(!page)[page]=await journal.createEmbeddedDocuments('JournalEntryPage',[{name:`Round ${s.round}`,type:'text',text:{format:1,content:roundRecapHTML(s)},flags:{[MODULE]:{alphaRound:key}}}]);
 s.roundJournal={key,journalId:journal.id,pageId:page.id};delete s.roundJournalError;return true;
}
