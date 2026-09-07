import { AggregateRoot } from "../shared/entity";
import { domainEvent, DomainEventName } from "../shared/domain-event";
import { Err, Ok, DomainError, type Result } from "../shared/result";
import { clamp } from "../shared/value-object";
import { AmbientSound } from "./ambient-sound.entity";

export interface MixLayer {
  readonly ambientId: string;
  /** 0..1 gain for this individual layer. */
  readonly level: number;
}

/**
 * The set of ambient sounds playing behind the recitation.
 *
 * Invariants:
 *  - at most MAX_LAYERS active at once
 *  - selecting "none" clears the whole mix
 *  - each layer level stays within [0, 1]
 */
export class AmbientMix extends AggregateRoot<string> {
  static readonly MAX_LAYERS = 3;
  static readonly DEFAULT_LEVEL = 0.35;

  private constructor(
    id: string,
    private layers: MixLayer[],
  ) {
    super(id);
  }

  static empty(id = "default"): AmbientMix {
    return new AmbientMix(id, []);
  }

  get isEmpty(): boolean {
    return this.layers.length === 0;
  }

  get activeLayers(): readonly MixLayer[] {
    return this.layers;
  }

  get primaryAmbientId(): string | null {
    return this.layers.length > 0 ? this.layers[0].ambientId : null;
  }

  has(ambientId: string): boolean {
    return this.layers.some((l) => l.ambientId === ambientId);
  }

  /**
   * Single-select behaviour used by the picker: replaces the mix entirely.
   * Passing the "none" sentinel clears it.
   */
  select(ambientId: string, level = AmbientMix.DEFAULT_LEVEL): Result<void> {
    if (ambientId === AmbientSound.NONE_ID) {
      this.layers = [];
      this.record(
        domainEvent(DomainEventName.AmbientChanged, { ambientId: null }),
      );
      return Ok(undefined);
    }

    this.layers = [{ ambientId, level: clamp(level, 0, 1) }];
    this.record(domainEvent(DomainEventName.AmbientChanged, { ambientId }));
    return Ok(undefined);
  }

  /** Multi-select mixer mode — capped at MAX_LAYERS. */
  addLayer(ambientId: string, level = AmbientMix.DEFAULT_LEVEL): Result<void> {
    if (ambientId === AmbientSound.NONE_ID) {
      return Err(
        DomainError.of(
          "ambient_mix.cannot_layer_none",
          '"No sounds" cannot be added as a layer',
        ),
      );
    }
    if (this.has(ambientId)) {
      return Err(
        DomainError.of(
          "ambient_mix.duplicate_layer",
          "That ambient sound is already in the mix",
          { ambientId },
        ),
      );
    }
    if (this.layers.length >= AmbientMix.MAX_LAYERS) {
      return Err(
        DomainError.of(
          "ambient_mix.too_many_layers",
          `A mix can hold at most ${AmbientMix.MAX_LAYERS} sounds`,
          { current: this.layers.length },
        ),
      );
    }

    this.layers = [...this.layers, { ambientId, level: clamp(level, 0, 1) }];
    this.record(domainEvent(DomainEventName.AmbientChanged, { ambientId }));
    return Ok(undefined);
  }

  removeLayer(ambientId: string): Result<void> {
    if (!this.has(ambientId)) {
      return Err(
        DomainError.of(
          "ambient_mix.layer_not_found",
          "That ambient sound is not in the mix",
          { ambientId },
        ),
      );
    }
    this.layers = this.layers.filter((l) => l.ambientId !== ambientId);
    this.record(
      domainEvent(DomainEventName.AmbientChanged, {
        ambientId: this.primaryAmbientId,
      }),
    );
    return Ok(undefined);
  }

  setLayerLevel(ambientId: string, level: number): Result<void> {
    if (!this.has(ambientId)) {
      return Err(
        DomainError.of(
          "ambient_mix.layer_not_found",
          "That ambient sound is not in the mix",
          { ambientId },
        ),
      );
    }
    this.layers = this.layers.map((l) =>
      l.ambientId === ambientId ? { ...l, level: clamp(level, 0, 1) } : l,
    );
    return Ok(undefined);
  }

  clear(): void {
    if (this.layers.length === 0) return;
    this.layers = [];
    this.record(
      domainEvent(DomainEventName.AmbientChanged, { ambientId: null }),
    );
  }

  /**
   * Effective per-layer gain after applying the master ambient volume.
   * Layers share the budget so stacking three sounds is not three times louder.
   */
  effectiveGains(masterAmbientLevel: number): ReadonlyMap<string, number> {
    const master = clamp(masterAmbientLevel, 0, 1);
    const gains = new Map<string, number>();
    if (this.layers.length === 0) return gains;

    const share = 1 / Math.sqrt(this.layers.length);
    for (const layer of this.layers) {
      gains.set(layer.ambientId, clamp(layer.level * master * share, 0, 1));
    }
    return gains;
  }
}
