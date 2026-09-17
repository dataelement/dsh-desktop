import type { ScheduleRecord } from '@deepseek-ai/dsh-schedule/client';
import type { PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
/** Full props for the Session-header Schedule catalog action. */
export type ScheduleCatalogActionProps = PropsRuntime<'conversation.session.header.actions'> & PropsLocale<typeof NS>;
/** Pick the largest exact whole unit without rounding the durable interval. */
export declare function formatScheduleFrequency(record: ScheduleRecord, t: TranslateNS<typeof NS>): string;
/** Format the durable UTC target in the browser's current locale and time zone. */
export declare function formatScheduleLocalTime(scheduledAt: string, locale?: string): string;
/** Human relative target using the largest natural clock unit. */
export declare function formatScheduleRelative(scheduledAt: string, now: number, t: TranslateNS<typeof NS>): string;
/** Overdue records first, then ascending target time; exact ties stay stable. */
export declare function orderScheduleRecords(records: readonly ScheduleRecord[], now: number): ScheduleRecord[];
/** Read-only current-Session active reminder catalog. */
export declare function ScheduleCatalogAction({ useSession, useProjection, t }: ScheduleCatalogActionProps): import("react").JSX.Element | null;
//# sourceMappingURL=ScheduleCatalogAction.d.ts.map