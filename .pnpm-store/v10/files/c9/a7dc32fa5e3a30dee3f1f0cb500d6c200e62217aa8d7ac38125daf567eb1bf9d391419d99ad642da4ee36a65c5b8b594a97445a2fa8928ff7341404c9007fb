import { isRecord } from "./jsonrpc.js";
import { LineBuffer } from "./line-buffer.js";
export function serializeSseEvent(msg) {
    return `data: ${JSON.stringify(msg)}\n\n`;
}
export function serializeSseKeepAlive() {
    return ":\n\n";
}
export async function* parseSseStream(body) {
    const decoder = new TextDecoder();
    const reader = body.getReader();
    const lines = new LineBuffer();
    let eventLines = [];
    const decodeLine = (lineBytes) => {
        const line = decoder.decode(lineBytes);
        return line.endsWith("\r") ? line.slice(0, -1) : line;
    };
    // A blank line ends the current event.
    const takeEvent = () => {
        if (eventLines.length === 0) {
            return undefined;
        }
        const event = eventLines;
        eventLines = [];
        return parseSseEvent(event);
    };
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) {
                break;
            }
            for (const lineBytes of lines.push(chunk.value)) {
                const line = decodeLine(lineBytes);
                if (line === "") {
                    const msg = takeEvent();
                    if (msg) {
                        yield msg;
                    }
                }
                else {
                    eventLines.push(line);
                }
            }
        }
        const lastLine = lines.flush();
        if (lastLine) {
            const line = decodeLine(lastLine);
            if (line !== "") {
                eventLines.push(line);
            }
        }
        const msg = takeEvent();
        if (msg) {
            yield msg;
        }
    }
    finally {
        reader.releaseLock();
    }
}
function parseSseEvent(eventLines) {
    const dataLines = eventLines
        .filter((line) => line.startsWith("data:"))
        .map((line) => {
        const value = line.slice("data:".length);
        return value.startsWith(" ") ? value.slice(1) : value;
    });
    if (dataLines.length === 0) {
        return undefined;
    }
    const data = dataLines.join("\n");
    if (!data.trim()) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(data);
        // Skip primitive payloads with a useful warning; individual objects and
        // batch arrays are left for the connection layer to validate.
        if (isRecord(parsed) || Array.isArray(parsed)) {
            return parsed;
        }
        console.warn("Skipping SSE payload that is not an object or array");
        return undefined;
    }
    catch (error) {
        console.warn("Failed to parse SSE JSON payload:", error);
        return undefined;
    }
}
//# sourceMappingURL=sse.js.map