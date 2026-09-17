import { Command } from "commander";
import { parseCmdline } from "@deepseek-ai/dsh-cmdline";
//#region lib/types/startup.js
/**
* The web app's command-line provider: it parses the `dsh --profile web` flag
* family (`--host`, `--port`, `--trusted-host`, `--no-open`) and its `--help`
* text, then provides the immutable values as {@link WEB_STARTUP_SERVICE}.
* Ordinary rows inject that service before reading it from lazy config.
* @module @deepseek-ai/dsh-web-app/startup
*/
/** Stable Cordis plugin name. */
const name = "web-startup";
/** Services required before the flags can be resolved. */
const inject = ["cmdlineArgs"];
/** Service provided by this ordinary plugin and injected by flag-configured rows. */
const WEB_STARTUP_SERVICE = "webStartup";
/**
* This app's command: its flags, its description, and its help text.
* @returns a fresh program, so one process can parse more than once (tests).
*/
function webCommand() {
	return new Command().name("dsh --profile web").description("Serve the DeepSeek Harness browser UI.").helpOption("-h, --help", "show this help").option("--host <host>", "bind host").option("--no-open", "do not open the Web UI in the default browser").option("--port <port>", "listen port; pass 0 to let the OS pick a free one").option("--trusted-host <authority...>", "extra authority the /api browser-trust fence accepts (host or host:port; repeatable)").addHelpText("after", `
Examples:
  dsh --profile web                          serve on the composed host and port
  dsh --profile web --no-open                serve without opening a browser
  dsh --profile web --port 8080              serve on another port
`);
}
/**
* Parse and provide the Web invocation as an ordinary Cordis service. The
* command's action publishes the flags this invocation named; `--host 0.0.0.0`
* or a non-numeric `--port` is a usage error, so on rejection (and on `--help`)
* nothing is provided.
* @param ctx - plugin context carrying the command line.
*/
function apply(ctx) {
	const program = webCommand();
	program.action(() => {
		const options = program.opts();
		if (options.host === "0.0.0.0") program.error("error: --host 0.0.0.0 is intentionally not supported yet for safety: it would expose remote code execution to the network; use 127.0.0.1 instead");
		if (options.port !== void 0 && !/^\d+$/.test(options.port)) program.error(`error: --port must be a number, got ${JSON.stringify(options.port)}`);
		ctx.provide(WEB_STARTUP_SERVICE, {
			openBrowser: options.open,
			...options.host !== void 0 && { host: options.host },
			...options.port !== void 0 && { port: Number(options.port) },
			trustedHosts: options.trustedHost ?? []
		});
	});
	parseCmdline(ctx, program);
}
//#endregion
export { WEB_STARTUP_SERVICE, apply, inject, name };
