const ROOT_NAME = "Arkflight Crews";

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

export async function ensureShipCrewFolder(shipName) {
  if (!game.user?.isGM) throw new Error("Only the GM may create Arkflight crew folders.");
  const cleanName = String(shipName ?? "Unnamed Vessel").trim() || "Unnamed Vessel";
  const root = await ensureRootFolder();
  const existing = childFolder(root.id, cleanName);
  if (existing) return existing;
  return Folder.create({ name: cleanName, type: "Actor", folder: root.id, sorting: "a" });
}

export async function placeGeneratedOfficer(actorData, shipName) {
  const folder = await ensureShipCrewFolder(shipName);
  return Actor.create({ ...structuredClone(actorData), folder: folder.id }, { renderSheet: false });
}

export function installGeneratedCrewFolderAPI() {
  Hooks.once("init", () => {
    game.arkflight ??= {};
    game.arkflight.crewFolders = {
      rootName: ROOT_NAME,
      ensureShipCrewFolder,
      placeGeneratedOfficer
    };
  });
}

installGeneratedCrewFolderAPI();
