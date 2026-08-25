import { crewEdgeHandRows, rewardRows } from "../event/reward-engine.js";
import { grantPf2eRewards, pf2eRewardRecipients } from "../pf2e/reward-granter.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const HandlebarsApplication = HandlebarsApplicationMixin(ApplicationV2);

function hasPf2eGrantableRewards(rewards) {
  if (!rewards) return false;
  return Number(rewards.gold ?? 0) > 0
    || (rewards.valuables?.length ?? 0) > 0
    || (rewards.salvage?.length ?? 0) > 0
    || (rewards.pf2eItems?.length ?? 0) > 0;
}

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
    const rows = rewardRows(rewards);
    return {
      ...context,
      empty: !state || state.phase !== "event-complete" || !ending,
      event,
      ending,
      rewards,
      rewardRows: rows,
      edgeHand: crewEdgeHandRows(state),
      edgeHandCount: state?.crewEdgeHand?.length ?? 0,
      edgeOverflow: (rewards?.overflowEdgeCards ?? []).length > 0,
      hasRewards: rows.length > 0,
      hasPf2eGrantableRewards: hasPf2eGrantableRewards(rewards),
      isGM: game.user.isGM,
      rewardsGranted: Boolean(rewards?.granted),
      rewardRecipientName: rewards?.recipientActorName ?? null,
      recipients: pf2eRewardRecipients()
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const button = this.element?.querySelector?.("[data-ark-action='grant-pf2e-rewards']");
    if (!button) return;

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const select = this.element.querySelector("[data-ark-reward-recipient]");
      const actor = select?.value ? game.actors.get(select.value) : null;
      if (!actor) {
        ui.notifications?.warn("Choose a PF2e reward recipient first.");
        return;
      }

      button.disabled = true;
      try {
        const rewards = this.controller.state?.eventRewards;
        if (rewards?.granted) throw new Error(`These rewards were already granted to ${rewards.recipientActorName ?? "a recipient"}.`);
        const result = await grantPf2eRewards({ actor, rewards });
        await this.controller.command({
          type: "mark-rewards-granted",
          actorId: result.actorId,
          actorName: result.actorName,
          createdItemIds: result.createdItemIds,
          createdItemNames: result.createdItemNames
        });
        ui.notifications?.info(`Arkflight rewards granted to ${result.actorName} as native PF2e inventory items.`);
        this.render({ force: true });
      } catch (error) {
        console.error("Arkflight | PF2e reward grant failed", error);
        ui.notifications?.error(error.message);
        button.disabled = false;
      }
    });
  }
}
