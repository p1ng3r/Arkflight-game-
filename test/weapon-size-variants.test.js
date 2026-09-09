import test from "node:test";
import assert from "node:assert/strict";

import { HULLS, WEAPONS } from "../src/content/index.js";

const SIZE_RANK = Object.freeze({ small: 1, medium: 2, large: 3 });

const LIGHT_VARIANTS = Object.freeze([
  ["light-swivel-cannon", "swivel-cannon", "2d8"],
  ["light-deck-culverin", "deck-culverin", "2d10"],
  ["light-broadside-cannon", "broadside-cannon-battery", "3d8"],
  ["light-deck-scattergun", "deck-scattergun", "3d6"]
]);

test("common cannon roles have small variants without inventing locations or arcs", () => {
  for (const [lightId, parentId, expectedDice] of LIGHT_VARIANTS) {
    const light = WEAPONS[lightId];
    const parent = WEAPONS[parentId];

    assert.ok(light, `${lightId} exists`);
    assert.ok(parent, `${parentId} exists`);
    assert.equal(light.data.size, "small", `${lightId} is small`);
    assert.equal(parent.data.size, "medium", `${parentId} is medium`);
    assert.equal(light.data.mountType, "small", `${lightId} uses a small mount`);
    assert.equal(light.data.family, parent.data.family, `${lightId} keeps its weapon family`);
    assert.deepEqual(light.data.allowedMounts, parent.data.allowedMounts, `${lightId} keeps parent mount locations`);
    assert.equal(light.data.combat.arcTemplate, parent.data.combat.arcTemplate, `${lightId} keeps parent firing arc`);
    assert.equal(light.data.damageProfile.dice, expectedDice, `${lightId} uses its reduced damage profile`);
    assert.ok(light.data.combat.rangeHexes.max < parent.data.combat.rangeHexes.max, `${lightId} has reduced maximum range`);
    assert.ok(light.data.crewRequired < parent.data.crewRequired, `${lightId} needs fewer crew`);
    assert.ok(light.data.cargo < parent.data.cargo, `${lightId} uses less cargo`);
    assert.ok(light.data.combat.fireAP <= parent.data.combat.fireAP, `${lightId} does not cost more fire AP`);
    assert.deepEqual(light.data.refit, parent.data.refit, `${lightId} stays on standard tier-1 refit pricing`);
  }
});

test("every stock hull mount has at least one compatible weapon choice", () => {
  for (const hull of Object.values(HULLS)) {
    for (const [facing, mount] of Object.entries(hull.data.baseStats.weaponMounts)) {
      if (mount.count < 1) continue;
      const choices = Object.values(WEAPONS).filter((weapon) => (
        weapon.data.allowedMounts.includes(facing)
        && SIZE_RANK[weapon.data.size] <= SIZE_RANK[mount.maxSize]
      ));
      assert.ok(choices.length > 0, `${hull.name} ${facing} ${mount.maxSize} mount has a weapon choice`);
    }
  }
});

test("small cannon choices now cover each stock small-mount facing", () => {
  const smallCannonFacings = new Set(
    Object.values(WEAPONS)
      .filter((weapon) => weapon.data.family === "cannon" && weapon.data.size === "small")
      .flatMap((weapon) => weapon.data.allowedMounts)
  );

  const requiredSmallFacings = new Set();
  for (const hull of Object.values(HULLS)) {
    for (const [facing, mount] of Object.entries(hull.data.baseStats.weaponMounts)) {
      if (mount.count > 0 && mount.maxSize === "small") requiredSmallFacings.add(facing);
    }
  }

  assert.deepEqual([...requiredSmallFacings].sort(), ["aft", "fore", "port", "starboard"]);
  for (const facing of requiredSmallFacings) {
    assert.ok(smallCannonFacings.has(facing), `small cannon coverage includes ${facing}`);
  }
});

test("specialized arcane and siege weapons remain intentionally size-locked", () => {
  assert.equal(WEAPONS["aether-arc-projector"].data.size, "medium");
  assert.equal(WEAPONS["stormglass-lance"].data.size, "large");
  assert.equal(WEAPONS["heavy-bombard"].data.size, "large");

  for (const id of ["light-aether-arc-projector", "light-stormglass-lance", "light-heavy-bombard"]) {
    assert.equal(WEAPONS[id], undefined, `${id} is not added as a generic downsized weapon`);
  }
});
