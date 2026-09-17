import test from "node:test";
import assert from "node:assert/strict";

import { coalesceShipEffects } from "../src/ship/ship-effects.js";

test("same-resolution positive Strain effects coalesce into one ship-wide gain", () => {
  const effects = coalesceShipEffects([
    { kind: "gain-strain", value: 2, source: "Event round consequence" },
    { kind: "gain-strain", value: 1, source: "Event round consequence" }
  ]);
  assert.deepEqual(effects, [
    { kind: "gain-strain", value: 3, source: "Event round consequence" }
  ]);
});

test("different Strain resolutions remain separate", () => {
  const effects = coalesceShipEffects([
    { kind: "gain-strain", value: 1, source: "Event round consequence" },
    { kind: "gain-strain", value: 1, source: "Heroic commitment" }
  ]);
  assert.equal(effects.length, 2);
});

test("negative Strain changes are never merged into positive danger checks", () => {
  const effects = coalesceShipEffects([
    { kind: "gain-strain", value: 2, source: "Event round consequence" },
    { kind: "gain-strain", value: -1, source: "Event round consequence" },
    { kind: "gain-strain", value: 1, source: "Event round consequence" }
  ]);
  assert.deepEqual(effects.map((effect) => effect.value), [2, -1, 1]);
});


test("condition guard metadata is preserved while coalescing a resolution", () => {
  const effects = coalesceShipEffects([
    { kind: "gain-strain", value: 1, source: "Event round consequence", finalStageGuardTarget: "drive" },
    { kind: "gain-strain", value: 2, source: "Event round consequence", finalStageGuardTarget: "drive" }
  ]);
  assert.deepEqual(effects, [
    { kind: "gain-strain", value: 3, source: "Event round consequence", finalStageGuardTarget: "drive" }
  ]);
});

test("different condition guards are not incorrectly merged", () => {
  const effects = coalesceShipEffects([
    { kind: "gain-strain", value: 1, source: "Event round consequence", finalStageGuardTarget: "drive" },
    { kind: "gain-strain", value: 1, source: "Event round consequence", finalStageGuardTarget: "hull" }
  ]);
  assert.equal(effects.length, 2);
});
