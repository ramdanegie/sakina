import { HabitTracker } from "@/domain/habit/habit-tracker.service";
import { ListeningSession } from "@/domain/habit/listening-session.entity";
import { DailyGoal, LocalDay } from "@/domain/habit/value-objects";
import type {
  ListeningSessionRepository,
  UserPreferencesRepository,
} from "@/domain/repositories";
import { Ok, type Result } from "@/domain/shared/result";
import type { ClockPort, IdGeneratorPort } from "../ports";
import type { InsightsDto } from "../dto";
import { toInsightsDto } from "../mappers";

/**
 * Accumulates listening time and turns it into streaks.
 *
 * Heard seconds come from timeupdate deltas rather than wall-clock, so
 * pausing, seeking or backgrounding the tab never inflates the total. The
 * session is only persisted once it passes the one-minute floor.
 */
export class RecordListeningProgress {
  private active: ListeningSession | null = null;

  constructor(
    private readonly sessions: ListeningSessionRepository,
    private readonly preferences: UserPreferencesRepository,
    private readonly clock: ClockPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  /** Begin (or switch to) a session for the given track. */
  beginTrack(params: {
    trackId: string;
    reciterId: string;
    surahNumber: number;
    ambientId: string | null;
  }): void {
    if (this.active?.trackId === params.trackId) return;

    void this.flush();

    this.active = ListeningSession.begin({
      id: this.ids.next(),
      trackId: params.trackId,
      reciterId: params.reciterId,
      surahNumber: params.surahNumber,
      ambientId: params.ambientId,
      startedAt: this.clock.now(),
    });
  }

  /**
   * Begin (or switch to) a reading session for a surah.
   *
   * Reading is a separate session kind but feeds the same daily totals: time
   * spent with the text counts toward the goal exactly as listening does. A
   * reader who never presses play should still see a streak.
   */
  beginReading(surahNumber: number): void {
    if (
      this.active?.kind === "reading" &&
      this.active.surahNumber === surahNumber
    ) {
      return;
    }

    void this.flush();

    this.active = ListeningSession.beginReading({
      id: this.ids.next(),
      surahNumber,
      startedAt: this.clock.now(),
    });
  }

  /** Add heard seconds. Called on every timeupdate tick. */
  addSeconds(delta: number): void {
    this.active?.addListenedSeconds(delta);
  }

  /**
   * Save the session so far WITHOUT closing it.
   *
   * Called on a timer and when the page is hidden. `flush` cannot serve this
   * purpose: it clears the active session, so using it mid-listen would stop
   * time accumulating from that moment on. Saving is an upsert keyed by the
   * session id, so repeated checkpoints just update the same row.
   */
  async checkpoint(): Promise<Result<void>> {
    const session = this.active;
    if (session === null) return Ok(undefined);
    if (!session.isCountable) return Ok(undefined);

    return this.sessions.save(session);
  }

  /** Persist the active session and close it. */
  async flush(): Promise<Result<void>> {
    const session = this.active;
    if (session === null) return Ok(undefined);
    if (!session.isCountable) return Ok(undefined);

    session.end(this.clock.now());
    const saved = await this.sessions.save(session);
    this.active = null;
    return saved;
  }

  async endSession(): Promise<Result<void>> {
    const result = await this.flush();
    this.active = null;
    return result;
  }

  async getInsights(): Promise<Result<InsightsDto>> {
    const goal = await this.preferences.getDailyGoal();
    if (!goal.ok) return goal;

    const totals = await this.sessions.allDailyTotals();
    if (!totals.ok) return totals;

    const today = LocalDay.fromDate(this.clock.now());
    return Ok(
      toInsightsDto(HabitTracker.summarise(totals.value, goal.value, today)),
    );
  }

  async setDailyGoalMinutes(minutes: number): Promise<Result<void>> {
    const goal = DailyGoal.create(minutes * 60);
    if (!goal.ok) return goal;
    return this.preferences.setDailyGoal(goal.value);
  }
}
