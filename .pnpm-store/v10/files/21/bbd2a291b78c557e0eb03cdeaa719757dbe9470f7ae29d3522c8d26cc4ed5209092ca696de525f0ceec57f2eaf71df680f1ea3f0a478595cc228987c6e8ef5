/**
 * macOS applications can be distributed via the Mac App Store (MAS) or directly
 * downloaded from the developer's website. @electron/osx-sign distinguishes between
 * MAS apps (`mas`) or non-MAS apps (`darwin`).
 * @category Utility
 */
export type ElectronMacPlatform = 'darwin' | 'mas';
/**
 * MAS apps can be signed using Development or Distribution certificates.

 * See [Apple Documentation](https://developer.apple.com/help/account/create-certificates/certificates-overview/) for more info.
 * @category Utility
 */
export type SigningDistributionType = 'development' | 'distribution';
/**
 * @interface
 * @internal
 */
export type BaseSignOptions = Readonly<{
    /**
     * Path to the application package.
     * Needs to end with the file extension `.app`.
     */
    app: string;
    /**
     * The keychain name.
     *
     * @defaultValue `login`
     */
    keychain?: string;
    /**
     * Build platform of your Electron app.
     * Allowed values: `darwin` (Direct Download App), `mas` (Mac App Store).
     *
     * @defaultValue Determined by presence of `Squirrel.framework` within the application bundle,
     * which is used for non-MAS apps.
     */
    platform?: ElectronMacPlatform;
    /**
     * Name of the certificate to use when signing.
     *
     * @defaultValue Selected with respect to {@link SignOptions.provisioningProfile | provisioningProfile}
     * and {@link SignOptions.platform | platform} from the selected {@link SignOptions.keychain | keychain}.
     * * `mas` will look for `3rd Party Mac Developer Application: * (*)`
     * * `darwin` will look for `Developer ID Application: * (*)` by default.
     */
    identity?: string;
}>;
type OnlyValidatedBaseSignOptions = {
    platform: ElectronMacPlatform;
};
/**
 * A set of signing options that can be overriden on a per-file basis.
 * Any missing options will use the default values, and providing a partial structure
 * will shallow merge with the default values.
 * @interface
 * @category Codesign
 */
export type PerFileSignOptions = {
    /**
     * String specifying the path to an `entitlements.plist` file.
     * Can also be an array of entitlement keys that osx-sign will write to an entitlements file for you.
     *
     * @defaultValue `@electron/osx-sign`'s built-in entitlements files.
     */
    entitlements?: string | string[];
    /**
     * Whether to enable [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)
     * for this file.
     *
     * Note: Hardened Runtime is a pre-requisite for notarization, which is mandatory for apps running on macOS 10.15 and above.
     *
     * @defaultValue `true`
     */
    hardenedRuntime?: boolean;
    /**
     * Either a string beginning with `=` which specifies in plain text the
     * [signing requirements](https://developer.apple.com/library/mac/documentation/Security/Conceptual/CodeSigningGuide/RequirementLang/RequirementLang.html)
     * that you recommend to be used to evaluate the code signature, or a string specifying a path to a text or
     * properly encoded `.rqset` file which contains those requirements.
     */
    requirements?: string;
    /**
     * When signing, a set of option flags can be specified to change the behavior of the system when using the signed code.
     * Accepts an array of strings or a comma-separated string.
     *
     * See --options of the `codesign` command.
     *
     * https://keith.github.io/xcode-man-pages/codesign.1.html#OPTION_FLAGS
     */
    signatureFlags?: string | string[];
    /**
     * String specifying the URL of the timestamp authority server.
     * Please note that this default server may not support signatures not furnished by Apple.
     * Disable the timestamp service with `none`.
     *
     * @defaultValue Uses the Apple-provided timestamp server.
     */
    timestamp?: string;
    /**
     * Additional raw arguments to pass to the `codesign` command.
     *
     * These can be things like `--deep` for instance when code signing specific resources that may
     * require such arguments.
     *
     * https://keith.github.io/xcode-man-pages/codesign.1.html#OPTIONS
     */
    additionalArguments?: string[];
};
/**
 * @interface
 * @internal
 */
export type OnlySignOptions = {
    /**
     * Array of paths to additional binaries that will be signed along with built-ins of Electron.
     *
     * @defaultValue `undefined`
     */
    binaries?: string[];
    /**
     * Function that receives the path to a file and can return the entitlements to use for that file to override the default behavior. The
     * object this function returns can include any of the following optional keys. Any properties that are returned **override** the default
     * values that `@electron/osx-sign` generates. Any properties not returned use the default value.
     *
     * @param filePath Path to file
     * @returns Override signing options
     */
    optionsForFile?: (filePath: string) => PerFileSignOptions;
    /**
     * Flag to enable/disable validation for the signing identity.
     * If enabled, the {@link SignOptions.identity | identity} provided
     * will be validated in the {@link BaseSignOptions.keychain | keychain} specified.
     *
     * @defaultValue `true`
     */
    identityValidation?: boolean;
    /**
     * Defines files that will be skipped during the code signing process.
     * This property accepts a regex, function or an array of regexes and functions.
     * Elements of other types are treated as `RegExp`.
     *
     * File paths matching a regex or returning a `true` value from a function will be ignored.
     *
     * @defaultValue `undefined`
     */
    ignore?: string | string[] | ((file: string) => boolean);
    /**
     * Flag to enable/disable entitlements automation tasks necessary for code signing most Electron apps.
     * * Adds [`com.apple.security.application-groups`](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups) to the entitlements file
     * * Fills in the `ElectronTeamID` property in `Info.plist` with the provisioning profile's Team Identifier or by parsing the identity name.
     *
     * @defaultValue `true`
     */
    preAutoEntitlements?: boolean;
    /**
     * Flag to enable/disable the embedding of a provisioning profile into the app's `Contents` folder.
     * Will use the profile from {@link OnlySignOptions.provisioningProfile} if provided. Otherwise, it
     * searches for a `.provisionprofile` file in the current working directory.
     *
     * @defaultValue `true`
     */
    preEmbedProvisioningProfile?: boolean;
    /**
     * Path to a provisioning profile, which can be used to grant restricted entitlements to your app.
     *
     * See [Apple Documentation](https://developer.apple.com/documentation/technotes/tn3125-inside-code-signing-provisioning-profiles) for more details.
     */
    provisioningProfile?: string;
    /**
     * Flag to enable/disable the `--strict` flag when verifying the signed application bundle.
     * Also supports string values to specify which strict restrictions to use, see codesign man page for supported values.
     *
     * @defaultValue `true`
     */
    strictVerify?: boolean | string;
    /**
     * Type of certificate to use when signing a MAS app.
     * @defaultValue `"distribution"`
     */
    type?: SigningDistributionType;
    /**
     * Build version of Electron. Values may be like: `1.1.1`, `1.2.0`. For use for signing legacy versions
     * of Electron to ensure backwards compatibility.
     */
    version?: string;
};
type OnlyValidatedSignOptions = {
    ignore?: (string | ((file: string) => boolean))[];
    type: SigningDistributionType;
};
type OnlyFlatOptions = {
    /**
     * Flag to enable/disable validation for the signing identity.
     * If enabled, the {@link BaseSignOptions.identity | identity} provided
     * will be validated in the {@link BaseSignOptions.keychain | keychain} specified.
     *
     * @defaultValue `true`
     */
    identityValidation?: boolean;
    /**
     * Path to install the bundle.
     * @defaultValue `"/Applications"`
     */
    install?: string;
    /**
     * Output path for the flattened installer package.
     * Needs file extension `.pkg`.
     *
     * @defaultValue Inferred from the app name passed into `opts.app`.
     */
    pkg?: string;
    /**
     * Path to a directory containing `preinstall.sh` or `postinstall.sh` scripts.
     * These must be executable and will run on pre/postinstall depending on the file
     * name.
     *
     * This option is only valid if {@link FlatOptions.platform} is set to `darwin`.
     */
    scripts?: string;
};
type OnlyValidatedFlatOptions = {
    install: string;
    pkg: string;
};
/**
 * Utility type that represents an `UnValidated` type after validation,
 * replacing any properties in the unvalidated type that also exist in the
 * `Validated` type with the validated versions.
 *
 * @template UnValidated - The type representing the unvalidated form.
 * @template Validated - The type representing the validated form.
 */
type ValidatedForm<UnValidated, Validated> = Omit<UnValidated, keyof Validated> & Validated;
type ValidatedBaseSignOptions = Readonly<ValidatedForm<BaseSignOptions, OnlyValidatedBaseSignOptions>>;
type _SignOptions = Readonly<OnlySignOptions & BaseSignOptions>;
/**
 * Options for codesigning a packaged `.app` bundle.
 * @category Codesign
 */
export interface SignOptions extends _SignOptions {
}
/**
 * @internal
 */
export type ValidatedSignOptions = Readonly<ValidatedForm<OnlySignOptions, OnlyValidatedSignOptions> & ValidatedBaseSignOptions>;
type _FlatOptions = Readonly<OnlyFlatOptions & BaseSignOptions>;
/**
 * Options for creating a flat `.pkg` installer.
 * @category Flat
 */
export interface FlatOptions extends _FlatOptions {
}
/**
 * @internal
 */
export type ValidatedFlatOptions = Readonly<ValidatedForm<OnlyFlatOptions, OnlyValidatedFlatOptions> & ValidatedBaseSignOptions>;
export {};
