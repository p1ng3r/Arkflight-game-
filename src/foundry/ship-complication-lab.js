import { SHIP_COMPLICATION_CARDS, COMPLICATION_SCENARIOS } from "../content/ship-complications.js";
import { createComplicationEncounter, resolveShipComplication, chooseShipComplication, advanceComplicationRound, consumeShipComplications, claimComplicationOpportunity, endComplicationEncounter } from "../combat/ship-complications.js";

const MODULE = "arkflight-game", SETTING = "shipComplicationLab";
const copy = value => structuredClone(value);
export function complicationLabShips() {
  const resources = { hull: { value: 120, max: 120 }, lifeveil: { value: 100, max: 100 }, morale: { value: 100, max: 100 }, strain: { value: 0, max: 10 }, supplies: { value: 10, max: 10 } };
  return [
    { id: "crew", name: "Sample Brigantine", team: "crew", resources: copy(resources), ap: 4, batteries: [{ id: "port", name: "Port Battery" }, { id: "starboard", name: "Starboard Battery" }] },
    { id: "opponent", name: "Sparring Cutter", team: "opponent", resources: copy(resources), ap: 4, batteries: [{ id: "fore", name: "Fore Battery" }] }
  ];
}

/** Client-local GM lab. No campaign Actors, Combat, Scene, token or live card settings. */
export function createComplicationLabAPI({ load, save, isGM, randomID, seed = () => Math.floor(Math.random() * 0xffffffff) + 1 }) {
  let queue = Promise.resolve();
  const authorize = () => { if (!isGM()) throw new Error("Only the GM may use the Complication Lab."); };
  const state = () => { authorize(); const value = load(); return value?.id ? copy(value) : null; };
  async function handle(command) {
    authorize();
    if (!command || typeof command !== "object") throw new Error("Invalid lab command.");
    const before = state();
    if (before && (command.encounterId !== before.id || command.revision !== before.revision)) throw new Error("The lab changed; refresh before trying again.");
    let next, receipt = null;
    if (command.type === "reset") next = createComplicationEncounter({ id: randomID(), ships: complicationLabShips(), seed: seed() });
    else {
      if (!before) throw new Error("Start the Complication Lab first.");
      if (command.type === "resolve") {
        const scenario = command.scenario;
        const result = resolveShipComplication(before, {
          eventId: command.eventId ?? randomID(), shipId: "crew", scenario, degree: command.degree,
          source: scenario === "impact" ? "collision" : "card", opponentId: scenario === "impact" ? "opponent" : null,
          alongside: scenario === "impact", batteryId: "port"
        });
        next = result.state; receipt = result.receipt;
      } else if (command.type === "choose") next = chooseShipComplication(before, { shipId: "crew", choiceId: command.choiceId, optionId: command.optionId });
      else if (command.type === "round") {
        next = advanceComplicationRound(before);
        // This refresh belongs only to the two sample ships, not the engine's generic lifecycle.
        for (const ship of next.ships) ship.ap = 4;
      } else if (command.type === "consume") next = consumeShipComplications(before, { shipId: "crew", effectIds: [command.effectId] });
      else if (command.type === "exploit") next = claimComplicationOpportunity(before, { effectId: command.effectId, opponentId: "opponent", alongside: true });
      else if (command.type === "end") next = endComplicationEncounter(before);
      else throw new Error("Unknown complication lab command.");
    }
    if (JSON.stringify(next) !== JSON.stringify(before)) await save(copy(next));
    return { state: copy(next), receipt };
  }
  return Object.freeze({ cards: SHIP_COMPLICATION_CARDS, scenarios: COMPLICATION_SCENARIOS, state, request(command) {
    const input = copy(command);
    const operation = queue.catch(() => {}).then(() => handle(input));
    queue = operation;
    return operation;
  } });
}

Hooks.once("init", () => game.settings.register(MODULE, SETTING, {
  name: "Ship Complication Lab", scope: "client", config: false, type: Object, default: {}
}));
Hooks.once("ready", () => {
  game.arkflight ??= {};
  game.arkflight.complications = createComplicationLabAPI({
    load: () => game.settings.get(MODULE, SETTING), save: value => game.settings.set(MODULE, SETTING, value),
    isGM: () => game.user.isGM, randomID: () => foundry.utils.randomID()
  });
});
