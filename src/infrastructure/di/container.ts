import { BuildTrack } from "@/application/use-cases/build-track";
import { ManageDownloads } from "@/application/use-cases/manage-downloads";
import { RecordListeningProgress } from "@/application/use-cases/record-listening-progress";
import type {
  AmbientMixerPort,
  AudioPlayerPort,
  ClockPort,
  IdGeneratorPort,
  MediaSessionPort,
} from "@/application/ports";
import type {
  AmbientSoundRepository,
  DownloadRepository,
  FavoriteRepository,
  ListeningSessionRepository,
  PlaybackStateRepository,
  PlaylistRepository,
  ReciterRepository,
  SurahRepository,
  UserPreferencesRepository,
} from "@/domain/repositories";
import { CacheStorageAdapter } from "../offline/cache-storage.adapter";
import { DexieDownloadRepository } from "../persistence/dexie-download.repository";

import { HtmlAudioPlayerAdapter } from "../audio/html-audio-player.adapter";
import { MediaSessionAdapter } from "../audio/media-session.adapter";
import { WebAudioAmbientMixerAdapter } from "../audio/web-audio-ambient-mixer.adapter";
import { StaticAmbientSoundRepository } from "../content/ambient-catalog";
import { CachedReciterRepository } from "../content/cached-reciter.repository";
import { StaticSurahRepository } from "../content/static-surah.repository";
import {
  DexieListeningSessionRepository,
  DexieUserPreferencesRepository,
} from "../persistence/dexie-habit.repository";
import {
  DexieFavoriteRepository,
  DexiePlaybackStateRepository,
  DexiePlaylistRepository,
} from "../persistence/dexie-library.repository";

/**
 * Composition root.
 *
 * The only module allowed to know about both the application layer and the
 * concrete adapters. Presentation code resolves use cases from here and never
 * imports `infrastructure/*` directly — the boundary lint rule enforces it.
 */

class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

/**
 * Monotonic, lexicographically sortable ids generated client-side, so offline
 * writes never need to negotiate identity with a server.
 */
class UlidGenerator implements IdGeneratorPort {
  private lastTime = 0;
  private counter = 0;

  next(): string {
    const now = Date.now();
    if (now === this.lastTime) {
      this.counter += 1;
    } else {
      this.lastTime = now;
      this.counter = 0;
    }

    const time = now.toString(36).padStart(9, "0");
    const seq = this.counter.toString(36).padStart(3, "0");
    const random = Math.random().toString(36).slice(2, 10);
    return `${time}${seq}${random}`;
  }
}

export interface Container {
  readonly clock: ClockPort;
  readonly ids: IdGeneratorPort;

  readonly reciters: ReciterRepository;
  readonly surahs: SurahRepository;
  readonly ambientSounds: AmbientSoundRepository;
  readonly playlists: PlaylistRepository;
  readonly favorites: FavoriteRepository;
  readonly playbackState: PlaybackStateRepository;
  readonly listeningSessions: ListeningSessionRepository;
  readonly preferences: UserPreferencesRepository;
  readonly downloads: DownloadRepository;

  readonly buildTrack: BuildTrack;
  readonly habit: RecordListeningProgress;
  readonly offline: ManageDownloads;
  /** Exposed for the settings screen's cache size / clear rows. */
  readonly storage: CacheStorageAdapter;
}

/** Browser-only ports — absent during SSR. */
export interface AudioContainer {
  readonly player: AudioPlayerPort;
  readonly ambientMixer: AmbientMixerPort;
  readonly mediaSession: MediaSessionPort;
}

let container: Container | null = null;
let audioContainer: AudioContainer | null = null;

export function getContainer(): Container {
  if (container !== null) return container;

  const clock = new SystemClock();
  const ids = new UlidGenerator();

  const reciters = new CachedReciterRepository();
  const surahs = new StaticSurahRepository();
  const ambientSounds = new StaticAmbientSoundRepository();
  const playlists = new DexiePlaylistRepository();
  const favorites = new DexieFavoriteRepository();
  const playbackState = new DexiePlaybackStateRepository();
  const listeningSessions = new DexieListeningSessionRepository();
  const preferences = new DexieUserPreferencesRepository();
  const downloads = new DexieDownloadRepository();
  const storage = new CacheStorageAdapter();

  container = {
    clock,
    ids,
    reciters,
    surahs,
    ambientSounds,
    playlists,
    favorites,
    playbackState,
    listeningSessions,
    preferences,
    downloads,
    storage,
    buildTrack: new BuildTrack(reciters, surahs),
    habit: new RecordListeningProgress(
      listeningSessions,
      preferences,
      clock,
      ids,
    ),
    offline: new ManageDownloads(downloads, storage, clock),
  };

  return container;
}

/**
 * Audio ports construct real browser objects (Audio element, AudioContext),
 * so they are resolved lazily and only on the client.
 */
export function getAudioContainer(): AudioContainer | null {
  if (typeof window === "undefined") return null;
  if (audioContainer !== null) return audioContainer;

  audioContainer = {
    player: new HtmlAudioPlayerAdapter(),
    ambientMixer: new WebAudioAmbientMixerAdapter(),
    mediaSession: new MediaSessionAdapter(),
  };
  return audioContainer;
}
