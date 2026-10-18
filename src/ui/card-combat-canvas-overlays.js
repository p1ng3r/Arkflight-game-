import { weaponCoverage } from "../cards/card-playtest-session.js";

const COLORS = { fore: 0x70d8e6, port: 0xb49ee5, starboard: 0xe7c080, aft: 0xf09b89, deck: 0xa7e1c3 };
let graphic = null;
let selection = null;
export function clearCardWeaponOverlay() {
  graphic?.parent?.removeChild?.(graphic);
  graphic?.destroy?.();
  graphic = null;
}
export function hideCardWeaponOverlay() { selection = null; clearCardWeaponOverlay(); }
export function cardWeaponOverlayVisible(shipId) { return selection?.shipId === shipId; }
export function showCardWeaponOverlay(shipId, weaponKey = null) {
  selection = { shipId, weaponKey };
  return redrawCardWeaponOverlay();
}
export function redrawCardWeaponOverlay() {
  clearCardWeaponOverlay();
  const session = game.arkflight?.cardCombat?.state(), c = globalThis.canvas;
  if (!selection || !session?.canvas || session.phase === "complete" || session.canvas.sceneId !== c?.scene?.id || !c?.interface || !globalThis.PIXI?.Graphics) return false;
  const cells = weaponCoverage(session, selection.shipId, selection.weaponKey);
  graphic = new PIXI.Graphics();
  graphic.eventMode = "none";
  graphic.label = "Arkflight card weapon coverage";
  const combined = new Map();
  for (const cell of cells) {
    const key = `${cell.q},${cell.r}:${cell.mount}`;
    const previous = combined.get(key);
    combined.set(key, { ...cell, ready: cell.ready || previous?.ready });
  }
  for (const cell of combined.values()) {
    const vertices = c.grid.getVertices({ q: cell.q, r: cell.r, s: -cell.q - cell.r });
    const points = vertices.flatMap(point => [point.x, point.y]);
    const color = COLORS[cell.mount] ?? COLORS.deck, alpha = cell.ready ? .18 : .06;
    if (typeof graphic.poly === "function" && typeof graphic.fill === "function") graphic.poly(points).fill({ color, alpha }).stroke({ color, width: 1, alpha: .4 });
    else { graphic.lineStyle(1, color, .4); graphic.beginFill(color, alpha); graphic.drawPolygon(points); graphic.endFill(); }
  }
  c.interface.addChild(graphic);
  return true;
}
Hooks.on("arkflightCardCombatChanged", redrawCardWeaponOverlay);
Hooks.on("updateToken", redrawCardWeaponOverlay);
Hooks.on("canvasReady", redrawCardWeaponOverlay);
Hooks.on("canvasTearDown", hideCardWeaponOverlay);
Hooks.on("tearDownCanvas", hideCardWeaponOverlay);
