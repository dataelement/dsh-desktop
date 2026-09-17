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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const util = __importStar(require("../core/util.cjs"));
const error = () => {
    const Sizable = {
        string: { unit: "simwol", verb: "bolmaly" },
        file: { unit: "baýt", verb: "bolmaly" },
        array: { unit: "elementler", verb: "bolmaly" },
        set: { unit: "elementler", verb: "bolmaly" },
        map: { unit: "elementler", verb: "bolmaly" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "giriş",
        email: "e-poçta salgysy",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO sene we wagt",
        date: "ISO sene",
        time: "ISO wagt",
        duration: "ISO wagt aralygy",
        ipv4: "IPv4 salgysy",
        ipv6: "IPv6 salgysy",
        mac: "MAC salgysy",
        cidrv4: "IPv4 aralygy",
        cidrv6: "IPv6 aralygy",
        base64: "base64 bilen şifrlenen setir",
        base64url: "base64url bilen şifrlenen setir",
        json_string: "JSON setiri",
        e164: "E.164 nomeri",
        credit_card: "kredit kartynyň nomeri",
        currency_code: "walýuta kody",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "şablon",
    };
    const TypeDictionary = {
        nan: "NaN",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                return `Nädogry baha: garaşylan ${expected} ýerine ${received} alyndy`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Nädogry baha: ${util.stringifyPrimitive(issue.values[0])} bolmaly`;
                return `Nädogry saýlaw: aşakdakylardan biri bolmaly: ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Has uly: garaşylýan ${issue.origin ?? "baha"} ${adj} ${issue.maximum.toString()} ${sizing.unit ?? "element"}`;
                return `Has uly: garaşylýan ${issue.origin ?? "baha"} ${adj} ${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `Has kiçi: garaşylýan ${issue.origin} ${adj} ${issue.minimum.toString()} ${sizing.unit}`;
                return `Has kiçi: garaşylýan ${issue.origin} ${adj} ${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Nädogry setir: "${_issue.prefix}" bilen başlamaly`;
                if (_issue.format === "ends_with")
                    return `Nädogry setir: "${_issue.suffix}" bilen gutarmaly`;
                if (_issue.format === "includes")
                    return `Nädogry setir: "${_issue.includes}" saklamaly`;
                if (_issue.format === "regex")
                    return `Nädogry setir: ${_issue.pattern} nusga laýyk bolmaly`;
                return `Nädogry ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Nädogry san: ${issue.divisor} bilen galyndysyz bölünmeli`;
            case "unrecognized_keys":
                return `Tanalmaýan açar${issue.keys.length > 1 ? "lar" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} içinde nädogry açar`;
            case "invalid_union":
                return "Nädogry baha";
            case "invalid_element":
                return `${issue.origin} içinde nädogry baha`;
            default:
                return `Nädogry baha`;
        }
    };
};
function default_1() {
    return {
        localeError: error(),
    };
}
module.exports = exports.default;
