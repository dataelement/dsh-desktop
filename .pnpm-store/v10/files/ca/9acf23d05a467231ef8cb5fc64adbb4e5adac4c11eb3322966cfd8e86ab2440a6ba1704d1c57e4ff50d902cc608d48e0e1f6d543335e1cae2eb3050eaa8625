"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppFileWalker = exports.FileCopyHelper = void 0;
const fs_extra_1 = require("fs-extra");
const path = require("path");
function addAllPatternIfNeed(matcher) {
    if (!matcher.isSpecifiedAsEmptyArray && (matcher.isEmpty() || matcher.containsOnlyIgnore())) {
        matcher.prependPattern("**/*");
    }
    return matcher;
}
class FileCopyHelper {
    constructor(matcher, filter, packager) {
        this.matcher = matcher;
        this.filter = filter;
        this.packager = packager;
        this.metadata = new Map();
    }
    handleFile(file, parent, fileStat) {
        if (!fileStat.isSymbolicLink()) {
            return null;
        }
        return (0, fs_extra_1.readlink)(file).then((linkTarget) => {
            // http://unix.stackexchange.com/questions/105637/is-symlinks-target-relative-to-the-destinations-parent-directory-and-if-so-wh
            return this.handleSymlink(fileStat, file, parent, linkTarget);
        });
    }
    handleSymlink(fileStat, file, parent, linkTarget) {
        const resolvedLinkTarget = path.resolve(parent, linkTarget);
        const link = path.relative(this.matcher.from, resolvedLinkTarget);
        if (link.startsWith("..")) {
            // outside of project, linked module (https://github.com/electron-userland/electron-builder/issues/675)
            return (0, fs_extra_1.stat)(resolvedLinkTarget).then(targetFileStat => {
                this.metadata.set(file, targetFileStat);
                return targetFileStat;
            });
        }
        else {
            const s = fileStat;
            s.relativeLink = link;
            s.linkRelativeToFile = path.relative(parent, resolvedLinkTarget);
        }
        return null;
    }
}
exports.FileCopyHelper = FileCopyHelper;
function createAppFilter(matcher, packager) {
    if (packager.areNodeModulesHandledExternally) {
        return matcher.isEmpty() ? null : matcher.createFilter();
    }
    return matcher.createFilter();
}
/** @internal */
class AppFileWalker extends FileCopyHelper {
    constructor(matcher, packager) {
        super(addAllPatternIfNeed(matcher), createAppFilter(matcher, packager), packager);
        this.matcherFilter = matcher.createFilter();
    }
    // noinspection JSUnusedGlobalSymbols
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    consume(file, fileStat, parent, siblingNames) {
        if (fileStat.isDirectory()) {
            const matchesFilter = this.matcherFilter(file, fileStat);
            return !matchesFilter;
        }
        else {
            // save memory - no need to store stat for directory
            this.metadata.set(file, fileStat);
        }
        return this.handleFile(file, parent, fileStat);
    }
}
exports.AppFileWalker = AppFileWalker;
//# sourceMappingURL=AppFileWalker.js.map