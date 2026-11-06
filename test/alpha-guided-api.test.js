import test from 'node:test';import assert from 'node:assert/strict';import {alphaWorld,installAlphaHooks} from './helpers/alpha-world.js';
installAlphaHooks();await import('../src/foundry/alpha-combat-api.js');await import('../src/foundry/alpha-guided-api.js');
const {finishGuidedCapture}=await import('../src/foundry/alpha-guided-debug.js');
test('guided API captures actual backend state, evaluated checks, all crew skills and exports text',async()=>{
 const w=alphaWorld(),api=w.initialize();game.journal={contents:[]};globalThis.JournalEntry={async create(data){const j={...data,id:'j',pages:{contents:[]},async createEmbeddedDocuments(_,r){const p={...r[0],id:`p${this.pages.contents.length}`};this.pages.contents.push(p);return[p];}};game.journal.contents.push(j);return j;}};
 const info=console.info;console.info=()=>{};let download;
 globalThis.saveDataToFile=(text,type,name)=>{download={text,type,name};};
 try{let s=await api.guided.start();assert.equal(Object.values(s.ships).length,2);for(let i=0;i<180&&s.guidedTest.status==='running';i++)s=await api.guided.next();assert.equal(s.guidedTest.status,'complete');api.guided.download();assert.equal(download.type,'text/plain');assert.match(download.name,/\.txt$/);assert.match(download.text,/Status: complete/);for(const text of ['Irena Vale','warfare-lore','diagnostics','expected','actual','modifier','guided-next'])assert.ok(download.text.includes(text),text);assert.match(download.text,/\"round\": 3/);assert.equal(game.journal.contents[0].pages.contents.length,3);}finally{finishGuidedCapture('complete');console.info=info;delete globalThis.saveDataToFile;delete globalThis.JournalEntry;}
});
