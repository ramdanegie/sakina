import type { Metadata, Viewport } from "next";
import { Ubuntu, Ubuntu_Mono, Amiri } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/presentation/components/app-shell";
import { ServiceWorkerRegistrar } from "@/presentation/components/service-worker";
import { QueryProvider } from "@/presentation/components/query-provider";
import { ThemeProvider } from "@/presentation/components/theme-provider";

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
  title: "Sakina — Listen to the Quran, calmly",
  description:
    "Listen to the Quran from over a hundred reciters with ambient background sound. Every feature free, no ads, no subscription.",
  applicationName: "Sakina",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sakina",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Two entries so the OS chrome (status bar, task switcher) follows the
  // active theme instead of staying black behind a light UI.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
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
      className={`${ubuntuSans.variable} ${ubuntuMono.variable} ${amiri.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background flex min-h-full flex-col">
        <ThemeProvider>
          <QueryProvider>
            <AppShell>{children}</AppShell>
            <ServiceWorkerRegistrar />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
