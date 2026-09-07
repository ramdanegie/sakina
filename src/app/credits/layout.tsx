import type { Metadata } from "next";

/**
 * Metadata for a client-rendered route.
 *
 * A "use client" page cannot export `metadata`, so it lives in the layout —
 * which stays a server component and is where Next.js reads it from anyway.
 */
export const metadata: Metadata = {
  title: "Credits & Licences",
  description:
    "Sources and licences for the audio, text, imagery and typefaces used in Sakina.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
