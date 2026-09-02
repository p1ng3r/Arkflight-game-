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

function hasAetherScrapReward(rewards) {
  return Number(rewards?.aetherScrap ?? 0) > 0;
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
    const hasPf2e = hasPf2eGrantableRewards(rewards);
    const hasScrap = hasAetherScrapReward(rewards);
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
      hasPf2eGrantableRewards: hasPf2e,
      hasAetherScrapReward: hasScrap,
      hasGrantableRewards: hasPf2e || hasScrap,
      isGM: game.user.isGM,
      rewardsGranted: Boolean(rewards?.granted),
      rewardRecipientName: rewards?.recipientActorName ?? null,
      activeShipName: game.arkflight?.activeShip?.name ?? null,
      recipients: pf2eRewardRecipients()
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const button = this.element?.querySelector?.("[data-ark-action='grant-pf2e-rewards']");
    if (!button) return;

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const rewards = this.controller.state?.eventRewards;
      const needsPf2eRecipient = hasPf2eGrantableRewards(rewards);
      const scrapAmount = Math.max(0, Math.trunc(Number(rewards?.aetherScrap) || 0));
      const select = this.element.querySelector("[data-ark-reward-recipient]");
      const actor = select?.value ? game.actors.get(select.value) : null;
      const ship = game.arkflight?.activeShip ?? null;

      if (needsPf2eRecipient && !actor) {
        ui.notifications?.warn("Choose a PF2e reward recipient first.");
        return;
      }
      if (scrapAmount > 0 && !ship) {
        ui.notifications?.warn("No active Arkflight ship is bound to receive Aether Scrap.");
        return;
      }

      button.disabled = true;
      try {
        if (rewards?.granted) throw new Error(`These rewards were already granted to ${rewards.recipientActorName ?? "a recipient"}.`);

        let pf2eResult = null;
        if (needsPf2eRecipient) pf2eResult = await grantPf2eRewards({ actor, rewards });

        if (scrapAmount > 0) {
          const grantScrap = game.arkflight?.refit?.grantAetherScrap;
          if (typeof grantScrap !== "function") throw new Error("Arkflight Aether Scrap grant API is unavailable.");
          await grantScrap(ship, scrapAmount);
        }

        const recipientName = pf2eResult?.actorName ?? ship?.name ?? "Arkflight rewards";
        await this.controller.command({
          type: "mark-rewards-granted",
          actorId: pf2eResult?.actorId ?? ship?.id ?? null,
          actorName: recipientName,
          createdItemIds: pf2eResult?.createdItemIds ?? [],
          createdItemNames: pf2eResult?.createdItemNames ?? []
        });

        const parts = [];
        if (pf2eResult) parts.push(`PF2e rewards granted to ${pf2eResult.actorName}`);
        if (scrapAmount > 0) parts.push(`${scrapAmount} Aether Scrap added to ${ship.name}`);
        ui.notifications?.info(parts.join("; ") || "Arkflight rewards granted.");
        this.render({ force: true });
      } catch (error) {
        console.error("Arkflight | reward grant failed", error);
        ui.notifications?.error(error.message);
        button.disabled = false;
      }
    });
  }
}
