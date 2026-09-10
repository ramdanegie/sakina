"use client";

import { create } from "zustand";
import type { AmbientSoundDto, TrackDto } from "@/application/dto";
import { AmbientMix } from "@/domain/ambience/ambient-mix.aggregate";
import { AmbientSound } from "@/domain/ambience/ambient-sound.entity";
import { PlaybackSession } from "@/domain/playback/playback-session.aggregate";
import {
  PlaybackStatus,
  RepeatMode,
  SleepTimer,
} from "@/domain/playback/value-objects";
import { getAudioContainer, getContainer } from "@/infrastructure/di/container";

/**
 * The player store.
 *
 * Zustand holds a *projection* of the domain aggregates, not the state itself:
 * `PlaybackSession` and `AmbientMix` remain the source of truth and enforce
 * every invariant, while the store copies the resulting scalars out for React
 * to render. That keeps the rules in the domain (and unit-testable) instead of
 * scattered through components.
 *
 * The store lives outside the React tree, which is what lets audio survive
 * route changes — the mini player keeps playing while the user browses.
 */

const session = PlaybackSession.start("local");
const mix = AmbientMix.empty();

/** Persist at most every 5s; timeupdate fires ~4x/second. */
const PERSIST_INTERVAL_MS = 5_000;

/**
 * How often an uninterrupted listen is banked to storage. Short enough that
 * closing the tab loses little, long enough not to churn IndexedDB.
 */
const PERIODIC_FLUSH_MS = 30_000;

interface PlayerState {
  // Projection of PlaybackSession
  status: PlaybackStatus;
  currentTrack: TrackDto | null;
  queue: TrackDto[];
  positionSec: number;
  durationSec: number;
  speed: number;
  repeat: RepeatMode;
  shuffle: boolean;
  quranVolume: number;
  ambientVolume: number;
  sleepTimerExpiresAt: number | null;
  sleepUntilEndOfTrack: boolean;

  // Projection of AmbientMix
  ambient: AmbientSoundDto | null;

  // UI-only state
  isPlayerOpen: boolean;
  isReady: boolean;
  /** Whether this platform offers an AirPlay/Cast route picker. */
  canCast: boolean;

  // Commands
  playTrack: (track: TrackDto, queue?: TrackDto[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
  cycleSpeed: () => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  setQuranVolume: (level: number) => void;
  setAmbientVolume: (level: number) => void;
  selectAmbient: (sound: AmbientSoundDto) => Promise<void>;
  setSleepTimerMinutes: (minutes: number | null) => void;
  setSleepUntilEndOfTrack: () => void;
  reorderQueue: (from: number, to: number) => void;
  jumpTo: (trackId: string) => Promise<void>;
  openPlayer: (open: boolean) => void;
  selectRemoteDevice: () => Promise<void>;
  initialise: () => Promise<void>;
}

/** Copy the aggregates' current state into the React-visible projection. */
function project(): Partial<PlayerState> {
  return {
    status: session.status,
    positionSec: session.position.seconds,
    durationSec: session.position.durationSeconds,
    speed: session.speed.value,
    repeat: session.repeat,
    shuffle: session.queue.isShuffled,
    quranVolume: session.quranVolume.level,
    ambientVolume: session.ambientVolume.level,
    sleepTimerExpiresAt: session.sleepTimer.expiresAt?.getTime() ?? null,
    sleepUntilEndOfTrack: session.sleepTimer.isUntilEndOfTrack,
  };
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  let wired = false;
  let lastPersistAt = 0;
  let lastTickAt = 0;

  function trackById(id: string | null): TrackDto | null {
    if (id === null) return null;
    return get().queue.find((t) => t.id === id) ?? null;
  }

  async function loadCurrentIntoEngine(autoplay: boolean): Promise<void> {
    const audio = getAudioContainer();
    const track = trackById(session.currentTrackId);
    if (audio === null || track === null) return;

    await audio.player.load({
      trackId: track.id,
      url: track.audioUrl,
      title: track.surahNameLatin,
      artist: track.reciterName,
      artworkUrl: track.reciterAvatarUrl,
    });

    audio.player.setVolume(session.quranVolume.level);
    audio.player.setSpeed(session.speed.value);

    audio.mediaSession.setMetadata({
      title: `${track.surahNumber}. ${track.surahNameLatin}`,
      artist: track.reciterName,
      album: "Quran",
      artworkUrl: track.reciterAvatarUrl,
    });

    set({ currentTrack: track, ...project() });

    getContainer().habit.beginTrack({
      trackId: track.id,
      reciterId: track.reciterId,
      surahNumber: track.surahNumber,
      ambientId: get().ambient?.id ?? null,
    });

    if (autoplay) {
      const started = session.play(audio.player.getDuration());
      if (started.ok) {
        await audio.player.play();
        audio.mediaSession.setPlaybackState("playing");
      }
      set(project());
    }
  }

  /** Persist "continue listening" — throttled, since timeupdate is chatty. */
  function persistState(): void {
    const now = Date.now();
    if (now - lastPersistAt < PERSIST_INTERVAL_MS) return;
    lastPersistAt = now;

    const track = get().currentTrack;
    if (track === null) return;

    void getContainer().playbackState.save({
      trackId: track.id,
      reciterId: track.reciterId,
      surahNumber: track.surahNumber,
      queueTrackIds: get().queue.map((t) => t.id),
      queueIndex: session.queue.index,
      positionSec: session.position.seconds,
      speed: session.speed.value,
      repeatMode: session.repeat,
      shuffle: session.queue.isShuffled,
      ambientId: get().ambient?.id ?? null,
      volumeQuran: session.quranVolume.level,
      volumeAmbient: session.ambientVolume.level,
      updatedAt: new Date(),
    });
  }

  /** Attach engine listeners exactly once. */
  function wireEngine(): void {
    const audio = getAudioContainer();
    if (audio === null || wired) return;
    wired = true;

    // Listening time was only written on pause, skip or track change. Anyone
    // who put a surah on and closed the tab lost the whole session — which is
    // most of them. These two make the record durable:
    //
    //  - a periodic flush, so a long unbroken listen is banked as it happens
    //  - a flush on pagehide/hidden, the last moment a mobile browser reliably
    //    gives us before it freezes or discards the page
    if (typeof window !== "undefined") {
      setInterval(() => {
        if (session.isPlaying) void getContainer().habit.checkpoint();
      }, PERIODIC_FLUSH_MS);

      const flushNow = () => {
        void getContainer().habit.checkpoint();
      };

      // `pagehide` fires on iOS where `beforeunload` does not.
      window.addEventListener("pagehide", flushNow);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushNow();
      });
    }

    audio.player.onLoadedMetadata((duration) => {
      session.reportProgress(session.position.seconds, duration);
      set(project());
    });

    audio.player.onTimeUpdate((currentTime, duration) => {
      session.reportProgress(currentTime, duration);

      // Credit only real elapsed time, so seeking cannot inflate the streak.
      const now = Date.now();
      if (lastTickAt > 0 && session.isPlaying) {
        const delta = (now - lastTickAt) / 1000;
        if (delta > 0 && delta < 5) getContainer().habit.addSeconds(delta);
      }
      lastTickAt = now;

      // Sleep timer: fade out over the final seconds, then stop.
      const timer = session.sleepTimer;
      if (timer.isActive && timer.isFading(new Date())) {
        const remaining = timer.remainingSeconds(new Date());
        audio.player.fadeOut(remaining);
        // Both channels dim together, or the bed stays at full level right up
        // to the moment playback stops.
        audio.ambientMixer.fadeOut(remaining);
      }
      if (session.tickSleepTimer(new Date())) {
        audio.player.pause();
        audio.ambientMixer.stopAll();
        void getContainer().habit.flush();
      }

      audio.mediaSession.setPositionState(
        currentTime,
        duration,
        session.speed.value,
      );
      persistState();
      set(project());
    });

    audio.player.onEnded(() => {
      void getContainer().habit.flush();
      const before = session.currentTrackId;
      session.completeCurrentTrack();

      if (session.status === PlaybackStatus.Ended) {
        audio.mediaSession.setPlaybackState("paused");
        set(project());
        return;
      }

      if (session.currentTrackId === before && session.repeat === RepeatMode.One) {
        audio.player.seek(0);
        void audio.player.play();
        set(project());
        return;
      }

      void loadCurrentIntoEngine(true);
    });

    audio.player.onPlayingStateChange((isPlaying) => {
      if (!isPlaying) lastTickAt = 0;
      audio.mediaSession.setPlaybackState(isPlaying ? "playing" : "paused");
    });

    audio.mediaSession.setHandlers({
      onPlay: () => void get().togglePlay(),
      onPause: () => void get().togglePlay(),
      onNextTrack: () => void get().next(),
      onPreviousTrack: () => void get().previous(),
      onSeekTo: (seconds) => get().seek(seconds),
    });
  }

  return {
    status: PlaybackStatus.Idle,
    currentTrack: null,
    queue: [],
    positionSec: 0,
    durationSec: 0,
    speed: 1,
    repeat: RepeatMode.Off,
    shuffle: false,
    quranVolume: 1,
    ambientVolume: PlaybackSession.DEFAULT_AMBIENT_LEVEL,
    sleepTimerExpiresAt: null,
    sleepUntilEndOfTrack: false,
    ambient: null,
    isPlayerOpen: false,
    isReady: false,
    // Resolved on the client during initialise(); false during SSR.
    canCast: false,

    async initialise() {
      if (get().isReady) return;
      wireEngine();
      set({
        isReady: true,
        canCast: getAudioContainer()?.player.canSelectRemoteDevice() ?? false,
      });
    },

    async selectRemoteDevice() {
      await getAudioContainer()?.player.selectRemoteDevice();
    },

    async playTrack(track, queue) {
      wireEngine();

      const list = queue ?? [track];
      const startIndex = Math.max(
        0,
        list.findIndex((t) => t.id === track.id),
      );

      const loaded = session.loadQueue(
        list.map((t) => t.id),
        startIndex,
      );
      if (!loaded.ok) return;

      set({ queue: list, ...project() });
      await loadCurrentIntoEngine(true);
    },

    async togglePlay() {
      const audio = getAudioContainer();
      if (audio === null || session.currentTrackId === null) return;

      if (session.isPlaying) {
        const paused = session.pause();
        if (paused.ok) {
          audio.player.pause();
          audio.mediaSession.setPlaybackState("paused");
          void getContainer().habit.flush();
        }
      } else {
        const resumed = session.resume();
        if (resumed.ok) {
          await audio.player.play();
          audio.mediaSession.setPlaybackState("playing");
        }
      }
      set(project());
    },

    async next() {
      void getContainer().habit.flush();
      const moved = session.skipNext();
      if (!moved.ok) return;

      if (session.status === PlaybackStatus.Ended) {
        set(project());
        return;
      }
      await loadCurrentIntoEngine(true);
    },

    async previous() {
      const audio = getAudioContainer();
      const before = session.currentTrackId;

      const moved = session.skipPrevious();
      if (!moved.ok) return;

      // Restarting the same track only needs a seek, not a reload.
      if (session.currentTrackId === before) {
        audio?.player.seek(0);
        set(project());
        return;
      }

      void getContainer().habit.flush();
      await loadCurrentIntoEngine(true);
    },

    seek(seconds) {
      const audio = getAudioContainer();
      const done = session.seekTo(seconds);
      if (!done.ok) return;
      audio?.player.seek(session.position.seconds);
      set(project());
    },

    cycleSpeed() {
      session.cycleSpeed();
      getAudioContainer()?.player.setSpeed(session.speed.value);
      set(project());
    },

    cycleRepeat() {
      session.cycleRepeat();
      set(project());
    },

    toggleShuffle() {
      session.setShuffle(!session.queue.isShuffled);
      set(project());
    },

    setQuranVolume(level) {
      session.setQuranVolume(level);
      const audio = getAudioContainer();
      audio?.player.setVolume(session.quranVolume.level);
      // The ambient ceiling is relative to the recitation volume, so it may
      // have been lowered too — push the recomputed value to the mixer.
      audio?.ambientMixer.setMasterGain(session.ambientVolume.level);
      set(project());
    },

    setAmbientVolume(level) {
      session.setAmbientVolume(level);
      getAudioContainer()?.ambientMixer.setMasterGain(
        session.ambientVolume.level,
      );
      set(project());
    },

    async selectAmbient(sound) {
      const audio = getAudioContainer();
      const selected = mix.select(sound.id);
      if (!selected.ok) return;

      if (sound.id === AmbientSound.NONE_ID) {
        audio?.ambientMixer.stopAll();
        set({ ambient: null, ...project() });
        return;
      }

      set({ ambient: sound, ...project() });

      if (audio !== null) {
        audio.ambientMixer.stopAll();
        try {
          await audio.ambientMixer.play(
            sound.id,
            sound.audioUrl,
            session.ambientVolume.level,
          );
        } catch {
          // Asset missing or decode failed — keep the recitation playing.
          set({ ambient: null });
        }
      }
    },

    setSleepTimerMinutes(minutes) {
      if (minutes === null) {
        session.clearSleepTimer();
        getAudioContainer()?.player.cancelFade();
        getAudioContainer()?.ambientMixer.cancelFade();
        set(project());
        return;
      }

      const timer = SleepTimer.inMinutes(minutes, new Date());
      if (!timer.ok) return;
      session.setSleepTimer(timer.value);
      getAudioContainer()?.player.cancelFade();
      getAudioContainer()?.ambientMixer.cancelFade();
      set(project());
    },

    setSleepUntilEndOfTrack() {
      session.setSleepTimer(SleepTimer.untilEndOfTrack());
      set(project());
    },

    reorderQueue(from, to) {
      const done = session.reorderQueue(from, to);
      if (!done.ok) return;

      const ordered = session.queue.items
        .map((id) => get().queue.find((t) => t.id === id))
        .filter((t): t is TrackDto => t !== undefined);

      set({ queue: ordered, ...project() });
    },

    async jumpTo(trackId) {
      void getContainer().habit.flush();
      const done = session.jumpTo(trackId);
      if (!done.ok) return;
      await loadCurrentIntoEngine(true);
    },

    openPlayer(open) {
      set({ isPlayerOpen: open });
    },
  };
});
