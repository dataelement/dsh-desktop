/**
 * The `file` protocol's provider: a workspace file's metadata as a stream of
 * `RemoteResult` frames.
 *
 * An address names the file in one of two scopes. A `session` address,
 * `dsh-resource://file/session/<sessionId>/<path>`, carries an absolute path or one
 * relative to that Session's workspace root: the Host receives the path as-is and
 * resolves it against the root it holds. Only the Host's `stat.absolutePath`
 * selects the change-feed key; no Client Session summary is needed.
 * An `absolute` address, `dsh-resource://file/absolute/<path>`, carries no
 * Session and cannot authorize a Host call. An address neither scope
 * resolves yields one failure frame — `workspace-file/unsupported-address` for
 * a string outside the grammar, `workspace-file/unknown-workspace` when the
 * address carries no Session — and ends.
 *
 * The first frame is the file's `stat`; every Host-reported write yields the
 * metadata with its reported version; a reported disappearance, or a write while the
 * last stat had failed, runs `stat` again. Failures travel as `ok: false` frames, never as thrown errors: the
 * Remote face does not reject, and anything thrown inside the stream is a
 * programming error the resource model lets surface. A failed stat does not end
 * the stream: the next write stats again. One {@link ChangeFeed}
 * serves every open file of the Client.
 */
import type { ResourceProvider } from '@deepseek-ai/dsh-client-resources/client';
import type { ChangeFeed } from './change-feed.ts';
import type { WorkspaceFilesRemote } from './remote.ts';
/**
 * Build the `file` provider over one Remote face and one change feed.
 * @param remote - the Remote face carrying `workspaceFiles.stat`.
 * @param changes - the per-session change fan-out.
 * @returns the provider to register into `ctx.resources`.
 */
export declare function createFileResourceProvider(remote: WorkspaceFilesRemote, changes: ChangeFeed): ResourceProvider<'file'>;
//# sourceMappingURL=provider.d.ts.map