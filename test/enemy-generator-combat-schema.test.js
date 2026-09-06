import test from "node:test";
import assert from "node:assert/strict";

import { generateEnemyShipPreview } from "../src/generator/enemy-ship-generator.js";
import { generatePF2eOfficerActorDraft } from "../src/generator/pf2e-officer-actor-draft.js";
import { SHIP_CATALOGS } from "../src/content/index.js";

const STATIONS = ["captain", "engineer", "navigator", "battlewatch", "veilwarden"];

test("enemy generator emits canonical battlewatch officers and ship progression level", () => {
  const preview = generateEnemyShipPreview({
    level: 10,
    archetypeId: "raider",
    difficulty: "elite",
    faction: "Independent",
    lootProfile: "standard",
    seed: "combat-schema-regression"
  });

  assert.equal(preview.ship.progression.level, 10);
  assert.deepEqual(preview.crew.officers.map((officer) => officer.station), STATIONS);
  assert.equal(preview.crew.officers.some((officer) => officer.station === "watchmaster"), false);
});

test("generated weapon installs use explicit legal hull mount indexes", () => {
  const preview = generateEnemyShipPreview({
    level: 10,
    archetypeId: "naval",
    difficulty: "elite",
    faction: "Independent",
    lootProfile: "standard",
    seed: "weapon-mount-regression"
  });
  const hull = SHIP_CATALOGS.hulls[preview.ship.hull.chassisId];

  assert.ok(preview.ship.weapons.length > 0, "elite generated vessel should install at least one weapon");
  for (const install of preview.ship.weapons) {
    const mount = hull.data.baseStats.weaponMounts[install.arc];
    const weapon = SHIP_CATALOGS.weapons[install.id];
    assert.ok(mount, `${install.id} uses a real hull mount`);
    assert.ok(Number.isInteger(install.mountIndex), `${install.id} has an integer mountIndex`);
    assert.ok(install.mountIndex >= 0 && install.mountIndex < mount.count, `${install.id} mountIndex is in range`);
    assert.ok(weapon.data.allowedMounts.includes(install.arc), `${install.id} is legal on ${install.arc}`);
  }
});

test("PF2e officer draft accepts canonical battlewatch and preserves it on generated actor flags", () => {
  const officer = generatePF2eOfficerActorDraft({
    station: "battlewatch",
    level: 8,
    quality: "standard",
    faction: "Independent",
    seed: "battlewatch-regression"
  });

  assert.equal(officer.station, "battlewatch");
  assert.equal(officer.role, "Battlewatch");
  assert.equal(officer.actorData.flags["arkflight-game"].station, "battlewatch");
});