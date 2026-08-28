const STORAGE_KEY = "arkflight.openingLayoutTuner.v2";

const DEFAULTS = Object.freeze({
  vignette: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  round: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  compass: { x: 0, y: 0, size: 0, z: 0 },
  logo: { x: 0, y: 0, size: 0, z: 0 },
  stakes: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  hazards: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  scoring: { x: 0, y: 0, width: 0, height: 0, z: 0 }
});

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

function cloneDefaults() { return JSON.parse(JSON.stringify(DEFAULTS)); }

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const state = cloneDefaults();
    if (!saved || typeof saved !== "object") return state;
    for (const [target, values] of Object.entries(state)) Object.assign(values, saved[target] ?? {});
    return state;
  } catch { return cloneDefaults(); }
}

function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function px(value) { return `${Number(value) || 0}px`; }

function applyState(root, state) {
  const style = root.style;
  const setBox = (prefix, values) => {
    style.setProperty(`--af-${prefix}-x`, px(values.x));
    style.setProperty(`--af-${prefix}-y`, px(values.y));
    style.setProperty(`--af-${prefix}-width-delta`, px(values.width));
    style.setProperty(`--af-${prefix}-height-delta`, px(values.height));
    style.setProperty(`--af-${prefix}-z-delta`, String(Number(values.z) || 0));
  };
  const setSized = (prefix, values) => {
    style.setProperty(`--af-${prefix}-x`, px(values.x));
    style.setProperty(`--af-${prefix}-y`, px(values.y));
    style.setProperty(`--af-${prefix}-size-delta`, px(values.size));
    style.setProperty(`--af-${prefix}-z-delta`, String(Number(values.z) || 0));
  };

  setBox("vignette", state.vignette);
  setBox("round", state.round);
  setSized("compass", state.compass);
  setSized("logo", state.logo);
  setBox("stakes", state.stakes);
  setBox("hazards", state.hazards);
  setBox("scoring", state.scoring);
}

function valueReadout(state, target) {
  const v = state[target];
  if ("width" in v) return `X ${v.x}  Y ${v.y}  W ${v.width}  H ${v.height}  Z ${v.z}`;
  return `X ${v.x}  Y ${v.y}  SIZE ${v.size}  Z ${v.z}`;
}

function controlsMarkup() {
  return `
    <button type="button" class="arkflight-opening-tuner-toggle" data-af-tuner-toggle title="Opening layout controls">
      <i class="fa-solid fa-up-down-left-right"></i><span>Layout</span>
    </button>
    <section class="arkflight-opening-tuner" data-af-tuner hidden>
      <header><strong>Opening Layout</strong><button type="button" data-af-tuner-close title="Close"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="arkflight-opening-tuner-step"><span>Step</span><button type="button" data-af-step="1">1</button><button type="button" data-af-step="4" class="active">4</button><button type="button" data-af-step="10">10</button><span>px</span></div>
      <div class="arkflight-opening-tuner-scroll">
        <div class="arkflight-opening-tuner-group-title">Left Art</div>
        ${targetMarkup("vignette", "Opening Vignette", "box")}
        ${targetMarkup("round", "Round Caption", "box")}
        ${targetMarkup("compass", "Compass", "size")}
        ${targetMarkup("logo", "Logo", "size")}
        <div class="arkflight-opening-tuner-group-title">Right Panels</div>
        ${targetMarkup("stakes", "Event Stakes", "box")}
        ${targetMarkup("hazards", "Active Hazards", "box")}
        ${targetMarkup("scoring", "Round Scoring", "box")}
      </div>
      <footer><button type="button" data-af-reset-all><i class="fa-solid fa-rotate-left"></i> Reset All</button></footer>
    </section>`;
}

function targetMarkup(target, label, mode) {
  const sizing = mode === "box" ? `
    <div class="arkflight-opening-tuner-row"><span class="label">Width</span><button type="button" data-af-adjust="width" data-af-dir="-1">−</button><button type="button" data-af-adjust="width" data-af-dir="1">+</button><span class="label second">Height</span><button type="button" data-af-adjust="height" data-af-dir="-1">−</button><button type="button" data-af-adjust="height" data-af-dir="1">+</button></div>` : `
    <div class="arkflight-opening-tuner-row"><span class="label">Size</span><button type="button" data-af-adjust="size" data-af-dir="-1">−</button><button type="button" data-af-adjust="size" data-af-dir="1">+</button></div>`;

  return `<div class="arkflight-opening-tuner-target" data-af-target="${target}">
    <div class="arkflight-opening-tuner-target-head"><strong>${label}</strong><span data-af-readout="${target}"></span></div>
    <div class="arkflight-opening-tuner-row"><span class="label">Move</span><button type="button" data-af-adjust="x" data-af-dir="-1" title="Left"><i class="fa-solid fa-arrow-left"></i></button><button type="button" data-af-adjust="x" data-af-dir="1" title="Right"><i class="fa-solid fa-arrow-right"></i></button><button type="button" data-af-adjust="y" data-af-dir="-1" title="Up"><i class="fa-solid fa-arrow-up"></i></button><button type="button" data-af-adjust="y" data-af-dir="1" title="Down"><i class="fa-solid fa-arrow-down"></i></button></div>
    ${sizing}
    <div class="arkflight-opening-tuner-row"><span class="label">Layer</span><button type="button" data-af-adjust="z" data-af-dir="-1" title="Send backward">−</button><button type="button" data-af-adjust="z" data-af-dir="1" title="Bring forward">+</button></div>
    <button type="button" class="arkflight-opening-tuner-reset" data-af-reset-target="${target}">Reset ${label}</button>
  </div>`;
}

function refreshReadouts(panel, state) {
  for (const target of Object.keys(DEFAULTS)) {
    const output = panel.querySelector(`[data-af-readout="${target}"]`);
    if (output) output.textContent = valueReadout(state, target);
  }
}

function bindTuner(root, wrapper, state) {
  const toggle = wrapper.querySelector("[data-af-tuner-toggle]");
  const panel = wrapper.querySelector("[data-af-tuner]");
  let step = 4;

  toggle?.addEventListener("click", () => { panel.hidden = !panel.hidden; });
  panel.querySelector("[data-af-tuner-close]")?.addEventListener("click", () => { panel.hidden = true; });

  for (const button of panel.querySelectorAll("[data-af-step]")) {
    button.addEventListener("click", () => {
      step = Number(button.dataset.afStep) || 4;
      for (const sibling of panel.querySelectorAll("[data-af-step]")) sibling.classList.toggle("active", sibling === button);
    });
  }

  for (const targetNode of panel.querySelectorAll("[data-af-target]")) {
    const target = targetNode.dataset.afTarget;
    for (const button of targetNode.querySelectorAll("[data-af-adjust]")) {
      button.addEventListener("click", () => {
        const field = button.dataset.afAdjust;
        const dir = Number(button.dataset.afDir) || 0;
        if (!(field in state[target])) return;
        state[target][field] += field === "z" ? dir : step * dir;
        applyState(root, state);
        saveState(state);
        refreshReadouts(panel, state);
      });
    }
  }

  for (const button of panel.querySelectorAll("[data-af-reset-target]")) {
    button.addEventListener("click", () => {
      const target = button.dataset.afResetTarget;
      state[target] = { ...DEFAULTS[target] };
      applyState(root, state);
      saveState(state);
      refreshReadouts(panel, state);
    });
  }

  panel.querySelector("[data-af-reset-all]")?.addEventListener("click", () => {
    const fresh = cloneDefaults();
    for (const key of Object.keys(DEFAULTS)) state[key] = fresh[key];
    applyState(root, state);
    saveState(state);
    refreshReadouts(panel, state);
  });

  refreshReadouts(panel, state);
}

function installTuner(root) {
  if (!game.user?.isGM || !root?.classList?.contains("arkflight-opening-mode")) return false;
  const board = root.querySelector(".arkflight-opening-grid.arkflight-cinematic-opening");
  if (!board) return false;

  const state = readState();
  applyState(root, state);

  if (board.querySelector(".arkflight-opening-tuner-shell")) return true;
  const wrapper = document.createElement("div");
  wrapper.className = "arkflight-opening-tuner-shell";
  wrapper.innerHTML = controlsMarkup();
  board.append(wrapper);
  bindTuner(root, wrapper, state);
  return true;
}

function queueTuner(root) {
  let tries = 0;
  const tick = () => {
    if (installTuner(root) || tries >= 14) return;
    tries += 1;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

Hooks.on("renderApplicationV2", (app, element) => {
  const root = boardRoot(app, element);
  if (!root) return;
  queueTuner(root);
});
