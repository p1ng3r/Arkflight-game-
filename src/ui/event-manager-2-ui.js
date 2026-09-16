const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

function titleCase(value) { return String(value ?? "").replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function imagePath(pkg, source) {
  const path = pkg?.image ?? "";
  if (!path || /^(https?:|data:|modules\/)/.test(path)) return path;
  if (source === "arkflight-game" || pkg?.builtIn) return `modules/arkflight-game/${path.replace(/^\/+/, "")}`;
  return path;
}

export class ArkflightEventManager2 extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-event-manager-2",
    classes: ["arkflight", "arkflight-event-manager-2"],
    position: { width: 1080, height: 760 },
    window: { title: "Arkflight Event Manager 2.0", icon: "fa-solid fa-compass-drafting", resizable: true }
  };
  static PARTS = { manager: { template: "modules/arkflight-game/templates/event-manager-2.hbs" } };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const api = game.arkflight?.content;
    const activeEventId = game.arkflight?.controller?.state?.eventId ?? null;
    const activePackage = activeEventId ? api?.packageForEvent?.(activeEventId) : null;
    const packages = (api?.list?.() ?? []).map((pkg) => {
      const source = api.source(pkg.id);
      const state = api.state(pkg.id);
      const status = api.status(pkg.id);
      const currentStage = pkg.adventure.stages.find((stage) => stage.id === state.currentStageId) ?? pkg.adventure.stages[0] ?? null;
      const active = activePackage?.id === pkg.id;
      const anotherEventActive = Boolean(activeEventId && !active);
      const compendiums = { ...(pkg.resources?.compendiums ?? {}), ...(state.packs ?? {}) };
      const managedCount = ["journals", "macros", "tables", "actors"].reduce((sum, key) => sum + Number(pkg.content?.[key]?.length ?? 0), 0);
      const currentStageEventId = currentStage?.eventId ?? (pkg.adventure.stages.length ? null : pkg.adventure.entryPoint);
      const canResume = active;
      const canLaunchStage = status.ready && Boolean(currentStageEventId) && !anotherEventActive;
      return {
        ...pkg,
        source,
        imageUrl: imagePath(pkg, source),
        active,
        state,
        status,
        currentStage,
        stageCount: pkg.adventure.stages.length,
        completedCount: state.completedStages.length,
        canLaunch: canResume || canLaunchStage,
        primaryAction: active ? "resume" : "launch",
        launchLabel: active ? "Resume Event" : (currentStageEventId ? (state.completedStages.length ? "Launch Current Stage" : "Launch Adventure") : "Stage Uses Package Tools"),
        hasManagedContent: managedCount > 0,
        compendiums,
        resourceKinds: Object.entries(compendiums).filter(([, id]) => Boolean(id)).map(([kind, id]) => ({ kind, id, label: titleCase(kind) })),
        hasResources: Object.values(compendiums).some(Boolean)
      };
    });

    return {
      ...context,
      packages,
      packageCount: packages.length,
      readyCount: packages.filter((pkg) => pkg.status.ready).length,
      activeEventId,
      activePackage: activePackage ? packages.find((pkg) => pkg.id === activePackage.id) ?? null : null,
      hasPackages: packages.length > 0,
      isGM: game.user?.isGM
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (!this.element) return;
    for (const button of this.element.querySelectorAll("[data-em2-action]")) button.addEventListener("click", async () => {
      const action = button.dataset.em2Action;
      const packageId = button.dataset.packageId;
      try {
        button.disabled = true;
        if (action === "launch") await game.arkflight.content.launch(packageId);
        else if (action === "resume") game.arkflight.openBoard?.();
        else if (action === "sync") await game.arkflight.content.sync(packageId);
        else if (action === "rebuild") await game.arkflight.content.sync(packageId, { force: true });
        else if (action === "open-resource") await game.arkflight.content.openResource(packageId, button.dataset.resourceKind);
        else if (action === "complete-stage") await game.arkflight.content.completeStage(packageId, button.dataset.stageId);
        else if (action === "set-stage") await game.arkflight.content.setStage(packageId, button.dataset.stageId);
        this.render({ force: true });
      } catch (error) {
        console.error("Arkflight | Event Manager 2.0 action failed", error);
        ui.notifications?.error?.(error.message);
      } finally {
        button.disabled = false;
      }
    });
  }
}
