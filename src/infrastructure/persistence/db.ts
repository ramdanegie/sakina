import Dexie, { type EntityTable } from "dexie";

/**
 * Local-first storage.
 *
 * IndexedDB is the source of truth: the app works fully without an account,
 * and server sync (when enabled) is a merge on top rather than a dependency.
 *
 * Every synced row carries `updatedAt` and a soft-delete marker so a future
 * last-write-wins merge has something to compare. Ids are generated client-side
 * (ULID-ish) so sync never has to negotiate identity.
 */

export interface ReciterRow {
  id: string;
  slug: string;
  nameLatin: string;
  nameArabic: string;
  countryCode: string | null;
  rewaya: string;
  avatarUrl: string | null;
  serverBaseUrl: string;
  availableSurahs: number[];
  isNew: number; // Dexie cannot index booleans
  popularity: number;
  syncedAt: number;
}

export interface PlaylistRow {
  id: string;
  name: string;
  coverGradient: string;
  isSystem: number;
  systemKind: string | null;
  items: { trackId: string; position: number; addedAt: number }[];
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface FavoriteRow {
  id: string; // `${targetType}:${targetId}` — deterministic, so toggling is idempotent
  targetType: string;
  targetId: string;
  createdAt: number;
}

export interface PlaybackStateRow {
  id: string; // always "current"
  trackId: string;
  reciterId: string;
  surahNumber: number;
  queueTrackIds: string[];
  queueIndex: number;
  positionSec: number;
  speed: number;
  repeatMode: string;
  shuffle: number;
  ambientId: string | null;
  volumeQuran: number;
  volumeAmbient: number;
  updatedAt: number;
}

export interface ListeningSessionRow {
  id: string;
  trackId: string;
  reciterId: string;
  surahNumber: number;
  ambientId: string | null;
  day: string; // YYYY-MM-DD in the listener's local timezone
  listenedSeconds: number;
  startedAt: number;
  endedAt: number | null;
}

export interface PreferenceRow {
  key: string;
  value: unknown;
}

export interface DownloadRow {
  id: string;
  targetType: string;
  targetId: string;
  url: string;
  status: string;
  receivedBytes: number;
  totalBytes: number;
  createdAt: number;
}

export class QuranifyDatabase extends Dexie {
  reciters!: EntityTable<ReciterRow, "id">;
  playlists!: EntityTable<PlaylistRow, "id">;
  favorites!: EntityTable<FavoriteRow, "id">;
  playbackState!: EntityTable<PlaybackStateRow, "id">;
  listeningSessions!: EntityTable<ListeningSessionRow, "id">;
  preferences!: EntityTable<PreferenceRow, "key">;
  downloads!: EntityTable<DownloadRow, "id">;

  constructor() {
    super("quranify");

    this.version(1).stores({
      reciters: "id, slug, countryCode, popularity, isNew",
      playlists: "id, isSystem, systemKind, updatedAt",
      favorites: "id, targetType, targetId, createdAt",
      playbackState: "id, updatedAt",
      // `day` is indexed because every streak query groups by it.
      listeningSessions: "id, day, trackId, reciterId, startedAt",
      preferences: "key",
      downloads: "id, status, targetType, targetId",
    });
  }
}

let instance: QuranifyDatabase | null = null;

/** Returns null during SSR — callers must handle the server case. */
export function getDb(): QuranifyDatabase | null {
  if (typeof window === "undefined") return null;
  if (instance === null) instance = new QuranifyDatabase();
  return instance;
}

export const PLAYBACK_STATE_ID = "current";
