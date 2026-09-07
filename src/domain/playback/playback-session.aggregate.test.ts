import { beforeEach, describe, expect, it } from "vitest";
import { DomainEventName } from "../shared/domain-event";
import { PlaybackSession } from "./playback-session.aggregate";
import { PlaybackStatus, RepeatMode, SleepTimer } from "./value-objects";

const tracks = ["t1", "t2", "t3"];

function loadedSession(startIndex = 0): PlaybackSession {
  const session = PlaybackSession.start("s1");
  const loaded = session.loadQueue(tracks, startIndex);
  if (!loaded.ok) throw new Error("setup failed");
  return session;
}

describe("PlaybackSession invariants", () => {
  it("refuses to play with an empty queue", () => {
    const session = PlaybackSession.start("s1");
    const result = session.play();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("playback.nothing_to_play");
    expect(session.status).toBe(PlaybackStatus.Idle);
  });

  it("emits TrackStarted when playback begins", () => {
    const session = loadedSession();
    expect(session.play(120).ok).toBe(true);
    expect(session.status).toBe(PlaybackStatus.Playing);

    const events = session.pullEvents();
    expect(events.map((e) => e.name)).toContain(DomainEventName.TrackStarted);
    expect(session.pullEvents()).toHaveLength(0); // drained
  });

  it("refuses to pause when not playing", () => {
    const session = loadedSession();
    const result = session.pause();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("playback.not_playing");
  });

  it("clamps a seek past the end of the track", () => {
    const session = loadedSession();
    session.play(100);
    expect(session.seekTo(500).ok).toBe(true);
    expect(session.position.seconds).toBe(100);
  });

  it("clamps a negative seek to zero", () => {
    const session = loadedSession();
    session.play(100);
    session.seekTo(-50);
    expect(session.position.seconds).toBe(0);
  });
});

describe("PlaybackSession completion threshold", () => {
  let session: PlaybackSession;

  beforeEach(() => {
    session = loadedSession();
    session.play(100);
    session.pullEvents();
  });

  it("does not emit TrackCompleted when skipped early", () => {
    session.reportProgress(40, 100); // 40%
    session.completeCurrentTrack();

    const names = session.pullEvents().map((e) => e.name);
    expect(names).not.toContain(DomainEventName.TrackCompleted);
  });

  it("emits TrackCompleted past 90%", () => {
    session.reportProgress(95, 100);
    session.completeCurrentTrack();

    const names = session.pullEvents().map((e) => e.name);
    expect(names).toContain(DomainEventName.TrackCompleted);
  });

  it("advances to the next track on completion", () => {
    session.reportProgress(100, 100);
    session.completeCurrentTrack();
    expect(session.currentTrackId).toBe("t2");
  });
});

describe("PlaybackSession skipping", () => {
  it("restarts the current track when repeat is one", () => {
    const session = loadedSession();
    session.play(100);
    session.reportProgress(50, 100);

    session.setRepeat(RepeatMode.One);
    session.skipNext();

    expect(session.currentTrackId).toBe("t1");
    expect(session.position.seconds).toBe(0);
  });

  it("ends the session past the last track when repeat is off", () => {
    const session = loadedSession(2);
    session.play(100);
    session.skipNext();
    expect(session.status).toBe(PlaybackStatus.Ended);
  });

  it("restarts the track when skipping back after 3 seconds", () => {
    const session = loadedSession(1);
    session.play(100);
    session.reportProgress(10, 100);

    session.skipPrevious();
    expect(session.currentTrackId).toBe("t2");
    expect(session.position.seconds).toBe(0);
  });

  it("steps to the previous track when skipping back within 3 seconds", () => {
    const session = loadedSession(1);
    session.play(100);
    session.reportProgress(2, 100);

    session.skipPrevious();
    expect(session.currentTrackId).toBe("t1");
  });
});

describe("PlaybackSession volume ceiling", () => {
  it("caps ambient volume relative to the recitation volume", () => {
    const session = loadedSession();
    session.setVolumes(0.5, 1.0);

    // ceiling = 0.5 * 0.8 = 0.4
    expect(session.ambientVolume.level).toBeCloseTo(0.4, 5);
  });

  it("keeps ambient below the ceiling when it already is", () => {
    const session = loadedSession();
    session.setVolumes(1.0, 0.3);
    expect(session.ambientVolume.level).toBeCloseTo(0.3, 5);
  });

  it("re-applies the ceiling when the recitation volume drops", () => {
    const session = loadedSession();
    session.setVolumes(1.0, 0.8);
    session.setQuranVolume(0.5);
    expect(session.ambientVolume.level).toBeLessThanOrEqual(0.4);
  });
});

describe("PlaybackSession sleep timer", () => {
  it("stops playback once the timer expires", () => {
    const now = new Date("2026-01-01T20:00:00");
    const session = loadedSession();
    session.play(600);

    const timer = SleepTimer.inMinutes(30, now);
    if (!timer.ok) throw new Error("setup failed");
    session.setSleepTimer(timer.value);

    expect(session.tickSleepTimer(new Date("2026-01-01T20:15:00"))).toBe(false);
    expect(session.isPlaying).toBe(true);

    expect(session.tickSleepTimer(new Date("2026-01-01T20:31:00"))).toBe(true);
    expect(session.status).toBe(PlaybackStatus.Paused);
  });

  it("pauses at the end of the track in end-of-track mode", () => {
    const session = loadedSession();
    session.play(100);
    session.setSleepTimer(SleepTimer.untilEndOfTrack());
    session.reportProgress(100, 100);
    session.pullEvents();

    session.completeCurrentTrack();

    expect(session.status).toBe(PlaybackStatus.Paused);
    expect(session.currentTrackId).toBe("t1"); // did not advance
    expect(session.pullEvents().map((e) => e.name)).toContain(
      DomainEventName.SleepTimerExpired,
    );
  });

  it("reports the fade window in the final 20 seconds", () => {
    const now = new Date("2026-01-01T20:00:00");
    const timer = SleepTimer.inMinutes(1, now);
    if (!timer.ok) throw new Error("setup failed");

    expect(timer.value.isFading(new Date("2026-01-01T20:00:30"))).toBe(false);
    expect(timer.value.isFading(new Date("2026-01-01T20:00:45"))).toBe(true);
  });
});

describe("PlaybackSession speed", () => {
  it("rejects a speed outside the allowed set", () => {
    const session = loadedSession();
    const result = session.setSpeed(3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("playback_speed.unsupported");
  });

  it("cycles through the allowed speeds and wraps", () => {
    const session = loadedSession();
    session.setSpeed(2.0);
    session.cycleSpeed();
    expect(session.speed.value).toBe(0.5);
  });
});
