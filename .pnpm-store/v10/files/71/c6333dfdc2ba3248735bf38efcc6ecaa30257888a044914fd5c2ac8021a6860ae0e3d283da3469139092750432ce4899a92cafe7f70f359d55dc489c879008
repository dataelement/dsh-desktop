import { RELEASED_V2_EVENT_DISPOSITIONS, assertReleasedV2Header, releasedV2SessionFormatCodec, releasedV2SessionFormatCodec as releasedV2SessionFormatCodec$1, restoreReleasedV2Artifact } from "@deepseek-ai/dsh-session-format-v1-to-v2";
import { SessionFormatError, SessionFormatUnsupportedMigrationError, defineSessionFormatMigration, isSessionFormatJsonObject, sessionFormatCount, sessionFormatSafeInteger, snapshotSessionFormatJson } from "@deepseek-ai/dsh-session-format";
import { assertReleasedPayloadSemantics, assertReleasedSurfaceMetadata } from "@deepseek-ai/dsh-session-format-v0-to-v1";
import { createHash } from "node:crypto";
//#region lib/types/payload.js
/** Audited V2 migration admission and V3 payload validation, independent of installed core Session types. */
/** Audited surface event names; all other admitted events are log-only. */
const SURFACE_TYPES = new Set([
	"system/message",
	"user/message",
	"assistant/message",
	"tool/result"
]);
const SOURCE_KINDS = new Set([
	"user",
	"plugin",
	"model",
	"tool",
	"agent-instructions",
	"session-reference",
	"team-message",
	"goal",
	"skill-invocation",
	"skill-catalog",
	"coordinator",
	"subagent-report",
	"subagent-settled",
	"webhook",
	"agent-message"
]);
/**
* Require a JSON object at the durable input boundary.
* @param value - decoded value.
* @param label - diagnostic subject.
* @returns the narrowed object.
*/
function record(value, label) {
	if (!isSessionFormatJsonObject(value)) throw new SessionFormatError(label + " must be an object");
	return value;
}
/**
* Reject missing and unaudited members rather than guessing whether they contain coordinates.
* @param value - decoded record.
* @param required - required member names.
* @param optional - additional admitted names.
* @param label - diagnostic subject.
*/
function keys(value, required, optional, label) {
	const missing = required.find((key) => !Object.hasOwn(value, key));
	const unexpected = Object.keys(value).find((key) => !required.includes(key) && !optional.includes(key));
	if (missing !== void 0) throw new SessionFormatError(label + " lacks required field " + missing);
	if (unexpected !== void 0) throw new SessionFormatError(label + " has unexpected field " + unexpected);
}
/**
* Validate classified payloads before migration, or native V3 system/header payloads.
* @param event - decoded logical event.
* @param version - source or target generation.
*/
function assertEvent(event, version) {
	if (version === 3) {
		assertV3Event(event);
		return;
	}
	const disposition = RELEASED_V2_EVENT_DISPOSITIONS[event.type];
	const feedback = event.type === "feedback/message-put" || event.type === "feedback/message-delete";
	if (disposition === void 0 && !feedback) throw new SessionFormatUnsupportedMigrationError("format v2 to v3 cannot safely transform unclassified event " + event.type);
	const surface = SURFACE_TYPES.has(event.type);
	keys(event, [
		"type",
		"seq",
		"time",
		"data"
	], surface ? [
		"ignorable",
		"sourceEventSeqs",
		"surfaceOp"
	] : ["ignorable"], event.type);
	sessionFormatCount(event.seq, "event seq");
	sessionFormatSafeInteger(event.time, "event time");
	if (event["ignorable"] !== void 0 && event["ignorable"] !== true) throw new SessionFormatError("ignorable must be true");
	if (surface) {
		assertReleasedSurfaceMetadata(event, event.seq, event.type, "forbid-assistant");
		if (event["surfaceOp"] === void 0) throw new SessionFormatError(event.type + " requires surfaceOp");
	}
	const data = record(event.data, event.type + " data");
	if (feedback) {
		assertFeedback(event.type, data);
		return;
	}
	const admitted = disposition;
	keys(data, admitted.required, admitted.optional, event.type + " data");
	assertOwnedContent(event, data);
	if (event.type !== "assistant/attempt") assertReleasedPayloadSemantics(event, version);
	if (event.type === "assistant/message" || event.type === "assistant/attempt") {
		for (const coordinate of ["turn", "step"]) if (sessionFormatCount(data[coordinate], coordinate) === 0) throw new SessionFormatError(coordinate + " must be positive");
	}
	if (event.type === "session/end-seed" && data["inherited"] !== void 0 && data["inherited"] !== true) throw new SessionFormatError("session/end-seed inherited must be true");
	if (event.type === "user/message") assertSource(data);
	if (event.type === "assistant/message" || event.type === "tool/result") assertSource(record(data["message"], "message"));
	if (event.type === "tool/result" && isSessionFormatJsonObject(data["error"]) && data["error"]["code"] === "TOOL_NOT_STARTED") {
		const message = record(data["message"], "tool result message");
		const source = record(message["source"], "tool result source");
		if (!isRepairIdentity(message["id"], source["callId"])) throw new SessionFormatError("TOOL_NOT_STARTED repair requires its canonical historical message id");
	}
	if (event.type === "agent/inbox/spliced" || event.type === "session/title-llm-request") {
		const messages = data[event.type === "agent/inbox/spliced" ? "inserted" : "messages"];
		for (const message of messages) assertSource(message);
	}
}
/**
* Recognize stable generated repair IDs without interpreting their historical suffix as a current coordinate.
* @param id - durable message identity.
* @param callId - advertised tool identity.
* @returns whether the identity has the canonical historical repair form.
*/
function isRepairIdentity(id, callId) {
	if (typeof callId !== "string") return false;
	const prefix = "interrupted-tool-result-" + callId + "-";
	if (typeof id !== "string" || !id.startsWith(prefix)) return false;
	const suffix = id.slice(prefix.length);
	return /^(0|[1-9]\d*)$/.test(suffix) && Number.isSafeInteger(Number(suffix));
}
function assertSource(message) {
	const source = record(message["source"], "message source");
	if (typeof source["kind"] !== "string" || !SOURCE_KINDS.has(source["kind"])) throw new SessionFormatUnsupportedMigrationError("cannot safely transform unclassified message source");
	if (source["kind"] === "agent-message") {
		keys(source, [
			"kind",
			"form",
			"senderSessionId"
		], [], "agent-message source");
		if (source["form"] !== "relay" || typeof source["senderSessionId"] !== "string" || source["senderSessionId"].length === 0) throw new SessionFormatError("agent-message source requires relay form and senderSessionId");
	}
}
const CONTENT_KINDS = new Set([
	"text",
	"reasoning",
	"image",
	"file",
	"tool-call",
	"tool-result"
]);
function contentArray(value, label) {
	if (!Array.isArray(value)) throw new SessionFormatError(label + ": content must be an array");
	return value;
}
function assertOwnedContent(event, data) {
	const label = "format v2 " + event.type + " at seq " + String(event.seq) + " data";
	switch (event.type) {
		case "user/message":
		case "tool/code-dispatch":
			assertContentKinds(data["content"], label + ".content");
			break;
		case "assistant/message":
		case "tool/result":
		case "team/message/queued":
			assertContentKinds(record(data["message"], label + ".message")["content"], label + ".message.content");
			break;
		case "agent/inbox/spliced":
		case "session/title-llm-request": {
			const field = event.type === "agent/inbox/spliced" ? "inserted" : "messages";
			for (const [index, value] of contentArray(data[field], label + "." + field).entries()) {
				const path = label + "." + field + "[" + String(index) + "]";
				assertContentKinds(record(value, path)["content"], path + ".content");
			}
			break;
		}
		case "compaction/summary":
			assertContentKinds(data["summary"], label + ".summary");
			if (data["rawOutput"] !== void 0) assertContentKinds(data["rawOutput"], label + ".rawOutput");
			break;
	}
	if (event.type === "assistant/message" || event.type === "assistant/attempt") for (const [index, value] of contentArray(data["stream"], label + ".stream").entries()) {
		const path = label + ".stream[" + String(index) + "]";
		const entry = record(value, path);
		if (entry["type"] !== "chunk") continue;
		const chunk = record(entry["chunk"], path + ".chunk");
		if (chunk["type"] === "block-end") assertContentBlock(chunk["block"], path + ".chunk.block");
		if (chunk["type"] === "block-start") assertContentKind(chunk["blockType"], path + ".chunk.blockType");
	}
}
function assertContentKind(kind, label) {
	if (typeof kind !== "string" || !CONTENT_KINDS.has(kind)) throw new SessionFormatUnsupportedMigrationError(label + ": cannot safely transform unclassified message content kind " + JSON.stringify(kind));
}
function assertContentKinds(content, label) {
	for (const [index, value] of contentArray(content, label).entries()) assertContentBlock(value, label + "[" + String(index) + "]");
}
function assertContentBlock(value, label) {
	const block = record(value, label);
	assertContentKind(block["type"], label);
	if (block["type"] === "tool-result") {
		if (!Array.isArray(block["content"])) throw new SessionFormatError(label + ".content: invalid message content kind \"tool-result\": content must be an array");
		assertContentKinds(block["content"], label + ".content");
	}
	if (block["type"] === "file") {
		keys(block, ["type", "attachment"], [], label + " kind \"file\"");
		const attachment = record(block["attachment"], label + " kind \"file\" attachment");
		keys(attachment, [
			"attachmentId",
			"name",
			"bytes"
		], [], label + " kind \"file\" attachment");
		if (typeof attachment["attachmentId"] !== "string" || attachment["attachmentId"].length === 0 || typeof attachment["name"] !== "string") throw new SessionFormatError(label + " kind \"file\": file attachment requires attachmentId and name");
		sessionFormatCount(attachment["bytes"], label + " kind \"file\" attachment bytes");
		return;
	}
	const probe = {
		type: "user/message",
		seq: 0,
		time: 0,
		data: {
			id: "content-admission",
			role: "user",
			source: { kind: "user" },
			content: [block["type"] === "tool-result" ? {
				...block,
				content: []
			} : block]
		}
	};
	try {
		assertReleasedPayloadSemantics(probe, 2);
	} catch (error) {
		throw new SessionFormatError(label + ": invalid message content kind " + JSON.stringify(block["type"]) + ": " + String(error));
	}
}
/**
* Reject V3 structural payload violations even beyond a recoverable physical-row failure.
* @param value - raw physical row; ordinary rows retain the frozen decoder's recovery policy.
*/
function assertV3StructuralRow(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return;
	const row = value;
	if (row["type"] === "request/header") {
		const data = record(row["data"], "request/header data");
		if (Object.hasOwn(record(data["header"], "request header"), "system")) throw new SessionFormatUnsupportedMigrationError("format v3 request/header rejects retired header.system");
	} else if (row["type"] === "system/message") {
		const data = record(row["data"], "system/message data");
		assertSystem({
			type: "system/message",
			seq: 0,
			time: 0,
			data
		}, data);
	}
}
function assertSystem(event, data) {
	keys(data, [
		"turn",
		"step",
		"message"
	], [], "system/message data");
	for (const coordinate of ["turn", "step"]) if (sessionFormatCount(data[coordinate], coordinate) === 0) throw new SessionFormatError(coordinate + " must be positive");
	const message = record(data["message"], "system message");
	keys(message, [
		"id",
		"role",
		"source",
		"content"
	], [], "system message");
	if (typeof message["id"] !== "string" || message["id"].length === 0 || message["role"] !== "system") throw new SessionFormatError("system message requires an id and system role");
	const source = record(message["source"], "system source");
	if (source["kind"] !== "plugin" || typeof source["plugin"] !== "string" || source["plugin"].length === 0) throw new SessionFormatError("system message requires plugin source");
	assertReleasedPayloadSemantics({
		...event,
		type: "user/message",
		data: {
			...message,
			role: "user"
		}
	}, 3);
}
function assertFeedback(type, data) {
	keys(data, type === "feedback/message-put" ? ["sessionId", "item"] : ["sessionId", "messageId"], [], type);
	if (typeof data["sessionId"] !== "string") throw new SessionFormatError("feedback sessionId must be a string");
	if (type === "feedback/message-delete") {
		if (typeof data["messageId"] !== "string") throw new SessionFormatError("feedback messageId must be a string");
		return;
	}
	const item = record(data["item"], "feedback item");
	keys(item, [
		"messageId",
		"rating",
		"version",
		"createdAt",
		"updatedAt"
	], ["note"], "feedback item");
	for (const key of ["messageId", "version"]) if (typeof item[key] !== "string") throw new SessionFormatError("feedback " + key + " must be a string");
	if (item["rating"] !== "positive" && item["rating"] !== "negative") throw new SessionFormatError("invalid feedback rating");
	if (item["note"] !== void 0 && typeof item["note"] !== "string") throw new SessionFormatError("feedback note must be a string");
	sessionFormatCount(item["createdAt"], "feedback createdAt");
	sessionFormatCount(item["updatedAt"], "feedback updatedAt");
}
/**
* Validate one canonical V3 event without interpreting plugin-owned payloads or log relationships.
* Unclassified metadata is deferred to vocabulary-aware restoration; unknown required types must not become recoverable corruption.
* @param event - decoded logical event.
* @param knownEventTypes - additional installed event types whose envelopes are interpreted.
*/
function assertV3Event(event, knownEventTypes) {
	const value = record(event, "format v3 event");
	const subject = `format v3 ${event.type} at seq ${event.seq}`;
	const opaque = !(!(event.type === "tool/code-dispatch-start" || event.type === "tool/code-dispatch") && (SURFACE_TYPES.has(event.type) || RELEASED_V2_EVENT_DISPOSITIONS[event.type] !== void 0 || event.type === "tool/ptc-dispatch-start" || event.type === "tool/ptc-dispatch" || event.type === "feedback/message-put" || event.type === "feedback/message-delete" || knownEventTypes?.has(event.type) === true));
	keys(value, [
		"type",
		"seq",
		"time",
		"data"
	], SURFACE_TYPES.has(event.type) || opaque ? [
		"ignorable",
		"surfaceOp",
		"sourceEventSeqs"
	] : ["ignorable"], subject);
	if (typeof event.type !== "string") throw new SessionFormatError(`${subject} type must be a string`);
	sessionFormatCount(event.seq, `${subject} seq`);
	sessionFormatSafeInteger(event.time, `${subject} time`);
	if (Object.hasOwn(value, "ignorable") && value["ignorable"] !== true) throw new SessionFormatError(`${subject} ignorable must be true when present`);
	if (SURFACE_TYPES.has(event.type)) {
		const operation = value["surfaceOp"];
		if (operation === void 0) throw new SessionFormatError(`${subject} requires a surfaceOp marker`);
		if (operation !== "append") {
			const replace = record(operation, `${subject} surfaceOp`);
			if (Object.keys(replace).length !== 3 || replace["op"] !== "replace" || !Object.hasOwn(replace, "startSeq") || !Object.hasOwn(replace, "endSeq")) throw new SessionFormatError(`${subject} requires exact replace fields op/startSeq/endSeq`);
			for (const key of ["startSeq", "endSeq"]) if (sessionFormatCount(replace[key], `${subject} surfaceOp ${key}`) >= event.seq) throw new SessionFormatError(`${subject} replacement endpoints must reference earlier events`);
		}
		const sources = value["sourceEventSeqs"];
		if (event.type === "assistant/message" && sources !== void 0) throw new SessionFormatError(`${subject} embeds its stream and cannot carry sourceEventSeqs`);
		if (sources !== void 0) {
			if (!Array.isArray(sources) || sources.length === 0) throw new SessionFormatError(`${subject} sourceEventSeqs must be a non-empty array`);
			const seen = /* @__PURE__ */ new Set();
			for (const source of sources) {
				const seq = sessionFormatCount(source, `${subject} sourceEventSeqs member`);
				if (seq >= event.seq || seen.has(seq)) throw new SessionFormatError(`${subject} sourceEventSeqs must be unique earlier seqs`);
				seen.add(seq);
			}
		}
	}
	assertV3StructuralRow(event);
	assertCanonicalPayload(event);
}
function assertCanonicalPayload(event) {
	const subject = `format v3 ${event.type} at seq ${event.seq}`;
	if (event.type === "request/header") {
		const header = record(record(event.data, `${subject} data`)["header"], `${subject} header`);
		if (Array.isArray(header["tools"]) && header["tools"].length === 0 || isSessionFormatJsonObject(header["adapterDefaults"]) && Object.keys(header["adapterDefaults"]).length === 0) throw new SessionFormatError(`${subject} empty optional header fields must be omitted`);
	}
	if (event.type !== "tool/result") return;
	const data = record(event.data, `${subject} data`);
	if (data["error"] === void 0) return;
	const content = record(data["message"], `${subject} message`)["content"];
	if (!Array.isArray(content) || content.length !== 1 || !isSessionFormatJsonObject(content[0]) || content[0]["type"] !== "tool-result" || content[0]["isError"] !== true) throw new SessionFormatError(`${subject} carries error metadata for a non-error tool result`);
}
/**
* Canonicalize structurally transformed events without changing their target coordinates.
* @param event - transformed event using released replacement names and target coordinates.
* @returns a V3 event sharing all unchanged payloads and reference values.
*/
function canonicalizeTransformedEvent(event) {
	let target = event;
	const operation = event["surfaceOp"];
	if (operation !== void 0 && operation !== "append") {
		const replace = record(operation, `format v2 ${event.type} at seq ${event.seq} surfaceOp`);
		if (Object.keys(replace).length !== 3 || replace["op"] !== "replace" || !Object.hasOwn(replace, "start") || !Object.hasOwn(replace, "end")) throw new SessionFormatError(`format v2 ${event.type} at seq ${event.seq} requires exact replace fields op/start/end`);
		target = {
			...event,
			surfaceOp: {
				op: "replace",
				startSeq: sessionFormatCount(replace["start"], `format v2 ${event.type} at seq ${event.seq} replace start`),
				endSeq: sessionFormatCount(replace["end"], `format v2 ${event.type} at seq ${event.seq} replace end`)
			}
		};
	}
	if (event.type === "request/header") {
		const data = record(event.data, `format v2 request/header at seq ${event.seq} data`);
		const header = record(data["header"], `format v2 request/header at seq ${event.seq} header`);
		const empty = Object.keys(header).filter((key) => key === "tools" && Array.isArray(header[key]) && header[key].length === 0 || key === "adapterDefaults" && isSessionFormatJsonObject(header[key]) && Object.keys(header[key]).length === 0);
		if (empty.length > 0) {
			const canonical = Object.fromEntries(Object.entries(header).filter(([key]) => !empty.includes(key)));
			target = {
				...target,
				data: {
					...data,
					header: canonical
				}
			};
		}
	}
	assertV3Event(target);
	return target;
}
//#endregion
//#region lib/types/validation.js
/** Native V3 system-head validation with a private view for frozen non-system relationships. */
/**
* Validate v3 logical metadata with the released-v2 fields.
* @param header - decoded v3 Session header.
*/
function assertReleasedV3Header(header) {
	if (header.version !== 3) throw new SessionFormatError("expected format v3 header");
	assertReleasedV2Header({
		...header,
		version: 2
	});
}
/**
* Validate system ownership, protected-head operations, ordinary relationships, and inherited cut.
* The private relationship view never escapes; the returned artifact and its messages are unchanged.
* @param artifact - detached v3 artifact.
* @param knownEventTypes - event types understood by the installed Session package.
* @returns the same validated artifact.
*/
function restoreReleasedV3Artifact(artifact, knownEventTypes) {
	assertReleasedV3Header(artifact.header);
	let step;
	let head;
	let hasSurface = false;
	const events = artifact.events.map((event) => {
		assertV3EventAdmission(event);
		assertV3Event(event, knownEventTypes);
		const system = event.type === "system/message";
		if (event.type === "step/start") {
			const data = record(event.data, event.type);
			step = {
				turn: data["turn"],
				step: data["step"]
			};
		} else if (event.type === "step/end" || event.type === "turn/end") step = void 0;
		if (system) {
			const data = record(event.data, "system/message");
			if (step === void 0 || step.turn !== data["turn"] || step.step !== data["step"]) throw new SessionFormatError("system/message does not match an open step");
			const operation = event["surfaceOp"];
			if (hasSurface && head === void 0) throw new SessionFormatError("system/message requires a protected first surface head");
			if (operation === "append") {
				if (!hasSurface) head = event.seq;
			} else {
				const replace = record(operation, "system replacement");
				if (replace["startSeq"] === head || replace["endSeq"] === head) {
					if (replace["startSeq"] !== head || replace["endSeq"] !== head) throw new SessionFormatError("system/message must replace exactly the current system head");
					head = event.seq;
				}
			}
		} else if (SURFACE_TYPES.has(event.type) && event["surfaceOp"] !== "append") {
			const replace = record(event["surfaceOp"], "surface replacement");
			if (replace["startSeq"] === head || replace["endSeq"] === head) throw new SessionFormatError("surface replacement cannot shadow the protected system head");
		}
		if (event.type === "compaction/prune" || event.type === "compaction/summary") {
			const seqs = record(event.data, event.type)["shadowedSeqs"];
			if (Array.isArray(seqs) && seqs.some((seq) => seq === head)) throw new SessionFormatError("compaction cannot shadow the protected system head");
		}
		if (SURFACE_TYPES.has(event.type)) hasSurface = true;
		const projected = relationshipEvent(event);
		if (!SURFACE_TYPES.has(event.type) || event["surfaceOp"] === "append") return projected;
		const replacement = event["surfaceOp"];
		return {
			...projected,
			surfaceOp: {
				op: "replace",
				start: replacement.startSeq,
				end: replacement.endSeq
			}
		};
	});
	restoreReleasedV2Artifact({
		...artifact,
		header: {
			...artifact.header,
			version: 2
		},
		events
	}, knownEventTypes, 3);
	return artifact;
}
/**
* Refuse required predecessor PTC tags without interpreting native extension payloads.
* @param event - event envelope whose type and ignorable admission markers are available.
*/
function assertV3EventAdmission(event) {
	if ((event.type === "tool/code-dispatch-start" || event.type === "tool/code-dispatch") && event["ignorable"] !== true) throw new SessionFormatUnsupportedMigrationError("format v3 contains unknown event type " + JSON.stringify(event.type) + " at seq " + String(event.seq));
}
function relationshipEvent(event) {
	switch (event.type) {
		case "tool/ptc-dispatch-start": return {
			...event,
			type: "tool/code-dispatch-start"
		};
		case "tool/ptc-dispatch": return {
			...event,
			type: "tool/code-dispatch"
		};
		case "tool/code-dispatch-start":
		case "tool/code-dispatch":
			assertV3EventAdmission(event);
			return {
				...event,
				type: "v3/opaque-released-event"
			};
	}
	if (event.type === "system/message") {
		const message = record(record(event.data, "system data")["message"], "system message");
		return {
			...event,
			type: "user/message",
			data: {
				...message,
				role: "user"
			}
		};
	}
	if (event.type !== "tool/result") return event;
	const data = record(event.data, "tool result");
	if (data["error"] === void 0) return event;
	if (record(data["error"], "tool error")["code"] !== "TOOL_NOT_STARTED") return event;
	const message = record(data["message"], "tool message");
	const callId = record(message["source"], "tool source")["callId"];
	const id = message["id"];
	if (!isRepairIdentity(id, callId)) return event;
	const prefix = "interrupted-tool-result-" + callId + "-";
	return {
		...event,
		data: {
			...data,
			message: {
				...message,
				id: `${prefix}${event.seq}`
			}
		}
	};
}
//#endregion
//#region lib/types/codec.js
/** V3 framing with hard structural admission and recoverable canonical event validation. */
/** V3 codec validates structural rows before recovery and logical envelopes after provenance decoding. */
const releasedV3SessionFormatCodec = Object.freeze({
	version: 3,
	decodeHeader(value) {
		return {
			...releasedV2SessionFormatCodec$1.decodeHeader(v2PhysicalHeader(value)),
			version: 3
		};
	},
	createDecoder(value, recovery) {
		const decoder = releasedV2SessionFormatCodec$1.createDecoder(v2PhysicalHeader(value), recovery);
		let issue;
		let acceptedInheritedCut;
		return {
			header: {
				...decoder.header,
				version: 3
			},
			decodeRow(row, context) {
				assertV3RowAdmission(row);
				decoder.decodeRow(row, {
					emitRun: context.emitRun.bind(context),
					emitEvent(event) {
						assertV3EventAdmission(event);
						if (issue === void 0) try {
							assertV3Event(event);
						} catch (error) {
							const invalid = error;
							if (recovery === "strict") throw invalid;
							issue = invalid;
						}
						if (issue !== void 0) {
							if (event.type === "turn/end") throw issue;
							return;
						}
						if (event.type === "session/end-seed" && isSessionFormatJsonObject(event.data) && event.data["inherited"] === true) acceptedInheritedCut = event.seq;
						context.emitEvent(event);
					}
				});
			},
			finish(context) {
				if (issue === void 0) return decoder.finish(context);
				if (decoder.header.isSeeded && acceptedInheritedCut === void 0) throw new SessionFormatError("format v3 seeded Session lacks an accepted inherited end-seed marker");
				if (!decoder.header.isSeeded && acceptedInheritedCut !== void 0) throw new SessionFormatError("format v3 unseeded Session contains an inherited end-seed marker");
				return acceptedInheritedCut ?? 0;
			}
		};
	},
	encodeHeader(header, inheritedEventCount) {
		assertReleasedV3Header(header);
		return {
			...releasedV2SessionFormatCodec$1.encodeHeader({
				...header,
				version: 2
			}, inheritedEventCount),
			version: 3
		};
	},
	encodeEvent(event) {
		assertV3EventAdmission(event);
		assertV3Event(event);
		return releasedV2SessionFormatCodec$1.encodeEvent(event);
	}
});
/**
* Validate owned V3 admission rules before a scanner or codec can discard a recoverable tail.
* This checks only identified structural payloads; physical provenance still belongs to decoding.
* @param row - parsed physical row, before envelope or compressed-range decoding.
*/
function assertV3RowAdmission(row) {
	assertV3StructuralRow(row);
	if (typeof row === "object" && row !== null && !Array.isArray(row)) assertV3EventAdmission(row);
}
function v2PhysicalHeader(value) {
	const header = snapshotSessionFormatJson(value, "format v3 physical header");
	if (!isSessionFormatJsonObject(header) || header["version"] !== 3) throw new SessionFormatError("expected format v3 physical Session header");
	return {
		...header,
		version: 2
	};
}
//#endregion
//#region lib/types/references.js
/** Explicit local-coordinate remapping; captured generations and owner-local counters remain opaque. */
/**
* Remap only audited same-artifact references, preserving IDs and embedded model input.
* @param event - validated source event.
* @param seq - output event position.
* @param mapping - earlier source positions mapped to output positions.
* @returns the event in target coordinates.
*/
function remapEvent(event, seq, mapping) {
	const one = (value) => {
		const source = sessionFormatCount(value, "source event reference");
		const target = mapping[source];
		if (source >= event.seq || target === void 0) throw new SessionFormatError("reference must name an earlier source event");
		return target;
	};
	const list = (value) => {
		if (!Array.isArray(value)) throw new SessionFormatError("sequence references must be an array");
		return value.map(one);
	};
	const range = (value) => {
		const source = record(value, "sequence range");
		return {
			...source,
			start: one(source["start"]),
			end: one(source["end"])
		};
	};
	let data = record(event.data, event.type);
	switch (event.type) {
		case "command/done":
			if (data["sourceEventSeq"] !== void 0) data = {
				...data,
				sourceEventSeq: one(data["sourceEventSeq"])
			};
			break;
		case "compaction/summary":
		case "compaction/prune":
			data = {
				...data,
				shadowedRange: range(data["shadowedRange"]),
				shadowedSeqs: list(data["shadowedSeqs"])
			};
			break;
		case "session/title":
		case "session/title-llm-request":
			data = {
				...data,
				messageSeqs: list(data["messageSeqs"])
			};
			break;
	}
	return {
		...event,
		seq,
		data,
		...event["sourceEventSeqs"] === void 0 ? {} : { sourceEventSeqs: list(event["sourceEventSeqs"]) },
		...event["surfaceOp"] === void 0 || event["surfaceOp"] === "append" ? {} : { surfaceOp: range(event["surfaceOp"]) }
	};
}
//#endregion
//#region lib/types/migration.js
/** Streaming system-prompt promotion followed by canonical V3 envelope conversion. */
/** Promote system prompts, remap audited references, and canonicalize envelopes and PTC vocabulary. */
const sessionFormatV2ToV3 = defineSessionFormatMigration({
	name: "@deepseek-ai/dsh-session-format-v2-to-v3",
	fromVersion: 2,
	toVersion: 3,
	migrateHeader(header) {
		assertReleasedV2Header(header);
		return {
			...header,
			version: 3,
			...header.agentPreset === "code" ? { agentPreset: "ptc" } : {}
		};
	},
	createStage(input) {
		return new ReleasedV2ToV3Stage(input);
	},
	validateTargetHeader: assertReleasedV3Header
});
var ReleasedV2ToV3Stage = class {
	input;
	headerInheritedEventCount;
	mapping = [];
	originalIds = /* @__PURE__ */ new Set();
	generatedIds = /* @__PURE__ */ new Set();
	targetSeq = 0;
	sourceCut;
	targetCut;
	lastForeignDeliverySeq;
	step;
	head;
	prompt = "";
	constructor(input) {
		this.input = input;
		assertReleasedV2Header(input.sourceHeader);
		this.sourceCut = input.sourceHeader.isSeeded ? void 0 : 0;
		this.targetCut = input.sourceHeader.isSeeded ? void 0 : 0;
		if (!input.sourceHeader.isSeeded) this.headerInheritedEventCount = 0;
	}
	transformEvent(event, context) {
		if (event.seq !== this.mapping.length) throw new SessionFormatError("format v2 source events must be dense");
		assertEvent(event, 2);
		this.observeMessageIds(event);
		let source = event;
		const data = record(event.data, event.type);
		if (event.type === "request/header") {
			const { system, ...header } = record(data["header"], "request header");
			const prompt = typeof system === "string" ? system : "";
			if (prompt !== this.prompt) this.emitSystem(prompt, event, context);
			source = {
				...event,
				data: {
					...data,
					header
				}
			};
		}
		if (SURFACE_TYPES.has(event.type) && this.head === void 0) throw new SessionFormatUnsupportedMigrationError("format v2 surface before first step cannot acquire a system head without changing chronology");
		if (event.type === "session/end-seed" && data["inherited"] === true) {
			if (!this.input.sourceHeader.isSeeded) throw new SessionFormatError("format v2 unseeded Session contains an inherited end-seed marker");
			this.sourceCut = event.seq;
			this.targetCut = this.targetSeq;
		}
		if (event.type === "session-log-deepseek/delivery-accepted") {
			if (data["sessionFormatVersion"] === 3) throw new SessionFormatError("format v2 delivery marker claims target format v3");
			if (data["sessionFormatVersion"] === 2 && data["sessionId"] !== this.input.sourceHeader.id) this.lastForeignDeliverySeq = event.seq;
		}
		const target = remapEvent(source, this.targetSeq, this.mapping);
		this.mapping.push(this.targetSeq++);
		context.emitEvent(canonicalizeTransformedEvent(renamePtcEvent(target)));
		if (event.type === "step/start") {
			this.step = {
				turn: data["turn"],
				step: data["step"]
			};
			if (this.head === void 0) this.emitSystem("", event, context);
		} else if (event.type === "step/end" || event.type === "turn/end") this.step = void 0;
	}
	transformRun(run, context) {
		for (const event of run.expand()) this.transformEvent(event, context);
	}
	finish(_context) {
		const cut = sessionFormatCount(this.sourceCut, "format v2 inherited end-seed marker");
		if (this.input.sourceInheritedEventCount !== void 0 && this.input.sourceInheritedEventCount !== cut) throw new SessionFormatError("format v2 inherited end-seed marker disagrees with its source cut");
		if (this.lastForeignDeliverySeq !== void 0 && (this.input.sourceHeader.parentSession === void 0 || this.lastForeignDeliverySeq >= cut)) throw new SessionFormatError("current-generation delivery marker names the wrong Session");
		return sessionFormatCount(this.targetCut, "format v3 inherited event count");
	}
	observeMessageIds(event) {
		const data = record(event.data, event.type);
		const messages = event.type === "user/message" ? [data] : event.type === "assistant/message" || event.type === "tool/result" ? [record(data["message"], "message")] : event.type === "agent/inbox/spliced" ? data["inserted"] : event.type === "session/title-llm-request" ? data["messages"] : [];
		for (const message of messages) {
			const id = message["id"];
			if (this.generatedIds.has(id)) throw new SessionFormatUnsupportedMigrationError("source message id collides with a generated system message id");
			this.originalIds.add(id);
		}
	}
	emitSystem(prompt, anchor, context) {
		if (this.step === void 0) throw new SessionFormatUnsupportedMigrationError("format v2 changed request prompt outside an open step cannot retain source chronology");
		const identity = JSON.stringify([
			"session-format-v2-to-v3",
			this.input.sourceHeader.id,
			anchor.seq,
			anchor.type
		]);
		const id = "v2-to-v3-system-" + createHash("sha256").update(identity).digest("hex");
		if (this.originalIds.has(id) || this.generatedIds.has(id)) throw new SessionFormatUnsupportedMigrationError("generated system message id collides with an existing message id");
		this.generatedIds.add(id);
		const seq = this.targetSeq++;
		context.emitEvent(canonicalizeTransformedEvent({
			type: "system/message",
			seq,
			time: anchor.time,
			data: {
				...this.step,
				message: {
					id,
					role: "system",
					source: {
						kind: "plugin",
						plugin: "@deepseek-ai/dsh-system-prompt"
					},
					content: prompt === "" ? [] : [{
						type: "text",
						text: prompt
					}]
				}
			},
			...this.head === void 0 ? { surfaceOp: "append" } : {
				surfaceOp: {
					op: "replace",
					start: this.head,
					end: this.head
				},
				sourceEventSeqs: [this.head]
			}
		}));
		this.head = seq;
		this.prompt = prompt;
	}
};
/** Source admission precedes renaming, so these payloads have exact audited fields. */
function renamePtcEvent(event) {
	switch (event.type) {
		case "agent-preset/selected": return event.data["agentPreset"] === "code" ? {
			...event,
			data: {
				...event.data,
				agentPreset: "ptc"
			}
		} : event;
		case "tool/code-dispatch-start": return {
			...event,
			type: "tool/ptc-dispatch-start"
		};
		case "tool/code-dispatch": return {
			...event,
			type: "tool/ptc-dispatch"
		};
		case "user/message": {
			const data = renameMessageSource(event.data);
			return data === event.data ? event : {
				...event,
				data
			};
		}
		case "agent/inbox/spliced":
		case "session/title-llm-request": {
			const data = event.data;
			const key = event.type === "agent/inbox/spliced" ? "inserted" : "messages";
			const messages = data[key];
			const renamed = messages.map(renameMessageSource);
			return renamed.every((message, index) => message === messages[index]) ? event : {
				...event,
				data: {
					...data,
					[key]: renamed
				}
			};
		}
		default: return event;
	}
}
function renameMessageSource(message) {
	const source = message["source"];
	if (source["kind"] !== "plugin" || source["plugin"] !== "tools-code-mode") return message;
	return {
		...message,
		source: {
			...source,
			plugin: "tools-ptc"
		}
	};
}
//#endregion
export { assertReleasedV3Header, assertV3EventAdmission, assertV3RowAdmission, releasedV2SessionFormatCodec, releasedV3SessionFormatCodec, restoreReleasedV3Artifact, sessionFormatV2ToV3 };
