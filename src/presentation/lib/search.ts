import type { ReciterDto, SurahDto } from "@/application/dto";
import { matchesAllTerms, matchesQuery } from "@/domain/shared/text-match";

/**
 * Search helpers for DTO-shaped lists.
 *
 * Route components cannot import the domain directly (the architecture rules
 * forbid it), but they still need the same matching behaviour the entities
 * use — otherwise "Al mulk" would find Al-Mulk on one screen and not another.
 * This module is the sanctioned bridge.
 */

export function surahMatches(surah: SurahDto, query: string): boolean {
  const q = query.trim();
  if (q.length === 0) return true;
  if (String(surah.number) === q) return true;

  return (
    matchesQuery(surah.nameLatin, q) ||
    matchesQuery(surah.nameArabic, q) ||
    matchesQuery(surah.nameTranslation, q)
  );
}

export function reciterMatches(reciter: ReciterDto, query: string): boolean {
  const q = query.trim();
  if (q.length === 0) return true;

  return matchesAllTerms(
    `${reciter.nameLatin} ${reciter.nameArabic} ${reciter.slug} ${reciter.rewaya}`,
    q,
  );
}

export function nameMatches(name: string, query: string): boolean {
  return matchesQuery(name, query);
}
