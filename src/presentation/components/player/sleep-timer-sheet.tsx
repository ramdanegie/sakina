"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { useNowMs } from "@/presentation/hooks/use-now";
import { formatDuration } from "@/presentation/lib/format";
import { cn } from "@/lib/utils";

const PRESETS = [5, 10, 15, 30, 45, 60] as const;

/**
 * Sleep timer.
 *
 * The countdown ticks locally on a 1s interval purely for display; the domain
 * owns the real deadline and stops playback from the audio engine's timeupdate
 * loop, so a throttled background tab cannot leave audio running past the
 * timer.
 */
export function SleepTimerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const expiresAt = usePlayerStore((s) => s.sleepTimerExpiresAt);
  const untilEndOfTrack = usePlayerStore((s) => s.sleepUntilEndOfTrack);
  const setMinutes = usePlayerStore((s) => s.setSleepTimerMinutes);
  const setUntilEndOfTrack = usePlayerStore((s) => s.setSleepUntilEndOfTrack);

  // Derived from a shared ticking store rather than local state, so the
  // countdown stays a pure function of (deadline, now).
  const nowMs = useNowMs();
  const remaining =
    expiresAt === null || nowMs === 0
      ? 0
      : Math.max(0, Math.round((expiresAt - nowMs) / 1000));

  const isActive = expiresAt !== null || untilEndOfTrack;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass rounded-t-[28px] border-0 pb-10"
        aria-describedby={undefined}
      >
        <SheetTitle className="px-5 pt-2 text-lg font-semibold text-white">
          Sleep timer
        </SheetTitle>

        {isActive ? (
          <p className="tabular px-5 pt-1 text-sm text-white/60">
            {untilEndOfTrack
              ? "Stops at the end of this surah"
              : `Stops in ${formatDuration(remaining)}`}
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-2 px-5 pt-4">
          {PRESETS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                setMinutes(minutes);
                onOpenChange(false);
              }}
              className="min-h-12 rounded-xl bg-white/10 text-sm font-medium text-white"
            >
              {minutes} min
            </button>
          ))}
        </div>

        <div className="space-y-2 px-5 pt-3">
          <button
            type="button"
            onClick={() => {
              setUntilEndOfTrack();
              onOpenChange(false);
            }}
            className={cn(
              "min-h-12 w-full rounded-xl text-sm font-medium",
              untilEndOfTrack
                ? "bg-white text-black"
                : "bg-white/10 text-white",
            )}
          >
            End of this surah
          </button>

          <button
            type="button"
            onClick={() => {
              setMinutes(null);
              onOpenChange(false);
            }}
            disabled={!isActive}
            className="min-h-12 w-full rounded-xl text-sm font-medium text-white/60 disabled:opacity-40"
          >
            Turn off
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
