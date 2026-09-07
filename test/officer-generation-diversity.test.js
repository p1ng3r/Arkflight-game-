import test from "node:test";
import assert from "node:assert/strict";

import { generatePF2eOfficerActorDraft } from "../src/generator/pf2e-officer-actor-draft.js";

const STATIONS = ["captain", "engineer", "navigator", "battlewatch", "veilwarden"];

function roster(seed="officer-diversity") {
  return STATIONS.map((station, rosterIndex) => generatePF2eOfficerActorDraft({
    station,
    level:6,
    quality:"standard",
    faction:"Independent",
    seed:`${seed}:${station}`,
    rosterSeed:seed,
    rosterIndex
  }));
}

test("generated five-officer roster does not reuse names or class profiles", () => {
  const officers = roster();
  assert.equal(new Set(officers.map((officer) => officer.name)).size, 5);
  assert.equal(new Set(officers.map((officer) => officer.name.split(" ")[0])).size, 5);
  assert.equal(new Set(officers.map((officer) => officer.combatArchetype.classFamily)).size, 5);
});

test("generated officers contain a visible profile, multiple strikes, and station abilities", () => {
  for (const officer of roster("stat-blocks")) {
    const items = officer.actorData.items;
    assert.ok(items.some((item) => item.flags?.["arkflight-game"]?.generatedOfficerProfile), `${officer.station} has a profile block`);
    assert.ok(items.filter((item) => item.type === "melee").length >= 2, `${officer.station} has at least two NPC strikes`);
    assert.ok(items.filter((item) => item.type === "action").length >= 2, `${officer.station} has active/passive abilities`);
    assert.ok(Object.keys(officer.actorData.system.skills).length >= 3, `${officer.station} has a useful skill block`);
    assert.equal(officer.actorData.flags["arkflight-game"].station, officer.station);
  }
});

test("generated roster always includes real spellcasting intent and caps level 6 casters at rank 3", () => {
  const officers = roster("spellcasting");
  const casters = officers.filter((officer) => officer.spellcastingIntent);
  assert.ok(casters.length >= 1, "roster includes at least one caster");
  assert.ok(casters.some((officer) => officer.station === "veilwarden"), "Veilwarden is always a caster profile");
  for (const officer of casters) {
    assert.equal(officer.spellcastingIntent.maxRank, 3);
    assert.ok(officer.spellcastingIntent.candidateSlugs.length >= 4);
  }
});