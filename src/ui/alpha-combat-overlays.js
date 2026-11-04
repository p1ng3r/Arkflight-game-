import { previewManeuver, occupiedHexes, hexDistance } from "../alpha/maneuvers.js";
import { alphaCellInBattery, alphaTargetLegal, alphaRangeBand } from "../alpha/combat.js";
let overlay=null,activeBattery=null;
function text(options){return Number.parseInt(PIXI.VERSION??"7",10)>=8?new PIXI.Text(options):new PIXI.Text(options.text,{...options.style,stroke:options.style.stroke?.color??options.style.stroke,strokeThickness:options.style.stroke?.width??0});}
export function clearAlphaOverlay(){activeBattery=null;if(overlay){overlay.parent?.removeChild(overlay);overlay.destroy({children:true});overlay=null;}}
function begin(s){clearAlphaOverlay();if(!globalThis.PIXI?.Graphics||canvas?.scene?.id!==s.canvas?.sceneId)return null;overlay=new PIXI.Container();overlay.eventMode="none";canvas.interface.addChild(overlay);const g=new PIXI.Graphics();overlay.addChild(g);return g;}
function hex(g,cell,color,alpha=.2){const points=canvas.grid.getVertices({q:cell.q,r:cell.r,s:-cell.q-cell.r}).flatMap(p=>[p.x,p.y]);if(typeof g.poly==="function"&&typeof g.fill==="function"&&typeof g.stroke==="function")g.poly(points).fill({color,alpha}).stroke({color,width:2,alpha:.8});else{g.lineStyle(2,color,.8);g.beginFill(color,alpha);g.drawPolygon(points);g.endFill();}}
export function showAlphaManeuver(s,shipId,m){
  const g=begin(s);if(!g)return;
  const ship=s.ships[shipId],preview=previewManeuver(ship.pose,m,s.directions);
  preview.trace.forEach((pose,n)=>{
    for(const cell of occupiedHexes(pose,ship.profile.footprint,s.directions))hex(g,cell,n===preview.trace.length-1?0xf0c878:0x7dd2da,n===preview.trace.length-1?.3:.1);
    if(globalThis.PIXI.Text){const point=canvas.grid.getCenterPoint({q:pose.q,r:pose.r,s:-pose.q-pose.r}),t=text({text:String(n),style:{fontSize:17,fill:0xffffff,stroke:{color:0x0a202a,width:3}}});t.anchor.set(.5);t.position.set(point.x,point.y);overlay.addChild(t);}
  });
  const end=preview.end,center=canvas.grid.getCenterPoint({q:end.q,r:end.r,s:-end.q-end.r}),angle=s.headings[end.heading]*Math.PI/180;
  const tip={x:center.x+Math.sin(angle)*30,y:center.y-Math.cos(angle)*30};
  if(typeof g.stroke==="function")g.moveTo(center.x,center.y).lineTo(tip.x,tip.y).stroke({color:0xf0c878,width:5});
  else {g.lineStyle(5,0xf0c878,1);g.moveTo(center.x,center.y);g.lineTo(tip.x,tip.y);}
}
const batteryKey=(s,shipId,batteryId)=>`${s?.id}:${s?.canvas?.sceneId}:${shipId}:${batteryId}`;
export const alphaBatteryVisible=(s,shipId,batteryId)=>!!overlay&&activeBattery===batteryKey(s,shipId,batteryId);
export const BATTERY_COLORS=Object.freeze({port:0xbda3e9,starboard:0xe7c080,fore:0x7dd2da,aft:0xf19bae});
export function legalTargetLines(s,shipId,batteryId){
 const ship=s.ships[shipId],b=ship?.batteries.find(b=>b.id===batteryId);if(!b)return [];
 return Object.values(s.ships).filter(t=>alphaTargetLegal(s,shipId,batteryId,t.id)).map(t=>{const cells=occupiedHexes(t.pose,t.profile.footprint,s.directions).filter(cell=>alphaCellInBattery(s,shipId,batteryId,cell)).sort((a,b)=>hexDistance(ship.pose,a)-hexDistance(ship.pose,b));return {id:t.id,name:t.name,cell:cells[0],color:BATTERY_COLORS[b.mount]??0x7dd2da,...alphaRangeBand(s,shipId,batteryId,t.id)};});
}
function segment(g,a,b,color,width){if(typeof g.stroke==='function')g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color,width,alpha:.9});else{g.lineStyle(width,color,.9);g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);}}
export function dottedTargetLine(g,a,b,color,width=3){const distance=Math.hypot(b.x-a.x,b.y-a.y);if(!distance)return;for(let at=0;at<distance;at+=18){const end=Math.min(distance,at+6);segment(g,{x:a.x+(b.x-a.x)*at/distance,y:a.y+(b.y-a.y)*at/distance},{x:a.x+(b.x-a.x)*end/distance,y:a.y+(b.y-a.y)*end/distance},color,width);}}
export function showAlphaTargeting(s,shipId,batteryId,options={}){return showAlphaBattery(s,shipId,batteryId,{...options,force:true,linesOnly:true});}
export function showAlphaBattery(s,shipId,batteryId,options={}){
  if(!options.force&&alphaBatteryVisible(s,shipId,batteryId)){clearAlphaOverlay();return false;}
  const g=begin(s);if(!g)return;
  const ship=s.ships[shipId],b=ship.batteries.find(b=>b.id===batteryId);if(!b)return;
  if(!options.linesOnly)for(let q=-b.range;q<=b.range;q++)for(let r=-b.range;r<=b.range;r++){
    const cell={q:ship.pose.q+q,r:ship.pose.r+r};if(alphaCellInBattery(s,shipId,batteryId,cell))hex(g,cell,s.roundFlow===2?[0x6dd5aa,0xe7c080,0xe8877c][Math.min(2,Math.floor((hexDistance(ship.pose,cell)-1)/(b.rangeIncrement??2)))]:b.mount==="port"?0xbda3e9:b.mount==="starboard"?0xe7c080:0x7dd2da,.18);
  }
 activeBattery=batteryKey(s,shipId,batteryId);
 if(options.onTarget){
  overlay.eventMode='passive';overlay.interactiveChildren=true;
  const start=canvas.grid.getCenterPoint({...ship.pose,s:-ship.pose.q-ship.pose.r});
  for(const target of legalTargetLines(s,shipId,batteryId)){
   const point=canvas.grid.getCenterPoint({...target.cell,s:-target.cell.q-target.cell.r}),selected=target.id===options.selectedTargetId;
   dottedTargetLine(g,start,point,target.color,selected?5:3);
   if(globalThis.PIXI.Text){const marker=text({text:`${selected?'✓ ':''}${target.name}\n${target.distance} hex · ${target.penalty} range · click to aim`,style:{fontSize:16,fill:target.color,stroke:{color:0x061923,width:5},align:'center'}});marker.anchor.set(.5);marker.position.set(point.x,point.y-48);marker.eventMode='static';marker.interactive=true;marker.cursor='pointer';marker.on('pointertap',event=>{event.stopPropagation?.();options.onTarget(target.id);});overlay.addChild(marker);}
  }
 }

 if(s.roundFlow===2&&globalThis.PIXI.Text){const center=canvas.grid.getCenterPoint({q:ship.pose.q,r:ship.pose.r,s:-ship.pose.q-ship.pose.r}),t=text({text:`${b.name} · 1–2: 0 | 3–4: −2${b.range>4?' | 5+: −4':''}`,style:{fontSize:15,fill:0xffffff,stroke:{color:0x0a202a,width:4}}});t.anchor.set(.5);t.position.set(center.x,center.y+80);overlay.addChild(t);}
}
Hooks.on("canvasTearDown",clearAlphaOverlay);
Hooks.on("arkflightAlphaChanged",clearAlphaOverlay);
