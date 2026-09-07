/**
 * Repository interfaces — owned by the domain, implemented by infrastructure.
 * This inversion is what lets the domain stay free of Dexie, fetch and React.
 */

import type { AmbientSound } from "./ambience/ambient-sound.entity";
import type { DailyTotal } from "./habit/habit-tracker.service";
import type { DailyGoal, LocalDay } from "./habit/value-objects";
import type { DownloadTask } from "./offline/download-task.aggregate";
import type { Favorite, FavoriteTargetType } from "./library/favorite.entity";
import type { Playlist } from "./library/playlist.aggregate";
import type { ListeningSession } from "./habit/listening-session.entity";
import type { Reciter } from "./recitation/reciter.entity";
import type { Surah } from "./recitation/surah.entity";
import type { Result } from "./shared/result";

export interface ReciterRepository {
  findAll(): Promise<Result<Reciter[]>>;
  findById(id: string): Promise<Result<Reciter | null>>;
  findBySlug(slug: string): Promise<Result<Reciter | null>>;
  search(query: string): Promise<Result<Reciter[]>>;
  findByCountry(countryCode: string): Promise<Result<Reciter[]>>;
}

export interface SurahRepository {
  findAll(): Surah[];
  findByNumber(number: number): Surah | null;
  search(query: string): Surah[];
}

export interface AmbientSoundRepository {
  findAll(): AmbientSound[];
  findById(id: string): AmbientSound | null;
}

export interface PlaylistRepository {
  findAll(): Promise<Result<Playlist[]>>;
  findById(id: string): Promise<Result<Playlist | null>>;
  save(playlist: Playlist): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
}

export interface FavoriteRepository {
  findAll(): Promise<Result<Favorite[]>>;
  findByType(type: FavoriteTargetType): Promise<Result<Favorite[]>>;
  exists(type: FavoriteTargetType, targetId: string): Promise<boolean>;
  add(favorite: Favorite): Promise<Result<void>>;
  remove(type: FavoriteTargetType, targetId: string): Promise<Result<void>>;
}

/** Persisted "continue listening" state — one row per user. */
export interface PlaybackStateSnapshot {
  readonly trackId: string;
  readonly reciterId: string;
  readonly surahNumber: number;
  readonly queueTrackIds: readonly string[];
  readonly queueIndex: number;
  readonly positionSec: number;
  readonly speed: number;
  readonly repeatMode: string;
  readonly shuffle: boolean;
  readonly ambientId: string | null;
  readonly volumeQuran: number;
  readonly volumeAmbient: number;
  readonly updatedAt: Date;
}

export interface PlaybackStateRepository {
  load(): Promise<Result<PlaybackStateSnapshot | null>>;
  save(snapshot: PlaybackStateSnapshot): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

export interface ListeningSessionRepository {
  save(session: ListeningSession): Promise<Result<void>>;
  findByDay(day: LocalDay): Promise<Result<ListeningSession[]>>;
  /** Aggregated per-day totals, the input to every streak calculation. */
  dailyTotals(fromDay: LocalDay, toDay: LocalDay): Promise<Result<DailyTotal[]>>;
  allDailyTotals(): Promise<Result<DailyTotal[]>>;
  topReciters(limit: number): Promise<Result<{ reciterId: string; seconds: number }[]>>;
}

export interface UserPreferencesRepository {
  getDailyGoal(): Promise<Result<DailyGoal>>;
  setDailyGoal(goal: DailyGoal): Promise<Result<void>>;
}

export interface DownloadRepository {
  findAll(): Promise<Result<DownloadTask[]>>;
  findByTrack(trackId: string): Promise<Result<DownloadTask | null>>;
  /** Track ids that finished downloading — drives the per-row tick. */
  completedTrackIds(): Promise<Result<string[]>>;
  save(task: DownloadTask): Promise<Result<void>>;
  delete(trackId: string): Promise<Result<void>>;
  clearAll(): Promise<Result<void>>;
}
