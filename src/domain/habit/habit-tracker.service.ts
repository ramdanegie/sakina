import { DailyGoal, LocalDay, Streak } from "./value-objects";

/** One calendar day's listening total. */
export interface DailyTotal {
  readonly day: LocalDay;
  readonly totalSeconds: number;
}

export interface WeekdayCell {
  readonly day: LocalDay;
  readonly weekdayIndex: number;
  readonly totalSeconds: number;
  readonly goalReached: boolean;
}

export interface InsightsSummary {
  readonly streak: Streak;
  readonly todaySeconds: number;
  readonly weekSeconds: number;
  readonly goal: DailyGoal;
  readonly goalReachedToday: boolean;
  readonly week: readonly WeekdayCell[];
  readonly allTimeSeconds: number;
}

/**
 * Pure domain service for listening habits. No storage, no clock of its own —
 * everything it needs is passed in, which makes streak behaviour exhaustively
 * testable without mocking time.
 */
export const HabitTracker = {
  /** A session only counts once it passes this floor. */
  MIN_SESSION_SECONDS: 60,

  isSessionCountable(durationSeconds: number): boolean {
    return durationSeconds >= HabitTracker.MIN_SESSION_SECONDS;
  },

  /**
   * Recompute the streak from scratch.
   *
   * Today not yet meeting the goal does NOT break the streak — the day is
   * still in progress. The streak only breaks once a full day has passed
   * without the goal being met.
   */
  computeStreak(
    totals: readonly DailyTotal[],
    goal: DailyGoal,
    today: LocalDay,
  ): Streak {
    const qualifying = new Set(
      totals
        .filter((t) => goal.isMetBy(t.totalSeconds))
        .map((t) => t.day.iso),
    );

    if (qualifying.size === 0) return Streak.none();

    // Walk backwards from today (or yesterday, if today is still in progress).
    let cursor = qualifying.has(today.iso) ? today : today.addDays(-1);
    let current = 0;
    while (qualifying.has(cursor.iso)) {
      current += 1;
      cursor = cursor.addDays(-1);
    }

    // Longest run anywhere in history.
    const sorted = [...qualifying].sort();
    let longest = 0;
    let run = 0;
    let previous: LocalDay | null = null;

    for (const iso of sorted) {
      const parsed = LocalDay.create(iso);
      if (!parsed.ok) continue;
      const day = parsed.value;

      run = previous !== null && previous.daysUntil(day) === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
      previous = day;
    }

    return Streak.create(current, longest);
  },

  /** The Mon–Sun row shown on the Insights screen. */
  buildWeek(
    totals: readonly DailyTotal[],
    goal: DailyGoal,
    today: LocalDay,
  ): WeekdayCell[] {
    const byDay = new Map(totals.map((t) => [t.day.iso, t.totalSeconds]));
    const monday = today.addDays(-today.weekdayIndex);

    return Array.from({ length: 7 }, (_, offset) => {
      const day = monday.addDays(offset);
      const totalSeconds = byDay.get(day.iso) ?? 0;
      return {
        day,
        weekdayIndex: offset,
        totalSeconds,
        goalReached: goal.isMetBy(totalSeconds),
      };
    });
  },

  summarise(
    totals: readonly DailyTotal[],
    goal: DailyGoal,
    today: LocalDay,
  ): InsightsSummary {
    const week = HabitTracker.buildWeek(totals, goal, today);
    const todaySeconds =
      totals.find((t) => t.day.iso === today.iso)?.totalSeconds ?? 0;

    return {
      streak: HabitTracker.computeStreak(totals, goal, today),
      todaySeconds,
      weekSeconds: week.reduce((sum, cell) => sum + cell.totalSeconds, 0),
      goal,
      goalReachedToday: goal.isMetBy(todaySeconds),
      week,
      allTimeSeconds: totals.reduce((sum, t) => sum + t.totalSeconds, 0),
    };
  },
};
