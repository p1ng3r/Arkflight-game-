export const OFFICER_SIGNATURE_GEAR_POLICY = Object.freeze({
  inventoryMode: "embedded-pf2e-item",
  combatMathMode: "npc-benchmark-independent",
  recoveryMode: "reward-system-decision",
  autoAward: false,
  note: "Generated officers carry real PF2e signature weapons for inventory and loot identity, but their NPC attack bonus and damage remain the generated creature benchmark. Recoverable gear is flagged for the reward system and is never auto-awarded on defeat."
});

export function applySignatureGearPolicy(officer) {
  const signatureGear = Object.freeze({
    ...(officer?.signatureGear ?? {}),
    inventoryMode: OFFICER_SIGNATURE_GEAR_POLICY.inventoryMode,
    combatMathMode: OFFICER_SIGNATURE_GEAR_POLICY.combatMathMode,
    recoverable: true,
    recoveryPolicy: OFFICER_SIGNATURE_GEAR_POLICY.recoveryMode,
    autoAward: OFFICER_SIGNATURE_GEAR_POLICY.autoAward
  });

  const actorData = officer?.actorData ? structuredClone(officer.actorData) : null;
  if (actorData?.flags?.["arkflight-game"]) {
    actorData.flags["arkflight-game"].signatureGearPolicy = {
      inventoryMode: OFFICER_SIGNATURE_GEAR_POLICY.inventoryMode,
      combatMathMode: OFFICER_SIGNATURE_GEAR_POLICY.combatMathMode,
      recoverable: true,
      recoveryPolicy: OFFICER_SIGNATURE_GEAR_POLICY.recoveryMode,
      autoAward: false
    };
  }

  return Object.freeze({ ...officer, signatureGear, actorData: actorData ? Object.freeze(actorData) : officer?.actorData });
}
