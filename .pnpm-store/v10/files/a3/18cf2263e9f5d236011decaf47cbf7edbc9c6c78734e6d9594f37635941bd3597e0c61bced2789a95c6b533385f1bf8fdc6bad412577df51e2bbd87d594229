import { NtExecutableResource, Type } from 'pe-library';
/** Utility class to create / parse String Table resource */
export default class StringTable {
    /** Language value */
    lang: string | number;
    private items;
    constructor();
    /** Create StringTable instance from resource entries, with specified language. */
    static fromEntries(lang: string | number, entries: readonly Type.ResourceEntry[]): StringTable;
    /** Return all string entries. */
    getAllStrings(): Array<{
        id: number;
        text: string;
    }>;
    /** Return the string data for ID value, which can be used for Win32API LoadString. */
    getById(id: number): string | null;
    /**
     * Set/overwide the string data for ID value, which can be used for Win32API LoadString.
     * @param id data ID
     * @param text string data (entry will be removed if null or empty string is specified)
     */
    setById(id: number, text: string | null): void;
    /** Generates an array of Entry for resource processings */
    generateEntries(): Type.ResourceEntry[];
    /**
     * Replace all string entries for NtExecutableResource with containing resource data.
     * The only entries of same language are replaced.
     */
    replaceStringEntriesForExecutable(res: NtExecutableResource): void;
}
