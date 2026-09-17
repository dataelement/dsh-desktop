import IconItem from '../data/IconItem.js';
import RawIconItem from '../data/RawIconItem.js';
import { readUint8WithLastOffset, readUint16WithLastOffset, readUint32WithLastOffset, } from '../util/functions.js';
function generateEntryBinary(icons) {
    var count = icons.length;
    if (count > 65535) {
        count = 65535;
    }
    var size = 6 + 14 * icons.length;
    var bin = new ArrayBuffer(size);
    var view = new DataView(bin);
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // icon type
    view.setUint16(4, count, true);
    var offset = 6;
    icons.forEach(function (icon) {
        view.setUint8(offset, icon.width >= 256 ? 0 : icon.width);
        view.setUint8(offset + 1, icon.height >= 256 ? 0 : icon.height);
        view.setUint8(offset + 2, icon.colors >= 256 ? 0 : icon.colors);
        view.setUint8(offset + 3, 0);
        view.setUint16(offset + 4, icon.planes, true);
        view.setUint16(offset + 6, icon.bitCount, true);
        view.setUint32(offset + 8, icon.dataSize, true);
        view.setUint16(offset + 12, icon.iconID, true);
        offset += 14;
    });
    return bin;
}
function findUnusedIconID(entries, lang, isCursor) {
    var type = isCursor ? 1 : 3;
    // (ignore string id)
    var filteredIDs = entries
        .filter(function (e) { return e.type === type && e.lang === lang && typeof e.id === 'number'; })
        .map(function (e) { return e.id; })
        .sort(function (a, b) { return a - b; });
    var idCurrent = 1;
    for (var _i = 0, filteredIDs_1 = filteredIDs; _i < filteredIDs_1.length; _i++) {
        var id = filteredIDs_1[_i];
        if (idCurrent < id) {
            return {
                id: idCurrent,
                last: false,
            };
        }
        else if (idCurrent === id) {
            ++idCurrent;
        }
    }
    return {
        id: idCurrent,
        last: true,
    };
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
var IconGroupEntry = /** @class */ (function () {
    function IconGroupEntry(groupEntry) {
        var view = new DataView(groupEntry.bin);
        var totalSize = view.byteLength;
        var icons = [];
        if (view.getUint16(2, true) === 1) {
            var count = view.getUint16(4, true);
            var offset = 6;
            for (var i = 0; i < count; ++i) {
                icons.push({
                    width: readUint8WithLastOffset(view, offset, totalSize),
                    height: readUint8WithLastOffset(view, offset + 1, totalSize),
                    colors: readUint8WithLastOffset(view, offset + 2, totalSize),
                    planes: readUint16WithLastOffset(view, offset + 4, totalSize),
                    bitCount: readUint16WithLastOffset(view, offset + 6, totalSize),
                    dataSize: readUint32WithLastOffset(view, offset + 8, totalSize),
                    iconID: readUint16WithLastOffset(view, offset + 12, totalSize),
                });
                offset += 14; // 16 for .ico file, but 14 for resource data
            }
        }
        this.id = groupEntry.id;
        this.lang = groupEntry.lang;
        this.icons = icons;
    }
    IconGroupEntry.fromEntries = function (entries) {
        return entries
            .filter(function (e) { return e.type === 14; })
            .map(function (e) { return new IconGroupEntry(e); });
    };
    IconGroupEntry.prototype.generateEntry = function () {
        var bin = generateEntryBinary(this.icons);
        return {
            type: 14,
            id: this.id,
            lang: this.lang,
            codepage: 0,
            bin: bin,
        };
    };
    /**
     * Return an array of `IconItem` / `RawIconItem`, which are in the group of this `IconGroupEntry` instance,
     * from specified resource entries.
     */
    IconGroupEntry.prototype.getIconItemsFromEntries = function (entries) {
        var _this = this;
        return entries
            .map(function (e) {
            if (e.type !== 3 || e.lang !== _this.lang) {
                return null;
            }
            var c = _this.icons
                .filter(function (icon) { return e.id === icon.iconID; })
                .shift();
            if (!c) {
                return null;
            }
            return {
                entry: e,
                icon: c,
            };
        })
            .filter(function (item) { return !!item; })
            .map(function (item) {
            var bin = item.entry.bin;
            var view = new DataView(bin);
            if (view.getUint32(0, true) === 0x28) {
                return IconItem.from(bin);
            }
            else {
                var c = item.icon;
                return RawIconItem.from(bin, c.width, c.height, c.bitCount);
            }
        });
    };
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
    IconGroupEntry.replaceIconsForResource = function (destEntries, iconGroupID, lang, icons) {
        // find existing entry
        var entry = destEntries
            .filter(function (e) { return e.type === 14 && e.id === iconGroupID && e.lang === lang; })
            .shift();
        var tmpIconArray = icons.map(function (icon) {
            if (icon.isIcon()) {
                var width = icon.width, height = icon.height;
                if (width === null) {
                    width = icon.bitmapInfo.width;
                }
                if (height === null) {
                    height = icon.bitmapInfo.height;
                    // if mask is specified, the icon height must be the half of bitmap height
                    if (icon.masks !== null) {
                        height = Math.floor(height / 2);
                    }
                }
                return {
                    base: icon,
                    bm: {
                        width: width,
                        height: height,
                        planes: icon.bitmapInfo.planes,
                        bitCount: icon.bitmapInfo.bitCount,
                    },
                    bin: icon.generate(),
                    id: 0,
                };
            }
            else {
                return {
                    base: icon,
                    bm: {
                        width: icon.width,
                        height: icon.height,
                        planes: 1,
                        bitCount: icon.bitCount,
                    },
                    bin: icon.bin,
                    id: 0,
                };
            }
        });
        if (entry) {
            // remove unused icon data
            for (var i = destEntries.length - 1; i >= 0; --i) {
                var e = destEntries[i];
                if (e != null && e.type === 3) {
                    // RT_ICON
                    if (!isIconUsed(e, destEntries, entry)) {
                        destEntries.splice(i, 1);
                    }
                }
            }
        }
        else {
            // create new entry
            entry = {
                type: 14,
                id: iconGroupID,
                lang: lang,
                codepage: 0,
                // set later
                bin: null,
            };
            destEntries.push(entry);
        }
        // append icons
        var idInfo;
        tmpIconArray.forEach(function (icon) {
            if (!(idInfo === null || idInfo === void 0 ? void 0 : idInfo.last)) {
                idInfo = findUnusedIconID(destEntries, lang, false);
            }
            else {
                ++idInfo.id;
            }
            destEntries.push({
                type: 3,
                id: idInfo.id,
                lang: lang,
                codepage: 0,
                bin: icon.bin,
            });
            // set 'id' field to use in generateEntryBinary
            icon.id = idInfo.id;
        });
        var binEntry = generateEntryBinary(tmpIconArray.map(function (icon) {
            var width = Math.abs(icon.bm.width);
            if (width >= 256) {
                width = 0;
            }
            var height = Math.abs(icon.bm.height);
            if (height >= 256) {
                height = 0;
            }
            var colors = 0;
            if (icon.base.isIcon()) {
                var bmBase = icon.base.bitmapInfo;
                colors = bmBase.colorUsed || bmBase.colors.length;
                if (!colors) {
                    switch (bmBase.bitCount) {
                        case 1:
                            colors = 2;
                            break;
                        case 4:
                            colors = 16;
                            break;
                        // case 8:
                        // 	colors = 256;
                        // 	break;
                    }
                }
                if (colors >= 256) {
                    colors = 0;
                }
            }
            return {
                width: width,
                height: height,
                colors: colors,
                planes: icon.bm.planes,
                bitCount: icon.bm.bitCount,
                dataSize: icon.bin.byteLength,
                iconID: icon.id,
            };
        }));
        // rewrite entry
        entry.bin = binEntry;
        function isIconUsed(icon, allEntries, excludeGroup) {
            return allEntries.some(function (e) {
                if (e.type !== 14 ||
                    (e.id === excludeGroup.id && e.lang === excludeGroup.lang)) {
                    return false;
                }
                var g = new IconGroupEntry(e);
                return g.icons.some(function (c) {
                    return c.iconID === icon.id;
                });
            });
        }
    };
    return IconGroupEntry;
}());
export default IconGroupEntry;
