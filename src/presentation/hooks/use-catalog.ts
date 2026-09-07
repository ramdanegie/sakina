"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReciterDto, SurahDto, TrackDto } from "@/application/dto";
import { toReciterDto, toSurahDto } from "@/application/mappers";
import { getContainer } from "@/infrastructure/di/container";

/**
 * Catalogue hooks.
 *
 * These are the only place presentation touches the container. Everything
 * returned is a plain DTO, so components never hold a domain object.
 */

export function useReciters() {
  return useQuery({
    queryKey: ["reciters"],
    queryFn: async (): Promise<ReciterDto[]> => {
      const result = await getContainer().reciters.findAll();
      if (!result.ok) throw new Error(result.error.message);
      return result.value.map(toReciterDto);
    },
  });
}

export function useReciter(slug: string) {
  return useQuery({
    queryKey: ["reciter", slug],
    queryFn: async (): Promise<ReciterDto | null> => {
      const result = await getContainer().reciters.findBySlug(slug);
      if (!result.ok) throw new Error(result.error.message);
      return result.value === null ? null : toReciterDto(result.value);
    },
    enabled: slug.length > 0,
  });
}

/** Every surah a reciter has recorded, already resolved to playable URLs. */
export function useReciterTracks(reciterId: string | undefined) {
  return useQuery({
    queryKey: ["reciter-tracks", reciterId],
    queryFn: async (): Promise<TrackDto[]> => {
      if (reciterId === undefined) return [];
      const result = await getContainer().buildTrack.executeAll(reciterId);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: reciterId !== undefined,
  });
}

/** Surah metadata is bundled and synchronous — no query needed. */
export function useSurahs(): SurahDto[] {
  return getContainer().surahs.findAll().map(toSurahDto);
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const result = await getContainer().habit.getInsights();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    // Recomputed from raw sessions; cheap enough to refetch on mount.
    staleTime: 30_000,
  });
}

export function usePlaybackState() {
  return useQuery({
    queryKey: ["playback-state"],
    queryFn: async () => {
      const result = await getContainer().playbackState.load();
      if (!result.ok) return null;
      return result.value;
    },
  });
}
