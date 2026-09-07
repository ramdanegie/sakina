import { describe, expect, it } from "vitest";
import { Queue } from "./queue.entity";
import { RepeatMode } from "./value-objects";

const tracks = ["a", "b", "c", "d"];

describe("Queue.of", () => {
  it("rejects an empty track list", () => {
    const result = Queue.of([]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("queue.empty");
  });

  it("rejects duplicate tracks", () => {
    const result = Queue.of(["a", "a"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("queue.duplicate_tracks");
  });

  it("rejects a start index outside the queue", () => {
    const result = Queue.of(tracks, 9);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("queue.index_out_of_range");
  });

  it("starts at the requested index", () => {
    const queue = Queue.of(tracks, 2);
    expect(queue.ok).toBe(true);
    if (queue.ok) expect(queue.value.currentTrackId).toBe("c");
  });
});

describe("Queue.next", () => {
  it("advances through the queue", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.next(RepeatMode.Off)?.currentTrackId).toBe("b");
  });

  it("returns null past the end when repeat is off", () => {
    const queue = Queue.of(tracks, 3);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.next(RepeatMode.Off)).toBeNull();
  });

  it("wraps to the start when repeat is all", () => {
    const queue = Queue.of(tracks, 3);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.next(RepeatMode.All)?.currentTrackId).toBe("a");
  });

  it("stays on the same track when repeat is one", () => {
    const queue = Queue.of(tracks, 1);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.next(RepeatMode.One)?.currentTrackId).toBe("b");
  });
});

describe("Queue.previous", () => {
  it("steps back", () => {
    const queue = Queue.of(tracks, 2);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.previous(RepeatMode.Off)?.currentTrackId).toBe("b");
  });

  it("returns null at the head when repeat is off", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.previous(RepeatMode.Off)).toBeNull();
  });

  it("wraps to the tail when repeat is all", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");
    expect(queue.value.previous(RepeatMode.All)?.currentTrackId).toBe("d");
  });
});

describe("Queue shuffle", () => {
  it("keeps the current track playing first", () => {
    const queue = Queue.of(tracks, 2);
    if (!queue.ok) throw new Error("setup failed");

    const shuffled = queue.value.withShuffle(true, () => 0.5);
    expect(shuffled.isShuffled).toBe(true);
    expect(shuffled.currentTrackId).toBe("c");
    expect(shuffled.playOrder[0]).toBe("c");
  });

  it("contains every original track exactly once", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");

    const shuffled = queue.value.withShuffle(true, () => 0.25);
    expect([...shuffled.playOrder].sort()).toEqual([...tracks].sort());
  });

  it("restores the original order when disabled", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");

    const restored = queue.value.withShuffle(true, () => 0.7).withShuffle(false);
    expect(restored.isShuffled).toBe(false);
    expect(restored.playOrder).toEqual(tracks);
  });
});

describe("Queue.reorder", () => {
  it("moves a track and keeps the current one selected", () => {
    const queue = Queue.of(tracks, 0); // playing "a"
    if (!queue.ok) throw new Error("setup failed");

    const reordered = queue.value.reorder(0, 3); // a -> end
    expect(reordered.ok).toBe(true);
    if (!reordered.ok) return;

    expect(reordered.value.items).toEqual(["b", "c", "d", "a"]);
    expect(reordered.value.currentTrackId).toBe("a");
  });

  it("rejects out-of-range indices", () => {
    const queue = Queue.of(tracks, 0);
    if (!queue.ok) throw new Error("setup failed");
    const result = queue.value.reorder(0, 99);
    expect(result.ok).toBe(false);
  });
});

describe("Queue.remove", () => {
  it("shifts the current index when removing an earlier track", () => {
    const queue = Queue.of(tracks, 2); // playing "c"
    if (!queue.ok) throw new Error("setup failed");

    const removed = queue.value.remove("a");
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect(removed.value.currentTrackId).toBe("c");
  });

  it("refuses to empty an active queue", () => {
    const queue = Queue.of(["only"], 0);
    if (!queue.ok) throw new Error("setup failed");

    const removed = queue.value.remove("only");
    expect(removed.ok).toBe(false);
    if (!removed.ok) expect(removed.error.code).toBe("queue.cannot_empty");
  });
});
