import { generatePF2eOfficerBenchmark } from "./pf2e-officer-generator.js";
import { ayerstoneFaction } from "./ayerstone-setting-catalog.js";

const CREW_TYPES = Object.freeze({
  deckhand: { label:"Deckhand", station:"engineer", levelOffset:-4, primary:"athletics", strikeLabel:"boarding tool", role:"General deck crew and rigging hand" },
  gunner: { label:"Gunner", station:"watchmaster", levelOffset:-3, primary:"warfare-lore", strikeLabel:"crew-served sidearm", role:"Ship weapon crew and tactical deck hand" },
  marine: { label:"Marine", station:"watchmaster", levelOffset:-2, primary:"athletics", strikeLabel:"boarding weapon", role:"Boarding and shipboard security combatant" },
  shipwright: { label:"Shipwright", station:"engineer", levelOffset:-3, primary:"crafting", strikeLabel:"work hammer", role:"Repair specialist and heavy maintenance crew" }
});

function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
function actorDataFor(type, level, quality, faction){
  const row = CREW_TYPES[type];
  const benchmark = generatePF2eOfficerBenchmark({ station: row.station, level, quality });
  const factionData = ayerstoneFaction(faction);
  const ancestry = factionData.ancestries?.[0] ?? "Human";
  return {
    name: `${faction} ${row.label}`,
    type:"npc",
    img:"icons/svg/mystery-man.svg",
    system:{
      details:{ level:{value:level}, publicNotes:`<p><strong>${ancestry} ${row.label}</strong></p><p>${row.role}.</p>`, privateNotes:`<p>Reusable generated crew template for ${faction}.</p>` },
      traits:{ value:["humanoid"], rarity:"common", size:{value:"med"}, languages:{value:["common"], custom:""} },
      attributes:{ ac:{value:benchmark.statistics.ac}, hp:{value:benchmark.statistics.hp,max:benchmark.statistics.hp,temp:0}, speed:{value:25,otherSpeeds:[]} },
      perception:{ mod:benchmark.statistics.perception, senses:[] },
      saves:{ fortitude:{value:benchmark.statistics.saves.fortitude}, reflex:{value:benchmark.statistics.saves.reflex}, will:{value:benchmark.statistics.saves.will} },
      skills:{ [row.primary]:{ base:benchmark.statistics.skills[row.primary] ?? benchmark.statistics.perception, value:benchmark.statistics.skills[row.primary] ?? benchmark.statistics.perception, mod:benchmark.statistics.skills[row.primary] ?? benchmark.statistics.perception } },
      initiative:{statistic:"perception"}
    },
    items:[{
      name:`${row.label} ${row.strikeLabel}`,
      type:"melee",
      system:{ bonus:{value:benchmark.statistics.strike.attack}, damageRolls:{primary:{damage:benchmark.statistics.strike.damage,damageType:"physical"}}, traits:{value: type==="gunner"?["range-increment-60"]:[]}, attackEffects:{value:[]} },
      flags:{"arkflight-game":{generatedCrewTemplateStrike:true,crewType:type}}
    }],
    flags:{"arkflight-game":{generatedCrewTemplate:true,crewType:type,faction}}
  };
}

export function generatePF2eCrewTemplates({ shipLevel=1, quality="standard", faction="Independent" }={}) {
  return Object.entries(CREW_TYPES).map(([type,row])=>{
    const level = clamp(Number(shipLevel)+row.levelOffset,1,20);
    return Object.freeze({ type, label:row.label, level, role:row.role, actorData:Object.freeze(actorDataFor(type,level,quality,faction)) });
  });
}

export const PF2E_CREW_TEMPLATE_TYPES = CREW_TYPES;
