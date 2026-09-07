import type { MediaSessionPort } from "@/application/ports";

/**
 * Lock-screen and notification-tray transport controls.
 *
 * This is the single most important adapter for the "listen while working or
 * sleeping" use case. On iOS standalone PWAs there is a known WebKit defect
 * where audio left paused in the background stops responding after roughly 30
 * seconds until the app is foregrounded again (WebKit bug 261858). We cannot
 * fix that from here; wiring Media Session correctly is what keeps the OS-level
 * controls working for as long as the platform allows.
 *
 * Every call is defensive: Media Session is absent or partial on several
 * browsers, and an unsupported action handler throws rather than no-opping.
 */
export class MediaSessionAdapter implements MediaSessionPort {
  private get session(): MediaSession | null {
    if (typeof navigator === "undefined") return null;
    return navigator.mediaSession ?? null;
  }

  setMetadata(metadata: {
    title: string;
    artist: string;
    album: string;
    artworkUrl: string | null;
  }): void {
    const session = this.session;
    if (session === null || typeof MediaMetadata === "undefined") return;

    // Safari is picky about artwork: oversized or unusual formats are simply
    // ignored, so we advertise a small set of standard square sizes.
    const artwork =
      metadata.artworkUrl === null
        ? []
        : [96, 192, 512].map((size) => ({
            src: metadata.artworkUrl as string,
            sizes: `${size}x${size}`,
            type: "image/png",
          }));

    try {
      session.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        artwork,
      });
    } catch {
      // Metadata is cosmetic; never let it break playback.
    }
  }

  setPlaybackState(state: "playing" | "paused" | "none"): void {
    const session = this.session;
    if (session === null) return;
    try {
      session.playbackState = state;
    } catch {
      // Not supported everywhere.
    }
  }

  setPositionState(position: number, duration: number, speed: number): void {
    const session = this.session;
    if (session === null || typeof session.setPositionState !== "function") {
      return;
    }
    // setPositionState throws if position > duration or duration is not finite.
    if (!Number.isFinite(duration) || duration <= 0) return;

    try {
      session.setPositionState({
        duration,
        position: Math.min(Math.max(position, 0), duration),
        playbackRate: speed > 0 ? speed : 1,
      });
    } catch {
      // Ignore: some engines reject rapid updates.
    }
  }

  setHandlers(handlers: {
    onPlay: () => void;
    onPause: () => void;
    onNextTrack: () => void;
    onPreviousTrack: () => void;
    onSeekTo: (seconds: number) => void;
  }): void {
    const session = this.session;
    if (session === null) return;

    const bind = (action: MediaSessionAction, handler: () => void) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Unsupported action on this browser.
      }
    };

    bind("play", handlers.onPlay);
    bind("pause", handlers.onPause);
    bind("nexttrack", handlers.onNextTrack);
    bind("previoustrack", handlers.onPreviousTrack);

    try {
      session.setActionHandler("seekto", (details) => {
        if (typeof details.seekTime === "number") {
          handlers.onSeekTo(details.seekTime);
        }
      });
    } catch {
      // Not supported.
    }
  }

  clear(): void {
    const session = this.session;
    if (session === null) return;

    const actions: MediaSessionAction[] = [
      "play",
      "pause",
      "nexttrack",
      "previoustrack",
      "seekto",
    ];
    for (const action of actions) {
      try {
        session.setActionHandler(action, null);
      } catch {
        // Ignore.
      }
    }

    try {
      session.metadata = null;
      session.playbackState = "none";
    } catch {
      // Ignore.
    }
  }
}
