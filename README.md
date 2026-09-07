# Sakina

A mobile-first Quran audio player: 100+ reciters, ambient background sound
mixed underneath the recitation, listening streaks. Every feature is unlocked
for everyone — no tiers, no ads, no trial.

Built to the spec in [`PRD.md`](./PRD.md).

## Why it can be free

The app hosts no recitation audio. Reciter metadata comes from the public
mp3quran v3 API, and audio streams straight from its origin CDN to the
browser, so bandwidth stays near zero however many people listen. The whole
deployed site is about 13 MB.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui · Zustand ·
TanStack Query · Dexie (IndexedDB) · Vitest

## Architecture

Clean Architecture with DDD. The dependency rule is enforced in CI by
`dependency-cruiser`, not by convention:

```
src/
├── domain/          Pure TypeScript. No React, no Dexie, no fetch.
│   ├── recitation/  Reciter, Surah, RecitationTrack
│   ├── playback/    PlaybackSession (aggregate root), Queue
│   ├── ambience/    AmbientMix, AmbientSound
│   ├── library/     Playlist, Favorite
│   └── habit/       ListeningSession, streak domain service
├── application/     Use cases + ports (interfaces). Knows no adapter.
├── infrastructure/  Adapters: HTTP clients, audio engines, Dexie, DI container
└── presentation/    Zustand stores, hooks, components
    app/             Next.js routes
```

`pnpm arch:check` fails the build if a layer reaches the wrong way.

### Key invariants (enforced in the domain, covered by tests)

- A track can only be built for a surah the reciter actually recorded.
- Ambient gain is capped at 80% of the recitation gain — background sound can
  never bury the recitation.
- A track counts as "completed" only past 90%, so skipping cannot inflate a streak.
- Streaks are recomputed from raw session history, never stored as a counter
  that can drift.
- Today falling short does not break a streak; a *full missed day* does.

### The audio engine

Two channels, deliberately different technologies:

| Channel | Implementation | Why |
|---------|---------------|-----|
| Recitation | `HTMLAudioElement` | Streams, supports HTTP Range (seeking), needs no CORS from third-party CDNs |
| Ambient | Web Audio synthesis (noise → filters → LFOs) | No file to download, no loop seam, no third-party licence |

Each background sound also gets its own landscape: a public-domain photograph
from Wikimedia Commons layered over a drawn vector scene, so the backdrop is
never blank while the photo decodes or when the device is offline.

Each has its own gain node, which is what the two-fader mixer controls.

Ambient beds are **generated, not sampled** — rain is filtered noise, wind is a
swept lowpass, fire is a noise bed plus scheduled crackles. See
`infrastructure/audio/ambient-synth.ts`. Because the audio is produced
continuously there is no loop point at all, so an hour-long session never
develops the periodic click a looped file would.

## Getting started

```bash
pnpm install
pnpm dev
```

No audio assets to fetch — background sounds are synthesised at runtime, so
the app is fully functional straight after install.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm test` | Unit tests |
| `pnpm test:coverage` | Coverage (domain gated at 90%) |
| `pnpm arch:check` | Enforce layer boundaries |
| `pnpm verify` | lint + arch + tests |

## Status

**Done** — catalogue (100+ reciters, all narrations), reciter detail with all
114 surahs, per-surah offline download, persistent mini player, full-screen
player with a landscape per background sound, dual-channel volume mixer, 14
synthesised ambient beds, queue with reorder, sleep timer, playback speed,
shuffle/repeat, AirPlay/Cast where the platform supports it, insights with
streaks and daily goal, curated playlists, global search, light/dark/system
theme, six app-icon variants, QRIS donation sheet, credits, installable PWA
with an offline service worker.

**Not done** — account sync, i18n wiring (the language setting persists but UI
strings are still inline English), CarPlay (native-only; a web app cannot
reach it).

## Reading

Two ways in: the `ق` control inside the player, and a standalone page per
surah at `/surah/[number]` — reading no longer requires starting playback
first.

Arabic scripture belongs to no one. Translations and tafsir are the work of
named translators and scholars, so they are fetched from their publisher
(alquran.cloud) as you read and credited on screen — never bundled into this
repository, and deliberately never baked into the pre-rendered HTML. What ships
in the static pages is factual reference metadata only: surah number, names,
verse count, revelation place.

## SEO

Before: 124 pages sharing one title and description. Now:

- A page per surah (114) with its own title, description, keywords, canonical
  URL and `Article` structured data
- A surah index that is server-rendered, so the site's main internal link graph
  exists in the HTML rather than appearing after hydration
- `sitemap.xml` (231 URLs) and `robots.txt`, generated at build time
- Per-route metadata for every screen; personal ones (settings, insights,
  search, credits) are `noindex`
- Open Graph and Twitter cards, with the share image generated as a real
  `public/og.png`

That last point is not cosmetic. Next.js's `opengraph-image` route convention
emits an extensionless file under `output: export`, which static hosts serve
with no `Content-Type` — and social crawlers refuse an image without
`image/png`, so the card renders blank. The image is generated by
`scripts/make-icons.mjs` instead.

Set `NEXT_PUBLIC_SITE_URL` at build time when deploying to your own domain;
canonical tags pointing at the wrong host actively hurt ranking.

## Verse timings

The `ق` panel can follow the recitation, but only when it can prove it should. Arabic
scripture belongs to no one; translations and tafsir are the work of named
translators and scholars, so they are fetched from their publisher at read time
and credited on screen rather than bundled here.

Highlighting the ayah being recited is gated on evidence. Published timings
describe one specific recording, and two takes of the same surah by the same
reciter genuinely differ — measured directly, surah 112 by Alafasy runs 13.3s
on quran.com and 21.7s on the CDN this app streams. `VerseTimeline.alignsWith`
therefore compares the published source length against the real duration of the
audio playing and only allows highlighting within 2%. Everywhere else the panel
is a plain reader and says so. A highlight that drifts is worse than none: it
tells the reader they are in the wrong place with total confidence.

In practice that means sync stays dormant for the current catalogue. Enabling
it would mean offering quran.com's own recordings as an alternate audio source
for the reciters they have timed.

## Search

Transliterated Arabic is written a dozen ways and nobody types the
punctuation, so queries are matched against a normalised form: lowercased,
diacritics and Arabic vowel marks stripped, apostrophes and hyphens removed.
"Al mulk", "al-mulk" and "almulk" all find **Al-Mulk**. Reciter search also
matches terms in any order, so "husary warsh" finds the Warsh recording.

## App icon

Six variants, picked in Settings. iOS and Android copy the icon at install
time and never re-read it, so the choice applies to the *next* install —
changing an icon already on a home screen means removing and re-adding the
app. Settings says so rather than leaving it a mystery.

To use your own artwork, replace `public/icon.svg` and run
`node scripts/make-icons.mjs`.

## Deploying

Builds to plain static HTML, so it runs on any web host with no Node process
and no database:

```bash
./deploy.sh            # build + zip, ready to upload to cPanel
./deploy.sh --rsync    # build + push over SSH
./deploy.sh --local    # build + preview at localhost:8080
```

See [`DEPLOY.md`](./DEPLOY.md) for prerequisites and per-host settings.

## Known platform limitation

iOS standalone PWAs have a WebKit defect where audio left paused in the
background stops responding after ~30s until the app is foregrounded
([WebKit #261858](https://bugs.webkit.org/show_bug.cgi?id=261858)). This
affects the sleep and background-listening cases and cannot be fixed from
application code. Validate against a real iPhone before committing to
PWA-only distribution.
