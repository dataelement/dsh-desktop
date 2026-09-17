import { Service } from "@deepseek-ai/cordis";
import { DSH_ENV_PREFIX } from "@deepseek-ai/dsh-subprocess";
//#region lib/types/render.js
/**
* Shared rendering helpers for the shell tools (`dsh-tool-bash`,
* `dsh-tool-pwsh`): the exit-status marker contract the tools' renderers emit,
* Host `presentResult` implementations parse here, and the Web terminal card
* model mirrors without importing Host code.
* @module @deepseek-ai/dsh-shell/render
*/
/**
* Split a rendered shell-tool result string into its output body and the
* structured exit status — the inverse of the `[exit code: N]` /
* `[killed by signal: X]` markers the shell tools' renderers append. A killed
* marker yields `signal`; otherwise a non-zero marker yields `exitCode`;
* absent both means a clean exit 0.
*
* The consumed marker is removed from `body` because a terminal presentation
* shows the exit status as its own pill: leaving the marker in the output
* would render the exit twice. Other markers (timeout, sandbox denial) carry
* facts no pill shows, so they stay in the body.
*
* Replay only retains the rendered content text, not the original
* `ShellRunResult`, so terminal presentation must recover the exit pill here.
* Requiring a leading newline and the end of the string keeps ordinary output
* that merely ends with marker-like text from matching unless the final line
* is indistinguishable from a real marker.
* @param text - rendered model-facing shell-tool result.
* @returns the marker-free body plus the recovered terminal exit code or signal.
*/
function parseExitStatus(text) {
	const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text);
	if (signal?.[1] !== void 0) return {
		body: text.slice(0, signal.index),
		signal: signal[1]
	};
	const exit = /\n\[exit code: (\d+)\]$/.exec(text);
	if (exit?.[1] !== void 0) return {
		body: text.slice(0, exit.index),
		exitCode: Number(exit[1])
	};
	return {
		body: text,
		exitCode: 0
	};
}
//#endregion
//#region lib/types/index.js
/**
* Service Definition for the `ctx.shell` capability seam, covering foreground commands and background process
* handles. Job ids, ownership, polling, and notices belong to
* `@deepseek-ai/dsh-jobs`, keeping executors independent of sessions.
* @module @deepseek-ai/dsh-shell
*/
/**
* Settings namespace of this capability, owned here rather than by either
* executor family because it names the capability, not an implementation: a
* host composes exactly one provider of `ctx.shell` (the win32 layer swaps the
* POSIX rows for the pwsh ones, and mounting both fails loud on a duplicate
* service registration), so the providers share one namespace without ever
* registering it twice, and a settings document carried between platforms
* keeps resolving on both.
*/
const SHELL_SETTINGS_NAMESPACE = "shell";
/**
* Abstract bash execution service. Subclass, implement the abstract methods,
* and load the subclass as a plugin — it registers as `ctx.shell` (one
* implementation per context; loading a second throws, which is cordis'
* standard duplicate-service behavior).
*
* Implementations must honor these semantics:
* - {@link run} rejects only for infrastructure failures. Nonzero exits,
*   timeout kills, and abort kills resolve with a {@link ShellRunResult}.
* - {@link start} returns immediately; no timeout applies to background
*   processes. `done` settles at process close and never rejects; spawn
*   failures settle as `killed` with the error on stderr.
* - {@link ShellProcess.readOutput} is incremental: consecutive reads never
*   repeat output. Lossy reads report truncation and available spill files.
* - A still-running background process is stopped and awaited when its
*   owning composition tears down. With the subprocess seam that
*   boundary is `ctx.subprocess` disposal, so a background process survives
*   an executor-only reload.
*/
var ShellExecutor = class extends Service {
	constructor(ctx) {
		super(ctx, "shell");
	}
	/**
	* The sandbox mode this executor applies by default, or `undefined` when it
	* does not sandbox commands.
	* @returns the configured default sandbox mode, when supported.
	*/
	get sandboxMode() {}
};
//#endregion
export { DSH_ENV_PREFIX, SHELL_SETTINGS_NAMESPACE, ShellExecutor, ShellExecutor as default, parseExitStatus };
