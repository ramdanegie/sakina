"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePlayerStore } from "@/presentation/stores/player.store";
import {
  useSurahText,
  useTafsir,
  useTafsirEdition,
  useTranslationEdition,
  useVerseTimeline,
} from "@/presentation/hooks/use-scripture";
import { useSettingsStore } from "@/presentation/stores/settings.store";
import { cn } from "@/lib/utils";

/**
 * The reading panel behind the `ق` control.
 *
 * Arabic text, a translation, and tafsir on demand.
 *
 * Highlighting the ayah being recited only happens when the published timings
 * provably match the recording that is playing — see `useVerseTimeline`. When
 * they do not, the panel is a plain scrollable reader and says so. A highlight
 * that drifts is worse than none: it tells the reader they are in the wrong
 * place with total confidence.
 */

const ARABIC_SIZE = {
  sm: "text-xl leading-[2.4]",
  md: "text-2xl leading-[2.3]",
  lg: "text-3xl leading-[2.2]",
} as const;

export function LyricsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const track = usePlayerStore((s) => s.currentTrack);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);
  const seek = usePlayerStore((s) => s.seek);
  const fontSize = useSettingsStore((s) => s.arabicFontSize);

  const surahNumber = track?.surahNumber;
  const { data: ayahs, isLoading, isError } = useSurahText(surahNumber);
  const { timeline } = useVerseTimeline(surahNumber, durationSec);
  const translation = useTranslationEdition();
  const tafsirEdition = useTafsirEdition();

  const [expanded, setExpanded] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const activeAyah = useMemo(
    () => timeline?.ayahAt(positionSec * 1000) ?? null,
    [timeline, positionSec],
  );

  // Follow the recitation, but only while the panel is open — scrolling a
  // hidden list wastes work and fights the user if they reopen it.
  useEffect(() => {
    if (!open || activeAyah === null) return;
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [open, activeAyah]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass mx-auto h-[85dvh] max-w-lg rounded-t-[28px] border-0 pb-8 text-white"
        aria-describedby={undefined}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 px-5 pt-2">
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-semibold text-white">
                {track?.surahNameLatin ?? "Quran"}
              </SheetTitle>
              <p className="truncate text-xs text-white/50">
                {timeline !== null
                  ? "Following the recitation"
                  : "Reading view — this recording has no verse timings"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10"
            >
              <ChevronDown className="size-5" aria-hidden />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-white/50" aria-hidden />
            </div>
          ) : isError ? (
            <p className="px-5 py-10 text-center text-sm text-white/60">
              Could not load the text. Check your connection.
            </p>
          ) : (
            <ul
              ref={listRef}
              className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pt-3"
            >
              {(ayahs ?? []).map((ayah) => {
                const active = ayah.number === activeAyah;
                const canSeek = timeline !== null;

                return (
                  <li
                    key={ayah.key}
                    ref={active ? activeRef : undefined}
                    className={cn(
                      "rounded-2xl px-3 py-3 transition-colors",
                      active && "bg-white/12",
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="tabular flex size-7 items-center justify-center rounded-full bg-white/12 text-xs text-white/70">
                        {ayah.number}
                      </span>

                      {canSeek ? (
                        <button
                          type="button"
                          onClick={() => {
                            const start = timeline.startOf(ayah.number);
                            if (start !== null) seek(start / 1000);
                          }}
                          className="text-xs text-white/50 underline-offset-2 hover:underline"
                        >
                          Play from here
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(expanded === ayah.number ? null : ayah.number)
                        }
                        aria-expanded={expanded === ayah.number}
                        className="ms-auto flex items-center gap-1 text-xs text-white/50"
                      >
                        <BookOpen className="size-3.5" aria-hidden />
                        Tafsir
                      </button>
                    </div>

                    <p
                      dir="rtl"
                      lang="ar"
                      className={cn(
                        "font-arabic text-white",
                        ARABIC_SIZE[fontSize],
                      )}
                    >
                      {ayah.arabic}
                    </p>

                    {ayah.translation !== null ? (
                      <p className="mt-2 text-sm leading-relaxed text-white/65">
                        {ayah.translation}
                      </p>
                    ) : null}

                    {expanded === ayah.number ? (
                      <TafsirBlock
                        surahNumber={surahNumber}
                        ayahNumber={ayah.number}
                        label={tafsirEdition.label}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Translators and commentators are named, always. */}
          {translation.label !== "" ? (
            <p className="px-5 pt-3 text-center text-[11px] text-white/35">
              {translation.label}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TafsirBlock({
  surahNumber,
  ayahNumber,
  label,
}: {
  surahNumber: number | undefined;
  ayahNumber: number;
  label: string;
}) {
  const { data, isLoading } = useTafsir(surahNumber, ayahNumber);

  return (
    <div className="mt-3 rounded-xl bg-white/5 p-3">
      {isLoading ? (
        <Loader2 className="size-4 animate-spin text-white/40" aria-hidden />
      ) : data === null || data === undefined ? (
        <p className="text-xs text-white/45">
          No tafsir available for this verse.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-white/70">{data}</p>
          <p className="mt-2 text-[11px] text-white/35">{label}</p>
        </>
      )}
    </div>
  );
}
