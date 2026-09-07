import { SurahNumber } from "@/domain/recitation/value-objects";
import type {
  ReciterRepository,
  SurahRepository,
} from "@/domain/repositories";
import { DomainError, Err, Ok, type Result } from "@/domain/shared/result";
import type { TrackDto } from "../dto";
import { toTrackDto } from "../mappers";

/**
 * Resolve a (reciter, surah) pair into a playable track DTO.
 *
 * This is the single place where a playable URL is produced, so the
 * "reciter has actually recorded this surah" invariant is enforced exactly
 * once and the UI can never construct a 404.
 */
export class BuildTrack {
  constructor(
    private readonly reciters: ReciterRepository,
    private readonly surahs: SurahRepository,
  ) {}

  async execute(
    reciterId: string,
    surahNumber: number,
  ): Promise<Result<TrackDto>> {
    const number = SurahNumber.create(surahNumber);
    if (!number.ok) return number;

    const surah = this.surahs.findByNumber(surahNumber);
    if (surah === null) {
      return Err(
        DomainError.of("surah.not_found", "Unknown surah", { surahNumber }),
      );
    }

    const found = await this.reciters.findById(reciterId);
    if (!found.ok) return found;
    if (found.value === null) {
      return Err(
        DomainError.of("reciter.not_found", "Unknown reciter", { reciterId }),
      );
    }

    const track = found.value.trackFor(number.value);
    if (!track.ok) return track;

    return Ok(toTrackDto(track.value, surah));
  }

  /** Every surah a reciter has recorded, in ascending order. */
  async executeAll(reciterId: string): Promise<Result<TrackDto[]>> {
    const found = await this.reciters.findById(reciterId);
    if (!found.ok) return found;
    if (found.value === null) {
      return Err(
        DomainError.of("reciter.not_found", "Unknown reciter", { reciterId }),
      );
    }

    const reciter = found.value;
    const tracks: TrackDto[] = [];

    for (const surahNumber of [...reciter.availableSurahs].sort(
      (a, b) => a - b,
    )) {
      const number = SurahNumber.create(surahNumber);
      const surah = this.surahs.findByNumber(surahNumber);
      if (!number.ok || surah === null) continue;

      const track = reciter.trackFor(number.value);
      if (!track.ok) continue;

      tracks.push(toTrackDto(track.value, surah));
    }

    return Ok(tracks);
  }
}
