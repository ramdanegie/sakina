/**
 * Ports — the application's view of the outside world.
 *
 * Every adapter in `infrastructure/` implements one of these. Nothing in
 * `application/` or `domain/` ever imports an adapter directly; the DI
 * container wires them at the composition root.
 */

import type { Reciter } from "@/domain/recitation/reciter.entity";

/** Injected so use cases never read the wall clock directly (testability). */
export interface ClockPort {
  now(): Date;
}

/** Injected so id generation stays deterministic under test. */
export interface IdGeneratorPort {
  next(): string;
}

export interface AudioTrackSource {
  readonly trackId: string;
  readonly url: string;
  readonly title: string;
  readonly artist: string;
  readonly artworkUrl: string | null;
}

/**
 * The recitation channel. Backed by HTMLAudioElement so we get streaming,
 * HTTP Range requests and Media Session integration for free.
 */
export interface AudioPlayerPort {
  load(source: AudioTrackSource): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setVolume(level: number): void;
  setSpeed(rate: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  /** Ramp to silence over `seconds`, used by the sleep timer fade-out. */
  fadeOut(seconds: number): void;
  cancelFade(): void;

  /**
   * Hand playback to an external device (AirPlay / Cast) via the Remote
   * Playback API. Returns false when the platform has no route picker, so the
   * UI can hide the control rather than offer a button that does nothing.
   */
  canSelectRemoteDevice(): boolean;
  selectRemoteDevice(): Promise<void>;

  onTimeUpdate(handler: (currentTime: number, duration: number) => void): void;
  onEnded(handler: () => void): void;
  onLoadedMetadata(handler: (duration: number) => void): void;
  onError(handler: (error: Error) => void): void;
  onPlayingStateChange(handler: (isPlaying: boolean) => void): void;

  dispose(): void;
}

/**
 * The ambient channel. Deliberately separate from AudioPlayerPort: ambient
 * beds need sample-accurate looping, which HTMLAudioElement cannot deliver.
 */
export interface AmbientMixerPort {
  /** Decode and start looping. Idempotent per ambientId. */
  play(ambientId: string, url: string, gain: number): Promise<void>;
  stop(ambientId: string): void;
  stopAll(): void;
  setGain(ambientId: string, gain: number): void;
  setMasterGain(gain: number): void;
  /** Ramp every layer to silence — used by the sleep timer's fade-out. */
  fadeOut(seconds: number): void;
  /** Restore the levels a fade was interrupting. */
  cancelFade(): void;
  isPlaying(ambientId: string): boolean;
  dispose(): void;
}

/** Lock-screen / notification-tray transport controls. */
export interface MediaSessionPort {
  setMetadata(metadata: {
    title: string;
    artist: string;
    album: string;
    artworkUrl: string | null;
  }): void;
  setPlaybackState(state: "playing" | "paused" | "none"): void;
  setPositionState(position: number, duration: number, speed: number): void;
  setHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNextTrack: () => void;
    onPreviousTrack: () => void;
    onSeekTo: (seconds: number) => void;
  }): void;
  clear(): void;
}

/** Remote catalogue access, with the multi-provider fallback chain behind it. */
export interface ContentProviderPort {
  listReciters(): Promise<Reciter[]>;
  getReciter(id: string): Promise<Reciter | null>;
}

export const DownloadStatus = {
  Queued: "queued",
  Downloading: "downloading",
  Completed: "completed",
  Failed: "failed",
  Paused: "paused",
} as const;

export type DownloadStatus =
  (typeof DownloadStatus)[keyof typeof DownloadStatus];

export interface DownloadProgress {
  readonly targetId: string;
  readonly status: DownloadStatus;
  readonly receivedBytes: number;
  readonly totalBytes: number;
}

export interface OfflineStoragePort {
  isCached(url: string): Promise<boolean>;
  cache(url: string, onProgress?: (p: DownloadProgress) => void): Promise<void>;
  evict(url: string): Promise<void>;
  /** Remaining quota in bytes, or null when the browser will not say. */
  estimateRemainingBytes(): Promise<number | null>;
}
