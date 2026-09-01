const ROOT_NAME = "Arkflight";

function actorFolders() {
  return (game.folders?.contents ?? []).filter((folder) => folder.type === "Actor");
}

function childFolder(parentId, name) {
  return actorFolders().find((folder) => folder.folder?.id === parentId && folder.name === name) ?? null;
}

async function ensureRootFolder() {
  const existing = actorFolders().find((folder) => !folder.folder && folder.name === ROOT_NAME);
  if (existing) return existing;
  return Folder.create({ name: ROOT_NAME, type: "Actor", sorting: "a" });
}

export async function ensureShipPackageFolder(shipName) {
  if (!game.user?.isGM) throw new Error("Only the GM may create Arkflight ship folders.");
  const cleanName = String(shipName ?? "Unnamed Vessel").trim() || "Unnamed Vessel";
  const root = await ensureRootFolder();
  const existing = childFolder(root.id, cleanName);
  if (existing) return existing;
  return Folder.create({ name: cleanName, type: "Actor", folder: root.id, sorting: "a" });
}

async function placeActor(actorData, shipName) {
  const folder = await ensureShipPackageFolder(shipName);
  return Actor.create({ ...structuredClone(actorData), folder: folder.id }, { renderSheet: false });
}

export async function placeGeneratedShip(actorData, shipName) { return placeActor(actorData, shipName); }
export async function placeGeneratedOfficer(actorData, shipName) { return placeActor(actorData, shipName); }
export async function placeGeneratedCrewTemplate(actorData, shipName) { return placeActor(actorData, shipName); }

export function installGeneratedCrewFolderAPI() {
  Hooks.once("init", () => {
    game.arkflight ??= {};
    game.arkflight.generatedShipFolders = {
      rootName: ROOT_NAME,
      ensureShipPackageFolder,
      placeGeneratedShip,
      placeGeneratedOfficer,
      placeGeneratedCrewTemplate
    };
    game.arkflight.crewFolders = game.arkflight.generatedShipFolders;
  });
}

installGeneratedCrewFolderAPI();
