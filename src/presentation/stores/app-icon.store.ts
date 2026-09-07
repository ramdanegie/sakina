"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface IconVariant {
  readonly id: string;
  readonly name: string;
  /** Representative colour, used for the swatch ring in the picker. */
  readonly accent: string;
}

/**
 * Icon variants. Mirrors `public/icons/variants.json`, which is produced by
 * `scripts/make-icons.mjs`; kept as a literal so the picker needs no fetch.
 */
export const ICON_VARIANTS: readonly IconVariant[] = [
  { id: "sage", name: "Sage", accent: "#6d8172" },
  { id: "terracotta", name: "Terracotta", accent: "#b08268" },
  { id: "midnight", name: "Midnight", accent: "#2c3a5c" },
  { id: "maroon", name: "Maroon", accent: "#8a5560" },
  { id: "ochre", name: "Ochre", accent: "#c2a05e" },
  { id: "ink", name: "Ink", accent: "#3a3a3a" },
];

export const DEFAULT_ICON_ID = "sage";

export function iconPath(id: string, size: 32 | 180 | 192 | 512): string {
  return `/icons/${id}-${size}.png`;
}

interface AppIconState {
  iconId: string;
  setIconId: (id: string) => void;
}

/**
 * Applies the chosen icon to the live document.
 *
 * This is what makes the choice real rather than cosmetic: iOS reads
 * `apple-touch-icon` at the moment the user taps "Add to Home Screen", and
 * Android reads the manifest at install time. Rewriting those tags before
 * installation means the home-screen icon is the one the user picked.
 *
 * It cannot change an icon that is already on a home screen — both platforms
 * copy the image at install time and never re-read it. The Settings screen
 * says so plainly rather than letting the user wonder why nothing changed.
 */
function applyIcon(id: string): void {
  if (typeof document === "undefined") return;

  const set = (selector: string, href: string, create: () => HTMLLinkElement) => {
    let link = document.head.querySelector<HTMLLinkElement>(selector);
    if (link === null) {
      link = create();
      document.head.appendChild(link);
    }
    link.href = href;
  };

  set('link[rel="apple-touch-icon"]', iconPath(id, 180), () => {
    const link = document.createElement("link");
    link.rel = "apple-touch-icon";
    return link;
  });

  set('link[rel="icon"][type="image/png"]', iconPath(id, 32), () => {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    return link;
  });

  set('link[rel="icon"][type="image/svg+xml"]', `/icons/${id}.svg`, () => {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    return link;
  });

  // Rewrite the manifest as a blob so Android installs pick up the choice too.
  // Fetching and patching it is the only way; a manifest cannot be templated
  // at runtime from a static export.
  void (async () => {
    try {
      const response = await fetch("/manifest.webmanifest");
      if (!response.ok) return;

      const manifest = await response.json();
      manifest.icons = [
        { src: iconPath(id, 192), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: iconPath(id, 512), sizes: "512x512", type: "image/png", purpose: "any" },
        { src: iconPath(id, 512), sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

      const blob = new Blob([JSON.stringify(manifest)], {
        type: "application/manifest+json",
      });
      const url = URL.createObjectURL(blob);

      const link = document.head.querySelector<HTMLLinkElement>(
        'link[rel="manifest"]',
      );
      if (link !== null) link.href = url;
    } catch {
      // The static manifest stays in place; only the chosen icon is lost.
    }
  })();
}

export const useAppIconStore = create<AppIconState>()(
  persist(
    (set) => ({
      iconId: DEFAULT_ICON_ID,
      setIconId: (iconId) => {
        applyIcon(iconId);
        set({ iconId });
      },
    }),
    {
      name: "sakina-app-icon",
      version: 1,
      // Re-apply on load: the served HTML always ships the default icon, so
      // without this a saved choice would be forgotten on every visit.
      onRehydrateStorage: () => (state) => {
        if (state?.iconId !== undefined) applyIcon(state.iconId);
      },
    },
  ),
);
