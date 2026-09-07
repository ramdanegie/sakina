"use client";

import Link from "next/link";
import { ChevronLeft, Play, Shuffle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DownloadButton } from "@/presentation/components/download-button";
import { useDownloads } from "@/presentation/hooks/use-downloads";
import { useReciter, useReciterTracks } from "@/presentation/hooks/use-catalog";
import { usePlayerStore } from "@/presentation/stores/player.store";
import {
  countryNameOf,
  gradientFor,
  initialsOf,
  rewayaLabel,
} from "@/presentation/lib/format";
import { cn } from "@/lib/utils";

export function ReciterDetail({ slug }: { slug: string }) {
  const { data: reciter, isLoading } = useReciter(slug);
  const { data: tracks } = useReciterTracks(reciter?.id);
  useDownloads();

  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);

  if (isLoading) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="size-32 rounded-full bg-white/10" />
        <Skeleton className="h-8 w-48 bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
      </div>
    );
  }

  if (reciter == null) {
    return (
      <div className="p-5 pt-16 text-center">
        <p className="text-white/60">Reciter not found.</p>
        <Link href="/reciters" className="text-accent mt-3 inline-block text-sm">
          Back to reciters
        </Link>
      </div>
    );
  }

  const list = tracks ?? [];

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <Link
          href="/reciters"
          aria-label="Back"
          className="glass mb-4 flex size-11 items-center justify-center rounded-full text-white"
        >
          <ChevronLeft className="size-5 flip-rtl" aria-hidden />
        </Link>

        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="size-32">
            <AvatarImage src={reciter.avatarUrl ?? undefined} alt="" />
            <AvatarFallback
              className={cn(
                "bg-gradient-to-br text-3xl font-semibold text-white",
                gradientFor(reciter.id),
              )}
            >
              {initialsOf(reciter.nameLatin)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold text-white">
              {reciter.nameLatin}
            </h1>
            <p className="font-arabic text-lg text-white/70">
              {reciter.nameArabic}
            </p>
            <p className="mt-1 text-sm text-white/50">
              {countryNameOf(reciter.countryCode)} ·{" "}
              {rewayaLabel(reciter.rewaya)} · {reciter.surahCount} surahs
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={list.length === 0}
              onClick={() => void playTrack(list[0], list)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 font-semibold text-black disabled:opacity-50"
            >
              <Play className="size-4 fill-current" aria-hidden />
              Play all
            </button>

            <button
              type="button"
              disabled={list.length === 0}
              onClick={() => {
                const random = list[Math.floor(Math.random() * list.length)];
                void playTrack(random, list);
                toggleShuffle();
              }}
              className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold text-white disabled:opacity-50"
            >
              <Shuffle className="size-4" aria-hidden />
              Shuffle
            </button>
          </div>
        </div>
      </header>

      <ul className="px-3">
        {list.map((track) => {
          const active = track.id === currentTrackId;
          return (
            <li
              key={track.id}
              className={cn(
                "flex items-center gap-1 rounded-xl",
                active && "bg-white/5",
              )}
            >
              <button
                type="button"
                onClick={() => void playTrack(track, list)}
                className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-2 text-start"
              >
                <span
                  className={cn(
                    "tabular flex size-11 shrink-0 items-center justify-center rounded-lg text-sm",
                    active ? "bg-white text-black" : "bg-white/10 text-white/70",
                  )}
                >
                  {track.surahNumber}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">
                    {track.surahNameLatin}
                    <span className="font-arabic ms-2 text-white/60">
                      {track.surahNameArabic}
                    </span>
                  </span>
                  <span className="block truncate text-sm text-white/50">
                    {track.surahNameTranslation}
                  </span>
                </span>
              </button>

              <DownloadButton track={track} />
            </li>
          );
        })}
      </ul>

      {list.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-white/50">
          No recordings available for this reciter.
        </p>
      ) : null}
    </div>
  );
}
