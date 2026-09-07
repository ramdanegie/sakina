"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Play } from "lucide-react";
import type { SurahMeta } from "@/infrastructure/di/static-params";
import {
  useSurahText,
  useTranslationEdition,
} from "@/presentation/hooks/use-scripture";
import { usePlaySurah } from "@/presentation/hooks/use-play-surah";
import { VerseList } from "@/presentation/components/reader/verse-list";
import { useSettingsStore, Language } from "@/presentation/stores/settings.store";

/**
 * Standalone reader for one surah.
 *
 * Reading no longer requires starting playback first — that was the gap this
 * closes. Audio is still one tap away, but it is now optional.
 */
export function SurahReader({ surah }: { surah: SurahMeta }) {
  const { data: ayahs, isLoading, isError } = useSurahText(surah.number);
  const translation = useTranslationEdition();
  const playSurah = usePlaySurah();
  const language = useSettingsStore((s) => s.language);

  const localName =
    language === Language.Indonesian
      ? surah.nameIndonesian
      : surah.nameTranslation;

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <Link
          href="/surah"
          aria-label="All surahs"
          className="glass mb-4 flex size-11 items-center justify-center rounded-full"
        >
          <ChevronLeft className="flip-rtl size-5" aria-hidden />
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">
              Surah {surah.number}
            </p>
            <h1 className="text-foreground text-3xl font-bold">
              {surah.nameLatin}
            </h1>
            <p className="font-arabic text-muted-foreground mt-1 text-2xl">
              {surah.nameArabic}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {localName} · {surah.ayahCount} verses ·{" "}
              {surah.revelationPlace === "meccan" ? "Meccan" : "Medinan"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void playSurah(surah.number)}
          className="bg-primary text-primary-foreground mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold"
        >
          <Play className="size-4 fill-current" aria-hidden />
          Listen
        </button>
      </header>

      <div className="px-3">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2
              className="text-muted-foreground size-6 animate-spin"
              aria-hidden
            />
          </div>
        ) : isError ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Could not load the text. Check your connection.
          </p>
        ) : (
          <VerseList
            surahNumber={surah.number}
            ayahs={ayahs ?? []}
            onPlayAyah={() => void playSurah(surah.number)}
            tone="onSurface"
          />
        )}
      </div>

      {/* Translators are named, always. */}
      {translation.label !== "" ? (
        <p className="text-muted-foreground/60 px-5 pt-4 text-center text-[11px]">
          {translation.label}
        </p>
      ) : null}

      <nav className="mt-6 flex items-center justify-between gap-3 px-5">
        {surah.number > 1 ? (
          <Link
            href={`/surah/${surah.number - 1}`}
            className="bg-card border-border/50 text-foreground inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm"
          >
            <ChevronLeft className="flip-rtl size-4" aria-hidden />
            Previous
          </Link>
        ) : (
          <span />
        )}

        {surah.number < 114 ? (
          <Link
            href={`/surah/${surah.number + 1}`}
            className="bg-card border-border/50 text-foreground inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm"
          >
            Next
            <ChevronRight className="flip-rtl size-4" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
