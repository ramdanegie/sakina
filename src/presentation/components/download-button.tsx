"use client";

import { CloudDownload, Check, Loader2 } from "lucide-react";
import type { TrackDto } from "@/application/dto";
import { useDownloadStore } from "@/presentation/stores/download.store";
import { cn } from "@/lib/utils";

/**
 * Per-surah download control.
 *
 * Three states, all in one 44px target: available (cloud), running (ring
 * showing real progress), done (tick). Tapping a completed row deletes the
 * cached file, so the same control both gives and takes back space.
 */
export function DownloadButton({ track }: { track: TrackDto }) {
  const downloaded = useDownloadStore((s) => s.completed.has(track.id));
  const ratio = useDownloadStore((s) => s.progress.get(track.id));
  const toggle = useDownloadStore((s) => s.toggle);

  const isDownloading = ratio !== undefined;

  return (
    <button
      type="button"
      onClick={(event) => {
        // The row itself starts playback; downloading must not also play.
        event.stopPropagation();
        void toggle(track);
      }}
      disabled={isDownloading}
      aria-label={
        downloaded
          ? `Remove downloaded ${track.surahNameLatin}`
          : isDownloading
            ? `Downloading ${track.surahNameLatin}, ${Math.round((ratio ?? 0) * 100)} percent`
            : `Download ${track.surahNameLatin}`
      }
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
        downloaded ? "text-success" : "text-white/45",
      )}
    >
      {isDownloading ? (
        <ProgressRing ratio={ratio} />
      ) : downloaded ? (
        <Check className="size-5" aria-hidden />
      ) : (
        <CloudDownload className="size-5" aria-hidden />
      )}
    </button>
  );
}

/**
 * Determinate ring while bytes are arriving, falling back to a spinner when
 * the server sends no Content-Length and real progress is unknowable.
 */
function ProgressRing({ ratio }: { ratio: number }) {
  if (ratio <= 0) {
    return <Loader2 className="size-5 animate-spin" aria-hidden />;
  }

  const radius = 9;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.2"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        className="text-accent transition-[stroke-dashoffset] duration-200"
      />
    </svg>
  );
}
