import { Type } from 'pe-library';
import IconItem from '../data/IconItem.js';
import RawIconItem from '../data/RawIconItem.js';
export interface IconGroupItem {
    width: number;
    height: number;
    colors: number;
    planes: number;
    bitCount: number;
    dataSize: number;
    iconID: number;
}
/**
 * A class that treats icon-group resource data (`RT_ICON_GROUP`).
 * Note that this class does not treat `RT_ICON` data.
 *
 * - To pick all icons, use `IconGroupEntry.fromEntries`
 *   and `IconGroupEntry.prototype.getIconItemsFromEntries`.
 * - The easiest way to add/replace icons is using `IconGroupEntry.replaceIconsForResource`,
 *   which treats both `RT_ICON_GROUP` and `RT_ICON` entries.
 */
export default class IconGroupEntry {
    id: string | number;
    lang: string | number;
    readonly icons: IconGroupItem[];
    private constructor();
    static fromEntries(entries: readonly Type.ResourceEntry[]): IconGroupEntry[];
    generateEntry(): Type.ResourceEntry;
    /**
     * Return an array of `IconItem` / `RawIconItem`, which are in the group of this `IconGroupEntry` instance,
     * from specified resource entries.
     */
    getIconItemsFromEntries(entries: readonly Type.ResourceEntry[]): Array<IconItem | RawIconItem>;
    /**
     * Add or replace icon resource entries with specified icon data.
     * The IDs of individual icon resources (`RT_ICON`) are calculated automatically.
     * @param destEntries base (destination) resource entries.
     * @param iconGroupID the icon ID for the new resource data.
     *     If the icon-group resource of the ID and 'lang' value already exists,
     *     the resource data is replaced; otherwise the resource data is appended.
     * @param lang the language for specified icons (0 for neutral, 0x409 for en-US)
     * @param icons the icons to replace
     */
    static replaceIconsForResource(destEntries: Type.ResourceEntry[], iconGroupID: string | number, lang: string | number, icons: Array<IconItem | RawIconItem>): void;
}
