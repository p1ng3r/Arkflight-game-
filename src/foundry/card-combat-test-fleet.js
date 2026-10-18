import { buildCardCombatTestFleet } from "../content/card-combat-test-ships.js";

const MODULE = "arkflight-game";

// Called by the primary GM's serialized command queue. Stable flags, rather
// than Actor names, make repeat imports safe after renaming or editing a ship.
export async function importCardCombatTestFleet() {
  if (!game.user?.isGM) throw new Error("Only the GM may import the combat test fleet.");
  const fleet = buildCardCombatTestFleet(); // Validate the complete batch before creating documents.
  let folder = game.folders.contents.find(row => row.type === "Actor" && row.flags?.[MODULE]?.cardCombatTestFleet === true);
  if (!folder) folder = await Folder.create({ name: "Arkflight — Combat Test Fleet", type: "Actor", sorting: "a", flags: { [MODULE]: { cardCombatTestFleet: true } } });
  const actorIds = [], createdIds = [];
  for (const entry of fleet) {
    let actor = game.actors.contents.find(row => row.flags?.[MODULE]?.cardCombatTestShip === entry.id);
    if (!actor) {
      actor = await Actor.create({
        name: entry.name, type: "vehicle", folder: folder.id,
        img: "modules/arkflight-game/assets/ui/stations/voyage_vessel_icon.webp",
        flags: { [MODULE]: { ship: entry.ship, shipClassification: "npc", cardCombatTestShip: entry.id, cardCombatTestTeam: entry.team, cardCombatTestRole: entry.role } }
      }, { renderSheet: false });
      createdIds.push(actor.id);
    }
    actorIds.push(actor.id);
  }
  Hooks.callAll("arkflightCardCombatChanged");
  return { actorIds, createdIds, folderId: folder.id };
}
