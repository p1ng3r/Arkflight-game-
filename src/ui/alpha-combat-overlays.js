import { previewManeuver, occupiedHexes } from "../alpha/maneuvers.js";
import { alphaCellInBattery } from "../alpha/combat.js";
let overlay=null;
export function clearAlphaOverlay(){if(overlay){overlay.parent?.removeChild(overlay);overlay.destroy({children:true});overlay=null;}}
function begin(s){clearAlphaOverlay();if(!globalThis.PIXI?.Graphics||canvas?.scene?.id!==s.canvas?.sceneId)return null;overlay=new PIXI.Container();overlay.eventMode="none";canvas.interface.addChild(overlay);const g=new PIXI.Graphics();overlay.addChild(g);return g;}
function hex(g,cell,color,alpha=.2){const points=canvas.grid.getVertices({q:cell.q,r:cell.r,s:-cell.q-cell.r}).flatMap(p=>[p.x,p.y]);if(g.poly)g.poly(points).fill({color,alpha}).stroke({color,width:2,alpha:.8});else{g.lineStyle(2,color,.8);g.beginFill(color,alpha);g.drawPolygon(points);g.endFill();}}
export function showAlphaManeuver(s,shipId,m){
  const g=begin(s);if(!g)return;
  const ship=s.ships[shipId],preview=previewManeuver(ship.pose,m,s.directions);
  preview.trace.forEach((pose,n)=>{
    for(const cell of occupiedHexes(pose,ship.profile.footprint,s.directions))hex(g,cell,n===preview.trace.length-1?0xf0c878:0x7dd2da,n===preview.trace.length-1?.3:.1);
    if(globalThis.PIXI.Text){const point=canvas.grid.getCenterPoint({q:pose.q,r:pose.r,s:-pose.q-pose.r}),t=new PIXI.Text({text:String(n),style:{fontSize:17,fill:0xffffff,stroke:{color:0x0a202a,width:3}}});t.anchor.set(.5);t.position.set(point.x,point.y);overlay.addChild(t);}
  });
  const end=preview.end,center=canvas.grid.getCenterPoint({q:end.q,r:end.r,s:-end.q-end.r}),angle=s.headings[end.heading]*Math.PI/180;
  const tip={x:center.x+Math.sin(angle)*30,y:center.y-Math.cos(angle)*30};
  if(g.moveTo)g.moveTo(center.x,center.y).lineTo(tip.x,tip.y).stroke({color:0xf0c878,width:5});
}
export function showAlphaBattery(s,shipId,batteryId){
  const g=begin(s);if(!g)return;
  const ship=s.ships[shipId],b=ship.batteries.find(b=>b.id===batteryId);if(!b)return;
  for(let q=-b.range;q<=b.range;q++)for(let r=-b.range;r<=b.range;r++){
    const cell={q:ship.pose.q+q,r:ship.pose.r+r};if(alphaCellInBattery(s,shipId,batteryId,cell))hex(g,cell,b.mount==="port"?0xbda3e9:b.mount==="starboard"?0xe7c080:0x7dd2da,.18);
  }
}
Hooks.on("canvasTearDown",clearAlphaOverlay);
Hooks.on("arkflightAlphaChanged",clearAlphaOverlay);
