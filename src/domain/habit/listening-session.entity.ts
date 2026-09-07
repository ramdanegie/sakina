import { Entity } from "../shared/entity";
import { HabitTracker } from "./habit-tracker.service";
import { LocalDay } from "./value-objects";

export interface ListeningSessionProps {
  readonly id: string;
  readonly trackId: string;
  readonly reciterId: string;
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
      endedAt: null,
      listenedSeconds: 0,
      day: LocalDay.fromDate(params.startedAt),
    });
  }

  static rehydrate(props: ListeningSessionProps): ListeningSession {
    return new ListeningSession(props);
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
