import { generatePF2eOfficerActorDraft } from "../generator/pf2e-officer-actor-draft.js";

const GM_OPERATIONS_ID = "arkflight-gm-operations";

function addOfficerDetails(app) {
  if (app?.id !== GM_OPERATIONS_ID && app?.options?.id !== GM_OPERATIONS_ID) return;
  if (app.activeSection !== "generate") return;
  const preview = app._arkflightEnemyGeneratorPreview;
  const root = app.element;
  if (!preview || !root) return;

  const cards = [...root.querySelectorAll(".arkflight-gm-generator-officers > div")];
  preview.crew?.officers?.forEach((officer, index) => {
    const card = cards[index];
    if (!card || card.querySelector("[data-generated-officer-identity]")) return;
    const detail = document.createElement("div");
    detail.className = "arkflight-gm-generator-officer-identity";
    detail.dataset.generatedOfficerIdentity = officer.station;

    const name = document.createElement("strong");
    name.className = "arkflight-gm-generator-officer-name";
    name.textContent = officer.name ?? officer.role;

    const ancestry = document.createElement("span");
    ancestry.textContent = officer.ancestry ?? "Unknown ancestry";

    const personality = document.createElement("p");
    personality.textContent = officer.personality ?? "";

    const visual = document.createElement("p");
    visual.textContent = officer.visual ?? "";

    const hook = document.createElement("p");
    hook.className = "arkflight-gm-generator-officer-hook";
    hook.textContent = officer.hook ? `Hook: ${officer.hook}` : "";

    const gear = document.createElement("small");
    const signature = officer.signatureGear?.label ?? "signature gear";
    gear.textContent = `Signature: ${signature} · Secondary: ${officer.abstractSecondary ?? "abstract option"}`;

    detail.append(name, ancestry, personality, visual, hook, gear);
    card.append(detail);
  });
}

export function installEnemyGeneratorOfficerDetailUI() {
  Hooks.once("init", () => {
    game.arkflight ??= {};
    game.arkflight.crewGenerator = {
      previewOfficer: generatePF2eOfficerActorDraft,
      canCommitOfficer: false
    };
  });
  Hooks.on("renderApplicationV2", (app) => addOfficerDetails(app));
}

installEnemyGeneratorOfficerDetailUI();
