// Local, read-only diagnostics for the opt-in combat playtest. No reports are
// stored in campaign data or sent anywhere.
export const CARD_COMBAT_BUILD = "hex-movement-20261021";
let progress = { stage: "Idle", at: Date.now(), error: null };
export function cardCombatProgress(stage, details = {}) {
  progress = { ...progress, ...details, stage, at: Date.now() };
  globalThis.Hooks?.callAll("arkflightCardCommandProgress", { ...progress });
}
export function cardCombatDiagnostics() {
  const state = globalThis.game?.arkflight?.cardCombat?.state?.();
  const c = globalThis.canvas;
  return {
    build: CARD_COMBAT_BUILD, progress: structuredClone(progress),
    sceneId: c?.scene?.id ?? null, sessionId: state?.id ?? null,
    step: state?.guidedDemo?.step ?? null, revision: state?.revision ?? null,
    ships: Object.values(state?.ships ?? {}).map(ship => {
      const token = c?.scene?.id === state.canvas?.sceneId ? c.scene.tokens.get(ship.cardPlay.tokenId) : null;
      const cell = token && c.grid?.isHexagonal ? c.grid.getCube(token.getCenterPoint()) : null;
      return { name: ship.cardPlay.name, tokenId: ship.cardPlay.tokenId,
        saved: { q: ship.cardPlay.motion.q, r: ship.cardPlay.motion.r, facing: state.canvas?.headings?.[ship.cardPlay.motion.heading] },
        actual: token ? { q: cell?.q, r: cell?.r, x: token.x, y: token.y, facing: token.rotation } : null };
    })
  };
}
