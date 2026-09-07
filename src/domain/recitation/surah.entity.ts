import { Entity } from "../shared/entity";
import { SurahNumber } from "./value-objects";

export type RevelationPlace = "meccan" | "medinan";

export interface SurahProps {
  readonly number: SurahNumber;
  readonly nameLatin: string;
  readonly nameArabic: string;
  readonly nameTranslation: string;
  readonly ayahCount: number;
  readonly revelationPlace: RevelationPlace;
}

/**
 * Surah metadata is static reference data — it ships with the bundle and
 * never needs a network call, which is what keeps the first paint useful offline.
 */
export class Surah extends Entity<number> {
  private constructor(private readonly props: SurahProps) {
    super(props.number.value);
  }

  static create(props: SurahProps): Surah {
    return new Surah(props);
  }

  get number(): SurahNumber {
    return this.props.number;
  }

  get nameLatin(): string {
    return this.props.nameLatin;
  }

  get nameArabic(): string {
    return this.props.nameArabic;
  }

  get nameTranslation(): string {
    return this.props.nameTranslation;
  }

  get ayahCount(): number {
    return this.props.ayahCount;
  }

  get revelationPlace(): RevelationPlace {
    return this.props.revelationPlace;
  }

  /** "96. Al-'Alaq (العلق)" — the mini-player label from the reference UI. */
  get displayTitle(): string {
    return `${this.props.number.value}. ${this.props.nameLatin} (${this.props.nameArabic})`;
  }

  /** Case-insensitive match across number, latin, arabic and translation. */
  matches(query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return true;
    if (String(this.props.number.value) === q) return true;
    return (
      this.props.nameLatin.toLowerCase().includes(q) ||
      this.props.nameArabic.includes(q) ||
      this.props.nameTranslation.toLowerCase().includes(q)
    );
  }
}
