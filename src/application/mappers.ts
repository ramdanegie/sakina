import type { AmbientSound } from "@/domain/ambience/ambient-sound.entity";
import type { InsightsSummary } from "@/domain/habit/habit-tracker.service";
import type { Playlist } from "@/domain/library/playlist.aggregate";
import type { RecitationTrack } from "@/domain/recitation/recitation-track.entity";
import type { Reciter } from "@/domain/recitation/reciter.entity";
import type { Surah } from "@/domain/recitation/surah.entity";
import type {
  AmbientSoundDto,
  InsightsDto,
  PlaylistDto,
  ReciterDto,
  SurahDto,
  TrackDto,
} from "./dto";

export function toReciterDto(reciter: Reciter): ReciterDto {
  return {
    id: reciter.id,
    slug: reciter.slug,
    nameLatin: reciter.nameLatin,
    nameArabic: reciter.nameArabic,
    countryCode: reciter.countryCode,
    rewaya: reciter.rewaya,
    avatarUrl: reciter.avatarUrl,
    surahCount: reciter.surahCount,
    isNew: reciter.isNew,
    popularity: reciter.popularity,
  };
}

export function toSurahDto(surah: Surah): SurahDto {
  return {
    number: surah.number.value,
    nameLatin: surah.nameLatin,
    nameArabic: surah.nameArabic,
    nameTranslation: surah.nameTranslation,
    ayahCount: surah.ayahCount,
    revelationPlace: surah.revelationPlace,
  };
}

export function toTrackDto(track: RecitationTrack, surah: Surah): TrackDto {
  return {
    id: track.id,
    reciterId: track.reciterId,
    reciterName: track.reciterName,
    reciterAvatarUrl: track.reciterAvatarUrl,
    surahNumber: track.surahNumber.value,
    surahNameLatin: surah.nameLatin,
    surahNameArabic: surah.nameArabic,
    surahNameTranslation: surah.nameTranslation,
    audioUrl: track.audioUrl.href,
    durationSec: track.duration?.seconds ?? null,
  };
}

export function toAmbientSoundDto(sound: AmbientSound): AmbientSoundDto {
  return {
    id: sound.id,
    name: sound.name,
    icon: sound.icon,
    audioUrl: sound.audioUrl,
    imageUrl: sound.imageUrl,
    license: sound.license,
    attribution: sound.attribution,
    sourceUrl: sound.sourceUrl,
  };
}

export function toPlaylistDto(playlist: Playlist): PlaylistDto {
  return {
    id: playlist.id,
    name: playlist.name,
    coverGradient: playlist.coverGradient,
    isSystem: playlist.isSystem,
    systemKind: playlist.systemKind,
    trackIds: playlist.trackIds,
    trackCount: playlist.size,
  };
}

export function toInsightsDto(summary: InsightsSummary): InsightsDto {
  return {
    currentStreak: summary.streak.current,
    longestStreak: summary.streak.longest,
    todaySeconds: summary.todaySeconds,
    weekSeconds: summary.weekSeconds,
    goalSeconds: summary.goal.seconds,
    goalReachedToday: summary.goalReachedToday,
    allTimeSeconds: summary.allTimeSeconds,
    week: summary.week.map((cell) => ({
      dayIso: cell.day.iso,
      weekdayIndex: cell.weekdayIndex,
      totalSeconds: cell.totalSeconds,
      goalReached: cell.goalReached,
    })),
  };
}
