export type ModuleType = 'prod' | 'dev' | 'optional';
export declare class ModuleWalker {
    buildPath: string;
    modulesToRebuild: string[];
    onlyModules: string[] | null;
    prodDeps: Set<string>;
    projectRootPath?: string;
    realModulePaths: Set<string>;
    realNodeModulesPaths: Set<string>;
    types: ModuleType[];
    constructor(buildPath: string, projectRootPath: string | undefined, types: ModuleType[], prodDeps: Set<string>, onlyModules: string[] | null);
    get nodeModulesPaths(): Promise<string[]>;
    walkModules(): Promise<void>;
    findModule(moduleName: string, fromDir: string, foundFn: (p: string) => Promise<void>): Promise<void[]>;
    markChildrenAsProdDeps(modulePath: string): Promise<void>;
    findAllModulesIn(nodeModulesPath: string, prefix?: string): Promise<void>;
}
