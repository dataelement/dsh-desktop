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
import { chmod, cp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import { expandHomePath } from '@deepseek-ai/dsh-home-paths';
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol';
import { METADATA_FILE, renderPresetMetadata } from "./metadata.js";
import { PRESET_ID } from "./preset.js";
/**
 * Refuse one authoring request the deployment does not allow.
 * @param presetId - what the caller tried to change, for the diagnostic.
 * @param reason - why authoring is refused.
 * @returns the failure to throw.
 */
function notWritable(presetId, reason) {
    return new RemoteError('agent-preset/read-only', `agent-presets: preset "${presetId}" cannot be written: ${reason}`, { agentPreset: presetId, reason });
}
/**
 * Refuse a copy onto an id something already occupies. Both the roster check
 * and the on-disk check answer with it, so a taken id reads the same either way.
 * @param presetId - the id that is already taken.
 * @returns the failure to throw.
 */
export function presetExists(presetId) {
    const reason = `preset "${presetId}" already exists — `
        + 'a copy never overwrites; delete the existing preset first or choose another id';
    return new RemoteError('agent-preset/invalid', `agent-presets: ${reason}`, { agentPreset: presetId, reason });
}
/**
 * The root locally authored presets are written to.
 * @param roots - the configured roots in precedence order.
 * @param presetId - the preset the caller is authoring, named by the refusal.
 * @returns the absolute path of the first `user` root.
 * @throws when the deployment configured no writable root.
 */
export function writableRoot(roots, presetId) {
    const root = roots.find(candidate => candidate.trust === 'user');
    if (root === undefined) {
        throw notWritable(presetId, 'this deployment configures no user-writable preset root');
    }
    return resolve(expandHomePath(root.path));
}
/**
 * Read one preset's composition text.
 * @param preset - the resolved preset.
 * @returns the file's contents.
 */
export async function readComposition(preset) {
    return await readFile(preset.path, 'utf8');
}
/** Whether anything occupies the path (cp's own errorOnExist backstops races). */
async function occupied(path) {
    let present = true;
    try {
        await stat(path);
    }
    catch {
        // Every stat failure means the same thing here: nothing usable occupies
        // the path, so the copy may claim it.
        present = false;
    }
    return present;
}
/**
 * Re-tighten a copied tree to owner-only. A shipped preset is world-readable
 * in its install and `cp` preserves that; the copy carries the same weight as
 * the settings document beside it, so group/other access is stripped. A
 * file's owner-execute bit survives — a preset may ship runnable helpers.
 */
async function tightenModes(dir) {
    await chmod(dir, 0o700);
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const target = join(dir, entry.name);
        if (entry.isDirectory()) {
            await tightenModes(target);
        }
        else {
            /* v8 ignore next -- Windows exposes no POSIX owner-execute bit; the POSIX lane covers both file modes. */
            await chmod(target, ((await stat(target)).mode & 0o100) === 0 ? 0o600 : 0o700);
        }
    }
}
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
export async function copyComposition(roots, source, id, name) {
    if (!PRESET_ID.test(id)) {
        const reason = `preset id ${JSON.stringify(id)} must match ${String(PRESET_ID)} — `
            + 'the id is a directory name, so anything else could escape the preset root';
        throw new RemoteError('agent-preset/invalid', `agent-presets: ${reason}`, { agentPreset: id, reason });
    }
    const dir = join(writableRoot(roots, id), id);
    // The roster check upstream only sees discovered presets; a directory with
    // no composition file still occupies the name and deserves a readable
    // refusal rather than a filesystem error code.
    if (await occupied(dir))
        throw presetExists(id);
    try {
        await cp(dirname(source.path), dir, {
            recursive: true, dereference: true, force: false, errorOnExist: true,
        });
        await tightenModes(dir);
        const rendered = renderPresetMetadata({
            ...name === undefined ? {} : { name },
            ...source.description === undefined ? {} : { description: source.description },
        });
        const metadataPath = join(dir, METADATA_FILE);
        if (rendered === undefined) {
            await rm(metadataPath, { force: true });
        }
        else {
            await writeFileAtomic(metadataPath, rendered, { mode: 0o600, dirMode: 0o700 });
        }
    }
    catch (error) {
        // A half-copied directory would be invisible to discovery at best and a
        // mountable-but-incomplete preset at worst; a failed copy leaves nothing.
        await rm(dir, { recursive: true, force: true });
        throw error;
    }
    return dir;
}
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
export async function deleteComposition(roots, preset) {
    if (preset.trust !== 'user') {
        throw notWritable(preset.id, 'it ships with the deployment');
    }
    const dir = join(writableRoot(roots, preset.id), preset.id);
    // Belt and braces over the id pattern: the resolved directory must still be
    // the one the writable root owns, whatever discovery reported.
    if (!isAbsolute(preset.path) || !preset.path.startsWith(dir)) {
        throw notWritable(preset.id, 'it does not live under the writable preset root');
    }
    await rm(dir, { recursive: true, force: true });
}
//# sourceMappingURL=authoring.js.map