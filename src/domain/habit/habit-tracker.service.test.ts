import { describe, expect, it } from "vitest";
import { HabitTracker, type DailyTotal } from "./habit-tracker.service";
import { DailyGoal, LocalDay } from "./value-objects";

const goal = DailyGoal.create(15 * 60);
if (!goal.ok) throw new Error("setup failed");
const GOAL = goal.value;

function day(iso: string): LocalDay {
  const result = LocalDay.create(iso);
  if (!result.ok) throw new Error(`bad day ${iso}`);
  return result.value;
}

function totals(entries: [string, number][]): DailyTotal[] {
  return entries.map(([iso, minutes]) => ({
    day: day(iso),
    totalSeconds: minutes * 60,
  }));
}

describe("LocalDay", () => {
  it("rejects a malformed date", () => {
    expect(LocalDay.create("2026-1-1").ok).toBe(false);
  });

  it("adds days across a month boundary", () => {
    expect(day("2026-01-31").addDays(1).iso).toBe("2026-02-01");
  });

  it("subtracts days across a year boundary", () => {
    expect(day("2026-01-01").addDays(-1).iso).toBe("2025-12-31");
  });

  it("counts whole days between dates", () => {
    expect(day("2026-03-01").daysUntil(day("2026-03-08"))).toBe(7);
  });

  it("maps Monday to index 0", () => {
    // 2026-01-05 is a Monday
    expect(day("2026-01-05").weekdayIndex).toBe(0);
    expect(day("2026-01-11").weekdayIndex).toBe(6); // Sunday
  });
});

describe("HabitTracker.isSessionCountable", () => {
  it("ignores sessions under a minute", () => {
    expect(HabitTracker.isSessionCountable(59)).toBe(false);
    expect(HabitTracker.isSessionCountable(60)).toBe(true);
  });
});

describe("HabitTracker.computeStreak", () => {
  it("returns zero with no history", () => {
    expect(HabitTracker.computeStreak([], GOAL, day("2026-03-10")).current).toBe(
      0,
    );
  });

  it("counts consecutive qualifying days up to today", () => {
    const history = totals([
      ["2026-03-08", 20],
      ["2026-03-09", 30],
      ["2026-03-10", 16],
    ]);
    const streak = HabitTracker.computeStreak(history, GOAL, day("2026-03-10"));
    expect(streak.current).toBe(3);
  });

  it("ignores days that fell short of the goal", () => {
    const history = totals([
      ["2026-03-08", 20],
      ["2026-03-09", 5], // short
      ["2026-03-10", 20],
    ]);
    const streak = HabitTracker.computeStreak(history, GOAL, day("2026-03-10"));
    expect(streak.current).toBe(1);
  });

  it("keeps the streak alive while today is still in progress", () => {
    // Yesterday met the goal; today has barely started. The streak must hold.
    const history = totals([
      ["2026-03-08", 20],
      ["2026-03-09", 20],
      ["2026-03-10", 2],
    ]);
    const streak = HabitTracker.computeStreak(history, GOAL, day("2026-03-10"));
    expect(streak.current).toBe(2);
  });

  it("breaks the streak after a full missed day", () => {
    const history = totals([
      ["2026-03-07", 20],
      ["2026-03-08", 20],
      // 2026-03-09 missed entirely
      ["2026-03-10", 3],
    ]);
    const streak = HabitTracker.computeStreak(history, GOAL, day("2026-03-10"));
    expect(streak.current).toBe(0);
  });

  it("reports the longest historical run", () => {
    const history = totals([
      ["2026-02-01", 20],
      ["2026-02-02", 20],
      ["2026-02-03", 20],
      ["2026-02-04", 20],
      // gap
      ["2026-03-09", 20],
      ["2026-03-10", 20],
    ]);
    const streak = HabitTracker.computeStreak(history, GOAL, day("2026-03-10"));
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(4);
  });

  it("never reports a longest shorter than the current run", () => {
    const history = totals([["2026-03-10", 20]]);
    const streak = HabitTracker.computeStreak(history, GOAL, day("2026-03-10"));
    expect(streak.longest).toBeGreaterThanOrEqual(streak.current);
  });
});

describe("HabitTracker.buildWeek", () => {
  it("always returns Monday..Sunday", () => {
    const week = HabitTracker.buildWeek([], GOAL, day("2026-03-11")); // Wednesday
    expect(week).toHaveLength(7);
    expect(week[0].day.iso).toBe("2026-03-09"); // Monday
    expect(week[6].day.iso).toBe("2026-03-15"); // Sunday
  });

  it("marks only the days that met the goal", () => {
    const history = totals([
      ["2026-03-09", 20],
      ["2026-03-10", 5],
    ]);
    const week = HabitTracker.buildWeek(history, GOAL, day("2026-03-11"));
    expect(week[0].goalReached).toBe(true);
    expect(week[1].goalReached).toBe(false);
  });
});

describe("HabitTracker.summarise", () => {
  it("aggregates today, the week and all-time totals", () => {
    const history = totals([
      ["2026-03-09", 20],
      ["2026-03-10", 30],
      ["2026-01-01", 40], // outside the current week
    ]);
    const summary = HabitTracker.summarise(history, GOAL, day("2026-03-10"));

    expect(summary.todaySeconds).toBe(30 * 60);
    expect(summary.weekSeconds).toBe(50 * 60);
    expect(summary.allTimeSeconds).toBe(90 * 60);
    expect(summary.goalReachedToday).toBe(true);
    expect(summary.streak.current).toBe(2);
  });
});

describe("DailyGoal", () => {
  it("rejects a goal below the minimum", () => {
    expect(DailyGoal.create(30).ok).toBe(false);
  });

  it("rejects a goal above the maximum", () => {
    expect(DailyGoal.create(601 * 60).ok).toBe(false);
  });

  it("defaults to 15 minutes", () => {
    expect(DailyGoal.default().minutes).toBe(15);
  });
});
