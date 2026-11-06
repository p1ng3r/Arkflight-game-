import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('only current combat presentation and new guide are registered; retired auto-open handlers are gone',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../module.json',import.meta.url),'utf8'));for(const file of ['src/foundry/card-combat-playtest-api.js','src/ui/card-combat-playtest-ui.js','src/ui/guided-combat-demo-ui.js','src/ui/combat-console-ui.js'])assert.equal(manifest.esmodules.includes(file),false,file);
 assert.ok(manifest.esmodules.includes('src/ui/alpha-guided-test-ui.js'));assert.ok(manifest.esmodules.includes('src/ui/alpha-round-deck-ui.js'));
 const old=await readFile(new URL('../src/ui/alpha-combat-ui.js',import.meta.url),'utf8');assert.equal(old.includes('registerMenu('),false);assert.equal(old.includes('instance??=new AlphaCombatWindow()'),false);
});
