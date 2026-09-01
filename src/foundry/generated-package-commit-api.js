import { buildEnemyPackageCommitPlan } from "../generator/enemy-package-commit-plan.js";
import { resolveGeneratedPreviewPF2e } from "./generated-preview-pf2e-resolver.js";
import { persistGeneratedEnemyPackage } from "./generated-package-persistence.js";

export function installGeneratedPackageCommitAPI() {
  Hooks.once("init", () => {
    game.arkflight ??= {};
    game.arkflight.generatedPackageCommit = {
      buildPlan: buildEnemyPackageCommitPlan,
      resolvePreview: resolveGeneratedPreviewPF2e,
      persist: persistGeneratedEnemyPackage,
      async preflight(preview) {
        const resolvedPreview = preview?.pf2eResolution?.state === "resolved" ? preview : await resolveGeneratedPreviewPF2e(preview);
        const plan = buildEnemyPackageCommitPlan(resolvedPreview);
        const existing = await game.arkflight?.generatedShipFolders?.findShipPackageFolder?.(plan.shipName);
        return Object.freeze({
          preview:resolvedPreview,
          plan,
          existingFolder: existing ? Object.freeze({ id: existing.id, name: existing.name }) : null,
          requiresFolderDecision: Boolean(existing),
          folderChoices: existing ? Object.freeze(["rename", "reuse"]) : Object.freeze([]),
          canPersist: plan.canPersist
        });
      },
      async commit(preview, options={}) {
        const preflight = await this.preflight(preview);
        if (!preflight.canPersist) throw new Error(preflight.plan.blockers?.join("\n") || "Generated vessel is not ready to persist.");
        return persistGeneratedEnemyPackage(preflight.preview, options);
      }
    };
  });
}

installGeneratedPackageCommitAPI();
