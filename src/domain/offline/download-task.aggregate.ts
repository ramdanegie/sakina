import { AggregateRoot } from "../shared/entity";
import { domainEvent, DomainEventName } from "../shared/domain-event";
import { Err, Ok, DomainError, type Result } from "../shared/result";
import { clamp } from "../shared/value-object";

export const DownloadState = {
  Queued: "queued",
  Downloading: "downloading",
  Completed: "completed",
  Failed: "failed",
  Paused: "paused",
} as const;

export type DownloadState = (typeof DownloadState)[keyof typeof DownloadState];

export interface DownloadTaskProps {
  readonly id: string;
  readonly trackId: string;
  readonly reciterId: string;
  readonly surahNumber: number;
  readonly url: string;
  readonly state: DownloadState;
  readonly receivedBytes: number;
  readonly totalBytes: number;
  readonly createdAt: Date;
  readonly error: string | null;
}

/**
 * Aggregate root of the Offline Content context.
 *
 * Owns the download lifecycle so the UI never has to reason about which
 * transitions are legal — a completed task cannot silently restart, and a
 * failed one has to be retried explicitly.
 *
 *   queued ─→ downloading ─→ completed
 *      ↑          │  ↓
 *      └── retry ─┴─ failed / paused
 */
export class DownloadTask extends AggregateRoot<string> {
  private constructor(private props: DownloadTaskProps) {
    super(props.id);
  }

  static queue(params: {
    id: string;
    trackId: string;
    reciterId: string;
    surahNumber: number;
    url: string;
    now: Date;
  }): Result<DownloadTask> {
    if (params.url.trim().length === 0) {
      return Err(
        DomainError.of("download.url_required", "Download needs a source URL", {
          trackId: params.trackId,
        }),
      );
    }

    return Ok(
      new DownloadTask({
        id: params.id,
        trackId: params.trackId,
        reciterId: params.reciterId,
        surahNumber: params.surahNumber,
        url: params.url,
        state: DownloadState.Queued,
        receivedBytes: 0,
        totalBytes: 0,
        createdAt: params.now,
        error: null,
      }),
    );
  }

  static rehydrate(props: DownloadTaskProps): DownloadTask {
    return new DownloadTask(props);
  }

  get trackId(): string {
    return this.props.trackId;
  }

  get reciterId(): string {
    return this.props.reciterId;
  }

  get surahNumber(): number {
    return this.props.surahNumber;
  }

  get url(): string {
    return this.props.url;
  }

  get state(): DownloadState {
    return this.props.state;
  }

  get receivedBytes(): number {
    return this.props.receivedBytes;
  }

  get totalBytes(): number {
    return this.props.totalBytes;
  }

  get error(): string | null {
    return this.props.error;
  }

  get isTerminal(): boolean {
    return (
      this.props.state === DownloadState.Completed ||
      this.props.state === DownloadState.Failed
    );
  }

  get isActive(): boolean {
    return (
      this.props.state === DownloadState.Queued ||
      this.props.state === DownloadState.Downloading
    );
  }

  /** 0..1. Unknown total (no Content-Length) reports 0 rather than NaN. */
  get progress(): number {
    if (this.props.state === DownloadState.Completed) return 1;
    if (this.props.totalBytes <= 0) return 0;
    return clamp(this.props.receivedBytes / this.props.totalBytes, 0, 1);
  }

  start(): Result<void> {
    if (this.props.state === DownloadState.Completed) {
      return Err(
        DomainError.of(
          "download.already_complete",
          "This surah is already downloaded",
          { trackId: this.props.trackId },
        ),
      );
    }
    this.props = {
      ...this.props,
      state: DownloadState.Downloading,
      error: null,
    };
    return Ok(undefined);
  }

  reportProgress(receivedBytes: number, totalBytes: number): void {
    // Ignore regressions; a retry restarts the byte count from zero via reset.
    if (receivedBytes < this.props.receivedBytes) return;
    this.props = {
      ...this.props,
      state: DownloadState.Downloading,
      receivedBytes: Math.max(0, receivedBytes),
      totalBytes: Math.max(0, totalBytes),
    };
  }

  complete(totalBytes?: number): void {
    this.props = {
      ...this.props,
      state: DownloadState.Completed,
      totalBytes: totalBytes ?? this.props.totalBytes,
      receivedBytes: totalBytes ?? this.props.receivedBytes,
      error: null,
    };
    this.record(
      domainEvent(DomainEventName.DownloadCompleted, {
        trackId: this.props.trackId,
        surahNumber: this.props.surahNumber,
      }),
    );
  }

  fail(reason: string): void {
    this.props = { ...this.props, state: DownloadState.Failed, error: reason };
  }

  pause(): Result<void> {
    if (!this.isActive) {
      return Err(
        DomainError.of(
          "download.not_active",
          "Only a queued or running download can be paused",
          { state: this.props.state },
        ),
      );
    }
    this.props = { ...this.props, state: DownloadState.Paused };
    return Ok(undefined);
  }

  /** Retry from scratch: byte counters reset so progress is not misleading. */
  retry(): Result<void> {
    if (this.props.state === DownloadState.Completed) {
      return Err(
        DomainError.of(
          "download.already_complete",
          "This surah is already downloaded",
          { trackId: this.props.trackId },
        ),
      );
    }
    this.props = {
      ...this.props,
      state: DownloadState.Queued,
      receivedBytes: 0,
      error: null,
    };
    return Ok(undefined);
  }

  snapshot(): DownloadTaskProps {
    return this.props;
  }
}
