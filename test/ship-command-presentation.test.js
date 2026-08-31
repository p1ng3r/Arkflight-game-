import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const stationSource = fs.readFileSync(new URL("../src/ui/station-icon-ux.js", import.meta.url), "utf8");
const readinessCss = fs.readFileSync(new URL("../styles/unified-ship-state.css", import.meta.url), "utf8");

test("Battlewatch uses the existing Watchmaster station artwork", () => {
  assert.match(stationSource, /battlewatch/);
  assert.match(stationSource, /assetKey[^\n]*watchmaster|battlewatch[^\n]*watchmaster/s);
  assert.match(stationSource, /station_icon_\$\{assetKey\}\.webp/);
});

test("persistent Area rows own a stable two-column first-open layout", () => {
  assert.match(readinessCss, /arkflight-system-row\.arkflight-area-row/);
  assert.match(readinessCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s*!important/);
  assert.match(readinessCss, /arkflight-system-name[\s\S]*position:\s*static\s*!important/);
  assert.match(readinessCss, /arkflight-system-state[\s\S]*position:\s*static\s*!important/);
});
