import type { Ayah } from "@/domain/scripture/ayah.entity";
import type { VerseTimeline } from "@/domain/scripture/verse-timing";

/**
 * Ports for Quran text, translation, tafsir and recitation timings.
 *
 * Kept in its own module rather than appended to `ports.ts` so the reading
 * feature can be understood — and swapped — on its own.
 */

/** Editions the reader can choose between. */
export interface TranslationEdition {
  readonly id: string;
  readonly language: string;
  readonly name: string;
  /** Named translator or scholar, shown as attribution. */
  readonly author: string;
}

export interface ScriptureProviderPort {
  /** Arabic plus one translation edition for a whole surah. */
  getSurahText(
    surahNumber: number,
    translationEdition: string | null,
  ): Promise<Ayah[]>;

  /**
   * Tafsir for a single ayah. Separate from `getSurahText` because tafsir runs
   * to paragraphs per verse — fetching a whole surah's worth to show one would
   * be wasteful on a phone connection.
   */
  getTafsir(
    surahNumber: number,
    ayahNumber: number,
    edition: string,
  ): Promise<string | null>;

  listTranslationEditions(): Promise<TranslationEdition[]>;
  listTafsirEditions(): Promise<TranslationEdition[]>;
}

export interface VerseTimingPort {
  /**
   * Timings for a surah, when any are published.
   *
   * Returns the timeline unvalidated: only the caller knows the duration of
   * the recording actually playing, and `VerseTimeline.alignsWith` is what
   * decides whether these timings may be used at all.
   */
  getTimeline(surahNumber: number): Promise<VerseTimeline | null>;
}
