/** Runtime validation for Connection RPC envelopes. */
import { z } from 'zod';
import type { ClientRequest, RpcId, RpcMessage, ServerResponse } from './rpc.ts';
/** Correlation id after wire validation. */
export declare const rpcIdSchema: z.ZodType<RpcId>;
/** Generic endpoint failure carried in a response envelope. */
export declare const rpcErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
/**
 * Build the result parser for one endpoint value parser.
 * @param value - endpoint-owned success-value parser.
 * @returns parser for either a success value or generic failure.
 */
export declare function rpcResultSchema<T>(value: z.ZodType<T>): z.ZodType<{
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: z.infer<typeof rpcErrorSchema>;
}>;
/** Client request envelope; endpoint payload validation belongs to its owner. */
export declare const clientRequestSchema: z.ZodType<ClientRequest>;
/** Server response envelope; endpoint value validation belongs to its caller. */
export declare const serverResponseSchema: z.ZodType<ServerResponse>;
/** Either Connection RPC envelope direction. */
export declare const rpcMessageSchema: z.ZodType<RpcMessage>;
//# sourceMappingURL=rpc-schema.d.ts.map