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
import type { ReciterDto } from "@/application/dto";

export default function RecitersPage() {
  const { data, isLoading, isError } = useReciters();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const all = data ?? [];
    const q = query.trim().toLowerCase();
    if (q.length === 0) return null;
    return all.filter(
      (r) =>
        r.nameLatin.toLowerCase().includes(q) ||
        r.nameArabic.includes(q) ||
        r.slug.includes(q),
    );
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
      <header className="screen-header safe-top px-5 pt-4 pb-4">
        <h1 className="mb-4 text-4xl font-bold text-white">Reciters</h1>

        <div className="relative">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reciters"
            aria-label="Search reciters"
            className="h-12 rounded-full border-white/15 bg-white/10 ps-11 text-white placeholder:text-white/40"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4 px-5 pt-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full bg-white/10" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="px-5 pt-6 text-sm text-white/50">
          Could not load reciters. Check your connection.
        </p>
      ) : null}

      {filtered !== null ? (
        <div className="px-5 pt-6">
          <p className="mb-4 text-sm text-white/50">
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
