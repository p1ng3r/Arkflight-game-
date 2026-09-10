#!/usr/bin/env node

export const POLICIES = Object.freeze(["balanced", "aggressive", "defensive"]);
export const SCENARIOS = Object.freeze(["broadside", "open-duel", "pursuit-objective"]);
const SB = () => 1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const BENCHMARK_SHIPS = Object.freeze({
 rumRunner:Object.freeze({id:"rum-runner-benchmark",name:"Rum Runner",level:5,chassis:"brigantine",ac:17,hullMax:160,lifeveilMax:55,moraleMax:5,strainMax:10,hardness:4,apMax:4,rpMax:1,combatSpeed:5,maneuverability:2,attackBonus:12,weapons:Object.freeze([
  {id:"rr-port-1",name:"Light Broadside Cannon",mount:"port",fireAP:1,reload:1,dice:[3,8],type:"bludgeoning",threat:"hull"},
  {id:"rr-port-2",name:"Light Broadside Cannon",mount:"port",fireAP:1,reload:1,dice:[3,8],type:"bludgeoning",threat:"hull"},
  {id:"rr-fore",name:"Deck Culverin",mount:"fore",fireAP:2,reload:1,dice:[3,10],type:"bludgeoning",threat:"hull"},
  {id:"rr-aft",name:"Light Deck Culverin",mount:"aft",fireAP:1,reload:1,dice:[2,10],type:"bludgeoning",threat:"hull"}
 ])}),
 ironSpear:Object.freeze({id:"iron-spear-benchmark",name:"IronSpear",level:5,chassis:"frigate",ac:18,hullMax:190,lifeveilMax:50,moraleMax:5,strainMax:11,hardness:5,apMax:4,rpMax:1,combatSpeed:6,maneuverability:2,attackBonus:12,weapons:Object.freeze([
  {id:"is-starboard-1",name:"Broadside Cannon Battery",mount:"starboard",fireAP:2,reload:2,dice:[4,10],type:"bludgeoning",threat:"hull"},
  {id:"is-starboard-2",name:"Broadside Cannon Battery",mount:"starboard",fireAP:2,reload:2,dice:[4,10],type:"bludgeoning",threat:"hull"},
  {id:"is-fore",name:"Heavy Scorpion",mount:"fore",fireAP:2,reload:1,dice:[3,10],type:"piercing",threat:"rigging"},
  {id:"is-aft",name:"Light Deck Culverin",mount:"aft",fireAP:1,reload:1,dice:[2,10],type:"bludgeoning",threat:"hull"}
 ])})
});
function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const d20=r=>1+Math.floor(r()*20);
function dice(r,[n,f]){let t=0;for(let i=0;i<n;i++)t+=1+Math.floor(r()*f);return t;}
function degree(die,total,dc){let d=total>=dc+10?3:total>=dc?2:total<=dc-10?0:1;if(die===20)d=Math.min(3,d+1);if(die===1)d=Math.max(0,d-1);return d;}
function avg(v){return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;}
function median(v){const a=[...v].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
function wilson(w,n){const z=1.95996398454,p=w/n,z2=z*z,d=1+z2/n,c=(p+z2/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z2/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
function initial(ship,policy){return{ship,policy,hull:ship.hullMax,hullMax:ship.hullMax,lifeveil:ship.lifeveilMax,strain:0,areas:{hull:0,arkengine:0,rigging:0,lifeveil:0,morale:0},reload:Object.fromEntries(ship.weapons.map(w=>[w.id,0])),stats:{dmg:0,shots:0,hits:0,crits:0,salvos:0,systemHits:0,ap:{captain:0,battlewatch:0,navigator:0,engineer:0,veilwarden:0},rp:0,peakStrain:0}};}
function speed(s){return Math.max(1,s.ship.combatSpeed-(s.areas.arkengine>=1?1:0)-(s.areas.arkengine>=3?1:0)-(s.areas.arkengine>=4?1:0)-(s.areas.rigging>=2?1:0));}
function man(s){return Math.max(1,s.ship.maneuverability-(s.areas.rigging>=1?1:0)-(s.areas.rigging>=3?1:0));}
function begin(s){s.ap=s.ship.apMax;s.rp=s.ship.rpMax;s.attackBuff=0;s.hardReduce=0;s.damageBuff=0;for(const w of s.ship.weapons)s.reload[w.id]=Math.max(0,s.reload[w.id]-1);}
function spend(s,station,n){if(s.ap<n)return false;s.ap-=n;s.stats.ap[station]+=n;return true;}
function strain(s,n){s.strain=clamp(s.strain+n,0,s.ship.strainMax);s.stats.peakStrain=Math.max(s.stats.peakStrain,s.strain);}
function react(s){if(s.rp<=0)return{ac:0,brace:0};s.rp--;s.stats.rp++;if(s.policy==="defensive")return{ac:0,brace:3*SB()};strain(s,s.policy==="balanced"?1:0);return{ac:SB(),brace:0};}
function systemThreshold(s){return Math.max(12,Math.ceil(s.ship.hullMax*.15));}
function applySystem(s,threat,deg,hd){if(hd<=0)return;const trig=threat==="hull"?hd>=systemThreshold(s):deg===3||hd>=systemThreshold(s);if(!trig)return;s.areas[threat]=Math.min(4,(s.areas[threat]??0)+1);s.stats.systemHits++;if(threat==="lifeveil"){const fr=[1,.9,.65,.25,0][s.areas.lifeveil];s.lifeveil=Math.min(s.lifeveil,Math.floor(s.ship.lifeveilMax*fr));}if(threat==="hull"){const fr=[1,.9,.65,.25,0][s.areas.hull];s.hullMax=Math.floor(s.ship.hullMax*fr);s.hull=Math.min(s.hull,s.hullMax);}}
function chooseMount(s,foe,scenario,rng,key){if(scenario==="broadside")return key==="rumRunner"?"port":"starboard";if(scenario==="pursuit-objective")return key==="rumRunner"?"aft":"fore";const base=.56+.08*(man(s)-man(foe))+.03*(speed(s)-speed(foe));return rng()<clamp(base,.25,.82)?(key==="rumRunner"?"port":"starboard"):"fore";}
function compatGroups(weapons){const m=new Map();for(const w of weapons){const k=`${w.mount}|${w.type}|${w.threat}`;(m.get(k)??m.set(k,[]).get(k)).push(w);}return [...m.values()];}
function attackPacket(a,b,weapons,rng,{salvo=false}={}){const cost=weapons.reduce((x,w)=>x+w.fireAP,0);if(!spend(a,"battlewatch",cost))return false;for(const w of weapons)a.reload[w.id]=w.reload;const re=react(b);const die=d20(rng),deg=degree(die,die+a.ship.attackBonus+a.attackBuff,b.ship.ac+re.ac);a.attackBuff=0;a.stats.shots++;if(salvo)a.stats.salvos++;if(deg<2)return true;a.stats.hits++;if(deg===3)a.stats.crits++;let raw=weapons.reduce((x,w)=>x+dice(rng,w.dice),0)+a.damageBuff;a.damageBuff=0;if(deg===3)raw*=2;let hard=Math.max(0,b.ship.hardness-a.hardReduce);a.hardReduce=0;let hd=Math.max(0,raw-hard-re.brace);b.hull=Math.max(0,b.hull-hd);a.stats.dmg+=hd;applySystem(b,weapons[0].threat,deg,hd);return true;}
function setupPolicy(s,mount){const ready=s.ship.weapons.filter(w=>w.mount===mount&&s.reload[w.id]===0);const groups=compatGroups(ready);const bestGroup=groups.filter(g=>g.length>=2).sort((a,b)=>b.length-a.length)[0]??[];const reserve=bestGroup.length>=2?bestGroup.reduce((x,w)=>x+w.fireAP,0):(ready.length?Math.min(...ready.map(w=>w.fireAP)):99);
 if(s.policy==="aggressive"){if(s.strain<=s.ship.strainMax-2&&s.ap-1>=reserve&&spend(s,"captain",1)){s.ap+=2;strain(s,2);}if(s.ap-1>=reserve&&spend(s,"captain",1))s.hardReduce=SB();}
 else if(s.policy==="defensive"){if(s.strain>=Math.ceil(s.ship.strainMax*.55)&&s.ap-1>=reserve&&spend(s,"engineer",1))s.strain=Math.max(0,s.strain-(1+SB()));}
 if(s.policy!=="aggressive"&&s.ap-1>=reserve&&spend(s,"battlewatch",1))s.attackBuff=SB();if(["port","starboard"].includes(mount)&&s.policy==="balanced"&&s.ap-1>=reserve&&spend(s,"battlewatch",1))s.damageBuff=2*SB();}
function takeTurn(s,foe,scenario,rng,key){begin(s);const mount=chooseMount(s,foe,scenario,rng,key);setupPolicy(s,mount);let ready=s.ship.weapons.filter(w=>w.mount===mount&&s.reload[w.id]===0);for(const group of compatGroups(ready)){const cost=group.reduce((x,w)=>x+w.fireAP,0);if(group.length>=2&&cost<=s.ap){attackPacket(s,foe,group,rng,{salvo:true});ready=ready.filter(w=>!group.includes(w));if(foe.hull<=0)return;}}
 for(const w of ready){if(w.fireAP<=s.ap){attackPacket(s,foe,[w],rng);if(foe.hull<=0)return;}}
 const loading=s.ship.weapons.filter(w=>w.mount===mount&&s.reload[w.id]>0).sort((a,b)=>s.reload[a.id]-s.reload[b.id]);for(const w of loading){if(s.ap<1)break;if(s.reload[w.id]===1&&spend(s,"battlewatch",1)){s.reload[w.id]=0;if(w.fireAP<=s.ap){attackPacket(s,foe,[w],rng);if(foe.hull<=0)return;}}}
}
export function simulateBattle({rumPolicy="balanced",ironPolicy="balanced",scenario="broadside",seed=1,maxRounds=40}={}){const rng=mulberry32(seed),rum=initial(BENCHMARK_SHIPS.rumRunner,rumPolicy),iron=initial(BENCHMARK_SHIPS.ironSpear,ironPolicy);const first=rng()<.5?"rumRunner":"ironSpear";const order=first==="rumRunner"?[[rum,iron,"rumRunner"],[iron,rum,"ironSpear"]]:[[iron,rum,"ironSpear"],[rum,iron,"rumRunner"]];const cap=scenario==="pursuit-objective"?10:maxRounds;let round=0;for(round=1;round<=cap&&rum.hull>0&&iron.hull>0;round++){for(const [a,b,k] of order){if(a.hull<=0||b.hull<=0)break;takeTurn(a,b,scenario,rng,k);}}
 let winner="draw";if(iron.hull<=0)winner="rumRunner";else if(rum.hull<=0)winner="ironSpear";else if(scenario==="pursuit-objective")winner="rumRunner";return{winner,rounds:Math.min(cap,round-((rum.hull<=0||iron.hull<=0)?0:1)),rum,iron};}
function aggregate(rows,key){const s=rows.map(r=>r[key]),rounds=rows.reduce((a,r)=>a+r.rounds,0)||1,sum=f=>s.reduce((a,x)=>a+f(x),0);return{dpr:sum(x=>x.stats.dmg)/rounds,shots:sum(x=>x.stats.shots)/rows.length,salvos:sum(x=>x.stats.salvos)/rows.length,systemHits:sum(x=>x.stats.systemHits)/rows.length,avgPeakStrain:sum(x=>x.stats.peakStrain)/rows.length,finalHull:sum(x=>x.hull)/rows.length};}
export function runMatchup({rumPolicy,ironPolicy,scenario,runs=5000,seed=8675309,maxRounds=40}={}){const rows=[];let rw=0,iw=0,d=0;for(let i=0;i<runs;i++){const r=simulateBattle({rumPolicy,ironPolicy,scenario,seed:(seed+Math.imul(i+1,2654435761))>>>0,maxRounds});rows.push(r);if(r.winner==="rumRunner")rw++;else if(r.winner==="ironSpear")iw++;else d++;}return{scenario,rumPolicy,ironPolicy,runs,rumWins:rw,ironWins:iw,draws:d,rumWinRate:rw/runs,rumWin95:wilson(rw,runs),avgRounds:avg(rows.map(r=>r.rounds)),medianRounds:median(rows.map(r=>r.rounds)),rum:aggregate(rows,"rum"),iron:aggregate(rows,"iron")};}
export function runGauntlet({runs=5000,seed=8675309,maxRounds=40}={}){const matchups=[];let off=0;for(const scenario of SCENARIOS)for(const rp of POLICIES)for(const ip of POLICIES)matchups.push(runMatchup({rumPolicy:rp,ironPolicy:ip,scenario,runs,seed:(seed+off++*1000003)>>>0,maxRounds}));return{model:"salvo-system-geometry-v2",fixtureNotice:"Named ships are repository benchmark fixtures, not Foundry world actor exports.",runsPerMatchup:runs,seed,scenarios:SCENARIOS,matchups};}
function pct(n){return `${(n*100).toFixed(1)}%`;}
function cli(argv){const out={runs:5000,seed:8675309,maxRounds:40,format:"text"};for(let i=0;i<argv.length;i++){if(argv[i]==="--runs")out.runs=Math.max(1,Number(argv[++i])||out.runs);else if(argv[i]==="--seed")out.seed=(Number(argv[++i])||out.seed)>>>0;else if(argv[i]==="--max-rounds")out.maxRounds=Math.max(1,Number(argv[++i])||out.maxRounds);else if(argv[i]==="--format")out.format=String(argv[++i]||out.format);}return out;}
if(import.meta.url===`file://${process.argv[1]}`){const opts=cli(process.argv.slice(2));const report=runGauntlet(opts);if(opts.format==="json"){console.log(JSON.stringify(report,null,2));}else{console.log(`Arkflight gauntlet v2 — ${report.matchups.length*opts.runs} battles · seed ${opts.seed}`);for(const sc of SCENARIOS){console.log(`\n${sc}`);for(const m of report.matchups.filter(x=>x.scenario===sc))console.log(`${m.rumPolicy.padEnd(10)} vs ${m.ironPolicy.padEnd(10)} Rum ${pct(m.rumWinRate).padStart(6)} · ${m.avgRounds.toFixed(2)} rnd · DPR ${m.rum.dpr.toFixed(1)}/${m.iron.dpr.toFixed(1)} · salvos ${m.rum.salvos.toFixed(1)}/${m.iron.salvos.toFixed(1)} · sys ${m.rum.systemHits.toFixed(2)}/${m.iron.systemHits.toFixed(2)}`);}}}
