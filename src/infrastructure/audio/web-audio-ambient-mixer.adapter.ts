import type { AmbientMixerPort } from "@/application/ports";
import { getAmbientLoopUrl, releaseAmbientLoops } from "./ambient-render";

interface ActiveLayer {
  element: HTMLAudioElement;
  /** Level the caller asked for, before the master multiplier. */
  requested: number;
  fade: ReturnType<typeof setInterval> | null;
}

/**
 * The ambient channel.
 *
 * Plays through `HTMLAudioElement`, not Web Audio, and that choice is the
 * whole point of this class. iOS suspends the Web Audio API the instant the
 * screen locks or the app is backgrounded, so the bed went silent exactly when
 * it mattered most — the recitation carried on, because it is an audio
 * element, and the ambient did not. Both channels now live in the same
 * subsystem and survive the lock screen together.
 *
 * The beds are still synthesised; they are rendered once into a looping WAV
 * (see ambient-render.ts) and handed to an element from there.
 */
export class WebAudioAmbientMixerAdapter implements AmbientMixerPort {
  private readonly layers = new Map<string, ActiveLayer>();
  private masterLevel = 1;

  /**
   * `url` is part of the port contract but unused: these beds are generated,
   * not fetched. It stays in the signature so a future file-backed pack can
   * drop in without touching callers.
   */
  async play(ambientId: string, _url: string, gain: number): Promise<void> {
    const existing = this.layers.get(ambientId);
    if (existing !== undefined) {
      existing.requested = gain;
      this.setGain(ambientId, gain);
      return;
    }

    const loopUrl = await getAmbientLoopUrl(ambientId);
    if (loopUrl === null) {
      throw new Error(`Could not render the "${ambientId}" bed`);
    }

    // A second play() may have landed while the bed was rendering.
    if (this.layers.has(ambientId)) {
      this.setGain(ambientId, gain);
      return;
    }

    const element = new Audio(loopUrl);
    element.loop = true;
    element.preload = "auto";
    // Ambient is decorative: it must never take over the lock-screen controls
    // or interrupt the recitation's session.
    element.setAttribute("playsinline", "");
    element.volume = 0;

    const layer: ActiveLayer = { element, requested: gain, fade: null };
    this.layers.set(ambientId, layer);

    try {
      await element.play();
    } catch {
      // Autoplay refused — most often because this landed outside the gesture
      // that started the recitation.
      this.layers.delete(ambientId);
      throw new Error("The background sound could not start");
    }

    // Fade in so the bed slides under the recitation rather than punching in.
    this.rampTo(layer, this.clamp(gain * this.masterLevel), 1500);
  }

  stop(ambientId: string): void {
    const layer = this.layers.get(ambientId);
    if (layer === undefined) return;

    this.layers.delete(ambientId);
    this.rampTo(layer, 0, 400, () => {
      layer.element.pause();
      layer.element.removeAttribute("src");
    });
  }

  stopAll(): void {
    for (const id of [...this.layers.keys()]) this.stop(id);
  }

  setGain(ambientId: string, gain: number): void {
    const layer = this.layers.get(ambientId);
    if (layer === undefined) return;

    layer.requested = gain;
    // Short ramp: stepping volume instantly is audible as a click.
    this.rampTo(layer, this.clamp(gain * this.masterLevel), 120);
  }

  setMasterGain(gain: number): void {
    this.masterLevel = this.clamp(gain);
    for (const [id, layer] of this.layers) {
      this.setGain(id, layer.requested);
    }
  }

  /**
   * Dim every layer toward silence. The sleep timer fades the recitation the
   * same way; without this the bed would stay at full level right up to the
   * moment playback stopped.
   */
  fadeOut(seconds: number): void {
    for (const layer of this.layers.values()) {
      this.rampTo(layer, 0, Math.max(50, seconds * 1000));
    }
  }

  cancelFade(): void {
    for (const layer of this.layers.values()) {
      this.rampTo(layer, this.clamp(layer.requested * this.masterLevel), 200);
    }
  }

  isPlaying(ambientId: string): boolean {
    return this.layers.has(ambientId);
  }

  dispose(): void {
    for (const layer of this.layers.values()) {
      if (layer.fade !== null) clearInterval(layer.fade);
      layer.element.pause();
      layer.element.removeAttribute("src");
    }
    this.layers.clear();
    releaseAmbientLoops();
  }

  /**
   * Element volume has no scheduled-ramp API, so fades are stepped at 20Hz —
   * fine for a bed, and it keeps the two channels' behaviour consistent.
   */
  private rampTo(
    layer: ActiveLayer,
    target: number,
    durationMs: number,
    onDone?: () => void,
  ): void {
    if (layer.fade !== null) clearInterval(layer.fade);

    const stepMs = 50;
    const steps = Math.max(1, Math.round(durationMs / stepMs));
    const start = layer.element.volume;
    let step = 0;

    layer.fade = setInterval(() => {
      step += 1;
      const t = step / steps;
      layer.element.volume = this.clamp(start + (target - start) * t);

      if (step >= steps) {
        if (layer.fade !== null) clearInterval(layer.fade);
        layer.fade = null;
        onDone?.();
      }
    }, stepMs);
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 1);
  }
}
