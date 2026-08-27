function simplifyPlayerActionBoard(root) {
  if (!root?.querySelector) return;

  const boardTitle = root.querySelector(".pa-board-title");
  const hazards = root.querySelector(".pa-hazards");
  const timer = boardTitle?.querySelector("[data-pa-timer]") ?? root.querySelector("[data-pa-timer]");

  if (hazards && timer && !hazards.contains(timer)) {
    timer.classList.add("pa-hazard-timer");
    hazards.append(timer);
  }

  boardTitle?.remove();
  root.querySelector(".pa-score-strip")?.remove();
}

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== "arkflight-event-board") return;
  const root = element instanceof HTMLElement ? element : element?.[0] ?? app.element;
  if (!root) return;
  setTimeout(() => simplifyPlayerActionBoard(root), 10);
});
