/** Canonical raw log basename shared by every generation-addressed Session artifact. */
/**
 * Name the raw JSONL log of one immutable Session format generation. Version
 * zero keeps the original `session.jsonl`; every later generation carries a
 * lowercase numeric `.vN` component before the `.jsonl` suffix.
 * @param version - non-negative safe integer Session format version.
 * @returns the canonical basename, without any compression suffix.
 */
export declare function sessionFormatLogFilename(version: number): string;
/**
 * Read the generation named by one raw JSONL log basename. Temporary,
 * uppercase, leading-zero, `.v0`, and compression-suffixed names are not
 * canonical.
 * @param filename - one basename from a Session directory or archive.
 * @returns its Session format version, or `undefined` when the name is not canonical.
 */
export declare function parseSessionFormatLogFilename(filename: string): number | undefined;
//# sourceMappingURL=filename.d.ts.map