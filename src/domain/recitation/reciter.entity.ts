import { AggregateRoot } from "../shared/entity";
import { Err, Ok, DomainError, type Result } from "../shared/result";
import {
  AudioUrl,
  makeTrackId,
  Rewaya,
  SurahNumber,
  type Duration,
} from "./value-objects";
import { RecitationTrack } from "./recitation-track.entity";

export interface ReciterProps {
  readonly id: string;
  readonly slug: string;
  readonly nameLatin: string;
  readonly nameArabic: string;
  readonly countryCode: string | null;
  readonly rewaya: Rewaya;
  readonly avatarUrl: string | null;
  /** Base URL of the CDN folder holding `001.mp3` .. `114.mp3`. */
  readonly serverBaseUrl: string;
  /** Surah numbers this reciter actually has recorded — often not all 114. */
  readonly availableSurahs: readonly number[];
  readonly isNew: boolean;
  readonly popularity: number;
}

/**
 * Aggregate root of the Recitation Catalog context. Owns the rule that a
 * track only exists for a surah the reciter has actually recorded.
 */
export class Reciter extends AggregateRoot<string> {
  private readonly available: ReadonlySet<number>;

  private constructor(private readonly props: ReciterProps) {
    super(props.id);
    this.available = new Set(props.availableSurahs);
  }

  static create(props: ReciterProps): Result<Reciter> {
    if (props.id.trim().length === 0) {
      return Err(
        DomainError.of("reciter.id_required", "Reciter id must not be empty"),
      );
    }
    if (props.nameLatin.trim().length === 0) {
      return Err(
        DomainError.of("reciter.name_required", "Reciter must have a name"),
      );
    }
    if (props.availableSurahs.length === 0) {
      return Err(
        DomainError.of(
          "reciter.no_surahs",
          "Reciter must have at least one recorded surah",
          { id: props.id },
        ),
      );
    }
    return Ok(new Reciter(props));
  }

  get slug(): string {
    return this.props.slug;
  }

  get nameLatin(): string {
    return this.props.nameLatin;
  }

  get nameArabic(): string {
    return this.props.nameArabic;
  }

  get countryCode(): string | null {
    return this.props.countryCode;
  }

  get rewaya(): Rewaya {
    return this.props.rewaya;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  /**
   * Exposed for persistence only. Building playable URLs stays the aggregate's
   * job — use `trackFor`, which enforces the availability invariant.
   */
  get serverBaseUrl(): string {
    return this.props.serverBaseUrl;
  }

  get isNew(): boolean {
    return this.props.isNew;
  }

  get popularity(): number {
    return this.props.popularity;
  }

  get surahCount(): number {
    return this.available.size;
  }

  get availableSurahs(): readonly number[] {
    return this.props.availableSurahs;
  }

  hasSurah(surah: SurahNumber): boolean {
    return this.available.has(surah.value);
  }

  /**
   * Build the playable track for a surah. Fails when the reciter has not
   * recorded it — this is the invariant that stops the UI from ever
   * producing a 404 audio URL.
   */
  trackFor(surah: SurahNumber, duration?: Duration): Result<RecitationTrack> {
    if (!this.hasSurah(surah)) {
      return Err(
        DomainError.of(
          "reciter.surah_unavailable",
          `Reciter ${this.props.nameLatin} has not recorded surah ${surah.value}`,
          { reciterId: this.id, surah: surah.value },
        ),
      );
    }

    const base = this.props.serverBaseUrl.replace(/\/+$/, "");
    const url = AudioUrl.create(`${base}/${surah.padded}.mp3`);
    if (!url.ok) return url;

    return Ok(
      RecitationTrack.create({
        id: makeTrackId(this.id, surah),
        reciterId: this.id,
        reciterName: this.props.nameLatin,
        reciterAvatarUrl: this.props.avatarUrl,
        surahNumber: surah,
        audioUrl: url.value,
        duration: duration ?? null,
      }),
    );
  }

  matches(query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return true;
    return (
      this.props.nameLatin.toLowerCase().includes(q) ||
      this.props.nameArabic.includes(q) ||
      this.props.slug.includes(q)
    );
  }
}
