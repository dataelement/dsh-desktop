/**
 * Self-restart: relaunch the exact DSH invocation that booted this host so
 * pending (non-hot) plugin changes take effect without the user leaving the
 * UI. Contributed in #14 by @ysyyhhh; ported onto the layered architecture.
 *
 * Safety model: the endpoint accepts only direct same-origin loopback
 * requests (no forwarding headers), refuses while a plugin operation runs,
 * and deployments under a supervisor (systemd/launchd/pm2) can disable the
 * whole feature with `allowRestart: false` — the supervisor owns restarts.
 */
import type { IncomingMessage } from 'node:http';
/** @internal test hook — production callers use detectedDebugger() only. */
export declare function setDetectedDebuggerOverride(value: 'inspector' | null | undefined): void;
/**
 * The process supervisor running this host, when one can be identified —
 * `null` when nothing says so.
 *
 * This exists because the failure it prevents is the worst one the market
 * can cause. Under systemd's default `KillMode=control-group`, everything in
 * the unit's cgroup dies with the main process — including the detached
 * helper that was supposed to bring the replacement up. So "restart" killed
 * a production service and nothing came back (#229 by @SkillBase-Al: "杀死了
 * 服务但是无法重复启动服务"). `allowRestart: false` was always the documented
 * answer, but it is opt-in, and nothing told the operator to opt in until
 * after they had already lost the service.
 *
 * TWO signals are required, and the second is the whole reason this function
 * is not a one-line env check. `INVOCATION_ID` is INHERITED: every
 * descendant of a systemd unit carries it, which on Linux includes an
 * ordinary desktop terminal (its shell descends from a user-session unit)
 * and a CI runner (the agent is a unit — this repo's own smoke test caught
 * that). Treating inheritance as ownership would disable the button for a
 * large population of hosts where it works fine, which is a worse bug than
 * the one being fixed.
 *
 * The parent test is what distinguishes being the unit's own main process
 * from merely descending from one: a terminal's node has the shell as its
 * parent and a runner's has the agent. It used to be `ppid === 1`, which is
 * only true for SYSTEM units. A per-user unit's service is forked by that
 * user's manager instance — `systemd --user`, an ordinary PID — so user-unit
 * hosts read as unsupervised, and one-click restart killed them for good
 * (#471 by @automagik-genie, with the journal to prove the whole chain:
 * clean SIGTERM exit → `Restart=on-failure` does not fire → `KillMode=mixed`
 * SIGKILLs the detached helper before it can spawn the replacement). So the
 * parent counts as a manager when it is PID 1 or its comm is `systemd` —
 * the one name both manager instances share and the false-positive parents
 * (shells, CI agents) never carry. `/proc` is Linux-only, which is exactly
 * as wide as systemd itself; anywhere it cannot be read the answer stays
 * "not a manager".
 *
 * Scoped to systemd on purpose. pm2 sets `pm_id`, but it is inherited the
 * same way and pm2's God daemon — not PID 1 — is the parent, so there is no
 * equivalent second signal; a guess there would reintroduce exactly the
 * false positive this pair exists to avoid. launchd has no marker at all.
 * Both still need the explicit setting: detection is a safety net over the
 * documented option, never a replacement for it.
 */
export declare function detectedSupervisor(env?: NodeJS.ProcessEnv, ppid?: number, parentComm?: (pid: number) => string | null): string | null;
/**
 * Whether this host process is under a debugger, when one can be identified —
 * `'inspector'` or `null`.
 *
 * Parallel to `detectedSupervisor()` (#229): a runtime latch for the restart
 * route and status poll, NOT an entry in `restartAllowed()`. Folding it into
 * `restartAllowed()` would write `allowRestart: false` through the settings
 * page while a debug session is open, and the switch would stay off after
 * the debugger detaches (#447).
 *
 * An explicit `allowRestart: true` does NOT override this latch either —
 * unlike systemd, there is no documented deployment shape where killing a
 * debug-attached host from the market UI is the right answer.
 *
 * Primary signal: `inspector.url()` is set (covers `--inspect` at boot,
 * `inspector.open()`, and SIGUSR1 attach). Secondary: inspect-family flags
 * in `execArgv` and `NODE_OPTIONS`, matched by token prefix — not a
 * `/inspect/` substring, so script paths like `.../inspect-tool.js` do not
 * false-positive. Includes `--inspect-wait` for Node versions that expose it
 * as a distinct flag before `inspector.url()` is populated.
 *
 * Accepted false positive (same trade as #229 not guessing pm2): a host left
 * listening on an inspector port — including `NODE_OPTIONS=--inspect` with
 * nobody attached — is treated as debug-owned and gets no one-click restart.
 */
export declare function detectedDebugger(inspectorUrl?: string | undefined, execArgv?: readonly string[], nodeOptions?: string): 'inspector' | null;
/**
 * Self-restart is enabled by default, disabled by an explicit false — and
 * disabled by DEFAULT under a detected supervisor, which owns restarts and
 * whose process group would take the replacement helper down with it.
 *
 * An explicit `true` still wins: an operator who has configured their unit
 * for it (`KillMode=process`, or a wrapper that survives) is making a
 * statement about their own deployment, and this should not overrule it.
 */
export declare function restartAllowed(config: {
    allowRestart?: boolean;
}, env?: NodeJS.ProcessEnv, ppid?: number): boolean;
/**
 * The port this process is serving on, read off the request that asked for
 * the restart.
 *
 * The alternative is to parse it out of the launch argv, which is wrong for
 * every host that binds from config or an env var. The Host header is what
 * the browser actually reached us on, so it is the port the replacement has
 * to take over — and it is already validated against Origin by the guard
 * below before any of this runs.
 * @returns the port, or null when the header carries none (a default port).
 */
export declare function servingPort(request: Pick<IncomingMessage, 'headers'>): number | null;
/** Whether a process-control request came from this Web host on loopback. */
export declare function trustedRestartRequest(request: Pick<IncomingMessage, 'headers' | 'socket'>): boolean;
/**
 * Whether a download navigation may fetch a sensitive GET export.
 * Browsers do NOT send an Origin header on same-origin GET navigations
 * (`<a href="/..." download>`), so unlike process-control requests a missing
 * Origin is the NORMAL shape of a user-initiated download and must pass.
 * Keep the rest of the posture: loopback peer only, no proxy forwarding
 * headers, and — when an Origin IS present (fetch/CORS attempts) — it must
 * still match Host so a cross-origin page cannot read the export.
 */
export declare function trustedDownloadRequest(request: Pick<IncomingMessage, 'headers' | 'socket'>): boolean;
/** The exact boot invocation the detached restart helper replays. */
export declare function restartLaunch(): {
    file: string;
    args: string[];
    cwd: string;
    viaShell: boolean;
};
/**
 * Platform-correct spawn invocation for the replacement host (#40 by
 * @1123762794): on Windows a `detached` spawn maps to DETACHED_PROCESS — the
 * new host gets NO console, and every console child it later spawns (e.g.
 * DSH sandbox tool runners) pops a visible node window. Wrapping the launch
 * in `powershell -WindowStyle Hidden` gives the host a HIDDEN console that
 * children inherit instead. POSIX keeps the plain detached spawn.
 */
export declare function respawnInvocation(launch: {
    file: string;
    args: string[];
    viaShell: boolean;
}, platform?: NodeJS.Platform): {
    file: string;
    args: string[];
    viaShell: boolean;
    detached: boolean;
};
/** What scheduleRestart reports back to the caller for logging/response. */
export interface RestartResult {
    pid: number;
    helperPid: number | undefined;
    logOut: string;
    logErr: string;
}
/**
 * Source for the detached helper that outlives this process and brings the
 * replacement up.
 *
 * Extracted so the waiting can be tested by RUNNING it, which is the only
 * way this class of bug shows itself: every part of the old helper looked
 * right in isolation.
 *
 * What it fixes (#177, reported on Windows 11, reproducible every time): the
 * helper slept a flat 1500ms and spawned. The old process had exited, but
 * the listening socket had not been released yet, so the replacement died
 * instantly with EADDRINUSE — and the spawn was wrapped in `catch {}`, so
 * nothing was written anywhere. The user saw a restart button that did
 * nothing. The docstring above it even claimed the helper "waits for our
 * port to free up"; it never did.
 *
 * So: wait for the port to actually go quiet, then start, then CHECK that
 * something came up, and write a diagnosis when it did not. A restart that
 * fails must leave evidence — this one is invisible by construction, since
 * the process that would have logged it is the one that just exited.
 * @param port - the port the replacement must bind; when unknown, the helper
 *   falls back to the old fixed delay, which is better than nothing.
 */
export declare function restartHelperSource(spawned: {
    file: string;
    args: string[];
    viaShell: boolean;
    detached: boolean;
}, launch: {
    cwd: string;
}, logs: {
    out: string;
    err: string;
}, port: number | null): string;
/**
 * Relaunch this exact DSH entry after a detached handoff, then stop this
 * process. The helper outlives us (detached + unref), waits for our port to
 * be released before starting the replacement, and logs under tmpdir.
 * @param port - the port this process is serving on, so the helper can wait
 *   for it rather than guessing at a delay.
 */
export declare function scheduleRestart(port?: number | null): RestartResult;
