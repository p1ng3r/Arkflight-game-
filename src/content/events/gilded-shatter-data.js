export const GILDED_SHATTER_ROUND_DATA = Object.freeze([
  Object.freeze({
    title: "Close on the Wreck",
    situation: "The Rum Runner commits to the dead galleon's drift while the Dark Star begins pulling both vessels along slightly different lines.",
    opening: "The gilded wreck hangs ahead with its broken weather deck turned toward open void. Loose spars, shattered planking, and bright flakes of newborn gold drift between the two ships while the Dark Star tugs every fragment along a slightly different path. The Rum Runner must enter that moving field without surrendering the ability to break away. Across every station, the first problem is the same: get close enough to board without letting the wreck or the gravity maw choose the approach for you.",
    actions: Object.freeze({
      captain: Object.freeze([
        { id: "call-the-approach", name: "Call the Approach", desc: "Set one clear approach plan so every station works toward the same closing vector instead of correcting independently.", skills: [["Diplomacy","diplomacy"],["Society","society"]], risk: [{t:2,b:"aid-next-1"},{t:5,b:"order-swap"},{t:8,b:"crew-surge"}] },
        { id: "read-the-crew", name: "Read the Crew", desc: "Watch the officers and deck crews for hesitation, overcorrection, or panic before the Dark Star turns uncertainty into a mistake.", skills: [["Perception","perception"],["Diplomacy","diplomacy"]], risk: [] },
        { id: "set-the-abort-line", name: "Set the Abort Line", desc: "Define exactly when the approach stops being salvage and becomes survival, giving the crew a shared breakaway threshold.", skills: [["Society","society"],["Intimidation","intimidation"]], risk: [{t:2,b:"hazard-reveal-1"},{t:5,b:"failure-softener"},{t:8,b:"disaster-buffer"}] }
      ]),
      engineer: Object.freeze([
        { id: "match-the-dark-pull", name: "Match the Dark Pull", desc: "Tune the Arkengine against the Dark Star's uneven drag so the Rum Runner closes without surging past the wreck.", skills: [["Crafting","crafting"],["Arcana","arcana"]], risk: [{t:2,b:"arkengine-vent"},{t:5,b:"arkengine-overdrive"},{t:8,b:"arkengine-master"}] },
        { id: "listen-through-the-hull", name: "Listen Through the Hull", desc: "Read vibration through the frame and engine mounts to judge when the ship is loading against the gravity shear.", skills: [["Crafting","crafting"],["Perception","perception"]], risk: [] },
        { id: "bank-reserve-thrust", name: "Bank Reserve Thrust", desc: "Hold power in reserve for the instant the wreck rolls or the Dark Star tightens its grip on the approach.", skills: [["Crafting","crafting"],["Athletics","athletics"]], risk: [{t:2,b:"pressure-guard-1"},{t:5,b:"pressure-guard-2"},{t:8,b:"pressure-guard-3"}] }
      ]),
      navigator: Object.freeze([
        { id: "find-the-quiet-pocket", name: "Find the Quiet Pocket", desc: "Use the wreck's debris drift to identify a temporary pocket where both ships are being pulled along nearly the same vector.", skills: [["Survival","survival"],["Nature","nature"]], risk: [{t:2,b:"dc-next-1"},{t:5,b:"order-followup"},{t:8,b:"degree-lift"}] },
        { id: "read-the-debris-drift", name: "Read the Debris Drift", desc: "Track loose wreckage as natural markers for the Dark Star's changing pull and the dead ship's rotation.", skills: [["Perception","perception"],["Survival","survival"]], risk: [] },
        { id: "cut-across-the-shear", name: "Cut Across the Shear", desc: "Take a narrower crossing line that reaches the wreck sooner but demands precise timing through the moving debris field.", skills: [["Nature","nature"],["Survival","survival"]], risk: [{t:2,b:"helm-line"},{t:5,b:"arkengine-overdrive"},{t:8,b:"degree-lift"}] }
      ]),
      battlewatch: Object.freeze([
        { id: "mark-falling-debris", name: "Mark Falling Debris", desc: "Call the dangerous fragments and collapsing spars before they cross the Rum Runner's approach lane.", skills: [["Perception","perception"],["Survival","survival"]], risk: [{t:2,b:"hazard-reveal-1"},{t:5,b:"hazard-turn-1"},{t:8,b:"hazard-remove-1"}] },
        { id: "blast-a-lane", name: "Blast a Lane", desc: "Coordinate a precise ship-weapon shot to shatter or deflect the largest debris before the helm must commit to the gap.", skills: [["Perception","perception"],["Crafting","crafting"]], risk: [{t:2,b:"weapons-opening"},{t:5,b:"hazard-opportunity"},{t:8,b:"crew-surge"}] },
        { id: "prepare-the-grapnels", name: "Prepare the Grapnels", desc: "Stage lines, grapnels, and winches now so the boarding crew is not improvising hardware once the ships are close.", skills: [["Athletics","athletics"],["Thievery","thievery"]], risk: [{t:2,b:"rigging-clear"},{t:5,b:"station-link-strong"},{t:8,b:"station-link-legend"}] }
      ]),
      veilwarden: Object.freeze([
        { id: "read-the-dark-pulse", name: "Read the Dark Pulse", desc: "Sense the rhythm of the Dark Star's blue-white pulses and warn the crew when the next aetheric surge is about to reach the wreck.", skills: [["Occultism","occultism"],["Arcana","arcana"]], risk: [{t:2,b:"hazard-reveal-1"},{t:5,b:"hazard-turn-1"},{t:8,b:"hazard-deny-risk"}] },
        { id: "brace-the-lifeveil", name: "Brace the Lifeveil", desc: "Thicken the Lifeveil around the approaching side of the ship before transformed debris and aetheric static begin striking it.", skills: [["Religion","religion"],["Occultism","occultism"]], risk: [{t:2,b:"lifeveil-steady"},{t:5,b:"lifeveil-ward"},{t:8,b:"lifeveil-miracle"}] },
        { id: "shelter-the-approach", name: "Shelter the Approach", desc: "Shape the veil into a broad protective shoulder that lets the helm hold its line through the first unstable drift.", skills: [["Occultism","occultism"],["Religion","religion"]], risk: [{t:2,b:"pressure-guard-1"},{t:5,b:"pressure-guard-2"},{t:8,b:"pressure-guard-3"}] }
      ])
    })
  }),
  Object.freeze({
    title: "Competing Vectors",
    situation: "Now close enough to touch the wreck, the Rum Runner and dead galleon begin sliding along competing Dark Star vectors while transformed debris accelerates between them.",
    opening: "The wreck is close enough now that individual gunports and snapped railings can be seen through the drifting gold. Then the Dark Star pulses, and the two ships begin sliding in different directions despite being only yards apart. Boarding lines thrown too early would become whips, while waiting too long risks losing the approach entirely. The crew must survive the shear, match the wreck's changing motion, and create a moment in which the two vessels move as one.",
    actions: Object.freeze({
      captain: Object.freeze([
        { id: "keep-one-rhythm", name: "Keep One Rhythm", desc: "Force the bridge, engine room, deck crews, and veil station to work from one timing count while the ships slide apart.", skills: [["Diplomacy","diplomacy"],["Intimidation","intimidation"]], risk: [{t:2,b:"aid-next-1"},{t:5,b:"order-swap"},{t:8,b:"crew-surge"}] },
        { id: "call-the-shear", name: "Call the Shear", desc: "Read the changing angle between the ships and announce each dangerous pull before a station commits into it.", skills: [["Society","society"],["Perception","perception"]], risk: [{t:2,b:"hazard-reveal-1"},{t:5,b:"hazard-turn-1"},{t:8,b:"hazard-remove-1"}] },
        { id: "commit-to-the-gap", name: "Commit to the Gap", desc: "Drive the crew through the brief safe window instead of letting caution cost the only clean moment to close.", skills: [["Intimidation","intimidation"],["Diplomacy","diplomacy"]], risk: [{t:2,b:"momentum-1"},{t:5,b:"momentum-2"},{t:8,b:"momentum-3"}] }
      ]),
      engineer: Object.freeze([
        { id: "ride-the-load", name: "Ride the Load", desc: "Let the Arkengine flex with the gravity shear rather than fighting every change and wasting power in corrections.", skills: [["Crafting","crafting"],["Arcana","arcana"]], risk: [{t:2,b:"pressure-guard-1"},{t:5,b:"pressure-guard-2"},{t:8,b:"pressure-guard-3"}] },
        { id: "bleed-the-surge", name: "Bleed the Surge", desc: "Vent excess drive pressure as the ships cross vectors so one sudden correction does not shock the whole vessel.", skills: [["Crafting","crafting"],["Arcana","arcana"]], risk: [{t:2,b:"arkengine-vent"},{t:5,b:"arkengine-overdrive"},{t:8,b:"arkengine-master"}] },
        { id: "rebalance-power", name: "Rebalance Power", desc: "Shift power between thrust, winches, and protective systems fast enough to answer whichever part of the approach loads next.", skills: [["Crafting","crafting"],["Athletics","athletics"]], risk: [{t:2,b:"aid-next-1"},{t:5,b:"order-followup"},{t:8,b:"crew-surge"}] }
      ]),
      navigator: Object.freeze([
        { id: "counter-the-vector", name: "Counter the Vector", desc: "Use the Rum Runner's own momentum to cancel the wreck's sideways slide instead of chasing it with repeated corrections.", skills: [["Survival","survival"],["Nature","nature"]], risk: [{t:2,b:"helm-line"},{t:5,b:"arkengine-overdrive"},{t:8,b:"degree-lift"}] },
        { id: "use-the-wrecks-roll", name: "Use the Wreck's Roll", desc: "Time the close approach to the derelict's rotation so its broken weather deck turns toward the boarding side.", skills: [["Nature","nature"],["Survival","survival"]], risk: [{t:2,b:"hazard-suppress-1"},{t:5,b:"hazard-suppress-2"},{t:8,b:"hazard-remove-1"}] },
        { id: "hold-the-boarding-side", name: "Hold the Boarding Side", desc: "Keep the same side of the Rum Runner presented to the wreck long enough for Battlewatch to stage the first lines.", skills: [["Survival","survival"],["Perception","perception"]], risk: [{t:2,b:"dc-next-1"},{t:5,b:"order-followup"},{t:8,b:"degree-lift"}] }
      ]),
      battlewatch: Object.freeze([
        { id: "track-the-falling-hull", name: "Track the Falling Hull", desc: "Watch the wreck itself for collapsing railings, spars, and gilded plates that may fall across the boarding lane.", skills: [["Perception","perception"],["Survival","survival"]], risk: [{t:2,b:"hazard-reveal-1"},{t:5,b:"hazard-turn-1"},{t:8,b:"hazard-remove-1"}] },
        { id: "fire-through-the-debris", name: "Fire Through the Debris", desc: "Use a controlled weapon shot to punch a temporary hole through debris without striking the wreck section the party needs.", skills: [["Perception","perception"],["Crafting","crafting"]], risk: [{t:2,b:"weapons-opening"},{t:5,b:"hazard-opportunity"},{t:8,b:"crew-surge"}] },
        { id: "rig-the-first-lines", name: "Rig the First Lines", desc: "Throw sacrificial guide lines across the gap so the final grapnels have references when the ships align.", skills: [["Athletics","athletics"],["Thievery","thievery"]], risk: [{t:2,b:"rigging-clear"},{t:5,b:"station-link-strong"},{t:8,b:"station-link-legend"}] }
      ]),
      veilwarden: Object.freeze([
        { id: "cage-the-shear", name: "Cage the Shear", desc: "Shape the Lifeveil against the lateral pull so exposed crew and loose boarding gear are not dragged toward the gap.", skills: [["Occultism","occultism"],["Religion","religion"]], risk: [{t:2,b:"lifeveil-steady"},{t:5,b:"lifeveil-ward"},{t:8,b:"lifeveil-miracle"}] },
        { id: "shield-the-line-crew", name: "Shield the Line Crew", desc: "Wrap the deck crews in a narrow veil while they work exposed at the rail through flying debris and aetheric discharge.", skills: [["Religion","religion"],["Medicine","medicine"]], risk: [{t:2,b:"pressure-guard-1"},{t:5,b:"crew-shield"},{t:8,b:"crew-surge"}] },
        { id: "break-the-resonance", name: "Break the Resonance", desc: "Disrupt the sympathetic pulse passing between the living Arkengine and the ruptured machinery somewhere inside the wreck.", skills: [["Occultism","occultism"],["Arcana","arcana"]], risk: [{t:2,b:"hazard-suppress-1"},{t:5,b:"hazard-suppress-2"},{t:8,b:"hazard-remove-1"}] }
      ])
    })
  }),
  Object.freeze({
    title: "Loaded Boarding Lines",
    situation: "The ships finally share a narrow movement window, but every grapnel and boarding line will load violently when the Dark Star pulses again.",
    opening: "For one impossible moment the Rum Runner and the wreck seem almost still beside one another. Grapnels bite into gilded timber, lines snap taut, and the first crossing boards slam across a gap that is already beginning to widen again. The Dark Star's next pulse is visible as blue-white light moving through the lower decks of the wreck toward the surface. The crew has only seconds to secure the corridor, get the boarding party physically onto the derelict, and leave the Rum Runner holding station behind them.",
    actions: Object.freeze({
      captain: Object.freeze([
        { id: "send-the-boarding-party", name: "Send the Boarding Party", desc: "Commit the PCs and boarding crew at the exact moment the crossing is most stable instead of waiting for a perfect window that will never come.", skills: [["Diplomacy","diplomacy"],["Intimidation","intimidation"]], risk: [{t:2,b:"order-shift-self"},{t:5,b:"order-swap"},{t:8,b:"crew-surge"}] },
        { id: "hold-the-crew-together", name: "Hold the Crew Together", desc: "Keep line crews, helm calls, and the boarding party synchronized while the loaded connections begin pulling both vessels together.", skills: [["Diplomacy","diplomacy"],["Intimidation","intimidation"]], risk: [{t:2,b:"aid-next-1"},{t:5,b:"station-link-strong"},{t:8,b:"station-link-legend"}] },
        { id: "name-the-return-point", name: "Name the Return Point", desc: "Mark one unmistakable place on the wreck as the party's return point before exploration carries them deeper below decks.", skills: [["Society","society"],["Survival","survival"]], risk: [{t:2,b:"hazard-reveal-1"},{t:5,b:"information-next-round"},{t:8,b:"narrative-breakthrough"}] }
      ]),
      engineer: Object.freeze([
        { id: "hold-station", name: "Hold Station", desc: "Keep the Arkengine producing exactly enough thrust to stay beside the wreck without tearing the loaded boarding lines free.", skills: [["Crafting","crafting"],["Arcana","arcana"]], risk: [{t:2,b:"arkengine-vent"},{t:5,b:"arkengine-overdrive"},{t:8,b:"arkengine-master"}] },
        { id: "take-the-line-shock", name: "Take the Line Shock", desc: "Bleed the first violent loads through winches and structural bracing instead of letting them hammer directly into the hull.", skills: [["Crafting","crafting"],["Athletics","athletics"]], risk: [{t:2,b:"pressure-guard-1"},{t:5,b:"pressure-guard-2"},{t:8,b:"pressure-guard-3"}] },
        { id: "feed-the-winches", name: "Feed the Winches", desc: "Give Battlewatch controlled mechanical power to tighten, slack, and retension the crossing as the gap changes underfoot.", skills: [["Crafting","crafting"],["Athletics","athletics"]], risk: [{t:2,b:"aid-next-1"},{t:5,b:"order-followup"},{t:8,b:"crew-surge"}] }
      ]),
      navigator: Object.freeze([
        { id: "freeze-the-relative-drift", name: "Freeze the Relative Drift", desc: "Hold the Rum Runner on the wreck's changing vector long enough for every PC to complete the crossing.", skills: [["Survival","survival"],["Nature","nature"]], risk: [{t:2,b:"helm-line"},{t:5,b:"arkengine-overdrive"},{t:8,b:"degree-lift"}] },
        { id: "choose-the-entry-breach", name: "Choose the Entry Breach", desc: "Select the safest useful opening in the weather deck so the party begins exploration from a defensible route rather than the nearest hole.", skills: [["Perception","perception"],["Survival","survival"]], risk: [{t:2,b:"information-choice"},{t:5,b:"dc-next-2"},{t:8,b:"narrative-breakthrough"}] },
        { id: "keep-the-return-vector", name: "Keep the Return Vector", desc: "Plot how the Rum Runner must drift while the party is aboard so the marked return point remains reachable later.", skills: [["Survival","survival"],["Society","society"]], risk: [{t:2,b:"mixed-softener"},{t:5,b:"failure-softener"},{t:8,b:"disaster-buffer"}] }
      ]),
      battlewatch: Object.freeze([
        { id: "throw-the-grapnels", name: "Throw the Grapnels", desc: "Set the final grapnels into structural timber that can survive the next gravity pulse instead of trusting decorative or gilded fittings.", skills: [["Athletics","athletics"],["Thievery","thievery"]], risk: [{t:2,b:"rigging-clear"},{t:5,b:"station-link-strong"},{t:8,b:"station-link-legend"}] },
        { id: "secure-the-crossing", name: "Secure the Crossing", desc: "Manage guide ropes, crossing boards, and deck crews so the PCs can move across even while the gap bucks beneath them.", skills: [["Athletics","athletics"],["Perception","perception"]], risk: [{t:2,b:"aid-next-1"},{t:5,b:"crew-shield"},{t:8,b:"crew-surge"}] },
        { id: "cut-down-falling-debris", name: "Cut Down Falling Debris", desc: "Call or fire on the pieces of the wreck that threaten to sweep across the boarding corridor during the crossing.", skills: [["Perception","perception"],["Crafting","crafting"]], risk: [{t:2,b:"hazard-suppress-1"},{t:5,b:"hazard-suppress-2"},{t:8,b:"hazard-remove-1"}] }
      ]),
      veilwarden: Object.freeze([
        { id: "open-the-veil-corridor", name: "Open the Veil Corridor", desc: "Extend a narrow protective corridor across the gap so the boarding party does not step directly into the Dark Star's aetheric wash.", skills: [["Occultism","occultism"],["Religion","religion"]], risk: [{t:2,b:"lifeveil-steady"},{t:5,b:"lifeveil-ward"},{t:8,b:"lifeveil-miracle"}] },
        { id: "shield-the-boarders", name: "Shield the Boarders", desc: "Hold protection around the PCs themselves while they cross loaded boards and snapping lines toward the wreck.", skills: [["Religion","religion"],["Medicine","medicine"]], risk: [{t:2,b:"pressure-guard-1"},{t:5,b:"crew-shield"},{t:8,b:"crew-surge"}] },
        { id: "seal-the-return-path", name: "Seal the Return Path", desc: "Anchor the Lifeveil to the marked return point so the crew has a recognizable protected route back to the Rum Runner.", skills: [["Occultism","occultism"],["Arcana","arcana"]], risk: [{t:2,b:"hazard-delay"},{t:5,b:"condition-suppress"},{t:8,b:"condition-stabilize"}] }
      ])
    })
  })
]);
