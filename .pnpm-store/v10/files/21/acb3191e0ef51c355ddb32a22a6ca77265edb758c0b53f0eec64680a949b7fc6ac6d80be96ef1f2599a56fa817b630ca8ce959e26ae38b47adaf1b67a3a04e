var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
import { spawn, ExitCodeError } from '@malept/cross-spawn-promise';
import * as fs from 'fs-extra';
import * as path from 'path';
import { promises as stream } from 'node:stream';
const MACHO_PREFIX = 'Mach-O ';
export var AppFileType;
(function (AppFileType) {
    AppFileType[AppFileType["MACHO"] = 0] = "MACHO";
    AppFileType[AppFileType["PLAIN"] = 1] = "PLAIN";
    AppFileType[AppFileType["INFO_PLIST"] = 2] = "INFO_PLIST";
    AppFileType[AppFileType["SNAPSHOT"] = 3] = "SNAPSHOT";
    AppFileType[AppFileType["APP_CODE"] = 4] = "APP_CODE";
})(AppFileType || (AppFileType = {}));
/**
 *
 * @param appPath Path to the application
 */
export const getAllAppFiles = async (appPath) => {
    const files = [];
    const visited = new Set();
    const traverse = async (p) => {
        p = await fs.realpath(p);
        if (visited.has(p))
            return;
        visited.add(p);
        const info = await fs.stat(p);
        if (info.isSymbolicLink())
            return;
        if (info.isFile()) {
            let fileType = AppFileType.PLAIN;
            var fileOutput = '';
            try {
                fileOutput = await spawn('file', ['--brief', '--no-pad', p]);
            }
            catch (e) {
                if (e instanceof ExitCodeError) {
                    /* silently accept error codes from "file" */
                }
                else {
                    throw e;
                }
            }
            if (p.endsWith('.asar')) {
                fileType = AppFileType.APP_CODE;
            }
            else if (fileOutput.startsWith(MACHO_PREFIX)) {
                fileType = AppFileType.MACHO;
            }
            else if (p.endsWith('.bin')) {
                fileType = AppFileType.SNAPSHOT;
            }
            else if (path.basename(p) === 'Info.plist') {
                fileType = AppFileType.INFO_PLIST;
            }
            files.push({
                relativePath: path.relative(appPath, p),
                type: fileType,
            });
        }
        if (info.isDirectory()) {
            for (const child of await fs.readdir(p)) {
                await traverse(path.resolve(p, child));
            }
        }
    };
    await traverse(appPath);
    return files;
};
export const readMachOHeader = async (path) => {
    const chunks = [];
    // no need to read the entire file, we only need the first 4 bytes of the file to determine the header
    await stream.pipeline(fs.createReadStream(path, { start: 0, end: 3 }), function (source) {
        return __asyncGenerator(this, arguments, function* () {
            var _a, e_1, _b, _c;
            try {
                for (var _d = true, source_1 = __asyncValues(source), source_1_1; source_1_1 = yield __await(source_1.next()), _a = source_1_1.done, !_a; _d = true) {
                    _c = source_1_1.value;
                    _d = false;
                    const chunk = _c;
                    chunks.push(chunk);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = source_1.return)) yield __await(_b.call(source_1));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    });
    return Buffer.concat(chunks);
};
//# sourceMappingURL=file-utils.js.map