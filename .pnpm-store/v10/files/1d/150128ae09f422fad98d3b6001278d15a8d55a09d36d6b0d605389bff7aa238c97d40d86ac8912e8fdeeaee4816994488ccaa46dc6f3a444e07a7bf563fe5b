import z from "@deepseek-ai/schemastery";
import { boundContextSummary, createUserMessage } from "@deepseek-ai/dsh-llm";
import { TextRetainer } from "@deepseek-ai/dsh-output-retention";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { JobId } from "@deepseek-ai/dsh-jobs";
//#region lib/types/index.js
/**
* Model-facing `job_output`, `job_list`, and `job_kill` tools over
* `ctx.jobs`. Loading the plugin attaches the controller required by
* producers. It also delivers unreported completions to the owning agent:
* injected into a busy owner's next step, or opening a turn on an idle one
* under the default `wakeup` delivery, bounded per owner.
* @module @deepseek-ai/dsh-tool-jobs
*/
const name = "tool-jobs";
const inject = [
	"tools",
	"jobs",
	"systemPrompt"
];
const Config = z.object({
	waitTimeoutMs: z.number().min(1).default(3e4),
	maxWaitTimeoutMs: z.number().min(1).default(6e5),
	completionDelivery: z.union(["quiet", "wakeup"]).default("wakeup"),
	maxConsecutiveWakes: z.number().min(1).default(3)
});
/** Shared schema for job-control outputs. */
const PUBLIC_TASK_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			type: "string",
			required: true
		},
		kind: {
			type: "string",
			required: true
		},
		label: {
			type: "string",
			required: true
		},
		status: {
			type: "string",
			required: true,
			enum: [
				"running",
				"stopping",
				"completed",
				"killed",
				"failed"
			]
		},
		detail: { type: "string" },
		startedAt: {
			type: "integer",
			required: true
		},
		finishedAt: { type: "integer" }
	}
};
/** Remove job ownership and notification bookkeeping from a registry snapshot. */
function publicJob(snapshot) {
	return {
		id: snapshot.id,
		kind: snapshot.kind,
		label: snapshot.label,
		status: snapshot.status,
		...snapshot.detail !== void 0 ? { detail: snapshot.detail } : {},
		startedAt: snapshot.startedAt,
		...snapshot.finishedAt !== void 0 ? { finishedAt: snapshot.finishedAt } : {}
	};
}
/**
* Render generic status with optional producer detail.
* @param snapshot - job state to render.
* @returns a bracketed status line.
*/
function statusLine(snapshot) {
	return snapshot.detail !== void 0 ? `[status: ${snapshot.status}, ${snapshot.detail}]` : `[status: ${snapshot.status}]`;
}
const encoder = new TextEncoder();
function retainTail(text, maxBytes) {
	const retainer = new TextRetainer({
		kind: "tail",
		maxBytes
	});
	retainer.push(text);
	return retainer.finish().text;
}
function retainHead(text, maxBytes) {
	const retainer = new TextRetainer({
		kind: "head",
		maxBytes
	});
	retainer.push(text);
	return retainer.finish().text;
}
function fitWithSuffix(content, suffix, maxBytes, omitted) {
	const complete = `${content}${suffix}`;
	if (maxBytes === void 0 || encoder.encode(complete).byteLength <= maxBytes) return complete;
	const fixed = `${content.endsWith(omitted.trimStart()) ? "" : omitted}${suffix}`;
	const fixedBytes = encoder.encode(fixed).byteLength;
	if (fixedBytes >= maxBytes) return retainTail(fixed, maxBytes);
	return `${retainTail(content, maxBytes - fixedBytes)}${fixed}`;
}
/**
* One-line account of a settled job for the `notice` form's collapsed row.
* @param snapshot - the settled job.
* @returns its kind, label, and status, bounded like every notice summary.
*/
function completionSummary(snapshot) {
	return boundContextSummary(`${snapshot.kind} ${snapshot.label} ${statusLine(snapshot)}`);
}
function fitCompletionNotice(snapshot) {
	const prefix = `background job ${snapshot.id}`;
	const detail = ` (${snapshot.kind}: ${snapshot.label}) finished ${statusLine(snapshot)}`;
	const action = "\nDone; job_output.";
	const complete = `${prefix}${detail}. Read its output with job_output.`;
	const maxBytes = snapshot.outputLimitBytes;
	if (maxBytes === void 0 || encoder.encode(complete).byteLength <= maxBytes) return complete;
	const omitted = "\n[notice truncated]";
	const fixed = `${prefix}${omitted}${action}`;
	const fixedBytes = encoder.encode(fixed).byteLength;
	if (fixedBytes <= maxBytes) return fixedBytes === maxBytes ? fixed : `${prefix}${retainHead(detail, maxBytes - fixedBytes)}${omitted}${action}`;
	const compact = `${prefix}${action}`;
	if (encoder.encode(compact).byteLength <= maxBytes) return compact;
	const actionBytes = encoder.encode(action).byteLength;
	if (actionBytes >= maxBytes) return retainTail(action, maxBytes);
	return `${retainHead(prefix, maxBytes - actionBytes)}${action}`;
}
function rawSingleText(content) {
	if (content.length !== 1) return void 0;
	const block = content[0];
	if (block?.type !== "text") return void 0;
	return block.text;
}
function boundSingleText(content, maxBytes) {
	const text = rawSingleText(content);
	if (text === void 0) return void 0;
	return [{
		type: "text",
		text: fitWithSuffix(text, "", maxBytes, "\n[result truncated]")
	}];
}
function visibleOutputLimit(ctx, exec) {
	if (exec.name !== "job_output" && exec.name !== "job_kill") return void 0;
	const jobId = exec.arguments?.job_id;
	if (typeof jobId !== "string" || jobId.length === 0) return void 0;
	return ctx.jobs.list(exec.agent).find((snapshot) => snapshot.id === jobId)?.outputLimitBytes;
}
/** Validate the non-empty constraint that ParameterSchemaSpec cannot express. */
function validateJobId(value) {
	if (value.length === 0) throw new Error(`invalid job_id: expected a non-empty string, got ${JSON.stringify(value)}`);
	return JobId(value);
}
/** Pending presentation shared by the three generic job controls. */
function presentTaskCall(title, kind, rawInput) {
	return {
		card: "generic",
		title,
		kind,
		...rawInput !== void 0 ? { rawInput } : {}
	};
}
function apply(ctx, config) {
	const waitDefault = config.waitTimeoutMs ?? 3e4;
	const waitCap = config.maxWaitTimeoutMs ?? 6e5;
	const delivery = config.completionDelivery ?? "wakeup";
	const wakeBudget = config.maxConsecutiveWakes ?? 3;
	const spentWakes = /* @__PURE__ */ new WeakMap();
	if (waitDefault > waitCap) throw new Error(`tool-jobs: waitTimeoutMs (${waitDefault}) exceeds maxWaitTimeoutMs (${waitCap})`);
	if (!Number.isSafeInteger(wakeBudget)) throw new Error(`tool-jobs: maxConsecutiveWakes (${wakeBudget}) must be a whole number of turns`);
	if (delivery === "wakeup") ctx.on("agent/inbox/claimed", ({ agent, message }) => {
		if (message.source.kind === "user") spentWakes.delete(agent);
	});
	const outputLimits = /* @__PURE__ */ new WeakMap();
	ctx.on("tools/pre-execute", (exec, next) => {
		const maxBytes = visibleOutputLimit(ctx, exec);
		if (maxBytes !== void 0) outputLimits.set(exec, maxBytes);
		return next();
	}, { prepend: true });
	const finalizeTaskContent = (exec, result) => {
		const maxBytes = outputLimits.get(exec) ?? visibleOutputLimit(ctx, exec);
		outputLimits.delete(exec);
		if (maxBytes === void 0) return void 0;
		if (exec.name === "job_output" && !result.isError) {
			const value = result.value;
			const body = value.text.length > 0 ? value.text : "(no new output)";
			const content = body.endsWith("\n") ? body.slice(0, -1) : body;
			const suffix = `\n${statusLine(value.job)}`;
			if (rawSingleText(result.content) === `${content}${suffix}`) return [{
				type: "text",
				text: fitWithSuffix(content, suffix, maxBytes, "\n[output truncated]")
			}];
		}
		return boundSingleText(result.content, maxBytes);
	};
	ctx.jobs.attachController("tool-jobs");
	ctx.systemPrompt.section({
		name: "tool:jobs",
		order: ctx.systemPrompt.getSectionOrder("TOOL_JOBS"),
		text: "Track every background job id you start. You are notified in-session when a job finishes — do not busy-poll or sleep on one; keep working on independent steps and do not duplicate a running job's work. Before giving a final answer, collect every still-relevant job with job_output (set wait: true only when you are genuinely blocked on it), and job_kill jobs that stopped mattering."
	});
	ctx.jobs.onJobDone((snapshot, owner) => {
		if (snapshot.reported || owner === void 0) return;
		const message = createUserMessage({
			content: [{
				type: "text",
				text: fitCompletionNotice(snapshot)
			}],
			source: {
				kind: "plugin",
				plugin: "tool-jobs",
				form: "notice",
				summary: completionSummary(snapshot)
			}
		});
		const spent = spentWakes.get(owner) ?? 0;
		if (delivery === "wakeup" && owner.status === "idle" && spent < wakeBudget) {
			spentWakes.set(owner, spent + 1);
			owner.followup(message);
			return;
		}
		owner.inject(message);
	});
	ctx.tools.register(defineTool({
		name: "job_output",
		description: "Read a background job. Stream jobs return only output since the previous read; final-output jobs return their result after settlement. Every response ends with `[status: ...]`. Reads are non-blocking unless `wait: true`, which waits up to the configured cap.",
		parameters: {
			job_id: {
				type: "string",
				required: true,
				description: "Job id returned by the tool that started the background work."
			},
			wait: {
				type: "boolean",
				description: "Block until the job reaches a terminal status or the timeout expires. A timed-out wait returns [status: running] and leaves the job alive."
			},
			timeout_ms: {
				type: "number",
				description: "Max wait in milliseconds (only meaningful with wait: true). Defaults to the configured wait timeout; capped by the configured maximum."
			}
		},
		finalizeContent: finalizeTaskContent,
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					text: {
						type: "string",
						required: true
					},
					job: {
						...PUBLIC_TASK_SCHEMA,
						required: true
					}
				}
			},
			render: (_args, value) => {
				const body = value.text.length > 0 ? value.text : "(no new output)";
				return [{
					type: "text",
					text: `${body}${body.endsWith("\n") ? "" : "\n"}${statusLine(value.job)}`
				}];
			}
		},
		async execute(args, exec) {
			const id = validateJobId(args.job_id);
			if (args.wait === true) {
				const timeout = Math.min(args.timeout_ms ?? waitDefault, waitCap);
				await ctx.jobs.wait(id, timeout, exec.agent, exec.signal);
			}
			const read = ctx.jobs.read(id, exec.agent);
			return {
				text: read.text,
				job: publicJob(read.snapshot)
			};
		},
		presentCall: (args) => presentTaskCall(`Read output from background job ${args.job_id}`, "read", args.job_id)
	}));
	ctx.tools.register(defineTool({
		name: "job_list",
		description: "List your background jobs (running and finished) with their ids, kinds, and statuses.",
		parameters: {},
		output: {
			schema: {
				type: "array",
				items: PUBLIC_TASK_SCHEMA
			},
			render: (_args, jobs) => [{
				type: "text",
				text: jobs.length === 0 ? "(no background jobs)" : jobs.map((t) => `${t.id} [${t.kind}] ${t.status} — ${t.label}`).join("\n")
			}]
		},
		execute(_args, exec) {
			const jobs = ctx.jobs.list(exec.agent);
			return Promise.resolve(jobs.map(publicJob));
		},
		presentCall: () => presentTaskCall("List background jobs", "read")
	}));
	ctx.tools.register(defineTool({
		name: "job_kill",
		description: "Request cancellation of a running background job by job id. Returns immediately; the job settles as killed once its work actually stops.",
		parameters: {
			job_id: {
				type: "string",
				required: true,
				description: "Job id returned by the tool that started the background work."
			},
			reason: {
				type: "string",
				description: "Optional short reason, recorded in the log and forwarded to the job."
			}
		},
		finalizeContent: finalizeTaskContent,
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					outcome: {
						type: "string",
						required: true,
						enum: ["cancellation-requested", "already-finished"]
					},
					job: {
						...PUBLIC_TASK_SCHEMA,
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.outcome === "already-finished" ? `job ${value.job.id} had already finished ${statusLine(value.job)}` : `requested cancellation of job ${value.job.id}`
			}]
		},
		execute(args, exec) {
			const id = validateJobId(args.job_id);
			const result = ctx.jobs.kill(id, exec.agent, args.reason);
			const snapshot = publicJob(ctx.jobs.get(id, exec.agent));
			return Promise.resolve({
				outcome: result === "already-finished" ? "already-finished" : "cancellation-requested",
				job: snapshot
			});
		},
		presentCall: (args) => presentTaskCall(`Kill background job ${args.job_id}`, "execute", args.job_id)
	}));
}
//#endregion
export { Config, apply, inject, name, statusLine };
