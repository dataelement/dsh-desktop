"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireBuiltin = requireBuiltin;
exports.isAllowedInternalId = isAllowedInternalId;
exports.getBindingInfo = getBindingInfo;
const node_path_1 = __importDefault(require("node:path"));
const { createEntryApi } = require('node-addon-native-custom-loader');
const api = createEntryApi(node_path_1.default.resolve(__dirname, '..'));
function requireBuiltin(moduleId) {
    return api.requireBuiltin(moduleId);
}
function isAllowedInternalId(moduleId) {
    return api.isAllowedInternalId(moduleId);
}
function getBindingInfo() {
    return api.getBindingInfo();
}
exports.default = {
    requireBuiltin,
    isAllowedInternalId,
    getBindingInfo,
};
