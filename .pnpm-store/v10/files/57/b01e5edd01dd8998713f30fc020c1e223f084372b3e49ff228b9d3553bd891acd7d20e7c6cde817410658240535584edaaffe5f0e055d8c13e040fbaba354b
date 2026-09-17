import { assertNever } from "@deepseek-ai/dsh-util-values";
//#region lib/types/request-zone.js
/** Browser-zone derivation and model-facing policy text for one open request turn. */
const IANA_TIME_ZONE = /^[A-Za-z][A-Za-z0-9_+.-]*(?:\/[A-Za-z0-9_+.-]+)+$/;
/** Read and validate a Host-canonicalized browser zone from one ordinary user-rpc message. */
function browserTimeZone(message) {
	const source = message.source;
	const value = source.kind === "user" && "rpcId" in source && typeof source.rpcId === "string" && "clientTimeZone" in source && typeof source.clientTimeZone === "string" ? source.clientTimeZone : void 0;
	if (value === void 0) return void 0;
	if (value !== "UTC" && !IANA_TIME_ZONE.test(value)) throw new TypeError(`browser time zone must be canonical UTC or IANA Area/Location: ${JSON.stringify(value)}`);
	let canonical;
	try {
		canonical = new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
	} catch (error) {
		throw new TypeError(`browser time zone is unsupported: ${JSON.stringify(value)}`, { cause: error });
	}
	if (canonical !== value) throw new TypeError(`browser time zone must be canonical: ${JSON.stringify(value)}`);
	return value;
}
/**
* Derive the unique, mixed, or missing browser zone for one open turn.
* @param messages - Entered and proposed user messages belonging to the turn.
* @returns Sorted, duplicate-free browser-zone facts.
* @throws TypeError when a user-rpc source carries an invalid or noncanonical zone.
*/
function deriveBrowserTimeZoneContext(messages) {
	const timeZones = [...new Set(messages.flatMap((message) => {
		const timeZone = browserTimeZone(message);
		return timeZone === void 0 ? [] : [timeZone];
	}))].sort();
	const [timeZone, ...remaining] = timeZones;
	if (timeZone === void 0) return { kind: "missing" };
	if (remaining.length === 0) return {
		kind: "resolved",
		timeZone
	};
	return {
		kind: "mixed",
		timeZones
	};
}
/**
* Render the model instruction for one browser-zone context.
* @param context - Browser-zone facts for the open turn.
* @returns One durable policy line.
*/
function renderBrowserTimeZoneContext(context) {
	switch (context.kind) {
		case "resolved": return `Browser time zone for this request: ${context.timeZone}. Interpret otherwise-unqualified dates and times in this zone.`;
		case "mixed": return `Browser time zone for this request: mixed ${JSON.stringify(context.timeZones)}. Ask the user to clarify otherwise-unqualified dates and times.`;
		case "missing": return "Browser time zone for this request: unavailable. Ask the user to clarify otherwise-unqualified dates and times.";
		/* v8 ignore next 2 -- the closed BrowserTimeZoneContext union is exhausted above. */
		default: return assertNever(context, "BrowserTimeZoneContext");
	}
}
//#endregion
//#region lib/types/timestamp.js
/** ISO-shaped time-context timestamp formatting shared by production and replay validation. */
/**
* Create the exact formatter used by durable time-context readings.
* @param timeZone - Explicit display zone, or `undefined` for the process fallback.
* @returns A formatter with stable numeric local fields and long numeric offset.
*/
function createTimestampFormatter(timeZone) {
	return new Intl.DateTimeFormat("en-US", {
		...timeZone === void 0 ? {} : { timeZone },
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
		timeZoneName: "longOffset"
	});
}
/**
* Format an epoch millisecond value as an ISO-shaped timestamp with offset and IANA zone.
* @param now - Epoch milliseconds to display.
* @param formatter - Formatter created for `timeZone`.
* @param timeZone - Canonical zone label carried in brackets.
* @returns The durable timestamp text.
*/
function formatTimestamp(now, formatter, timeZone) {
	const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
	const offset = parts.timeZoneName.replace(/^GMT$/, "GMT+00:00").slice(3);
	return `${parts["year"]}-${parts["month"]}-${parts["day"]}T${parts["hour"]}:${parts["minute"]}:${parts["second"]}${offset}[${timeZone}]`;
}
//#endregion
//#region lib/types/invariant.js
/** Package-owned durable clock-context invariants. @module @deepseek-ai/dsh-time-context/invariant */
const PACKAGE_NAME = "@deepseek-ai/dsh-time-context";
const SOURCE_NAME = "time-context";
const READING = /* @__PURE__ */ new RegExp("^Time sampled while preparing turn (\\d+), step (\\d+): (\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:Z|[+-]\\d{2}:\\d{2})\\[[^\\]]+\\])\\n(Browser time zone for this request: .+)\\nElapsed since the preceding (model-visible message|step context): (?:unavailable|(?:(?:\\d+d )?(?:\\d+h )?(?:\\d+m )?\\d+s))\\.$");
/** Cordis companion plugin name. */
const name = "time-context-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/** Derive the open step boundary at which a time-context reading may append. */
function preparationPosition(history, fail) {
	let openTurn;
	let openStep;
	let requestStarted = false;
	for (const event of history) switch (event.type) {
		case "turn/start":
			openTurn = event.data.turn;
			openStep = void 0;
			requestStarted = false;
			break;
		case "step/start":
			openStep = event.data.step;
			requestStarted = false;
			break;
		case "request/header":
			requestStarted = true;
			break;
		case "step/end":
			openStep = void 0;
			requestStarted = false;
			break;
		case "turn/end":
			openTurn = void 0;
			openStep = void 0;
			requestStarted = false;
			break;
		default: break;
	}
	if (openTurn === void 0) fail("time-context reading must be appended inside an open turn");
	if (openStep === void 0) fail("time-context reading must follow step/start");
	if (requestStarted) fail("time-context reading must precede request/header");
	return {
		turn: openTurn,
		step: openStep
	};
}
/** Collect the entered user messages belonging to one open turn. */
function requestMessages(history, turn) {
	const start = history.findLastIndex((event) => event.type === "turn/start" && event.data.turn === turn);
	return history.slice(start + 1).flatMap((event) => event.type === "user/message" ? [event.data] : []);
}
/** Validate one plugin-attributed time reading against its session position and timestamp. */
function validateReading(history, event, fail) {
	const blockValue = event.data.content[0];
	const block = typeof blockValue === "object" && blockValue !== null ? blockValue : void 0;
	const blockText = block?.text;
	if (event.data.content.length !== 1 || block === void 0 || Object.keys(block).length !== 2 || block.type !== "text" || typeof blockText !== "string") fail("time-context messages must contain exactly one text block");
	const match = READING.exec(blockText);
	if (match === null) fail("time-context message does not match the durable reading format");
	const turn = Number(match[1]);
	const step = Number(match[2]);
	if (!Number.isSafeInteger(turn) || turn < 1 || !Number.isSafeInteger(step) || step < 1) fail("time-context turn and step must be positive safe integers");
	const expected = preparationPosition(history, fail);
	if (turn !== expected.turn || step !== expected.step) fail(`time-context reading names turn ${turn}/step ${step}, expected turn ${expected.turn}/step ${expected.step}`);
	const source = event.data.source;
	/* v8 ignore next 2 -- replay and dispatch callers select this exact package-owned source before validation. */
	if (source.kind !== "plugin" || source.plugin !== SOURCE_NAME) fail("time-context source must retain package ownership");
	const sections = "sections" in source ? source.sections : void 0;
	const sectionValue = Array.isArray(sections) ? sections[0] : void 0;
	const section = typeof sectionValue === "object" && sectionValue !== null ? sectionValue : void 0;
	if (Object.keys(source).length !== 4 || source.form !== "snapshot" || !Array.isArray(sections) || sections.length !== 1 || section === void 0 || Object.keys(section).length !== 2 || section.name !== SOURCE_NAME || section.text !== blockText) fail("time-context source must carry only the exact snapshot text, not request authority");
	const renderedBrowserContext = match[4];
	const browserContext = deriveBrowserTimeZoneContext(requestMessages(history, turn));
	if (renderedBrowserContext !== renderBrowserTimeZoneContext(browserContext)) fail("time-context browser-zone text does not match current-turn user messages");
	const baseline = match[5];
	if (step === 1 !== (baseline === "model-visible message")) fail(`time-context step ${step} uses the wrong elapsed-time baseline ${JSON.stringify(baseline)}`);
	const rendered = match[3];
	/* v8 ignore next -- the preceding fixed regexp always supplies capture group three. */
	if (rendered === void 0) fail("time-context reading omitted its rendered timestamp");
	const renderedTime = Date.parse(rendered.replace(/\[[^\]]+\]$/, ""));
	if (!Number.isFinite(renderedTime) || !Number.isSafeInteger(event.time) || event.time < renderedTime) fail("time-context rendered timestamp must parse and not postdate its durable event");
	if (browserContext.kind === "resolved") {
		let expectedTimestamp;
		try {
			expectedTimestamp = formatTimestamp(renderedTime, createTimestampFormatter(browserContext.timeZone), browserContext.timeZone);
		} catch (error) {
			fail(`time-context browser zone cannot format its durable timestamp: ${String(error)}`);
		}
		if (rendered !== expectedTimestamp) fail("time-context rendered timestamp does not match the unique browser zone");
	}
}
/** Validate all package-owned readings already present in one session. */
function validateSession(session, fail) {
	const events = session.snapshotEvents();
	for (const [index, event] of events.entries()) {
		if (event.type !== "user/message" || event.data.source.kind !== "plugin" || event.data.source.plugin !== SOURCE_NAME) continue;
		validateReading(events.slice(0, index), event, fail);
	}
}
/** Install validation for loaded and newly appended context readings. */
const install = Object.assign((ctx, fail) => {
	for (const session of ctx.sessions.list()) validateSession(session, fail);
	ctx.on("session/created", (session) => {
		validateSession(session, fail);
	}, { global: true });
	ctx.on("internal/dispatch", (_mode, eventName, args) => {
		if (eventName !== "session/event") return;
		const [session, event] = args;
		if (event.type !== "user/message" || event.data.source.kind !== "plugin" || event.data.source.plugin !== SOURCE_NAME) return;
		validateReading(session.snapshotEvents(), event, fail);
	}, { global: true });
}, { inject: ["sessions"] });
/**
* Register the time-context invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
