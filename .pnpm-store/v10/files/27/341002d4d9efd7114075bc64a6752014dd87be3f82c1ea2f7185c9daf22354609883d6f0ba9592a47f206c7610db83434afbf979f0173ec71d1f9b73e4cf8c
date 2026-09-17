"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeData = computeData;
const builder_util_1 = require("builder-util");
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path = require("path");
const asar_1 = require("./asar");
async function computeData({ resourcesPath, resourcesRelativePath, resourcesDestinationPath, extraResourceMatchers }) {
    const isAsar = (filepath) => filepath.endsWith(".asar");
    const resources = await (0, promises_1.readdir)(resourcesPath);
    const resourceAsars = resources.filter(isAsar).reduce((prev, filename) => ({
        ...prev,
        [path.join(resourcesRelativePath, filename)]: path.join(resourcesPath, filename),
    }), {});
    const extraResources = await Promise.all((extraResourceMatchers !== null && extraResourceMatchers !== void 0 ? extraResourceMatchers : []).map(async (matcher) => {
        const { from, to } = matcher;
        const stat = await (0, builder_util_1.statOrNull)(from);
        if (stat == null) {
            builder_util_1.log.warn({ from }, `file source doesn't exist`);
            return [];
        }
        if (stat.isFile()) {
            return [{ from, to }];
        }
        if (matcher.isEmpty() || matcher.containsOnlyIgnore()) {
            matcher.prependPattern("**/*");
        }
        const matcherFilter = matcher.createFilter();
        const extraResourceMatches = await (0, builder_util_1.walk)(matcher.from, (file, stats) => matcherFilter(file, stats) || stats.isDirectory());
        return extraResourceMatches.map(from => ({ from, to: matcher.to }));
    }));
    const extraResourceAsars = extraResources
        .flat(1)
        .filter(match => isAsar(match.from))
        .reduce((prev, { to, from }) => {
        const prefix = path.relative(resourcesDestinationPath, to);
        return {
            ...prev,
            [path.join(resourcesRelativePath, prefix, path.basename(from))]: from,
        };
    }, {});
    // sort to produce constant result
    const allAsars = [...Object.entries(resourceAsars), ...Object.entries(extraResourceAsars)].sort(([name1], [name2]) => name1.localeCompare(name2));
    const hashes = await Promise.all(allAsars.map(async ([, from]) => hashHeader(from)));
    const asarIntegrity = {};
    for (let i = 0; i < allAsars.length; i++) {
        const [asar] = allAsars[i];
        asarIntegrity[asar] = hashes[i];
    }
    return asarIntegrity;
}
async function hashHeader(file) {
    const hash = (0, crypto_1.createHash)("sha256");
    const { header } = await (0, asar_1.readAsarHeader)(file);
    hash.update(header);
    return {
        algorithm: "SHA256",
        hash: hash.digest("hex"),
    };
}
//# sourceMappingURL=integrity.js.map