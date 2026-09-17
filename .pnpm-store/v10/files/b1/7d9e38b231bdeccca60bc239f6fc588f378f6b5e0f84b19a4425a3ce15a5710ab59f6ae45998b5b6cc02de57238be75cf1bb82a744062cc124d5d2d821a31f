export declare enum FuseVersion {
    V1 = "1"
}
/**
 * Maps config keys to their index in the fuse wire
 */
export declare enum FuseV1Options {
    RunAsNode = 0,
    EnableCookieEncryption = 1,
    EnableNodeOptionsEnvironmentVariable = 2,
    EnableNodeCliInspectArguments = 3,
    EnableEmbeddedAsarIntegrityValidation = 4,
    OnlyLoadAppFromAsar = 5,
    LoadBrowserProcessSpecificV8Snapshot = 6,
    GrantFileProtocolExtraPrivileges = 7
}
export declare type FuseV1Config<T = boolean> = {
    version: FuseVersion.V1;
    resetAdHocDarwinSignature?: boolean;
    /**
     * Ensures that all fuses in the fuse wire being set have been defined to a set value
     * by the provided config. Set this to true to ensure you don't accidentally miss a
     * fuse being added in future Electron upgrades.
     *
     * This option may default to "true" in a future version of @electron/fuses but currently
     * defaults to "false"
     */
    strictlyRequireAllFuses?: boolean;
} & ((Partial<Record<FuseV1Options, T>> & {
    strictlyRequireAllFuses?: false | undefined;
}) | (Record<FuseV1Options, T> & {
    strictlyRequireAllFuses: true;
}));
export declare type FuseConfig<T = boolean> = FuseV1Config<T>;
