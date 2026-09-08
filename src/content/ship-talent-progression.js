const meta = (minLevel, { prerequisites = [], prerequisiteAnyOf = [], upgradeOf = null, callingRequirement = null } = {}) => Object.freeze({
  minLevel,
  prerequisites: Object.freeze([...prerequisites]),
  prerequisiteAnyOf: Object.freeze([...prerequisiteAnyOf]),
  upgradeOf,
  callingRequirement
});

/**
 * Ship Talent progression metadata is intentionally separate from the mechanical
 * effect catalog. The catalog answers "what does this talent do?"; this map
 * answers "when and how can the vessel learn it?".
 *
 * Foundation is intentionally choice-rich at level 1 so a new vessel can spend
 * its starting 2 TP without being pushed toward one officer or forced to bank TP.
 */
export const SHIP_TALENT_PROGRESSION = Object.freeze({
  // Foundation — levels 1–5
  "voyage-trained": meta(1),
  "battle-trained": meta(1),
  "toughness": meta(1),
  "reinforced-lifeveil": meta(1),
  "defensive-bracing": meta(1),
  "repair-trained": meta(1),
  "spare-stores": meta(1),
  "expanded-cargo": meta(1),
  "crew-quarters": meta(1),

  "efficient-repair-crews": meta(2),
  "frugal-repairs": meta(2),
  "efficient-stores": meta(2),
  "reinforced-decks": meta(2),
  "weapon-calibration": meta(2),

  "steady-command": meta(3),
  "technical-crew": meta(3),

  "greater-frame": meta(4, { prerequisites: ["toughness"], upgradeOf: "toughness" }),
  "deep-veil-reservoir": meta(4, { prerequisites: ["reinforced-lifeveil"], upgradeOf: "reinforced-lifeveil" }),

  "hardened-construction": meta(5),
  "battle-hardened": meta(5),

  // Specialist — levels 6–10
  "improved-drive": meta(6),
  "responsive-rigging": meta(6),
  "deep-strain-reserves": meta(6),
  "expanded-tactical-doctrine": meta(6),

  "expanded-utility-bay": meta(7),
  "expanded-support-bay": meta(7),
  "expanded-rigging-bay": meta(7),
  "expanded-lifeveil-bay": meta(7),

  "expanded-weapon-mount": meta(8),
  "expanded-structural-bay": meta(8),
  "engineers-refit": meta(8),
  "major-refit": meta(8),

  "advanced-captain-arkcraft": meta(9),
  "advanced-engineer-arkcraft": meta(9),
  "advanced-navigator-arkcraft": meta(9),
  "advanced-battlewatch-arkcraft": meta(9),
  "advanced-veilwarden-arkcraft": meta(9),

  "mastered-arkcraft": meta(10, {
    prerequisiteAnyOf: [
      "advanced-captain-arkcraft",
      "advanced-engineer-arkcraft",
      "advanced-navigator-arkcraft",
      "advanced-battlewatch-arkcraft",
      "advanced-veilwarden-arkcraft"
    ]
  }),
  "specialist-voyage-systems": meta(10, { prerequisites: ["voyage-trained"], upgradeOf: "voyage-trained" }),
  "specialist-battle-systems": meta(10, { prerequisites: ["battle-trained"] }),

  // Legendary — levels 11–15
  "legendary-drive": meta(11, { prerequisites: ["improved-drive"], upgradeOf: "improved-drive" }),
  "legendary-rigging": meta(11, { prerequisites: ["responsive-rigging"], upgradeOf: "responsive-rigging" }),
  "legendary-strain-reserve": meta(11, { prerequisites: ["deep-strain-reserves"], upgradeOf: "deep-strain-reserves" }),

  "perfected-arkcraft": meta(12, { prerequisites: ["mastered-arkcraft"], upgradeOf: "mastered-arkcraft" }),
  "legendary-captain-arkcraft": meta(12, { prerequisites: ["advanced-captain-arkcraft"] }),
  "legendary-engineer-arkcraft": meta(12, { prerequisites: ["advanced-engineer-arkcraft"] }),
  "legendary-navigator-arkcraft": meta(12, { prerequisites: ["advanced-navigator-arkcraft"] }),
  "legendary-battlewatch-arkcraft": meta(12, { prerequisites: ["advanced-battlewatch-arkcraft"] }),
  "legendary-veilwarden-arkcraft": meta(12, { prerequisites: ["advanced-veilwarden-arkcraft"] }),

  "expanded-action-economy": meta(13),
  "expanded-reaction-economy": meta(13),
  "legendary-tactical-network": meta(13),

  "iron-legend": meta(14, { prerequisites: ["greater-frame"], upgradeOf: "greater-frame" }),
  "veil-of-legend": meta(14, { prerequisites: ["deep-veil-reservoir"], upgradeOf: "deep-veil-reservoir" }),

  "master-crew": meta(15),

  // Mythic — levels 16–20
  "impossible-burn": meta(16, { prerequisites: ["legendary-drive"], upgradeOf: "legendary-drive" }),
  "turn-between-heartbeats": meta(16, { prerequisites: ["legendary-rigging"], upgradeOf: "legendary-rigging" }),

  "ship-will-not-die": meta(17, { prerequisites: ["iron-legend"], upgradeOf: "iron-legend" }),
  "void-cannot-have-us": meta(17, { prerequisites: ["veil-of-legend"], upgradeOf: "veil-of-legend" }),

  "legendary-tempo": meta(18),
  "endless-reserve": meta(18, { prerequisites: ["legendary-strain-reserve"], upgradeOf: "legendary-strain-reserve" }),

  "one-crew-one-ship": meta(19),
  "master-of-the-black": meta(19, { prerequisites: ["specialist-voyage-systems"] }),

  "mythic-broadside": meta(20, { prerequisites: ["specialist-battle-systems"] }),
  "mythic-refit": meta(20, { prerequisites: ["major-refit", "engineers-refit"] })
});

export function shipTalentProgressionMeta(talentId) {
  return SHIP_TALENT_PROGRESSION[talentId] ?? null;
}
