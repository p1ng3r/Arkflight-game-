import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/ui/ship-portrait-ui.js", import.meta.url), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("../module.json", import.meta.url), "utf8"));

test("vessel portrait editor is loaded", () => {
  assert.ok(manifest.esmodules.includes("src/ui/ship-portrait-ui.js"));
  assert.ok(manifest.styles.includes("styles/ship-portrait.css"));
});

test("portrait editor updates actor img through the Foundry image picker and never prototype token art", () => {
  assert.match(source, /FilePicker/);
  assert.match(source, /current: actor\.img/);
  assert.match(source, /actor\.update\(\{ img: path \}\)/);
  assert.doesNotMatch(source, /prototypeToken/);
  assert.doesNotMatch(source, /texture\.src/);
});
