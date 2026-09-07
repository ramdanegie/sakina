import { describe, expect, it } from "vitest";
import { RecitationTrack } from "./recitation-track.entity";
import { Surah } from "./surah.entity";
import { AudioUrl, Duration, SurahNumber } from "./value-objects";

function surahNumber(n: number): SurahNumber {
  const result = SurahNumber.create(n);
  if (!result.ok) throw new Error("bad surah number");
  return result.value;
}

const alAlaq = Surah.create({
  number: surahNumber(96),
  nameLatin: "Al-'Alaq",
  nameArabic: "العلق",
  nameTranslation: "The Clot",
  ayahCount: 19,
  revelationPlace: "meccan",
});

describe("Surah", () => {
  it("exposes its metadata", () => {
    expect(alAlaq.number.value).toBe(96);
    expect(alAlaq.nameLatin).toBe("Al-'Alaq");
    expect(alAlaq.nameArabic).toBe("العلق");
    expect(alAlaq.nameTranslation).toBe("The Clot");
    expect(alAlaq.ayahCount).toBe(19);
    expect(alAlaq.revelationPlace).toBe("meccan");
  });

  it("builds the mini-player display title", () => {
    expect(alAlaq.displayTitle).toBe("96. Al-'Alaq (العلق)");
  });

  it("matches on number, latin name, arabic name and translation", () => {
    expect(alAlaq.matches("96")).toBe(true);
    expect(alAlaq.matches("alaq")).toBe(true);
    expect(alAlaq.matches("العلق")).toBe(true);
    expect(alAlaq.matches("clot")).toBe(true);
    expect(alAlaq.matches("baqarah")).toBe(false);
  });

  it("matches everything on an empty query", () => {
    expect(alAlaq.matches("   ")).toBe(true);
  });
});

describe("RecitationTrack", () => {
  const url = AudioUrl.create("https://cdn.example.com/096.mp3");
  if (!url.ok) throw new Error("setup failed");

  const track = RecitationTrack.create({
    id: "r1:096",
    reciterId: "r1",
    reciterName: "Abdur Rahman Al-Ossi",
    reciterAvatarUrl: null,
    surahNumber: surahNumber(96),
    audioUrl: url.value,
    duration: null,
  });

  it("exposes its metadata", () => {
    expect(track.id).toBe("r1:096");
    expect(track.reciterId).toBe("r1");
    expect(track.reciterName).toBe("Abdur Rahman Al-Ossi");
    expect(track.reciterAvatarUrl).toBeNull();
    expect(track.surahNumber.value).toBe(96);
    expect(track.audioUrl.href).toBe("https://cdn.example.com/096.mp3");
    expect(track.duration).toBeNull();
  });

  it("attaches a duration without mutating the original", () => {
    const duration = Duration.create(86);
    if (!duration.ok) throw new Error("setup failed");

    const withDuration = track.withDuration(duration.value);
    expect(withDuration.duration?.seconds).toBe(86);
    expect(track.duration).toBeNull();
  });
});

describe("Duration.zero", () => {
  it("is a zero-second duration", () => {
    expect(Duration.zero().seconds).toBe(0);
    expect(Duration.zero().format()).toBe("0:00");
  });
});
