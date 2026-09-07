import { describe, expect, it } from "vitest";
import { PlaybackSession } from "./playback-session.aggregate";
import { Queue } from "./queue.entity";
import { PlaybackStatus, RepeatMode, SleepTimer } from "./value-objects";

const tracks = ["t1", "t2", "t3"];

function loadedSession(startIndex = 0): PlaybackSession {
  const session = PlaybackSession.start("s1");
  const loaded = session.loadQueue(tracks, startIndex);
  if (!loaded.ok) throw new Error("setup failed");
  return session;
}

describe("PlaybackSession defaults", () => {
  it("starts idle with sane defaults", () => {
    const session = PlaybackSession.start("s1");

    expect(session.status).toBe(PlaybackStatus.Idle);
    expect(session.queue.isEmpty).toBe(true);
    expect(session.currentTrackId).toBeNull();
    expect(session.isPlaying).toBe(false);
    expect(session.speed.value).toBe(1);
    expect(session.repeat).toBe(RepeatMode.Off);
    expect(session.quranVolume.level).toBe(1);
    expect(session.ambientVolume.level).toBeCloseTo(
      PlaybackSession.DEFAULT_AMBIENT_LEVEL,
      5,
    );
    expect(session.sleepTimer.isActive).toBe(false);
    expect(session.position.seconds).toBe(0);
  });

  it("rejects loading an empty queue", () => {
    const session = PlaybackSession.start("s1");
    expect(session.loadQueue([]).ok).toBe(false);
  });

  it("enters loading state once a queue is set", () => {
    const session = loadedSession();
    expect(session.status).toBe(PlaybackStatus.Loading);
    expect(session.currentTrackId).toBe("t1");
  });
});

describe("PlaybackSession resume", () => {
  it("resumes from the paused position", () => {
    const session = loadedSession();
    session.play(100);
    session.reportProgress(42, 100);
    session.pause();

    expect(session.resume().ok).toBe(true);
    expect(session.isPlaying).toBe(true);
    expect(session.position.seconds).toBe(42);
  });

  it("is a no-op when already playing", () => {
    const session = loadedSession();
    session.play(100);
    expect(session.resume().ok).toBe(true);
    expect(session.isPlaying).toBe(true);
  });

  it("rejects progress reports with an invalid duration", () => {
    const session = loadedSession();
    expect(session.reportProgress(10, -5).ok).toBe(false);
  });
});

describe("PlaybackSession queue operations", () => {
  it("jumps to a track in the queue", () => {
    const session = loadedSession();
    expect(session.jumpTo("t3").ok).toBe(true);
    expect(session.currentTrackId).toBe("t3");
    expect(session.position.seconds).toBe(0);
  });

  it("rejects jumping to a track outside the queue", () => {
    const session = loadedSession();
    const result = session.jumpTo("nope");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("queue.track_not_found");
  });

  it("reorders the queue", () => {
    const session = loadedSession();
    expect(session.reorderQueue(0, 2).ok).toBe(true);
    expect(session.queue.items).toEqual(["t2", "t3", "t1"]);
    expect(session.currentTrackId).toBe("t1");
  });

  it("rejects an out-of-range reorder", () => {
    expect(loadedSession().reorderQueue(0, 99).ok).toBe(false);
  });

  it("removes a track from the queue", () => {
    const session = loadedSession();
    expect(session.removeFromQueue("t3").ok).toBe(true);
    expect(session.queue.items).toEqual(["t1", "t2"]);
  });

  it("rejects removing a track that is not queued", () => {
    expect(loadedSession().removeFromQueue("nope").ok).toBe(false);
  });

  it("rejects skipping with an empty queue", () => {
    const session = PlaybackSession.start("s1");
    expect(session.skipNext().ok).toBe(false);
    expect(session.skipPrevious().ok).toBe(false);
  });

  it("rejects completing when no track is loaded", () => {
    const session = PlaybackSession.start("s1");
    const result = session.completeCurrentTrack();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("playback.no_current_track");
  });

  it("stays on the first track when skipping back at the head", () => {
    const session = loadedSession(0);
    session.play(100);
    session.reportProgress(1, 100);

    expect(session.skipPrevious().ok).toBe(true);
    expect(session.currentTrackId).toBe("t1");
    expect(session.position.seconds).toBe(0);
  });
});

describe("PlaybackSession modes", () => {
  it("cycles repeat off -> all -> one -> off", () => {
    const session = loadedSession();
    session.cycleRepeat();
    expect(session.repeat).toBe(RepeatMode.All);
    session.cycleRepeat();
    expect(session.repeat).toBe(RepeatMode.One);
    session.cycleRepeat();
    expect(session.repeat).toBe(RepeatMode.Off);
  });

  it("toggles shuffle on the queue", () => {
    const session = loadedSession();
    session.setShuffle(true, () => 0.5);
    expect(session.queue.isShuffled).toBe(true);

    session.setShuffle(false);
    expect(session.queue.isShuffled).toBe(false);
  });

  it("accepts a valid explicit speed", () => {
    const session = loadedSession();
    expect(session.setSpeed(1.5).ok).toBe(true);
    expect(session.speed.value).toBe(1.5);
  });

  it("sets the ambient volume within the ceiling", () => {
    const session = loadedSession();
    session.setAmbientVolume(0.2);
    expect(session.ambientVolume.level).toBeCloseTo(0.2, 5);
  });

  it("clears an active sleep timer", () => {
    const session = loadedSession();
    const timer = SleepTimer.inMinutes(10, new Date());
    if (!timer.ok) throw new Error("setup failed");

    session.setSleepTimer(timer.value);
    expect(session.sleepTimer.isActive).toBe(true);

    session.clearSleepTimer();
    expect(session.sleepTimer.isActive).toBe(false);
  });

  it("does nothing when ticking an inactive timer", () => {
    const session = loadedSession();
    expect(session.tickSleepTimer(new Date())).toBe(false);
  });

  it("does not fire an end-of-track timer on a clock tick", () => {
    const session = loadedSession();
    session.setSleepTimer(SleepTimer.untilEndOfTrack());
    expect(session.tickSleepTimer(new Date())).toBe(false);
  });
});

describe("Queue edge cases", () => {
  it("reports an empty queue", () => {
    const queue = Queue.empty();
    expect(queue.isEmpty).toBe(true);
    expect(queue.size).toBe(0);
    expect(queue.currentTrackId).toBeNull();
    expect(queue.next(RepeatMode.Off)).toBeNull();
    expect(queue.previous(RepeatMode.Off)).toBeNull();
    expect(queue.withShuffle(true).isEmpty).toBe(true);
  });

  it("returns the plain order when not shuffled", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.playOrder).toEqual(tracks);
  });

  it("is a no-op when reordering onto itself", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");

    const same = queue.value.reorder(1, 1);
    expect(same.ok).toBe(true);
    if (same.ok) expect(same.value.items).toEqual(tracks);
  });

  it("rejects jumping to an unknown track", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.jumpTo("nope").ok).toBe(false);
  });

  it("exposes a snapshot for persistence", () => {
    const queue = Queue.of(tracks, 1);
    if (!queue.ok) throw new Error("setup failed");

    const snapshot = queue.value.snapshot();
    expect(snapshot.trackIds).toEqual(tracks);
    expect(snapshot.index).toBe(1);
    expect(snapshot.shuffled).toBe(false);
  });

  it("advances within a shuffled order", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");

    const shuffled = queue.value.withShuffle(true, () => 0);
    const next = shuffled.next(RepeatMode.Off);
    expect(next).not.toBeNull();
    expect(next?.currentTrackId).toBe(shuffled.playOrder[1]);
  });

  it("steps back within a shuffled order", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");

    const shuffled = queue.value.withShuffle(true, () => 0);
    const advanced = shuffled.next(RepeatMode.Off);
    expect(advanced?.previous(RepeatMode.Off)?.currentTrackId).toBe("t1");
  });
});
