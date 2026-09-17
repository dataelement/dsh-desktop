/**
 * TODO(erikian): remove this file once we upgrade to the latest `glob` version.
 * https://github.com/electron/asar/pull/332#issuecomment-2435407933
 */
interface IMinimatchOptions {
    /**
     * Dump a ton of stuff to stderr.
     *
     * @default false
     */
    debug?: boolean | undefined;
    /**
     * Do not expand `{a,b}` and `{1..3}` brace sets.
     *
     * @default false
     */
    nobrace?: boolean | undefined;
    /**
     * Disable `**` matching against multiple folder names.
     *
     * @default false
     */
    noglobstar?: boolean | undefined;
    /**
     * Allow patterns to match filenames starting with a period,
     * even if the pattern does not explicitly have a period in that spot.
     *
     * Note that by default, `'a/**' + '/b'` will **not** match `a/.d/b`, unless `dot` is set.
     *
     * @default false
     */
    dot?: boolean | undefined;
    /**
     * Disable "extglob" style patterns like `+(a|b)`.
     *
     * @default false
     */
    noext?: boolean | undefined;
    /**
     * Perform a case-insensitive match.
     *
     * @default false
     */
    nocase?: boolean | undefined;
    /**
     * When a match is not found by `minimatch.match`,
     * return a list containing the pattern itself if this option is set.
     * Otherwise, an empty list is returned if there are no matches.
     *
     * @default false
     */
    nonull?: boolean | undefined;
    /**
     * If set, then patterns without slashes will be matched
     * against the basename of the path if it contains slashes. For example,
     * `a?b` would match the path `/xyz/123/acb`, but not `/xyz/acb/123`.
     *
     * @default false
     */
    matchBase?: boolean | undefined;
    /**
     * Suppress the behavior of treating `#` at the start of a pattern as a comment.
     *
     * @default false
     */
    nocomment?: boolean | undefined;
    /**
     * Suppress the behavior of treating a leading `!` character as negation.
     *
     * @default false
     */
    nonegate?: boolean | undefined;
    /**
     * Returns from negate expressions the same as if they were not negated.
     * (Ie, true on a hit, false on a miss.)
     *
     * @default false
     */
    flipNegate?: boolean | undefined;
    /**
     * Compare a partial path to a pattern.  As long as the parts of the path that
     * are present are not contradicted by the pattern, it will be treated as a
     * match. This is useful in applications where you're walking through a
     * folder structure, and don't yet have the full path, but want to ensure that
     * you do not walk down paths that can never be a match.
     *
     * @default false
     *
     * @example
     * import minimatch = require("minimatch");
     *
     * minimatch('/a/b', '/a/*' + '/c/d', { partial: true })  // true, might be /a/b/c/d
     * minimatch('/a/b', '/**' + '/d', { partial: true })     // true, might be /a/b/.../d
     * minimatch('/x/y/z', '/a/**' + '/z', { partial: true }) // false, because x !== a
     */
    partial?: boolean;
    /**
     * Use `\\` as a path separator _only_, and _never_ as an escape
     * character. If set, all `\\` characters are replaced with `/` in
     * the pattern. Note that this makes it **impossible** to match
     * against paths containing literal glob pattern characters, but
     * allows matching with patterns constructed using `path.join()` and
     * `path.resolve()` on Windows platforms, mimicking the (buggy!)
     * behavior of earlier versions on Windows. Please use with
     * caution, and be mindful of the caveat about Windows paths
     *
     * For legacy reasons, this is also set if
     * `options.allowWindowsEscape` is set to the exact value `false`.
     *
     * @default false
     */
    windowsPathsNoEscape?: boolean;
}
export interface IOptions extends IMinimatchOptions {
    cwd?: string | undefined;
    root?: string | undefined;
    dot?: boolean | undefined;
    nomount?: boolean | undefined;
    mark?: boolean | undefined;
    nosort?: boolean | undefined;
    stat?: boolean | undefined;
    silent?: boolean | undefined;
    strict?: boolean | undefined;
    cache?: {
        [path: string]: boolean | 'DIR' | 'FILE' | ReadonlyArray<string>;
    } | undefined;
    statCache?: {
        [path: string]: false | {
            isDirectory(): boolean;
        } | undefined;
    } | undefined;
    symlinks?: {
        [path: string]: boolean | undefined;
    } | undefined;
    realpathCache?: {
        [path: string]: string;
    } | undefined;
    sync?: boolean | undefined;
    nounique?: boolean | undefined;
    nonull?: boolean | undefined;
    debug?: boolean | undefined;
    nobrace?: boolean | undefined;
    noglobstar?: boolean | undefined;
    noext?: boolean | undefined;
    nocase?: boolean | undefined;
    matchBase?: any;
    nodir?: boolean | undefined;
    ignore?: string | ReadonlyArray<string> | undefined;
    follow?: boolean | undefined;
    realpath?: boolean | undefined;
    nonegate?: boolean | undefined;
    nocomment?: boolean | undefined;
    absolute?: boolean | undefined;
    allowWindowsEscape?: boolean | undefined;
    fs?: typeof import('fs');
}
export {};
