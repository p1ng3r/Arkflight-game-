import { ayerstoneFactionOptions, AYERSTONE_HOUSES } from "../generator/ayerstone-setting-catalog.js";

const GM_OPERATIONS_ID = "arkflight-gm-operations";

function addFactionSuggestions(root) {
  const input = root.querySelector('.arkflight-gm-generator-config input[name="faction"]');
  if (!input || input.list) return;
  const list = document.createElement("datalist");
  list.id = "arkflight-ayerstone-factions";
  for (const value of [...ayerstoneFactionOptions(), ...AYERSTONE_HOUSES]) {
    const option = document.createElement("option");
    option.value = value;
    list.append(option);
  }
  input.setAttribute("list", list.id);
  input.placeholder = "Ayerstone faction, house, or custom affiliation";
  input.after(list);
}

function addRewardWeight(root) {
  const config = root.querySelector(".arkflight-gm-generator-config");
  const fields = config?.querySelector(".arkflight-gm-generator-fields");
  if (!fields || fields.querySelector('[name="rewardWeight"]')) return;
  const label = document.createElement("label");
  const title = document.createElement("span");
  title.textContent = "Reward Weight";
  const select = document.createElement("select");
  select.name = "rewardWeight";
  const current = config.closest(".arkflight-gm-generator-workspace")?.ownerDocument?.defaultView ? null : null;
  for (const [value, text] of [["auto","Auto"],["minor","Minor"],["standard","Standard"],["major","Major"],["hoard","Hoard"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  label.append(title, select);
  fields.append(label);
}

function restoreRewardWeight(app, root) {
  const select = root.querySelector('.arkflight-gm-generator-config [name="rewardWeight"]');
  if (!select) return;
  select.value = app._arkflightEnemyGeneratorConfig?.rewardWeight ?? "auto";
}

function enhance(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  if (app.activeSection !== "generate") return;
  const root = app.element;
  if (!root) return;
  addFactionSuggestions(root);
  addRewardWeight(root);
  restoreRewardWeight(app, root);
}

Hooks.on("renderApplicationV2", (app) => enhance(app));
