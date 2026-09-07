"use client";

import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/di/container";
import { useSettingsStore, Language } from "@/presentation/stores/settings.store";

/** Plain shape for the reading panel — no domain objects cross into React. */
export interface AyahView {
  readonly key: string;
  readonly number: number;
  readonly arabic: string;
  readonly translation: string | null;
}

/**
 * Default editions per interface language.
 *
 * Named so the panel can attribute them. Translations and tafsir are the work
 * of specific translators and scholars; they are fetched from their publisher
 * at read time and credited on screen, never bundled into this app.
 */
export const TRANSLATION_BY_LANGUAGE: Record<
  string,
  { edition: string; label: string }
> = {
  [Language.Indonesian]: {
    edition: "id.indonesian",
    label: "Terjemahan Kemenag (via alquran.cloud)",
  },
  [Language.English]: {
    edition: "en.sahih",
    label: "Saheeh International (via alquran.cloud)",
  },
  // Arabic readers get the scripture alone.
  [Language.Arabic]: { edition: "", label: "" },
};

export const TAFSIR_BY_LANGUAGE: Record<
  string,
  { edition: string; label: string }
> = {
  [Language.Indonesian]: {
    edition: "id.jalalayn",
    label: "Tafsir Jalalayn (Indonesian)",
  },
  [Language.English]: { edition: "ar.jalalayn", label: "Tafsir al-Jalalayn" },
  [Language.Arabic]: { edition: "ar.muyassar", label: "التفسير الميسر" },
};

export function useTranslationEdition() {
  const language = useSettingsStore((s) => s.language);
  return TRANSLATION_BY_LANGUAGE[language] ?? TRANSLATION_BY_LANGUAGE.id;
}

export function useTafsirEdition() {
  const language = useSettingsStore((s) => s.language);
  return TAFSIR_BY_LANGUAGE[language] ?? TAFSIR_BY_LANGUAGE.id;
}

/** Arabic plus the reader's translation for one surah. */
export function useSurahText(surahNumber: number | undefined) {
  const { edition } = useTranslationEdition();

  return useQuery({
    queryKey: ["surah-text", surahNumber, edition],
    queryFn: async (): Promise<AyahView[]> => {
      if (surahNumber === undefined) return [];

      const ayahs = await getContainer().scripture.getSurahText(
        surahNumber,
        edition === "" ? null : edition,
      );

      return ayahs.map((ayah) => ({
        key: ayah.verseKey,
        number: ayah.number,
        arabic: ayah.arabic,
        translation: ayah.translation,
      }));
    },
    enabled: surahNumber !== undefined,
    // Scripture never changes; keep it for the session and across reloads.
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
  });
}

/** Tafsir for a single ayah, fetched only when the reader expands one. */
export function useTafsir(
  surahNumber: number | undefined,
  ayahNumber: number | null,
) {
  const { edition } = useTafsirEdition();

  return useQuery({
    queryKey: ["tafsir", surahNumber, ayahNumber, edition],
    queryFn: async (): Promise<string | null> => {
      if (surahNumber === undefined || ayahNumber === null) return null;
      return getContainer().scripture.getTafsir(surahNumber, ayahNumber, edition);
    },
    enabled: surahNumber !== undefined && ayahNumber !== null,
    staleTime: Infinity,
  });
}

/**
 * Verse timings for the *currently playing recording*, or null.
 *
 * `durationSec` is the length of the audio actually playing. Published timings
 * describe one specific recording, and two takes of the same surah by the same
 * reciter can differ by ten seconds, so the timeline is only handed back when
 * it demonstrably matches. Everywhere else the panel scrolls without
 * highlighting — which is honest, where a drifting highlight would not be.
 */
export function useVerseTimeline(
  surahNumber: number | undefined,
  durationSec: number,
) {
  const query = useQuery({
    queryKey: ["verse-timeline", surahNumber],
    queryFn: async () => {
      if (surahNumber === undefined) return null;
      return getContainer().verseTiming.getTimeline(surahNumber);
    },
    enabled: surahNumber !== undefined,
    staleTime: Infinity,
  });

  const timeline = query.data ?? null;
  const aligned =
    timeline !== null && durationSec > 0
      ? timeline.alignsWith(durationSec * 1000)
      : false;

  return { timeline: aligned ? timeline : null, isChecked: !query.isLoading };
}
