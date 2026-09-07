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

  /** Add heard seconds. Called on every timeupdate tick. */
  addSeconds(delta: number): void {
    this.active?.addListenedSeconds(delta);
  }

  /** Persist the active session if it is long enough to count. */
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
