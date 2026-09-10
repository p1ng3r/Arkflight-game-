export const DEGREE_OF_SUCCESS = Object.freeze({
  CRITICAL_FAILURE: -1,
  FAILURE: 0,
  SUCCESS: 1,
  CRITICAL_SUCCESS: 2
});

/** Resolve a PF2e-style check degree, including natural 20/1 one-step shifts. */
export function degreeOfSuccess(total, die, dc) {
  const checkTotal = Number(total) || 0;
  const targetDC = Number(dc) || 0;
  const natural = Math.trunc(Number(die) || 0);
  let degree = checkTotal >= targetDC + 10
    ? DEGREE_OF_SUCCESS.CRITICAL_SUCCESS
    : checkTotal >= targetDC
      ? DEGREE_OF_SUCCESS.SUCCESS
      : checkTotal <= targetDC - 10
        ? DEGREE_OF_SUCCESS.CRITICAL_FAILURE
        : DEGREE_OF_SUCCESS.FAILURE;
  if (natural === 20) degree += 1;
  if (natural === 1) degree -= 1;
  return Math.max(DEGREE_OF_SUCCESS.CRITICAL_FAILURE, Math.min(DEGREE_OF_SUCCESS.CRITICAL_SUCCESS, degree));
}
