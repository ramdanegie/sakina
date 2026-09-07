import { Reciter } from "@/domain/recitation/reciter.entity";
import type { Rewaya } from "@/domain/recitation/value-objects";
import type { ReciterRepository } from "@/domain/repositories";
import { DomainError, Err, Ok, type Result } from "@/domain/shared/result";
import { getDb, type ReciterRow } from "../persistence/db";
import { Mp3QuranClient } from "./mp3quran.client";

/** Catalogue cache lifetime. Reciters change on the order of months. */
const TTL_MS = 7 * 86_400_000;

function toRow(reciter: Reciter, serverBaseUrl: string): ReciterRow {
  return {
    id: reciter.id,
    slug: reciter.slug,
    nameLatin: reciter.nameLatin,
    nameArabic: reciter.nameArabic,
    countryCode: reciter.countryCode,
    rewaya: reciter.rewaya,
    avatarUrl: reciter.avatarUrl,
    serverBaseUrl,
    availableSurahs: [...reciter.availableSurahs],
    isNew: reciter.isNew ? 1 : 0,
    popularity: reciter.popularity,
    syncedAt: Date.now(),
  };
}

function toReciter(row: ReciterRow): Reciter | null {
  const result = Reciter.create({
    id: row.id,
    slug: row.slug,
    nameLatin: row.nameLatin,
    nameArabic: row.nameArabic,
    countryCode: row.countryCode,
    rewaya: row.rewaya as Rewaya,
    avatarUrl: row.avatarUrl,
    serverBaseUrl: row.serverBaseUrl,
    availableSurahs: row.availableSurahs,
    isNew: row.isNew === 1,
    popularity: row.popularity,
  });
  return result.ok ? result.value : null;
}

/**
 * Reciter catalogue with an offline-first read path.
 *
 * Read order: IndexedDB cache -> network. A stale cache is preferred over a
 * failed request, so a dead CDN degrades into "yesterday's catalogue" rather
 * than an empty screen.
 *
 * The domain Reciter does not expose its serverBaseUrl (nothing outside the
 * aggregate should build URLs), so it is carried alongside for the round trip.
 */
export class CachedReciterRepository implements ReciterRepository {
  private memo: Reciter[] | null = null;

  constructor(private readonly client = new Mp3QuranClient()) {}

  async findAll(): Promise<Result<Reciter[]>> {
    if (this.memo !== null) return Ok(this.memo);

    const cached = await this.readCache();
    if (cached !== null && cached.length > 0) {
      this.memo = cached;
      // Refresh in the background; the user sees data immediately.
      void this.refresh();
      return Ok(cached);
    }

    return this.refresh();
  }

  async findById(id: string): Promise<Result<Reciter | null>> {
    const all = await this.findAll();
    if (!all.ok) return all;
    return Ok(all.value.find((r) => r.id === id) ?? null);
  }

  async findBySlug(slug: string): Promise<Result<Reciter | null>> {
    const all = await this.findAll();
    if (!all.ok) return all;
    return Ok(all.value.find((r) => r.slug === slug) ?? null);
  }

  async search(query: string): Promise<Result<Reciter[]>> {
    const all = await this.findAll();
    if (!all.ok) return all;
    return Ok(all.value.filter((r) => r.matches(query)));
  }

  async findByCountry(countryCode: string): Promise<Result<Reciter[]>> {
    const all = await this.findAll();
    if (!all.ok) return all;
    return Ok(all.value.filter((r) => r.countryCode === countryCode));
  }

  private async refresh(): Promise<Result<Reciter[]>> {
    try {
      const reciters = await this.client.listReciters();
      if (reciters.length === 0) {
        return Err(
          DomainError.of("catalog.empty", "Catalogue source returned no reciters"),
        );
      }

      this.memo = reciters;
      await this.writeCache(reciters);
      return Ok(reciters);
    } catch (error) {
      // Network failed — fall back to whatever is cached, however stale.
      const cached = await this.readCache(true);
      if (cached !== null && cached.length > 0) {
        this.memo = cached;
        return Ok(cached);
      }
      return Err(
        DomainError.of(
          "catalog.unavailable",
          "Could not load the reciter catalogue",
          { cause: String(error) },
        ),
      );
    }
  }

  private async readCache(ignoreTtl = false): Promise<Reciter[] | null> {
    const db = getDb();
    if (db === null) return null;

    try {
      const rows = await db.reciters.toArray();
      if (rows.length === 0) return null;

      if (!ignoreTtl) {
        const freshest = Math.max(...rows.map((r) => r.syncedAt));
        if (Date.now() - freshest > TTL_MS) return null;
      }

      return rows
        .map(toReciter)
        .filter((r): r is Reciter => r !== null);
    } catch {
      return null;
    }
  }

  private async writeCache(reciters: Reciter[]): Promise<void> {
    const db = getDb();
    if (db === null) return;

    try {
      const rows = reciters.map((reciter) =>
        toRow(reciter, reciter.serverBaseUrl),
      );
      await db.reciters.bulkPut(rows);
    } catch {
      // A cache write failure must never break playback.
    }
  }
}
