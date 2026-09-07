import type { DownloadProgress, OfflineStoragePort } from "@/application/ports";
import { DownloadStatus } from "@/application/ports";

/** Named cache so a version bump can evict audio without touching the shell. */
const AUDIO_CACHE = "quran-audio-v1";

/**
 * Offline audio storage backed by the Cache Storage API.
 *
 * Cache Storage rather than IndexedDB blobs because a cached `Response` is
 * what the service worker can serve back to an `<audio>` element directly,
 * including for HTTP Range requests — which is what makes seeking work inside
 * a downloaded surah. Storing raw blobs in IndexedDB would mean rebuilding
 * range handling by hand.
 */
export class CacheStorageAdapter implements OfflineStoragePort {
  private get available(): boolean {
    return typeof caches !== "undefined";
  }

  async isCached(url: string): Promise<boolean> {
    if (!this.available) return false;
    try {
      const cache = await caches.open(AUDIO_CACHE);
      return (await cache.match(url)) !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Stream the file so progress can be reported as it arrives. A plain
   * `cache.add()` would be shorter but gives no feedback, and a 40MB surah on
   * mobile data needs a progress bar to feel survivable.
   */
  async cache(
    url: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    if (!this.available) {
      throw new Error("Offline storage is not available in this browser");
    }

    const cache = await caches.open(AUDIO_CACHE);
    if ((await cache.match(url)) !== undefined) return;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const totalBytes = Number(response.headers.get("content-length") ?? 0);
    const body = response.body;

    // No readable stream (or no length): fall back to a single buffered read.
    if (body === null) {
      await cache.put(url, response.clone());
      onProgress?.({
        targetId: url,
        status: DownloadStatus.Completed,
        receivedBytes: totalBytes,
        totalBytes,
      });
      return;
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;

      chunks.push(value);
      receivedBytes += value.byteLength;
      onProgress?.({
        targetId: url,
        status: DownloadStatus.Downloading,
        receivedBytes,
        totalBytes,
      });
    }

    // Rebuild a Response so the cached entry keeps the original headers —
    // content-type and accept-ranges matter for playback.
    const blob = new Blob(chunks as BlobPart[], {
      type: response.headers.get("content-type") ?? "audio/mpeg",
    });
    await cache.put(
      url,
      new Response(blob, {
        status: 200,
        headers: {
          "content-type": blob.type,
          "content-length": String(blob.size),
          "accept-ranges": "bytes",
        },
      }),
    );

    onProgress?.({
      targetId: url,
      status: DownloadStatus.Completed,
      receivedBytes: blob.size,
      totalBytes: blob.size,
    });
  }

  async evict(url: string): Promise<void> {
    if (!this.available) return;
    const cache = await caches.open(AUDIO_CACHE);
    await cache.delete(url);
  }

  async evictAll(): Promise<void> {
    if (!this.available) return;
    await caches.delete(AUDIO_CACHE);
  }

  async estimateRemainingBytes(): Promise<number | null> {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.storage?.estimate !== "function"
    ) {
      return null;
    }

    try {
      const { quota, usage } = await navigator.storage.estimate();
      if (quota === undefined || usage === undefined) return null;
      return Math.max(0, quota - usage);
    } catch {
      return null;
    }
  }

  /** Total bytes currently held, for the "clear cached audio" row. */
  async usedBytes(): Promise<number> {
    if (!this.available) return 0;
    try {
      const cache = await caches.open(AUDIO_CACHE);
      const keys = await cache.keys();
      let total = 0;
      for (const key of keys) {
        const hit = await cache.match(key);
        if (hit === undefined) continue;
        const length = Number(hit.headers.get("content-length") ?? 0);
        total += Number.isFinite(length) ? length : 0;
      }
      return total;
    } catch {
      return 0;
    }
  }
}
