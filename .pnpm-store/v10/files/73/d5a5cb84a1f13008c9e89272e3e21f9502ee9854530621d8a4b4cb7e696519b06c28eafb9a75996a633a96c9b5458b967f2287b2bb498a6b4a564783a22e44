import type { SubagentAddress } from '@deepseek-ai/dsh-subagent/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/** Business actions supplied by the slot registration. */
export interface SubagentCatalogInjected {
    openChild: (address: SubagentAddress) => void;
    refresh: (parentSessionId: SessionId) => void;
    setCatalogOpen: (parentSessionId: SessionId, open: boolean) => void;
}
/** Full props for the session-header lineage renderer. */
export type SubagentHeaderLineageProps = PropsRuntime<'conversation.session.header.lineage'> & SubagentCatalogInjected & PropsLocale<typeof NS>;
/**
 * Render one breadcrumb title together with its subagent navigation.
 * @param props - Breadcrumb title, session standard props, and catalog actions.
 * @returns An ordinary-title descendant count, or a title-and-chevron sibling switcher.
 */
export declare function SubagentHeaderLineage({ lineageSessionId, displayTitle, openTitle, useSessions, openChild, refresh, setCatalogOpen, t, }: SubagentHeaderLineageProps): import("react").JSX.Element;
//# sourceMappingURL=SubagentHeaderLineage.d.ts.map