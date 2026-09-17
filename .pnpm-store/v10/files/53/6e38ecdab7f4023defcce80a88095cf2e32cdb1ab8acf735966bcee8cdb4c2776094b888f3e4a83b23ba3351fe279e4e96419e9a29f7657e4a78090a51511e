/**
 * The way into a hidden panel: one button in the conversation header's corner
 * seat, shown only while the panel is collapsed.
 *
 * It lives in the conversation's own header rather than in the frame's right
 * column so that a collapsed Sidebar costs the conversation nothing — no rail,
 * no width, and the transcript's scrollbar stays at the column's edge. The
 * corner seat is its own, past the utilities' edge, so the button never joins
 * the utilities row; while the panel is shown this renders nothing, and the
 * seat collapses with it. It shares the panel's per-session store, which the
 * slot runtime allows because both seats are session-scoped.
 *
 * The glyph is the left sidebar's collapse icon mirrored: the same affordance,
 * on the other edge.
 */
import type { ReactNode } from 'react';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createSidebarRightStore } from '../stores.ts';
/** The button's props: the header corner seat, the shared store, and copy. */
export type ExpandButtonProps = PropsRuntime<'conversation.session.header.corner'> & PropsStore<ReturnType<typeof createSidebarRightStore>> & PropsLocale<'sidebarRight'>;
/** The expand control while the panel is collapsed; nothing while it is shown. */
export declare function ExpandButton({ sessionId, useStore, actions, t }: ExpandButtonProps): ReactNode;
//# sourceMappingURL=ExpandButton.d.ts.map