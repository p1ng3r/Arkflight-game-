const MODULE_ID = "arkflight-game";
const STATIONS = Object.freeze(["captain","engineer","navigator","watchmaster","veilwarden"]);

function shipActorSource(preview, folderId) {
  return {
    name:preview.ship.identity.name,
    type:"vehicle",
    folder:folderId,
    flags:{
      [MODULE_ID]:{
        ship:structuredClone(preview.ship),
        shipClassification:"npc",
        generatedEnemyPackage:true,
        generatedLoot:structuredClone(preview.loot),
        generatedConfig:structuredClone(preview.config)
      }
    }
  };
}

async function deleteQuietly(document) {
  try { await document?.delete?.(); } catch (error) { console.warn("Arkflight cleanup failed", error); }
}

export async function persistGeneratedEnemyPackage(preview, { folderConflict="error" }={}) {
  if (!game.user?.isGM) throw new Error("Only the GM may commit generated Arkflight enemy ships.");
  if (!preview?.canCommit || preview?.pf2eResolution?.state !== "resolved") throw new Error("Generated vessel must complete PF2e equipment and treasure resolution before Commit.");
  const folders = game.arkflight?.generatedShipFolders;
  if (!folders?.ensureShipPackageFolder) throw new Error("Arkflight generated ship folder service is unavailable.");

  const existingFolder = await folders.findShipPackageFolder(preview.ship.identity.name);
  const folder = await folders.ensureShipPackageFolder(preview.ship.identity.name, { conflict:folderConflict });
  const created = [];
  let shipActor = null;
  try {
    shipActor = await Actor.create(shipActorSource(preview, folder.id), { renderSheet:false });
    created.push(shipActor);

    const officerActors = {};
    for (const officer of preview.crew.officers) {
      const actor = await Actor.create({ ...structuredClone(officer.actorData), folder:folder.id }, { renderSheet:false });
      created.push(actor);
      officerActors[officer.station] = actor;
    }

    for (const template of (preview.crew.templates ?? []).filter((row) => row.selected)) {
      const actor = await Actor.create({ ...structuredClone(template.actorData), folder:folder.id }, { renderSheet:false });
      created.push(actor);
    }

    const ship = structuredClone(preview.ship);
    ship.crew ??= {};
    ship.crew.stations ??= {};
    for (const station of STATIONS) ship.crew.stations[station] = officerActors[station]?.id ?? null;
    await shipActor.setFlag(MODULE_ID, "ship", ship);
    await shipActor.setFlag(MODULE_ID, "shipClassification", "npc");
    await shipActor.setFlag(MODULE_ID, "generatedLoot", structuredClone(preview.loot));
    await shipActor.setFlag(MODULE_ID, "generatedPackage", {
      version:1,
      officerActorIds:Object.fromEntries(STATIONS.map((station) => [station, officerActors[station]?.id ?? null])),
      crewTemplateActorIds:created.filter((actor) => actor !== shipActor && actor.flags?.[MODULE_ID]?.generatedCrewTemplate).map((actor) => actor.id)
    });

    return Object.freeze({
      shipActor,
      folder,
      officerActors:Object.freeze(officerActors),
      createdActorIds:Object.freeze(created.map((actor) => actor.id)),
      reusedFolder:Boolean(existingFolder && existingFolder.id === folder.id)
    });
  } catch (error) {
    for (const document of created.reverse()) await deleteQuietly(document);
    if (!existingFolder) await deleteQuietly(folder);
    throw error;
  }
}
