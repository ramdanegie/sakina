import { describe, expect, it } from "vitest";
import { ListeningSession } from "./listening-session.entity";
import { Streak } from "./value-objects";

const STARTED = new Date("2026-03-10T21:00:00");

function newSession(): ListeningSession {
  return ListeningSession.begin({
    id: "s1",
    trackId: "r1:096",
    reciterId: "r1",
    surahNumber: 96,
    ambientId: "rain",
    startedAt: STARTED,
  });
}

describe("ListeningSession", () => {
  it("derives the local day from the start time", () => {
    expect(newSession().day.iso).toBe("2026-03-10");
  });

  it("exposes its metadata", () => {
    const session = newSession();
    expect(session.trackId).toBe("r1:096");
    expect(session.reciterId).toBe("r1");
    expect(session.surahNumber).toBe(96);
    expect(session.ambientId).toBe("rain");
    expect(session.startedAt).toBe(STARTED);
    expect(session.endedAt).toBeNull();
  });

  it("accumulates heard seconds", () => {
    const session = newSession();
    session.addListenedSeconds(30);
    session.addListenedSeconds(45);
    expect(session.listenedSeconds).toBe(75);
  });

  it("ignores negative and non-finite deltas from clock skew or seeking back", () => {
    const session = newSession();
    session.addListenedSeconds(30);
    session.addListenedSeconds(-10);
    session.addListenedSeconds(Number.NaN);
    expect(session.listenedSeconds).toBe(30);
  });

  it("only counts once past the one-minute floor", () => {
    const session = newSession();
    session.addListenedSeconds(59);
    expect(session.isCountable).toBe(false);

    session.addListenedSeconds(1);
    expect(session.isCountable).toBe(true);
  });

  it("records an end time once and ignores repeats", () => {
    const session = newSession();
    const first = new Date("2026-03-10T21:30:00");
    session.end(first);
    session.end(new Date("2026-03-10T22:00:00"));
    expect(session.endedAt).toBe(first);
  });

  it("round-trips through a snapshot", () => {
    const session = newSession();
    session.addListenedSeconds(120);
    const restored = ListeningSession.rehydrate(session.snapshot());
    expect(restored.listenedSeconds).toBe(120);
    expect(restored.id).toBe("s1");
  });
});

describe("Streak", () => {
  it("floors negative input at zero", () => {
    expect(Streak.create(-5, -2).current).toBe(0);
  });

  it("never reports a longest below the current run", () => {
    const streak = Streak.create(10, 3);
    expect(streak.longest).toBe(10);
  });

  it("has a zero constructor", () => {
    expect(Streak.none().current).toBe(0);
    expect(Streak.none().longest).toBe(0);
  });
});
