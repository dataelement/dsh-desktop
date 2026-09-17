/**
 * Options to pass into the {@link makeUniversalApp} function.
 *
 * Requires absolute paths for input x64 and arm64 apps and an absolute path to the
 * output universal app.
 */
export type MakeUniversalOpts = {
    /**
     * Absolute file system path to the x64 version of your application (e.g. `/Foo/bar/MyApp_x64.app`).
     */
    x64AppPath: string;
    /**
     * Absolute file system path to the arm64 version of your application (e.g. `/Foo/bar/MyApp_arm64.app`).
     */
    arm64AppPath: string;
    /**
     * Absolute file system path you want the universal app to be written to (e.g. `/Foo/var/MyApp_universal.app`).
     *
     * If this file exists on disk already, it will be overwritten ONLY if {@link MakeUniversalOpts.force} is set to `true`.
     */
    outAppPath: string;
    /**
     * Forcefully overwrite any existing files that are in the way of generating the universal application.
     *
     * @defaultValue `false`
     */
    force?: boolean;
    /**
     * Merge x64 and arm64 ASARs into one.
     *
     * @defaultValue `false`
     */
    mergeASARs?: boolean;
    /**
     * If {@link MakeUniversalOpts.mergeASARs} is enabled, this property provides a
     * {@link https://github.com/isaacs/minimatch?tab=readme-ov-file#features | minimatch}
     * pattern of paths that are allowed to be present in one of the ASAR files, but not in the other.
     *
     */
    singleArchFiles?: string;
    /**
     * A {@link https://github.com/isaacs/minimatch?tab=readme-ov-file#features | minimatch}
     * pattern of binaries that are expected to be the same x64 binary in both
     *
     * Use this if your application contains binaries that have already been merged into a universal file
     * using the `lipo` tool.
     *
     * @see Apple's {@link https://developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary | Building a universal macOS binary} documentation
     *
     */
    x64ArchFiles?: string;
    /**
     * A {@link https://github.com/isaacs/minimatch?tab=readme-ov-file#features | minimatch} pattern of `Info.plist`
     * paths that should not receive an injected `ElectronAsarIntegrity` value.
     *
     * Use this if your application contains another bundle that's already signed.
     */
    infoPlistsToIgnore?: string;
};
export declare const makeUniversalApp: (opts: MakeUniversalOpts) => Promise<void>;
