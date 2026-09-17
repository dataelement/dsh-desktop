"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeIntegrityData = void 0;
const fs = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const file_utils_1 = require("./file-utils");
const asar_utils_1 = require("./asar-utils");
async function computeIntegrityData(contentsPath) {
    const root = await fs.realpath(contentsPath);
    const resourcesRelativePath = 'Resources';
    const resourcesPath = path_1.default.resolve(root, resourcesRelativePath);
    const resources = await (0, file_utils_1.getAllAppFiles)(resourcesPath);
    const resourceAsars = resources
        .filter((file) => file.type === file_utils_1.AppFileType.APP_CODE)
        .reduce((prev, file) => (Object.assign(Object.assign({}, prev), { [path_1.default.join(resourcesRelativePath, file.relativePath)]: path_1.default.join(resourcesPath, file.relativePath) })), {});
    // sort to produce constant result
    const allAsars = Object.entries(resourceAsars).sort(([name1], [name2]) => name1.localeCompare(name2));
    const hashes = await Promise.all(allAsars.map(async ([, from]) => (0, asar_utils_1.generateAsarIntegrity)(from)));
    const asarIntegrity = {};
    for (let i = 0; i < allAsars.length; i++) {
        const [asar] = allAsars[i];
        asarIntegrity[asar] = hashes[i];
    }
    return asarIntegrity;
}
exports.computeIntegrityData = computeIntegrityData;
//# sourceMappingURL=integrity.js.map