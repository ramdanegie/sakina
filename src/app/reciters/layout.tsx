import type { Metadata } from "next";
import { APP_URL } from "@/presentation/lib/app-meta";

/**
 * Metadata for a client-rendered route.
 *
 * A "use client" page cannot export `metadata`, so it lives in the layout —
 * which stays a server component and is where Next.js reads it from anyway.
 */
export const metadata: Metadata = {
  title: "Quran Reciters — 100+ Qaris, Free",
  description:
    "Browse over a hundred Quran reciters including Mishary Alafasy, Abdul Basit, As-Sudais, Al-Husary and Al-Minshawi. Stream or download every surah free, with no subscription.",
  keywords: ["qari quran", "reciters", "murottal", "mishary alafasy", "abdul basit", "as sudais", "quran mp3"],
  alternates: { canonical: `${APP_URL}/reciters/` },
  openGraph: {
    type: "website",
    url: `${APP_URL}/reciters/`,
    title: "Quran Reciters — 100+ Qaris, Free",
    description:
      "Browse over a hundred Quran reciters including Mishary Alafasy, Abdul Basit, As-Sudais, Al-Husary and Al-Minshawi. Stream or download every surah free, with no subscription.",
    siteName: "Sakina",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
