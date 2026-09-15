const p = (name, content, playerFacing = false) => Object.freeze({ name, content, playerFacing });

const PULSE_MACRO = [
  'const MODULE_ID = "arkflight-game";',
  'const FLAG = "gildedShatterDarkStarPulse";',
  'const DC = 22;',
  'const scene = canvas?.scene ?? null;',
  'if (!scene) {',
  '  ui.notifications?.warn?.("Open the Gilded Shatter scene before triggering a Dark Star Pulse.");',
  '} else {',
  '  const count = Math.max(0, Number(scene.getFlag(MODULE_ID, FLAG) ?? 0)) + 1;',
  '  await scene.setFlag(MODULE_ID, FLAG, count);',
  '  const selected = [...(canvas.tokens?.controlled ?? [])];',
  '  const selectedNames = selected.map((token) => token.name).join(", ") || "No tokens selected";',
  '  const content = `<article><h2>Dark Star Pulse ${count}</h2><p><strong>Activate one new gilded zone.</strong> Every active gilded zone remains difficult terrain.</p><p>Creatures currently standing in an active gilded zone or directly touching fresh transmutation attempt a <strong>DC ${DC} Fortitude save</strong>.</p><ul><li><strong>Critical Success:</strong> No effect.</li><li><strong>Success:</strong> No effect.</li><li><strong>Failure:</strong> 2d6 force damage and clumsy 1 until the end of the creature&apos;s next turn.</li><li><strong>Critical Failure:</strong> 4d6 force damage and slowed 1 until the end of the creature&apos;s next turn.</li></ul><p><strong>Selected for saves:</strong> ${selectedNames}</p><p>The pulse should visibly travel from below decks, through the wreck, and into the growing gold.</p></article>`;',
  '  await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content });',
  '  for (const token of selected) {',
  '    const actor = token.actor;',
  '    const statistic = actor?.getStatistic?.("fortitude");',
  '    const roller = statistic?.check?.roll ? statistic.check : statistic;',
  '    if (typeof roller?.roll !== "function") {',
  '      ui.notifications?.warn?.(`${token.name}: Fortitude statistic could not be rolled automatically.`);',
  '      continue;',
  '    }',
  '    try {',
  '      await roller.roll({ dc: { value: DC }, label: `Dark Star Pulse ${count}` });',
  '    } catch (error) {',
  '      console.error("Arkflight | Dark Star Pulse save failed", token.name, error);',
  '      ui.notifications?.warn?.(`${token.name}: roll the DC ${DC} Fortitude save manually.`);',
  '    }',
  '  }',
  '  ui.notifications?.info?.(`Dark Star Pulse ${count} triggered. Activate one new gilded zone.`);',
  '}'
].join("\n");

const RESET_PULSE_MACRO = [
  'const MODULE_ID = "arkflight-game";',
  'const FLAG = "gildedShatterDarkStarPulse";',
  'const scene = canvas?.scene ?? null;',
  'if (!scene) {',
  '  ui.notifications?.warn?.("Open the Gilded Shatter scene before resetting its pulse counter.");',
  '} else {',
  '  await scene.unsetFlag(MODULE_ID, FLAG);',
  '  await ChatMessage.create({ speaker: ChatMessage.getSpeaker(), content: "<p><strong>Gilded Shatter:</strong> Dark Star Pulse counter reset to 0.</p>" });',
  '  ui.notifications?.info?.("Dark Star Pulse counter reset.");',
  '}'
].join("\n");

const BUILD_ENEMIES_MACRO = [
  "const MODULE_ID = \"arkflight-game\";",
  "const FOLDER_NAME = \"Gilded Shatter — Wreckbound\";",
  "if (!game.user?.isGM) {",
  "  ui.notifications?.warn?.(\"Only a GM can build the Gilded Shatter enemies.\");",
  "} else {",
  "  const actionItem = (name, actionType, actions, html) => ({",
  "    name, type:\"action\",",
  "    system:{ actionType:{ value:actionType }, actions:{ value:actions }, category:null, description:{ value:html }, traits:{ value:[] } }",
  "  });",
  "  const strikeItem = (name, bonus, damage, damageType, traits=[]) => ({",
  "    name, type:\"melee\",",
  "    system:{ attackEffects:{ value:[] }, bonus:{ value:bonus }, damageRolls:{ primary:{ damage, damageType } }, traits:{ value:traits } }",
  "  });",
  "  const skillData = (skills) => Object.fromEntries(Object.entries(skills).map(([slug,value]) => [slug,{ base:value, value, mod:value }]));",
  "  const baseNpc = ({ id, name, level, ac, hp, perception, saves, skills, rarity=\"common\", items=[] }) => ({",
  "    name, type:\"npc\", img:\"icons/svg/mystery-man.svg\",",
  "    system:{",
  "      details:{",
  "        level:{ value:level }, alliance:null,",
  "        publicNotes:\"<p><strong>Gilded Shatter Wreckbound</strong></p><p>A dead sailor and pieces of the wreck have been rewritten into one functioning thing by the Dark Star transmutation.</p>\",",
  "        privateNotes:\"<p>Weather Deck encounter creature. Dark Star Pulse interactions are GM-facing and described in the embedded abilities.</p>\"",
  "      },",
  "      traits:{ value:[\"construct\"], rarity, size:{ value:\"med\" }, languages:{ value:[\"common\"], custom:\"\" } },",
  "      attributes:{ ac:{ value:ac }, hp:{ value:hp, max:hp, temp:0 }, speed:{ value:25, otherSpeeds:[] } },",
  "      perception:{ mod:perception, senses:[] },",
  "      saves:{ fortitude:{ value:saves.fortitude }, reflex:{ value:saves.reflex }, will:{ value:saves.will } },",
  "      skills:skillData(skills), initiative:{ statistic:\"perception\" }",
  "    },",
  "    items,",
  "    flags:{ [MODULE_ID]:{ gildedShatterEnemyId:id, adventure:\"gilded-shatter\", encounter:\"weather-deck\" } }",
  "  });",
  "  const bosun = baseNpc({",
  "    id:\"wreckbound-bosun\", name:\"Gilded Wreckbound Bosun\",",
  "    level:7, ac:25, hp:125, perception:18,",
  "    saves:{ fortitude:18, reflex:15, will:12 },",
  "    skills:{ athletics:20, intimidation:17, acrobatics:15, crafting:15 }, rarity:\"unique\",",
  "    items:[",
  "      strikeItem(\"Gilded Boarding Hook\",18,\"2d10+9\",\"piercing\",[\"reach-10\",\"trip\"]),",
  "      strikeItem(\"Chain Maul\",18,\"2d8+9\",\"bludgeoning\",[\"sweep\"]),",
  "      actionItem(\"Bound to the Veins\",\"passive\",null,\"<p>The Bosun ignores difficult terrain created by active gilded zones on the Gilded Shatter.</p>\"),",
  "      actionItem(\"Hook and Haul\",\"action\",1,\"<p><strong>Requirements</strong> The Bosun\\'s previous action was a successful Gilded Boarding Hook Strike against the target.</p><p>The Bosun attempts Athletics +20 against the target\\'s Fortitude DC. On a success, pull the target up to 10 feet toward the Bosun or toward an adjacent active gilded zone. On a critical success, pull up to 15 feet and the target falls prone.</p>\"),",
  "      actionItem(\"Hold the Deck!\",\"action\",1,\"<p>The Bosun barks a fragment of its final command. Choose one Wreckbound Deckhand within 30 feet. That Deckhand can use its reaction to Step or Stride up to half its Speed.</p>\"),",
  "      actionItem(\"Dark Star Resonance\",\"reaction\",null,\"<p><strong>Trigger</strong> A Dark Star Pulse occurs.</p><p>The Bosun gains 10 temporary Hit Points and can Step up to 10 feet. Temporary Hit Points from this ability do not stack.</p>\")",
  "    ]",
  "  });",
  "  const deckhand = baseNpc({",
  "    id:\"wreckbound-deckhand\", name:\"Wreckbound Deckhand\",",
  "    level:4, ac:21, hp:60, perception:12,",
  "    saves:{ fortitude:14, reflex:11, will:8 },",
  "    skills:{ athletics:12, acrobatics:10, intimidation:10 },",
  "    items:[",
  "      strikeItem(\"Gilded Deck Hook\",14,\"2d8+5\",\"slashing\",[\"trip\"]),",
  "      strikeItem(\"Belaying Pin\",14,\"2d6+5\",\"bludgeoning\",[]),",
  "      actionItem(\"Bound to the Veins\",\"passive\",null,\"<p>The Deckhand ignores difficult terrain created by active gilded zones on the Gilded Shatter.</p>\"),",
  "      actionItem(\"Drag to Gold\",\"action\",1,\"<p><strong>Requirements</strong> The Deckhand\\'s previous action was a successful Gilded Deck Hook Strike against the target.</p><p>The Deckhand attempts Athletics +12 against the target\\'s Fortitude DC. On a success, pull the target 5 feet toward an active gilded zone. On a critical success, pull the target 10 feet.</p>\"),",
  "      actionItem(\"Pulse Lurch\",\"reaction\",null,\"<p><strong>Trigger</strong> A Dark Star Pulse occurs.</p><p>The Deckhand Steps up to 5 feet. If possible, it ends this movement in or adjacent to an active gilded zone.</p>\")",
  "    ]",
  "  });",
  "  let folder = game.folders?.find?.((entry) => entry.type === \"Actor\" && entry.name === FOLDER_NAME);",
  "  if (!folder) {",
  "    const FolderClass = CONFIG?.Folder?.documentClass ?? globalThis.Folder;",
  "    folder = await FolderClass.create({ name:FOLDER_NAME, type:\"Actor\", sorting:\"a\", color:\"#9d7436\" });",
  "  }",
  "  const managed = game.actors.filter((actor) => actor.flags?.[MODULE_ID]?.adventure === \"gilded-shatter\" && [\"wreckbound-bosun\",\"wreckbound-deckhand\"].includes(actor.flags?.[MODULE_ID]?.gildedShatterEnemyId));",
  "  if (managed.length) await Actor.deleteDocuments(managed.map((actor) => actor.id));",
  "  const created = await Actor.createDocuments([{ ...bosun, folder:folder.id }, { ...deckhand, folder:folder.id }]);",
  "  const bosunActor = created.find((actor) => actor.flags?.[MODULE_ID]?.gildedShatterEnemyId === \"wreckbound-bosun\");",
  "  const deckhandActor = created.find((actor) => actor.flags?.[MODULE_ID]?.gildedShatterEnemyId === \"wreckbound-deckhand\");",
  "  if (bosunActor) await bosunActor.update({ \"prototypeToken.disposition\":-1, \"prototypeToken.name\":\"Gilded Wreckbound Bosun\", \"prototypeToken.bar1.attribute\":\"attributes.hp\" });",
  "  if (deckhandActor) await deckhandActor.update({ \"prototypeToken.disposition\":-1, \"prototypeToken.name\":\"Wreckbound Deckhand\", \"prototypeToken.bar1.attribute\":\"attributes.hp\" });",
  "  const summary = \"<article><h2>Gilded Shatter Enemies Built</h2><p><strong>Gilded Wreckbound Bosun</strong> — Level 7<br><strong>Wreckbound Deckhand</strong> — Level 4</p><p><strong>5 PCs:</strong> 1 Bosun + 2 Deckhands = 100 XP (Moderate).</p><p><strong>6 PCs:</strong> 1 Bosun + 3 Deckhands = 120 XP (Moderate).</p><p>The Actor templates are in the <strong>\" + FOLDER_NAME + \"</strong> folder. Drag the Bosun once and the Deckhand the appropriate number of times onto the Weather Deck. Keep them hidden until the first major Dark Star Pulse.</p></article>\";",
  "  await ChatMessage.create({ speaker:ChatMessage.getSpeaker(), content:summary });",
  "  ui.notifications?.info?.(\"Gilded Shatter Wreckbound enemies built.\");",
  "}"
].join("\n");

export const GILDED_SHATTER_WEATHER_DECK_GUIDE = Object.freeze({
  id: "gilded-shatter-weather-deck",
  level: 6,
  baseDC: 22,
  journals: Object.freeze([
    Object.freeze({
      id: "gilded-shatter-gm-setup-weather-deck",
      name: "Gilded Shatter — GM Setup: Weather Deck",
      pages: Object.freeze([
        p("Adventure Purpose", `
          <h1>The Gilded Shatter: Weather Deck</h1>
          <p><strong>Level:</strong> 6. <strong>Mode:</strong> normal PF2e exploration and encounter play after the Arkflight boarding Event.</p>
          <p>This deck is the first place the PCs physically enter the wreck. The scene should begin with investigation, teach the players that the gold is still spreading, escalate with a Dark Star pulse, and then point them deeper into the ship.</p>
          <h2>Core sequence</h2>
          <ol><li>Resolve the party's boarding result and place them at the matching entry point.</li><li>Give them a few minutes to inspect the deck and discover the first signs of active transmutation.</li><li>Reveal the partially gilded dead and establish that flesh, cloth, rope, wood, and iron are all being rewritten.</li><li>Trigger the first Dark Star Pulse. The pulse activates or expands gilded zones.</li><li>After the pulse, the direction of the blue-white energy clearly points below decks.</li></ol>
          <p><strong>Do not gate progression behind one successful skill check.</strong> Failed checks change how much the PCs understand, not whether they can continue.</p>
        `),
        p("Boarding Result → Entry Point", `
          <h1>Boarding Result → Weather Deck Entry</h1>
          <table><thead><tr><th>Leg 1 Result</th><th>Entry</th><th>Starting Advantage / Problem</th></tr></thead><tbody>
          <tr><td><strong>Critical Success</strong></td><td>Intact port-side rail / stable weather-deck breach.</td><td>Secure return corridor and an obvious useful route inward.</td></tr>
          <tr><td><strong>Success</strong></td><td>Port-side or central deck.</td><td>Secure marked return corridor to the Rum Runner.</td></tr>
          <tr><td><strong>Failure</strong></td><td>Exposed central/starboard approach.</td><td>Loose debris and spreading gold complicate the return route.</td></tr>
          <tr><td><strong>Critical Failure</strong></td><td>Nearest viable starboard breach in the damaged gilded side.</td><td>The PCs begin close to an active gilded zone and the Rum Runner is holding an ugly position.</td></tr>
          </tbody></table>
          <p>Use these as placement guidance rather than rigid squares. The important point is that the Arkflight boarding result visibly changes the PF2e starting situation.</p>
        `),
        p("Map Prep Checklist", `
          <h1>Weather Deck Map Prep</h1>
          <ul>
            <li>Use the weather-deck map with bow at the top and stern at the bottom.</li>
            <li>Mark at least <strong>four gilded zones</strong> along the damaged starboard side. Keep one or two dormant at the start so the pulse has somewhere visible to spread.</li>
            <li>Mark the party's boarding point according to the Leg 1 result.</li>
            <li>Mark the hatch/stair route that leads below. Do not make it the first thing the PCs notice.</li>
            <li>Place one partially gilded corpse or obvious crew remnant where it can be discovered after the first round of investigation.</li>
            <li>Keep the Rum Runner's return point visible in the fiction even if it is off-map.</li>
          </ul>
          <p><strong>Suggested final map filename:</strong> <code>assets/art/events/gilded-shatter/scenes/02-wreck-exploration/weather-deck.webp</code></p>
        `)
      ])
    }),
    Object.freeze({
      id: "gilded-shatter-weather-deck-vignettes",
      name: "Gilded Shatter — Weather Deck Vignettes & Handouts",
      pages: Object.freeze([
        p("Arrival — Read Aloud", `
          <h1>Arrival on the Wreck</h1>
          <blockquote>The boarding line shudders behind you as your boots strike dead timber. Up close, the wreck is quieter than it looked from the Rum Runner—no wind, no surf, only the groan of loaded rope and the slow complaint of a hull being pulled somewhere it does not want to go. Gold runs through the deck in thin branching veins, bright enough to catch the starlight, and several of those veins end in raw wood as if they are still growing. Somewhere below your feet, something answers the Dark Star with a faint blue-white pulse.</blockquote>
          <p>Pause after reading. Let the players choose what they investigate first.</p>
        `),
        p("Discovery — The Gold Is Growing", `
          <h1>The Gold Is Growing</h1>
          <blockquote>A brass hinge near the rail changes while you watch. The yellow color does not spread across its surface like heat or rust; it moves through the metal itself. The transformation reaches the nail, then the timber around it, and a hair-thin golden branch crawls another inch through the deck before stopping.</blockquote>
          <p>This is the first hard confirmation that the gold is <strong>new transmutation</strong>, not cargo or treasure left aboard.</p>
        `),
        p("Discovery — The Gilded Dead", `
          <h1>The Gilded Dead</h1>
          <blockquote>The body is still dressed like a sailor, but one arm is wrong. Cloth, skin, buckle, and bone have all become the same heavy metal without losing their shape. The change ends halfway across the chest in a jagged branching line. There is no seam where flesh stops and gold begins.</blockquote>
          <p>Do not require a check to understand that living matter can be affected. Medicine or magical skills can reveal more, but the horror itself is obvious.</p>
        `),
        p("First Pulse — Read Aloud", `
          <h1>The First Dark Star Pulse</h1>
          <blockquote>Blue-white light flashes through the cracks below as though someone has opened an eye inside the ship. The deck gives one deep metallic groan. Every golden vein around you brightens a heartbeat later, and new branches race through timber, iron, and rope before freezing in place. For an instant the whole wreck seems to pull sideways beneath your feet—and then the light continues downward, deeper into the ship.</blockquote>
          <p>Run the <strong>Gilded Shatter — Dark Star Pulse</strong> macro when this happens.</p>
        `),
        p("Player Handout — The Gold Is Moving", `
          <h1>The Gold Is Moving</h1>
          <p>The gold aboard this wreck is not stored wealth. It is replacing the ship.</p>
          <p>You have watched ordinary timber and iron transform in real time. The same branching pattern appears in rope, fittings, and the remains of the crew. Whatever is causing it is still active.</p>
        `, true),
        p("Player Handout — The Pulse Below", `
          <h1>The Pulse Below</h1>
          <p>Each blue-white pulse arrives from somewhere below the weather deck. The gold responds a heartbeat later.</p>
          <p>The source is deeper in the wreck.</p>
        `, true)
      ])
    }),
    Object.freeze({
      id: "gilded-shatter-weather-deck-investigation",
      name: "Gilded Shatter — Weather Deck Investigation",
      pages: Object.freeze([
        p("Clue Ladder", `
          <h1>Investigation: Three Truths</h1>
          <p>The weather deck should reveal three truths in order. Checks improve precision, not access.</p>
          <ol>
            <li><strong>The gold is fresh.</strong> It is actively replacing existing matter.</li>
            <li><strong>The effect can cross materials and living tissue.</strong> Wood, iron, rope, cloth, and bodies all show the same branching boundary.</li>
            <li><strong>The pulses and the transmutation are connected.</strong> Blue-white energy rises from below; the gold reacts immediately afterward.</li>
          </ol>
          <p>Once the PCs have the third truth, the adventure naturally points below decks.</p>
        `),
        p("PF2e Checks", `
          <h1>Useful PF2e Checks</h1>
          <p><strong>Base DC 22.</strong> Use easier or harder adjustments only when the fiction supports it.</p>
          <dl>
            <dt><strong>Arcana or Occultism</strong></dt><dd>Identify the gold as ongoing magical transmutation and recognize that the blue-white pulse is the trigger or carrier.</dd>
            <dt><strong>Crafting</strong></dt><dd>Recognize that the wreck is becoming drastically heavier and structurally brittle. This explains the violent changes in drift and the loaded boarding lines.</dd>
            <dt><strong>Medicine</strong></dt><dd>Confirm that the gilded crew were transformed rather than coated. On a critical success, the PC can tell the transformation propagated through clothing and flesh at the same instant.</dd>
            <dt><strong>Perception</strong></dt><dd>Trace the strongest pulse path to a hatch, stair, ruptured shaft, or deck seam leading below.</dd>
            <dt><strong>Survival</strong></dt><dd>Read the debris drift and deck deformation well enough to identify which portions of the weather deck are least likely to tear away during the next pulse.</dd>
          </dl>
        `),
        p("Degrees of Information", `
          <h1>Degrees of Information</h1>
          <ul>
            <li><strong>Critical Success:</strong> Reveal the clue plus one actionable advantage: safe route, pulse warning, stable square, or shortcut.</li>
            <li><strong>Success:</strong> Reveal the intended clue clearly.</li>
            <li><strong>Failure:</strong> Reveal the clue incompletely, but attach a cost or uncertainty. Do not stop progression.</li>
            <li><strong>Critical Failure:</strong> Give a dangerous false assumption only if it can be corrected quickly by the next pulse or another clue. Never use it to send the party away from the adventure.</li>
          </ul>
        `)
      ])
    }),
    Object.freeze({
      id: "gilded-shatter-dark-star-pulse",
      name: "Gilded Shatter — Dark Star Pulse Hazard",
      pages: Object.freeze([
        p("Hazard Rules", `
          <h1>Dark Star Transmutation Pulse</h1>
          <p><strong>Level 6 environmental hazard.</strong> The pulse is not meant to petrify a PC or end the adventure. It makes the spreading gold tactically important and turns the map itself into an escalating threat.</p>
          <h2>Gilded Zones</h2>
          <p>Mark several areas of visible gold on the weather deck. An <strong>active gilded zone</strong> is difficult terrain. At each pulse, activate one new zone or visibly expand an existing one.</p>
          <h2>Pulse Save</h2>
          <p>When a pulse occurs, every creature standing in an active gilded zone or directly touching fresh transmutation attempts a <strong>DC 22 Fortitude save</strong>.</p>
          <ul>
            <li><strong>Critical Success:</strong> No effect.</li>
            <li><strong>Success:</strong> No effect.</li>
            <li><strong>Failure:</strong> 2d6 force damage and clumsy 1 until the end of the creature's next turn.</li>
            <li><strong>Critical Failure:</strong> 4d6 force damage and slowed 1 until the end of the creature's next turn.</li>
          </ul>
          <p>The visual effect can be gold crawling briefly over armor, boots, skin, or equipment before cracking away. Do not permanently transform a PC unless the table deliberately chooses to escalate the adventure in that direction.</p>
        `),
        p("Timing & Counterplay", `
          <h1>When to Pulse</h1>
          <p><strong>Exploration:</strong> trigger pulses at authored beats, not on a real-world timer. Good moments are after the first major clue, when a PC touches fresh gold, and immediately before the party commits to going below.</p>
          <p><strong>Combat:</strong> if a fight begins on the weather deck, trigger a pulse on initiative 10 every third round, beginning in round 3. This makes the danger predictable enough for players to plan around.</p>
          <h2>Disrupt a Vein — 2 actions</h2>
          <p>A creature adjacent to an active gilded zone can attempt <strong>Crafting or Arcana DC 22</strong> to break, ground, or interrupt the branching transmutation.</p>
          <ul><li><strong>Critical Success:</strong> that zone is suppressed for the rest of the scene.</li><li><strong>Success:</strong> that zone is suppressed until after the next pulse.</li><li><strong>Failure:</strong> no effect.</li><li><strong>Critical Failure:</strong> the attempt agitates the vein; the creature is treated as touching fresh transmutation during the next pulse.</li></ul>
        `),
        p("Macro Instructions", `
          <h1>Using the Pulse Macro</h1>
          <ol>
            <li>Select any PC tokens currently standing in an active gilded zone.</li>
            <li>Run <strong>Gilded Shatter — Dark Star Pulse</strong> from the Arkflight GM Macros compendium.</li>
            <li>The macro increments the scene's pulse counter, posts the complete hazard reminder to chat, and attempts DC 22 Fortitude rolls for the selected tokens.</li>
            <li>Apply damage and temporary conditions manually according to the degree of success.</li>
            <li>Activate or expand one gilded zone on the map.</li>
          </ol>
          <p>Use <strong>Gilded Shatter — Reset Dark Star Pulses</strong> when resetting or rerunning the scene.</p>
        `)
      ])
    }),
    Object.freeze({
      id: "gilded-shatter-weather-deck-flow",
      name: "Gilded Shatter — Running the Weather Deck",
      pages: Object.freeze([
        p("Scene Flow", `
          <h1>Recommended Scene Flow</h1>
          <ol>
            <li><strong>Arrival:</strong> read the boarding vignette and place the party according to the Arkflight result.</li>
            <li><strong>Free investigation:</strong> let them inspect the gold, damage, corpse, boarding route, or hatches in any order.</li>
            <li><strong>First truth:</strong> establish that the gold is actively spreading.</li>
            <li><strong>Second truth:</strong> reveal that living matter was transformed too.</li>
            <li><strong>Pulse:</strong> trigger the Dark Star Pulse and activate a new gilded zone.</li>
            <li><strong>Optional combat:</strong> if you want a fight on this deck, trigger your chosen wreck threat now. The pulse hazard remains active during combat.</li>
            <li><strong>Direction below:</strong> after the pulse, make the blue-white trail unmistakably descend toward the lower decks.</li>
            <li><strong>Transition:</strong> the PCs choose when to leave the weather deck and descend.</li>
          </ol>
        `),
        p("Weather Deck Combat", `
          <h1>Weather Deck Combat: The Wreckbound</h1>
          <p>After the party has learned at least one truth about the spreading gold, use the first major Dark Star Pulse to wake the wreck's former deck crew.</p>
          <p><strong>Gilded Wreckbound Bosun — Level 7.</strong> The former bosun has been rewritten together with hooks, chain, rope, railings, and pieces of the ship. It controls position with Hook and Haul, commands Deckhands with Hold the Deck!, and reacts to Dark Star Pulses.</p>
          <p><strong>Wreckbound Deckhand — Level 4.</strong> These transformed sailors drag intruders toward active gilded zones and move with the pulse.</p>
          <h2>Encounter Size</h2>
          <ul><li><strong>5 level-6 PCs:</strong> 1 Bosun + 2 Deckhands = 100 XP, Moderate.</li><li><strong>6 level-6 PCs:</strong> 1 Bosun + 3 Deckhands = 120 XP, Moderate.</li></ul>
          <p>Run <strong>Gilded Shatter — Build Wreckbound Enemies</strong> from the GM Macros compendium to create fresh PF2e Actor templates. Drag the Bosun once and the Deckhand the appropriate number of times onto the Weather Deck, then hide them until the pulse reveal.</p>
        `),
        p("Descent Vignette", `
          <h1>Going Below</h1>
          <blockquote>The blue-white light does not fade when the pulse ends. A thin afterglow remains in the seams of the deck, running toward the nearest hatch like moonlight under a door. Below it, something vast clicks once, then answers with the low mechanical thrum of an Arkengine that should have died with the ship. Behind you, the boarding line to the Rum Runner pulls tight. Ahead, the glow descends into the wreck.</blockquote>
          <p>End the weather-deck scene here and move to the next mapped level.</p>
        `)
      ])
    })
  ]),
  macros: Object.freeze([
    Object.freeze({ id: "gilded-shatter-dark-star-pulse", name: "Gilded Shatter — Dark Star Pulse", command: PULSE_MACRO, img: "icons/svg/explosion.svg" }),
    Object.freeze({ id: "gilded-shatter-reset-dark-star-pulses", name: "Gilded Shatter — Reset Dark Star Pulses", command: RESET_PULSE_MACRO, img: "icons/svg/clockwork.svg" }),
    Object.freeze({ id: "gilded-shatter-build-wreckbound-enemies", name: "Gilded Shatter — Build Wreckbound Enemies", command: BUILD_ENEMIES_MACRO, img: "icons/svg/skull.svg" })
  ])
});
