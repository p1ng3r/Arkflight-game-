import { getMasteryTechnique } from "../content/base-mastery.js";

function cloneSources(source) {
  return Object.fromEntries(Object.entries(source ?? {}).map(([key, rows]) => [key, [...(rows ?? [])]]));
}

function cloneEncounter(encounter = {}) {
  return {
    momentum: Number(encounter.momentum ?? 0),
    pressure: { ...(encounter.pressure ?? {}) },
    hazards: [...(encounter.hazards ?? [])],
    checkBonuses: { ...(encounter.checkBonuses ?? {}) },
    dcAdjustments: { ...(encounter.dcAdjustments ?? {}) },
    degreeLifts: { ...(encounter.degreeLifts ?? {}) },
    checkBonusSources: cloneSources(encounter.checkBonusSources),
    dcAdjustmentSources: cloneSources(encounter.dcAdjustmentSources),
    degreeLiftSources: cloneSources(encounter.degreeLiftSources),
    notes: [...(encounter.notes ?? [])],
    pressureGuards: { ...(encounter.pressureGuards ?? {}) },
    hazardGuard: Number(encounter.hazardGuard ?? 0),
    momentumLossGuard: Number(encounter.momentumLossGuard ?? 0),
    riskOverrides: { ...(encounter.riskOverrides ?? {}) },
    hazardShelters: { ...(encounter.hazardShelters ?? {}) },
    suppressedHazards: [...(encounter.suppressedHazards ?? [])]
  };
}

function unresolved(state) {
  return (state.order ?? []).filter((stationId) => !state.results?.[stationId]);
}

function assertTarget(state, stationId) {
  if (!stationId || !unresolved(state).includes(stationId)) throw new Error("Choose an unresolved station.");
}

function addCheckBonus(encounter, stationId, value, source) {
  encounter.checkBonuses[stationId] = Number(encounter.checkBonuses[stationId] ?? 0) + Number(value ?? 0);
  encounter.checkBonusSources[stationId] ??= [];
  encounter.checkBonusSources[stationId].push(source);
}

function addDcAdjustment(encounter, stationId, value, source) {
  encounter.dcAdjustments[stationId] = Number(encounter.dcAdjustments[stationId] ?? 0) + Number(value ?? 0);
  encounter.dcAdjustmentSources[stationId] ??= [];
  encounter.dcAdjustmentSources[stationId].push(source);
}

function suppressHazard(encounter, hazardId) {
  if (!hazardId || !encounter.hazards.includes(hazardId)) throw new Error("Choose an active Hazard.");
  encounter.hazards = encounter.hazards.filter((id) => id !== hazardId);
  if (!encounter.suppressedHazards.includes(hazardId)) encounter.suppressedHazards.push(hazardId);
}

function markUsed(state, stationId, mastery) {
  return {
    ...state,
    masteryUses: {
      ...(state.masteryUses ?? {}),
      [stationId]: {
        masteryId: mastery.id,
        usedAt: Date.now(),
        roundIndex: Number(state.roundIndex ?? 0)
      }
    }
  };
}

export function masteryReady(state, stationId) {
  const masteryId = state?.masterySelections?.[stationId] ?? null;
  return Boolean(masteryId && !state?.masteryUses?.[stationId]);
}

export function applyMasteryTechnique(state, stationId, options = {}) {
  if (!state?.setupLocked) throw new Error("Crew & Mastery must be locked before a Mastery Technique can be used.");
  if (["opening", "event-complete"].includes(state.phase)) throw new Error("Mastery Techniques cannot be used in this phase.");
  const masteryId = state.masterySelections?.[stationId] ?? null;
  const mastery = getMasteryTechnique(stationId, masteryId);
  if (!mastery) throw new Error(`No Mastery Technique is readied for ${stationId}.`);
  if (state.masteryUses?.[stationId]) throw new Error(`${mastery.name} is already EXPENDED for this Event.`);

  let next = { ...state };
  const encounter = cloneEncounter(state.encounter);
  const source = `Mastery — ${mastery.name}`;

  switch (mastery.id) {
    case "captain-commanding-moment":
      assertTarget(state, options.targetStationId);
      addCheckBonus(encounter, options.targetStationId, 2, `${source}: +2 to the PF2e check`);
      break;
    case "captain-hold-the-crew-together":
      encounter.momentumLossGuard = Math.max(encounter.momentumLossGuard, 1);
      encounter.notes.push(`${source} will reduce this round's next Momentum loss by 1.`);
      break;
    case "captain-change-the-plan": {
      assertTarget(state, options.firstStationId);
      assertTarget(state, options.secondStationId);
      if (options.firstStationId === options.secondStationId) throw new Error("Choose two different unresolved stations.");
      const order = [...state.order];
      const a = order.indexOf(options.firstStationId);
      const b = order.indexOf(options.secondStationId);
      [order[a], order[b]] = [order[b], order[a]];
      next = { ...next, order };
      break;
    }
    case "engineer-emergency-vent":
      encounter.pressure.arkengine = Math.max(0, Number(encounter.pressure.arkengine ?? 0) - 2);
      break;
    case "engineer-overburn-the-core":
      assertTarget(state, options.targetStationId);
      if (!["engineer", "navigator"].includes(options.targetStationId)) throw new Error("Overburn the Core may only aid an unresolved Engineer or Navigator station.");
      addCheckBonus(encounter, options.targetStationId, 3, `${source}: +3 to the PF2e check`);
      encounter.pressure.arkengine = Number(encounter.pressure.arkengine ?? 0) + 1;
      break;
    case "engineer-impossible-restart":
    case "watchmaster-saw-it-coming":
      suppressHazard(encounter, options.hazardId);
      break;
    case "navigator-perfect-line":
      assertTarget(state, options.targetStationId);
      addDcAdjustment(encounter, options.targetStationId, -2, `${source}: -2 final DC`);
      break;
    case "navigator-read-the-way-ahead":
      encounter.notes.push(`${source} revealed the next round's opening situation to the crew.`);
      break;
    case "navigator-impossible-course":
      assertTarget(state, options.targetStationId);
      encounter.riskOverrides[options.targetStationId] = true;
      encounter.notes.push(`${source} lets ${options.targetStationId} ignore one authored Heroic/Risk restriction this round.`);
      break;
    case "watchmaster-call-the-opening":
      if (!encounter.hazards.length) throw new Error("Call the Opening requires an active Hazard.");
      assertTarget(state, options.targetStationId);
      addCheckBonus(encounter, options.targetStationId, 2, `${source}: +2 while exploiting an active Hazard`);
      break;
    case "watchmaster-nothing-gets-past-me":
      assertTarget(state, options.targetStationId);
      addCheckBonus(encounter, options.targetStationId, 1, `${source}: +1 from threat awareness`);
      encounter.notes.push(`${source} exposed every currently active Hazard to the crew.`);
      break;
    case "veilwarden-aegis-of-the-veil":
      encounter.pressureGuards.lifeveil = Number(encounter.pressureGuards.lifeveil ?? 0) + 2;
      break;
    case "veilwarden-shelter-the-crew":
      assertTarget(state, options.targetStationId);
      encounter.hazardShelters[options.targetStationId] = true;
      addCheckBonus(encounter, options.targetStationId, 1, `${source}: +1 while sheltered from Hazard interference`);
      break;
    case "veilwarden-seal-the-breach":
      encounter.hazardGuard = Math.max(encounter.hazardGuard, 1);
      break;
    default:
      throw new Error(`Unsupported Mastery Technique: ${mastery.id}`);
  }

  next = { ...next, encounter };
  return markUsed(next, stationId, mastery);
}
