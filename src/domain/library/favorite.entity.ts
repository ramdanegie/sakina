import { Entity } from "../shared/entity";

export const FavoriteTargetType = {
  Reciter: "reciter",
  Track: "track",
  Playlist: "playlist",
} as const;

export type FavoriteTargetType =
  (typeof FavoriteTargetType)[keyof typeof FavoriteTargetType];

export interface FavoriteProps {
  readonly id: string;
  readonly targetType: FavoriteTargetType;
  readonly targetId: string;
  readonly createdAt: Date;
}

/** Polymorphic favourite — one shape covers reciters, tracks and playlists. */
export class Favorite extends Entity<string> {
  private constructor(private readonly props: FavoriteProps) {
    super(props.id);
  }

  static create(props: FavoriteProps): Favorite {
    return new Favorite(props);
  }

  /** Deterministic id so toggling twice can never create a duplicate row. */
  static idFor(targetType: FavoriteTargetType, targetId: string): string {
    return `${targetType}:${targetId}`;
  }

  get targetType(): FavoriteTargetType {
    return this.props.targetType;
  }

  get targetId(): string {
    return this.props.targetId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  snapshot(): FavoriteProps {
    return this.props;
  }
}
