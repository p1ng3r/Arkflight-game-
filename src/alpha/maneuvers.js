import { ALPHA_DIRECTIONS } from "./hulls.js";
export const hexDistance = (a,b) => Math.max(Math.abs(a.q-b.q), Math.abs(a.r-b.r), Math.abs(a.q+a.r-b.q-b.r));
const key = p => `${p.q},${p.r}`;
const forward = count => ({ kind: "forward", count });
const turn = direction => ({ kind: "turn", direction });
const route = (id, name, steps, ap = 0) => ({ id, name, steps, ap, description: steps.length ? steps.map(s => s.kind === "forward" ? `Move ${s.count}` : `${s.direction === 1 ? "Starboard" : "Port"} 60°`).join(" → ") : "Hold position and facing" });

export function hullManeuvers(profile) {
  const result = [route("hold", "Hold", [])];
  for (let n=1;n<=profile.speed;n++) result.push(route(`straight-${n}`, `Straight ${n}`, [forward(n)]));
  const light = ["nimble","agile","versatile","fighting","assault"].includes(profile.handling);
  const minimum = light ? 1 : 2;
  for (const [side, direction] of [["port",-1],["starboard",1]]) {
    for (let distance=minimum+1;distance<=profile.speed;distance++) {
      result.push(route(`${side}-late-${distance}`, `${side === "port" ? "Port" : "Starboard"} Late ${distance}`, [forward(distance-1),turn(direction),forward(1)]));
      if (light && profile.handling!=="fighting" && distance>2) result.push(route(`${side}-early-${distance}`, `${side === "port" ? "Port" : "Starboard"} Early ${distance}`, [forward(1),turn(direction),forward(distance-1)]));
    }
    if(profile.id==="void-skiff")for(let n=1;n<=profile.speed;n++)result.push(route(`${side}-quick-${n}`,`${side==="port"?"Port":"Starboard"} Quick ${n}`,[turn(direction),forward(n)]));
    if (light && profile.speed>=3 && !["assault","fighting"].includes(profile.handling)) result.push(route(`${side}-s-3`, `${side === "port" ? "Port" : "Starboard"} S-Curve`, [forward(1),turn(direction),forward(1),turn(-direction),forward(1)]));
    if (["nimble","agile","versatile","fighting"].includes(profile.handling)) result.push(route(`${side}-hard`, `${side === "port" ? "Port" : "Starboard"} Hard Turn`, [forward(1),turn(direction),forward(1),turn(direction),forward(1)], 1));
    if (["nimble","agile"].includes(profile.handling) || profile.unlockPivot) result.push(route(`${side}-pivot`, `${side === "port" ? "Port" : "Starboard"} Pivot`, [turn(direction)], profile.id==="void-skiff"?0:1));
    // Capital hulls get one slow turn even at speed 2, after a full straight approach.
    if (!light && profile.speed===2) result.push(route(`${side}-wide-2`, `${side === "port" ? "Port" : "Starboard"} Wide Turn`, [forward(2),turn(direction)]));
  }
  return result;
}
export function occupiedHexes(pose, size=1, directions=ALPHA_DIRECTIONS) {
  const [dq,dr]=directions[pose.heading];
  return Array.from({length:size},(_,i)=>({q:pose.q-dq*i,r:pose.r-dr*i}));
}
export function previewManeuver(pose, maneuver, directions=ALPHA_DIRECTIONS) {
  const trace=[{...pose}];
  for(const step of maneuver.steps){
    if(step.kind==="turn") trace.at(-1).heading=(trace.at(-1).heading+step.direction+6)%6;
    else if(step.kind==="forward") for(let i=0;i<step.count;i++){
      const p=trace.at(-1), [dq,dr]=directions[p.heading]; trace.push({q:p.q+dq,r:p.r+dr,heading:p.heading});
    } else throw new Error("Unknown maneuver instruction.");
  }
  return { trace, end:{...trace.at(-1)}, distance:trace.length-1, turns:maneuver.steps.filter(s=>s.kind==="turn").length };
}
export function legalHullManeuvers(ship, restrictions=[]) {
  return hullManeuvers(ship.profile).filter(m=>{
    if(m.id==="hold") return true;
    const turns=m.steps.filter(s=>s.kind==="turn").length;
    return restrictions.every(e=>{
      if(e.rule==="max-turns") return turns<=e.value;
      if(e.rule==="no-pivot") return m.steps.some(s=>s.kind==="forward");
      if(e.rule==="move-before-turn") return !turns || (m.steps[0]?.kind==="forward" && m.steps[0].count>=e.value);
      return true;
    });
  });
}
function overlaps(a,b){const cells=new Set(a.map(key));return b.some(p=>cells.has(key(p)));}

/** Simultaneous discrete alpha timing: one translation per beat; turns occur at printed waypoints. */
export async function resolveManeuvers(ships, plans, { directions=ALPHA_DIRECTIONS, isBlocked=()=>false, contest=async()=>null, restrictions={}, routeOverrides={} }={}) {
  const ids=Object.keys(ships).sort(), traces={}, poses=Object.fromEntries(ids.map(id=>[id,{...ships[id].pose}]));
  for(const id of ids){
    const ship=ships[id], m=routeOverrides[id]??legalHullManeuvers(ship,restrictions[id]??[]).find(m=>m.id===plans[id]);
    if(!m) throw new Error(`Select a legal maneuver for ${ship.name}.`);
    if(m.ap>ship.ap)throw new Error("Insufficient AP for this maneuver.");
    const preview=previewManeuver(ship.pose,m,directions);
    const reduction=Math.max(0,...(restrictions[id]??[]).filter(e=>e.rule==="travel-reduction").map(e=>e.value));
    if(reduction&&preview.distance){
      let remaining=Math.max(0,preview.distance-reduction);const steps=[];
      for(const step of m.steps){if(!remaining)break;if(step.kind==="forward"){const n=Math.min(remaining,step.count);if(n)steps.push({kind:"forward",count:n});remaining-=n;}else steps.push(step);}
      traces[id]=previewManeuver(ship.pose,{steps},directions).trace;
    }else traces[id]=preview.trace;
  }
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)if(overlaps(occupiedHexes(poses[ids[i]],ships[ids[i]].profile.footprint,directions),occupiedHexes(poses[ids[j]],ships[ids[j]].profile.footprint,directions)))throw new Error("Starting ship footprints overlap.");
  const stalled=new Set(), contacts=[], seen=new Set(), frames=[];
  const max=Math.max(...Object.values(traces).map(t=>t.length));
  for(let beat=0;beat<max;beat++){
    const candidates=Object.fromEntries(ids.map(id=>[id,stalled.has(id)?{...poses[id]}:{...traces[id][Math.min(beat,traces[id].length-1)]}]));
    for(const id of ids){
      if(stalled.has(id))continue;
      const old=occupiedHexes(poses[id],ships[id].profile.footprint,directions), target=occupiedHexes(candidates[id],ships[id].profile.footprint,directions);
      if(isBlocked({shipId:id,from:poses[id],to:candidates[id],fromCells:old,toCells:target})){
        stalled.add(id);candidates[id]={...poses[id]};const contact={ids:[id],beat,kind:"obstacle"}; await contest(contact); contacts.push(contact);
      }
    }
    let changed=true;
    while(changed){
      changed=false;
      for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
        const a=ids[i],b=ids[j], pair=`${a}:${b}`;
        const aNew=occupiedHexes(candidates[a],ships[a].profile.footprint,directions), bNew=occupiedHexes(candidates[b],ships[b].profile.footprint,directions);
        const aOld=occupiedHexes(poses[a],ships[a].profile.footprint,directions), bOld=occupiedHexes(poses[b],ships[b].profile.footprint,directions);
        const crossed=overlaps(aOld,bNew)&&overlaps(bOld,aNew);
        if(!overlaps(aNew,bNew)&&!crossed)continue;
        if(!seen.has(pair)){
          seen.add(pair);
          const contact={ids:[a,b],beat,kind:crossed?"head-on":"contact"};
          const winner=await contest(contact);
          if(winner!=null && ![a,b].includes(winner))throw new Error("Invalid collision winner.");
          contact.winner=winner; contacts.push(contact);
          if(winner && !stalled.has(winner)){
            const loser=winner===a?b:a;
            let stop={...poses[loser]};
            const winnerCells=occupiedHexes(candidates[winner],ships[winner].profile.footprint,directions);
            if(overlaps(occupiedHexes(stop,ships[loser].profile.footprint,directions),winnerCells)||crossed){
              const choices=directions.map(([q,r],index)=>({q:poses[loser].q+q,r:poses[loser].r+r,heading:poses[loser].heading,index}));
              stop=choices.find(p=>{
                const cells=occupiedHexes(p,ships[loser].profile.footprint,directions);
                return !ids.some(id=>id!==loser && overlaps(cells,occupiedHexes(candidates[id],ships[id].profile.footprint,directions))) &&
                  !overlaps(cells,occupiedHexes(poses[winner],ships[winner].profile.footprint,directions)) &&
                  !traces[winner].slice(beat).some(pose=>overlaps(cells,occupiedHexes(pose,ships[winner].profile.footprint,directions))) &&
                  !isBlocked({shipId:loser,from:poses[loser],to:p,fromCells:occupiedHexes(poses[loser],ships[loser].profile.footprint,directions),toCells:cells});
              });
            }
            if(stop){stalled.add(loser);candidates[loser]={q:stop.q,r:stop.r,heading:stop.heading};contact.displaced=key(stop)!==key(poses[loser]);changed=true;continue;}
            contact.winner=null;contact.noSafeSpace=true;
          }
        }
        for(const id of [a,b]) if(!stalled.has(id)){stalled.add(id);candidates[id]={...poses[id]};changed=true;}
      }
    }
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)if(overlaps(occupiedHexes(candidates[ids[i]],ships[ids[i]].profile.footprint,directions),occupiedHexes(candidates[ids[j]],ships[ids[j]].profile.footprint,directions)))throw new Error("Collision resolution could not find non-overlapping stop positions.");
    for(const id of ids)poses[id]={...candidates[id]};
    frames.push(structuredClone(poses));
  }
  return {frames,contacts,poses,stalled:[...stalled],costs:Object.fromEntries(ids.map(id=>[id,(routeOverrides[id]??hullManeuvers(ships[id].profile).find(m=>m.id===plans[id])).ap]))};
}
