import { Surah } from "@/domain/recitation/surah.entity";
import { SurahNumber } from "@/domain/recitation/value-objects";
import type { SurahRepository } from "@/domain/repositories";
import { SURAH_DATA } from "./surah-data";

/**
 * Surah metadata never changes, so it is built once at module load from the
 * bundled table. Synchronous by design — no promise, no loading state, no
 * skeleton for the surah list.
 */
const SURAHS: readonly Surah[] = SURAH_DATA.map((record) => {
  const number = SurahNumber.create(record.number);
  if (!number.ok) {
    throw new Error(`Corrupt surah table at entry ${record.number}`);
  }
  return Surah.create({
    number: number.value,
    nameLatin: record.nameLatin,
    nameArabic: record.nameArabic,
    nameTranslation: record.nameTranslation,
    ayahCount: record.ayahCount,
    revelationPlace: record.revelationPlace,
  });
});

export class StaticSurahRepository implements SurahRepository {
  private readonly byNumber = new Map(SURAHS.map((s) => [s.number.value, s]));

  findAll(): Surah[] {
    return [...SURAHS];
  }

  findByNumber(number: number): Surah | null {
    return this.byNumber.get(number) ?? null;
  }

  search(query: string): Surah[] {
    return SURAHS.filter((surah) => surah.matches(query));
  }
}

export const surahRepository = new StaticSurahRepository();
