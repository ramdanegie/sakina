import type { ReciterDto } from "@/application/dto";

/**
 * One catalogue entry exists per *narration*, so a reciter who recorded the
 * Quran several times appears several times. That is correct data — Warsh and
 * Hafs really are different recitations — but a carousel showing the same
 * name and the same monogram four times in a row just looks broken.
 *
 * Carousels therefore show one entry per person (the most complete recording,
 * preferring Hafs on a tie). The full grid, search and direct links still
 * reach every narration.
 */
export function dedupeByPerson(
  reciters: readonly ReciterDto[],
): ReciterDto[] {
  const best = new Map<string, ReciterDto>();

  for (const reciter of reciters) {
    const key = reciter.nameLatin.toLowerCase();
    const incumbent = best.get(key);

    if (incumbent === undefined) {
      best.set(key, reciter);
      continue;
    }

    const better =
      reciter.surahCount > incumbent.surahCount ||
      (reciter.surahCount === incumbent.surahCount &&
        reciter.rewaya === "hafs" &&
        incumbent.rewaya !== "hafs");

    if (better) best.set(key, reciter);
  }

  return [...best.values()];
}

export function byPopularity(reciters: readonly ReciterDto[]): ReciterDto[] {
  return [...reciters].sort((a, b) => b.popularity - a.popularity);
}
