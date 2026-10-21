import { buildCardCombatTestFleet } from "../content/card-combat-test-ships.js";
import { equipDemoShip, initializeDemo, assertDemoStartAllowed } from "../cards/guided-combat-demo.js";
import { createPlaytestSession, CARD_SKILLS } from "../cards/card-playtest-session.js";
import { deriveShip } from "../ship/derive-ship.js";
import { SHIP_CATALOGS } from "../content/index.js";
import { gridGeometry, resolveCanvasBindings, bindCanvasSession } from "./card-combat-canvas.js";

const MODULE = "arkflight-game", FLAG = "guidedCombatDemo";
const ART = "modules/arkflight-game/assets/ui/stations/voyage_vessel_token_topdown.webp";
// Dedicated, marked documents are reusable test fixtures. No campaign Actor or
// scene is selected by name, overwritten, deleted, or activated for all users.
export async function prepareGuidedDemoScene({ user, current, weaponEntries }) {
  assertDemoStartAllowed(user, current, game.paused, game.combats?.contents?.some(c => c.active && c.started));
  let scene = game.scenes.contents.find(s => s.flags?.[MODULE]?.[FLAG] === true);
  if (scene && (scene.walls.size || scene.tokens.contents.some(t => !t.flags?.[MODULE]?.[FLAG]))) throw new Error("The demo scene contains other tokens or walls. Remove that added content before resetting the test.");
  if (!scene) scene = await Scene.create({ name: "[Test] Arkflight — Guided Combat", width: 2600, height: 2000, padding: .1, active: false, navigation: true, backgroundColor: "#081925", grid: { type: 4, size: 100, distance: 1, units: "hex", color: "#74949f", alpha: .3 }, flags: { [MODULE]: { [FLAG]: true } } });
  if (![2, 3, 4, 5].includes(scene.grid.type)) throw new Error("Restore a hex grid on the dedicated demo scene before resetting it.");
  const fleet = buildCardCombatTestFleet({ rng: () => .5 }), actors = [], entries = [], roles = {};
  for (const spec of fleet) {
    const ship = equipDemoShip(spec.ship, spec.id);
    let actor = game.actors.contents.find(a => a.flags?.[MODULE]?.guidedCombatDemoShip === spec.id);
    if (!actor) actor = await Actor.create({ name: `[Demo] ${spec.name.replace("[Test] ", "")}`, type: "vehicle", img: ART, prototypeToken: { texture: { src: ART }, width: 1, height: 1, lockRotation: false, flags: { pf2e: { linkToActorSize: false, autoscale: false } } }, flags: { [MODULE]: { guidedCombatDemoShip: spec.id, ship, shipClassification: "npc" } } }, { renderSheet: false });
    // The encounter is initialized from fresh copies; permanent demo libraries
    // and campaign resources are never written by combat operations.
    for (const station of Object.keys(CARD_SKILLS)) ship.crew.stations[station] = `npc:${actor.id}:${station}`;
    actors.push(actor); roles[actor.id] = spec.id;
    entries.push({ id: actor.id, name: actor.name, team: spec.team, ship, stats: deriveShip(ship, SHIP_CATALOGS).stats, weapons: weaponEntries(ship) });
  }
  await scene.view();
  const c = globalThis.canvas;
  if (c?.scene?.id !== scene.id || !c.grid?.isHexagonal) throw new Error("Wait for the demo scene to finish loading, then retry Next Step.");
  const geometry = gridGeometry(c.grid), rect = c.dimensions.sceneRect;
  const origin = c.grid.getCube({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const starts = [[-3, 1], [-3, 4], [0, -2], [0, 0]], bindings = [];
  for (const [i, actor] of actors.entries()) {
    const [dq, dr] = starts[i], point = c.grid.getCenterPoint({ q: origin.q + dq, r: origin.r + dr, s: -origin.q - dq - origin.r - dr });
    const vector = i < 2 ? [0, -1] : [0, 1], index = geometry.directions.findIndex(d => d[0] === vector[0] && d[1] === vector[1]);
    if (index < 0) throw new Error("The scene has incompatible hex directions.");
    let token = scene.tokens.contents.find(t => t.actorId === actor.id && t.flags?.[MODULE]?.[FLAG]);
    if (!token) {
      const doc = await actor.getTokenDocument({ actorLink: true, width: 1, height: 1, rotation: geometry.headings[index], flags: { [MODULE]: { [FLAG]: true }, pf2e: { linkToActorSize: false, autoscale: false } } });
      const center = doc.getCenterPoint(), source = doc.toObject(); delete source._id;
      source.x = point.x - (center.x - doc.x); source.y = point.y - (center.y - doc.y);
      [token] = await scene.createEmbeddedDocuments("Token", [source]);
    } else {
      await token.update({ width: 1, height: 1, "flags.pf2e.linkToActorSize": false, "flags.pf2e.autoscale": false }, { arkflightCardSync: true, animate: false });
      const center = token.getCenterPoint();
      await token.update({ x: point.x - (center.x - token.x), y: point.y - (center.y - token.y), rotation: geometry.headings[index] }, { arkflightCardSync: true, animate: false });
    }
    bindings.push({ id: actor.id, tokenId: token.id });
  }
  const binding = resolveCanvasBindings(entries, { sceneId: scene.id, entries: bindings });
  const state = bindCanvasSession(createPlaytestSession(entries, { id: foundry.utils.randomID(), rng: () => .5 }), binding);
  return initializeDemo(state, roles);
}
