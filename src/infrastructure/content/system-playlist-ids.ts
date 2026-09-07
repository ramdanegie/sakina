/**
 * Route ids for the curated playlists.
 *
 * Duplicated here rather than imported from the presentation layer so the
 * static-export build can enumerate playlist routes without infrastructure
 * reaching upward into the UI. The presentation definitions in
 * `presentation/lib/system-playlists.ts` are the source of truth for the
 * names, artwork and seed surahs; this list only has to stay in step with
 * their ids, which a test asserts.
 */
export const SYSTEM_PLAYLIST_IDS = [
  "favourites",
  "focus-work",
  "most-beautiful",
  "sleep-mode",
  "duaa-ruqia",
  "emotional",
] as const;

export type SystemPlaylistId = (typeof SYSTEM_PLAYLIST_IDS)[number];
