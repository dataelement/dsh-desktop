import StringTableItem from './StringTableItem.js';
/** Utility class to create / parse String Table resource */
var StringTable = /** @class */ (function () {
    function StringTable() {
        this.lang = 0;
        this.items = [];
    }
    /** Create StringTable instance from resource entries, with specified language. */
    StringTable.fromEntries = function (lang, entries) {
        var r = new StringTable();
        entries.forEach(function (e) {
            // 6: RT_STRING
            if (e.type !== 6 ||
                e.lang !== lang ||
                typeof e.id !== 'number' ||
                e.id <= 0) {
                return;
            }
            r.items[e.id - 1] = StringTableItem.fromEntry(e.bin, 0, e.bin.byteLength);
        });
        r.lang = lang;
        return r;
    };
    /** Return all string entries. */
    StringTable.prototype.getAllStrings = function () {
        return this.items
            .map(function (e, i) {
            return e
                .getAll()
                .map(function (x, j) {
                return x !== null && x !== ''
                    ? { id: (i << 4) + j, text: x }
                    : null;
            })
                .filter(function (x) { return !!x; });
        })
            .reduce(function (p, c) { return p.concat(c); }, []);
    };
    /** Return the string data for ID value, which can be used for Win32API LoadString. */
    StringTable.prototype.getById = function (id) {
        var _a;
        if (id < 0) {
            return null;
        }
        var entryIndex = id >> 4;
        var entryPos = id & 15;
        var e = this.items[entryIndex];
        return (_a = e === null || e === void 0 ? void 0 : e.get(entryPos)) !== null && _a !== void 0 ? _a : null;
    };
    /**
     * Set/overwide the string data for ID value, which can be used for Win32API LoadString.
     * @param id data ID
     * @param text string data (entry will be removed if null or empty string is specified)
     */
    StringTable.prototype.setById = function (id, text) {
        if (id < 0) {
            return;
        }
        var entryIndex = id >> 4;
        var entryPos = id & 15;
        var e = this.items[entryIndex];
        if (!e) {
            this.items[entryIndex] = e = new StringTableItem();
        }
        e.set(entryPos, text);
    };
    /** Generates an array of Entry for resource processings */
    StringTable.prototype.generateEntries = function () {
        var _this = this;
        return this.items
            .map(function (e, i) {
            var len = e.calcByteLength();
            var bin = new ArrayBuffer(len);
            e.generate(bin, 0);
            return {
                type: 6,
                id: i + 1,
                lang: _this.lang,
                codepage: 1200,
                bin: bin,
            };
        })
            .filter(function (e) { return !!e; });
    };
    /**
     * Replace all string entries for NtExecutableResource with containing resource data.
     * The only entries of same language are replaced.
     */
    StringTable.prototype.replaceStringEntriesForExecutable = function (res) {
        var entries = this.generateEntries();
        var dest = res.entries;
        // first try -- replace same type and same language
        for (var i = 0; i < dest.length; ++i) {
            var e = dest[i];
            if (e != null && e.type === 6 && e.lang === this.lang) {
                for (var j = dest.length - 1; j >= i; --j) {
                    var e2 = dest[j];
                    if (e2 != null && e2.type === 6 && e2.lang === this.lang) {
                        dest.splice(j, 1);
                    }
                }
                var f = dest.splice.bind(dest, i, 0);
                f.apply(void 0, entries);
                return;
            }
        }
        // second try -- add entries next to previous language
        for (var i = 0; i < dest.length; ++i) {
            var e = dest[i];
            if (e != null && e.type === 6 && e.lang < this.lang) {
                var f = dest.splice.bind(dest, i + 1, 0);
                f.apply(void 0, entries);
                return;
            }
        }
        // third try -- add entries next to the last 'String' entry
        for (var i = dest.length - 1; i >= 0; --i) {
            var e = dest[i];
            if (e != null && e.type === 6) {
                var f = dest.splice.bind(dest, i + 1, 0);
                f.apply(void 0, entries);
                return;
            }
        }
        // otherwise -- add entries to the last
        dest.push.apply(dest, entries);
    };
    return StringTable;
}());
export default StringTable;
