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
        string: { unit: "અક્ષર", verb: "હોવા જોઈએ" },
        file: { unit: "બાયટ", verb: "હોવા જોઈએ" },
        array: { unit: "આઇટમ", verb: "હોવા જોઈએ" },
        set: { unit: "આઇટમ", verb: "હોવા જોઈએ" },
        map: { unit: "એન્ટ્રી", verb: "હોવા જોઈએ" },
    };
    function getSizing(origin) {
        return Sizable[origin] ?? null;
    }
    const FormatDictionary = {
        regex: "ઇનપુટ",
        email: "ઈમેઇલ એડ્રેસ",
        url: "URL",
        emoji: "ઇમોજી",
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
        datetime: "ISO તારીખ અને સમય",
        date: "ISO તારીખ",
        time: "ISO સમય",
        duration: "ISO અવધિ",
        ipv4: "IPv4 એડ્રેસ",
        ipv6: "IPv6 એડ્રેસ",
        mac: "MAC એડ્રેસ",
        cidrv4: "IPv4 શ્રેણી",
        cidrv6: "IPv6 શ્રેણી",
        base64: "base64-એન્કોડેડ સ્ટ્રિંગ",
        base64url: "base64url-એન્કોડેડ સ્ટ્રિંગ",
        json_string: "JSON સ્ટ્રિંગ",
        e164: "E.164 નંબર",
        credit_card: "ક્રેડિટ કાર્ડ નંબર",
        currency_code: "ચલણ કોડ",
        iban: "IBAN",
        jwt: "JWT",
        template_literal: "ઇનપુટ",
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
                return `અમાન્ય ઇનપુટ: અપેક્ષિત ${expected}, પ્રાપ્ત ${received}`;
            }
            case "invalid_value":
                if (issue.values.length === 1)
                    return `અમાન્ય ઇનપુટ: અપેક્ષિત ${util.stringifyPrimitive(issue.values[0])}`;
                return `અમાન્ય વિકલ્પ: ${util.joinValues(issue.values, " | ")} માધ્યમથી એક અપેક્ષિત`;
            case "too_big": {
                const adj = issue.inclusive ? "<=" : "<";
                const sizing = getSizing(issue.origin);
                if (sizing)
                    return `ખૂબ મોટું: ${issue.origin ?? "મૂલ્ય"} ${adj}${issue.maximum.toString()} ${sizing.unit ?? "એલિમેન્ટ"} હોવા જોઈએ`;
                return `ખૂબ મોટું: ${issue.origin ?? "મૂલ્ય"} ${adj}${issue.maximum.toString()} હોવું જોઈએ`;
            }
            case "too_small": {
                const adj = issue.inclusive ? ">=" : ">";
                const sizing = getSizing(issue.origin);
                if (sizing) {
                    return `ખૂબ નાનું: ${issue.origin} ${adj}${issue.minimum.toString()} ${sizing.unit} હોવા જોઈએ`;
                }
                return `ખૂબ નાનું: ${issue.origin} ${adj}${issue.minimum.toString()} હોવું જોઈએ`;
            }
            case "invalid_format": {
                const _issue = issue;
                if (_issue.format === "starts_with") {
                    return `અમાન્ય સ્ટ્રિંગ: "${_issue.prefix}" થી શરૂ થવું જોઈએ`;
                }
                if (_issue.format === "ends_with")
                    return `અમાન્ય સ્ટ્રિંગ: "${_issue.suffix}" પર સમાપ્ત થવું જોઈએ`;
                if (_issue.format === "includes")
                    return `અમાન્ય સ્ટ્રિંગ: "${_issue.includes}" શામેલ હોવું જોઈએ`;
                if (_issue.format === "regex")
                    return `અમાન્ય સ્ટ્રિંગ: પેટર્ન ${_issue.pattern} સાથે મેળ ખાવું જોઈએ`;
                return `અમાન્ય ${FormatDictionary[_issue.format] ?? issue.format}`;
            }
            case "not_multiple_of":
                return `અમાન્ય નંબર: ${issue.divisor} નો ગુણાંક હોવો જોઈએ`;
            case "unrecognized_keys":
                return `ઓળખી શકાતા નહીં તે કી${issue.keys.length > 1 ? "ઓ" : ""}: ${util.joinValues(issue.keys, ", ")}`;
            case "invalid_key":
                return `${issue.origin} માં અમાન્ય કી`;
            case "invalid_union":
                if (issue.options && Array.isArray(issue.options) && issue.options.length > 0) {
                    const opts = issue.options.map((o) => `'${o}'`).join(" | ");
                    return `અમાન્ય ડિસ્ક્રિમિનેટર મૂલ્ય. અપેક્ષિત ${opts}`;
                }
                return "અમાન્ય ઇનપુટ";
            case "invalid_element":
                return `${issue.origin} માં અમાન્ય મૂલ્ય`;
            default:
                return "અમાન્ય ઇનપુટ";
        }
    };
};
function default_1() {
    return {
        localeError: error(),
    };
}
module.exports = exports.default;
