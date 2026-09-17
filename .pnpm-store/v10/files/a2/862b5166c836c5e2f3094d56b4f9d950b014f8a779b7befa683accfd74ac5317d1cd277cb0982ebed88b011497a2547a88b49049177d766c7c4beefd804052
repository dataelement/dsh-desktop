import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";
//#region lib/types/index.js
/**
* Per-harness-home anonymous user id shared by telemetry and feedback.
*
* The id is a random UUID persisted as a bare line in `.anonymous-user-id` inside the
* harness home resolved by {@link resolveDshHome} (`$DSH_HOME` > `~/.dsh`),
* and never derived from the hostname, network address, git remote, or any
* other identifying source. It is scoped to the harness home, not the
* machine: every process sharing one `$DSH_HOME` reports the same id, and
* deleting the file mints a fresh identity on the next launch.
*
* Reads and writes are synchronous so boot-time and command consumers can
* use one API. The result is memoized per resolved file path: one process
* touches the disk once, and a file deleted mid-run keeps the process's id
* until the next launch.
*
* @module @deepseek-ai/dsh-anonymous-user-id
*/
/** File inside the harness home storing the id: a bare UUID line, no wrapper format. */
const ANONYMOUS_USER_ID_FILE_NAME = ".anonymous-user-id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Process-lifetime memo keyed by resolved file path, so distinct test homes never share an id. */
const memo = /* @__PURE__ */ new Map();
/** Read a valid persisted id from the file, or `undefined` when absent/corrupt. */
function readPersistedId(file) {
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		return;
	}
	const value = text.trim();
	return UUID_PATTERN.test(value) ? value : void 0;
}
/**
* Return the harness home's anonymous user id, creating and persisting one on
* first use. A concurrent first launch is settled by an exclusive-create
* write: the loser rereads the winner's id. (A reread landing in the winner's
* narrow create-to-write window can still yield two per-process ids for that
* run; the next launch converges on the persisted one.) Persistence is
* best-effort — a write failure (read-only home) still returns a usable id
* for the current run so feedback and telemetry are never blocked.
* @param options - home-location and UUID-generation seams.
* @returns the stable per-harness-home anonymous user id.
*/
function getOrCreateAnonymousUserId(options = {}) {
	const file = join(resolveDshHome(void 0, options.env ?? process.env), ANONYMOUS_USER_ID_FILE_NAME);
	const cached = memo.get(file);
	if (cached !== void 0) return cached;
	let id = readPersistedId(file);
	if (id === void 0) {
		const created = (options.randomUUID ?? randomUUID)();
		try {
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, `${created}\n`, {
				encoding: "utf8",
				flag: "wx"
			});
			id = created;
		} catch {
			id = readPersistedId(file);
			if (id === void 0) {
				try {
					writeFileSync(file, `${created}\n`, "utf8");
				} catch {}
				id = created;
			}
		}
	}
	memo.set(file, id);
	return id;
}
//#endregion
export { ANONYMOUS_USER_ID_FILE_NAME, getOrCreateAnonymousUserId };
