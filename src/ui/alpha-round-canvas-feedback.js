import {alphaPreferences} from './alpha-combat-effects.js';
let previous=null;
Hooks.on('arkflightAlphaChanged',()=>{
 const s=game.arkflight?.alphaCombat?.state();if(s?.roundFlow!==2){previous=s;return;}
 if(previous?.id===s.id&&previous.round===s.round&&!['cleanup','complete'].includes(previous.phase)&&['cleanup','complete'].includes(s.phase)&&canvas?.scene?.id===s.canvas?.sceneId&&globalThis.PIXI?.Text){
  for(const hit of s.damage){const token=canvas.tokens.get(s.ships[hit.targetId].tokenIds[0]);if(!token)continue;const text=new PIXI.Text({text:hit.degree<1?'MISS':`−${hit.damage} HULL\n${hit.raw} raw · ${hit.raw-hit.damage} prevented`,style:{fontSize:21,fill:hit.damage?'#f4bf8a':'#a8e0cf',fontWeight:'bold',align:'center',stroke:{color:'#10232d',width:5}}});text.anchor.set(.5);text.position.set(token.center.x,token.center.y-65);canvas.interface.addChild(text);const start=Date.now(),move=alphaPreferences().mode!=='off';let frame;const tick=()=>{if(text.destroyed)return;const elapsed=Date.now()-start;if(elapsed>2600){text.parent?.removeChild(text);text.destroy();return;}if(move){text.y=token.center.y-65-elapsed/75;text.alpha=Math.min(1,(2600-elapsed)/650);}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);Hooks.once('canvasTearDown',()=>{cancelAnimationFrame(frame);if(!text.destroyed){text.parent?.removeChild(text);text.destroy();}});}
 }
 previous=structuredClone(s);
});
