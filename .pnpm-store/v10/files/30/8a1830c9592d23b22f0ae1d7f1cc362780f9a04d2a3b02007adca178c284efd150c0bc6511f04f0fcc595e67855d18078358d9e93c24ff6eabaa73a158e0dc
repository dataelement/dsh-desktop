import type { ReactNode } from 'react';
import type { PendingSubmission } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ChatNodeOwnerProps, ChatNodeViewProps, ChatViewSlotProps } from '../contract/slots.ts';
/**
 * Render one Host-authoritative pending steering item with the same visual
 * language as its eventual durable transcript node.
 * @param props - Pending message content and conversation translator.
 * @returns the pending steering bubble.
 */
export declare function PendingSteeringBubble({ content, renderMessageImages, t }: {
    content: readonly unknown[];
    renderMessageImages: ChatNodeOwnerProps['renderMessageImages'];
    t: ChatViewSlotProps['t'];
}): ReactNode;
/**
 * Render one local transcript or steering submission echo with the same
 * visual language and surface marker as the Host occurrence that replaces
 * it: draft text plus object-URL previews, visible from the submit click
 * until the durable `user/message` or steering occurrence renders.
 * @param props - the session snapshot's pending submission and render seats.
 * @returns the echoed user bubble.
 */
export declare function PendingSubmissionBubble({ submission, renderMessageImages, t }: {
    submission: PendingSubmission;
    renderMessageImages: ChatNodeOwnerProps['renderMessageImages'];
    t: ChatViewSlotProps['t'];
}): ReactNode;
/** User and admitted-steering keyed Chat renderer. */
export declare const UserMessageNodeView: import("react").MemoExoticComponent<({ node, renderMessageImages, t, }: ChatNodeViewProps<"user" | "steering">) => import("react").JSX.Element>;
/** Injected-context keyed Chat renderer. */
export declare const ContextMessageNodeView: import("react").MemoExoticComponent<({ node, t }: ChatNodeViewProps<"context">) => import("react").JSX.Element>;
/** Automatic compaction keyed Chat renderer. */
export declare const CompactionNodeView: import("react").MemoExoticComponent<({ node, t }: ChatNodeViewProps<"compaction">) => import("react").JSX.Element>;
/** Correlated retry-chain keyed Chat renderer. */
export declare const RetryNodeView: import("react").MemoExoticComponent<({ node, t }: ChatNodeViewProps<"model-retry">) => import("react").JSX.Element>;
/** Terminal turn-error keyed Chat renderer. */
export declare const TurnErrorNodeView: import("react").MemoExoticComponent<({ node, t }: ChatNodeViewProps<"turn-error">) => import("react").JSX.Element>;
/** Max-tokens turn-end notice keyed Chat renderer. */
export declare const TurnMaxTokensNodeView: import("react").MemoExoticComponent<({ t }: ChatNodeViewProps<"turn-max-tokens">) => import("react").JSX.Element>;
/** Explicit unknown-surface keyed Chat renderer. */
export declare const UnknownNodeView: import("react").MemoExoticComponent<({ node, t }: ChatNodeViewProps<"unknown">) => import("react").JSX.Element>;
//# sourceMappingURL=MessageItem.d.ts.map