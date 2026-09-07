import { describe, expect, it } from "vitest";
import { Playlist, SystemPlaylistKind } from "./playlist.aggregate";

const NOW = new Date("2026-03-10T10:00:00Z");

function newPlaylist(name = "Malam Tenang"): Playlist {
  const result = Playlist.create({ id: "p1", name, now: NOW });
  if (!result.ok) throw new Error("setup failed");
  return result.value;
}

describe("Playlist.create", () => {
  it("rejects an empty name", () => {
    const result = Playlist.create({ id: "p1", name: "   ", now: NOW });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("playlist.invalid_name");
  });

  it("rejects a name over 50 characters", () => {
    const result = Playlist.create({ id: "p1", name: "x".repeat(51), now: NOW });
    expect(result.ok).toBe(false);
  });

  it("trims the name", () => {
    const result = Playlist.create({ id: "p1", name: "  Fokus  ", now: NOW });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Fokus");
  });
});

describe("Playlist tracks", () => {
  it("rejects a duplicate track", () => {
    const playlist = newPlaylist();
    expect(playlist.addTrack("t1", NOW).ok).toBe(true);

    const again = playlist.addTrack("t1", NOW);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("playlist.duplicate_track");
  });

  it("assigns dense positions as tracks are added", () => {
    const playlist = newPlaylist();
    playlist.addTrack("t1", NOW);
    playlist.addTrack("t2", NOW);
    expect(playlist.items.map((i) => i.position)).toEqual([0, 1]);
  });

  it("recompacts positions after a removal", () => {
    const playlist = newPlaylist();
    playlist.addTrack("t1", NOW);
    playlist.addTrack("t2", NOW);
    playlist.addTrack("t3", NOW);

    expect(playlist.removeTrack("t1", NOW).ok).toBe(true);
    expect(playlist.items.map((i) => i.position)).toEqual([0, 1]);
    expect(playlist.trackIds).toEqual(["t2", "t3"]);
  });

  it("rejects removing a track that is not present", () => {
    expect(newPlaylist().removeTrack("nope", NOW).ok).toBe(false);
  });

  it("reorders and recompacts positions", () => {
    const playlist = newPlaylist();
    playlist.addTrack("t1", NOW);
    playlist.addTrack("t2", NOW);
    playlist.addTrack("t3", NOW);

    expect(playlist.reorder(0, 2, NOW).ok).toBe(true);
    expect(playlist.trackIds).toEqual(["t2", "t3", "t1"]);
    expect(playlist.items.map((i) => i.position)).toEqual([0, 1, 2]);
  });

  it("rejects an out-of-range reorder", () => {
    const playlist = newPlaylist();
    playlist.addTrack("t1", NOW);
    expect(playlist.reorder(0, 5, NOW).ok).toBe(false);
  });
});

describe("System playlists", () => {
  const system = Playlist.system({
    id: "sys-fav",
    kind: SystemPlaylistKind.Favourites,
    name: "Favourites",
    coverGradient: "from-amber-400 to-amber-700",
    now: NOW,
  });

  it("cannot be renamed", () => {
    const result = system.rename("Something else", NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("playlist.system_immutable");
    expect(system.name).toBe("Favourites");
  });

  it("cannot be deleted", () => {
    expect(system.canBeDeleted()).toBe(false);
  });

  it("still accepts tracks", () => {
    expect(system.addTrack("t1", NOW).ok).toBe(true);
  });
});

describe("User playlists", () => {
  it("can be renamed and deleted", () => {
    const playlist = newPlaylist();
    expect(playlist.rename("Nama Baru", NOW).ok).toBe(true);
    expect(playlist.name).toBe("Nama Baru");
    expect(playlist.canBeDeleted()).toBe(true);
  });

  it("rejects an invalid rename", () => {
    expect(newPlaylist().rename("", NOW).ok).toBe(false);
  });
});
