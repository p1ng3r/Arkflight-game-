import test from 'node:test';import assert from 'node:assert/strict';
globalThis.Hooks??={on(){}};
const {GuidedDebugRecorder,debugValue}=await import('../src/foundry/alpha-guided-debug.js');
test('debug report survives reload, includes error stacks, redacts credential keys and tolerates circular data',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},r=new GuidedDebugRecorder({storage,key:'test'});r.start({build:'test'});const circular={tokenId:'native-token',password:'private',authorization:'private'};circular.self=circular;r.record({kind:'error',error:new Error('movement blocked'),data:circular});r.stop('failed');const restored=new GuidedDebugRecorder({storage,key:'test'}),text=restored.text();assert.match(text,/movement blocked/);assert.match(text,/stack/);assert.match(text,/native-token/);assert.equal(text.includes('private'),false);assert.match(text,/circular/);assert.equal(restored.data.status,'failed');assert.equal(restored.data.entries.length,1);
});
test('debug storage failures and entry limits cannot interrupt the test',()=>{
 const r=new GuidedDebugRecorder({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('full');}}});r.start({});for(let i=0;i<1205;i++)r.record({kind:'step',i});assert.equal(r.data.entries.length,1200);assert.equal(r.data.dropped,5);assert.equal(debugValue({accessToken:'x'}).accessToken,'[redacted]');
});
