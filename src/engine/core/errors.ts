export type ErrorCode = "INVALID_INPUT" | "UNSUPPORTED" | "NO_MATCH";

/** Expected domain failures. Unexpected programming failures are not swallowed. */
export class MusicError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = "MusicError";
  }
}

export function assertInteger(value: unknown, name: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new MusicError("INVALID_INPUT", `${name} must be a finite safe integer`);
  }
}

export function assertRecord(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new MusicError("INVALID_INPUT", `${name} must be an object`);
  }
}
