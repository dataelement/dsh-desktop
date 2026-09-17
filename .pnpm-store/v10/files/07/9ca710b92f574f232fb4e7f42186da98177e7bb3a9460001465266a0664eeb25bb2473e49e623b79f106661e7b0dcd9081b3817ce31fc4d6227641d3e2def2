import type { ContextPressureProjection } from '@deepseek-ai/dsh-token-meter/client';
/** Context usage rendered by conversation and Chat status surfaces. */
export interface ContextOccupancy {
    percent: number;
    usedTokens: number;
    contextWindow: number;
}
/**
 * Resolve bounded display occupancy from independently updated pressure fields.
 * @param pressure - latest token-meter projection.
 * @returns occupancy, or null until numerator and capacity are known.
 */
export declare function contextOccupancy(pressure: ContextPressureProjection | undefined): ContextOccupancy | null;
//# sourceMappingURL=context-occupancy.d.ts.map