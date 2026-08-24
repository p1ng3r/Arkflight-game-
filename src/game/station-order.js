import { STATIONS } from "./constants.js";

export function validateStationOrder(order, activeStations = STATIONS) {
  if (!Array.isArray(order)) return { ok: false, reason: "order-not-array" };
  const expected = [...activeStations];
  if (order.length !== expected.length) return { ok: false, reason: "wrong-station-count" };
  if (new Set(order).size !== order.length) return { ok: false, reason: "duplicate-station" };
  if (!expected.every((stationId) => order.includes(stationId))) return { ok: false, reason: "missing-station" };
  return { ok: true, order: [...order] };
}

export function moveStation(order, stationId, direction) {
  const next = [...order];
  const index = next.indexOf(stationId);
  if (index < 0) return next;
  const target = direction === "up" ? index - 1 : direction === "down" ? index + 1 : index;
  if (target < 0 || target >= next.length || target === index) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
