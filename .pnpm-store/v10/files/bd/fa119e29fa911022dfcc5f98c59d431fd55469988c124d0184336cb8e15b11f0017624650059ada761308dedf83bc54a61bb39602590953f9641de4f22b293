/**
 * Queue read face for the InputState.queue projection (frozen contract in
 * ../contract/input.ts): a uSES-compatible observable over one session's
 * transient inbox rows. The Session snapshot already keeps the queue array
 * reference-stable across unrelated snapshot swaps, so this is a pure
 * projection — no second store, no copy.
 */
import type { SessionFace } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { QueuedMessage } from '../contract/input.ts';
/**
 * Project a session's transient inbox rows as a bare observable (subscribe/getSnapshot).
 * The wiring layer overlays this onto InputState.queue; the runtime
 * QueuedMessage and the input-contract QueuedMessage are structurally
 * identical.
 * @param session - the resident session face.
 * @returns the queue read face (snapshot reference stable while the queue is unchanged).
 */
export declare function queueReadFaceOf(session: SessionFace): ObservableSnapshot<readonly QueuedMessage[]>;
//# sourceMappingURL=queue-store.d.ts.map