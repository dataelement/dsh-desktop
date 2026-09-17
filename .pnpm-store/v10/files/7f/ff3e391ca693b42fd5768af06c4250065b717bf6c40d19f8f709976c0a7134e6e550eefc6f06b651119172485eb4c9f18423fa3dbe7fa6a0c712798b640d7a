//#region lib/types/index.js
/**
* @deepseek-ai/dsh-cmdline — the command line a dsh launcher hands to the app
* it boots.
*
* The launcher parses only its own flags (`--profile`, `--patch`, the config
* dumps) and hands everything after them to the tree verbatim through the
* {@link CmdlineArgs} service, so an app owns its flag family, its `--help`
* text, and its parse errors instead of the launcher knowing them.
*
* Any app plugin can inject `cmdlineArgs` and call {@link parseCmdline}. A
* provider may publish the parsed values as its own service from its program's
* commander action, and ordinary rows
* can inject that service and read it from lazily resolved config —
* `port: !!js ctx.webStartup.port ?? 3080` — so a flag beats the value written
* beside it. No row has launcher-level command-line status.
* @module @deepseek-ai/dsh-cmdline
*/
/**
* Provide launcher facts on a host context before any tree entry mounts: the
* command line, bounded exit request, and optional successful-startup signal.
* An embedding host with no command line provides an empty argument list; a
* host that mounts a stdio application also provides readiness.
* @param ctx - the host context the tree will mount under.
* @param host - the invocation's arguments, exit request, and optional readiness signal.
*/
function provideCmdline(ctx, host) {
	const snapshot = Object.freeze([...host.args]);
	ctx.provide("cmdlineArgs", { get: () => snapshot });
	ctx.provide("appExit", host.exit);
	if (host.ready !== void 0) ctx.provide("appReady", host.ready);
}
/** Process streams used by app command lines and stdio lifetime binding; tests substitute them. */
const internals = {
	stdin: process.stdin,
	stdout: process.stdout,
	stderr: process.stderr
};
/**
* Make stdin EOF request the launcher's bounded successful shutdown after
* {@link AppReady} commits. A startup rejection therefore remains the process
* outcome when it races EOF. The caller invokes this only after its command
* action accepts the invocation, so help and usage failures start no transport
* lifecycle. This listener does not read or resume stdin: the protocol
* transport owns input and receives bytes buffered before it mounts. Disposal
* removes the EOF and readiness listeners.
* @param ctx - app plugin context carrying the launcher's exit request.
* @param label - effect label naming the owning application.
*/
function exitOnStdinEnd(ctx, label) {
	const exit = ctx.get("appExit");
	const ready = ctx.get("appReady");
	if (exit === void 0 || ready === void 0) throw new Error("stdio app: the launcher must provide ctx.appExit and ctx.appReady before the tree mounts");
	const stdin = internals.stdin;
	let active = true;
	let ended = false;
	let cancelReady = () => {};
	const onEnd = () => {
		if (!active || ended) return;
		ended = true;
		cancelReady = ready.onReady(() => {
			exit(0);
		});
	};
	ctx.effect(() => () => {
		active = false;
		cancelReady();
		stdin.off("end", onEnd);
	}, label);
	stdin.once("end", onEnd);
	if (stdin.readableEnded) queueMicrotask(onEnd);
}
/**
* Parse the launcher's immutable argument snapshot with an app's commander
* program. Commander runs the program's own synchronous action handler on a
* successful parse; app code there publishes its service and rejects an
* invalid invocation with `program.error(...)`. This helper has no Loader-row
* or service ownership semantics.
*
* Help, version, and rejected arguments — from the grammar or from an action
* — are terminal for the process: commander writes the text and the helper
* requests `ctx.appExit`. The action never runs on help, version, or a
* grammar rejection; an action must reject before it publishes, because
* statements before its `program.error(...)` have already run.
* @param ctx - plugin context carrying `cmdlineArgs` and `appExit`.
* @param program - the app's commander program, with its flags, description,
* actions, and any subcommands already declared.
* @throws when the launcher did not provide the command line and exit request,
* or when no command in the program declares an action.
*/
function parseCmdline(ctx, program) {
	const args = ctx.get("cmdlineArgs");
	const exit = ctx.get("appExit");
	if (args === void 0 || exit === void 0) throw new Error(`${program.name()}: the launcher must provide ctx.cmdlineArgs and ctx.appExit before the tree mounts`);
	if (!hasAction(program)) throw new Error(`${program.name()}: no command in the program declares an action; parseCmdline runs the invoked command's action on a successful parse, and app code there publishes its service`);
	configureExitAndOutput(program);
	try {
		program.parse(args.get(), { from: "user" });
	} catch (error) {
		if (!isCommanderError(error)) throw error;
		exit(error.exitCode);
	}
}
/**
* Whether any command in the tree declares an action handler.
*
* The `Command` type cannot express the action precondition, so the handler is
* read structurally (as {@link isCommanderError} reads commander's control-flow
* errors): without this guard, a program that forgot its action would parse
* successfully, publish nothing, and surface only as dependent rows pending on
* the absent service.
* @param command - the command whose tree is inspected.
* @returns true when the command or any registered subcommand has an action.
*/
function hasAction(command) {
	if (typeof command._actionHandler === "function") return true;
	return command.commands.some(hasAction);
}
/**
* Route every command's exit and output through the launcher adapter.
*
* Commander copies `exitOverride` and output configuration into a subcommand
* only at registration, so a root-only override would let an
* already-registered subcommand's rejection write to the process streams and
* call `process.exit` directly, bypassing `ctx.appExit`.
* @param command - the root of the command tree to configure.
*/
function configureExitAndOutput(command) {
	command.exitOverride().configureOutput({
		writeOut: (text) => void internals.stdout.write(text),
		writeErr: (text) => void internals.stderr.write(text)
	});
	for (const child of command.commands) configureExitAndOutput(child);
}
/**
* Whether a thrown value is commander's own control-flow error (help, version,
* a parse error, or `program.error`).
*
* Detected structurally, not with `instanceof`: an out-of-tree plugin brings
* its own commander copy, whose `CommanderError` class is a different identity
* from this package's, and an identity check there would rethrow a printed
* help as a fatal load failure.
* @param error - the thrown value.
* @returns true when the value carries commander's error code and exit code.
*/
function isCommanderError(error) {
	if (typeof error !== "object" || error === null) return false;
	const candidate = error;
	return typeof candidate.code === "string" && candidate.code.startsWith("commander.") && typeof candidate.exitCode === "number";
}
//#endregion
export { exitOnStdinEnd, internals, parseCmdline, provideCmdline };
