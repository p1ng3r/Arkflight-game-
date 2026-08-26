const STAKE_COPY = {
  momentum: {
    label: "Momentum",
    description: "Crew cohesion for this Event. Range 0–3."
  },
  hull: {
    label: "Hull Pressure",
    description: "Immediate encounter Pressure threatening the ship's hull."
  },
  arkengine: {
    label: "Arkengine Pressure",
    description: "Immediate encounter Pressure threatening the Arkengine."
  },
  lifeveil: {
    label: "Lifeveil Pressure",
    description: "Immediate encounter Pressure threatening the Lifeveil."
  },
  rigging: {
    label: "Rigging Pressure",
    description: "Immediate encounter Pressure threatening the rigging and sail system."
  }
};

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function decorateStakeTooltips(root) {
  if (!root?.classList?.contains("arkflight-opening-mode")) return;

  for (const stake of root.querySelectorAll(".arkflight-opening-stake")) {
    const key = Object.keys(STAKE_COPY).find((candidate) => stake.classList.contains(candidate));
    if (!key) continue;

    const copy = STAKE_COPY[key];
    const value = stake.querySelector(".arkflight-opening-stake-value")?.textContent?.trim() || "0";
    const tooltip = `${copy.label}: ${value}\n${copy.description}`;

    stake.title = tooltip;
    stake.setAttribute("aria-label", tooltip.replace("\n", " "));
    stake.tabIndex = 0;
  }
}

export function installOpeningStakesTooltipUI() {
  Hooks.on("renderApplicationV2", (app, element) => {
    const root = boardRoot(app, element);
    if (!root) return;
    setTimeout(() => decorateStakeTooltips(root), 0);
  });
}

Hooks.once("init", () => installOpeningStakesTooltipUI());
