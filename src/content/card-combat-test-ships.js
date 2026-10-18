import { createShip, STATION_KEYS } from "../ship/ship-schema.js";
import { deriveShip, syncResourceMaxima } from "../ship/derive-ship.js";
import { validateShip } from "../ship/validate-ship.js";
import { generateShipCardDecks } from "../cards/card-library.js";
import { SHIP_CATALOGS } from "./ship-catalogs.js";
import { PLAYTEST_COMBAT_CARDS } from "./combat-cards-playtest.js";

// Opt-in test content, independent of campaign vessels and benchmark scripts.
export const CARD_COMBAT_TEST_SHIPS = Object.freeze([
  { id: "wayfarer", name: "[Test] Wayfarer", role: "Balanced brigantine", team: "A", hull: "brigantine", hullPattern: "standard", engine: "tidewake-arkengine", enginePattern: "standard" },
  { id: "swiftwake", name: "[Test] Swiftwake", role: "Racing brigantine", team: "A", hull: "brigantine", hullPattern: "racing", engine: "tidewake-arkengine", enginePattern: "standard" },
  { id: "ironspear", name: "[Test] IronSpear", role: "Standard frigate", team: "B", hull: "frigate", hullPattern: "standard", engine: "iron-choir-engine", enginePattern: "standard" },
  { id: "resolute", name: "[Test] Resolute", role: "Battle frigate", team: "B", hull: "frigate", hullPattern: "battle", engine: "iron-choir-engine", enginePattern: "military" }
].map(Object.freeze));

function weaponsFor(hull) {
  const heavy = hull === "frigate";
  return [
    [heavy ? "heavy-scorpion" : "deck-culverin", "fore", 0],
    ...["port", "starboard"].flatMap(arc => [0, 1].map(index => [heavy ? "broadside-cannon-battery" : "light-broadside-cannon", arc, index])),
    ["light-deck-culverin", "aft", 0]
  ].map(([id, arc, mountIndex]) => ({ id, arc, mount: arc, mountIndex, instanceId: `test:${id}:${arc}:${mountIndex}`, upgrades: { potency: 0, impact: 0, properties: [] } }));
}

export function buildCardCombatTestFleet({ rng = Math.random } = {}) {
  return CARD_COMBAT_TEST_SHIPS.map(spec => {
    let ship = createShip({
      identity: { name: spec.name, registry: `TEST-${spec.id.toUpperCase()}`, notes: `${spec.role}. Card Combat test vessel; GM may operate all stations. Assign player crew before multiplayer testing.` },
      hull: { chassisId: spec.hull, patternId: spec.hullPattern },
      arkengine: { chassisId: spec.engine, patternId: spec.enginePattern },
      progression: { level: 5 },
      weapons: weaponsFor(spec.hull),
      resources: { morale: { value: 100, max: 100 } }
    });
    const derived = deriveShip(ship, SHIP_CATALOGS);
    ship.resources.hull.value = derived.stats.hullIntegrity;
    ship = syncResourceMaxima(ship, derived);
    ship.resources.supplies.value = ship.resources.supplies.max;
    const validation = validateShip(ship, SHIP_CATALOGS);
    if (!validation.ok) throw new Error(`Invalid test vessel ${spec.name}: ${validation.errors.join("; ")}`);
    ship = generateShipCardDecks(ship, PLAYTEST_COMBAT_CARDS, { stationIds: STATION_KEYS, isEligible: () => true, rng });
    return { ...spec, ship };
  });
}
