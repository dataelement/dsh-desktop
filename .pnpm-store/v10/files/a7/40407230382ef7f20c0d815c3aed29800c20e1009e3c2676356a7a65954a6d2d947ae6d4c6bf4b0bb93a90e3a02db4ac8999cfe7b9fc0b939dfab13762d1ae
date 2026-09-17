import { NodeAPI } from '../node-api.js';
import { IRebuilder } from '../types.js';
type PackageJSONValue = string | Record<string, unknown>;
export declare class NativeModule {
    protected rebuilder: IRebuilder;
    private _moduleName;
    protected modulePath: string;
    nodeAPI: NodeAPI;
    private packageJSON;
    constructor(rebuilder: IRebuilder, modulePath: string);
    get moduleName(): string;
    packageJSONFieldWithDefault(key: string, defaultValue: PackageJSONValue): Promise<PackageJSONValue>;
    packageJSONField(key: string): Promise<PackageJSONValue | undefined>;
    getSupportedNapiVersions(): Promise<number[] | undefined>;
    /**
     * Search dependencies for package using either `packageName` or
     * `@namespace/packageName` in the case of forks.
     */
    findPackageInDependencies(packageName: string, packageProperty?: string): Promise<string | null>;
}
export declare function locateBinary(basePath: string, suffix: string): Promise<string | null>;
export {};
