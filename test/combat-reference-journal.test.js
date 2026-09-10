import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleJson = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));
const journalSource = readFileSync(new URL("../src/foundry/combat-reference-compendium.js", import.meta.url), "utf8");
const linkSource = readFileSync(new URL("../src/ui/arkflight-command-hud-journal-links.js", import.meta.url), "utf8");

test("Arkflight registers managed combat reference journals and HUD journal links", () => {
  assert.ok(moduleJson.esmodules.includes("src/foundry/combat-reference-compendium.js"));
  assert.ok(moduleJson.esmodules.includes("src/ui/arkflight-command-hud-journal-links.js"));
  assert.ok(moduleJson.styles.includes("styles/arkflight-command-hud-journal.css"));
  assert.match(journalSource, /arkflight-combat-reference/);
  assert.match(journalSource, /COMBAT_ACTIONS/);
  assert.match(journalSource, /combatActionId/);
  assert.match(journalSource, /openAction/);
});

test("Drive the Crew HUD copy shows the net player-facing result", () => {
  assert.match(linkSource, /Gain 1 AP\. Gain \$\{strain\} Strain\. Once per round\./);
  assert.match(linkSource, /\["\+1 AP", "gain"\]/);
  assert.match(linkSource, /driveCrewStrain/);
});

test("each combat action can open its exact JournalEntryPage", () => {
  assert.match(journalSource, /entry\.flags\?\.\[FLAG_SCOPE\]\?\.combatActionId === actionId/);
  assert.match(linkSource, /combatReference\?\.openAction/);
  assert.match(linkSource, /Full Rules/);
});
