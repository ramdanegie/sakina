export interface DomainEvent {
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
}

export function domainEvent(
  name: string,
  payload: Record<string, unknown>,
  occurredAt: Date = new Date(),
): DomainEvent {
  return { name, occurredAt, payload };
}

export const DomainEventName = {
  TrackStarted: "playback.track_started",
  TrackPaused: "playback.track_paused",
  TrackCompleted: "playback.track_completed",
  QueueReordered: "playback.queue_reordered",
  AmbientChanged: "ambience.ambient_changed",
  SleepTimerExpired: "playback.sleep_timer_expired",
  DailyGoalReached: "habit.daily_goal_reached",
  StreakBroken: "habit.streak_broken",
  DownloadCompleted: "offline.download_completed",
} as const;

export type DomainEventName =
  (typeof DomainEventName)[keyof typeof DomainEventName];
