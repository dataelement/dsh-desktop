import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path';
/**
 * Build the `file` provider over one Remote face and one change feed.
 * @param remote - the Remote face carrying `workspaceFiles.stat`.
 * @param changes - the per-session change fan-out.
 * @returns the provider to register into `ctx.resources`.
 */
export function createFileResourceProvider(remote, changes) {
    return {
        protocol: 'file',
        async *open(address, { signal }) {
            const resolved = resolve(address);
            if (!resolved.ok) {
                yield resolved;
                return;
            }
            const { sessionId, path } = resolved.value;
            // Queue changes delivered to this Client while stat is pending.
            const notices = changes.follow(sessionId, signal);
            const stat = () => remote.workspaceFiles.stat(sessionId, path, signal);
            // Read through a call: a plain `signal.aborted` is narrowed to `false` by
            // the first check and would read as always-false after the later awaits.
            const aborted = () => signal.aborted;
            // Undefined while the last stat failed: the follow is on the address, not
            // on the file, so a write can still bring the file live.
            let current;
            try {
                if (!await notices.ready || aborted())
                    return;
                const first = await stat();
                if (aborted())
                    return;
                if (first.ok) {
                    notices.bind(first.value.absolutePath);
                    current = first.value;
                    yield { ok: true, value: current };
                }
                else {
                    yield first;
                }
                for await (const notice of notices) {
                    if (current === undefined) {
                        // Still gone: nothing new to report.
                        if (notice.kind === 'absent')
                            continue;
                    }
                    else if (notice.kind === 'changed') {
                        // Frames report observations: holding this version already means the
                        // consumer learns nothing new.
                        if (notice.version === current.version)
                            continue;
                        current = { ...current, version: notice.version };
                        yield { ok: true, value: current };
                        continue;
                    }
                    // A Host notice may mean stale content.
                    const again = await stat();
                    if (aborted())
                        return;
                    if (!again.ok) {
                        current = undefined;
                        yield again;
                        continue;
                    }
                    notices.bind(again.value.absolutePath);
                    current = again.value;
                    yield { ok: true, value: current };
                }
            }
            finally {
                notices.dispose();
            }
        },
    };
}
/**
 * Resolve one address to the Host call it stands for, or to the failure frame it earns.
 * @param address - the full address, scheme included.
 * @returns the Host file, or the `unsupported-address` / `unknown-workspace` failure.
 */
function resolve(address) {
    const parsed = parseFileAddress(address);
    if (parsed === undefined)
        return { ok: false, error: unsupportedAddress(address) };
    if (parsed.scope === 'session') {
        // The address is a string boundary: its id segment is the Session id it names.
        const sessionId = parsed.sessionId;
        return { ok: true, value: { sessionId, path: parsed.path } };
    }
    return { ok: false, error: unknownWorkspace(address) };
}
/**
 * The failure frame's error for an address this provider does not serve.
 * @param address - the offending address.
 * @returns the typed error.
 */
function unsupportedAddress(address) {
    return new RemoteError('workspace-file/unsupported-address', `${address} is not a dsh-resource://file/session/<sessionId>/<path> or dsh-resource://file/absolute/<path> address`, { address });
}
/**
 * The failure frame's error for an absolute address with no Session.
 * @param address - the offending address.
 * @returns the typed error.
 */
function unknownWorkspace(address) {
    return new RemoteError('workspace-file/unknown-workspace', `${address} requires a dsh-resource://file/session/<sessionId>/<path> address`, { address });
}
//# sourceMappingURL=provider.js.map