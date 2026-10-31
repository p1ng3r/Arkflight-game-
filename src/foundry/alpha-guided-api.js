import {nextGuidedStep} from '../alpha/guided-test.js';
import {ALPHA_SKILLS} from '../alpha/cards.js';
import {guidedDebug,beginGuidedCapture,finishGuidedCapture,downloadGuidedReport} from './alpha-guided-debug.js';
function gm(){if(!game.user.isGM)throw Error('Only the GM can operate or export the guided test.');}
const send=async (type,extra={})=>{gm();const api=game.arkflight.alphaCombat,s=api.state();return api.request({type,encounterId:s?.id,revision:s?.revision,...extra});};
Hooks.once('ready',()=>{
 const api=game.arkflight.alphaCombat;
 const guided=Object.freeze({
  preview:()=>nextGuidedStep(api.state()),status:()=>api.state()?.guidedTest??null,
  async start({manual=false}={}){gm();beginGuidedCapture({meta:{build:api.build,foundry:game.version,system:{id:game.system?.id,version:game.system?.version},moduleVersion:game.modules?.get('arkflight-game')?.version,activeModules:[...(game.modules?.values?.()??[])].filter(m=>m.active).map(m=>({id:m.id,version:m.version}))}});
   try{const state=await send('guided-start',{manual}),crew=[];for(const ship of Object.values(state.ships))for(const [station,id]of Object.entries(ship.stationActors)){const actor=game.actors.get(id),skills={};for(const skill of ALPHA_SKILLS[station])skills[skill]=await api.crewCheck(ship.id,station,skill);crew.push({ship:ship.name,station,actorId:id,name:actor.name,level:actor.level??actor.system?.details?.level?.value,skills});}guidedDebug.record({kind:'fixtures',crew});return state;}catch(error){guidedDebug.record({kind:'start failed',error});finishGuidedCapture('failed');throw error;}
  },
  async next(){gm();if(guidedDebug.data.status!=='running')beginGuidedCapture({fresh:false});const state=await send('guided-next');if(state.guidedTest.status!=='running')finishGuidedCapture(state.guidedTest.status);return state;},
  async stop(){gm();const state=await send('guided-stop');finishGuidedCapture('stopped');return state;},
  download(){gm();return downloadGuidedReport();},report(){gm();return guidedDebug.text();},record(event){gm();guidedDebug.record(event);},
  async recover(type){gm();if(!['resume-movement','restore-movement'].includes(type))throw Error('Invalid recovery operation.');return send(type);}
 });
 const descriptors=Object.getOwnPropertyDescriptors(api);game.arkflight.alphaCombat=Object.freeze(Object.defineProperties({guided},descriptors));
 if(api.state()?.guidedTest?.status==='running')beginGuidedCapture({fresh:false});
});

Hooks.on('arkflightAlphaChanged',()=>{const s=game.arkflight?.alphaCombat?.state();if(s?.guidedTest?.manual&&s.guidedTest.status!=='running'&&guidedDebug.data.status==='running')finishGuidedCapture(s.guidedTest.status);});
