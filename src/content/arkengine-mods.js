import { component, add, COMPONENT_TYPES } from "../ship/component-rules.js";
import { ARKENGINE_MOD_SLOT_CLASSES, defaultRefitCosts, refitSpec } from "../ship/refit-rules.js";

const D={
  "pressure-lattice-tuning":{"n":"Pressure Lattice Tuning","d":"Tunes engine pressure channels for safer sustained output and better Strain tolerance.","t":["standard","stability","pressure-lattice"],"ti":1,"c":1,"e":[["strainCapacity","add",1]],"mt":"stability"},
  "veil-projector-focusing":{"n":"Veil Projector Focusing","d":"Focuses Arkengine-fed veil projection to increase stable Lifeveil output.","t":["standard","lifeveil","veil-projector"],"ti":1,"c":1,"e":[["lifeveilCapacity","add",5]],"mt":"lifeveil"},
  "cooling-loop-expansion":{"n":"Cooling Loop Expansion","d":"Expands heat-exchange loops to reduce dangerous surge buildup during aggressive engine use.","t":["standard","cooling","hard-burn","overcharge"],"ti":1,"c":1,"e":[],"mt":"cooling"},
  "fuel-matrix-efficiency":{"n":"Fuel Matrix Efficiency","d":"Improves conversion of stored spell-fuel into usable Arkengine output without defining a mandatory fuel-consumption loop.","t":["standard","fueling","fuel-matrix"],"ti":1,"c":1,"e":[],"mt":"fueling"},
  "stormwake-injector":{"n":"Stormwake Injector","d":"Injects a short-lived surge into the drive for faster passage at increased operating risk.","t":["standard","overcharge","stormwake"],"ti":2,"c":1,"e":[["voyageSpeedTravelHexDays","subtract",1]],"mt":"overcharge"},
  "voidglass-regulator":{"n":"Voidglass Regulator","d":"Stabilizes Arkengine rhythm against hostile void pressure and abnormal aetheric currents.","t":["standard","void","stability"],"ti":1,"c":1,"e":[],"mt":"voidStability"},
  "choir-harmonic-lattice":{"n":"Choir Harmonic Lattice","d":"Uses tuned resonance frames to stabilize ritualized engine harmonics and veil output.","t":["standard","harmonic","lifeveil"],"ti":1,"c":1,"e":[["lifeveilCapacity","add",5]],"mt":"harmonic"},
  "overburn-catalysts":{"n":"Overburn Catalysts","d":"Catalytic aetherite plates allow dangerous bursts of emergency output when ordinary drive pressure is insufficient.","t":["standard","overcharge","hard-burn"],"ti":2,"c":1,"e":[],"mt":"overcharge"},
  "deepwake-stabilizers":{"n":"Deepwake Stabilizers","d":"Heavy stabilizers keep the Arkengine coherent during prolonged deep-void travel.","t":["standard","deep-void","void","stability"],"ti":3,"c":1,"e":[],"mt":"deepVoid"},
  "aetherite-core-bracing":{"n":"Aetherite Core Bracing","d":"Reinforces the Arkengine core cradle against violent Strain spikes and structural shock.","t":["standard","core-stability","aetherite"],"ti":1,"c":1,"e":[["strainCapacity","add",2]],"mt":"coreStability"},
  "refined-fuel-siphons":{"n":"Refined Fuel Siphons","d":"Adds safer routing and storage interfaces for spell-fuel reserves as an authored fuel-capacity hook.","t":["standard","fueling","fuel-siphons"],"ti":1,"c":1,"e":[["arkengineFuelSlots","add",1]],"mt":"fueling"},
  "hushglass-cowl":{"n":"Hushglass Cowl","d":"A hushglass shell suppresses Arkengine glow, vibration, and resonant hum during stealth-sensitive operations.","t":["standard","stealth","hushglass"],"ti":1,"c":1,"e":[],"mt":"stealth"},
  "hard-burn-governor":{"n":"Hard Burn Governor","d":"Smooths aggressive burn pressure and reduces the Strain cost of Hard Burn operation.","t":["standard","hard-burn","governor"],"ti":2,"c":1,"e":[["hardBurnStrainCost","subtract",1]],"mt":"hardBurn"},
  "overcharge-grounding-rods":{"n":"Overcharge Grounding Rods","d":"Vents dangerous surge buildup through grounded brass and aetherite discharge paths.","t":["standard","overcharge","grounding"],"ti":2,"c":1,"e":[["strainCapacity","add",1]],"mt":"overcharge"},
  "lifeveil-harmonic-prism":{"n":"Lifeveil Harmonic Prism","d":"Splits Arkengine output into stable harmonic bands that strengthen atmospheric veil projection.","t":["standard","lifeveil","harmonic","prism"],"ti":1,"c":1,"e":[["lifeveilCapacity","add",10]],"mt":"lifeveil"},
  "emergency-pressure-bypass":{"n":"Emergency Pressure Bypass","d":"Redirects dangerous Arkengine pressure through sacrificial bypass channels during a crisis.","t":["standard","emergency","pressure"],"ti":1,"c":1,"e":[["strainCapacity","add",1]],"mt":"emergency"},
  "deepwake-resonance-baffles":{"n":"Deepwake Resonance Baffles","d":"Dampen disruptive resonance when Black Tide currents hammer the Arkengine out of rhythm.","t":["standard","deep-void","resonance","stability"],"ti":3,"c":1,"e":[],"mt":"deepVoid"},
  "quickspark-injectors":{"n":"Quickspark Injectors","d":"Provide sharp propulsion bursts that shorten passage time while increasing Hard Burn stress.","t":["standard","speed","quickspark"],"ti":2,"c":1,"e":[["voyageSpeedTravelHexDays","subtract",1],["hardBurnStrainCost","add",1]],"mt":"speed"},
  "ritual-channeling-rings":{"n":"Ritual Channeling Rings","d":"Improve sanctified and ritual channeling into the Arkengine and stabilize veil-linked output.","t":["standard","ritual","channeling","lifeveil"],"ti":3,"c":1,"e":[["lifeveilCapacity","add",5]],"mt":"ritual"},
  "aetheric-filter-mesh":{"n":"Aetheric Filter Mesh","d":"Filters unstable magical residue before it reaches the Arkengine core.","t":["standard","filtration","aetheric"],"ti":1,"c":1,"e":[["strainCapacity","add",1]],"mt":"filtration"},
  "coldwake-condensers":{"n":"Coldwake Condensers","d":"Large condensers reinforce engine cooling during long voyages and sustained output.","t":["standard","cooling","coldwake"],"ti":1,"c":1,"e":[],"mt":"cooling"},
  "veil-pressure-equalizer":{"n":"Veil Pressure Equalizer","d":"Balances Arkengine-fed Lifeveil pressure across the vessel while smoothing system Strain.","t":["standard","lifeveil","pressure"],"ti":1,"c":1,"e":[["lifeveilCapacity","add",5],["strainCapacity","add",1]],"mt":"lifeveil"}
};

const SLOT_BY_TYPE=Object.freeze({
  stability:"stability", lifeveil:"lifeveil", cooling:"utility", fueling:"utility",
  overcharge:"power", voidStability:"stability", harmonic:"lifeveil", deepVoid:"stability",
  coreStability:"stability", stealth:"utility", hardBurn:"power", emergency:"utility",
  speed:"power", ritual:"lifeveil", filtration:"utility"
});

const EFFECT_FAMILY=Object.freeze({
  stability:"stability", lifeveil:"lifeveil", cooling:"cooling", fueling:"fuel",
  overcharge:"power-output", voidStability:"stability", harmonic:"lifeveil", deepVoid:"deep-void",
  coreStability:"stability", stealth:"stealth", hardBurn:"hard-burn", emergency:"emergency-power",
  speed:"travel-speed", ritual:"ritual", filtration:"stability"
});

const SIG={
  "stormwake-injector":["engineer.storm-surge"],
  "hard-burn-governor":["engineer.governed-burn"],
  "emergency-pressure-bypass":["engineer.emergency-bypass"]
};

const CAP=Object.freeze({
  "cooling-loop-expansion":["expanded-engine-cooling"],
  "fuel-matrix-efficiency":["efficient-spell-fuel-conversion"],
  "stormwake-injector":["stormwake-burst-output"],
  "voidglass-regulator":["void-pressure-regulation"],
  "overburn-catalysts":["emergency-overburn-output"],
  "deepwake-stabilizers":["deepwake-engine-stability"],
  "hushglass-cowl":["suppressed-engine-signature"],
  "deepwake-resonance-baffles":["deepwake-resonance-damping"],
  "coldwake-condensers":["long-duration-engine-cooling"]
});

const META=Object.freeze({
  "fuel-matrix-efficiency":Object.freeze({fuelHooks:Object.freeze([Object.freeze({kind:"fuel-efficiency"})])}),
  "refined-fuel-siphons":Object.freeze({fuelHooks:Object.freeze([Object.freeze({kind:"fuel-capacity",value:1})])}),
  "stormwake-injector":Object.freeze({ruleModifiers:Object.freeze([Object.freeze({kind:"stormwake-risk-output",value:1})])}),
  "overburn-catalysts":Object.freeze({ruleModifiers:Object.freeze([Object.freeze({kind:"emergency-output-access",value:1})])}),
  "cooling-loop-expansion":Object.freeze({ruleModifiers:Object.freeze([Object.freeze({kind:"hard-burn-heat-mitigation",value:1})])}),
  "coldwake-condensers":Object.freeze({ruleModifiers:Object.freeze([Object.freeze({kind:"sustained-output-cooling",value:1})])}),
  "hushglass-cowl":Object.freeze({ruleModifiers:Object.freeze([Object.freeze({kind:"arkengine-signature-suppression",value:1})])})
});

const effects=e=>(e??[]).map(([target,mode,value])=>add(target,mode==="subtract"?-Number(value):Number(value)));

function refitFor(v){
  const slotClass=SLOT_BY_TYPE[v.mt];
  if(!ARKENGINE_MOD_SLOT_CLASSES.includes(slotClass)) throw new Error(`Arkflight Arkengine mod type ${v.mt} has no refit slot class.`);
  const costs=defaultRefitCosts(v.ti,v.c);
  return refitSpec({family:"arkengineMod",slotClass,tier:v.ti,slotCost:v.c,...costs});
}

export const ARKENGINE_MODS=Object.freeze(Object.fromEntries(Object.entries(D).map(([id,v])=>[id,component({
  id,
  name:v.n,
  type:COMPONENT_TYPES.ARKENGINE_MOD,
  description:v.d,
  capacityCost:v.c,
  tags:["arkengine-mod","standard",...v.t.filter((tag)=>tag!=="standard"),v.mt],
  traits:["standard",...v.t.filter((tag)=>tag!=="standard")],
  effects:effects(v.e),
  capabilities:CAP[id]??[],
  unlocks:{signatures:SIG[id]??[]},
  data:{
    rarity:"standard",
    minShipLevel:1,
    tier:v.ti,
    legacyRefitTier:v.ti,
    modType:v.mt,
    effectFamily:EFFECT_FAMILY[v.mt],
    refit:refitFor(v),
    ...(META[id]??{})
  }
})])));
