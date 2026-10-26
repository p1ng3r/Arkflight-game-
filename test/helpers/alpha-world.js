/** Minimal public-document doubles. These tests do not claim live Foundry acceptance. */
export const alphaHooks=new Map();
export function installAlphaHooks(){globalThis.Hooks={on(n,f){const a=alphaHooks.get(n)??[];a.push(f);alphaHooks.set(n,a);},once(n,f){this.on(n,f);},off(n,f){alphaHooks.set(n,(alphaHooks.get(n)??[]).filter(x=>x!==f));},callAll(n,...args){for(const f of alphaHooks.get(n)??[])f(...args);}};}
export function alphaWorld({applicationAPI=null,onTokensChanged=()=>{}}={}){
  installAlphaHooks();let serial=0;
  const values=new Map(),counts={actors:0,scenes:0,moves:0,writes:0,rolls:0},faults={},notifications=[];
  const collection=()=>{const c={contents:[]};c.get=id=>c.contents.find(x=>x.id===id);c[Symbol.iterator]=()=>c.contents[Symbol.iterator]();return c;};
  const point=c=>({x:1600+c.q*Math.sqrt(7500),y:1300+100*(c.r+c.q/2)});
  const grid={type:4,size:100,isHexagonal:true,getCenterPoint:point,getCube(p){const q=Math.round((p.x-1600)/Math.sqrt(7500));return{q,r:Math.round((p.y-1300)/100-q/2),s:0};},getAdjacentCubes:()=>[[0,-1],[1,-1],[1,0],[0,1],[-1,1],[-1,0]].map(([q,r])=>({q,r,s:-q-r})),getVertices(c){const p=point(c);return Array.from({length:6},(_,i)=>({x:p.x+57.7*Math.cos(i*Math.PI/3),y:p.y+57.7*Math.sin(i*Math.PI/3)}));}};
  const users=new Map([["gm",{id:"gm",isGM:true,active:true}],["player",{id:"player",isGM:false,active:true}]]);
  globalThis.foundry={utils:{randomID:()=>`id${++serial}`},applications:{api:applicationAPI??{}}};
  globalThis.ui={notifications:{warn:m=>notifications.push(m),error:m=>notifications.push(m),info:()=>{}}};
  globalThis.game={user:users.get("gm"),users:{get:id=>users.get(id),[Symbol.iterator]:()=>users.values()},paused:false,actors:collection(),scenes:collection(),combats:collection(),arkflight:{},settings:{register(m,k,d){values.set(k,structuredClone(d.default));},registerMenu(){},get(m,k){return structuredClone(values.get(k));},async set(m,k,v){if(k==="alphaCombat"&&faults.failState){faults.failState=false;throw Error("state storage rejected");}counts.writes++;values.set(k,structuredClone(v));Hooks.callAll("updateSetting",{key:`${m}.${k}`});return v;}}};
  function token(source,scene){
    const doc={x:0,y:0,rotation:0,width:1,height:1,flags:{},...structuredClone(source),id:source._id??`token${++serial}`,parent:scene,
      getCenterPoint(position={}){return{x:(position.x??this.x)+50*(position.width??this.width),y:(position.y??this.y)+50*(position.height??this.height)};},
      toObject(){const{parent,object,...rest}=this;return structuredClone(Object.fromEntries(Object.entries(rest).filter(([,v])=>typeof v!=="function")));},
      async update(changes,options={}){
        if((alphaHooks.get("preUpdateToken")??[]).some(fn=>fn(this,changes,options)===false))return this;
        for(const[key,value]of Object.entries(changes)){const parts=key.split("."),leaf=parts.pop();let target=this;for(const p of parts)target=target[p]??={};target[leaf]=value;}
        Hooks.callAll("updateToken",this,changes,options,game.user.id);onTokensChanged();return this;
      }};
    doc.object={document:doc,get center(){return doc.getCenterPoint();},movementAnimationPromise:Promise.resolve(),checkCollision(point){const c=grid.getCube(point);return faults.blockedCells?.has(`${c.q},${c.r}`)??false;},control(){}};return doc;
  }
  globalThis.Actor={async create(source){counts.actors++;const actor={...structuredClone(source),id:`actor${++serial}`,testUserPermission(user){return user.isGM||(this.ownership?.[user.id]??this.ownership?.default??0)>=3;},async getTokenDocument(options){return token({...this.prototypeToken,...options,actorId:this.id},null);}};game.actors.contents.push(actor);return actor;}};
  globalThis.Scene={async create(source){counts.scenes++;const scene={...structuredClone(source),id:`scene${++serial}`,tokens:collection(),walls:new Map(),async view(){globalThis.canvas={scene:this,grid,dimensions:{sceneRect:{x:0,y:0,width:3200,height:2600}},tokens:{get:id=>this.tokens.get(id)?.object},animatePan:async()=>{},interface:{addChild(){}}};onTokensChanged();return this;},
      async createEmbeddedDocuments(_type,rows){const docs=rows.map(row=>token(row,this));this.tokens.contents.push(...docs);onTokensChanged();return docs;},
      async deleteEmbeddedDocuments(_type,ids){this.tokens.contents=this.tokens.contents.filter(t=>!ids.includes(t.id));onTokensChanged();},
      async moveTokens(instructions,options){
        counts.moves++;const result={};
        for(const[id,instruction]of Object.entries(instructions)){
          if(faults.blockMove===id||faults.blockMove===true){result[id]=false;continue;}
          const doc=this.tokens.get(id);await doc.update(instruction.destination,options);result[id]=true;
          // Reproduce the native ownership/mutation hazard: our caller must not retain this object as its intent.
          if(faults.mutatePayload)delete instruction.destination.rotation;
        }
        if(faults.pendingMove)return new Promise(()=>{});
        return result;
      }};
    game.scenes.contents.push(scene);return scene;
  }};
  globalThis.Combat={async create(source){const rows=source.combatants.map((r,i)=>({...r,id:`combatant${i}`}));const c={...structuredClone(source),id:`combat${++serial}`,scene:game.scenes.get(source.scene),combatants:rows,get turns(){return[...rows].sort((a,b)=>(b.initiative??0)-(a.initiative??0));},get started(){return this.round>0;},async update(changes,options){if((alphaHooks.get("preUpdateCombat")??[]).some(f=>f(this,changes,options)===false))return;Object.assign(this,changes);},async updateEmbeddedDocuments(_type,updates){for(const r of updates)Object.assign(rows.find(c=>c.id===r._id),r);},async delete(){game.combats.contents=game.combats.contents.filter(x=>x!==this);}};game.combats.contents.push(c);return c;}};
  globalThis.Roll=class{constructor(formula){this.formula=formula;}async evaluate(){counts.rolls++;this.total=this.formula==="1d20"?(faults.d20?.shift()??10):this.formula.split("+").reduce((n,t)=>n+(t.includes("d")?t.split("d").map(Number).reduce((a,b)=>a*Math.ceil(b/2)):Number(t)),0);return this;}};
  return{counts,faults,values,notifications,grid,initialize(){for(const f of alphaHooks.get("init")??[])f();for(const f of alphaHooks.get("ready")??[])f();return game.arkflight.alphaCombat;}};
}
