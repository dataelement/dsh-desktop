import { allocatePartialBinary, cloneObject, copyBuffer, readUint32WithLastOffset, roundUp, } from '../util/functions.js';
function readStringToNullChar(view, offset, last) {
    var r = '';
    while (offset + 2 <= last) {
        var c = view.getUint16(offset, true);
        if (!c) {
            break;
        }
        r += String.fromCharCode(c);
        offset += 2;
    }
    return r;
}
function writeStringWithNullChar(view, offset, value) {
    for (var i = 0; i < value.length; ++i) {
        view.setUint16(offset, value.charCodeAt(i), true);
        offset += 2;
    }
    view.setUint16(offset, 0, true);
    return offset + 2;
}
function createFixedInfo() {
    return {
        fileVersionMS: 0,
        fileVersionLS: 0,
        productVersionMS: 0,
        productVersionLS: 0,
        fileFlagsMask: 0,
        fileFlags: 0,
        fileOS: 0,
        fileType: 0,
        fileSubtype: 0,
        fileDateMS: 0,
        fileDateLS: 0,
    };
}
////////////////////////////////////////////////////////////////////////////////
// parsings
// returns offset and structure
function parseStringTable(view, offset, last) {
    var tableLen = view.getUint16(offset, true);
    var valueLen = view.getUint16(offset + 2, true);
    if (offset + tableLen < last) {
        last = offset + tableLen;
    }
    // value type check is not needed; because no value is needed
    var tableName = readStringToNullChar(view, offset + 6, last);
    offset += roundUp(6 + 2 * (tableName.length + 1), 4);
    var langAndCp = parseInt(tableName, 16);
    if (isNaN(langAndCp)) {
        throw new Error('Invalid StringTable data format');
    }
    // this should be zero
    offset += roundUp(valueLen, 4);
    var r = {
        lang: Math.floor(langAndCp / 0x10000),
        codepage: langAndCp & 0xffff,
        values: {},
    };
    while (offset < last) {
        // String structure
        var childDataLen = view.getUint16(offset, true);
        var childValueLen = view.getUint16(offset + 2, true);
        // value type must be string; if not, skip it
        if (view.getUint16(offset + 4, true) !== 1) {
            offset += childDataLen;
            continue;
        }
        var childDataLast = offset + childDataLen;
        if (childDataLast > last) {
            childDataLast = last;
        }
        var name_1 = readStringToNullChar(view, offset + 6, childDataLast);
        offset = roundUp(offset + 6 + 2 * (name_1.length + 1), 4);
        var childValueLast = offset + childValueLen * 2;
        if (childValueLast > childDataLast) {
            childValueLast = childDataLast;
        }
        var value = readStringToNullChar(view, offset, childValueLast);
        offset = roundUp(childValueLast, 4);
        r.values[name_1] = value;
    }
    // return 'last' instead of 'offset'
    return [last, r];
}
function parseStringFileInfo(view, offset, last) {
    var valueLen = view.getUint16(offset + 2, true);
    // value type check is not needed; because no value is needed
    offset += 36; // roundUp(6 + ByteLenWithNull(L'StringFileInfo'), 4)
    // this should be zero
    offset += roundUp(valueLen, 4);
    var r = [];
    var _loop_1 = function () {
        // StringTable structure
        var childData = parseStringTable(view, offset, last);
        var table = childData[1];
        var a = r.filter(function (e) { return e.lang === table.lang && e.codepage === table.codepage; });
        if (a.length === 0) {
            r.push(table);
        }
        else {
            // merge values
            for (var key in table.values) {
                var value = table.values[key];
                if (value != null) {
                    a[0].values[key] = value;
                }
            }
        }
        offset = roundUp(childData[0], 4);
    };
    while (offset < last) {
        _loop_1();
    }
    return r;
}
function parseVarFileInfo(view, offset, last) {
    var valueLen = view.getUint16(offset + 2, true);
    // value type check is not needed; because no value is needed
    offset += 32; // roundUp(6 + ByteLenWithNull(L'VarFileInfo'), 4)
    // this should be zero
    offset += roundUp(valueLen, 4);
    var r = [];
    while (offset < last) {
        // Var structure
        var childDataLen = view.getUint16(offset, true);
        var childValueLen = view.getUint16(offset + 2, true);
        // value type must be binary; if not, skip it
        if (view.getUint16(offset + 4, true) !== 0) {
            offset += roundUp(childDataLen, 4);
            continue;
        }
        var childDataLast = offset + childDataLen;
        if (childDataLast > last) {
            childDataLast = last;
        }
        var name_2 = readStringToNullChar(view, offset + 6, childDataLast);
        offset = roundUp(offset + 6 + 2 * (name_2.length + 1), 4);
        if (name_2 !== 'Translation' || childValueLen % 4 !== 0) {
            // unknown entry
            offset = roundUp(childDataLast, 4);
            continue;
        }
        var _loop_2 = function (child) {
            if (offset + 4 > childDataLast) {
                return "break";
            }
            var lang = view.getUint16(offset, true);
            var codepage = view.getUint16(offset + 2, true);
            offset += 4;
            if (r.filter(function (e) { return e.lang === lang && e.codepage === codepage; })
                .length === 0) {
                r.push({ lang: lang, codepage: codepage });
            }
        };
        for (var child = 0; child < childValueLen; child += 4) {
            var state_1 = _loop_2(child);
            if (state_1 === "break")
                break;
        }
        offset = roundUp(childDataLast, 4);
    }
    return r;
}
function parseVersionEntry(view, entry) {
    var totalLen = view.getUint16(0, true);
    var dataLen = view.getUint16(2, true);
    // value type must be binary
    if (view.getUint16(4, true) !== 0) {
        throw new Error('Invalid version data format');
    }
    // 40 === roundUp(6 + ByteLenWithNull(L'VS_VERSION_INFO'), 4)
    if (totalLen < dataLen + 40) {
        throw new Error('Invalid version data format');
    }
    if (readStringToNullChar(view, 6, totalLen) !== 'VS_VERSION_INFO') {
        throw new Error('Invalid version data format');
    }
    var d = {
        lang: entry.lang,
        fixedInfo: createFixedInfo(),
        strings: [],
        translations: [],
        unknowns: [],
    };
    var offset = 38; // without padding
    if (dataLen) {
        dataLen += 40; // with padding
        var sig = readUint32WithLastOffset(view, 40, dataLen);
        var sVer = readUint32WithLastOffset(view, 44, dataLen);
        // check signature
        if (sig === 0xfeef04bd && sVer <= 0x10000) {
            d.fixedInfo = {
                fileVersionMS: readUint32WithLastOffset(view, 48, dataLen),
                fileVersionLS: readUint32WithLastOffset(view, 52, dataLen),
                productVersionMS: readUint32WithLastOffset(view, 56, dataLen),
                productVersionLS: readUint32WithLastOffset(view, 60, dataLen),
                fileFlagsMask: readUint32WithLastOffset(view, 64, dataLen),
                fileFlags: readUint32WithLastOffset(view, 68, dataLen),
                fileOS: readUint32WithLastOffset(view, 72, dataLen),
                fileType: readUint32WithLastOffset(view, 76, dataLen),
                fileSubtype: readUint32WithLastOffset(view, 80, dataLen),
                fileDateMS: readUint32WithLastOffset(view, 84, dataLen),
                fileDateLS: readUint32WithLastOffset(view, 88, dataLen),
            };
        }
        offset = dataLen;
    }
    offset = roundUp(offset, 4);
    // parse children
    while (offset < totalLen) {
        var childLen = view.getUint16(offset, true);
        var childLast = offset + childLen;
        // failsafe
        if (childLast > totalLen) {
            childLast = totalLen;
        }
        var name_3 = readStringToNullChar(view, offset + 6, childLast);
        switch (name_3) {
            case 'StringFileInfo':
                d.strings = d.strings.concat(parseStringFileInfo(view, offset, childLast));
                break;
            case 'VarFileInfo':
                d.translations = d.translations.concat(parseVarFileInfo(view, offset, childLast));
                break;
            default:
                // unknown or unsupported type
                d.unknowns.push({
                    name: name_3,
                    entireBin: allocatePartialBinary(view, offset, childLen),
                });
                break;
        }
        offset += roundUp(childLen, 4);
    }
    return d;
}
////////////////////////////////////////////////////////////////////////////////
// serializings
function generateStringTable(table) {
    // estimate size
    var size = 24; // roundUp(6 + ByteLenWithNull(L'xxxxxxxx'), 4)
    var keys = Object.keys(table.values);
    size = keys.reduce(function (prev, key) {
        var value = table.values[key];
        if (value == null) {
            return prev;
        }
        var childHeaderSize = roundUp(6 + 2 * (key.length + 1), 4);
        var newSize = roundUp(prev + childHeaderSize + 2 * (value.length + 1), 4);
        // limit to 65532 because the table size is restricted to 16-bit value
        return newSize > 65532 ? prev : newSize;
    }, size);
    // generate binary
    var bin = new ArrayBuffer(size);
    var view = new DataView(bin);
    view.setUint16(0, size, true);
    view.setUint16(2, 0, true); // no value length
    view.setUint16(4, 1, true);
    var langAndCp = ((table.lang & 0xffff) * 0x10000 +
        (table.codepage & 0xffff))
        .toString(16)
        .toLowerCase();
    // fixed length
    if (langAndCp.length < 8) {
        var l = 8 - langAndCp.length;
        langAndCp = '00000000'.substr(0, l) + langAndCp;
    }
    var offset = roundUp(writeStringWithNullChar(view, 6, langAndCp), 4);
    keys.forEach(function (key) {
        var value = table.values[key];
        if (value == null) {
            return;
        }
        var childHeaderSize = roundUp(6 + 2 * (key.length + 1), 4);
        var newSize = roundUp(childHeaderSize + 2 * (value.length + 1), 4);
        if (offset + newSize <= 65532) {
            view.setUint16(offset, newSize, true);
            view.setUint16(offset + 2, value.length + 1, true); // value length is in character count
            view.setUint16(offset + 4, 1, true);
            offset = roundUp(writeStringWithNullChar(view, offset + 6, key), 4);
            offset = roundUp(writeStringWithNullChar(view, offset, value), 4);
        }
    });
    return bin;
}
function generateStringTableInfo(tables) {
    // estimate size
    var size = 36; // roundUp(6 + ByteLenWithNull(L'StringFileInfo'), 4)
    var tableBins = tables.map(function (table) { return generateStringTable(table); });
    // (all table sizes are rounded up)
    size += tableBins.reduce(function (p, c) { return p + c.byteLength; }, 0);
    var bin = new ArrayBuffer(size);
    var view = new DataView(bin);
    view.setUint16(0, size, true);
    view.setUint16(2, 0, true); // no value length
    view.setUint16(4, 1, true);
    var offset = roundUp(writeStringWithNullChar(view, 6, 'StringFileInfo'), 4);
    tableBins.forEach(function (table) {
        var len = table.byteLength;
        copyBuffer(bin, offset, table, 0, len);
        offset += len;
    });
    return bin;
}
function generateVarFileInfo(translations) {
    // estimate size
    var size = 32; // roundUp(6 + ByteLenWithNull(L'VarFileInfo'), 4)
    // (translation data is fixed length)
    var translationsValueSize = translations.length * 4;
    size += 32 + translationsValueSize;
    var bin = new ArrayBuffer(size);
    var view = new DataView(bin);
    view.setUint16(0, size, true);
    view.setUint16(2, 0, true); // no value length
    view.setUint16(4, 1, true);
    var offset = roundUp(writeStringWithNullChar(view, 6, 'VarFileInfo'), 4);
    view.setUint16(offset, 32 + translationsValueSize, true);
    view.setUint16(offset + 2, translationsValueSize, true);
    view.setUint16(offset + 4, 0, true);
    offset = roundUp(writeStringWithNullChar(view, offset + 6, 'Translation'), 4);
    translations.forEach(function (translation) {
        view.setUint16(offset, translation.lang, true);
        view.setUint16(offset + 2, translation.codepage, true);
        offset += 4;
    });
    return bin;
}
function generateVersionEntryBinary(entry) {
    var size = 92; // roundUp(6 + ByteLenWithNull(L'VS_VERSION_INFO'), 4) + 52 (sizeof VS_FIXEDFILEINFO)
    var stringTableInfoBin = generateStringTableInfo(entry.strings);
    var stringTableInfoLen = stringTableInfoBin.byteLength;
    size += stringTableInfoLen;
    var varFileInfoBin = generateVarFileInfo(entry.translations);
    var varFileInfoLen = varFileInfoBin.byteLength;
    size += varFileInfoLen;
    size = entry.unknowns.reduce(function (p, data) { return p + roundUp(data.entireBin.byteLength, 4); }, size);
    var bin = new ArrayBuffer(size);
    var view = new DataView(bin);
    view.setUint16(0, size, true);
    view.setUint16(2, 52, true);
    view.setUint16(4, 0, true); // value is binary
    var offset = roundUp(writeStringWithNullChar(view, 6, 'VS_VERSION_INFO'), 4);
    view.setUint32(offset, 0xfeef04bd, true); // signature
    view.setUint32(offset + 4, 0x10000, true); // structure version
    view.setUint32(offset + 8, entry.fixedInfo.fileVersionMS, true);
    view.setUint32(offset + 12, entry.fixedInfo.fileVersionLS, true);
    view.setUint32(offset + 16, entry.fixedInfo.productVersionMS, true);
    view.setUint32(offset + 20, entry.fixedInfo.productVersionLS, true);
    view.setUint32(offset + 24, entry.fixedInfo.fileFlagsMask, true);
    view.setUint32(offset + 28, entry.fixedInfo.fileFlags, true);
    view.setUint32(offset + 32, entry.fixedInfo.fileOS, true);
    view.setUint32(offset + 36, entry.fixedInfo.fileType, true);
    view.setUint32(offset + 40, entry.fixedInfo.fileSubtype, true);
    view.setUint32(offset + 44, entry.fixedInfo.fileDateMS, true);
    view.setUint32(offset + 48, entry.fixedInfo.fileDateLS, true);
    offset += 52;
    copyBuffer(bin, offset, stringTableInfoBin, 0, stringTableInfoLen);
    offset += stringTableInfoLen;
    copyBuffer(bin, offset, varFileInfoBin, 0, varFileInfoLen);
    offset += varFileInfoLen;
    entry.unknowns.forEach(function (e) {
        var len = e.entireBin.byteLength;
        copyBuffer(bin, offset, e.entireBin, 0, len);
        offset += roundUp(len, 4);
    });
    return bin;
}
////////////////////////////////////////////////////////////////////////////////
function clampInt(val, min, max) {
    if (isNaN(val) || val < min) {
        return min;
    }
    else if (val >= max) {
        return max;
    }
    return Math.floor(val);
}
function parseVersionArguments(arg1, arg2, arg3, arg4, arg5) {
    var _a;
    var major;
    var minor;
    var micro;
    var revision;
    var lang;
    if (typeof arg1 === 'string' &&
        (typeof arg2 === 'undefined' || typeof arg2 === 'number') &&
        typeof arg3 === 'undefined') {
        _a = arg1
            .split('.')
            .map(function (token) { return clampInt(Number(token), 0, 65535); })
            // add zeros for missing fields
            .concat(0, 0, 0), major = _a[0], minor = _a[1], micro = _a[2], revision = _a[3];
        lang = arg2;
    }
    else {
        major = clampInt(Number(arg1), 0, 65535);
        minor = clampInt(Number(arg2), 0, 65535);
        micro = clampInt(typeof arg3 === 'undefined' ? 0 : Number(arg3), 0, 65535);
        revision = clampInt(typeof arg4 === 'undefined' ? 0 : Number(arg4), 0, 65535);
        lang = arg5;
    }
    return [major, minor, micro, revision, lang];
}
////////////////////////////////////////////////////////////////////////////////
/**
 * Treats 'Version information' (`VS_VERSIONINFO`) resource data.
 */
var VersionInfo = /** @class */ (function () {
    function VersionInfo(entry) {
        if (!entry) {
            this.data = {
                lang: 0,
                fixedInfo: createFixedInfo(),
                strings: [],
                translations: [],
                unknowns: [],
            };
        }
        else {
            var view = new DataView(entry.bin);
            this.data = parseVersionEntry(view, entry);
        }
    }
    /** Returns new `VersionInfo` instance with empty data. */
    VersionInfo.createEmpty = function () {
        return new VersionInfo();
    };
    VersionInfo.create = function (arg1, fixedInfo, strings) {
        var lang;
        if (typeof arg1 === 'object') {
            lang = arg1.lang;
            fixedInfo = arg1.fixedInfo;
            strings = arg1.strings;
        }
        else {
            lang = arg1;
        }
        var vi = new VersionInfo();
        vi.data.lang = lang;
        // copy all specified values
        // (if unspecified, use default value set by `createFixedInfo`)
        for (var _fixedInfoKey in fixedInfo) {
            var fixedInfoKey = _fixedInfoKey;
            if (fixedInfoKey in fixedInfo) {
                var value = fixedInfo[fixedInfoKey];
                if (value != null) {
                    vi.data.fixedInfo[fixedInfoKey] = value;
                }
            }
        }
        vi.data.strings = strings.map(function (_a) {
            var lang = _a.lang, codepage = _a.codepage, values = _a.values;
            return ({
                lang: lang,
                codepage: codepage,
                values: cloneObject(values),
            });
        });
        vi.data.translations = strings.map(function (_a) {
            var lang = _a.lang, codepage = _a.codepage;
            return ({ lang: lang, codepage: codepage });
        });
        return vi;
    };
    /** Pick up all version-info entries */
    VersionInfo.fromEntries = function (entries) {
        return entries
            .filter(function (e) { return e.type === 16; })
            .map(function (e) { return new VersionInfo(e); });
    };
    Object.defineProperty(VersionInfo.prototype, "lang", {
        /** A language value for this resource entry. */
        get: function () {
            return this.data.lang;
        },
        set: function (value) {
            this.data.lang = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(VersionInfo.prototype, "fixedInfo", {
        /**
         * The property of fixed version info, containing file version, product version, etc.
         * (data: `VS_FIXEDFILEINFO`)
         *
         * Although this property is read-only, you can rewrite
         * each child fields directly to apply data.
         */
        get: function () {
            return this.data.fixedInfo;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Returns all languages that the executable supports. (data: `VarFileInfo`)
     *
     * Usually the returned array is equal to the one returned by `getAllLanguagesForStringValues`,
     * but some resource-generating tools doesn't generate same values.
     */
    VersionInfo.prototype.getAvailableLanguages = function () {
        return this.data.translations.slice(0);
    };
    /**
     * Replaces all languages that the executable supports.
     */
    VersionInfo.prototype.replaceAvailableLanguages = function (languages) {
        this.data.translations = languages.slice(0);
    };
    /**
     * Returns all string values for the specified language. (data: values in lang-charset block of `StringFileInfo`)
     */
    VersionInfo.prototype.getStringValues = function (language) {
        var a = this.data.strings
            .filter(function (e) {
            return e.lang === language.lang && e.codepage === language.codepage;
        })
            .map(function (e) { return e.values; });
        return a.length > 0 ? a[0] : {};
    };
    /**
     * Returns all languages used by string values. (data: lang-charset name of `StringFileInfo`)
     *
     * Usually the returned array is equal to the one returned by `getAvailableLanguages`,
     * but some resource-generating tools doesn't generate same values.
     */
    VersionInfo.prototype.getAllLanguagesForStringValues = function () {
        return this.data.strings.map(function (_a) {
            var codepage = _a.codepage, lang = _a.lang;
            return ({ codepage: codepage, lang: lang });
        });
    };
    /**
     * Add or replace the string values.
     * @param language language info
     * @param values string values (key-value pairs)
     * @param addToAvailableLanguage set `true` to add `language` into available languages
     *     if not existing in `getAvailableLanguages()` (default: `true`)
     */
    VersionInfo.prototype.setStringValues = function (language, values, addToAvailableLanguage) {
        if (addToAvailableLanguage === void 0) { addToAvailableLanguage = true; }
        var a = this.data.strings.filter(function (e) { return e.lang === language.lang && e.codepage === language.codepage; });
        var table;
        if (a.length === 0) {
            table = {
                lang: language.lang,
                codepage: language.codepage,
                values: {},
            };
            this.data.strings.push(table);
        }
        else {
            table = a[0];
        }
        for (var key in values) {
            var value = values[key];
            if (value != null) {
                table.values[key] = value;
            }
        }
        if (addToAvailableLanguage) {
            // if no translation is available, then add it
            var t = this.data.translations.filter(function (e) {
                return e.lang === language.lang && e.codepage === language.codepage;
            });
            if (t.length === 0) {
                this.data.translations.push({
                    lang: language.lang,
                    codepage: language.codepage,
                });
            }
        }
    };
    /**
     * Add or replace the string value.
     * @param language language info
     * @param key the key name of string value
     * @param value the string value
     * @param addToAvailableLanguage set `true` to add `language` into available languages
     *     if not existing in `getAvailableLanguages()` (default: `true`)
     */
    VersionInfo.prototype.setStringValue = function (language, key, value, addToAvailableLanguage) {
        var _a;
        if (addToAvailableLanguage === void 0) { addToAvailableLanguage = true; }
        this.setStringValues(language, (_a = {}, _a[key] = value, _a), addToAvailableLanguage);
    };
    /**
     * Remove all string values for specified language.
     * @param language language info
     * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
     *     if existing in `getAvailableLanguages()` (default: `true`)
     */
    VersionInfo.prototype.removeAllStringValues = function (language, removeFromAvailableLanguage) {
        if (removeFromAvailableLanguage === void 0) { removeFromAvailableLanguage = true; }
        var strings = this.data.strings;
        var len = strings.length;
        for (var i = 0; i < len; ++i) {
            var e = strings[i];
            if (e != null &&
                e.lang === language.lang &&
                e.codepage === language.codepage) {
                strings.splice(i, 1);
                if (removeFromAvailableLanguage) {
                    var translations = this.data.translations;
                    for (var j = 0; j < translations.length; j++) {
                        var t = translations[j];
                        if (t != null &&
                            t.lang === language.lang &&
                            t.codepage === language.codepage) {
                            translations.splice(j, 1);
                            break;
                        }
                    }
                }
                break;
            }
        }
    };
    /**
     * Remove specified string value for specified language.
     * @param language language info
     * @param key the key name of string value to be removed
     * @param removeFromAvailableLanguage set `true` to remove `language` from available languages
     *     if no more string values exist for `language` (default: `true`)
     */
    VersionInfo.prototype.removeStringValue = function (language, key, removeFromAvailableLanguage) {
        if (removeFromAvailableLanguage === void 0) { removeFromAvailableLanguage = true; }
        var strings = this.data.strings;
        var len = strings.length;
        for (var i = 0; i < len; ++i) {
            var e = strings[i];
            if (e != null &&
                e.lang === language.lang &&
                e.codepage === language.codepage) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                    delete e.values[key];
                }
                catch (_ex) { }
                if (removeFromAvailableLanguage &&
                    Object.keys(e.values).length === 0) {
                    // if no entries are left, remove table and translations
                    strings.splice(i, 1);
                    var translations = this.data.translations;
                    for (var j = 0; j < translations.length; j++) {
                        var t = translations[j];
                        if (t != null &&
                            t.lang === language.lang &&
                            t.codepage === language.codepage) {
                            translations.splice(j, 1);
                            break;
                        }
                    }
                }
                break;
            }
        }
    };
    /**
     * Creates `Type.ResourceEntry` object for this instance.
     * Usually `outputToResourceEntries` is suitable for generating resource data
     * into executables, but you can use this method if necessary.
     */
    VersionInfo.prototype.generateResource = function () {
        var bin = generateVersionEntryBinary(this.data);
        return {
            type: 16,
            id: 1,
            lang: this.lang,
            codepage: 1200,
            bin: bin,
        };
    };
    /**
     * Generates version info resource data (using `generateResource()`) and emits into `entries` array.
     * If version info resource already exists in `entries`, this method replaces it with the new one.
     * @param entries resource entry array for output
     */
    VersionInfo.prototype.outputToResourceEntries = function (entries) {
        var res = this.generateResource();
        var len = entries.length;
        for (var i = 0; i < len; ++i) {
            var e = entries[i];
            if (e != null &&
                e.type === 16 &&
                e.id === res.id &&
                e.lang === res.lang) {
                entries[i] = res;
                return;
            }
        }
        entries.push(res);
    };
    // utility methods
    VersionInfo.prototype.getDefaultVersionLang = function (propName) {
        // first, use `this.lang` if it is a numeric value
        var num = Number(this.lang);
        if (this.lang !== '' && !isNaN(num)) {
            return num;
        }
        // second, use lang value for propName if there is only one language
        var a = this.data.strings
            .filter(function (e) { return propName in e.values && e.values[propName] != null; })
            .map(function (e) { return e.lang; });
        if (a.length === 1) {
            return a[0];
        }
        // use English language
        return 1033;
    };
    VersionInfo.prototype.setFileVersion = function (arg1, arg2, arg3, arg4, arg5) {
        this.setFileVersionImpl.apply(this, parseVersionArguments(arg1, arg2, arg3, arg4, arg5));
    };
    VersionInfo.prototype.setFileVersionImpl = function (major, minor, micro, revision, lang) {
        lang =
            typeof lang !== 'undefined'
                ? lang
                : this.getDefaultVersionLang('FileVersion');
        this.fixedInfo.fileVersionMS = (major << 16) | minor;
        this.fixedInfo.fileVersionLS = (micro << 16) | revision;
        this.setStringValue({ lang: lang, codepage: 1200 }, 'FileVersion', major + "." + minor + "." + micro + "." + revision, true);
    };
    VersionInfo.prototype.setProductVersion = function (arg1, arg2, arg3, arg4, arg5) {
        this.setProductVersionImpl.apply(this, parseVersionArguments(arg1, arg2, arg3, arg4, arg5));
    };
    VersionInfo.prototype.setProductVersionImpl = function (major, minor, micro, revision, lang) {
        lang =
            typeof lang !== 'undefined'
                ? lang
                : this.getDefaultVersionLang('ProductVersion');
        this.fixedInfo.productVersionMS = (major << 16) | minor;
        this.fixedInfo.productVersionLS = (micro << 16) | revision;
        this.setStringValue({ lang: lang, codepage: 1200 }, 'ProductVersion', major + "." + minor + "." + micro + "." + revision, true);
    };
    return VersionInfo;
}());
export default VersionInfo;
