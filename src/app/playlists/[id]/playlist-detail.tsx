"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Play, Shuffle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { findSystemPlaylist } from "@/presentation/lib/system-playlists";
import { findAmbient } from "@/presentation/lib/ambient-list";
import {
  useReciters,
  useReciterTracks,
} from "@/presentation/hooks/use-catalog";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { cn } from "@/lib/utils";

/**
 * A curated playlist rendered against the most popular reciter available.
 *
 * The seed lists are surah numbers, not fixed tracks, so a playlist works with
 * whichever reciters the catalogue currently has rather than breaking when a
 * particular recording disappears upstream.
 */
export function PlaylistDetail({ id }: { id: string }) {
  const playlist = findSystemPlaylist(id);

  const { data: reciters } = useReciters();
  const primaryReciter = useMemo(() => {
    if (reciters === undefined || reciters.length === 0) return undefined;
    return [...reciters].sort((a, b) => b.popularity - a.popularity)[0];
  }, [reciters]);

  const { data: allTracks, isLoading } = useReciterTracks(primaryReciter?.id);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const selectAmbient = usePlayerStore((s) => s.selectAmbient);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);

  const tracks = useMemo(() => {
    if (playlist === null || allTracks === undefined) return [];
    if (playlist.surahs.length === 0) return [];
    const wanted = new Set(playlist.surahs);
    return allTracks.filter((track) => wanted.has(track.surahNumber));
  }, [playlist, allTracks]);

  if (playlist === null) {
    return (
      <div className="p-5 pt-16 text-center">
        <p className="text-muted-foreground">Playlist not found.</p>
        <Link href="/playlists" className="text-accent mt-3 inline-block text-sm">
          Back to playlists
        </Link>
      </div>
    );
  }

  /** Start the playlist and drop in its signature ambient bed. */
  async function start(shuffle: boolean) {
    if (tracks.length === 0 || playlist === null) return;

    const first = shuffle
      ? tracks[Math.floor(Math.random() * tracks.length)]
      : tracks[0];

    await playTrack(first, tracks);
    if (shuffle) toggleShuffle();

    if (playlist.defaultAmbient !== null) {
      const ambient = findAmbient(playlist.defaultAmbient);
      if (ambient !== null) await selectAmbient(ambient);
    }
  }

  return (
    <div className="pb-6">
      <header
        className={cn(
          "bg-gradient-to-b px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6",
          playlist.gradient,
        )}
      >
        <Link
          href="/playlists"
          aria-label="Back"
          className="glass mb-6 flex size-11 items-center justify-center rounded-full text-foreground"
        >
          <ChevronLeft className="size-5 flip-rtl" aria-hidden />
        </Link>

        <h1 className="text-3xl font-bold text-foreground">{playlist.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{playlist.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {tracks.length} surah{tracks.length === 1 ? "" : "s"}
          {primaryReciter !== undefined ? ` · ${primaryReciter.nameLatin}` : ""}
          {playlist.defaultAmbient !== null
            ? ` · ${findAmbient(playlist.defaultAmbient)?.name ?? ""}`
            : ""}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={tracks.length === 0}
            onClick={() => void start(false)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 font-semibold disabled:opacity-50"
          >
            <Play className="size-4 fill-current" aria-hidden />
            Play
          </button>

          <button
            type="button"
            disabled={tracks.length === 0}
            onClick={() => void start(true)}
            className="glass inline-flex min-h-11 items-center gap-2 rounded-full px-6 font-semibold text-foreground disabled:opacity-50"
          >
            <Shuffle className="size-4" aria-hidden />
            Shuffle
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-2 px-5 pt-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-muted" />
          ))}
        </div>
      ) : null}

      {playlist.surahs.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted-foreground">
          Nothing here yet. Star a surah from any reciter and it will show up.
        </p>
      ) : (
        <ul className="px-3 pt-2">
          {tracks.map((track) => {
            const active = track.id === currentTrackId;
            return (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => void playTrack(track, tracks)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-xl px-2 text-start",
                    active && "bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "tabular flex size-11 shrink-0 items-center justify-center rounded-lg text-sm",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {track.surahNumber}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {track.surahNameLatin}
                      <span className="font-arabic ms-2 text-muted-foreground">
                        {track.surahNameArabic}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {track.reciterName}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
