const STORAGE_KEY = "arkflight.openingLayoutTuner.v3";

const DEFAULTS = Object.freeze({
  vignette: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  round: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  compass: { x: 0, y: 0, size: 0, z: 0 },
  logo: { x: 0, y: 0, size: 0, z: 0 },
  begin: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  layoutButton: { x: 0, y: 0, size: 0, z: 0 },
  stakes: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  hazards: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  scoring: { x: 0, y: 0, width: 0, height: 0, z: 0 },
  stakesFrame: { x: 0, y: 0, corner: 0, edge: 0, z: 0 },
  hazardsFrame: { x: 0, y: 0, corner: 0, edge: 0, z: 0 },
  scoringFrame: { x: 0, y: 0, corner: 0, edge: 0, z: 0 },
  outerTL: { x: 0, y: 0, size: 0, z: 0 },
  outerTR: { x: 0, y: 0, size: 0, z: 0 },
  outerBR: { x: 0, y: 0, size: 0, z: 0 },
  outerBL: { x: 0, y: 0, size: 0, z: 0 }
});

function boardRoot(app, element) {
  if (app?.id !== "arkflight-event-board") return null;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return app.element instanceof HTMLElement ? app.element : app.element?.[0] ?? null;
}

const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULTS));
function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const state = cloneDefaults();
    if (!saved || typeof saved !== "object") return state;
    for (const [target, values] of Object.entries(state)) Object.assign(values, saved[target] ?? {});
    return state;
  } catch { return cloneDefaults(); }
}
const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const px = (value) => `${Number(value) || 0}px`;

function applyState(root, state) {
  const style = root.style;
  for (const [target, values] of Object.entries(state)) {
    for (const [field, value] of Object.entries(values)) {
      const suffix = field === "z" ? "z-delta" : field === "width" ? "width-delta" : field === "height" ? "height-delta" : field === "size" ? "size-delta" : field === "corner" ? "corner-delta" : field === "edge" ? "edge-delta" : field;
      style.setProperty(`--af-${target.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-${suffix}`, field === "z" ? String(Number(value) || 0) : px(value));
    }
  }
}

function readout(state, target) {
  const v = state[target];
  return Object.entries(v).map(([k, val]) => `${k.toUpperCase()} ${val}`).join("  ");
}

function controlsMarkup() {
  const group = (label, rows) => `<div class="arkflight-opening-tuner-group-title">${label}</div>${rows}`;
  return `
    <button type="button" class="arkflight-opening-tuner-toggle" data-af-tuner-toggle title="Opening layout controls"><i class="fa-solid fa-up-down-left-right"></i><span>Layout</span></button>
    <section class="arkflight-opening-tuner" data-af-tuner hidden>
      <header><strong>Opening Layout</strong><button type="button" data-af-tuner-close title="Close"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="arkflight-opening-tuner-step"><span>Step</span><button type="button" data-af-step="1">1</button><button type="button" data-af-step="4" class="active">4</button><button type="button" data-af-step="10">10</button><span>px</span></div>
      <div class="arkflight-opening-tuner-scroll">
        ${group("Left Art", targetMarkup("vignette","Opening Vignette","box") + targetMarkup("round","Round Caption","box") + targetMarkup("compass","Compass","size") + targetMarkup("logo","Logo","size"))}
        ${group("Controls", targetMarkup("begin","Begin Planning Button","box") + targetMarkup("layoutButton","Layout Tool Button","size"))}
        ${group("Right Panel Shells", targetMarkup("stakes","Event Stakes","box") + targetMarkup("hazards","Active Hazards","box") + targetMarkup("scoring","Round Scoring","box"))}
        ${group("Right Panel Frame Art", targetMarkup("stakesFrame","Stakes Frame Chrome","frame") + targetMarkup("hazardsFrame","Hazards Frame Chrome","frame") + targetMarkup("scoringFrame","Scoring Frame Chrome","frame"))}
        ${group("Outer Frame Corners", targetMarkup("outerTL","Top Left Corner","size") + targetMarkup("outerTR","Top Right Corner","size") + targetMarkup("outerBR","Bottom Right Corner","size") + targetMarkup("outerBL","Bottom Left Corner","size"))}
      </div>
      <footer><button type="button" data-af-reset-all><i class="fa-solid fa-rotate-left"></i> Reset All</button></footer>
    </section>`;
}

function targetMarkup(target, label, mode) {
  let sizing = "";
  if (mode === "box") sizing = `<div class="arkflight-opening-tuner-row"><span class="label">Width</span><button data-af-adjust="width" data-af-dir="-1">−</button><button data-af-adjust="width" data-af-dir="1">+</button><span class="label second">Height</span><button data-af-adjust="height" data-af-dir="-1">−</button><button data-af-adjust="height" data-af-dir="1">+</button></div>`;
  if (mode === "size") sizing = `<div class="arkflight-opening-tuner-row"><span class="label">Size</span><button data-af-adjust="size" data-af-dir="-1">−</button><button data-af-adjust="size" data-af-dir="1">+</button></div>`;
  if (mode === "frame") sizing = `<div class="arkflight-opening-tuner-row"><span class="label">Corner</span><button data-af-adjust="corner" data-af-dir="-1">−</button><button data-af-adjust="corner" data-af-dir="1">+</button><span class="label second">Edge</span><button data-af-adjust="edge" data-af-dir="-1">−</button><button data-af-adjust="edge" data-af-dir="1">+</button></div>`;
  return `<div class="arkflight-opening-tuner-target" data-af-target="${target}"><div class="arkflight-opening-tuner-target-head"><strong>${label}</strong><span data-af-readout="${target}"></span></div><div class="arkflight-opening-tuner-row"><span class="label">Move</span><button data-af-adjust="x" data-af-dir="-1" title="Left"><i class="fa-solid fa-arrow-left"></i></button><button data-af-adjust="x" data-af-dir="1" title="Right"><i class="fa-solid fa-arrow-right"></i></button><button data-af-adjust="y" data-af-dir="-1" title="Up"><i class="fa-solid fa-arrow-up"></i></button><button data-af-adjust="y" data-af-dir="1" title="Down"><i class="fa-solid fa-arrow-down"></i></button></div>${sizing}<div class="arkflight-opening-tuner-row"><span class="label">Layer</span><button data-af-adjust="z" data-af-dir="-1">−</button><button data-af-adjust="z" data-af-dir="1">+</button></div><button class="arkflight-opening-tuner-reset" data-af-reset-target="${target}">Reset ${label}</button></div>`;
}

function refreshReadouts(panel, state) {
  for (const target of Object.keys(DEFAULTS)) {
    const output = panel.querySelector(`[data-af-readout="${target}"]`);
    if (output) output.textContent = readout(state, target);
  }
}

function bindTuner(root, wrapper, state) {
  const toggle = wrapper.querySelector("[data-af-tuner-toggle]");
  const panel = wrapper.querySelector("[data-af-tuner]");
  let step = 4;
  toggle?.addEventListener("click", () => { panel.hidden = !panel.hidden; });
  panel.querySelector("[data-af-tuner-close]")?.addEventListener("click", () => { panel.hidden = true; });

  for (const button of panel.querySelectorAll("[data-af-step]")) button.addEventListener("click", () => {
    step = Number(button.dataset.afStep) || 4;
    for (const sibling of panel.querySelectorAll("[data-af-step]")) sibling.classList.toggle("active", sibling === button);
  });

  for (const targetNode of panel.querySelectorAll("[data-af-target]")) {
    const target = targetNode.dataset.afTarget;
    for (const button of targetNode.querySelectorAll("[data-af-adjust]")) button.addEventListener("click", () => {
      const field = button.dataset.afAdjust;
      const dir = Number(button.dataset.afDir) || 0;
      if (!(field in state[target])) return;
      state[target][field] += field === "z" ? dir : step * dir;
      applyState(root, state); saveState(state); refreshReadouts(panel, state);
    });
  }

  for (const button of panel.querySelectorAll("[data-af-reset-target]")) button.addEventListener("click", () => {
    const target = button.dataset.afResetTarget;
    state[target] = { ...DEFAULTS[target] };
    applyState(root, state); saveState(state); refreshReadouts(panel, state);
  });

  panel.querySelector("[data-af-reset-all]")?.addEventListener("click", () => {
    const fresh = cloneDefaults();
    for (const key of Object.keys(DEFAULTS)) state[key] = fresh[key];
    applyState(root, state); saveState(state); refreshReadouts(panel, state);
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
    if (installTuner(root) || tries >= 30) return;
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
