import { randomUUID } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { brandString } from "@deepseek-ai/dsh-brand";
import { installModelSelection } from "@deepseek-ai/dsh-agent";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { assertNever } from "@deepseek-ai/dsh-util-values";
import { SessionSeq } from "@deepseek-ai/dsh-session";
//#region lib/types/index.js
/**
* @deepseek-ai/dsh-headless — one-shot direct Agent driver. The bundle patch
* rides over dsh-base without Host, HTTP, or browser plugins; this runner
* creates one Agent through the core registry, drives the task to quiescence,
* streams provider reasoning to stderr, flushes its Session, prints the final
* assistant text to stdout, and exits.
*
* @module @deepseek-ai/dsh-headless
*/
/** Stable Cordis plugin name. */
const name = "headless-runner";
/** Core services required before the one-shot turn can start. */
const inject = [
	"agentDefaultModel",
	"agents",
	"sessions"
];
const Config = z.object({ task: z.string().required() });
/** The process streams the runner writes to; tests substitute captures. */
const internals = {
	stdout: process.stdout,
	stderr: process.stderr
};
/** Aggregate the last assistant text and turn outcome in one owned interval. */
function summarize(session, firstSeq) {
	let started = false;
	let text = "";
	let reason;
	const length = session.seq;
	for (let seq = firstSeq; seq < length; seq++) {
		const event = session.eventAt(SessionSeq(seq));
		if (event === void 0) throw new Error(`headless summary cannot read seq ${String(seq)} below captured length ${String(length)}`);
		if (event.type === "turn/start") {
			started = true;
			continue;
		}
		if (!started) continue;
		if (event.type === "assistant/message") {
			const joined = event.data.message.content.filter((block) => block.type === "text").map((block) => block.text).join("");
			if (joined !== "") text = joined;
		}
		if (event.type === "turn/end") reason = event.data.reason;
	}
	return {
		text,
		reason
	};
}
/**
* Project provider-reported reasoning from one owned run to stderr as it is
* streamed, while keeping final outcome derivation on the durable log.
* @param ctx - plugin context carrying the live Assistant frame feed.
* @param agent - the exact Agent whose reasoning belongs to this invocation.
* @param stderr - progress output sink.
* @returns a disposer that also terminates an unterminated reasoning line.
*/
function streamReasoning(ctx, agent, stderr) {
	let open = false;
	let endsWithNewline = true;
	const close = () => {
		if (!open) return;
		if (!endsWithNewline) stderr.write("\n");
		open = false;
		endsWithNewline = true;
	};
	const dispose = ctx.on("agent/assistant-stream", ({ agent: subject, frame }) => {
		if (subject !== agent) return;
		if (frame.type === "start") {
			close();
			return;
		}
		if (frame.type === "end") {
			close();
			return;
		}
		const chunk = frame.chunk;
		switch (chunk.type) {
			case "reasoning-delta":
				if (chunk.text === "") return;
				if (!open) {
					stderr.write("dsh: reasoning:\n");
					open = true;
				}
				stderr.write(chunk.text);
				endsWithNewline = chunk.text.endsWith("\n");
				return;
			case "block-start":
				if (chunk.blockType !== "reasoning") close();
				return;
			case "block-end":
				if (chunk.block.type !== "reasoning") close();
				return;
			case "usage": return;
			case "text-delta":
			case "tool-call-delta":
			case "finish":
				close();
				return;
			/* v8 ignore next -- closed-union exhaustiveness guard */
			default: return assertNever(chunk, "headless reasoning stream");
		}
	});
	return () => {
		dispose();
		close();
	};
}
/** Report an unexpected direct-driver failure and request a failing exit. */
function fail(io, error) {
	io.stderr.write(`dsh: ${error instanceof Error ? error.message : String(error)}\n`);
	io.exit(1);
}
/**
* Run one task through a freshly created Agent and request process exit.
* @param ctx - plugin context carrying the Agent, default model, Session, and launcher IO services.
* @param task - one-shot task text.
* @param io - process-facing effects.
*/
async function run(ctx, task, io) {
	await ctx.get("loader")?.await();
	const agents = ctx.get("agents");
	const defaultModel = ctx.get("agentDefaultModel");
	const sessions = ctx.get("sessions");
	if (agents === void 0 || defaultModel === void 0 || sessions === void 0) return;
	const selection = defaultModel.currentSelection();
	const { agent } = await agents.create({
		sessionId: brandString(`session-${randomUUID()}`),
		meta: { cwd: process.cwd() },
		agentOptions: {
			provider: selection.provider,
			model: selection.model
		},
		setup: (agentCtx) => {
			installModelSelection(agentCtx, {
				current: selection,
				assembled: void 0
			});
		}
	});
	await agent.whenIdle();
	const firstSeq = agent.session.seq;
	const stopReasoning = streamReasoning(ctx, agent, io.stderr);
	try {
		agent.followup(createUserMessage({
			content: [{
				type: "text",
				text: task
			}],
			source: { kind: "user" }
		}));
		await agent.whenIdle();
	} finally {
		stopReasoning();
	}
	await sessions.flush(agent.session);
	const outcome = summarize(agent.session, firstSeq);
	io.stdout.write(outcome.text + "\n");
	if (outcome.reason?.kind === "error") io.stderr.write(`dsh: ${outcome.reason.error.code}: ${outcome.reason.error.message}\n`);
	io.exit(outcome.reason?.kind === "completed" ? 0 : 1);
}
/**
* Mount the one-shot direct driver.
* @param ctx - plugin context carrying core services and the launcher-provided exit request.
* @param config - validated task config.
*/
function apply(ctx, config) {
	const exit = ctx.get("appExit");
	if (exit === void 0) throw new Error("headless-runner: the launcher must provide ctx.appExit before the tree mounts");
	const io = {
		stdout: internals.stdout,
		stderr: internals.stderr,
		exit
	};
	run(ctx, config.task, io).catch((error) => {
		fail(io, error);
	});
}
//#endregion
export { Config, apply, inject, internals, name };
