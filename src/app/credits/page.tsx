"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AMBIENT_SOUND_DTOS } from "@/presentation/lib/ambient-list";
import { SCENERY_CREDIT_ENTRIES } from "@/presentation/lib/scenery-credits";

/**
 * Public attribution page.
 *
 * Required, not decorative: shipping CC0 audio is only defensible if the
 * provenance of every asset is stated somewhere a user can actually reach.
 */
export default function CreditsPage() {
  const sounds = AMBIENT_SOUND_DTOS.filter((sound) => sound.id !== "none");

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <Link
          href="/settings"
          aria-label="Back"
          className="glass mb-4 flex size-11 items-center justify-center rounded-full text-white"
        >
          <ChevronLeft className="size-5 flip-rtl" aria-hidden />
        </Link>
        <h1 className="text-3xl font-bold text-white">Credits & licences</h1>
      </header>

      <div className="space-y-6 px-5">
        <section className="bg-card space-y-3 rounded-2xl p-4">
          <h2 className="font-semibold text-white">Recitation audio</h2>
          <p className="text-sm text-white/60">
            Recitations are streamed directly from their original public CDNs.
            This app does not re-host or redistribute any recitation audio.
          </p>
          <ul className="space-y-2 text-sm">
            <Source
              name="mp3quran.net"
              href="https://mp3quran.net"
              note="Primary reciter catalogue and audio hosting"
            />
            <Source
              name="QuranicAudio.com"
              href="https://quranicaudio.com"
              note="Secondary audio source"
            />
            <Source
              name="Quran Foundation"
              href="https://api-docs.quran.foundation"
              note="Canonical surah and verse metadata"
            />
          </ul>
        </section>

        <section className="bg-card space-y-3 rounded-2xl p-4">
          <h2 className="font-semibold text-white">Background sounds</h2>
          <p className="text-sm text-white/60">
            No audio files are shipped or downloaded. Every background sound is
            generated live in your browser from noise and filters, so it never
            repeats and works offline.
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {sounds.map((sound) => (
              <li key={sound.id} className="text-white/80">
                {sound.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card space-y-3 rounded-2xl p-4">
          <h2 className="font-semibold text-white">Player backdrops</h2>
          <p className="text-sm text-white/60">
            Each background sound has its own landscape. All photography is
            public domain or CC0 from Wikimedia Commons — no attribution is
            required, but the photographers are listed here anyway.
          </p>
          <ul className="space-y-2 text-sm">
            {SCENERY_CREDIT_ENTRIES.map(([id, credit]) => (
              <li key={id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-white capitalize">
                    {id.replace(/-/g, " ")}
                  </span>
                  <span className="block truncate text-xs text-white/50">
                    {credit.author} · {credit.licence}
                  </span>
                </span>
                <a
                  href={credit.source}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent shrink-0 text-xs"
                >
                  Source
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card space-y-3 rounded-2xl p-4">
          <h2 className="font-semibold text-white">Typefaces</h2>
          <ul className="space-y-2 text-sm">
            <Source
              name="Amiri"
              href="https://github.com/aliftype/amiri"
              note="Arabic text — OFL"
            />
            <Source
              name="Ubuntu / Ubuntu Mono"
              href="https://fonts.google.com/specimen/Ubuntu"
              note="Interface and numerals — Ubuntu Font Licence 1.0"
            />
          </ul>
        </section>
      </div>
    </div>
  );
}

function Source({
  name,
  href,
  note,
}: {
  name: string;
  href: string;
  note: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="min-w-0">
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent block truncate"
        >
          {name}
        </a>
        <span className="block truncate text-xs text-white/50">{note}</span>
      </span>
    </li>
  );
}
