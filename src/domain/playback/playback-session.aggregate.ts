import { AggregateRoot } from "../shared/entity";
import { domainEvent, DomainEventName } from "../shared/domain-event";
import { Err, Ok, DomainError, type Result } from "../shared/result";
import { Queue } from "./queue.entity";
import {
  PlaybackPosition,
  PlaybackSpeed,
  PlaybackStatus,
  RepeatMode,
  SleepTimer,
  Volume,
} from "./value-objects";

interface SessionState {
  queue: Queue;
  status: PlaybackStatus;
  position: PlaybackPosition;
  speed: PlaybackSpeed;
  repeat: RepeatMode;
  quranVolume: Volume;
  ambientVolume: Volume;
  sleepTimer: SleepTimer;
}

/**
 * Aggregate root for the Playback context.
 *
 * Invariants enforced here:
 *  - status PLAYING implies a non-empty queue with a current track
 *  - position always stays within [0, duration]
 *  - TrackCompleted is only emitted past the 90% threshold, so skipping
 *    early never inflates listening statistics
 *  - ambient gain is capped relative to the recitation gain so background
 *    sound can never drown out the recitation
 */
export class PlaybackSession extends AggregateRoot<string> {
  /** Ambient may never exceed this fraction of the recitation volume. */
  static readonly AMBIENT_GAIN_CEILING = 0.8;
  static readonly DEFAULT_AMBIENT_LEVEL = 0.35;

  private constructor(
    id: string,
    private state: SessionState,
  ) {
    super(id);
  }

  static start(id: string): PlaybackSession {
    return new PlaybackSession(id, {
      queue: Queue.empty(),
      status: PlaybackStatus.Idle,
      position: PlaybackPosition.start(),
      speed: PlaybackSpeed.normal(),
      repeat: RepeatMode.Off,
      quranVolume: Volume.max(),
      ambientVolume: Volume.create(PlaybackSession.DEFAULT_AMBIENT_LEVEL),
      sleepTimer: SleepTimer.none(),
    });
  }

  // ---------------------------------------------------------------- getters

  get queue(): Queue {
    return this.state.queue;
  }

  get status(): PlaybackStatus {
    return this.state.status;
  }

  get position(): PlaybackPosition {
    return this.state.position;
  }

  get speed(): PlaybackSpeed {
    return this.state.speed;
  }

  get repeat(): RepeatMode {
    return this.state.repeat;
  }

  get quranVolume(): Volume {
    return this.state.quranVolume;
  }

  get ambientVolume(): Volume {
    return this.state.ambientVolume;
  }

  get sleepTimer(): SleepTimer {
    return this.state.sleepTimer;
  }

  get currentTrackId(): string | null {
    return this.state.queue.currentTrackId;
  }

  get isPlaying(): boolean {
    return this.state.status === PlaybackStatus.Playing;
  }

  // ------------------------------------------------------------- transitions

  /** Load a queue and begin at `startIndex`. */
  loadQueue(trackIds: readonly string[], startIndex = 0): Result<void> {
    const queue = Queue.of(trackIds, startIndex);
    if (!queue.ok) return queue;

    this.state.queue = queue.value;
    this.state.position = PlaybackPosition.start();
    this.state.status = PlaybackStatus.Loading;
    return Ok(undefined);
  }

  /**
   * Transition to PLAYING. Rejects when there is nothing to play, which is
   * the invariant that keeps the mini player from rendering an empty track.
   */
  play(durationSeconds = 0): Result<void> {
    if (this.state.queue.isEmpty || this.currentTrackId === null) {
      return Err(
        DomainError.of(
          "playback.nothing_to_play",
          "Cannot play with an empty queue",
        ),
      );
    }

    const position = PlaybackPosition.create(
      this.state.position.seconds,
      durationSeconds > 0 ? durationSeconds : this.state.position.durationSeconds,
    );
    if (!position.ok) return position;

    this.state.position = position.value;
    this.state.status = PlaybackStatus.Playing;

    this.record(
      domainEvent(DomainEventName.TrackStarted, {
        trackId: this.currentTrackId,
        positionSec: this.state.position.seconds,
      }),
    );
    return Ok(undefined);
  }

  pause(): Result<void> {
    if (this.state.status !== PlaybackStatus.Playing) {
      return Err(
        DomainError.of(
          "playback.not_playing",
          "Cannot pause a session that is not playing",
          { status: this.state.status },
        ),
      );
    }
    this.state.status = PlaybackStatus.Paused;
    this.record(
      domainEvent(DomainEventName.TrackPaused, {
        trackId: this.currentTrackId,
        positionSec: this.state.position.seconds,
      }),
    );
    return Ok(undefined);
  }

  resume(): Result<void> {
    if (this.state.status === PlaybackStatus.Playing) return Ok(undefined);
    return this.play(this.state.position.durationSeconds);
  }

  seekTo(seconds: number): Result<void> {
    const position = PlaybackPosition.create(
      seconds,
      this.state.position.durationSeconds,
    );
    if (!position.ok) return position;
    this.state.position = position.value;
    return Ok(undefined);
  }

  /** Called on every timeupdate tick from the audio engine. */
  reportProgress(seconds: number, durationSeconds: number): Result<void> {
    const position = PlaybackPosition.create(seconds, durationSeconds);
    if (!position.ok) return position;
    this.state.position = position.value;
    return Ok(undefined);
  }

  /**
   * The track reached its natural end. Emits TrackCompleted only when the
   * listener actually heard ≥90% of it.
   */
  completeCurrentTrack(): Result<void> {
    const trackId = this.currentTrackId;
    if (trackId === null) {
      return Err(
        DomainError.of("playback.no_current_track", "No track is loaded"),
      );
    }

    if (this.state.position.isEffectivelyComplete) {
      this.record(
        domainEvent(DomainEventName.TrackCompleted, {
          trackId,
          listenedSec: Math.round(this.state.position.seconds),
        }),
      );
    }

    if (this.state.sleepTimer.isUntilEndOfTrack) {
      this.state.status = PlaybackStatus.Paused;
      this.state.sleepTimer = SleepTimer.none();
      this.record(
        domainEvent(DomainEventName.SleepTimerExpired, { trackId }),
      );
      return Ok(undefined);
    }

    return this.skipNext();
  }

  skipNext(): Result<void> {
    if (this.state.queue.isEmpty) {
      return Err(
        DomainError.of("playback.empty_queue", "Queue is empty"),
      );
    }

    // Repeat One restarts the same track rather than advancing.
    if (this.state.repeat === RepeatMode.One) {
      this.state.position = PlaybackPosition.start(
        this.state.position.durationSeconds,
      );
      this.state.status = PlaybackStatus.Playing;
      this.record(
        domainEvent(DomainEventName.TrackStarted, {
          trackId: this.currentTrackId,
          positionSec: 0,
        }),
      );
      return Ok(undefined);
    }

    const next = this.state.queue.next(this.state.repeat);
    if (next === null) {
      this.state.status = PlaybackStatus.Ended;
      return Ok(undefined);
    }

    this.state.queue = next;
    this.state.position = PlaybackPosition.start();
    this.state.status = PlaybackStatus.Loading;
    this.record(
      domainEvent(DomainEventName.TrackStarted, {
        trackId: this.currentTrackId,
        positionSec: 0,
      }),
    );
    return Ok(undefined);
  }

  /**
   * Mirrors the near-universal player convention: past 3 seconds, "previous"
   * restarts the current track instead of stepping back.
   */
  skipPrevious(): Result<void> {
    if (this.state.queue.isEmpty) {
      return Err(DomainError.of("playback.empty_queue", "Queue is empty"));
    }

    if (this.state.position.seconds > 3) {
      this.state.position = PlaybackPosition.start(
        this.state.position.durationSeconds,
      );
      return Ok(undefined);
    }

    const previous = this.state.queue.previous(this.state.repeat);
    if (previous === null) {
      this.state.position = PlaybackPosition.start(
        this.state.position.durationSeconds,
      );
      return Ok(undefined);
    }

    this.state.queue = previous;
    this.state.position = PlaybackPosition.start();
    this.state.status = PlaybackStatus.Loading;
    this.record(
      domainEvent(DomainEventName.TrackStarted, {
        trackId: this.currentTrackId,
        positionSec: 0,
      }),
    );
    return Ok(undefined);
  }

  jumpTo(trackId: string): Result<void> {
    const queue = this.state.queue.jumpTo(trackId);
    if (!queue.ok) return queue;

    this.state.queue = queue.value;
    this.state.position = PlaybackPosition.start();
    this.state.status = PlaybackStatus.Loading;
    this.record(
      domainEvent(DomainEventName.TrackStarted, { trackId, positionSec: 0 }),
    );
    return Ok(undefined);
  }

  reorderQueue(from: number, to: number): Result<void> {
    const queue = this.state.queue.reorder(from, to);
    if (!queue.ok) return queue;

    this.state.queue = queue.value;
    this.record(domainEvent(DomainEventName.QueueReordered, { from, to }));
    return Ok(undefined);
  }

  removeFromQueue(trackId: string): Result<void> {
    const queue = this.state.queue.remove(trackId);
    if (!queue.ok) return queue;
    this.state.queue = queue.value;
    return Ok(undefined);
  }

  // ------------------------------------------------------------- settings

  setSpeed(value: number): Result<void> {
    const speed = PlaybackSpeed.create(value);
    if (!speed.ok) return speed;
    this.state.speed = speed.value;
    return Ok(undefined);
  }

  cycleSpeed(): void {
    this.state.speed = this.state.speed.next();
  }

  setRepeat(mode: RepeatMode): void {
    this.state.repeat = mode;
  }

  cycleRepeat(): void {
    const order: RepeatMode[] = [RepeatMode.Off, RepeatMode.All, RepeatMode.One];
    const index = order.indexOf(this.state.repeat);
    this.state.repeat = order[(index + 1) % order.length];
  }

  setShuffle(enabled: boolean, random?: () => number): void {
    this.state.queue = this.state.queue.withShuffle(enabled, random);
  }

  /**
   * Set both channel volumes. The ambient level is capped at
   * AMBIENT_GAIN_CEILING × quran level so the recitation always stays audible.
   */
  setVolumes(quranLevel: number, ambientLevel: number): void {
    const quran = Volume.create(quranLevel);
    const ceiling = quran.level * PlaybackSession.AMBIENT_GAIN_CEILING;
    this.state.quranVolume = quran;
    this.state.ambientVolume = Volume.create(Math.min(ambientLevel, ceiling));
  }

  setQuranVolume(level: number): void {
    this.setVolumes(level, this.state.ambientVolume.level);
  }

  setAmbientVolume(level: number): void {
    this.setVolumes(this.state.quranVolume.level, level);
  }

  setSleepTimer(timer: SleepTimer): void {
    this.state.sleepTimer = timer;
  }

  clearSleepTimer(): void {
    this.state.sleepTimer = SleepTimer.none();
  }

  /**
   * Drive the sleep timer from the application clock. Returns true when the
   * timer fired and playback was stopped.
   */
  tickSleepTimer(now: Date): boolean {
    if (!this.state.sleepTimer.isActive) return false;
    if (!this.state.sleepTimer.hasExpired(now)) return false;

    this.state.status = PlaybackStatus.Paused;
    this.state.sleepTimer = SleepTimer.none();
    this.record(
      domainEvent(DomainEventName.SleepTimerExpired, {
        trackId: this.currentTrackId,
      }),
    );
    return true;
  }
}
