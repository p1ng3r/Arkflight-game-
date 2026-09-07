import test from "node:test";
import assert from "node:assert/strict";

import { selectOfficerWeaponCandidate } from "../src/foundry/pf2e-equipment-resolver.js";

function weapon({ id, name, baseItem, level, gp = 1, rarity = "common" }) {
  return {
    _id:id,
    name,
    type:"weapon",
    system:{
      baseItem,
      level:{ value:level },
      price:{ value:{ gp } },
      traits:{ rarity }
    }
  };
}

test("generated officer weapon selection rejects matching weapons above officer level", () => {
  const index = [
    weapon({ id:"level-20", name:"Impossible Rapier", baseItem:"rapier", level:20, gp:10000 }),
    weapon({ id:"base-rapier", name:"Rapier", baseItem:"rapier", level:0, gp:2 })
  ];

  const selected = selectOfficerWeaponCandidate(index, ["rapier"], { maxLevel:6 });
  assert.equal(selected?._id, "base-rapier");
  assert.ok(selected.system.level.value <= 6);
});

test("generated officer weapon selection prefers the ordinary exact-name weapon over a special base-item match", () => {
  const index = [
    weapon({ id:"special", name:"Flaming Rapier", baseItem:"rapier", level:5, gp:150 }),
    weapon({ id:"ordinary", name:"Rapier", baseItem:"rapier", level:0, gp:2 })
  ];

  const selected = selectOfficerWeaponCandidate(index, ["rapier"], { maxLevel:6 });
  assert.equal(selected?._id, "ordinary");
});

test("generated officer weapon selection returns no candidate when every match exceeds officer level", () => {
  const index = [
    weapon({ id:"level-12", name:"Greater Crossbow", baseItem:"crossbow", level:12, gp:1200 }),
    weapon({ id:"level-20", name:"Mythic Crossbow", baseItem:"crossbow", level:20, gp:20000 })
  ];

  const selected = selectOfficerWeaponCandidate(index, ["crossbow"], { maxLevel:6 });
  assert.equal(selected, null);
});
