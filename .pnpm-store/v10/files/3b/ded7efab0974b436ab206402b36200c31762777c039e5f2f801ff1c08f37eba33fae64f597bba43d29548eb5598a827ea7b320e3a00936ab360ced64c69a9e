import z from "@deepseek-ai/schemastery";
import { isAbsolute, resolve } from "node:path";
import { TOOL_ABORTED, defineTool } from "@deepseek-ai/dsh-tools";
import { HarnessError } from "@deepseek-ai/dsh-llm";
import { ESCALATION_TARGETS, approveEscalation, canonicalPath, escalationHintMarker, sandboxDenialMarker, validateEscalationArgs } from "@deepseek-ai/dsh-sandbox";
import { DSH_ENV_PREFIX, parseExitStatus } from "@deepseek-ai/dsh-shell";
//#region lib/types/background.js
/**
* Generic-task adaptation for background bash process handles.
*
* @module @deepseek-ai/dsh-tool-bash/background
*/
/**
* Map a settled background process onto the generic task-outcome vocabulary:
* `killed` stays `killed` (detail: the signal when one is known), everything
* else is `completed` with the exit code as detail. A nonzero command exit is
* reported, not failed, exactly like the foreground rendering.
* @param proc - the settled process handle.
* @returns the outcome for the `ctx.jobs` registration.
*/
function processOutcome(proc) {
	if (proc.status === "killed") return {
		status: "killed",
		detail: proc.signal !== null ? `signal: ${proc.signal}` : "killed before exit"
	};
	return {
		status: "completed",
		detail: `exit code: ${proc.exitCode ?? 0}`
	};
}
//#endregion
//#region lib/types/render.js
/**
* Model-facing result rendering for the bash tool.
*
* @module @deepseek-ai/dsh-tool-bash/render
*/
/** Append the truncation notice (with the full-output spill path) to a stream's text. */
function streamText(output) {
	if (!output.truncated) return output.text;
	return `${output.text}\n[output truncated; full output: ${output.spillPath ?? "(unavailable)"}]`;
}
/**
* Shape one finished run into the text the model sees: stdout, then a marked
* stderr section, then exit-status markers. Non-zero exits are reported, not
* errored — the model decides how to react; only infrastructure failures
* (spawn errors, aborts) surface as isError results.
* @param result - the completed foreground run from the executor.
* @param escalationModes - the escalation targets this composition advertises;
*   non-empty adds the same-turn escalation hint after a denial marker
*   (default `[]`: no hint).
* @returns the model-facing text: output body (or `(no output)`), then any timeout/signal/exit markers, each on its own line.
*/
function renderResult(result, escalationModes = []) {
	const out = streamText(result.stdout);
	const err = streamText(result.stderr);
	let body = out;
	if (err.length > 0) {
		if (body.length > 0 && !body.endsWith("\n")) body += "\n";
		body += `[stderr]\n${err}`;
	}
	if (body.length === 0) body = "(no output)";
	const markers = [];
	if (result.sandbox?.denied) {
		markers.push(sandboxDenialMarker(result.sandbox.mode));
		if (escalationModes.length > 0) markers.push(escalationHintMarker("command"));
	}
	if (result.timedOut) markers.push(`[timed out after ${result.timeoutMs}ms]`);
	if (result.signal !== null) markers.push(`[killed by signal: ${result.signal}]`);
	else if (result.exitCode !== 0) markers.push(`[exit code: ${result.exitCode}]`);
	if (markers.length === 0) return body;
	if (!body.endsWith("\n")) body += "\n";
	return body + markers.join("\n");
}
/**
* Shape one background-process read into the `job_output` delta the model
* sees: the incremental delta, plus the lossy-read notice (with full-stream
* spill paths) when in-memory truncation dropped unread bytes. Empty-delta
* rendering (`(no new output)`) is the generic job controller's job.
* @param read - one incremental read from the process handle.
* @param sandbox - settled sandbox facts, when this was a confined process.
* @param escalationModes - escalation targets advertised by this composition.
* @returns the delta text with any loss or sandbox notice appended.
*/
function renderProcessRead(read, sandbox, escalationModes = []) {
	const notices = [];
	if (read.lossy) {
		const paths = [read.stdoutSpillPath, read.stderrSpillPath].filter((path) => path !== void 0);
		notices.push(`[some output was dropped from memory; full output: ${paths.length > 0 ? paths.join(", ") : "(unavailable)"}]`);
	}
	if (sandbox?.runnerFailed) notices.push(`[sandbox: the sandbox runner itself failed under ${sandbox.mode} mode — the command did not run; this is a sandbox problem, not a command failure]`);
	else if (sandbox?.denied) {
		notices.push(sandboxDenialMarker(sandbox.mode));
		if (escalationModes.length > 0) notices.push(escalationHintMarker("command"));
	}
	if (notices.length === 0) return read.delta;
	return `${read.delta}${read.delta.length > 0 && !read.delta.endsWith("\n") ? "\n" : ""}${notices.join("\n")}`;
}
//#endregion
//#region lib/types/index.js
/**
* Model-facing Consumer of the `ctx.shell` capability seam. Background calls
* register process handles with `ctx.jobs`; their work uses job cancellation
* rather than the tool-call signal after an id is returned.
*
* TODO(permissions): deployment policy belongs in `tools/pre-execute` and
* sandboxing executors; see docs/architecture.md § Where new behavior goes.
* @module @deepseek-ai/dsh-tool-bash
*/
const name = "tool-bash";
const inject = [
	"tools",
	"shell",
	"systemPrompt",
	"shellEnv"
];
/** Runtime configuration schema for the bash tool plugin. */
const Config = z.object({ enableRunInBackground: z.boolean().default(true) });
function validateBashArgs(args) {
	if (args.command.trim().length === 0) throw new Error("invalid command: expected a non-empty string");
	if (args.description.trim().length === 0) throw new Error("invalid description: expected a non-empty string");
	if (args.timeoutMs !== void 0 && (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0)) throw new Error(`invalid timeoutMs: expected a positive number, got ${JSON.stringify(args.timeoutMs)}`);
	validateEscalationArgs(args.sandbox_permissions, args.justification);
}
function bashDescription(backgroundEnabled, escalationModes) {
	const background = backgroundEnabled ? "Set `run_in_background: true` for long-running commands: the call returns a job id immediately; read its output with `job_output` and stop it with `job_kill`." : "Background execution is not available; long-running commands must finish within the timeout.";
	const base = `Execute a bash command (\`bash -c\`) and return its stdout/stderr. Each call runs in a fresh shell: no state (cwd, variables, functions) persists between calls — pass \`workdir\` instead of using \`cd\`. Non-zero exits are reported as \`[exit code: N]\`. Current harness environment facts are exposed through managed \`$${DSH_ENV_PREFIX}*\` variables; inspect them when needed. Commands may run under a file sandbox; a blocked file operation is reported as \`[sandbox: file access denied under <mode> mode]\` — a policy denial, not a bug in the command; do not retry another way. Long output is truncated to its tail; the full output is saved to a file whose path is reported when available. ` + background;
	if (escalationModes.length === 0) return base;
	return base + " Attempting a command the sandbox may deny is safe and expected: run it and read the marker rather than assuming the denial. When a command is denied and a wider mode would let it succeed, escalate immediately in the same turn — the one sanctioned exception to a denial: retry the exact same command once with `sandbox_permissions` (the narrowest wider mode that suffices) plus a one-sentence `justification`. Do not detour through chat to ask permission first — the approval prompt raised by that retry is how the user consents. If the session states approval prompts are disabled, there is no exception: a denial is final — do not set `sandbox_permissions`. Never escalate speculatively: ground the request in a real denial — normally the one this command just hit; escalating up front is fine only when this session already denied the same access. A rejected escalation is final for that command — stop and explain, never work around it — but it does not forbid attempting or escalating other commands later.";
}
function presentBashCall(args) {
	if (args.run_in_background === true) return {
		card: "generic",
		title: args.command,
		kind: "execute",
		rawInput: args.command,
		content: [{
			type: "text",
			text: args.description
		}]
	};
	return {
		card: "terminal",
		title: args.command,
		description: args.description,
		...args.workdir !== void 0 ? { cwd: args.workdir } : {}
	};
}
/**
* Present completed foreground output as a terminal; background acknowledgements
* and execution errors use generic fenced output without an exit-status pill.
*/
function presentBashResult(args, result) {
	const block = result.content.length === 1 ? result.content[0] : void 0;
	if (block === void 0 || block.type !== "text") return void 0;
	const raw = block.text;
	if (typeof args === "object" && args !== null && args.run_in_background === true || result.isError) return {
		card: "generic",
		content: [{
			type: "text",
			text: `\`\`\`console\n${raw.replace(/\n+$/, "")}\n\`\`\``
		}]
	};
	const { body, ...exit } = parseExitStatus(raw);
	return {
		card: "terminal",
		output: body,
		...exit
	};
}
/**
* Resolve an explicit workdir first, making a relative one session-workspace-relative;
* otherwise use the filesystem identity of the session cwd and leave executor
* defaulting as the fallback. A resolved sandbox-policy root wins so workdir
* and confinement use the exact same per-call identity.
*/
function resolveWorkdir(modelWorkdir, exec, policyWorkspaceRoot) {
	const headerCwd = exec.agent?.session.header.cwd;
	const sessionCwd = policyWorkspaceRoot ?? (headerCwd === void 0 ? void 0 : canonicalPath(headerCwd));
	if (modelWorkdir === void 0) return sessionCwd;
	if (sessionCwd !== void 0 && !isAbsolute(modelWorkdir)) return resolve(sessionCwd, modelWorkdir);
	return modelWorkdir;
}
/** Detach the executor DTO from readonly Service Definition types into plain JSON data. */
function canonicalBashResult(result) {
	const output = (stream) => ({
		text: stream.text,
		truncated: stream.truncated,
		...stream.spillPath !== void 0 ? { spillPath: stream.spillPath } : {}
	});
	return {
		exitCode: result.exitCode,
		signal: result.signal,
		timedOut: result.timedOut,
		aborted: result.aborted,
		timeoutMs: result.timeoutMs,
		stdout: output(result.stdout),
		stderr: output(result.stderr),
		...result.sandbox !== void 0 ? { sandbox: {
			mode: result.sandbox.mode,
			denied: result.sandbox.denied,
			...result.sandbox.enforcement !== void 0 ? { enforcement: result.sandbox.enforcement } : {},
			...result.sandbox.runnerFailed !== void 0 ? { runnerFailed: result.sandbox.runnerFailed } : {}
		} } : {}
	};
}
/** Canonical background-handle properties shared by the bash output union. */
const BACKGROUND_OUTPUT_PROPERTIES = {
	kind: {
		type: "string",
		required: true,
		const: "background"
	},
	jobId: {
		type: "string",
		required: true
	}
};
function apply(ctx, config = {}) {
	const backgroundEnabled = config.enableRunInBackground ?? true;
	const defaultMode = ctx.shell.sandboxMode;
	const escalationModes = defaultMode === void 0 ? [] : ESCALATION_TARGETS;
	const sandboxPolicy = defaultMode === void 0 ? void 0 : ctx.get("sandboxPolicy");
	if (defaultMode !== void 0 && sandboxPolicy === void 0) throw new Error("tool-bash: the mounted bash executor confines but ctx.sandboxPolicy is missing");
	/** Resolve the complete standing policy for this call when a confining executor is mounted. */
	const resolveSandboxPolicy = (exec) => sandboxPolicy?.resolve(exec.agent === void 0 ? {} : { session: exec.agent.session });
	/**
	* Resolve a sandbox-escalation request through `ctx.approval` BEFORE
	* anything executes, delegating the shared fail-closed sequence (strict
	* widening, channel resolution, outcome mapping) to
	* {@link approveEscalation}. This tool contributes only the composition
	* guard (the fields are unadvertised without a sandboxing executor, yet
	* schema validation checks advertised keys only, so an unadvertised
	* `sandbox_permissions` still reaches execute) and the approval
	* ingredients. The shared policy resolver is required whenever the executor
	* advertises confinement, so a split composition fails at tool-plugin load.
	*/
	const approveBashEscalation = (mode, justification, exec, standingPolicy) => {
		if (escalationModes.length === 0) throw new Error("sandbox_permissions is not available in this composition (no sandboxing executor to escalate)");
		const effectiveMode = standingPolicy.mode;
		return approveEscalation({
			requestedMode: mode,
			justification,
			effectiveMode,
			subject: "command"
		}, {
			approver: ctx.get("approval"),
			agent: exec.agent,
			callId: exec.callId,
			toolName: "bash",
			signal: exec.signal
		});
	};
	ctx.systemPrompt.section({
		name: "tool:bash",
		order: ctx.systemPrompt.getSectionOrder("TOOL_BASH"),
		text: "Check the [exit code: N] marker on every bash result; investigate failures before moving on."
	});
	ctx.tools.register(defineTool({
		name: "bash",
		description: bashDescription(backgroundEnabled, escalationModes),
		parameters: {
			command: {
				type: "string",
				required: true,
				description: "The bash command to execute."
			},
			description: {
				type: "string",
				required: true,
				description: "Clear, concise description of what this command does in active voice, 5-10 words (shown in the UI). Examples: \"ls\" → \"List files in current directory\"; \"git status\" → \"Show working tree status\"; \"npm install\" → \"Install package dependencies\"."
			},
			timeoutMs: {
				type: "number",
				description: "Timeout in milliseconds. The executor applies its configured default and cap, and kills the command on expiry."
			},
			workdir: {
				type: "string",
				description: "Working directory for this command. Defaults to the session workspace; a relative path is resolved against it."
			},
			...backgroundEnabled ? { run_in_background: {
				type: "boolean",
				description: "Run in the background and return a job id immediately (collect with job_output, stop with job_kill). No timeout applies."
			} } : {},
			...escalationModes.length > 0 ? {
				sandbox_permissions: {
					type: "string",
					enum: [...escalationModes],
					description: "The wider sandbox mode this command needs. Only valid as a one-shot retry of a command the sandbox just denied; requires justification and user approval."
				},
				justification: {
					type: "string",
					description: "Required with sandbox_permissions: one sentence for the user explaining why this exact command needs the wider access."
				}
			} : {}
		},
		output: {
			schema: { oneOf: [{
				type: "object",
				additionalProperties: false,
				properties: BACKGROUND_OUTPUT_PROPERTIES
			}, {
				type: "object",
				additionalProperties: false,
				properties: {
					kind: {
						type: "string",
						required: true,
						const: "foreground"
					},
					exitCode: {
						required: true,
						oneOf: [{ type: "integer" }, { type: "null" }]
					},
					signal: {
						required: true,
						oneOf: [{ type: "string" }, { type: "null" }]
					},
					timedOut: {
						type: "boolean",
						required: true
					},
					aborted: {
						type: "boolean",
						required: true
					},
					timeoutMs: {
						type: "number",
						required: true
					},
					stdout: {
						type: "object",
						additionalProperties: false,
						required: true,
						properties: {
							text: {
								type: "string",
								required: true
							},
							truncated: {
								type: "boolean",
								required: true
							},
							spillPath: { type: "string" }
						}
					},
					stderr: {
						type: "object",
						additionalProperties: false,
						required: true,
						properties: {
							text: {
								type: "string",
								required: true
							},
							truncated: {
								type: "boolean",
								required: true
							},
							spillPath: { type: "string" }
						}
					},
					sandbox: {
						type: "object",
						additionalProperties: false,
						properties: {
							mode: {
								type: "string",
								required: true
							},
							denied: {
								type: "boolean",
								required: true
							},
							enforcement: { type: "string" },
							runnerFailed: { type: "boolean" }
						}
					}
				}
			}] },
			render: (_args, value) => [{
				type: "text",
				text: value.kind === "background" ? `started background job ${value.jobId}` : renderResult(value, escalationModes)
			}]
		},
		async execute(args, exec) {
			validateBashArgs(args);
			const standingPolicy = resolveSandboxPolicy(exec);
			const approvedMode = args.sandbox_permissions !== void 0 && args.justification !== void 0 ? await approveBashEscalation(args.sandbox_permissions, args.justification, exec, standingPolicy) : void 0;
			const policy = approvedMode === void 0 ? standingPolicy : {
				...standingPolicy,
				mode: approvedMode
			};
			const workdir = resolveWorkdir(args.workdir, exec, standingPolicy?.workspaceRoot);
			const dshEnv = ctx.shellEnv.collect(exec);
			const request = {
				command: args.command,
				...workdir !== void 0 ? { workdir } : {},
				...args.timeoutMs !== void 0 ? { timeoutMs: args.timeoutMs } : {},
				dshEnv,
				...policy !== void 0 ? { sandboxPolicy: policy } : {}
			};
			if (args.run_in_background === true) {
				if (!backgroundEnabled) throw new Error("run_in_background is disabled for this deployment (enableRunInBackground: false)");
				const jobs = ctx.get("jobs");
				if (jobs === void 0) throw new Error("background jobs unavailable: load @deepseek-ai/dsh-jobs and @deepseek-ai/dsh-tool-jobs");
				if (exec.signal.aborted) {
					const error = new HarnessError("tool call aborted", TOOL_ABORTED);
					error.name = "AbortError";
					throw error;
				}
				return {
					kind: "background",
					jobId: jobs.start({
						kind: "bash",
						label: args.command,
						...exec.agent ? { owner: exec.agent } : {},
						run: () => {
							const proc = ctx.shell.start(ctx.shell.resolve(request));
							return {
								cancel: () => void proc.kill(),
								done: proc.done.then(() => processOutcome(proc)),
								readOutput: () => renderProcessRead(proc.readOutput(), proc.sandbox, escalationModes)
							};
						}
					})
				};
			}
			const result = await ctx.shell.run(ctx.shell.resolve({
				...request,
				signal: exec.signal
			}));
			if (result.aborted) {
				const error = new HarnessError("tool call aborted", TOOL_ABORTED);
				error.name = "AbortError";
				throw error;
			}
			return {
				kind: "foreground",
				...canonicalBashResult(result)
			};
		},
		presentCall: presentBashCall,
		presentResult: presentBashResult
	}));
}
//#endregion
export { Config, apply, inject, name };
