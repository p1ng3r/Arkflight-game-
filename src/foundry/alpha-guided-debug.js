const LIMIT=1200,KEY='arkflight-guided-debug-v1';
const redactKey=/password|secret|authorization|cookie|api.?key|access.?token|refresh.?token/i;
export function debugValue(value,depth=0,seen=new WeakSet()){
 if(value instanceof Error)return{message:value.message,stack:value.stack};
 if(value==null||typeof value==='boolean'||typeof value==='number')return value;
 if(typeof value==='string')return value.slice(0,6000);if(typeof value!=='object')return String(value);
 if(depth>7)return'[depth limit]';if(seen.has(value))return'[circular]';seen.add(value);
 if(Array.isArray(value))return value.slice(0,100).map(v=>debugValue(v,depth+1,seen));
 const result={};for(const key of Object.keys(value).slice(0,100)){if(redactKey.test(key))result[key]='[redacted]';else try{result[key]=debugValue(value[key],depth+1,seen);}catch{result[key]='[unreadable]';}}return result;
}
export function guidedSnapshot(s){
 if(!s)return null;return{id:s.id,revision:s.revision,phase:s.phase,round:s.round,guidedTest:s.guidedTest,pendingCrewAction:s.pendingCrewAction,pendingDiscard:s.pendingDiscard,
 ships:Object.values(s.ships??{}).map(ship=>({id:ship.id,name:ship.name,level:ship.profile.level,ap:ship.ap,pose:ship.pose,resources:ship.resources,hand:ship.hand.map(id=>({instance:id,card:ship.instances[id]})),drawCount:ship.drawPile.length,discardCount:ship.discard.length,stations:ship.stationActors,prepared:ship.prepared,effects:ship.effects,batteries:ship.batteries})),
 attacks:s.attacks,damage:s.damage,cardPlans:s.cardPlans,conditions:s.complications?.effects,systemSaves:s.systemSaves,recentLog:(s.log??[]).slice(-12),pendingChoices:s.complications?.choices?.filter(c=>c.status==='pending'),journal:s.roundJournal};
}
export class GuidedDebugRecorder{
 constructor({storage=null,key=KEY}={}){this.storage=storage;this.key=key;this.data={version:1,status:'not started',entries:[],dropped:0};try{const old=JSON.parse(storage?.getItem(key)??'null');if(old?.version===1&&Array.isArray(old.entries))this.data=old;}catch{}}
 start(meta){this.data={version:1,status:'running',startedAt:new Date().toISOString(),meta:debugValue(meta),entries:[],dropped:0};this.persist();}
 record(event){const value=debugValue(event);this.data.entries.push({at:new Date().toISOString(),...value});if(this.data.entries.length>LIMIT){this.data.entries.shift();this.data.dropped++;}this.persist();}
 persist(){try{this.storage?.setItem(this.key,JSON.stringify(this.data));}catch{/* A full/private storage area cannot stop a combat command. */}}
 stop(status){this.data.status=status;this.data.finishedAt=new Date().toISOString();this.persist();}
 text(){return `ARKFLIGHT — THREE-ROUND CREW TEST\nStatus: ${this.data.status}\nStarted: ${this.data.startedAt??'not started'}\nFinished: ${this.data.finishedAt??'capture active'}\nEntries: ${this.data.entries.length}; older entries dropped: ${this.data.dropped}\n\nThis report contains evaluated rolls, command/state snapshots, token checks and browser warnings/errors captured after Start Test. It is not the server log or a retrospective read of DevTools.\n\n${JSON.stringify(this.data,null,2)}\n`;}
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const guidedDebug=new GuidedDebugRecorder({storage,key:`${KEY}:${globalThis.game?.world?.id??'local'}`});
let releases=[];
export function beginGuidedCapture({fresh=true,meta={}}={}){
 releaseGuidedCapture();if(fresh)guidedDebug.start(meta);else{guidedDebug.data.status='running';guidedDebug.persist();}
 for(const method of ['warn','error']){
  const original=console[method],wrapped=function(...args){try{guidedDebug.record({kind:`console.${method}`,arguments:args});}catch{}return original.apply(this,args);};console[method]=wrapped;releases.push(()=>{if(console[method]===wrapped)console[method]=original;});
 }
 const error=event=>guidedDebug.record({kind:'window.error',message:event.message,filename:event.filename,line:event.lineno,column:event.colno,error:event.error}),rejection=event=>guidedDebug.record({kind:'unhandledrejection',reason:event.reason});
 globalThis.addEventListener?.('error',error);globalThis.addEventListener?.('unhandledrejection',rejection);releases.push(()=>{globalThis.removeEventListener?.('error',error);globalThis.removeEventListener?.('unhandledrejection',rejection);});
}
export function releaseGuidedCapture(){for(const release of releases)release();releases=[];}
export function finishGuidedCapture(status){guidedDebug.stop(status);releaseGuidedCapture();}
export function downloadGuidedReport(){
 const text=guidedDebug.text(),name=`arkflight-guided-debug-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;
 if(globalThis.saveDataToFile)return saveDataToFile(text,'text/plain',name);
 const url=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
Hooks.on('arkflightAlphaDebug',event=>{
 if(guidedDebug.data.status!=='running')return;
 const {state,...rest}=event;guidedDebug.record({...rest,...(state?{state:guidedSnapshot(state)}:{})});
 if(event.kind==='saved')console.info('[Arkflight guided test]',state?.guidedTest?.lastLabel,state?.round,state?.phase,state?.revision);
});
