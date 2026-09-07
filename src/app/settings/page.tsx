"use client";

import Link from "next/link";
import {
  Bug,
  ChevronRight,
  Code2,
  Download,
  Heart,
  Info,
  Languages,
  Lightbulb,
  Share2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

/**
 * Settings.
 *
 * Where the reference app puts a "Subscriptions" block, this puts "Support us":
 * nothing here is gated, so the only ask is a voluntary one.
 */
export default function SettingsPage() {
  async function shareApp() {
    const url = typeof window === "undefined" ? "" : window.location.origin;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Sakina — listen to the Quran, calmly",
          text: "Listen to the Quran with ambient background sound. Every feature free.",
          url,
        });
        return;
      } catch {
        // User dismissed the share sheet.
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard != null) {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <h1 className="text-4xl font-bold text-white">Settings</h1>
      </header>

      <div className="space-y-6 px-5">
        <div className="rounded-2xl bg-white p-4 text-black">
          <div className="flex items-center gap-3">
            <Heart className="size-8 shrink-0 fill-rose-500 text-rose-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-bold">Everything is already unlocked</p>
              <p className="text-sm text-black/60">
                No subscription, no ads, no locked features. If it is useful,
                consider supporting the running costs.
              </p>
            </div>
          </div>
        </div>

        <Group label="Support us">
          <Row icon={<Heart className="size-5" />} label="Donate" href="/support" />
          <Row
            icon={<Share2 className="size-5" />}
            label="Share this app"
            onClick={() => void shareApp()}
          />
          <Row
            icon={<Code2 className="size-5" />}
            label="Contribute on GitHub"
            href="https://github.com"
            external
          />
        </Group>

        <Group label="Playback">
          <Row
            icon={<SlidersHorizontal className="size-5" />}
            label="Audio quality"
            value="Auto"
          />
          <Row
            icon={<SlidersHorizontal className="size-5" />}
            label="Autoplay next surah"
            value="On"
          />
        </Group>

        <Group label="Downloads">
          <Row
            icon={<Download className="size-5" />}
            label="Download manager"
            value="0 items"
          />
          <Row
            icon={<Trash2 className="size-5" />}
            label="Clear cached audio"
          />
        </Group>

        <Group label="Appearance & language">
          <Row
            icon={<SlidersHorizontal className="size-5" />}
            label="Theme"
            value="Dark"
          />
          <Row
            icon={<Languages className="size-5" />}
            label="Language"
            value="Bahasa Indonesia"
          />
        </Group>

        <Group label="Feedback">
          <Row
            icon={<Lightbulb className="size-5" />}
            label="Request a feature"
          />
          <Row icon={<Bug className="size-5" />} label="Report a bug" />
        </Group>

        <Group label="About">
          <Row
            icon={<Info className="size-5" />}
            label="Credits & audio licences"
            href="/credits"
          />
          <Row icon={<Info className="size-5" />} label="Version" value="0.1.0" />
        </Group>
      </div>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm text-white/50">{label}</h2>
      <div className="bg-card divide-y divide-white/5 overflow-hidden rounded-2xl">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  href,
  external = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 text-white">{label}</span>
      {value !== undefined ? (
        <span className="text-sm text-white/50">{value}</span>
      ) : null}
      <ChevronRight className="size-4 flip-rtl text-white/30" aria-hidden />
    </>
  );

  const className =
    "flex min-h-14 w-full items-center gap-3 px-4 text-start";

  if (href !== undefined) {
    return external ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={className}
      >
        {content}
      </a>
    ) : (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
