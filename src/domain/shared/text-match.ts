/**
 * Text normalisation for catalogue search.
 *
 * Transliterated Arabic names are written a dozen different ways: "Al-Mulk",
 * "Al Mulk", "almulk", "Al-'Alaq", "Al Alaq". Nobody types the punctuation,
 * and on a phone keyboard the hyphen and apostrophe are two taps away. So a
 * query is matched against a normalised form of the name rather than the name
 * itself.
 *
 * Normalising means: lowercase, strip Latin diacritics, drop apostrophes and
 * hyphens entirely, and collapse whitespace. "Al mulk", "al-mulk" and "almulk"
 * therefore all reduce to the same key.
 */

/**
 * Arabic diacritics (tashkeel) and the tatweel elongation character.
 * Users type Arabic without vowel marks; the catalogue stores them.
 */
const ARABIC_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

export function normalizeForSearch(value: string): string {
  return (
    value
      .toLowerCase()
      // Split accented Latin characters into base + combining mark...
      .normalize("NFD")
      // ...then drop the marks, so "Ḥusary" matches "husary".
      .replace(/[̀-ͯ]/g, "")
      .replace(ARABIC_MARKS, "")
      // Unify the several apostrophes used for hamza and ayn.
      .replace(/['’‘`´ʻʼ]/g, "")
      // Hyphens and underscores become nothing, not spaces: "Al-Mulk" has to
      // reduce to the same key as "almulk", not just as "al mulk".
      .replace(/[-_]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** The same normalisation with spaces removed, for punctuation-free matching. */
function collapse(value: string): string {
  return normalizeForSearch(value).replace(/\s/g, "");
}

/**
 * True when `query` matches `subject` loosely enough for a search box.
 *
 * Matches on the spaced form first (so word boundaries still count), then on
 * the fully collapsed form, which is what lets "almulk" find "Al-Mulk".
 */
export function matchesQuery(subject: string, query: string): boolean {
  const q = normalizeForSearch(query);
  if (q.length === 0) return true;

  const s = normalizeForSearch(subject);
  if (s.includes(q)) return true;

  return collapse(subject).includes(collapse(query));
}

/**
 * True when every whitespace-separated term in `query` appears somewhere in
 * `subject`. Lets "husary warsh" find "Mahmoud Khalil Al-Husary" recorded in
 * the Warsh narration, regardless of the order the user typed them.
 */
export function matchesAllTerms(subject: string, query: string): boolean {
  const terms = normalizeForSearch(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;

  const s = normalizeForSearch(subject);
  const collapsed = collapse(subject);

  return terms.every((term) => s.includes(term) || collapsed.includes(term));
}
