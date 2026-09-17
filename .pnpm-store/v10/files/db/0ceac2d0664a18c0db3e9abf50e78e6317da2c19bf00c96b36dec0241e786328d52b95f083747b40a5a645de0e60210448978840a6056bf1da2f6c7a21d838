export type PackageJson = {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    workspaces?: string[] | {
        packages: string[];
    };
};
export interface NodeModuleInfo {
    name: string;
    version: string;
    dir: string;
    dependencies?: Array<NodeModuleInfo>;
}
export type ParsedDependencyTree = {
    readonly name: string;
    readonly version: string;
    readonly path: string;
    readonly workspaces?: string[] | {
        packages: string[];
    };
};
export interface PnpmDependency extends Dependency<PnpmDependency, PnpmDependency> {
    readonly from: string;
    readonly resolved: string;
    readonly dedupedDependenciesCount?: number;
}
export interface NpmDependency extends Dependency<NpmDependency, string> {
    readonly resolved?: string;
    readonly _dependencies?: {
        [packageName: string]: string;
    };
}
export interface TraversedDependency extends Dependency<TraversedDependency, TraversedDependency> {
}
export type Dependency<T, V> = Dependencies<T, V> & ParsedDependencyTree;
export type Dependencies<T, V> = {
    readonly dependencies?: {
        [packageName: string]: T;
    };
    readonly optionalDependencies?: {
        [packageName: string]: V;
    };
};
export interface DependencyGraph {
    [packageNameAndVersion: string]: {
        readonly dependencies: string[];
    };
}
