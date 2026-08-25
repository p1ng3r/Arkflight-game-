import { crewEdgeHandRows, rewardRows } from "../event/reward-engine.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

export class ArkflightRewardSummary extends HandlebarsApplication {
  static DEFAULT_OPTIONS = {
    id: "arkflight-reward-summary",
    classes: ["arkflight", "arkflight-reward-summary"],
    position: { width: 820, height: 720 },
    window: { title: "Arkflight Event Outcome", icon: "fa-solid fa-trophy" }
  };

  static PARTS = {
    summary: { template: "modules/arkflight-game/templates/reward-summary.hbs" }
  };

  constructor(controller, options = {}) {
    super(options);
    this.controller = controller;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const state = this.controller?.state ?? null;
    const event = this.controller?.getEvent?.() ?? null;
    const ending = state?.eventEnding ?? null;
    const rewards = state?.eventRewards ?? null;
    return {
      ...context,
      empty: !state || state.phase !== "event-complete" || !ending,
      event,
      ending,
      rewards,
      rewardRows: rewardRows(rewards),
      edgeHand: crewEdgeHandRows(state),
      edgeHandCount: state?.crewEdgeHand?.length ?? 0,
      edgeOverflow: (rewards?.overflowEdgeCards ?? []).length > 0,
      hasRewards: rewardRows(rewards).length > 0
    };
  }
}
