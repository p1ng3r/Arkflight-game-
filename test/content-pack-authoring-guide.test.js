
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const guide = fs.readFileSync(
  new URL("../docs/CONTENT-PACK-AUTHORING-GUIDE.md", import.meta.url),
  "utf8"
);
const checklist = fs.readFileSync(
  new URL("../docs/CONTENT-PACK-RELEASE-CHECKLIST.md", import.meta.url),
  "utf8"
);
const starter = fs.readFileSync(
  new URL("../examples/content-pack-starter/scripts/package.js", import.meta.url),
  "utf8"
);
const manifest = JSON.parse(
  fs.readFileSync(
    new URL("../examples/content-pack-starter/module.json", import.meta.url),
    "utf8"
  )
);

test("content pack authoring guide documents the supported Event Manager architecture", () => {
  assert.match(guide, /Core provides systems\. Content packs provide authored play/);
  assert.match(guide, /runtime\.launch is package-level/);
  assert.match(guide, /does \*\*not yet synchronize Scene documents\*\*/);
  assert.match(guide, /game\.arkflight\.content\.resetProgress/);
  assert.match(guide, /Definition of Done/);
});

test("content pack release checklist covers migration, optional modules, and validation", () => {
  assert.match(checklist, /Legacy migration targets only documents owned by this package/);
  assert.match(checklist, /optional modules disabled/);
  assert.match(checklist, /Core CI/);
});

test("starter pack requires Arkflight and PF2e and registers through Event Manager 2.0", () => {
  assert.equal(manifest.id, "arkflight-example-adventure");
  assert.ok(manifest.relationships.requires.some((row) => row.id === "arkflight-game"));
  assert.ok(manifest.relationships.systems.some((row) => row.id === "pf2e"));
  assert.match(starter, /content\.registerPackage/);
  assert.match(starter, /content\.sync/);
  assert.match(starter, /content\.resetProgress/);
});
