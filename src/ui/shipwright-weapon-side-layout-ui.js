const SIDE_LAYOUT = Object.freeze({
  port: Object.freeze({ left: 20 }),
  starboard: Object.freeze({ left: 80 })
});

function rootElement(app, element) {
  if (element?.querySelector) return element;
  if (element?.[0]?.querySelector) return element[0];
  if (app?.element?.querySelector) return app.element;
  if (app?.element?.[0]?.querySelector) return app.element[0];
  return null;
}

function verticalPositions(count) {
  if (count <= 0) return [];
  if (count === 1) return [47];
  if (count === 2) return [36, 58];

  const start = 30;
  const end = 68;
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => start + (step * index));
}

function placeFacingSockets(root, facing, movedSockets) {
  const config = SIDE_LAYOUT[facing];
  if (!config) return;

  const sockets = [...root.querySelectorAll(`.arkflight-workspace-socket.is-${facing}`)]
    .sort((a, b) => Number(a.dataset.socketIndex ?? 0) - Number(b.dataset.socketIndex ?? 0));
  const tops = verticalPositions(sockets.length);

  sockets.forEach((socket, index) => {
    // The workspace template still supplies a generic index-based position.
    // Disable transitions before replacing that position so the browser never
    // animates a Port socket across to Starboard (or vice versa) on open.
    socket.style.setProperty("transition", "none", "important");
    socket.style.left = `${config.left}%`;
    socket.style.top = `${tops[index]}%`;
    socket.classList.toggle("is-label-above", tops[index] >= 82);
    movedSockets.push(socket);
  });
}

export function correctShipwrightWeaponSides(root) {
  const layer = root?.querySelector?.(".arkflight-workspace-socket-layer");
  if (!layer) return false;

  // Keep the socket layer out of paint while its facing-aware positions are
  // applied. renderApplicationV2 fires during the render turn, so this avoids
  // a visible first frame in the old index-based layout.
  layer.style.setProperty("visibility", "hidden", "important");

  const movedSockets = [];
  placeFacingSockets(root, "port", movedSockets);
  placeFacingSockets(root, "starboard", movedSockets);

  requestAnimationFrame(() => {
    layer.style.removeProperty("visibility");
    for (const socket of movedSockets) socket.style.removeProperty("transition");
  });

  return true;
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  if (!root?.querySelector?.(".arkflight-workspace-socket-layer")) return;

  // Correct synchronously during render. Do not defer the position change to
  // requestAnimationFrame; deferring is what caused the visible slot swap.
  correctShipwrightWeaponSides(root);
});
