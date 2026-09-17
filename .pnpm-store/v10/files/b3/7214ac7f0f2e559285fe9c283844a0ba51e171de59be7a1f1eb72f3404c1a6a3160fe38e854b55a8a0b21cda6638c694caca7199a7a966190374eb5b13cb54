import { a as assertTempRootOutsideWorkspace, n as tempWriteSid, o as win32, r as workspaceWriteSid, t as AclSandbox } from "./types-DuU3lSVe.js";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
//#region lib/types/runner.js
/**
* The windows-acl confinement runner: the argv-prefix wrapper the sandbox
* seam spawns in place of the caller's command. It creates the
* WRITE_RESTRICTED token with the workspace write-SID allowlist, spawns the
* wrapped argv under it with the CALLER'S stdio inherited (bytes flow
* straight through), mirrors the child's exit code, and revokes its temp
* grant on exit (workspace ACEs stay standing as the reuse cache).
*
* Stable argv contract (the seam builds it; a native-exe replacement would
* keep the same contract):
*   [node, runner.js, '--workspace', <dir>, '--temp', <dir>,
*    '--mode', <read-only|workspace-write>,
*    ['--write-sid', <S-1-4-…>,
*     '--temp-write-sid', <S-1-4-…>], '--', <argv...>]
*
* Modes:
*  - workspace-write: the workspace and temp directories carry distinct
*    capability-SID Write grants; other ACL-addressable writes are denied
*    except for the documented Everyone and hard-link boundaries.
*  - read-only: no capability-SID grants; the restricting list carries no
*    capability SID, so a standing grant ACE from an earlier
*    workspace-write period stays inert. BOTH modes drop Authenticated Users
*    (CIM unavailable — documented in README) and INTERACTIVE/LOCAL (the
*    Public tree writes are denied); the two lists share the keep-alive group
*    (logon SID, EVERYONE) and differ only by the capabilities.
*
* `--write-sid` + `--temp-write-sid`: the seam's grant contract — the
* CALLER has already materialized distinct workspace and private-temp ACEs
* and owns their revocation, so the runner neither grants nor revokes
* (`manageDacls: false`). Both values are checked against their owning paths.
* Without the pair (standalone/agentless use), workspace-write treats
* `--temp` as a ROOT, creates a random private child directory, derives its
* own temp SID, and removes that directory after the child exits. In both
* flows the runner rewrites TMP/TEMP in its OWN environment to the private
* directory before spawning; the child inherits that block (`lpEnvironment`
* NULL; an explicit block through koffi trips ERROR_INVALID_PARAMETER in
* CreateProcessAsUserW, verified empirically). Read-only leaves the ambient
* temp entries untouched (writes there are denied anyway).
*
* Failure contract: every runner-side failure (bad args, missing
* directories, token/grant/spawn errors) prints `windows-acl-run: <detail>`
* to stderr and exits 127 — the seam's RUNNER_FAILURE_RULES matches that
* signature. The child is NEVER spawned unrestricted.
* @module @deepseek-ai/dsh-sandbox-windows-acl/runner
*/
const RUNNER_SIGNATURE = "windows-acl-run";
const RUNNER_FAILURE_EXIT = 127;
var RunnerFailure = class extends Error {};
/** Print the runner-failure signature line and unwind. */
function fail(detail) {
	process.stderr.write(`${RUNNER_SIGNATURE}: ${detail}\n`);
	throw new RunnerFailure(detail);
}
function parseArgs(raw) {
	let workspace;
	let temp;
	let mode;
	let writeSid;
	let parsedTempWriteSid;
	let index = 0;
	for (; index < raw.length; index++) {
		const token = raw[index];
		if (token === "--") {
			index++;
			break;
		}
		index++;
		const value = raw[index];
		if (value === void 0) fail(`missing value after ${token}`);
		switch (token) {
			case "--workspace":
				workspace = value;
				break;
			case "--temp":
				temp = value;
				break;
			case "--mode":
				mode = value;
				break;
			case "--write-sid":
				writeSid = value;
				break;
			case "--temp-write-sid":
				parsedTempWriteSid = value;
				break;
			default: fail(`unknown argument: ${token}`);
		}
	}
	if (workspace === void 0) fail("missing --workspace");
	if (temp === void 0) fail("missing --temp");
	if (mode !== "read-only" && mode !== "workspace-write") fail(`unknown mode: ${String(mode)}`);
	const argv = raw.slice(index);
	const command = argv[0];
	if (command === void 0) fail("missing command after --");
	return {
		workspace,
		temp,
		mode,
		writeSid,
		tempWriteSid: parsedTempWriteSid,
		command,
		args: argv.slice(1)
	};
}
function requireDirectory(label, path) {
	if (!existsSync(path) || !statSync(path).isDirectory()) fail(`${label} is not an existing directory: ${path}`);
}
async function main() {
	const parsed = parseArgs(process.argv.slice(2));
	requireDirectory("--workspace", parsed.workspace);
	requireDirectory("--temp", parsed.temp);
	const seamManaged = parsed.writeSid !== void 0 || parsed.tempWriteSid !== void 0;
	if (parsed.mode === "read-only" && seamManaged) fail("read-only does not accept --write-sid or --temp-write-sid");
	if (parsed.mode === "workspace-write" && parsed.writeSid === void 0 !== (parsed.tempWriteSid === void 0)) fail("workspace-write requires --write-sid and --temp-write-sid together");
	if (parsed.mode === "workspace-write") assertTempRootOutsideWorkspace(parsed.workspace, parsed.temp);
	const api = await win32();
	if (api.setConsoleCtrlHandler(null, 1) === 0) fail(`SetConsoleCtrlHandler failed (Win32 ${api.getLastError()})`);
	let ownedTempDir;
	let sandbox;
	let initialized = false;
	try {
		let privateTempDir = null;
		let writeSid;
		let privateTempSid;
		if (parsed.mode === "workspace-write") {
			writeSid = workspaceWriteSid(parsed.workspace);
			if (seamManaged) {
				if (parsed.writeSid !== writeSid) fail("--write-sid does not match --workspace");
				privateTempDir = parsed.temp;
				privateTempSid = tempWriteSid(privateTempDir);
				if (parsed.tempWriteSid !== privateTempSid) fail("--temp-write-sid does not match --temp");
			} else {
				ownedTempDir = mkdtempSync(join(parsed.temp, "dsh-"));
				privateTempDir = ownedTempDir;
				privateTempSid = tempWriteSid(privateTempDir);
			}
		}
		sandbox = new AclSandbox({
			writableDirs: parsed.mode === "workspace-write" ? [parsed.workspace] : [],
			tempDir: privateTempDir,
			mode: parsed.mode,
			...writeSid === void 0 ? {} : { writeSid },
			...privateTempSid === void 0 ? {} : { tempWriteSid: privateTempSid },
			manageDacls: !seamManaged
		});
		await sandbox.init();
		initialized = true;
		if (privateTempDir !== null) {
			if (api.setEnvironmentVariableW("TMP", privateTempDir) === 0) fail(`SetEnvironmentVariableW TMP failed (Win32 ${api.getLastError()})`);
			if (api.setEnvironmentVariableW("TEMP", privateTempDir) === 0) fail(`SetEnvironmentVariableW TEMP failed (Win32 ${api.getLastError()})`);
		}
		return (await sandbox.spawn({
			command: parsed.command,
			args: parsed.args,
			stdio: "inherit"
		}).wait()).exitCode;
	} finally {
		if (initialized) try {
			sandbox?.dispose();
		} catch (error) {
			process.stderr.write(`${RUNNER_SIGNATURE}: cleanup: ${error instanceof Error ? error.message : String(error)}\n`);
		}
		if (ownedTempDir !== void 0) try {
			rmSync(ownedTempDir, {
				recursive: true,
				force: true
			});
		} catch (error) {
			process.stderr.write(`${RUNNER_SIGNATURE}: cleanup: ${error instanceof Error ? error.message : String(error)}\n`);
		}
	}
}
main().then((exitCode) => {
	process.exitCode = exitCode;
}, (error) => {
	if (!(error instanceof RunnerFailure)) process.stderr.write(`${RUNNER_SIGNATURE}: ${error instanceof Error ? error.message : String(error)}\n`);
	process.exitCode = RUNNER_FAILURE_EXIT;
});
//#endregion
export {};
