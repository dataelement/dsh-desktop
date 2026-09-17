import { type ReactNode } from 'react';
import type { PropsRenderSlots, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { OpenFileOptions } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { MessageImageLoader } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { type DiffCardModel } from '../models/diff-card-model.ts';
import { type ReadCardModel } from '../models/read-card-model.ts';
import type { ImageCardModel } from '../models/image-card-model.ts';
import { type SearchCardModel } from '../models/search-card-model.ts';
import { type TerminalCardModel } from '../models/terminal-card-model.ts';
import type { AskQuestionCardModel } from '../models/ask-question-card-model.ts';
import { type ToolRowState, type ToolRowVariant } from '../models/tool-call-model.ts';
import type { WebCardModelProps } from '../models/web-card-model.ts';
export interface ToolRowProps {
    t: TranslateNS<'conversation'>;
    variant: ToolRowVariant;
    /** Wire tool name for tool-owned styling layered over the generic variant. */
    toolName?: string | undefined;
    icon: ReactNode;
    title: string;
    summary: string;
    /**
     * Trailing summary fragment rendered outside the ellipsized summary text, so
     * a narrow row clips the summary before this. For a fragment whose whole
     * value is surviving that clip — the todo row's parallel-active count.
     * null/absent = the summary is the whole collapsed content. Dropped on an
     * error row, whose collapsed summary is the failure line instead.
     */
    summarySuffix?: string | null | undefined;
    /** Original argument JSON formatted only while the row is expanded. */
    bodyRaw?: string | null | undefined;
    /** Flattened result text for the expanded Output section; null/absent = no output section. */
    output?: string | null | undefined;
    /** Ask-user transcript card; card fields are mutually exclusive and replace text sections. */
    askQuestion?: AskQuestionCardModel | null | undefined;
    /** Error first line shown as the collapsed summary on an error row; null/absent = keep `summary`. */
    errorSummary?: string | null | undefined;
    /** Terminal card; card fields are mutually exclusive and replace text sections. */
    terminal?: TerminalCardModel | null | undefined;
    diff?: DiffCardModel | null | undefined;
    read?: ReadCardModel | null | undefined;
    /**
     * Image-card material for a call whose result is an image (derived by
     * `imageCardModel`). Rendered through the `tool.call.images` slot, so the
     * tool layer never imports an attachment implementation nor handles URL
     * authorization.
     */
    image?: ImageCardModel | null | undefined;
    /**
     * Dispatch the image gallery through the tool-owned `tool.call.images`
     * slot, supplied by the toolview that owns this row together with the
     * session-authorized loader.
     */
    renderSlot?: PropsRenderSlots<'tool.call.images'>['renderSlot'] | undefined;
    /** Session-authorized image URL loader for the gallery slot. */
    loadImage?: MessageImageLoader | undefined;
    search?: SearchCardModel | null | undefined;
    web?: WebCardModelProps | null | undefined;
    state: ToolRowState;
    /**
     * Filesystem path from tool args; when set with onOpenFile, the summary
     * renders as a hover-underline link that opens the host default app.
     */
    filePath?: string | undefined;
    /** 1-based line the call was about; absent = open the file at its beginning. */
    filePathLine?: number | undefined;
    /** Open the path (already cwd-resolved), landing on `filePathLine` when given. */
    onOpenFile?: ((path: string, options?: OpenFileOptions) => void) | undefined;
    /**
     * Jump to this call in the trajectory view: a hover-revealed Inspect pill
     * over the expanded body. Absent = no affordance.
     */
    inspect?: (() => void) | undefined;
}
export declare function ToolRow({ t, variant, toolName, icon, title, summary, summarySuffix, bodyRaw, output, askQuestion, errorSummary, terminal, diff, read, image, renderSlot, loadImage, search, web, state, filePath, filePathLine, onOpenFile, inspect, }: ToolRowProps): import("react").JSX.Element;
//# sourceMappingURL=ToolRow.d.ts.map