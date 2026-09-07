"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { AMBIENT_SOUND_DTOS } from "@/presentation/lib/ambient-list";
import { AmbientIcon } from "./ambient-icon";
import { cn } from "@/lib/utils";

/**
 * The background sound grid.
 *
 * Every sound is available to everyone — there is no lock icon here, which is
 * the whole point of the product. All assets are CC0; attribution lives in
 * Settings → Credits.
 */
export function AmbientPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const ambient = usePlayerStore((s) => s.ambient);
  const selectAmbient = usePlayerStore((s) => s.selectAmbient);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return AMBIENT_SOUND_DTOS;
    return AMBIENT_SOUND_DTOS.filter((sound) =>
      sound.name.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85dvh] rounded-t-[28px] border-0 bg-neutral-900 pb-10"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Background sound</SheetTitle>

        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
            >
              <X className="size-5" aria-hidden />
            </button>

            <h3 className="text-lg font-semibold text-white">
              Background sound
            </h3>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Done"
              className="flex size-10 items-center justify-center rounded-full bg-white text-black"
            >
              <Check className="size-5" aria-hidden />
            </button>
          </div>

          <div className="relative px-5 py-4">
            <Search
              className="pointer-events-none absolute start-8 top-1/2 size-4 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Thunder…"
              aria-label="Search background sounds"
              className="h-11 rounded-full border-white/10 bg-white/5 ps-10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="no-scrollbar grid flex-1 grid-cols-3 gap-3 overflow-y-auto px-5 pb-6">
            {results.map((sound) => {
              const active =
                ambient?.id === sound.id ||
                (ambient === null && sound.id === "none");

              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => void selectAmbient(sound)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl p-3 transition-colors",
                    active ? "bg-white/15" : "bg-transparent",
                  )}
                >
                  {active ? (
                    <span
                      className="absolute end-3 top-3 flex size-5 items-center justify-center rounded-full bg-white"
                      aria-hidden
                    >
                      <Check className="size-3 text-black" />
                    </span>
                  ) : null}

                  <AmbientIcon
                    name={sound.icon}
                    className="size-8 text-white"
                  />
                  <span className="text-center text-sm text-white">
                    {sound.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
