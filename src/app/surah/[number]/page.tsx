import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  findSurahMeta,
  listSurahMeta,
} from "@/infrastructure/di/static-params";
import { APP_URL } from "@/presentation/lib/app-meta";
import { SurahReader } from "./surah-reader";

/**
 * A page per surah — 114 of them.
 *
 * Two jobs at once. It makes reading reachable without starting playback
 * first, and it gives the site real indexable content: before this, all 124
 * pages shared a single title and description, which is close to invisible to
 * a search engine.
 *
 * What is pre-rendered here is factual reference data — number, names, ayah
 * count, revelation place. The verse text, translations and tafsir load in the
 * browser from their publisher and are credited there; they are the work of
 * named translators and scholars and do not belong in this app's HTML.
 */

export function generateStaticParams() {
  return listSurahMeta().map((surah) => ({ number: String(surah.number) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  const surah = findSurahMeta(Number.parseInt(number, 10));
  if (surah === null) return { title: "Surah not found" };

  const title = `Surah ${surah.nameLatin} (${surah.nameArabic}) — Read & Listen`;
  const description =
    `Read Surah ${surah.nameLatin}, the ${ordinal(surah.number)} surah of the Quran, ` +
    `with ${surah.ayahCount} verses. ${capitalise(surah.revelationPlace)} revelation. ` +
    `Arabic text, Indonesian and English translation, tafsir, and free audio from over ` +
    `a hundred reciters.`;

  const url = `${APP_URL}/surah/${surah.number}/`;

  return {
    title,
    description,
    keywords: [
      `surah ${surah.nameLatin}`,
      `surat ${surah.nameLatin}`,
      surah.nameArabic,
      surah.nameIndonesian,
      `baca surah ${surah.nameLatin}`,
      `murottal ${surah.nameLatin}`,
      "quran online",
      "al quran",
    ],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Sakina",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function SurahPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const surah = findSurahMeta(Number.parseInt(number, 10));
  if (surah === null) notFound();

  // Structured data helps search engines show the surah name and position
  // rather than guessing from the page title.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Surah ${surah.nameLatin} (${surah.nameArabic})`,
    description: `Surah ${surah.nameLatin} — ${surah.nameTranslation}. ${surah.ayahCount} verses, ${surah.revelationPlace} revelation.`,
    inLanguage: ["ar", "id", "en"],
    isPartOf: {
      "@type": "Book",
      name: "The Holy Quran",
      alternateName: "القرآن الكريم",
    },
    position: surah.number,
    url: `${APP_URL}/surah/${surah.number}/`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SurahReader surah={surah} />
    </>
  );
}
