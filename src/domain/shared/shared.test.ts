import { describe, expect, it } from "vitest";
import { AggregateRoot, Entity } from "./entity";
import { domainEvent } from "./domain-event";
import { combine, DomainError, Err, map, Ok, unwrap } from "./result";
import { clamp, ValueObject } from "./value-object";

class TestEntity extends Entity<string> {
  constructor(id: string) {
    super(id);
  }
}

class OtherEntity extends Entity<string> {
  constructor(id: string) {
    super(id);
  }
}

class TestAggregate extends AggregateRoot<string> {
  constructor(id: string) {
    super(id);
  }

  doSomething(): void {
    this.record(domainEvent("test.happened", { n: 1 }));
  }
}

class Money extends ValueObject<{ amount: number }> {
  constructor(amount: number) {
    super({ amount });
  }
}

class Weight extends ValueObject<{ amount: number }> {
  constructor(amount: number) {
    super({ amount });
  }
}

describe("Entity equality", () => {
  it("compares by identity", () => {
    expect(new TestEntity("a").equals(new TestEntity("a"))).toBe(true);
    expect(new TestEntity("a").equals(new TestEntity("b"))).toBe(false);
  });

  it("is false for a different class with the same id", () => {
    expect(new TestEntity("a").equals(new OtherEntity("a"))).toBe(false);
  });

  it("is false for null and undefined", () => {
    expect(new TestEntity("a").equals(undefined)).toBe(false);
  });
});

describe("AggregateRoot events", () => {
  it("records and drains events", () => {
    const aggregate = new TestAggregate("a");
    aggregate.doSomething();
    aggregate.doSomething();

    expect(aggregate.events).toHaveLength(2);
    expect(aggregate.pullEvents()).toHaveLength(2);
    expect(aggregate.events).toHaveLength(0);
  });

  it("stamps events with a name and timestamp", () => {
    const event = domainEvent("x.y", { a: 1 });
    expect(event.name).toBe("x.y");
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.payload).toEqual({ a: 1 });
  });
});

describe("ValueObject equality", () => {
  it("compares structurally", () => {
    expect(new Money(10).equals(new Money(10))).toBe(true);
    expect(new Money(10).equals(new Money(20))).toBe(false);
  });

  it("is false across different classes with the same shape", () => {
    expect(new Money(10).equals(new Weight(10))).toBe(false);
  });

  it("is false for undefined", () => {
    expect(new Money(10).equals(undefined)).toBe(false);
  });

  it("freezes its props", () => {
    const money = new Money(10);
    expect(Object.isFrozen(money["props"])).toBe(true);
  });
});

describe("clamp", () => {
  it("bounds a value into the range", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("maps NaN to the minimum rather than propagating it", () => {
    expect(clamp(Number.NaN, 0, 1)).toBe(0);
  });
});

describe("Result helpers", () => {
  it("unwraps an ok result", () => {
    expect(unwrap(Ok(42))).toBe(42);
  });

  it("throws a readable message when unwrapping a DomainError", () => {
    const failure = Err(DomainError.of("some.code", "some message"));
    expect(() => unwrap(failure)).toThrow("some.code: some message");
  });

  it("throws for a non-DomainError failure", () => {
    expect(() => unwrap(Err("plain string"))).toThrow("plain string");
  });

  it("combines a list of ok results", () => {
    const combined = combine([Ok(1), Ok(2), Ok(3)]);
    expect(combined.ok).toBe(true);
    if (combined.ok) expect(combined.value).toEqual([1, 2, 3]);
  });

  it("short-circuits combine on the first failure", () => {
    const error = DomainError.of("bad", "bad");
    const combined = combine([Ok(1), Err(error), Ok(3)]);
    expect(combined.ok).toBe(false);
    if (!combined.ok) expect(combined.error).toBe(error);
  });

  it("maps over an ok result and passes failures through", () => {
    const doubled = map(Ok(2), (n) => n * 2);
    expect(doubled.ok).toBe(true);
    if (doubled.ok) expect(doubled.value).toBe(4);

    const failure = Err(DomainError.of("x", "x"));
    expect(map(failure, (n: number) => n * 2).ok).toBe(false);
  });

  it("carries optional details on a DomainError", () => {
    const error = DomainError.of("code", "message", { field: "value" });
    expect(error.details).toEqual({ field: "value" });
  });
});
