import { buildCardCombatTestFleet } from "../content/card-combat-test-ships.js";

const MODULE = "arkflight-game";
const PORTRAIT = "modules/arkflight-game/assets/ui/stations/voyage_vessel_icon.webp";
const TOKEN_ART = "modules/arkflight-game/assets/ui/stations/voyage_vessel_token_topdown.webp";

async function updateDefaultTokenArt(actors) {
  for (const actor of actors) {
    if (actor.prototypeToken?.texture?.src === PORTRAIT) await actor.update({ "prototypeToken.texture.src": TOKEN_ART, "prototypeToken.lockRotation": false });
  }
  const ids = new Set(actors.map(actor => actor.id));
  for (const scene of game.scenes?.contents ?? []) {
    const changes = (scene.tokens?.contents ?? []).filter(token => ids.has(token.actorId) && token.actorLink !== false && token.texture?.src === PORTRAIT).map(token => ({ _id: token.id, "texture.src": TOKEN_ART, lockRotation: false }));
    if (changes.length) await scene.updateEmbeddedDocuments("Token", changes);
  }
}

// Called by the primary GM's serialized command queue. Stable flags, rather
// than Actor names, make repeat imports safe after renaming or editing a ship.
export async function importCardCombatTestFleet() {
  if (!game.user?.isGM) throw new Error("Only the GM may import the combat test fleet.");
  const fleet = buildCardCombatTestFleet(); // Validate the complete batch before creating documents.
  let folder = game.folders.contents.find(row => row.type === "Actor" && row.flags?.[MODULE]?.cardCombatTestFleet === true);
  if (!folder) folder = await Folder.create({ name: "Arkflight — Combat Test Fleet", type: "Actor", sorting: "a", flags: { [MODULE]: { cardCombatTestFleet: true } } });
  const actorIds = [], createdIds = [], actors = [];
  for (const entry of fleet) {
    let actor = game.actors.contents.find(row => row.flags?.[MODULE]?.cardCombatTestShip === entry.id);
    if (!actor) {
      actor = await Actor.create({
        name: entry.name, type: "vehicle", folder: folder.id,
        img: PORTRAIT,
        prototypeToken: { texture: { src: TOKEN_ART }, width: 1, height: 1, rotation: 0, lockRotation: false },
        flags: { [MODULE]: { ship: entry.ship, shipClassification: "npc", cardCombatTestShip: entry.id, cardCombatTestTeam: entry.team, cardCombatTestRole: entry.role } }
      }, { renderSheet: false });
      createdIds.push(actor.id);
    }
    actorIds.push(actor.id);
    actors.push(actor);
  }
  await updateDefaultTokenArt(actors);
  Hooks.callAll("arkflightCardCombatChanged");
  return { actorIds, createdIds, folderId: folder.id };
}
