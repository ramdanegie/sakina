import {
  ListeningSession,
  SessionKind,
} from "@/domain/habit/listening-session.entity";
import { DailyGoal, LocalDay } from "@/domain/habit/value-objects";
import type { DailyTotal } from "@/domain/habit/habit-tracker.service";
import type {
  ListeningSessionRepository,
  UserPreferencesRepository,
} from "@/domain/repositories";
import { DomainError, Err, Ok, type Result } from "@/domain/shared/result";
import { getDb, type ListeningSessionRow } from "./db";

function toRow(session: ListeningSession): ListeningSessionRow {
  const snapshot = session.snapshot();
  return {
    id: snapshot.id,
    kind: snapshot.kind,
    trackId: snapshot.trackId,
    reciterId: snapshot.reciterId,
    surahNumber: snapshot.surahNumber,
    ambientId: snapshot.ambientId,
    day: snapshot.day.iso,
    listenedSeconds: Math.round(snapshot.listenedSeconds),
    startedAt: snapshot.startedAt.getTime(),
    endedAt: snapshot.endedAt?.getTime() ?? null,
  };
}

function toEntity(row: ListeningSessionRow): ListeningSession | null {
  const day = LocalDay.create(row.day);
  if (!day.ok) return null;

  return ListeningSession.rehydrate({
    id: row.id,
    // Rows written before reading was tracked have no kind.
    kind: (row.kind as SessionKind) ?? SessionKind.Listening,
    trackId: row.trackId,
    reciterId: row.reciterId,
    surahNumber: row.surahNumber,
    ambientId: row.ambientId,
    day: day.value,
    listenedSeconds: row.listenedSeconds,
    startedAt: new Date(row.startedAt),
    endedAt: row.endedAt === null ? null : new Date(row.endedAt),
  });
}

const unavailable = () =>
  Err(
    DomainError.of(
      "storage.unavailable",
      "IndexedDB is not available in this environment",
    ),
  );

export class DexieListeningSessionRepository
  implements ListeningSessionRepository
{
  async save(session: ListeningSession): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    try {
      await db.listeningSessions.put(toRow(session));
      return Ok(undefined);
    } catch (error) {
      return Err(
        DomainError.of("storage.write_failed", "Could not save session", {
          cause: String(error),
        }),
      );
    }
  }

  async findByDay(day: LocalDay): Promise<Result<ListeningSession[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.listeningSessions.where("day").equals(day.iso).toArray();
    return Ok(
      rows
        .map(toEntity)
        .filter((s): s is ListeningSession => s !== null),
    );
  }

  async dailyTotals(
    fromDay: LocalDay,
    toDay: LocalDay,
  ): Promise<Result<DailyTotal[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.listeningSessions
      .where("day")
      .between(fromDay.iso, toDay.iso, true, true)
      .toArray();

    return Ok(this.aggregate(rows));
  }

  async allDailyTotals(): Promise<Result<DailyTotal[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.listeningSessions.toArray();
    return Ok(this.aggregate(rows));
  }

  async topReciters(
    limit: number,
  ): Promise<Result<{ reciterId: string; seconds: number }[]>> {
    const db = getDb();
    if (db === null) return unavailable();

    const rows = await db.listeningSessions.toArray();
    const totals = new Map<string, number>();
    for (const row of rows) {
      // Reading rows carry no reciter.
      if (row.reciterId === null) continue;
      totals.set(
        row.reciterId,
        (totals.get(row.reciterId) ?? 0) + row.listenedSeconds,
      );
    }

    return Ok(
      [...totals.entries()]
        .map(([reciterId, seconds]) => ({ reciterId, seconds }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, limit),
    );
  }

  /** Collapse raw sessions into one total per calendar day. */
  private aggregate(rows: ListeningSessionRow[]): DailyTotal[] {
    const byDay = new Map<string, number>();
    for (const row of rows) {
      byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.listenedSeconds);
    }

    const totals: DailyTotal[] = [];
    for (const [iso, totalSeconds] of byDay) {
      const day = LocalDay.create(iso);
      if (day.ok) totals.push({ day: day.value, totalSeconds });
    }
    return totals.sort((a, b) => a.day.iso.localeCompare(b.day.iso));
  }
}

const DAILY_GOAL_KEY = "daily_goal_seconds";

export class DexieUserPreferencesRepository
  implements UserPreferencesRepository
{
  async getDailyGoal(): Promise<Result<DailyGoal>> {
    const db = getDb();
    if (db === null) return Ok(DailyGoal.default());

    const row = await db.preferences.get(DAILY_GOAL_KEY);
    if (row === undefined || typeof row.value !== "number") {
      return Ok(DailyGoal.default());
    }

    const goal = DailyGoal.create(row.value);
    // A corrupt stored value must not break the Insights screen.
    return goal.ok ? goal : Ok(DailyGoal.default());
  }

  async setDailyGoal(goal: DailyGoal): Promise<Result<void>> {
    const db = getDb();
    if (db === null) return unavailable();

    await db.preferences.put({ key: DAILY_GOAL_KEY, value: goal.seconds });
    return Ok(undefined);
  }
}
