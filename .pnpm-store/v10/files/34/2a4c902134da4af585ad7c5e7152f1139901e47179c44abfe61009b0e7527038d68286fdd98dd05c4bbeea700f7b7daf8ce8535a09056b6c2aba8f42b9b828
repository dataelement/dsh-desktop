/** Event-local acceptance for raw Session journal responses; payloads remain owner-defined JSON. */
import type { SessionWireEvent } from '../types.ts';
/**
 * Reject non-current event envelopes without stripping or normalizing wire fields.
 * Range membership and source existence require the durable log and remain Host-owned.
 * @param value - one event received in a follow frame or history page.
 * @returns nothing after narrowing the accepted event envelope.
 * @throws when the envelope or current event-local metadata is invalid.
 */
export declare function assertSessionWireEvent(value: unknown): asserts value is SessionWireEvent;
//# sourceMappingURL=session-wire-event.d.ts.map