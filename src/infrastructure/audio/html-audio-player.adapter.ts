import type { AudioPlayerPort, AudioTrackSource } from "@/application/ports";
import { cancelMasterFade, fadeMasterTo, unlockAudioContext } from "./audio-context";

/**
 * The recitation channel.
 *
 * Deliberately a plain HTMLAudioElement rather than a Web Audio buffer:
 *  - it streams, so playback starts in well under a second instead of after
 *    downloading a 40MB surah
 *  - the browser issues HTTP Range requests, which is what makes seeking work
 *    against both the CDN and the service-worker cache
 *  - it needs no CORS headers, so third-party CDNs work as-is
 *
 * It is intentionally NOT routed through createMediaElementSource: doing so
 * would require CORS on every audio CDN we stream from, and several do not
 * send it. The sleep-timer fade therefore uses element volume rather than the
 * Web Audio master bus for this channel.
 */
export class HtmlAudioPlayerAdapter implements AudioPlayerPort {
  private readonly element: HTMLAudioElement;
  private baseVolume = 1;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.element = new Audio();
    this.element.preload = "metadata";
    this.element.crossOrigin = null;
  }

  /**
   * Synchronous in practice, even though the port types it as async: setting
   * `src` and calling `load()` do not wait on anything. Keeping it free of
   * internal awaits matters because callers `await` this immediately before
   * `play()`, and any real async work here would spend the user gesture that
   * playback depends on.
   */
  async load(source: AudioTrackSource): Promise<void> {
    this.cancelFade();
    if (this.element.src !== source.url) {
      this.element.src = source.url;
      this.element.load();
    }
  }

  /**
   * Order matters here, and getting it wrong is subtle.
   *
   * `element.play()` has to be *invoked* synchronously inside the user
   * gesture that triggered it. Awaiting anything first — including the
   * AudioContext resume — defers the call to a later tick, by which point
   * Chrome and Safari consider the gesture spent and reject playback. The
   * symptom is a track that loads, shows its metadata, and silently never
   * starts.
   *
   * So the element is started first, and the AudioContext (which only the
   * ambient channel needs) is unlocked immediately afterwards.
   */
  async play(): Promise<void> {
    const started = this.element.play();

    void unlockAudioContext();

    try {
      await started;
    } catch (error) {
      // Autoplay rejection is expected outside a gesture; surface it upward.
      throw error instanceof Error ? error : new Error("Playback failed");
    }
  }

  pause(): void {
    this.element.pause();
  }

  seek(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    const duration = this.getDuration();
    this.element.currentTime =
      duration > 0 ? Math.min(Math.max(seconds, 0), duration) : Math.max(seconds, 0);
  }

  setVolume(level: number): void {
    this.baseVolume = Math.min(Math.max(level, 0), 1);
    this.element.volume = this.baseVolume;
  }

  setSpeed(rate: number): void {
    this.element.playbackRate = rate;
    // Keep the recitation intelligible when sped up or slowed down.
    this.element.preservesPitch = true;
  }

  getCurrentTime(): number {
    return Number.isFinite(this.element.currentTime)
      ? this.element.currentTime
      : 0;
  }

  getDuration(): number {
    return Number.isFinite(this.element.duration) ? this.element.duration : 0;
  }

  /** Linear ramp to silence, stepped at 20Hz. */
  fadeOut(seconds: number): void {
    this.cancelFade();
    fadeMasterTo(0, seconds);

    const stepMs = 50;
    const steps = Math.max(1, Math.round((seconds * 1000) / stepMs));
    const start = this.element.volume;
    let step = 0;

    this.fadeTimer = setInterval(() => {
      step += 1;
      const next = start * (1 - step / steps);
      this.element.volume = Math.max(0, next);
      if (step >= steps) this.cancelFade();
    }, stepMs);
  }

  cancelFade(): void {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    cancelMasterFade();
    this.element.volume = this.baseVolume;
  }

  /**
   * Route picking is only offered where the platform actually provides it:
   * Safari exposes `webkitShowPlaybackTargetPicker` for AirPlay, Chromium
   * implements the standard Remote Playback API for Cast. Firefox has
   * neither, so the control is hidden there instead of failing on tap.
   */
  canSelectRemoteDevice(): boolean {
    if (typeof window === "undefined") return false;

    const el = this.element as HTMLAudioElement & {
      webkitShowPlaybackTargetPicker?: () => void;
    };
    if (typeof el.webkitShowPlaybackTargetPicker === "function") return true;

    return (
      "remote" in this.element &&
      typeof this.element.remote?.prompt === "function"
    );
  }

  async selectRemoteDevice(): Promise<void> {
    const el = this.element as HTMLAudioElement & {
      webkitShowPlaybackTargetPicker?: () => void;
    };

    if (typeof el.webkitShowPlaybackTargetPicker === "function") {
      el.webkitShowPlaybackTargetPicker();
      return;
    }

    try {
      await this.element.remote.prompt();
    } catch {
      // The user dismissed the picker, or no devices were found. Neither is
      // an error worth surfacing.
    }
  }

  onTimeUpdate(handler: (currentTime: number, duration: number) => void): void {
    this.element.addEventListener("timeupdate", () => {
      handler(this.getCurrentTime(), this.getDuration());
    });
  }

  onEnded(handler: () => void): void {
    this.element.addEventListener("ended", handler);
  }

  onLoadedMetadata(handler: (duration: number) => void): void {
    this.element.addEventListener("loadedmetadata", () => {
      handler(this.getDuration());
    });
  }

  onError(handler: (error: Error) => void): void {
    this.element.addEventListener("error", () => {
      const code = this.element.error?.code ?? 0;
      handler(new Error(`Audio element error (code ${code})`));
    });
  }

  onPlayingStateChange(handler: (isPlaying: boolean) => void): void {
    this.element.addEventListener("play", () => handler(true));
    this.element.addEventListener("playing", () => handler(true));
    this.element.addEventListener("pause", () => handler(false));
    this.element.addEventListener("waiting", () => handler(false));
  }

  dispose(): void {
    this.cancelFade();
    this.element.pause();
    this.element.removeAttribute("src");
    this.element.load();
  }
}
