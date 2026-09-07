/**
 * DTOs crossing the application boundary into the UI.
 *
 * These are plain, serialisable shapes — no domain classes leak into React
 * state, which keeps Server/Client Component boundaries and Zustand
 * persistence trivial.
 */

export interface ReciterDto {
  readonly id: string;
  readonly slug: string;
  readonly nameLatin: string;
  readonly nameArabic: string;
  readonly countryCode: string | null;
  readonly rewaya: string;
  readonly avatarUrl: string | null;
  readonly surahCount: number;
  readonly isNew: boolean;
  readonly popularity: number;
}

export interface SurahDto {
  readonly number: number;
  readonly nameLatin: string;
  readonly nameArabic: string;
  readonly nameTranslation: string;
  readonly ayahCount: number;
  readonly revelationPlace: string;
}

export interface TrackDto {
  readonly id: string;
  readonly reciterId: string;
  readonly reciterName: string;
  readonly reciterAvatarUrl: string | null;
  readonly surahNumber: number;
  readonly surahNameLatin: string;
  readonly surahNameArabic: string;
  readonly surahNameTranslation: string;
  readonly audioUrl: string;
  readonly durationSec: number | null;
}

export interface AmbientSoundDto {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly audioUrl: string;
  readonly imageUrl: string | null;
  readonly license: string;
  readonly attribution: string;
  readonly sourceUrl: string;
}

export interface PlaylistDto {
  readonly id: string;
  readonly name: string;
  readonly coverGradient: string;
  readonly isSystem: boolean;
  readonly systemKind: string | null;
  readonly trackIds: readonly string[];
  readonly trackCount: number;
}

export interface WeekdayCellDto {
  readonly dayIso: string;
  readonly weekdayIndex: number;
  readonly totalSeconds: number;
  readonly goalReached: boolean;
}

export interface InsightsDto {
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly todaySeconds: number;
  readonly weekSeconds: number;
  readonly goalSeconds: number;
  readonly goalReachedToday: boolean;
  readonly week: readonly WeekdayCellDto[];
  readonly allTimeSeconds: number;
}

export interface SearchResultsDto {
  readonly reciters: readonly ReciterDto[];
  readonly surahs: readonly SurahDto[];
  readonly playlists: readonly PlaylistDto[];
  readonly ambientSounds: readonly AmbientSoundDto[];
}
