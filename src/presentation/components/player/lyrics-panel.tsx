"use client";

import { useMemo } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePlayerStore } from "@/presentation/stores/player.store";
import {
  useSurahText,
  useTranslationEdition,
  useVerseTimeline,
} from "@/presentation/hooks/use-scripture";
import { VerseList } from "@/presentation/components/reader/verse-list";

/**
 * The reading panel behind the `ق` control.
 *
 * Highlighting the verse being recited only happens when the published timings
 * provably match the recording that is playing — see `useVerseTimeline`. When
 * they do not, this is a plain scrollable reader and the header says so. A
 * highlight that drifts is worse than none: it tells the reader they are in
 * the wrong place with total confidence.
 */
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

  const surahNumber = track?.surahNumber;
  const { data: ayahs, isLoading, isError } = useSurahText(surahNumber);
  const { timeline } = useVerseTimeline(surahNumber, durationSec);
  const translation = useTranslationEdition();

  const activeAyah = useMemo(
    () => timeline?.ayahAt(positionSec * 1000) ?? null,
    [timeline, positionSec],
  );

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
            <div className="no-scrollbar flex-1 overflow-y-auto px-3 pt-3">
              <VerseList
                surahNumber={surahNumber}
                ayahs={ayahs ?? []}
                activeAyah={activeAyah}
                onSeekToAyah={
                  timeline === null
                    ? undefined
                    : (ayah) => {
                        const start = timeline.startOf(ayah);
                        if (start !== null) seek(start / 1000);
                      }
                }
                tone="onPhoto"
                autoScroll
              />
            </div>
          )}

          {/* Translators are named, always. */}
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
