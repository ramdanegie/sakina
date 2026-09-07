"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * User preferences that only affect the UI or playback defaults.
 *
 * Deliberately in localStorage rather than IndexedDB: these are a handful of
 * scalars that the very first render needs, and awaiting a database read for
 * them would make the app flash the wrong state on every load. Listening
 * history and downloads — the data that actually matters — stay in IndexedDB.
 *
 * Theme is NOT stored here. next-themes owns it, because it also has to write
 * the class onto <html> before first paint to avoid a flash.
 */

export const AudioQuality = {
  Auto: "auto",
  Low: "64",
  High: "128",
} as const;

export type AudioQuality = (typeof AudioQuality)[keyof typeof AudioQuality];

export const Language = {
  Indonesian: "id",
  English: "en",
  Arabic: "ar",
} as const;

export type Language = (typeof Language)[keyof typeof Language];

export const ArabicFontSize = {
  Small: "sm",
  Medium: "md",
  Large: "lg",
} as const;

export type ArabicFontSize =
  (typeof ArabicFontSize)[keyof typeof ArabicFontSize];

interface SettingsState {
  audioQuality: AudioQuality;
  autoplayNext: boolean;
  /** Download only when the connection is not metered, where detectable. */
  downloadOnWifiOnly: boolean;
  language: Language;
  arabicFontSize: ArabicFontSize;
  /** Short vibration on play/pause and other confirmations. */
  hapticFeedback: boolean;

  setAudioQuality: (quality: AudioQuality) => void;
  setAutoplayNext: (enabled: boolean) => void;
  setDownloadOnWifiOnly: (enabled: boolean) => void;
  setLanguage: (language: Language) => void;
  setArabicFontSize: (size: ArabicFontSize) => void;
  setHapticFeedback: (enabled: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  audioQuality: AudioQuality.Auto,
  autoplayNext: true,
  downloadOnWifiOnly: false,
  language: Language.Indonesian,
  arabicFontSize: ArabicFontSize.Medium,
  hapticFeedback: true,
} as const;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setAudioQuality: (audioQuality) => set({ audioQuality }),
      setAutoplayNext: (autoplayNext) => set({ autoplayNext }),
      setDownloadOnWifiOnly: (downloadOnWifiOnly) => set({ downloadOnWifiOnly }),
      setLanguage: (language) => set({ language }),
      setArabicFontSize: (arabicFontSize) => set({ arabicFontSize }),
      setHapticFeedback: (hapticFeedback) => set({ hapticFeedback }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "sakina-settings",
      version: 1,
    },
  ),
);

/** Labels for the settings rows, kept next to the values they describe. */
export const AUDIO_QUALITY_LABELS: Record<AudioQuality, string> = {
  [AudioQuality.Auto]: "Auto",
  [AudioQuality.Low]: "Data saver (64 kbps)",
  [AudioQuality.High]: "High (128 kbps)",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.Indonesian]: "Bahasa Indonesia",
  [Language.English]: "English",
  [Language.Arabic]: "العربية",
};

export const ARABIC_FONT_SIZE_LABELS: Record<ArabicFontSize, string> = {
  [ArabicFontSize.Small]: "Small",
  [ArabicFontSize.Medium]: "Medium",
  [ArabicFontSize.Large]: "Large",
};
