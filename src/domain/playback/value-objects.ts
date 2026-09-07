import { Err, Ok, DomainError, type Result } from "../shared/result";
import { clamp, ValueObject } from "../shared/value-object";

export const PlaybackStatus = {
  Idle: "idle",
  Loading: "loading",
  Playing: "playing",
  Paused: "paused",
  Ended: "ended",
} as const;

export type PlaybackStatus =
  (typeof PlaybackStatus)[keyof typeof PlaybackStatus];

export const RepeatMode = {
  Off: "off",
  All: "all",
  One: "one",
} as const;

export type RepeatMode = (typeof RepeatMode)[keyof typeof RepeatMode];

/** The exact speeds offered by the player UI. Anything else is rejected. */
export const ALLOWED_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;

export type AllowedSpeed = (typeof ALLOWED_SPEEDS)[number];

export class PlaybackSpeed extends ValueObject<{ value: AllowedSpeed }> {
  static create(value: number): Result<PlaybackSpeed> {
    const match = ALLOWED_SPEEDS.find((s) => Math.abs(s - value) < 1e-9);
    if (match === undefined) {
      return Err(
        DomainError.of(
          "playback_speed.unsupported",
          `Speed must be one of ${ALLOWED_SPEEDS.join(", ")}`,
          { value },
        ),
      );
    }
    return Ok(new PlaybackSpeed({ value: match }));
  }

  static normal(): PlaybackSpeed {
    return new PlaybackSpeed({ value: 1.0 });
  }

  get value(): AllowedSpeed {
    return this.props.value;
  }

  /** "1x" / "1.5x" — the label rendered on the left of the transport row. */
  get label(): string {
    return `${this.props.value}x`;
  }

  next(): PlaybackSpeed {
    const index = ALLOWED_SPEEDS.indexOf(this.props.value);
    const nextIndex = (index + 1) % ALLOWED_SPEEDS.length;
    return new PlaybackSpeed({ value: ALLOWED_SPEEDS[nextIndex] });
  }
}

/**
 * Position within a track. Always clamped to [0, duration] so a stale
 * resume position from storage can never seek past the end.
 */
export class PlaybackPosition extends ValueObject<{
  seconds: number;
  durationSeconds: number;
}> {
  static create(
    seconds: number,
    durationSeconds: number,
  ): Result<PlaybackPosition> {
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return Err(
        DomainError.of(
          "playback_position.invalid_duration",
          "Duration must be a finite number >= 0",
          { durationSeconds },
        ),
      );
    }
    const safe = Number.isFinite(seconds) ? seconds : 0;
    return Ok(
      new PlaybackPosition({
        seconds: clamp(safe, 0, durationSeconds),
        durationSeconds,
      }),
    );
  }

  static start(durationSeconds = 0): PlaybackPosition {
    return new PlaybackPosition({ seconds: 0, durationSeconds });
  }

  get seconds(): number {
    return this.props.seconds;
  }

  get durationSeconds(): number {
    return this.props.durationSeconds;
  }

  get remainingSeconds(): number {
    return Math.max(0, this.props.durationSeconds - this.props.seconds);
  }

  /** 0..1. Zero-duration tracks report 0 rather than NaN. */
  get ratio(): number {
    if (this.props.durationSeconds <= 0) return 0;
    return clamp(this.props.seconds / this.props.durationSeconds, 0, 1);
  }

  /**
   * A track counts as "completed" for habit tracking only past 90%.
   * Skipping early must not inflate the streak.
   */
  get isEffectivelyComplete(): boolean {
    return this.props.durationSeconds > 0 && this.ratio >= 0.9;
  }
}

/** A 0..1 gain level for one audio channel. */
export class Volume extends ValueObject<{ level: number }> {
  static create(level: number): Volume {
    return new Volume({ level: clamp(level, 0, 1) });
  }

  static max(): Volume {
    return new Volume({ level: 1 });
  }

  static muted(): Volume {
    return new Volume({ level: 0 });
  }

  get level(): number {
    return this.props.level;
  }

  get isMuted(): boolean {
    return this.props.level === 0;
  }

  get percent(): number {
    return Math.round(this.props.level * 100);
  }
}

/** Sleep timer. `untilEndOfTrack` maps to the "end of this surah" option. */
export class SleepTimer extends ValueObject<{
  expiresAt: Date | null;
  untilEndOfTrack: boolean;
}> {
  static readonly PRESET_MINUTES = [5, 10, 15, 30, 45, 60] as const;
  /** Volume ramps to silence over the final 20s instead of cutting abruptly. */
  static readonly FADE_OUT_SECONDS = 20;

  static none(): SleepTimer {
    return new SleepTimer({ expiresAt: null, untilEndOfTrack: false });
  }

  static inMinutes(minutes: number, now: Date): Result<SleepTimer> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return Err(
        DomainError.of(
          "sleep_timer.invalid_duration",
          "Sleep timer must be a positive number of minutes",
          { minutes },
        ),
      );
    }
    return Ok(
      new SleepTimer({
        expiresAt: new Date(now.getTime() + minutes * 60_000),
        untilEndOfTrack: false,
      }),
    );
  }

  static untilEndOfTrack(): SleepTimer {
    return new SleepTimer({ expiresAt: null, untilEndOfTrack: true });
  }

  get isActive(): boolean {
    return this.props.expiresAt !== null || this.props.untilEndOfTrack;
  }

  get isUntilEndOfTrack(): boolean {
    return this.props.untilEndOfTrack;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  hasExpired(now: Date): boolean {
    if (this.props.expiresAt === null) return false;
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  remainingSeconds(now: Date): number {
    if (this.props.expiresAt === null) return 0;
    return Math.max(
      0,
      Math.round((this.props.expiresAt.getTime() - now.getTime()) / 1000),
    );
  }

  /** True inside the fade window, so the engine can ramp the master gain. */
  isFading(now: Date): boolean {
    if (this.props.expiresAt === null) return false;
    const remaining = this.remainingSeconds(now);
    return remaining > 0 && remaining <= SleepTimer.FADE_OUT_SECONDS;
  }
}
