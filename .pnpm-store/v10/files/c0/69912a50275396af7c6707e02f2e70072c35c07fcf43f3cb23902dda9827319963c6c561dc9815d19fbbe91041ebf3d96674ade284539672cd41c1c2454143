import type { ReactNode } from 'react';
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots';
import type { ToolCallViewProps } from '../../contract/slots.ts';
import { type ToolRowProps } from '../components/ToolRow.tsx';
/** Full row props of a read-family toolview: the runtime share plus its locale seat. */
export type ReadFamilyRowProps = ToolCallViewProps & {
    t: ToolRowProps['t'];
};
/** read_image row props: the runtime share, the declared image child slot, and the locale seat. */
export type ReadImageRowProps = ReadFamilyRowProps & PropsRenderSlots<'tool.call.images'>;
/**
 * The card material one read-family row contributes: exactly the ToolRow card
 * props that row owns. `read` supplies `read` and the line its call named;
 * `read_image` supplies `image` together with the slot dispatcher and loader
 * that draw it.
 */
export type ReadFamilyCard = Pick<ToolRowProps, 'read' | 'image' | 'renderSlot' | 'loadImage' | 'filePathLine'>;
/**
 * Compose a read-family row: the shared chrome and model-derived fields, plus the
 * caller's card material.
 * @param props - the toolview runtime share and locale seat.
 * @param card - the card props this row owns.
 * @returns the assembled ToolRow.
 */
export declare function readFamilyRow({ toolName, block, cwd, home, openFile, inspect, t }: ReadFamilyRowProps, card: ReadFamilyCard): ReactNode;
//# sourceMappingURL=read-family-row.d.ts.map