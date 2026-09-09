import { applyFreeHelmAllowance, canChangeFacingNow, helmRemaining } from "../combat/helm-rules.js";

const MODULE_ID = "arkflight-game";
const STATE_PATH = `flags.${MODULE_ID}.combatState`;
const AREAS = ["stable", "stressed", "damaged", "critical", "disabled"];
const REACTIONS = ["captain-brace-for-impact", "navigator-evasive-maneuver", "battlewatch-spoil-their-aim", "veilwarden-emergency-ward"];
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
        window: { title }, content,
        buttons: [
          ...choices.map((c) => ({ action: c.id, label: c.label, icon: "fa-solid fa-shield", callback: () => c.id })),
          { action: "pass", label: "Pass", icon: "fa-solid fa-forward", default: true, callback: () => null }
        ], close: () => null
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

async function promptReaction(base, weaponKey, targetRef, attackerRef = null) {
  if (!game.user?.isGM) return;
  const attacker = attackerRef ? base.findCombatant(attackerRef) : game.combat?.combatant;
  const target = base.findCombatant(targetRef);
  if (!attacker || !target || !isShip(target.actor)) return;
  let solution;
  try { solution = base.targetingSolution(weaponKey, target, attacker); } catch (_error) { return; }
  const relevant = REACTIONS.filter((id) => id !== "veilwarden-emergency-ward" || wardable(solution));
  const effects = base.state(target)?.stationRuntime?.effects ?? [];
  if (effects.some((e) => relevant.includes(e.actionId))) return;
  const choices = relevant.flatMap((id) => {
    const action = base.actions?.[id];
    return action && base.stationActionAvailability?.(id, target)?.ok ? [{ id, label: `${action.name} · ${action.cost?.rp ?? 1} RP`, action }] : [];
  });
  if (!choices.length) return;
  const esc = foundry.utils.escapeHTML;
  const content = `<div class="arkflight-reaction-prompt"><p><strong>${esc(attacker.name)}</strong> fires <strong>${esc(solution.weapon.name)}</strong> at <strong>${esc(target.name)}</strong>.</p><p>${solution.distanceHexes.toFixed(1)} hex · ${esc(solution.range.label)}</p><hr>${choices.map((c) => `<p><strong>${esc(c.action.name)}</strong> — ${esc(c.action.summary ?? c.action.description)}</p>`).join("")}</div>`;
  const id = await chooseReaction(`Incoming Fire — ${target.name}`, content, choices);
  if (id && choices.some((c) => c.id === id)) await base.stationAction(id, {}, target);
}

function idx(value) { const i = AREAS.indexOf(String(value ?? "stable")); return i < 0 ? 0 : i; }
function worse(current, desired) { return AREAS[Math.max(idx(current), idx(desired))]; }
function degrade(current) { return AREAS[Math.min(AREAS.length - 1, idx(current) + 1)]; }
function hullState(value, max) {
  const pct = Math.max(0, Math.min(1, Number(value) / Math.max(1, Number(max) || 1)));
  return pct <= 0 ? "disabled" : pct <= .25 ? "critical" : pct <= .5 ? "damaged" : pct <= .75 ? "stressed" : "stable";
}

async function damageConsequences({ target, solution, degree, damage }) {
  if (!game.user?.isGM || !target?.actor || !damage || Number(damage.hullDamage) <= 0) return;
  const actor = target.actor;
  const data = ship(actor);
  if (!data) return;
  const patches = {};
  const notes = [];
  const hullNow = data.areas?.hull?.state ?? "stable";
  const hullNext = worse(hullNow, hullState(damage.after, data.resources?.hull?.max ?? damage.before));
  if (hullNext !== hullNow) { patches[`flags.${MODULE_ID}.ship.areas.hull.state`] = hullNext; notes.push(`Hull ${hullNow} → ${hullNext}`); }
  if (Number(degree) === 2) {
    const threat = String(solution?.weapon?.data?.systemThreat ?? "hull").toLowerCase();
    if (["arkengine", "rigging", "lifeveil"].includes(threat)) {
      const current = data.areas?.[threat]?.state ?? "stable";
      const next = degrade(current);
      if (next !== current) { patches[`flags.${MODULE_ID}.ship.areas.${threat}.state`] = next; notes.push(`${threat} ${current} → ${next}`); }
    }
    const morale = Math.max(0, Number(data.resources?.morale?.value) || 0);
    if (morale > 0) { patches[`flags.${MODULE_ID}.ship.resources.morale.value`] = morale - 1; notes.push(`Morale ${morale} → ${morale - 1}`); }
  }
  if (!Object.keys(patches).length) return;
  await actor.update(patches);
  ui.notifications?.warn(`${actor.name}: ${notes.join(" · ")}`);
  Hooks.callAll("arkflightShipDamageStateChanged", { actor, target, solution, degree, damage, notes });
}

Hooks.on("arkflightCombatTurnChanged", queueHelm);
Hooks.on("updateCombat", (_combat, changes) => { if (Object.hasOwn(changes ?? {}, "round") || Object.hasOwn(changes ?? {}, "turn")) queueHelm(); });
Hooks.on("arkflightNativeShipAttackResolved", damageConsequences);
Hooks.on("preUpdateToken", (token, changes, options) => {
  if (changes?.rotation == null || options?.arkflightCombatFacing || !game.combat) return;
  const c = combatantFor(token);
  if (!c || game.combat.combatant?.id !== c.id || !isShip(c.actor)) return;
  const s = stateOf(c);
  if (s && !canChangeFacingNow(s, game.combat.round ?? 1)) {
    ui.notifications?.warn(`${c.name}: move at least 1 hex before using the free facing allowance, or spend AP on an exceptional maneuver.`);
    return false;
  }
});

Hooks.once("ready", () => {
  const base = game.arkflight?.combat;
  if (!base) return;
  const fire = base.fireAtTarget;
  const turn = base.turn;
  game.arkflight.combat = Object.freeze({
    ...base,
    helmState(ref = null) {
      const c = ref ? base.findCombatant(ref) : game.combat?.combatant;
      const s = c ? base.state(c) : null;
      return s ? helmRemaining(applyFreeHelmAllowance(s)) : null;
    },
    initializeHelm(ref = null) { const c = ref ? base.findCombatant(ref) : game.combat?.combatant; return ensureHelm(c); },
    async turn(steps = 1, ref = null) {
      const c = ref ? base.findCombatant(ref) : game.combat?.combatant;
      const s = c ? base.state(c) : null;
      if (c && s && !canChangeFacingNow(s, game.combat?.round ?? 1)) throw new Error(`${c.name} must move at least 1 hex before using its free facing allowance. Purchase Maneuver or use Hard Turn to pivot exceptionally.`);
      return turn(steps, ref);
    },
    async fireAtTarget(weaponKey, targetRef, attackerRef = null) {
      await promptReaction(base, weaponKey, targetRef, attackerRef);
      return fire(weaponKey, targetRef, attackerRef);
    }
  });
  queueHelm();
});
