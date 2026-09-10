/**
 * Renders a synthesised ambient bed into a looping audio file.
 *
 * Why this exists: iOS suspends the Web Audio API the moment the screen locks
 * or the app is backgrounded. The recitation kept playing there because it is
 * an `HTMLAudioElement`, which the system keeps alive through Media Session —
 * but the ambient bed, being Web Audio, went silent. For an app whose main use
 * is listening with the phone face-down, that is the whole feature failing.
 *
 * So the bed is rendered once through an OfflineAudioContext, encoded as a
 * WAV blob, and played back through an `<audio loop>` element alongside the
 * recitation. Both channels then live in the same subsystem and survive the
 * lock screen together.
 *
 * The cost is a loop point, which the continuously-generated version did not
 * have. It is hidden by crossfading the tail back over the head, and the loop
 * is long enough that the ear does not latch onto the repeat.
 */

import { buildBed, type BedBuilder } from "./ambient-synth";

/** Long enough that the repeat is not obvious, short enough to render fast. */
const LOOP_SECONDS = 40;

/** How much of the tail is folded back over the head to hide the seam. */
const CROSSFADE_SECONDS = 3;

/** Mono is inaudible as such for a diffuse bed, and halves the memory. */
const CHANNELS = 1;
const SAMPLE_RATE = 44100;

type OfflineCtor = new (
  channels: number,
  length: number,
  sampleRate: number,
) => OfflineAudioContext;

function offlineContextCtor(): OfflineCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    OfflineAudioContext?: OfflineCtor;
    webkitOfflineAudioContext?: OfflineCtor;
  };
  return w.OfflineAudioContext ?? w.webkitOfflineAudioContext ?? null;
}

/**
 * Fold the last `CROSSFADE_SECONDS` back over the opening, so playback wrapping
 * from end to start lands mid-fade instead of on a discontinuity.
 */
function crossfadeSeam(samples: Float32Array, sampleRate: number): Float32Array {
  const fade = Math.min(
    Math.floor(CROSSFADE_SECONDS * sampleRate),
    Math.floor(samples.length / 3),
  );
  if (fade <= 0) return samples;

  // The looped region is everything except the tail we are folding in.
  const looped = samples.slice(0, samples.length - fade);

  for (let i = 0; i < fade; i++) {
    // Equal-power crossfade keeps perceived loudness steady through the seam;
    // a linear blend would dip in the middle.
    const t = i / fade;
    const headGain = Math.sin((t * Math.PI) / 2);
    const tailGain = Math.cos((t * Math.PI) / 2);
    looped[i] = looped[i] * headGain + samples[samples.length - fade + i] * tailGain;
  }

  return looped;
}

/** Minimal 16-bit PCM WAV container — every browser decodes it natively. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  const dataBytes = samples.length * bytesPerSample;

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * CHANNELS * bytesPerSample, true);
  view.setUint16(32, CHANNELS * bytesPerSample, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeText(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp before scaling: an over-unity sample would wrap and click.
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Returns an object URL for a seamless loop of the named bed, rendering it on
 * first use. Null when the platform cannot render offline audio, in which case
 * the caller should fall back to live Web Audio.
 */
export async function getAmbientLoopUrl(
  ambientId: string,
): Promise<string | null> {
  const cached = cache.get(ambientId);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(ambientId);
  if (pending !== undefined) return pending;

  const Ctor = offlineContextCtor();
  const build: BedBuilder | null = buildBed(ambientId);
  if (Ctor === null || build === null) return null;

  const task = (async (): Promise<string | null> => {
    try {
      const length = Math.floor(LOOP_SECONDS * SAMPLE_RATE);
      const ctx = new Ctor(CHANNELS, length, SAMPLE_RATE);

      const out = ctx.createGain();
      out.gain.value = 1;
      build(ctx, out, LOOP_SECONDS);
      out.connect(ctx.destination);

      const rendered = await ctx.startRendering();
      const looped = crossfadeSeam(rendered.getChannelData(0), SAMPLE_RATE);
      const url = URL.createObjectURL(encodeWav(looped, SAMPLE_RATE));

      cache.set(ambientId, url);
      inFlight.delete(ambientId);
      return url;
    } catch {
      inFlight.delete(ambientId);
      return null;
    }
  })();

  inFlight.set(ambientId, task);
  return task;
}

/** Releases every rendered loop. Used when the mixer is disposed. */
export function releaseAmbientLoops(): void {
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
}
