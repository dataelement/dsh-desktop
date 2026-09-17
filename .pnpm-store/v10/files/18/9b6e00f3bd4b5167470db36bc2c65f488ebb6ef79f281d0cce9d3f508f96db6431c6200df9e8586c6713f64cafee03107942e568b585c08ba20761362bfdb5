import type { ReactElement } from 'react';
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client';
/** Injected face: the wire call the flow drives (bound in apply's closure). */
export interface NativeFlowInjected {
    /** Ask the local Host to open its native single-directory chooser. */
    pick: () => Promise<string | null>;
}
/**
 * Renderless flow occupant: each rising `open` edge runs exactly one pick and
 * reports exactly one outcome; the ref arms once per open so re-renders (and
 * an adoption keeping `open` true while `busy`) never launch a second
 * chooser. The owner withdrawing `open` re-arms the next request.
 * @param props - owner conversation plus the injected pick call.
 * @returns nothing — the native chooser renders on the host display.
 */
export declare function NativeDirectoryFlow(props: DirectoryFlowOwnerProps & NativeFlowInjected): ReactElement | null;
//# sourceMappingURL=flow.d.ts.map