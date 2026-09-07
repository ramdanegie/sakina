"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { SYSTEM_PLAYLISTS } from "@/presentation/lib/system-playlists";
import { cn } from "@/lib/utils";

/**
 * Curated playlists.
 *
 * Each tile is a themed lens on the same catalogue — "Sleep Mode" and
 * "Focus & Work" differ by which surahs and which default ambient bed they
 * start with, not by which content is unlocked.
 */
export default function PlaylistsPage() {
  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <h1 className="text-4xl font-bold text-white">Playlists</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 px-5">
        {SYSTEM_PLAYLISTS.map((playlist) => (
          <Link
            key={playlist.id}
            href={`/playlists/${playlist.id}`}
            className={cn(
              "relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-4",
              playlist.gradient,
            )}
          >
            {/* Faint geometric ornament, matching the reference tiles. */}
            <svg
              className="pointer-events-none absolute inset-0 size-full opacity-10"
              viewBox="0 0 100 100"
              aria-hidden
            >
              {playlist.ornament === "rings" ? (
                <>
                  <circle cx="70" cy="30" r="18" fill="none" stroke="white" strokeWidth="0.5" />
                  <circle cx="70" cy="30" r="28" fill="none" stroke="white" strokeWidth="0.5" />
                  <circle cx="70" cy="30" r="38" fill="none" stroke="white" strokeWidth="0.5" />
                </>
              ) : playlist.ornament === "rays" ? (
                Array.from({ length: 12 }, (_, i) => (
                  <line
                    key={i}
                    x1="50"
                    y1="50"
                    x2={50 + 60 * Math.cos((i * Math.PI) / 6)}
                    y2={50 + 60 * Math.sin((i * Math.PI) / 6)}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                ))
              ) : (
                Array.from({ length: 10 }, (_, i) => (
                  <ellipse
                    key={i}
                    cx="50"
                    cy="50"
                    rx="12"
                    ry="40"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.5"
                    transform={`rotate(${i * 18} 50 50)`}
                  />
                ))
              )}
            </svg>

            {playlist.id === "favourites" ? (
              <Star
                className="absolute inset-0 m-auto size-20 fill-white text-white drop-shadow-lg"
                aria-hidden
              />
            ) : null}

            <span className="relative text-lg leading-tight font-bold text-white">
              {playlist.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
