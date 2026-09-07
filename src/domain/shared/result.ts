/**
 * Result type — the domain never throws. Every operation that can fail
 * returns a Result so callers are forced to handle the failure path.
 */

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export class DomainError {
  constructor(
    readonly code: string,
    readonly message: string,
    readonly details?: Record<string, unknown>,
  ) {}

  static of(code: string, message: string, details?: Record<string, unknown>) {
    return new DomainError(code, message, details);
  }
}

/** Unwrap a Result, throwing only at the application boundary. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(
    result.error instanceof DomainError
      ? `${result.error.code}: ${result.error.message}`
      : String(result.error),
  );
}

/** Collect a list of Results into a Result of a list, failing on the first error. */
export function combine<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) return result;
    values.push(result.value);
  }
  return Ok(values);
}

export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}
