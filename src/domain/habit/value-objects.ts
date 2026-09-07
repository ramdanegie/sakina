import { Err, Ok, DomainError, type Result } from "../shared/result";
import { ValueObject } from "../shared/value-object";

/**
 * A calendar day in the listener's own timezone, held as "YYYY-MM-DD".
 *
 * Streaks are a human, local-calendar concept: someone listening at 23:50
 * and again at 00:10 has listened on two days. Storing UTC instants and
 * bucketing them later is what makes streak counters drift across timezones,
 * so the day is resolved once, at the edge, and stored as a plain local date.
 */
export class LocalDay extends ValueObject<{ iso: string }> {
  private static readonly PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  static create(iso: string): Result<LocalDay> {
    if (!LocalDay.PATTERN.test(iso)) {
      return Err(
        DomainError.of("local_day.malformed", "Day must be YYYY-MM-DD", { iso }),
      );
    }
    return Ok(new LocalDay({ iso }));
  }

  /** Derive the local calendar day from a Date using its local components. */
  static fromDate(date: Date): LocalDay {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return new LocalDay({ iso: `${year}-${month}-${day}` });
  }

  get iso(): string {
    return this.props.iso;
  }

  /** Midday anchor avoids DST edges shifting the day by one. */
  private toUtcNoon(): number {
    const [y, m, d] = this.props.iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d, 12, 0, 0);
  }

  addDays(days: number): LocalDay {
    const shifted = new Date(this.toUtcNoon() + days * 86_400_000);
    const year = shifted.getUTCFullYear();
    const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
    const day = String(shifted.getUTCDate()).padStart(2, "0");
    return new LocalDay({ iso: `${year}-${month}-${day}` });
  }

  /** Whole days between two calendar days; negative when `other` is earlier. */
  daysUntil(other: LocalDay): number {
    return Math.round((other.toUtcNoon() - this.toUtcNoon()) / 86_400_000);
  }

  /** 0 = Monday .. 6 = Sunday, matching the Mon–Sun row in the Insights UI. */
  get weekdayIndex(): number {
    const jsDay = new Date(this.toUtcNoon()).getUTCDay(); // 0 = Sunday
    return (jsDay + 6) % 7;
  }

  isBefore(other: LocalDay): boolean {
    return this.props.iso < other.props.iso;
  }
}

/** Daily listening target, stored in seconds. */
export class DailyGoal extends ValueObject<{ seconds: number }> {
  static readonly DEFAULT_MINUTES = 15;
  static readonly MIN_MINUTES = 1;
  static readonly MAX_MINUTES = 600;

  static create(seconds: number): Result<DailyGoal> {
    const minutes = seconds / 60;
    if (
      !Number.isFinite(seconds) ||
      minutes < DailyGoal.MIN_MINUTES ||
      minutes > DailyGoal.MAX_MINUTES
    ) {
      return Err(
        DomainError.of(
          "daily_goal.out_of_range",
          `Daily goal must be between ${DailyGoal.MIN_MINUTES} and ${DailyGoal.MAX_MINUTES} minutes`,
          { seconds },
        ),
      );
    }
    return Ok(new DailyGoal({ seconds: Math.round(seconds) }));
  }

  static default(): DailyGoal {
    return new DailyGoal({ seconds: DailyGoal.DEFAULT_MINUTES * 60 });
  }

  get seconds(): number {
    return this.props.seconds;
  }

  get minutes(): number {
    return Math.round(this.props.seconds / 60);
  }

  isMetBy(listenedSeconds: number): boolean {
    return listenedSeconds >= this.props.seconds;
  }
}

/** Result of recomputing the streak from the full history. */
export class Streak extends ValueObject<{ current: number; longest: number }> {
  static create(current: number, longest: number): Streak {
    const safeCurrent = Math.max(0, Math.floor(current));
    return new Streak({
      current: safeCurrent,
      longest: Math.max(safeCurrent, Math.max(0, Math.floor(longest))),
    });
  }

  static none(): Streak {
    return new Streak({ current: 0, longest: 0 });
  }

  get current(): number {
    return this.props.current;
  }

  get longest(): number {
    return this.props.longest;
  }
}
