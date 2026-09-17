/**
 * Find all instances of a given module in node_modules subdirectories while traversing up
 * ancestor directories.
 *
 * @param cwd the initial directory to traverse
 * @param moduleName the Node module name (should work for scoped modules as well)
 * @param rootPath the project's root path. If provided, the traversal will stop at this path.
 */
export declare function searchForModule(cwd: string, moduleName: string, rootPath?: string): Promise<string[]>;
/**
 * Find all instances of node_modules subdirectories while traversing up ancestor directories.
 *
 * @param cwd the initial directory to traverse
 * @param rootPath the project's root path. If provided, the traversal will stop at this path.
 */
export declare function searchForNodeModules(cwd: string, rootPath?: string): Promise<string[]>;
/**
 * Determine the root directory of a given project, by looking for a directory with an
 * NPM or yarn lockfile or pnpm lockfile.
 *
 * @param cwd the initial directory to traverse
 */
export declare function getProjectRootPath(cwd: string): Promise<string>;
