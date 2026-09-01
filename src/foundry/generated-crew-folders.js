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

export async function findShipPackageFolder(shipName) {
  const cleanName = String(shipName ?? "Unnamed Vessel").trim() || "Unnamed Vessel";
  const root = actorFolders().find((folder) => !folder.folder && folder.name === ROOT_NAME) ?? null;
  if (!root) return null;
  return childFolder(root.id, cleanName);
}

export async function ensureShipPackageFolder(shipName, { conflict = "error" } = {}) {
  if (!game.user?.isGM) throw new Error("Only the GM may create Arkflight ship folders.");
  const cleanName = String(shipName ?? "Unnamed Vessel").trim() || "Unnamed Vessel";
  const root = await ensureRootFolder();
  const existing = childFolder(root.id, cleanName);
  if (existing) {
    if (conflict === "reuse") return existing;
    const error = new Error(`An Arkflight ship package named ${cleanName} already exists. Choose Rename or Reuse Existing.`);
    error.code = "ARKFLIGHT_SHIP_PACKAGE_CONFLICT";
    error.folderId = existing.id;
    throw error;
  }
  return Folder.create({ name: cleanName, type: "Actor", folder: root.id, sorting: "a" });
}

export async function placeGeneratedShip(actorData, shipName, options = {}) {
  const folder = await ensureShipPackageFolder(shipName, options);
  return Actor.create({ ...structuredClone(actorData), folder: folder.id }, { renderSheet: false });
}

export async function placeGeneratedOfficer(actorData, shipName, options = {}) {
  const folder = await ensureShipPackageFolder(shipName, options);
  return Actor.create({ ...structuredClone(actorData), folder: folder.id }, { renderSheet: false });
}

export async function placeGeneratedCrewTemplate(actorData, shipName, options = {}) {
  const folder = await ensureShipPackageFolder(shipName, options);
  return Actor.create({ ...structuredClone(actorData), folder: folder.id }, { renderSheet: false });
}

export function installGeneratedCrewFolderAPI() {
  Hooks.once("init", () => {
    game.arkflight ??= {};
    game.arkflight.generatedShipFolders = {
      rootName: ROOT_NAME,
      findShipPackageFolder,
      ensureShipPackageFolder,
      placeGeneratedShip,
      placeGeneratedOfficer,
      placeGeneratedCrewTemplate
    };
    game.arkflight.crewFolders = game.arkflight.generatedShipFolders;
  });
}

installGeneratedCrewFolderAPI();
