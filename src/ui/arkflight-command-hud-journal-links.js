const MODULE_ID = "arkflight-game";
const HUD_ID = "arkflight-combat-console";

function hudRoot(app) {
  const id = app?.id ?? app?.options?.id ?? "";
  if (id !== HUD_ID) return null;
  return app?.element?.querySelector?.(".afcs-shell") ? app.element : null;
}

function shipPayload(actor) {
  return actor?.flags?.[MODULE_ID]?.ship ?? null;
}

function shipLevel(actor) {
  return Math.max(1, Math.min(20, Math.trunc(Number(shipPayload(actor)?.progression?.level) || 1)));
}

function driveCrewStrain(actor) {
  const level = shipLevel(actor);
  if (level >= 20) return 0;
  if (level >= 15) return 1;
  return 2;
}

function replaceDriveCrewPresentation(app, card) {
  const actor = app.actor ?? (app.actorId ? game.actors?.get(app.actorId) : null);
  const strain = driveCrewStrain(actor);
  const effect = card.querySelector(".afcs-action-effect");
  if (effect) {
    effect.textContent = strain > 0
      ? `Gain 1 AP. Gain ${strain} Strain. Once per round.`
      : "Gain 1 AP. Gain no Strain. Once per round.";
  }

  const chips = card.querySelector(".afcs-rule-chips");
  if (!chips) return;
  chips.replaceChildren();
  const chipData = [
    ["+1 AP", "gain"],
    [strain > 0 ? `+${strain} Strain` : "No Strain", strain > 0 ? "strain" : "free"],
    ["Once / Round", "limit"]
  ];
  for (const [label, tone] of chipData) {
    const chip = document.createElement("span");
    chip.className = `afcs-rule-chip is-${tone}`;
    chip.textContent = label;
    chips.append(chip);
  }
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
    if (actionId === "captain-drive-the-crew") replaceDriveCrewPresentation(app, card);
    installJournalLink(card, actionId);
  }
}

Hooks.on("renderApplicationV2", enhance);
Hooks.on("renderApplication", enhance);
