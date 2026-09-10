const MODULE_ID = "arkflight-game";
const ROOT = `modules/${MODULE_ID}/assets/icons`;

export const REFIT_BLUEPRINT_ICONS = Object.freeze({
  shipMod: `${ROOT}/ship-mods/blueprint_ship_mods.webp`,
  arkengineMod: `${ROOT}/arkengine-mods/blueprint_engine_mods.webp`,
  weapon: `${ROOT}/weapons/blueprint_weapons.webp`
});

export function blueprintIconForFamily(family) {
  return REFIT_BLUEPRINT_ICONS[family] ?? `${ROOT}/mod-ui/blueprint_fabrication_icon.webp`;
}

export function chooseRefitAssetKind({ name = "Arkflight fitting", family = "shipMod" } = {}) {
  const { DialogV2 } = foundry.applications.api;
  const icon = blueprintIconForFamily(family);
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };
    const dialog = new DialogV2({
      window: { title: `Add ${name} to Vessel` },
      content: `<div class="arkflight-refit-drop-choice">
        <img src="${icon}" alt="Blueprint">
        <div>
          <h2>What are you adding?</h2>
          <p><strong>${foundry.utils.escapeHTML(name)}</strong></p>
          <p>Choose whether this compendium entry represents a physical fitting aboard the ship or a learned blueprint.</p>
        </div>
      </div>`,
      buttons: [
        { action: "cancel", label: "Cancel", callback: () => finish(null) },
        { action: "blueprint", label: "Blueprint", icon: "fa-solid fa-scroll", callback: () => finish("blueprint") },
        { action: "part", label: "Physical Part", icon: "fa-solid fa-gears", default: true, callback: () => finish("part") }
      ],
      close: () => finish(null)
    });
    dialog.render({ force: true });
  });
}
