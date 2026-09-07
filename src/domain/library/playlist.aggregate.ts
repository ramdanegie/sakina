import { AggregateRoot } from "../shared/entity";
import { Err, Ok, DomainError, type Result } from "../shared/result";

/** Curated playlists that ship with the app and cannot be renamed or deleted. */
export const SystemPlaylistKind = {
  Favourites: "favourites",
  FocusWork: "focus_work",
  MostBeautiful: "most_beautiful",
  SleepMode: "sleep_mode",
  DuaaRuqia: "duaa_ruqia",
  Emotional: "emotional",
} as const;

export type SystemPlaylistKind =
  (typeof SystemPlaylistKind)[keyof typeof SystemPlaylistKind];

export interface PlaylistItem {
  readonly trackId: string;
  readonly position: number;
  readonly addedAt: Date;
}

export interface PlaylistProps {
  readonly id: string;
  readonly name: string;
  readonly coverGradient: string;
  readonly isSystem: boolean;
  readonly systemKind: SystemPlaylistKind | null;
  readonly items: readonly PlaylistItem[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Aggregate root for the User Library context.
 *
 * Invariants:
 *  - name is 1..50 characters
 *  - no duplicate tracks
 *  - system playlists cannot be renamed or deleted
 *  - `position` is always a dense 0..n-1 sequence after any mutation
 */
export class Playlist extends AggregateRoot<string> {
  static readonly NAME_MAX_LENGTH = 50;

  private constructor(private props: PlaylistProps) {
    super(props.id);
  }

  static create(params: {
    id: string;
    name: string;
    coverGradient?: string;
    now: Date;
  }): Result<Playlist> {
    const name = params.name.trim();
    if (name.length === 0 || name.length > Playlist.NAME_MAX_LENGTH) {
      return Err(
        DomainError.of(
          "playlist.invalid_name",
          `Playlist name must be 1-${Playlist.NAME_MAX_LENGTH} characters`,
          { name: params.name },
        ),
      );
    }

    return Ok(
      new Playlist({
        id: params.id,
        name,
        coverGradient: params.coverGradient ?? "from-slate-700 to-slate-900",
        isSystem: false,
        systemKind: null,
        items: [],
        createdAt: params.now,
        updatedAt: params.now,
      }),
    );
  }

  static system(params: {
    id: string;
    kind: SystemPlaylistKind;
    name: string;
    coverGradient: string;
    items?: readonly PlaylistItem[];
    now: Date;
  }): Playlist {
    return new Playlist({
      id: params.id,
      name: params.name,
      coverGradient: params.coverGradient,
      isSystem: true,
      systemKind: params.kind,
      items: params.items ?? [],
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  static rehydrate(props: PlaylistProps): Playlist {
    return new Playlist(props);
  }

  get name(): string {
    return this.props.name;
  }

  get coverGradient(): string {
    return this.props.coverGradient;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get systemKind(): SystemPlaylistKind | null {
    return this.props.systemKind;
  }

  get items(): readonly PlaylistItem[] {
    return this.props.items;
  }

  get trackIds(): readonly string[] {
    return this.props.items.map((i) => i.trackId);
  }

  get size(): number {
    return this.props.items.length;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  has(trackId: string): boolean {
    return this.props.items.some((i) => i.trackId === trackId);
  }

  rename(name: string, now: Date): Result<void> {
    if (this.props.isSystem) {
      return Err(
        DomainError.of(
          "playlist.system_immutable",
          "System playlists cannot be renamed",
          { id: this.id },
        ),
      );
    }
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > Playlist.NAME_MAX_LENGTH) {
      return Err(
        DomainError.of(
          "playlist.invalid_name",
          `Playlist name must be 1-${Playlist.NAME_MAX_LENGTH} characters`,
          { name },
        ),
      );
    }
    this.props = { ...this.props, name: trimmed, updatedAt: now };
    return Ok(undefined);
  }

  addTrack(trackId: string, now: Date): Result<void> {
    if (this.has(trackId)) {
      return Err(
        DomainError.of(
          "playlist.duplicate_track",
          "Track is already in this playlist",
          { trackId },
        ),
      );
    }
    this.props = {
      ...this.props,
      items: [
        ...this.props.items,
        { trackId, position: this.props.items.length, addedAt: now },
      ],
      updatedAt: now,
    };
    return Ok(undefined);
  }

  removeTrack(trackId: string, now: Date): Result<void> {
    if (!this.has(trackId)) {
      return Err(
        DomainError.of(
          "playlist.track_not_found",
          "Track is not in this playlist",
          { trackId },
        ),
      );
    }
    this.props = {
      ...this.props,
      items: this.props.items
        .filter((i) => i.trackId !== trackId)
        .map((item, index) => ({ ...item, position: index })),
      updatedAt: now,
    };
    return Ok(undefined);
  }

  reorder(from: number, to: number, now: Date): Result<void> {
    const size = this.props.items.length;
    if (from < 0 || from >= size || to < 0 || to >= size) {
      return Err(
        DomainError.of(
          "playlist.reorder_out_of_range",
          "Reorder indices are outside the playlist",
          { from, to, size },
        ),
      );
    }
    if (from === to) return Ok(undefined);

    const items = [...this.props.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);

    this.props = {
      ...this.props,
      items: items.map((item, index) => ({ ...item, position: index })),
      updatedAt: now,
    };
    return Ok(undefined);
  }

  canBeDeleted(): boolean {
    return !this.props.isSystem;
  }

  snapshot(): PlaylistProps {
    return this.props;
  }
}
