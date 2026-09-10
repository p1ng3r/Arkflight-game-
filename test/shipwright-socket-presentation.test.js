import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(new URL("../src/ui/shipwright-workspace-ui.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/ship/shipwright-workspace.hbs", import.meta.url), "utf8");
const workspaceCss = readFileSync(new URL("../styles/shipwright-workspace.css", import.meta.url), "utf8");
const visualBoards = readFileSync(new URL("../src/ui/ship-sheet-visual-boards-ui.js", import.meta.url), "utf8");
const visualBoardsCss = readFileSync(new URL("../styles/ship-sheet-visual-boards.css", import.meta.url), "utf8");
const armory = readFileSync(new URL("../src/ui/armory-ux.js", import.meta.url), "utf8");

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


test("occupied Shipwright sockets show the installed catalog component artwork", () => {
  assert.match(workspace, /componentImg/);
  assert.match(workspace, /component\?\.img \?\? component\?\.data\?\.art\?\.img/);
  assert.match(template, /arkflight-workspace-socket-component/);
  assert.match(template, /socket\.componentImg/);
  assert.match(workspaceCss, /arkflight-workspace-socket-component/);
  assert.match(workspaceCss, /has-component-art/);
});

test("visual fitting boards and armory mounts use installed mod and weapon artwork", () => {
  assert.match(visualBoards, /installedSocketLayout/);
  assert.match(visualBoards, /componentImg/);
  assert.match(visualBoards, /arkflight-visual-socket-component/);
  assert.match(visualBoardsCss, /arkflight-visual-socket-component/);
  assert.match(armory, /weapon\?\.img \?\? weapon\?\.data\?\.art\?\.img/);
  assert.match(armory, /arkflight-mount-weapon-art/);
});


test("installed fitting and weapon art doubles in size on hover", () => {
  assert.match(workspaceCss, /arkflight-workspace-socket:hover[\s\S]*?arkflight-workspace-socket-component[\s\S]*?transform:\s*scale\(2\)/);
  assert.match(visualBoardsCss, /arkflight-visual-socket:hover[\s\S]*?arkflight-visual-socket-component[\s\S]*?transform:\s*scale\(2\)/);
  assert.match(armory, /arkflight-mount-weapon-art/);
});
