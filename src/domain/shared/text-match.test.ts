import { describe, expect, it } from "vitest";
import { matchesAllTerms, matchesQuery, normalizeForSearch } from "./text-match";

describe("normalizeForSearch", () => {
  it("lowercases and strips hyphens", () => {
    expect(normalizeForSearch("Al-Mulk")).toBe("almulk");
  });

  it("strips apostrophes used for hamza and ayn", () => {
    expect(normalizeForSearch("Al-'Alaq")).toBe("alalaq");
    expect(normalizeForSearch("Al-’Alaq")).toBe("alalaq");
  });

  it("strips Latin diacritics", () => {
    expect(normalizeForSearch("Ḥusary")).toBe("husary");
  });

  it("collapses runs of whitespace", () => {
    expect(normalizeForSearch("  Ali   Imran  ")).toBe("ali imran");
  });

  it("strips Arabic vowel marks", () => {
    // Users type Arabic bare; the catalogue stores it vocalised.
    expect(normalizeForSearch("الْمُلْك")).toBe(normalizeForSearch("الملك"));
  });
});

describe("matchesQuery", () => {
  it("matches regardless of the hyphen", () => {
    for (const query of ["Al mulk", "al-mulk", "almulk", "AL MULK"]) {
      expect(matchesQuery("Al-Mulk", query)).toBe(true);
    }
  });

  it("matches a partial word", () => {
    expect(matchesQuery("Al-Baqarah", "baqar")).toBe(true);
  });

  it("matches the second word alone", () => {
    expect(matchesQuery("Ali 'Imran", "imran")).toBe(true);
  });

  it("matches an apostrophe name typed without one", () => {
    expect(matchesQuery("Al-'Alaq", "alaq")).toBe(true);
    expect(matchesQuery("Al-'Alaq", "al alaq")).toBe(true);
  });

  it("does not match an unrelated name", () => {
    expect(matchesQuery("Al-Mulk", "baqarah")).toBe(false);
  });

  it("treats an empty query as matching everything", () => {
    expect(matchesQuery("Al-Mulk", "")).toBe(true);
    expect(matchesQuery("Al-Mulk", "   ")).toBe(true);
  });

  it("matches Arabic text", () => {
    expect(matchesQuery("الملك", "ملك")).toBe(true);
  });
});

describe("matchesAllTerms", () => {
  it("requires every term but ignores their order", () => {
    const subject = "Mahmoud Khalil Al-Husary warsh";
    expect(matchesAllTerms(subject, "husary warsh")).toBe(true);
    expect(matchesAllTerms(subject, "warsh husary")).toBe(true);
  });

  it("fails when one term is absent", () => {
    expect(matchesAllTerms("Mahmoud Khalil Al-Husary hafs", "husary warsh")).toBe(
      false,
    );
  });

  it("ignores punctuation in the terms", () => {
    expect(matchesAllTerms("Abdurrahman As-Sudais", "as sudais")).toBe(true);
    expect(matchesAllTerms("Abdurrahman As-Sudais", "assudais")).toBe(true);
  });

  it("treats an empty query as matching everything", () => {
    expect(matchesAllTerms("anything", "  ")).toBe(true);
  });
});
