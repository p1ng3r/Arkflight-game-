import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { SHIP_MOD_SLOT_CLASSES, defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";
import { shipModRarityRule } from "../ship/ship-mod-rarity.js";

const D={
  "reinforced-structural-ribbing":["Reinforced Structural Ribbing","Permanent frame reinforcement for hull durability, catastrophic damage resistance, and structural survival.",["standard","structural","hull","catastrophe"],1,[["hullIntegrity","add",20]],"structural"],
  "expanded-cargo-lattice":["Expanded Cargo Lattice","Permanent cargo latticework that supports logistics, cargo transport, and salvage operations.",["standard","cargo","logistics","salvage"],1,[["cargoCapacity","add",25]],"cargo"],
  "stabilized-helm-relays":["Stabilized Helm Relays","Stabilized helm signaling infrastructure for maneuvering and Overcharge handling hooks.",["standard","helm","pilot","overcharge"],1,[],"helmSystem"],
  "fleet-signal-array":["Fleet Signal Array","A permanent shipwide communications array for fleet operations and coordination.",["standard","command","communication","coordination"],3,[["detection","add",1]],"command"],
  "reinforced-ram-prow":["Reinforced Ram Prow","Military prow reinforcement for collision combat, boarding actions, and frontal assault.",["standard","military","prow","boarding"],3,[],"military"],
  "emergency-veil-relay":["Emergency Veil Relay","Emergency Lifeveil relay hardware for stabilization and catastrophe survival.",["standard","defensive","lifeveil","catastrophe"],1,[],"defensive"],
  "void-anchor-array":["Void Anchor Array","Anchoring hardware for dangerous regions, void storms, and hazardous anchoring scenes.",["standard","voidfaring","anchor","storm"],1,[],"voidfaring"],
  "deep-void-reinforcement":["Deep Void Reinforcement","Adaptation reinforcement for deep void travel, hostile environments, and long-range survival.",["standard","adaptation","deep-void","survival"],1,[],"adaptation"],
  "arc-conduit-stabilizers":["Arc Conduit Stabilizers","Shipwide conduit stabilizers for Overcharge, energy routing, and arkengine stability.",["standard","powerDistribution","overcharge","maintenance"],2,[],"powerDistribution"],
  "lookout-spire":["Lookout Spire","A visible elevated Battlewatch structure for hostile detection and immediate threat spotting.",["standard","lookout","battlewatch","detection"],1,[["detection","add",2]],"lookout"],
  "reinforced-void-sails":["Reinforced Void Sails","Durable sail system reinforcement for propulsion and Hard Burn handling.",["standard","sailSystem","propulsion","hard-burn"],1,[],"sailSystem"],
  "auxiliary-command-roost":["Auxiliary Command Roost","Secondary command vantage infrastructure for coordination and flagship operations.",["standard","command","captain","flagship"],3,[],"command"],
  "pressure-redistribution-network":["Pressure Redistribution Network","Emergency pressure routing for subsystem failure and structural recovery.",["standard","catastrophe","pressure","survival"],2,[["cargoCapacity","subtract",10]],"catastrophe"],
  "detection-spire":["Detection Spire","Dedicated sensor and scrying tower for navigation, anomaly analysis, and long-range detection.",["standard","detection","navigation","battlewatch"],1,[["detection","add",2]],"detection"],
  "docking-claw-system":["Docking Claw System","External docking hardware for docking, salvage, and boarding support.",["standard","logistics","docking","salvage","boarding"],1,[],"logistics"],
  "propulsion-stabilization-fins":["Propulsion Stabilization Fins","Exposed stabilization fins for propulsion handling and high-speed maneuvering.",["standard","propulsionSupport","hard-burn","maneuvering"],2,[],"propulsionSupport"],
  "reinforced-bulkhead-network":["Reinforced Bulkhead Network","Reinforced internal bulkheads that improve compartment durability and defensive structure.",["standard","structural","bulkhead","durability"],1,[["hullIntegrity","add",20],["armorClass","add",1]],"structural"],
  "expanded-lifeveil-array":["Expanded Lifeveil Array","Expanded projection hardware that increases the vessel’s stable Lifeveil envelope.",["standard","lifeveil","projection","stability"],2,[["lifeveilCapacity","add",15]],"lifeveil"],
  "void-scout-observation-spire":["Void Scout Observation Spire","A dedicated observation spire tuned for distant route scouting and anomaly spotting before contact.",["standard","detection","battlewatch","scanning"],1,[["detection","add",2]],"detection"],
  "emergency-repair-lockers":["Emergency Repair Lockers","Distributed repair lockers and emergency patch stations positioned throughout the vessel.",["standard","support","repair","emergency"],1,[],"support"],
  "reinforced-maneuvering-fins":["Reinforced Maneuvering Fins","Reinforced control surfaces that improve ship handling and helm responsiveness.",["standard","mobility","maneuvering","control"],1,[["maneuverability","add",1]],"mobility"],
  "deep-void-insulation-web":["Deep Void Insulation Web","An insulation web that reinforces the vessel against deep-void degradation and environmental wear.",["standard","deepVoid","insulation","survival"],3,[],"deepVoid"],
  "occult-signal-refractors":["Occult Signal Refractors","Refractor hardware that diffuses occult interference and strange void signals.",["standard","occult","signal","interference"],3,[],"occult"],
  "expanded-command-network":["Expanded Command Network","Expanded command infrastructure that improves shipwide order routing and coordination capacity.",["standard","command","coordination","infrastructure"],3,[],"command"],
  "auxiliary-veil-capacitors":["Auxiliary Veil Capacitors","Auxiliary capacitors that store extra veil charge for atmospheric stability.",["standard","lifeveil","capacitor","stability"],2,[["lifeveilCapacity","add",10]],"lifeveil"],
  "reinforced-docking-framework":["Reinforced Docking Framework","Reinforced docking framework that improves docking stability, loading, and salvage handling.",["standard","logistics","docking","salvage"],1,[["cargoCapacity","add",10]],"logistics"],
  "longwatch-lookout-platform":["Longwatch Lookout Platform","A dedicated elevated Battlewatch platform optimized for sustained watches and ambush prevention.",["standard","detection","lookout","battlewatch"],1,[["detection","add",1]],"detection"],
  "distributed-strain-dampeners":["Distributed Strain Dampeners","Distributed dampeners that spread engine and hull stress through reinforced channels.",["standard","strain","dampening","reinforcement"],1,[["strainCapacity","add",2]],"strain"],
  "firebreak-plating":["Firebreak Plating","Layered iron, ceramic, and treated timber firebreaks isolate hot compartments and blunt flame damage before it can run the hull.",["standard","structural","fire","resistance"],1,[],"structural"],
  "stormgrounding-mesh":["Stormgrounding Mesh","Copper grounding straps and brass discharge vanes route violent electrical surges around critical ship systems.",["standard","powerDistribution","electricity","resistance"],1,[],"powerDistribution"],
  "trim-sail-regulators":["Trim-Sail Regulators","Mechanical trim governors and tension guides keep the void sails at an efficient drive angle during ordinary combat maneuvering.",["standard","sailSystem","speed","rigging"],1,[["combatSpeed","add",1]],"sailSystem"],
  "crew-muster-bell-network":["Crew Muster Bell Network","A shipwide network of coded bells, speaking tubes, and signal plates accelerates musters and keeps orders coherent under pressure.",["standard","command","crew","morale"],1,[],"command"],
  "veil-warded-bulkheads":["Veil-Warded Bulkheads","Simple aetheric ward plates reinforce compartment boundaries against void seepage and stabilize the Lifeveil around damaged interior spaces.",["standard","lifeveil","bulkhead","recovery"],1,[["lifeveilCapacity","add",5]],"lifeveil"],

  "aether-bound-ribbing":["Aether-Bound Ribbing","Runed braces and aetherite joints reinforce the ship frame while flexing under impacts that would buckle ordinary ironwork.",["rare","structural","hull","upgrade"],2,[["hullIntegrity","add",35]],"structural"],
  "merchant-prime-lattice":["Merchant-Prime Cargo Lattice","Counterweighted shelving, lift tracks, and collapsible bracing turn the hold into a high-efficiency freight and salvage deck.",["rare","cargo","logistics","upgrade"],2,[["cargoCapacity","add",40]],"cargo"],
  "precision-helm-relays":["Precision Helm Relays","Fine brass relay wheels and aetheric response rods translate helm commands with almost no mechanical lag.",["rare","helm","maneuverability","upgrade"],2,[["maneuverability","add",2]],"helmSystem"],
  "battleline-signal-array":["Battleline Signal Array","Hardened signal lanterns, speaking horns, and aetheric flash plates coordinate allied vessels through smoke, storms, and battle confusion.",["rare","command","coordination","fleet"],2,[["detection","add",2]],"command"],
  "stormglass-firebreak-shell":["Stormglass Firebreak Shell","Stormglass-faced internal armor spreads heat across sacrificial plates before flame can penetrate living compartments.",["rare","structural","fire","armor"],2,[["armorClass","add",1]],"structural"],
  "veil-resonance-relay":["Veil Resonance Relay","A tuned relay chamber catches collapsing Lifeveil harmonics and feeds them back into the shipwide projection lattice.",["rare","lifeveil","recovery","upgrade"],2,[["lifeveilCapacity","add",15]],"defensive"],
  "deep-void-armor-web":["Deep-Void Armor Web","Insulated plate webs and void-treated packing protect exposed systems from killing cold and corrosive aetheric seepage.",["rare","adaptation","deep-void","resistance"],2,[["hullIntegrity","add",10]],"adaptation"],
  "grounded-conduit-bus":["Grounded Conduit Bus","A redundant copper-and-aetherite bus distributes overloads across grounded pathways instead of letting one surge cripple the ship.",["rare","powerDistribution","strain","resistance"],2,[["strainCapacity","add",3]],"powerDistribution"],
  "stormproof-void-sails":["Stormproof Void Sails","Layered voidcloth, reinforced spars, and tension-distributing stays let the ship carry more drive through turbulent Black Tides.",["rare","sailSystem","speed","upgrade"],2,[["combatSpeed","add",2]],"sailSystem"],
  "battlewatch-scrying-crown":["Battlewatch Scrying Crown","A ring of mirrored lenses, omen vanes, and short-range scrying crystals gives Battlewatch a sharper picture of immediate threats.",["rare","lookout","battlewatch","detection"],2,[["detection","add",3]],"lookout"],
  "salvage-winch-clusters":["Salvage Winch Clusters","Multiple geared winches and reinforced booms let the crew secure wreckage, tow fragments, and load irregular salvage without choking normal cargo flow.",["rare","logistics","salvage","upgrade"],2,[["cargoCapacity","add",20]],"logistics"],
  "battlewake-control-fins":["Battlewake Control Fins","Articulated control fins bite into aetheric currents and give the helm sharper authority during violent turns and pursuit maneuvers.",["rare","mobility","maneuverability","upgrade"],2,[["maneuverability","add",2]],"mobility"],
  "crew-cohesion-network":["Crew Cohesion Network","Coded bell pulls, speaking tubes, muster plaques, and command repeaters keep dispersed watches acting as one crew.",["rare","command","morale","crew"],2,[],"command"],
  "ablative-iron-sheathing":["Ablative Iron Sheathing","Replaceable iron-and-bronze plates are mounted over vulnerable outer hull sections to blunt incoming shot before the primary hull is struck.",["rare","armor","physical","resistance"],2,[["armorClass","add",2]],"structural"],
  "veil-harmonic-capacitors":["Veil Harmonic Capacitors","Matched aetherite capacitor banks store excess Lifeveil charge and release it smoothly when the envelope is stressed.",["rare","lifeveil","capacitor","stability"],2,[["lifeveilCapacity","add",20]],"lifeveil"]
};

const SLOT_BY_TYPE=Object.freeze({
  structural:"structural", cargo:"support", helmSystem:"rigging", command:"support",
  military:"weapon", defensive:"lifeveil", voidfaring:"utility", adaptation:"utility",
  powerDistribution:"utility", lookout:"support", sailSystem:"rigging", catastrophe:"utility",
  detection:"support", logistics:"support", propulsionSupport:"rigging", lifeveil:"lifeveil",
  support:"support", mobility:"rigging", deepVoid:"utility", occult:"utility", strain:"utility"
});

const RARITY_BY_LEGACY_TIER=Object.freeze({1:"standard",2:"rare",3:"epic"});

const SIG={"stabilized-helm-relays":["navigator.perfect-line"],"void-anchor-array":["navigator.hold-position"],"lookout-spire":["watchmaster.eyes-on-everything"],"expanded-lifeveil-array":["veilwarden.hold-the-veil"]};
const CAP={
  "stabilized-helm-relays":["stabilized-overcharge-routing"],
  "fleet-signal-array":["fleet-coordination"],
  "reinforced-ram-prow":["reinforced-ramming","boarding-prow"],
  "emergency-veil-relay":["emergency-lifeveil-relay"],
  "void-anchor-array":["void-anchoring"],
  "deep-void-reinforcement":["deep-void-rated"],
  "arc-conduit-stabilizers":["overcharge-stability"],
  "lookout-spire":["battlewatch-immediate-threat-spotting"],
  "reinforced-void-sails":["hard-burn-sail-reinforcement"],
  "auxiliary-command-roost":["secondary-command-position"],
  "pressure-redistribution-network":["pressure-redistribution"],
  "detection-spire":["navigator-anomaly-detection"],
  "docking-claw-system":["external-docking","salvage-grapple"],
  "propulsion-stabilization-fins":["high-speed-stability"],
  "void-scout-observation-spire":["long-range-route-scouting"],
  "emergency-repair-lockers":["distributed-emergency-repair"],
  "deep-void-insulation-web":["deep-void-insulation"],
  "occult-signal-refractors":["occult-interference-reduction"],
  "expanded-command-network":["expanded-command-routing"],
  "reinforced-docking-framework":["reinforced-docking"],
  "longwatch-lookout-platform":["sustained-watch","ambush-prevention"],
  "firebreak-plating":["compartment-firebreaks"],
  "stormgrounding-mesh":["electrical-surge-grounding"],
  "trim-sail-regulators":["efficient-sail-trim"],
  "crew-muster-bell-network":["rapid-crew-muster","command-signal-redundancy"],
  "veil-warded-bulkheads":["lifeveil-compartment-stabilization"],
  "aether-bound-ribbing":["flexing-aether-frame"],
  "merchant-prime-lattice":["high-efficiency-cargo-handling"],
  "precision-helm-relays":["precision-helm-response"],
  "battleline-signal-array":["battleline-coordination"],
  "stormglass-firebreak-shell":["stormglass-heat-spreading"],
  "veil-resonance-relay":["lifeveil-resonance-recovery"],
  "deep-void-armor-web":["deep-void-environmental-armor"],
  "grounded-conduit-bus":["redundant-overload-routing"],
  "stormproof-void-sails":["stormproof-drive-sails"],
  "battlewatch-scrying-crown":["battlewatch-short-range-scrying"],
  "salvage-winch-clusters":["heavy-salvage-handling"],
  "battlewake-control-fins":["battlewake-control"],
  "crew-cohesion-network":["crew-cohesion-command"],
  "ablative-iron-sheathing":["ablative-outer-armor"],
  "veil-harmonic-capacitors":["harmonic-veil-storage"]
};

const META=Object.freeze({
  "firebreak-plating":Object.freeze({effectFamily:"resistance",resistances:Object.freeze([Object.freeze({type:"fire",value:5})])}),
  "stormgrounding-mesh":Object.freeze({effectFamily:"resistance",resistances:Object.freeze([Object.freeze({type:"electricity",value:5})])}),
  "trim-sail-regulators":Object.freeze({effectFamily:"speed"}),
  "crew-muster-bell-network":Object.freeze({effectFamily:"morale-command",ruleModifiers:Object.freeze([Object.freeze({kind:"crew-muster-support",value:1})])}),
  "veil-warded-bulkheads":Object.freeze({effectFamily:"lifeveil",ruleModifiers:Object.freeze([Object.freeze({kind:"lifeveil-recovery-support",value:1})])}),

  "aether-bound-ribbing":Object.freeze({effectFamily:"hull",upgradeChain:Object.freeze({requiresMods:Object.freeze(["reinforced-structural-ribbing"])})}),
  "merchant-prime-lattice":Object.freeze({effectFamily:"cargo",upgradeChain:Object.freeze({requiresMods:Object.freeze(["expanded-cargo-lattice"])}),synergies:Object.freeze([Object.freeze({id:"merchant-dock-suite",requiresMods:Object.freeze(["reinforced-docking-framework"]),effects:Object.freeze([Object.freeze({target:"cargoCapacity",mode:"add",value:10})])})])}),
  "precision-helm-relays":Object.freeze({effectFamily:"maneuverability",upgradeChain:Object.freeze({requiresMods:Object.freeze(["stabilized-helm-relays"])})}),
  "battleline-signal-array":Object.freeze({effectFamily:"morale-command",synergies:Object.freeze([Object.freeze({id:"battleline-command-suite",requiresMods:Object.freeze(["crew-muster-bell-network"]),effects:Object.freeze([Object.freeze({target:"detection",mode:"add",value:1})]),capabilities:Object.freeze(["coordinated-fleet-orders"])})])}),
  "stormglass-firebreak-shell":Object.freeze({effectFamily:"resistance",upgradeChain:Object.freeze({requiresMods:Object.freeze(["firebreak-plating"])}),resistances:Object.freeze([Object.freeze({type:"fire",value:10})])}),
  "veil-resonance-relay":Object.freeze({effectFamily:"lifeveil",upgradeChain:Object.freeze({requiresMods:Object.freeze(["emergency-veil-relay"])}),ruleModifiers:Object.freeze([Object.freeze({kind:"lifeveil-recovery-support",value:2})])}),
  "deep-void-armor-web":Object.freeze({effectFamily:"resistance",upgradeChain:Object.freeze({requiresMods:Object.freeze(["deep-void-reinforcement"])}),resistances:Object.freeze([Object.freeze({type:"cold",value:5}),Object.freeze({type:"void",value:5})])}),
  "grounded-conduit-bus":Object.freeze({effectFamily:"arkengine",upgradeChain:Object.freeze({requiresMods:Object.freeze(["stormgrounding-mesh"])}),resistances:Object.freeze([Object.freeze({type:"electricity",value:10})])}),
  "stormproof-void-sails":Object.freeze({effectFamily:"speed",upgradeChain:Object.freeze({requiresMods:Object.freeze(["reinforced-void-sails"])}),ruleModifiers:Object.freeze([Object.freeze({kind:"hard-burn-strain-reduction",value:1})])}),
  "battlewatch-scrying-crown":Object.freeze({effectFamily:"detection",upgradeChain:Object.freeze({requiresMods:Object.freeze(["lookout-spire"])}),synergies:Object.freeze([Object.freeze({id:"far-and-near-watch",requiresMods:Object.freeze(["void-scout-observation-spire"]),effects:Object.freeze([Object.freeze({target:"detection",mode:"add",value:1})]),capabilities:Object.freeze(["layered-threat-picture"])})])}),
  "salvage-winch-clusters":Object.freeze({effectFamily:"logistics",upgradeChain:Object.freeze({requiresMods:Object.freeze(["docking-claw-system"])}),ruleModifiers:Object.freeze([Object.freeze({kind:"salvage-handling-bonus",value:1})])}),
  "battlewake-control-fins":Object.freeze({effectFamily:"maneuverability",upgradeChain:Object.freeze({requiresMods:Object.freeze(["reinforced-maneuvering-fins"])}),synergies:Object.freeze([Object.freeze({id:"battlewake-drive-suite",requiresMods:Object.freeze(["trim-sail-regulators"]),effects:Object.freeze([Object.freeze({target:"combatSpeed",mode:"add",value:1})])})])}),
  "crew-cohesion-network":Object.freeze({effectFamily:"morale-command",upgradeChain:Object.freeze({requiresMods:Object.freeze(["crew-muster-bell-network"])}),ruleModifiers:Object.freeze([Object.freeze({kind:"safe-rest-morale-recovery-bonus",value:1}),Object.freeze({kind:"crew-station-reassignment-support",value:1})])}),
  "ablative-iron-sheathing":Object.freeze({effectFamily:"armor-class",resistances:Object.freeze([Object.freeze({type:"piercing",value:5})])}),
  "veil-harmonic-capacitors":Object.freeze({effectFamily:"lifeveil",synergies:Object.freeze([Object.freeze({id:"harmonic-bulkhead-suite",requiresMods:Object.freeze(["veil-warded-bulkheads"]),ruleModifiers:Object.freeze([Object.freeze({kind:"lifeveil-recovery-support",value:1})])})])})
});

const effects=e=>(e??[]).filter(([t])=>t!=="baseAP"&&t!=="baseRAP").map(([t,m,v])=>add(t,m==="subtract"?-Number(v):Number(v)));

function refitFor(v){
  const slotClass=SLOT_BY_TYPE[v[5]];
  if(!SHIP_MOD_SLOT_CLASSES.includes(slotClass)) throw new Error(`Arkflight ship mod type ${v[5]} has no refit slot class.`);
  const slotCost=1;
  const costs=defaultRefitCosts(v[3],slotCost);
  return refitSpec({family:"shipMod",slotClass,tier:v[3],slotCost,...costs});
}

export const SHIP_MODS=Object.freeze(Object.fromEntries(Object.entries(D).map(([id,v])=>{
  const rarity=RARITY_BY_LEGACY_TIER[v[3]]??"standard";
  const rarityRule=shipModRarityRule(rarity);
  return [id,component({
    id,name:v[0],type:COMPONENT_TYPES.SHIP_MOD,description:v[1],capacityCost:1,
    tags:["ship-mod",rarity,...v[2].filter(tag=>tag!=="watchmaster"),v[5]],
    traits:v[2].filter(tag=>tag!=="watchmaster"),effects:effects(v[4]),capabilities:CAP[id]??[],unlocks:{signatures:SIG[id]??[]},
    data:{rarity,minShipLevel:rarityRule.minShipLevel,legacyRefitTier:v[3],modType:v[5],refit:refitFor(v),...(META[id]??{})}
  })];
})));
