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
