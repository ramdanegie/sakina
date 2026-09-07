import { describe, expect, it } from "vitest";
import { Reciter } from "./reciter.entity";
import { Rewaya, SurahNumber, makeTrackId } from "./value-objects";

const reciterResult = Reciter.create({
  id: "r1",
  slug: "yasser-al-dosari",
  nameLatin: "Yasser Al-Dosari",
  nameArabic: "ياسر الدوسري",
  countryCode: "SA",
  rewaya: Rewaya.Hafs,
  avatarUrl: "https://cdn.example.com/avatar.webp",
  serverBaseUrl: "https://server.example.com/dosari",
  availableSurahs: [1, 2, 3],
  isNew: true,
  popularity: 42,
});
if (!reciterResult.ok) throw new Error("setup failed");
const reciter = reciterResult.value;

function surah(n: number): SurahNumber {
  const result = SurahNumber.create(n);
  if (!result.ok) throw new Error("bad surah");
  return result.value;
}

describe("Reciter accessors", () => {
  it("exposes every catalogue field", () => {
    expect(reciter.id).toBe("r1");
    expect(reciter.slug).toBe("yasser-al-dosari");
    expect(reciter.nameLatin).toBe("Yasser Al-Dosari");
    expect(reciter.nameArabic).toBe("ياسر الدوسري");
    expect(reciter.countryCode).toBe("SA");
    expect(reciter.rewaya).toBe(Rewaya.Hafs);
    expect(reciter.avatarUrl).toBe("https://cdn.example.com/avatar.webp");
    expect(reciter.isNew).toBe(true);
    expect(reciter.popularity).toBe(42);
  });

  it("reports how many surahs it has recorded", () => {
    expect(reciter.surahCount).toBe(3);
    expect(reciter.availableSurahs).toEqual([1, 2, 3]);
  });

  it("answers whether a surah is available", () => {
    expect(reciter.hasSurah(surah(1))).toBe(true);
    expect(reciter.hasSurah(surah(96))).toBe(false);
  });

  it("rejects a reciter with a blank id", () => {
    const result = Reciter.create({
      id: "  ",
      slug: "x",
      nameLatin: "X",
      nameArabic: "خ",
      countryCode: null,
      rewaya: Rewaya.Warsh,
      avatarUrl: null,
      serverBaseUrl: "https://s.example.com",
      availableSurahs: [1],
      isNew: false,
      popularity: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("reciter.id_required");
  });

  it("fails to build a track when the base url is unusable", () => {
    const broken = Reciter.create({
      id: "r2",
      slug: "broken",
      nameLatin: "Broken",
      nameArabic: "خ",
      countryCode: null,
      rewaya: Rewaya.Hafs,
      avatarUrl: null,
      serverBaseUrl: "not-a-url",
      availableSurahs: [1],
      isNew: false,
      popularity: 0,
    });
    if (!broken.ok) throw new Error("setup failed");

    const track = broken.value.trackFor(surah(1));
    expect(track.ok).toBe(false);
    if (!track.ok) expect(track.error.code).toBe("audio_url.malformed");
  });

  it("appends the padded filename without a duplicate slash", () => {
    const track = reciter.trackFor(surah(2));
    expect(track.ok).toBe(true);
    if (track.ok) {
      expect(track.value.audioUrl.href).toBe(
        "https://server.example.com/dosari/002.mp3",
      );
      expect(track.value.reciterAvatarUrl).toBe(
        "https://cdn.example.com/avatar.webp",
      );
    }
  });
});

describe("makeTrackId", () => {
  it("is stable and zero-padded", () => {
    expect(makeTrackId("r1", surah(7))).toBe("r1:007");
  });
});
