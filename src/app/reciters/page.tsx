"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ReciterRow, ReciterCard } from "@/presentation/components/reciter-card";
import { useReciters } from "@/presentation/hooks/use-catalog";
import { countryNameOf } from "@/presentation/lib/format";
import {
  byPopularity,
  dedupeByPerson,
} from "@/presentation/lib/reciter-grouping";
import { reciterMatches } from "@/presentation/lib/search";
import type { ReciterDto } from "@/application/dto";

export default function RecitersPage() {
  const { data, isLoading, isError } = useReciters();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const all = data ?? [];
    const q = query.trim();
    if (q.length === 0) return null;
    return all.filter((r) => reciterMatches(r, q));
  }, [data, query]);

  const groups = useMemo(() => {
    // Carousels show one card per person; the search grid below still lists
    // every narration separately.
    const unique = dedupeByPerson(data ?? []);

    // Only surface countries with enough reciters to fill a row.
    const byCountry = new Map<string, ReciterDto[]>();
    for (const reciter of unique) {
      const key = reciter.countryCode ?? "OTHER";
      const bucket = byCountry.get(key) ?? [];
      bucket.push(reciter);
      byCountry.set(key, bucket);
    }

    const countries = [...byCountry.entries()]
      .filter(([code, list]) => code !== "OTHER" && list.length >= 3)
      .sort((a, b) => b[1].length - a[1].length);

    return {
      top: byPopularity(unique).slice(0, 12),
      updated: unique.filter((r) => r.isNew).slice(0, 12),
      countries,
    };
  }, [data]);

  return (
    <div className="pb-6">
      <header className="screen-header px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Reciters</h1>

        <div className="relative">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reciters"
            aria-label="Search reciters"
            className="h-12 rounded-full border-border bg-muted ps-11 text-foreground placeholder:text-muted-foreground/70"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4 px-5 pt-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full bg-muted" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="px-5 pt-6 text-sm text-muted-foreground">
          Could not load reciters. Check your connection.
        </p>
      ) : null}

      {filtered !== null ? (
        <div className="px-5 pt-6">
          <p className="mb-4 text-sm text-muted-foreground">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-6">
            {filtered.map((reciter) => (
              <div key={reciter.id} className="flex justify-center">
                <ReciterCard reciter={reciter} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 pt-6">
          <ReciterRow
            title="Top reciters"
            icon={<Star className="fill-ochre-500 text-ochre-500 size-5" aria-hidden />}
            reciters={groups.top}
          />

          <ReciterRow
            title="Recently updated"
            reciters={groups.updated}
            showNewBadge
          />

          {groups.countries.map(([code, list]) => (
            <ReciterRow
              key={code}
              title={`From ${countryNameOf(code)}`}
              reciters={list.slice(0, 12)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
