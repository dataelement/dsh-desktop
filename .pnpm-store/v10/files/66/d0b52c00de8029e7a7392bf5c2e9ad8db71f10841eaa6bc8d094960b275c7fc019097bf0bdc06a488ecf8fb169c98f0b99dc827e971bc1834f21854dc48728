import type { Context } from '@deepseek-ai/cordis';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo/client';
export interface TodoPanelProps {
    /** The session's current plan (empty renders nothing) — selected by the dock adapter. */
    todos: readonly TodoItem[];
    /** The dock entry's locale seat, passed down as a plain prop. */
    t: TodoDockProps['t'];
}
export declare function TodoPanel({ todos, t }: TodoPanelProps): import("react").JSX.Element | null;
/** Props for the projected todo dock. */
export type TodoDockProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'conversation'>;
/** Renders the current todo projection, or nothing when it is absent. */
export declare function TodoDock({ useProjection, t }: TodoDockProps): import("react").JSX.Element;
/** Registers the projected todo dock. */
export declare const todoDockEntry: {
    name: string;
    inject: string[];
    apply(ctx: Context): void;
};
//# sourceMappingURL=TodoPanel.d.ts.map