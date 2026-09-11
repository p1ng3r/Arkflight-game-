import { applyStrainDegradation, resolveStrainContribution } from "../ship/area-readiness.js";

const CHOICE_TARGETS = Object.freeze([
  Object.freeze({ id: "hull", label: "Hull" }),
  Object.freeze({ id: "drive", label: "Drive" }),
  Object.freeze({ id: "lifeveil", label: "Lifeveil" }),
  Object.freeze({ id: "morale", label: "Morale" }),
  Object.freeze({ id: "weapons", label: "Weapons" })
]);

async function chooseWithDialog(title) {
  const DialogV2 = foundry?.applications?.api?.DialogV2;
  if (!DialogV2?.wait) return null;
  const buttons = CHOICE_TARGETS.map((target) => ({
    action: target.id,
    label: target.label,
    callback: () => target.id
  }));
  try {
    const result = await DialogV2.wait({
      window: { title },
      content: "<p>Roll 8: the players choose which Ship Condition worsens.</p>",
      buttons,
      close: () => null
    });
    return CHOICE_TARGETS.some((target) => target.id === result) ? result : null;
  } catch (_error) {
    return null;
  }
}

async function chooseWithPrompt() {
  if (typeof globalThis.prompt !== "function") return null;
  const value = globalThis.prompt("Strain roll 8 — choose: hull, drive, lifeveil, morale, or weapons", "hull");
  const normalized = String(value ?? "").trim().toLowerCase();
  return CHOICE_TARGETS.some((target) => target.id === normalized) ? normalized : null;
}

export async function chooseStrainDegradationTarget() {
  return await chooseWithDialog("Arkflight — Players Choose")
    ?? await chooseWithPrompt()
    ?? "hull";
}

async function postRoll(roll, flavor, speaker = null) {
  if (!roll?.toMessage) return;
  await roll.toMessage({
    user: game.user?.id ?? null,
    speaker: speaker ?? ChatMessage.getSpeaker(),
    flavor
  });
}

async function rollDegradation(ship, { sourceLabel = "Strain", speaker = null } = {}) {
  const d8 = await new Roll("1d8").evaluate();
  await postRoll(d8, `<strong>${sourceLabel} — Ship Condition</strong><br>Roll 1d8 to determine what worsens.`, speaker);
  const rolled = Math.trunc(Number(d8.total) || 0);
  const chosenTarget = rolled === 8 ? await chooseStrainDegradationTarget() : null;
  const applied = applyStrainDegradation(ship, rolled, { chosenTarget });
  const target = applied.target;
  return Object.freeze({ ship: applied.ship, roll: d8, rolled, chosenTarget, target, degradation: applied });
}

/**
 * Foundry runtime for one discrete Strain gain.
 *
 * This owns the actual flat-check and d8 rolls. Pure rules remain in
 * area-readiness.js so tests and non-Foundry callers can resolve the math.
 */
export async function resolveShipStrainGain(ship, {
  amount = 0,
  currentStrain = ship?.resources?.strain?.value ?? 0,
  strainMax = ship?.resources?.strain?.max ?? 0,
  alreadyDegraded = false,
  sourceLabel = "Strain",
  speaker = null
} = {}) {
  const working = structuredClone(ship);
  working.resources ??= {};
  working.resources.strain = {
    ...(working.resources.strain ?? {}),
    value: Math.max(0, Number(currentStrain) || 0),
    max: Math.max(0, Number(strainMax) || 0)
  };

  const resolved = resolveStrainContribution(working, {
    amount,
    strainLimit: strainMax,
    alreadyDegraded
  });

  let next = resolved.ship;
  const notes = [];
  let flatCheck = null;
  let degradation = null;

  if (resolved.thresholdCrossed) {
    notes.push(`Strain Limit reached; ${resolved.strainAfter} overflow Strain remains.`);
    if (resolved.degradationRequired) {
      degradation = await rollDegradation(next, { sourceLabel: `${sourceLabel} — Strain Limit`, speaker });
      next = degradation.ship;
    }
  } else if (resolved.flatCheckRequired) {
    flatCheck = await new Roll("1d20").evaluate();
    const passed = Number(flatCheck.total) >= Number(resolved.flatCheckDC);
    await postRoll(
      flatCheck,
      `<strong>${sourceLabel} — Strain Flat Check DC ${resolved.flatCheckDC}</strong><br>${passed ? "Success: the ship holds together." : "Failure: a Ship Condition worsens."}`,
      speaker
    );
    notes.push(`Strain flat check DC ${resolved.flatCheckDC}: ${passed ? "success" : "failure"}.`);
    if (!passed) {
      degradation = await rollDegradation(next, { sourceLabel: `${sourceLabel} — Failed Strain Check`, speaker });
      next = degradation.ship;
    }
  }

  if (degradation) {
    const before = degradation.degradation.previous?.label ?? degradation.degradation.previous?.id ?? "Normal";
    const after = degradation.degradation.condition?.label ?? degradation.degradation.condition?.id ?? "Worsened";
    notes.push(`${degradation.target}: ${before} → ${after}.`);
  }

  return Object.freeze({
    ship: next,
    strain: Object.freeze({ value: resolved.strainAfter, max: Math.max(0, Number(strainMax) || 0) }),
    resolved,
    flatCheck,
    degradation,
    notes: Object.freeze(notes)
  });
}
