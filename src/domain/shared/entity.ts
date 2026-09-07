import type { DomainEvent } from "./domain-event";

/** Entities are compared by identity, never by their attributes. */
export abstract class Entity<TId> {
  protected constructor(readonly id: TId) {}

  equals(other?: Entity<TId>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return this.id === other.id;
  }
}

/**
 * An AggregateRoot is the only entity in its aggregate that the outside
 * world may hold a reference to. It records domain events which the
 * application layer drains after a successful use case.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _events: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this._events.push(event);
  }

  get events(): readonly DomainEvent[] {
    return this._events;
  }

  /** Hand the recorded events to the caller and reset the buffer. */
  pullEvents(): DomainEvent[] {
    const drained = this._events;
    this._events = [];
    return drained;
  }
}
