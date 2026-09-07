import { Ayah } from "@/domain/scripture/ayah.entity";
import type {
  ScriptureProviderPort,
  TranslationEdition,
} from "@/application/ports.scripture";

const BASE = "https://api.alquran.cloud/v1";

/** Uthmani script — the standard printed rendering. */
const ARABIC_EDITION = "quran-uthmani";

interface CloudAyah {
  number: number;
  text: string;
  numberInSurah: number;
}

interface CloudEdition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
}

/**
 * Quran text, translations and tafsir from alquran.cloud.
 *
 * Chosen because it needs no API key and exposes editions in the languages
 * this app targets. Everything is fetched at read time and attributed on
 * screen: the Arabic is scripture and belongs to no one, but translations and
 * tafsir are the work of named people, so they are never bundled here or
 * presented as ours.
 */
export class AlQuranCloudClient implements ScriptureProviderPort {
  private readonly fetchImpl: typeof fetch;
  private editionsCache: CloudEdition[] | null = null;

  /**
   * `fetch` must stay bound to its original global. Calling a bare reference
   * stored on the instance gives browsers the class as the receiver, which
   * they reject with "Illegal invocation".
   */
  constructor(fetchImpl?: typeof fetch, private readonly baseUrl = BASE) {
    this.fetchImpl =
      fetchImpl ??
      ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  }

  async getSurahText(
    surahNumber: number,
    translationEdition: string | null,
  ): Promise<Ayah[]> {
    const editions =
      translationEdition === null
        ? ARABIC_EDITION
        : `${ARABIC_EDITION},${translationEdition}`;

    const response = await this.fetchImpl(
      `${this.baseUrl}/surah/${surahNumber}/editions/${editions}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) {
      throw new Error(`Quran text request failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: { ayahs: CloudAyah[] }[];
    };
    const sets = payload.data ?? [];
    if (sets.length === 0) throw new Error("Quran text response was empty");

    const arabic = sets[0].ayahs;
    const translated = sets.length > 1 ? sets[1].ayahs : null;

    return arabic.map((ayah, index) =>
      Ayah.create({
        number: ayah.numberInSurah,
        surahNumber,
        arabic: ayah.text,
        translation: translated?.[index]?.text ?? null,
        tafsir: null,
      }),
    );
  }

  async getTafsir(
    surahNumber: number,
    ayahNumber: number,
    edition: string,
  ): Promise<string | null> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/ayah/${surahNumber}:${ayahNumber}/${edition}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: { text?: string } };
    return payload.data?.text ?? null;
  }

  private async editions(): Promise<CloudEdition[]> {
    if (this.editionsCache !== null) return this.editionsCache;

    const response = await this.fetchImpl(`${this.baseUrl}/edition`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as { data?: CloudEdition[] };
    this.editionsCache = payload.data ?? [];
    return this.editionsCache;
  }

  /**
   * Only the languages this app speaks. The upstream list runs to 300+
   * editions, which is a useless thing to put in a picker.
   */
  async listTranslationEditions(): Promise<TranslationEdition[]> {
    const wanted = new Set(["id", "en"]);

    return (await this.editions())
      .filter(
        (e) =>
          e.format === "text" &&
          e.type === "translation" &&
          wanted.has(e.language),
      )
      .map((e) => ({
        id: e.identifier,
        language: e.language,
        name: e.englishName || e.name,
        author: e.name,
      }));
  }

  async listTafsirEditions(): Promise<TranslationEdition[]> {
    const all = await this.editions();

    // Jalalayn is catalogued as a translation but is a tafsir, and it is the
    // only Indonesian one available here — so it is included explicitly.
    return all
      .filter(
        (e) =>
          e.type === "tafsir" ||
          e.identifier === "id.jalalayn" ||
          e.identifier === "id.muntakhab",
      )
      .map((e) => ({
        id: e.identifier,
        language: e.language,
        name: e.englishName || e.name,
        author: e.name,
      }));
  }
}
