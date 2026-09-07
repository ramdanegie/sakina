import {
  Favorite,
  type FavoriteTargetType,
} from "@/domain/library/favorite.entity";
import {
  Playlist,
  type SystemPlaylistKind,
} from "@/domain/library/playlist.aggregate";
import type {
  FavoriteRepository,
  PlaybackStateRepository,
  PlaybackStateSnapshot,
  PlaylistRepository,
} from "@/domain/repositories";
import { DomainError, Err, Ok, type Result } from "@/domain/shared/result";
import { getDb, PLAYBACK_STATE_ID, type PlaylistRow } from "./db";

const unavailable = () =>
  Err(
    DomainError.of(
      "storage.unavailable",
      "IndexedDB is not available in this environment",
    ),
  );

function toPlaylistRow(playlist: Playlist): PlaylistRow {
  const snapshot = playlist.snapshot();
  return {
    id: snapshot.id,
    name: snapshot.name,
    coverGradient: snapshot.coverGradient,
    isSystem: snapshot.isSystem ? 1 : 0,
    systemKind: snapshot.systemKind,
    items: snapshot.items.map((item) => ({
      trackId: item.trackId,
      position: item.position,
      addedAt: item.addedAt.getTime(),
    })),
    createdAt: snapshot.createdAt.getTime(),
    updatedAt: snapshot.updatedAt.getTime(),
    deletedAt: null,
  };
}

function toPlaylist(row: PlaylistRow): Playlist {
  return Playlist.rehydrate({
    id: row.id,
    name: row.name,
    coverGradient: row.coverGradient,
    isSystem: row.isSystem === 1,
    systemKind: row.systemKind as SystemPlaylistKind | null,
    items: row.items.map((item) => ({
      trackId: item.trackId,
      position: item.position,
      addedAt: new Date(item.addedAt),
    })),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

export class DexiePlaylistRepository implements PlaylistRepository {
  async findAll(): Promise<Result<Playlist[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.playlists
      .filter((row) => row.deletedAt === null)
      .toArray();
    return Ok(rows.map(toPlaylist));
  }

  async findById(id: string): Promise<Result<Playlist | null>> {
    const db = getDb();
    if (db === null) return unavailable();

    const row = await db.playlists.get(id);
    if (row === undefined || row.deletedAt !== null) return Ok(null);
    return Ok(toPlaylist(row));
  }

  async save(playlist: Playlist): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.playlists.put(toPlaylistRow(playlist));
    return Ok(undefined);
  }

  /** Soft delete, so a future sync can propagate the removal. */
  async delete(id: string): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    const row = await db.playlists.get(id);
    if (row === undefined) return Ok(undefined);
    if (row.isSystem === 1) {
      return Err(
        DomainError.of(
          "playlist.system_immutable",
          "System playlists cannot be deleted",
          { id },
        ),
      );
    }

    await db.playlists.update(id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return Ok(undefined);
  }
}

export class DexieFavoriteRepository implements FavoriteRepository {
  async findAll(): Promise<Result<Favorite[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.favorites.toArray();
    return Ok(
      rows.map((row) =>
        Favorite.create({
          id: row.id,
          targetType: row.targetType as FavoriteTargetType,
          targetId: row.targetId,
          createdAt: new Date(row.createdAt),
        }),
      ),
    );
  }

  async findByType(type: FavoriteTargetType): Promise<Result<Favorite[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.favorites.where("targetType").equals(type).toArray();
    return Ok(
      rows.map((row) =>
        Favorite.create({
          id: row.id,
          targetType: row.targetType as FavoriteTargetType,
          targetId: row.targetId,
          createdAt: new Date(row.createdAt),
        }),
      ),
    );
  }

  async exists(type: FavoriteTargetType, targetId: string): Promise<boolean> {
    const db = getDb();
    if (db === null) return false;
    const row = await db.favorites.get(Favorite.idFor(type, targetId));
    return row !== undefined;
  }

  async add(favorite: Favorite): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    const snapshot = favorite.snapshot();
    // Deterministic id makes this idempotent — double-tapping the star is safe.
    await db.favorites.put({
      id: snapshot.id,
      targetType: snapshot.targetType,
      targetId: snapshot.targetId,
      createdAt: snapshot.createdAt.getTime(),
    });
    return Ok(undefined);
  }

  async remove(
    type: FavoriteTargetType,
    targetId: string,
  ): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.favorites.delete(Favorite.idFor(type, targetId));
    return Ok(undefined);
  }
}

export class DexiePlaybackStateRepository implements PlaybackStateRepository {
  async load(): Promise<Result<PlaybackStateSnapshot | null>> {
    const db = getDb();
    if (db === null) return Ok(null);

    const row = await db.playbackState.get(PLAYBACK_STATE_ID);
    if (row === undefined) return Ok(null);

    return Ok({
      trackId: row.trackId,
      reciterId: row.reciterId,
      surahNumber: row.surahNumber,
      queueTrackIds: row.queueTrackIds,
      queueIndex: row.queueIndex,
      positionSec: row.positionSec,
      speed: row.speed,
      repeatMode: row.repeatMode,
      shuffle: row.shuffle === 1,
      ambientId: row.ambientId,
      volumeQuran: row.volumeQuran,
      volumeAmbient: row.volumeAmbient,
      updatedAt: new Date(row.updatedAt),
    });
  }

  async save(snapshot: PlaybackStateSnapshot): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.playbackState.put({
      id: PLAYBACK_STATE_ID,
      trackId: snapshot.trackId,
      reciterId: snapshot.reciterId,
      surahNumber: snapshot.surahNumber,
      queueTrackIds: [...snapshot.queueTrackIds],
      queueIndex: snapshot.queueIndex,
      positionSec: Math.round(snapshot.positionSec),
      speed: snapshot.speed,
      repeatMode: snapshot.repeatMode,
      shuffle: snapshot.shuffle ? 1 : 0,
      ambientId: snapshot.ambientId,
      volumeQuran: snapshot.volumeQuran,
      volumeAmbient: snapshot.volumeAmbient,
      updatedAt: snapshot.updatedAt.getTime(),
    });
    return Ok(undefined);
  }

  async clear(): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.playbackState.delete(PLAYBACK_STATE_ID);
    return Ok(undefined);
  }
}
