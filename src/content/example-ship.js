import { createShip } from "../ship/ship-schema.js";
import { deriveShip, syncResourceMaxima } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "./ship-catalogs.js";

export function buildExampleBrigantine() {
  const ship = createShip({
    identity: {
      name: "Wayfarer",
      registry: "ARK-001",
      callsign: "Wayfarer",
      origin: "Ayerstone",
      motto: "Through the dark, together."
    },
    traits: ["adventuring-vessel"],
    hull: { chassisId: "brigantine", patternId: "explorer" },
    arkengine: {
      chassisId: "tidewake-arkengine",
      patternId: "longhaul",
      modIds: ["stormwake-injector", "veil-projector-focusing"]
    },
    rooms: ["workshop", "observatory", "chart-room", "infirmary"],
    shipMods: ["stabilized-helm-relays", "lookout-spire"],
    weapons: [
      { id: "deck-ballista", arc: "fore" },
      { id: "grapnel-harpoon", arc: "port" }
    ],
    crew: {
      specialists: ["veteran-chief-engineer", "old-star-cartographer"]
    },
    resources: {
      supplies: { value: 8, max: 10 },
      morale: { value: 3, max: 5 }
    }
  });

  const derived = deriveShip(ship, SHIP_CATALOGS);
  return Object.freeze({ ship: syncResourceMaxima(ship, derived), derived });
}
