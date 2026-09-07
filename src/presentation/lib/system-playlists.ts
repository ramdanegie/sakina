import { SystemPlaylistKind } from "@/domain/library/playlist.aggregate";

/**
 * Curated playlist definitions.
 *
 * `surahs` is the seed selection and `defaultAmbient` the bed that best suits
 * the mood — picking "Sleep Mode" should land the listener in the right place
 * in one tap, rather than making them assemble it from the picker.
 */
export interface SystemPlaylistDefinition {
  readonly id: string;
  readonly kind: SystemPlaylistKind;
  readonly name: string;
  readonly description: string;
  readonly gradient: string;
  readonly ornament: "rings" | "rays" | "petals";
  readonly surahs: readonly number[];
  readonly defaultAmbient: string | null;
}

export const SYSTEM_PLAYLISTS: readonly SystemPlaylistDefinition[] = [
  {
    id: "favourites",
    kind: SystemPlaylistKind.Favourites,
    name: "Favourites",
    description: "Everything you have starred.",
    gradient: "from-neutral-700 to-neutral-900",
    ornament: "rings",
    surahs: [],
    defaultAmbient: null,
  },
  {
    id: "focus-work",
    kind: SystemPlaylistKind.FocusWork,
    name: "Focus & Work",
    description: "Long, steady recitations to sit behind deep work.",
    gradient: "from-sky-500 via-blue-700 to-slate-950",
    ornament: "rings",
    // Longer surahs: fewer transitions means fewer interruptions.
    surahs: [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 16, 17, 18, 20, 21, 23, 26],
    defaultAmbient: "rain",
  },
  {
    id: "most-beautiful",
    kind: SystemPlaylistKind.MostBeautiful,
    name: "Most Beautiful Recitations",
    description: "The passages listeners return to most.",
    gradient: "from-rose-500 via-pink-600 to-purple-900",
    ornament: "petals",
    surahs: [12, 18, 19, 20, 36, 55, 56, 67, 75, 78, 87, 91, 93, 94, 96],
    defaultAmbient: null,
  },
  {
    id: "sleep-mode",
    kind: SystemPlaylistKind.SleepMode,
    name: "Sleep Mode",
    description: "Gentle recitations with a soft bed and a sleep timer.",
    gradient: "from-blue-800 via-indigo-950 to-black",
    ornament: "rings",
    surahs: [18, 32, 36, 44, 55, 56, 67, 73, 76, 78, 87, 88, 93, 94, 97],
    defaultAmbient: "rain",
  },
  {
    id: "duaa-ruqia",
    kind: SystemPlaylistKind.DuaaRuqia,
    name: "Duaa & Ruqia",
    description: "Passages traditionally recited for protection and healing.",
    gradient: "from-lime-700 via-green-800 to-emerald-950",
    ornament: "rays",
    surahs: [1, 2, 36, 55, 67, 109, 112, 113, 114],
    defaultAmbient: null,
  },
  {
    id: "emotional",
    kind: SystemPlaylistKind.Emotional,
    name: "Emotional Recitations",
    description: "Recitations that tend to move listeners most.",
    gradient: "from-violet-600 via-indigo-700 to-slate-950",
    ornament: "petals",
    surahs: [17, 19, 20, 25, 39, 50, 59, 69, 75, 79, 81, 82, 99, 101],
    defaultAmbient: null,
  },
];

export function findSystemPlaylist(
  id: string,
): SystemPlaylistDefinition | null {
  return SYSTEM_PLAYLISTS.find((playlist) => playlist.id === id) ?? null;
}
