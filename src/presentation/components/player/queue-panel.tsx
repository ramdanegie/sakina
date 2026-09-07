"use client";

import { useMemo, useState } from "react";
import { Repeat, Repeat1, Search, Shuffle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { cn } from "@/lib/utils";

/**
 * "Continue Playing" — the up-next list.
 *
 * Reordering is exposed as explicit move-up/move-down controls rather than
 * drag-and-drop: inside a scrolling sheet on a touch screen, a long-press drag
 * fights the scroll gesture, and buttons are also reachable by keyboard and
 * screen reader.
 */
export function QueuePanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const queue = usePlayerStore((s) => s.queue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const jumpTo = usePlayerStore((s) => s.jumpTo);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return queue.map((track, index) => ({ track, index }));
    return queue
      .map((track, index) => ({ track, index }))
      .filter(
        ({ track }) =>
          track.surahNameLatin.toLowerCase().includes(q) ||
          track.surahNameArabic.includes(q) ||
          track.surahNameTranslation.toLowerCase().includes(q) ||
          String(track.surahNumber) === q,
      );
  }, [queue, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass rounded-t-[28px] border-0 pb-8 data-[side=bottom]:h-[70dvh]"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Playback queue</SheetTitle>

        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pt-2">
            <h3 className="text-lg font-semibold text-white">
              Continue Playing
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleShuffle}
                aria-pressed={shuffle}
                aria-label="Shuffle"
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  shuffle ? "bg-white text-black" : "bg-white/10 text-white",
                )}
              >
                <Shuffle className="size-4" aria-hidden />
              </button>

              <button
                type="button"
                onClick={cycleRepeat}
                aria-label={`Repeat: ${repeat}`}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  repeat === "off"
                    ? "bg-white/10 text-white"
                    : "bg-white text-black",
                )}
              >
                {repeat === "one" ? (
                  <Repeat1 className="size-4" aria-hidden />
                ) : (
                  <Repeat className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div className="relative px-5 py-3">
            <Search
              className="pointer-events-none absolute start-8 top-1/2 size-4 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search the queue"
              className="h-11 rounded-full border-white/10 bg-white/5 ps-10 text-white placeholder:text-white/40"
            />
          </div>

          <ul data-vaul-no-drag
            className="no-scrollbar min-h-0 flex-1 space-y-1 touch-pan-y overscroll-contain overflow-y-auto px-3 pb-4">
            {visible.map(({ track, index }) => {
              const active = track.id === currentTrack?.id;

              return (
                <li key={track.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void jumpTo(track.id)}
                    className="flex min-h-14 flex-1 items-center gap-3 rounded-xl px-2 text-start"
                  >
                    <span
                      className={cn(
                        "tabular flex size-11 shrink-0 items-center justify-center rounded-lg text-sm",
                        active
                          ? "bg-white text-black"
                          : "bg-white/10 text-white/80",
                      )}
                    >
                      {track.surahNumber}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-white">
                        {track.surahNameLatin}
                        <span className="font-arabic ms-1.5 text-white/70">
                          ({track.surahNameArabic})
                        </span>
                      </span>
                      <span className="block truncate text-sm text-white/50">
                        {track.surahNameTranslation}
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => reorderQueue(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move ${track.surahNameLatin} up`}
                      className="flex h-7 w-9 items-center justify-center text-white/40 disabled:opacity-25"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderQueue(index, index + 1)}
                      disabled={index === queue.length - 1}
                      aria-label={`Move ${track.surahNameLatin} down`}
                      className="flex h-7 w-9 items-center justify-center text-white/40 disabled:opacity-25"
                    >
                      ▼
                    </button>
                  </div>
                </li>
              );
            })}

            {visible.length === 0 ? (
              <li className="py-10 text-center text-sm text-white/40">
                No surah matches “{query}”.
              </li>
            ) : null}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
