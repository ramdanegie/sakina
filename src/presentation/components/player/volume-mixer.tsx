"use client";

import { Volume, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePlayerStore } from "@/presentation/stores/player.store";

/**
 * The dual-channel mixer — the feature the whole product is built around.
 *
 * Two independent faders: recitation and background bed. The domain caps the
 * ambient level at 80% of the recitation level, so dragging the background
 * fader to the top can never bury the recitation. When the Quran fader drops,
 * the ambient value shown here drops with it — that is the ceiling being
 * re-applied, not a UI bug.
 */
export function VolumeMixer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const quranVolume = usePlayerStore((s) => s.quranVolume);
  const ambientVolume = usePlayerStore((s) => s.ambientVolume);
  const setQuranVolume = usePlayerStore((s) => s.setQuranVolume);
  const setAmbientVolume = usePlayerStore((s) => s.setAmbientVolume);
  const ambient = usePlayerStore((s) => s.ambient);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass rounded-t-[28px] border-0 pb-10"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Volume mixer</SheetTitle>

        <div className="space-y-6 px-5 pt-2">
          <div className="space-y-2">
            <p className="text-sm text-white/60">Quran</p>
            <div className="flex items-center gap-3">
              <VolumeX className="size-5 shrink-0 text-white/50" aria-hidden />
              <Slider
                value={[quranVolume]}
                min={0}
                max={1}
                step={0.01}
                aria-label="Recitation volume"
                onValueChange={([value]) => setQuranVolume(value)}
                className="flex-1"
              />
              <Volume2 className="size-5 shrink-0 text-white/50" aria-hidden />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-white/60">
              Background sound
              {ambient !== null ? (
                <span className="text-white/40"> · {ambient.name}</span>
              ) : null}
            </p>
            <div className="flex items-center gap-3">
              <VolumeX className="size-5 shrink-0 text-white/50" aria-hidden />
              <Slider
                value={[ambientVolume]}
                min={0}
                max={1}
                step={0.01}
                aria-label="Background sound volume"
                disabled={ambient === null}
                onValueChange={([value]) => setAmbientVolume(value)}
                className="flex-1"
              />
              <Volume className="size-5 shrink-0 text-white/50" aria-hidden />
            </div>
            {ambient === null ? (
              <p className="text-xs text-white/40">
                Pick a background sound to enable this fader.
              </p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
