import {openRoundDeck,openRoundTracker,openRoundCard,focusRoundShip,foldRoundCard} from './alpha-round-deck-ui.js';
import {nextGuidedStep} from '../alpha/guided-test.js';
import {ALPHA_CARDS} from '../alpha/cards.js';
import {legalHullManeuvers} from '../alpha/maneuvers.js';
import {alphaComplications} from '../alpha/combat.js';
import {showAlphaManeuver} from './alpha-combat-overlays.js';
import {recapEscape} from '../foundry/alpha-round-journal.js';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
let instance;
export class AlphaGuidedTestWindow extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'arkflight-guided-crew-test',classes:['arkflight-alpha-combat','alpha-command-deck','arkflight-guided-crew-test'],window:{title:'Arkflight · Three-round crew test',icon:'fa-solid fa-flask',resizable:true},position:{width:540,height:480,left:90,top:110}};
 static PARTS={main:{template:'modules/arkflight-game/templates/alpha-guided-test.hbs'}};
 constructor(options={}){const w=globalThis.innerWidth??1280,h=globalThis.innerHeight??800,sidebar=globalThis.document?.querySelector?.('#sidebar')?.getBoundingClientRect?.(),right=sidebar?.width?sidebar.left:w,width=Math.min(500,w-32);super({...options,position:{width,height:Math.min(430,h-110),left:Math.max(16,right-width-14),top:80,...options.position}});}
 busy=false;error='';exported=null;
 async fitTracker(){const tracker=await openRoundTracker(),left=this.position?.left??600;if(left<410){await tracker.minimize();return;}tracker.setPosition({left:80,top:65,width:Math.min(620,left-90)});}
 async focusCanvas(s){
  const points=Object.values(s.ships).map(ship=>canvas?.tokens?.get(ship.tokenIds[0])?.center).filter(Boolean);if(!points.length)return;
  const x=points.reduce((n,p)=>n+p.x,0)/points.length,y=points.reduce((n,p)=>n+p.y,0)/points.length,scale=.65,desiredX=Math.max(300,(this.position?.left??700)-120),desiredY=Math.min(260,(globalThis.innerHeight??800)*.32);
  await canvas.animatePan({x:x-(desiredX-(globalThis.innerWidth??1280)/2)/scale,y:y-(desiredY-(globalThis.innerHeight??800)/2)/scale,scale,duration:300});
 }
 async _prepareContext(){
  const api=game.arkflight.alphaCombat,s=api.state(),guide=s?.guidedTest,running=guide?.status==='running';let step=null;
  try{step=running?nextGuidedStep(s):null;}catch(error){this.error=error.message;}
  const last=[...(s?.log??[])].reverse().find(e=>e.detail?.kind==='check'&&e.detail.skill)?.detail;
  return{s,guide,step,build:api.build,busy:this.busy,error:this.error,gm:game.user.isGM,paused:game.paused,running,canNext:running&&!this.busy&&!game.paused&&!api.recovery()?.next,complete:guide?.status==='complete',status:guide?.status??'Ready to create',recovery:api.recovery()?.next,
   crews:guide?Object.values(s.ships).map(ship=>({name:ship.name,level:ship.profile.level,crew:Object.entries(ship.stationActors).map(([station,id])=>({station,name:game.actors.get(id)?.name,level:game.actors.get(id)?.level??game.actors.get(id)?.system.details.level.value}))})):[],
   last:last&&{...last,outcome:['Critical failure','Failure','Success','Critical success'][last.degree+1]}};
 }
 async _onRender(){for(const button of this.element.querySelectorAll('[data-guided-action]'))button.addEventListener('click',()=>void this.act(button.dataset.guidedAction));}
 async act(type){
  if(this.busy)return;const api=game.arkflight.alphaCombat;if(type==='download'){api.guided.download();return;}if(type==='hand'){await openRoundDeck();return;}
  this.busy=true;this.error='';await this.render({force:true});
  try{
   if(type==='start'){
    const content='<p>Create/restart the dedicated test encounter with two level-5 ships, ten level-5 PF2e crew NPCs, and training batteries?</p><p>Campaign actors are not changed. The current alpha test is replaced. Debug capture begins now.</p>';
    const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Start three-round crew test'},content}):globalThis.confirm('Create/restart the dedicated three-round crew test?');if(!yes)return;
    const started=await api.guided.start();this.exported=null;await openRoundDeck();await this.fitTracker();await this.focusCanvas(started);
   }else if(type==='next'){
    const before=api.state(),step=nextGuidedStep(before);if(!step)throw Error('No guided step remains.');
    if(step.command.type==='move'){
     const content=`<p>All ships locked. Move both ships together?</p><p>${[...game.users].map(u=>`${recapEscape(u.name??u.id)} — ${u.active?'connected':'offline'}`).join('<br>')}</p>`;
     const yes=foundry.applications.api.DialogV2?.confirm?await foundry.applications.api.DialogV2.confirm({window:{title:'Confirm fleet movement'},content}):globalThis.confirm('Move both ships together?');api.guided.record({kind:'movement confirmation',accepted:yes});if(!yes)return;await foldRoundCard();
    }
    await focusRoundShip(step.command.shipId);
    if(['resolve-card','play'].includes(step.command.type)){
     const app=await openRoundCard(step.command.shipId,step.command.instanceId,{hold:true}),card=ALPHA_CARDS[before.ships[step.command.shipId].instances[step.command.instanceId]];app.skills[card.stations[0]]=step.command.skill;await app.render({force:true});
    }
    if(step.command.type==='attack'){
     const order=before.attacks[before.attackIndex],app=await openRoundCard(order.shipId,null,{hold:true,attackId:order.id});app.skills.battlewatch=order.skill;await app.render({force:true});
    }
    const after=await api.guided.next();
    if(step.command.type==='move')await this.focusCanvas(after);
    if(step.command.type==='plan'){const ship=after.ships[step.command.shipId],route=legalHullManeuvers(ship,alphaComplications(after,ship.id)).find(r=>r.id===step.command.maneuverId);if(route)showAlphaManeuver(after,ship.id,route);}
    if(after.guidedTest.status==='complete'&&this.exported!==after.id){this.exported=after.id;api.guided.download();}
   }else if(type==='stop'){await api.guided.stop();api.guided.download();}
   else if(['resume-movement','restore-movement'].includes(type))await api.guided.recover(type);
  }catch(error){this.error=error.message;api.guided.record({kind:'guide UI error',error});}
  finally{this.busy=false;if(this.rendered){await this.render({force:true});this.bringToFront();}}
 }
}
export async function openGuidedCrewTest(){if(!game.user.isGM)throw Error('Only the GM runs the guided crew test.');instance??=new AlphaGuidedTestWindow();await instance.render({force:true});if(instance.minimized)await instance.maximize();instance.bringToFront();return instance;}
Hooks.once('init',()=>game.settings.registerMenu('arkflight-game','guidedCombatDemo',{name:'Guided crew test · 3 rounds',label:'Open 3-round crew test',hint:'Two level-5 ships, full crews, one action per Next Step, and downloadable debug.txt.',icon:'fa-solid fa-flask',type:AlphaGuidedTestWindow,restricted:true}));
Hooks.once('ready',()=>{const api=game.arkflight.alphaCombat,d=Object.getOwnPropertyDescriptors(api);delete d.guided;game.arkflight.alphaCombat=Object.freeze(Object.defineProperties({guided:Object.freeze({...api.guided,open:openGuidedCrewTest})},d));});
for(const hook of ['arkflightAlphaChanged','pauseGame'])Hooks.on(hook,()=>{if(instance?.rendered&&!instance.busy)void instance.render({force:true});});
