/** Configuration and stable diagnostics for session references. */
/** Hard maximum references accepted by one message. */
export const MAX_REFERENCES = 3;
/** Default number of discovery candidates returned to a host. */
export const DEFAULT_CANDIDATE_LIMIT = 50;
/** Minimum automatic UTF-8 budget for one rendered reference JSON object. */
export const DEFAULT_MAX_REFERENCE_BYTES = 65_536;
/** Typed session-reference failure suitable for host protocol error mapping. */
export class SessionReferenceError extends Error {
    code;
    /** @param message Human-readable diagnosis. @param code Stable routing code. @param options Optional cause. */
    constructor(message, code, options) {
        super(message, options);
        this.code = code;
        this.name = 'SessionReferenceError';
    }
}
//# sourceMappingURL=config.js.map