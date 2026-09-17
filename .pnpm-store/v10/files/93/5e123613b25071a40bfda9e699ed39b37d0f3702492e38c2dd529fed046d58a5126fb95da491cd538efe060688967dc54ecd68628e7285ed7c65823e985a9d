/** V3 framing with hard structural admission and recoverable canonical event validation. */
import type { SessionFormatEvent, SessionFormatHeader } from '@deepseek-ai/dsh-session-format';
/** V3 codec validates structural rows before recovery and logical envelopes after provenance decoding. */
export declare const releasedV3SessionFormatCodec: Readonly<{
    version: number;
    decodeHeader(value: unknown): {
        version: number;
        id: string;
        createdAt: number;
        cwd?: string;
        parentSession?: string;
        isSeeded: boolean;
        origin?: "subagent";
        delegationDepth: number;
        agentPreset?: string;
    };
    createDecoder(value: unknown, recovery: import("@deepseek-ai/dsh-session-format").SessionFormatRecovery): {
        header: {
            version: number;
            id: string;
            createdAt: number;
            cwd?: string;
            parentSession?: string;
            isSeeded: boolean;
            origin?: "subagent";
            delegationDepth: number;
            agentPreset?: string;
        };
        decodeRow(row: unknown, context: import("@deepseek-ai/dsh-session-format").SessionFormatMigrationContext): void;
        finish(context: import("@deepseek-ai/dsh-session-format").SessionFormatMigrationContext): number;
    };
    encodeHeader(header: SessionFormatHeader, inheritedEventCount: number): {
        version: number;
    };
    encodeEvent(event: SessionFormatEvent): import("@deepseek-ai/dsh-session-format").SessionFormatJsonObject;
}>;
/**
 * Validate owned V3 admission rules before a scanner or codec can discard a recoverable tail.
 * This checks only identified structural payloads; physical provenance still belongs to decoding.
 * @param row - parsed physical row, before envelope or compressed-range decoding.
 */
export declare function assertV3RowAdmission(row: unknown): void;
//# sourceMappingURL=codec.d.ts.map