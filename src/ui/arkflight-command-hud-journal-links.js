const HUD_ID = "arkflight-combat-console";

function hudRoot(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  if (id !== HUD_ID) return null;
  return app?.element?.querySelector?.(".afcs-shell") ? app.element : null;
}

function installJournalLink(card, actionId) {
  const text = card.querySelector(".afcs-action-text");
  if (!text) return;

  const details = text.querySelector(".afcs-action-full-rules");
  if (details) details.remove();

  let button = text.querySelector("[data-combat-reference]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "afcs-action-journal-link";
    button.dataset.combatReference = actionId;
    button.innerHTML = '<i class="fa-solid fa-book-open"></i> Full Rules';
    text.append(button);
  }

  if (button.dataset.afchBound === "true") return;
  button.dataset.afchBound = "true";
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await game.arkflight?.combatReference?.openAction?.(actionId);
    } catch (error) {
      console.error("Arkflight | Could not open Combat Reference", error);
      ui.notifications?.error?.(error?.message ?? "Could not open the Arkflight Combat Reference.");
    }
  });
}

function enhance(app) {
  const root = hudRoot(app);
  if (!root) return;

  for (const card of root.querySelectorAll("[data-action-card]")) {
    const actionId = card.querySelector("[data-station-action]")?.dataset.stationAction;
    if (!actionId) continue;
    installJournalLink(card, actionId);
  }
}

Hooks.on("renderApplicationV2", enhance);
Hooks.on("renderApplication", enhance);
