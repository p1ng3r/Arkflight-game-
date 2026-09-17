
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "module.json"), "utf8")
);
const packageSource = fs.readFileSync(
  path.join(root, "scripts", "package.js"),
  "utf8"
);

if (!manifest.id) fail("module.json requires id");
if (!manifest.version) fail("module.json requires version");

if (!manifest.relationships?.requires?.some((row) => row.id === "arkflight-game")) {
  fail("module.json must require arkflight-game");
}

if (!manifest.relationships?.systems?.some((row) => row.id === "pf2e")) {
  fail("module.json must require pf2e");
}

if (!packageSource.includes("registerPackage")) {
  fail("scripts/package.js must register with Event Manager 2.0");
}

if (!packageSource.includes("resetProgress")) {
  fail("starter runtime should expose package reset support");
}

if (!process.exitCode) {
  console.log("PASS: Arkflight content pack starter validation");
}
