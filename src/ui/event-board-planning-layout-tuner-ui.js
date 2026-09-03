const STORAGE_KEY = "arkflight.planningLayoutTuner.v1";

const DEFAULTS = Object.freeze({
  banner: { x: 0, y: 0, width: 0 },
  rail: { x: 0, y: 0, width: 0 },
  detail: { x: 0, y: 0, width: 0 },
  footer: { x: 0, y: 0, width: 0 },
  workspace: { railWidth: 0, gap: 0 }
});

const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULTS));

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const state = cloneDefaults();
    if (!saved || typeof saved !== "object") return state;
    for (const [target, values] of Object.entries(state)) Object.assign(values, saved[target] ?? {});
    return state;
  } catch {
    return cloneDefaults();
  }
}

const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const px = (value) => `${Number(value) || 0}px`;

function applyState(root, state) {
  if (!root) return;
  const style = root.style;
  for (const target of ["banner", "rail", "detail", "footer"]) {
    const values = state[target];
    style.setProperty(`--af-plan-${target}-x`, px(values.x));
    style.setProperty(`--af-plan-${target}-y`, px(values.y));
    style.setProperty(`--af-plan-${target}-width`, px(values.width));
  }
  style.setProperty("--af-plan-workspace-rail-width", px(state.workspace.railWidth));
  style.setProperty("--af-plan-workspace-gap", px(state.workspace.gap));
}

function readout(state, target) {
  return Object.entries(state[target]).map(([key, value]) => `${key} ${value}`).join(" · ");
}

function moveControls() {
  return `<div class="arkflight-planning-tuner-row"><span>Move</span>
    <button type="button" data-plan-field="x" data-plan-dir="-1" title="Left"><i class="fa-solid fa-arrow-left"></i></button>
    <button type="button" data-plan-field="x" data-plan-dir="1" title="Right"><i class="fa-solid fa-arrow-right"></i></button>
    <button type="button" data-plan-field="y" data-plan-dir="-1" title="Up"><i class="fa-solid fa-arrow-up"></i></button>
    <button type="button" data-plan-field="y" data-plan-dir="1" title="Down"><i class="fa-solid fa-arrow-down"></i></button>
  </div>`;
}

function targetMarkup(target, label) {
  return `<section class="arkflight-planning-tuner-target" data-plan-target="${target}">
    <header><strong>${label}</strong><small data-plan-readout="${target}"></small></header>
    ${moveControls()}
    <div class="arkflight-planning-tuner-row"><span>Width</span>
      <button type="button" data-plan-field="width" data-plan-dir="-1">−</button>
      <button type="button" data-plan-field="width" data-plan-dir="1">+</button>
    </div>
    <button type="button" class="arkflight-planning-tuner-reset" data-plan-reset="${target}">Reset ${label}</button>
  </section>`;
}

function workspaceMarkup() {
  return `<section class="arkflight-planning-tuner-target" data-plan-target="workspace">
    <header><strong>Workspace Split</strong><small data-plan-readout="workspace"></small></header>
    <div class="arkflight-planning-tuner-row"><span>Rail Width</span>
      <button type="button" data-plan-field="railWidth" data-plan-dir="-1">−</button>
      <button type="button" data-plan-field="railWidth" data-plan-dir="1">+</button>
    </div>
    <div class="arkflight-planning-tuner-row"><span>Gap</span>
      <button type="button" data-plan-field="gap" data-plan-dir="-1">−</button>
      <button type="button" data-plan-field="gap" data-plan-dir="1">+</button>
    </div>
    <button type="button" class="arkflight-planning-tuner-reset" data-plan-reset="workspace">Reset Workspace</button>
  </section>`;
}

function tunerMarkup() {
  return `<section class="arkflight-planning-layout-tuner" data-plan-layout-tuner hidden>
    <header class="arkflight-planning-tuner-header">
      <div><strong>Planning Layout</strong><small>GM-only live layout controls</small></div>
      <button type="button" data-plan-close title="Close"><i class="fa-solid fa-xmark"></i></button>
    </header>
    <div class="arkflight-planning-tuner-step"><span>Step</span><button type="button" data-plan-step="1">1</button><button type="button" data-plan-step="4" class="active">4</button><button type="button" data-plan-step="10">10</button><span>px</span></div>
    <div class="arkflight-planning-tuner-actions">
      <button type="button" data-plan-reset-all><i class="fa-solid fa-rotate-left"></i> Reset All</button>
      <button type="button" data-plan-copy><i class="fa-solid fa-copy"></i> Copy JSON</button>
    </div>
    <div class="arkflight-planning-tuner-scroll">
      ${workspaceMarkup()}
      ${targetMarkup("banner", "Round Banner")}
      ${targetMarkup("rail", "Station Rail")}
      ${targetMarkup("detail", "Station Detail")}
      ${targetMarkup("footer", "Lock Plan Footer")}
    </div>
  </section>`;
}

function refreshReadouts(panel, state) {
  for (const target of Object.keys(state)) {
    const el = panel.querySelector(`[data-plan-readout="${target}"]`);
    if (el) el.textContent = readout(state, target);
  }
}

function ensurePanel(root) {
  if (!root || !game.user?.isGM || !root.querySelector(".arkflight-planning-workspace")) return null;
  let panel = root.querySelector("[data-plan-layout-tuner]");
  if (panel) return panel;

  root.insertAdjacentHTML("beforeend", tunerMarkup());
  panel = root.querySelector("[data-plan-layout-tuner]");
  if (!panel) return null;

  let state = readState();
  let step = 4;
  applyState(root, state);
  refreshReadouts(panel, state);

  panel.addEventListener("click", async (event) => {
    const stepButton = event.target.closest?.("[data-plan-step]");
    if (stepButton) {
      step = Number(stepButton.dataset.planStep) || 4;
      panel.querySelectorAll("[data-plan-step]").forEach((button) => button.classList.toggle("active", button === stepButton));
      return;
    }

    if (event.target.closest?.("[data-plan-close]")) {
      panel.hidden = true;
      root.dispatchEvent(new CustomEvent("arkflight:planning-layout-tuner", { detail: { open: false } }));
      return;
    }

    const resetTarget = event.target.closest?.("[data-plan-reset]")?.dataset.planReset;
    if (resetTarget && DEFAULTS[resetTarget]) {
      state[resetTarget] = JSON.parse(JSON.stringify(DEFAULTS[resetTarget]));
      saveState(state);
      applyState(root, state);
      refreshReadouts(panel, state);
      return;
    }

    if (event.target.closest?.("[data-plan-reset-all]")) {
      state = cloneDefaults();
      saveState(state);
      applyState(root, state);
      refreshReadouts(panel, state);
      return;
    }

    if (event.target.closest?.("[data-plan-copy]")) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
        ui.notifications?.info?.("Planning layout JSON copied.");
      } catch (error) {
        console.error("Arkflight | Could not copy planning layout JSON", error);
        ui.notifications?.warn?.("Could not copy planning layout JSON.");
      }
      return;
    }

    const adjust = event.target.closest?.("[data-plan-field][data-plan-dir]");
    if (!adjust) return;
    const target = adjust.closest?.("[data-plan-target]")?.dataset.planTarget;
    const field = adjust.dataset.planField;
    const dir = Number(adjust.dataset.planDir) || 0;
    if (!target || !field || !(field in (state[target] ?? {}))) return;

    state[target][field] = (Number(state[target][field]) || 0) + (step * dir);
    saveState(state);
    applyState(root, state);
    refreshReadouts(panel, state);
  });

  return panel;
}

function toggle(root, button) {
  const panel = ensurePanel(root);
  if (!panel) {
    ui.notifications?.warn?.("Planning layout tools are only available during Crew Planning.");
    return false;
  }
  panel.hidden = !panel.hidden;
  button?.classList?.toggle("active", !panel.hidden);
  button?.setAttribute?.("aria-pressed", panel.hidden ? "false" : "true");
  return true;
}

Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.planningLayoutTuner = { toggle, ensurePanel };
});

Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.id !== "arkflight-event-board") return;
  const root = element instanceof HTMLElement ? element : element?.[0] ?? app.element?.[0] ?? app.element ?? null;
  if (!root || !game.user?.isGM || !root.querySelector?.(".arkflight-planning-workspace")) return;
  applyState(root, readState());
});
