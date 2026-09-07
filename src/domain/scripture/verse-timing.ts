import { Err, Ok, DomainError, type Result } from "../shared/result";

/**
 * Per-ayah timings for one recording.
 *
 * The rule that governs this whole file: **timings belong to a specific
 * recording, not to a reciter.** Two recordings of surah 112 by the same
 * reciter measured 13.3s and 21.7s — different takes, different pacing. Using
 * one recording's timings against the other would drift by seconds within a
 * single ayah, which is worse than showing no highlight at all.
 *
 * So timings are only ever applied after `alignsWith` confirms the playing
 * audio is the same length as the audio they were measured from.
 */

export interface VerseTiming {
  /** 1-based ayah number within the surah. */
  readonly ayah: number;
  readonly startMs: number;
  readonly endMs: number;
}

export class VerseTimeline {
  private constructor(
    private readonly timings: readonly VerseTiming[],
    /** Length of the recording these timings were measured from. */
    readonly sourceDurationMs: number,
  ) {}

  /**
   * How far the playing audio may differ from the source recording before the
   * timings are considered untrustworthy.
   *
   * 2% is tight enough to reject a different take (the 13.3s vs 21.7s case is
   * 63% out) while tolerating the small differences that come from re-encoding
   * or ID3 tags on the same master.
   */
  static readonly ALIGNMENT_TOLERANCE = 0.02;

  static create(timings: readonly VerseTiming[]): Result<VerseTimeline> {
    if (timings.length === 0) {
      return Err(
        DomainError.of("timeline.empty", "A timeline needs at least one verse"),
      );
    }

    const sorted = [...timings].sort((a, b) => a.ayah - b.ayah);
    for (const timing of sorted) {
      if (timing.endMs < timing.startMs) {
        return Err(
          DomainError.of(
            "timeline.reversed_verse",
            "A verse cannot end before it starts",
            { ayah: timing.ayah },
          ),
        );
      }
    }

    return Ok(new VerseTimeline(sorted, sorted[sorted.length - 1].endMs));
  }

  get verses(): readonly VerseTiming[] {
    return this.timings;
  }

  get count(): number {
    return this.timings.length;
  }

  /**
   * Whether these timings can be trusted against a recording of
   * `durationMs`. This is the gate that keeps a mismatched take from
   * producing a confidently wrong highlight.
   */
  alignsWith(durationMs: number): boolean {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return false;
    if (this.sourceDurationMs <= 0) return false;

    const drift =
      Math.abs(durationMs - this.sourceDurationMs) / this.sourceDurationMs;
    return drift <= VerseTimeline.ALIGNMENT_TOLERANCE;
  }

  /** The ayah sounding at `positionMs`, or null outside the timeline. */
  ayahAt(positionMs: number): number | null {
    if (!Number.isFinite(positionMs) || positionMs < 0) return null;

    // Binary search: this runs on every timeupdate tick.
    let low = 0;
    let high = this.timings.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const timing = this.timings[mid];

      if (positionMs < timing.startMs) high = mid - 1;
      else if (positionMs >= timing.endMs) low = mid + 1;
      else return timing.ayah;
    }

    return null;
  }

  /** Where an ayah begins, for tap-to-seek. */
  startOf(ayah: number): number | null {
    return this.timings.find((t) => t.ayah === ayah)?.startMs ?? null;
  }
}
