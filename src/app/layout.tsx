import type { Metadata, Viewport } from "next";
import { Ubuntu, Ubuntu_Mono, Amiri } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/presentation/components/app-shell";
import { QueryProvider } from "@/presentation/components/query-provider";

/**
 * Ubuntu is not a variable font, so the weights actually used are declared
 * explicitly — requesting the full range would ship files nobody renders.
 */
const ubuntuSans = Ubuntu({
  variable: "--font-ubuntu-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

/** Timers, durations and stats — needs tabular figures, not proportional. */
const ubuntuMono = Ubuntu_Mono({
  variable: "--font-ubuntu-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

/**
 * Amiri is a metrically-compatible open Quranic typeface. Loaded as a
 * self-hosted variable font rather than a CDN link so the Arabic column does
 * not reflow on slow connections.
 */
const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quran Audio — Free Forever",
  description:
    "Listen to the Quran from over a hundred reciters with ambient background sound. Every feature free, no ads, no subscription.",
  applicationName: "Quran Audio",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Quran Audio",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Required for env(safe-area-inset-*) to report real values on notched phones.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`dark ${ubuntuSans.variable} ${ubuntuMono.variable} ${amiri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background flex min-h-full flex-col">
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
