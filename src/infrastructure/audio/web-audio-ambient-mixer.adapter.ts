import type { AmbientMixerPort } from "@/application/ports";
import {
  getAudioContext,
  getMasterGain,
  unlockAudioContext,
} from "./audio-context";
import { createAmbientSource, type AmbientSourceHandle } from "./ambient-synth";

interface ActiveLayer {
  handle: AmbientSourceHandle;
  gain: GainNode;
}

/**
 * The ambient channel.
 *
 * Beds are synthesised in the browser (see ambient-synth.ts) rather than
 * fetched. There is therefore no network request, no decode step and no loop
 * point — a bed can run for an hour without the seam that a looped file
 * develops, and it works offline on first launch.
 */
export class WebAudioAmbientMixerAdapter implements AmbientMixerPort {
  private readonly layers = new Map<string, ActiveLayer>();
  private masterLevel = 1;

  /**
   * `url` is part of the port contract but unused: these beds are generated,
   * not loaded. It stays in the signature so a future file-backed pack can
   * drop in without touching callers.
   */
  async play(ambientId: string, _url: string, gain: number): Promise<void> {
    await unlockAudioContext();

    const ctx = getAudioContext();
    const master = getMasterGain();
    if (ctx === null || master === null) return;

    // Already running — just retune.
    if (this.layers.has(ambientId)) {
      this.setGain(ambientId, gain);
      return;
    }

    const handle = createAmbientSource(ctx, ambientId);
    if (handle === null) {
      throw new Error(`No ambient generator for "${ambientId}"`);
    }

    const gainNode = ctx.createGain();
    // Fade in so the bed slides under the recitation instead of punching in.
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      this.clamp(gain * this.masterLevel),
      ctx.currentTime + 1.5,
    );

    handle.output.gain.setValueAtTime(1, ctx.currentTime);
    handle.output.connect(gainNode);
    gainNode.connect(master);

    this.layers.set(ambientId, { handle, gain: gainNode });
  }

  stop(ambientId: string): void {
    const layer = this.layers.get(ambientId);
    if (layer === undefined) return;

    const ctx = getAudioContext();
    this.layers.delete(ambientId);

    if (ctx === null) {
      layer.handle.stop();
      return;
    }

    // Fade out before tearing down, otherwise the cut is audible.
    const now = ctx.currentTime;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
    layer.gain.gain.linearRampToValueAtTime(0, now + 0.4);

    setTimeout(() => {
      layer.handle.stop();
      layer.gain.disconnect();
    }, 500);
  }

  stopAll(): void {
    for (const id of [...this.layers.keys()]) this.stop(id);
  }

  setGain(ambientId: string, gain: number): void {
    const layer = this.layers.get(ambientId);
    const ctx = getAudioContext();
    if (layer === undefined || ctx === null) return;

    const target = this.clamp(gain * this.masterLevel);
    const now = ctx.currentTime;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
    // Short ramp: stepping gain instantly produces a click.
    layer.gain.gain.linearRampToValueAtTime(target, now + 0.08);
  }

  setMasterGain(gain: number): void {
    this.masterLevel = this.clamp(gain);
    for (const [id] of this.layers) this.setGain(id, 1);
  }

  isPlaying(ambientId: string): boolean {
    return this.layers.has(ambientId);
  }

  dispose(): void {
    for (const layer of this.layers.values()) layer.handle.stop();
    this.layers.clear();
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 1);
  }
}
