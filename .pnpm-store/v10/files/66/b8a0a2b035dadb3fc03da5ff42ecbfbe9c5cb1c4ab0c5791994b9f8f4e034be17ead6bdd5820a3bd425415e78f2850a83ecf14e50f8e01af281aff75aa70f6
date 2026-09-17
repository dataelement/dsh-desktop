/**
 * Lossless compact representation of one model-stream attempt, plus record-level
 * readers that answer common consumer questions without materializing members.
 * Readers trust the static record type; expandAssistantStream is the validating
 * path for records read at a durable boundary.
 */
import { assertNever, deepFreeze, snapshotJsonValue } from '@deepseek-ai/dsh-util-values';
import { BlockAssembler } from "./assembler.js";
function safeTime(value) {
    if (!Number.isSafeInteger(value))
        throw new TypeError(`Assistant stream time must be a safe integer, got ${String(value)}`);
    return value;
}
function safeIndex(value, label) {
    if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
        throw new TypeError(`${label} index must be a non-negative safe integer`);
    }
    return value;
}
function snapshotChunk(chunk) {
    const snapshot = snapshotJsonValue(chunk);
    if (snapshot === undefined)
        throw new TypeError('Assistant stream chunk must be losslessly JSON-serializable');
    return snapshot;
}
function safeGap(previous, next) {
    const gap = next - previous;
    return Number.isSafeInteger(gap) && previous + gap === next ? gap : undefined;
}
/** Incrementally compacts one attempt without retaining a second raw-chunk list. */
export class AssistantStreamAccumulator {
    records = [];
    /**
     * Add one timed chunk to the compact attempt stream.
     * @param value - model chunk and its original Session timestamp.
     * @returns a detached immutable copy for assembly and live publication.
     */
    push(value) {
        const time = safeTime(value.time);
        const chunk = snapshotChunk(value.chunk);
        const timed = deepFreeze({ time, chunk });
        const previous = this.records.at(-1);
        switch (chunk.type) {
            case 'text-delta':
            case 'reasoning-delta': {
                safeIndex(chunk.index, chunk.type);
                if (typeof chunk.text !== 'string')
                    throw new TypeError(`${chunk.type} text must be a string`);
                const type = chunk.type === 'text-delta' ? 'text-chunks' : 'reasoning-chunks';
                const gap = previous !== undefined && previous.type === type ? safeGap(previous.lastTime, time) : undefined;
                if (previous !== undefined && previous.type === type && previous.index === chunk.index && gap !== undefined) {
                    previous.dt.push(gap);
                    previous.texts.push(chunk.text);
                    previous.lastTime = time;
                }
                else {
                    this.records.push({ type, time0: time, index: chunk.index, dt: [], texts: [chunk.text], lastTime: time });
                }
                return timed;
            }
            case 'tool-call-delta': {
                safeIndex(chunk.index, chunk.type);
                if (typeof chunk.id !== 'string')
                    throw new TypeError('tool-call-delta id must be a string');
                if (Object.hasOwn(chunk, 'name') && typeof chunk.name !== 'string') {
                    throw new TypeError('tool-call-delta name must be a string');
                }
                if (typeof chunk.argumentsDelta !== 'string') {
                    throw new TypeError('tool-call-delta argumentsDelta must be a string');
                }
                if (chunk.id.length === 0 || chunk.name === '') {
                    this.records.push({ type: 'chunk', time, chunk });
                    return timed;
                }
                const gap = previous?.type === 'tool-call-chunks' ? safeGap(previous.lastTime, time) : undefined;
                const sameName = previous?.type === 'tool-call-chunks'
                    && Object.hasOwn(previous, 'name') === Object.hasOwn(chunk, 'name')
                    && previous.name === chunk.name;
                if (previous?.type === 'tool-call-chunks'
                    && previous.index === chunk.index
                    && previous.id === chunk.id
                    && sameName
                    && gap !== undefined) {
                    previous.dt.push(gap);
                    previous.args.push(chunk.argumentsDelta);
                    previous.lastTime = time;
                }
                else {
                    this.records.push({
                        type: 'tool-call-chunks',
                        time0: time,
                        index: chunk.index,
                        dt: [],
                        id: chunk.id,
                        ...Object.hasOwn(chunk, 'name') ? { name: chunk.name } : {},
                        args: [chunk.argumentsDelta],
                        lastTime: time,
                    });
                }
                return timed;
            }
            case 'block-start':
            case 'block-end':
            case 'usage':
            case 'finish':
                this.records.push({ type: 'chunk', time, chunk });
                return timed;
            default:
                return assertNever(chunk, 'AssistantStreamAccumulator.push');
        }
    }
    /**
     * Return the current compact attempt stream.
     * @returns a detached immutable record list suitable for a durable event.
     */
    snapshot() {
        const records = this.records.map((record) => {
            if (record.type === 'chunk')
                return { ...record };
            const { lastTime: _lastTime, ...durable } = record;
            if (durable.type === 'tool-call-chunks') {
                return { ...durable, dt: [...durable.dt], args: [...durable.args] };
            }
            return { ...durable, dt: [...durable.dt], texts: [...durable.texts] };
        });
        return deepFreeze(records);
    }
}
/**
 * Expand compact records into the exact timed chunk sequence.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns detached timed chunks with every original delta boundary preserved.
 * @throws {TypeError} when a record or reconstructed timestamp is invalid.
 */
export function expandAssistantStream(stream) {
    const chunks = [];
    for (const candidate of stream) {
        const record = validateRecord(candidate);
        if (record.type === 'chunk') {
            chunks.push({ time: record.time, chunk: record.chunk });
            continue;
        }
        const members = record.type === 'tool-call-chunks' ? record.args : record.texts;
        let time = record.time0;
        for (let index = 0; index < members.length; index += 1) {
            if (index > 0)
                time += record.dt[index - 1];
            let chunk;
            if (record.type === 'text-chunks') {
                chunk = { type: 'text-delta', index: record.index, text: members[index] };
            }
            else if (record.type === 'reasoning-chunks') {
                chunk = { type: 'reasoning-delta', index: record.index, text: members[index] };
            }
            else {
                chunk = {
                    type: 'tool-call-delta',
                    index: record.index,
                    id: record.id,
                    ...Object.hasOwn(record, 'name') ? { name: record.name } : {},
                    argumentsDelta: members[index],
                };
            }
            chunks.push({ time, chunk });
        }
    }
    return chunks;
}
function hasNonWhitespace(text) {
    return /\S/.test(text);
}
function blockIsVisible(block) {
    if (block.type === 'tool-call')
        return false;
    if (block.type === 'text' || block.type === 'reasoning')
        return hasNonWhitespace(block.text);
    return true;
}
/**
 * Whether one chunk carries the model's first output token for latency measurement.
 * @param chunk - any stream chunk.
 * @returns true for a non-empty text, reasoning, or Tool-call arguments fragment and for
 *   every name-bearing Tool-call delta; false for block, usage, and finish chunks.
 */
export function isTokenDelta(chunk) {
    switch (chunk.type) {
        case 'text-delta':
        case 'reasoning-delta':
            return chunk.text !== '';
        case 'tool-call-delta':
            return chunk.argumentsDelta !== '' || chunk.name !== undefined;
        default:
            return false;
    }
}
/**
 * Whether one chunk by itself contributes reader-visible transcript content.
 * Text and reasoning count only with non-whitespace content, streamed as a delta or
 * completed as a block; a block of any other kind counts at its start and its end,
 * except a Tool call, which is protocol rather than content. Usage and finish never count.
 * @param chunk - any stream chunk.
 * @returns whether a transcript reader would see this chunk.
 */
export function isVisibleChunk(chunk) {
    switch (chunk.type) {
        case 'text-delta':
        case 'reasoning-delta':
            return hasNonWhitespace(chunk.text);
        case 'block-start':
            return chunk.blockType !== 'text' && chunk.blockType !== 'reasoning' && chunk.blockType !== 'tool-call';
        case 'block-end':
            return blockIsVisible(chunk.block);
        default:
            return false;
    }
}
/**
 * Whether one chunk carries non-whitespace text, as a text delta or a completed text block.
 * Reasoning, Tool calls, and other block kinds never count.
 * @param chunk - any stream chunk.
 * @returns whether the chunk contributes visible text.
 */
export function chunkHasVisibleText(chunk) {
    if (chunk.type === 'text-delta')
        return hasNonWhitespace(chunk.text);
    return chunk.type === 'block-end' && chunk.block.type === 'text' && hasNonWhitespace(chunk.block.text);
}
function firstRunMemberTime(run, predicate) {
    const fragments = run.type === 'tool-call-chunks' ? run.args : run.texts;
    let time = run.time0;
    for (let index = 0; index < fragments.length; index += 1) {
        if (index > 0)
            time += run.dt[index - 1];
        if (predicate(fragments[index]))
            return time;
    }
    return undefined;
}
/**
 * Time of the first member of one packed run that {@link isTokenDelta} accepts: a
 * name-bearing Tool-call run starts at its first member, otherwise the first non-empty fragment.
 * Stops scanning at that member.
 * @param run - one packed delta run.
 * @returns the member's reconstructed time, or undefined when no member qualifies.
 */
export function runFirstTokenTime(run) {
    if (run.type === 'tool-call-chunks' && run.name !== undefined)
        return run.time0;
    return firstRunMemberTime(run, fragment => fragment !== '');
}
/**
 * Time of the first member of one packed run that {@link isVisibleChunk} accepts: the first
 * non-whitespace text or reasoning fragment. A Tool-call run has none. Stops scanning at that member.
 * @param run - one packed delta run.
 * @returns the member's reconstructed time, or undefined when no member qualifies.
 */
export function runFirstVisibleTime(run) {
    return run.type === 'tool-call-chunks' ? undefined : firstRunMemberTime(run, hasNonWhitespace);
}
/**
 * Time of the first token in one compact stream per {@link isTokenDelta}, read from the
 * records themselves and stopping at the first qualifying member.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns the first token's time, or undefined when the stream carries no token.
 */
export function assistantStreamFirstTokenTime(stream) {
    for (const record of stream) {
        const time = record.type === 'chunk'
            ? (isTokenDelta(record.chunk) ? record.time : undefined)
            : runFirstTokenTime(record);
        if (time !== undefined)
            return time;
    }
    return undefined;
}
/**
 * Whether one compact stream carries any reader-visible content per {@link isVisibleChunk},
 * stopping at the first qualifying member.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns whether a transcript reader would see anything from this stream.
 */
export function assistantStreamHasVisibleContent(stream) {
    return stream.some(record => record.type === 'chunk'
        ? isVisibleChunk(record.chunk)
        : runFirstVisibleTime(record) !== undefined);
}
/**
 * Whether one compact stream carries non-whitespace text per {@link chunkHasVisibleText},
 * stopping at the first qualifying member.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns whether the stream contributes visible text.
 */
export function assistantStreamHasVisibleText(stream) {
    return stream.some(record => record.type === 'text-chunks'
        ? record.texts.some(hasNonWhitespace)
        : record.type === 'chunk' && chunkHasVisibleText(record.chunk));
}
/**
 * The last raw chunk of one never-packed type, scanning backwards and stopping at the first hit.
 * @param stream - compact records from one durable Assistant settlement.
 * @param type - chunk type that only appears as a raw record.
 * @returns the stream's final chunk of that type, or undefined when it has none.
 */
export function lastAssistantStreamChunk(stream, type) {
    for (let index = stream.length - 1; index >= 0; index -= 1) {
        const record = stream[index];
        if (record.type === 'chunk' && record.chunk.type === type)
            return record.chunk;
    }
    return undefined;
}
/**
 * Every raw chunk of one never-packed type, in stream order.
 * @param stream - compact records from one durable Assistant settlement.
 * @param type - chunk type that only appears as a raw record.
 * @returns the matching chunks; empty when the stream has none.
 */
export function assistantStreamChunks(stream, type) {
    const chunks = [];
    for (const record of stream) {
        if (record.type === 'chunk' && record.chunk.type === type)
            chunks.push(record.chunk);
    }
    return chunks;
}
/**
 * Every streamed text-delta fragment joined in stream order; reasoning and Tool-call fragments are excluded.
 * @param stream - compact records from one durable Assistant settlement.
 * @returns the joined text, empty when the stream carries no text delta.
 */
export function joinAssistantStreamText(stream) {
    const parts = [];
    for (const record of stream) {
        if (record.type === 'text-chunks')
            parts.push(record.texts.join(''));
        else if (record.type === 'chunk' && record.chunk.type === 'text-delta')
            parts.push(record.chunk.text);
    }
    return parts.join('');
}
/**
 * Feed one compact stream into a {@link BlockAssembler} without materializing members.
 * Each run contributes one delta carrying its joined fragments, which assembles the same
 * blocks as the original per-member deltas because assembly only concatenates them;
 * raw chunks are pushed as recorded. The records are trusted, not validated: validate a
 * stream read at a durable boundary with {@link expandAssistantStream} first.
 * @param stream - compact records from one durable Assistant settlement.
 * @param assembler - assembler to feed; a fresh one by default.
 * @returns the same assembler after every record was pushed.
 */
export function assembleAssistantStream(stream, assembler = new BlockAssembler()) {
    for (const record of stream) {
        switch (record.type) {
            case 'chunk':
                assembler.push(record.chunk);
                break;
            case 'text-chunks':
                assembler.push({ type: 'text-delta', index: record.index, text: record.texts.join('') });
                break;
            case 'reasoning-chunks':
                assembler.push({ type: 'reasoning-delta', index: record.index, text: record.texts.join('') });
                break;
            case 'tool-call-chunks':
                assembler.push({
                    type: 'tool-call-delta',
                    index: record.index,
                    id: record.id,
                    ...record.name === undefined ? {} : { name: record.name },
                    argumentsDelta: record.args.join(''),
                });
                break;
            default:
                assertNever(record, 'assembleAssistantStream');
        }
    }
    return assembler;
}
function validateRecord(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new TypeError('Assistant stream record must be an object');
    }
    const record = value;
    switch (record.type) {
        case 'text-chunks':
        case 'reasoning-chunks': {
            exactKeys(record, ['type', 'time0', 'index', 'dt', 'texts'], record.type);
            const texts = stringArray(record.texts, `${record.type} texts`);
            if (texts.length === 0)
                throw new TypeError(`${record.type} texts must be non-empty`);
            validateRun(record, texts.length, record.type);
            return record;
        }
        case 'tool-call-chunks': {
            const keys = Object.hasOwn(record, 'name')
                ? ['type', 'time0', 'index', 'dt', 'id', 'name', 'args']
                : ['type', 'time0', 'index', 'dt', 'id', 'args'];
            exactKeys(record, keys, record.type);
            const args = stringArray(record.args, 'tool-call-chunks args');
            if (args.length === 0)
                throw new TypeError('tool-call-chunks args must be non-empty');
            if (typeof record.id !== 'string' || record.id.length === 0) {
                throw new TypeError('tool-call-chunks id must be a non-empty string');
            }
            if (record.name !== undefined && (typeof record.name !== 'string' || record.name.length === 0)) {
                throw new TypeError('tool-call-chunks name must be a non-empty string');
            }
            validateRun(record, args.length, record.type);
            return record;
        }
        case 'chunk': {
            exactKeys(record, ['type', 'time', 'chunk'], 'chunk');
            const time = safeTime(record.time);
            if (typeof record.chunk !== 'object'
                || record.chunk === null
                || Array.isArray(record.chunk)) {
                throw new TypeError('Assistant stream raw chunk must be a lossless JSON object');
            }
            let chunk;
            try {
                chunk = snapshotChunk(record.chunk);
            }
            catch (error) {
                throw new TypeError('Assistant stream raw chunk must be a lossless JSON object', { cause: error });
            }
            return deepFreeze({ type: 'chunk', time, chunk });
        }
        default:
            throw new TypeError(`Unsupported Assistant stream record ${JSON.stringify(record.type)}`);
    }
}
function validateRun(record, members, label) {
    safeTime(record.time0);
    safeIndex(record.index, label);
    if (!Array.isArray(record.dt) || record.dt.some(value => !Number.isSafeInteger(value))) {
        throw new TypeError(`${label} dt must contain safe integers`);
    }
    if (record.dt.length !== members - 1) {
        throw new TypeError(`${label} dt length must be one less than its members`);
    }
    let time = record.time0;
    for (const gap of record.dt) {
        time += gap;
        if (!Number.isSafeInteger(time))
            throw new TypeError(`${label} member times must stay safe integers`);
    }
}
function stringArray(value, label) {
    if (!Array.isArray(value) || value.some(member => typeof member !== 'string')) {
        throw new TypeError(`${label} must be a string array`);
    }
    return value;
}
function exactKeys(record, keys, label) {
    if (Object.keys(record).length !== keys.length || !keys.every(key => Object.hasOwn(record, key))) {
        throw new TypeError(`${label} Assistant stream record must contain exactly ${keys.join(', ')}`);
    }
}
//# sourceMappingURL=assistant-stream.js.map