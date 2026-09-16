
# Arkflight Content Pack Authoring Guide

This is the working standard for building future Arkflight adventures, finales, encounters, expeditions, and reusable content packs for Foundry VTT.

**Arkflight Core provides systems. Content packs provide authored play. Event Manager 2.0 connects the two.**

## 1. Core vs. content

Put a feature in Arkflight Core when it is a reusable rule, service, or UI capability that many packs should be able to call. Put it in a content pack when it belongs to one adventure, boss, location, faction, expedition, or story.

Core examples: Event Manager, Event Board, Strain, Ship Conditions, ship combat APIs, Voyage, Shipwright, package synchronization.

Content examples: Gilded Shatter, Escape From the Dead Planet, a Great House adventure, a Void Dragon boss, a salvage expedition.

If a pack needs a generic capability Core does not have, add the smallest reusable capability to Core first. Do not build a private second version of an Arkflight subsystem inside the pack.

## 2. Choose the package model

### Event Board package

Use when the gameplay is an authored five-station Arkflight Event. The pack supplies Event definitions and Event Manager launches them through the normal Event Board.

Best for ship hazards, chases, boarding approaches, storms, travel crises, and station-driven encounters.

### Runtime adventure package

Use when the content is not primarily a five-station Event. Register a runtime launch handler. Event Manager shows Open Adventure and the package owns its GM controls.

Best for PF2e boss fights, exploration, dungeon or wreck sequences, complex finales, and custom controllers.

### Hybrid package

Use when an adventure combines both. A common pattern is:

Approach with Event Board -> PF2e exploration -> PF2e boss -> Arkflight escape/finale.

This is the preferred model for full Arkflight adventures.

## 3. Recommended module structure

~~~text
arkflight-example-adventure/
|
|-- module.json
|-- README.md
|-- scripts/
|   |-- package.js
|   |-- content/
|   |   |-- journals.js
|   |   |-- macros.js
|   |   |-- tables.js
|   |   |-- actors.js
|   |   +-- events.js
|   +-- runtime/
|       +-- adventure-runtime.js
|-- styles/
|   +-- package.css
|-- assets/
|   |-- art/
|   |-- tokens/
|   |-- maps/
|   +-- audio/
|-- docs/
|   |-- GM-GUIDE.md
|   +-- PACKAGE-CONTENTS.md
+-- tests/
    +-- validate.mjs
~~~

Small packs may keep authored content in one script. Split only when it improves maintainability.

## 4. Foundry module.json

A normal external Arkflight pack should require PF2e and Arkflight.

~~~json
{
  "id": "arkflight-example-adventure",
  "title": "Arkflight — Example Adventure",
  "description": "Example Event Manager 2.0 adventure package.",
  "version": "0.1.0",
  "authors": [{ "name": "Arkflight" }],
  "compatibility": {
    "minimum": "14",
    "verified": "14"
  },
  "relationships": {
    "systems": [
      { "id": "pf2e", "type": "system" }
    ],
    "requires": [
      { "id": "arkflight-game", "type": "module" }
    ]
  },
  "esmodules": ["scripts/package.js"],
  "styles": ["styles/package.css"]
}
~~~

The Foundry module ID and Event Manager package ID may differ, but both should be treated as permanent once released.

## 5. Register with Event Manager 2.0

Use the public package API.

~~~js
const MODULE_ID = "arkflight-example-adventure";
const PACKAGE_ID = "example-adventure";

async function registerContentPack() {
  const content = game.arkflight?.content;

  if (!content?.registerPackage) {
    throw new Error("Arkflight Event Manager 2.0 is unavailable.");
  }

  if (!content.get(PACKAGE_ID)) {
    content.registerPackage(buildPackageDefinition(), {
      source: MODULE_ID
    });
  }

  if (game.user?.isGM) {
    await content.sync(PACKAGE_ID);
  }
}

Hooks.once("ready", async () => {
  try {
    await registerContentPack();
  } catch (error) {
    console.error("Arkflight | Content pack registration failed", error);
    ui.notifications?.error?.(error.message);
  }
});
~~~

Do not mutate Arkflight package registries or private settings directly.

## 6. Package definition

~~~js
function buildPackageDefinition() {
  return {
    id: "example-adventure",
    title: "The Example Adventure",
    version: "0.1.0",
    description: "A short Arkflight adventure.",
    author: "Arkflight",
    category: "adventure",
    image: "modules/arkflight-example-adventure/assets/art/cover.webp",
    recommendedLevel: 6,
    playerCount: "4-6",
    duration: "1-2 sessions",
    tags: ["ship-event", "exploration", "boss"],

    requirements: {
      system: "pf2e",
      core: ">=0.1.0",
      modules: []
    },

    optionalModules: [
      "sequencer",
      "tagger",
      "monks-active-tiles"
    ],

    content: {
      events: [],
      journals: [],
      macros: [],
      tables: [],
      actors: [],
      scenes: []
    },

    adventure: {
      stages: [
        { id: "approach", label: "Approach", kind: "ship-event" },
        { id: "exploration", label: "Explore", kind: "exploration" },
        { id: "boss", label: "Boss", kind: "encounter" },
        { id: "escape", label: "Escape", kind: "finale" }
      ]
    },

    runtime: {
      launch: async ({ state, stage, shipReference }) => {
        return openAdventureForStage(state, stage, shipReference);
      }
    }
  };
}
~~~

Keep package IDs, stage IDs, Event IDs, and managed document source IDs stable after release. Labels can change; persistence IDs should not.

## 7. Metadata and versioning

Use lowercase letters, numbers, and hyphens for package and stage IDs.

Use semantic versioning:

- PATCH for safe corrections, prose, art, balance, or bug fixes.
- MINOR for backwards-compatible content or stage additions.
- MAJOR for incompatible progression/state changes.

Useful categories include ship-event, adventure, adventure-finale, expedition, encounter-pack, salvage, and campaign. Categories and tags are descriptive, not hidden rules.

## 8. Requirements and optional modules

Use requirements.modules only when the pack truly cannot function without another module.

Use optionalModules for presentation enhancements such as Sequencer, Tagger, Monk's Active Tile Triggers, and JB2A.

A pack must remain mechanically playable when optional integrations are absent.

## 9. Adventure stages

Stages are the GM-facing progression model.

Each stage can define:

- id: stable machine ID.
- label: GM-facing name.
- kind: descriptive stage type.
- eventId: optional Event Board Event.
- description: optional GM guidance.
- optional: whether the stage is skippable.

Recommended kind vocabulary: ship-event, encounter, exploration, expedition, investigation, salvage, downtime, finale, ending.

Stage kind does not currently assign mechanics automatically.

## 10. Event Board stages

If a stage uses the five-station Event Board, declare the Event under content.events and put its ID in the stage.

~~~js
content: {
  events: [MY_SHIP_EVENT]
},

adventure: {
  entryPoint: MY_SHIP_EVENT.id,
  stages: [
    {
      id: "storm-run",
      label: "Run the Storm",
      kind: "ship-event",
      eventId: MY_SHIP_EVENT.id
    }
  ]
}
~~~

Do not reimplement station assignment, planning, Risk Bids, round scoring, Momentum, or Event Board resolution inside the pack.

## 11. Runtime launch

Hybrid and non-Event packs may register a package-level runtime launch handler.

~~~js
runtime: {
  launch: async ({ package: pkg, state, stage, shipReference }) => {
    return openMyPackageController({
      pkg,
      state,
      stage,
      shipReference
    });
  }
}
~~~

Important: runtime.launch is package-level, not a separate function for every stage. Inspect stage.id or state.currentStageId and dispatch appropriately.

~~~js
async function openAdventureForStage(state, stage) {
  switch (stage?.id) {
    case "approach":
      return openApproachControls();
    case "exploration":
      return openExplorationGuide();
    case "boss":
      return openBossControls();
    case "escape":
      return openEscapeControls();
    default:
      return openGMGuide();
  }
}
~~~

## 12. Managed Journals

~~~js
{
  id: "gm-guide",
  name: "Example Adventure — GM Guide",
  pages: [
    {
      name: "Overview",
      content: "<h1>Example Adventure</h1><p>...</p>"
    }
  ]
}
~~~

Prefer useful multi-page GM Journals over dozens of tiny entries.

## 13. Managed Macros

~~~js
{
  id: "open-control-panel",
  name: "Example — Control Panel",
  command: "game.arkflight.exampleAdventure.openControlPanel();"
}
~~~

Macros should be thin wrappers around a public package runtime. Do not hide a second 200-line runtime inside a macro.

## 14. Managed RollTables

~~~js
{
  id: "ship-crisis",
  name: "Example — Ship Crisis",
  formula: "1d6",
  results: [
    { range: [1, 1], text: "The Lifeveil flickers." },
    { range: [2, 2], text: "A pressure line ruptures." }
  ]
}
~~~

Use tables where uncertainty improves play, not for every scripted beat.

## 15. Managed Actors

PF2e Actors should supply a valid PF2e Actor source through data.

~~~js
{
  id: "example-boss",
  name: "Example Boss",
  data: EXAMPLE_BOSS_SOURCE
}
~~~

Core creates managed Actor compendiums with the active system attached.

If the pack creates a live world Actor, document whether updates preserve HP/combat state.

## 16. Scenes

The package schema reserves content.scenes, but Event Manager 2.0 does **not yet synchronize Scene documents**.

Do not assume a Scene placed in content.scenes will install.

For now either:

1. ship the Scene through normal Foundry module compendium declarations; or
2. create/configure the Scene explicitly in package runtime.

Update this guide when managed Scene sync becomes a Core feature.

## 17. Assets

Use module-relative paths such as:

modules/arkflight-example-adventure/assets/...

Recommended rules:

- WebP for most raster art.
- Alpha preserved for tokens, overlays, and icons.
- Lowercase hyphenated filenames.
- Essential assets local to the module.
- Optional modules detected before their assets/APIs are referenced.
- Adventure art remains separate from Arkflight Core system assets.

## 18. Progression API

Read state:

~~~js
const state = game.arkflight.content.state("example-adventure");
~~~

Change stage:

~~~js
await game.arkflight.content.setStage(
  "example-adventure",
  "boss"
);
~~~

Complete stage:

~~~js
await game.arkflight.content.completeStage(
  "example-adventure",
  "boss"
);
~~~

Reset progression:

~~~js
await game.arkflight.content.resetProgress(
  "example-adventure"
);
~~~

For Event-backed stages, completeStage only closes an active Event after that Event reaches event-complete.

## 19. Package-specific state

Event Manager progression is not a replacement for every adventure variable.

Store boss phase, launch progress, clues, spawned IDs, one-time vignette flags, and similar data in package-owned settings or document flags.

Mirror the broad adventure stage into Event Manager using public APIs.

Do not write directly into Arkflight's private contentPackageState setting.

## 20. Synchronization ownership

Core-managed Journals, Macros, RollTables, and Actors receive Arkflight ownership metadata containing managed status, package ID, source ID, and source hash.

Rules:

- Keep managed source IDs stable.
- Never rewrite Core's management flag.
- Never wipe an entire compendium for a normal update.
- Never delete documents unless ownership is positively identified.
- Migrations must target only the package's legacy content.
- Sync must be safe to rerun.

## 21. Core sync vs. package runtime

Use Core sync for static authored documents: Journals, Macros, RollTables, Actors.

Use runtime for active state: spawning tokens, starting encounters, changing ships, playing optional VFX, updating stage progress, manipulating tiles, and opening custom GM controls.

## 22. Public package API

Complex packs should expose a small runtime surface.

~~~js
game.arkflight.exampleAdventure = Object.freeze({
  openControlPanel,
  start,
  reset,
  status,
  spawnBoss,
  sync: syncPackage
});
~~~

This keeps macros small and provides one authoritative entry point for debugging and integrations.

## 23. Vessel selection contract

Event Manager 2.0 owns vessel selection for content-pack launches.

When the GM clicks **Launch Event** or **Open Adventure**, Event Manager must always show the commissioned-vessel picker, even when only one valid vessel exists. The selected Actor is then bound as the active Voyage ship and passed to the package runtime as `shipReference`.

A package must:

- use the Actor supplied through `shipReference` or Arkflight's bound active ship;
- never search for a campaign-specific vessel name;
- never silently guess a ship from a hardcoded name;
- never auto-select the only ship as a substitute for the Event Manager picker.

Programmatic automation may intentionally bypass the picker by supplying an explicit Actor/UUID:

~~~js
await game.arkflight.content.launch("example-adventure", {
  shipReference: shipActor
});

await game.arkflight.openEvent("example-event", shipActor);
~~~

The Event Manager UI itself does not use that bypass; normal GM launches always ask which vessel to use.

## 24. Ship integration

Call Arkflight Core for reusable ship rules.

Do not copy Strain rules, Ship Condition degradation, weapon legality, ownership/authority logic, Voyage ship selection, Event Board state, or ship resource math.

Example boundary:

Core resolves gaining Strain and degradation.
The pack decides that a Void Dragon attack causes 2 Strain.

## 25. Optional automation

Optional visual modules should enhance presentation, not own mechanics.

~~~js
function hasModule(id) {
  return Boolean(game.modules?.get(id)?.active);
}

async function playOptionalEffect() {
  if (!hasModule("sequencer")) return false;

  // Visual-only enhancement.

  return true;
}
~~~

The mechanical result still needs to be visible through standard Arkflight/Foundry UI.

## 26. Narrative vignettes

Use vignettes for important transitions: opening, phase change, boss reveal, escape threshold, and ending.

Keep cinematic text separate from required mechanical instructions.

## 27. Migration rules

When updating an existing pack:

1. Preserve package ID.
2. Preserve stage IDs when they represent the same stage.
3. Preserve managed source IDs.
4. Migrate old state once.
5. Delete only content positively owned by the old package.
6. Let Event Manager create/update managed documents.
7. Test an upgrade from the previous released version.

Never solve migration by deleting unrelated world content.

## 28. Testing standard

Every external pack should ship a validator.

At minimum validate:

- module.json parses.
- module and package versions agree.
- package/stage/source IDs are valid and unique.
- required scripts exist.
- JavaScript syntax passes.
- Event Manager registration exists.
- no old standalone compendium installer still executes.
- runtime launch exists when no Event Board entry point exists.
- optional integrations are guarded.
- installation instructions match the actual folder.
- expected content counts are preserved for important packs.

Test clean install, resync, Foundry restart, reset/replay, upgrade from previous version, and behavior with optional modules disabled.

## 29. Development workflow

1. Write the package pitch: level, session count, fantasy, beginning, ending.
2. Define stages before automation.
3. Classify each stage as Event Board, encounter, exploration, runtime, or journal-guided.
4. Author static content.
5. Add only the custom runtime actually needed.
6. Wire real gameplay transitions to Event Manager progression.
7. Add optional VFX integrations last.
8. Test clean install, upgrade, replay, and missing optional modules.

## 30. Release checklist

Before release verify:

- IDs are final and stable.
- module.json requires PF2e and Arkflight.
- requirements.core matches the APIs used.
- Event Manager can open the package.
- Sync Content is rerunnable.
- stages advance from real gameplay.
- reset works.
- macros call public APIs.
- Actors are valid PF2e sources.
- optional modules remain optional.
- migrations are package-scoped.
- README installation instructions are accurate.
- validator passes.
- any required Arkflight Core change passes full Core CI.

See CONTENT-PACK-RELEASE-CHECKLIST.md for the short checkbox version.

## 31. Anti-patterns

Do not build another package manager.

Do not build another Strain engine.

Do not put the whole runtime in a Macro.

Do not force every adventure into the Event Board.

Do not make VFX modules mandatory for core mechanics.

Do not rename persistence IDs because wording changed.

Do not wipe compendiums for updates.

Do not write to Core private settings.

## 32. Reference implementation

Escape From the Dead Planet v0.2.0 is the first full external Event Manager 2.0 reference package.

It demonstrates hybrid runtime finale structure, managed Journals/Macros/RollTables/PF2e Actor content, package-owned GM controls, Arkflight ship-system consequences, stage mirroring, optional module hooks, migration, reset, and static validation.

Copy its architecture, not its adventure-specific rules.

## 33. Current public API

~~~text
game.arkflight.openEventManager()

game.arkflight.content.registerPackage(definition, options)
game.arkflight.content.unregisterPackage(packageId)

game.arkflight.content.list()
game.arkflight.content.get(packageId)
game.arkflight.content.source(packageId)
game.arkflight.content.packageForEvent(eventId)

game.arkflight.content.status(packageId)
game.arkflight.content.state(packageId)

game.arkflight.content.sync(packageId, { force })
game.arkflight.content.launch(packageId, { eventId, shipReference })

game.arkflight.content.openResource(packageId, kind)

game.arkflight.content.setStage(packageId, stageId)
game.arkflight.content.completeStage(packageId, stageId)
game.arkflight.content.resetProgress(packageId, { preserveFlags })

game.arkflight.content.onChange(callback)
~~~

Treat this as the supported package surface. If a pack needs a generic operation not represented here, extend Core deliberately instead of reaching into Event Manager internals.

## 34. Definition of Done

An Arkflight content pack is done when a GM can:

**install it -> enable it -> open Event Manager -> understand it -> sync it -> launch it -> run it -> see progression -> complete it -> reset/replay it**

without editing source files, pasting setup scripts into the console, or knowing how the pack is implemented.
