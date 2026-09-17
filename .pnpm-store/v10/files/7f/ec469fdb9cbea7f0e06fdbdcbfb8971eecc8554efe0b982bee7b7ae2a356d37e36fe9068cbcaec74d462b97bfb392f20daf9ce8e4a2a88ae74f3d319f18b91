"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NsisScriptGenerator = void 0;
exports.nsisEscapeString = nsisEscapeString;
const builder_util_1 = require("builder-util");
class NsisScriptGenerator {
    constructor() {
        this.lines = [];
    }
    addIncludeDir(file) {
        this.lines.push(`!addincludedir "${file}"`);
    }
    addPluginDir(pluginArch, dir) {
        this.lines.push(`!addplugindir /${pluginArch} "${dir}"`);
    }
    include(file) {
        this.lines.push(`!include "${file}"`);
    }
    macro(name, lines) {
        this.lines.push(`!macro ${name}`, `  ${(Array.isArray(lines) ? lines : lines.lines).join("\n  ")}`, `!macroend\n`);
    }
    file(outputName, file) {
        this.lines.push(`File${outputName == null ? "" : ` "/oname=${outputName}"`} "${file}"`);
    }
    insertMacro(name, parameters) {
        this.lines.push(`!insertmacro ${name} ${parameters}`);
    }
    // without -- !!!
    flags(flags) {
        for (const flagName of flags) {
            const variableName = getVarNameForFlag(flagName).replace(/[-]+(\w|$)/g, (m, p1) => p1.toUpperCase());
            this.lines.push(`!macro _${variableName} _a _b _t _f
  $\{StdUtils.TestParameter} $R9 "${flagName}"
  StrCmp "$R9" "true" \`$\{_t}\` \`$\{_f}\`
!macroend
!define ${variableName} \`"" ${variableName} ""\`
`);
        }
    }
    build() {
        return this.lines.join("\n") + "\n";
    }
}
exports.NsisScriptGenerator = NsisScriptGenerator;
function nsisEscapeString(s) {
    const escaped = s
        .replace(/\r\n|\r|\n/g, " ") // newlines break NSIS string literals
        .replace(/\$(?!\{)/g, "$$$$") // bare $ → $$ (prevents NSIS variable expansion); ${...} references are left intact
        .replace(/"/g, '$\\"'); // " → $\" (NSIS escape for double-quote)
    if (escaped !== s) {
        builder_util_1.log.debug({ original: s, final: escaped }, "nsis was escaped");
    }
    return escaped;
}
function getVarNameForFlag(flagName) {
    if (flagName === "allusers") {
        return "isForAllUsers";
    }
    if (flagName === "currentuser") {
        return "isForCurrentUser";
    }
    return "is" + flagName[0].toUpperCase() + flagName.substring(1);
}
//# sourceMappingURL=nsisScriptGenerator.js.map