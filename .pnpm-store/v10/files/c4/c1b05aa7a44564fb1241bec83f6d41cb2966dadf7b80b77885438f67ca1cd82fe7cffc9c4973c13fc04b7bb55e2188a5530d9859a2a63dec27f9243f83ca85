export interface GitToNpmMigration {
    kind: 'git-to-npm';
    /** Normalized owner/repo or owner/repo#path:/subdir identity. */
    repo: string;
    /** Verified npm package declared by the same catalog entry. */
    target: string;
}
export declare function findGitToNpmMigration<T extends {
    url: string;
    npm?: unknown;
}>(plugins: readonly T[], spec: string): GitToNpmMigration | null;
