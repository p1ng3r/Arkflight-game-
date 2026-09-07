import test from "node:test";
import assert from "node:assert/strict";

import { selectOfficerSpellCandidates } from "../src/foundry/pf2e-spell-resolver.js";

function spell({ id, name, slug, level, traditions=["occult"], rarity="common" }) {
  return {
    _id:id,
    name,
    type:"spell",
    system:{
      slug,
      level:{ value:level },
      traits:{ traditions, rarity }
    }
  };
}

test("generated caster rejects spells above its legal maximum rank", () => {
  const index = [
    spell({ id:"heroism-6", name:"Heroism Greater", slug:"heroism", level:6 }),
    spell({ id:"heroism-3", name:"Heroism", slug:"heroism", level:3 })
  ];
  const selected = selectOfficerSpellCandidates(index, {
    maxRank:3,
    tradition:"occult",
    candidateSlugs:["heroism"]
  });
  assert.equal(selected.length, 1);
  assert.equal(selected[0]._id, "heroism-3");
});

test("generated caster rejects the wrong magical tradition", () => {
  const index = [
    spell({ id:"arcane-fear", name:"Fear", slug:"fear", level:1, traditions:["arcane"] }),
    spell({ id:"occult-fear", name:"Fear", slug:"fear", level:1, traditions:["occult"] })
  ];
  const selected = selectOfficerSpellCandidates(index, {
    maxRank:3,
    tradition:"occult",
    candidateSlugs:["fear"]
  });
  assert.equal(selected.length, 1);
  assert.equal(selected[0]._id, "occult-fear");
});

test("generated caster resolves several different requested spells without duplicates", () => {
  const index = [
    spell({ id:"fear", name:"Fear", slug:"fear", level:1 }),
    spell({ id:"soothe", name:"Soothe", slug:"soothe", level:1 }),
    spell({ id:"heroism", name:"Heroism", slug:"heroism", level:3 })
  ];
  const selected = selectOfficerSpellCandidates(index, {
    maxRank:3,
    tradition:"occult",
    candidateSlugs:["fear","soothe","heroism"]
  });
  assert.deepEqual(selected.map((entry) => entry._id), ["fear","soothe","heroism"]);
});