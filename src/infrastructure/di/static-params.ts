import { Mp3QuranClient } from "../content/mp3quran.client";
import { SURAH_DATA, SURAH_NAME_ID } from "../content/surah-data";
import { SYSTEM_PLAYLIST_IDS } from "../content/system-playlist-ids";

/**
 * Route slugs resolved at build time.
 *
 * A static export has to know every dynamic route up front, so the catalogue
 * is fetched once during `next build` and each reciter gets a real
 * `index.html`. Lives under `di/` because that is the only infrastructure
 * folder route files are allowed to import from.
 */

/**
 * Seed slugs for the best-known reciters.
 *
 * Used when the catalogue API is unreachable during a build. Without this a
 * transient upstream outage would fail the deploy outright; with it the build
 * still produces a working site covering the most-visited pages, and the rest
 * resolve on the next successful build.
 */
const FALLBACK_SLUGS: readonly string[] = [
  "mishary-rashid-alafasy-hafs",
  "abdul-basit-abdul-samad-hafs",
  "abdurrahman-as-sudais",
  "maher-al-muaiqly-hafs",
  "muhammad-siddiq-al-minshawi-hafs",
  "mahmoud-khalil-al-husary-hafs",
  "saad-al-ghamdi",
  "saud-ash-shuraim",
  "yasser-ad-dossari",
  "abu-bakr-ash-shatri",
  "ahmad-al-ajmi",
  "abdullah-awad-al-juhany",
  "bandar-baleela",
  "raad-muhammad-al-kurdi",
  "islam-sobhi",
  "idris-abkar",
  "nasser-al-qatami",
  "abdurrahman-al-ossi",
  "muhammad-al-luhaidan",
  "ali-al-hudhaify",
];

export async function listReciterSlugs(): Promise<string[]> {
  try {
    const reciters = await new Mp3QuranClient().listReciters();
    const slugs = [...new Set(reciters.map((r) => r.slug))];
    if (slugs.length === 0) return [...FALLBACK_SLUGS];

    // Union with the seed list so a partial upstream response still yields
    // working pages for the reciters people actually search for.
    return [...new Set([...slugs, ...FALLBACK_SLUGS])];
  } catch {
    console.warn(
      "[build] Reciter catalogue unreachable; exporting fallback slugs only.",
    );
    return [...FALLBACK_SLUGS];
  }
}

export function listPlaylistIds(): string[] {
  return [...SYSTEM_PLAYLIST_IDS];
}

/**
 * Surah reference data for server-rendered pages.
 *
 * Factual catalogue metadata only — number, names, ayah count, revelation
 * place. Translations and tafsir are deliberately absent: those are the work
 * of named translators and scholars, so they are fetched from their publisher
 * in the browser and credited there, never baked into this app's HTML.
 */
export interface SurahMeta {
  readonly number: number;
  readonly nameLatin: string;
  readonly nameArabic: string;
  readonly nameTranslation: string;
  readonly nameIndonesian: string;
  readonly ayahCount: number;
  readonly revelationPlace: string;
}

export function listSurahMeta(): SurahMeta[] {
  return SURAH_DATA.map((s) => ({
    number: s.number,
    nameLatin: s.nameLatin,
    nameArabic: s.nameArabic,
    nameTranslation: s.nameTranslation,
    nameIndonesian: SURAH_NAME_ID[s.number] ?? s.nameTranslation,
    ayahCount: s.ayahCount,
    revelationPlace: s.revelationPlace,
  }));
}

export function findSurahMeta(number: number): SurahMeta | null {
  return listSurahMeta().find((s) => s.number === number) ?? null;
}
