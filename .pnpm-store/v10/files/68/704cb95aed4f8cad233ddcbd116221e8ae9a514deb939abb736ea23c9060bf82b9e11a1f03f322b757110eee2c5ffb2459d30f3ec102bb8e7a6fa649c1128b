import { Type } from 'pe-library';
/**
 * String values for the version information.
 * In most cases predefined names are used for the key names (such as 'FileDescription', 'FileVersion', etc.)
 * Note that the key names are case-sensitive; this library does not convert keys
 * (e.g. `'fileVersion'` --> `'FileVersion'`).
 */
export declare type VersionStringValues = Record<string, string>;
/** Used by `VersionInfo.create` */
export interface VersionStringTable {
    lang: number;
    codepage: number;
    /** Any string values */
    values: VersionStringValues;
}
/** Translation information, containing LANGID and codepage value. */
export interface VersionTranslation {
    lang: number;
    /** Almost all cases are set to 1200 (Unicode) */
    codepage: number;
}
/** Fixed version info, containing file version, product version, etc. (`VS_FIXEDFILEINFO`) */
export interface VersionFixedInfo {
    /** usually major version in HIWORD(fileVersionMS), minor version in LOWORD(fileVersionMS) */
    fileVersionMS: number;
    /** usually patch version in HIWORD(fileVersionLS), revision in LOWORD(fileVersionLS) */
    fileVersionLS: number;
    productVersionMS: number;
    productVersionLS: number;
    /** valid values of fileFlags */
    fileFlagsMask: number;
    /** zero or more VersionFileFlags values, masked by fileFlagsMask */
    fileFlags: number;
    /** VersionFileOS value */
    fileOS: number;
    /** VersionFileType value */
    fileType: number;
    /**
     * subtype values depended on fileType, such as
     * `VersionFileDriverSubtype` or `VersionFileFontSubtype`.
     * (if no suitable value, zero is stored)
     */
    fileSubtype: number;
    fileDateMS: number;
    fileDateLS: number;
}
export interface VersionInfoCreateParam {
    lang: string | number;
    /** This field can be as a partial object; default values (zero) are used for all unspecified field. */
    fixedInfo: Partial<Readonly<VersionFixedInfo>>;
    strings: readonly VersionStringTable[];
}
/**
 * Treats 'Version information' (`VS_VERSIONINFO`) resource data.
 */
export default class VersionInfo {
    private readonly data;
    private constructor();
    /** Returns new `VersionInfo` instance with empty data. */
    static createEmpty(): VersionInfo;
    /**
     * Returns new `VersionInfo` instance with specified parameters.
     * `fixedInfo` can be specified as a partial object;
     * default values (zero) are used for all unspecified field.
     */
    static create(lang: string | number, fixedInfo: Partial<Readonly<VersionFixedInfo>>, strings: readonly VersionStringTable[]): VersionInfo;
    /** Returns new `VersionInfo` instance with specified parameters. */
    static create(param: Readonly<VersionInfoCreateParam>): VersionInfo;
    /** Pick up all version-info entries */
    static fromEntries(entries: readonly Type.ResourceEntry[]): VersionInfo[];
    /** A language value for this resource entry. */
    get lang(): string | number;
    set lang(value: string | number);
    /**
     * The property of fixed version info, containing file version, product version, etc.
     * (data: `VS_FIXEDFILEINFO`)
     *
     * Although this property is read-only, you can rewrite
     * each child fields directly to apply data.
     */
    get fixedInfo(): VersionFixedInfo;
    /**
     * Returns all languages that the executable supports. (data: `VarFileInfo`)
     *
     * Usually the returned array is equal to the one returned by `getAllLanguagesForStringValues`,
     * but some resource-generating tools doesn't generate same values.
     */
    getAvailableLanguages(): VersionTranslation[];
    /**
     * Replaces all languages that the executable supports.
     */
    replaceAvailableLanguages(languages: readonly VersionTranslation[]): void;
    /**
     * Returns all string values for the specified language. (data: values in lang-charset block of `StringFileInfo`)
     */
    getStringValues(language: VersionTranslation): VersionStringValues;
    /**
     * Returns all languages used by string values. (data: lang-charset name of `StringFileInfo`)
     *
     * Usually the returned array is equal to the one returned by `getAvailableLanguages`,
     * but some resource-generating tools doesn't generate same values.
     */
    getAllLanguagesForStringValues(): VersionTranslation[];
    /**
     * Add or replace the string values.
     * @param language language info
     * @param values string values (key-value pairs)
     * @param addToAvailableLanguage set `true` to add `language` into available languages
     *     if not existing in `getAvailableLanguages()` (default: `true`)
     */
    setStringValues(language: VersionTranslation, values: VersionStringValues, addToAvailableLanguage?: boolean): void;
    /**
     * Add or replace the string value.
     * @param language language info
     * @param key the key name of string value
     * @param value the string value
     * @param addToAvailableLanguage set `true` to add `language` into available languages
     *     if not existing in `getAvailableLanguages()` (default: `true`)
     */
    setStringValue(language: VersionTranslation, key: string, value: string, addToAvailableLanguage?: boolean): void;
    /**
     * Remove all string values for specified language.
     * @param language language info
     * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
     *     if existing in `getAvailableLanguages()` (default: `true`)
     */
    removeAllStringValues(language: VersionTranslation, removeFromAvailableLanguage?: boolean): void;
    /**
     * Remove specified string value for specified language.
     * @param language language info
     * @param key the key name of string value to be removed
     * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
     *     if no more string values exist for `language` (default: `true`)
     */
    removeStringValue(language: VersionTranslation, key: string, removeFromAvailableLanguage?: boolean): void;
    /**
     * Creates `Type.ResourceEntry` object for this instance.
     * Usually `outputToResourceEntries` is suitable for generating resource data
     * into executables, but you can use this method if necessary.
     */
    generateResource(): Type.ResourceEntry;
    /**
     * Generates version info resource data (using `generateResource()`) and emits into `entries` array.
     * If version info resource already exists in `entries`, this method replaces it with the new one.
     * @param entries resource entry array for output
     */
    outputToResourceEntries(entries: Type.ResourceEntry[]): void;
    private getDefaultVersionLang;
    /**
     * Sets 'FileVersion' property with specified values.
     * This methods writes `fixedInfo.fileVersionMS` and `fixedInfo.fileVersionLS` fields,
     * and writes `FileVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
     * @param major The major version (clamped between 0 and 65535)
     * @param minor The minor version (clamped between 0 and 65535)
     * @param micro The micro version (clamped between 0 and 65535; default is 0)
     * @param revision The revision value (clamped between 0 and 65535; default is 0)
     * @param lang The language (default: this.lang -> picked from existings -> 1033)
     * @note
     * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
     */
    setFileVersion(major: number, minor: number, micro?: number, revision?: number, lang?: number): void;
    /**
     * Sets 'FileVersion' property with specified values.
     * This methods writes `fixedInfo.fileVersionMS` and `fixedInfo.fileVersionLS` fields,
     * and writes `FileVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
     * @param version The version string value (should be `x.x.x.x` format; each integer clamped between 0 and 65535)
     * @param lang The language (default: this.lang -> picked from existings -> 1033)
     * @note
     * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
     */
    setFileVersion(version: string, lang?: number): void;
    private setFileVersionImpl;
    /**
     * Sets 'ProductVersion' property with specified values.
     * This methods writes `fixedInfo.productVersionMS` and `fixedInfo.productVersionLS` fields,
     * and writes `ProductVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
     * @param major The major version (clamped between 0 and 65535)
     * @param minor The minor version (clamped between 0 and 65535)
     * @param micro The micro version (clamped between 0 and 65535; default is 0)
     * @param revision The revision value (clamped between 0 and 65535; default is 0)
     * @param lang The language (default: this.lang -> picked from existings -> 1033)
     * @note
     * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
     */
    setProductVersion(major: number, minor: number, micro?: number, revision?: number, lang?: number): void;
    /**
     * Sets 'ProductVersion' property with specified values.
     * This methods writes `fixedInfo.productVersionMS` and `fixedInfo.productVersionLS` fields,
     * and writes `ProductVersion` string with the value `<major>.<minor>.<micro>.<revision>`.
     * @param version The version string value (should be `x.x.x.x` format; each integer clamped between 0 and 65535)
     * @param lang The language (default: this.lang -> picked from existings -> 1033)
     * @note
     * If you want to use 'Neutral' language for the version string, specify `lang` parameter to 0 explicitly
     */
    setProductVersion(version: string, lang?: number): void;
    private setProductVersionImpl;
}
