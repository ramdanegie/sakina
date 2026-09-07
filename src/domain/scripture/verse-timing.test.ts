import { describe, expect, it } from "vitest";
import { VerseTimeline, type VerseTiming } from "./verse-timing";

function timeline(timings: VerseTiming[]): VerseTimeline {
  const result = VerseTimeline.create(timings);
  if (!result.ok) throw new Error("setup failed");
  return result.value;
}

/** Surah 112, roughly as quran.com publishes it. */
const AL_IKHLAS: VerseTiming[] = [
  { ayah: 1, startMs: 0, endMs: 2980 },
  { ayah: 2, startMs: 2980, endMs: 5510 },
  { ayah: 3, startMs: 5510, endMs: 8490 },
  { ayah: 4, startMs: 8490, endMs: 13350 },
];

describe("VerseTimeline.create", () => {
  it("rejects an empty timeline", () => {
    expect(VerseTimeline.create([]).ok).toBe(false);
  });

  it("rejects a verse that ends before it starts", () => {
    const result = VerseTimeline.create([
      { ayah: 1, startMs: 500, endMs: 100 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("timeline.reversed_verse");
  });

  it("sorts verses by ayah number", () => {
    const t = timeline([
      { ayah: 3, startMs: 200, endMs: 300 },
      { ayah: 1, startMs: 0, endMs: 100 },
      { ayah: 2, startMs: 100, endMs: 200 },
    ]);
    expect(t.verses.map((v) => v.ayah)).toEqual([1, 2, 3]);
  });

  it("takes its source duration from the last verse", () => {
    expect(timeline(AL_IKHLAS).sourceDurationMs).toBe(13350);
    expect(timeline(AL_IKHLAS).count).toBe(4);
  });
});

describe("VerseTimeline.alignsWith", () => {
  const t = timeline(AL_IKHLAS);

  it("accepts the recording it was measured from", () => {
    expect(t.alignsWith(13350)).toBe(true);
  });

  it("tolerates small re-encoding differences", () => {
    // 13.297s — the measured length of the matching recording.
    expect(t.alignsWith(13297)).toBe(true);
  });

  it("rejects a different take by the same reciter", () => {
    // The real failure this guard exists for: another Alafasy recording of
    // the same surah runs 21.7s. Highlighting against it would drift by
    // eight seconds.
    expect(t.alignsWith(21708)).toBe(false);
  });

  it("rejects durations just outside the tolerance", () => {
    const limit = 13350 * (1 + VerseTimeline.ALIGNMENT_TOLERANCE);
    expect(t.alignsWith(limit - 1)).toBe(true);
    expect(t.alignsWith(limit + 100)).toBe(false);
  });

  it("rejects an unknown or zero duration", () => {
    expect(t.alignsWith(0)).toBe(false);
    expect(t.alignsWith(Number.NaN)).toBe(false);
    expect(t.alignsWith(-1)).toBe(false);
  });
});

describe("VerseTimeline.ayahAt", () => {
  const t = timeline(AL_IKHLAS);

  it("finds the verse sounding at a position", () => {
    expect(t.ayahAt(0)).toBe(1);
    expect(t.ayahAt(2979)).toBe(1);
    expect(t.ayahAt(2980)).toBe(2);
    expect(t.ayahAt(9000)).toBe(4);
  });

  it("returns null past the end", () => {
    expect(t.ayahAt(13350)).toBeNull();
    expect(t.ayahAt(99999)).toBeNull();
  });

  it("returns null for an invalid position", () => {
    expect(t.ayahAt(-1)).toBeNull();
    expect(t.ayahAt(Number.NaN)).toBeNull();
  });

  it("returns null inside a gap between verses", () => {
    const gapped = timeline([
      { ayah: 1, startMs: 0, endMs: 1000 },
      { ayah: 2, startMs: 3000, endMs: 4000 },
    ]);
    expect(gapped.ayahAt(2000)).toBeNull();
  });
});

describe("VerseTimeline.startOf", () => {
  const t = timeline(AL_IKHLAS);

  it("returns where a verse begins", () => {
    expect(t.startOf(3)).toBe(5510);
  });

  it("returns null for a verse outside the surah", () => {
    expect(t.startOf(99)).toBeNull();
  });
});
