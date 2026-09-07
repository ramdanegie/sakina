# Quran Audio — free forever

A mobile-first Quran audio player: 100+ reciters, ambient background sound
mixed underneath the recitation, listening streaks. Every feature is unlocked
for everyone — no tiers, no ads, no trial.

Built to the spec in [`PRD.md`](./PRD.md).

## Why it can be free

The app hosts no recitation audio. Reciter metadata comes from the public
mp3quran v3 API, and audio streams straight from its origin CDN to the
browser. Hosting cost is the static app shell plus ~10MB of ambient loops.

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
streaks and daily goal, curated playlists, global search, settings, credits.

**Not done** — Quran text/lyrics panel, PWA service worker, account sync, i18n
wiring (strings are currently inline English).

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
