import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionLogDownloadState } from './controller.ts';
import { NS } from './locales.ts';
/** Browser operations and state injected into the Session Header contribution. */
export interface SessionLogDownloadDialogInjected {
    hooks: {
        sessionLogDownload: ObservableSnapshot<SessionLogDownloadState>;
    };
    request: (sessionId: SessionId) => Promise<void>;
    dismiss: (sessionId: SessionId) => void;
}
export type SessionLogDownloadDialogProps = PropsRuntime<'conversation.session.header.utilities'> & PropsLocale<typeof NS> & InjectFace<SessionLogDownloadDialogInjected>;
/**
 * Modal shared by the Session Header download menu item and this browser's `/export` command.
 * @param props - Session runtime, bound controller state, actions, and localized copy.
 * @returns the modal portal contribution.
 */
export declare function SessionLogDownloadDialog({ sessionId, useSessionLogDownload, dismiss, t, }: SessionLogDownloadDialogProps): import("react").JSX.Element;
//# sourceMappingURL=Dialog.d.ts.map