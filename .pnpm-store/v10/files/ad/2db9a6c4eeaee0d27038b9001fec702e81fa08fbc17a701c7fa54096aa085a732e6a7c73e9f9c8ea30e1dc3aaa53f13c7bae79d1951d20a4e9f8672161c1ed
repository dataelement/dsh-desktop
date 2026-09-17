import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/** Browser operations and state injected into the Session Header contribution. */
export interface OpenInAppActionInjected {
    hooks: {
        openInAppApps: ObservableSnapshot<readonly string[] | null>;
        openInAppChoice: ObservableSnapshot<string>;
    };
    launch: (appId: string, path: string) => Promise<void>;
    choose: (appId: string) => void;
    iconUrl: (appId: string) => string;
}
/** Full props for the Session-header open-in-app split button. */
export type OpenInAppActionProps = PropsRuntime<'conversation.session.header.utilities'> & PropsLocale<typeof NS> & InjectFace<OpenInAppActionInjected>;
/**
 * Session-header split button: the main button opens the session's workspace
 * directory in the remembered application, the chevron opens the menu of
 * every application the host probed as installed. It renders nothing until
 * the host reported at least one nameable application and the session has a
 * known workspace directory, so a host without the capability never grows
 * the control.
 * @param props - session runtime, injected controller face, and localized copy.
 * @returns the split button and its menu, or null when there is nothing to offer.
 */
export declare function OpenInAppAction(props: OpenInAppActionProps): React.JSX.Element | null;
//# sourceMappingURL=OpenInAppAction.d.ts.map