let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const cls = window.AudioContext || (window as any).webkitAudioContext;
    if (cls) audioCtx = new cls();
  }
  return audioCtx;
}

function blip(
  type: OscillatorType,
  from: number,
  to: number,
  dur: number,
  vol: number,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur);
}

export class SoundEffects {
  static playCountdownTick(): void {
    blip("sine", 750, 750, 0.05, 0.08);
  }

  // Choque contra una pared: zumbido/corto grave (buzz de cortocircuito).
  static playCrash(): void {
    blip("square", 180, 70, 0.28, 0.14);
    blip("sawtooth", 90, 55, 0.3, 0.1);
  }

  // Nivel completado: la senal llega al conector destino.
  static playWin(): void {
    blip("square", 520, 780, 0.1, 0.08);
    setTimeout(() => blip("square", 780, 1180, 0.18, 0.09), 100);
  }
}
