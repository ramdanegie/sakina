"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, Play } from "lucide-react";
import type { AyahView } from "@/presentation/hooks/use-scripture";
import { useTafsir, useTafsirEdition } from "@/presentation/hooks/use-scripture";
import { useSettingsStore } from "@/presentation/stores/settings.store";
import { cn } from "@/lib/utils";

/**
 * The verse list, shared by the in-player panel and the standalone reader.
 *
 * `tone` exists because the two live on different surfaces: the player sits on
 * a photograph and is always light-on-dark, while the reader page follows the
 * app theme. Rather than duplicate the markup, the colour set is a parameter.
 *
 * Translations and tafsir belong to their translators and scholars. They are
 * fetched from the publisher as the reader scrolls and credited on screen —
 * never bundled into this app or baked into its pages.
 */

const ARABIC_SIZE = {
  sm: "text-xl leading-[2.4]",
  md: "text-2xl leading-[2.3]",
  lg: "text-3xl leading-[2.2]",
} as const;

export type ReaderTone = "onPhoto" | "onSurface";

const TONE = {
  onPhoto: {
    active: "bg-white/12",
    badge: "bg-white/12 text-white/70",
    arabic: "text-white",
    translation: "text-white/65",
    muted: "text-white/50",
    faint: "text-white/35",
    tafsirBox: "bg-white/5",
    tafsirText: "text-white/70",
  },
  onSurface: {
    active: "bg-accent/10 ring-accent/20 ring-1",
    badge: "bg-muted text-muted-foreground",
    arabic: "text-foreground",
    translation: "text-muted-foreground",
    muted: "text-muted-foreground",
    faint: "text-muted-foreground/60",
    tafsirBox: "bg-muted/50",
    tafsirText: "text-muted-foreground",
  },
} as const;

export function VerseList({
  surahNumber,
  ayahs,
  activeAyah = null,
  onSeekToAyah,
  onPlayAyah,
  tone = "onSurface",
  autoScroll = false,
}: {
  surahNumber: number | undefined;
  ayahs: readonly AyahView[];
  /** Highlighted verse, when the recitation can be followed reliably. */
  activeAyah?: number | null;
  /** Present only when verse timings match the playing recording. */
  onSeekToAyah?: (ayah: number) => void;
  /** Starts playback from this surah — used by the standalone reader. */
  onPlayAyah?: (ayah: number) => void;
  tone?: ReaderTone;
  autoScroll?: boolean;
}) {
  const fontSize = useSettingsStore((s) => s.arabicFontSize);
  const tafsirEdition = useTafsirEdition();
  const [expanded, setExpanded] = useState<number | null>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const palette = TONE[tone];

  useEffect(() => {
    if (!autoScroll || activeAyah === null) return;
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [autoScroll, activeAyah]);

  return (
    <ul className="space-y-1">
      {ayahs.map((ayah) => {
        const active = ayah.number === activeAyah;

        return (
          <li
            key={ayah.key}
            ref={active ? activeRef : undefined}
            className={cn(
              "rounded-2xl px-3 py-3 transition-colors",
              active && palette.active,
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  "tabular flex size-7 items-center justify-center rounded-full text-xs",
                  palette.badge,
                )}
              >
                {ayah.number}
              </span>

              {onSeekToAyah !== undefined ? (
                <button
                  type="button"
                  onClick={() => onSeekToAyah(ayah.number)}
                  className={cn("text-xs underline-offset-2 hover:underline", palette.muted)}
                >
                  Play from here
                </button>
              ) : null}

              {onPlayAyah !== undefined ? (
                <button
                  type="button"
                  onClick={() => onPlayAyah(ayah.number)}
                  aria-label={`Play verse ${ayah.number}`}
                  className={cn("flex items-center gap-1 text-xs", palette.muted)}
                >
                  <Play className="size-3 fill-current" aria-hidden />
                  Listen
                </button>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  setExpanded(expanded === ayah.number ? null : ayah.number)
                }
                aria-expanded={expanded === ayah.number}
                className={cn("ms-auto flex items-center gap-1 text-xs", palette.muted)}
              >
                <BookOpen className="size-3.5" aria-hidden />
                Tafsir
              </button>
            </div>

            <p
              dir="rtl"
              lang="ar"
              className={cn("font-arabic", palette.arabic, ARABIC_SIZE[fontSize])}
            >
              {ayah.arabic}
            </p>

            {ayah.translation !== null ? (
              <p className={cn("mt-2 text-sm leading-relaxed", palette.translation)}>
                {ayah.translation}
              </p>
            ) : null}

            {expanded === ayah.number ? (
              <TafsirBlock
                surahNumber={surahNumber}
                ayahNumber={ayah.number}
                label={tafsirEdition.label}
                palette={palette}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function TafsirBlock({
  surahNumber,
  ayahNumber,
  label,
  palette,
}: {
  surahNumber: number | undefined;
  ayahNumber: number;
  label: string;
  palette: (typeof TONE)[ReaderTone];
}) {
  const { data, isLoading } = useTafsir(surahNumber, ayahNumber);

  return (
    <div className={cn("mt-3 rounded-xl p-3", palette.tafsirBox)}>
      {isLoading ? (
        <Loader2 className={cn("size-4 animate-spin", palette.faint)} aria-hidden />
      ) : data === null || data === undefined ? (
        <p className={cn("text-xs", palette.faint)}>
          No tafsir available for this verse.
        </p>
      ) : (
        <>
          <p className={cn("text-sm leading-relaxed", palette.tafsirText)}>
            {data}
          </p>
          <p className={cn("mt-2 text-[11px]", palette.faint)}>{label}</p>
        </>
      )}
    </div>
  );
}
