import {finishGuidedCapture} from './alpha-guided-debug.js';
/** A local GM driver of the existing authoritative test commands. Never simulates rolls or token updates. */
export class GuidedAutoRunner{
 constructor({api=()=>game.arkflight.alphaCombat,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),notify=()=>globalThis.Hooks?.callAll('arkflightAlphaAutoTestChanged')}={}){Object.assign(this,{api,delay,notify});this.info={status:'idle',steps:0,label:'Ready',error:null};this.active=false;}
 download(api){try{api.guided.download();}catch(error){api.guided.record({kind:'automatic report download unavailable',error});}}
 status(){return {...this.info,active:this.active};}
 update(values){Object.assign(this.info,values);this.notify();}
 check(){if(!game.user.isGM)throw Error('Only a GM may run the automated test.');const api=this.api(),s=api.state();if(!s?.guidedTest||s.guidedTest.manual||!game.scenes.get(s.canvas?.sceneId)?.flags?.['arkflight-game']?.alphaGuidedFixture)throw Error('Create the dedicated automated crew test first.');if(this.encounterId&&s.id!==this.encounterId)throw Error('Encounter changed; automated testing stopped.');return {api,s};}
 start({pace=1200}={}){if(this.active)throw Error('The automated test is already advancing.');this.encounterId=null;const {s}=this.check();if(s.guidedTest.status!=='running')throw Error('The test is no longer running. Start a fresh test.');this.encounterId=s.id;this.pace=Math.max(400,Math.min(5000,Number(pace)||1200));this.pauseRequested=false;this.stopRequested=false;this.active=true;this.update({status:'running',steps:s.guidedTest.step,label:'Watching real combat commands',error:null});this.task=this.loop();return this.status();}
 pause(){if(this.active){this.pauseRequested=true;this.update({status:'pausing',label:'Pausing after the current action'});}return this.status();}
 async stop(){this.stopRequested=true;if(this.active){this.update({status:'stopping',label:'Finishing current action before stopping'});await this.task;}this.update({status:'stopped',label:'Automation stopped'});}
 async loop(){
  try{for(let count=0;count<400;count++){
   if(this.stopRequested||this.pauseRequested)break;const {api,s}=this.check();
   if(s.guidedTest.status!=='running'){this.update({status:s.guidedTest.status,label:'Three-round test complete'});this.download(api);return;}
   if(game.paused||api.recovery()?.next){this.pauseRequested=true;this.update({label:game.paused?'Foundry is paused. Unpause, then Resume.':'Movement needs recovery. Resolve it, then Resume.'});break;}
   const step=api.guided.preview();if(!step)throw Error('No next test command is available.');this.update({label:step.label,steps:s.guidedTest.step});
   api.guided.record({kind:'automated step',label:step.label,command:step.command.type});const next=await api.guided.next();
   if(next.id!==this.encounterId)throw Error('Encounter changed during a test action.');if(next.revision<=s.revision)throw Error('Test did not advance; stopped to avoid repeated commands.');
   const diagnostics=api.diagnostics();if(diagnostics.canvasError||diagnostics.ships?.some(row=>row.expected&&row.actual&&(row.expected.q!==row.actual.q||row.expected.r!==row.actual.r||row.expected.rotation!==row.actual.rotation)))throw Error('Saved and actual token positions differ. Download debug.txt and inspect movement recovery.');
   this.update({steps:next.guidedTest.step});if(next.guidedTest.status!=='running'){this.update({status:next.guidedTest.status,label:next.guidedTest.status==='complete'?'Three-round test complete':'Test ended early'});this.download(api);return;}await this.delay(this.pace);
  }
  if(!this.pauseRequested&&!this.stopRequested)throw Error('Automated test exceeded 400 actions.');
  if(this.info.status==='pausing')this.update({status:'paused',label:'Paused. Resume to continue without rerolling.'});else this.update({status:this.stopRequested?'stopped':'paused'});
  }catch(error){this.update({status:'failed',error:error.message,label:'Stopped at the failing action'});try{this.api().guided.record({kind:'automated test failed',error});finishGuidedCapture('failed');this.api().guided.download();}catch{}}
  finally{this.active=false;this.notify();}
 }
}
