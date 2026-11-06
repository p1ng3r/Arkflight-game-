import test from "node:test";
import assert from "node:assert/strict";
import {ALPHA_CARDS,ALPHA_STARTER_DECK} from "../src/alpha/cards.js";
import {createShipLibrary,changeShipLibrary,assertShipLibrary,shipDeckCapacity,selectedLibraryDeck,validateLibraryDeck} from "../src/alpha/ship-library.js";
const config={hullId:"brigantine",level:1};
const send=(s,type,extra={},random=()=>0)=>changeShipLibrary(s,{type,libraryRevision:s.revision,...extra},{random});
test("new ship begins with twenty cards and earns one of three independent candidates",()=>{
 let s=createShipLibrary(config);
 assert.equal(selectedLibraryDeck(s).length,20);
 assert.equal(shipDeckCapacity(s),20);
 s=send(s,"library-offer",{rewardId:"commission",kind:"commission"});
 assert.equal(s.rewards.pending.options.length,3);
 assert.equal(new Set(s.rewards.pending.options).size,3);
 assert.ok(s.rewards.pending.options.every(id=>!ALPHA_STARTER_DECK.includes(id)));
 const selected=s.rewards.pending.options[1];
 assert.throws(()=>send(s,"library-pick",{rewardId:"commission",cardId:"patch"}),/Choose one/);
 s=send(s,"library-pick",{rewardId:"commission",cardId:selected});
 assert.equal(s.rewards.pending,null);
 assert.equal(s.rewards.history.length,1);
 assert.ok(s.learned.includes(selected));
 assert.equal(shipDeckCapacity(s),21);
 assert.equal(selectedLibraryDeck(s).length,21);
 assert.equal(selectedLibraryDeck(s).at(-1),selected);
 assert.deepEqual(validateLibraryDeck(s,s.loadouts[0]),[]);
 assert.equal(s.loadouts[1].cards.length,20);
 assert.deepEqual(assertShipLibrary(structuredClone(s)),s);
});
test("GM can issue one reward per completed quest, never duplicate a quest or grant while pending",()=>{
 let s=createShipLibrary(config);
 s=send(s,"library-offer",{rewardId:"quest.gilded.01",kind:"quest"});
 assert.throws(()=>send(s,"library-offer",{rewardId:"quest.gilded.02",kind:"quest"}),/Finish the current/);
 const picked=s.rewards.pending.options[0];
 s=send(s,"library-pick",{rewardId:"quest.gilded.01",cardId:picked});
 assert.throws(()=>send(s,"library-offer",{rewardId:"quest.gilded.01",kind:"quest"}),/already awarded/);
 assert.throws(()=>send(s,"library-pick",{rewardId:"quest.gilded.01",cardId:picked}),/Choose one/);
 s=send(s,"library-offer",{rewardId:"quest.gilded.02",kind:"quest"});
 assert.ok(s.rewards.pending.options.every(id=>!s.learned.includes(id)));
});
test("previously saved schema-1 libraries remain readable and can receive new rewards",()=>{
 const prior=createShipLibrary(config);delete prior.rewards;
 assert.doesNotThrow(()=>assertShipLibrary(prior));
 let next=send(prior,"library-offer",{rewardId:"quest-1",kind:"quest"});
 assert.equal(next.rewards.history.length,0);
 assert.equal(next.rewards.pending.options.length,3);
});
test("bad reward choices and unknown references never mutate the saved library",()=>{
 const s=createShipLibrary(config),before=structuredClone(s);
 assert.throws(()=>send(s,"library-offer",{rewardId:"not!legal",kind:"quest"}),/Name/);
 assert.throws(()=>send(s,"library-offer",{rewardId:"quest1",kind:"quest"},()=>1),/randomizer/);
 assert.throws(()=>send(s,"library-pick",{rewardId:"quest1",cardId:"vent"}),/Choose one/);
 assert.deepEqual(s,before);
});
test("repeated card rewards remain distinct unlocks, and equipped deck never exceeds thirty",()=>{
 let s=createShipLibrary(config);
 const initialCandidates=Object.keys(ALPHA_CARDS).filter(id=>!s.learned.includes(id)).length;
 for(let i=0;i<Math.min(initialCandidates-2,8);i++){
  s=send(s,"library-offer",{rewardId:`quest-${i}`,kind:"quest"});
  s=send(s,"library-pick",{rewardId:`quest-${i}`,cardId:s.rewards.pending.options[0]});
  assert.ok(selectedLibraryDeck(s).length<=30);
 }
 assert.equal(s.rewards.history.length,Math.min(initialCandidates-2,8));
 assert.ok(s.rewards.history.every((r,i)=>i===0||r.cardId!==s.rewards.history[i-1].cardId));
});

test("the first helming choice influences, but does not lock, the next five quest offers",()=>{
 let s=createShipLibrary(config);
 s=send(s,"library-offer",{rewardId:"commission",kind:"commission"});
 const chosen=s.rewards.pending.options[0];
 s=send(s,"library-pick",{rewardId:"commission",cardId:chosen});
 s=send(s,"library-offer",{rewardId:"quest-one",kind:"quest"});
 const firstCategory=ALPHA_CARDS[chosen].role;
 const remainingSame=Object.values(ALPHA_CARDS).filter(card=>card.role===firstCategory&&!s.learned.includes(card.id));
 if(remainingSame.length)assert.ok(s.rewards.pending.options.some(id=>ALPHA_CARDS[id].role===firstCategory));
 assert.equal(s.rewards.pending.options.length,3);
});
