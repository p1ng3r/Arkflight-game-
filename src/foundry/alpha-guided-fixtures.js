import {ALPHA_SKILLS} from '../alpha/cards.js';
const M='arkflight-game';
const names=[['Irena Vale','Bram Coil','Nessa Starling','Corin Flint','Lysa Dawn'],['Maelor Voss','Dorra Keen','Sable Reed','Orik Holt','Tamsin Aster']];
export function guidedCrewSource(index,station,shipId){
 const role=Object.keys(ALPHA_SKILLS).indexOf(station),skills=Object.fromEntries(ALPHA_SKILLS[station].filter(s=>s!=='warfare-lore').map((id,i)=>[id,{base:[13,11,9][i]}]));
 return {name:`[Crew Test] ${names[index][role]} · ${station}`,type:'npc',img:`modules/arkflight-game/assets/ui/stations/station_icon_${({battlewatch:'watchmaster',veilwarden:'veilwarden'})[station]??station}.webp`,ownership:{default:0},
 system:{details:{level:{value:5},publicNotes:`Level 5 ${station} for the dedicated three-round Arkflight test.`},abilities:Object.fromEntries(['str','dex','con','int','wis','cha'].map(a=>[a,{mod:3}])),attributes:{ac:{value:22},hp:{value:75,max:75},speed:{value:25},adjustment:null},saves:{fortitude:{value:12},reflex:{value:12},will:{value:12}},perception:{mod:11},skills},
 items:station==='battlewatch'?[{name:'Warfare Lore',type:'lore',system:{mod:{value:9},proficient:{value:2},slug:'warfare-lore'}}]:[],flags:{[M]:{alphaGuidedCrew:`${shipId}:${station}`}}};
}
export async function prepareGuidedCrews(state){
 const crews={};for(const [index,ship]of Object.values(state.ships).entries()){
  crews[ship.id]={};for(const station of Object.keys(ALPHA_SKILLS)){
   const source=guidedCrewSource(index,station,ship.id),key=source.flags[M].alphaGuidedCrew;let actor=game.actors.contents.find(a=>a.flags?.[M]?.alphaGuidedCrew===key);
   if(actor){if(actor.type!=='npc')throw Error('A guided crew fixture was replaced with another actor type.');await actor.update({name:source.name,system:source.system});}
   else actor=await Actor.create(source,{renderSheet:false});
   crews[ship.id][station]=actor.id;
  }
  await game.actors.get(ship.actorId).update({[`flags.${M}.alphaStationActors`]:crews[ship.id]});
 }
 return crews;
}
