import { Reciter } from "@/domain/recitation/reciter.entity";
import { Rewaya } from "@/domain/recitation/value-objects";
import { RECITER_NAME_MAP } from "./reciter-name-map";

/**
 * Adapter for the mp3quran.net v3 API — the primary catalogue source.
 *
 * No API key, 100+ reciters, multiple narrations. Its metadata is Arabic-only,
 * so latin names come from a hand-maintained map (see reciter-name-map.ts)
 * with a transliteration fallback for reciters not yet mapped.
 *
 * Audio is never proxied through us: `server` points straight at the CDN and
 * the browser streams from there. That is what keeps bandwidth cost at zero
 * and makes the "free forever" model viable.
 */

const BASE_URL = "https://mp3quran.net/api/v3";

interface Mp3QuranMoshaf {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  moshaf_type: number;
  surah_list: string;
}

interface Mp3QuranReciter {
  id: number;
  name: string;
  letter: string;
  date: string;
  moshaf: Mp3QuranMoshaf[];
}

interface Mp3QuranResponse {
  reciters: Mp3QuranReciter[];
}

/** Map the Arabic narration label onto our Rewaya value object. */
function parseRewaya(moshafName: string): Rewaya {
  const name = moshafName.toLowerCase();
  if (name.includes("ورش") || name.includes("warsh")) return Rewaya.Warsh;
  if (name.includes("قالون") || name.includes("qalun")) return Rewaya.Qalun;
  if (name.includes("الدوري") || name.includes("duri")) return Rewaya.Duri;
  if (name.includes("شعبة") || name.includes("shubah")) return Rewaya.Shubah;
  if (name.includes("البزي") || name.includes("bazzi")) return Rewaya.Bazzi;
  if (name.includes("السوسي") || name.includes("susi")) return Rewaya.Susi;
  if (name.includes("حفص") || name.includes("hafs")) return Rewaya.Hafs;
  return Rewaya.Other;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "1,2,3,114" -> [1,2,3,114], ignoring blanks and junk. */
function parseSurahList(list: string): number[] {
  return list
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 114);
}

/**
 * Window for the "recently updated" flag.
 *
 * Note what this does NOT mean: the API's `date` is a last-*modified*
 * timestamp, not the date a reciter was added. Re-encoding a 1960s recording
 * refreshes it. Treating this as "new reciter" labels Al-Husary and
 * Al-Minshawi as newcomers, so the UI calls it "recently updated" instead.
 */
const RECENTLY_UPDATED_WINDOW_DAYS = 60;

function isRecent(dateValue: string, now: Date): boolean {
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return false;
  const ageDays = (now.getTime() - parsed) / 86_400_000;
  return ageDays >= 0 && ageDays <= RECENTLY_UPDATED_WINDOW_DAYS;
}

export class Mp3QuranClient {
  private readonly fetchImpl: typeof fetch;

  /**
   * `fetch` must stay bound to its original global. Storing the bare function
   * on the instance and calling `this.fetchImpl(...)` invokes it with the
   * class as its receiver, which browsers reject with "Illegal invocation" —
   * a failure that then looks like an offline device rather than a bug.
   */
  constructor(fetchImpl?: typeof fetch, private readonly baseUrl: string = BASE_URL) {
    this.fetchImpl =
      fetchImpl ??
      ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  }

  /**
   * Fetch the reciter catalogue.
   *
   * One API reciter can have several `moshaf` entries (different narrations);
   * each becomes its own Reciter, because a listener picking "Warsh" versus
   * "Hafs" is choosing a different recitation, not a different person.
   */
  async listReciters(now: Date = new Date()): Promise<Reciter[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/reciters`, {
      headers: { Accept: "application/json" },
      // Catalogue changes rarely; revalidate daily.
      next: { revalidate: 86_400 },
    } as RequestInit);

    if (!response.ok) {
      throw new Error(
        `mp3quran: catalogue request failed with ${response.status}`,
      );
    }

    const payload = (await response.json()) as Mp3QuranResponse;
    if (!Array.isArray(payload?.reciters)) {
      throw new Error("mp3quran: unexpected response shape");
    }

    const reciters: Reciter[] = [];
    // Slugs are the routing key, so a collision would make one recording
    // unreachable. A reciter can have two recordings in the SAME narration
    // (murattal and mujawwad), so the narration suffix alone is not enough.
    const usedSlugs = new Set<string>();

    for (const raw of payload.reciters) {
      const mapped = RECITER_NAME_MAP[raw.id];
      const nameLatin = mapped?.latin ?? slugify(raw.name).replace(/-/g, " ");
      if (nameLatin.trim().length === 0) continue;

      const moshafs = raw.moshaf ?? [];
      const baseSlug = slugify(nameLatin);

      for (const moshaf of moshafs) {
        const availableSurahs = parseSurahList(moshaf.surah_list ?? "");
        if (availableSurahs.length === 0) continue;

        const rewaya = parseRewaya(moshaf.name ?? "");
        // One person, several narrations: keep ids unique per narration.
        const id = `mp3quran:${raw.id}:${moshaf.id}`;

        let slug =
          moshafs.length > 1 ? `${baseSlug}-${rewaya}` : baseSlug;
        if (usedSlugs.has(slug)) slug = `${baseSlug}-${rewaya}-${moshaf.id}`;
        usedSlugs.add(slug);

        const reciter = Reciter.create({
          id,
          slug,
          nameLatin,
          nameArabic: raw.name,
          countryCode: mapped?.countryCode ?? null,
          rewaya,
          avatarUrl: mapped?.avatarUrl ?? null,
          serverBaseUrl: moshaf.server,
          availableSurahs,
          isNew: isRecent(raw.date, now),
          popularity: mapped?.popularity ?? availableSurahs.length,
        });

        // A malformed row must not take down the whole catalogue.
        if (reciter.ok) reciters.push(reciter.value);
      }
    }

    return reciters;
  }
}
