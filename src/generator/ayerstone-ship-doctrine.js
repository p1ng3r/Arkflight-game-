import { ayerstoneFaction } from "./ayerstone-setting-catalog.js";

const HOUSE_DOCTRINES = Object.freeze({
  "house starweaver": { shipTags:["merchant","long-range","routes","scout"], weaponFamilies:["ballista","harpoon"], roomTags:["navigation","luxury","cargo"], modTags:["detection","cargo","maneuvering"], preferredArchetypes:["merchant","explorer"] },
  "house aurelian": { shipTags:["command","flagship","patrol"], weaponFamilies:["cannon","ballista"], roomTags:["command","luxury","military"], modTags:["command","structural","lifeveil"], preferredArchetypes:["patrol","naval"] },
  "house ironmantle": { shipTags:["heavy-cargo","industrial","durable"], weaponFamilies:["cannon","harpoon"], roomTags:["industrial","cargo","repair"], modTags:["structural","cargo","salvage"], preferredArchetypes:["merchant","salvager"] },
  "house veyr": { shipTags:["merchant","luxury","logistics"], weaponFamilies:["ballista"], roomTags:["luxury","cargo","containment"], modTags:["cargo","command","detection"], preferredArchetypes:["merchant"] },
  "house blackwake": { shipTags:["privateer","escort","boarding","warship"], weaponFamilies:["cannon","harpoon","ballista"], roomTags:["military","containment","social"], modTags:["boarding","detection","structural"], preferredArchetypes:["pirate","naval","bountyHunter"] },
  "house stormglass": { shipTags:["experimental","engineering","shipyard"], weaponFamilies:["lance","cannon"], roomTags:["repair","industrial","research"], modTags:["structural","maneuvering","lifeveil"], preferredArchetypes:["explorer","naval"] },
  "house marruk": { shipTags:["security","escort","patrol","warship"], weaponFamilies:["cannon","ballista"], roomTags:["military","containment"], modTags:["command","structural","detection"], preferredArchetypes:["patrol","naval","bountyHunter"] },
  "house valecross": { shipTags:["lifeveil","support","sustainability"], weaponFamilies:["ballista"], roomTags:["survival","recovery","social"], modTags:["lifeveil","survival"], preferredArchetypes:["explorer","merchant"] },
  "house emberhall": { shipTags:["industrial","heavy","warship"], weaponFamilies:["cannon","lance"], roomTags:["industrial","repair","military"], modTags:["structural","powerDistribution"], preferredArchetypes:["salvager","naval"] },
  "house tidereach": { shipTags:["logistics","support","merchant"], weaponFamilies:["ballista","harpoon"], roomTags:["cargo","survival","social"], modTags:["cargo","logistics"], preferredArchetypes:["merchant","salvager"] }
});

const FACTION_DOCTRINES = Object.freeze({
  freespacers: { label:"Freespacers", shipTags:["frontier","courier","explorer","salvager"], weaponFamilies:["ballista","harpoon"], roomTags:["navigation","repair","social"], modTags:["maneuvering","detection","repair"], preferredArchetypes:["explorer","salvager","patrol"] },
  freebooters: { label:"Freebooters", shipTags:["escort","rescue","patrol"], weaponFamilies:["ballista","cannon"], roomTags:["recovery","military","navigation"], modTags:["detection","structural","command"], preferredArchetypes:["patrol","naval"] },
  brotherhoodCosmicFlame: { label:"Brotherhood of the Cosmic Flame", shipTags:["imperial","warship","boarding","dragon","flame"], weaponFamilies:["cannon","lance"], roomTags:["military","containment","ritual"], modTags:["boarding","structural","command"], preferredArchetypes:["naval","raider"] },
  grelkinCartel: { label:"Grelkin Cartel", shipTags:["raider","pirate","boarding","stolen-ship","salvage"], weaponFamilies:["harpoon","cannon","ballista"], roomTags:["salvage","military","concealed"], modTags:["boarding","salvage","structural"], preferredArchetypes:["raider","pirate","salvager"] },
  veilwardens: { label:"Veilwardens", shipTags:["containment","lifeveil","occult","patrol"], weaponFamilies:["lance","ballista"], roomTags:["occult","containment","ritual"], modTags:["lifeveil","occult","structural"], preferredArchetypes:["patrol","occult"] },
  underwake: { label:"Underwake Syndicates", shipTags:["smuggler","concealed","fast","black-market"], weaponFamilies:["harpoon","ballista"], roomTags:["concealed","cargo","navigation"], modTags:["maneuvering","cargo","detection"], preferredArchetypes:["smuggler","pirate"] },
  faithOfTheChurn: { label:"Faith of the Churn", shipTags:["pilgrim","ritual","occult"], weaponFamilies:["ballista","lance"], roomTags:["ritual","social","recovery"], modTags:["lifeveil","occult"], preferredArchetypes:["occult","explorer"] },
  councilOfTheVoid: { label:"Council of the Void", shipTags:["alien","deep-void","occult","mysterious"], weaponFamilies:["lance"], roomTags:["occult","research","containment"], modTags:["deepVoid","occult","lifeveil"], preferredArchetypes:["occult"] },
  starweaverSkyLines: { label:"Starweaver Sky Lines", shipTags:["merchant","passenger","routes","long-range"], weaponFamilies:["ballista"], roomTags:["luxury","cargo","navigation"], modTags:["cargo","detection","maneuvering"], preferredArchetypes:["merchant","explorer"] }
});

export function ayerstoneShipDoctrine(factionLabel) {
  const lower = String(factionLabel ?? "").trim().toLowerCase();
  const house = HOUSE_DOCTRINES[lower];
  if (house) return Object.freeze({ ...house, source: "Ayerstone Great House doctrine" });
  const faction = ayerstoneFaction(factionLabel);
  const doctrine = Object.values(FACTION_DOCTRINES).find((row) => row.label.toLowerCase() === faction.label.toLowerCase()) ?? null;
  return Object.freeze(doctrine ? { ...doctrine, source: faction.source } : { shipTags:[], weaponFamilies:[], roomTags:[], modTags:[], preferredArchetypes:[], source:faction.source });
}

export function combineDoctrine(archetype, doctrine) {
  return Object.freeze({
    ...archetype,
    tags: Object.freeze([...new Set([...(archetype.tags ?? []), ...(doctrine.shipTags ?? [])])]),
    weaponFamilies: Object.freeze([...new Set([...(doctrine.weaponFamilies ?? []), ...(archetype.weaponFamilies ?? [])])]),
    roomTags: Object.freeze([...new Set([...(doctrine.roomTags ?? []), ...(archetype.roomTags ?? [])])]),
    modTags: Object.freeze([...new Set([...(doctrine.modTags ?? []), ...(archetype.modTags ?? [])])])
  });
}

export const AYERSTONE_HOUSE_DOCTRINES = HOUSE_DOCTRINES;
export const AYERSTONE_FACTION_DOCTRINES = FACTION_DOCTRINES;
