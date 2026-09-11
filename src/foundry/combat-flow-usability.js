import { applyFreeHelmAllowance, helmRemaining } from "../combat/helm-rules.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const ATTACK_REACTIONS = ["navigator-evasive-maneuver", "battlewatch-spoil-their-aim"];
const DAMAGE_REACTIONS = ["captain-brace-for-impact", "veilwarden-emergency-ward"];
const ENERGY = new Set(["fire", "cold", "electricity", "acid", "sonic", "force"]);
let patchQueued = false;

function ship(actor) { return actor?.flags?.[MODULE_ID]?.ship ?? null; }
function isShip(actor) { return Boolean(ship(actor)); }
function stateOf(combatant) { return combatant?.flags?.[MODULE_ID]?.combatState ?? null; }
function combatantFor(ref = null) {
  if (!game.combat) return null;
  if (ref?.documentName === "Combatant") return ref;
  if (ref?.document?.documentName === "Token") ref = ref.document;
  if (ref?.documentName === "Token") return [...game.combat.combatants].find((c) => c.tokenId === ref.id || c.actorId === ref.actor?.id) ?? null;
  if (ref?.documentName === "Actor") return [...game.combat.combatants].find((c) => c.actorId === ref.id) ?? null;
  if (typeof ref === "string") return game.combat.combatants.get?.(ref) ?? [...game.combat.combatants].find((c) => c.id === ref || c.actorId === ref || c.tokenId === ref) ?? null;
  return game.combat.combatant ?? null;
}

async function ensureHelm(combatant) {
  if (!game.user?.isGM || !combatant || !isShip(combatant.actor)) return null;
  const before = stateOf(combatant);
  if (!before) return null;
  const after = applyFreeHelmAllowance(before);
  if (after !== before) await combatant.update({ [STATE_PATH]: after });
  return after;
}

function queueHelm() {
  if (!game.user?.isGM || patchQueued) return;
  patchQueued = true;
  setTimeout(async () => {
    patchQueued = false;
    const c = game.combat?.combatant;
    if (!c || !isShip(c.actor)) return;
    try {
      const s = await ensureHelm(c);
      if (s) Hooks.callAll("arkflightHelmAllowanceReady", { combatant: c, state: s, remaining: helmRemaining(s) });
    } catch (error) { console.warn("Arkflight | Free Helm setup failed", error); }
  }, 0);
}

function wardable(solution) {
  const type = String(solution?.weapon?.data?.damageProfile?.type ?? "").toLowerCase();
  const threat = String(solution?.weapon?.data?.systemThreat ?? "hull").toLowerCase();
  return ENERGY.has(type) || threat === "lifeveil";
}

async function chooseReaction(title, content, choices) {
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (DialogV2?.wait) {
    try {
      return await DialogV2.wait({
        window: { title },
        content,
        buttons: [
          ...choices.map((c) => ({ action: c.id, label: c.label, icon: c.icon ?? "fa-solid fa-shield", callback: () => c.id })),
          { action: "pass", label: "Pass", icon: "fa-solid fa-forward", default: true, callback: () => null }
        ],
        close: () => null
      });
    } catch (error) { console.warn("Arkflight | Reaction DialogV2 fallback", error); }
  }
  if (!globalThis.Dialog) return null;
  return new Promise((resolve) => {
    const buttons = Object.fromEntries(choices.map((c) => [c.id, { label: c.label, callback: () => resolve(c.id) }]));
    buttons.pass = { label: "Pass", callback: () => resolve(null) };
    new Dialog({ title, content, buttons, default: "pass", close: () => resolve(null) }).render(true);
  });
}

function availableChoices(base, target, ids) {
  const currentEffects = base.state(target)?.stationRuntime?.effects ?? [];
  return ids.flatMap((id) => {
    const action = base.actions?.[id];
    if (!action) return [];
    if (currentEffects.some((effect) => effect.actionId === id)) return [];
    return base.stationActionAvailability?.(id, target)?.ok
      ? [{ id, label: `${action.name} · ${action.cost?.rp ?? 1} RP`, action }]
      : [];
  });
}

async function promptAttackReaction(base, weaponKey, targetRef, attackerRef = null) {
  if (!game.user?.isGM) return null;
  const attacker = attackerRef ? base.findCombatant(attackerRef) : game.combat?.combatant;
  const target = base.findCombatant(targetRef);
  if (!attacker || !target || !isShip(target.actor)) return null;
  let solution;
  try { solution = base.targetingSolution(weaponKey, target, attacker); } catch (_error) { return null; }
  const choices = availableChoices(base, target, ATTACK_REACTIONS);
  if (!choices.length) return null;
  const esc = foundry.utils.escapeHTML;
  const content = `<div class="arkflight-reaction-prompt"><p><strong>${esc(attacker.name)}</strong> declares fire with <strong>${esc(solution.weapon.name)}</strong> against <strong>${esc(target.name)}</strong>.</p><p>${solution.distanceHexes.toFixed(1)} hex · ${esc(solution.range.label)}</p><hr>${choices.map((c) => `<p><strong>${esc(c.action.name)}</strong> — ${esc(c.action.summary ?? c.action.description)}</p>`).join("")}</div>`;
  const id = await chooseReaction(`Attack Reaction — ${target.name}`, content, choices);
  if (id && choices.some((c) => c.id === id)) await base.stationAction(id, { suppressChat: true, reactionContext: "ship-attack" }, target);
  return id;
}

async function promptDamageReaction({ attacker, target, solution, incoming = 0, hardness = 0 } = {}) {
  if (!game.user?.isGM || !attacker || !target || !solution) return null;
  const base = game.arkflight?.combat;
  if (!base) return null;
  const ids = wardable(solution) ? DAMAGE_REACTIONS : ["captain-brace-for-impact"];
  const choices = availableChoices(base, target, ids);
  if (!choices.length) return null;
  const esc = foundry.utils.escapeHTML;
  const type = String(solution.weapon?.data?.damageProfile?.type ?? "damage");
  const content = `<div class="arkflight-reaction-prompt"><p><strong>${esc(solution.weapon.name)}</strong> hit <strong>${esc(target.name)}</strong>.</p><p>Incoming: <strong>${Math.max(0, Number(incoming) || 0)} ${esc(type)}</strong> · Hardness ${Math.max(0, Number(hardness) || 0)}</p><hr>${choices.map((c) => `<p><strong>${esc(c.action.name)}</strong> — ${esc(c.action.summary ?? c.action.description)}</p>`).join("")}</div>`;
  const id = await chooseReaction(`Damage Reaction — ${target.name}`, content, choices);
  if (id && choices.some((c) => c.id === id)) await base.stationAction(id, {}, target);
  return id;
}

async function maybePromptEngineerBypass(base, actionId, options, reference) {
  const action = base.actions?.[actionId];
  if (!action || actionId === "engineer-emergency-bypass" || action.station !== "engineer" || Number(action.rules?.strain ?? 0) <= 0) return;
  const combatant = reference ? base.findCombatant(reference) : game.combat?.combatant ?? null;
  if (!combatant) return;
  const bypassId = "engineer-emergency-bypass";
  const choices = availableChoices(base, combatant, [bypassId]);
  if (!choices.length) return;
  const esc = foundry.utils.escapeHTML;
  const content = `<div class="arkflight-reaction-prompt"><p><strong>${esc(action.name)}</strong> will add Strain to <strong>${esc(combatant.name)}</strong>.</p><p><strong>${esc(choices[0].action.name)}</strong> — ${esc(choices[0].action.summary ?? choices[0].action.description)}</p></div>`;
  const id = await chooseReaction(`Engineer Reaction — ${combatant.name}`, content, choices);
  if (id === bypassId) await base.stationAction(bypassId, { suppressChat: true, reactionContext: "engineer-bypass" }, combatant);
}

Hooks.on("arkflightCombatTurnChanged", queueHelm);
Hooks.on("updateCombat", (_combat, changes) => { if (Object.hasOwn(changes ?? {}, "round") || Object.hasOwn(changes ?? {}, "turn")) queueHelm(); });
Hooks.once("ready", () => {
  const base = game.arkflight?.combat;
  if (!base) return;
  const fire = base.fireAtTarget?.bind(base);
  const turn = base.turn?.bind(base);
  const stationAction = base.stationAction?.bind(base);

  game.arkflight.shipCombatReactions = Object.freeze({
    promptDamage: promptDamageReaction
  });

  game.arkflight.combat = Object.freeze({
    ...base,
    helmState(ref = null) {
      const c = ref ? base.findCombatant(ref) : game.combat?.combatant;
      const s = c ? base.state(c) : null;
      return s ? helmRemaining(applyFreeHelmAllowance(s)) : null;
    },
    initializeHelm(ref = null) { const c = ref ? base.findCombatant(ref) : game.combat?.combatant; return ensureHelm(c); },
    async turn(steps = 1, ref = null) {
      return turn(steps, ref);
    },
    async fireAtTarget(weaponKey, targetRef, attackerRef = null) {
      await promptAttackReaction(base, weaponKey, targetRef, attackerRef);
      return fire(weaponKey, targetRef, attackerRef);
    },
    async stationAction(actionId, options = {}, reference = null) {
      await maybePromptEngineerBypass(base, actionId, options, reference);
      return stationAction(actionId, options, reference);
    }
  });
  queueHelm();
});
