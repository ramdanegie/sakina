import { Entity } from "../shared/entity";
import type { AudioUrl, Duration, SurahNumber } from "./value-objects";

export interface RecitationTrackProps {
  readonly id: string;
  readonly reciterId: string;
  readonly reciterName: string;
  readonly reciterAvatarUrl: string | null;
  readonly surahNumber: SurahNumber;
  readonly audioUrl: AudioUrl;
  /** Null until the audio element reports metadata — the CDN does not expose it. */
  readonly duration: Duration | null;
}

/** One playable unit: a single surah recited by a single reciter. */
export class RecitationTrack extends Entity<string> {
  private constructor(private readonly props: RecitationTrackProps) {
    super(props.id);
  }

  static create(props: RecitationTrackProps): RecitationTrack {
    return new RecitationTrack(props);
  }

  get reciterId(): string {
    return this.props.reciterId;
  }

  get reciterName(): string {
    return this.props.reciterName;
  }

  get reciterAvatarUrl(): string | null {
    return this.props.reciterAvatarUrl;
  }

  get surahNumber(): SurahNumber {
    return this.props.surahNumber;
  }

  get audioUrl(): AudioUrl {
    return this.props.audioUrl;
  }

  get duration(): Duration | null {
    return this.props.duration;
  }

  /** Duration arrives from the audio element after loadedmetadata. */
  withDuration(duration: Duration): RecitationTrack {
    return new RecitationTrack({ ...this.props, duration });
  }
}
