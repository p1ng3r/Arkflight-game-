import test from 'node:test';import assert from 'node:assert/strict';
globalThis.Hooks={on(){},once(){}};const {ensureAlphaTestBackdrop}=await import('../src/foundry/alpha-combat-canvas.js');
test('starfield decorates only an empty dedicated test scene and never writes grids or tokens',async()=>{
 const writes=[],scene={flags:{'arkflight-game':{alphaCombatScene:true}},width:3200,height:2600,background:{},async update(data){writes.push(data);this.background.src=data['background.src'];}};globalThis.game={user:{isGM:true},scenes:{get:()=>scene}};const state={canvas:{sceneId:'test'}};assert.equal(await ensureAlphaTestBackdrop(state),true);assert.deepEqual(Object.keys(writes[0]).sort(),['background.scaleX','background.scaleY','background.src','backgroundColor'].sort());assert.equal(await ensureAlphaTestBackdrop(state),false);
 scene.background={src:'campaign-art.webp'};assert.equal(await ensureAlphaTestBackdrop(state),false);scene.background={};scene.flags={};assert.equal(await ensureAlphaTestBackdrop(state),false);scene.flags={'arkflight-game':{alphaCombatScene:true}};game.user.isGM=false;assert.equal(await ensureAlphaTestBackdrop(state),false);assert.equal(writes.length,1);
});

test('Foundry v14 fixture checks the Level background without touching deprecated Scene.background',async()=>{
 let writes=0;const scene={flags:{'arkflight-game':{alphaCombatScene:true}},firstLevel:{background:{src:"existing.webp"}},width:3200,height:2600,async update(){writes++;}};
 Object.defineProperty(scene,"background",{get(){throw Error("Deprecated Scene.background getter accessed.");}});
 game={user:{isGM:true},scenes:{get:()=>scene}};
 const state={canvas:{sceneId:"test"}};
 assert.equal(await ensureAlphaTestBackdrop(state),false);
 assert.equal(writes,0);
 scene.firstLevel.background.src="";
 assert.equal(await ensureAlphaTestBackdrop(state),true);
 assert.equal(writes,1);
});
