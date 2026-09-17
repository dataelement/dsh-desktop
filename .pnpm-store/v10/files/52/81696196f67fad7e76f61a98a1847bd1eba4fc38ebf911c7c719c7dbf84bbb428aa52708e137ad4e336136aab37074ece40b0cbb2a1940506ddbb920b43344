import { RequestError, isRecord, protocolErrorResponse } from "./jsonrpc.js";
import { LineBuffer } from "./line-buffer.js";
/**
 * Creates an ACP Stream from a pair of newline-delimited JSON streams.
 *
 * This is the typical way to handle ACP connections over stdio, converting
 * between AnyMessage objects and newline-delimited JSON.
 *
 * @param output - The writable stream to send encoded messages to
 * @param input - The readable stream to receive encoded messages from
 * @returns A Stream for bidirectional ACP communication
 */
export function ndJsonStream(output, input) {
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    let cancelled = false;
    let inputReader;
    let outputWrite = Promise.resolve();
    const writeJson = (message) => {
        const content = JSON.stringify(message) + "\n";
        const write = outputWrite.then(async () => {
            const writer = output.getWriter();
            try {
                await writer.write(textEncoder.encode(content));
            }
            finally {
                writer.releaseLock();
            }
        });
        outputWrite = write.catch(() => { });
        return write;
    };
    const readable = new ReadableStream({
        async start(controller) {
            const lines = new LineBuffer();
            const enqueueLine = async (lineBytes) => {
                const trimmedLine = textDecoder.decode(lineBytes).trim();
                if (!trimmedLine) {
                    return;
                }
                let message;
                try {
                    message = JSON.parse(trimmedLine);
                }
                catch {
                    await writeJson(protocolErrorResponse(RequestError.parseError()));
                    return;
                }
                if (isRecord(message) || Array.isArray(message)) {
                    controller.enqueue(message);
                }
                else {
                    await writeJson(protocolErrorResponse(RequestError.invalidRequest(message)));
                }
            };
            const reader = input.getReader();
            inputReader = reader;
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (cancelled) {
                        return;
                    }
                    if (done) {
                        break;
                    }
                    if (!value) {
                        continue;
                    }
                    for (const line of lines.push(value)) {
                        await enqueueLine(line);
                        if (cancelled) {
                            return;
                        }
                    }
                }
                if (cancelled) {
                    return;
                }
                const lastLine = lines.flush();
                if (lastLine) {
                    await enqueueLine(lastLine);
                }
            }
            catch (err) {
                if (cancelled) {
                    return;
                }
                controller.error(err);
                return;
            }
            finally {
                if (inputReader === reader) {
                    inputReader = undefined;
                }
                reader.releaseLock();
            }
            if (cancelled) {
                return;
            }
            controller.close();
        },
        cancel(reason) {
            cancelled = true;
            return inputReader?.cancel(reason);
        },
    });
    const writable = new WritableStream({
        write(message) {
            return writeJson(message);
        },
    });
    return { readable, writable };
}
//# sourceMappingURL=stream.js.map