import type { VerseTimingPort } from "@/application/ports.scripture";
import { VerseTimeline, type VerseTiming } from "@/domain/scripture/verse-timing";

const BASE = "https://api.quran.com/api/v4";

/**
 * Alafasy on quran.com. Their timings are published per recitation id, and
 * this is the one with the widest coverage.
 */
const RECITATION_ID = 7;

interface ApiTimestamp {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
}

/**
 * Per-ayah recitation timings from quran.com.
 *
 * These describe *quran.com's own recording*, which is frequently a different
 * take from the one this app streams — measured directly, surah 112 runs
 * 13.3s there and 21.7s on our CDN. The timeline is therefore returned
 * unvalidated and `VerseTimeline.alignsWith` decides, against the real
 * duration of the playing audio, whether it may be used at all.
 */
export class QuranComVerseTimingClient implements VerseTimingPort {
  private readonly fetchImpl: typeof fetch;
  private readonly cache = new Map<number, VerseTimeline | null>();

  constructor(fetchImpl?: typeof fetch, private readonly baseUrl = BASE) {
    this.fetchImpl =
      fetchImpl ??
      ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  }

  async getTimeline(surahNumber: number): Promise<VerseTimeline | null> {
    const cached = this.cache.get(surahNumber);
    if (cached !== undefined) return cached;

    try {
      const response = await this.fetchImpl(
        `${this.baseUrl}/chapter_recitations/${RECITATION_ID}/${surahNumber}?segments=true`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        this.cache.set(surahNumber, null);
        return null;
      }

      const payload = (await response.json()) as {
        audio_file?: { timestamps?: ApiTimestamp[] };
      };
      const stamps = payload.audio_file?.timestamps ?? [];
      if (stamps.length === 0) {
        this.cache.set(surahNumber, null);
        return null;
      }

      const timings: VerseTiming[] = [];
      for (const stamp of stamps) {
        // "112:1" — the ayah is the part after the colon.
        const ayah = Number.parseInt(stamp.verse_key.split(":")[1] ?? "", 10);
        if (!Number.isInteger(ayah)) continue;

        timings.push({
          ayah,
          startMs: stamp.timestamp_from,
          endMs: stamp.timestamp_to,
        });
      }

      const timeline = VerseTimeline.create(timings);
      const value = timeline.ok ? timeline.value : null;
      this.cache.set(surahNumber, value);
      return value;
    } catch {
      // No timings simply means the panel scrolls instead of highlighting.
      this.cache.set(surahNumber, null);
      return null;
    }
  }
}
