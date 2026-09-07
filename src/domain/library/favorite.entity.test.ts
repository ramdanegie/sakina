import { describe, expect, it } from "vitest";
import { Favorite, FavoriteTargetType } from "./favorite.entity";
import {
  AmbientLicense,
  AmbientSound,
} from "../ambience/ambient-sound.entity";

const NOW = new Date("2026-03-10T10:00:00Z");

describe("Favorite", () => {
  it("builds a deterministic id so toggling twice cannot duplicate", () => {
    expect(Favorite.idFor(FavoriteTargetType.Reciter, "r1")).toBe("reciter:r1");
    expect(Favorite.idFor(FavoriteTargetType.Track, "r1:096")).toBe(
      "track:r1:096",
    );
  });

  it("exposes its target", () => {
    const favorite = Favorite.create({
      id: Favorite.idFor(FavoriteTargetType.Track, "r1:096"),
      targetType: FavoriteTargetType.Track,
      targetId: "r1:096",
      createdAt: NOW,
    });

    expect(favorite.targetType).toBe("track");
    expect(favorite.targetId).toBe("r1:096");
    expect(favorite.createdAt).toBe(NOW);
    expect(favorite.snapshot().id).toBe("track:r1:096");
  });
});

describe("AmbientSound", () => {
  const rain = AmbientSound.create({
    id: "rain",
    name: "Rain",
    icon: "CloudRain",
    audioUrl: "/ambient/rain.ogg",
    imageUrl: "/ambient/rain.webp",
    license: AmbientLicense.CC0,
    attribution: "Freesound — CC0",
    sourceUrl: "https://freesound.org/",
  });

  it("exposes its metadata and licence", () => {
    expect(rain.name).toBe("Rain");
    expect(rain.icon).toBe("CloudRain");
    expect(rain.audioUrl).toBe("/ambient/rain.ogg");
    expect(rain.imageUrl).toBe("/ambient/rain.webp");
    expect(rain.license).toBe("cc0");
    expect(rain.attribution).toBe("Freesound — CC0");
    expect(rain.sourceUrl).toBe("https://freesound.org/");
    expect(rain.isNone).toBe(false);
  });

  it("provides a none sentinel for the picker", () => {
    const none = AmbientSound.none();
    expect(none.id).toBe(AmbientSound.NONE_ID);
    expect(none.isNone).toBe(true);
    expect(none.name).toBe("No sounds");
  });

  it("matches on name and on an empty query", () => {
    expect(rain.matches("rai")).toBe(true);
    expect(rain.matches("RAIN")).toBe(true);
    expect(rain.matches("fire")).toBe(false);
    expect(rain.matches("  ")).toBe(true);
  });
});
