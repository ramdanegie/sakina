import { Entity } from "../shared/entity";

export interface AyahProps {
  /** 1-based position within its surah. */
  readonly number: number;
  readonly surahNumber: number;
  readonly arabic: string;
  /** Null until a translation edition is loaded for the reader's language. */
  readonly translation: string | null;
  /** Loaded lazily — tafsir is long, and most readers open only a few. */
  readonly tafsir: string | null;
}

/**
 * One verse, as shown in the reading panel.
 *
 * Arabic scripture is not owned by anyone. Translations and tafsir are: they
 * are the work of named translators and scholars. Both are therefore fetched
 * from their source at read time and attributed on screen — never bundled into
 * this repository or presented as ours.
 */
export class Ayah extends Entity<string> {
  private constructor(private readonly props: AyahProps) {
    super(`${props.surahNumber}:${props.number}`);
  }

  static create(props: AyahProps): Ayah {
    return new Ayah(props);
  }

  get number(): number {
    return this.props.number;
  }

  get surahNumber(): number {
    return this.props.surahNumber;
  }

  get arabic(): string {
    return this.props.arabic;
  }

  get translation(): string | null {
    return this.props.translation;
  }

  get tafsir(): string | null {
    return this.props.tafsir;
  }

  /** "112:1" — the key every Quran API agrees on. */
  get verseKey(): string {
    return this.id;
  }

  withTafsir(tafsir: string): Ayah {
    return new Ayah({ ...this.props, tafsir });
  }
}
