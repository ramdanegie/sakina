import { DownloadTask } from "@/domain/offline/download-task.aggregate";
import type { DownloadRepository } from "@/domain/repositories";
import { DomainError, Err, Ok, type Result } from "@/domain/shared/result";
import type { ClockPort, OfflineStoragePort } from "../ports";
import type { TrackDto } from "../dto";

/** Refuse to start a download that would leave the device nearly full. */
const MIN_FREE_BYTES = 200 * 1024 * 1024;

/**
 * Queue, run and track offline downloads.
 *
 * The repository holds the task state and the storage port holds the bytes;
 * keeping them separate is what lets the UI show accurate progress for a
 * download whose file lives in Cache Storage rather than in the database.
 */
export class ManageDownloads {
  /** Guards against a double tap starting the same download twice. */
  private readonly running = new Set<string>();

  constructor(
    private readonly downloads: DownloadRepository,
    private readonly storage: OfflineStoragePort,
    private readonly clock: ClockPort,
  ) {}

  async listCompleted(): Promise<Result<string[]>> {
    return this.downloads.completedTrackIds();
  }

  async listAll(): Promise<Result<DownloadTask[]>> {
    return this.downloads.findAll();
  }

  /**
   * Download one surah. `onProgress` fires as bytes arrive so the caller can
   * render a live ring without polling the database.
   */
  async download(
    track: TrackDto,
    onProgress?: (trackId: string, ratio: number) => void,
  ): Promise<Result<void>> {
    if (this.running.has(track.id)) return Ok(undefined);

    const existing = await this.downloads.findByTrack(track.id);
    if (existing.ok && existing.value?.state === "completed") {
      return Ok(undefined);
    }

    const free = await this.storage.estimateRemainingBytes();
    if (free !== null && free < MIN_FREE_BYTES) {
      return Err(
        DomainError.of(
          "download.insufficient_space",
          "Not enough free space left on this device",
          { freeBytes: free },
        ),
      );
    }

    const created = DownloadTask.queue({
      id: track.id,
      trackId: track.id,
      reciterId: track.reciterId,
      surahNumber: track.surahNumber,
      url: track.audioUrl,
      now: this.clock.now(),
    });
    if (!created.ok) return created;

    const task = created.value;
    const started = task.start();
    if (!started.ok) return started;

    this.running.add(track.id);
    await this.downloads.save(task);

    try {
      await this.storage.cache(track.audioUrl, (progress) => {
        task.reportProgress(progress.receivedBytes, progress.totalBytes);
        onProgress?.(track.id, task.progress);
      });

      task.complete(task.totalBytes);
      await this.downloads.save(task);
      onProgress?.(track.id, 1);
      return Ok(undefined);
    } catch (error) {
      task.fail(String(error));
      await this.downloads.save(task);
      return Err(
        DomainError.of("download.failed", "Could not download this surah", {
          trackId: track.id,
          cause: String(error),
        }),
      );
    } finally {
      this.running.delete(track.id);
    }
  }

  /** Remove both the cached bytes and the task row. */
  async remove(track: TrackDto): Promise<Result<void>> {
    await this.storage.evict(track.audioUrl);
    return this.downloads.delete(track.id);
  }

  async isDownloaded(trackId: string): Promise<boolean> {
    const found = await this.downloads.findByTrack(trackId);
    return found.ok && found.value?.state === "completed";
  }
}
