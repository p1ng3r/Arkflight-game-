import test from "node:test";
import assert from "node:assert/strict";

import {
  helmBearing,
  shipHelmDirections,
  signedHelmDelta
} from "../src/combat/ship-helm-movement.js";

const origin = Object.freeze({ x: 0, y: 0 });

function pointAt(bearing, distance = 100) {
  const radians = bearing * Math.PI / 180;
  return Object.freeze({
    x: Math.sin(radians) * distance,
    y: -Math.cos(radians) * distance
  });
}

const sixNeighbors = Object.freeze([0, 60, 120, 180, 240, 300].map((bearing) =>
  Object.freeze({ id: String(bearing), center: pointAt(bearing) })
));

test("helm bearing uses Foundry-style 0° north clockwise rotation", () => {
  assert.equal(Math.round(helmBearing(origin, pointAt(0))), 0);
  assert.equal(Math.round(helmBearing(origin, pointAt(90))), 90);
  assert.equal(Math.round(helmBearing(origin, pointAt(180))), 180);
  assert.equal(Math.round(helmBearing(origin, pointAt(270))), 270);
  assert.equal(signedHelmDelta(0, 330), -30);
  assert.equal(signedHelmDelta(330, 0), 30);
});

test("grid-aligned headings expose one forward hex", () => {
  const directions = shipHelmDirections(origin, sixNeighbors, 60);
  assert.equal(directions.forward.length, 1);
  assert.equal(directions.forward[0].id, "forward");
  assert.equal(Math.round(directions.forward[0].bearing), 60);
});

test("30-degree half headings expose forward-left and forward-right", () => {
  const directions = shipHelmDirections(origin, sixNeighbors, 30);
  assert.equal(directions.forward.length, 2);
  assert.deepEqual(directions.forward.map((entry) => entry.id), ["forward-left", "forward-right"]);
  assert.deepEqual(directions.forward.map((entry) => Math.round(entry.bearing)), [0, 60]);
});

test("half headings also expose two legal Reverse Thrust hexes", () => {
  const directions = shipHelmDirections(origin, sixNeighbors, 30);
  assert.equal(directions.reverse.length, 2);
  assert.deepEqual(directions.reverse.map((entry) => entry.id), ["reverse-left", "reverse-right"]);
  assert.deepEqual(directions.reverse.map((entry) => Math.round(entry.bearing)), [180, 240]);
});

test("direction solver adapts when the physical hex grid is rotated by 30 degrees", () => {
  const rotatedNeighbors = [30, 90, 150, 210, 270, 330].map((bearing) =>
    Object.freeze({ id: String(bearing), center: pointAt(bearing) })
  );
  const aligned = shipHelmDirections(origin, rotatedNeighbors, 30);
  assert.equal(aligned.forward.length, 1);
  assert.equal(Math.round(aligned.forward[0].bearing), 30);

  const split = shipHelmDirections(origin, rotatedNeighbors, 60);
  assert.deepEqual(split.forward.map((entry) => Math.round(entry.bearing)), [30, 90]);
});
