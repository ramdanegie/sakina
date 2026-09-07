import { Err, Ok, DomainError, type Result } from "../shared/result";
import { RepeatMode } from "./value-objects";

/**
 * The playback queue. Immutable: every mutation returns a new Queue, which
 * keeps the aggregate easy to reason about and trivially testable.
 *
 * Shuffle is modelled as a separate order array rather than by mutating
 * `trackIds`, so turning shuffle off restores the original order exactly.
 */
export class Queue {
  private constructor(
    private readonly trackIds: readonly string[],
    private readonly currentIndex: number,
    private readonly shuffleOrder: readonly number[] | null,
  ) {}

  static empty(): Queue {
    return new Queue([], -1, null);
  }

  static of(trackIds: readonly string[], startIndex = 0): Result<Queue> {
    if (trackIds.length === 0) {
      return Err(
        DomainError.of("queue.empty", "Queue must contain at least one track"),
      );
    }
    if (startIndex < 0 || startIndex >= trackIds.length) {
      return Err(
        DomainError.of(
          "queue.index_out_of_range",
          "Start index is outside the queue",
          { startIndex, size: trackIds.length },
        ),
      );
    }
    if (new Set(trackIds).size !== trackIds.length) {
      return Err(
        DomainError.of(
          "queue.duplicate_tracks",
          "Queue must not contain duplicate tracks",
        ),
      );
    }
    return Ok(new Queue([...trackIds], startIndex, null));
  }

  get isEmpty(): boolean {
    return this.trackIds.length === 0;
  }

  get size(): number {
    return this.trackIds.length;
  }

  get items(): readonly string[] {
    return this.trackIds;
  }

  get index(): number {
    return this.currentIndex;
  }

  get isShuffled(): boolean {
    return this.shuffleOrder !== null;
  }

  get currentTrackId(): string | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.trackIds.length) {
      return null;
    }
    return this.trackIds[this.currentIndex];
  }

  /** Playback order, honouring shuffle when active. */
  get playOrder(): readonly string[] {
    if (this.shuffleOrder === null) return this.trackIds;
    return this.shuffleOrder.map((i) => this.trackIds[i]);
  }

  private positionInPlayOrder(): number {
    if (this.shuffleOrder === null) return this.currentIndex;
    return this.shuffleOrder.indexOf(this.currentIndex);
  }

  /**
   * Advance one track. Returns null at the end unless repeat is All.
   * With repeat One the same index is returned — the caller restarts the track.
   */
  next(repeat: RepeatMode): Queue | null {
    if (this.isEmpty) return null;
    if (repeat === RepeatMode.One) return this;

    const order = this.shuffleOrder ?? this.trackIds.map((_, i) => i);
    const pos = this.positionInPlayOrder();

    if (pos < order.length - 1) {
      return new Queue(this.trackIds, order[pos + 1], this.shuffleOrder);
    }
    if (repeat === RepeatMode.All) {
      return new Queue(this.trackIds, order[0], this.shuffleOrder);
    }
    return null;
  }

  /** Step back one track. Wraps only when repeat is All. */
  previous(repeat: RepeatMode): Queue | null {
    if (this.isEmpty) return null;
    if (repeat === RepeatMode.One) return this;

    const order = this.shuffleOrder ?? this.trackIds.map((_, i) => i);
    const pos = this.positionInPlayOrder();

    if (pos > 0) {
      return new Queue(this.trackIds, order[pos - 1], this.shuffleOrder);
    }
    if (repeat === RepeatMode.All) {
      return new Queue(
        this.trackIds,
        order[order.length - 1],
        this.shuffleOrder,
      );
    }
    return null;
  }

  jumpTo(trackId: string): Result<Queue> {
    const index = this.trackIds.indexOf(trackId);
    if (index === -1) {
      return Err(
        DomainError.of("queue.track_not_found", "Track is not in the queue", {
          trackId,
        }),
      );
    }
    return Ok(new Queue(this.trackIds, index, this.shuffleOrder));
  }

  /**
   * Enable shuffle. The current track always leads the shuffled order so
   * toggling shuffle mid-track never interrupts what is playing.
   * `random` is injected to keep the domain deterministic under test.
   */
  withShuffle(enabled: boolean, random: () => number = Math.random): Queue {
    if (!enabled) return new Queue(this.trackIds, this.currentIndex, null);
    if (this.isEmpty) return this;

    const rest = this.trackIds
      .map((_, i) => i)
      .filter((i) => i !== this.currentIndex);

    // Fisher-Yates
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    return new Queue(
      this.trackIds,
      this.currentIndex,
      [this.currentIndex, ...rest],
    );
  }

  /** Drag-to-reorder. The currently playing track follows its move. */
  reorder(from: number, to: number): Result<Queue> {
    if (
      from < 0 ||
      from >= this.trackIds.length ||
      to < 0 ||
      to >= this.trackIds.length
    ) {
      return Err(
        DomainError.of(
          "queue.reorder_out_of_range",
          "Reorder indices are outside the queue",
          { from, to, size: this.trackIds.length },
        ),
      );
    }
    if (from === to) return Ok(this);

    const items = [...this.trackIds];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);

    const currentId = this.currentTrackId;
    const nextIndex = currentId === null ? -1 : items.indexOf(currentId);

    // Reordering invalidates the shuffle permutation; drop it.
    return Ok(new Queue(items, nextIndex, null));
  }

  remove(trackId: string): Result<Queue> {
    const index = this.trackIds.indexOf(trackId);
    if (index === -1) {
      return Err(
        DomainError.of("queue.track_not_found", "Track is not in the queue", {
          trackId,
        }),
      );
    }
    if (this.trackIds.length === 1) {
      return Err(
        DomainError.of(
          "queue.cannot_empty",
          "Cannot remove the last track from an active queue",
        ),
      );
    }

    const items = this.trackIds.filter((id) => id !== trackId);
    const nextIndex =
      index < this.currentIndex
        ? this.currentIndex - 1
        : Math.min(this.currentIndex, items.length - 1);

    return Ok(new Queue(items, nextIndex, null));
  }

  snapshot(): {
    trackIds: readonly string[];
    index: number;
    shuffled: boolean;
  } {
    return {
      trackIds: this.trackIds,
      index: this.currentIndex,
      shuffled: this.shuffleOrder !== null,
    };
  }
}
