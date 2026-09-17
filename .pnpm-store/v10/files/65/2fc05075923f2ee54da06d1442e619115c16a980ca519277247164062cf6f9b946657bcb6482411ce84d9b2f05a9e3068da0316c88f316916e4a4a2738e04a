/**
 * A preset's display metadata: the name and description a picker shows.
 *
 * It lives in its own file because the composition is a top-level list of
 * plugin rows — YAML cannot carry sibling keys beside it, and faking a
 * metadata row would hand the Loader something to load. Keeping it separate
 * also keeps the composition exactly what its name says: a Cordis file the
 * loader owns and the cordis preset can author.
 *
 * The file carries display text ONLY. `id` is the directory name and `trust`
 * comes from the root a preset was discovered under, so neither is writable
 * here — otherwise a locally authored preset could claim to be a shipped one.
 *
 * Every read failure degrades to no metadata. A preset whose display text is
 * missing, malformed, or unreadable still mounts: presentation is not a
 * capability, and a broken name must never become an agent that cannot start.
 * @module @deepseek-ai/dsh-agent-presets/metadata
 */
/** The optional display-metadata file beside a preset's composition. */
export declare const METADATA_FILE = "preset.yml";
/** Display text a preset may publish about itself. */
export interface PresetMetadata {
    /** Human-facing name; falls back to the preset id when absent. */
    readonly name?: string;
    /** One sentence on what this preset is for. */
    readonly description?: string;
    /**
     * Position within its group; lower comes first. A preset that declares
     * none sorts after every preset that does, then by id — so the shipped set
     * can read in capability order while authored ones stay alphabetical.
     */
    readonly order?: number;
}
/**
 * Read one preset directory's display metadata.
 *
 * Absent, unparsable, and wrongly-shaped files are all the same answer —
 * empty metadata — because the caller renders a picker, not a diagnostic.
 * @param directory - the preset directory.
 * @returns the display text the preset published, possibly empty.
 */
export declare function readPresetMetadata(directory: string): Promise<PresetMetadata>;
/**
 * Render display metadata as the file's contents.
 *
 * Absent fields are omitted rather than written empty, so a preset with no
 * description does not ship a key that reads as an intentional blank.
 * @param metadata - the display text to store.
 * @returns the YAML document, or undefined when there is nothing to store.
 */
export declare function renderPresetMetadata(metadata: PresetMetadata): string | undefined;
//# sourceMappingURL=metadata.d.ts.map