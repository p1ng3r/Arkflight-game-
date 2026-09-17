import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const journalSource = readFileSync(new URL("../src/foundry/combat-reference-compendium.js", import.meta.url), "utf8");
const linkSource = readFileSync(new URL("../src/ui/arkflight-command-hud-journal-links.js", import.meta.url), "utf8");
const economySource = readFileSync(new URL("../src/combat/station-action-economy.js", import.meta.url), "utf8");
const hudSource = readFileSync(new URL("../src/ui/arkflight-command-hud-ui.js", import.meta.url), "utf8");
const journalCss = readFileSync(new URL("../styles/arkflight-command-hud-journal.css", import.meta.url), "utf8");

test("Arkflight registers managed combat reference journals and HUD journal links", () => {
  assert.ok(moduleJson.esmodules.includes("src/foundry/combat-reference-compendium.js"));
  assert.ok(moduleJson.esmodules.includes("src/ui/arkflight-command-hud-journal-links.js"));
  assert.ok(moduleJson.styles.includes("styles/arkflight-command-hud-journal.css"));
  assert.match(journalSource, /arkflight-combat-reference/);
  assert.match(journalSource, /COMBAT_ACTIONS/);
  assert.match(journalSource, /combatActionId/);
  assert.match(journalSource, /openAction/);
});

test("Combat Reference defines Station Bonus and the expanded resource economy", () => {
  assert.match(economySource, /Station Bonus is the ship-level scaling value/);
  assert.match(economySource, /levels 1–9/);
  assert.match(economySource, /levels 10–19/);
  assert.match(economySource, /level 20/);
  assert.match(journalSource, /Arkflight Combat — Fundamentals/);
  assert.match(journalSource, /Combat Resources/);
  assert.match(journalSource, /Strain Limit/);
  assert.match(journalSource, /Sound → Battered → Breached → Shattered/);
  assert.match(journalSource, /Responsive → Sluggish → Faltering → Unresponsive/);
  assert.match(journalSource, /Ready → Fouled → Malfunctioning → Barely Operable/);
});

test("Drive the Crew HUD copy shows the net player-facing result and Morale cost", () => {
  assert.match(hudSource, /Gain 1 AP this turn\. Spend 20% Morale/);
  assert.match(hudSource, /Station Bonus \+\$\{profile\.bonus\}/);
  assert.match(economySource, /"captain-drive-the-crew": Object\.freeze\(\{ morale: 20 \}\)/);
});

test("HUD exposes Supplies Lifeveil Morale and Strain costs clearly", () => {
  assert.match(hudSource, /tone: "morale"/);
  assert.match(hudSource, /tone: "supply"/);
  assert.match(hudSource, /tone: "lifeveil"/);
  assert.match(hudSource, /tone: "strain"/);
  assert.match(economySource, /"engineer-emergency-repair": Object\.freeze\(\{ supplies: 2 \}\)/);
  assert.match(economySource, /"veilwarden-focus-ward": Object\.freeze\(\{ lifeveil: 10 \}\)/);
});

test("Combat Reference uses the Arkflight parchment codex layout and scroll frame", () => {
  assert.match(journalSource, /afcr-codex/);
  assert.match(journalSource, /afcr-masthead/);
  assert.match(journalSource, /Quick Effect/);
  assert.match(journalSource, /At a Glance/);
  assert.match(journalSource, /arkflight-codex-v3/);
  assert.match(journalCss, /steampunk_winged_gear_parchment_frame\.webp/);
  assert.match(journalCss, /afcr-art-frame/);
  assert.match(journalCss, /afcr-meta-grid/);
  assert.match(journalCss, /afcr-resource-grid/);
  assert.match(journalCss, /aspect-ratio:\s*3 \/ 2/);
  assert.match(journalCss, /overflow-y:\s*auto/);
  assert.match(journalCss, /:has\(\.arkflight-combat-reference\.afcr-codex\)/);
  assert.match(journalCss, /background:\s*#d8c294/);
  assert.doesNotMatch(journalCss, /\.journal-entry-page:has\(\.arkflight-combat-reference\.afcr-codex\) \{\s*background:\s*transparent/);
  assert.match(journalCss, /font-size:\s*13\.5px/);
  assert.match(journalCss, /font-size:\s*15\.5px !important/);
  assert.match(journalCss, /font-size:\s*17px/);
});

test("each combat action can open its exact JournalEntryPage without replacing economy chips", () => {
  assert.match(journalSource, /entry\.flags\?\.\[FLAG_SCOPE\]\?\.combatActionId === actionId/);
  assert.match(linkSource, /combatReference\?\.openAction/);
  assert.match(linkSource, /Full Rules/);
  assert.doesNotMatch(linkSource, /replaceDriveCrewPresentation/);
});


test("Combat Reference includes Common Reload separately from Battlewatch Work the Guns", () => {
  assert.match(journalSource, /"common", "captain", "battlewatch"/);
  assert.match(journalSource, /Arkflight Combat — Common Actions/);
  assert.match(journalSource, /Common Ship Action/);
  assert.match(economySource, /"common-reload-weapon"/);
  assert.match(economySource, /"battlewatch-reload-weapon": Object\.freeze\(\{ morale: 20 \}\)/);
  assert.match(economySource, /2 or fewer rounds of Reload remaining/);
});
