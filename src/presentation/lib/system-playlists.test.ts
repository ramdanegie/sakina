import { describe, expect, it } from "vitest";
import { SYSTEM_PLAYLIST_IDS } from "@/infrastructure/content/system-playlist-ids";
import { SYSTEM_PLAYLISTS, findSystemPlaylist } from "./system-playlists";

/**
 * The static-export build enumerates playlist routes from the id list in
 * `infrastructure/content`, which is deliberately decoupled from the UI
 * definitions here. If the two drift, a curated playlist either 404s in the
 * exported site or ships an orphan page — so the drift is caught here.
 */
describe("system playlist ids", () => {
  it("cover exactly the playlists the UI defines", () => {
    expect([...SYSTEM_PLAYLIST_IDS].sort()).toEqual(
      SYSTEM_PLAYLISTS.map((p) => p.id).sort(),
    );
  });

  it("resolve to a real definition", () => {
    for (const id of SYSTEM_PLAYLIST_IDS) {
      expect(findSystemPlaylist(id)).not.toBeNull();
    }
  });

  it("returns null for an unknown id", () => {
    expect(findSystemPlaylist("does-not-exist")).toBeNull();
  });
});

describe("system playlist definitions", () => {
  it("have unique ids", () => {
    const ids = SYSTEM_PLAYLISTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reference only real surah numbers", () => {
    for (const playlist of SYSTEM_PLAYLISTS) {
      for (const surah of playlist.surahs) {
        expect(surah).toBeGreaterThanOrEqual(1);
        expect(surah).toBeLessThanOrEqual(114);
      }
    }
  });

  it("list no duplicate surahs within a playlist", () => {
    for (const playlist of SYSTEM_PLAYLISTS) {
      expect(new Set(playlist.surahs).size).toBe(playlist.surahs.length);
    }
  });
});
