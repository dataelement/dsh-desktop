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
        string: { unit: "znakov", verb: "mať" },
        file: { unit: "bajtov", verb: "mať" },
        array: { unit: "prvkov", verb: "mať" },
        set: { unit: "prvkov", verb: "mať" },
        map: { unit: "položiek", verb: "mať" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "regulárny výraz",
        email: "e-mailová adresa",
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
        datetime: "dátum a čas vo formáte ISO",
        date: "dátum vo formáte ISO",
        time: "čas vo formáte ISO",
        duration: "doba trvania ISO",
        ipv4: "IPv4 adresa",
        ipv6: "IPv6 adresa",
        mac: "MAC adresa",
        cidrv4: "rozsah IPv4",
        cidrv6: "rozsah IPv6",
        base64: "reťazec zakódovaný vo formáte base64",
        base64url: "reťazec zakódovaný vo formáte base64url",
        json_string: "reťazec vo formáte JSON",
        e164: "číslo E.164",
        credit_card: "číslo kreditnej karty",
        currency_code: "kód meny",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "vstup",
    };
    const TypeDictionary = {
        nan: "NaN",
        number: "číslo",
        string: "reťazec",
        function: "funkcia",
        array: "pole",
    };
    return (issue) => {
        switch (issue.code) {
            case "invalid_type": {
                const expected = TypeDictionary[issue.expected] ?? issue.expected;
                const receivedType = util.parsedType(issue.input);
                const received = TypeDictionary[receivedType] ?? receivedType;
                if (/^[A-Z]/.test(issue.expected)) {
                    return `Neplatný vstup: očakávané instanceof ${issue.expected}, obdržané ${received}`;
                }
                return `Neplatný vstup: očakávané ${expected}, obdržané ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `Neplatný vstup: očakávané ${util.stringifyPrimitive(issue.values[0])}`;
                return `Neplatný vstup: očakávaná jedna z hodnôt ${util.joinValues(issue.values, "|")}`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Hodnota je príliš veľká: ${issue.origin ?? "hodnota"} musí mať ${adj}${issue.maximum.toString()} ${sizing.unit ?? "prvkov"}`;
                }
                return `Hodnota je príliš veľká: ${issue.origin ?? "hodnota"} musí byť ${adj}${issue.maximum.toString()}`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `Hodnota je príliš malá: ${issue.origin ?? "hodnota"} musí mať ${adj}${issue.minimum.toString()} ${sizing.unit ?? "prvkov"}`;
                }
                return `Hodnota je príliš malá: ${issue.origin ?? "hodnota"} musí byť ${adj}${issue.minimum.toString()}`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with")
                    return `Neplatný reťazec: musí začínať na "${_issue.prefix}"`;
                if (_issue.format === "ends_with")
                    return `Neplatný reťazec: musí končiť na "${_issue.suffix}"`;
                if (_issue.format === "includes")
                    return `Neplatný reťazec: musí obsahovať "${_issue.includes}"`;
                if (_issue.format === "regex")
                    return `Neplatný reťazec: musí zodpovedať vzoru ${_issue.pattern}`;
                return `Neplatný formát ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `Neplatné číslo: musí byť násobkom ${issue.divisor}`;
            case "unrecognized_keys":
                return `Neznáme klúče: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `Neplatný klúč v ${issue.origin}`;
            case "invalid_union":
                return "Neplatný vstup";
            case "invalid_element":
                return `Neplatná hodnota v ${issue.origin}`;
            default:
                return `Neplatný vstup`;
        }
    };
};
function default_1() {
    return {
        localeError: error(),
    };
}
module.exports = exports.default;
