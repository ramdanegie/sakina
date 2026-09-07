"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReciters, useSurahs } from "@/presentation/hooks/use-catalog";
import { AMBIENT_SOUND_DTOS } from "@/presentation/lib/ambient-list";
import { SYSTEM_PLAYLISTS } from "@/presentation/lib/system-playlists";
import { AmbientIcon } from "@/presentation/components/player/ambient-icon";
import { usePlayerStore } from "@/presentation/stores/player.store";
import { gradientFor, initialsOf } from "@/presentation/lib/format";
import { cn } from "@/lib/utils";

/**
 * Global search across reciters, surahs, playlists and ambient sounds.
 *
 * Filtering runs against the in-memory catalogue, so results are instant with
 * no request per keystroke. `useDeferredValue` keeps typing smooth while the
 * (larger) reciter list re-filters.
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim().toLowerCase();

  const { data: reciters } = useReciters();
  const surahs = useSurahs();
  const selectAmbient = usePlayerStore((s) => s.selectAmbient);

  const results = useMemo(() => {
    if (trimmed.length === 0) {
      return { reciters: [], surahs: [], playlists: [], ambient: [] };
    }

    return {
      reciters: (reciters ?? [])
        .filter(
          (r) =>
            r.nameLatin.toLowerCase().includes(trimmed) ||
            r.nameArabic.includes(trimmed),
        )
        .slice(0, 8),
      surahs: surahs
        .filter(
          (s) =>
            String(s.number) === trimmed ||
            s.nameLatin.toLowerCase().includes(trimmed) ||
            s.nameArabic.includes(trimmed) ||
            s.nameTranslation.toLowerCase().includes(trimmed),
        )
        .slice(0, 8),
      playlists: SYSTEM_PLAYLISTS.filter((p) =>
        p.name.toLowerCase().includes(trimmed),
      ),
      ambient: AMBIENT_SOUND_DTOS.filter((a) =>
        a.name.toLowerCase().includes(trimmed),
      ),
    };
  }, [trimmed, reciters, surahs]);

  const isEmpty =
    trimmed.length > 0 &&
    results.reciters.length === 0 &&
    results.surahs.length === 0 &&
    results.playlists.length === 0 &&
    results.ambient.length === 0;

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-4">
        <h1 className="mb-4 text-4xl font-bold text-white">Search</h1>

        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Reciters, surahs, sounds…"
            aria-label="Search"
            autoFocus
            className="h-12 rounded-full border-white/15 bg-white/10 ps-11 text-white placeholder:text-white/40"
          />
        </div>
      </header>

      <div className="space-y-8 px-5 pt-4">
        {trimmed.length === 0 ? (
          <p className="text-sm text-white/40">
            Search by reciter name, surah name or number, or a background sound.
          </p>
        ) : null}

        {isEmpty ? (
          <p className="text-sm text-white/50">
            Nothing matched &ldquo;{query}&rdquo;.
          </p>
        ) : null}

        {results.reciters.length > 0 ? (
          <Section title="Reciters">
            <ul className="space-y-1">
              {results.reciters.map((reciter) => (
                <li key={reciter.id}>
                  <Link
                    href={`/reciters/${reciter.slug}`}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-1"
                  >
                    <Avatar className="size-11">
                      <AvatarImage src={reciter.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback
                        className={cn(
                          "bg-gradient-to-br text-xs font-semibold text-white",
                          gradientFor(reciter.id),
                        )}
                      >
                        {initialsOf(reciter.nameLatin)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-white">
                        {reciter.nameLatin}
                      </span>
                      <span className="block truncate text-sm text-white/50">
                        {reciter.surahCount} surahs
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {results.surahs.length > 0 ? (
          <Section title="Surahs">
            <ul className="space-y-1">
              {results.surahs.map((surah) => (
                <li
                  key={surah.number}
                  className="flex min-h-14 items-center gap-3 px-1"
                >
                  <span className="tabular flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm text-white/70">
                    {surah.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-white">
                      {surah.nameLatin}
                      <span className="font-arabic ms-2 text-white/60">
                        {surah.nameArabic}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-white/50">
                      {surah.nameTranslation}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {results.playlists.length > 0 ? (
          <Section title="Playlists">
            <ul className="space-y-1">
              {results.playlists.map((playlist) => (
                <li key={playlist.id}>
                  <Link
                    href={`/playlists/${playlist.id}`}
                    className="flex min-h-14 items-center gap-3 px-1"
                  >
                    <span
                      className={cn(
                        "size-11 shrink-0 rounded-lg bg-gradient-to-br",
                        playlist.gradient,
                      )}
                      aria-hidden
                    />
                    <span className="truncate text-white">{playlist.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {results.ambient.length > 0 ? (
          <Section title="Background sounds">
            <ul className="space-y-1">
              {results.ambient.map((sound) => (
                <li key={sound.id}>
                  <button
                    type="button"
                    onClick={() => void selectAmbient(sound)}
                    className="flex min-h-14 w-full items-center gap-3 px-1 text-start"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <AmbientIcon
                        name={sound.icon}
                        className="size-5 text-white"
                      />
                    </span>
                    <span className="truncate text-white">{sound.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {children}
    </section>
  );
}
