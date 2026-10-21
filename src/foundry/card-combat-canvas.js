import { hexDistance } from "../cards/card-playtest-session.js";

const MODULE = "arkflight-game";
const moving = new Set();
const angle = value => (Number(value) % 360 + 360) % 360;
const difference = (a, b) => Math.abs((a - b + 540) % 360 - 180);
const cube = cell => ({ q: cell.q, r: cell.r, s: -cell.q - cell.r });
export function canvasGrid(sceneId) {
  const c = globalThis.canvas;
  if (!sceneId || c?.scene?.id !== sceneId || !c.grid?.isHexagonal) throw new Error("View the encounter's hex-grid scene. The primary GM must view the same scene.");
  return c;
}
export function gridGeometry(grid) {
  const origin = grid.getCenterPoint({ q: 0, r: 0, s: 0 });
  const q = grid.getCenterPoint({ q: 1, r: 0, s: -1 }), r = grid.getCenterPoint({ q: 0, r: 1, s: -1 });
  const basis = { q: { x: q.x - origin.x, y: q.y - origin.y }, r: { x: r.x - origin.x, y: r.y - origin.y } };
  const vectors = grid.getAdjacentCubes({ q: 0, r: 0, s: 0 }).map(cell => {
    const point = grid.getCenterPoint(cell);
    return { q: cell.q, r: cell.r, angle: angle(Math.atan2(point.x - origin.x, origin.y - point.y) * 180 / Math.PI) };
  }).sort((a, b) => a.angle - b.angle);
  if (vectors.length !== 6) throw new Error("The scene must provide six adjacent hexes.");
  return { basis, headings: vectors.map(v => v.angle), directions: vectors.map(v => [v.q, v.r]), gridType: grid.type, gridSize: grid.size };
}
export function tokenCell(token, grid, position = {}) {
  return grid.getCube(token.getCenterPoint(position));
}
export function tokenPose(token, motion, geometry, grid) {
  const center = grid.getCenterPoint(cube(motion)), current = token.getCenterPoint();
  return { x: center.x - (current.x - token.x), y: center.y - (current.y - token.y), rotation: geometry.headings[motion.heading] };
}
export function resolveCanvasBindings(entries, command) {
  const c = canvasGrid(command.sceneId), geometry = gridGeometry(c.grid), tokens = {}, positions = new Set();
  for (const entry of entries) {
    const requested = command.entries.find(row => row.id === entry.id)?.tokenId;
    const matches = c.scene.tokens.contents.filter(token => token.actorId === entry.id && token.actorLink !== false);
    const token = requested ? matches.find(token => token.id === requested) : matches.length === 1 ? matches[0] : null;
    if (!token) throw new Error(`Choose one linked scene token for ${entry.name}, or use Place Selected Ships first.`);
    if (game.combats?.contents?.some(combat => combat.started && !combat.flags?.[MODULE]?.cardCombatSession && combat.combatants?.some(row => row.tokenId === token.id))) throw new Error(`${entry.name} is already in another running encounter.`);
    const cell = tokenCell(token, c.grid), key = `${cell.q},${cell.r}`;
    if (positions.has(key) || c.scene.tokens.contents.some(other => other.id !== token.id && (() => { const at = tokenCell(other, c.grid); return at.q === cell.q && at.r === cell.r; })())) throw new Error("Each ship needs a different hex; a starting cell is occupied.");
    positions.add(key);
    const heading = geometry.headings.map((value, index) => ({ index, delta: difference(value, angle(token.rotation)) })).sort((a, b) => a.delta - b.delta)[0].index;
    tokens[entry.id] = { tokenId: token.id, q: cell.q, r: cell.r, heading };
  }
  return { sceneId: c.scene.id, ...geometry, tokens };
}
export function bindCanvasSession(session, binding) {
  session.canvas = { ...binding };
  for (const [id, row] of Object.entries(binding.tokens)) {
    session.ships[id].cardPlay.tokenId = row.tokenId;
    Object.assign(session.ships[id].cardPlay.motion, { q: row.q, r: row.r, heading: row.heading });
  }
  return session;
}
export function boundShipForToken(token, session = game.arkflight?.cardCombat?.state()) {
  if (!session?.canvas || session.phase === "complete" || token?.parent?.id !== session.canvas.sceneId) return null;
  return Object.entries(session.ships).find(([, ship]) => ship.cardPlay.tokenId === token.id)?.[0] ?? null;
}
export function assertCanvasPositions(session) {
  if (!session?.canvas || session.phase === "complete") return;
  const c = canvasGrid(session.canvas.sceneId);
  if (c.grid.type !== session.canvas.gridType || c.grid.size !== session.canvas.gridSize) throw new Error("Scene grid changed during combat. End this encounter before changing the grid.");
  for (const ship of Object.values(session.ships)) {
    const token = c.scene.tokens.get(ship.cardPlay.tokenId);
    if (!token) throw new Error(`The scene token for ${ship.cardPlay.name} is missing.`);
    const pose = tokenPose(token, ship.cardPlay.motion, session.canvas, c.grid);
    if (Math.hypot(token.x - pose.x, token.y - pose.y) > 1 || difference(angle(token.rotation), pose.rotation) > .1) {
      const actual = tokenCell(token, c.grid);
      throw new Error(`${ship.cardPlay.name}'s token is out of sync: expected hex (${ship.cardPlay.motion.q}, ${ship.cardPlay.motion.r}) at ${Math.round(pose.rotation)}°, found hex (${actual.q}, ${actual.r}) at ${Math.round(angle(token.rotation))}°. ${session.guidedDemo?.status === "running" ? "The guided test could not restore its demo token; check for token-control automation blocking updates." : "Use the HUD and normal token drag controls during combat."}`);
    }
  }
}
// The walkthrough owns only its explicitly marked fixture tokens. Native
// snapping, size preparation or other automation must not strand Next Step.
// Reconcile to the saved pose, never adopt the unexpected position into rules.
export async function synchronizeGuidedDemoTokens(session) {
  if (session?.guidedDemo?.status !== "running" || !session.canvas) return;
  const c = canvasGrid(session.canvas.sceneId);
  if (c.grid.type !== session.canvas.gridType || c.grid.size !== session.canvas.gridSize) throw new Error("Scene grid changed during the guided test. Restore its grid before continuing.");
  if (c.scene.flags?.[MODULE]?.guidedCombatDemo !== true) throw new Error("The guided test can synchronize only its marked demo scene.");
  const rows = Object.entries(session.ships).map(([id, ship]) => {
    const token = c.scene.tokens.get(ship.cardPlay.tokenId);
    if (!token || token.actorId !== id || token.actorLink === false || token.flags?.[MODULE]?.guidedCombatDemo !== true) throw new Error("The guided test can synchronize only its original marked demo tokens.");
    return { token, motion: ship.cardPlay.motion };
  });
  // Validate every fixture before changing any document.
  for (const { token, motion } of rows) {
    if (!await setPose(token, tokenPose(token, motion, session.canvas, c.grid), true)) throw new Error("Foundry prevented guided token synchronization. The pending step has not advanced.");
  }
  assertCanvasPositions(session);
}
async function setPose(token, pose, rollback = false) {
  if (Math.hypot(token.x - pose.x, token.y - pose.y) < .01 && difference(angle(token.rotation), pose.rotation) < .01) return true;
  moving.add(token.id);
  try {
    if (Math.hypot(token.x - pose.x, token.y - pose.y) < .01) {
      await token.update({ rotation: pose.rotation }, { arkflightCardSync: true, animate: false });
      return true;
    }
    return await token.move({ ...pose, snapped: true }, { method: "hud", autoRotate: false, showRuler: false, pan: false, arkflightCardSync: true, ...(rollback ? { constrainOptions: { ignoreWalls: true, ignoreCost: true } } : {}) });
  } finally { moving.delete(token.id); }
}
export async function moveCanvasToken(before, next, shipId) {
  if (!before.canvas) return async () => {};
  const c = canvasGrid(before.canvas.sceneId), ship = before.ships[shipId], token = c.scene.tokens.get(ship.cardPlay.tokenId);
  const start = ship.cardPlay.motion, end = next.ships[shipId].cardPlay.motion;
  const original = { x: token.x, y: token.y, rotation: token.rotation };
  const pose = tokenPose(token, end, next.canvas, c.grid), count = hexDistance(start, end);
  let previous = token.getCenterPoint();
  for (let n = 1; n <= count; n++) {
    const step = { q: start.q + (end.q - start.q) * n / count, r: start.r + (end.r - start.r) * n / count };
    if (c.scene.tokens.contents.some(other => other.id !== token.id && (() => { const cell = tokenCell(other, c.grid); return cell.q === step.q && cell.r === step.r; })())) throw new Error("The movement path contains an occupied hex.");
    const point = c.grid.getCenterPoint(cube(step));
    if (token.object?.checkCollision?.(point, { origin: previous, type: "move", mode: "any" })) throw new Error("The movement path is blocked by a wall.");
    previous = point;
  }
  const rollback = async () => {
    const done = await setPose(token, original, true);
    if (!done) throw new Error("Foundry prevented token movement rollback; the encounter has not charged movement.");
  };
  try {
    const done = await setPose(token, pose);
    if (!done || Math.hypot(token.x - pose.x, token.y - pose.y) > 1) throw new Error("Foundry prevented the move; movement was not spent.");
  } catch (error) { await rollback(); throw error; }
  return rollback;
}
export async function createCanvasCombat(session) {
  const c = canvasGrid(session.canvas.sceneId), poses = [];
  try {
    for (const ship of Object.values(session.ships)) {
      const token = c.scene.tokens.get(ship.cardPlay.tokenId);
      poses.push({ token, pose: { x: token.x, y: token.y, rotation: token.rotation } });
      if (!await setPose(token, tokenPose(token, ship.cardPlay.motion, session.canvas, c.grid))) throw new Error("Foundry could not align a ship token to its starting hex.");
    }
    const combat = await Combat.create({ scene: c.scene.id, active: true, flags: { [MODULE]: { cardCombatSession: session.id } }, combatants: Object.entries(session.ships).map(([id, ship]) => ({ actorId: id, tokenId: ship.cardPlay.tokenId, sceneId: c.scene.id, flags: { [MODULE]: { cardCombatShipId: id } } })) });
    session.canvas.combatId = combat.id;
    return async () => { await combat.delete({ arkflightCardSync: true }); for (const row of poses) await setPose(row.token, row.pose, true); };
  } catch (error) { for (const row of poses) await setPose(row.token, row.pose, true); throw error; }
}
export async function syncCanvasCombat(session) {
  if (!session.canvas) return;
  const combat = game.combats.get(session.canvas.combatId);
  if (!combat) return;
  const initiative = [...session.log].reverse().find(entry => entry.results)?.results ?? [];
  const rows = [...combat.combatants].map(row => {
    const id = row.flags?.[MODULE]?.cardCombatShipId, ship = session.ships[id], rolled = initiative.find(result => result.id === id);
    return { _id: row.id, initiative: session.phase === "planning" ? null : rolled ? rolled.die + rolled.modifier : null, defeated: ship?.resources.hull.value <= 0 };
  });
  await combat.updateEmbeddedDocuments("Combatant", rows, { arkflightCardSync: true });
  const activeId = session.phase === "execution" ? session.turnOrder[session.turnIndex] : null;
  const turn = activeId ? combat.turns.findIndex(row => row.flags?.[MODULE]?.cardCombatShipId === activeId) : null;
  await combat.update({ round: session.round, turn: turn === -1 ? null : turn, active: session.phase !== "complete", [`flags.${MODULE}.cardCombatPhase`]: session.phase }, { arkflightCardSync: true });
}
export async function placeSelectedCanvasShips(command, user) {
  if (!user.isGM) throw new Error("Only the GM may place ships on the scene.");
  const c = canvasGrid(command.sceneId);
  const state = game.arkflight?.cardCombat?.state();
  if (state?.canvas?.sceneId === c.scene.id && state.phase !== "complete") throw new Error("Finish the current encounter before placing more ships.");
  if (!Array.isArray(command.actorIds) || !command.actorIds.length || command.actorIds.length > 8 || new Set(command.actorIds).size !== command.actorIds.length) throw new Error("Select one to eight different ships to place.");
  const actors = command.actorIds.map(id => game.actors.get(id));
  if (actors.some(actor => !actor?.flags?.[MODULE]?.ship)) throw new Error("Select Arkflight ship Actors.");
  const rect = c.dimensions?.sceneRect ?? { x: 0, y: 0, width: c.scene.width, height: c.scene.height };
  const origin = c.grid.getCube({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const occupied = new Set(c.scene.tokens.contents.map(token => { const cell = tokenCell(token, c.grid); return `${cell.q},${cell.r}`; }));
  const created = [];
  for (const [i, actor] of actors.entries()) {
    if (c.scene.tokens.contents.some(token => token.actorId === actor.id && token.actorLink !== false)) continue;
    let chosen;
    for (let radius = 0; radius <= 12 && !chosen; radius++) for (let q = -radius; q <= radius && !chosen; q++) for (let r = -radius; r <= radius && !chosen; r++) {
      const cell = { q: origin.q + q + (i % 2 ? 3 : -3), r: origin.r + r + Math.floor(i / 2) * 3 }, point = c.grid.getCenterPoint(cube(cell));
      if (!occupied.has(`${cell.q},${cell.r}`) && point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height) chosen = { cell, point };
    }
    if (!chosen) throw new Error("No free starting hex found on this scene.");
    occupied.add(`${chosen.cell.q},${chosen.cell.r}`);
    const token = await actor.getTokenDocument({ actorLink: true, width: 1, height: 1, rotation: i % 2 ? 300 : 120 });
    const center = token.getCenterPoint(), source = token.toObject();
    delete source._id;
    source.x = chosen.point.x - (center.x - token.x); source.y = chosen.point.y - (center.y - token.y);
    const result = await c.scene.createEmbeddedDocuments("Token", [source]);
    created.push(result[0].id);
  }
  Hooks.callAll("arkflightCardCombatChanged");
  return created;
}
function submitMovement(token, destination) {
  const state = game.arkflight?.cardCombat?.state(), shipId = boundShipForToken(token, state);
  if (!shipId || state.guidedDemo?.status === "running") return;
  const cell = tokenCell(token, canvas.grid, destination);
  void game.arkflight.cardCombat.request({ type: "canvas-move", sessionId: state.id, revision: state.revision, shipId, destination: { q: cell.q, r: cell.r } }).catch(error => ui.notifications.error(error.message));
}
Hooks.on("preMoveToken", (token, movement, options) => {
  if (!boundShipForToken(token) || moving.has(token.id) || options?.arkflightCardSync) return;
  submitMovement(token, movement.destination);
  return false;
});
Hooks.on("preUpdateToken", (token, changes, options) => {
  if (!boundShipForToken(token) || moving.has(token.id) || options?.arkflightCardSync) return;
  // The guide owns movement. Native input and rotation automation must not
  // enqueue ordinary helm orders (or repeat rejection notifications) here.
  if (game.arkflight.cardCombat.state()?.guidedDemo?.status === "running" && ["x", "y", "rotation"].some(key => key in changes)) return false;
  if (["width", "height", "elevation", "actorId", "actorLink"].some(key => key in changes)) { ui.notifications.warn("Finish card combat before resizing or reassigning a bound ship token."); return false; }
  if (changes.rotation == null || changes.x != null || changes.y != null) return;
  const state = game.arkflight.cardCombat.state(), id = boundShipForToken(token, state), ship = state.ships[id];
  const current = state.canvas.headings[ship.cardPlay.motion.heading], delta = (angle(changes.rotation) - current + 540) % 360 - 180;
  if (Math.abs(delta) < .1) return false;
  void game.arkflight.cardCombat.request({ type: "helm", sessionId: state.id, revision: state.revision, shipId: id, direction: delta > 0 ? "right" : "left" }).catch(error => ui.notifications.error(error.message));
  return false;
});
Hooks.on("preUpdateCombat", (combat, changes, options) => {
  if (!combat.flags?.[MODULE]?.cardCombatSession || options?.arkflightCardSync) return;
  if ("round" in changes || "turn" in changes) { ui.notifications.warn("Use Lock Plan and Finish Ship Turn in the card HUD. It updates this combat tracker automatically."); return false; }
});
Hooks.on("deleteCombat", (combat, options) => {
  if (options?.arkflightCardSync || game.user.id !== [...game.users].filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0]?.id) return;
  const state = game.arkflight?.cardCombat?.state();
  if (state?.canvas?.combatId === combat.id && state.phase !== "complete") void game.arkflight.cardCombat.request({ type: "end", sessionId: state.id, revision: state.revision }).catch(error => ui.notifications.error(error.message));
});
