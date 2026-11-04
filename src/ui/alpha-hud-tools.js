import {ALPHA_CARDS} from '../alpha/cards.js';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const ROOT='modules/arkflight-game/assets/art/ships/tokens';
const base=[['void-skiff','Void Skiff','Freespacers'],['sloop','Sloop','Underwake'],['cutter','Cutter','Freebooters'],['brigantine','Brigantine','Grelkin'],['frigate','Frigate','Brotherhood'],['galleon','Galleon','Starweaver'],['hammerhead','Hammerhead','Ironmantle'],['arkcruiser','Arkcruiser','Stormglass'],['dread-caravel','Dread Caravel','Council of the Void'],['cathedral-ship','Cathedral Ship','Faith of the Churn']];
const variants=[['veilwarden-containment','Arkcruiser','Veilwardens'],['blackwake-privateer','Frigate','Blackwake'],['emberhall-siege','Hammerhead','Emberhall'],['valecross-sanctuary','Cathedral Ship','Valecross'],['veyr-luxury-trader','Galleon','Veyr'],['tidereach-freighter','Galleon','Tidereach'],['grelkin-twin-hull','Brigantine','Grelkin'],['brotherhood-boarding','Frigate','Brotherhood'],['freespacer-salvager','Brigantine','Freespacers'],['stormglass-ring-drive','Arkcruiser','Stormglass']];
export const SHIP_TOKEN_CHOICES=Object.freeze([...base.map(([id,hull,faction])=>({id,hull,faction,label:`${hull} · ${faction}`,src:`${ROOT}/hull-factions/${id}.webp`})),...variants.map(([id,hull,faction])=>({id,hull,faction,label:id.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '),src:`${ROOT}/faction-variants/${id}.webp`}))].map(Object.freeze));
export function visiblePile(ship,pile='discard'){
 const ids=pile==='draw'?[]:pile==='prepared'?ship.prepared.map(p=>p.instance):['discard','burned'].includes(pile)?ship[pile]:[];
 return {hidden:pile==='draw',count:pile==='draw'?(ship.drawCount??ship.drawPile.length):ids.length,cards:ids.map(instance=>{const c=ALPHA_CARDS[ship.instances[instance]];return {...c,instance,station:c.stations.join(' + ')};}).sort((a,b)=>a.name.localeCompare(b.name))};
}
export async function applyShipTokenArt(shipId,artId){
 const api=game.arkflight.alphaCombat,s=api.state(),ship=s?.ships[shipId],art=SHIP_TOKEN_CHOICES.find(a=>a.id===artId);
 if(!ship||!api.ownsShip(shipId))throw Error('Only this ship’s owners or the GM may change its art.');
 const actor=game.actors.get(ship.actorId);if(!actor||!art)throw Error('Choose an available ship and token illustration.');
 if(!game.user.isGM&&!actor.testUserPermission(game.user,'OWNER'))throw Error('Actor ownership is required to save token art.');
 await actor.update({img:art.src,'prototypeToken.texture.src':art.src});
 // Only the selected encounter's primary tokens. Secondary footprint markers remain intact.
 const scene=game.scenes.get(s.canvas?.sceneId);let updated=0;
 for(const id of ship.tokenIds??[]){const token=scene?.tokens.get(id);if(token?.actorId===actor.id&&!token.flags?.['arkflight-game']?.alphaSection){await token.update({'texture.src':art.src});updated++;}}
 return {src:art.src,updated};
}
export class AlphaHudToolsWindow extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'arkflight-hud-tools',classes:['arkflight-alpha-combat','arkflight-hud-tools'],window:{title:'Arkflight · Ship tools',resizable:true},position:{width:720,height:600}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-hud-tools.hbs'}};
 mode='art';shipId=null;filter='';pile='discard';busy=false;error='';message='';
 async _prepareContext(){const api=game.arkflight.alphaCombat,s=api.state(),ship=s?.ships[this.shipId],allowed=!!ship&&api.ownsShip(ship.id);if(!allowed)return{denied:true};const pile=visiblePile(ship,this.pile);return {ship,art:this.mode==='art',filter:this.filter,choices:SHIP_TOKEN_CHOICES.filter(a=>`${a.label} ${a.hull} ${a.faction}`.toLowerCase().includes(this.filter.toLowerCase())).map(a=>({...a,current:game.actors.get(ship.actorId)?.img===a.src})),tabs:['draw','discard','prepared','burned'].map(id=>({id,name:id[0].toUpperCase()+id.slice(1),selected:id===this.pile})),pile,pileName:this.pile,busy:this.busy,error:this.error,message:this.message};}
 async _onRender(){this.element.querySelector('[data-art-filter]')?.addEventListener('change',e=>{this.filter=e.target.value;void this.render({force:true});});for(const b of this.element.querySelectorAll('[data-art-apply]'))b.addEventListener('click',()=>void this.apply(b.dataset.artApply));for(const b of this.element.querySelectorAll('[data-pile-tab]'))b.addEventListener('click',()=>{this.pile=b.dataset.pileTab;void this.render({force:true});});}
 async apply(id){if(this.busy)return;this.busy=true;this.error='';try{const result=await applyShipTokenArt(this.shipId,id);this.message=`Artwork saved to ship and prototype; ${result.updated} current token(s) updated.`;await this.onApplied?.();}catch(e){this.error=e.message;}finally{this.busy=false;await this.render({force:true});}}
}
let toolsWindow;
export async function openHudTools(shipId,mode,onApplied){toolsWindow??=new AlphaHudToolsWindow();Object.assign(toolsWindow,{shipId,mode,onApplied,error:"",message:""});await toolsWindow.render({force:true});toolsWindow.bringToFront();return toolsWindow;}
