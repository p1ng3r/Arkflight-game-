// Locally synthesized effects; no network audio, scene documents or dice rolls.
const tone = (frequency, end, duration, gain, delay = 0, wave = "sine") => ({ frequency, end, duration, gain, delay, wave });
const noise = (duration, gain, cutoff, delay = 0) => ({ noise: true, duration, gain, cutoff, delay });
const RECIPES = Object.freeze({
  select: [noise(.035, .13, 2400), tone(950, 1350, .09, .12)],
  deselect: [tone(650, 400, .07, .12)],
  open: [noise(.16, .1, 1800), tone(400, 720, .14, .09)],
  close: [noise(.1, .09, 1000), tone(600, 280, .1, .08)],
  pin: [noise(.035, .2, 2800), tone(460, 230, .07, .12)],
  lock: [noise(.045, .3, 2000), noise(.06, .24, 1200, .09), tone(180, 95, .22, .22, .08), tone(950, 720, .16, .09, .13)],
  fire: [noise(.09, .4, 4800), noise(.42, .36, 550, .025), tone(110, 32, .48, .42, 0, "triangle")],
  incoming: [tone(570, 570, .11, .18), tone(760, 760, .18, .16, .16)],
  reaction: [noise(.07, .2, 1800), tone(460, 820, .18, .16)],
  impact: [noise(.28, .35, 1100), tone(80, 28, .3, .3, 0, "triangle")],
  ward: [tone(650, 1300, .36, .16), tone(980, 1960, .3, .12, .06), noise(.22, .06, 3600)],
  move: [noise(.35, .12, 700), tone(70, 130, .32, .12, 0, "triangle")],
  signature: [tone(330, 660, .65, .18), tone(415, 830, .6, .15, .07), tone(495, 990, .55, .13, .14), noise(.4, .08, 3200)],
  ready: [tone(880, 880, .16, .13), tone(1320, 1320, .24, .11, .1)],
  success: [tone(660, 880, .18, .13)],
  failure: [tone(320, 220, .14, .12, 0, "triangle")],
  criticalSuccess: [tone(660, 880, .22, .15), tone(990, 1320, .28, .12, .08)],
  criticalFailure: [noise(.1, .1, 1200), tone(300, 140, .24, .15, 0, "triangle")]
});
export function soundRecipe(kind) { return RECIPES[kind] ?? []; }
export function combatSoundCues(events) {
  const cues = [];
  if (events.some(e => e.kind === "fire")) cues.push("fire");
  else if (events.some(e => e.kind === "signature")) cues.push("signature");
  else if (events.some(e => e.kind === "lock")) cues.push("lock");
  else if (events.some(e => e.kind === "ready")) cues.push("ready");
  else if (events.some(e => e.kind === "move")) cues.push("move");
  const outcome = events.find(e => e.kind === "outcome");
  if (outcome && !cues.length) cues.push(outcome.attack ? (outcome.cardId === "No reaction" ? (outcome.result.degree >= 1 ? "impact" : "failure") : ["emergency-ward", "deflect-impact", "last-bastion"].includes(outcome.cardId) ? "ward" : "reaction") : ({ 2: "criticalSuccess", 1: "success", 0: "failure", "-1": "criticalFailure" }[outcome.result.degree]));
  if (events.some(e => e.kind === "incoming")) cues.push("incoming");
  else if (events.some(e => e.kind === "resource" && e.resource === "hull" && e.delta < 0)) cues.push("impact");
  return [...new Set(cues.filter(Boolean))].slice(0, 2);
}
export class CombatAudio {
  constructor({ contextFactory = () => { const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext; return Context ? new Context() : null; } } = {}) { this.contextFactory = contextFactory; this.voices = new Set(); }
  unlock() {
    try { this.context ??= this.contextFactory(); return this.context?.resume()?.catch(() => {}) ?? Promise.resolve(); } catch { return Promise.resolve(); }
  }
  play(kind, volume = .15, delay = 0) {
    const ctx = this.context, level = Math.min(.4, Math.max(0, Number(volume) || 0));
    if (!ctx || ctx.state !== "running" || !level) return false;
    const recipe = soundRecipe(kind); if (!recipe.length) return false;
    try {
      for (const part of recipe) {
        if (this.voices.size >= 24) this.voices.values().next().value.stop();
        const gain = ctx.createGain(), at = ctx.currentTime + delay + part.delay;
        let source, filter;
        if (part.noise) {
          source = ctx.createBufferSource();
          const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * part.duration), ctx.sampleRate), data = buffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
          source.buffer = buffer; filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = part.cutoff; source.connect(filter); filter.connect(gain);
        } else {
          source = ctx.createOscillator(); source.type = part.wave;
          source.frequency.setValueAtTime(part.frequency, at); source.frequency.exponentialRampToValueAtTime(part.end, at + part.duration); source.connect(gain);
        }
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level * part.gain, at + .008); gain.gain.exponentialRampToValueAtTime(.0001, at + part.duration);
        gain.connect(ctx.destination);
        const voice = { stop: () => { try { source.stop(); } catch {} source.disconnect(); filter?.disconnect(); gain.disconnect(); this.voices.delete(voice); } };
        this.voices.add(voice); source.onended = () => voice.stop(); source.start(at); source.stop(at + part.duration + .01);
      }
      return true;
    } catch { this.stop(); return false; }
  }
  stop() { for (const voice of [...this.voices]) voice.stop(); }
}
