const BOARD_ID = "arkflight-event-board";
let draggedStationId = null;

function rootElement(app, element) {
  if (app?.id !== BOARD_ID) return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

async function moveStationToIndex(controller, stationId, targetIndex) {
  if (!controller?.state || controller.state.phase !== "planning") return;
  let order = [...(controller.state.order ?? [])];
  let currentIndex = order.indexOf(stationId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) return;

  while (currentIndex < targetIndex) {
    await controller.command({ type: "move-order", station: stationId, direction: "later" });
    order = [...(controller.state.order ?? [])];
    currentIndex = order.indexOf(stationId);
  }
  while (currentIndex > targetIndex) {
    await controller.command({ type: "move-order", station: stationId, direction: "earlier" });
    order = [...(controller.state.order ?? [])];
    currentIndex = order.indexOf(stationId);
  }
}

function orderedRows(root, controller) {
  const crew = root.querySelector(".pa-crew");
  if (!crew) return [];
  const rows = [...crew.querySelectorAll(".pa-station-row")];
  const byStation = new Map(rows.map((row) => [row.dataset.paFocus, row]));
  const hint = crew.querySelector(":scope > small");
  for (const stationId of controller.state?.order ?? []) {
    const row = byStation.get(stationId);
    if (row) crew.insertBefore(row, hint ?? null);
  }
  return [...crew.querySelectorAll(".pa-station-row")];
}

function decorate(root, controller) {
  if (!root?.classList?.contains("arkflight-player-action-mode")) return;

  // Resolution order now lives entirely in the vertical Crew Stations list.
  root.querySelector(".pa-order")?.remove();

  const crew = root.querySelector(".pa-crew");
  if (!crew) return;
  const hint = crew.querySelector(":scope > small");
  if (hint) hint.textContent = controller.state?.phase === "planning"
    ? "Drag stations to set resolution order. Click a station to view Action, PF2e Skill, Risk Bid, and Mastery details."
    : "Resolution order is locked. Click a station to review its plan.";

  const rows = orderedRows(root, controller);
  rows.forEach((row, index) => {
    const stationId = row.dataset.paFocus;
    if (!stationId) return;
    row.dataset.paOrderIndex = String(index);
    row.draggable = controller.state?.phase === "planning";
    row.classList.toggle("pa-order-locked", controller.state?.phase !== "planning");
    row.title = controller.state?.phase === "planning" ? "Drag to change resolution order" : "Resolution order locked";

    const number = row.querySelector(".pa-order-number");
    if (number) {
      number.innerHTML = `<span>${index + 1}</span><i class="fa-solid fa-grip-lines" aria-hidden="true"></i>`;
      number.setAttribute("aria-label", `Resolution order ${index + 1}`);
    }

    row.addEventListener("dragstart", (event) => {
      if (controller.state?.phase !== "planning") {
        event.preventDefault();
        return;
      }
      draggedStationId = stationId;
      row.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", stationId);
    });

    row.addEventListener("dragend", () => {
      draggedStationId = null;
      row.classList.remove("is-dragging");
      root.querySelectorAll(".pa-station-row.is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
    });

    row.addEventListener("dragover", (event) => {
      if (!draggedStationId || draggedStationId === stationId || controller.state?.phase !== "planning") return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      root.querySelectorAll(".pa-station-row.is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
      row.classList.add("is-drop-target");
    });

    row.addEventListener("dragleave", () => row.classList.remove("is-drop-target"));

    row.addEventListener("drop", async (event) => {
      event.preventDefault();
      row.classList.remove("is-drop-target");
      const sourceId = draggedStationId || event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === stationId) return;
      try {
        const targetIndex = (controller.state?.order ?? []).indexOf(stationId);
        await moveStationToIndex(controller, sourceId, targetIndex);
      } catch (error) {
        console.error("Arkflight | Could not reorder station", error);
        ui.notifications?.warn(error.message);
      }
    });
  });
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = rootElement(app, element);
  const controller = game.arkflight?.controller;
  if (!root || !controller) return;
  setTimeout(() => decorate(root, controller), 25);
});
