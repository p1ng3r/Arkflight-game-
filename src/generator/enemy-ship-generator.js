import { SHIP_CATALOGS } from "../content/index.js";
import { createShip } from "../ship/ship-schema.js";
import { deriveShip, syncResourceMaxima } from "../ship/derive-ship.js";
import { validateShip } from "../ship/validate-ship.js";
import { ayerstoneShipDoctrine, combineDoctrine } from "./ayerstone-ship-doctrine.js";

const STATIONS = Object.freeze(["captain", "engineer", "navigator", "watchmaster", "veilwarden"]);
const BASE_OFFSETS = Object.freeze({ captain: 0, engineer: -1, navigator: -1, watchmaster: -2, veilwarden: -1 });
const SIZE_RANK = Object.freeze({ small: 1, medium: 2, large: 3 });

export const ENEMY_ARCHETYPES = Object.freeze({
  raider: { label: "Raider", priorityStation: "watchmaster", tags: ["fast", "assault", "boarding", "maneuvering"], weaponFamilies: ["harpoon", "cannon", "ballista"], roomTags: ["military", "containment"], modTags: ["boarding", "maneuvering", "detection"] },
  pirate: { label: "Pirate / Corsair", priorityStation: "captain", tags: ["fast", "boarding", "smuggler", "warship"], weaponFamilies: ["cannon", "harpoon", "ballista"], roomTags: ["military", "concealed", "social"], modTags: ["boarding", "cargo", "detection"] },
  patrol: { label: "Patrol", priorityStation: "watchmaster", tags: ["patrol", "durable", "detection"], weaponFamilies: ["ballista", "cannon"], roomTags: ["containment", "navigation", "military"], modTags: ["detection", "command", "structural"] },
  naval: { label: "Naval Warship", priorityStation: "watchmaster", tags: ["warship", "escort", "military"], weaponFamilies: ["cannon", "lance", "ballista"], roomTags: ["military", "repair"], modTags: ["structural", "command", "lifeveil"] },
  merchant: { label: "Merchant", priorityStation: "engineer", tags: ["merchant", "heavy-cargo", "logistics"], weaponFamilies: ["ballista", "cannon"], roomTags: ["cargo", "luxury", "social"], modTags: ["cargo", "logistics", "structural"] },
  smuggler: { label: "Smuggler", priorityStation: "navigator", tags: ["fast", "smuggler", "courier", "concealed"], weaponFamilies: ["ballista", "harpoon"], roomTags: ["concealed", "cargo", "navigation"], modTags: ["maneuvering", "cargo", "detection"] },
  explorer: { label: "Explorer", priorityStation: "navigator", tags: ["scout", "long-range", "explorer-class", "deep-void"], weaponFamilies: ["ballista", "harpoon"], roomTags: ["navigation", "research", "recovery"], modTags: ["detection", "deep-void", "survival"] },
  salvager: { label: "Salvager", priorityStation: "engineer", tags: ["salvage", "logistics", "industrial"], weaponFamilies: ["harpoon", "ballista"], roomTags: ["salvage", "repair", "industrial"], modTags: ["salvage", "docking", "repair"] },
  bountyHunter: { label: "Bounty Hunter", priorityStation: "watchmaster", tags: ["hunter-killer", "fast", "containment"], weaponFamilies: ["harpoon", "cannon", "lance"], roomTags: ["containment", "military", "navigation"], modTags: ["detection", "boarding", "maneuvering"] },
  occult: { label: "Cult / Occult Vessel", priorityStation: "veilwarden", tags: ["occult", "ritual", "lifeveil"], weaponFamilies: ["lance", "ballista"], roomTags: ["occult", "ritual", "research"], modTags: ["occult", "lifeveil", "deepVoid"] }
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function tierForLevel(level) { return clamp(Math.ceil(clamp(Number(level) || 1, 1, 20) / 4), 1, 5); }
function randomInt(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function intersects(values = [], tags = []) { return tags.some((tag) => values.includes(tag)); }
function componentTags(component) { return [...(component?.tags ?? []), ...(component?.traits ?? [])]; }
function sizeFits(size, maxSize) { return (SIZE_RANK[size] ?? 99) <= (SIZE_RANK[maxSize] ?? 0); }

function seededRng(seed = Date.now()) {
  let state = 2166136261;
  for (const char of String(seed)) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizedConfig(config = {}) {
  const level = clamp(Math.round(Number(config.level) || 1), 1, 20);
  const archetypeId = ENEMY_ARCHETYPES[config.archetypeId] ? config.archetypeId : "raider";
  return {
    level,
    archetypeId,
    difficulty: ["poor", "standard", "elite"].includes(config.difficulty) ? config.difficulty : "standard",
    faction: String(config.faction ?? "Independent").trim() || "Independent",
    theme: String(config.theme ?? "").trim(),
    lootProfile: ["poor", "standard", "rich", "treasure"].includes(config.lootProfile) ? config.lootProfile : "standard",
    seed: config.seed ?? `${archetypeId}:${level}:${Date.now()}`
  };
}

function softTier(rng, level) {
  const base = tierForLevel(level);
  const roll = rng();
  const delta = roll < 0.2 ? -1 : roll > 0.82 ? 1 : 0;
  return clamp(base + delta, 1, 5);
}

function scoreComponent(component, archetype, targetTier) {
  const tier = Number(component?.data?.tier ?? 1);
  let score = 5 - Math.min(4, Math.abs(tier - targetTier));
  if (intersects(componentTags(component), archetype.tags)) score += 4;
  return score;
}

function weightedChoice(rng, rows, scoreFn) {
  if (!rows.length) return null;
  const weighted = rows.map((row) => ({ row, weight: Math.max(1, scoreFn(row)) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of weighted) { roll -= item.weight; if (roll <= 0) return item.row; }
  return weighted.at(-1).row;
}

function pickHull(rng, level, archetype) {
  const targetTier = softTier(rng, level);
  const rows = Object.values(SHIP_CATALOGS.hulls).filter((hull) => !hull.data?.districtScale && Math.abs(Number(hull.data?.tier ?? 1) - targetTier) <= 1);
  return weightedChoice(rng, rows, (hull) => scoreComponent(hull, archetype, targetTier));
}

function pickEngine(rng, hull, archetype) {
  const allowed = (hull?.data?.allowedArkengines ?? []).map((id) => SHIP_CATALOGS.arkengines[id]).filter(Boolean);
  const targetTier = Number(hull?.data?.tier ?? 1);
  return weightedChoice(rng, allowed, (engine) => scoreComponent(engine, archetype, targetTier));
}

function pickExpansionRooms(rng, hull, archetype) {
  const capacity = Number(hull?.data?.baseStats?.roomCapacity ?? 0);
  if (!Number.isFinite(capacity) || capacity <= 0) return [];
  const candidates = Object.values(SHIP_CATALOGS.rooms).filter((room) => Number(room.capacityCost ?? 0) > 0);
  const selected = [];
  let used = 0;
  while (used < capacity && candidates.length) {
    const room = weightedChoice(rng, candidates.filter((candidate) => !selected.includes(candidate.id)), (candidate) => {
      let score = 2;
      if (intersects(componentTags(candidate), archetype.roomTags)) score += 5;
      if (Number(candidate.data?.tier ?? 1) <= Number(hull.data?.tier ?? 1) + 1) score += 2;
      return score;
    });
    if (!room) break;
    if (used + Number(room.capacityCost ?? 0) > capacity) break;
    selected.push(room.id);
    used += Number(room.capacityCost ?? 0);
    if (rng() < 0.28) break;
  }
  return selected;
}

function pickShipMods(rng, hull, archetype) {
  const capacity = Number(hull?.data?.baseStats?.shipModCapacity ?? 0);
  if (!Number.isFinite(capacity) || capacity <= 0) return [];
  const candidates = Object.values(SHIP_CATALOGS.shipMods).filter((mod) => Number(mod.data?.tier ?? 1) <= Number(hull.data?.tier ?? 1) + 1);
  const selected = [];
  while (selected.length < capacity && candidates.length) {
    const mod = weightedChoice(rng, candidates.filter((candidate) => !selected.includes(candidate.id)), (candidate) => 2 + (intersects(componentTags(candidate), archetype.modTags) ? 5 : 0));
    if (!mod) break;
    selected.push(mod.id);
    if (rng() < 0.22) break;
  }
  return selected;
}

function weaponSlots(hull) {
  const slots = [];
  for (const [arc, mount] of Object.entries(hull?.data?.baseStats?.weaponMounts ?? {})) {
    for (let i = 0; i < Number(mount?.count ?? 0); i += 1) slots.push({ arc, maxSize: mount?.maxSize ?? "small" });
  }
  return slots;
}

function pickWeapons(rng, hull, archetype, difficulty) {
  const fullness = difficulty === "poor" ? 0.45 : difficulty === "elite" ? 1 : 0.72;
  const installs = [];
  for (const slot of weaponSlots(hull)) {
    if (rng() > fullness) continue;
    const candidates = Object.values(SHIP_CATALOGS.weapons).filter((weapon) => {
      const arcs = weapon.data?.arcs ?? [];
      return sizeFits(weapon.data?.size ?? "small", slot.maxSize) && (!arcs.length || arcs.includes(slot.arc));
    });
    const weapon = weightedChoice(rng, candidates, (candidate) => 2 + (archetype.weaponFamilies.includes(candidate.data?.family) ? 6 : 0));
    if (weapon) installs.push({ id: weapon.id, arc: slot.arc });
  }
  return installs;
}

function officerLevels(level, archetype) {
  return Object.fromEntries(STATIONS.map((station) => {
    let offset = BASE_OFFSETS[station];
    if (station === archetype.priorityStation && station !== "captain") offset = 0;
    return [station, clamp(level + offset, 1, 20)];
  }));
}

function officerDrafts(config, archetype) {
  const levels = officerLevels(config.level, archetype);
  return STATIONS.map((station) => ({ station, level: levels[station], role: station, name: null, actorData: null, generationState: "pf2e-benchmark-pending" }));
}

function ordinaryCrew(derived, difficulty) {
  const minimum = Number(derived.stats?.crew?.minimum ?? 0);
  const recommended = Number(derived.stats?.crew?.recommended ?? minimum);
  const ratio = difficulty === "poor" ? 0.65 : difficulty === "elite" ? 1.05 : 0.85;
  return clamp(Math.round(minimum + (recommended - minimum) * ratio), minimum, Number(derived.stats?.crew?.maximum ?? recommended));
}

function cargoPreview(rng, derived, archetype, config) {
  const capacity = Number(derived.stats?.cargoCapacity ?? 0);
  const fill = config.lootProfile === "poor" ? 0.2 : config.lootProfile === "rich" ? 0.62 : config.lootProfile === "treasure" ? 0.82 : 0.42;
  return { used: clamp(Math.round(capacity * (fill + (rng() - 0.5) * 0.12)), 0, capacity), capacity, notes: `${archetype.label} cargo manifest preview` };
}

function lootPreview(config, archetype) {
  return { profile: config.lootProfile, personal: [], shipCargo: [], salvage: [], pf2eBudget: null, state: "budget-rules-pending", note: `${archetype.label} loot sections reserved; PF2e treasure-by-level budget will be applied before Commit is enabled.` };
}

export function generateEnemyShipPreview(input = {}) {
  const config = normalizedConfig(input);
  const rng = seededRng(config.seed);
  const baseArchetype = ENEMY_ARCHETYPES[config.archetypeId];
  const doctrine = ayerstoneShipDoctrine(config.faction);
  const archetype = combineDoctrine(baseArchetype, doctrine);
  const hull = pickHull(rng, config.level, archetype);
  if (!hull) throw new Error("No legal Arkflight hull is available for this generator configuration.");
  const engine = pickEngine(rng, hull, archetype);
  if (!engine) throw new Error(`${hull.name} has no compatible Arkengine available.`);

  let ship = createShip({
    level: config.level,
    identity: { name: `${baseArchetype.label} Vessel`, owner: config.faction, notes: config.theme },
    traits: [...new Set(["generated-enemy", config.archetypeId, ...archetype.tags])],
    hull: { chassisId: hull.id, patternId: "standard" },
    arkengine: { chassisId: engine.id, patternId: "standard", modIds: [] },
    rooms: [...(hull.data?.coreRooms ?? []), ...pickExpansionRooms(rng, hull, archetype)],
    shipMods: pickShipMods(rng, hull, archetype),
    weapons: pickWeapons(rng, hull, archetype, config.difficulty),
    cargo: { used: 0, notes: "" },
    resources: { supplies: { value: randomInt(rng, 2, 8), max: 10 }, morale: { value: config.difficulty === "elite" ? 5 : config.difficulty === "poor" ? 2 : 3, max: 5 } }
  });

  let derived = deriveShip(ship, SHIP_CATALOGS);
  const cargo = cargoPreview(rng, derived, baseArchetype, config);
  ship = { ...ship, cargo: { used: cargo.used, notes: cargo.notes } };
  ship = syncResourceMaxima(ship, derived);
  derived = deriveShip(ship, SHIP_CATALOGS);
  const validation = validateShip(ship, SHIP_CATALOGS);

  return Object.freeze({
    version: 2,
    config: Object.freeze(config),
    archetype: Object.freeze({ id: config.archetypeId, label: baseArchetype.label }),
    doctrine: Object.freeze({ source: doctrine.source, preferredArchetypes: doctrine.preferredArchetypes ?? [], shipTags: doctrine.shipTags ?? [] }),
    ship: Object.freeze(ship),
    derived,
    validation,
    crew: Object.freeze({ officers: Object.freeze(officerDrafts(config, archetype)), ordinaryCrew: ordinaryCrew(derived, config.difficulty), minimum: derived.stats?.crew?.minimum ?? 0, recommended: derived.stats?.crew?.recommended ?? 0, maximum: derived.stats?.crew?.maximum ?? 0 }),
    cargo: Object.freeze(cargo),
    loot: Object.freeze(lootPreview(config, baseArchetype)),
    canCommit: false,
    blockers: Object.freeze([...(validation.ok ? [] : validation.errors), "PF2e officer benchmark generation is not implemented yet.", "PF2e treasure-by-level budgeting is not implemented yet."])
  });
}
