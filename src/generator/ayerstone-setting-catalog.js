const COMMON_ANCESTRIES = Object.freeze(["Human","Dwarf","Elf","Goblin","Halfling","Orc","Gnome","Hobgoblin","Kobold","Leshy"]);

export const AYERSTONE_FACTIONS = Object.freeze({
  independent: Object.freeze({
    label: "Independent",
    source: "Ayerstone neutral / unaffiliated",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "mixed free-captain crew",
    shipTags: []
  }),
  freespacers: Object.freeze({
    label: "Freespacers",
    source: "Ayerstone Setting Guide — Freespacers",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "independent, responsible, hospitable, protective of free harbors",
    shipTags: ["free-captain","frontier","courier","explorer","salvager"]
  }),
  freebooters: Object.freeze({
    label: "Freebooters",
    source: "Ayerstone Setting Guide — Freespacers / Dock 44",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "volunteer naval crew, mutual-aid minded, anti-tyranny",
    shipTags: ["patrol","escort","rescue","freebooter"]
  }),
  brotherhoodCosmicFlame: Object.freeze({
    label: "Brotherhood of the Cosmic Flame",
    source: "Ayerstone Setting Guide — Brotherhood of the Cosmic Flame",
    ancestries: Object.freeze(["Kobold","Lizardfolk","Human","Orc"]),
    crewTone: "rigid imperial hierarchy, disciplined, intimidating, dragon-aligned",
    shipTags: ["imperial","warship","boarding","flame","dragon"]
  }),
  grelkinCartel: Object.freeze({
    label: "Grelkin Cartel",
    source: "Ayerstone Setting Guide — Grelkin Cartel",
    ancestries: Object.freeze(["Orc","Goblin","Hobgoblin","Kobold"]),
    crewTone: "hard raider culture, practical, clan-loyal, salvage-minded",
    shipTags: ["raider","pirate","salvage","boarding","stolen-ship"]
  }),
  veilwardens: Object.freeze({
    label: "Veilwardens",
    source: "Ayerstone Setting Guide — Factions",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "militant magical containment and regulation order",
    shipTags: ["containment","lifeveil","occult","patrol"]
  }),
  underwake: Object.freeze({
    label: "Underwake Syndicates",
    source: "Ayerstone Setting Guide — Factions",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "smugglers, fixers, route guides, engine-modders, information brokers",
    shipTags: ["smuggler","concealed","black-market","fast"]
  }),
  faithOfTheChurn: Object.freeze({
    label: "Faith of the Churn",
    source: "Ayerstone Setting Guide — Factions",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "religious crew shaped by cycles of life and fulfilled purpose",
    shipTags: ["pilgrim","ritual","occult"]
  }),
  councilOfTheVoid: Object.freeze({
    label: "Council of the Void",
    source: "Ayerstone Setting Guide — Council of the Void",
    ancestries: Object.freeze(["Alien"]),
    crewTone: "alien, silent, inscrutable, unsettling to outsiders",
    shipTags: ["alien","occult","deep-void","mysterious"]
  }),
  starweaverSkyLines: Object.freeze({
    label: "Starweaver Sky Lines",
    source: "Ayerstone Setting Guide — Factions / House Starweaver",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "professional commercial route and passenger service",
    shipTags: ["merchant","passenger","routes","long-range"]
  })
});

export const AYERSTONE_HOUSES = Object.freeze([
  "House Starweaver","House Aurelian","House Ironmantle","House Veyr","House Blackwake",
  "House Stormglass","House Marruk","House Valecross","House Emberhall","House Tidereach"
]);

export function ayerstoneFaction(value) {
  const text = String(value ?? "").trim();
  if (!text) return AYERSTONE_FACTIONS.independent;
  const lower = text.toLowerCase();
  return Object.values(AYERSTONE_FACTIONS).find((row) => row.label.toLowerCase() === lower) ?? Object.freeze({
    label: text,
    source: "Custom faction",
    ancestries: COMMON_ANCESTRIES,
    crewTone: "custom faction crew",
    shipTags: []
  });
}

export function ayerstoneFactionOptions() {
  return Object.values(AYERSTONE_FACTIONS).map((row) => row.label);
}
