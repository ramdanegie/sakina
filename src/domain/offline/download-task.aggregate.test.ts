import { describe, expect, it } from "vitest";
import { DomainEventName } from "../shared/domain-event";
import { DownloadState, DownloadTask } from "./download-task.aggregate";

const NOW = new Date("2026-03-10T10:00:00Z");

function newTask(url = "https://cdn.example.com/096.mp3"): DownloadTask {
  const result = DownloadTask.queue({
    id: "r1:096",
    trackId: "r1:096",
    reciterId: "r1",
    surahNumber: 96,
    url,
    now: NOW,
  });
  if (!result.ok) throw new Error("setup failed");
  return result.value;
}

describe("DownloadTask.queue", () => {
  it("rejects a blank url", () => {
    const result = DownloadTask.queue({
      id: "t",
      trackId: "t",
      reciterId: "r",
      surahNumber: 1,
      url: "   ",
      now: NOW,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("download.url_required");
  });

  it("starts queued with no bytes", () => {
    const task = newTask();
    expect(task.state).toBe(DownloadState.Queued);
    expect(task.receivedBytes).toBe(0);
    expect(task.progress).toBe(0);
    expect(task.isActive).toBe(true);
    expect(task.isTerminal).toBe(false);
  });

  it("exposes its metadata", () => {
    const task = newTask();
    expect(task.trackId).toBe("r1:096");
    expect(task.reciterId).toBe("r1");
    expect(task.surahNumber).toBe(96);
    expect(task.url).toBe("https://cdn.example.com/096.mp3");
    expect(task.error).toBeNull();
  });
});

describe("DownloadTask progress", () => {
  it("reports a 0..1 ratio", () => {
    const task = newTask();
    task.start();
    task.reportProgress(25, 100);
    expect(task.progress).toBe(0.25);
    expect(task.state).toBe(DownloadState.Downloading);
  });

  it("reports zero rather than NaN when the total is unknown", () => {
    const task = newTask();
    task.start();
    task.reportProgress(500, 0);
    expect(task.progress).toBe(0);
  });

  it("ignores a regression in received bytes", () => {
    const task = newTask();
    task.start();
    task.reportProgress(80, 100);
    task.reportProgress(20, 100);
    expect(task.receivedBytes).toBe(80);
  });
});

describe("DownloadTask completion", () => {
  it("emits DownloadCompleted and reports full progress", () => {
    const task = newTask();
    task.start();
    task.complete(4096);

    expect(task.state).toBe(DownloadState.Completed);
    expect(task.progress).toBe(1);
    expect(task.isTerminal).toBe(true);
    expect(task.isActive).toBe(false);
    expect(task.pullEvents().map((e) => e.name)).toContain(
      DomainEventName.DownloadCompleted,
    );
  });

  it("refuses to restart once complete", () => {
    const task = newTask();
    task.complete(10);

    const restarted = task.start();
    expect(restarted.ok).toBe(false);
    if (!restarted.ok) {
      expect(restarted.error.code).toBe("download.already_complete");
    }
    expect(task.retry().ok).toBe(false);
  });
});

describe("DownloadTask failure and retry", () => {
  it("records the reason on failure", () => {
    const task = newTask();
    task.start();
    task.fail("network dropped");

    expect(task.state).toBe(DownloadState.Failed);
    expect(task.error).toBe("network dropped");
    expect(task.isTerminal).toBe(true);
  });

  it("resets byte counters on retry so progress is not misleading", () => {
    const task = newTask();
    task.start();
    task.reportProgress(90, 100);
    task.fail("stalled");

    expect(task.retry().ok).toBe(true);
    expect(task.state).toBe(DownloadState.Queued);
    expect(task.receivedBytes).toBe(0);
    expect(task.error).toBeNull();
  });
});

describe("DownloadTask pause", () => {
  it("pauses an active download", () => {
    const task = newTask();
    task.start();
    expect(task.pause().ok).toBe(true);
    expect(task.state).toBe(DownloadState.Paused);
  });

  it("refuses to pause a finished download", () => {
    const task = newTask();
    task.complete(10);

    const paused = task.pause();
    expect(paused.ok).toBe(false);
    if (!paused.ok) expect(paused.error.code).toBe("download.not_active");
  });
});

describe("DownloadTask persistence", () => {
  it("round-trips through a snapshot", () => {
    const task = newTask();
    task.start();
    task.reportProgress(50, 200);

    const restored = DownloadTask.rehydrate(task.snapshot());
    expect(restored.id).toBe("r1:096");
    expect(restored.receivedBytes).toBe(50);
    expect(restored.progress).toBe(0.25);
  });
});
