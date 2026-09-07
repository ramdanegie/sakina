/**
 * Single source of truth for the app's public identity.
 *
 * Settings links, issue templates and the version row all read from here, so
 * a rename or a move to a different repository is one edit rather than a
 * grep across the UI.
 */

export const APP_NAME = "Sakina";
export const APP_TAGLINE = "Listen to the Quran, calmly";
export const APP_VERSION = "0.1.0";

/**
 * Canonical origin, used for canonical URLs, Open Graph and the sitemap.
 *
 * Override with NEXT_PUBLIC_SITE_URL at build time when deploying to your own
 * domain — canonical tags pointing at the wrong host actively hurt ranking.
 */
export const APP_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sakina.app"
).replace(/\/+$/, "");

export const APP_REPOSITORY_URL = "https://github.com/ramdanegie/sakina";
export const APP_AUTHOR_URL = "https://github.com/ramdanegie";
