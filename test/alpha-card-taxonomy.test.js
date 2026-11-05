import test from "node:test";
import assert from "node:assert/strict";
import {ALPHA_CARDS} from "../src/alpha/cards.js";
import {CARD_CATEGORIES,CARD_TAG_LABELS,cardCategory,cardTags,decoratedCard} from "../src/alpha/card-taxonomy.js";

test("all implemented cards have one stable category and distinct tactical tags",()=>{
 for(const [id,card] of Object.entries(ALPHA_CARDS)){
  const category=cardCategory(card),tags=cardTags(card);
  assert.equal(typeof category.accent,"string",id);
  assert.ok(tags.length>0,id);
  assert.equal(new Set(tags).size,tags.length,id);
  assert.equal(decoratedCard(card).category,category.id,id);
  assert.equal(decoratedCard(card).categoryAccent,category.accent,id);
 }
 assert.equal(Object.keys(CARD_CATEGORIES).length,6);
});
test("timing/lifecycle tags remain separate from a card's primary category",()=>{
 assert.equal(cardCategory(ALPHA_CARDS.shield).id,"defense");
 assert.ok(cardTags(ALPHA_CARDS.shield).includes("instant"));
 assert.ok(!cardTags(ALPHA_CARDS.shield).includes("burn"));
 assert.equal(cardCategory(ALPHA_CARDS["all-hands"]).id,"attack");
 assert.ok(cardTags(ALPHA_CARDS["all-hands"]).includes("burn"));
 assert.ok(cardTags(ALPHA_CARDS["all-hands"]).includes("coordinated"));
 assert.ok(cardTags(ALPHA_CARDS.brace).includes("prepared"));
 assert.ok(cardTags(ALPHA_CARDS.chainshot).includes("ammo"));
 for(const tag of ["instant","burn","prepared","coordinated","ammo","boarding","ramming","lifeveil","strain","morale"])assert.ok(CARD_TAG_LABELS[tag]);
 assert.throws(()=>cardCategory({id:"nonexistent"}),/Unknown/);
});
