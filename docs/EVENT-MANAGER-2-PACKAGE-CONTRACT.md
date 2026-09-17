# Arkflight Event Manager 2.0 — Content Package Contract

Event Manager 2.0 separates **Arkflight Core systems** from **adventure content**.

Arkflight Core owns:

- the Event Board and five-station resolution engine;
- persistent ship state, Strain, rewards, combat, and voyage services;
- content-package discovery and registration;
- package-owned world compendium synchronization;
- package progression state and launch controls.

A content package owns authored content:

- one or more Arkflight Event definitions;
- optional JournalEntry, Macro, RollTable, and Actor sources;
- adventure stages and progression labels;
- metadata, art, tags, requirements, and optional integrations.

## Registering a package

A companion module should register after Arkflight is initialized:

```js
Hooks.once("ready", () => {
  game.arkflight.content.registerPackage({
    id: "dead-planet-finale",
    title: "Escape From the Dead Planet",
    version: "1.0.0",
    category: "adventure-finale",
    recommendedLevel: 6,
    playerCount: "4-6",
    tags: ["boss", "ship-combat", "escape"],
    requirements: { system: "pf2e" },
    optionalModules: ["sequencer", "tagger", "monks-active-tiles"],
    content: {
      events: [DEAD_PLANET_ESCAPE_EVENT],
      journals: DEAD_PLANET_JOURNALS,
      macros: DEAD_PLANET_MACROS,
      tables: DEAD_PLANET_TABLES,
      actors: [VOID_DRAGON_SOURCE]
    },
    adventure: {
      entryPoint: "dead-planet-escape",
      stages: [
        { id: "launch", label: "Ignition", kind: "ship-event", eventId: "dead-planet-escape" },
        { id: "void-dragon", label: "Void Dragon", kind: "encounter" },
        { id: "escape", label: "Break the Gravity Well", kind: "finale" }
      ]
    }
  }, { source: "arkflight-dead-planet" });
});
```

## Managed document authoring

Entries may provide a full Foundry `data` source, or use the compact forms below.

### Journals

```js
{
  id: "gm-guide",
  name: "Dead Planet Finale — GM Guide",
  pages: [{ name: "Runbook", content: "<h1>...</h1>" }]
}
```

### Macros

```js
{ id: "start-finale", name: "Start Finale", command: "game.arkflight.content.launch('dead-planet-finale')" }
```

### Roll tables

```js
{
  id: "launch-complications",
  name: "Launch Complications",
  formula: "1d6",
  results: [{ range: [1, 1], text: "Levstone harmonic spike" }]
}
```

### Actors

Actor entries should provide `data` containing a valid system Actor source:

```js
{ id: "void-dragon", name: "Void Dragon", data: VOID_DRAGON_ACTOR_SOURCE }
```

## Progression

Package state is world-scoped and tracks:

- synced package version;
- generated compendium IDs;
- current adventure stage;
- completed stage IDs;
- package-defined flags reserved for later campaign-state work.

Use:

```js
await game.arkflight.content.setStage("dead-planet-finale", "void-dragon");
await game.arkflight.content.completeStage("dead-planet-finale", "void-dragon");
await game.arkflight.content.resetProgress("dead-planet-finale");
```


## Package-owned launch handlers

Not every Arkflight adventure stage is a five-station Event. A package may register a runtime launch handler for hybrid PF2e encounters, exploration packages, finales, or other custom flows:

```js
runtime: {
  launch: async ({ package: pkg, state, stage, shipReference }) => {
    return game.arkflight.deadPlanetFinale.openControlPanel();
  }
}
```

Event Manager 2.0 will expose **Open Adventure** for these packages. Event-backed stages continue to use the normal Arkflight Event Board.

## Vessel selection

Event Manager 2.0 always asks the GM to choose a commissioned Arkflight vessel before a normal package launch, even if only one vessel is available. It binds that Actor and passes it to runtime packages as `shipReference`.

Packages must not search for a campaign-specific vessel name. Automation that already has an Actor/UUID may explicitly provide `shipReference` to bypass the picker.

## Runtime API

- `game.arkflight.openEventManager()`
- `game.arkflight.chooseVoyageShip(options)`
- `game.arkflight.bindVoyageShip(shipReference, options)`
- `game.arkflight.content.registerPackage(definition, options)`
- `game.arkflight.content.unregisterPackage(id)`
- `game.arkflight.content.list()`
- `game.arkflight.content.get(id)`
- `game.arkflight.content.packageForEvent(eventId)`
- `game.arkflight.content.status(id)`
- `game.arkflight.content.state(id)`
- `game.arkflight.content.sync(id, { force })`
- `game.arkflight.content.launch(id, { eventId, shipReference })`
- `game.arkflight.content.openResource(id, kind)`
- `game.arkflight.content.setStage(id, stageId)`
- `game.arkflight.content.completeStage(id, stageId)`
- `game.arkflight.content.resetProgress(id, { preserveFlags })`

## Compatibility rule

The existing Event Board remains authoritative for station-based events. Event Manager 2.0 is the content/discovery/orchestration layer above it; packages do not reimplement the round engine.

## Authoring guide

For the complete workflow, conventions, testing standard, migration rules, and starter template, see [CONTENT-PACK-AUTHORING-GUIDE.md](CONTENT-PACK-AUTHORING-GUIDE.md).
