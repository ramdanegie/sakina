/**
 * Value Objects are immutable and compared by structural equality,
 * never by identity.
 */
export abstract class ValueObject<T extends Record<string, unknown>> {
  protected constructor(protected readonly props: T) {
    Object.freeze(this.props);
  }

  equals(other?: ValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}

/**
 * Clamp a number into an inclusive range. Used by every VO that models
 * a bounded scalar (volume, mix level, playback position).
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}
