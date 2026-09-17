import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { GlobalStandardProps, InjectFace, PropsLocale, SessionStandardProps } from '@deepseek-ai/dsh-client-ui-slots';
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { PresentedOpenController } from './present-open.ts';
import { type PresentedPath } from './turn-deliverables.ts';
import type { NS } from './locales.ts';
interface DeliverablesMatch {
    produced: readonly string[];
    presented: readonly PresentedPath[];
}
/** Native-open callbacks and shared gesture status supplied by the plugin. */
export interface DeliverablesInjected {
    hooks: {
        presentedOpen: ObservableSnapshot<ReturnType<PresentedOpenController['state']['getSnapshot']>>;
        presentedHost: ObservableSnapshot<ReturnType<PresentedOpenController['host']['getSnapshot']>>;
    };
    reloadPresentedHost: PresentedOpenController['loadHost'];
    openPresented: PresentedOpenController['open'];
}
/**
 * Claim turns containing modified paths or declared files.
 * @param owner - closing turn.
 * @returns matched files, or null for an empty turn.
 */
export declare function selectDeliverables(owner: TurnTailOwnerProps): DeliverablesMatch | null;
/**
 * Render workspace file actions and default-application buttons for declared files.
 * @param props - matched files, workspace opener, and localized copy.
 * @returns the closing turn's file rows.
 */
export declare function Deliverables({ matched, openFile, t, sessionId, useSessions, openPresented, usePresentedOpen, usePresentedHost, reloadPresentedHost }: Pick<TurnTailOwnerProps, 'openFile'> & {
    matched: DeliverablesMatch;
} & PropsLocale<typeof NS> & Pick<SessionStandardProps, 'sessionId'> & Pick<GlobalStandardProps, 'useSessions'> & InjectFace<DeliverablesInjected>): import("react").JSX.Element;
export {};
//# sourceMappingURL=Deliverables.d.ts.map