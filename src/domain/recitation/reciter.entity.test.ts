import { describe, expect, it } from "vitest";
import { Reciter } from "./reciter.entity";
import { Rewaya, SurahNumber, Duration, AudioUrl } from "./value-objects";

function makeReciter(availableSurahs = [1, 2, 96]) {
  const result = Reciter.create({
    id: "r1",
    slug: "abdur-rahman-al-ossi",
    nameLatin: "Abdur Rahman Al-Ossi",
    nameArabic: "عبد الرحمن العوسي",
    countryCode: "SA",
    rewaya: Rewaya.Hafs,
    avatarUrl: null,
    serverBaseUrl: "https://server.example.com/ossi/",
    availableSurahs,
    isNew: false,
    popularity: 10,
  });
  if (!result.ok) throw new Error("setup failed");
  return result.value;
}

function surah(n: number): SurahNumber {
  const result = SurahNumber.create(n);
  if (!result.ok) throw new Error("bad surah");
  return result.value;
}

describe("SurahNumber", () => {
  it("rejects numbers outside 1..114", () => {
    expect(SurahNumber.create(0).ok).toBe(false);
    expect(SurahNumber.create(115).ok).toBe(false);
    expect(SurahNumber.create(1.5).ok).toBe(false);
  });

  it("zero-pads for CDN filenames", () => {
    expect(surah(1).padded).toBe("001");
    expect(surah(96).padded).toBe("096");
    expect(surah(114).padded).toBe("114");
  });
});

describe("Duration", () => {
  it("rejects negative and non-finite values", () => {
    expect(Duration.create(-1).ok).toBe(false);
    expect(Duration.create(Number.NaN).ok).toBe(false);
  });

  it("formats under an hour as m:ss", () => {
    const d = Duration.create(86);
    if (!d.ok) throw new Error("setup failed");
    expect(d.value.format()).toBe("1:26");
  });

  it("formats over an hour as h:mm:ss", () => {
    const d = Duration.create(3725);
    if (!d.ok) throw new Error("setup failed");
    expect(d.value.format()).toBe("1:02:05");
  });
});

describe("AudioUrl", () => {
  it("rejects a malformed URL", () => {
    expect(AudioUrl.create("not a url").ok).toBe(false);
  });

  it("rejects a non-http protocol", () => {
    const result = AudioUrl.create("javascript:alert(1)");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("audio_url.unsupported_protocol");
    }
  });

  it("accepts https", () => {
    expect(AudioUrl.create("https://cdn.example.com/096.mp3").ok).toBe(true);
  });
});

describe("Reciter.create", () => {
  it("rejects a reciter with no recorded surahs", () => {
    const result = Reciter.create({
      id: "r1",
      slug: "x",
      nameLatin: "X",
      nameArabic: "خ",
      countryCode: null,
      rewaya: Rewaya.Hafs,
      avatarUrl: null,
      serverBaseUrl: "https://s.example.com",
      availableSurahs: [],
      isNew: false,
      popularity: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("reciter.no_surahs");
  });

  it("rejects an empty name", () => {
    const result = Reciter.create({
      id: "r1",
      slug: "x",
      nameLatin: "  ",
      nameArabic: "خ",
      countryCode: null,
      rewaya: Rewaya.Hafs,
      avatarUrl: null,
      serverBaseUrl: "https://s.example.com",
      availableSurahs: [1],
      isNew: false,
      popularity: 0,
    });
    expect(result.ok).toBe(false);
  });
});

describe("Reciter.trackFor", () => {
  it("builds a padded CDN url and normalises the trailing slash", () => {
    const reciter = makeReciter();
    const track = reciter.trackFor(surah(96));

    expect(track.ok).toBe(true);
    if (!track.ok) return;
    expect(track.value.audioUrl.href).toBe(
      "https://server.example.com/ossi/096.mp3",
    );
    expect(track.value.id).toBe("r1:096");
  });

  it("refuses a surah the reciter has not recorded", () => {
    const reciter = makeReciter([1, 2]);
    const track = reciter.trackFor(surah(96));

    expect(track.ok).toBe(false);
    if (!track.ok) {
      expect(track.error.code).toBe("reciter.surah_unavailable");
    }
  });

  it("attaches a known duration", () => {
    const duration = Duration.create(120);
    if (!duration.ok) throw new Error("setup failed");

    const track = makeReciter().trackFor(surah(1), duration.value);
    expect(track.ok).toBe(true);
    if (track.ok) expect(track.value.duration?.seconds).toBe(120);
  });
});

describe("Reciter.matches", () => {
  it("matches on latin name, arabic name and slug", () => {
    const reciter = makeReciter();
    expect(reciter.matches("ossi")).toBe(true);
    expect(reciter.matches("العوسي")).toBe(true);
    expect(reciter.matches("abdur")).toBe(true);
    expect(reciter.matches("sudais")).toBe(false);
  });

  it("matches everything on an empty query", () => {
    expect(makeReciter().matches("  ")).toBe(true);
  });
});
