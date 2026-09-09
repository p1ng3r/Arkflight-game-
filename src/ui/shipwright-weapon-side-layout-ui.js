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

function placeFacingSockets(root, facing) {
  const config = SIDE_LAYOUT[facing];
  if (!config) return;

  const sockets = [...root.querySelectorAll(`.arkflight-workspace-socket.is-${facing}`)]
    .sort((a, b) => Number(a.dataset.socketIndex ?? 0) - Number(b.dataset.socketIndex ?? 0));
  const tops = verticalPositions(sockets.length);

  sockets.forEach((socket, index) => {
    socket.style.left = `${config.left}%`;
    socket.style.top = `${tops[index]}%`;
    socket.classList.toggle("is-label-above", tops[index] >= 82);
  });
}

export function correctShipwrightWeaponSides(root) {
  if (!root?.querySelector?.(".arkflight-workspace-socket-layer")) return false;
  placeFacingSockets(root, "port");
  placeFacingSockets(root, "starboard");
  return true;
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  if (!root?.querySelector?.(".arkflight-workspace-socket-layer")) return;
  requestAnimationFrame(() => correctShipwrightWeaponSides(root));
});
