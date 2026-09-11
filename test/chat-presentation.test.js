import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const effects = readFileSync(new URL("../src/foundry/native-station-combat-effects.js", import.meta.url), "utf8");
const flow = readFileSync(new URL("../src/foundry/combat-flow-usability.js", import.meta.url), "utf8");
const stations = readFileSync(new URL("../src/foundry/combat-station-actions-api.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles/arkflight-chat.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("successful ship attacks render one combined compact chat result", () => {
  assert.match(effects, /const compactFlavor/);
  assert.match(effects, /if \(damage\)[\s\S]*?await damage\.roll\.toMessage/);
  assert.match(effects, /else \{[\s\S]*?await attack\.toMessage/);
  assert.match(effects, /arkflight-chat-card arkflight-attack-chat/);
  assert.match(effects, /arkflight-chat-damage-final/);
});

test("prompted attack reactions resolve silently and summarize in the shot result", () => {
  assert.match(flow, /suppressChat: true, reactionContext: "ship-attack"/);
  assert.match(stations, /if \(!options\.suppressChat\) await postActionChat/);
  assert.match(effects, /Brace −\$\{damage\.braceAbsorbed\}/);
  assert.match(effects, /Ward −\$\{damage\.wardAbsorbed\}/);
});

test("damage controls are integrated into the compact shot card", () => {
  assert.match(effects, /querySelector\("\.arkflight-attack-chat"\)/);
  assert.match(effects, /Apply \$\{base\}/);
  assert.match(effects, /Half \$\{Math\.floor\(base \/ 2\)\}/);
  assert.match(effects, /Double \$\{base \* 2\}/);
  assert.doesNotMatch(effects, /controls\.style\.marginTop|controls\.style\.display|controls\.style\.flexWrap/);
});

test("compact Arkflight chat stylesheet is loaded", () => {
  assert.ok(manifest.styles.includes("styles/arkflight-chat.css"));
  assert.match(css, /arkflight-attack-chat/);
  assert.match(css, /arkflight-ship-damage-controls/);
  assert.match(css, /chat-message:has\(\.arkflight-attack-chat\)/);
});
