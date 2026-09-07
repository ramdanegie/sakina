import type { Metadata } from "next";
import { APP_URL } from "@/presentation/lib/app-meta";

/**
 * Metadata for a client-rendered route.
 *
 * A "use client" page cannot export `metadata`, so it lives in the layout —
 * which stays a server component and is where Next.js reads it from anyway.
 */
export const metadata: Metadata = {
  title: "Quran Playlists — Focus, Sleep, Ruqyah",
  description:
    "Curated Quran playlists for focus and work, sleep, ruqyah and reflection, each paired with an ambient background sound. Free, no subscription.",
  keywords: ["quran playlist", "murottal tidur", "ruqyah", "quran for focus", "sleep quran"],
  alternates: { canonical: `${APP_URL}/playlists/` },
  openGraph: {
    type: "website",
    url: `${APP_URL}/playlists/`,
    title: "Quran Playlists — Focus, Sleep, Ruqyah",
    description:
      "Curated Quran playlists for focus and work, sleep, ruqyah and reflection, each paired with an ambient background sound. Free, no subscription.",
    siteName: "Sakina",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
