import type { AmbientSoundDto } from "@/application/dto";
import { AMBIENT_SOUNDS } from "@/infrastructure/content/ambient-catalog";
import { toAmbientSoundDto } from "@/application/mappers";

/**
 * The ambient catalogue as plain DTOs, computed once at module load.
 * It is static, so there is no reason to rebuild it on every render.
 */
export const AMBIENT_SOUND_DTOS: readonly AmbientSoundDto[] =
  AMBIENT_SOUNDS.map(toAmbientSoundDto);

export function findAmbient(id: string): AmbientSoundDto | null {
  return AMBIENT_SOUND_DTOS.find((sound) => sound.id === id) ?? null;
}
