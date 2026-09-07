# Credits & Licences

This app hosts **no recitation audio**. Every recitation is streamed directly
from its original public CDN, and every ambient loop is CC0 or public domain.

## Recitation audio & catalogue

| Source | Use | Notes |
|--------|-----|-------|
| [mp3quran.net](https://mp3quran.net) | Primary reciter catalogue + audio hosting | Public API v3, no key required |
| [QuranicAudio.com](https://quranicaudio.com) | Secondary audio source | Fallback provider |
| [Quran Foundation Content API](https://api-docs.quran.foundation) | Canonical surah/verse metadata | OAuth2 client credentials, server-side only |
| [Al Quran Cloud](https://alquran.cloud/api) | Text/translation fallback | No key required |
| [EveryAyah](https://everyayah.com) | Per-ayah audio (verse highlighting) | Planned, phase 2 |

Surah reference data bundled in `src/infrastructure/content/surah-data.ts`
(numbers, names, ayah counts, revelation place) is factual catalogue metadata.

## Ambient sounds — generated, not sampled

No ambient audio files ship with this app and none are downloaded. Every bed
is synthesised in the browser from noise, filters and LFOs by
`src/infrastructure/audio/ambient-synth.ts`.

That choice is deliberate:

- **No licence surface.** The output is original work of our own code, so
  there is no third-party rights holder, no attribution obligation, and no
  chance of shipping a wrongly-licensed clip.
- **No loop seam.** The audio is generated continuously rather than looped, so
  an hour-long session never develops the periodic click that gives away a
  30-second loop.
- **Nothing to download.** Beds start instantly and work offline from first
  launch, on any connection.

Beds available: `rain`, `birds`, `fire`, `wave`, `wind`, `river`, `crickets`,
`thunder-storm`, `thunder`, `owl`, `cat`, `whale`, `train`, `night-forest`.

Player backdrops are CSS gradients (`presentation/lib/ambient-list.ts`), not
photographs, for the same reason.

### If you later swap in recorded audio

`AmbientMixerPort.play()` still takes a URL, so a file-backed pack can drop in
without touching callers. If you do that, the original rules apply: **CC0 or
public domain only**, verify the licence per file, and avoid Pixabay audio —
its licence forbids redistributing audio on a standalone basis, which a grid
of downloadable ambient loops comes close to.

## Typefaces

| Font | Use | Licence |
|------|-----|---------|
| [Ubuntu](https://fonts.google.com/specimen/Ubuntu) | Interface | Ubuntu Font Licence 1.0 |
| [Ubuntu Mono](https://fonts.google.com/specimen/Ubuntu+Mono) | Timers, durations, stats | Ubuntu Font Licence 1.0 |
| [Amiri](https://github.com/aliftype/amiri) | Arabic text | OFL |

## Icons

[Lucide](https://lucide.dev) — ISC.
