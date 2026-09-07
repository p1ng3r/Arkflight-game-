const OFFICER_ARCHETYPES = Object.freeze({
  captain: Object.freeze([
    Object.freeze({
      id:"marshal", label:"Marshal", classFamily:"marshal", speed:25,
      skills:["warfare-lore","athletics"],
      ability:Object.freeze({ id:"tactical-advance", name:"Tactical Advance", actionCost:1, summary:"The captain calls a precise advance, opening space for an ally to reposition or press the attack." })
    }),
    Object.freeze({
      id:"bard", label:"Bard", classFamily:"bard", speed:25,
      skills:["performance","occultism"],
      ability:Object.freeze({ id:"battle-verse", name:"Battle Verse", actionCost:1, summary:"A cutting verse or command cadence steadies allies and rattles the opposition." }),
      spellcasting:Object.freeze({ tradition:"occult", ability:"cha", mode:"spontaneous", spells:["guidance","fear","soothe","heroism","sure-strike"] })
    }),
    Object.freeze({
      id:"swashbuckler", label:"Swashbuckler", classFamily:"swashbuckler", speed:30,
      skills:["acrobatics","deception"],
      ability:Object.freeze({ id:"daring-feint", name:"Daring Feint", actionCost:1, summary:"A flamboyant feint creates a brief opening for the captain or a nearby ally." })
    }),
    Object.freeze({
      id:"champion", label:"Champion", classFamily:"champion", speed:25,
      skills:["religion","athletics"],
      ability:Object.freeze({ id:"guard-the-crew", name:"Guard the Crew", actionCost:1, summary:"The captain interposes themselves and turns discipline into immediate protection for the crew." })
    })
  ]),
  engineer: Object.freeze([
    Object.freeze({
      id:"inventor", label:"Inventor", classFamily:"inventor", speed:25,
      skills:["crafting","arcana"],
      ability:Object.freeze({ id:"overclock-device", name:"Overclock Device", actionCost:1, summary:"The engineer forces a device past its intended limits for a short burst of performance." })
    }),
    Object.freeze({
      id:"alchemist", label:"Alchemist", classFamily:"alchemist", speed:25,
      skills:["crafting","medicine"],
      ability:Object.freeze({ id:"volatile-mixture", name:"Volatile Mixture", actionCost:1, summary:"The engineer produces a volatile field mixture suited to the immediate crisis." })
    }),
    Object.freeze({
      id:"wizard", label:"Wizard", classFamily:"wizard", speed:25,
      skills:["arcana","occultism"],
      ability:Object.freeze({ id:"arcane-calibration", name:"Arcane Calibration", actionCost:1, summary:"A rapid arcane calibration stabilizes machinery or sharpens a magical discharge." }),
      spellcasting:Object.freeze({ tradition:"arcane", ability:"int", mode:"spontaneous", spells:["detect-magic","electric-arc","force-barrage","dispel-magic","haste"] })
    }),
    Object.freeze({
      id:"thaumaturge", label:"Thaumaturge", classFamily:"thaumaturge", speed:25,
      skills:["occultism","society"],
      ability:Object.freeze({ id:"jury-rigged-implement", name:"Jury-Rigged Implement", actionCost:1, summary:"The engineer produces a prepared implement whose sympathetic properties exploit the current threat." })
    })
  ]),
  navigator: Object.freeze([
    Object.freeze({
      id:"ranger", label:"Ranger", classFamily:"ranger", speed:30,
      skills:["survival","nature","stealth"],
      ability:Object.freeze({ id:"read-the-route", name:"Read the Route", actionCost:1, summary:"The navigator reads terrain and motion at a glance, identifying the safest or fastest line through danger." })
    }),
    Object.freeze({
      id:"rogue", label:"Rogue", classFamily:"rogue", speed:30,
      skills:["acrobatics","stealth","thievery"],
      ability:Object.freeze({ id:"slip-the-line", name:"Slip the Line", actionCost:1, summary:"The navigator uses timing and misdirection to slip through a threatened route without losing momentum." })
    }),
    Object.freeze({
      id:"druid", label:"Druid", classFamily:"druid", speed:25,
      skills:["nature","survival","medicine"],
      ability:Object.freeze({ id:"read-the-currents", name:"Read the Currents", actionCost:1, summary:"The navigator senses natural and aetheric currents and redirects movement around a developing hazard." }),
      spellcasting:Object.freeze({ tradition:"primal", ability:"wis", mode:"spontaneous", spells:["guidance","heal","fleet-step","dispel-magic","wall-of-wind"] })
    }),
    Object.freeze({
      id:"psychic", label:"Psychic", classFamily:"psychic", speed:25,
      skills:["occultism","society"],
      ability:Object.freeze({ id:"anticipate-motion", name:"Anticipate Motion", actionCost:1, summary:"The navigator catches the intention behind movement an instant before it happens." }),
      spellcasting:Object.freeze({ tradition:"occult", ability:"int", mode:"spontaneous", spells:["shield","daze","fear","soothe","sure-strike"] })
    })
  ]),
  battlewatch: Object.freeze([
    Object.freeze({
      id:"fighter", label:"Fighter", classFamily:"fighter", speed:25,
      skills:["athletics","warfare-lore"],
      ability:Object.freeze({ id:"controlled-volley", name:"Controlled Volley", actionCost:1, summary:"The Battlewatch calls a disciplined firing sequence against a priority target." })
    }),
    Object.freeze({
      id:"gunslinger", label:"Gunslinger", classFamily:"gunslinger", speed:25,
      skills:["acrobatics","warfare-lore"],
      ability:Object.freeze({ id:"snap-shot", name:"Snap Shot", actionCost:1, summary:"The Battlewatch fires the instant a target exposes itself, before the opening disappears." })
    }),
    Object.freeze({
      id:"investigator", label:"Investigator", classFamily:"investigator", speed:25,
      skills:["society","medicine","warfare-lore"],
      ability:Object.freeze({ id:"devise-broadside", name:"Devise Broadside", actionCost:1, summary:"The Battlewatch studies a target's pattern and calls the shot most likely to matter." })
    }),
    Object.freeze({
      id:"barbarian", label:"Barbarian", classFamily:"barbarian", speed:30,
      skills:["athletics","intimidation"],
      ability:Object.freeze({ id:"boarding-fury", name:"Boarding Fury", actionCost:1, summary:"The Battlewatch turns a close-quarters breach into a brutal burst of momentum." })
    })
  ]),
  veilwarden: Object.freeze([
    Object.freeze({
      id:"cleric", label:"Cleric", classFamily:"cleric", speed:25,
      skills:["religion","medicine"],
      ability:Object.freeze({ id:"warding-prayer", name:"Warding Prayer", actionCost:1, summary:"The Veilwarden invokes a compact protective rite over a nearby ally or station." }),
      spellcasting:Object.freeze({ tradition:"divine", ability:"wis", mode:"spontaneous", spells:["guidance","heal","bless","dispel-magic","heroism"] })
    }),
    Object.freeze({
      id:"witch", label:"Witch", classFamily:"witch", speed:25,
      skills:["occultism","arcana"],
      ability:Object.freeze({ id:"veil-hex", name:"Veil Hex", actionCost:1, summary:"The Veilwarden twists a fragment of the Lifeveil into a brief curse or ward." }),
      spellcasting:Object.freeze({ tradition:"occult", ability:"int", mode:"spontaneous", spells:["detect-magic","daze","fear","soothe","dispel-magic"] })
    }),
    Object.freeze({
      id:"oracle", label:"Oracle", classFamily:"oracle", speed:25,
      skills:["religion","diplomacy"],
      ability:Object.freeze({ id:"omens-warning", name:"Omen's Warning", actionCost:1, summary:"A sudden omen gives the Veilwarden just enough warning to blunt an imminent danger." }),
      spellcasting:Object.freeze({ tradition:"divine", ability:"cha", mode:"spontaneous", spells:["guidance","heal","bless","heroism","dispel-magic"] })
    }),
    Object.freeze({
      id:"sorcerer", label:"Sorcerer", classFamily:"sorcerer", speed:25,
      skills:["occultism","diplomacy"],
      ability:Object.freeze({ id:"aether-blood-surge", name:"Aether-Blood Surge", actionCost:1, summary:"Innate magic surges through the Veilwarden, reinforcing or violently discharging the Lifeveil." }),
      spellcasting:Object.freeze({ tradition:"occult", ability:"cha", mode:"spontaneous", spells:["shield","fear","soothe","heroism","dispel-magic"] })
    })
  ])
});

function hashSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function chooseOfficerArchetype({ station, seed="arkflight", rosterIndex=0 }={}) {
  const pool = OFFICER_ARCHETYPES[station];
  if (!pool?.length) throw new Error(`No officer archetypes are defined for Arkflight station ${station}.`);
  const index = (hashSeed(`${seed}:${station}:archetype`) + Number(rosterIndex || 0)) % pool.length;
  return pool[index];
}

export function maxSpellRankForOfficer(level) {
  return Math.max(1, Math.min(10, Math.ceil(Math.max(1, Number(level) || 1) / 2)));
}

export { OFFICER_ARCHETYPES };