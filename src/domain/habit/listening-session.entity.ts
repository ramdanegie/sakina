import { Entity } from "../shared/entity";
import { HabitTracker } from "./habit-tracker.service";
import { LocalDay } from "./value-objects";

/**
 * How the time was spent. Both count toward the daily goal — sitting with the
 * text is engaging with the Quran just as listening is, and a reader who only
 * reads should not see an empty streak.
 */
export const SessionKind = {
  Listening: "listening",
  Reading: "reading",
} as const;

export type SessionKind = (typeof SessionKind)[keyof typeof SessionKind];

export interface ListeningSessionProps {
  readonly id: string;
  readonly kind: SessionKind;
  /** Null for reading: there is no recording involved. */
  readonly trackId: string | null;
  readonly reciterId: string | null;
  readonly surahNumber: number;
  readonly ambientId: string | null;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  /**
   * Seconds of audio actually heard — accumulated from timeupdate ticks,
   * not derived from wall-clock, so pausing or backgrounding never inflates it.
   */
  readonly listenedSeconds: number;
  readonly day: LocalDay;
}

export class ListeningSession extends Entity<string> {
  private constructor(private props: ListeningSessionProps) {
    super(props.id);
  }

  static begin(params: {
    id: string;
    trackId: string;
    reciterId: string;
    surahNumber: number;
    ambientId: string | null;
    startedAt: Date;
  }): ListeningSession {
    return new ListeningSession({
      ...params,
      kind: SessionKind.Listening,
      endedAt: null,
      listenedSeconds: 0,
      day: LocalDay.fromDate(params.startedAt),
    });
  }

  /** A reading session — no reciter, no recording, no ambient bed. */
  static beginReading(params: {
    id: string;
    surahNumber: number;
    startedAt: Date;
  }): ListeningSession {
    return new ListeningSession({
      id: params.id,
      kind: SessionKind.Reading,
      trackId: null,
      reciterId: null,
      surahNumber: params.surahNumber,
      ambientId: null,
      startedAt: params.startedAt,
      endedAt: null,
      listenedSeconds: 0,
      day: LocalDay.fromDate(params.startedAt),
    });
  }

  static rehydrate(props: ListeningSessionProps): ListeningSession {
    return new ListeningSession(props);
  }

  get kind(): SessionKind {
    return this.props.kind;
  }

  get trackId(): string | null {
    return this.props.trackId;
  }

  get reciterId(): string | null {
    return this.props.reciterId;
  }

  get surahNumber(): number {
    return this.props.surahNumber;
  }

  get ambientId(): string | null {
    return this.props.ambientId;
  }

  get day(): LocalDay {
    return this.props.day;
  }

  get listenedSeconds(): number {
    return this.props.listenedSeconds;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get endedAt(): Date | null {
    return this.props.endedAt;
  }

  get isCountable(): boolean {
    return HabitTracker.isSessionCountable(this.props.listenedSeconds);
  }

  /** Add heard seconds. Negative deltas are ignored (clock skew, seeking back). */
  addListenedSeconds(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return;
    this.props = {
      ...this.props,
      listenedSeconds: this.props.listenedSeconds + delta,
    };
  }

  end(at: Date): void {
    if (this.props.endedAt !== null) return;
    this.props = { ...this.props, endedAt: at };
  }

  snapshot(): ListeningSessionProps {
    return this.props;
  }
}
