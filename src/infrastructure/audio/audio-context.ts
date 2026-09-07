/**
 * Single shared AudioContext.
 *
 * Browsers create it in a "suspended" state and only allow resume from inside
 * a user gesture, so every entry point calls `unlockAudioContext()` from the
 * tap that starts playback. Creating more than one context on iOS quickly
 * exhausts the hardware audio units, so this module owns exactly one.
 */

let context: AudioContext | null = null;
let masterGain: GainNode | null = null;

type AudioContextConstructor = new () => AudioContext;

function resolveConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function getAudioContext(): AudioContext | null {
  if (context !== null) return context;

  const Ctor = resolveConstructor();
  if (Ctor === null) return null;

  context = new Ctor();
  masterGain = context.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(context.destination);
  return context;
}

export function getMasterGain(): GainNode | null {
  getAudioContext();
  return masterGain;
}

/** Must be called from within a user gesture. */
export async function unlockAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx === null) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Nothing useful to do — playback will surface the failure instead.
    }
  }
}

/** Sleep-timer fade: ramp the master bus to silence over `seconds`. */
export function fadeMasterTo(target: number, seconds: number): void {
  const ctx = getAudioContext();
  const gain = getMasterGain();
  if (ctx === null || gain === null) return;

  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(target, now + Math.max(0.01, seconds));
}

export function cancelMasterFade(): void {
  const ctx = getAudioContext();
  const gain = getMasterGain();
  if (ctx === null || gain === null) return;

  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(1, now);
}
