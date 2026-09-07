import type { Metadata } from "next";
import Link from "next/link";
import { listSurahMeta } from "@/infrastructure/di/static-params";
import { APP_URL } from "@/presentation/lib/app-meta";

/**
 * Index of all 114 surahs.
 *
 * A server component on purpose: the list is the site's main internal link
 * graph, so it has to exist in the HTML rather than appear after hydration.
 * The data here is factual reference metadata only.
 */

export const metadata: Metadata = {
  title: "Read the Quran — All 114 Surahs",
  description:
    "Browse and read all 114 surahs of the Quran with Arabic text, Indonesian and English translation, and tafsir. Free audio from over a hundred reciters, no subscription.",
  keywords: [
    "quran online",
    "baca al quran",
    "al quran lengkap",
    "114 surah",
    "quran terjemahan",
    "tafsir quran",
    "murottal",
  ],
  alternates: { canonical: `${APP_URL}/surah/` },
  openGraph: {
    type: "website",
    url: `${APP_URL}/surah/`,
    title: "Read the Quran — All 114 Surahs",
    description:
      "Arabic text, translation and tafsir for every surah, with free recitation audio.",
    siteName: "Sakina",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function SurahIndexPage() {
  const surahs = listSurahMeta();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Surahs of the Quran",
    numberOfItems: surahs.length,
    itemListElement: surahs.map((surah) => ({
      "@type": "ListItem",
      position: surah.number,
      name: surah.nameLatin,
      url: `${APP_URL}/surah/${surah.number}/`,
    })),
  };

  return (
    <div className="pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="screen-header px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
        <h1 className="text-foreground text-4xl font-bold">Read</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All 114 surahs, with translation and tafsir.
        </p>
      </header>

      <ul className="px-3">
        {surahs.map((surah) => (
          <li key={surah.number}>
            <Link
              href={`/surah/${surah.number}`}
              className="flex min-h-16 items-center gap-3 rounded-xl px-2"
            >
              <span className="tabular bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg text-sm">
                {surah.number}
              </span>

              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate font-medium">
                  {surah.nameLatin}
                </span>
                <span className="text-muted-foreground block truncate text-sm">
                  {surah.nameTranslation} · {surah.ayahCount} verses
                </span>
              </span>

              <span className="font-arabic text-muted-foreground shrink-0 text-lg">
                {surah.nameArabic}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
