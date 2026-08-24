import { RISK_BID_TIERS } from "./constants.js";

export function isRiskBidTier(value) {
  return RISK_BID_TIERS.includes(Number(value));
}

export function normalizeRiskBid(value) {
  const tier = Number(value);
  if (!isRiskBidTier(tier)) throw new Error(`Invalid Risk Bid tier: ${value}`);
  return tier;
}

export function riskAdjustedDc(baseDc, riskBid = 0) {
  const dc = Number(baseDc);
  if (!Number.isFinite(dc)) throw new Error("Base DC must be numeric.");
  return dc + normalizeRiskBid(riskBid);
}

export function nextRiskBidTier(current) {
  const tier = normalizeRiskBid(current);
  const index = RISK_BID_TIERS.indexOf(tier);
  return RISK_BID_TIERS[Math.min(index + 1, RISK_BID_TIERS.length - 1)];
}
