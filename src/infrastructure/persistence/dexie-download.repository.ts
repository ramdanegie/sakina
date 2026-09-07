import {
  DownloadTask,
  type DownloadState,
} from "@/domain/offline/download-task.aggregate";
import type { DownloadRepository } from "@/domain/repositories";
import { DomainError, Err, Ok, type Result } from "@/domain/shared/result";
import { getDb, type DownloadRow } from "./db";

const unavailable = () =>
  Err(
    DomainError.of(
      "storage.unavailable",
      "IndexedDB is not available in this environment",
    ),
  );

function toRow(task: DownloadTask): DownloadRow {
  const snapshot = task.snapshot();
  return {
    // Keyed by track so re-queueing the same surah updates rather than
    // stacking duplicate rows.
    id: snapshot.trackId,
    targetType: "track",
    targetId: snapshot.trackId,
    url: snapshot.url,
    status: snapshot.state,
    receivedBytes: snapshot.receivedBytes,
    totalBytes: snapshot.totalBytes,
    createdAt: snapshot.createdAt.getTime(),
  };
}

function toTask(row: DownloadRow): DownloadTask {
  // The row keeps the surah number inside the track id (`reciter:nnn`).
  const [reciterId, padded] = row.targetId.split(":");
  return DownloadTask.rehydrate({
    id: row.id,
    trackId: row.targetId,
    reciterId: reciterId ?? "",
    surahNumber: Number.parseInt(padded ?? "0", 10) || 0,
    url: row.url,
    state: row.status as DownloadState,
    receivedBytes: row.receivedBytes,
    totalBytes: row.totalBytes,
    createdAt: new Date(row.createdAt),
    error: null,
  });
}

export class DexieDownloadRepository implements DownloadRepository {
  async findAll(): Promise<Result<DownloadTask[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.downloads.toArray();
    return Ok(rows.map(toTask));
  }

  async findByTrack(trackId: string): Promise<Result<DownloadTask | null>> {
    const db = getDb();
    if (db === null) return unavailable();

    const row = await db.downloads.get(trackId);
    return Ok(row === undefined ? null : toTask(row));
  }

  async completedTrackIds(): Promise<Result<string[]>> {
    const db = getDb();
    if (db === null) return Ok([]);

    const rows = await db.downloads.where("status").equals("completed").toArray();
    return Ok(rows.map((row) => row.targetId));
  }

  async save(task: DownloadTask): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.downloads.put(toRow(task));
    return Ok(undefined);
  }

  async delete(trackId: string): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.downloads.delete(trackId);
    return Ok(undefined);
  }

  async clearAll(): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.downloads.clear();
    return Ok(undefined);
  }
}
