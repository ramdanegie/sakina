import { Err, Ok, DomainError, type Result } from "../shared/result";
import { ValueObject } from "../shared/value-object";

export const TOTAL_SURAHS = 114;

/** 1..114 — the only valid surah numbers. */
export class SurahNumber extends ValueObject<{ value: number }> {
  static create(value: number): Result<SurahNumber> {
    if (!Number.isInteger(value) || value < 1 || value > TOTAL_SURAHS) {
      return Err(
        DomainError.of(
          "surah_number.out_of_range",
          `Surah number must be an integer between 1 and ${TOTAL_SURAHS}`,
          { value },
        ),
      );
    }
    return Ok(new SurahNumber({ value }));
  }

  get value(): number {
    return this.props.value;
  }

  /** Zero-padded form used by every CDN filename convention (e.g. "096"). */
  get padded(): string {
    return String(this.props.value).padStart(3, "0");
  }
}

/** Narration/transmission of the recitation. */
export const Rewaya = {
  Hafs: "hafs",
  Warsh: "warsh",
  Qalun: "qalun",
  Duri: "duri",
  Shubah: "shubah",
  Bazzi: "bazzi",
  Susi: "susi",
  Other: "other",
} as const;

export type Rewaya = (typeof Rewaya)[keyof typeof Rewaya];

/**
 * Duration in whole seconds. Negative and non-finite input is rejected
 * so downstream progress math can never divide by a bogus total.
 */
export class Duration extends ValueObject<{ seconds: number }> {
  static create(seconds: number): Result<Duration> {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return Err(
        DomainError.of("duration.invalid", "Duration must be >= 0", {
          seconds,
        }),
      );
    }
    return Ok(new Duration({ seconds: Math.floor(seconds) }));
  }

  static zero(): Duration {
    return new Duration({ seconds: 0 });
  }

  get seconds(): number {
    return this.props.seconds;
  }

  /** "1:26" or "1:02:05" — matches the player readout in the reference UI. */
  format(): string {
    const total = this.props.seconds;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return hours > 0
      ? `${hours}:${pad(minutes)}:${pad(secs)}`
      : `${minutes}:${pad(secs)}`;
  }
}

/** Audio URL restricted to http(s) so a malformed catalog cannot inject js: URLs. */
export class AudioUrl extends ValueObject<{ href: string }> {
  static create(href: string): Result<AudioUrl> {
    let parsed: URL;
    try {
      parsed = new URL(href);
    } catch {
      return Err(
        DomainError.of("audio_url.malformed", "Audio URL is not a valid URL", {
          href,
        }),
      );
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return Err(
        DomainError.of(
          "audio_url.unsupported_protocol",
          "Audio URL must use http or https",
          { href, protocol: parsed.protocol },
        ),
      );
    }
    return Ok(new AudioUrl({ href: parsed.toString() }));
  }

  get href(): string {
    return this.props.href;
  }
}

/** Stable, deterministic track identity: `${reciterId}:${paddedSurah}`. */
export function makeTrackId(reciterId: string, surah: SurahNumber): string {
  return `${reciterId}:${surah.padded}`;
}
