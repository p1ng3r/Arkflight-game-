const STORAGE_KEY = "arkflight.openingLayoutTuner.v4";

const baseBox = () => ({ x: 0, y: 0, width: 0, height: 0, z: 0 });
const baseSize = () => ({ x: 0, y: 0, size: 0, z: 0 });
const baseChromePiece = () => ({ x: 0, y: 0, width: 0, height: 0, scale: 0, z: 0 });

const DEFAULTS = (() => {
  const d = {
    vignette: baseBox(),
    round: baseBox(),
    compass: baseSize(),
    logo: baseSize(),
    begin: baseBox(),
    layoutButton: baseSize(),
    stakes: baseBox(),
    hazards: baseBox(),
    scoring: baseBox(),
    outerTL: baseSize(), outerTR: baseSize(), outerBR: baseSize(), outerBL: baseSize()
  };
  for (const panel of ["stakes", "hazards", "scoring"]) {
    d[`${panel}ChromeMaster`] = { scale: 0, x: 0, y: 0, z: 0 };
    d[`${panel}Fill`] = { x: 0, y: 0, width: 0, height: 0, opacity: 0, z: 0 };
    for (const part of ["TL", "TR", "BL", "BR", "Top", "Bottom", "Left", "Right"]) d[`${panel}${part}`] = baseChromePiece();
  }
  return Object.freeze(d);
})();

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
const px = (v) => `${Number(v) || 0}px`;

function cssName(target) {
  return target.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function applyState(root, state) {
  const style = root.style;
  for (const [target, values] of Object.entries(state)) {
    const name = cssName(target);
    for (const [field, raw] of Object.entries(values)) {
      const value = Number(raw) || 0;
      const suffix = field === "z" ? "z-delta" : field === "width" ? "width-delta" : field === "height" ? "height-delta" : field === "size" ? "size-delta" : field === "scale" ? "scale-delta" : field === "opacity" ? "opacity-delta" : field;
      const unitless = field === "z" || field === "opacity";
      style.setProperty(`--af-${name}-${suffix}`, unitless ? String(value) : px(value));
    }
  }
}

function readout(state, target) {
  return Object.entries(state[target]).map(([k,v]) => `${k.toUpperCase()} ${v}`).join("  ");
}

function moveRow() {
  return `<div class="arkflight-opening-tuner-row"><span class="label">Move</span><button data-af-adjust="x" data-af-dir="-1" title="Left"><i class="fa-solid fa-arrow-left"></i></button><button data-af-adjust="x" data-af-dir="1" title="Right"><i class="fa-solid fa-arrow-right"></i></button><button data-af-adjust="y" data-af-dir="-1" title="Up"><i class="fa-solid fa-arrow-up"></i></button><button data-af-adjust="y" data-af-dir="1" title="Down"><i class="fa-solid fa-arrow-down"></i></button></div>`;
}
function sizeRow(mode) {
  if (mode === "box" || mode === "piece" || mode === "fill") return `<div class="arkflight-opening-tuner-row"><span class="label">Width</span><button data-af-adjust="width" data-af-dir="-1">−</button><button data-af-adjust="width" data-af-dir="1">+</button><span class="label second">Height</span><button data-af-adjust="height" data-af-dir="-1">−</button><button data-af-adjust="height" data-af-dir="1">+</button></div>`;
  if (mode === "size") return `<div class="arkflight-opening-tuner-row"><span class="label">Size</span><button data-af-adjust="size" data-af-dir="-1">−</button><button data-af-adjust="size" data-af-dir="1">+</button></div>`;
  if (mode === "master") return `<div class="arkflight-opening-tuner-row"><span class="label">Scale</span><button data-af-adjust="scale" data-af-dir="-1">−</button><button data-af-adjust="scale" data-af-dir="1">+</button></div>`;
  return "";
}
function extraRow(mode) {
  if (mode === "piece") return `<div class="arkflight-opening-tuner-row"><span class="label">Scale</span><button data-af-adjust="scale" data-af-dir="-1">−</button><button data-af-adjust="scale" data-af-dir="1">+</button></div>`;
  if (mode === "fill") return `<div class="arkflight-opening-tuner-row"><span class="label">Opacity</span><button data-af-adjust="opacity" data-af-dir="-1">−</button><button data-af-adjust="opacity" data-af-dir="1">+</button></div>`;
  return "";
}
function targetMarkup(target, label, mode) {
  return `<div class="arkflight-opening-tuner-target" data-af-target="${target}"><div class="arkflight-opening-tuner-target-head"><strong>${label}</strong><span data-af-readout="${target}"></span></div>${moveRow()}${sizeRow(mode)}${extraRow(mode)}<div class="arkflight-opening-tuner-row"><span class="label">Layer</span><button data-af-adjust="z" data-af-dir="-1">−</button><button data-af-adjust="z" data-af-dir="1">+</button></div><button class="arkflight-opening-tuner-reset" data-af-reset-target="${target}">Reset ${label}</button></div>`;
}
function chromeGroup(panel, label) {
  return `<details class="arkflight-opening-tuner-details"><summary>${label} Chrome Pieces</summary>
    ${targetMarkup(`${panel}ChromeMaster`, "Chrome Master", "master")}
    ${targetMarkup(`${panel}TL`, "Top Left Corner", "piece")}
    ${targetMarkup(`${panel}TR`, "Top Right Corner", "piece")}
    ${targetMarkup(`${panel}BL`, "Bottom Left Corner", "piece")}
    ${targetMarkup(`${panel}BR`, "Bottom Right Corner", "piece")}
    ${targetMarkup(`${panel}Top`, "Top Edge", "piece")}
    ${targetMarkup(`${panel}Bottom`, "Bottom Edge", "piece")}
    ${targetMarkup(`${panel}Left`, "Left Edge", "piece")}
    ${targetMarkup(`${panel}Right`, "Right Edge", "piece")}
    ${targetMarkup(`${panel}Fill`, "Panel Fill", "fill")}
  </details>`;
}

function controlsMarkup() {
  const group = (label, rows) => `<div class="arkflight-opening-tuner-group-title">${label}</div>${rows}`;
  return `<button type="button" class="arkflight-opening-tuner-toggle" data-af-tuner-toggle><i class="fa-solid fa-up-down-left-right"></i><span>Layout</span></button>
  <section class="arkflight-opening-tuner" data-af-tuner hidden>
    <header><strong>Opening Layout</strong><button type="button" data-af-tuner-close><i class="fa-solid fa-xmark"></i></button></header>
    <div class="arkflight-opening-tuner-step"><span>Step</span><button data-af-step="1">1</button><button data-af-step="4" class="active">4</button><button data-af-step="10">10</button><span>px</span></div>
    <div class="arkflight-opening-tuner-scroll">
      ${group("Left Art", targetMarkup("vignette","Opening Vignette","box") + targetMarkup("round","Round Caption","box") + targetMarkup("compass","Compass","size") + targetMarkup("logo","Logo","size"))}
      ${group("Controls", targetMarkup("begin","Begin Planning Button","box") + targetMarkup("layoutButton","Layout Tool Button","size"))}
      ${group("Right Panel Shells", targetMarkup("stakes","Event Stakes Panel","box") + targetMarkup("hazards","Active Hazards Panel","box") + targetMarkup("scoring","Round Scoring Panel","box"))}
      ${group("Per-Piece 9-Slice Chrome", chromeGroup("stakes","Event Stakes") + chromeGroup("hazards","Active Hazards") + chromeGroup("scoring","Round Scoring"))}
      ${group("Outer Frame Corners", targetMarkup("outerTL","Top Left Corner","size") + targetMarkup("outerTR","Top Right Corner","size") + targetMarkup("outerBR","Bottom Right Corner","size") + targetMarkup("outerBL","Bottom Left Corner","size"))}
    </div>
    <footer>
      <button type="button" data-af-export-copy title="Copy the complete tuned layout as JSON to paste into ChatGPT"><i class="fa-solid fa-copy"></i> Copy JSON</button>
      <button type="button" data-af-export-download title="Download the complete tuned layout as a JSON file"><i class="fa-solid fa-download"></i> Download</button>
      <button type="button" data-af-reset-all><i class="fa-solid fa-rotate-left"></i> Reset All</button>
    </footer>
  </section>`;
}

function refreshReadouts(panel, state) {
  for (const target of Object.keys(DEFAULTS)) {
    const el = panel.querySelector(`[data-af-readout="${target}"]`);
    if (el) el.textContent = readout(state,target);
  }
}

function exportPayload(state) {
  return {
    kind: "arkflight-opening-layout",
    schemaVersion: 1,
    tunerStorageKey: STORAGE_KEY,
    exportedAt: new Date().toISOString(),
    module: "arkflight-game",
    branch: "feature/ship-event-strain-unification",
    instructions: "Paste this entire JSON object into ChatGPT and ask to bake these tuner values into the Opening Screen production defaults.",
    layout: JSON.parse(JSON.stringify(state))
  };
}

async function copyLayoutExport(state) {
  const text = JSON.stringify(exportPayload(state), null, 2);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  ui.notifications?.info?.("Arkflight layout JSON copied. Paste it directly into ChatGPT.");
}

function downloadLayoutExport(state) {
  const payload = JSON.stringify(exportPayload(state), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `arkflight-opening-layout-${stamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  ui.notifications?.info?.("Arkflight layout JSON downloaded.");
}

function bindTuner(root, wrapper, state) {
  const toggle = wrapper.querySelector("[data-af-tuner-toggle]");
  const panel = wrapper.querySelector("[data-af-tuner]");
  let step = 4;
  toggle?.addEventListener("click", () => { panel.hidden = !panel.hidden; });
  panel.querySelector("[data-af-tuner-close]")?.addEventListener("click", () => { panel.hidden = true; });
  for (const button of panel.querySelectorAll("[data-af-step]")) button.addEventListener("click", () => {
    step = Number(button.dataset.afStep) || 4;
    for (const s of panel.querySelectorAll("[data-af-step]")) s.classList.toggle("active", s === button);
  });
  for (const node of panel.querySelectorAll("[data-af-target]")) {
    const target = node.dataset.afTarget;
    for (const button of node.querySelectorAll("[data-af-adjust]")) button.addEventListener("click", () => {
      const field = button.dataset.afAdjust;
      const dir = Number(button.dataset.afDir) || 0;
      if (!(field in state[target])) return;
      const amount = field === "z" ? dir : field === "opacity" ? dir * 5 : step * dir;
      state[target][field] += amount;
      if (field === "opacity") state[target][field] = Math.max(-100, Math.min(100, state[target][field]));
      applyState(root,state); saveState(state); refreshReadouts(panel,state);
    });
  }
  for (const button of panel.querySelectorAll("[data-af-reset-target]")) button.addEventListener("click", () => {
    const target = button.dataset.afResetTarget;
    state[target] = { ...DEFAULTS[target] };
    applyState(root,state); saveState(state); refreshReadouts(panel,state);
  });
  panel.querySelector("[data-af-export-copy]")?.addEventListener("click", () => copyLayoutExport(state));
  panel.querySelector("[data-af-export-download]")?.addEventListener("click", () => downloadLayoutExport(state));
  panel.querySelector("[data-af-reset-all]")?.addEventListener("click", () => {
    const fresh = cloneDefaults();
    for (const k of Object.keys(DEFAULTS)) state[k] = fresh[k];
    applyState(root,state); saveState(state); refreshReadouts(panel,state);
  });
  refreshReadouts(panel,state);
}

function installTuner(root) {
  if (!game.user?.isGM || !root?.classList?.contains("arkflight-opening-mode")) return false;
  const board = root.querySelector(".arkflight-opening-grid.arkflight-cinematic-opening");
  if (!board) return false;
  const state = readState(); applyState(root,state);
  if (board.querySelector(".arkflight-opening-tuner-shell")) return true;
  const wrapper = document.createElement("div"); wrapper.className = "arkflight-opening-tuner-shell"; wrapper.innerHTML = controlsMarkup(); board.append(wrapper); bindTuner(root,wrapper,state); return true;
}
function queueTuner(root) { let tries=0; const tick=()=>{ if (installTuner(root)||tries>=30) return; tries+=1; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
Hooks.on("renderApplicationV2", (app,element)=>{ const root=boardRoot(app,element); if(root) queueTuner(root); });
