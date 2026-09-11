import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspace = readFileSync(new URL("../src/ui/shipwright-workspace-ui.js", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/ship/shipwright-workspace.hbs", import.meta.url), "utf8");
const workspaceCss = readFileSync(new URL("../styles/shipwright-workspace.css", import.meta.url), "utf8");
const visualBoards = readFileSync(new URL("../src/ui/ship-sheet-visual-boards-ui.js", import.meta.url), "utf8");
const visualBoardsCss = readFileSync(new URL("../styles/ship-sheet-visual-boards.css", import.meta.url), "utf8");
const armory = readFileSync(new URL("../src/ui/armory-ux.js", import.meta.url), "utf8");
const armoryCss = readFileSync(new URL("../styles/armory-ux.css", import.meta.url), "utf8");
const bayCss = readFileSync(new URL("../styles/shipwright-bay.css", import.meta.url), "utf8");

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


test("installed fitting and weapon art triples in size on hover", () => {
  assert.match(workspaceCss, /arkflight-workspace-socket:hover[\s\S]*?arkflight-workspace-socket-component[\s\S]*?transform:\s*scale\(3\)/);
  assert.match(visualBoardsCss, /arkflight-visual-socket:hover[\s\S]*?arkflight-visual-socket-component[\s\S]*?transform:\s*scale\(3\)/);
  assert.match(bayCss, /arkflight-bay-socket:hover[\s\S]*?arkflight-bay-installed-component[\s\S]*?transform:\s*scale\(3\)/);
  assert.match(armoryCss, /arkflight-mount-slot\.has-weapon-art:hover[\s\S]*?arkflight-mount-weapon-art[\s\S]*?scale\(3\)/);
});


test("installed sockets expose effects and right-click uninstall confirmation", () => {
  assert.match(workspace, /componentBonusLines/);
  assert.match(template, /Effects \/ Bonuses/);
  assert.match(template, /Right-click to uninstall/);
  assert.match(workspace, /addEventListener\("contextmenu"/);
  assert.match(workspace, /uninstallDialog\(this\.actor, this\.group, row\)/);
  assert.match(workspace, /Uninstall \$\{escape\(item\.name\)\}\?/);
  assert.match(workspace, /queueRemove/);
});

test("right-hand owned fittings list explicit bonuses and effects", () => {
  assert.match(workspace, /effectSummary: componentEffectSummary/);
  assert.match(workspace, /bonusLines: componentBonusLines/);
  assert.match(template, /arkflight-fitting-bonus-label/);
  assert.match(template, /item\.bonusLines/);
});


test("installed fitting effect card stays hidden until its socket is hovered", () => {
  assert.match(workspaceCss, /\.arkflight-workspace-socket \.arkflight-workspace-socket-effect \{[\s\S]*?display:\s*none/);
  assert.match(workspaceCss, /\.arkflight-workspace-socket:hover \.arkflight-workspace-socket-effect \{[\s\S]*?display:\s*block/);
});


test("Owned Fittings tray shows the catalog artwork beside each physical fitting", () => {
  assert.match(workspace, /img: item\?\.img \?\? item\?\.data\?\.art\?\.img/);
  assert.match(template, /arkflight-owned-fitting-art/);
  assert.match(template, /item\.img/);
  assert.match(template, /arkflight-owned-fitting-count/);
  assert.match(workspaceCss, /arkflight-workspace-inventory-list article\.has-fitting-art/);
  assert.match(workspaceCss, /arkflight-owned-fitting-art/);
});


test("Shipwright exposes the complete blueprint to physical fitting lifecycle", () => {
  assert.match(workspace, /function blueprintRows/);
  assert.match(workspace, /blueprintCount/);
  assert.match(template, /Known Blueprints/);
  assert.match(template, /Fabricate a physical fitting from Repairs &amp; Fabrication/);
  assert.match(template, /Drag a managed compendium entry onto the vessel and choose Blueprint/);
  assert.match(template, /Physical fitting aboard/);
  assert.match(template, /Install in Selected Socket/);
  assert.match(template, /Right-click to uninstall/);
});

test("Shipwright selected sockets and hover cards stay visually readable near board edges", () => {
  assert.match(workspaceCss, /arkflight-workspace-socket\.is-selected/);
  assert.match(workspaceCss, /arkflight-workspace-socket\.is-label-above \.arkflight-workspace-socket-effect/);
  assert.match(workspaceCss, /bottom:\s*calc\(100% \+ 34px\)/);
  assert.match(workspaceCss, /arkflight-workspace-blueprint-list/);
});


test("Shipwright fitting boards remain fully reachable with vertical scrolling", () => {
  assert.match(workspaceCss, /arkflight-shipwright-workspace \.window-content[\s\S]*?overflow-y:\s*auto/);
  assert.match(workspaceCss, /scrollbar-gutter:\s*stable/);
  assert.match(workspaceCss, /arkflight-workspace-inventory-list[\s\S]*?overflow-y:\s*auto/);
  assert.match(workspaceCss, /arkflight-workspace-work-list[\s\S]*?overflow-y:\s*auto/);
  assert.match(workspaceCss, /arkflight-workspace-board-layout[\s\S]*?padding-bottom:\s*16px/);
});


test("Shipwright category windows show an explicit vertical scrollbar", () => {
  assert.match(workspaceCss, /arkflight-workspace-board-layout[\s\S]*?overflow-y:\s*scroll/);
  assert.match(workspaceCss, /arkflight-workspace-board-layout[\s\S]*?max-height:\s*calc\(100vh - 235px\)/);
  assert.match(workspaceCss, /arkflight-workspace-board-layout::\-webkit-scrollbar[\s\S]*?width:\s*12px/);
  assert.match(workspaceCss, /arkflight-workspace-board-layout::\-webkit-scrollbar-thumb/);
});


test("Shipwright exposes specialized Explorer Expedition and Raider socket rules", () => {
  assert.match(workspace, /socketType/);
  assert.match(workspace, /shipModFitsSocketType/);
  assert.match(workspace, /raiderPursuitWeapon/);
  assert.match(template, /RAIDER — PURSUIT WEAPON INTEGRATION/);
  assert.match(template, /data-raider-pursuit-mount/);
  assert.match(template, /Shipyard to configure/);
});
