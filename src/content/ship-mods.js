import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { SHIP_MOD_SLOT_CLASSES, defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";
import { shipModRarityRule } from "../ship/ship-mod-rarity.js";

const D={"reinforced-structural-ribbing":["Reinforced Structural Ribbing","Permanent frame reinforcement for hull durability, catastrophic damage resistance, and structural survival.",["standard","structural","hull","catastrophe"],1,[["hullIntegrity","add",20]],"structural"],"expanded-cargo-lattice":["Expanded Cargo Lattice","Permanent cargo latticework that supports logistics, cargo transport, and salvage operations.",["standard","cargo","logistics","salvage"],1,[["cargoCapacity","add",25]],"cargo"],"stabilized-helm-relays":["Stabilized Helm Relays","Stabilized helm signaling infrastructure for maneuvering and Overcharge handling hooks.",["standard","helm","pilot","overcharge"],1,[],"helmSystem"],"fleet-signal-array":["Fleet Signal Array","A permanent shipwide communications array for fleet operations and coordination.",["standard","command","communication","coordination"],3,[["detection","add",1]],"command"],"reinforced-ram-prow":["Reinforced Ram Prow","Military prow reinforcement for collision combat, boarding actions, and frontal assault.",["standard","military","prow","boarding"],3,[],"military"],"emergency-veil-relay":["Emergency Veil Relay","Emergency Lifeveil relay hardware for stabilization and catastrophe survival.",["standard","defensive","lifeveil","catastrophe"],1,[],"defensive"],"void-anchor-array":["Void Anchor Array","Anchoring hardware for dangerous regions, void storms, and hazardous anchoring scenes.",["standard","voidfaring","anchor","storm"],1,[],"voidfaring"],"deep-void-reinforcement":["Deep Void Reinforcement","Adaptation reinforcement for deep void travel, hostile environments, and long-range survival.",["standard","adaptation","deep-void","survival"],1,[],"adaptation"],"arc-conduit-stabilizers":["Arc Conduit Stabilizers","Shipwide conduit stabilizers for Overcharge, energy routing, and arkengine stability.",["standard","powerDistribution","overcharge","maintenance"],2,[],"powerDistribution"],"lookout-spire":["Lookout Spire","A visible elevated Battlewatch structure for hostile detection and immediate threat spotting.",["standard","lookout","battlewatch","detection"],1,[["detection","add",2]],"lookout"],"reinforced-void-sails":["Reinforced Void Sails","Durable sail system reinforcement for propulsion and Hard Burn handling.",["standard","sailSystem","propulsion","hard-burn"],1,[],"sailSystem"],"auxiliary-command-roost":["Auxiliary Command Roost","Secondary command vantage infrastructure for coordination and flagship operations.",["standard","command","captain","flagship"],3,[],"command"],"pressure-redistribution-network":["Pressure Redistribution Network","Emergency pressure routing for subsystem failure and structural recovery.",["standard","catastrophe","pressure","survival"],2,[["cargoCapacity","subtract",10]],"catastrophe"],"detection-spire":["Detection Spire","Dedicated sensor and scrying tower for navigation, anomaly analysis, and long-range detection.",["standard","detection","navigation","battlewatch"],1,[["detection","add",2]],"detection"],"docking-claw-system":["Docking Claw System","External docking hardware for docking, salvage, and boarding support.",["standard","logistics","docking","salvage","boarding"],1,[],"logistics"],"propulsion-stabilization-fins":["Propulsion Stabilization Fins","Exposed stabilization fins for propulsion handling and high-speed maneuvering.",["standard","propulsionSupport","hard-burn","maneuvering"],2,[],"propulsionSupport"],"reinforced-bulkhead-network":["Reinforced Bulkhead Network","Reinforced internal bulkheads that improve compartment durability and defensive structure.",["standard","structural","bulkhead","durability"],1,[["hullIntegrity","add",20],["armorClass","add",1]],"structural"],"expanded-lifeveil-array":["Expanded Lifeveil Array","Expanded projection hardware that increases the vessel’s stable Lifeveil envelope.",["standard","lifeveil","projection","stability"],2,[["lifeveilCapacity","add",15]],"lifeveil"],"void-scout-observation-spire":["Void Scout Observation Spire","A dedicated observation spire tuned for distant route scouting and anomaly spotting before contact.",["standard","detection","battlewatch","scanning"],1,[["detection","add",2]],"detection"],"emergency-repair-lockers":["Emergency Repair Lockers","Distributed repair lockers and emergency patch stations positioned throughout the vessel.",["standard","support","repair","emergency"],1,[],"support"],"reinforced-maneuvering-fins":["Reinforced Maneuvering Fins","Reinforced control surfaces that improve ship handling and helm responsiveness.",["standard","mobility","maneuvering","control"],1,[["maneuverability","add",1]],"mobility"],"deep-void-insulation-web":["Deep Void Insulation Web","An insulation web that reinforces the vessel against deep-void degradation and environmental wear.",["standard","deepVoid","insulation","survival"],3,[],"deepVoid"],"occult-signal-refractors":["Occult Signal Refractors","Refractor hardware that diffuses occult interference and strange void signals.",["standard","occult","signal","interference"],3,[],"occult"],"expanded-command-network":["Expanded Command Network","Expanded command infrastructure that improves shipwide order routing and coordination capacity.",["standard","command","coordination","infrastructure"],3,[],"command"],"auxiliary-veil-capacitors":["Auxiliary Veil Capacitors","Auxiliary capacitors that store extra veil charge for atmospheric stability.",["standard","lifeveil","capacitor","stability"],2,[["lifeveilCapacity","add",10]],"lifeveil"],"reinforced-docking-framework":["Reinforced Docking Framework","Reinforced docking framework that improves docking stability, loading, and salvage handling.",["standard","logistics","docking","salvage"],1,[["cargoCapacity","add",10]],"logistics"],"longwatch-lookout-platform":["Longwatch Lookout Platform","A dedicated elevated Battlewatch platform optimized for sustained watches and ambush prevention.",["standard","detection","lookout","battlewatch"],1,[["detection","add",1]],"detection"],"distributed-strain-dampeners":["Distributed Strain Dampeners","Distributed dampeners that spread engine and hull stress through reinforced channels.",["standard","strain","dampening","reinforcement"],1,[["strainCapacity","add",2]],"strain"]};

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
  "longwatch-lookout-platform":["sustained-watch","ambush-prevention"]
};
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
    data:{rarity,minShipLevel:rarityRule.minShipLevel,legacyRefitTier:v[3],modType:v[5],refit:refitFor(v)}
  })];
})));
