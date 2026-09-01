import { buildEnemyPackageCommitPlan } from "../generator/enemy-package-commit-plan.js";

export function installGeneratedPackageCommitAPI() {
  Hooks.once("init", () => {
    game.arkflight ??= {};
    game.arkflight.generatedPackageCommit = {
      buildPlan: buildEnemyPackageCommitPlan,
      async preflight(preview) {
        const plan = buildEnemyPackageCommitPlan(preview);
        const existing = await game.arkflight?.generatedShipFolders?.findShipPackageFolder?.(plan.shipName);
        return Object.freeze({
          plan,
          existingFolder: existing ? Object.freeze({ id: existing.id, name: existing.name }) : null,
          requiresFolderDecision: Boolean(existing),
          folderChoices: existing ? Object.freeze(["rename", "reuse"]) : Object.freeze([]),
          canPersist: plan.canPersist
        });
      }
    };
  });
}

installGeneratedPackageCommitAPI();
