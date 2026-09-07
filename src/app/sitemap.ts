import type { MetadataRoute } from "next";
import {
  listPlaylistIds,
  listReciterSlugs,
  listSurahMeta,
} from "@/infrastructure/di/static-params";
import { APP_URL } from "@/presentation/lib/app-meta";

/**
 * Sitemap, generated at build time.
 *
 * Priorities reflect what the site is actually for: the surah pages are the
 * content, so they rank above the app's utility screens. Settings and credits
 * are excluded entirely — they carry nothing worth indexing.
 */
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${APP_URL}/surah/`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${APP_URL}/reciters/`, priority: 0.8, changeFrequency: "weekly" },
    { url: `${APP_URL}/playlists/`, priority: 0.6, changeFrequency: "monthly" },
  ];

  // Scripture does not change; a yearly hint keeps crawlers from re-fetching
  // 114 pages that will never differ.
  const surahs: MetadataRoute.Sitemap = listSurahMeta().map((surah) => ({
    url: `${APP_URL}/surah/${surah.number}/`,
    priority: 0.9,
    changeFrequency: "yearly",
  }));

  const playlists: MetadataRoute.Sitemap = listPlaylistIds().map((id) => ({
    url: `${APP_URL}/playlists/${id}/`,
    priority: 0.5,
    changeFrequency: "monthly",
  }));

  let reciters: MetadataRoute.Sitemap = [];
  try {
    const slugs = await listReciterSlugs();
    reciters = slugs.map((slug) => ({
      url: `${APP_URL}/reciters/${slug}/`,
      priority: 0.7,
      changeFrequency: "monthly",
    }));
  } catch {
    // A sitemap missing the reciter pages is better than a failed build.
  }

  return [...staticRoutes, ...surahs, ...reciters, ...playlists].map(
    (entry) => ({ ...entry, lastModified: now }),
  );
}
