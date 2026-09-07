import {
  AmbientLicense,
  AmbientSound,
} from "@/domain/ambience/ambient-sound.entity";
import type { AmbientSoundRepository } from "@/domain/repositories";

/**
 * The ambient catalogue.
 *
 * Every bed is generated in the browser from noise, filters and LFOs
 * (see infrastructure/audio/ambient-synth.ts) rather than shipped as audio.
 * That means nothing to download, no loop seam, and no third-party licence to
 * track — the sound is original output of our own code.
 */
interface AmbientRecord {
  id: string;
  name: string;
  icon: string;
  attribution: string;
  sourceUrl: string;
}

const GENERATED = "Generated in-app (original synthesis)";

const RECORDS: AmbientRecord[] = [
  {
    id: "rain",
    name: "Rain",
    icon: "CloudRain",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "birds",
    name: "Birds",
    icon: "Bird",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "fire",
    name: "Fire",
    icon: "Flame",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "wave",
    name: "Wave",
    icon: "Waves",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "wind",
    name: "Wind",
    icon: "Wind",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "river",
    name: "River",
    icon: "Droplet",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "crickets",
    name: "Crickets",
    icon: "Moon",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "thunder-storm",
    name: "Thunder Storm",
    icon: "CloudLightning",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "thunder",
    name: "Thunder",
    icon: "Zap",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "owl",
    name: "Owl",
    icon: "Feather",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "cat",
    name: "Cat",
    icon: "Cat",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "whale",
    name: "Whale",
    icon: "Fish",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "train",
    name: "Train",
    icon: "TrainFront",
    attribution: GENERATED,
    sourceUrl: "",
  },
  {
    id: "night-forest",
    name: "Night Forest",
    icon: "Trees",
    attribution: GENERATED,
    sourceUrl: "",
  },
];

export const AMBIENT_SOUNDS: readonly AmbientSound[] = [
  AmbientSound.none(),
  ...RECORDS.map((record) =>
    AmbientSound.create({
      id: record.id,
      name: record.name,
      icon: record.icon,
      // Synthesised at play time; no file is fetched.
      audioUrl: "",
      imageUrl: null,
      license: AmbientLicense.Original,
      attribution: record.attribution,
      sourceUrl: record.sourceUrl,
    }),
  ),
];

export class StaticAmbientSoundRepository implements AmbientSoundRepository {
  private readonly byId = new Map(AMBIENT_SOUNDS.map((s) => [s.id, s]));

  findAll(): AmbientSound[] {
    return [...AMBIENT_SOUNDS];
  }

  findById(id: string): AmbientSound | null {
    return this.byId.get(id) ?? null;
  }
}
