import test from 'node:test';import assert from 'node:assert/strict';
import {createAlphaSession} from '../src/alpha/combat.js';
import {legalHullManeuvers} from '../src/alpha/maneuvers.js';
globalThis.Hooks={on(){}};
const {showAlphaManeuver,showAlphaBattery,alphaBatteryVisible,clearAlphaOverlay}=await import('../src/ui/alpha-combat-overlays.js');
test('maneuver overlays draw with Foundry PIXI 7 graphics and text constructors',()=>{
 let lines=0,texts=0;
 class Graphics{lineStyle(){return this;}beginFill(){return this;}drawPolygon(){return this;}endFill(){return this;}moveTo(){return this;}lineTo(){lines++;return this;}}
 class Text{constructor(text,style){assert.equal(typeof text,'string');assert.ok(style);texts++;this.anchor={set(){}};this.position={set(){}};}}
 globalThis.PIXI={VERSION:'7.4.3',Graphics,Text,Container:class{addChild(){}destroy(){}}};
 globalThis.canvas={scene:{id:'scene'},interface:{addChild(){}},grid:{getVertices(){return [{x:0,y:0},{x:1,y:1}]},getCenterPoint(){return{x:50,y:50}}}};
 const s=createAlphaSession([{id:'a',team:'crew',name:'A',hullId:'brigantine',level:5,pose:{q:0,r:0,heading:0}},{id:'b',team:'enemy',name:'B',hullId:'brigantine',level:5}],{id:'overlay-test',seed:1});s.canvas={sceneId:'scene'};
 const route=legalHullManeuvers(s.ships.a,[]).find(r=>r.id==='straight-1');showAlphaManeuver(s,'a',route);assert.ok(lines>0);assert.ok(texts>0);clearAlphaOverlay();
});

test('weapon preview toggles off on repeat, replaces other ships/batteries and never changes rules state',()=>{
 let created=0,destroyed=0;class Graphics{lineStyle(){return this;}beginFill(){return this;}drawPolygon(){return this;}endFill(){return this;}moveTo(){return this;}lineTo(){return this;}}
 globalThis.PIXI={VERSION:'7.4.3',Graphics,Container:class{constructor(){created++;}addChild(){}destroy(){destroyed++;}}};globalThis.canvas={scene:{id:'scene'},interface:{addChild(){}},grid:{getVertices(){return[{x:0,y:0},{x:1,y:1}]},getCenterPoint(){return{x:50,y:50}}}};
 const s=createAlphaSession([{id:'a',team:'crew',name:'A',hullId:'brigantine'},{id:'b',team:'enemy',name:'B',hullId:'brigantine'}],{id:'toggle',seed:1,roundFlow:2});s.canvas={sceneId:'scene'};const before=structuredClone(s);
 showAlphaBattery(s,'a','port');assert.equal(alphaBatteryVisible(s,'a','port'),true);showAlphaBattery(s,'a','port');assert.equal(alphaBatteryVisible(s,'a','port'),false);assert.equal(destroyed,1);
 showAlphaBattery(s,'a','port');showAlphaBattery(s,'a','starboard');assert.equal(alphaBatteryVisible(s,'a','port'),false);assert.equal(alphaBatteryVisible(s,'a','starboard'),true);showAlphaBattery(s,'b','starboard');assert.equal(alphaBatteryVisible(s,'a','starboard'),false);assert.equal(alphaBatteryVisible(s,'b','starboard'),true);
 clearAlphaOverlay();assert.equal(alphaBatteryVisible(s,'b','starboard'),false);assert.equal(created,destroyed);assert.deepEqual(s,before);
});

for(const version of ['7.4.3','8.0.0'])test(`dotted aiming on PIXI ${version} filters illegal targets and selects without spending`,async()=>{
 const {showAlphaTargeting,legalTargetLines,BATTERY_COLORS}=await import('../src/ui/alpha-combat-overlays.js');let segments=0,polygons=0,picked=null;const children=[];
 class Graphics{lineStyle(){return this;}beginFill(){return this;}drawPolygon(){polygons++;return this;}endFill(){return this;}moveTo(){return this;}lineTo(){segments++;return this;}stroke(){return this;}}
 if(version.startsWith('7'))Graphics.prototype.stroke=undefined;
 class Text{constructor(...args){this.text=typeof args[0]==='string'?args[0]:args[0].text;this.anchor={set(){}};this.position={set(){}};}on(name,fn){this.handler=fn;return this;}}
 globalThis.PIXI={VERSION:version,Graphics,Text,Container:class{addChild(c){children.push(c);}destroy(){}}};globalThis.canvas={scene:{id:'scene'},interface:{addChild(){}},grid:{getVertices(){return[];},getCenterPoint({q,r}){return{x:q*90,y:r*100};}}};
 const s=createAlphaSession([{id:'a',team:'crew',name:'A',hullId:'brigantine',pose:{q:0,r:0,heading:0}},{id:'b',team:'enemy',name:'B',hullId:'brigantine',pose:{q:0,r:-2,heading:3}},{id:'friend',team:'crew',name:'Friendly',hullId:'brigantine',pose:{q:0,r:-1,heading:0}},{id:'far',team:'enemy',name:'Far',hullId:'brigantine',pose:{q:0,r:-20,heading:0}}],{id:'aim',seed:1,roundFlow:2});s.canvas={sceneId:'scene'};const before=structuredClone(s),lines=legalTargetLines(s,'a','fore');assert.deepEqual(lines.map(x=>x.id),['b']);assert.equal(lines[0].color,BATTERY_COLORS.fore);
 showAlphaTargeting(s,'a','fore',{onTarget:id=>{picked=id;}});assert.ok(segments>2);assert.equal(polygons,0);const marker=children.find(c=>c.text?.includes('click to aim'));assert.ok(marker);assert.equal(marker.eventMode,'static');marker.handler({stopPropagation(){}});assert.equal(picked,'b');assert.deepEqual(s,before);clearAlphaOverlay();
});
