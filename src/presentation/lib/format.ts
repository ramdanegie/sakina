/** Presentation-only formatting helpers. No domain logic lives here. */

/** "1:26" / "1:02:05". Mirrors Duration.format in the domain for DTO seconds. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** "-0:04" — the remaining-time readout on the right of the scrubber. */
export function formatRemaining(position: number, duration: number): string {
  const remaining = Math.max(0, duration - position);
  return `-${formatDuration(remaining)}`;
}

/** "111 min" / "2h 5m" for the Insights cards. */
export function formatMinutes(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** Two-letter monogram for reciters with no photo. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic gradient per reciter, so an avatar-less reciter still has a
 * stable identity across sessions instead of flickering colours.
 */
/**
 * Earth-tone pairings for generated reciter monograms.
 *
 * Each gradient runs from one pigment into a deeper neighbouring one rather
 * than into a darker shade of itself, which keeps the tiles from looking
 * washed out at avatar size while staying within the natural palette.
 */
const GRADIENTS = [
  "from-sage-500 to-olive-800",
  "from-terracotta-500 to-maroon-800",
  "from-ochre-500 to-clay-800",
  "from-clay-500 to-maroon-800",
  "from-olive-500 to-sage-800",
  "from-rust-500 to-maroon-800",
  "from-sand-500 to-clay-800",
  "from-sage-500 to-clay-800",
  "from-terracotta-500 to-rust-800",
  "from-ochre-500 to-olive-800",
] as const;

export function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

const COUNTRY_NAMES: Readonly<Record<string, string>> = {
  SA: "Saudi Arabia",
  EG: "Egypt",
  KW: "Kuwait",
  AE: "United Arab Emirates",
  LY: "Libya",
  IN: "India",
  PK: "Pakistan",
  KZ: "Kazakhstan",
  UZ: "Uzbekistan",
  MA: "Morocco",
  DZ: "Algeria",
  YE: "Yemen",
  JO: "Jordan",
  SD: "Sudan",
  ID: "Indonesia",
};

export function countryNameOf(code: string | null): string {
  if (code === null) return "Other";
  return COUNTRY_NAMES[code] ?? code;
}

const REWAYA_LABELS: Readonly<Record<string, string>> = {
  hafs: "Hafs 'an 'Asim",
  warsh: "Warsh 'an Nafi'",
  qalun: "Qalun 'an Nafi'",
  duri: "Ad-Duri",
  shubah: "Shu'bah",
  bazzi: "Al-Bazzi",
  susi: "As-Susi",
  other: "Other narration",
};

export function rewayaLabel(rewaya: string): string {
  return REWAYA_LABELS[rewaya] ?? rewaya;
}
