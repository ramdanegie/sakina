"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, Heart, Play, Star, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ReciterRow } from "@/presentation/components/reciter-card";
import { InsightsCard } from "@/presentation/components/insights-card";
import {
  useReciters,
  useReciterTracks,
  usePlaybackState,
} from "@/presentation/hooks/use-catalog";
import { usePlayerStore } from "@/presentation/stores/player.store";
import {
  byPopularity,
  dedupeByPerson,
} from "@/presentation/lib/reciter-grouping";
import { cn } from "@/lib/utils";
import { gradientFor, initialsOf } from "@/presentation/lib/format";

export default function HomePage() {
  const { data: reciters, isLoading, isError } = useReciters();
  const { data: lastState } = usePlaybackState();

  const sections = useMemo(() => {
    const unique = dedupeByPerson(reciters ?? []);
    return {
      popular: byPopularity(unique).slice(0, 12),
      updated: unique.filter((r) => r.isNew).slice(0, 12),
    };
  }, [reciters]);

  const lastReciter = useMemo(() => {
    if (lastState == null || reciters === undefined) return null;
    return reciters.find((r) => r.id === lastState.reciterId) ?? null;
  }, [lastState, reciters]);

  return (
    <div className="pb-6">
      <header className="screen-header px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground">Home</h1>

          <div className="flex items-center gap-2">
            {/* Where the reference app puts "Premium". Everything here is
                already unlocked, so this asks for support instead of payment. */}
            <Link
              href="/settings"
              className="glass flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-foreground"
            >
              <Heart className="size-4" aria-hidden />
              Support
            </Link>

            <Link
              href="/insights"
              aria-label="Insights"
              className="glass flex size-11 items-center justify-center rounded-full text-foreground"
            >
              <BarChart3 className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        <div className="px-5">
          <div className="bg-card flex items-center gap-3 rounded-2xl p-4">
            <span className="bg-accent flex size-12 shrink-0 items-center justify-center rounded-full">
              <Sparkles className="text-accent-foreground size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">Everything unlocked</p>
              <p className="truncate text-sm text-muted-foreground">
                All reciters, all background sounds — free, forever.
              </p>
            </div>
          </div>
        </div>

        {lastReciter !== null ? (
          <ContinueListening
            reciterId={lastReciter.id}
            name={lastReciter.nameLatin}
            avatarUrl={lastReciter.avatarUrl}
            surahNumber={lastState?.surahNumber ?? 1}
          />
        ) : null}

        <div className="px-5">
          <InsightsCard />
        </div>

        {isLoading ? <CarouselSkeleton /> : null}

        {isError ? (
          <p className="px-5 text-sm text-muted-foreground">
            Could not load the reciter catalogue. Check your connection and pull
            to refresh.
          </p>
        ) : null}

        <ReciterRow
          title="Popular"
          icon={<Star className="text-ochre-500 size-5 fill-current" aria-hidden />}
          reciters={sections.popular}
          seeAllHref="/reciters"
        />

        {/* The upstream `date` is a last-modified stamp, not an added date,
            so this is honestly labelled as updated rather than new. */}
        <ReciterRow
          title="Recently updated"
          reciters={sections.updated}
          seeAllHref="/reciters"
          showNewBadge
        />
      </div>
    </div>
  );
}

/** Resumes the last surah at the exact second it was left. */
function ContinueListening({
  reciterId,
  name,
  avatarUrl,
  surahNumber,
}: {
  reciterId: string;
  name: string;
  avatarUrl: string | null;
  surahNumber: number;
}) {
  const { data: tracks } = useReciterTracks(reciterId);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const track = tracks?.find((t) => t.surahNumber === surahNumber) ?? null;

  return (
    <section className="flex items-center gap-4 px-5">
      <Avatar className="size-24 shrink-0">
        <AvatarImage src={avatarUrl ?? undefined} alt="" />
        <AvatarFallback
          className={cn(
            "bg-gradient-to-br text-lg font-semibold text-white",
            gradientFor(reciterId),
          )}
        >
          {initialsOf(name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">Recently played</p>
        <p className="truncate text-xl font-bold text-foreground">{name}</p>

        <button
          type="button"
          disabled={track === null}
          onClick={() => {
            if (track !== null) void playTrack(track, tracks);
          }}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 font-semibold disabled:opacity-50"
        >
          <Play className="size-4 fill-current" aria-hidden />
          Continue listening
        </button>
      </div>
    </section>
  );
}

function CarouselSkeleton() {
  return (
    <div className="space-y-3 px-5">
      <Skeleton className="h-7 w-40 bg-muted" />
      <div className="flex gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex w-28 shrink-0 flex-col items-center gap-2">
            <Skeleton className="size-28 rounded-full bg-muted" />
            <Skeleton className="h-4 w-20 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
