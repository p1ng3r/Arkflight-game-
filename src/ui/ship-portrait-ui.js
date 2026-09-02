const MODULE_ID = "arkflight-game";

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function shellFrom(app, html) {
  const element = html instanceof HTMLElement ? html : html?.[0] ?? app?.element?.[0] ?? app?.element;
  if (!(element instanceof HTMLElement)) return null;
  return element.querySelector?.(".arkflight-ship-shell") ?? (element.matches?.(".arkflight-ship-shell") ? element : null);
}

function wirePortrait(app, root) {
  const actor = app?.actor ?? app?.document;
  if (!actor || !shipPayload(actor)) return;
  const portrait = root.querySelector(".arkflight-ship-portrait");
  if (!portrait || portrait.dataset.arkflightPortraitWired === "true") return;

  portrait.dataset.arkflightPortraitWired = "true";
  portrait.title = "Vessel Portrait — click to choose portrait art. Token art is configured separately with the Token button.";
  portrait.classList.add("arkflight-editable-portrait");

  portrait.addEventListener("click", async (event) => {
    if (!actor.isOwner) return;
    event.preventDefault();
    event.stopPropagation();

    const Picker = globalThis.FilePicker?.implementation ?? globalThis.FilePicker;
    if (!Picker) {
      ui.notifications?.warn?.("Foundry image picker is unavailable.");
      return;
    }

    const picker = new Picker({
      type: "image",
      current: actor.img,
      callback: async (path) => {
        if (!path) return;
        await actor.update({ img: path });
      }
    });
    await picker.browse();
  });
}

function refresh(app, html) {
  const root = shellFrom(app, html);
  if (!root) return;
  requestAnimationFrame(() => wirePortrait(app, root));
}

Hooks.on("renderApplicationV2", refresh);
Hooks.on("renderActorSheet", refresh);
