import { describe, expect, it } from "vitest";
import {
  ALLOWED_SPEEDS,
  PlaybackPosition,
  PlaybackSpeed,
  SleepTimer,
  Volume,
} from "./value-objects";

describe("PlaybackSpeed", () => {
  it("accepts every allowed speed", () => {
    for (const speed of ALLOWED_SPEEDS) {
      expect(PlaybackSpeed.create(speed).ok).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(PlaybackSpeed.create(1.1).ok).toBe(false);
    expect(PlaybackSpeed.create(0).ok).toBe(false);
  });

  it("labels itself for the transport row", () => {
    expect(PlaybackSpeed.normal().label).toBe("1x");
  });

  it("cycles forward through the allowed speeds", () => {
    expect(PlaybackSpeed.normal().next().value).toBe(1.25);
  });
});

describe("PlaybackPosition", () => {
  it("rejects a negative or non-finite duration", () => {
    expect(PlaybackPosition.create(0, -1).ok).toBe(false);
    expect(PlaybackPosition.create(0, Number.NaN).ok).toBe(false);
  });

  it("treats a non-finite position as zero", () => {
    const position = PlaybackPosition.create(Number.NaN, 100);
    expect(position.ok).toBe(true);
    if (position.ok) expect(position.value.seconds).toBe(0);
  });

  it("computes the remaining time", () => {
    const position = PlaybackPosition.create(30, 100);
    if (!position.ok) throw new Error("setup failed");
    expect(position.value.remainingSeconds).toBe(70);
  });

  it("reports a 0..1 ratio", () => {
    const position = PlaybackPosition.create(25, 100);
    if (!position.ok) throw new Error("setup failed");
    expect(position.value.ratio).toBe(0.25);
  });

  it("reports a zero ratio rather than NaN for a zero-length track", () => {
    const position = PlaybackPosition.create(0, 0);
    if (!position.ok) throw new Error("setup failed");
    expect(position.value.ratio).toBe(0);
    expect(position.value.isEffectivelyComplete).toBe(false);
  });

  it("marks completion only past 90%", () => {
    const at89 = PlaybackPosition.create(89, 100);
    const at90 = PlaybackPosition.create(90, 100);
    if (!at89.ok || !at90.ok) throw new Error("setup failed");

    expect(at89.value.isEffectivelyComplete).toBe(false);
    expect(at90.value.isEffectivelyComplete).toBe(true);
  });

  it("starts at zero with a known duration", () => {
    expect(PlaybackPosition.start(120).durationSeconds).toBe(120);
  });
});

describe("Volume", () => {
  it("clamps into 0..1", () => {
    expect(Volume.create(5).level).toBe(1);
    expect(Volume.create(-1).level).toBe(0);
  });

  it("exposes muted and max constructors", () => {
    expect(Volume.muted().isMuted).toBe(true);
    expect(Volume.max().level).toBe(1);
  });

  it("reports a rounded percentage for the slider label", () => {
    expect(Volume.create(0.355).percent).toBe(36);
  });
});

describe("SleepTimer", () => {
  const now = new Date("2026-03-10T21:00:00");

  it("is inactive by default", () => {
    expect(SleepTimer.none().isActive).toBe(false);
    expect(SleepTimer.none().hasExpired(now)).toBe(false);
    expect(SleepTimer.none().remainingSeconds(now)).toBe(0);
    expect(SleepTimer.none().isFading(now)).toBe(false);
  });

  it("rejects a non-positive duration", () => {
    expect(SleepTimer.inMinutes(0, now).ok).toBe(false);
    expect(SleepTimer.inMinutes(-5, now).ok).toBe(false);
  });

  it("counts down from the creation time", () => {
    const timer = SleepTimer.inMinutes(30, now);
    if (!timer.ok) throw new Error("setup failed");

    expect(timer.value.isActive).toBe(true);
    expect(timer.value.expiresAt?.toISOString()).toBe(
      new Date("2026-03-10T21:30:00").toISOString(),
    );
    expect(
      timer.value.remainingSeconds(new Date("2026-03-10T21:10:00")),
    ).toBe(1200);
  });

  it("expires once the deadline passes", () => {
    const timer = SleepTimer.inMinutes(10, now);
    if (!timer.ok) throw new Error("setup failed");

    expect(timer.value.hasExpired(new Date("2026-03-10T21:09:00"))).toBe(false);
    expect(timer.value.hasExpired(new Date("2026-03-10T21:10:00"))).toBe(true);
  });

  it("supports end-of-track mode without a deadline", () => {
    const timer = SleepTimer.untilEndOfTrack();
    expect(timer.isActive).toBe(true);
    expect(timer.isUntilEndOfTrack).toBe(true);
    expect(timer.expiresAt).toBeNull();
    expect(timer.hasExpired(now)).toBe(false);
  });

  it("exposes the preset minute options", () => {
    expect(SleepTimer.PRESET_MINUTES).toEqual([5, 10, 15, 30, 45, 60]);
  });
});
