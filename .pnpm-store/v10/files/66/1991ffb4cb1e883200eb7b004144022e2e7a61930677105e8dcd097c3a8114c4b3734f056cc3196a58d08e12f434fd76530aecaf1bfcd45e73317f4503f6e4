import { describe, expect, it } from "vitest";
import { OutboundMailbox } from "./connection.js";
import { createSseBodySource } from "./server-sse.js";
import { serializeSseEvent } from "./sse.js";
const message = {
    jsonrpc: "2.0",
    id: 1,
    result: {
        ok: true,
    },
};
describe("createSseBodySource", () => {
    it("enqueues a subscription message after it has been read even if demand changed", async () => {
        const mailbox = new OutboundMailbox();
        const lease = mailbox.tryAcquire();
        if (!lease) {
            throw new Error("Expected outbound mailbox lease");
        }
        const source = createSseBodySource(lease);
        const enqueued = [];
        let desiredSize = 1;
        const controller = {
            get desiredSize() {
                return desiredSize;
            },
            enqueue(chunk) {
                enqueued.push(chunk);
            },
            close() {
                return undefined;
            },
            error(error) {
                if (error) {
                    throw error;
                }
            },
        };
        const pull = Promise.resolve(source.pull?.(controller));
        await flushMicrotasks();
        desiredSize = 0;
        mailbox.push(message);
        await pull;
        expect(enqueued.map(decodeText)).toEqual([serializeSseEvent(message)]);
    });
});
async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}
function decodeText(chunk) {
    return new TextDecoder().decode(chunk);
}
//# sourceMappingURL=server-sse.test.js.map