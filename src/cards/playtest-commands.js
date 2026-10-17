import { getOrderQueue } from "./committed-orders.js";
import { createPlaytestController, movePlaytestShip, rollPlaytestInitiative, advancePlaytestTurn, resolvePlaytestAttack } from "./card-playtest-session.js";

export async function dispatchPlaytestCommand(input, command, adapters) {
  if (!input || command.sessionId !== input.id || command.revision !== input.revision) throw new Error("Encounter changed; refresh before trying again.");
  if (input.phase === "complete" && command.type !== "end") throw new Error("This encounter has ended.");
  const { user, ownsOperator, isEligibleOperator, rank, roll } = adapters;
  if (!user?.id) throw new Error("An authenticated requester is required.");
  let session = structuredClone(input);
  const ship = session.ships[command.shipId];
  const captain = candidate => user.isGM || ownsOperator(user, candidate?.crew?.stations?.captain);
  const crew = candidate => user.isGM || Object.values(candidate?.crew?.stations ?? {}).some(id => ownsOperator(user, id));
  if (session.pendingAttack && !["respond", "end"].includes(command.type)) throw new Error("The defending crew must react or pass before play continues.");
  const request = command.request ?? {};
  const controller = createPlaytestController(session, { user, ownsOperator, isEligibleOperator, rank, roll });
  switch (command.type) {
    case "lock":
      await controller.lockPlan(command.shipId, request);
      if (session.phase === "planning" && Object.values(session.ships).every(ship => getOrderQueue(ship).phase === "locked")) session = await rollPlaytestInitiative(session, roll, rank);
      break;
    case "resolve": await controller.resolve(command.shipId, request); break;
    case "request": await controller.requestExecution(command.shipId, request); break;
    case "reassign": await controller.reassign(command.shipId, request); break;
    case "skip": await controller.skip(command.shipId, request); break;
    case "helm":
      if (!ship || (!user.isGM && !ownsOperator(user, ship.crew?.stations?.navigator))) throw new Error("The Navigator or GM controls movement.");
      session = movePlaytestShip(session, command.shipId, command.direction);
      break;
    case "advance":
      if (command.shipId !== session.turnOrder[session.turnIndex] || !captain(ship)) throw new Error("The active Captain or GM ends this ship's turn.");
      session = advancePlaytestTurn(session);
      break;
    case "respond": {
      const target = session.ships[session.pendingAttack?.targetId];
      if (!target || !crew(target)) throw new Error("Only the defending crew or GM can answer this attack.");
      const station = command.response?.station ?? "captain";
      if (command.response?.cardId && !user.isGM && !ownsOperator(user, target.crew?.stations?.[station])) throw new Error("Choose your assigned station's skill for this reaction.");
      session = await resolvePlaytestAttack(session, command.response, { rank, roll });
      break;
    }
    case "end":
      if (!user.isGM) throw new Error("The GM ends this playtest encounter.");
      session.phase = "complete"; session.pendingAttack = null;
      break;
    default: throw new Error("Unknown card combat command.");
  }
  session.revision = input.revision + 1;
  return session;
}
