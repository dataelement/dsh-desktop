/** Code and configuration categories with embedded full-color glyphs. */
export declare const CODE_FILE_TYPES: readonly ["angular", "c", "clojure", "cmake", "cpp", "csharp", "css", "dart", "docker", "elixir", "env", "erlang", "flutter", "git", "go", "graphql", "haskell", "ini", "java", "javascript", "json", "kotlin", "lua", "makefile", "node", "objective-c", "perl", "php", "powershell", "protobuf", "python", "r", "react", "ruby", "rust", "scala", "shell", "solidity", "sql", "svelte", "swift", "toml", "typescript", "vue", "wasm", "xml", "yaml", "zig"];
/** A code or configuration file category with its own full-color square glyph. */
export type CodeFileType = typeof CODE_FILE_TYPES[number];
/** Optional project files used by context-sensitive code-icon rules. */
export interface FileTypeProjectContext {
    /** Text content keyed by project-relative or basename path. */
    readonly files: Readonly<Record<string, string | undefined>>;
}
/**
 * Test whether a resolved file type uses the full-color code-icon set.
 * @param type - Resolved file-type string.
 * @returns Whether the value is a detailed code-file type.
 */
export declare function isCodeFileType(type: string): type is CodeFileType;
/**
 * Test whether an extension belonged to the established coarse LinkIcon code category.
 * @param extension - Extension without a leading dot.
 * @returns Whether clickable links keep the code glyph for this extension.
 */
export declare function isLinkCodeExtension(extension: string): boolean;
/**
 * Resolve the most specific code/configuration icon according to the supplied map priority.
 * @param name - Lowercase basename.
 * @param extension - Lowercase extension without the leading dot.
 * @param context - Optional project-file snapshot for context-sensitive matches.
 * @returns The detailed code type, or null when the traditional file classifier owns the path.
 */
export declare function classifyCodeFileType(name: string, extension: string, context?: FileTypeProjectContext): CodeFileType | null;
//# sourceMappingURL=code-file-types.d.ts.map