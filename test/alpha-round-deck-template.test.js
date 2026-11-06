import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const template=readFileSync(new URL('../templates/alpha-round-deck.hbs',import.meta.url),'utf8');
const model=readFileSync(new URL('../src/ui/alpha-round-deck-ui.js',import.meta.url),'utf8');

test('round deck only uses native block conditionals, not external eq helpers',()=>{
 assert.doesNotMatch(template,/\{\{#if\s+\(eq\b/);
 for(const flag of ['card.isBoarding','layoutIllustrated','layoutMinimalist','soundFull','soundSubtle','soundOff','cardChoice.isSurvey','buildFour','isInstant']){
  assert.ok(template.includes('{{#if '+flag+'}}'),flag+' must be used by the template');
 }
 for(const flag of ['isBoarding:','layoutIllustrated:','layoutMinimalist:','soundFull:','soundSubtle:','soundOff:','isSurvey:','buildFour:','isInstant:']){
  assert.ok(model.includes(flag),flag+' must be projected by the current HUD controller');
 }
});
