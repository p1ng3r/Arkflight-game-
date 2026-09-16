
# Arkflight Content Pack Release Checklist

Use this as the short pre-release companion to the full Content Pack Authoring Guide.

## Identity

- [ ] Foundry module ID is final.
- [ ] Event Manager package ID is final.
- [ ] Module and package versions match.
- [ ] Stage IDs are stable, lowercase, and hyphenated.
- [ ] Managed Journal/Macro/Table/Actor source IDs are stable and unique.

## Dependencies

- [ ] module.json requires PF2e.
- [ ] module.json requires arkflight-game.
- [ ] requirements.system is pf2e.
- [ ] requirements.core matches the newest Arkflight API the pack uses.
- [ ] Optional modules are listed under optionalModules unless truly mandatory.

## Architecture

- [ ] Core rules are called through Arkflight APIs rather than copied into the pack.
- [ ] Five-station gameplay uses the Event Board.
- [ ] Hybrid/non-Event gameplay uses runtime.launch.
- [ ] Package-specific state is owned by the package.
- [ ] Event Manager state changes only through public APIs.
- [ ] content.scenes is not assumed to auto-install Scenes.

## Managed content

- [ ] Journals synchronize.
- [ ] Macros are thin wrappers around public runtime functions.
- [ ] RollTables synchronize.
- [ ] PF2e Actor sources are valid.
- [ ] Sync Content can be rerun without duplicates.
- [ ] Legacy migration targets only documents owned by this package.

## Progression

- [ ] Event Manager opens the package.
- [ ] Current stage is meaningful.
- [ ] Gameplay actually advances stages.
- [ ] Event-backed stages reach event-complete before completeStage.
- [ ] Finale completion marks the package complete as intended.
- [ ] resetProgress and package reset behavior have been tested.

## Presentation

- [ ] GM Guide exists.
- [ ] First-launch instructions are clear.
- [ ] Essential mechanics do not depend on optional VFX modules.
- [ ] Asset paths are module-relative.
- [ ] Essential assets are local to the module.
- [ ] Vignettes and mechanical instructions are separated clearly.

## Validation

- [ ] module.json parses.
- [ ] JavaScript syntax checks pass.
- [ ] Package validator passes.
- [ ] Expected content counts pass.
- [ ] Clean installation tested.
- [ ] Resync tested.
- [ ] Foundry restart tested.
- [ ] Upgrade from previous release tested when applicable.
- [ ] Package tested with optional modules disabled.
- [ ] Any Arkflight Core change passes full Core CI.

## Release

- [ ] README version and installation path are correct.
- [ ] ZIP root contains exactly one correctly named module folder.
- [ ] No development-only files or old installer code execute at runtime.
- [ ] Changelog describes migrations or breaking changes.
- [ ] Release archive integrity is verified.
