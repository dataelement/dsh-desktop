/**
 * Filesystem discovery of agent presets. A preset is a directory holding
 * {@link COMPOSITION_FILE}, optionally beside a {@link METADATA_FILE} carrying
 * its display text; the directory name is the preset id. Discovery
 * re-reads the roots on every call so a preset authored while the process is
 * running is visible without a restart.
 *
 * Discovery also owns preset HEALTH: a directory whose composition is
 * missing or unloadable is reported as a broken roster row rather than
 * skipped. A skipped directory would still occupy its id on disk — the copy
 * path refuses the name while no surface shows anything to delete — and a
 * malformed composition would otherwise read as an ordinary preset until the
 * first session fails to mount it.
 *
 * Health is what every consumer reads before offering a preset — the pickers
 * drop a broken row rather than defer the discovery to a failed session
 * start — so it covers the way an authored preset actually rots: a row naming
 * a package that was renamed or uninstalled. Resolving those names is a
 * separate pass from the shape check and stops short of importing anything,
 * so a composition is judged without running a line of plugin code.
 * @module @deepseek-ai/dsh-agent-presets/discovery
 */
import { type AgentPreset, type PresetRoot } from './preset.ts';
/** The composition file that makes a directory a preset. */
export declare const COMPOSITION_FILE = "agent.cordis.yml";
/**
 * Harness-home directory holding locally authored presets.
 *
 * This package owns the writable root the way `dsh-skill-filesystem` owns
 * `<dshHome>/skills`: where a person's own presets go is the same place in
 * every deployment that does not say otherwise, so a launcher that forgets to
 * configure one still finds them.
 *
 * Package-internal on purpose: no consumer outside this package addresses the
 * directory by name, and a test that imported it could not catch this value
 * being wrong — the expected segment is spelled out where it is asserted.
 */
export declare const USER_PRESET_DIR = ".agent-presets";
/**
 * The shipped presets, bundled inside this package: the roster's built-in
 * compositions travel with the machinery that mounts them, the way each
 * preset's own skills travel inside its directory. Resolved relative to this
 * module so both launch layouts work — `src/` under tsx and the bundled
 * `lib/` sit one level below the package root.
 */
export declare const SHIPPED_PRESET_ROOT: string;
/**
 * Why `rows` cannot be an entry list, or undefined when it can.
 *
 * A shallow shape check, deliberately short of the loader's work: it does not
 * resolve plugin names or apply configs. What it catches is the hand-edit
 * that produces a file the loader cannot even begin with — and it must accept
 * everything the loader accepts, which is why rows are only required to be
 * maps carrying a plugin `name` (groups recurse into their own lists).
 *
 * Shared with the composition inventory, whose file reads race edits against
 * the health verdict and must judge the raced content by the same rule.
 * @param rows - the parsed composition document.
 * @param at - row-path prefix for nested diagnostics, empty at the top level.
 * @returns one human-readable reason, or undefined when the shape holds.
 */
export declare function entryListProblem(rows: unknown, at?: string): string | undefined;
/**
 * Scan one root for preset directories.
 *
 * An absent root yields no presets rather than throwing: the user root does
 * not exist until the first locally authored preset, and naming a default
 * that no root supplies already fails loud at resolution.
 *
 * Every directory whose name is a usable preset id is a roster row — broken
 * when its composition is missing or unloadable. A directory named outside
 * {@link PRESET_ID} is skipped instead: no copy could ever claim that name,
 * so it blocks nothing, and reporting `.DS_Store`-grade residue as broken
 * presets would teach users to ignore the marker.
 * @param root - the directory and the trust its presets inherit.
 * @param harnessBase - base URL a row's package name resolves against; the
 * caller's own `ctx.baseUrl`, which is where the installed harness lives.
 * @returns the root's presets ordered by id.
 */
export declare function scanRoot(root: PresetRoot, harnessBase: string): Promise<AgentPreset[]>;
/**
 * Scan every root in precedence order.
 * @param roots - roots in precedence order; an earlier root wins a duplicate id.
 * @param harnessBase - base URL a row's package name resolves against.
 * @returns every discovered preset, first-root-wins per id.
 */
export declare function discoverPresets(roots: readonly PresetRoot[], harnessBase: string): Promise<AgentPreset[]>;
//# sourceMappingURL=discovery.d.ts.map