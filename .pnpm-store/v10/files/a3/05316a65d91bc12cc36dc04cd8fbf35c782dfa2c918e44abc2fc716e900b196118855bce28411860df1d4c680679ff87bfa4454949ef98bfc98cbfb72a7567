/**
 * Copying, reading, and deleting locally authored presets.
 *
 * Authoring is confined to a `user` root: the shipped `.system` set is part of
 * the deployment, and letting a browser rewrite it would turn "reset to a known
 * preset" into something the same caller could have broken first.
 *
 * The only authoring write is a whole-directory copy of an existing preset.
 * No caller supplies composition text: the inputs are ids the host resolves
 * against its own roots plus an optional display name, so authoring grants no
 * capability the copied preset did not already carry.
 * @module @deepseek-ai/dsh-agent-presets/authoring
 */
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { type AgentPreset, type PresetRoot } from './preset.ts';
/**
 * Refuse a copy onto an id something already occupies. Both the roster check
 * and the on-disk check answer with it, so a taken id reads the same either way.
 * @param presetId - the id that is already taken.
 * @returns the failure to throw.
 */
export declare function presetExists(presetId: string): RemoteError<'agent-preset/invalid'>;
/**
 * The root locally authored presets are written to.
 * @param roots - the configured roots in precedence order.
 * @param presetId - the preset the caller is authoring, named by the refusal.
 * @returns the absolute path of the first `user` root.
 * @throws when the deployment configured no writable root.
 */
export declare function writableRoot(roots: readonly PresetRoot[], presetId: string): string;
/**
 * Read one preset's composition text.
 * @param preset - the resolved preset.
 * @returns the file's contents.
 */
export declare function readComposition(preset: AgentPreset): Promise<string>;
/**
 * Create a preset by copying an existing one's whole directory.
 *
 * The copy carries everything the source directory holds — composition,
 * metadata, skill directories, assets — because a preset is its directory,
 * not one file. Symlinks are dereferenced so the copy is self-contained
 * rather than a set of links back into the install it was copied from.
 *
 * The copied metadata is then rewritten: the source's description is kept
 * (the file is the author's to edit afterwards), but its name and roster
 * `order` are not — a copy presenting itself identically to its source, or
 * sorted into the shipped set's declared order, would make the roster stop
 * distinguishing them. With no name given and no description to keep, the
 * file is removed so the copy publishes nothing rather than a blank.
 * @param roots - the configured roots; the first `user` one receives the copy.
 * @param source - the resolved preset the copy starts from.
 * @param id - the new preset's id, which becomes its directory name.
 * @param name - display name for the copy; omitted falls back to the id.
 * @returns the absolute path of the new preset directory.
 * @throws when the id is unusable or already occupied on disk, or the
 * deployment configures no writable root.
 */
export declare function copyComposition(roots: readonly PresetRoot[], source: AgentPreset, id: string, name?: string): Promise<string>;
/**
 * Delete a locally authored preset.
 *
 * A shipped preset is refused: it belongs to the deployment. A preset a live
 * session mounted is NOT refused — the composition was read at creation and is
 * never re-read, so that session keeps running exactly as it was.
 * @param roots - the configured roots.
 * @param preset - the resolved preset to remove.
 * @throws when the preset ships with the deployment or lies outside the writable root.
 */
export declare function deleteComposition(roots: readonly PresetRoot[], preset: AgentPreset): Promise<void>;
//# sourceMappingURL=authoring.d.ts.map