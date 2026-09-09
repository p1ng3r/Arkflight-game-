import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(new URL("../src/ui/shipwright-workspace-ui.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/ship/shipwright-workspace.hbs", import.meta.url), "utf8");

test("Shipwright weapon sockets expose facing-specific art and mount rules", () => {
  for (const type of ["prow", "broadside", "stern", "deck", "flexible"]) assert.match(workspace, new RegExp(`socket_weapon_${type}\\.webp`));
  assert.match(template, /socket\.typeLabel/);
  assert.match(template, /socket\.capacityLabel/);
  assert.match(template, /socket\.stateLabel/);
  assert.match(template, /socket\.componentName/);
});

test("selected weapon sockets list compatible designs and their acquisition state", () => {
  assert.match(workspace, /function compatibleWeaponRows/);
  assert.match(template, /Weapons That Fit/);
  assert.match(template, /Physical fitting aboard/);
  assert.match(workspace, /Blueprint known — fabricate first/);
  assert.match(workspace, /Blueprint not known/);
});
