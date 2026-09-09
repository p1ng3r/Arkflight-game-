import test from "node:test";
import assert from "node:assert/strict";
import { targetBearing, weaponArcCheck, weaponRangeBand, weaponTargetingSolution } from "../src/combat/weapon-targeting.js";

test("target bearing uses Foundry clockwise headings", () => {
  assert.equal(targetBearing({ x: 0, y: 0 }, { x: 0, y: -10 }), 0);
  assert.equal(targetBearing({ x: 0, y: 0 }, { x: 10, y: 0 }), 90);
  assert.equal(targetBearing({ x: 0, y: 0 }, { x: 0, y: 10 }), 180);
});

test("weapon range bands report close, optimal, long and illegal distances", () => {
  const range = { min: 2, optimalMin: 4, optimalMax: 7, max: 10 };
  assert.equal(weaponRangeBand(range, 1).key, "too-close");
  assert.equal(weaponRangeBand(range, 3).key, "close");
  assert.equal(weaponRangeBand(range, 6).key, "optimal");
  assert.equal(weaponRangeBand(range, 9).key, "long");
  assert.equal(weaponRangeBand(range, 11).key, "out-of-range");
});

test("mounted firing arcs rotate with ship heading", () => {
  assert.equal(weaponArcCheck({ heading: 60, mount: "fore", arcTemplate: "line", bearing: 70 }).legal, true);
  assert.equal(weaponArcCheck({ heading: 60, mount: "port", arcTemplate: "line", bearing: 330 }).legal, true);
  assert.equal(weaponArcCheck({ heading: 60, mount: "starboard", arcTemplate: "line", bearing: 330 }).legal, false);
});

test("targeting requires both legal range and arc", () => {
  const weapon = { data: { combat: { arcTemplate: "wide", rangeHexes: { min: 1, optimalMin: 2, optimalMax: 4, max: 6 } } } };
  assert.equal(weaponTargetingSolution({ weapon, weaponState: { mount: "fore" }, heading: 0, distanceHexes: 3, bearing: 45 }).legal, true);
  assert.equal(weaponTargetingSolution({ weapon, weaponState: { mount: "fore" }, heading: 0, distanceHexes: 7, bearing: 45 }).legal, false);
  assert.equal(weaponTargetingSolution({ weapon, weaponState: { mount: "fore" }, heading: 0, distanceHexes: 3, bearing: 180 }).legal, false);
});
