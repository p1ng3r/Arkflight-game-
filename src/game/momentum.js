import { MOMENTUM_MAX, MOMENTUM_MIN, clamp } from "./constants.js";

export function normalizeMomentum(value) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  return clamp(Math.trunc(numeric), MOMENTUM_MIN, MOMENTUM_MAX);
}

export function changeMomentum(current, amount) {
  const before = normalizeMomentum(current);
  const after = normalizeMomentum(before + Number(amount || 0));
  return Object.freeze({ before, after, delta: after - before });
}

export function momentumModifier(momentum) {
  return normalizeMomentum(momentum);
}
