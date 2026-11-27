/** Expected domain failures. Unexpected programming failures are not swallowed. */
export class MusicError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "MusicError";
    }
}
export function assertInteger(value, name) {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        throw new MusicError("INVALID_INPUT", `${name} must be a finite safe integer`);
    }
}
export function assertRecord(value, name) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new MusicError("INVALID_INPUT", `${name} must be an object`);
    }
}