"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bug,
  Code2,
  Download,
  Gauge,
  Heart,
  Info,
  Languages,
  Lightbulb,
  Monitor,
  Moon,
  Share2,
  SkipForward,
  Smartphone,
  Sun,
  Trash2,
  Type,
  Vibrate,
  Wifi,
} from "lucide-react";
import { DonateSheet } from "@/presentation/components/settings/donate-dialog";
import {
  AfterMount,
  ChoiceRow,
  NavigationRow,
  SettingsGroup,
  ToggleRow,
  type Choice,
} from "@/presentation/components/settings/setting-rows";
import {
  formatBytes,
  useStorageStats,
} from "@/presentation/hooks/use-storage-stats";
import {
  ARABIC_FONT_SIZE_LABELS,
  AUDIO_QUALITY_LABELS,
  ArabicFontSize,
  AudioQuality,
  LANGUAGE_LABELS,
  Language,
  useSettingsStore,
} from "@/presentation/stores/settings.store";
import { APP_REPOSITORY_URL, APP_VERSION } from "@/presentation/lib/app-meta";

type ThemeChoice = "light" | "dark" | "system";

const THEME_CHOICES: readonly Choice<ThemeChoice>[] = [
  { value: "dark", label: "Dark", description: "Easiest on the eyes at night" },
  { value: "light", label: "Light" },
  { value: "system", label: "System", description: "Follow your device setting" },
];

const AUDIO_QUALITY_CHOICES: readonly Choice<AudioQuality>[] = [
  {
    value: AudioQuality.Auto,
    label: AUDIO_QUALITY_LABELS[AudioQuality.Auto],
    description: "Match the connection",
  },
  {
    value: AudioQuality.Low,
    label: AUDIO_QUALITY_LABELS[AudioQuality.Low],
    description: "Roughly half the data",
  },
  {
    value: AudioQuality.High,
    label: AUDIO_QUALITY_LABELS[AudioQuality.High],
    description: "Best available",
  },
];

const LANGUAGE_CHOICES: readonly Choice<Language>[] = (
  Object.values(Language) as Language[]
).map((value) => ({ value, label: LANGUAGE_LABELS[value] }));

const FONT_SIZE_CHOICES: readonly Choice<ArabicFontSize>[] = (
  Object.values(ArabicFontSize) as ArabicFontSize[]
).map((value) => ({ value, label: ARABIC_FONT_SIZE_LABELS[value] }));

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const settings = useSettingsStore();
  const { stats, clear, isLoading } = useStorageStats();
  const [clearing, setClearing] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);


  async function shareApp() {
    const url = typeof window === "undefined" ? "" : window.location.origin;
    const payload = {
      title: "Sakina — listen to the Quran, calmly",
      text: "Listen to the Quran with ambient background sound. Every feature free.",
      url,
    };

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // Share sheet dismissed; fall through to the clipboard.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard != null) {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }
  }

  async function clearDownloads() {
    if (stats.downloadCount === 0) {
      toast.info("Nothing downloaded yet");
      return;
    }

    setClearing(true);
    await clear();
    setClearing(false);
    toast.success("Downloaded audio removed");
  }

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <h1 className="text-foreground text-4xl font-bold">Settings</h1>
      </header>

      <div className="space-y-6 px-5">
        <div className="bg-card border-border/50 rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <Heart
              className="size-8 shrink-0 fill-rose-500 text-rose-500"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-bold">
                Everything is already unlocked
              </p>
              <p className="text-muted-foreground text-sm">
                No subscription, no ads, no locked features. If it is useful,
                consider supporting the running costs.
              </p>
            </div>
          </div>
        </div>

        <SettingsGroup label="Support us">
          <NavigationRow
            icon={<Heart className="size-5" />}
            label="Donate"
            onClick={() => setDonateOpen(true)}
          />
          <NavigationRow
            icon={<Share2 className="size-5" />}
            label="Share this app"
            onClick={() => void shareApp()}
          />
          <NavigationRow
            icon={<Code2 className="size-5" />}
            label="Contribute on GitHub"
            href={APP_REPOSITORY_URL}
            external
          />
        </SettingsGroup>

        <SettingsGroup label="Appearance">
          <AfterMount>
            <AfterMount>
            <ChoiceRow
                icon={
                  theme === "light" ? (
                    <Sun className="size-5" />
                  ) : theme === "system" ? (
                    <Monitor className="size-5" />
                  ) : (
                    <Moon className="size-5" />
                  )
                }
                label="Theme"
                value={(theme as ThemeChoice) ?? "dark"}
                choices={THEME_CHOICES}
                onChange={setTheme}
              />
            </AfterMount>
            <ChoiceRow
              icon={<Type className="size-5" />}
              label="Arabic text size"
              value={settings.arabicFontSize}
              choices={FONT_SIZE_CHOICES}
              onChange={settings.setArabicFontSize}
            />
          </AfterMount>
          <AfterMount>
            <ChoiceRow
              icon={<Languages className="size-5" />}
              label="Language"
              value={settings.language}
              choices={LANGUAGE_CHOICES}
              onChange={settings.setLanguage}
            />
          </AfterMount>
        </SettingsGroup>

        <SettingsGroup label="Playback">
          <AfterMount>
            <ChoiceRow
              icon={<Gauge className="size-5" />}
              label="Audio quality"
              value={settings.audioQuality}
              choices={AUDIO_QUALITY_CHOICES}
              onChange={settings.setAudioQuality}
            />
          </AfterMount>
          <AfterMount>
            <ToggleRow
              icon={<SkipForward className="size-5" />}
              label="Autoplay next surah"
              description="Continue to the next surah when one ends"
              checked={settings.autoplayNext}
              onCheckedChange={settings.setAutoplayNext}
            />
          </AfterMount>
          <AfterMount>
            <ToggleRow
              icon={<Vibrate className="size-5" />}
              label="Haptic feedback"
              description="Short vibration on play, pause and favourite"
              checked={settings.hapticFeedback}
              onCheckedChange={settings.setHapticFeedback}
            />
          </AfterMount>
        </SettingsGroup>

        <SettingsGroup
          label="Downloads"
          footnote={
            stats.freeBytes === null
              ? undefined
              : `${formatBytes(stats.freeBytes)} of space still available.`
          }
        >
          <NavigationRow
            icon={<Download className="size-5" />}
            label="Downloaded surahs"
            value={
              isLoading
                ? "…"
                : `${stats.downloadCount} · ${formatBytes(stats.usedBytes)}`
            }
            href="/reciters"
          />
          <AfterMount>
            <ToggleRow
              icon={<Wifi className="size-5" />}
              label="Download on Wi-Fi only"
              description="Skip downloads on a metered connection"
              checked={settings.downloadOnWifiOnly}
              onCheckedChange={settings.setDownloadOnWifiOnly}
            />
          </AfterMount>
          <NavigationRow
            icon={<Trash2 className="size-5" />}
            label={clearing ? "Removing…" : "Clear downloaded audio"}
            value={isLoading ? undefined : formatBytes(stats.usedBytes)}
            onClick={() => void clearDownloads()}
          />
        </SettingsGroup>

        <SettingsGroup
          label="Home screen"
          footnote="iOS and Android copy the icon when the app is added. Changing it later needs a fresh install."
        >
          <NavigationRow
            icon={<Smartphone className="size-5" />}
            label="App icon"
            href="/settings/icon"
          />
        </SettingsGroup>

        <SettingsGroup label="Feedback">
          <NavigationRow
            icon={<Lightbulb className="size-5" />}
            label="Request a feature"
            href={`${APP_REPOSITORY_URL}/issues/new?labels=enhancement`}
            external
          />
          <NavigationRow
            icon={<Bug className="size-5" />}
            label="Report a bug"
            href={`${APP_REPOSITORY_URL}/issues/new?labels=bug`}
            external
          />
        </SettingsGroup>

        <SettingsGroup label="About">
          <NavigationRow
            icon={<Info className="size-5" />}
            label="Credits & licences"
            href="/credits"
          />
          <NavigationRow
            icon={<Info className="size-5" />}
            label="Version"
            value={APP_VERSION}
            href={APP_REPOSITORY_URL}
            external
          />
        </SettingsGroup>
      </div>

      <DonateSheet open={donateOpen} onOpenChange={setDonateOpen} />
    </div>
  );
}
