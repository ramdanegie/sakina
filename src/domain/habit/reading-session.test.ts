import { describe, expect, it } from "vitest";
import { ListeningSession, SessionKind } from "./listening-session.entity";

const STARTED = new Date("2026-03-10T21:00:00");

describe("reading sessions", () => {
  const session = ListeningSession.beginReading({
    id: "r1",
    surahNumber: 67,
    startedAt: STARTED,
  });

  it("is marked as reading, not listening", () => {
    expect(session.kind).toBe(SessionKind.Reading);
  });

  it("carries no reciter or track", () => {
    expect(session.reciterId).toBeNull();
    expect(session.trackId).toBeNull();
    expect(session.ambientId).toBeNull();
  });

  it("still records the surah and local day", () => {
    expect(session.surahNumber).toBe(67);
    expect(session.day.iso).toBe("2026-03-10");
  });

  it("accumulates time and counts toward the goal like listening", () => {
    session.addListenedSeconds(59);
    expect(session.isCountable).toBe(false);

    session.addListenedSeconds(1);
    expect(session.isCountable).toBe(true);
  });

  it("round-trips through a snapshot with its kind intact", () => {
    const restored = ListeningSession.rehydrate(session.snapshot());
    expect(restored.kind).toBe(SessionKind.Reading);
    expect(restored.reciterId).toBeNull();
  });
});

describe("listening sessions still carry their reciter", () => {
  it("is marked as listening", () => {
    const s = ListeningSession.begin({
      id: "l1",
      trackId: "r1:067",
      reciterId: "r1",
      surahNumber: 67,
      ambientId: "rain",
      startedAt: STARTED,
    });

    expect(s.kind).toBe(SessionKind.Listening);
    expect(s.reciterId).toBe("r1");
    expect(s.trackId).toBe("r1:067");
  });
});
