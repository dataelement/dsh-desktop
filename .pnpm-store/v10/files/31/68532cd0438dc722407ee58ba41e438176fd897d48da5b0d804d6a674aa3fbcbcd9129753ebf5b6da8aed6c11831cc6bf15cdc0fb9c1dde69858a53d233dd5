export declare enum PM {
    PNPM = "pnpm",
    YARN = "yarn",
    YARN_BERRY = "yarn-berry",
    BUN = "bun",
    NPM = "npm",
    TRAVERSAL = "traversal"
}
export declare function getPackageManagerCommand(pm: PM): string;
type PackageManagerSetup = {
    pm: PM;
    corepackConfig: string | undefined;
    resolvedDirectory: string | undefined;
    detectionMethod: string;
};
export declare function detectPackageManager(searchPaths: string[]): Promise<PackageManagerSetup>;
export {};
