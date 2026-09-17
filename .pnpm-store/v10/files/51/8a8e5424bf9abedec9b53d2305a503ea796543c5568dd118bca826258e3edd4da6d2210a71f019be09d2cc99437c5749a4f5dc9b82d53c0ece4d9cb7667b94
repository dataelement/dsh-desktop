/*!
 * Copyright (c) 2014, GlobalSign
 * Copyright (c) 2015-2019, Peculiar Ventures
 * All rights reserved.
 * 
 * Author 2014-2019, Yury Strozhevsky
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 * 
 * * Neither the name of the {organization} nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */

import * as asn1js from 'asn1js';
import * as pvtsutils from 'pvtsutils';
import { BufferSourceConverter } from 'pvtsutils';
import * as pvutils from 'pvutils';
import * as bs from 'bytestreamjs';
import { sha1 } from '@noble/hashes/sha1';
import { sha512, sha384, sha256 } from '@noble/hashes/sha2';

const EMPTY_BUFFER = new ArrayBuffer(0);
const EMPTY_STRING = "";

class ArgumentError extends TypeError {
    constructor() {
        super(...arguments);
        this.name = ArgumentError.NAME;
    }
    static isType(value, type) {
        if (typeof type === "string") {
            if (type === "Array" && Array.isArray(value)) {
                return true;
            }
            else if (type === "ArrayBuffer" && value instanceof ArrayBuffer) {
                return true;
            }
            else if (type === "ArrayBufferView" && ArrayBuffer.isView(value)) {
                return true;
            }
            else if (typeof value === type) {
                return true;
            }
        }
        else if (value instanceof type) {
            return true;
        }
        return false;
    }
    static assert(value, name, ...types) {
        for (const type of types) {
            if (this.isType(value, type)) {
                return;
            }
        }
        const typeNames = types.map(o => o instanceof Function && "name" in o ? o.name : `${o}`);
        throw new ArgumentError(`Parameter '${name}' is not of type ${typeNames.length > 1 ? `(${typeNames.join(" or ")})` : typeNames[0]}`);
    }
}
ArgumentError.NAME = "ArgumentError";

class ParameterError extends TypeError {
    static assert(...args) {
        let target = null;
        let params;
        let fields;
        if (typeof args[0] === "string") {
            target = args[0];
            params = args[1];
            fields = args.slice(2);
        }
        else {
            params = args[0];
            fields = args.slice(1);
        }
        ArgumentError.assert(params, "parameters", "object");
        for (const field of fields) {
            const value = params[field];
            if (value === undefined || value === null) {
                throw new ParameterError(field, target);
            }
        }
    }
    static assertEmpty(value, name, target) {
        if (value === undefined || value === null) {
            throw new ParameterError(name, target);
        }
    }
    constructor(field, target = null, message) {
        super();
        this.name = ParameterError.NAME;
        this.field = field;
        if (target) {
            this.target = target;
        }
        if (message) {
            this.message = message;
        }
        else {
            this.message = `Absent mandatory parameter '${field}' ${target ? ` in '${target}'` : EMPTY_STRING}`;
        }
    }
}
ParameterError.NAME = "ParameterError";

class AsnError extends Error {
    static assertSchema(asn1, target) {
        if (!asn1.verified) {
            throw new Error(`Object's schema was not verified against input data for ${target}`);
        }
    }
    static assert(asn, target) {
        if (asn.offset === -1) {
            throw new AsnError(`Error during parsing of ASN.1 data. Data is not correct for '${target}'.`);
        }
    }
    constructor(message) {
        super(message);
        this.name = "AsnError";
    }
}

class PkiObject {
    static blockName() {
        return this.CLASS_NAME;
    }
    static fromBER(raw) {
        const asn1 = asn1js.fromBER(raw);
        AsnError.assert(asn1, this.name);
        try {
            return new this({ schema: asn1.result });
        }
        catch (e) {
            throw new AsnError(`Cannot create '${this.CLASS_NAME}' from ASN.1 object`);
        }
    }
    static defaultValues(memberName) {
        throw new Error(`Invalid member name for ${this.CLASS_NAME} class: ${memberName}`);
    }
    static schema(parameters = {}) {
        throw new Error(`Method '${this.CLASS_NAME}.schema' should be overridden`);
    }
    get className() {
        return this.constructor.CLASS_NAME;
    }
    toString(encoding = "hex") {
        let schema;
        try {
            schema = this.toSchema();
        }
        catch {
            schema = this.toSchema(true);
        }
        return pvtsutils.Convert.ToString(schema.toBER(), encoding);
    }
}
PkiObject.CLASS_NAME = "PkiObject";

function stringPrep(inputString) {
    let isSpace = false;
    let cutResult = EMPTY_STRING;
    const result = inputString.trim();
    for (let i = 0; i < result.length; i++) {
        if (result.charCodeAt(i) === 32) {
            if (isSpace === false)
                isSpace = true;
        }
        else {
            if (isSpace) {
                cutResult += " ";
                isSpace = false;
            }
            cutResult += result[i];
        }
    }
    return cutResult.toLowerCase();
}

const TYPE$5 = "type";
const VALUE$6 = "value";
class AttributeTypeAndValue extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.type = pvutils.getParametersValue(parameters, TYPE$5, AttributeTypeAndValue.defaultValues(TYPE$5));
        this.value = pvutils.getParametersValue(parameters, VALUE$6, AttributeTypeAndValue.defaultValues(VALUE$6));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TYPE$5:
                return EMPTY_STRING;
            case VALUE$6:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.type || EMPTY_STRING) }),
                new asn1js.Any({ name: (names.value || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            TYPE$5,
            "typeValue"
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, AttributeTypeAndValue.schema({
            names: {
                type: TYPE$5,
                value: "typeValue"
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.type = asn1.result.type.valueBlock.toString();
        this.value = asn1.result.typeValue;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.type }),
                this.value
            ]
        }));
    }
    toJSON() {
        const _object = {
            type: this.type
        };
        if (Object.keys(this.value).length !== 0) {
            _object.value = (this.value).toJSON();
        }
        else {
            _object.value = this.value;
        }
        return _object;
    }
    isEqual(compareTo) {
        const stringBlockNames = [
            asn1js.Utf8String.blockName(),
            asn1js.BmpString.blockName(),
            asn1js.UniversalString.blockName(),
            asn1js.NumericString.blockName(),
            asn1js.PrintableString.blockName(),
            asn1js.TeletexString.blockName(),
            asn1js.VideotexString.blockName(),
            asn1js.IA5String.blockName(),
            asn1js.GraphicString.blockName(),
            asn1js.VisibleString.blockName(),
            asn1js.GeneralString.blockName(),
            asn1js.CharacterString.blockName()
        ];
        if (compareTo instanceof ArrayBuffer) {
            return pvtsutils.BufferSourceConverter.isEqual(this.value.valueBeforeDecodeView, compareTo);
        }
        if (compareTo.constructor.blockName() === AttributeTypeAndValue.blockName()) {
            if (this.type !== compareTo.type)
                return false;
            const isStringPair = [false, false];
            const thisName = this.value.constructor.blockName();
            for (const name of stringBlockNames) {
                if (thisName === name) {
                    isStringPair[0] = true;
                }
                if (compareTo.value.constructor.blockName() === name) {
                    isStringPair[1] = true;
                }
            }
            if (isStringPair[0] !== isStringPair[1]) {
                return false;
            }
            const isString = (isStringPair[0] && isStringPair[1]);
            if (isString) {
                const value1 = stringPrep(this.value.valueBlock.value);
                const value2 = stringPrep(compareTo.value.valueBlock.value);
                if (value1.localeCompare(value2) !== 0)
                    return false;
            }
            else {
                if (!pvtsutils.BufferSourceConverter.isEqual(this.value.valueBeforeDecodeView, compareTo.value.valueBeforeDecodeView))
                    return false;
            }
            return true;
        }
        return false;
    }
}
AttributeTypeAndValue.CLASS_NAME = "AttributeTypeAndValue";

const TYPE_AND_VALUES = "typesAndValues";
const VALUE_BEFORE_DECODE = "valueBeforeDecode";
const RDN = "RDN";
class RelativeDistinguishedNames extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.typesAndValues = pvutils.getParametersValue(parameters, TYPE_AND_VALUES, RelativeDistinguishedNames.defaultValues(TYPE_AND_VALUES));
        this.valueBeforeDecode = pvutils.getParametersValue(parameters, VALUE_BEFORE_DECODE, RelativeDistinguishedNames.defaultValues(VALUE_BEFORE_DECODE));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TYPE_AND_VALUES:
                return [];
            case VALUE_BEFORE_DECODE:
                return EMPTY_BUFFER;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TYPE_AND_VALUES:
                return (memberValue.length === 0);
            case VALUE_BEFORE_DECODE:
                return (memberValue.byteLength === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.repeatedSequence || EMPTY_STRING),
                    value: new asn1js.Set({
                        value: [
                            new asn1js.Repeated({
                                name: (names.repeatedSet || EMPTY_STRING),
                                value: AttributeTypeAndValue.schema(names.typeAndValue || {})
                            })
                        ]
                    })
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            RDN,
            TYPE_AND_VALUES
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, RelativeDistinguishedNames.schema({
            names: {
                blockName: RDN,
                repeatedSet: TYPE_AND_VALUES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (TYPE_AND_VALUES in asn1.result) {
            this.typesAndValues = Array.from(asn1.result.typesAndValues, element => new AttributeTypeAndValue({ schema: element }));
        }
        this.valueBeforeDecode = asn1.result.RDN.valueBeforeDecodeView.slice().buffer;
    }
    toSchema() {
        if (this.valueBeforeDecode.byteLength === 0) {
            return (new asn1js.Sequence({
                value: [new asn1js.Set({
                        value: Array.from(this.typesAndValues, o => o.toSchema())
                    })]
            }));
        }
        const asn1 = asn1js.fromBER(this.valueBeforeDecode);
        AsnError.assert(asn1, "RelativeDistinguishedNames");
        if (!(asn1.result instanceof asn1js.Sequence)) {
            throw new Error("ASN.1 result should be SEQUENCE");
        }
        return asn1.result;
    }
    toJSON() {
        return {
            typesAndValues: Array.from(this.typesAndValues, o => o.toJSON())
        };
    }
    isEqual(compareTo) {
        if (compareTo instanceof RelativeDistinguishedNames) {
            if (this.typesAndValues.length !== compareTo.typesAndValues.length)
                return false;
            for (const [index, typeAndValue] of this.typesAndValues.entries()) {
                if (typeAndValue.isEqual(compareTo.typesAndValues[index]) === false)
                    return false;
            }
            return true;
        }
        if (compareTo instanceof ArrayBuffer) {
            return pvutils.isEqualBuffer(this.valueBeforeDecode, compareTo);
        }
        return false;
    }
}
RelativeDistinguishedNames.CLASS_NAME = "RelativeDistinguishedNames";

const TYPE$4 = "type";
const VALUE$5 = "value";
function builtInStandardAttributes(parameters = {}, optional = false) {
    const names = pvutils.getParametersValue(parameters, "names", {});
    return (new asn1js.Sequence({
        optional,
        value: [
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 2,
                    tagNumber: 1
                },
                name: (names.country_name || EMPTY_STRING),
                value: [
                    new asn1js.Choice({
                        value: [
                            new asn1js.NumericString(),
                            new asn1js.PrintableString()
                        ]
                    })
                ]
            }),
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 2,
                    tagNumber: 2
                },
                name: (names.administration_domain_name || EMPTY_STRING),
                value: [
                    new asn1js.Choice({
                        value: [
                            new asn1js.NumericString(),
                            new asn1js.PrintableString()
                        ]
                    })
                ]
            }),
            new asn1js.Primitive({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                name: (names.network_address || EMPTY_STRING),
                isHexOnly: true
            }),
            new asn1js.Primitive({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                name: (names.terminal_identifier || EMPTY_STRING),
                isHexOnly: true
            }),
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                name: (names.private_domain_name || EMPTY_STRING),
                value: [
                    new asn1js.Choice({
                        value: [
                            new asn1js.NumericString(),
                            new asn1js.PrintableString()
                        ]
                    })
                ]
            }),
            new asn1js.Primitive({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 3
                },
                name: (names.organization_name || EMPTY_STRING),
                isHexOnly: true
            }),
            new asn1js.Primitive({
                optional: true,
                name: (names.numeric_user_identifier || EMPTY_STRING),
                idBlock: {
                    tagClass: 3,
                    tagNumber: 4
                },
                isHexOnly: true
            }),
            new asn1js.Constructed({
                optional: true,
                name: (names.personal_name || EMPTY_STRING),
                idBlock: {
                    tagClass: 3,
                    tagNumber: 5
                },
                value: [
                    new asn1js.Primitive({
                        idBlock: {
                            tagClass: 3,
                            tagNumber: 0
                        },
                        isHexOnly: true
                    }),
                    new asn1js.Primitive({
                        optional: true,
                        idBlock: {
                            tagClass: 3,
                            tagNumber: 1
                        },
                        isHexOnly: true
                    }),
                    new asn1js.Primitive({
                        optional: true,
                        idBlock: {
                            tagClass: 3,
                            tagNumber: 2
                        },
                        isHexOnly: true
                    }),
                    new asn1js.Primitive({
                        optional: true,
                        idBlock: {
                            tagClass: 3,
                            tagNumber: 3
                        },
                        isHexOnly: true
                    })
                ]
            }),
            new asn1js.Constructed({
                optional: true,
                name: (names.organizational_unit_names || EMPTY_STRING),
                idBlock: {
                    tagClass: 3,
                    tagNumber: 6
                },
                value: [
                    new asn1js.Repeated({
                        value: new asn1js.PrintableString()
                    })
                ]
            })
        ]
    }));
}
function builtInDomainDefinedAttributes(optional = false) {
    return (new asn1js.Sequence({
        optional,
        value: [
            new asn1js.PrintableString(),
            new asn1js.PrintableString()
        ]
    }));
}
function extensionAttributes(optional = false) {
    return (new asn1js.Set({
        optional,
        value: [
            new asn1js.Primitive({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                isHexOnly: true
            }),
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: [new asn1js.Any()]
            })
        ]
    }));
}
class GeneralName extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.type = pvutils.getParametersValue(parameters, TYPE$4, GeneralName.defaultValues(TYPE$4));
        this.value = pvutils.getParametersValue(parameters, VALUE$5, GeneralName.defaultValues(VALUE$5));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TYPE$4:
                return 9;
            case VALUE$5:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TYPE$4:
                return (memberValue === GeneralName.defaultValues(memberName));
            case VALUE$5:
                return (Object.keys(memberValue).length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Choice({
            value: [
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    name: (names.blockName || EMPTY_STRING),
                    value: [
                        new asn1js.ObjectIdentifier(),
                        new asn1js.Constructed({
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 0
                            },
                            value: [new asn1js.Any()]
                        })
                    ]
                }),
                new asn1js.Primitive({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    }
                }),
                new asn1js.Primitive({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    }
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 3
                    },
                    name: (names.blockName || EMPTY_STRING),
                    value: [
                        builtInStandardAttributes((names.builtInStandardAttributes || {}), false),
                        builtInDomainDefinedAttributes(true),
                        extensionAttributes(true)
                    ]
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 4
                    },
                    name: (names.blockName || EMPTY_STRING),
                    value: [RelativeDistinguishedNames.schema(names.directoryName || {})]
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 5
                    },
                    name: (names.blockName || EMPTY_STRING),
                    value: [
                        new asn1js.Constructed({
                            optional: true,
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 0
                            },
                            value: [
                                new asn1js.Choice({
                                    value: [
                                        new asn1js.TeletexString(),
                                        new asn1js.PrintableString(),
                                        new asn1js.UniversalString(),
                                        new asn1js.Utf8String(),
                                        new asn1js.BmpString()
                                    ]
                                })
                            ]
                        }),
                        new asn1js.Constructed({
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 1
                            },
                            value: [
                                new asn1js.Choice({
                                    value: [
                                        new asn1js.TeletexString(),
                                        new asn1js.PrintableString(),
                                        new asn1js.UniversalString(),
                                        new asn1js.Utf8String(),
                                        new asn1js.BmpString()
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                new asn1js.Primitive({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 6
                    }
                }),
                new asn1js.Primitive({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 7
                    }
                }),
                new asn1js.Primitive({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 8
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            "blockName",
            "otherName",
            "rfc822Name",
            "dNSName",
            "x400Address",
            "directoryName",
            "ediPartyName",
            "uniformResourceIdentifier",
            "iPAddress",
            "registeredID"
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, GeneralName.schema({
            names: {
                blockName: "blockName",
                otherName: "otherName",
                rfc822Name: "rfc822Name",
                dNSName: "dNSName",
                x400Address: "x400Address",
                directoryName: {
                    names: {
                        blockName: "directoryName"
                    }
                },
                ediPartyName: "ediPartyName",
                uniformResourceIdentifier: "uniformResourceIdentifier",
                iPAddress: "iPAddress",
                registeredID: "registeredID"
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.type = asn1.result.blockName.idBlock.tagNumber;
        switch (this.type) {
            case 0:
                this.value = asn1.result.blockName;
                break;
            case 1:
            case 2:
            case 6:
                {
                    const value = asn1.result.blockName;
                    value.idBlock.tagClass = 1;
                    value.idBlock.tagNumber = 22;
                    const valueBER = value.toBER(false);
                    const asnValue = asn1js.fromBER(valueBER);
                    AsnError.assert(asnValue, "GeneralName value");
                    this.value = asnValue.result.valueBlock.value;
                }
                break;
            case 3:
                this.value = asn1.result.blockName;
                break;
            case 4:
                this.value = new RelativeDistinguishedNames({ schema: asn1.result.directoryName });
                break;
            case 5:
                this.value = asn1.result.ediPartyName;
                break;
            case 7:
                this.value = new asn1js.OctetString({ valueHex: asn1.result.blockName.valueBlock.valueHex });
                break;
            case 8:
                {
                    const value = asn1.result.blockName;
                    value.idBlock.tagClass = 1;
                    value.idBlock.tagNumber = 6;
                    const valueBER = value.toBER(false);
                    const asnValue = asn1js.fromBER(valueBER);
                    AsnError.assert(asnValue, "GeneralName registeredID");
                    this.value = asnValue.result.valueBlock.toString();
                }
                break;
        }
    }
    toSchema() {
        switch (this.type) {
            case 0:
            case 3:
            case 5:
                return new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: this.type
                    },
                    value: [
                        this.value
                    ]
                });
            case 1:
            case 2:
            case 6:
                {
                    const value = new asn1js.IA5String({ value: this.value });
                    value.idBlock.tagClass = 3;
                    value.idBlock.tagNumber = this.type;
                    return value;
                }
            case 4:
                return new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 4
                    },
                    value: [this.value.toSchema()]
                });
            case 7:
                {
                    const value = this.value;
                    value.idBlock.tagClass = 3;
                    value.idBlock.tagNumber = this.type;
                    return value;
                }
            case 8:
                {
                    const value = new asn1js.ObjectIdentifier({ value: this.value });
                    value.idBlock.tagClass = 3;
                    value.idBlock.tagNumber = this.type;
                    return value;
                }
            default:
                return GeneralName.schema();
        }
    }
    toJSON() {
        const _object = {
            type: this.type,
            value: EMPTY_STRING
        };
        if ((typeof this.value) === "string")
            _object.value = this.value;
        else {
            try {
                _object.value = this.value.toJSON();
            }
            catch {
            }
        }
        return _object;
    }
}
GeneralName.CLASS_NAME = "GeneralName";

const ACCESS_METHOD = "accessMethod";
const ACCESS_LOCATION = "accessLocation";
const CLEAR_PROPS$1v = [
    ACCESS_METHOD,
    ACCESS_LOCATION,
];
class AccessDescription extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.accessMethod = pvutils.getParametersValue(parameters, ACCESS_METHOD, AccessDescription.defaultValues(ACCESS_METHOD));
        this.accessLocation = pvutils.getParametersValue(parameters, ACCESS_LOCATION, AccessDescription.defaultValues(ACCESS_LOCATION));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ACCESS_METHOD:
                return EMPTY_STRING;
            case ACCESS_LOCATION:
                return new GeneralName();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.accessMethod || EMPTY_STRING) }),
                GeneralName.schema(names.accessLocation || {})
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1v);
        const asn1 = asn1js.compareSchema(schema, schema, AccessDescription.schema({
            names: {
                accessMethod: ACCESS_METHOD,
                accessLocation: {
                    names: {
                        blockName: ACCESS_LOCATION
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.accessMethod = asn1.result.accessMethod.valueBlock.toString();
        this.accessLocation = new GeneralName({ schema: asn1.result.accessLocation });
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.accessMethod }),
                this.accessLocation.toSchema()
            ]
        }));
    }
    toJSON() {
        return {
            accessMethod: this.accessMethod,
            accessLocation: this.accessLocation.toJSON()
        };
    }
}
AccessDescription.CLASS_NAME = "AccessDescription";

const SECONDS = "seconds";
const MILLIS = "millis";
const MICROS = "micros";
class Accuracy extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (SECONDS in parameters) {
            this.seconds = pvutils.getParametersValue(parameters, SECONDS, Accuracy.defaultValues(SECONDS));
        }
        if (MILLIS in parameters) {
            this.millis = pvutils.getParametersValue(parameters, MILLIS, Accuracy.defaultValues(MILLIS));
        }
        if (MICROS in parameters) {
            this.micros = pvutils.getParametersValue(parameters, MICROS, Accuracy.defaultValues(MICROS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case SECONDS:
            case MILLIS:
            case MICROS:
                return 0;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case SECONDS:
            case MILLIS:
            case MICROS:
                return (memberValue === Accuracy.defaultValues(memberName));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            optional: true,
            value: [
                new asn1js.Integer({
                    optional: true,
                    name: (names.seconds || EMPTY_STRING)
                }),
                new asn1js.Primitive({
                    name: (names.millis || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    }
                }),
                new asn1js.Primitive({
                    name: (names.micros || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            SECONDS,
            MILLIS,
            MICROS,
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, Accuracy.schema({
            names: {
                seconds: SECONDS,
                millis: MILLIS,
                micros: MICROS,
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if ("seconds" in asn1.result) {
            this.seconds = asn1.result.seconds.valueBlock.valueDec;
        }
        if ("millis" in asn1.result) {
            const intMillis = new asn1js.Integer({ valueHex: asn1.result.millis.valueBlock.valueHex });
            this.millis = intMillis.valueBlock.valueDec;
        }
        if ("micros" in asn1.result) {
            const intMicros = new asn1js.Integer({ valueHex: asn1.result.micros.valueBlock.valueHex });
            this.micros = intMicros.valueBlock.valueDec;
        }
    }
    toSchema() {
        const outputArray = [];
        if (this.seconds !== undefined)
            outputArray.push(new asn1js.Integer({ value: this.seconds }));
        if (this.millis !== undefined) {
            const intMillis = new asn1js.Integer({ value: this.millis });
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                valueHex: intMillis.valueBlock.valueHexView
            }));
        }
        if (this.micros !== undefined) {
            const intMicros = new asn1js.Integer({ value: this.micros });
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                valueHex: intMicros.valueBlock.valueHexView
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const _object = {};
        if (this.seconds !== undefined)
            _object.seconds = this.seconds;
        if (this.millis !== undefined)
            _object.millis = this.millis;
        if (this.micros !== undefined)
            _object.micros = this.micros;
        return _object;
    }
}
Accuracy.CLASS_NAME = "Accuracy";

const ALGORITHM_ID = "algorithmId";
const ALGORITHM_PARAMS = "algorithmParams";
const ALGORITHM$2 = "algorithm";
const PARAMS = "params";
const CLEAR_PROPS$1u = [
    ALGORITHM$2,
    PARAMS
];
class AlgorithmIdentifier extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.algorithmId = pvutils.getParametersValue(parameters, ALGORITHM_ID, AlgorithmIdentifier.defaultValues(ALGORITHM_ID));
        if (ALGORITHM_PARAMS in parameters) {
            this.algorithmParams = pvutils.getParametersValue(parameters, ALGORITHM_PARAMS, AlgorithmIdentifier.defaultValues(ALGORITHM_PARAMS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ALGORITHM_ID:
                return EMPTY_STRING;
            case ALGORITHM_PARAMS:
                return new asn1js.Any();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case ALGORITHM_ID:
                return (memberValue === EMPTY_STRING);
            case ALGORITHM_PARAMS:
                return (memberValue instanceof asn1js.Any);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            optional: (names.optional || false),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.algorithmIdentifier || EMPTY_STRING) }),
                new asn1js.Any({ name: (names.algorithmParams || EMPTY_STRING), optional: true })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1u);
        const asn1 = asn1js.compareSchema(schema, schema, AlgorithmIdentifier.schema({
            names: {
                algorithmIdentifier: ALGORITHM$2,
                algorithmParams: PARAMS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.algorithmId = asn1.result.algorithm.valueBlock.toString();
        if (PARAMS in asn1.result) {
            this.algorithmParams = asn1.result.params;
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.algorithmId }));
        if (this.algorithmParams && !(this.algorithmParams instanceof asn1js.Any)) {
            outputArray.push(this.algorithmParams);
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const object = {
            algorithmId: this.algorithmId
        };
        if (this.algorithmParams && !(this.algorithmParams instanceof asn1js.Any)) {
            object.algorithmParams = this.algorithmParams.toJSON();
        }
        return object;
    }
    isEqual(algorithmIdentifier) {
        if (!(algorithmIdentifier instanceof AlgorithmIdentifier)) {
            return false;
        }
        if (this.algorithmId !== algorithmIdentifier.algorithmId) {
            return false;
        }
        if (this.algorithmParams) {
            if (algorithmIdentifier.algorithmParams) {
                return JSON.stringify(this.algorithmParams) === JSON.stringify(algorithmIdentifier.algorithmParams);
            }
            return false;
        }
        if (algorithmIdentifier.algorithmParams) {
            return false;
        }
        return true;
    }
}
AlgorithmIdentifier.CLASS_NAME = "AlgorithmIdentifier";

const ALT_NAMES = "altNames";
const CLEAR_PROPS$1t = [
    ALT_NAMES
];
class AltName extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.altNames = pvutils.getParametersValue(parameters, ALT_NAMES, AltName.defaultValues(ALT_NAMES));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ALT_NAMES:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.altNames || EMPTY_STRING),
                    value: GeneralName.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1t);
        const asn1 = asn1js.compareSchema(schema, schema, AltName.schema({
            names: {
                altNames: ALT_NAMES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (ALT_NAMES in asn1.result) {
            this.altNames = Array.from(asn1.result.altNames, element => new GeneralName({ schema: element }));
        }
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.altNames, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            altNames: Array.from(this.altNames, o => o.toJSON())
        };
    }
}
AltName.CLASS_NAME = "AltName";

const TYPE$3 = "type";
const VALUES$1 = "values";
const CLEAR_PROPS$1s = [
    TYPE$3,
    VALUES$1
];
class Attribute extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.type = pvutils.getParametersValue(parameters, TYPE$3, Attribute.defaultValues(TYPE$3));
        this.values = pvutils.getParametersValue(parameters, VALUES$1, Attribute.defaultValues(VALUES$1));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TYPE$3:
                return EMPTY_STRING;
            case VALUES$1:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TYPE$3:
                return (memberValue === EMPTY_STRING);
            case VALUES$1:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.type || EMPTY_STRING) }),
                new asn1js.Set({
                    name: (names.setName || EMPTY_STRING),
                    value: [
                        new asn1js.Repeated({
                            name: (names.values || EMPTY_STRING),
                            value: new asn1js.Any()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1s);
        const asn1 = asn1js.compareSchema(schema, schema, Attribute.schema({
            names: {
                type: TYPE$3,
                values: VALUES$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.type = asn1.result.type.valueBlock.toString();
        this.values = asn1.result.values;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.type }),
                new asn1js.Set({
                    value: this.values
                })
            ]
        }));
    }
    toJSON() {
        return {
            type: this.type,
            values: Array.from(this.values, o => o.toJSON())
        };
    }
}
Attribute.CLASS_NAME = "Attribute";

const NOT_BEFORE_TIME = "notBeforeTime";
const NOT_AFTER_TIME = "notAfterTime";
const CLEAR_PROPS$1r = [
    NOT_BEFORE_TIME,
    NOT_AFTER_TIME,
];
class AttCertValidityPeriod extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.notBeforeTime = pvutils.getParametersValue(parameters, NOT_BEFORE_TIME, AttCertValidityPeriod.defaultValues(NOT_BEFORE_TIME));
        this.notAfterTime = pvutils.getParametersValue(parameters, NOT_AFTER_TIME, AttCertValidityPeriod.defaultValues(NOT_AFTER_TIME));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case NOT_BEFORE_TIME:
            case NOT_AFTER_TIME:
                return new Date(0, 0, 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.GeneralizedTime({ name: (names.notBeforeTime || EMPTY_STRING) }),
                new asn1js.GeneralizedTime({ name: (names.notAfterTime || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1r);
        const asn1 = asn1js.compareSchema(schema, schema, AttCertValidityPeriod.schema({
            names: {
                notBeforeTime: NOT_BEFORE_TIME,
                notAfterTime: NOT_AFTER_TIME
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.notBeforeTime = asn1.result.notBeforeTime.toDate();
        this.notAfterTime = asn1.result.notAfterTime.toDate();
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.GeneralizedTime({ valueDate: this.notBeforeTime }),
                new asn1js.GeneralizedTime({ valueDate: this.notAfterTime }),
            ]
        }));
    }
    toJSON() {
        return {
            notBeforeTime: this.notBeforeTime,
            notAfterTime: this.notAfterTime
        };
    }
}
AttCertValidityPeriod.CLASS_NAME = "AttCertValidityPeriod";

const NAMES = "names";
const GENERAL_NAMES = "generalNames";
class GeneralNames extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.names = pvutils.getParametersValue(parameters, NAMES, GeneralNames.defaultValues(NAMES));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case "names":
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}, optional = false) {
        const names = pvutils.getParametersValue(parameters, NAMES, {});
        return (new asn1js.Sequence({
            optional,
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.generalNames || EMPTY_STRING),
                    value: GeneralName.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            NAMES,
            GENERAL_NAMES
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, GeneralNames.schema({
            names: {
                blockName: NAMES,
                generalNames: GENERAL_NAMES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.names = Array.from(asn1.result.generalNames, element => new GeneralName({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.names, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            names: Array.from(this.names, o => o.toJSON())
        };
    }
}
GeneralNames.CLASS_NAME = "GeneralNames";

const id_SubjectDirectoryAttributes = "2.5.29.9";
const id_SubjectKeyIdentifier = "2.5.29.14";
const id_KeyUsage = "2.5.29.15";
const id_PrivateKeyUsagePeriod = "2.5.29.16";
const id_SubjectAltName = "2.5.29.17";
const id_IssuerAltName = "2.5.29.18";
const id_BasicConstraints = "2.5.29.19";
const id_CRLNumber = "2.5.29.20";
const id_BaseCRLNumber = "2.5.29.27";
const id_CRLReason = "2.5.29.21";
const id_InvalidityDate = "2.5.29.24";
const id_IssuingDistributionPoint = "2.5.29.28";
const id_CertificateIssuer = "2.5.29.29";
const id_NameConstraints = "2.5.29.30";
const id_CRLDistributionPoints = "2.5.29.31";
const id_FreshestCRL = "2.5.29.46";
const id_CertificatePolicies = "2.5.29.32";
const id_AnyPolicy = "2.5.29.32.0";
const id_MicrosoftAppPolicies = "1.3.6.1.4.1.311.21.10";
const id_PolicyMappings = "2.5.29.33";
const id_AuthorityKeyIdentifier = "2.5.29.35";
const id_PolicyConstraints = "2.5.29.36";
const id_ExtKeyUsage = "2.5.29.37";
const id_InhibitAnyPolicy = "2.5.29.54";
const id_AuthorityInfoAccess = "1.3.6.1.5.5.7.1.1";
const id_SubjectInfoAccess = "1.3.6.1.5.5.7.1.11";
const id_SignedCertificateTimestampList = "1.3.6.1.4.1.11129.2.4.2";
const id_MicrosoftCertTemplateV1 = "1.3.6.1.4.1.311.20.2";
const id_MicrosoftPrevCaCertHash = "1.3.6.1.4.1.311.21.2";
const id_MicrosoftCertTemplateV2 = "1.3.6.1.4.1.311.21.7";
const id_MicrosoftCaVersion = "1.3.6.1.4.1.311.21.1";
const id_QCStatements = "1.3.6.1.5.5.7.1.3";
const id_ContentType_Data = "1.2.840.113549.1.7.1";
const id_ContentType_SignedData = "1.2.840.113549.1.7.2";
const id_ContentType_EnvelopedData = "1.2.840.113549.1.7.3";
const id_ContentType_EncryptedData = "1.2.840.113549.1.7.6";
const id_eContentType_TSTInfo = "1.2.840.113549.1.9.16.1.4";
const id_CertBag_X509Certificate = "1.2.840.113549.1.9.22.1";
const id_CertBag_SDSICertificate = "1.2.840.113549.1.9.22.2";
const id_CertBag_AttributeCertificate = "1.2.840.113549.1.9.22.3";
const id_CRLBag_X509CRL = "1.2.840.113549.1.9.23.1";
const id_pkix = "1.3.6.1.5.5.7";
const id_ad = `${id_pkix}.48`;
const id_PKIX_OCSP_Basic = `${id_ad}.1.1`;
const id_ad_caIssuers = `${id_ad}.2`;
const id_ad_ocsp = `${id_ad}.1`;
const id_sha1 = "1.3.14.3.2.26";
const id_sha256 = "2.16.840.1.101.3.4.2.1";
const id_sha384 = "2.16.840.1.101.3.4.2.2";
const id_sha512 = "2.16.840.1.101.3.4.2.3";

const KEY_IDENTIFIER$1 = "keyIdentifier";
const AUTHORITY_CERT_ISSUER = "authorityCertIssuer";
const AUTHORITY_CERT_SERIAL_NUMBER = "authorityCertSerialNumber";
const CLEAR_PROPS$1q = [
    KEY_IDENTIFIER$1,
    AUTHORITY_CERT_ISSUER,
    AUTHORITY_CERT_SERIAL_NUMBER,
];
class AuthorityKeyIdentifier extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (KEY_IDENTIFIER$1 in parameters) {
            this.keyIdentifier = pvutils.getParametersValue(parameters, KEY_IDENTIFIER$1, AuthorityKeyIdentifier.defaultValues(KEY_IDENTIFIER$1));
        }
        if (AUTHORITY_CERT_ISSUER in parameters) {
            this.authorityCertIssuer = pvutils.getParametersValue(parameters, AUTHORITY_CERT_ISSUER, AuthorityKeyIdentifier.defaultValues(AUTHORITY_CERT_ISSUER));
        }
        if (AUTHORITY_CERT_SERIAL_NUMBER in parameters) {
            this.authorityCertSerialNumber = pvutils.getParametersValue(parameters, AUTHORITY_CERT_SERIAL_NUMBER, AuthorityKeyIdentifier.defaultValues(AUTHORITY_CERT_SERIAL_NUMBER));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case KEY_IDENTIFIER$1:
                return new asn1js.OctetString();
            case AUTHORITY_CERT_ISSUER:
                return [];
            case AUTHORITY_CERT_SERIAL_NUMBER:
                return new asn1js.Integer();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Primitive({
                    name: (names.keyIdentifier || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    }
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.authorityCertIssuer || EMPTY_STRING),
                            value: GeneralName.schema()
                        })
                    ]
                }),
                new asn1js.Primitive({
                    name: (names.authorityCertSerialNumber || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1q);
        const asn1 = asn1js.compareSchema(schema, schema, AuthorityKeyIdentifier.schema({
            names: {
                keyIdentifier: KEY_IDENTIFIER$1,
                authorityCertIssuer: AUTHORITY_CERT_ISSUER,
                authorityCertSerialNumber: AUTHORITY_CERT_SERIAL_NUMBER
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (KEY_IDENTIFIER$1 in asn1.result)
            this.keyIdentifier = new asn1js.OctetString({ valueHex: asn1.result.keyIdentifier.valueBlock.valueHex });
        if (AUTHORITY_CERT_ISSUER in asn1.result)
            this.authorityCertIssuer = Array.from(asn1.result.authorityCertIssuer, o => new GeneralName({ schema: o }));
        if (AUTHORITY_CERT_SERIAL_NUMBER in asn1.result)
            this.authorityCertSerialNumber = new asn1js.Integer({ valueHex: asn1.result.authorityCertSerialNumber.valueBlock.valueHex });
    }
    toSchema() {
        const outputArray = [];
        if (this.keyIdentifier) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                valueHex: this.keyIdentifier.valueBlock.valueHexView
            }));
        }
        if (this.authorityCertIssuer) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: Array.from(this.authorityCertIssuer, o => o.toSchema())
            }));
        }
        if (this.authorityCertSerialNumber) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                valueHex: this.authorityCertSerialNumber.valueBlock.valueHexView
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const object = {};
        if (this.keyIdentifier) {
            object.keyIdentifier = this.keyIdentifier.toJSON();
        }
        if (this.authorityCertIssuer) {
            object.authorityCertIssuer = Array.from(this.authorityCertIssuer, o => o.toJSON());
        }
        if (this.authorityCertSerialNumber) {
            object.authorityCertSerialNumber = this.authorityCertSerialNumber.toJSON();
        }
        return object;
    }
}
AuthorityKeyIdentifier.CLASS_NAME = "AuthorityKeyIdentifier";

const PATH_LENGTH_CONSTRAINT = "pathLenConstraint";
const CA = "cA";
class BasicConstraints extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.cA = pvutils.getParametersValue(parameters, CA, false);
        if (PATH_LENGTH_CONSTRAINT in parameters) {
            this.pathLenConstraint = pvutils.getParametersValue(parameters, PATH_LENGTH_CONSTRAINT, 0);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CA:
                return false;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Boolean({
                    optional: true,
                    name: (names.cA || EMPTY_STRING)
                }),
                new asn1js.Integer({
                    optional: true,
                    name: (names.pathLenConstraint || EMPTY_STRING)
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            CA,
            PATH_LENGTH_CONSTRAINT
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, BasicConstraints.schema({
            names: {
                cA: CA,
                pathLenConstraint: PATH_LENGTH_CONSTRAINT
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (CA in asn1.result) {
            this.cA = asn1.result.cA.valueBlock.value;
        }
        if (PATH_LENGTH_CONSTRAINT in asn1.result) {
            if (asn1.result.pathLenConstraint.valueBlock.isHexOnly) {
                this.pathLenConstraint = asn1.result.pathLenConstraint;
            }
            else {
                this.pathLenConstraint = asn1.result.pathLenConstraint.valueBlock.valueDec;
            }
        }
    }
    toSchema() {
        const outputArray = [];
        if (this.cA !== BasicConstraints.defaultValues(CA))
            outputArray.push(new asn1js.Boolean({ value: this.cA }));
        if (PATH_LENGTH_CONSTRAINT in this) {
            if (this.pathLenConstraint instanceof asn1js.Integer) {
                outputArray.push(this.pathLenConstraint);
            }
            else {
                outputArray.push(new asn1js.Integer({ value: this.pathLenConstraint }));
            }
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const object = {};
        if (this.cA !== BasicConstraints.defaultValues(CA)) {
            object.cA = this.cA;
        }
        if (PATH_LENGTH_CONSTRAINT in this) {
            if (this.pathLenConstraint instanceof asn1js.Integer) {
                object.pathLenConstraint = this.pathLenConstraint.toJSON();
            }
            else {
                object.pathLenConstraint = this.pathLenConstraint;
            }
        }
        return object;
    }
}
BasicConstraints.CLASS_NAME = "BasicConstraints";

const CERTIFICATE_INDEX = "certificateIndex";
const KEY_INDEX = "keyIndex";
class CAVersion extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.certificateIndex = pvutils.getParametersValue(parameters, CERTIFICATE_INDEX, CAVersion.defaultValues(CERTIFICATE_INDEX));
        this.keyIndex = pvutils.getParametersValue(parameters, KEY_INDEX, CAVersion.defaultValues(KEY_INDEX));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CERTIFICATE_INDEX:
            case KEY_INDEX:
                return 0;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema() {
        return (new asn1js.Integer());
    }
    fromSchema(schema) {
        if (schema.constructor.blockName() !== asn1js.Integer.blockName()) {
            throw new Error("Object's schema was not verified against input data for CAVersion");
        }
        let value = schema.valueBlock.valueHex.slice(0);
        const valueView = new Uint8Array(value);
        switch (true) {
            case (value.byteLength < 4):
                {
                    const tempValue = new ArrayBuffer(4);
                    const tempValueView = new Uint8Array(tempValue);
                    tempValueView.set(valueView, 4 - value.byteLength);
                    value = tempValue.slice(0);
                }
                break;
            case (value.byteLength > 4):
                {
                    const tempValue = new ArrayBuffer(4);
                    const tempValueView = new Uint8Array(tempValue);
                    tempValueView.set(valueView.slice(0, 4));
                    value = tempValue.slice(0);
                }
                break;
        }
        const keyIndexBuffer = value.slice(0, 2);
        const keyIndexView8 = new Uint8Array(keyIndexBuffer);
        let temp = keyIndexView8[0];
        keyIndexView8[0] = keyIndexView8[1];
        keyIndexView8[1] = temp;
        const keyIndexView16 = new Uint16Array(keyIndexBuffer);
        this.keyIndex = keyIndexView16[0];
        const certificateIndexBuffer = value.slice(2);
        const certificateIndexView8 = new Uint8Array(certificateIndexBuffer);
        temp = certificateIndexView8[0];
        certificateIndexView8[0] = certificateIndexView8[1];
        certificateIndexView8[1] = temp;
        const certificateIndexView16 = new Uint16Array(certificateIndexBuffer);
        this.certificateIndex = certificateIndexView16[0];
    }
    toSchema() {
        const certificateIndexBuffer = new ArrayBuffer(2);
        const certificateIndexView = new Uint16Array(certificateIndexBuffer);
        certificateIndexView[0] = this.certificateIndex;
        const certificateIndexView8 = new Uint8Array(certificateIndexBuffer);
        let temp = certificateIndexView8[0];
        certificateIndexView8[0] = certificateIndexView8[1];
        certificateIndexView8[1] = temp;
        const keyIndexBuffer = new ArrayBuffer(2);
        const keyIndexView = new Uint16Array(keyIndexBuffer);
        keyIndexView[0] = this.keyIndex;
        const keyIndexView8 = new Uint8Array(keyIndexBuffer);
        temp = keyIndexView8[0];
        keyIndexView8[0] = keyIndexView8[1];
        keyIndexView8[1] = temp;
        return (new asn1js.Integer({
            valueHex: pvutils.utilConcatBuf(keyIndexBuffer, certificateIndexBuffer)
        }));
    }
    toJSON() {
        return {
            certificateIndex: this.certificateIndex,
            keyIndex: this.keyIndex
        };
    }
}
CAVersion.CLASS_NAME = "CAVersion";

const POLICY_QUALIFIER_ID = "policyQualifierId";
const QUALIFIER = "qualifier";
const CLEAR_PROPS$1p = [
    POLICY_QUALIFIER_ID,
    QUALIFIER
];
class PolicyQualifierInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.policyQualifierId = pvutils.getParametersValue(parameters, POLICY_QUALIFIER_ID, PolicyQualifierInfo.defaultValues(POLICY_QUALIFIER_ID));
        this.qualifier = pvutils.getParametersValue(parameters, QUALIFIER, PolicyQualifierInfo.defaultValues(QUALIFIER));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case POLICY_QUALIFIER_ID:
                return EMPTY_STRING;
            case QUALIFIER:
                return new asn1js.Any();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.policyQualifierId || EMPTY_STRING) }),
                new asn1js.Any({ name: (names.qualifier || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1p);
        const asn1 = asn1js.compareSchema(schema, schema, PolicyQualifierInfo.schema({
            names: {
                policyQualifierId: POLICY_QUALIFIER_ID,
                qualifier: QUALIFIER
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.policyQualifierId = asn1.result.policyQualifierId.valueBlock.toString();
        this.qualifier = asn1.result.qualifier;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.policyQualifierId }),
                this.qualifier
            ]
        }));
    }
    toJSON() {
        return {
            policyQualifierId: this.policyQualifierId,
            qualifier: this.qualifier.toJSON()
        };
    }
}
PolicyQualifierInfo.CLASS_NAME = "PolicyQualifierInfo";

const POLICY_IDENTIFIER = "policyIdentifier";
const POLICY_QUALIFIERS = "policyQualifiers";
const CLEAR_PROPS$1o = [
    POLICY_IDENTIFIER,
    POLICY_QUALIFIERS
];
class PolicyInformation extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.policyIdentifier = pvutils.getParametersValue(parameters, POLICY_IDENTIFIER, PolicyInformation.defaultValues(POLICY_IDENTIFIER));
        if (POLICY_QUALIFIERS in parameters) {
            this.policyQualifiers = pvutils.getParametersValue(parameters, POLICY_QUALIFIERS, PolicyInformation.defaultValues(POLICY_QUALIFIERS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case POLICY_IDENTIFIER:
                return EMPTY_STRING;
            case POLICY_QUALIFIERS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.policyIdentifier || EMPTY_STRING) }),
                new asn1js.Sequence({
                    optional: true,
                    value: [
                        new asn1js.Repeated({
                            name: (names.policyQualifiers || EMPTY_STRING),
                            value: PolicyQualifierInfo.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1o);
        const asn1 = asn1js.compareSchema(schema, schema, PolicyInformation.schema({
            names: {
                policyIdentifier: POLICY_IDENTIFIER,
                policyQualifiers: POLICY_QUALIFIERS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.policyIdentifier = asn1.result.policyIdentifier.valueBlock.toString();
        if (POLICY_QUALIFIERS in asn1.result) {
            this.policyQualifiers = Array.from(asn1.result.policyQualifiers, element => new PolicyQualifierInfo({ schema: element }));
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.policyIdentifier }));
        if (this.policyQualifiers) {
            outputArray.push(new asn1js.Sequence({
                value: Array.from(this.policyQualifiers, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            policyIdentifier: this.policyIdentifier
        };
        if (this.policyQualifiers)
            res.policyQualifiers = Array.from(this.policyQualifiers, o => o.toJSON());
        return res;
    }
}
PolicyInformation.CLASS_NAME = "PolicyInformation";

const CERTIFICATE_POLICIES = "certificatePolicies";
const CLEAR_PROPS$1n = [
    CERTIFICATE_POLICIES,
];
class CertificatePolicies extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.certificatePolicies = pvutils.getParametersValue(parameters, CERTIFICATE_POLICIES, CertificatePolicies.defaultValues(CERTIFICATE_POLICIES));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CERTIFICATE_POLICIES:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.certificatePolicies || EMPTY_STRING),
                    value: PolicyInformation.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1n);
        const asn1 = asn1js.compareSchema(schema, schema, CertificatePolicies.schema({
            names: {
                certificatePolicies: CERTIFICATE_POLICIES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.certificatePolicies = Array.from(asn1.result.certificatePolicies, element => new PolicyInformation({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.certificatePolicies, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            certificatePolicies: Array.from(this.certificatePolicies, o => o.toJSON())
        };
    }
}
CertificatePolicies.CLASS_NAME = "CertificatePolicies";

const TEMPLATE_ID = "templateID";
const TEMPLATE_MAJOR_VERSION = "templateMajorVersion";
const TEMPLATE_MINOR_VERSION = "templateMinorVersion";
const CLEAR_PROPS$1m = [
    TEMPLATE_ID,
    TEMPLATE_MAJOR_VERSION,
    TEMPLATE_MINOR_VERSION
];
class CertificateTemplate extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.templateID = pvutils.getParametersValue(parameters, TEMPLATE_ID, CertificateTemplate.defaultValues(TEMPLATE_ID));
        if (TEMPLATE_MAJOR_VERSION in parameters) {
            this.templateMajorVersion = pvutils.getParametersValue(parameters, TEMPLATE_MAJOR_VERSION, CertificateTemplate.defaultValues(TEMPLATE_MAJOR_VERSION));
        }
        if (TEMPLATE_MINOR_VERSION in parameters) {
            this.templateMinorVersion = pvutils.getParametersValue(parameters, TEMPLATE_MINOR_VERSION, CertificateTemplate.defaultValues(TEMPLATE_MINOR_VERSION));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TEMPLATE_ID:
                return EMPTY_STRING;
            case TEMPLATE_MAJOR_VERSION:
            case TEMPLATE_MINOR_VERSION:
                return 0;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.templateID || EMPTY_STRING) }),
                new asn1js.Integer({
                    name: (names.templateMajorVersion || EMPTY_STRING),
                    optional: true
                }),
                new asn1js.Integer({
                    name: (names.templateMinorVersion || EMPTY_STRING),
                    optional: true
                }),
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1m);
        const asn1 = asn1js.compareSchema(schema, schema, CertificateTemplate.schema({
            names: {
                templateID: TEMPLATE_ID,
                templateMajorVersion: TEMPLATE_MAJOR_VERSION,
                templateMinorVersion: TEMPLATE_MINOR_VERSION
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.templateID = asn1.result.templateID.valueBlock.toString();
        if (TEMPLATE_MAJOR_VERSION in asn1.result) {
            this.templateMajorVersion = asn1.result.templateMajorVersion.valueBlock.valueDec;
        }
        if (TEMPLATE_MINOR_VERSION in asn1.result) {
            this.templateMinorVersion = asn1.result.templateMinorVersion.valueBlock.valueDec;
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.templateID }));
        if (TEMPLATE_MAJOR_VERSION in this) {
            outputArray.push(new asn1js.Integer({ value: this.templateMajorVersion }));
        }
        if (TEMPLATE_MINOR_VERSION in this) {
            outputArray.push(new asn1js.Integer({ value: this.templateMinorVersion }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            templateID: this.templateID
        };
        if (TEMPLATE_MAJOR_VERSION in this)
            res.templateMajorVersion = this.templateMajorVersion;
        if (TEMPLATE_MINOR_VERSION in this)
            res.templateMinorVersion = this.templateMinorVersion;
        return res;
    }
}

const DISTRIBUTION_POINT$1 = "distributionPoint";
const DISTRIBUTION_POINT_NAMES$1 = "distributionPointNames";
const REASONS = "reasons";
const CRL_ISSUER = "cRLIssuer";
const CRL_ISSUER_NAMES = "cRLIssuerNames";
const CLEAR_PROPS$1l = [
    DISTRIBUTION_POINT$1,
    DISTRIBUTION_POINT_NAMES$1,
    REASONS,
    CRL_ISSUER,
    CRL_ISSUER_NAMES,
];
class DistributionPoint extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (DISTRIBUTION_POINT$1 in parameters) {
            this.distributionPoint = pvutils.getParametersValue(parameters, DISTRIBUTION_POINT$1, DistributionPoint.defaultValues(DISTRIBUTION_POINT$1));
        }
        if (REASONS in parameters) {
            this.reasons = pvutils.getParametersValue(parameters, REASONS, DistributionPoint.defaultValues(REASONS));
        }
        if (CRL_ISSUER in parameters) {
            this.cRLIssuer = pvutils.getParametersValue(parameters, CRL_ISSUER, DistributionPoint.defaultValues(CRL_ISSUER));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case DISTRIBUTION_POINT$1:
                return [];
            case REASONS:
                return new asn1js.BitString();
            case CRL_ISSUER:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.Choice({
                            value: [
                                new asn1js.Constructed({
                                    name: (names.distributionPoint || EMPTY_STRING),
                                    optional: true,
                                    idBlock: {
                                        tagClass: 3,
                                        tagNumber: 0
                                    },
                                    value: [
                                        new asn1js.Repeated({
                                            name: (names.distributionPointNames || EMPTY_STRING),
                                            value: GeneralName.schema()
                                        })
                                    ]
                                }),
                                new asn1js.Constructed({
                                    name: (names.distributionPoint || EMPTY_STRING),
                                    optional: true,
                                    idBlock: {
                                        tagClass: 3,
                                        tagNumber: 1
                                    },
                                    value: RelativeDistinguishedNames.schema().valueBlock.value
                                })
                            ]
                        })
                    ]
                }),
                new asn1js.Primitive({
                    name: (names.reasons || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    }
                }),
                new asn1js.Constructed({
                    name: (names.cRLIssuer || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.cRLIssuerNames || EMPTY_STRING),
                            value: GeneralName.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1l);
        const asn1 = asn1js.compareSchema(schema, schema, DistributionPoint.schema({
            names: {
                distributionPoint: DISTRIBUTION_POINT$1,
                distributionPointNames: DISTRIBUTION_POINT_NAMES$1,
                reasons: REASONS,
                cRLIssuer: CRL_ISSUER,
                cRLIssuerNames: CRL_ISSUER_NAMES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (DISTRIBUTION_POINT$1 in asn1.result) {
            if (asn1.result.distributionPoint.idBlock.tagNumber === 0) {
                this.distributionPoint = Array.from(asn1.result.distributionPointNames, element => new GeneralName({ schema: element }));
            }
            if (asn1.result.distributionPoint.idBlock.tagNumber === 1) {
                this.distributionPoint = new RelativeDistinguishedNames({
                    schema: new asn1js.Sequence({
                        value: asn1.result.distributionPoint.valueBlock.value
                    })
                });
            }
        }
        if (REASONS in asn1.result) {
            this.reasons = new asn1js.BitString({ valueHex: asn1.result.reasons.valueBlock.valueHex });
        }
        if (CRL_ISSUER in asn1.result) {
            this.cRLIssuer = Array.from(asn1.result.cRLIssuerNames, element => new GeneralName({ schema: element }));
        }
    }
    toSchema() {
        const outputArray = [];
        if (this.distributionPoint) {
            let internalValue;
            if (this.distributionPoint instanceof Array) {
                internalValue = new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: Array.from(this.distributionPoint, o => o.toSchema())
                });
            }
            else {
                internalValue = new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [this.distributionPoint.toSchema()]
                });
            }
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [internalValue]
            }));
        }
        if (this.reasons) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                valueHex: this.reasons.valueBlock.valueHexView
            }));
        }
        if (this.cRLIssuer) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                value: Array.from(this.cRLIssuer, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const object = {};
        if (this.distributionPoint) {
            if (this.distributionPoint instanceof Array) {
                object.distributionPoint = Array.from(this.distributionPoint, o => o.toJSON());
            }
            else {
                object.distributionPoint = this.distributionPoint.toJSON();
            }
        }
        if (this.reasons) {
            object.reasons = this.reasons.toJSON();
        }
        if (this.cRLIssuer) {
            object.cRLIssuer = Array.from(this.cRLIssuer, o => o.toJSON());
        }
        return object;
    }
}
DistributionPoint.CLASS_NAME = "DistributionPoint";

const DISTRIBUTION_POINTS = "distributionPoints";
const CLEAR_PROPS$1k = [
    DISTRIBUTION_POINTS
];
class CRLDistributionPoints extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.distributionPoints = pvutils.getParametersValue(parameters, DISTRIBUTION_POINTS, CRLDistributionPoints.defaultValues(DISTRIBUTION_POINTS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case DISTRIBUTION_POINTS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.distributionPoints || EMPTY_STRING),
                    value: DistributionPoint.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1k);
        const asn1 = asn1js.compareSchema(schema, schema, CRLDistributionPoints.schema({
            names: {
                distributionPoints: DISTRIBUTION_POINTS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.distributionPoints = Array.from(asn1.result.distributionPoints, element => new DistributionPoint({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.distributionPoints, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            distributionPoints: Array.from(this.distributionPoints, o => o.toJSON())
        };
    }
}
CRLDistributionPoints.CLASS_NAME = "CRLDistributionPoints";

const KEY_PURPOSES = "keyPurposes";
const CLEAR_PROPS$1j = [
    KEY_PURPOSES,
];
class ExtKeyUsage extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.keyPurposes = pvutils.getParametersValue(parameters, KEY_PURPOSES, ExtKeyUsage.defaultValues(KEY_PURPOSES));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case KEY_PURPOSES:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.keyPurposes || EMPTY_STRING),
                    value: new asn1js.ObjectIdentifier()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1j);
        const asn1 = asn1js.compareSchema(schema, schema, ExtKeyUsage.schema({
            names: {
                keyPurposes: KEY_PURPOSES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.keyPurposes = Array.from(asn1.result.keyPurposes, (element) => element.valueBlock.toString());
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.keyPurposes, element => new asn1js.ObjectIdentifier({ value: element }))
        }));
    }
    toJSON() {
        return {
            keyPurposes: Array.from(this.keyPurposes)
        };
    }
}
ExtKeyUsage.CLASS_NAME = "ExtKeyUsage";

const ACCESS_DESCRIPTIONS = "accessDescriptions";
class InfoAccess extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.accessDescriptions = pvutils.getParametersValue(parameters, ACCESS_DESCRIPTIONS, InfoAccess.defaultValues(ACCESS_DESCRIPTIONS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ACCESS_DESCRIPTIONS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.accessDescriptions || EMPTY_STRING),
                    value: AccessDescription.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            ACCESS_DESCRIPTIONS
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, InfoAccess.schema({
            names: {
                accessDescriptions: ACCESS_DESCRIPTIONS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.accessDescriptions = Array.from(asn1.result.accessDescriptions, element => new AccessDescription({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.accessDescriptions, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            accessDescriptions: Array.from(this.accessDescriptions, o => o.toJSON())
        };
    }
}
InfoAccess.CLASS_NAME = "InfoAccess";

const DISTRIBUTION_POINT = "distributionPoint";
const DISTRIBUTION_POINT_NAMES = "distributionPointNames";
const ONLY_CONTAINS_USER_CERTS = "onlyContainsUserCerts";
const ONLY_CONTAINS_CA_CERTS = "onlyContainsCACerts";
const ONLY_SOME_REASON = "onlySomeReasons";
const INDIRECT_CRL = "indirectCRL";
const ONLY_CONTAINS_ATTRIBUTE_CERTS = "onlyContainsAttributeCerts";
const CLEAR_PROPS$1i = [
    DISTRIBUTION_POINT,
    DISTRIBUTION_POINT_NAMES,
    ONLY_CONTAINS_USER_CERTS,
    ONLY_CONTAINS_CA_CERTS,
    ONLY_SOME_REASON,
    INDIRECT_CRL,
    ONLY_CONTAINS_ATTRIBUTE_CERTS,
];
class IssuingDistributionPoint extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (DISTRIBUTION_POINT in parameters) {
            this.distributionPoint = pvutils.getParametersValue(parameters, DISTRIBUTION_POINT, IssuingDistributionPoint.defaultValues(DISTRIBUTION_POINT));
        }
        this.onlyContainsUserCerts = pvutils.getParametersValue(parameters, ONLY_CONTAINS_USER_CERTS, IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_USER_CERTS));
        this.onlyContainsCACerts = pvutils.getParametersValue(parameters, ONLY_CONTAINS_CA_CERTS, IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_CA_CERTS));
        if (ONLY_SOME_REASON in parameters) {
            this.onlySomeReasons = pvutils.getParametersValue(parameters, ONLY_SOME_REASON, IssuingDistributionPoint.defaultValues(ONLY_SOME_REASON));
        }
        this.indirectCRL = pvutils.getParametersValue(parameters, INDIRECT_CRL, IssuingDistributionPoint.defaultValues(INDIRECT_CRL));
        this.onlyContainsAttributeCerts = pvutils.getParametersValue(parameters, ONLY_CONTAINS_ATTRIBUTE_CERTS, IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_ATTRIBUTE_CERTS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case DISTRIBUTION_POINT:
                return [];
            case ONLY_CONTAINS_USER_CERTS:
                return false;
            case ONLY_CONTAINS_CA_CERTS:
                return false;
            case ONLY_SOME_REASON:
                return 0;
            case INDIRECT_CRL:
                return false;
            case ONLY_CONTAINS_ATTRIBUTE_CERTS:
                return false;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.Choice({
                            value: [
                                new asn1js.Constructed({
                                    name: (names.distributionPoint || EMPTY_STRING),
                                    idBlock: {
                                        tagClass: 3,
                                        tagNumber: 0
                                    },
                                    value: [
                                        new asn1js.Repeated({
                                            name: (names.distributionPointNames || EMPTY_STRING),
                                            value: GeneralName.schema()
                                        })
                                    ]
                                }),
                                new asn1js.Constructed({
                                    name: (names.distributionPoint || EMPTY_STRING),
                                    idBlock: {
                                        tagClass: 3,
                                        tagNumber: 1
                                    },
                                    value: RelativeDistinguishedNames.schema().valueBlock.value
                                })
                            ]
                        })
                    ]
                }),
                new asn1js.Primitive({
                    name: (names.onlyContainsUserCerts || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    }
                }),
                new asn1js.Primitive({
                    name: (names.onlyContainsCACerts || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    }
                }),
                new asn1js.Primitive({
                    name: (names.onlySomeReasons || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 3
                    }
                }),
                new asn1js.Primitive({
                    name: (names.indirectCRL || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 4
                    }
                }),
                new asn1js.Primitive({
                    name: (names.onlyContainsAttributeCerts || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 5
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1i);
        const asn1 = asn1js.compareSchema(schema, schema, IssuingDistributionPoint.schema({
            names: {
                distributionPoint: DISTRIBUTION_POINT,
                distributionPointNames: DISTRIBUTION_POINT_NAMES,
                onlyContainsUserCerts: ONLY_CONTAINS_USER_CERTS,
                onlyContainsCACerts: ONLY_CONTAINS_CA_CERTS,
                onlySomeReasons: ONLY_SOME_REASON,
                indirectCRL: INDIRECT_CRL,
                onlyContainsAttributeCerts: ONLY_CONTAINS_ATTRIBUTE_CERTS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (DISTRIBUTION_POINT in asn1.result) {
            switch (true) {
                case (asn1.result.distributionPoint.idBlock.tagNumber === 0):
                    this.distributionPoint = Array.from(asn1.result.distributionPointNames, element => new GeneralName({ schema: element }));
                    break;
                case (asn1.result.distributionPoint.idBlock.tagNumber === 1):
                    {
                        this.distributionPoint = new RelativeDistinguishedNames({
                            schema: new asn1js.Sequence({
                                value: asn1.result.distributionPoint.valueBlock.value
                            })
                        });
                    }
                    break;
                default:
                    throw new Error("Unknown tagNumber for distributionPoint: {$asn1.result.distributionPoint.idBlock.tagNumber}");
            }
        }
        if (ONLY_CONTAINS_USER_CERTS in asn1.result) {
            const view = new Uint8Array(asn1.result.onlyContainsUserCerts.valueBlock.valueHex);
            this.onlyContainsUserCerts = (view[0] !== 0x00);
        }
        if (ONLY_CONTAINS_CA_CERTS in asn1.result) {
            const view = new Uint8Array(asn1.result.onlyContainsCACerts.valueBlock.valueHex);
            this.onlyContainsCACerts = (view[0] !== 0x00);
        }
        if (ONLY_SOME_REASON in asn1.result) {
            const view = new Uint8Array(asn1.result.onlySomeReasons.valueBlock.valueHex);
            this.onlySomeReasons = view[0];
        }
        if (INDIRECT_CRL in asn1.result) {
            const view = new Uint8Array(asn1.result.indirectCRL.valueBlock.valueHex);
            this.indirectCRL = (view[0] !== 0x00);
        }
        if (ONLY_CONTAINS_ATTRIBUTE_CERTS in asn1.result) {
            const view = new Uint8Array(asn1.result.onlyContainsAttributeCerts.valueBlock.valueHex);
            this.onlyContainsAttributeCerts = (view[0] !== 0x00);
        }
    }
    toSchema() {
        const outputArray = [];
        if (this.distributionPoint) {
            let value;
            if (this.distributionPoint instanceof Array) {
                value = new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: Array.from(this.distributionPoint, o => o.toSchema())
                });
            }
            else {
                value = this.distributionPoint.toSchema();
                value.idBlock.tagClass = 3;
                value.idBlock.tagNumber = 1;
            }
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [value]
            }));
        }
        if (this.onlyContainsUserCerts !== IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_USER_CERTS)) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                valueHex: (new Uint8Array([0xFF])).buffer
            }));
        }
        if (this.onlyContainsCACerts !== IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_CA_CERTS)) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                valueHex: (new Uint8Array([0xFF])).buffer
            }));
        }
        if (this.onlySomeReasons !== undefined) {
            const buffer = new ArrayBuffer(1);
            const view = new Uint8Array(buffer);
            view[0] = this.onlySomeReasons;
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 3
                },
                valueHex: buffer
            }));
        }
        if (this.indirectCRL !== IssuingDistributionPoint.defaultValues(INDIRECT_CRL)) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 4
                },
                valueHex: (new Uint8Array([0xFF])).buffer
            }));
        }
        if (this.onlyContainsAttributeCerts !== IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_ATTRIBUTE_CERTS)) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 5
                },
                valueHex: (new Uint8Array([0xFF])).buffer
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const obj = {};
        if (this.distributionPoint) {
            if (this.distributionPoint instanceof Array) {
                obj.distributionPoint = Array.from(this.distributionPoint, o => o.toJSON());
            }
            else {
                obj.distributionPoint = this.distributionPoint.toJSON();
            }
        }
        if (this.onlyContainsUserCerts !== IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_USER_CERTS)) {
            obj.onlyContainsUserCerts = this.onlyContainsUserCerts;
        }
        if (this.onlyContainsCACerts !== IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_CA_CERTS)) {
            obj.onlyContainsCACerts = this.onlyContainsCACerts;
        }
        if (ONLY_SOME_REASON in this) {
            obj.onlySomeReasons = this.onlySomeReasons;
        }
        if (this.indirectCRL !== IssuingDistributionPoint.defaultValues(INDIRECT_CRL)) {
            obj.indirectCRL = this.indirectCRL;
        }
        if (this.onlyContainsAttributeCerts !== IssuingDistributionPoint.defaultValues(ONLY_CONTAINS_ATTRIBUTE_CERTS)) {
            obj.onlyContainsAttributeCerts = this.onlyContainsAttributeCerts;
        }
        return obj;
    }
}
IssuingDistributionPoint.CLASS_NAME = "IssuingDistributionPoint";

const BASE = "base";
const MINIMUM = "minimum";
const MAXIMUM = "maximum";
const CLEAR_PROPS$1h = [
    BASE,
    MINIMUM,
    MAXIMUM
];
class GeneralSubtree extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.base = pvutils.getParametersValue(parameters, BASE, GeneralSubtree.defaultValues(BASE));
        this.minimum = pvutils.getParametersValue(parameters, MINIMUM, GeneralSubtree.defaultValues(MINIMUM));
        if (MAXIMUM in parameters) {
            this.maximum = pvutils.getParametersValue(parameters, MAXIMUM, GeneralSubtree.defaultValues(MAXIMUM));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case BASE:
                return new GeneralName();
            case MINIMUM:
                return 0;
            case MAXIMUM:
                return 0;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                GeneralName.schema(names.base || {}),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Integer({ name: (names.minimum || EMPTY_STRING) })]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [new asn1js.Integer({ name: (names.maximum || EMPTY_STRING) })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1h);
        const asn1 = asn1js.compareSchema(schema, schema, GeneralSubtree.schema({
            names: {
                base: {
                    names: {
                        blockName: BASE
                    }
                },
                minimum: MINIMUM,
                maximum: MAXIMUM
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.base = new GeneralName({ schema: asn1.result.base });
        if (MINIMUM in asn1.result) {
            if (asn1.result.minimum.valueBlock.isHexOnly)
                this.minimum = asn1.result.minimum;
            else
                this.minimum = asn1.result.minimum.valueBlock.valueDec;
        }
        if (MAXIMUM in asn1.result) {
            if (asn1.result.maximum.valueBlock.isHexOnly)
                this.maximum = asn1.result.maximum;
            else
                this.maximum = asn1.result.maximum.valueBlock.valueDec;
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.base.toSchema());
        if (this.minimum !== 0) {
            let valueMinimum = 0;
            if (this.minimum instanceof asn1js.Integer) {
                valueMinimum = this.minimum;
            }
            else {
                valueMinimum = new asn1js.Integer({ value: this.minimum });
            }
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [valueMinimum]
            }));
        }
        if (MAXIMUM in this) {
            let valueMaximum = 0;
            if (this.maximum instanceof asn1js.Integer) {
                valueMaximum = this.maximum;
            }
            else {
                valueMaximum = new asn1js.Integer({ value: this.maximum });
            }
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: [valueMaximum]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            base: this.base.toJSON()
        };
        if (this.minimum !== 0) {
            if (typeof this.minimum === "number") {
                res.minimum = this.minimum;
            }
            else {
                res.minimum = this.minimum.toJSON();
            }
        }
        if (this.maximum !== undefined) {
            if (typeof this.maximum === "number") {
                res.maximum = this.maximum;
            }
            else {
                res.maximum = this.maximum.toJSON();
            }
        }
        return res;
    }
}
GeneralSubtree.CLASS_NAME = "GeneralSubtree";

const PERMITTED_SUBTREES = "permittedSubtrees";
const EXCLUDED_SUBTREES = "excludedSubtrees";
const CLEAR_PROPS$1g = [
    PERMITTED_SUBTREES,
    EXCLUDED_SUBTREES
];
class NameConstraints extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (PERMITTED_SUBTREES in parameters) {
            this.permittedSubtrees = pvutils.getParametersValue(parameters, PERMITTED_SUBTREES, NameConstraints.defaultValues(PERMITTED_SUBTREES));
        }
        if (EXCLUDED_SUBTREES in parameters) {
            this.excludedSubtrees = pvutils.getParametersValue(parameters, EXCLUDED_SUBTREES, NameConstraints.defaultValues(EXCLUDED_SUBTREES));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case PERMITTED_SUBTREES:
            case EXCLUDED_SUBTREES:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.permittedSubtrees || EMPTY_STRING),
                            value: GeneralSubtree.schema()
                        })
                    ]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.excludedSubtrees || EMPTY_STRING),
                            value: GeneralSubtree.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1g);
        const asn1 = asn1js.compareSchema(schema, schema, NameConstraints.schema({
            names: {
                permittedSubtrees: PERMITTED_SUBTREES,
                excludedSubtrees: EXCLUDED_SUBTREES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (PERMITTED_SUBTREES in asn1.result)
            this.permittedSubtrees = Array.from(asn1.result.permittedSubtrees, element => new GeneralSubtree({ schema: element }));
        if (EXCLUDED_SUBTREES in asn1.result)
            this.excludedSubtrees = Array.from(asn1.result.excludedSubtrees, element => new GeneralSubtree({ schema: element }));
    }
    toSchema() {
        const outputArray = [];
        if (this.permittedSubtrees) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: Array.from(this.permittedSubtrees, o => o.toSchema())
            }));
        }
        if (this.excludedSubtrees) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: Array.from(this.excludedSubtrees, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const object = {};
        if (this.permittedSubtrees) {
            object.permittedSubtrees = Array.from(this.permittedSubtrees, o => o.toJSON());
        }
        if (this.excludedSubtrees) {
            object.excludedSubtrees = Array.from(this.excludedSubtrees, o => o.toJSON());
        }
        return object;
    }
}
NameConstraints.CLASS_NAME = "NameConstraints";

const REQUIRE_EXPLICIT_POLICY = "requireExplicitPolicy";
const INHIBIT_POLICY_MAPPING = "inhibitPolicyMapping";
const CLEAR_PROPS$1f = [
    REQUIRE_EXPLICIT_POLICY,
    INHIBIT_POLICY_MAPPING,
];
class PolicyConstraints extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (REQUIRE_EXPLICIT_POLICY in parameters) {
            this.requireExplicitPolicy = pvutils.getParametersValue(parameters, REQUIRE_EXPLICIT_POLICY, PolicyConstraints.defaultValues(REQUIRE_EXPLICIT_POLICY));
        }
        if (INHIBIT_POLICY_MAPPING in parameters) {
            this.inhibitPolicyMapping = pvutils.getParametersValue(parameters, INHIBIT_POLICY_MAPPING, PolicyConstraints.defaultValues(INHIBIT_POLICY_MAPPING));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case REQUIRE_EXPLICIT_POLICY:
                return 0;
            case INHIBIT_POLICY_MAPPING:
                return 0;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Primitive({
                    name: (names.requireExplicitPolicy || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    }
                }),
                new asn1js.Primitive({
                    name: (names.inhibitPolicyMapping || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1f);
        const asn1 = asn1js.compareSchema(schema, schema, PolicyConstraints.schema({
            names: {
                requireExplicitPolicy: REQUIRE_EXPLICIT_POLICY,
                inhibitPolicyMapping: INHIBIT_POLICY_MAPPING
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (REQUIRE_EXPLICIT_POLICY in asn1.result) {
            const field1 = asn1.result.requireExplicitPolicy;
            field1.idBlock.tagClass = 1;
            field1.idBlock.tagNumber = 2;
            const ber1 = field1.toBER(false);
            const int1 = asn1js.fromBER(ber1);
            AsnError.assert(int1, "Integer");
            this.requireExplicitPolicy = int1.result.valueBlock.valueDec;
        }
        if (INHIBIT_POLICY_MAPPING in asn1.result) {
            const field2 = asn1.result.inhibitPolicyMapping;
            field2.idBlock.tagClass = 1;
            field2.idBlock.tagNumber = 2;
            const ber2 = field2.toBER(false);
            const int2 = asn1js.fromBER(ber2);
            AsnError.assert(int2, "Integer");
            this.inhibitPolicyMapping = int2.result.valueBlock.valueDec;
        }
    }
    toSchema() {
        const outputArray = [];
        if (REQUIRE_EXPLICIT_POLICY in this) {
            const int1 = new asn1js.Integer({ value: this.requireExplicitPolicy });
            int1.idBlock.tagClass = 3;
            int1.idBlock.tagNumber = 0;
            outputArray.push(int1);
        }
        if (INHIBIT_POLICY_MAPPING in this) {
            const int2 = new asn1js.Integer({ value: this.inhibitPolicyMapping });
            int2.idBlock.tagClass = 3;
            int2.idBlock.tagNumber = 1;
            outputArray.push(int2);
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {};
        if (REQUIRE_EXPLICIT_POLICY in this) {
            res.requireExplicitPolicy = this.requireExplicitPolicy;
        }
        if (INHIBIT_POLICY_MAPPING in this) {
            res.inhibitPolicyMapping = this.inhibitPolicyMapping;
        }
        return res;
    }
}
PolicyConstraints.CLASS_NAME = "PolicyConstraints";

const ISSUER_DOMAIN_POLICY = "issuerDomainPolicy";
const SUBJECT_DOMAIN_POLICY = "subjectDomainPolicy";
const CLEAR_PROPS$1e = [
    ISSUER_DOMAIN_POLICY,
    SUBJECT_DOMAIN_POLICY
];
class PolicyMapping extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.issuerDomainPolicy = pvutils.getParametersValue(parameters, ISSUER_DOMAIN_POLICY, PolicyMapping.defaultValues(ISSUER_DOMAIN_POLICY));
        this.subjectDomainPolicy = pvutils.getParametersValue(parameters, SUBJECT_DOMAIN_POLICY, PolicyMapping.defaultValues(SUBJECT_DOMAIN_POLICY));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ISSUER_DOMAIN_POLICY:
                return EMPTY_STRING;
            case SUBJECT_DOMAIN_POLICY:
                return EMPTY_STRING;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.issuerDomainPolicy || EMPTY_STRING) }),
                new asn1js.ObjectIdentifier({ name: (names.subjectDomainPolicy || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1e);
        const asn1 = asn1js.compareSchema(schema, schema, PolicyMapping.schema({
            names: {
                issuerDomainPolicy: ISSUER_DOMAIN_POLICY,
                subjectDomainPolicy: SUBJECT_DOMAIN_POLICY
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.issuerDomainPolicy = asn1.result.issuerDomainPolicy.valueBlock.toString();
        this.subjectDomainPolicy = asn1.result.subjectDomainPolicy.valueBlock.toString();
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.issuerDomainPolicy }),
                new asn1js.ObjectIdentifier({ value: this.subjectDomainPolicy })
            ]
        }));
    }
    toJSON() {
        return {
            issuerDomainPolicy: this.issuerDomainPolicy,
            subjectDomainPolicy: this.subjectDomainPolicy
        };
    }
}
PolicyMapping.CLASS_NAME = "PolicyMapping";

const MAPPINGS = "mappings";
const CLEAR_PROPS$1d = [
    MAPPINGS,
];
class PolicyMappings extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.mappings = pvutils.getParametersValue(parameters, MAPPINGS, PolicyMappings.defaultValues(MAPPINGS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case MAPPINGS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.mappings || EMPTY_STRING),
                    value: PolicyMapping.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1d);
        const asn1 = asn1js.compareSchema(schema, schema, PolicyMappings.schema({
            names: {
                mappings: MAPPINGS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.mappings = Array.from(asn1.result.mappings, element => new PolicyMapping({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.mappings, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            mappings: Array.from(this.mappings, o => o.toJSON())
        };
    }
}
PolicyMappings.CLASS_NAME = "PolicyMappings";

const NOT_BEFORE$1 = "notBefore";
const NOT_AFTER$1 = "notAfter";
const CLEAR_PROPS$1c = [
    NOT_BEFORE$1,
    NOT_AFTER$1
];
class PrivateKeyUsagePeriod extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (NOT_BEFORE$1 in parameters) {
            this.notBefore = pvutils.getParametersValue(parameters, NOT_BEFORE$1, PrivateKeyUsagePeriod.defaultValues(NOT_BEFORE$1));
        }
        if (NOT_AFTER$1 in parameters) {
            this.notAfter = pvutils.getParametersValue(parameters, NOT_AFTER$1, PrivateKeyUsagePeriod.defaultValues(NOT_AFTER$1));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case NOT_BEFORE$1:
                return new Date();
            case NOT_AFTER$1:
                return new Date();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Primitive({
                    name: (names.notBefore || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    }
                }),
                new asn1js.Primitive({
                    name: (names.notAfter || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1c);
        const asn1 = asn1js.compareSchema(schema, schema, PrivateKeyUsagePeriod.schema({
            names: {
                notBefore: NOT_BEFORE$1,
                notAfter: NOT_AFTER$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (NOT_BEFORE$1 in asn1.result) {
            const localNotBefore = new asn1js.GeneralizedTime();
            localNotBefore.fromBuffer(asn1.result.notBefore.valueBlock.valueHex);
            this.notBefore = localNotBefore.toDate();
        }
        if (NOT_AFTER$1 in asn1.result) {
            const localNotAfter = new asn1js.GeneralizedTime({ valueHex: asn1.result.notAfter.valueBlock.valueHex });
            localNotAfter.fromBuffer(asn1.result.notAfter.valueBlock.valueHex);
            this.notAfter = localNotAfter.toDate();
        }
    }
    toSchema() {
        const outputArray = [];
        if (NOT_BEFORE$1 in this) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                valueHex: (new asn1js.GeneralizedTime({ valueDate: this.notBefore })).valueBlock.valueHexView
            }));
        }
        if (NOT_AFTER$1 in this) {
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                valueHex: (new asn1js.GeneralizedTime({ valueDate: this.notAfter })).valueBlock.valueHexView
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {};
        if (this.notBefore) {
            res.notBefore = this.notBefore;
        }
        if (this.notAfter) {
            res.notAfter = this.notAfter;
        }
        return res;
    }
}
PrivateKeyUsagePeriod.CLASS_NAME = "PrivateKeyUsagePeriod";

const ID = "id";
const TYPE$2 = "type";
const VALUES = "values";
const QC_STATEMENT_CLEAR_PROPS = [
    ID,
    TYPE$2
];
const QC_STATEMENTS_CLEAR_PROPS = [
    VALUES
];
class QCStatement extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.id = pvutils.getParametersValue(parameters, ID, QCStatement.defaultValues(ID));
        if (TYPE$2 in parameters) {
            this.type = pvutils.getParametersValue(parameters, TYPE$2, QCStatement.defaultValues(TYPE$2));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ID:
                return EMPTY_STRING;
            case TYPE$2:
                return new asn1js.Null();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case ID:
                return (memberValue === EMPTY_STRING);
            case TYPE$2:
                return (memberValue instanceof asn1js.Null);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.id || EMPTY_STRING) }),
                new asn1js.Any({
                    name: (names.type || EMPTY_STRING),
                    optional: true
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, QC_STATEMENT_CLEAR_PROPS);
        const asn1 = asn1js.compareSchema(schema, schema, QCStatement.schema({
            names: {
                id: ID,
                type: TYPE$2
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.id = asn1.result.id.valueBlock.toString();
        if (TYPE$2 in asn1.result)
            this.type = asn1.result.type;
    }
    toSchema() {
        const value = [
            new asn1js.ObjectIdentifier({ value: this.id })
        ];
        if (TYPE$2 in this)
            value.push(this.type);
        return (new asn1js.Sequence({
            value,
        }));
    }
    toJSON() {
        const object = {
            id: this.id
        };
        if (this.type) {
            object.type = this.type.toJSON();
        }
        return object;
    }
}
QCStatement.CLASS_NAME = "QCStatement";
class QCStatements extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.values = pvutils.getParametersValue(parameters, VALUES, QCStatements.defaultValues(VALUES));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VALUES:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VALUES:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.values || EMPTY_STRING),
                    value: QCStatement.schema(names.value || {})
                }),
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, QC_STATEMENTS_CLEAR_PROPS);
        const asn1 = asn1js.compareSchema(schema, schema, QCStatements.schema({
            names: {
                values: VALUES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.values = Array.from(asn1.result.values, element => new QCStatement({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.values, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            values: Array.from(this.values, o => o.toJSON())
        };
    }
}
QCStatements.CLASS_NAME = "QCStatements";

var _a;
class ECNamedCurves {
    static register(name, id, size) {
        this.namedCurves[name.toLowerCase()] = this.namedCurves[id] = { name, id, size };
    }
    static find(nameOrId) {
        return this.namedCurves[nameOrId.toLowerCase()] || null;
    }
}
_a = ECNamedCurves;
ECNamedCurves.namedCurves = {};
(() => {
    _a.register("P-256", "1.2.840.10045.3.1.7", 32);
    _a.register("P-384", "1.3.132.0.34", 48);
    _a.register("P-521", "1.3.132.0.35", 66);
    _a.register("brainpoolP256r1", "1.3.36.3.3.2.8.1.1.7", 32);
    _a.register("brainpoolP384r1", "1.3.36.3.3.2.8.1.1.11", 48);
    _a.register("brainpoolP512r1", "1.3.36.3.3.2.8.1.1.13", 64);
})();

const X = "x";
const Y = "y";
const NAMED_CURVE$1 = "namedCurve";
class ECPublicKey extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.x = pvutils.getParametersValue(parameters, X, ECPublicKey.defaultValues(X));
        this.y = pvutils.getParametersValue(parameters, Y, ECPublicKey.defaultValues(Y));
        this.namedCurve = pvutils.getParametersValue(parameters, NAMED_CURVE$1, ECPublicKey.defaultValues(NAMED_CURVE$1));
        if (parameters.json) {
            this.fromJSON(parameters.json);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case X:
            case Y:
                return EMPTY_BUFFER;
            case NAMED_CURVE$1:
                return EMPTY_STRING;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case X:
            case Y:
                return memberValue instanceof ArrayBuffer &&
                    (pvutils.isEqualBuffer(memberValue, ECPublicKey.defaultValues(memberName)));
            case NAMED_CURVE$1:
                return typeof memberValue === "string" &&
                    memberValue === ECPublicKey.defaultValues(memberName);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema() {
        return new asn1js.RawData();
    }
    fromSchema(schema1) {
        const view = BufferSourceConverter.toUint8Array(schema1);
        if (view[0] !== 0x04) {
            throw new Error("Object's schema was not verified against input data for ECPublicKey");
        }
        const namedCurve = ECNamedCurves.find(this.namedCurve);
        if (!namedCurve) {
            throw new Error(`Incorrect curve OID: ${this.namedCurve}`);
        }
        const coordinateLength = namedCurve.size;
        if (view.byteLength !== (coordinateLength * 2 + 1)) {
            throw new Error("Object's schema was not verified against input data for ECPublicKey");
        }
        this.namedCurve = namedCurve.name;
        this.x = view.slice(1, coordinateLength + 1).buffer;
        this.y = view.slice(1 + coordinateLength, coordinateLength * 2 + 1).buffer;
    }
    toSchema() {
        return new asn1js.RawData({
            data: pvutils.utilConcatBuf((new Uint8Array([0x04])).buffer, this.x, this.y)
        });
    }
    toJSON() {
        const namedCurve = ECNamedCurves.find(this.namedCurve);
        return {
            crv: namedCurve ? namedCurve.name : this.namedCurve,
            x: pvutils.toBase64(pvutils.arrayBufferToString(this.x), true, true, false),
            y: pvutils.toBase64(pvutils.arrayBufferToString(this.y), true, true, false)
        };
    }
    fromJSON(json) {
        ParameterError.assert("json", json, "crv", "x", "y");
        let coordinateLength = 0;
        const namedCurve = ECNamedCurves.find(json.crv);
        if (namedCurve) {
            this.namedCurve = namedCurve.id;
            coordinateLength = namedCurve.size;
        }
        const xConvertBuffer = pvutils.stringToArrayBuffer(pvutils.fromBase64(json.x, true));
        if (xConvertBuffer.byteLength < coordinateLength) {
            this.x = new ArrayBuffer(coordinateLength);
            const view = new Uint8Array(this.x);
            const convertBufferView = new Uint8Array(xConvertBuffer);
            view.set(convertBufferView, 1);
        }
        else {
            this.x = xConvertBuffer.slice(0, coordinateLength);
        }
        const yConvertBuffer = pvutils.stringToArrayBuffer(pvutils.fromBase64(json.y, true));
        if (yConvertBuffer.byteLength < coordinateLength) {
            this.y = new ArrayBuffer(coordinateLength);
            const view = new Uint8Array(this.y);
            const convertBufferView = new Uint8Array(yConvertBuffer);
            view.set(convertBufferView, 1);
        }
        else {
            this.y = yConvertBuffer.slice(0, coordinateLength);
        }
    }
}
ECPublicKey.CLASS_NAME = "ECPublicKey";

const MODULUS$1 = "modulus";
const PUBLIC_EXPONENT$1 = "publicExponent";
const CLEAR_PROPS$1b = [MODULUS$1, PUBLIC_EXPONENT$1];
class RSAPublicKey extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.modulus = pvutils.getParametersValue(parameters, MODULUS$1, RSAPublicKey.defaultValues(MODULUS$1));
        this.publicExponent = pvutils.getParametersValue(parameters, PUBLIC_EXPONENT$1, RSAPublicKey.defaultValues(PUBLIC_EXPONENT$1));
        if (parameters.json) {
            this.fromJSON(parameters.json);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case MODULUS$1:
                return new asn1js.Integer();
            case PUBLIC_EXPONENT$1:
                return new asn1js.Integer();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.modulus || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.publicExponent || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1b);
        const asn1 = asn1js.compareSchema(schema, schema, RSAPublicKey.schema({
            names: {
                modulus: MODULUS$1,
                publicExponent: PUBLIC_EXPONENT$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.modulus = asn1.result.modulus.convertFromDER(256);
        this.publicExponent = asn1.result.publicExponent;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.modulus.convertToDER(),
                this.publicExponent
            ]
        }));
    }
    toJSON() {
        return {
            n: pvtsutils.Convert.ToBase64Url(this.modulus.valueBlock.valueHexView),
            e: pvtsutils.Convert.ToBase64Url(this.publicExponent.valueBlock.valueHexView),
        };
    }
    fromJSON(json) {
        ParameterError.assert("json", json, "n", "e");
        const array = pvutils.stringToArrayBuffer(pvutils.fromBase64(json.n, true));
        this.modulus = new asn1js.Integer({ valueHex: array.slice(0, Math.pow(2, pvutils.nearestPowerOf2(array.byteLength))) });
        this.publicExponent = new asn1js.Integer({ valueHex: pvutils.stringToArrayBuffer(pvutils.fromBase64(json.e, true)).slice(0, 3) });
    }
}
RSAPublicKey.CLASS_NAME = "RSAPublicKey";

const ALGORITHM$1 = "algorithm";
const SUBJECT_PUBLIC_KEY = "subjectPublicKey";
const CLEAR_PROPS$1a = [ALGORITHM$1, SUBJECT_PUBLIC_KEY];
class PublicKeyInfo extends PkiObject {
    get parsedKey() {
        if (this._parsedKey === undefined) {
            switch (this.algorithm.algorithmId) {
                case "1.2.840.10045.2.1":
                    if ("algorithmParams" in this.algorithm) {
                        if (this.algorithm.algorithmParams.constructor.blockName() === asn1js.ObjectIdentifier.blockName()) {
                            try {
                                this._parsedKey = new ECPublicKey({
                                    namedCurve: this.algorithm.algorithmParams.valueBlock.toString(),
                                    schema: this.subjectPublicKey.valueBlock.valueHexView
                                });
                            }
                            catch {
                            }
                        }
                    }
                    break;
                case "1.2.840.113549.1.1.1":
                case "1.2.840.113549.1.1.10":
                    {
                        const publicKeyASN1 = asn1js.fromBER(this.subjectPublicKey.valueBlock.valueHexView);
                        if (publicKeyASN1.offset !== -1) {
                            try {
                                this._parsedKey = new RSAPublicKey({ schema: publicKeyASN1.result });
                            }
                            catch {
                            }
                        }
                    }
                    break;
            }
            this._parsedKey || (this._parsedKey = null);
        }
        return this._parsedKey || undefined;
    }
    set parsedKey(value) {
        this._parsedKey = value;
    }
    constructor(parameters = {}) {
        super();
        this.algorithm = pvutils.getParametersValue(parameters, ALGORITHM$1, PublicKeyInfo.defaultValues(ALGORITHM$1));
        this.subjectPublicKey = pvutils.getParametersValue(parameters, SUBJECT_PUBLIC_KEY, PublicKeyInfo.defaultValues(SUBJECT_PUBLIC_KEY));
        const parsedKey = pvutils.getParametersValue(parameters, "parsedKey", null);
        if (parsedKey) {
            this.parsedKey = parsedKey;
        }
        if (parameters.json) {
            this.fromJSON(parameters.json);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ALGORITHM$1:
                return new AlgorithmIdentifier();
            case SUBJECT_PUBLIC_KEY:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.algorithm || {}),
                new asn1js.BitString({ name: (names.subjectPublicKey || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1a);
        const asn1 = asn1js.compareSchema(schema, schema, PublicKeyInfo.schema({
            names: {
                algorithm: {
                    names: {
                        blockName: ALGORITHM$1
                    }
                },
                subjectPublicKey: SUBJECT_PUBLIC_KEY
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.algorithm = new AlgorithmIdentifier({ schema: asn1.result.algorithm });
        this.subjectPublicKey = asn1.result.subjectPublicKey;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.algorithm.toSchema(),
                this.subjectPublicKey
            ]
        }));
    }
    toJSON() {
        if (!this.parsedKey) {
            return {
                algorithm: this.algorithm.toJSON(),
                subjectPublicKey: this.subjectPublicKey.toJSON(),
            };
        }
        const jwk = {};
        switch (this.algorithm.algorithmId) {
            case "1.2.840.10045.2.1":
                jwk.kty = "EC";
                break;
            case "1.2.840.113549.1.1.1":
            case "1.2.840.113549.1.1.10":
                jwk.kty = "RSA";
                break;
        }
        const publicKeyJWK = this.parsedKey.toJSON();
        Object.assign(jwk, publicKeyJWK);
        return jwk;
    }
    fromJSON(json) {
        if ("kty" in json) {
            switch (json.kty.toUpperCase()) {
                case "EC":
                    this.parsedKey = new ECPublicKey({ json });
                    this.algorithm = new AlgorithmIdentifier({
                        algorithmId: "1.2.840.10045.2.1",
                        algorithmParams: new asn1js.ObjectIdentifier({ value: this.parsedKey.namedCurve })
                    });
                    break;
                case "RSA":
                    this.parsedKey = new RSAPublicKey({ json });
                    this.algorithm = new AlgorithmIdentifier({
                        algorithmId: "1.2.840.113549.1.1.1",
                        algorithmParams: new asn1js.Null()
                    });
                    break;
                default:
                    throw new Error(`Invalid value for "kty" parameter: ${json.kty}`);
            }
            this.subjectPublicKey = new asn1js.BitString({ valueHex: this.parsedKey.toSchema().toBER(false) });
        }
    }
    async importKey(publicKey, crypto = getCrypto(true)) {
        try {
            if (!publicKey) {
                throw new Error("Need to provide publicKey input parameter");
            }
            const exportedKey = await crypto.exportKey("spki", publicKey);
            const asn1 = asn1js.fromBER(exportedKey);
            try {
                this.fromSchema(asn1.result);
            }
            catch {
                throw new Error("Error during initializing object from schema");
            }
        }
        catch (e) {
            const message = e instanceof Error ? e.message : `${e}`;
            throw new Error(`Error during exporting public key: ${message}`);
        }
    }
}
PublicKeyInfo.CLASS_NAME = "PublicKeyInfo";

const VERSION$l = "version";
const PRIVATE_KEY$1 = "privateKey";
const NAMED_CURVE = "namedCurve";
const PUBLIC_KEY$1 = "publicKey";
const CLEAR_PROPS$19 = [
    VERSION$l,
    PRIVATE_KEY$1,
    NAMED_CURVE,
    PUBLIC_KEY$1
];
class ECPrivateKey extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$l, ECPrivateKey.defaultValues(VERSION$l));
        this.privateKey = pvutils.getParametersValue(parameters, PRIVATE_KEY$1, ECPrivateKey.defaultValues(PRIVATE_KEY$1));
        if (NAMED_CURVE in parameters) {
            this.namedCurve = pvutils.getParametersValue(parameters, NAMED_CURVE, ECPrivateKey.defaultValues(NAMED_CURVE));
        }
        if (PUBLIC_KEY$1 in parameters) {
            this.publicKey = pvutils.getParametersValue(parameters, PUBLIC_KEY$1, ECPrivateKey.defaultValues(PUBLIC_KEY$1));
        }
        if (parameters.json) {
            this.fromJSON(parameters.json);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$l:
                return 1;
            case PRIVATE_KEY$1:
                return new asn1js.OctetString();
            case NAMED_CURVE:
                return EMPTY_STRING;
            case PUBLIC_KEY$1:
                return new ECPublicKey();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$l:
                return (memberValue === ECPrivateKey.defaultValues(memberName));
            case PRIVATE_KEY$1:
                return (memberValue.isEqual(ECPrivateKey.defaultValues(memberName)));
            case NAMED_CURVE:
                return (memberValue === EMPTY_STRING);
            case PUBLIC_KEY$1:
                return ((ECPublicKey.compareWithDefault(NAMED_CURVE, memberValue.namedCurve)) &&
                    (ECPublicKey.compareWithDefault("x", memberValue.x)) &&
                    (ECPublicKey.compareWithDefault("y", memberValue.y)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                new asn1js.OctetString({ name: (names.privateKey || EMPTY_STRING) }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.ObjectIdentifier({ name: (names.namedCurve || EMPTY_STRING) })
                    ]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [
                        new asn1js.BitString({ name: (names.publicKey || EMPTY_STRING) })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$19);
        const asn1 = asn1js.compareSchema(schema, schema, ECPrivateKey.schema({
            names: {
                version: VERSION$l,
                privateKey: PRIVATE_KEY$1,
                namedCurve: NAMED_CURVE,
                publicKey: PUBLIC_KEY$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.privateKey = asn1.result.privateKey;
        if (NAMED_CURVE in asn1.result) {
            this.namedCurve = asn1.result.namedCurve.valueBlock.toString();
        }
        if (PUBLIC_KEY$1 in asn1.result) {
            const publicKeyData = { schema: asn1.result.publicKey.valueBlock.valueHex };
            if (NAMED_CURVE in this) {
                publicKeyData.namedCurve = this.namedCurve;
            }
            this.publicKey = new ECPublicKey(publicKeyData);
        }
    }
    toSchema() {
        const outputArray = [
            new asn1js.Integer({ value: this.version }),
            this.privateKey
        ];
        if (this.namedCurve) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    new asn1js.ObjectIdentifier({ value: this.namedCurve })
                ]
            }));
        }
        if (this.publicKey) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: [
                    new asn1js.BitString({ valueHex: this.publicKey.toSchema().toBER(false) })
                ]
            }));
        }
        return new asn1js.Sequence({
            value: outputArray
        });
    }
    toJSON() {
        if (!this.namedCurve || ECPrivateKey.compareWithDefault(NAMED_CURVE, this.namedCurve)) {
            throw new Error("Not enough information for making JSON: absent \"namedCurve\" value");
        }
        const curve = ECNamedCurves.find(this.namedCurve);
        const privateKeyJSON = {
            crv: curve ? curve.name : this.namedCurve,
            d: pvtsutils.Convert.ToBase64Url(this.privateKey.valueBlock.valueHexView),
        };
        if (this.publicKey) {
            const publicKeyJSON = this.publicKey.toJSON();
            privateKeyJSON.x = publicKeyJSON.x;
            privateKeyJSON.y = publicKeyJSON.y;
        }
        return privateKeyJSON;
    }
    fromJSON(json) {
        ParameterError.assert("json", json, "crv", "d");
        let coordinateLength = 0;
        const curve = ECNamedCurves.find(json.crv);
        if (curve) {
            this.namedCurve = curve.id;
            coordinateLength = curve.size;
        }
        const convertBuffer = pvtsutils.Convert.FromBase64Url(json.d);
        if (convertBuffer.byteLength < coordinateLength) {
            const buffer = new ArrayBuffer(coordinateLength);
            const view = new Uint8Array(buffer);
            const convertBufferView = new Uint8Array(convertBuffer);
            view.set(convertBufferView, 1);
            this.privateKey = new asn1js.OctetString({ valueHex: buffer });
        }
        else {
            this.privateKey = new asn1js.OctetString({ valueHex: convertBuffer.slice(0, coordinateLength) });
        }
        if (json.x && json.y) {
            this.publicKey = new ECPublicKey({ json });
        }
    }
}
ECPrivateKey.CLASS_NAME = "ECPrivateKey";

const PRIME = "prime";
const EXPONENT = "exponent";
const COEFFICIENT$1 = "coefficient";
const CLEAR_PROPS$18 = [
    PRIME,
    EXPONENT,
    COEFFICIENT$1,
];
class OtherPrimeInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.prime = pvutils.getParametersValue(parameters, PRIME, OtherPrimeInfo.defaultValues(PRIME));
        this.exponent = pvutils.getParametersValue(parameters, EXPONENT, OtherPrimeInfo.defaultValues(EXPONENT));
        this.coefficient = pvutils.getParametersValue(parameters, COEFFICIENT$1, OtherPrimeInfo.defaultValues(COEFFICIENT$1));
        if (parameters.json) {
            this.fromJSON(parameters.json);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case PRIME:
                return new asn1js.Integer();
            case EXPONENT:
                return new asn1js.Integer();
            case COEFFICIENT$1:
                return new asn1js.Integer();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.prime || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.exponent || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.coefficient || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$18);
        const asn1 = asn1js.compareSchema(schema, schema, OtherPrimeInfo.schema({
            names: {
                prime: PRIME,
                exponent: EXPONENT,
                coefficient: COEFFICIENT$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.prime = asn1.result.prime.convertFromDER();
        this.exponent = asn1.result.exponent.convertFromDER();
        this.coefficient = asn1.result.coefficient.convertFromDER();
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.prime.convertToDER(),
                this.exponent.convertToDER(),
                this.coefficient.convertToDER()
            ]
        }));
    }
    toJSON() {
        return {
            r: pvtsutils.Convert.ToBase64Url(this.prime.valueBlock.valueHexView),
            d: pvtsutils.Convert.ToBase64Url(this.exponent.valueBlock.valueHexView),
            t: pvtsutils.Convert.ToBase64Url(this.coefficient.valueBlock.valueHexView),
        };
    }
    fromJSON(json) {
        ParameterError.assert("json", json, "r", "d", "r");
        this.prime = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.r) });
        this.exponent = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.d) });
        this.coefficient = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.t) });
    }
}
OtherPrimeInfo.CLASS_NAME = "OtherPrimeInfo";

const VERSION$k = "version";
const MODULUS = "modulus";
const PUBLIC_EXPONENT = "publicExponent";
const PRIVATE_EXPONENT = "privateExponent";
const PRIME1 = "prime1";
const PRIME2 = "prime2";
const EXPONENT1 = "exponent1";
const EXPONENT2 = "exponent2";
const COEFFICIENT = "coefficient";
const OTHER_PRIME_INFOS = "otherPrimeInfos";
const CLEAR_PROPS$17 = [
    VERSION$k,
    MODULUS,
    PUBLIC_EXPONENT,
    PRIVATE_EXPONENT,
    PRIME1,
    PRIME2,
    EXPONENT1,
    EXPONENT2,
    COEFFICIENT,
    OTHER_PRIME_INFOS
];
class RSAPrivateKey extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$k, RSAPrivateKey.defaultValues(VERSION$k));
        this.modulus = pvutils.getParametersValue(parameters, MODULUS, RSAPrivateKey.defaultValues(MODULUS));
        this.publicExponent = pvutils.getParametersValue(parameters, PUBLIC_EXPONENT, RSAPrivateKey.defaultValues(PUBLIC_EXPONENT));
        this.privateExponent = pvutils.getParametersValue(parameters, PRIVATE_EXPONENT, RSAPrivateKey.defaultValues(PRIVATE_EXPONENT));
        this.prime1 = pvutils.getParametersValue(parameters, PRIME1, RSAPrivateKey.defaultValues(PRIME1));
        this.prime2 = pvutils.getParametersValue(parameters, PRIME2, RSAPrivateKey.defaultValues(PRIME2));
        this.exponent1 = pvutils.getParametersValue(parameters, EXPONENT1, RSAPrivateKey.defaultValues(EXPONENT1));
        this.exponent2 = pvutils.getParametersValue(parameters, EXPONENT2, RSAPrivateKey.defaultValues(EXPONENT2));
        this.coefficient = pvutils.getParametersValue(parameters, COEFFICIENT, RSAPrivateKey.defaultValues(COEFFICIENT));
        if (OTHER_PRIME_INFOS in parameters) {
            this.otherPrimeInfos = pvutils.getParametersValue(parameters, OTHER_PRIME_INFOS, RSAPrivateKey.defaultValues(OTHER_PRIME_INFOS));
        }
        if (parameters.json) {
            this.fromJSON(parameters.json);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$k:
                return 0;
            case MODULUS:
                return new asn1js.Integer();
            case PUBLIC_EXPONENT:
                return new asn1js.Integer();
            case PRIVATE_EXPONENT:
                return new asn1js.Integer();
            case PRIME1:
                return new asn1js.Integer();
            case PRIME2:
                return new asn1js.Integer();
            case EXPONENT1:
                return new asn1js.Integer();
            case EXPONENT2:
                return new asn1js.Integer();
            case COEFFICIENT:
                return new asn1js.Integer();
            case OTHER_PRIME_INFOS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.modulus || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.publicExponent || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.privateExponent || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.prime1 || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.prime2 || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.exponent1 || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.exponent2 || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.coefficient || EMPTY_STRING) }),
                new asn1js.Sequence({
                    optional: true,
                    value: [
                        new asn1js.Repeated({
                            name: (names.otherPrimeInfosName || EMPTY_STRING),
                            value: OtherPrimeInfo.schema(names.otherPrimeInfo || {})
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$17);
        const asn1 = asn1js.compareSchema(schema, schema, RSAPrivateKey.schema({
            names: {
                version: VERSION$k,
                modulus: MODULUS,
                publicExponent: PUBLIC_EXPONENT,
                privateExponent: PRIVATE_EXPONENT,
                prime1: PRIME1,
                prime2: PRIME2,
                exponent1: EXPONENT1,
                exponent2: EXPONENT2,
                coefficient: COEFFICIENT,
                otherPrimeInfo: {
                    names: {
                        blockName: OTHER_PRIME_INFOS
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.modulus = asn1.result.modulus.convertFromDER(256);
        this.publicExponent = asn1.result.publicExponent;
        this.privateExponent = asn1.result.privateExponent.convertFromDER(256);
        this.prime1 = asn1.result.prime1.convertFromDER(128);
        this.prime2 = asn1.result.prime2.convertFromDER(128);
        this.exponent1 = asn1.result.exponent1.convertFromDER(128);
        this.exponent2 = asn1.result.exponent2.convertFromDER(128);
        this.coefficient = asn1.result.coefficient.convertFromDER(128);
        if (OTHER_PRIME_INFOS in asn1.result)
            this.otherPrimeInfos = Array.from(asn1.result.otherPrimeInfos, element => new OtherPrimeInfo({ schema: element }));
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        outputArray.push(this.modulus.convertToDER());
        outputArray.push(this.publicExponent);
        outputArray.push(this.privateExponent.convertToDER());
        outputArray.push(this.prime1.convertToDER());
        outputArray.push(this.prime2.convertToDER());
        outputArray.push(this.exponent1.convertToDER());
        outputArray.push(this.exponent2.convertToDER());
        outputArray.push(this.coefficient.convertToDER());
        if (this.otherPrimeInfos) {
            outputArray.push(new asn1js.Sequence({
                value: Array.from(this.otherPrimeInfos, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const jwk = {
            n: pvtsutils.Convert.ToBase64Url(this.modulus.valueBlock.valueHexView),
            e: pvtsutils.Convert.ToBase64Url(this.publicExponent.valueBlock.valueHexView),
            d: pvtsutils.Convert.ToBase64Url(this.privateExponent.valueBlock.valueHexView),
            p: pvtsutils.Convert.ToBase64Url(this.prime1.valueBlock.valueHexView),
            q: pvtsutils.Convert.ToBase64Url(this.prime2.valueBlock.valueHexView),
            dp: pvtsutils.Convert.ToBase64Url(this.exponent1.valueBlock.valueHexView),
            dq: pvtsutils.Convert.ToBase64Url(this.exponent2.valueBlock.valueHexView),
            qi: pvtsutils.Convert.ToBase64Url(this.coefficient.valueBlock.valueHexView),
        };
        if (this.otherPrimeInfos) {
            jwk.oth = Array.from(this.otherPrimeInfos, o => o.toJSON());
        }
        return jwk;
    }
    fromJSON(json) {
        ParameterError.assert("json", json, "n", "e", "d", "p", "q", "dp", "dq", "qi");
        this.modulus = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.n) });
        this.publicExponent = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.e) });
        this.privateExponent = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.d) });
        this.prime1 = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.p) });
        this.prime2 = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.q) });
        this.exponent1 = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.dp) });
        this.exponent2 = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.dq) });
        this.coefficient = new asn1js.Integer({ valueHex: pvtsutils.Convert.FromBase64Url(json.qi) });
        if (json.oth) {
            this.otherPrimeInfos = Array.from(json.oth, (element) => new OtherPrimeInfo({ json: element }));
        }
    }
}
RSAPrivateKey.CLASS_NAME = "RSAPrivateKey";

const VERSION$j = "version";
const PRIVATE_KEY_ALGORITHM = "privateKeyAlgorithm";
const PRIVATE_KEY = "privateKey";
const ATTRIBUTES$5 = "attributes";
const PARSED_KEY = "parsedKey";
const CLEAR_PROPS$16 = [
    VERSION$j,
    PRIVATE_KEY_ALGORITHM,
    PRIVATE_KEY,
    ATTRIBUTES$5
];
class PrivateKeyInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$j, PrivateKeyInfo.defaultValues(VERSION$j));
        this.privateKeyAlgorithm = pvutils.getParametersValue(parameters, PRIVATE_KEY_ALGORITHM, PrivateKeyInfo.defaultValues(PRIVATE_KEY_ALGORITHM));
        this.privateKey = pvutils.getParametersValue(parameters, PRIVATE_KEY, PrivateKeyInfo.defaultValues(PRIVATE_KEY));
        if (ATTRIBUTES$5 in parameters) {
            this.attributes = pvutils.getParametersValue(parameters, ATTRIBUTES$5, PrivateKeyInfo.defaultValues(ATTRIBUTES$5));
        }
        if (PARSED_KEY in parameters) {
            this.parsedKey = pvutils.getParametersValue(parameters, PARSED_KEY, PrivateKeyInfo.defaultValues(PARSED_KEY));
        }
        if (parameters.json) {
            this.fromJSON(parameters.json);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$j:
                return 0;
            case PRIVATE_KEY_ALGORITHM:
                return new AlgorithmIdentifier();
            case PRIVATE_KEY:
                return new asn1js.OctetString();
            case ATTRIBUTES$5:
                return [];
            case PARSED_KEY:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                AlgorithmIdentifier.schema(names.privateKeyAlgorithm || {}),
                new asn1js.OctetString({ name: (names.privateKey || EMPTY_STRING) }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.attributes || EMPTY_STRING),
                            value: Attribute.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$16);
        const asn1 = asn1js.compareSchema(schema, schema, PrivateKeyInfo.schema({
            names: {
                version: VERSION$j,
                privateKeyAlgorithm: {
                    names: {
                        blockName: PRIVATE_KEY_ALGORITHM
                    }
                },
                privateKey: PRIVATE_KEY,
                attributes: ATTRIBUTES$5
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.privateKeyAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.privateKeyAlgorithm });
        this.privateKey = asn1.result.privateKey;
        if (ATTRIBUTES$5 in asn1.result)
            this.attributes = Array.from(asn1.result.attributes, element => new Attribute({ schema: element }));
        switch (this.privateKeyAlgorithm.algorithmId) {
            case "1.2.840.113549.1.1.1":
                {
                    const privateKeyASN1 = asn1js.fromBER(this.privateKey.valueBlock.valueHexView);
                    if (privateKeyASN1.offset !== -1)
                        this.parsedKey = new RSAPrivateKey({ schema: privateKeyASN1.result });
                }
                break;
            case "1.2.840.10045.2.1":
                if ("algorithmParams" in this.privateKeyAlgorithm) {
                    if (this.privateKeyAlgorithm.algorithmParams instanceof asn1js.ObjectIdentifier) {
                        const privateKeyASN1 = asn1js.fromBER(this.privateKey.valueBlock.valueHexView);
                        if (privateKeyASN1.offset !== -1) {
                            this.parsedKey = new ECPrivateKey({
                                namedCurve: this.privateKeyAlgorithm.algorithmParams.valueBlock.toString(),
                                schema: privateKeyASN1.result
                            });
                        }
                    }
                }
                break;
        }
    }
    toSchema() {
        const outputArray = [
            new asn1js.Integer({ value: this.version }),
            this.privateKeyAlgorithm.toSchema(),
            this.privateKey
        ];
        if (this.attributes) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: Array.from(this.attributes, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        if (!this.parsedKey) {
            const object = {
                version: this.version,
                privateKeyAlgorithm: this.privateKeyAlgorithm.toJSON(),
                privateKey: this.privateKey.toJSON(),
            };
            if (this.attributes) {
                object.attributes = Array.from(this.attributes, o => o.toJSON());
            }
            return object;
        }
        const jwk = {};
        switch (this.privateKeyAlgorithm.algorithmId) {
            case "1.2.840.10045.2.1":
                jwk.kty = "EC";
                break;
            case "1.2.840.113549.1.1.1":
                jwk.kty = "RSA";
                break;
        }
        const publicKeyJWK = this.parsedKey.toJSON();
        Object.assign(jwk, publicKeyJWK);
        return jwk;
    }
    fromJSON(json) {
        if ("kty" in json) {
            switch (json.kty.toUpperCase()) {
                case "EC":
                    this.parsedKey = new ECPrivateKey({ json });
                    this.privateKeyAlgorithm = new AlgorithmIdentifier({
                        algorithmId: "1.2.840.10045.2.1",
                        algorithmParams: new asn1js.ObjectIdentifier({ value: this.parsedKey.namedCurve })
                    });
                    break;
                case "RSA":
                    this.parsedKey = new RSAPrivateKey({ json });
                    this.privateKeyAlgorithm = new AlgorithmIdentifier({
                        algorithmId: "1.2.840.113549.1.1.1",
                        algorithmParams: new asn1js.Null()
                    });
                    break;
                default:
                    throw new Error(`Invalid value for "kty" parameter: ${json.kty}`);
            }
            this.privateKey = new asn1js.OctetString({ valueHex: this.parsedKey.toSchema().toBER(false) });
        }
    }
}
PrivateKeyInfo.CLASS_NAME = "PrivateKeyInfo";

const CONTENT_TYPE$1 = "contentType";
const CONTENT_ENCRYPTION_ALGORITHM = "contentEncryptionAlgorithm";
const ENCRYPTED_CONTENT = "encryptedContent";
const CLEAR_PROPS$15 = [
    CONTENT_TYPE$1,
    CONTENT_ENCRYPTION_ALGORITHM,
    ENCRYPTED_CONTENT,
];
const PIECE_SIZE = 1024;
class EncryptedContentInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.contentType = pvutils.getParametersValue(parameters, CONTENT_TYPE$1, EncryptedContentInfo.defaultValues(CONTENT_TYPE$1));
        this.contentEncryptionAlgorithm = pvutils.getParametersValue(parameters, CONTENT_ENCRYPTION_ALGORITHM, EncryptedContentInfo.defaultValues(CONTENT_ENCRYPTION_ALGORITHM));
        if (ENCRYPTED_CONTENT in parameters && parameters.encryptedContent) {
            this.encryptedContent = parameters.encryptedContent;
            if ((this.encryptedContent.idBlock.tagClass === 1) &&
                (this.encryptedContent.idBlock.tagNumber === 4)) {
                if (this.encryptedContent.idBlock.isConstructed === false && !parameters.disableSplit) {
                    const constrString = new asn1js.OctetString({
                        idBlock: { isConstructed: true },
                        isConstructed: true
                    });
                    let offset = 0;
                    const valueHex = this.encryptedContent.valueBlock.valueHexView.slice().buffer;
                    let length = valueHex.byteLength;
                    while (length > 0) {
                        const pieceView = new Uint8Array(valueHex, offset, ((offset + PIECE_SIZE) > valueHex.byteLength) ? (valueHex.byteLength - offset) : PIECE_SIZE);
                        const _array = new ArrayBuffer(pieceView.length);
                        const _view = new Uint8Array(_array);
                        for (let i = 0; i < _view.length; i++)
                            _view[i] = pieceView[i];
                        constrString.valueBlock.value.push(new asn1js.OctetString({ valueHex: _array }));
                        length -= pieceView.length;
                        offset += pieceView.length;
                    }
                    this.encryptedContent = constrString;
                }
            }
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CONTENT_TYPE$1:
                return EMPTY_STRING;
            case CONTENT_ENCRYPTION_ALGORITHM:
                return new AlgorithmIdentifier();
            case ENCRYPTED_CONTENT:
                return new asn1js.OctetString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case CONTENT_TYPE$1:
                return (memberValue === EMPTY_STRING);
            case CONTENT_ENCRYPTION_ALGORITHM:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case ENCRYPTED_CONTENT:
                return (memberValue.isEqual(EncryptedContentInfo.defaultValues(ENCRYPTED_CONTENT)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.contentType || EMPTY_STRING) }),
                AlgorithmIdentifier.schema(names.contentEncryptionAlgorithm || {}),
                new asn1js.Choice({
                    value: [
                        new asn1js.Constructed({
                            name: (names.encryptedContent || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 0
                            },
                            value: [
                                new asn1js.Repeated({
                                    value: new asn1js.OctetString()
                                })
                            ]
                        }),
                        new asn1js.Primitive({
                            name: (names.encryptedContent || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 0
                            }
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$15);
        const asn1 = asn1js.compareSchema(schema, schema, EncryptedContentInfo.schema({
            names: {
                contentType: CONTENT_TYPE$1,
                contentEncryptionAlgorithm: {
                    names: {
                        blockName: CONTENT_ENCRYPTION_ALGORITHM
                    }
                },
                encryptedContent: ENCRYPTED_CONTENT
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.contentType = asn1.result.contentType.valueBlock.toString();
        this.contentEncryptionAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.contentEncryptionAlgorithm });
        if (ENCRYPTED_CONTENT in asn1.result) {
            this.encryptedContent = asn1.result.encryptedContent;
            this.encryptedContent.idBlock.tagClass = 1;
            this.encryptedContent.idBlock.tagNumber = 4;
        }
    }
    toSchema() {
        const sequenceLengthBlock = {
            isIndefiniteForm: false
        };
        const outputArray = [];
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.contentType }));
        outputArray.push(this.contentEncryptionAlgorithm.toSchema());
        if (this.encryptedContent) {
            sequenceLengthBlock.isIndefiniteForm = this.encryptedContent.idBlock.isConstructed;
            const encryptedValue = this.encryptedContent;
            encryptedValue.idBlock.tagClass = 3;
            encryptedValue.idBlock.tagNumber = 0;
            encryptedValue.lenBlock.isIndefiniteForm = this.encryptedContent.idBlock.isConstructed;
            outputArray.push(encryptedValue);
        }
        return (new asn1js.Sequence({
            lenBlock: sequenceLengthBlock,
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            contentType: this.contentType,
            contentEncryptionAlgorithm: this.contentEncryptionAlgorithm.toJSON()
        };
        if (this.encryptedContent) {
            res.encryptedContent = this.encryptedContent.toJSON();
        }
        return res;
    }
    getEncryptedContent() {
        if (!this.encryptedContent) {
            throw new Error("Parameter 'encryptedContent' is undefined");
        }
        return asn1js.OctetString.prototype.getValue.call(this.encryptedContent);
    }
}
EncryptedContentInfo.CLASS_NAME = "EncryptedContentInfo";

const HASH_ALGORITHM$4 = "hashAlgorithm";
const MASK_GEN_ALGORITHM$1 = "maskGenAlgorithm";
const SALT_LENGTH = "saltLength";
const TRAILER_FIELD = "trailerField";
const CLEAR_PROPS$14 = [
    HASH_ALGORITHM$4,
    MASK_GEN_ALGORITHM$1,
    SALT_LENGTH,
    TRAILER_FIELD
];
class RSASSAPSSParams extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.hashAlgorithm = pvutils.getParametersValue(parameters, HASH_ALGORITHM$4, RSASSAPSSParams.defaultValues(HASH_ALGORITHM$4));
        this.maskGenAlgorithm = pvutils.getParametersValue(parameters, MASK_GEN_ALGORITHM$1, RSASSAPSSParams.defaultValues(MASK_GEN_ALGORITHM$1));
        this.saltLength = pvutils.getParametersValue(parameters, SALT_LENGTH, RSASSAPSSParams.defaultValues(SALT_LENGTH));
        this.trailerField = pvutils.getParametersValue(parameters, TRAILER_FIELD, RSASSAPSSParams.defaultValues(TRAILER_FIELD));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case HASH_ALGORITHM$4:
                return new AlgorithmIdentifier({
                    algorithmId: "1.3.14.3.2.26",
                    algorithmParams: new asn1js.Null()
                });
            case MASK_GEN_ALGORITHM$1:
                return new AlgorithmIdentifier({
                    algorithmId: "1.2.840.113549.1.1.8",
                    algorithmParams: (new AlgorithmIdentifier({
                        algorithmId: "1.3.14.3.2.26",
                        algorithmParams: new asn1js.Null()
                    })).toSchema()
                });
            case SALT_LENGTH:
                return 20;
            case TRAILER_FIELD:
                return 1;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    optional: true,
                    value: [AlgorithmIdentifier.schema(names.hashAlgorithm || {})]
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    optional: true,
                    value: [AlgorithmIdentifier.schema(names.maskGenAlgorithm || {})]
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    optional: true,
                    value: [new asn1js.Integer({ name: (names.saltLength || EMPTY_STRING) })]
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 3
                    },
                    optional: true,
                    value: [new asn1js.Integer({ name: (names.trailerField || EMPTY_STRING) })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$14);
        const asn1 = asn1js.compareSchema(schema, schema, RSASSAPSSParams.schema({
            names: {
                hashAlgorithm: {
                    names: {
                        blockName: HASH_ALGORITHM$4
                    }
                },
                maskGenAlgorithm: {
                    names: {
                        blockName: MASK_GEN_ALGORITHM$1
                    }
                },
                saltLength: SALT_LENGTH,
                trailerField: TRAILER_FIELD
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (HASH_ALGORITHM$4 in asn1.result)
            this.hashAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.hashAlgorithm });
        if (MASK_GEN_ALGORITHM$1 in asn1.result)
            this.maskGenAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.maskGenAlgorithm });
        if (SALT_LENGTH in asn1.result)
            this.saltLength = asn1.result.saltLength.valueBlock.valueDec;
        if (TRAILER_FIELD in asn1.result)
            this.trailerField = asn1.result.trailerField.valueBlock.valueDec;
    }
    toSchema() {
        const outputArray = [];
        if (!this.hashAlgorithm.isEqual(RSASSAPSSParams.defaultValues(HASH_ALGORITHM$4))) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [this.hashAlgorithm.toSchema()]
            }));
        }
        if (!this.maskGenAlgorithm.isEqual(RSASSAPSSParams.defaultValues(MASK_GEN_ALGORITHM$1))) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: [this.maskGenAlgorithm.toSchema()]
            }));
        }
        if (this.saltLength !== RSASSAPSSParams.defaultValues(SALT_LENGTH)) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                value: [new asn1js.Integer({ value: this.saltLength })]
            }));
        }
        if (this.trailerField !== RSASSAPSSParams.defaultValues(TRAILER_FIELD)) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 3
                },
                value: [new asn1js.Integer({ value: this.trailerField })]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {};
        if (!this.hashAlgorithm.isEqual(RSASSAPSSParams.defaultValues(HASH_ALGORITHM$4))) {
            res.hashAlgorithm = this.hashAlgorithm.toJSON();
        }
        if (!this.maskGenAlgorithm.isEqual(RSASSAPSSParams.defaultValues(MASK_GEN_ALGORITHM$1))) {
            res.maskGenAlgorithm = this.maskGenAlgorithm.toJSON();
        }
        if (this.saltLength !== RSASSAPSSParams.defaultValues(SALT_LENGTH)) {
            res.saltLength = this.saltLength;
        }
        if (this.trailerField !== RSASSAPSSParams.defaultValues(TRAILER_FIELD)) {
            res.trailerField = this.trailerField;
        }
        return res;
    }
}
RSASSAPSSParams.CLASS_NAME = "RSASSAPSSParams";

const SALT = "salt";
const ITERATION_COUNT = "iterationCount";
const KEY_LENGTH = "keyLength";
const PRF = "prf";
const CLEAR_PROPS$13 = [
    SALT,
    ITERATION_COUNT,
    KEY_LENGTH,
    PRF
];
class PBKDF2Params extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.salt = pvutils.getParametersValue(parameters, SALT, PBKDF2Params.defaultValues(SALT));
        this.iterationCount = pvutils.getParametersValue(parameters, ITERATION_COUNT, PBKDF2Params.defaultValues(ITERATION_COUNT));
        if (KEY_LENGTH in parameters) {
            this.keyLength = pvutils.getParametersValue(parameters, KEY_LENGTH, PBKDF2Params.defaultValues(KEY_LENGTH));
        }
        if (PRF in parameters) {
            this.prf = pvutils.getParametersValue(parameters, PRF, PBKDF2Params.defaultValues(PRF));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case SALT:
                return {};
            case ITERATION_COUNT:
                return (-1);
            case KEY_LENGTH:
                return 0;
            case PRF:
                return new AlgorithmIdentifier({
                    algorithmId: "1.3.14.3.2.26",
                    algorithmParams: new asn1js.Null()
                });
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Choice({
                    value: [
                        new asn1js.OctetString({ name: (names.saltPrimitive || EMPTY_STRING) }),
                        AlgorithmIdentifier.schema(names.saltConstructed || {})
                    ]
                }),
                new asn1js.Integer({ name: (names.iterationCount || EMPTY_STRING) }),
                new asn1js.Integer({
                    name: (names.keyLength || EMPTY_STRING),
                    optional: true
                }),
                AlgorithmIdentifier.schema(names.prf || {
                    names: {
                        optional: true
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$13);
        const asn1 = asn1js.compareSchema(schema, schema, PBKDF2Params.schema({
            names: {
                saltPrimitive: SALT,
                saltConstructed: {
                    names: {
                        blockName: SALT
                    }
                },
                iterationCount: ITERATION_COUNT,
                keyLength: KEY_LENGTH,
                prf: {
                    names: {
                        blockName: PRF,
                        optional: true
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.salt = asn1.result.salt;
        this.iterationCount = asn1.result.iterationCount.valueBlock.valueDec;
        if (KEY_LENGTH in asn1.result)
            this.keyLength = asn1.result.keyLength.valueBlock.valueDec;
        if (PRF in asn1.result)
            this.prf = new AlgorithmIdentifier({ schema: asn1.result.prf });
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.salt);
        outputArray.push(new asn1js.Integer({ value: this.iterationCount }));
        if (KEY_LENGTH in this) {
            if (PBKDF2Params.defaultValues(KEY_LENGTH) !== this.keyLength)
                outputArray.push(new asn1js.Integer({ value: this.keyLength }));
        }
        if (this.prf) {
            if (PBKDF2Params.defaultValues(PRF).isEqual(this.prf) === false)
                outputArray.push(this.prf.toSchema());
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            salt: this.salt.toJSON(),
            iterationCount: this.iterationCount
        };
        if (KEY_LENGTH in this) {
            if (PBKDF2Params.defaultValues(KEY_LENGTH) !== this.keyLength)
                res.keyLength = this.keyLength;
        }
        if (this.prf) {
            if (PBKDF2Params.defaultValues(PRF).isEqual(this.prf) === false)
                res.prf = this.prf.toJSON();
        }
        return res;
    }
}
PBKDF2Params.CLASS_NAME = "PBKDF2Params";

const KEY_DERIVATION_FUNC = "keyDerivationFunc";
const ENCRYPTION_SCHEME = "encryptionScheme";
const CLEAR_PROPS$12 = [
    KEY_DERIVATION_FUNC,
    ENCRYPTION_SCHEME
];
class PBES2Params extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.keyDerivationFunc = pvutils.getParametersValue(parameters, KEY_DERIVATION_FUNC, PBES2Params.defaultValues(KEY_DERIVATION_FUNC));
        this.encryptionScheme = pvutils.getParametersValue(parameters, ENCRYPTION_SCHEME, PBES2Params.defaultValues(ENCRYPTION_SCHEME));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case KEY_DERIVATION_FUNC:
                return new AlgorithmIdentifier();
            case ENCRYPTION_SCHEME:
                return new AlgorithmIdentifier();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.keyDerivationFunc || {}),
                AlgorithmIdentifier.schema(names.encryptionScheme || {})
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$12);
        const asn1 = asn1js.compareSchema(schema, schema, PBES2Params.schema({
            names: {
                keyDerivationFunc: {
                    names: {
                        blockName: KEY_DERIVATION_FUNC
                    }
                },
                encryptionScheme: {
                    names: {
                        blockName: ENCRYPTION_SCHEME
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.keyDerivationFunc = new AlgorithmIdentifier({ schema: asn1.result.keyDerivationFunc });
        this.encryptionScheme = new AlgorithmIdentifier({ schema: asn1.result.encryptionScheme });
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.keyDerivationFunc.toSchema(),
                this.encryptionScheme.toSchema()
            ]
        }));
    }
    toJSON() {
        return {
            keyDerivationFunc: this.keyDerivationFunc.toJSON(),
            encryptionScheme: this.encryptionScheme.toJSON()
        };
    }
}
PBES2Params.CLASS_NAME = "PBES2Params";

class AbstractCryptoEngine {
    constructor(parameters) {
        this.crypto = parameters.crypto;
        this.subtle = "webkitSubtle" in parameters.crypto
            ? parameters.crypto.webkitSubtle
            : parameters.crypto.subtle;
        this.name = pvutils.getParametersValue(parameters, "name", EMPTY_STRING);
    }
    async encrypt(...args) {
        return this.subtle.encrypt(...args);
    }
    async decrypt(...args) {
        return this.subtle.decrypt(...args);
    }
    sign(...args) {
        return this.subtle.sign(...args);
    }
    async verify(...args) {
        return this.subtle.verify(...args);
    }
    async digest(...args) {
        return this.subtle.digest(...args);
    }
    async generateKey(...args) {
        return this.subtle.generateKey(...args);
    }
    async deriveKey(...args) {
        return this.subtle.deriveKey(...args);
    }
    async deriveBits(...args) {
        return this.subtle.deriveBits(...args);
    }
    async wrapKey(...args) {
        return this.subtle.wrapKey(...args);
    }
    async unwrapKey(...args) {
        return this.subtle.unwrapKey(...args);
    }
    exportKey(...args) {
        return this.subtle.exportKey(...args);
    }
    importKey(...args) {
        return this.subtle.importKey(...args);
    }
    getRandomValues(array) {
        if (array === null) {
            throw new Error("Argument \"array\" must not be null");
        }
        return this.crypto.getRandomValues(array);
    }
}

async function makePKCS12B2Key(hashAlgorithm, keyLength, password, salt, iterationCount) {
    let u;
    let v;
    let md;
    switch (hashAlgorithm.toUpperCase()) {
        case "SHA-1":
            u = 20;
            v = 64;
            md = sha1;
            break;
        case "SHA-256":
            u = 32;
            v = 64;
            md = sha256;
            break;
        case "SHA-384":
            u = 48;
            v = 128;
            md = sha384;
            break;
        case "SHA-512":
            u = 64;
            v = 128;
            md = sha512;
            break;
        default:
            throw new Error("Unsupported hashing algorithm");
    }
    const originalPassword = new Uint8Array(password);
    let decodedPassword = new TextDecoder().decode(password);
    const encodedPassword = new TextEncoder().encode(decodedPassword);
    if (encodedPassword.some((byte, i) => byte !== originalPassword[i])) {
        decodedPassword = String.fromCharCode(...originalPassword);
    }
    const passwordTransformed = new Uint8Array(decodedPassword.length * 2 + 2);
    const passwordView = new DataView(passwordTransformed.buffer);
    for (let i = 0; i < decodedPassword.length; i++) {
        passwordView.setUint16(i * 2, decodedPassword.charCodeAt(i), false);
    }
    passwordView.setUint16(decodedPassword.length * 2, 0, false);
    const D = new Uint8Array(v).fill(3);
    const saltView = new Uint8Array(salt);
    const S = new Uint8Array(v * Math.ceil(saltView.length / v)).map((_, i) => saltView[i % saltView.length]);
    const P = new Uint8Array(v * Math.ceil(passwordTransformed.length / v)).map((_, i) => passwordTransformed[i % passwordTransformed.length]);
    let I = new Uint8Array(S.length + P.length);
    I.set(S);
    I.set(P, S.length);
    const c = Math.ceil((keyLength >> 3) / u);
    const result = [];
    for (let i = 0; i < c; i++) {
        let A = new Uint8Array(D.length + I.length);
        A.set(D);
        A.set(I, D.length);
        for (let j = 0; j < iterationCount; j++) {
            A = md(A);
        }
        const B = new Uint8Array(v).map((_, i) => A[i % A.length]);
        const k = Math.ceil(saltView.length / v) + Math.ceil(passwordTransformed.length / v);
        const iRound = [];
        for (let j = 0; j < k; j++) {
            const chunk = Array.from(I.slice(j * v, (j + 1) * v));
            let x = 0x1ff;
            for (let l = B.length - 1; l >= 0; l--) {
                x >>= 8;
                x += B[l] + (chunk[l] || 0);
                chunk[l] = x & 0xff;
            }
            iRound.push(...chunk);
        }
        I = new Uint8Array(iRound);
        result.push(...A);
    }
    return new Uint8Array(result.slice(0, keyLength >> 3)).buffer;
}
function prepareAlgorithm(data) {
    const res = typeof data === "string"
        ? { name: data }
        : data;
    if ("hash" in res) {
        return {
            ...res,
            hash: prepareAlgorithm(res.hash)
        };
    }
    return res;
}
class CryptoEngine extends AbstractCryptoEngine {
    async importKey(format, keyData, algorithm, extractable, keyUsages) {
        var _a, _b, _c, _d, _e, _f;
        let jwk = {};
        const alg = prepareAlgorithm(algorithm);
        switch (format.toLowerCase()) {
            case "raw":
                return this.subtle.importKey("raw", keyData, algorithm, extractable, keyUsages);
            case "spki":
                {
                    const asn1 = asn1js.fromBER(pvtsutils.BufferSourceConverter.toArrayBuffer(keyData));
                    AsnError.assert(asn1, "keyData");
                    const publicKeyInfo = new PublicKeyInfo();
                    try {
                        publicKeyInfo.fromSchema(asn1.result);
                    }
                    catch {
                        throw new ArgumentError("Incorrect keyData");
                    }
                    switch (alg.name.toUpperCase()) {
                        case "RSA-PSS":
                            {
                                keyUsages = ["verify"];
                                jwk.kty = "RSA";
                                jwk.ext = extractable;
                                jwk.key_ops = keyUsages;
                                if (!["1.2.840.113549.1.1.1", "1.2.840.113549.1.1.10"].includes(publicKeyInfo.algorithm.algorithmId))
                                    throw new Error(`Incorrect public key algorithm: ${publicKeyInfo.algorithm.algorithmId}`);
                                if (!alg.hash) {
                                    throw new ParameterError("hash", "algorithm.hash", "Incorrect hash algorithm: Hash algorithm is missed");
                                }
                                switch (alg.hash.name.toUpperCase()) {
                                    case "SHA-1":
                                        jwk.alg = "PS1";
                                        break;
                                    case "SHA-256":
                                        jwk.alg = "PS256";
                                        break;
                                    case "SHA-384":
                                        jwk.alg = "PS384";
                                        break;
                                    case "SHA-512":
                                        jwk.alg = "PS512";
                                        break;
                                    default:
                                        throw new Error(`Incorrect hash algorithm: ${alg.hash.name.toUpperCase()}`);
                                }
                                const rsaPssPublicKeyJSON = publicKeyInfo.toJSON();
                                Object.assign(jwk, rsaPssPublicKeyJSON);
                            }
                            break;
                        case "RSASSA-PKCS1-V1_5":
                            {
                                keyUsages = ["verify"];
                                jwk.kty = "RSA";
                                jwk.ext = extractable;
                                jwk.key_ops = keyUsages;
                                if (publicKeyInfo.algorithm.algorithmId !== "1.2.840.113549.1.1.1")
                                    throw new Error(`Incorrect public key algorithm: ${publicKeyInfo.algorithm.algorithmId}`);
                                if (!alg.hash) {
                                    throw new ParameterError("hash", "algorithm.hash", "Incorrect hash algorithm: Hash algorithm is missed");
                                }
                                switch (alg.hash.name.toUpperCase()) {
                                    case "SHA-1":
                                        jwk.alg = "RS1";
                                        break;
                                    case "SHA-256":
                                        jwk.alg = "RS256";
                                        break;
                                    case "SHA-384":
                                        jwk.alg = "RS384";
                                        break;
                                    case "SHA-512":
                                        jwk.alg = "RS512";
                                        break;
                                    default:
                                        throw new Error(`Incorrect hash algorithm: ${alg.hash.name.toUpperCase()}`);
                                }
                                const rsaPublicKeyJSON = publicKeyInfo.toJSON();
                                Object.assign(jwk, rsaPublicKeyJSON);
                            }
                            break;
                        case "ECDSA":
                            keyUsages = ["verify"];
                        case "ECDH":
                            {
                                jwk = {
                                    kty: "EC",
                                    ext: extractable,
                                    key_ops: keyUsages
                                };
                                if (publicKeyInfo.algorithm.algorithmId !== "1.2.840.10045.2.1") {
                                    throw new Error(`Incorrect public key algorithm: ${publicKeyInfo.algorithm.algorithmId}`);
                                }
                                const publicKeyJSON = publicKeyInfo.toJSON();
                                Object.assign(jwk, publicKeyJSON);
                            }
                            break;
                        case "RSA-OAEP":
                            {
                                jwk.kty = "RSA";
                                jwk.ext = extractable;
                                jwk.key_ops = keyUsages;
                                if (this.name.toLowerCase() === "safari")
                                    jwk.alg = "RSA-OAEP";
                                else {
                                    if (!alg.hash) {
                                        throw new ParameterError("hash", "algorithm.hash", "Incorrect hash algorithm: Hash algorithm is missed");
                                    }
                                    switch (alg.hash.name.toUpperCase()) {
                                        case "SHA-1":
                                            jwk.alg = "RSA-OAEP";
                                            break;
                                        case "SHA-256":
                                            jwk.alg = "RSA-OAEP-256";
                                            break;
                                        case "SHA-384":
                                            jwk.alg = "RSA-OAEP-384";
                                            break;
                                        case "SHA-512":
                                            jwk.alg = "RSA-OAEP-512";
                                            break;
                                        default:
                                            throw new Error(`Incorrect hash algorithm: ${alg.hash.name.toUpperCase()}`);
                                    }
                                }
                                const publicKeyJSON = publicKeyInfo.toJSON();
                                Object.assign(jwk, publicKeyJSON);
                            }
                            break;
                        case "RSAES-PKCS1-V1_5":
                            {
                                jwk.kty = "RSA";
                                jwk.ext = extractable;
                                jwk.key_ops = keyUsages;
                                jwk.alg = "PS1";
                                const publicKeyJSON = publicKeyInfo.toJSON();
                                Object.assign(jwk, publicKeyJSON);
                            }
                            break;
                        default:
                            throw new Error(`Incorrect algorithm name: ${alg.name.toUpperCase()}`);
                    }
                }
                break;
            case "pkcs8":
                {
                    const privateKeyInfo = new PrivateKeyInfo();
                    const asn1 = asn1js.fromBER(pvtsutils.BufferSourceConverter.toArrayBuffer(keyData));
                    AsnError.assert(asn1, "keyData");
                    try {
                        privateKeyInfo.fromSchema(asn1.result);
                    }
                    catch {
                        throw new Error("Incorrect keyData");
                    }
                    if (!privateKeyInfo.parsedKey)
                        throw new Error("Incorrect keyData");
                    switch (alg.name.toUpperCase()) {
                        case "RSA-PSS":
                            {
                                switch ((_a = alg.hash) === null || _a === void 0 ? void 0 : _a.name.toUpperCase()) {
                                    case "SHA-1":
                                        jwk.alg = "PS1";
                                        break;
                                    case "SHA-256":
                                        jwk.alg = "PS256";
                                        break;
                                    case "SHA-384":
                                        jwk.alg = "PS384";
                                        break;
                                    case "SHA-512":
                                        jwk.alg = "PS512";
                                        break;
                                    default:
                                        throw new Error(`Incorrect hash algorithm: ${(_b = alg.hash) === null || _b === void 0 ? void 0 : _b.name.toUpperCase()}`);
                                }
                            }
                        case "RSASSA-PKCS1-V1_5":
                            {
                                keyUsages = ["sign"];
                                jwk.kty = "RSA";
                                jwk.ext = extractable;
                                jwk.key_ops = keyUsages;
                                if (privateKeyInfo.privateKeyAlgorithm.algorithmId !== "1.2.840.113549.1.1.1")
                                    throw new Error(`Incorrect private key algorithm: ${privateKeyInfo.privateKeyAlgorithm.algorithmId}`);
                                if (("alg" in jwk) === false) {
                                    switch ((_c = alg.hash) === null || _c === void 0 ? void 0 : _c.name.toUpperCase()) {
                                        case "SHA-1":
                                            jwk.alg = "RS1";
                                            break;
                                        case "SHA-256":
                                            jwk.alg = "RS256";
                                            break;
                                        case "SHA-384":
                                            jwk.alg = "RS384";
                                            break;
                                        case "SHA-512":
                                            jwk.alg = "RS512";
                                            break;
                                        default:
                                            throw new Error(`Incorrect hash algorithm: ${(_d = alg.hash) === null || _d === void 0 ? void 0 : _d.name.toUpperCase()}`);
                                    }
                                }
                                const privateKeyJSON = privateKeyInfo.toJSON();
                                Object.assign(jwk, privateKeyJSON);
                            }
                            break;
                        case "ECDSA":
                            keyUsages = ["sign"];
                        case "ECDH":
                            {
                                jwk = {
                                    kty: "EC",
                                    ext: extractable,
                                    key_ops: keyUsages
                                };
                                if (privateKeyInfo.privateKeyAlgorithm.algorithmId !== "1.2.840.10045.2.1")
                                    throw new Error(`Incorrect algorithm: ${privateKeyInfo.privateKeyAlgorithm.algorithmId}`);
                                const privateKeyJSON = privateKeyInfo.toJSON();
                                Object.assign(jwk, privateKeyJSON);
                            }
                            break;
                        case "RSA-OAEP":
                            {
                                jwk.kty = "RSA";
                                jwk.ext = extractable;
                                jwk.key_ops = keyUsages;
                                if (this.name.toLowerCase() === "safari")
                                    jwk.alg = "RSA-OAEP";
                                else {
                                    switch ((_e = alg.hash) === null || _e === void 0 ? void 0 : _e.name.toUpperCase()) {
                                        case "SHA-1":
                                            jwk.alg = "RSA-OAEP";
                                            break;
                                        case "SHA-256":
                                            jwk.alg = "RSA-OAEP-256";
                                            break;
                                        case "SHA-384":
                                            jwk.alg = "RSA-OAEP-384";
                                            break;
                                        case "SHA-512":
                                            jwk.alg = "RSA-OAEP-512";
                                            break;
                                        default:
                                            throw new Error(`Incorrect hash algorithm: ${(_f = alg.hash) === null || _f === void 0 ? void 0 : _f.name.toUpperCase()}`);
                                    }
                                }
                                const privateKeyJSON = privateKeyInfo.toJSON();
                                Object.assign(jwk, privateKeyJSON);
                            }
                            break;
                        case "RSAES-PKCS1-V1_5":
                            {
                                keyUsages = ["decrypt"];
                                jwk.kty = "RSA";
                                jwk.ext = extractable;
                                jwk.key_ops = keyUsages;
                                jwk.alg = "PS1";
                                const privateKeyJSON = privateKeyInfo.toJSON();
                                Object.assign(jwk, privateKeyJSON);
                            }
                            break;
                        default:
                            throw new Error(`Incorrect algorithm name: ${alg.name.toUpperCase()}`);
                    }
                }
                break;
            case "jwk":
                jwk = keyData;
                break;
            default:
                throw new Error(`Incorrect format: ${format}`);
        }
        if (this.name.toLowerCase() === "safari") {
            try {
                return this.subtle.importKey("jwk", pvutils.stringToArrayBuffer(JSON.stringify(jwk)), algorithm, extractable, keyUsages);
            }
            catch {
                return this.subtle.importKey("jwk", jwk, algorithm, extractable, keyUsages);
            }
        }
        return this.subtle.importKey("jwk", jwk, algorithm, extractable, keyUsages);
    }
    async exportKey(format, key) {
        let jwk = await this.subtle.exportKey("jwk", key);
        if (this.name.toLowerCase() === "safari") {
            if (jwk instanceof ArrayBuffer) {
                jwk = JSON.parse(pvutils.arrayBufferToString(jwk));
            }
        }
        switch (format.toLowerCase()) {
            case "raw":
                return this.subtle.exportKey("raw", key);
            case "spki": {
                const publicKeyInfo = new PublicKeyInfo();
                try {
                    publicKeyInfo.fromJSON(jwk);
                }
                catch {
                    throw new Error("Incorrect key data");
                }
                return publicKeyInfo.toSchema().toBER(false);
            }
            case "pkcs8": {
                const privateKeyInfo = new PrivateKeyInfo();
                try {
                    privateKeyInfo.fromJSON(jwk);
                }
                catch {
                    throw new Error("Incorrect key data");
                }
                return privateKeyInfo.toSchema().toBER(false);
            }
            case "jwk":
                return jwk;
            default:
                throw new Error(`Incorrect format: ${format}`);
        }
    }
    async convert(inputFormat, outputFormat, keyData, algorithm, extractable, keyUsages) {
        if (inputFormat.toLowerCase() === outputFormat.toLowerCase()) {
            return keyData;
        }
        const key = await this.importKey(inputFormat, keyData, algorithm, extractable, keyUsages);
        return this.exportKey(outputFormat, key);
    }
    getAlgorithmByOID(oid, safety = false, target) {
        switch (oid) {
            case "1.2.840.113549.1.1.1":
                return {
                    name: "RSAES-PKCS1-v1_5"
                };
            case "1.2.840.113549.1.1.5":
                return {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-1"
                    }
                };
            case "1.2.840.113549.1.1.11":
                return {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-256"
                    }
                };
            case "1.2.840.113549.1.1.12":
                return {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-384"
                    }
                };
            case "1.2.840.113549.1.1.13":
                return {
                    name: "RSASSA-PKCS1-v1_5",
                    hash: {
                        name: "SHA-512"
                    }
                };
            case "1.2.840.113549.1.1.10":
                return {
                    name: "RSA-PSS"
                };
            case "1.2.840.113549.1.1.7":
                return {
                    name: "RSA-OAEP"
                };
            case "1.2.840.10045.2.1":
            case "1.2.840.10045.4.1":
                return {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-1"
                    }
                };
            case "1.2.840.10045.4.3.2":
                return {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-256"
                    }
                };
            case "1.2.840.10045.4.3.3":
                return {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-384"
                    }
                };
            case "1.2.840.10045.4.3.4":
                return {
                    name: "ECDSA",
                    hash: {
                        name: "SHA-512"
                    }
                };
            case "1.3.133.16.840.63.0.2":
                return {
                    name: "ECDH",
                    kdf: "SHA-1"
                };
            case "1.3.132.1.11.1":
                return {
                    name: "ECDH",
                    kdf: "SHA-256"
                };
            case "1.3.132.1.11.2":
                return {
                    name: "ECDH",
                    kdf: "SHA-384"
                };
            case "1.3.132.1.11.3":
                return {
                    name: "ECDH",
                    kdf: "SHA-512"
                };
            case "2.16.840.1.101.3.4.1.2":
                return {
                    name: "AES-CBC",
                    length: 128
                };
            case "2.16.840.1.101.3.4.1.22":
                return {
                    name: "AES-CBC",
                    length: 192
                };
            case "2.16.840.1.101.3.4.1.42":
                return {
                    name: "AES-CBC",
                    length: 256
                };
            case "2.16.840.1.101.3.4.1.6":
                return {
                    name: "AES-GCM",
                    length: 128
                };
            case "2.16.840.1.101.3.4.1.26":
                return {
                    name: "AES-GCM",
                    length: 192
                };
            case "2.16.840.1.101.3.4.1.46":
                return {
                    name: "AES-GCM",
                    length: 256
                };
            case "2.16.840.1.101.3.4.1.4":
                return {
                    name: "AES-CFB",
                    length: 128
                };
            case "2.16.840.1.101.3.4.1.24":
                return {
                    name: "AES-CFB",
                    length: 192
                };
            case "2.16.840.1.101.3.4.1.44":
                return {
                    name: "AES-CFB",
                    length: 256
                };
            case "2.16.840.1.101.3.4.1.5":
                return {
                    name: "AES-KW",
                    length: 128
                };
            case "2.16.840.1.101.3.4.1.25":
                return {
                    name: "AES-KW",
                    length: 192
                };
            case "2.16.840.1.101.3.4.1.45":
                return {
                    name: "AES-KW",
                    length: 256
                };
            case "1.2.840.113549.2.7":
                return {
                    name: "HMAC",
                    hash: {
                        name: "SHA-1"
                    }
                };
            case "1.2.840.113549.2.9":
                return {
                    name: "HMAC",
                    hash: {
                        name: "SHA-256"
                    }
                };
            case "1.2.840.113549.2.10":
                return {
                    name: "HMAC",
                    hash: {
                        name: "SHA-384"
                    }
                };
            case "1.2.840.113549.2.11":
                return {
                    name: "HMAC",
                    hash: {
                        name: "SHA-512"
                    }
                };
            case "1.2.840.113549.1.9.16.3.5":
                return {
                    name: "DH"
                };
            case "1.3.14.3.2.26":
                return {
                    name: "SHA-1"
                };
            case "2.16.840.1.101.3.4.2.1":
                return {
                    name: "SHA-256"
                };
            case "2.16.840.1.101.3.4.2.2":
                return {
                    name: "SHA-384"
                };
            case "2.16.840.1.101.3.4.2.3":
                return {
                    name: "SHA-512"
                };
            case "1.2.840.113549.1.5.12":
                return {
                    name: "PBKDF2"
                };
            case "1.2.840.10045.3.1.7":
                return {
                    name: "P-256"
                };
            case "1.3.132.0.34":
                return {
                    name: "P-384"
                };
            case "1.3.132.0.35":
                return {
                    name: "P-521"
                };
        }
        if (safety) {
            throw new Error(`Unsupported algorithm identifier ${target ? `for ${target} ` : EMPTY_STRING}: ${oid}`);
        }
        return {};
    }
    getOIDByAlgorithm(algorithm, safety = false, target) {
        let result = EMPTY_STRING;
        switch (algorithm.name.toUpperCase()) {
            case "RSAES-PKCS1-V1_5":
                result = "1.2.840.113549.1.1.1";
                break;
            case "RSASSA-PKCS1-V1_5":
                switch (algorithm.hash.name.toUpperCase()) {
                    case "SHA-1":
                        result = "1.2.840.113549.1.1.5";
                        break;
                    case "SHA-256":
                        result = "1.2.840.113549.1.1.11";
                        break;
                    case "SHA-384":
                        result = "1.2.840.113549.1.1.12";
                        break;
                    case "SHA-512":
                        result = "1.2.840.113549.1.1.13";
                        break;
                }
                break;
            case "RSA-PSS":
                result = "1.2.840.113549.1.1.10";
                break;
            case "RSA-OAEP":
                result = "1.2.840.113549.1.1.7";
                break;
            case "ECDSA":
                switch (algorithm.hash.name.toUpperCase()) {
                    case "SHA-1":
                        result = "1.2.840.10045.4.1";
                        break;
                    case "SHA-256":
                        result = "1.2.840.10045.4.3.2";
                        break;
                    case "SHA-384":
                        result = "1.2.840.10045.4.3.3";
                        break;
                    case "SHA-512":
                        result = "1.2.840.10045.4.3.4";
                        break;
                }
                break;
            case "ECDH":
                switch (algorithm.kdf.toUpperCase()) {
                    case "SHA-1":
                        result = "1.3.133.16.840.63.0.2";
                        break;
                    case "SHA-256":
                        result = "1.3.132.1.11.1";
                        break;
                    case "SHA-384":
                        result = "1.3.132.1.11.2";
                        break;
                    case "SHA-512":
                        result = "1.3.132.1.11.3";
                        break;
                }
                break;
            case "AES-CTR":
                break;
            case "AES-CBC":
                switch (algorithm.length) {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.2";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.22";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.42";
                        break;
                }
                break;
            case "AES-CMAC":
                break;
            case "AES-GCM":
                switch (algorithm.length) {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.6";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.26";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.46";
                        break;
                }
                break;
            case "AES-CFB":
                switch (algorithm.length) {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.4";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.24";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.44";
                        break;
                }
                break;
            case "AES-KW":
                switch (algorithm.length) {
                    case 128:
                        result = "2.16.840.1.101.3.4.1.5";
                        break;
                    case 192:
                        result = "2.16.840.1.101.3.4.1.25";
                        break;
                    case 256:
                        result = "2.16.840.1.101.3.4.1.45";
                        break;
                }
                break;
            case "HMAC":
                switch (algorithm.hash.name.toUpperCase()) {
                    case "SHA-1":
                        result = "1.2.840.113549.2.7";
                        break;
                    case "SHA-256":
                        result = "1.2.840.113549.2.9";
                        break;
                    case "SHA-384":
                        result = "1.2.840.113549.2.10";
                        break;
                    case "SHA-512":
                        result = "1.2.840.113549.2.11";
                        break;
                }
                break;
            case "DH":
                result = "1.2.840.113549.1.9.16.3.5";
                break;
            case "SHA-1":
                result = "1.3.14.3.2.26";
                break;
            case "SHA-256":
                result = "2.16.840.1.101.3.4.2.1";
                break;
            case "SHA-384":
                result = "2.16.840.1.101.3.4.2.2";
                break;
            case "SHA-512":
                result = "2.16.840.1.101.3.4.2.3";
                break;
            case "CONCAT":
                break;
            case "HKDF":
                break;
            case "PBKDF2":
                result = "1.2.840.113549.1.5.12";
                break;
            case "P-256":
                result = "1.2.840.10045.3.1.7";
                break;
            case "P-384":
                result = "1.3.132.0.34";
                break;
            case "P-521":
                result = "1.3.132.0.35";
                break;
        }
        if (!result && safety) {
            throw new Error(`Unsupported algorithm ${target ? `for ${target} ` : EMPTY_STRING}: ${algorithm.name}`);
        }
        return result;
    }
    getAlgorithmParameters(algorithmName, operation) {
        let result = {
            algorithm: {},
            usages: []
        };
        switch (algorithmName.toUpperCase()) {
            case "RSAES-PKCS1-V1_5":
            case "RSASSA-PKCS1-V1_5":
                switch (operation.toLowerCase()) {
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "verify":
                    case "sign":
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5",
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["verify"]
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSASSA-PKCS1-v1_5"
                            },
                            usages: []
                        };
                }
                break;
            case "RSA-PSS":
                switch (operation.toLowerCase()) {
                    case "sign":
                    case "verify":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                hash: {
                                    name: "SHA-1"
                                },
                                saltLength: 20
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-1"
                                }
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSA-PSS",
                                hash: {
                                    name: "SHA-1"
                                }
                            },
                            usages: ["verify"]
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSA-PSS"
                            },
                            usages: []
                        };
                }
                break;
            case "RSA-OAEP":
                switch (operation.toLowerCase()) {
                    case "encrypt":
                    case "decrypt":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP"
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                                modulusLength: 2048,
                                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "RSA-OAEP",
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["encrypt"]
                        };
                        break;
                    case "exportkey":
                    default:
                        return {
                            algorithm: {
                                name: "RSA-OAEP"
                            },
                            usages: []
                        };
                }
                break;
            case "ECDSA":
                switch (operation.toLowerCase()) {
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                namedCurve: "P-256"
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                namedCurve: "P-256"
                            },
                            usages: ["verify"]
                        };
                        break;
                    case "verify":
                    case "sign":
                        result = {
                            algorithm: {
                                name: "ECDSA",
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["sign"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "ECDSA"
                            },
                            usages: []
                        };
                }
                break;
            case "ECDH":
                switch (operation.toLowerCase()) {
                    case "exportkey":
                    case "importkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "ECDH",
                                namedCurve: "P-256"
                            },
                            usages: ["deriveKey", "deriveBits"]
                        };
                        break;
                    case "derivekey":
                    case "derivebits":
                        result = {
                            algorithm: {
                                name: "ECDH",
                                namedCurve: "P-256",
                                public: []
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "ECDH"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-CTR":
                switch (operation.toLowerCase()) {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-CTR",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-CTR",
                                counter: new Uint8Array(16),
                                length: 10
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "AES-CTR"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-CBC":
                switch (operation.toLowerCase()) {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-CBC",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-CBC",
                                iv: this.getRandomValues(new Uint8Array(16))
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "AES-CBC"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-GCM":
                switch (operation.toLowerCase()) {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "AES-GCM",
                                length: 256
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    case "decrypt":
                    case "encrypt":
                        result = {
                            algorithm: {
                                name: "AES-GCM",
                                iv: this.getRandomValues(new Uint8Array(16))
                            },
                            usages: ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "AES-GCM"
                            },
                            usages: []
                        };
                }
                break;
            case "AES-KW":
                switch (operation.toLowerCase()) {
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                    case "wrapkey":
                    case "unwrapkey":
                        result = {
                            algorithm: {
                                name: "AES-KW",
                                length: 256
                            },
                            usages: ["wrapKey", "unwrapKey"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "AES-KW"
                            },
                            usages: []
                        };
                }
                break;
            case "HMAC":
                switch (operation.toLowerCase()) {
                    case "sign":
                    case "verify":
                        result = {
                            algorithm: {
                                name: "HMAC"
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    case "importkey":
                    case "exportkey":
                    case "generatekey":
                        result = {
                            algorithm: {
                                name: "HMAC",
                                length: 32,
                                hash: {
                                    name: "SHA-256"
                                }
                            },
                            usages: ["sign", "verify"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "HMAC"
                            },
                            usages: []
                        };
                }
                break;
            case "HKDF":
                switch (operation.toLowerCase()) {
                    case "derivekey":
                        result = {
                            algorithm: {
                                name: "HKDF",
                                hash: "SHA-256",
                                salt: new Uint8Array([]),
                                info: new Uint8Array([])
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "HKDF"
                            },
                            usages: []
                        };
                }
                break;
            case "PBKDF2":
                switch (operation.toLowerCase()) {
                    case "derivekey":
                        result = {
                            algorithm: {
                                name: "PBKDF2",
                                hash: { name: "SHA-256" },
                                salt: new Uint8Array([]),
                                iterations: 10000
                            },
                            usages: ["encrypt", "decrypt"]
                        };
                        break;
                    default:
                        return {
                            algorithm: {
                                name: "PBKDF2"
                            },
                            usages: []
                        };
                }
                break;
        }
        return result;
    }
    getHashAlgorithm(signatureAlgorithm) {
        let result = EMPTY_STRING;
        switch (signatureAlgorithm.algorithmId) {
            case "1.2.840.10045.4.1":
            case "1.2.840.113549.1.1.5":
                result = "SHA-1";
                break;
            case "1.2.840.10045.4.3.2":
            case "1.2.840.113549.1.1.11":
                result = "SHA-256";
                break;
            case "1.2.840.10045.4.3.3":
            case "1.2.840.113549.1.1.12":
                result = "SHA-384";
                break;
            case "1.2.840.10045.4.3.4":
            case "1.2.840.113549.1.1.13":
                result = "SHA-512";
                break;
            case "1.2.840.113549.1.1.10":
                {
                    try {
                        const params = new RSASSAPSSParams({ schema: signatureAlgorithm.algorithmParams });
                        if (params.hashAlgorithm) {
                            const algorithm = this.getAlgorithmByOID(params.hashAlgorithm.algorithmId);
                            if ("name" in algorithm) {
                                result = algorithm.name;
                            }
                            else {
                                return EMPTY_STRING;
                            }
                        }
                        else
                            result = "SHA-1";
                    }
                    catch {
                    }
                }
                break;
        }
        return result;
    }
    async encryptEncryptedContentInfo(parameters) {
        ParameterError.assert(parameters, "password", "contentEncryptionAlgorithm", "hmacHashAlgorithm", "iterationCount", "contentToEncrypt", "contentToEncrypt", "contentType");
        const contentEncryptionOID = this.getOIDByAlgorithm(parameters.contentEncryptionAlgorithm, true, "contentEncryptionAlgorithm");
        const pbkdf2OID = this.getOIDByAlgorithm({
            name: "PBKDF2"
        }, true, "PBKDF2");
        const hmacOID = this.getOIDByAlgorithm({
            name: "HMAC",
            hash: {
                name: parameters.hmacHashAlgorithm
            }
        }, true, "hmacHashAlgorithm");
        const ivBuffer = new ArrayBuffer(16);
        const ivView = new Uint8Array(ivBuffer);
        this.getRandomValues(ivView);
        const saltBuffer = new ArrayBuffer(64);
        const saltView = new Uint8Array(saltBuffer);
        this.getRandomValues(saltView);
        const contentView = new Uint8Array(parameters.contentToEncrypt);
        const pbkdf2Params = new PBKDF2Params({
            salt: new asn1js.OctetString({ valueHex: saltBuffer }),
            iterationCount: parameters.iterationCount,
            prf: new AlgorithmIdentifier({
                algorithmId: hmacOID,
                algorithmParams: new asn1js.Null()
            })
        });
        const passwordView = new Uint8Array(parameters.password);
        const pbkdfKey = await this.importKey("raw", passwordView, "PBKDF2", false, ["deriveKey"]);
        const derivedKey = await this.deriveKey({
            name: "PBKDF2",
            hash: {
                name: parameters.hmacHashAlgorithm
            },
            salt: saltView,
            iterations: parameters.iterationCount
        }, pbkdfKey, parameters.contentEncryptionAlgorithm, false, ["encrypt"]);
        const encryptedData = await this.encrypt({
            name: parameters.contentEncryptionAlgorithm.name,
            iv: ivView
        }, derivedKey, contentView);
        const pbes2Parameters = new PBES2Params({
            keyDerivationFunc: new AlgorithmIdentifier({
                algorithmId: pbkdf2OID,
                algorithmParams: pbkdf2Params.toSchema()
            }),
            encryptionScheme: new AlgorithmIdentifier({
                algorithmId: contentEncryptionOID,
                algorithmParams: new asn1js.OctetString({ valueHex: ivBuffer })
            })
        });
        return new EncryptedContentInfo({
            contentType: parameters.contentType,
            contentEncryptionAlgorithm: new AlgorithmIdentifier({
                algorithmId: "1.2.840.113549.1.5.13",
                algorithmParams: pbes2Parameters.toSchema()
            }),
            encryptedContent: new asn1js.OctetString({ valueHex: encryptedData })
        });
    }
    async decryptEncryptedContentInfo(parameters) {
        ParameterError.assert(parameters, "password", "encryptedContentInfo");
        if (parameters.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId !== "1.2.840.113549.1.5.13")
            throw new Error(`Unknown "contentEncryptionAlgorithm": ${parameters.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId}`);
        let pbes2Parameters;
        try {
            pbes2Parameters = new PBES2Params({ schema: parameters.encryptedContentInfo.contentEncryptionAlgorithm.algorithmParams });
        }
        catch {
            throw new Error("Incorrectly encoded \"pbes2Parameters\"");
        }
        let pbkdf2Params;
        try {
            pbkdf2Params = new PBKDF2Params({ schema: pbes2Parameters.keyDerivationFunc.algorithmParams });
        }
        catch {
            throw new Error("Incorrectly encoded \"pbkdf2Params\"");
        }
        const contentEncryptionAlgorithm = this.getAlgorithmByOID(pbes2Parameters.encryptionScheme.algorithmId, true);
        const ivBuffer = pbes2Parameters.encryptionScheme.algorithmParams.valueBlock.valueHex;
        const ivView = new Uint8Array(ivBuffer);
        const saltBuffer = pbkdf2Params.salt.valueBlock.valueHex;
        const saltView = new Uint8Array(saltBuffer);
        const iterationCount = pbkdf2Params.iterationCount;
        let hmacHashAlgorithm = "SHA-1";
        if (pbkdf2Params.prf) {
            const algorithm = this.getAlgorithmByOID(pbkdf2Params.prf.algorithmId, true);
            hmacHashAlgorithm = algorithm.hash.name;
        }
        const pbkdfKey = await this.importKey("raw", parameters.password, "PBKDF2", false, ["deriveKey"]);
        const result = await this.deriveKey({
            name: "PBKDF2",
            hash: {
                name: hmacHashAlgorithm
            },
            salt: saltView,
            iterations: iterationCount
        }, pbkdfKey, contentEncryptionAlgorithm, false, ["decrypt"]);
        const dataBuffer = parameters.encryptedContentInfo.getEncryptedContent();
        return this.decrypt({
            name: contentEncryptionAlgorithm.name,
            iv: ivView
        }, result, dataBuffer);
    }
    async stampDataWithPassword(parameters) {
        if ((parameters instanceof Object) === false)
            throw new Error("Parameters must have type \"Object\"");
        ParameterError.assert(parameters, "password", "hashAlgorithm", "iterationCount", "salt", "contentToStamp");
        let length;
        switch (parameters.hashAlgorithm.toLowerCase()) {
            case "sha-1":
                length = 160;
                break;
            case "sha-256":
                length = 256;
                break;
            case "sha-384":
                length = 384;
                break;
            case "sha-512":
                length = 512;
                break;
            default:
                throw new Error(`Incorrect "parameters.hashAlgorithm" parameter: ${parameters.hashAlgorithm}`);
        }
        const hmacAlgorithm = {
            name: "HMAC",
            length,
            hash: {
                name: parameters.hashAlgorithm
            }
        };
        const pkcsKey = await makePKCS12B2Key(parameters.hashAlgorithm, length, parameters.password, parameters.salt, parameters.iterationCount);
        const hmacKey = await this.importKey("raw", new Uint8Array(pkcsKey), hmacAlgorithm, false, ["sign"]);
        return this.sign(hmacAlgorithm, hmacKey, new Uint8Array(parameters.contentToStamp));
    }
    async verifyDataStampedWithPassword(parameters) {
        ParameterError.assert(parameters, "password", "hashAlgorithm", "salt", "iterationCount", "contentToVerify", "signatureToVerify");
        let length = 0;
        switch (parameters.hashAlgorithm.toLowerCase()) {
            case "sha-1":
                length = 160;
                break;
            case "sha-256":
                length = 256;
                break;
            case "sha-384":
                length = 384;
                break;
            case "sha-512":
                length = 512;
                break;
            default:
                throw new Error(`Incorrect "parameters.hashAlgorithm" parameter: ${parameters.hashAlgorithm}`);
        }
        const hmacAlgorithm = {
            name: "HMAC",
            length,
            hash: {
                name: parameters.hashAlgorithm
            }
        };
        const pkcsKey = await makePKCS12B2Key(parameters.hashAlgorithm, length, parameters.password, parameters.salt, parameters.iterationCount);
        const hmacKey = await this.importKey("raw", new Uint8Array(pkcsKey), hmacAlgorithm, false, ["verify"]);
        return this.verify(hmacAlgorithm, hmacKey, new Uint8Array(parameters.signatureToVerify), new Uint8Array(parameters.contentToVerify));
    }
    async getSignatureParameters(privateKey, hashAlgorithm = "SHA-1") {
        this.getOIDByAlgorithm({ name: hashAlgorithm }, true, "hashAlgorithm");
        const signatureAlgorithm = new AlgorithmIdentifier();
        const parameters = this.getAlgorithmParameters(privateKey.algorithm.name, "sign");
        if (!Object.keys(parameters.algorithm).length) {
            throw new Error("Parameter 'algorithm' is empty");
        }
        const algorithm = parameters.algorithm;
        if ("hash" in privateKey.algorithm && privateKey.algorithm.hash && privateKey.algorithm.hash.name) {
            algorithm.hash.name = privateKey.algorithm.hash.name;
        }
        else {
            algorithm.hash.name = hashAlgorithm;
        }
        switch (privateKey.algorithm.name.toUpperCase()) {
            case "RSASSA-PKCS1-V1_5":
            case "ECDSA":
                signatureAlgorithm.algorithmId = this.getOIDByAlgorithm(algorithm, true);
                break;
            case "RSA-PSS":
                {
                    switch (algorithm.hash.name.toUpperCase()) {
                        case "SHA-256":
                            algorithm.saltLength = 32;
                            break;
                        case "SHA-384":
                            algorithm.saltLength = 48;
                            break;
                        case "SHA-512":
                            algorithm.saltLength = 64;
                            break;
                    }
                    const paramsObject = {};
                    if (algorithm.hash.name.toUpperCase() !== "SHA-1") {
                        const hashAlgorithmOID = this.getOIDByAlgorithm({ name: algorithm.hash.name }, true, "hashAlgorithm");
                        paramsObject.hashAlgorithm = new AlgorithmIdentifier({
                            algorithmId: hashAlgorithmOID,
                            algorithmParams: new asn1js.Null()
                        });
                        paramsObject.maskGenAlgorithm = new AlgorithmIdentifier({
                            algorithmId: "1.2.840.113549.1.1.8",
                            algorithmParams: paramsObject.hashAlgorithm.toSchema()
                        });
                    }
                    if (algorithm.saltLength !== 20)
                        paramsObject.saltLength = algorithm.saltLength;
                    const pssParameters = new RSASSAPSSParams(paramsObject);
                    signatureAlgorithm.algorithmId = "1.2.840.113549.1.1.10";
                    signatureAlgorithm.algorithmParams = pssParameters.toSchema();
                }
                break;
            default:
                throw new Error(`Unsupported signature algorithm: ${privateKey.algorithm.name}`);
        }
        return {
            signatureAlgorithm,
            parameters
        };
    }
    async signWithPrivateKey(data, privateKey, parameters) {
        const signature = await this.sign(parameters.algorithm, privateKey, data);
        if (parameters.algorithm.name === "ECDSA") {
            return createCMSECDSASignature(signature);
        }
        return signature;
    }
    fillPublicKeyParameters(publicKeyInfo, signatureAlgorithm) {
        const parameters = {};
        const shaAlgorithm = this.getHashAlgorithm(signatureAlgorithm);
        if (shaAlgorithm === EMPTY_STRING)
            throw new Error(`Unsupported signature algorithm: ${signatureAlgorithm.algorithmId}`);
        let algorithmId;
        if (signatureAlgorithm.algorithmId === "1.2.840.113549.1.1.10")
            algorithmId = signatureAlgorithm.algorithmId;
        else
            algorithmId = publicKeyInfo.algorithm.algorithmId;
        const algorithmObject = this.getAlgorithmByOID(algorithmId, true);
        parameters.algorithm = this.getAlgorithmParameters(algorithmObject.name, "importKey");
        if ("hash" in parameters.algorithm.algorithm)
            parameters.algorithm.algorithm.hash.name = shaAlgorithm;
        if (algorithmObject.name === "ECDSA") {
            const publicKeyAlgorithm = publicKeyInfo.algorithm;
            if (!publicKeyAlgorithm.algorithmParams) {
                throw new Error("Algorithm parameters for ECDSA public key are missed");
            }
            const publicKeyAlgorithmParams = publicKeyAlgorithm.algorithmParams;
            if ("idBlock" in publicKeyAlgorithm.algorithmParams) {
                if (!((publicKeyAlgorithmParams.idBlock.tagClass === 1) && (publicKeyAlgorithmParams.idBlock.tagNumber === 6))) {
                    throw new Error("Incorrect type for ECDSA public key parameters");
                }
            }
            const curveObject = this.getAlgorithmByOID(publicKeyAlgorithmParams.valueBlock.toString(), true);
            parameters.algorithm.algorithm.namedCurve = curveObject.name;
        }
        return parameters;
    }
    async getPublicKey(publicKeyInfo, signatureAlgorithm, parameters) {
        if (!parameters) {
            parameters = this.fillPublicKeyParameters(publicKeyInfo, signatureAlgorithm);
        }
        const publicKeyInfoBuffer = publicKeyInfo.toSchema().toBER(false);
        return this.importKey("spki", publicKeyInfoBuffer, parameters.algorithm.algorithm, true, parameters.algorithm.usages);
    }
    async verifyWithPublicKey(data, signature, publicKeyInfo, signatureAlgorithm, shaAlgorithm) {
        let publicKey;
        if (!shaAlgorithm) {
            shaAlgorithm = this.getHashAlgorithm(signatureAlgorithm);
            if (!shaAlgorithm)
                throw new Error(`Unsupported signature algorithm: ${signatureAlgorithm.algorithmId}`);
            publicKey = await this.getPublicKey(publicKeyInfo, signatureAlgorithm);
        }
        else {
            const parameters = {};
            let algorithmId;
            if (signatureAlgorithm.algorithmId === "1.2.840.113549.1.1.10")
                algorithmId = signatureAlgorithm.algorithmId;
            else
                algorithmId = publicKeyInfo.algorithm.algorithmId;
            const algorithmObject = this.getAlgorithmByOID(algorithmId, true);
            parameters.algorithm = this.getAlgorithmParameters(algorithmObject.name, "importKey");
            if ("hash" in parameters.algorithm.algorithm)
                parameters.algorithm.algorithm.hash.name = shaAlgorithm;
            if (algorithmObject.name === "ECDSA") {
                let algorithmParamsChecked = false;
                if (("algorithmParams" in publicKeyInfo.algorithm) === true) {
                    if ("idBlock" in publicKeyInfo.algorithm.algorithmParams) {
                        if ((publicKeyInfo.algorithm.algorithmParams.idBlock.tagClass === 1) && (publicKeyInfo.algorithm.algorithmParams.idBlock.tagNumber === 6))
                            algorithmParamsChecked = true;
                    }
                }
                if (algorithmParamsChecked === false) {
                    throw new Error("Incorrect type for ECDSA public key parameters");
                }
                const curveObject = this.getAlgorithmByOID(publicKeyInfo.algorithm.algorithmParams.valueBlock.toString(), true);
                parameters.algorithm.algorithm.namedCurve = curveObject.name;
            }
            publicKey = await this.getPublicKey(publicKeyInfo, null, parameters);
        }
        const algorithm = this.getAlgorithmParameters(publicKey.algorithm.name, "verify");
        if ("hash" in algorithm.algorithm)
            algorithm.algorithm.hash.name = shaAlgorithm;
        let signatureValue = signature.valueBlock.valueHexView;
        if (publicKey.algorithm.name === "ECDSA") {
            const namedCurve = ECNamedCurves.find(publicKey.algorithm.namedCurve);
            if (!namedCurve) {
                throw new Error("Unsupported named curve in use");
            }
            const asn1 = asn1js.fromBER(signatureValue);
            AsnError.assert(asn1, "Signature value");
            signatureValue = createECDSASignatureFromCMS(asn1.result, namedCurve.size);
        }
        if (publicKey.algorithm.name === "RSA-PSS") {
            const pssParameters = new RSASSAPSSParams({ schema: signatureAlgorithm.algorithmParams });
            if ("saltLength" in pssParameters)
                algorithm.algorithm.saltLength = pssParameters.saltLength;
            else
                algorithm.algorithm.saltLength = 20;
            let hashAlgo = "SHA-1";
            if ("hashAlgorithm" in pssParameters) {
                const hashAlgorithm = this.getAlgorithmByOID(pssParameters.hashAlgorithm.algorithmId, true);
                hashAlgo = hashAlgorithm.name;
            }
            algorithm.algorithm.hash.name = hashAlgo;
        }
        return this.verify(algorithm.algorithm, publicKey, signatureValue, data);
    }
}

let engine = {
    name: "none",
    crypto: null,
};
function isCryptoEngine(engine) {
    return engine
        && typeof engine === "object"
        && "crypto" in engine
        ? true
        : false;
}
function setEngine(name, ...args) {
    let crypto = null;
    if (args.length < 2) {
        if (args.length) {
            crypto = args[0];
        }
        else {
            crypto = typeof self !== "undefined" && self.crypto ? new CryptoEngine({ name: "browser", crypto: self.crypto }) : null;
        }
    }
    else {
        const cryptoArg = args[0];
        const subtleArg = args[1];
        if (isCryptoEngine(subtleArg)) {
            crypto = subtleArg;
        }
        else if (isCryptoEngine(cryptoArg)) {
            crypto = cryptoArg;
        }
        else if ("subtle" in cryptoArg && "getRandomValues" in cryptoArg) {
            crypto = new CryptoEngine({
                crypto: cryptoArg,
            });
        }
    }
    if ((typeof process !== "undefined") && ("pid" in process) && (typeof global !== "undefined") && (typeof window === "undefined")) {
        if (typeof global[process.pid] === "undefined") {
            global[process.pid] = {};
        }
        else {
            if (typeof global[process.pid] !== "object") {
                throw new Error(`Name global.${process.pid} already exists and it is not an object`);
            }
        }
        if (typeof global[process.pid].pkijs === "undefined") {
            global[process.pid].pkijs = {};
        }
        else {
            if (typeof global[process.pid].pkijs !== "object") {
                throw new Error(`Name global.${process.pid}.pkijs already exists and it is not an object`);
            }
        }
        global[process.pid].pkijs.engine = {
            name: name,
            crypto,
        };
    }
    else {
        engine = {
            name: name,
            crypto,
        };
    }
}
function getEngine() {
    if ((typeof process !== "undefined") && ("pid" in process) && (typeof global !== "undefined") && (typeof window === "undefined")) {
        let _engine;
        try {
            _engine = global[process.pid].pkijs.engine;
        }
        catch {
            throw new Error("Please call 'setEngine' before call to 'getEngine'");
        }
        return _engine;
    }
    return engine;
}
function getCrypto(safety = false) {
    const _engine = getEngine();
    if (!_engine.crypto && safety) {
        throw new Error("Unable to create WebCrypto object");
    }
    return _engine.crypto;
}
function getRandomValues(view) {
    return getCrypto(true).getRandomValues(view);
}
function getOIDByAlgorithm(algorithm, safety, target) {
    return getCrypto(true).getOIDByAlgorithm(algorithm, safety, target);
}
function getAlgorithmParameters(algorithmName, operation) {
    return getCrypto(true).getAlgorithmParameters(algorithmName, operation);
}
function createCMSECDSASignature(signatureBuffer) {
    if ((signatureBuffer.byteLength % 2) !== 0)
        return EMPTY_BUFFER;
    const length = signatureBuffer.byteLength / 2;
    const rBuffer = new ArrayBuffer(length);
    const rView = new Uint8Array(rBuffer);
    rView.set(new Uint8Array(signatureBuffer, 0, length));
    const rInteger = new asn1js.Integer({ valueHex: rBuffer });
    const sBuffer = new ArrayBuffer(length);
    const sView = new Uint8Array(sBuffer);
    sView.set(new Uint8Array(signatureBuffer, length, length));
    const sInteger = new asn1js.Integer({ valueHex: sBuffer });
    return (new asn1js.Sequence({
        value: [
            rInteger.convertToDER(),
            sInteger.convertToDER()
        ]
    })).toBER(false);
}
function createECDSASignatureFromCMS(cmsSignature, pointSize) {
    if (!(cmsSignature instanceof asn1js.Sequence
        && cmsSignature.valueBlock.value.length === 2
        && cmsSignature.valueBlock.value[0] instanceof asn1js.Integer
        && cmsSignature.valueBlock.value[1] instanceof asn1js.Integer))
        return EMPTY_BUFFER;
    const rValueView = cmsSignature.valueBlock.value[0].convertFromDER().valueBlock.valueHexView;
    const sValueView = cmsSignature.valueBlock.value[1].convertFromDER().valueBlock.valueHexView;
    const res = new Uint8Array(pointSize * 2);
    res.set(rValueView, pointSize - rValueView.byteLength);
    res.set(sValueView, (2 * pointSize) - sValueView.byteLength);
    return res.buffer;
}
function getAlgorithmByOID(oid, safety = false, target) {
    return getCrypto(true).getAlgorithmByOID(oid, safety, target);
}
function getHashAlgorithm(signatureAlgorithm) {
    return getCrypto(true).getHashAlgorithm(signatureAlgorithm);
}
async function kdfWithCounter(hashFunction, zBuffer, Counter, SharedInfo, crypto) {
    switch (hashFunction.toUpperCase()) {
        case "SHA-1":
        case "SHA-256":
        case "SHA-384":
        case "SHA-512":
            break;
        default:
            throw new ArgumentError(`Unknown hash function: ${hashFunction}`);
    }
    ArgumentError.assert(zBuffer, "zBuffer", "ArrayBuffer");
    if (zBuffer.byteLength === 0)
        throw new ArgumentError("'zBuffer' has zero length, error");
    ArgumentError.assert(SharedInfo, "SharedInfo", "ArrayBuffer");
    if (Counter > 255)
        throw new ArgumentError("Please set 'Counter' argument to value less or equal to 255");
    const counterBuffer = new ArrayBuffer(4);
    const counterView = new Uint8Array(counterBuffer);
    counterView[0] = 0x00;
    counterView[1] = 0x00;
    counterView[2] = 0x00;
    counterView[3] = Counter;
    let combinedBuffer = EMPTY_BUFFER;
    combinedBuffer = pvutils.utilConcatBuf(combinedBuffer, zBuffer);
    combinedBuffer = pvutils.utilConcatBuf(combinedBuffer, counterBuffer);
    combinedBuffer = pvutils.utilConcatBuf(combinedBuffer, SharedInfo);
    const result = await crypto.digest({ name: hashFunction }, combinedBuffer);
    return {
        counter: Counter,
        result
    };
}
async function kdf(hashFunction, Zbuffer, keydatalen, SharedInfo, crypto = getCrypto(true)) {
    let hashLength = 0;
    let maxCounter = 1;
    switch (hashFunction.toUpperCase()) {
        case "SHA-1":
            hashLength = 160;
            break;
        case "SHA-256":
            hashLength = 256;
            break;
        case "SHA-384":
            hashLength = 384;
            break;
        case "SHA-512":
            hashLength = 512;
            break;
        default:
            throw new ArgumentError(`Unknown hash function: ${hashFunction}`);
    }
    ArgumentError.assert(Zbuffer, "Zbuffer", "ArrayBuffer");
    if (Zbuffer.byteLength === 0)
        throw new ArgumentError("'Zbuffer' has zero length, error");
    ArgumentError.assert(SharedInfo, "SharedInfo", "ArrayBuffer");
    const quotient = keydatalen / hashLength;
    if (Math.floor(quotient) > 0) {
        maxCounter = Math.floor(quotient);
        if ((quotient - maxCounter) > 0)
            maxCounter++;
    }
    const incomingResult = [];
    for (let i = 1; i <= maxCounter; i++)
        incomingResult.push(await kdfWithCounter(hashFunction, Zbuffer, i, SharedInfo, crypto));
    let combinedBuffer = EMPTY_BUFFER;
    let currentCounter = 1;
    let found = true;
    while (found) {
        found = false;
        for (const result of incomingResult) {
            if (result.counter === currentCounter) {
                combinedBuffer = pvutils.utilConcatBuf(combinedBuffer, result.result);
                found = true;
                break;
            }
        }
        currentCounter++;
    }
    keydatalen >>= 3;
    if (combinedBuffer.byteLength > keydatalen) {
        const newBuffer = new ArrayBuffer(keydatalen);
        const newView = new Uint8Array(newBuffer);
        const combinedView = new Uint8Array(combinedBuffer);
        for (let i = 0; i < keydatalen; i++)
            newView[i] = combinedView[i];
        return newBuffer;
    }
    return combinedBuffer;
}

const VERSION$i = "version";
const LOG_ID = "logID";
const EXTENSIONS$6 = "extensions";
const TIMESTAMP = "timestamp";
const HASH_ALGORITHM$3 = "hashAlgorithm";
const SIGNATURE_ALGORITHM$8 = "signatureAlgorithm";
const SIGNATURE$7 = "signature";
const NONE = "none";
const MD5 = "md5";
const SHA1 = "sha1";
const SHA224 = "sha224";
const SHA256 = "sha256";
const SHA384 = "sha384";
const SHA512 = "sha512";
const ANONYMOUS = "anonymous";
const RSA = "rsa";
const DSA = "dsa";
const ECDSA = "ecdsa";
class SignedCertificateTimestamp extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$i, SignedCertificateTimestamp.defaultValues(VERSION$i));
        this.logID = pvutils.getParametersValue(parameters, LOG_ID, SignedCertificateTimestamp.defaultValues(LOG_ID));
        this.timestamp = pvutils.getParametersValue(parameters, TIMESTAMP, SignedCertificateTimestamp.defaultValues(TIMESTAMP));
        this.extensions = pvutils.getParametersValue(parameters, EXTENSIONS$6, SignedCertificateTimestamp.defaultValues(EXTENSIONS$6));
        this.hashAlgorithm = pvutils.getParametersValue(parameters, HASH_ALGORITHM$3, SignedCertificateTimestamp.defaultValues(HASH_ALGORITHM$3));
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$8, SignedCertificateTimestamp.defaultValues(SIGNATURE_ALGORITHM$8));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE$7, SignedCertificateTimestamp.defaultValues(SIGNATURE$7));
        if ("stream" in parameters && parameters.stream) {
            this.fromStream(parameters.stream);
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$i:
                return 0;
            case LOG_ID:
            case EXTENSIONS$6:
                return EMPTY_BUFFER;
            case TIMESTAMP:
                return new Date(0);
            case HASH_ALGORITHM$3:
            case SIGNATURE_ALGORITHM$8:
                return EMPTY_STRING;
            case SIGNATURE$7:
                return EMPTY_BUFFER;
            default:
                return super.defaultValues(memberName);
        }
    }
    fromSchema(schema) {
        if ((schema instanceof asn1js.RawData) === false)
            throw new Error("Object's schema was not verified against input data for SignedCertificateTimestamp");
        const seqStream = new bs.SeqStream({
            stream: new bs.ByteStream({
                buffer: schema.data
            })
        });
        this.fromStream(seqStream);
    }
    fromStream(stream) {
        const blockLength = stream.getUint16();
        this.version = (stream.getBlock(1))[0];
        if (this.version === 0) {
            this.logID = (new Uint8Array(stream.getBlock(32))).buffer.slice(0);
            this.timestamp = new Date(pvutils.utilFromBase(new Uint8Array(stream.getBlock(8)), 8));
            const extensionsLength = stream.getUint16();
            this.extensions = (new Uint8Array(stream.getBlock(extensionsLength))).buffer.slice(0);
            switch ((stream.getBlock(1))[0]) {
                case 0:
                    this.hashAlgorithm = NONE;
                    break;
                case 1:
                    this.hashAlgorithm = MD5;
                    break;
                case 2:
                    this.hashAlgorithm = SHA1;
                    break;
                case 3:
                    this.hashAlgorithm = SHA224;
                    break;
                case 4:
                    this.hashAlgorithm = SHA256;
                    break;
                case 5:
                    this.hashAlgorithm = SHA384;
                    break;
                case 6:
                    this.hashAlgorithm = SHA512;
                    break;
                default:
                    throw new Error("Object's stream was not correct for SignedCertificateTimestamp");
            }
            switch ((stream.getBlock(1))[0]) {
                case 0:
                    this.signatureAlgorithm = ANONYMOUS;
                    break;
                case 1:
                    this.signatureAlgorithm = RSA;
                    break;
                case 2:
                    this.signatureAlgorithm = DSA;
                    break;
                case 3:
                    this.signatureAlgorithm = ECDSA;
                    break;
                default:
                    throw new Error("Object's stream was not correct for SignedCertificateTimestamp");
            }
            const signatureLength = stream.getUint16();
            this.signature = new Uint8Array(stream.getBlock(signatureLength)).buffer.slice(0);
            if (blockLength !== (47 + extensionsLength + signatureLength)) {
                throw new Error("Object's stream was not correct for SignedCertificateTimestamp");
            }
        }
    }
    toSchema() {
        const stream = this.toStream();
        return new asn1js.RawData({ data: stream.stream.buffer });
    }
    toStream() {
        const stream = new bs.SeqStream();
        stream.appendUint16(47 + this.extensions.byteLength + this.signature.byteLength);
        stream.appendChar(this.version);
        stream.appendView(new Uint8Array(this.logID));
        const timeBuffer = new ArrayBuffer(8);
        const timeView = new Uint8Array(timeBuffer);
        const baseArray = pvutils.utilToBase(this.timestamp.valueOf(), 8);
        timeView.set(new Uint8Array(baseArray), 8 - baseArray.byteLength);
        stream.appendView(timeView);
        stream.appendUint16(this.extensions.byteLength);
        if (this.extensions.byteLength)
            stream.appendView(new Uint8Array(this.extensions));
        let _hashAlgorithm;
        switch (this.hashAlgorithm.toLowerCase()) {
            case NONE:
                _hashAlgorithm = 0;
                break;
            case MD5:
                _hashAlgorithm = 1;
                break;
            case SHA1:
                _hashAlgorithm = 2;
                break;
            case SHA224:
                _hashAlgorithm = 3;
                break;
            case SHA256:
                _hashAlgorithm = 4;
                break;
            case SHA384:
                _hashAlgorithm = 5;
                break;
            case SHA512:
                _hashAlgorithm = 6;
                break;
            default:
                throw new Error(`Incorrect data for hashAlgorithm: ${this.hashAlgorithm}`);
        }
        stream.appendChar(_hashAlgorithm);
        let _signatureAlgorithm;
        switch (this.signatureAlgorithm.toLowerCase()) {
            case ANONYMOUS:
                _signatureAlgorithm = 0;
                break;
            case RSA:
                _signatureAlgorithm = 1;
                break;
            case DSA:
                _signatureAlgorithm = 2;
                break;
            case ECDSA:
                _signatureAlgorithm = 3;
                break;
            default:
                throw new Error(`Incorrect data for signatureAlgorithm: ${this.signatureAlgorithm}`);
        }
        stream.appendChar(_signatureAlgorithm);
        stream.appendUint16(this.signature.byteLength);
        stream.appendView(new Uint8Array(this.signature));
        return stream;
    }
    toJSON() {
        return {
            version: this.version,
            logID: pvutils.bufferToHexCodes(this.logID),
            timestamp: this.timestamp,
            extensions: pvutils.bufferToHexCodes(this.extensions),
            hashAlgorithm: this.hashAlgorithm,
            signatureAlgorithm: this.signatureAlgorithm,
            signature: pvutils.bufferToHexCodes(this.signature),
        };
    }
    async verify(logs, data, dataType = 0, crypto = getCrypto(true)) {
        const logId = pvutils.toBase64(pvutils.arrayBufferToString(this.logID));
        let publicKeyBase64 = null;
        const stream = new bs.SeqStream();
        for (const log of logs) {
            if (log.log_id === logId) {
                publicKeyBase64 = log.key;
                break;
            }
        }
        if (!publicKeyBase64) {
            throw new Error(`Public key not found for CT with logId: ${logId}`);
        }
        const pki = pvutils.stringToArrayBuffer(pvutils.fromBase64(publicKeyBase64));
        const publicKeyInfo = PublicKeyInfo.fromBER(pki);
        stream.appendChar(0x00);
        stream.appendChar(0x00);
        const timeBuffer = new ArrayBuffer(8);
        const timeView = new Uint8Array(timeBuffer);
        const baseArray = pvutils.utilToBase(this.timestamp.valueOf(), 8);
        timeView.set(new Uint8Array(baseArray), 8 - baseArray.byteLength);
        stream.appendView(timeView);
        stream.appendUint16(dataType);
        if (dataType === 0)
            stream.appendUint24(data.byteLength);
        stream.appendView(new Uint8Array(data));
        stream.appendUint16(this.extensions.byteLength);
        if (this.extensions.byteLength !== 0)
            stream.appendView(new Uint8Array(this.extensions));
        return crypto.verifyWithPublicKey(stream.buffer.slice(0, stream.length), new asn1js.OctetString({ valueHex: this.signature }), publicKeyInfo, { algorithmId: EMPTY_STRING }, "SHA-256");
    }
}
SignedCertificateTimestamp.CLASS_NAME = "SignedCertificateTimestamp";
async function verifySCTsForCertificate(certificate, issuerCertificate, logs, index = (-1), crypto = getCrypto(true)) {
    let parsedValue = null;
    const stream = new bs.SeqStream();
    if (certificate.extensions) {
        for (let i = certificate.extensions.length - 1; i >= 0; i--) {
            switch (certificate.extensions[i].extnID) {
                case id_SignedCertificateTimestampList:
                    {
                        parsedValue = certificate.extensions[i].parsedValue;
                        if (!parsedValue || parsedValue.timestamps.length === 0)
                            throw new Error("Nothing to verify in the certificate");
                        certificate.extensions.splice(i, 1);
                    }
                    break;
            }
        }
    }
    if (parsedValue === null)
        throw new Error("No SignedCertificateTimestampList extension in the specified certificate");
    const tbs = certificate.encodeTBS().toBER();
    const issuerId = await crypto.digest({ name: "SHA-256" }, new Uint8Array(issuerCertificate.subjectPublicKeyInfo.toSchema().toBER(false)));
    stream.appendView(new Uint8Array(issuerId));
    stream.appendUint24(tbs.byteLength);
    stream.appendView(new Uint8Array(tbs));
    const preCert = stream.stream.slice(0, stream.length);
    if (index === (-1)) {
        const verifyArray = [];
        for (const timestamp of parsedValue.timestamps) {
            const verifyResult = await timestamp.verify(logs, preCert.buffer, 1, crypto);
            verifyArray.push(verifyResult);
        }
        return verifyArray;
    }
    if (index >= parsedValue.timestamps.length)
        index = (parsedValue.timestamps.length - 1);
    return [await parsedValue.timestamps[index].verify(logs, preCert.buffer, 1, crypto)];
}

const TIMESTAMPS = "timestamps";
class SignedCertificateTimestampList extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.timestamps = pvutils.getParametersValue(parameters, TIMESTAMPS, SignedCertificateTimestampList.defaultValues(TIMESTAMPS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TIMESTAMPS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TIMESTAMPS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        var _a;
        const names = pvutils.getParametersValue(parameters, "names", {});
        (_a = names.optional) !== null && _a !== void 0 ? _a : (names.optional = false);
        return (new asn1js.OctetString({
            name: (names.blockName || "SignedCertificateTimestampList"),
            optional: names.optional
        }));
    }
    fromSchema(schema) {
        if ((schema instanceof asn1js.OctetString) === false) {
            throw new Error("Object's schema was not verified against input data for SignedCertificateTimestampList");
        }
        const seqStream = new bs.SeqStream({
            stream: new bs.ByteStream({
                buffer: schema.valueBlock.valueHex
            })
        });
        const dataLength = seqStream.getUint16();
        if (dataLength !== seqStream.length) {
            throw new Error("Object's schema was not verified against input data for SignedCertificateTimestampList");
        }
        while (seqStream.length) {
            this.timestamps.push(new SignedCertificateTimestamp({ stream: seqStream }));
        }
    }
    toSchema() {
        const stream = new bs.SeqStream();
        let overallLength = 0;
        const timestampsData = [];
        for (const timestamp of this.timestamps) {
            const timestampStream = timestamp.toStream();
            timestampsData.push(timestampStream);
            overallLength += timestampStream.stream.buffer.byteLength;
        }
        stream.appendUint16(overallLength);
        for (const timestamp of timestampsData) {
            stream.appendView(timestamp.stream.view);
        }
        return new asn1js.OctetString({ valueHex: stream.stream.buffer.slice(0) });
    }
    toJSON() {
        return {
            timestamps: Array.from(this.timestamps, o => o.toJSON())
        };
    }
}
SignedCertificateTimestampList.CLASS_NAME = "SignedCertificateTimestampList";

const ATTRIBUTES$4 = "attributes";
const CLEAR_PROPS$11 = [
    ATTRIBUTES$4
];
class SubjectDirectoryAttributes extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.attributes = pvutils.getParametersValue(parameters, ATTRIBUTES$4, SubjectDirectoryAttributes.defaultValues(ATTRIBUTES$4));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ATTRIBUTES$4:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.attributes || EMPTY_STRING),
                    value: Attribute.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$11);
        const asn1 = asn1js.compareSchema(schema, schema, SubjectDirectoryAttributes.schema({
            names: {
                attributes: ATTRIBUTES$4
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.attributes = Array.from(asn1.result.attributes, element => new Attribute({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.attributes, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            attributes: Array.from(this.attributes, o => o.toJSON())
        };
    }
}
SubjectDirectoryAttributes.CLASS_NAME = "SubjectDirectoryAttributes";

class ExtensionValueFactory {
    static getItems() {
        if (!this.types) {
            this.types = {};
            ExtensionValueFactory.register(id_SubjectAltName, "SubjectAltName", AltName);
            ExtensionValueFactory.register(id_IssuerAltName, "IssuerAltName", AltName);
            ExtensionValueFactory.register(id_AuthorityKeyIdentifier, "AuthorityKeyIdentifier", AuthorityKeyIdentifier);
            ExtensionValueFactory.register(id_BasicConstraints, "BasicConstraints", BasicConstraints);
            ExtensionValueFactory.register(id_MicrosoftCaVersion, "MicrosoftCaVersion", CAVersion);
            ExtensionValueFactory.register(id_CertificatePolicies, "CertificatePolicies", CertificatePolicies);
            ExtensionValueFactory.register(id_MicrosoftAppPolicies, "CertificatePoliciesMicrosoft", CertificatePolicies);
            ExtensionValueFactory.register(id_MicrosoftCertTemplateV2, "MicrosoftCertTemplateV2", CertificateTemplate);
            ExtensionValueFactory.register(id_CRLDistributionPoints, "CRLDistributionPoints", CRLDistributionPoints);
            ExtensionValueFactory.register(id_FreshestCRL, "FreshestCRL", CRLDistributionPoints);
            ExtensionValueFactory.register(id_ExtKeyUsage, "ExtKeyUsage", ExtKeyUsage);
            ExtensionValueFactory.register(id_CertificateIssuer, "CertificateIssuer", GeneralNames);
            ExtensionValueFactory.register(id_AuthorityInfoAccess, "AuthorityInfoAccess", InfoAccess);
            ExtensionValueFactory.register(id_SubjectInfoAccess, "SubjectInfoAccess", InfoAccess);
            ExtensionValueFactory.register(id_IssuingDistributionPoint, "IssuingDistributionPoint", IssuingDistributionPoint);
            ExtensionValueFactory.register(id_NameConstraints, "NameConstraints", NameConstraints);
            ExtensionValueFactory.register(id_PolicyConstraints, "PolicyConstraints", PolicyConstraints);
            ExtensionValueFactory.register(id_PolicyMappings, "PolicyMappings", PolicyMappings);
            ExtensionValueFactory.register(id_PrivateKeyUsagePeriod, "PrivateKeyUsagePeriod", PrivateKeyUsagePeriod);
            ExtensionValueFactory.register(id_QCStatements, "QCStatements", QCStatements);
            ExtensionValueFactory.register(id_SignedCertificateTimestampList, "SignedCertificateTimestampList", SignedCertificateTimestampList);
            ExtensionValueFactory.register(id_SubjectDirectoryAttributes, "SubjectDirectoryAttributes", SubjectDirectoryAttributes);
        }
        return this.types;
    }
    static fromBER(id, raw) {
        const asn1 = asn1js.fromBER(raw);
        if (asn1.offset === -1) {
            return null;
        }
        const item = this.find(id);
        if (item) {
            try {
                return new item.type({ schema: asn1.result });
            }
            catch {
                const res = new item.type();
                res.parsingError = `Incorrectly formatted value of extension ${item.name} (${id})`;
                return res;
            }
        }
        return asn1.result;
    }
    static find(id) {
        const types = this.getItems();
        return types[id] || null;
    }
    static register(id, name, type) {
        this.getItems()[id] = { name, type };
    }
}

const EXTN_ID = "extnID";
const CRITICAL = "critical";
const EXTN_VALUE = "extnValue";
const PARSED_VALUE$5 = "parsedValue";
const CLEAR_PROPS$10 = [
    EXTN_ID,
    CRITICAL,
    EXTN_VALUE
];
class Extension extends PkiObject {
    get parsedValue() {
        if (this._parsedValue === undefined) {
            const parsedValue = ExtensionValueFactory.fromBER(this.extnID, this.extnValue.valueBlock.valueHexView);
            this._parsedValue = parsedValue;
        }
        return this._parsedValue || undefined;
    }
    set parsedValue(value) {
        this._parsedValue = value;
    }
    constructor(parameters = {}) {
        super();
        this.extnID = pvutils.getParametersValue(parameters, EXTN_ID, Extension.defaultValues(EXTN_ID));
        this.critical = pvutils.getParametersValue(parameters, CRITICAL, Extension.defaultValues(CRITICAL));
        if (EXTN_VALUE in parameters) {
            this.extnValue = new asn1js.OctetString({ valueHex: parameters.extnValue });
        }
        else {
            this.extnValue = Extension.defaultValues(EXTN_VALUE);
        }
        if (PARSED_VALUE$5 in parameters) {
            this.parsedValue = pvutils.getParametersValue(parameters, PARSED_VALUE$5, Extension.defaultValues(PARSED_VALUE$5));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case EXTN_ID:
                return EMPTY_STRING;
            case CRITICAL:
                return false;
            case EXTN_VALUE:
                return new asn1js.OctetString();
            case PARSED_VALUE$5:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.extnID || EMPTY_STRING) }),
                new asn1js.Boolean({
                    name: (names.critical || EMPTY_STRING),
                    optional: true
                }),
                new asn1js.OctetString({ name: (names.extnValue || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$10);
        const asn1 = asn1js.compareSchema(schema, schema, Extension.schema({
            names: {
                extnID: EXTN_ID,
                critical: CRITICAL,
                extnValue: EXTN_VALUE
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.extnID = asn1.result.extnID.valueBlock.toString();
        if (CRITICAL in asn1.result) {
            this.critical = asn1.result.critical.valueBlock.value;
        }
        this.extnValue = asn1.result.extnValue;
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.extnID }));
        if (this.critical !== Extension.defaultValues(CRITICAL)) {
            outputArray.push(new asn1js.Boolean({ value: this.critical }));
        }
        outputArray.push(this.extnValue);
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const object = {
            extnID: this.extnID,
            extnValue: this.extnValue.toJSON(),
        };
        if (this.critical !== Extension.defaultValues(CRITICAL)) {
            object.critical = this.critical;
        }
        if (this.parsedValue && this.parsedValue.toJSON) {
            object.parsedValue = this.parsedValue.toJSON();
        }
        return object;
    }
}
Extension.CLASS_NAME = "Extension";

const EXTENSIONS$5 = "extensions";
const CLEAR_PROPS$$ = [
    EXTENSIONS$5,
];
class Extensions extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.extensions = pvutils.getParametersValue(parameters, EXTENSIONS$5, Extensions.defaultValues(EXTENSIONS$5));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case EXTENSIONS$5:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}, optional = false) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            optional,
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.extensions || EMPTY_STRING),
                    value: Extension.schema(names.extension || {})
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$$);
        const asn1 = asn1js.compareSchema(schema, schema, Extensions.schema({
            names: {
                extensions: EXTENSIONS$5
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.extensions = Array.from(asn1.result.extensions, element => new Extension({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.extensions, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            extensions: this.extensions.map(o => o.toJSON())
        };
    }
}
Extensions.CLASS_NAME = "Extensions";

const ISSUER$5 = "issuer";
const SERIAL_NUMBER$6 = "serialNumber";
const ISSUER_UID = "issuerUID";
const CLEAR_PROPS$_ = [
    ISSUER$5,
    SERIAL_NUMBER$6,
    ISSUER_UID,
];
class IssuerSerial extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.issuer = pvutils.getParametersValue(parameters, ISSUER$5, IssuerSerial.defaultValues(ISSUER$5));
        this.serialNumber = pvutils.getParametersValue(parameters, SERIAL_NUMBER$6, IssuerSerial.defaultValues(SERIAL_NUMBER$6));
        if (ISSUER_UID in parameters) {
            this.issuerUID = pvutils.getParametersValue(parameters, ISSUER_UID, IssuerSerial.defaultValues(ISSUER_UID));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ISSUER$5:
                return new GeneralNames();
            case SERIAL_NUMBER$6:
                return new asn1js.Integer();
            case ISSUER_UID:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                GeneralNames.schema(names.issuer || {}),
                new asn1js.Integer({ name: (names.serialNumber || EMPTY_STRING) }),
                new asn1js.BitString({
                    optional: true,
                    name: (names.issuerUID || EMPTY_STRING)
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$_);
        const asn1 = asn1js.compareSchema(schema, schema, IssuerSerial.schema({
            names: {
                issuer: {
                    names: {
                        blockName: ISSUER$5
                    }
                },
                serialNumber: SERIAL_NUMBER$6,
                issuerUID: ISSUER_UID
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.issuer = new GeneralNames({ schema: asn1.result.issuer });
        this.serialNumber = asn1.result.serialNumber;
        if (ISSUER_UID in asn1.result)
            this.issuerUID = asn1.result.issuerUID;
    }
    toSchema() {
        const result = new asn1js.Sequence({
            value: [
                this.issuer.toSchema(),
                this.serialNumber
            ]
        });
        if (this.issuerUID) {
            result.valueBlock.value.push(this.issuerUID);
        }
        return result;
    }
    toJSON() {
        const result = {
            issuer: this.issuer.toJSON(),
            serialNumber: this.serialNumber.toJSON()
        };
        if (this.issuerUID) {
            result.issuerUID = this.issuerUID.toJSON();
        }
        return result;
    }
}
IssuerSerial.CLASS_NAME = "IssuerSerial";

const VERSION$h = "version";
const BASE_CERTIFICATE_ID$2 = "baseCertificateID";
const SUBJECT_NAME = "subjectName";
const ISSUER$4 = "issuer";
const SIGNATURE$6 = "signature";
const SERIAL_NUMBER$5 = "serialNumber";
const ATTR_CERT_VALIDITY_PERIOD$1 = "attrCertValidityPeriod";
const ATTRIBUTES$3 = "attributes";
const ISSUER_UNIQUE_ID$2 = "issuerUniqueID";
const EXTENSIONS$4 = "extensions";
const CLEAR_PROPS$Z = [
    VERSION$h,
    BASE_CERTIFICATE_ID$2,
    SUBJECT_NAME,
    ISSUER$4,
    SIGNATURE$6,
    SERIAL_NUMBER$5,
    ATTR_CERT_VALIDITY_PERIOD$1,
    ATTRIBUTES$3,
    ISSUER_UNIQUE_ID$2,
    EXTENSIONS$4,
];
class AttributeCertificateInfoV1 extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$h, AttributeCertificateInfoV1.defaultValues(VERSION$h));
        if (BASE_CERTIFICATE_ID$2 in parameters) {
            this.baseCertificateID = pvutils.getParametersValue(parameters, BASE_CERTIFICATE_ID$2, AttributeCertificateInfoV1.defaultValues(BASE_CERTIFICATE_ID$2));
        }
        if (SUBJECT_NAME in parameters) {
            this.subjectName = pvutils.getParametersValue(parameters, SUBJECT_NAME, AttributeCertificateInfoV1.defaultValues(SUBJECT_NAME));
        }
        this.issuer = pvutils.getParametersValue(parameters, ISSUER$4, AttributeCertificateInfoV1.defaultValues(ISSUER$4));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE$6, AttributeCertificateInfoV1.defaultValues(SIGNATURE$6));
        this.serialNumber = pvutils.getParametersValue(parameters, SERIAL_NUMBER$5, AttributeCertificateInfoV1.defaultValues(SERIAL_NUMBER$5));
        this.attrCertValidityPeriod = pvutils.getParametersValue(parameters, ATTR_CERT_VALIDITY_PERIOD$1, AttributeCertificateInfoV1.defaultValues(ATTR_CERT_VALIDITY_PERIOD$1));
        this.attributes = pvutils.getParametersValue(parameters, ATTRIBUTES$3, AttributeCertificateInfoV1.defaultValues(ATTRIBUTES$3));
        if (ISSUER_UNIQUE_ID$2 in parameters)
            this.issuerUniqueID = pvutils.getParametersValue(parameters, ISSUER_UNIQUE_ID$2, AttributeCertificateInfoV1.defaultValues(ISSUER_UNIQUE_ID$2));
        if (EXTENSIONS$4 in parameters) {
            this.extensions = pvutils.getParametersValue(parameters, EXTENSIONS$4, AttributeCertificateInfoV1.defaultValues(EXTENSIONS$4));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$h:
                return 0;
            case BASE_CERTIFICATE_ID$2:
                return new IssuerSerial();
            case SUBJECT_NAME:
                return new GeneralNames();
            case ISSUER$4:
                return new GeneralNames();
            case SIGNATURE$6:
                return new AlgorithmIdentifier();
            case SERIAL_NUMBER$5:
                return new asn1js.Integer();
            case ATTR_CERT_VALIDITY_PERIOD$1:
                return new AttCertValidityPeriod();
            case ATTRIBUTES$3:
                return [];
            case ISSUER_UNIQUE_ID$2:
                return new asn1js.BitString();
            case EXTENSIONS$4:
                return new Extensions();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                new asn1js.Choice({
                    value: [
                        new asn1js.Constructed({
                            name: (names.baseCertificateID || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 0
                            },
                            value: IssuerSerial.schema().valueBlock.value
                        }),
                        new asn1js.Constructed({
                            name: (names.subjectName || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 1
                            },
                            value: GeneralNames.schema().valueBlock.value
                        }),
                    ]
                }),
                GeneralNames.schema({
                    names: {
                        blockName: (names.issuer || EMPTY_STRING)
                    }
                }),
                AlgorithmIdentifier.schema(names.signature || {}),
                new asn1js.Integer({ name: (names.serialNumber || EMPTY_STRING) }),
                AttCertValidityPeriod.schema(names.attrCertValidityPeriod || {}),
                new asn1js.Sequence({
                    name: (names.attributes || EMPTY_STRING),
                    value: [
                        new asn1js.Repeated({
                            value: Attribute.schema()
                        })
                    ]
                }),
                new asn1js.BitString({
                    optional: true,
                    name: (names.issuerUniqueID || EMPTY_STRING)
                }),
                Extensions.schema(names.extensions || {}, true)
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$Z);
        const asn1 = asn1js.compareSchema(schema, schema, AttributeCertificateInfoV1.schema({
            names: {
                version: VERSION$h,
                baseCertificateID: BASE_CERTIFICATE_ID$2,
                subjectName: SUBJECT_NAME,
                issuer: ISSUER$4,
                signature: {
                    names: {
                        blockName: SIGNATURE$6
                    }
                },
                serialNumber: SERIAL_NUMBER$5,
                attrCertValidityPeriod: {
                    names: {
                        blockName: ATTR_CERT_VALIDITY_PERIOD$1
                    }
                },
                attributes: ATTRIBUTES$3,
                issuerUniqueID: ISSUER_UNIQUE_ID$2,
                extensions: {
                    names: {
                        blockName: EXTENSIONS$4
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        if (BASE_CERTIFICATE_ID$2 in asn1.result) {
            this.baseCertificateID = new IssuerSerial({
                schema: new asn1js.Sequence({
                    value: asn1.result.baseCertificateID.valueBlock.value
                })
            });
        }
        if (SUBJECT_NAME in asn1.result) {
            this.subjectName = new GeneralNames({
                schema: new asn1js.Sequence({
                    value: asn1.result.subjectName.valueBlock.value
                })
            });
        }
        this.issuer = asn1.result.issuer;
        this.signature = new AlgorithmIdentifier({ schema: asn1.result.signature });
        this.serialNumber = asn1.result.serialNumber;
        this.attrCertValidityPeriod = new AttCertValidityPeriod({ schema: asn1.result.attrCertValidityPeriod });
        this.attributes = Array.from(asn1.result.attributes.valueBlock.value, element => new Attribute({ schema: element }));
        if (ISSUER_UNIQUE_ID$2 in asn1.result) {
            this.issuerUniqueID = asn1.result.issuerUniqueID;
        }
        if (EXTENSIONS$4 in asn1.result) {
            this.extensions = new Extensions({ schema: asn1.result.extensions });
        }
    }
    toSchema() {
        const result = new asn1js.Sequence({
            value: [new asn1js.Integer({ value: this.version })]
        });
        if (this.baseCertificateID) {
            result.valueBlock.value.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: this.baseCertificateID.toSchema().valueBlock.value
            }));
        }
        if (this.subjectName) {
            result.valueBlock.value.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: this.subjectName.toSchema().valueBlock.value
            }));
        }
        result.valueBlock.value.push(this.issuer.toSchema());
        result.valueBlock.value.push(this.signature.toSchema());
        result.valueBlock.value.push(this.serialNumber);
        result.valueBlock.value.push(this.attrCertValidityPeriod.toSchema());
        result.valueBlock.value.push(new asn1js.Sequence({
            value: Array.from(this.attributes, o => o.toSchema())
        }));
        if (this.issuerUniqueID) {
            result.valueBlock.value.push(this.issuerUniqueID);
        }
        if (this.extensions) {
            result.valueBlock.value.push(this.extensions.toSchema());
        }
        return result;
    }
    toJSON() {
        const result = {
            version: this.version
        };
        if (this.baseCertificateID) {
            result.baseCertificateID = this.baseCertificateID.toJSON();
        }
        if (this.subjectName) {
            result.subjectName = this.subjectName.toJSON();
        }
        result.issuer = this.issuer.toJSON();
        result.signature = this.signature.toJSON();
        result.serialNumber = this.serialNumber.toJSON();
        result.attrCertValidityPeriod = this.attrCertValidityPeriod.toJSON();
        result.attributes = Array.from(this.attributes, o => o.toJSON());
        if (this.issuerUniqueID) {
            result.issuerUniqueID = this.issuerUniqueID.toJSON();
        }
        if (this.extensions) {
            result.extensions = this.extensions.toJSON();
        }
        return result;
    }
}
AttributeCertificateInfoV1.CLASS_NAME = "AttributeCertificateInfoV1";

const ACINFO$1 = "acinfo";
const SIGNATURE_ALGORITHM$7 = "signatureAlgorithm";
const SIGNATURE_VALUE$4 = "signatureValue";
const CLEAR_PROPS$Y = [
    ACINFO$1,
    SIGNATURE_VALUE$4,
    SIGNATURE_ALGORITHM$7
];
class AttributeCertificateV1 extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.acinfo = pvutils.getParametersValue(parameters, ACINFO$1, AttributeCertificateV1.defaultValues(ACINFO$1));
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$7, AttributeCertificateV1.defaultValues(SIGNATURE_ALGORITHM$7));
        this.signatureValue = pvutils.getParametersValue(parameters, SIGNATURE_VALUE$4, AttributeCertificateV1.defaultValues(SIGNATURE_VALUE$4));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ACINFO$1:
                return new AttributeCertificateInfoV1();
            case SIGNATURE_ALGORITHM$7:
                return new AlgorithmIdentifier();
            case SIGNATURE_VALUE$4:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AttributeCertificateInfoV1.schema(names.acinfo || {}),
                AlgorithmIdentifier.schema(names.signatureAlgorithm || {}),
                new asn1js.BitString({ name: (names.signatureValue || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$Y);
        const asn1 = asn1js.compareSchema(schema, schema, AttributeCertificateV1.schema({
            names: {
                acinfo: {
                    names: {
                        blockName: ACINFO$1
                    }
                },
                signatureAlgorithm: {
                    names: {
                        blockName: SIGNATURE_ALGORITHM$7
                    }
                },
                signatureValue: SIGNATURE_VALUE$4
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.acinfo = new AttributeCertificateInfoV1({ schema: asn1.result.acinfo });
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.signatureAlgorithm });
        this.signatureValue = asn1.result.signatureValue;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.acinfo.toSchema(),
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
    }
    toJSON() {
        return {
            acinfo: this.acinfo.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON(),
        };
    }
}
AttributeCertificateV1.CLASS_NAME = "AttributeCertificateV1";

const DIGESTED_OBJECT_TYPE = "digestedObjectType";
const OTHER_OBJECT_TYPE_ID = "otherObjectTypeID";
const DIGEST_ALGORITHM$2 = "digestAlgorithm";
const OBJECT_DIGEST = "objectDigest";
const CLEAR_PROPS$X = [
    DIGESTED_OBJECT_TYPE,
    OTHER_OBJECT_TYPE_ID,
    DIGEST_ALGORITHM$2,
    OBJECT_DIGEST,
];
class ObjectDigestInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.digestedObjectType = pvutils.getParametersValue(parameters, DIGESTED_OBJECT_TYPE, ObjectDigestInfo.defaultValues(DIGESTED_OBJECT_TYPE));
        if (OTHER_OBJECT_TYPE_ID in parameters) {
            this.otherObjectTypeID = pvutils.getParametersValue(parameters, OTHER_OBJECT_TYPE_ID, ObjectDigestInfo.defaultValues(OTHER_OBJECT_TYPE_ID));
        }
        this.digestAlgorithm = pvutils.getParametersValue(parameters, DIGEST_ALGORITHM$2, ObjectDigestInfo.defaultValues(DIGEST_ALGORITHM$2));
        this.objectDigest = pvutils.getParametersValue(parameters, OBJECT_DIGEST, ObjectDigestInfo.defaultValues(OBJECT_DIGEST));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case DIGESTED_OBJECT_TYPE:
                return new asn1js.Enumerated();
            case OTHER_OBJECT_TYPE_ID:
                return new asn1js.ObjectIdentifier();
            case DIGEST_ALGORITHM$2:
                return new AlgorithmIdentifier();
            case OBJECT_DIGEST:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Enumerated({ name: (names.digestedObjectType || EMPTY_STRING) }),
                new asn1js.ObjectIdentifier({
                    optional: true,
                    name: (names.otherObjectTypeID || EMPTY_STRING)
                }),
                AlgorithmIdentifier.schema(names.digestAlgorithm || {}),
                new asn1js.BitString({ name: (names.objectDigest || EMPTY_STRING) }),
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$X);
        const asn1 = asn1js.compareSchema(schema, schema, ObjectDigestInfo.schema({
            names: {
                digestedObjectType: DIGESTED_OBJECT_TYPE,
                otherObjectTypeID: OTHER_OBJECT_TYPE_ID,
                digestAlgorithm: {
                    names: {
                        blockName: DIGEST_ALGORITHM$2
                    }
                },
                objectDigest: OBJECT_DIGEST
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.digestedObjectType = asn1.result.digestedObjectType;
        if (OTHER_OBJECT_TYPE_ID in asn1.result) {
            this.otherObjectTypeID = asn1.result.otherObjectTypeID;
        }
        this.digestAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.digestAlgorithm });
        this.objectDigest = asn1.result.objectDigest;
    }
    toSchema() {
        const result = new asn1js.Sequence({
            value: [this.digestedObjectType]
        });
        if (this.otherObjectTypeID) {
            result.valueBlock.value.push(this.otherObjectTypeID);
        }
        result.valueBlock.value.push(this.digestAlgorithm.toSchema());
        result.valueBlock.value.push(this.objectDigest);
        return result;
    }
    toJSON() {
        const result = {
            digestedObjectType: this.digestedObjectType.toJSON(),
            digestAlgorithm: this.digestAlgorithm.toJSON(),
            objectDigest: this.objectDigest.toJSON(),
        };
        if (this.otherObjectTypeID) {
            result.otherObjectTypeID = this.otherObjectTypeID.toJSON();
        }
        return result;
    }
}
ObjectDigestInfo.CLASS_NAME = "ObjectDigestInfo";

const ISSUER_NAME = "issuerName";
const BASE_CERTIFICATE_ID$1 = "baseCertificateID";
const OBJECT_DIGEST_INFO$1 = "objectDigestInfo";
const CLEAR_PROPS$W = [
    ISSUER_NAME,
    BASE_CERTIFICATE_ID$1,
    OBJECT_DIGEST_INFO$1
];
class V2Form extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (ISSUER_NAME in parameters) {
            this.issuerName = pvutils.getParametersValue(parameters, ISSUER_NAME, V2Form.defaultValues(ISSUER_NAME));
        }
        if (BASE_CERTIFICATE_ID$1 in parameters) {
            this.baseCertificateID = pvutils.getParametersValue(parameters, BASE_CERTIFICATE_ID$1, V2Form.defaultValues(BASE_CERTIFICATE_ID$1));
        }
        if (OBJECT_DIGEST_INFO$1 in parameters) {
            this.objectDigestInfo = pvutils.getParametersValue(parameters, OBJECT_DIGEST_INFO$1, V2Form.defaultValues(OBJECT_DIGEST_INFO$1));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ISSUER_NAME:
                return new GeneralNames();
            case BASE_CERTIFICATE_ID$1:
                return new IssuerSerial();
            case OBJECT_DIGEST_INFO$1:
                return new ObjectDigestInfo();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                GeneralNames.schema({
                    names: {
                        blockName: names.issuerName
                    }
                }, true),
                new asn1js.Constructed({
                    optional: true,
                    name: (names.baseCertificateID || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: IssuerSerial.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    optional: true,
                    name: (names.objectDigestInfo || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: ObjectDigestInfo.schema().valueBlock.value
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$W);
        const asn1 = asn1js.compareSchema(schema, schema, V2Form.schema({
            names: {
                issuerName: ISSUER_NAME,
                baseCertificateID: BASE_CERTIFICATE_ID$1,
                objectDigestInfo: OBJECT_DIGEST_INFO$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (ISSUER_NAME in asn1.result)
            this.issuerName = new GeneralNames({ schema: asn1.result.issuerName });
        if (BASE_CERTIFICATE_ID$1 in asn1.result) {
            this.baseCertificateID = new IssuerSerial({
                schema: new asn1js.Sequence({
                    value: asn1.result.baseCertificateID.valueBlock.value
                })
            });
        }
        if (OBJECT_DIGEST_INFO$1 in asn1.result) {
            this.objectDigestInfo = new ObjectDigestInfo({
                schema: new asn1js.Sequence({
                    value: asn1.result.objectDigestInfo.valueBlock.value
                })
            });
        }
    }
    toSchema() {
        const result = new asn1js.Sequence();
        if (this.issuerName)
            result.valueBlock.value.push(this.issuerName.toSchema());
        if (this.baseCertificateID) {
            result.valueBlock.value.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: this.baseCertificateID.toSchema().valueBlock.value
            }));
        }
        if (this.objectDigestInfo) {
            result.valueBlock.value.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: this.objectDigestInfo.toSchema().valueBlock.value
            }));
        }
        return result;
    }
    toJSON() {
        const result = {};
        if (this.issuerName) {
            result.issuerName = this.issuerName.toJSON();
        }
        if (this.baseCertificateID) {
            result.baseCertificateID = this.baseCertificateID.toJSON();
        }
        if (this.objectDigestInfo) {
            result.objectDigestInfo = this.objectDigestInfo.toJSON();
        }
        return result;
    }
}
V2Form.CLASS_NAME = "V2Form";

const BASE_CERTIFICATE_ID = "baseCertificateID";
const ENTITY_NAME = "entityName";
const OBJECT_DIGEST_INFO = "objectDigestInfo";
const CLEAR_PROPS$V = [
    BASE_CERTIFICATE_ID,
    ENTITY_NAME,
    OBJECT_DIGEST_INFO
];
class Holder extends PkiObject {
    constructor(parameters = {}) {
        super();
        if (BASE_CERTIFICATE_ID in parameters) {
            this.baseCertificateID = pvutils.getParametersValue(parameters, BASE_CERTIFICATE_ID, Holder.defaultValues(BASE_CERTIFICATE_ID));
        }
        if (ENTITY_NAME in parameters) {
            this.entityName = pvutils.getParametersValue(parameters, ENTITY_NAME, Holder.defaultValues(ENTITY_NAME));
        }
        if (OBJECT_DIGEST_INFO in parameters) {
            this.objectDigestInfo = pvutils.getParametersValue(parameters, OBJECT_DIGEST_INFO, Holder.defaultValues(OBJECT_DIGEST_INFO));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case BASE_CERTIFICATE_ID:
                return new IssuerSerial();
            case ENTITY_NAME:
                return new GeneralNames();
            case OBJECT_DIGEST_INFO:
                return new ObjectDigestInfo();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Constructed({
                    optional: true,
                    name: (names.baseCertificateID || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: IssuerSerial.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    optional: true,
                    name: (names.entityName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: GeneralNames.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    optional: true,
                    name: (names.objectDigestInfo || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    value: ObjectDigestInfo.schema().valueBlock.value
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$V);
        const asn1 = asn1js.compareSchema(schema, schema, Holder.schema({
            names: {
                baseCertificateID: BASE_CERTIFICATE_ID,
                entityName: ENTITY_NAME,
                objectDigestInfo: OBJECT_DIGEST_INFO
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (BASE_CERTIFICATE_ID in asn1.result) {
            this.baseCertificateID = new IssuerSerial({
                schema: new asn1js.Sequence({
                    value: asn1.result.baseCertificateID.valueBlock.value
                })
            });
        }
        if (ENTITY_NAME in asn1.result) {
            this.entityName = new GeneralNames({
                schema: new asn1js.Sequence({
                    value: asn1.result.entityName.valueBlock.value
                })
            });
        }
        if (OBJECT_DIGEST_INFO in asn1.result) {
            this.objectDigestInfo = new ObjectDigestInfo({
                schema: new asn1js.Sequence({
                    value: asn1.result.objectDigestInfo.valueBlock.value
                })
            });
        }
    }
    toSchema() {
        const result = new asn1js.Sequence();
        if (this.baseCertificateID) {
            result.valueBlock.value.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: this.baseCertificateID.toSchema().valueBlock.value
            }));
        }
        if (this.entityName) {
            result.valueBlock.value.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: this.entityName.toSchema().valueBlock.value
            }));
        }
        if (this.objectDigestInfo) {
            result.valueBlock.value.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                value: this.objectDigestInfo.toSchema().valueBlock.value
            }));
        }
        return result;
    }
    toJSON() {
        const result = {};
        if (this.baseCertificateID) {
            result.baseCertificateID = this.baseCertificateID.toJSON();
        }
        if (this.entityName) {
            result.entityName = this.entityName.toJSON();
        }
        if (this.objectDigestInfo) {
            result.objectDigestInfo = this.objectDigestInfo.toJSON();
        }
        return result;
    }
}
Holder.CLASS_NAME = "Holder";

const VERSION$g = "version";
const HOLDER = "holder";
const ISSUER$3 = "issuer";
const SIGNATURE$5 = "signature";
const SERIAL_NUMBER$4 = "serialNumber";
const ATTR_CERT_VALIDITY_PERIOD = "attrCertValidityPeriod";
const ATTRIBUTES$2 = "attributes";
const ISSUER_UNIQUE_ID$1 = "issuerUniqueID";
const EXTENSIONS$3 = "extensions";
const CLEAR_PROPS$U = [
    VERSION$g,
    HOLDER,
    ISSUER$3,
    SIGNATURE$5,
    SERIAL_NUMBER$4,
    ATTR_CERT_VALIDITY_PERIOD,
    ATTRIBUTES$2,
    ISSUER_UNIQUE_ID$1,
    EXTENSIONS$3
];
class AttributeCertificateInfoV2 extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$g, AttributeCertificateInfoV2.defaultValues(VERSION$g));
        this.holder = pvutils.getParametersValue(parameters, HOLDER, AttributeCertificateInfoV2.defaultValues(HOLDER));
        this.issuer = pvutils.getParametersValue(parameters, ISSUER$3, AttributeCertificateInfoV2.defaultValues(ISSUER$3));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE$5, AttributeCertificateInfoV2.defaultValues(SIGNATURE$5));
        this.serialNumber = pvutils.getParametersValue(parameters, SERIAL_NUMBER$4, AttributeCertificateInfoV2.defaultValues(SERIAL_NUMBER$4));
        this.attrCertValidityPeriod = pvutils.getParametersValue(parameters, ATTR_CERT_VALIDITY_PERIOD, AttributeCertificateInfoV2.defaultValues(ATTR_CERT_VALIDITY_PERIOD));
        this.attributes = pvutils.getParametersValue(parameters, ATTRIBUTES$2, AttributeCertificateInfoV2.defaultValues(ATTRIBUTES$2));
        if (ISSUER_UNIQUE_ID$1 in parameters) {
            this.issuerUniqueID = pvutils.getParametersValue(parameters, ISSUER_UNIQUE_ID$1, AttributeCertificateInfoV2.defaultValues(ISSUER_UNIQUE_ID$1));
        }
        if (EXTENSIONS$3 in parameters) {
            this.extensions = pvutils.getParametersValue(parameters, EXTENSIONS$3, AttributeCertificateInfoV2.defaultValues(EXTENSIONS$3));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$g:
                return 1;
            case HOLDER:
                return new Holder();
            case ISSUER$3:
                return {};
            case SIGNATURE$5:
                return new AlgorithmIdentifier();
            case SERIAL_NUMBER$4:
                return new asn1js.Integer();
            case ATTR_CERT_VALIDITY_PERIOD:
                return new AttCertValidityPeriod();
            case ATTRIBUTES$2:
                return [];
            case ISSUER_UNIQUE_ID$1:
                return new asn1js.BitString();
            case EXTENSIONS$3:
                return new Extensions();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                Holder.schema(names.holder || {}),
                new asn1js.Choice({
                    value: [
                        GeneralNames.schema({
                            names: {
                                blockName: (names.issuer || EMPTY_STRING)
                            }
                        }),
                        new asn1js.Constructed({
                            name: (names.issuer || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 0
                            },
                            value: V2Form.schema().valueBlock.value
                        })
                    ]
                }),
                AlgorithmIdentifier.schema(names.signature || {}),
                new asn1js.Integer({ name: (names.serialNumber || EMPTY_STRING) }),
                AttCertValidityPeriod.schema(names.attrCertValidityPeriod || {}),
                new asn1js.Sequence({
                    name: (names.attributes || EMPTY_STRING),
                    value: [
                        new asn1js.Repeated({
                            value: Attribute.schema()
                        })
                    ]
                }),
                new asn1js.BitString({
                    optional: true,
                    name: (names.issuerUniqueID || EMPTY_STRING)
                }),
                Extensions.schema(names.extensions || {}, true)
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$U);
        const asn1 = asn1js.compareSchema(schema, schema, AttributeCertificateInfoV2.schema({
            names: {
                version: VERSION$g,
                holder: {
                    names: {
                        blockName: HOLDER
                    }
                },
                issuer: ISSUER$3,
                signature: {
                    names: {
                        blockName: SIGNATURE$5
                    }
                },
                serialNumber: SERIAL_NUMBER$4,
                attrCertValidityPeriod: {
                    names: {
                        blockName: ATTR_CERT_VALIDITY_PERIOD
                    }
                },
                attributes: ATTRIBUTES$2,
                issuerUniqueID: ISSUER_UNIQUE_ID$1,
                extensions: {
                    names: {
                        blockName: EXTENSIONS$3
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.holder = new Holder({ schema: asn1.result.holder });
        switch (asn1.result.issuer.idBlock.tagClass) {
            case 3:
                this.issuer = new V2Form({
                    schema: new asn1js.Sequence({
                        value: asn1.result.issuer.valueBlock.value
                    })
                });
                break;
            case 1:
            default:
                throw new Error("Incorrect value for 'issuer' in AttributeCertificateInfoV2");
        }
        this.signature = new AlgorithmIdentifier({ schema: asn1.result.signature });
        this.serialNumber = asn1.result.serialNumber;
        this.attrCertValidityPeriod = new AttCertValidityPeriod({ schema: asn1.result.attrCertValidityPeriod });
        this.attributes = Array.from(asn1.result.attributes.valueBlock.value, element => new Attribute({ schema: element }));
        if (ISSUER_UNIQUE_ID$1 in asn1.result) {
            this.issuerUniqueID = asn1.result.issuerUniqueID;
        }
        if (EXTENSIONS$3 in asn1.result) {
            this.extensions = new Extensions({ schema: asn1.result.extensions });
        }
    }
    toSchema() {
        const result = new asn1js.Sequence({
            value: [
                new asn1js.Integer({ value: this.version }),
                this.holder.toSchema(),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: this.issuer.toSchema().valueBlock.value
                }),
                this.signature.toSchema(),
                this.serialNumber,
                this.attrCertValidityPeriod.toSchema(),
                new asn1js.Sequence({
                    value: Array.from(this.attributes, o => o.toSchema())
                })
            ]
        });
        if (this.issuerUniqueID) {
            result.valueBlock.value.push(this.issuerUniqueID);
        }
        if (this.extensions) {
            result.valueBlock.value.push(this.extensions.toSchema());
        }
        return result;
    }
    toJSON() {
        const result = {
            version: this.version,
            holder: this.holder.toJSON(),
            issuer: this.issuer.toJSON(),
            signature: this.signature.toJSON(),
            serialNumber: this.serialNumber.toJSON(),
            attrCertValidityPeriod: this.attrCertValidityPeriod.toJSON(),
            attributes: Array.from(this.attributes, o => o.toJSON())
        };
        if (this.issuerUniqueID) {
            result.issuerUniqueID = this.issuerUniqueID.toJSON();
        }
        if (this.extensions) {
            result.extensions = this.extensions.toJSON();
        }
        return result;
    }
}
AttributeCertificateInfoV2.CLASS_NAME = "AttributeCertificateInfoV2";

const ACINFO = "acinfo";
const SIGNATURE_ALGORITHM$6 = "signatureAlgorithm";
const SIGNATURE_VALUE$3 = "signatureValue";
const CLEAR_PROPS$T = [
    ACINFO,
    SIGNATURE_ALGORITHM$6,
    SIGNATURE_VALUE$3,
];
class AttributeCertificateV2 extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.acinfo = pvutils.getParametersValue(parameters, ACINFO, AttributeCertificateV2.defaultValues(ACINFO));
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$6, AttributeCertificateV2.defaultValues(SIGNATURE_ALGORITHM$6));
        this.signatureValue = pvutils.getParametersValue(parameters, SIGNATURE_VALUE$3, AttributeCertificateV2.defaultValues(SIGNATURE_VALUE$3));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ACINFO:
                return new AttributeCertificateInfoV2();
            case SIGNATURE_ALGORITHM$6:
                return new AlgorithmIdentifier();
            case SIGNATURE_VALUE$3:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AttributeCertificateInfoV2.schema(names.acinfo || {}),
                AlgorithmIdentifier.schema(names.signatureAlgorithm || {}),
                new asn1js.BitString({ name: (names.signatureValue || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$T);
        const asn1 = asn1js.compareSchema(schema, schema, AttributeCertificateV2.schema({
            names: {
                acinfo: {
                    names: {
                        blockName: ACINFO
                    }
                },
                signatureAlgorithm: {
                    names: {
                        blockName: SIGNATURE_ALGORITHM$6
                    }
                },
                signatureValue: SIGNATURE_VALUE$3
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.acinfo = new AttributeCertificateInfoV2({ schema: asn1.result.acinfo });
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.signatureAlgorithm });
        this.signatureValue = asn1.result.signatureValue;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.acinfo.toSchema(),
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
    }
    toJSON() {
        return {
            acinfo: this.acinfo.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON(),
        };
    }
}
AttributeCertificateV2.CLASS_NAME = "AttributeCertificateV2";

const CONTENT_TYPE = "contentType";
const CONTENT = "content";
const CLEAR_PROPS$S = [CONTENT_TYPE, CONTENT];
class ContentInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.contentType = pvutils.getParametersValue(parameters, CONTENT_TYPE, ContentInfo.defaultValues(CONTENT_TYPE));
        this.content = pvutils.getParametersValue(parameters, CONTENT, ContentInfo.defaultValues(CONTENT));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CONTENT_TYPE:
                return EMPTY_STRING;
            case CONTENT:
                return new asn1js.Any();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case CONTENT_TYPE:
                return (typeof memberValue === "string" &&
                    memberValue === this.defaultValues(CONTENT_TYPE));
            case CONTENT:
                return (memberValue instanceof asn1js.Any);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        if (("optional" in names) === false) {
            names.optional = false;
        }
        return (new asn1js.Sequence({
            name: (names.blockName || "ContentInfo"),
            optional: names.optional,
            value: [
                new asn1js.ObjectIdentifier({ name: (names.contentType || CONTENT_TYPE) }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Any({ name: (names.content || CONTENT) })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$S);
        const asn1 = asn1js.compareSchema(schema, schema, ContentInfo.schema());
        AsnError.assertSchema(asn1, this.className);
        this.contentType = asn1.result.contentType.valueBlock.toString();
        this.content = asn1.result.content;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.contentType }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [this.content]
                })
            ]
        }));
    }
    toJSON() {
        const object = {
            contentType: this.contentType
        };
        if (!(this.content instanceof asn1js.Any)) {
            object.content = this.content.toJSON();
        }
        return object;
    }
}
ContentInfo.CLASS_NAME = "ContentInfo";
ContentInfo.DATA = id_ContentType_Data;
ContentInfo.SIGNED_DATA = id_ContentType_SignedData;
ContentInfo.ENVELOPED_DATA = id_ContentType_EnvelopedData;
ContentInfo.ENCRYPTED_DATA = id_ContentType_EncryptedData;

const TYPE$1 = "type";
const VALUE$4 = "value";
const UTC_TIME_NAME = "utcTimeName";
const GENERAL_TIME_NAME = "generalTimeName";
const CLEAR_PROPS$R = [UTC_TIME_NAME, GENERAL_TIME_NAME];
var TimeType;
(function (TimeType) {
    TimeType[TimeType["UTCTime"] = 0] = "UTCTime";
    TimeType[TimeType["GeneralizedTime"] = 1] = "GeneralizedTime";
    TimeType[TimeType["empty"] = 2] = "empty";
})(TimeType || (TimeType = {}));
class Time extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.type = pvutils.getParametersValue(parameters, TYPE$1, Time.defaultValues(TYPE$1));
        this.value = pvutils.getParametersValue(parameters, VALUE$4, Time.defaultValues(VALUE$4));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TYPE$1:
                return 0;
            case VALUE$4:
                return new Date(0, 0, 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}, optional = false) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Choice({
            optional,
            value: [
                new asn1js.UTCTime({ name: (names.utcTimeName || EMPTY_STRING) }),
                new asn1js.GeneralizedTime({ name: (names.generalTimeName || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$R);
        const asn1 = asn1js.compareSchema(schema, schema, Time.schema({
            names: {
                utcTimeName: UTC_TIME_NAME,
                generalTimeName: GENERAL_TIME_NAME
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (UTC_TIME_NAME in asn1.result) {
            this.type = 0;
            this.value = asn1.result.utcTimeName.toDate();
        }
        if (GENERAL_TIME_NAME in asn1.result) {
            this.type = 1;
            this.value = asn1.result.generalTimeName.toDate();
        }
    }
    toSchema() {
        if (this.type === 0) {
            return new asn1js.UTCTime({ valueDate: this.value });
        }
        else if (this.type === 1) {
            return new asn1js.GeneralizedTime({ valueDate: this.value });
        }
        return {};
    }
    toJSON() {
        return {
            type: this.type,
            value: this.value
        };
    }
}
Time.CLASS_NAME = "Time";

const TBS$4 = "tbs";
const VERSION$f = "version";
const SERIAL_NUMBER$3 = "serialNumber";
const SIGNATURE$4 = "signature";
const ISSUER$2 = "issuer";
const NOT_BEFORE = "notBefore";
const NOT_AFTER = "notAfter";
const SUBJECT$1 = "subject";
const SUBJECT_PUBLIC_KEY_INFO = "subjectPublicKeyInfo";
const ISSUER_UNIQUE_ID = "issuerUniqueID";
const SUBJECT_UNIQUE_ID = "subjectUniqueID";
const EXTENSIONS$2 = "extensions";
const SIGNATURE_ALGORITHM$5 = "signatureAlgorithm";
const SIGNATURE_VALUE$2 = "signatureValue";
const TBS_CERTIFICATE = "tbsCertificate";
const TBS_CERTIFICATE_VERSION = `${TBS_CERTIFICATE}.${VERSION$f}`;
const TBS_CERTIFICATE_SERIAL_NUMBER = `${TBS_CERTIFICATE}.${SERIAL_NUMBER$3}`;
const TBS_CERTIFICATE_SIGNATURE = `${TBS_CERTIFICATE}.${SIGNATURE$4}`;
const TBS_CERTIFICATE_ISSUER = `${TBS_CERTIFICATE}.${ISSUER$2}`;
const TBS_CERTIFICATE_NOT_BEFORE = `${TBS_CERTIFICATE}.${NOT_BEFORE}`;
const TBS_CERTIFICATE_NOT_AFTER = `${TBS_CERTIFICATE}.${NOT_AFTER}`;
const TBS_CERTIFICATE_SUBJECT = `${TBS_CERTIFICATE}.${SUBJECT$1}`;
const TBS_CERTIFICATE_SUBJECT_PUBLIC_KEY = `${TBS_CERTIFICATE}.${SUBJECT_PUBLIC_KEY_INFO}`;
const TBS_CERTIFICATE_ISSUER_UNIQUE_ID = `${TBS_CERTIFICATE}.${ISSUER_UNIQUE_ID}`;
const TBS_CERTIFICATE_SUBJECT_UNIQUE_ID = `${TBS_CERTIFICATE}.${SUBJECT_UNIQUE_ID}`;
const TBS_CERTIFICATE_EXTENSIONS = `${TBS_CERTIFICATE}.${EXTENSIONS$2}`;
const CLEAR_PROPS$Q = [
    TBS_CERTIFICATE,
    TBS_CERTIFICATE_VERSION,
    TBS_CERTIFICATE_SERIAL_NUMBER,
    TBS_CERTIFICATE_SIGNATURE,
    TBS_CERTIFICATE_ISSUER,
    TBS_CERTIFICATE_NOT_BEFORE,
    TBS_CERTIFICATE_NOT_AFTER,
    TBS_CERTIFICATE_SUBJECT,
    TBS_CERTIFICATE_SUBJECT_PUBLIC_KEY,
    TBS_CERTIFICATE_ISSUER_UNIQUE_ID,
    TBS_CERTIFICATE_SUBJECT_UNIQUE_ID,
    TBS_CERTIFICATE_EXTENSIONS,
    SIGNATURE_ALGORITHM$5,
    SIGNATURE_VALUE$2
];
function tbsCertificate(parameters = {}) {
    const names = pvutils.getParametersValue(parameters, "names", {});
    return (new asn1js.Sequence({
        name: (names.blockName || TBS_CERTIFICATE),
        value: [
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    new asn1js.Integer({ name: (names.tbsCertificateVersion || TBS_CERTIFICATE_VERSION) })
                ]
            }),
            new asn1js.Integer({ name: (names.tbsCertificateSerialNumber || TBS_CERTIFICATE_SERIAL_NUMBER) }),
            AlgorithmIdentifier.schema(names.signature || {
                names: {
                    blockName: TBS_CERTIFICATE_SIGNATURE
                }
            }),
            RelativeDistinguishedNames.schema(names.issuer || {
                names: {
                    blockName: TBS_CERTIFICATE_ISSUER
                }
            }),
            new asn1js.Sequence({
                name: (names.tbsCertificateValidity || "tbsCertificate.validity"),
                value: [
                    Time.schema(names.notBefore || {
                        names: {
                            utcTimeName: TBS_CERTIFICATE_NOT_BEFORE,
                            generalTimeName: TBS_CERTIFICATE_NOT_BEFORE
                        }
                    }),
                    Time.schema(names.notAfter || {
                        names: {
                            utcTimeName: TBS_CERTIFICATE_NOT_AFTER,
                            generalTimeName: TBS_CERTIFICATE_NOT_AFTER
                        }
                    })
                ]
            }),
            RelativeDistinguishedNames.schema(names.subject || {
                names: {
                    blockName: TBS_CERTIFICATE_SUBJECT
                }
            }),
            PublicKeyInfo.schema(names.subjectPublicKeyInfo || {
                names: {
                    blockName: TBS_CERTIFICATE_SUBJECT_PUBLIC_KEY
                }
            }),
            new asn1js.Primitive({
                name: (names.tbsCertificateIssuerUniqueID || TBS_CERTIFICATE_ISSUER_UNIQUE_ID),
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                }
            }),
            new asn1js.Primitive({
                name: (names.tbsCertificateSubjectUniqueID || TBS_CERTIFICATE_SUBJECT_UNIQUE_ID),
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                }
            }),
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 3
                },
                value: [Extensions.schema(names.extensions || {
                        names: {
                            blockName: TBS_CERTIFICATE_EXTENSIONS
                        }
                    })]
            })
        ]
    }));
}
class Certificate extends PkiObject {
    get tbs() {
        return pvtsutils.BufferSourceConverter.toArrayBuffer(this.tbsView);
    }
    set tbs(value) {
        this.tbsView = new Uint8Array(value);
    }
    constructor(parameters = {}) {
        super();
        this.tbsView = new Uint8Array(pvutils.getParametersValue(parameters, TBS$4, Certificate.defaultValues(TBS$4)));
        this.version = pvutils.getParametersValue(parameters, VERSION$f, Certificate.defaultValues(VERSION$f));
        this.serialNumber = pvutils.getParametersValue(parameters, SERIAL_NUMBER$3, Certificate.defaultValues(SERIAL_NUMBER$3));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE$4, Certificate.defaultValues(SIGNATURE$4));
        this.issuer = pvutils.getParametersValue(parameters, ISSUER$2, Certificate.defaultValues(ISSUER$2));
        this.notBefore = pvutils.getParametersValue(parameters, NOT_BEFORE, Certificate.defaultValues(NOT_BEFORE));
        this.notAfter = pvutils.getParametersValue(parameters, NOT_AFTER, Certificate.defaultValues(NOT_AFTER));
        this.subject = pvutils.getParametersValue(parameters, SUBJECT$1, Certificate.defaultValues(SUBJECT$1));
        this.subjectPublicKeyInfo = pvutils.getParametersValue(parameters, SUBJECT_PUBLIC_KEY_INFO, Certificate.defaultValues(SUBJECT_PUBLIC_KEY_INFO));
        if (ISSUER_UNIQUE_ID in parameters) {
            this.issuerUniqueID = pvutils.getParametersValue(parameters, ISSUER_UNIQUE_ID, Certificate.defaultValues(ISSUER_UNIQUE_ID));
        }
        if (SUBJECT_UNIQUE_ID in parameters) {
            this.subjectUniqueID = pvutils.getParametersValue(parameters, SUBJECT_UNIQUE_ID, Certificate.defaultValues(SUBJECT_UNIQUE_ID));
        }
        if (EXTENSIONS$2 in parameters) {
            this.extensions = pvutils.getParametersValue(parameters, EXTENSIONS$2, Certificate.defaultValues(EXTENSIONS$2));
        }
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$5, Certificate.defaultValues(SIGNATURE_ALGORITHM$5));
        this.signatureValue = pvutils.getParametersValue(parameters, SIGNATURE_VALUE$2, Certificate.defaultValues(SIGNATURE_VALUE$2));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TBS$4:
                return EMPTY_BUFFER;
            case VERSION$f:
                return 0;
            case SERIAL_NUMBER$3:
                return new asn1js.Integer();
            case SIGNATURE$4:
                return new AlgorithmIdentifier();
            case ISSUER$2:
                return new RelativeDistinguishedNames();
            case NOT_BEFORE:
                return new Time();
            case NOT_AFTER:
                return new Time();
            case SUBJECT$1:
                return new RelativeDistinguishedNames();
            case SUBJECT_PUBLIC_KEY_INFO:
                return new PublicKeyInfo();
            case ISSUER_UNIQUE_ID:
                return EMPTY_BUFFER;
            case SUBJECT_UNIQUE_ID:
                return EMPTY_BUFFER;
            case EXTENSIONS$2:
                return [];
            case SIGNATURE_ALGORITHM$5:
                return new AlgorithmIdentifier();
            case SIGNATURE_VALUE$2:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                tbsCertificate(names.tbsCertificate),
                AlgorithmIdentifier.schema(names.signatureAlgorithm || {
                    names: {
                        blockName: SIGNATURE_ALGORITHM$5
                    }
                }),
                new asn1js.BitString({ name: (names.signatureValue || SIGNATURE_VALUE$2) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$Q);
        const asn1 = asn1js.compareSchema(schema, schema, Certificate.schema({
            names: {
                tbsCertificate: {
                    names: {
                        extensions: {
                            names: {
                                extensions: TBS_CERTIFICATE_EXTENSIONS
                            }
                        }
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.tbsView = asn1.result.tbsCertificate.valueBeforeDecodeView;
        if (TBS_CERTIFICATE_VERSION in asn1.result)
            this.version = asn1.result[TBS_CERTIFICATE_VERSION].valueBlock.valueDec;
        this.serialNumber = asn1.result[TBS_CERTIFICATE_SERIAL_NUMBER];
        this.signature = new AlgorithmIdentifier({ schema: asn1.result[TBS_CERTIFICATE_SIGNATURE] });
        this.issuer = new RelativeDistinguishedNames({ schema: asn1.result[TBS_CERTIFICATE_ISSUER] });
        this.notBefore = new Time({ schema: asn1.result[TBS_CERTIFICATE_NOT_BEFORE] });
        this.notAfter = new Time({ schema: asn1.result[TBS_CERTIFICATE_NOT_AFTER] });
        this.subject = new RelativeDistinguishedNames({ schema: asn1.result[TBS_CERTIFICATE_SUBJECT] });
        this.subjectPublicKeyInfo = new PublicKeyInfo({ schema: asn1.result[TBS_CERTIFICATE_SUBJECT_PUBLIC_KEY] });
        if (TBS_CERTIFICATE_ISSUER_UNIQUE_ID in asn1.result)
            this.issuerUniqueID = asn1.result[TBS_CERTIFICATE_ISSUER_UNIQUE_ID].valueBlock.valueHex;
        if (TBS_CERTIFICATE_SUBJECT_UNIQUE_ID in asn1.result)
            this.subjectUniqueID = asn1.result[TBS_CERTIFICATE_SUBJECT_UNIQUE_ID].valueBlock.valueHex;
        if (TBS_CERTIFICATE_EXTENSIONS in asn1.result)
            this.extensions = Array.from(asn1.result[TBS_CERTIFICATE_EXTENSIONS], element => new Extension({ schema: element }));
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.signatureAlgorithm });
        this.signatureValue = asn1.result.signatureValue;
    }
    encodeTBS() {
        const outputArray = [];
        if ((VERSION$f in this) && (this.version !== Certificate.defaultValues(VERSION$f))) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    new asn1js.Integer({ value: this.version })
                ]
            }));
        }
        outputArray.push(this.serialNumber);
        outputArray.push(this.signature.toSchema());
        outputArray.push(this.issuer.toSchema());
        outputArray.push(new asn1js.Sequence({
            value: [
                this.notBefore.toSchema(),
                this.notAfter.toSchema()
            ]
        }));
        outputArray.push(this.subject.toSchema());
        outputArray.push(this.subjectPublicKeyInfo.toSchema());
        if (this.issuerUniqueID) {
            outputArray.push(new asn1js.Primitive({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                valueHex: this.issuerUniqueID
            }));
        }
        if (this.subjectUniqueID) {
            outputArray.push(new asn1js.Primitive({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                valueHex: this.subjectUniqueID
            }));
        }
        if (this.extensions) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 3
                },
                value: [new asn1js.Sequence({
                        value: Array.from(this.extensions, o => o.toSchema())
                    })]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toSchema(encodeFlag = false) {
        let tbsSchema;
        if (encodeFlag === false) {
            if (!this.tbsView.byteLength) {
                return Certificate.schema().value[0];
            }
            const asn1 = asn1js.fromBER(this.tbsView);
            AsnError.assert(asn1, "TBS Certificate");
            tbsSchema = asn1.result;
        }
        else {
            tbsSchema = this.encodeTBS();
        }
        return (new asn1js.Sequence({
            value: [
                tbsSchema,
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
    }
    toJSON() {
        const res = {
            tbs: pvtsutils.Convert.ToHex(this.tbsView),
            version: this.version,
            serialNumber: this.serialNumber.toJSON(),
            signature: this.signature.toJSON(),
            issuer: this.issuer.toJSON(),
            notBefore: this.notBefore.toJSON(),
            notAfter: this.notAfter.toJSON(),
            subject: this.subject.toJSON(),
            subjectPublicKeyInfo: this.subjectPublicKeyInfo.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON(),
        };
        if ((VERSION$f in this) && (this.version !== Certificate.defaultValues(VERSION$f))) {
            res.version = this.version;
        }
        if (this.issuerUniqueID) {
            res.issuerUniqueID = pvtsutils.Convert.ToHex(this.issuerUniqueID);
        }
        if (this.subjectUniqueID) {
            res.subjectUniqueID = pvtsutils.Convert.ToHex(this.subjectUniqueID);
        }
        if (this.extensions) {
            res.extensions = Array.from(this.extensions, o => o.toJSON());
        }
        return res;
    }
    async getPublicKey(parameters, crypto = getCrypto(true)) {
        return crypto.getPublicKey(this.subjectPublicKeyInfo, this.signatureAlgorithm, parameters);
    }
    async getKeyHash(hashAlgorithm = "SHA-1", crypto = getCrypto(true)) {
        return crypto.digest({ name: hashAlgorithm }, this.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView);
    }
    async sign(privateKey, hashAlgorithm = "SHA-1", crypto = getCrypto(true)) {
        if (!privateKey) {
            throw new Error("Need to provide a private key for signing");
        }
        const signatureParameters = await crypto.getSignatureParameters(privateKey, hashAlgorithm);
        const parameters = signatureParameters.parameters;
        this.signature = signatureParameters.signatureAlgorithm;
        this.signatureAlgorithm = signatureParameters.signatureAlgorithm;
        this.tbsView = new Uint8Array(this.encodeTBS().toBER());
        const signature = await crypto.signWithPrivateKey(this.tbsView, privateKey, parameters);
        this.signatureValue = new asn1js.BitString({ valueHex: signature });
    }
    async verify(issuerCertificate, crypto = getCrypto(true)) {
        let subjectPublicKeyInfo;
        if (issuerCertificate) {
            subjectPublicKeyInfo = issuerCertificate.subjectPublicKeyInfo;
        }
        else if (this.issuer.isEqual(this.subject)) {
            subjectPublicKeyInfo = this.subjectPublicKeyInfo;
        }
        if (!(subjectPublicKeyInfo instanceof PublicKeyInfo)) {
            throw new Error("Please provide issuer certificate as a parameter");
        }
        return crypto.verifyWithPublicKey(this.tbsView, this.signatureValue, subjectPublicKeyInfo, this.signatureAlgorithm);
    }
}
Certificate.CLASS_NAME = "Certificate";
function checkCA(cert, signerCert = null) {
    if (signerCert && cert.issuer.isEqual(signerCert.issuer) && cert.serialNumber.isEqual(signerCert.serialNumber)) {
        return null;
    }
    let isCA = false;
    if (cert.extensions) {
        for (const extension of cert.extensions) {
            if (extension.extnID === id_BasicConstraints && extension.parsedValue instanceof BasicConstraints) {
                if (extension.parsedValue.cA) {
                    isCA = true;
                    break;
                }
            }
        }
    }
    if (isCA) {
        return cert;
    }
    return null;
}

const CERT_ID$1 = "certId";
const CERT_VALUE = "certValue";
const PARSED_VALUE$4 = "parsedValue";
const CLEAR_PROPS$P = [
    CERT_ID$1,
    CERT_VALUE
];
class CertBag extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.certId = pvutils.getParametersValue(parameters, CERT_ID$1, CertBag.defaultValues(CERT_ID$1));
        this.certValue = pvutils.getParametersValue(parameters, CERT_VALUE, CertBag.defaultValues(CERT_VALUE));
        if (PARSED_VALUE$4 in parameters) {
            this.parsedValue = pvutils.getParametersValue(parameters, PARSED_VALUE$4, CertBag.defaultValues(PARSED_VALUE$4));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CERT_ID$1:
                return EMPTY_STRING;
            case CERT_VALUE:
                return (new asn1js.Any());
            case PARSED_VALUE$4:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case CERT_ID$1:
                return (memberValue === EMPTY_STRING);
            case CERT_VALUE:
                return (memberValue instanceof asn1js.Any);
            case PARSED_VALUE$4:
                return ((memberValue instanceof Object) && (Object.keys(memberValue).length === 0));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.id || "id") }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Any({ name: (names.value || "value") })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$P);
        const asn1 = asn1js.compareSchema(schema, schema, CertBag.schema({
            names: {
                id: CERT_ID$1,
                value: CERT_VALUE
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.certId = asn1.result.certId.valueBlock.toString();
        this.certValue = asn1.result.certValue;
        const certValueHex = this.certValue.valueBlock.valueHexView;
        switch (this.certId) {
            case id_CertBag_X509Certificate:
                {
                    try {
                        this.parsedValue = Certificate.fromBER(certValueHex);
                    }
                    catch {
                        AttributeCertificateV2.fromBER(certValueHex);
                    }
                }
                break;
            case id_CertBag_AttributeCertificate:
                {
                    this.parsedValue = AttributeCertificateV2.fromBER(certValueHex);
                }
                break;
            case id_CertBag_SDSICertificate:
            default:
                throw new Error(`Incorrect CERT_ID value in CertBag: ${this.certId}`);
        }
    }
    toSchema() {
        if (PARSED_VALUE$4 in this) {
            if ("acinfo" in this.parsedValue) {
                this.certId = id_CertBag_AttributeCertificate;
            }
            else {
                this.certId = id_CertBag_X509Certificate;
            }
            this.certValue = new asn1js.OctetString({ valueHex: this.parsedValue.toSchema().toBER(false) });
        }
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.certId }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [(("toSchema" in this.certValue) ? this.certValue.toSchema() : this.certValue)]
                })
            ]
        }));
    }
    toJSON() {
        return {
            certId: this.certId,
            certValue: this.certValue.toJSON()
        };
    }
}
CertBag.CLASS_NAME = "CertBag";

const USER_CERTIFICATE = "userCertificate";
const REVOCATION_DATE = "revocationDate";
const CRL_ENTRY_EXTENSIONS = "crlEntryExtensions";
const CLEAR_PROPS$O = [
    USER_CERTIFICATE,
    REVOCATION_DATE,
    CRL_ENTRY_EXTENSIONS
];
class RevokedCertificate extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.userCertificate = pvutils.getParametersValue(parameters, USER_CERTIFICATE, RevokedCertificate.defaultValues(USER_CERTIFICATE));
        this.revocationDate = pvutils.getParametersValue(parameters, REVOCATION_DATE, RevokedCertificate.defaultValues(REVOCATION_DATE));
        if (CRL_ENTRY_EXTENSIONS in parameters) {
            this.crlEntryExtensions = pvutils.getParametersValue(parameters, CRL_ENTRY_EXTENSIONS, RevokedCertificate.defaultValues(CRL_ENTRY_EXTENSIONS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case USER_CERTIFICATE:
                return new asn1js.Integer();
            case REVOCATION_DATE:
                return new Time();
            case CRL_ENTRY_EXTENSIONS:
                return new Extensions();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.userCertificate || USER_CERTIFICATE) }),
                Time.schema({
                    names: {
                        utcTimeName: (names.revocationDate || REVOCATION_DATE),
                        generalTimeName: (names.revocationDate || REVOCATION_DATE)
                    }
                }),
                Extensions.schema({
                    names: {
                        blockName: (names.crlEntryExtensions || CRL_ENTRY_EXTENSIONS)
                    }
                }, true)
            ]
        });
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$O);
        const asn1 = asn1js.compareSchema(schema, schema, RevokedCertificate.schema());
        AsnError.assertSchema(asn1, this.className);
        this.userCertificate = asn1.result.userCertificate;
        this.revocationDate = new Time({ schema: asn1.result.revocationDate });
        if (CRL_ENTRY_EXTENSIONS in asn1.result) {
            this.crlEntryExtensions = new Extensions({ schema: asn1.result.crlEntryExtensions });
        }
    }
    toSchema() {
        const outputArray = [
            this.userCertificate,
            this.revocationDate.toSchema()
        ];
        if (this.crlEntryExtensions) {
            outputArray.push(this.crlEntryExtensions.toSchema());
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            userCertificate: this.userCertificate.toJSON(),
            revocationDate: this.revocationDate.toJSON(),
        };
        if (this.crlEntryExtensions) {
            res.crlEntryExtensions = this.crlEntryExtensions.toJSON();
        }
        return res;
    }
}
RevokedCertificate.CLASS_NAME = "RevokedCertificate";

const TBS$3 = "tbs";
const VERSION$e = "version";
const SIGNATURE$3 = "signature";
const ISSUER$1 = "issuer";
const THIS_UPDATE$1 = "thisUpdate";
const NEXT_UPDATE$1 = "nextUpdate";
const REVOKED_CERTIFICATES = "revokedCertificates";
const CRL_EXTENSIONS = "crlExtensions";
const SIGNATURE_ALGORITHM$4 = "signatureAlgorithm";
const SIGNATURE_VALUE$1 = "signatureValue";
const TBS_CERT_LIST = "tbsCertList";
const TBS_CERT_LIST_VERSION = `${TBS_CERT_LIST}.version`;
const TBS_CERT_LIST_SIGNATURE = `${TBS_CERT_LIST}.signature`;
const TBS_CERT_LIST_ISSUER = `${TBS_CERT_LIST}.issuer`;
const TBS_CERT_LIST_THIS_UPDATE = `${TBS_CERT_LIST}.thisUpdate`;
const TBS_CERT_LIST_NEXT_UPDATE = `${TBS_CERT_LIST}.nextUpdate`;
const TBS_CERT_LIST_REVOKED_CERTIFICATES = `${TBS_CERT_LIST}.revokedCertificates`;
const TBS_CERT_LIST_EXTENSIONS = `${TBS_CERT_LIST}.extensions`;
const CLEAR_PROPS$N = [
    TBS_CERT_LIST,
    TBS_CERT_LIST_VERSION,
    TBS_CERT_LIST_SIGNATURE,
    TBS_CERT_LIST_ISSUER,
    TBS_CERT_LIST_THIS_UPDATE,
    TBS_CERT_LIST_NEXT_UPDATE,
    TBS_CERT_LIST_REVOKED_CERTIFICATES,
    TBS_CERT_LIST_EXTENSIONS,
    SIGNATURE_ALGORITHM$4,
    SIGNATURE_VALUE$1
];
function tbsCertList(parameters = {}) {
    const names = pvutils.getParametersValue(parameters, "names", {});
    return (new asn1js.Sequence({
        name: (names.blockName || TBS_CERT_LIST),
        value: [
            new asn1js.Integer({
                optional: true,
                name: (names.tbsCertListVersion || TBS_CERT_LIST_VERSION),
                value: 2
            }),
            AlgorithmIdentifier.schema(names.signature || {
                names: {
                    blockName: TBS_CERT_LIST_SIGNATURE
                }
            }),
            RelativeDistinguishedNames.schema(names.issuer || {
                names: {
                    blockName: TBS_CERT_LIST_ISSUER
                }
            }),
            Time.schema(names.tbsCertListThisUpdate || {
                names: {
                    utcTimeName: TBS_CERT_LIST_THIS_UPDATE,
                    generalTimeName: TBS_CERT_LIST_THIS_UPDATE
                }
            }),
            Time.schema(names.tbsCertListNextUpdate || {
                names: {
                    utcTimeName: TBS_CERT_LIST_NEXT_UPDATE,
                    generalTimeName: TBS_CERT_LIST_NEXT_UPDATE
                }
            }, true),
            new asn1js.Sequence({
                optional: true,
                value: [
                    new asn1js.Repeated({
                        name: (names.tbsCertListRevokedCertificates || TBS_CERT_LIST_REVOKED_CERTIFICATES),
                        value: new asn1js.Sequence({
                            value: [
                                new asn1js.Integer(),
                                Time.schema(),
                                Extensions.schema({}, true)
                            ]
                        })
                    })
                ]
            }),
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [Extensions.schema(names.crlExtensions || {
                        names: {
                            blockName: TBS_CERT_LIST_EXTENSIONS
                        }
                    })]
            })
        ]
    }));
}
const WELL_KNOWN_EXTENSIONS = [
    id_AuthorityKeyIdentifier,
    id_IssuerAltName,
    id_CRLNumber,
    id_BaseCRLNumber,
    id_IssuingDistributionPoint,
    id_FreshestCRL,
    id_AuthorityInfoAccess,
    id_CRLReason,
    id_InvalidityDate,
    id_CertificateIssuer,
];
class CertificateRevocationList extends PkiObject {
    get tbs() {
        return pvtsutils.BufferSourceConverter.toArrayBuffer(this.tbsView);
    }
    set tbs(value) {
        this.tbsView = new Uint8Array(value);
    }
    constructor(parameters = {}) {
        super();
        this.tbsView = new Uint8Array(pvutils.getParametersValue(parameters, TBS$3, CertificateRevocationList.defaultValues(TBS$3)));
        this.version = pvutils.getParametersValue(parameters, VERSION$e, CertificateRevocationList.defaultValues(VERSION$e));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE$3, CertificateRevocationList.defaultValues(SIGNATURE$3));
        this.issuer = pvutils.getParametersValue(parameters, ISSUER$1, CertificateRevocationList.defaultValues(ISSUER$1));
        this.thisUpdate = pvutils.getParametersValue(parameters, THIS_UPDATE$1, CertificateRevocationList.defaultValues(THIS_UPDATE$1));
        if (NEXT_UPDATE$1 in parameters) {
            this.nextUpdate = pvutils.getParametersValue(parameters, NEXT_UPDATE$1, CertificateRevocationList.defaultValues(NEXT_UPDATE$1));
        }
        if (REVOKED_CERTIFICATES in parameters) {
            this.revokedCertificates = pvutils.getParametersValue(parameters, REVOKED_CERTIFICATES, CertificateRevocationList.defaultValues(REVOKED_CERTIFICATES));
        }
        if (CRL_EXTENSIONS in parameters) {
            this.crlExtensions = pvutils.getParametersValue(parameters, CRL_EXTENSIONS, CertificateRevocationList.defaultValues(CRL_EXTENSIONS));
        }
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$4, CertificateRevocationList.defaultValues(SIGNATURE_ALGORITHM$4));
        this.signatureValue = pvutils.getParametersValue(parameters, SIGNATURE_VALUE$1, CertificateRevocationList.defaultValues(SIGNATURE_VALUE$1));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TBS$3:
                return EMPTY_BUFFER;
            case VERSION$e:
                return 0;
            case SIGNATURE$3:
                return new AlgorithmIdentifier();
            case ISSUER$1:
                return new RelativeDistinguishedNames();
            case THIS_UPDATE$1:
                return new Time();
            case NEXT_UPDATE$1:
                return new Time();
            case REVOKED_CERTIFICATES:
                return [];
            case CRL_EXTENSIONS:
                return new Extensions();
            case SIGNATURE_ALGORITHM$4:
                return new AlgorithmIdentifier();
            case SIGNATURE_VALUE$1:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || "CertificateList"),
            value: [
                tbsCertList(parameters),
                AlgorithmIdentifier.schema(names.signatureAlgorithm || {
                    names: {
                        blockName: SIGNATURE_ALGORITHM$4
                    }
                }),
                new asn1js.BitString({ name: (names.signatureValue || SIGNATURE_VALUE$1) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$N);
        const asn1 = asn1js.compareSchema(schema, schema, CertificateRevocationList.schema());
        AsnError.assertSchema(asn1, this.className);
        this.tbsView = asn1.result.tbsCertList.valueBeforeDecodeView;
        if (TBS_CERT_LIST_VERSION in asn1.result) {
            this.version = asn1.result[TBS_CERT_LIST_VERSION].valueBlock.valueDec;
        }
        this.signature = new AlgorithmIdentifier({ schema: asn1.result[TBS_CERT_LIST_SIGNATURE] });
        this.issuer = new RelativeDistinguishedNames({ schema: asn1.result[TBS_CERT_LIST_ISSUER] });
        this.thisUpdate = new Time({ schema: asn1.result[TBS_CERT_LIST_THIS_UPDATE] });
        if (TBS_CERT_LIST_NEXT_UPDATE in asn1.result) {
            this.nextUpdate = new Time({ schema: asn1.result[TBS_CERT_LIST_NEXT_UPDATE] });
        }
        if (TBS_CERT_LIST_REVOKED_CERTIFICATES in asn1.result) {
            this.revokedCertificates = Array.from(asn1.result[TBS_CERT_LIST_REVOKED_CERTIFICATES], element => new RevokedCertificate({ schema: element }));
        }
        if (TBS_CERT_LIST_EXTENSIONS in asn1.result) {
            this.crlExtensions = new Extensions({ schema: asn1.result[TBS_CERT_LIST_EXTENSIONS] });
        }
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.signatureAlgorithm });
        this.signatureValue = asn1.result.signatureValue;
    }
    encodeTBS() {
        const outputArray = [];
        if (this.version !== CertificateRevocationList.defaultValues(VERSION$e)) {
            outputArray.push(new asn1js.Integer({ value: this.version }));
        }
        outputArray.push(this.signature.toSchema());
        outputArray.push(this.issuer.toSchema());
        outputArray.push(this.thisUpdate.toSchema());
        if (this.nextUpdate) {
            outputArray.push(this.nextUpdate.toSchema());
        }
        if (this.revokedCertificates) {
            outputArray.push(new asn1js.Sequence({
                value: Array.from(this.revokedCertificates, o => o.toSchema())
            }));
        }
        if (this.crlExtensions) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    this.crlExtensions.toSchema()
                ]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toSchema(encodeFlag = false) {
        let tbsSchema;
        if (!encodeFlag) {
            if (!this.tbsView.byteLength) {
                return CertificateRevocationList.schema();
            }
            const asn1 = asn1js.fromBER(this.tbsView);
            AsnError.assert(asn1, "TBS Certificate Revocation List");
            tbsSchema = asn1.result;
        }
        else {
            tbsSchema = this.encodeTBS();
        }
        return (new asn1js.Sequence({
            value: [
                tbsSchema,
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
    }
    toJSON() {
        const res = {
            tbs: pvtsutils.Convert.ToHex(this.tbsView),
            version: this.version,
            signature: this.signature.toJSON(),
            issuer: this.issuer.toJSON(),
            thisUpdate: this.thisUpdate.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON()
        };
        if (this.version !== CertificateRevocationList.defaultValues(VERSION$e))
            res.version = this.version;
        if (this.nextUpdate) {
            res.nextUpdate = this.nextUpdate.toJSON();
        }
        if (this.revokedCertificates) {
            res.revokedCertificates = Array.from(this.revokedCertificates, o => o.toJSON());
        }
        if (this.crlExtensions) {
            res.crlExtensions = this.crlExtensions.toJSON();
        }
        return res;
    }
    isCertificateRevoked(certificate) {
        if (!this.issuer.isEqual(certificate.issuer)) {
            return false;
        }
        if (!this.revokedCertificates) {
            return false;
        }
        for (const revokedCertificate of this.revokedCertificates) {
            if (revokedCertificate.userCertificate.isEqual(certificate.serialNumber)) {
                return true;
            }
        }
        return false;
    }
    async sign(privateKey, hashAlgorithm = "SHA-1", crypto = getCrypto(true)) {
        if (!privateKey) {
            throw new Error("Need to provide a private key for signing");
        }
        const signatureParameters = await crypto.getSignatureParameters(privateKey, hashAlgorithm);
        const { parameters } = signatureParameters;
        this.signature = signatureParameters.signatureAlgorithm;
        this.signatureAlgorithm = signatureParameters.signatureAlgorithm;
        this.tbsView = new Uint8Array(this.encodeTBS().toBER());
        const signature = await crypto.signWithPrivateKey(this.tbsView, privateKey, parameters);
        this.signatureValue = new asn1js.BitString({ valueHex: signature });
    }
    async verify(parameters = {}, crypto = getCrypto(true)) {
        let subjectPublicKeyInfo;
        if (parameters.issuerCertificate) {
            subjectPublicKeyInfo = parameters.issuerCertificate.subjectPublicKeyInfo;
            if (!this.issuer.isEqual(parameters.issuerCertificate.subject)) {
                return false;
            }
        }
        if (parameters.publicKeyInfo) {
            subjectPublicKeyInfo = parameters.publicKeyInfo;
        }
        if (!subjectPublicKeyInfo) {
            throw new Error("Issuer's certificate must be provided as an input parameter");
        }
        if (this.crlExtensions) {
            for (const extension of this.crlExtensions.extensions) {
                if (extension.critical) {
                    if (!WELL_KNOWN_EXTENSIONS.includes(extension.extnID))
                        return false;
                }
            }
        }
        return crypto.verifyWithPublicKey(this.tbsView, this.signatureValue, subjectPublicKeyInfo, this.signatureAlgorithm);
    }
}
CertificateRevocationList.CLASS_NAME = "CertificateRevocationList";

const CRL_ID = "crlId";
const CRL_VALUE = "crlValue";
const PARSED_VALUE$3 = "parsedValue";
const CLEAR_PROPS$M = [
    CRL_ID,
    CRL_VALUE,
];
class CRLBag extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.crlId = pvutils.getParametersValue(parameters, CRL_ID, CRLBag.defaultValues(CRL_ID));
        this.crlValue = pvutils.getParametersValue(parameters, CRL_VALUE, CRLBag.defaultValues(CRL_VALUE));
        if (PARSED_VALUE$3 in parameters) {
            this.parsedValue = pvutils.getParametersValue(parameters, PARSED_VALUE$3, CRLBag.defaultValues(PARSED_VALUE$3));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CRL_ID:
                return EMPTY_STRING;
            case CRL_VALUE:
                return (new asn1js.Any());
            case PARSED_VALUE$3:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case CRL_ID:
                return (memberValue === EMPTY_STRING);
            case CRL_VALUE:
                return (memberValue instanceof asn1js.Any);
            case PARSED_VALUE$3:
                return ((memberValue instanceof Object) && (Object.keys(memberValue).length === 0));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.id || "id") }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Any({ name: (names.value || "value") })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$M);
        const asn1 = asn1js.compareSchema(schema, schema, CRLBag.schema({
            names: {
                id: CRL_ID,
                value: CRL_VALUE
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.crlId = asn1.result.crlId.valueBlock.toString();
        this.crlValue = asn1.result.crlValue;
        switch (this.crlId) {
            case id_CRLBag_X509CRL:
                {
                    this.parsedValue = CertificateRevocationList.fromBER(this.certValue.valueBlock.valueHex);
                }
                break;
            default:
                throw new Error(`Incorrect CRL_ID value in CRLBag: ${this.crlId}`);
        }
    }
    toSchema() {
        if (this.parsedValue) {
            this.crlId = id_CRLBag_X509CRL;
            this.crlValue = new asn1js.OctetString({ valueHex: this.parsedValue.toSchema().toBER(false) });
        }
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.crlId }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [this.crlValue.toSchema()]
                })
            ]
        }));
    }
    toJSON() {
        return {
            crlId: this.crlId,
            crlValue: this.crlValue.toJSON()
        };
    }
}
CRLBag.CLASS_NAME = "CRLBag";

const VERSION$d = "version";
const ENCRYPTED_CONTENT_INFO$1 = "encryptedContentInfo";
const UNPROTECTED_ATTRS$1 = "unprotectedAttrs";
const CLEAR_PROPS$L = [
    VERSION$d,
    ENCRYPTED_CONTENT_INFO$1,
    UNPROTECTED_ATTRS$1,
];
class EncryptedData extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$d, EncryptedData.defaultValues(VERSION$d));
        this.encryptedContentInfo = pvutils.getParametersValue(parameters, ENCRYPTED_CONTENT_INFO$1, EncryptedData.defaultValues(ENCRYPTED_CONTENT_INFO$1));
        if (UNPROTECTED_ATTRS$1 in parameters) {
            this.unprotectedAttrs = pvutils.getParametersValue(parameters, UNPROTECTED_ATTRS$1, EncryptedData.defaultValues(UNPROTECTED_ATTRS$1));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$d:
                return 0;
            case ENCRYPTED_CONTENT_INFO$1:
                return new EncryptedContentInfo();
            case UNPROTECTED_ATTRS$1:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$d:
                return (memberValue === 0);
            case ENCRYPTED_CONTENT_INFO$1:
                return ((EncryptedContentInfo.compareWithDefault("contentType", memberValue.contentType)) &&
                    (EncryptedContentInfo.compareWithDefault("contentEncryptionAlgorithm", memberValue.contentEncryptionAlgorithm)) &&
                    (EncryptedContentInfo.compareWithDefault("encryptedContent", memberValue.encryptedContent)));
            case UNPROTECTED_ATTRS$1:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                EncryptedContentInfo.schema(names.encryptedContentInfo || {}),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.unprotectedAttrs || EMPTY_STRING),
                            value: Attribute.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$L);
        const asn1 = asn1js.compareSchema(schema, schema, EncryptedData.schema({
            names: {
                version: VERSION$d,
                encryptedContentInfo: {
                    names: {
                        blockName: ENCRYPTED_CONTENT_INFO$1
                    }
                },
                unprotectedAttrs: UNPROTECTED_ATTRS$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.encryptedContentInfo = new EncryptedContentInfo({ schema: asn1.result.encryptedContentInfo });
        if (UNPROTECTED_ATTRS$1 in asn1.result)
            this.unprotectedAttrs = Array.from(asn1.result.unprotectedAttrs, element => new Attribute({ schema: element }));
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        outputArray.push(this.encryptedContentInfo.toSchema());
        if (this.unprotectedAttrs) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: Array.from(this.unprotectedAttrs, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            version: this.version,
            encryptedContentInfo: this.encryptedContentInfo.toJSON()
        };
        if (this.unprotectedAttrs)
            res.unprotectedAttrs = Array.from(this.unprotectedAttrs, o => o.toJSON());
        return res;
    }
    async encrypt(parameters, crypto = getCrypto(true)) {
        ArgumentError.assert(parameters, "parameters", "object");
        const encryptParams = {
            ...parameters,
            contentType: "1.2.840.113549.1.7.1",
        };
        this.encryptedContentInfo = await crypto.encryptEncryptedContentInfo(encryptParams);
    }
    async decrypt(parameters, crypto = getCrypto(true)) {
        ArgumentError.assert(parameters, "parameters", "object");
        const decryptParams = {
            ...parameters,
            encryptedContentInfo: this.encryptedContentInfo,
        };
        return crypto.decryptEncryptedContentInfo(decryptParams);
    }
}
EncryptedData.CLASS_NAME = "EncryptedData";

const ENCRYPTION_ALGORITHM = "encryptionAlgorithm";
const ENCRYPTED_DATA = "encryptedData";
const PARSED_VALUE$2 = "parsedValue";
const CLEAR_PROPS$K = [
    ENCRYPTION_ALGORITHM,
    ENCRYPTED_DATA,
];
class PKCS8ShroudedKeyBag extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.encryptionAlgorithm = pvutils.getParametersValue(parameters, ENCRYPTION_ALGORITHM, PKCS8ShroudedKeyBag.defaultValues(ENCRYPTION_ALGORITHM));
        this.encryptedData = pvutils.getParametersValue(parameters, ENCRYPTED_DATA, PKCS8ShroudedKeyBag.defaultValues(ENCRYPTED_DATA));
        if (PARSED_VALUE$2 in parameters) {
            this.parsedValue = pvutils.getParametersValue(parameters, PARSED_VALUE$2, PKCS8ShroudedKeyBag.defaultValues(PARSED_VALUE$2));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ENCRYPTION_ALGORITHM:
                return (new AlgorithmIdentifier());
            case ENCRYPTED_DATA:
                return (new asn1js.OctetString());
            case PARSED_VALUE$2:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case ENCRYPTION_ALGORITHM:
                return ((AlgorithmIdentifier.compareWithDefault("algorithmId", memberValue.algorithmId)) &&
                    (("algorithmParams" in memberValue) === false));
            case ENCRYPTED_DATA:
                return (memberValue.isEqual(PKCS8ShroudedKeyBag.defaultValues(memberName)));
            case PARSED_VALUE$2:
                return ((memberValue instanceof Object) && (Object.keys(memberValue).length === 0));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.encryptionAlgorithm || {
                    names: {
                        blockName: ENCRYPTION_ALGORITHM
                    }
                }),
                new asn1js.Choice({
                    value: [
                        new asn1js.OctetString({ name: (names.encryptedData || ENCRYPTED_DATA) }),
                        new asn1js.OctetString({
                            idBlock: {
                                isConstructed: true
                            },
                            name: (names.encryptedData || ENCRYPTED_DATA)
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$K);
        const asn1 = asn1js.compareSchema(schema, schema, PKCS8ShroudedKeyBag.schema({
            names: {
                encryptionAlgorithm: {
                    names: {
                        blockName: ENCRYPTION_ALGORITHM
                    }
                },
                encryptedData: ENCRYPTED_DATA
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.encryptionAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.encryptionAlgorithm });
        this.encryptedData = asn1.result.encryptedData;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.encryptionAlgorithm.toSchema(),
                this.encryptedData
            ]
        }));
    }
    toJSON() {
        return {
            encryptionAlgorithm: this.encryptionAlgorithm.toJSON(),
            encryptedData: this.encryptedData.toJSON(),
        };
    }
    async parseInternalValues(parameters, crypto = getCrypto(true)) {
        const cmsEncrypted = new EncryptedData({
            encryptedContentInfo: new EncryptedContentInfo({
                contentEncryptionAlgorithm: this.encryptionAlgorithm,
                encryptedContent: this.encryptedData
            })
        });
        const decryptedData = await cmsEncrypted.decrypt(parameters, crypto);
        this.parsedValue = PrivateKeyInfo.fromBER(decryptedData);
    }
    async makeInternalValues(parameters, crypto = getCrypto(true)) {
        if (!this.parsedValue) {
            throw new Error("Please initialize \"parsedValue\" first");
        }
        const cmsEncrypted = new EncryptedData();
        const encryptParams = {
            ...parameters,
            contentToEncrypt: this.parsedValue.toSchema().toBER(false),
        };
        await cmsEncrypted.encrypt(encryptParams, crypto);
        if (!cmsEncrypted.encryptedContentInfo.encryptedContent) {
            throw new Error("The filed `encryptedContent` in EncryptedContentInfo is empty");
        }
        this.encryptionAlgorithm = cmsEncrypted.encryptedContentInfo.contentEncryptionAlgorithm;
        this.encryptedData = cmsEncrypted.encryptedContentInfo.encryptedContent;
    }
}
PKCS8ShroudedKeyBag.CLASS_NAME = "PKCS8ShroudedKeyBag";

const SECRET_TYPE_ID = "secretTypeId";
const SECRET_VALUE = "secretValue";
const CLEAR_PROPS$J = [
    SECRET_TYPE_ID,
    SECRET_VALUE,
];
class SecretBag extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.secretTypeId = pvutils.getParametersValue(parameters, SECRET_TYPE_ID, SecretBag.defaultValues(SECRET_TYPE_ID));
        this.secretValue = pvutils.getParametersValue(parameters, SECRET_VALUE, SecretBag.defaultValues(SECRET_VALUE));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case SECRET_TYPE_ID:
                return EMPTY_STRING;
            case SECRET_VALUE:
                return (new asn1js.Any());
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case SECRET_TYPE_ID:
                return (memberValue === EMPTY_STRING);
            case SECRET_VALUE:
                return (memberValue instanceof asn1js.Any);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.id || "id") }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Any({ name: (names.value || "value") })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$J);
        const asn1 = asn1js.compareSchema(schema, schema, SecretBag.schema({
            names: {
                id: SECRET_TYPE_ID,
                value: SECRET_VALUE
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.secretTypeId = asn1.result.secretTypeId.valueBlock.toString();
        this.secretValue = asn1.result.secretValue;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.secretTypeId }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [this.secretValue.toSchema()]
                })
            ]
        }));
    }
    toJSON() {
        return {
            secretTypeId: this.secretTypeId,
            secretValue: this.secretValue.toJSON()
        };
    }
}
SecretBag.CLASS_NAME = "SecretBag";

class SafeBagValueFactory {
    static getItems() {
        if (!this.items) {
            this.items = {};
            SafeBagValueFactory.register("1.2.840.113549.1.12.10.1.1", PrivateKeyInfo);
            SafeBagValueFactory.register("1.2.840.113549.1.12.10.1.2", PKCS8ShroudedKeyBag);
            SafeBagValueFactory.register("1.2.840.113549.1.12.10.1.3", CertBag);
            SafeBagValueFactory.register("1.2.840.113549.1.12.10.1.4", CRLBag);
            SafeBagValueFactory.register("1.2.840.113549.1.12.10.1.5", SecretBag);
            SafeBagValueFactory.register("1.2.840.113549.1.12.10.1.6", SafeContents);
        }
        return this.items;
    }
    static register(id, type) {
        this.getItems()[id] = type;
    }
    static find(id) {
        return this.getItems()[id] || null;
    }
}

const BAG_ID = "bagId";
const BAG_VALUE = "bagValue";
const BAG_ATTRIBUTES = "bagAttributes";
const CLEAR_PROPS$I = [
    BAG_ID,
    BAG_VALUE,
    BAG_ATTRIBUTES
];
class SafeBag extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.bagId = pvutils.getParametersValue(parameters, BAG_ID, SafeBag.defaultValues(BAG_ID));
        this.bagValue = pvutils.getParametersValue(parameters, BAG_VALUE, SafeBag.defaultValues(BAG_VALUE));
        if (BAG_ATTRIBUTES in parameters) {
            this.bagAttributes = pvutils.getParametersValue(parameters, BAG_ATTRIBUTES, SafeBag.defaultValues(BAG_ATTRIBUTES));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case BAG_ID:
                return EMPTY_STRING;
            case BAG_VALUE:
                return (new asn1js.Any());
            case BAG_ATTRIBUTES:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case BAG_ID:
                return (memberValue === EMPTY_STRING);
            case BAG_VALUE:
                return (memberValue instanceof asn1js.Any);
            case BAG_ATTRIBUTES:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.bagId || BAG_ID) }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Any({ name: (names.bagValue || BAG_VALUE) })]
                }),
                new asn1js.Set({
                    optional: true,
                    value: [
                        new asn1js.Repeated({
                            name: (names.bagAttributes || BAG_ATTRIBUTES),
                            value: Attribute.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$I);
        const asn1 = asn1js.compareSchema(schema, schema, SafeBag.schema({
            names: {
                bagId: BAG_ID,
                bagValue: BAG_VALUE,
                bagAttributes: BAG_ATTRIBUTES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.bagId = asn1.result.bagId.valueBlock.toString();
        const bagType = SafeBagValueFactory.find(this.bagId);
        if (!bagType) {
            throw new Error(`Invalid BAG_ID for SafeBag: ${this.bagId}`);
        }
        this.bagValue = new bagType({ schema: asn1.result.bagValue });
        if (BAG_ATTRIBUTES in asn1.result) {
            this.bagAttributes = Array.from(asn1.result.bagAttributes, element => new Attribute({ schema: element }));
        }
    }
    toSchema() {
        const outputArray = [
            new asn1js.ObjectIdentifier({ value: this.bagId }),
            new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [this.bagValue.toSchema()]
            })
        ];
        if (this.bagAttributes) {
            outputArray.push(new asn1js.Set({
                value: Array.from(this.bagAttributes, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const output = {
            bagId: this.bagId,
            bagValue: this.bagValue.toJSON()
        };
        if (this.bagAttributes) {
            output.bagAttributes = Array.from(this.bagAttributes, o => o.toJSON());
        }
        return output;
    }
}
SafeBag.CLASS_NAME = "SafeBag";

const SAFE_BUGS = "safeBags";
class SafeContents extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.safeBags = pvutils.getParametersValue(parameters, SAFE_BUGS, SafeContents.defaultValues(SAFE_BUGS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case SAFE_BUGS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case SAFE_BUGS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.safeBags || EMPTY_STRING),
                    value: SafeBag.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            SAFE_BUGS
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, SafeContents.schema({
            names: {
                safeBags: SAFE_BUGS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.safeBags = Array.from(asn1.result.safeBags, element => new SafeBag({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.safeBags, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            safeBags: Array.from(this.safeBags, o => o.toJSON())
        };
    }
}
SafeContents.CLASS_NAME = "SafeContents";

const OTHER_CERT_FORMAT = "otherCertFormat";
const OTHER_CERT = "otherCert";
const CLEAR_PROPS$H = [
    OTHER_CERT_FORMAT,
    OTHER_CERT
];
class OtherCertificateFormat extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.otherCertFormat = pvutils.getParametersValue(parameters, OTHER_CERT_FORMAT, OtherCertificateFormat.defaultValues(OTHER_CERT_FORMAT));
        this.otherCert = pvutils.getParametersValue(parameters, OTHER_CERT, OtherCertificateFormat.defaultValues(OTHER_CERT));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case OTHER_CERT_FORMAT:
                return EMPTY_STRING;
            case OTHER_CERT:
                return new asn1js.Any();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.otherCertFormat || OTHER_CERT_FORMAT) }),
                new asn1js.Any({ name: (names.otherCert || OTHER_CERT) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$H);
        const asn1 = asn1js.compareSchema(schema, schema, OtherCertificateFormat.schema());
        AsnError.assertSchema(asn1, this.className);
        this.otherCertFormat = asn1.result.otherCertFormat.valueBlock.toString();
        this.otherCert = asn1.result.otherCert;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.otherCertFormat }),
                this.otherCert
            ]
        }));
    }
    toJSON() {
        const res = {
            otherCertFormat: this.otherCertFormat
        };
        if (!(this.otherCert instanceof asn1js.Any)) {
            res.otherCert = this.otherCert.toJSON();
        }
        return res;
    }
}

const CERTIFICATES$1 = "certificates";
const CLEAR_PROPS$G = [
    CERTIFICATES$1,
];
class CertificateSet extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.certificates = pvutils.getParametersValue(parameters, CERTIFICATES$1, CertificateSet.defaultValues(CERTIFICATES$1));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CERTIFICATES$1:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Set({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.certificates || CERTIFICATES$1),
                    value: new asn1js.Choice({
                        value: [
                            Certificate.schema(),
                            new asn1js.Constructed({
                                idBlock: {
                                    tagClass: 3,
                                    tagNumber: 0
                                },
                                value: [
                                    new asn1js.Any()
                                ]
                            }),
                            new asn1js.Constructed({
                                idBlock: {
                                    tagClass: 3,
                                    tagNumber: 1
                                },
                                value: [
                                    new asn1js.Sequence
                                ]
                            }),
                            new asn1js.Constructed({
                                idBlock: {
                                    tagClass: 3,
                                    tagNumber: 2
                                },
                                value: AttributeCertificateV2.schema().valueBlock.value
                            }),
                            new asn1js.Constructed({
                                idBlock: {
                                    tagClass: 3,
                                    tagNumber: 3
                                },
                                value: OtherCertificateFormat.schema().valueBlock.value
                            })
                        ]
                    })
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$G);
        const asn1 = asn1js.compareSchema(schema, schema, CertificateSet.schema());
        AsnError.assertSchema(asn1, this.className);
        this.certificates = Array.from(asn1.result.certificates || [], (element) => {
            const initialTagNumber = element.idBlock.tagNumber;
            if (element.idBlock.tagClass === 1)
                return new Certificate({ schema: element });
            const elementSequence = new asn1js.Sequence({
                value: element.valueBlock.value
            });
            switch (initialTagNumber) {
                case 1:
                    if (elementSequence.valueBlock.value[0].valueBlock.value[0].valueBlock.valueDec === 1) {
                        return new AttributeCertificateV2({ schema: elementSequence });
                    }
                    else {
                        return new AttributeCertificateV1({ schema: elementSequence });
                    }
                case 2:
                    return new AttributeCertificateV2({ schema: elementSequence });
                case 3:
                    return new OtherCertificateFormat({ schema: elementSequence });
            }
            return element;
        });
    }
    toSchema() {
        return (new asn1js.Set({
            value: Array.from(this.certificates, element => {
                switch (true) {
                    case (element instanceof Certificate):
                        return element.toSchema();
                    case (element instanceof AttributeCertificateV1):
                        return new asn1js.Constructed({
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 1
                            },
                            value: element.toSchema().valueBlock.value
                        });
                    case (element instanceof AttributeCertificateV2):
                        return new asn1js.Constructed({
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 2
                            },
                            value: element.toSchema().valueBlock.value
                        });
                    case (element instanceof OtherCertificateFormat):
                        return new asn1js.Constructed({
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 3
                            },
                            value: element.toSchema().valueBlock.value
                        });
                }
                return element.toSchema();
            })
        }));
    }
    toJSON() {
        return {
            certificates: Array.from(this.certificates, o => o.toJSON())
        };
    }
}
CertificateSet.CLASS_NAME = "CertificateSet";

const OTHER_REV_INFO_FORMAT = "otherRevInfoFormat";
const OTHER_REV_INFO = "otherRevInfo";
const CLEAR_PROPS$F = [
    OTHER_REV_INFO_FORMAT,
    OTHER_REV_INFO
];
class OtherRevocationInfoFormat extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.otherRevInfoFormat = pvutils.getParametersValue(parameters, OTHER_REV_INFO_FORMAT, OtherRevocationInfoFormat.defaultValues(OTHER_REV_INFO_FORMAT));
        this.otherRevInfo = pvutils.getParametersValue(parameters, OTHER_REV_INFO, OtherRevocationInfoFormat.defaultValues(OTHER_REV_INFO));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case OTHER_REV_INFO_FORMAT:
                return EMPTY_STRING;
            case OTHER_REV_INFO:
                return new asn1js.Any();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.otherRevInfoFormat || OTHER_REV_INFO_FORMAT) }),
                new asn1js.Any({ name: (names.otherRevInfo || OTHER_REV_INFO) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$F);
        const asn1 = asn1js.compareSchema(schema, schema, OtherRevocationInfoFormat.schema());
        AsnError.assertSchema(asn1, this.className);
        this.otherRevInfoFormat = asn1.result.otherRevInfoFormat.valueBlock.toString();
        this.otherRevInfo = asn1.result.otherRevInfo;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.otherRevInfoFormat }),
                this.otherRevInfo
            ]
        }));
    }
    toJSON() {
        const res = {
            otherRevInfoFormat: this.otherRevInfoFormat
        };
        if (!(this.otherRevInfo instanceof asn1js.Any)) {
            res.otherRevInfo = this.otherRevInfo.toJSON();
        }
        return res;
    }
}
OtherRevocationInfoFormat.CLASS_NAME = "OtherRevocationInfoFormat";

const CRLS$3 = "crls";
const OTHER_REVOCATION_INFOS = "otherRevocationInfos";
const CLEAR_PROPS$E = [
    CRLS$3
];
class RevocationInfoChoices extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.crls = pvutils.getParametersValue(parameters, CRLS$3, RevocationInfoChoices.defaultValues(CRLS$3));
        this.otherRevocationInfos = pvutils.getParametersValue(parameters, OTHER_REVOCATION_INFOS, RevocationInfoChoices.defaultValues(OTHER_REVOCATION_INFOS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CRLS$3:
                return [];
            case OTHER_REVOCATION_INFOS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Set({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.crls || EMPTY_STRING),
                    value: new asn1js.Choice({
                        value: [
                            CertificateRevocationList.schema(),
                            new asn1js.Constructed({
                                idBlock: {
                                    tagClass: 3,
                                    tagNumber: 1
                                },
                                value: [
                                    new asn1js.ObjectIdentifier(),
                                    new asn1js.Any()
                                ]
                            })
                        ]
                    })
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$E);
        const asn1 = asn1js.compareSchema(schema, schema, RevocationInfoChoices.schema({
            names: {
                crls: CRLS$3
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (asn1.result.crls) {
            for (const element of asn1.result.crls) {
                if (element.idBlock.tagClass === 1)
                    this.crls.push(new CertificateRevocationList({ schema: element }));
                else
                    this.otherRevocationInfos.push(new OtherRevocationInfoFormat({ schema: element }));
            }
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(...Array.from(this.crls, o => o.toSchema()));
        outputArray.push(...Array.from(this.otherRevocationInfos, element => {
            const schema = element.toSchema();
            schema.idBlock.tagClass = 3;
            schema.idBlock.tagNumber = 1;
            return schema;
        }));
        return (new asn1js.Set({
            value: outputArray
        }));
    }
    toJSON() {
        return {
            crls: Array.from(this.crls, o => o.toJSON()),
            otherRevocationInfos: Array.from(this.otherRevocationInfos, o => o.toJSON())
        };
    }
}
RevocationInfoChoices.CLASS_NAME = "RevocationInfoChoices";

const CERTS$3 = "certs";
const CRLS$2 = "crls";
const CLEAR_PROPS$D = [
    CERTS$3,
    CRLS$2,
];
class OriginatorInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.crls = pvutils.getParametersValue(parameters, CRLS$2, OriginatorInfo.defaultValues(CRLS$2));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CERTS$3:
                return new CertificateSet();
            case CRLS$2:
                return new RevocationInfoChoices();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case CERTS$3:
                return (memberValue.certificates.length === 0);
            case CRLS$2:
                return ((memberValue.crls.length === 0) && (memberValue.otherRevocationInfos.length === 0));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Constructed({
                    name: (names.certs || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: CertificateSet.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    name: (names.crls || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: RevocationInfoChoices.schema().valueBlock.value
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$D);
        const asn1 = asn1js.compareSchema(schema, schema, OriginatorInfo.schema({
            names: {
                certs: CERTS$3,
                crls: CRLS$2
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (CERTS$3 in asn1.result) {
            this.certs = new CertificateSet({
                schema: new asn1js.Set({
                    value: asn1.result.certs.valueBlock.value
                })
            });
        }
        if (CRLS$2 in asn1.result) {
            this.crls = new RevocationInfoChoices({
                schema: new asn1js.Set({
                    value: asn1.result.crls.valueBlock.value
                })
            });
        }
    }
    toSchema() {
        const sequenceValue = [];
        if (this.certs) {
            sequenceValue.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: this.certs.toSchema().valueBlock.value
            }));
        }
        if (this.crls) {
            sequenceValue.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: this.crls.toSchema().valueBlock.value
            }));
        }
        return (new asn1js.Sequence({
            value: sequenceValue
        }));
    }
    toJSON() {
        const res = {};
        if (this.certs) {
            res.certs = this.certs.toJSON();
        }
        if (this.crls) {
            res.crls = this.crls.toJSON();
        }
        return res;
    }
}
OriginatorInfo.CLASS_NAME = "OriginatorInfo";

const ISSUER = "issuer";
const SERIAL_NUMBER$2 = "serialNumber";
const CLEAR_PROPS$C = [
    ISSUER,
    SERIAL_NUMBER$2,
];
class IssuerAndSerialNumber extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.issuer = pvutils.getParametersValue(parameters, ISSUER, IssuerAndSerialNumber.defaultValues(ISSUER));
        this.serialNumber = pvutils.getParametersValue(parameters, SERIAL_NUMBER$2, IssuerAndSerialNumber.defaultValues(SERIAL_NUMBER$2));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ISSUER:
                return new RelativeDistinguishedNames();
            case SERIAL_NUMBER$2:
                return new asn1js.Integer();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                RelativeDistinguishedNames.schema(names.issuer || {}),
                new asn1js.Integer({ name: (names.serialNumber || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$C);
        const asn1 = asn1js.compareSchema(schema, schema, IssuerAndSerialNumber.schema({
            names: {
                issuer: {
                    names: {
                        blockName: ISSUER
                    }
                },
                serialNumber: SERIAL_NUMBER$2
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.issuer = new RelativeDistinguishedNames({ schema: asn1.result.issuer });
        this.serialNumber = asn1.result.serialNumber;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.issuer.toSchema(),
                this.serialNumber
            ]
        }));
    }
    toJSON() {
        return {
            issuer: this.issuer.toJSON(),
            serialNumber: this.serialNumber.toJSON(),
        };
    }
}
IssuerAndSerialNumber.CLASS_NAME = "IssuerAndSerialNumber";

const VARIANT$3 = "variant";
const VALUE$3 = "value";
const CLEAR_PROPS$B = [
    "blockName"
];
class RecipientIdentifier extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.variant = pvutils.getParametersValue(parameters, VARIANT$3, RecipientIdentifier.defaultValues(VARIANT$3));
        if (VALUE$3 in parameters) {
            this.value = pvutils.getParametersValue(parameters, VALUE$3, RecipientIdentifier.defaultValues(VALUE$3));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VARIANT$3:
                return (-1);
            case VALUE$3:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VARIANT$3:
                return (memberValue === (-1));
            case VALUE$3:
                return (Object.keys(memberValue).length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Choice({
            value: [
                IssuerAndSerialNumber.schema({
                    names: {
                        blockName: (names.blockName || EMPTY_STRING)
                    }
                }),
                new asn1js.Primitive({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$B);
        const asn1 = asn1js.compareSchema(schema, schema, RecipientIdentifier.schema({
            names: {
                blockName: "blockName"
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (asn1.result.blockName.idBlock.tagClass === 1) {
            this.variant = 1;
            this.value = new IssuerAndSerialNumber({ schema: asn1.result.blockName });
        }
        else {
            this.variant = 2;
            this.value = new asn1js.OctetString({ valueHex: asn1.result.blockName.valueBlock.valueHex });
        }
    }
    toSchema() {
        switch (this.variant) {
            case 1:
                if (!(this.value instanceof IssuerAndSerialNumber)) {
                    throw new Error("Incorrect type of RecipientIdentifier.value. It should be IssuerAndSerialNumber.");
                }
                return this.value.toSchema();
            case 2:
                if (!(this.value instanceof asn1js.OctetString)) {
                    throw new Error("Incorrect type of RecipientIdentifier.value. It should be ASN.1 OctetString.");
                }
                return new asn1js.Primitive({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    valueHex: this.value.valueBlock.valueHexView
                });
            default:
                return new asn1js.Any();
        }
    }
    toJSON() {
        const res = {
            variant: this.variant
        };
        if ((this.variant === 1 || this.variant === 2) && this.value) {
            res.value = this.value.toJSON();
        }
        return res;
    }
}
RecipientIdentifier.CLASS_NAME = "RecipientIdentifier";

const VERSION$c = "version";
const RID$1 = "rid";
const KEY_ENCRYPTION_ALGORITHM$3 = "keyEncryptionAlgorithm";
const ENCRYPTED_KEY$3 = "encryptedKey";
const RECIPIENT_CERTIFICATE$1 = "recipientCertificate";
const CLEAR_PROPS$A = [
    VERSION$c,
    RID$1,
    KEY_ENCRYPTION_ALGORITHM$3,
    ENCRYPTED_KEY$3,
];
class KeyTransRecipientInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$c, KeyTransRecipientInfo.defaultValues(VERSION$c));
        this.rid = pvutils.getParametersValue(parameters, RID$1, KeyTransRecipientInfo.defaultValues(RID$1));
        this.keyEncryptionAlgorithm = pvutils.getParametersValue(parameters, KEY_ENCRYPTION_ALGORITHM$3, KeyTransRecipientInfo.defaultValues(KEY_ENCRYPTION_ALGORITHM$3));
        this.encryptedKey = pvutils.getParametersValue(parameters, ENCRYPTED_KEY$3, KeyTransRecipientInfo.defaultValues(ENCRYPTED_KEY$3));
        this.recipientCertificate = pvutils.getParametersValue(parameters, RECIPIENT_CERTIFICATE$1, KeyTransRecipientInfo.defaultValues(RECIPIENT_CERTIFICATE$1));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$c:
                return (-1);
            case RID$1:
                return {};
            case KEY_ENCRYPTION_ALGORITHM$3:
                return new AlgorithmIdentifier();
            case ENCRYPTED_KEY$3:
                return new asn1js.OctetString();
            case RECIPIENT_CERTIFICATE$1:
                return new Certificate();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$c:
                return (memberValue === KeyTransRecipientInfo.defaultValues(VERSION$c));
            case RID$1:
                return (Object.keys(memberValue).length === 0);
            case KEY_ENCRYPTION_ALGORITHM$3:
            case ENCRYPTED_KEY$3:
                return memberValue.isEqual(KeyTransRecipientInfo.defaultValues(memberName));
            case RECIPIENT_CERTIFICATE$1:
                return false;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                RecipientIdentifier.schema(names.rid || {}),
                AlgorithmIdentifier.schema(names.keyEncryptionAlgorithm || {}),
                new asn1js.OctetString({ name: (names.encryptedKey || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$A);
        const asn1 = asn1js.compareSchema(schema, schema, KeyTransRecipientInfo.schema({
            names: {
                version: VERSION$c,
                rid: {
                    names: {
                        blockName: RID$1
                    }
                },
                keyEncryptionAlgorithm: {
                    names: {
                        blockName: KEY_ENCRYPTION_ALGORITHM$3
                    }
                },
                encryptedKey: ENCRYPTED_KEY$3
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        if (asn1.result.rid.idBlock.tagClass === 3) {
            this.rid = new asn1js.OctetString({ valueHex: asn1.result.rid.valueBlock.valueHex });
        }
        else {
            this.rid = new IssuerAndSerialNumber({ schema: asn1.result.rid });
        }
        this.keyEncryptionAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.keyEncryptionAlgorithm });
        this.encryptedKey = asn1.result.encryptedKey;
    }
    toSchema() {
        const outputArray = [];
        if (this.rid instanceof IssuerAndSerialNumber) {
            this.version = 0;
            outputArray.push(new asn1js.Integer({ value: this.version }));
            outputArray.push(this.rid.toSchema());
        }
        else {
            this.version = 2;
            outputArray.push(new asn1js.Integer({ value: this.version }));
            outputArray.push(new asn1js.Primitive({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                valueHex: this.rid.valueBlock.valueHexView
            }));
        }
        outputArray.push(this.keyEncryptionAlgorithm.toSchema());
        outputArray.push(this.encryptedKey);
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        return {
            version: this.version,
            rid: this.rid.toJSON(),
            keyEncryptionAlgorithm: this.keyEncryptionAlgorithm.toJSON(),
            encryptedKey: this.encryptedKey.toJSON(),
        };
    }
}
KeyTransRecipientInfo.CLASS_NAME = "KeyTransRecipientInfo";

const ALGORITHM = "algorithm";
const PUBLIC_KEY = "publicKey";
const CLEAR_PROPS$z = [
    ALGORITHM,
    PUBLIC_KEY
];
class OriginatorPublicKey extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.algorithm = pvutils.getParametersValue(parameters, ALGORITHM, OriginatorPublicKey.defaultValues(ALGORITHM));
        this.publicKey = pvutils.getParametersValue(parameters, PUBLIC_KEY, OriginatorPublicKey.defaultValues(PUBLIC_KEY));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ALGORITHM:
                return new AlgorithmIdentifier();
            case PUBLIC_KEY:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case ALGORITHM:
            case PUBLIC_KEY:
                return (memberValue.isEqual(OriginatorPublicKey.defaultValues(memberName)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.algorithm || {}),
                new asn1js.BitString({ name: (names.publicKey || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$z);
        const asn1 = asn1js.compareSchema(schema, schema, OriginatorPublicKey.schema({
            names: {
                algorithm: {
                    names: {
                        blockName: ALGORITHM
                    }
                },
                publicKey: PUBLIC_KEY
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.algorithm = new AlgorithmIdentifier({ schema: asn1.result.algorithm });
        this.publicKey = asn1.result.publicKey;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.algorithm.toSchema(),
                this.publicKey
            ]
        }));
    }
    toJSON() {
        return {
            algorithm: this.algorithm.toJSON(),
            publicKey: this.publicKey.toJSON(),
        };
    }
}
OriginatorPublicKey.CLASS_NAME = "OriginatorPublicKey";

const VARIANT$2 = "variant";
const VALUE$2 = "value";
const CLEAR_PROPS$y = [
    "blockName",
];
class OriginatorIdentifierOrKey extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.variant = pvutils.getParametersValue(parameters, VARIANT$2, OriginatorIdentifierOrKey.defaultValues(VARIANT$2));
        if (VALUE$2 in parameters) {
            this.value = pvutils.getParametersValue(parameters, VALUE$2, OriginatorIdentifierOrKey.defaultValues(VALUE$2));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VARIANT$2:
                return (-1);
            case VALUE$2:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VARIANT$2:
                return (memberValue === (-1));
            case VALUE$2:
                return (Object.keys(memberValue).length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Choice({
            value: [
                IssuerAndSerialNumber.schema({
                    names: {
                        blockName: (names.blockName || EMPTY_STRING)
                    }
                }),
                new asn1js.Primitive({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    name: (names.blockName || EMPTY_STRING)
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    name: (names.blockName || EMPTY_STRING),
                    value: OriginatorPublicKey.schema().valueBlock.value
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$y);
        const asn1 = asn1js.compareSchema(schema, schema, OriginatorIdentifierOrKey.schema({
            names: {
                blockName: "blockName"
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (asn1.result.blockName.idBlock.tagClass === 1) {
            this.variant = 1;
            this.value = new IssuerAndSerialNumber({ schema: asn1.result.blockName });
        }
        else {
            if (asn1.result.blockName.idBlock.tagNumber === 0) {
                asn1.result.blockName.idBlock.tagClass = 1;
                asn1.result.blockName.idBlock.tagNumber = 4;
                this.variant = 2;
                this.value = asn1.result.blockName;
            }
            else {
                this.variant = 3;
                this.value = new OriginatorPublicKey({
                    schema: new asn1js.Sequence({
                        value: asn1.result.blockName.valueBlock.value
                    })
                });
            }
        }
    }
    toSchema() {
        switch (this.variant) {
            case 1:
                return this.value.toSchema();
            case 2:
                this.value.idBlock.tagClass = 3;
                this.value.idBlock.tagNumber = 0;
                return this.value;
            case 3:
                {
                    const _schema = this.value.toSchema();
                    _schema.idBlock.tagClass = 3;
                    _schema.idBlock.tagNumber = 1;
                    return _schema;
                }
            default:
                return new asn1js.Any();
        }
    }
    toJSON() {
        const res = {
            variant: this.variant
        };
        if ((this.variant === 1) || (this.variant === 2) || (this.variant === 3)) {
            res.value = this.value.toJSON();
        }
        return res;
    }
}
OriginatorIdentifierOrKey.CLASS_NAME = "OriginatorIdentifierOrKey";

const KEY_ATTR_ID = "keyAttrId";
const KEY_ATTR = "keyAttr";
const CLEAR_PROPS$x = [
    KEY_ATTR_ID,
    KEY_ATTR,
];
class OtherKeyAttribute extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.keyAttrId = pvutils.getParametersValue(parameters, KEY_ATTR_ID, OtherKeyAttribute.defaultValues(KEY_ATTR_ID));
        if (KEY_ATTR in parameters) {
            this.keyAttr = pvutils.getParametersValue(parameters, KEY_ATTR, OtherKeyAttribute.defaultValues(KEY_ATTR));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case KEY_ATTR_ID:
                return EMPTY_STRING;
            case KEY_ATTR:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case KEY_ATTR_ID:
                return (typeof memberValue === "string" && memberValue === EMPTY_STRING);
            case KEY_ATTR:
                return (Object.keys(memberValue).length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            optional: (names.optional || true),
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.keyAttrId || EMPTY_STRING) }),
                new asn1js.Any({
                    optional: true,
                    name: (names.keyAttr || EMPTY_STRING)
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$x);
        const asn1 = asn1js.compareSchema(schema, schema, OtherKeyAttribute.schema({
            names: {
                keyAttrId: KEY_ATTR_ID,
                keyAttr: KEY_ATTR
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.keyAttrId = asn1.result.keyAttrId.valueBlock.toString();
        if (KEY_ATTR in asn1.result) {
            this.keyAttr = asn1.result.keyAttr;
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.keyAttrId }));
        if (KEY_ATTR in this) {
            outputArray.push(this.keyAttr);
        }
        return (new asn1js.Sequence({
            value: outputArray,
        }));
    }
    toJSON() {
        const res = {
            keyAttrId: this.keyAttrId
        };
        if (KEY_ATTR in this) {
            res.keyAttr = this.keyAttr.toJSON();
        }
        return res;
    }
}
OtherKeyAttribute.CLASS_NAME = "OtherKeyAttribute";

const SUBJECT_KEY_IDENTIFIER = "subjectKeyIdentifier";
const DATE$1 = "date";
const OTHER$1 = "other";
const CLEAR_PROPS$w = [
    SUBJECT_KEY_IDENTIFIER,
    DATE$1,
    OTHER$1,
];
class RecipientKeyIdentifier extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.subjectKeyIdentifier = pvutils.getParametersValue(parameters, SUBJECT_KEY_IDENTIFIER, RecipientKeyIdentifier.defaultValues(SUBJECT_KEY_IDENTIFIER));
        if (DATE$1 in parameters) {
            this.date = pvutils.getParametersValue(parameters, DATE$1, RecipientKeyIdentifier.defaultValues(DATE$1));
        }
        if (OTHER$1 in parameters) {
            this.other = pvutils.getParametersValue(parameters, OTHER$1, RecipientKeyIdentifier.defaultValues(OTHER$1));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case SUBJECT_KEY_IDENTIFIER:
                return new asn1js.OctetString();
            case DATE$1:
                return new asn1js.GeneralizedTime();
            case OTHER$1:
                return new OtherKeyAttribute();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case SUBJECT_KEY_IDENTIFIER:
                return (memberValue.isEqual(RecipientKeyIdentifier.defaultValues(SUBJECT_KEY_IDENTIFIER)));
            case DATE$1:
                return ((memberValue.year === 0) &&
                    (memberValue.month === 0) &&
                    (memberValue.day === 0) &&
                    (memberValue.hour === 0) &&
                    (memberValue.minute === 0) &&
                    (memberValue.second === 0) &&
                    (memberValue.millisecond === 0));
            case OTHER$1:
                return ((memberValue.keyAttrId === EMPTY_STRING) && (("keyAttr" in memberValue) === false));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.OctetString({ name: (names.subjectKeyIdentifier || EMPTY_STRING) }),
                new asn1js.GeneralizedTime({
                    optional: true,
                    name: (names.date || EMPTY_STRING)
                }),
                OtherKeyAttribute.schema(names.other || {})
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$w);
        const asn1 = asn1js.compareSchema(schema, schema, RecipientKeyIdentifier.schema({
            names: {
                subjectKeyIdentifier: SUBJECT_KEY_IDENTIFIER,
                date: DATE$1,
                other: {
                    names: {
                        blockName: OTHER$1
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.subjectKeyIdentifier = asn1.result.subjectKeyIdentifier;
        if (DATE$1 in asn1.result)
            this.date = asn1.result.date;
        if (OTHER$1 in asn1.result)
            this.other = new OtherKeyAttribute({ schema: asn1.result.other });
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.subjectKeyIdentifier);
        if (this.date) {
            outputArray.push(this.date);
        }
        if (this.other) {
            outputArray.push(this.other.toSchema());
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            subjectKeyIdentifier: this.subjectKeyIdentifier.toJSON()
        };
        if (this.date) {
            res.date = this.date.toJSON();
        }
        if (this.other) {
            res.other = this.other.toJSON();
        }
        return res;
    }
}
RecipientKeyIdentifier.CLASS_NAME = "RecipientKeyIdentifier";

const VARIANT$1 = "variant";
const VALUE$1 = "value";
const CLEAR_PROPS$v = [
    "blockName",
];
class KeyAgreeRecipientIdentifier extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.variant = pvutils.getParametersValue(parameters, VARIANT$1, KeyAgreeRecipientIdentifier.defaultValues(VARIANT$1));
        this.value = pvutils.getParametersValue(parameters, VALUE$1, KeyAgreeRecipientIdentifier.defaultValues(VALUE$1));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VARIANT$1:
                return (-1);
            case VALUE$1:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VARIANT$1:
                return (memberValue === (-1));
            case VALUE$1:
                return (Object.keys(memberValue).length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Choice({
            value: [
                IssuerAndSerialNumber.schema(names.issuerAndSerialNumber || {
                    names: {
                        blockName: (names.blockName || EMPTY_STRING)
                    }
                }),
                new asn1js.Constructed({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: RecipientKeyIdentifier.schema(names.rKeyId || {
                        names: {
                            blockName: (names.blockName || EMPTY_STRING)
                        }
                    }).valueBlock.value
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$v);
        const asn1 = asn1js.compareSchema(schema, schema, KeyAgreeRecipientIdentifier.schema({
            names: {
                blockName: "blockName"
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (asn1.result.blockName.idBlock.tagClass === 1) {
            this.variant = 1;
            this.value = new IssuerAndSerialNumber({ schema: asn1.result.blockName });
        }
        else {
            this.variant = 2;
            this.value = new RecipientKeyIdentifier({
                schema: new asn1js.Sequence({
                    value: asn1.result.blockName.valueBlock.value
                })
            });
        }
    }
    toSchema() {
        switch (this.variant) {
            case 1:
                return this.value.toSchema();
            case 2:
                return new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: this.value.toSchema().valueBlock.value
                });
            default:
                return new asn1js.Any();
        }
    }
    toJSON() {
        const res = {
            variant: this.variant,
        };
        if ((this.variant === 1) || (this.variant === 2)) {
            res.value = this.value.toJSON();
        }
        return res;
    }
}
KeyAgreeRecipientIdentifier.CLASS_NAME = "KeyAgreeRecipientIdentifier";

const RID = "rid";
const ENCRYPTED_KEY$2 = "encryptedKey";
const CLEAR_PROPS$u = [
    RID,
    ENCRYPTED_KEY$2,
];
class RecipientEncryptedKey extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.rid = pvutils.getParametersValue(parameters, RID, RecipientEncryptedKey.defaultValues(RID));
        this.encryptedKey = pvutils.getParametersValue(parameters, ENCRYPTED_KEY$2, RecipientEncryptedKey.defaultValues(ENCRYPTED_KEY$2));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case RID:
                return new KeyAgreeRecipientIdentifier();
            case ENCRYPTED_KEY$2:
                return new asn1js.OctetString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case RID:
                return ((memberValue.variant === (-1)) && (("value" in memberValue) === false));
            case ENCRYPTED_KEY$2:
                return (memberValue.isEqual(RecipientEncryptedKey.defaultValues(ENCRYPTED_KEY$2)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                KeyAgreeRecipientIdentifier.schema(names.rid || {}),
                new asn1js.OctetString({ name: (names.encryptedKey || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$u);
        const asn1 = asn1js.compareSchema(schema, schema, RecipientEncryptedKey.schema({
            names: {
                rid: {
                    names: {
                        blockName: RID
                    }
                },
                encryptedKey: ENCRYPTED_KEY$2
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.rid = new KeyAgreeRecipientIdentifier({ schema: asn1.result.rid });
        this.encryptedKey = asn1.result.encryptedKey;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.rid.toSchema(),
                this.encryptedKey
            ]
        }));
    }
    toJSON() {
        return {
            rid: this.rid.toJSON(),
            encryptedKey: this.encryptedKey.toJSON(),
        };
    }
}
RecipientEncryptedKey.CLASS_NAME = "RecipientEncryptedKey";

const ENCRYPTED_KEYS = "encryptedKeys";
const RECIPIENT_ENCRYPTED_KEYS = "RecipientEncryptedKeys";
const CLEAR_PROPS$t = [
    RECIPIENT_ENCRYPTED_KEYS,
];
class RecipientEncryptedKeys extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.encryptedKeys = pvutils.getParametersValue(parameters, ENCRYPTED_KEYS, RecipientEncryptedKeys.defaultValues(ENCRYPTED_KEYS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ENCRYPTED_KEYS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case ENCRYPTED_KEYS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.RecipientEncryptedKeys || EMPTY_STRING),
                    value: RecipientEncryptedKey.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$t);
        const asn1 = asn1js.compareSchema(schema, schema, RecipientEncryptedKeys.schema({
            names: {
                RecipientEncryptedKeys: RECIPIENT_ENCRYPTED_KEYS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.encryptedKeys = Array.from(asn1.result.RecipientEncryptedKeys, element => new RecipientEncryptedKey({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.encryptedKeys, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            encryptedKeys: Array.from(this.encryptedKeys, o => o.toJSON())
        };
    }
}
RecipientEncryptedKeys.CLASS_NAME = "RecipientEncryptedKeys";

const VERSION$b = "version";
const ORIGINATOR = "originator";
const UKM = "ukm";
const KEY_ENCRYPTION_ALGORITHM$2 = "keyEncryptionAlgorithm";
const RECIPIENT_ENCRYPTED_KEY = "recipientEncryptedKeys";
const RECIPIENT_CERTIFICATE = "recipientCertificate";
const RECIPIENT_PUBLIC_KEY = "recipientPublicKey";
const CLEAR_PROPS$s = [
    VERSION$b,
    ORIGINATOR,
    UKM,
    KEY_ENCRYPTION_ALGORITHM$2,
    RECIPIENT_ENCRYPTED_KEY,
];
class KeyAgreeRecipientInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$b, KeyAgreeRecipientInfo.defaultValues(VERSION$b));
        this.originator = pvutils.getParametersValue(parameters, ORIGINATOR, KeyAgreeRecipientInfo.defaultValues(ORIGINATOR));
        if (UKM in parameters) {
            this.ukm = pvutils.getParametersValue(parameters, UKM, KeyAgreeRecipientInfo.defaultValues(UKM));
        }
        this.keyEncryptionAlgorithm = pvutils.getParametersValue(parameters, KEY_ENCRYPTION_ALGORITHM$2, KeyAgreeRecipientInfo.defaultValues(KEY_ENCRYPTION_ALGORITHM$2));
        this.recipientEncryptedKeys = pvutils.getParametersValue(parameters, RECIPIENT_ENCRYPTED_KEY, KeyAgreeRecipientInfo.defaultValues(RECIPIENT_ENCRYPTED_KEY));
        this.recipientCertificate = pvutils.getParametersValue(parameters, RECIPIENT_CERTIFICATE, KeyAgreeRecipientInfo.defaultValues(RECIPIENT_CERTIFICATE));
        this.recipientPublicKey = pvutils.getParametersValue(parameters, RECIPIENT_PUBLIC_KEY, KeyAgreeRecipientInfo.defaultValues(RECIPIENT_PUBLIC_KEY));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$b:
                return 0;
            case ORIGINATOR:
                return new OriginatorIdentifierOrKey();
            case UKM:
                return new asn1js.OctetString();
            case KEY_ENCRYPTION_ALGORITHM$2:
                return new AlgorithmIdentifier();
            case RECIPIENT_ENCRYPTED_KEY:
                return new RecipientEncryptedKeys();
            case RECIPIENT_CERTIFICATE:
                return new Certificate();
            case RECIPIENT_PUBLIC_KEY:
                return null;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$b:
                return (memberValue === 0);
            case ORIGINATOR:
                return ((memberValue.variant === (-1)) && (("value" in memberValue) === false));
            case UKM:
                return (memberValue.isEqual(KeyAgreeRecipientInfo.defaultValues(UKM)));
            case KEY_ENCRYPTION_ALGORITHM$2:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case RECIPIENT_ENCRYPTED_KEY:
                return (memberValue.encryptedKeys.length === 0);
            case RECIPIENT_CERTIFICATE:
                return false;
            case RECIPIENT_PUBLIC_KEY:
                return false;
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: names.blockName || EMPTY_STRING,
            value: [
                new asn1js.Integer({ name: names.version || EMPTY_STRING }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        OriginatorIdentifierOrKey.schema(names.originator || {})
                    ]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [new asn1js.OctetString({ name: names.ukm || EMPTY_STRING })]
                }),
                AlgorithmIdentifier.schema(names.keyEncryptionAlgorithm || {}),
                RecipientEncryptedKeys.schema(names.recipientEncryptedKeys || {})
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$s);
        const asn1 = asn1js.compareSchema(schema, schema, KeyAgreeRecipientInfo.schema({
            names: {
                version: VERSION$b,
                originator: {
                    names: {
                        blockName: ORIGINATOR
                    }
                },
                ukm: UKM,
                keyEncryptionAlgorithm: {
                    names: {
                        blockName: KEY_ENCRYPTION_ALGORITHM$2
                    }
                },
                recipientEncryptedKeys: {
                    names: {
                        blockName: RECIPIENT_ENCRYPTED_KEY
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.originator = new OriginatorIdentifierOrKey({ schema: asn1.result.originator });
        if (UKM in asn1.result)
            this.ukm = asn1.result.ukm;
        this.keyEncryptionAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.keyEncryptionAlgorithm });
        this.recipientEncryptedKeys = new RecipientEncryptedKeys({ schema: asn1.result.recipientEncryptedKeys });
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        outputArray.push(new asn1js.Constructed({
            idBlock: {
                tagClass: 3,
                tagNumber: 0
            },
            value: [this.originator.toSchema()]
        }));
        if (this.ukm) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: [this.ukm]
            }));
        }
        outputArray.push(this.keyEncryptionAlgorithm.toSchema());
        outputArray.push(this.recipientEncryptedKeys.toSchema());
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            version: this.version,
            originator: this.originator.toJSON(),
            keyEncryptionAlgorithm: this.keyEncryptionAlgorithm.toJSON(),
            recipientEncryptedKeys: this.recipientEncryptedKeys.toJSON(),
        };
        if (this.ukm) {
            res.ukm = this.ukm.toJSON();
        }
        return res;
    }
}
KeyAgreeRecipientInfo.CLASS_NAME = "KeyAgreeRecipientInfo";

const KEY_IDENTIFIER = "keyIdentifier";
const DATE = "date";
const OTHER = "other";
const CLEAR_PROPS$r = [
    KEY_IDENTIFIER,
    DATE,
    OTHER,
];
class KEKIdentifier extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.keyIdentifier = pvutils.getParametersValue(parameters, KEY_IDENTIFIER, KEKIdentifier.defaultValues(KEY_IDENTIFIER));
        if (DATE in parameters) {
            this.date = pvutils.getParametersValue(parameters, DATE, KEKIdentifier.defaultValues(DATE));
        }
        if (OTHER in parameters) {
            this.other = pvutils.getParametersValue(parameters, OTHER, KEKIdentifier.defaultValues(OTHER));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case KEY_IDENTIFIER:
                return new asn1js.OctetString();
            case DATE:
                return new asn1js.GeneralizedTime();
            case OTHER:
                return new OtherKeyAttribute();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case KEY_IDENTIFIER:
                return (memberValue.isEqual(KEKIdentifier.defaultValues(KEY_IDENTIFIER)));
            case DATE:
                return ((memberValue.year === 0) &&
                    (memberValue.month === 0) &&
                    (memberValue.day === 0) &&
                    (memberValue.hour === 0) &&
                    (memberValue.minute === 0) &&
                    (memberValue.second === 0) &&
                    (memberValue.millisecond === 0));
            case OTHER:
                return ((memberValue.compareWithDefault("keyAttrId", memberValue.keyAttrId)) &&
                    (("keyAttr" in memberValue) === false));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.OctetString({ name: (names.keyIdentifier || EMPTY_STRING) }),
                new asn1js.GeneralizedTime({
                    optional: true,
                    name: (names.date || EMPTY_STRING)
                }),
                OtherKeyAttribute.schema(names.other || {})
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$r);
        const asn1 = asn1js.compareSchema(schema, schema, KEKIdentifier.schema({
            names: {
                keyIdentifier: KEY_IDENTIFIER,
                date: DATE,
                other: {
                    names: {
                        blockName: OTHER
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.keyIdentifier = asn1.result.keyIdentifier;
        if (DATE in asn1.result)
            this.date = asn1.result.date;
        if (OTHER in asn1.result)
            this.other = new OtherKeyAttribute({ schema: asn1.result.other });
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.keyIdentifier);
        if (this.date) {
            outputArray.push(this.date);
        }
        if (this.other) {
            outputArray.push(this.other.toSchema());
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            keyIdentifier: this.keyIdentifier.toJSON()
        };
        if (this.date) {
            res.date = this.date;
        }
        if (this.other) {
            res.other = this.other.toJSON();
        }
        return res;
    }
}
KEKIdentifier.CLASS_NAME = "KEKIdentifier";

const VERSION$a = "version";
const KEK_ID = "kekid";
const KEY_ENCRYPTION_ALGORITHM$1 = "keyEncryptionAlgorithm";
const ENCRYPTED_KEY$1 = "encryptedKey";
const PER_DEFINED_KEK = "preDefinedKEK";
const CLEAR_PROPS$q = [
    VERSION$a,
    KEK_ID,
    KEY_ENCRYPTION_ALGORITHM$1,
    ENCRYPTED_KEY$1,
];
class KEKRecipientInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$a, KEKRecipientInfo.defaultValues(VERSION$a));
        this.kekid = pvutils.getParametersValue(parameters, KEK_ID, KEKRecipientInfo.defaultValues(KEK_ID));
        this.keyEncryptionAlgorithm = pvutils.getParametersValue(parameters, KEY_ENCRYPTION_ALGORITHM$1, KEKRecipientInfo.defaultValues(KEY_ENCRYPTION_ALGORITHM$1));
        this.encryptedKey = pvutils.getParametersValue(parameters, ENCRYPTED_KEY$1, KEKRecipientInfo.defaultValues(ENCRYPTED_KEY$1));
        this.preDefinedKEK = pvutils.getParametersValue(parameters, PER_DEFINED_KEK, KEKRecipientInfo.defaultValues(PER_DEFINED_KEK));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$a:
                return 0;
            case KEK_ID:
                return new KEKIdentifier();
            case KEY_ENCRYPTION_ALGORITHM$1:
                return new AlgorithmIdentifier();
            case ENCRYPTED_KEY$1:
                return new asn1js.OctetString();
            case PER_DEFINED_KEK:
                return EMPTY_BUFFER;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case "KEKRecipientInfo":
                return (memberValue === KEKRecipientInfo.defaultValues(VERSION$a));
            case KEK_ID:
                return ((memberValue.compareWithDefault("keyIdentifier", memberValue.keyIdentifier)) &&
                    (("date" in memberValue) === false) &&
                    (("other" in memberValue) === false));
            case KEY_ENCRYPTION_ALGORITHM$1:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case ENCRYPTED_KEY$1:
                return (memberValue.isEqual(KEKRecipientInfo.defaultValues(ENCRYPTED_KEY$1)));
            case PER_DEFINED_KEK:
                return (memberValue.byteLength === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                KEKIdentifier.schema(names.kekid || {}),
                AlgorithmIdentifier.schema(names.keyEncryptionAlgorithm || {}),
                new asn1js.OctetString({ name: (names.encryptedKey || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$q);
        const asn1 = asn1js.compareSchema(schema, schema, KEKRecipientInfo.schema({
            names: {
                version: VERSION$a,
                kekid: {
                    names: {
                        blockName: KEK_ID
                    }
                },
                keyEncryptionAlgorithm: {
                    names: {
                        blockName: KEY_ENCRYPTION_ALGORITHM$1
                    }
                },
                encryptedKey: ENCRYPTED_KEY$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.kekid = new KEKIdentifier({ schema: asn1.result.kekid });
        this.keyEncryptionAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.keyEncryptionAlgorithm });
        this.encryptedKey = asn1.result.encryptedKey;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.Integer({ value: this.version }),
                this.kekid.toSchema(),
                this.keyEncryptionAlgorithm.toSchema(),
                this.encryptedKey
            ]
        }));
    }
    toJSON() {
        return {
            version: this.version,
            kekid: this.kekid.toJSON(),
            keyEncryptionAlgorithm: this.keyEncryptionAlgorithm.toJSON(),
            encryptedKey: this.encryptedKey.toJSON(),
        };
    }
}
KEKRecipientInfo.CLASS_NAME = "KEKRecipientInfo";

const VERSION$9 = "version";
const KEY_DERIVATION_ALGORITHM = "keyDerivationAlgorithm";
const KEY_ENCRYPTION_ALGORITHM = "keyEncryptionAlgorithm";
const ENCRYPTED_KEY = "encryptedKey";
const PASSWORD = "password";
const CLEAR_PROPS$p = [
    VERSION$9,
    KEY_DERIVATION_ALGORITHM,
    KEY_ENCRYPTION_ALGORITHM,
    ENCRYPTED_KEY
];
class PasswordRecipientinfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$9, PasswordRecipientinfo.defaultValues(VERSION$9));
        if (KEY_DERIVATION_ALGORITHM in parameters) {
            this.keyDerivationAlgorithm = pvutils.getParametersValue(parameters, KEY_DERIVATION_ALGORITHM, PasswordRecipientinfo.defaultValues(KEY_DERIVATION_ALGORITHM));
        }
        this.keyEncryptionAlgorithm = pvutils.getParametersValue(parameters, KEY_ENCRYPTION_ALGORITHM, PasswordRecipientinfo.defaultValues(KEY_ENCRYPTION_ALGORITHM));
        this.encryptedKey = pvutils.getParametersValue(parameters, ENCRYPTED_KEY, PasswordRecipientinfo.defaultValues(ENCRYPTED_KEY));
        this.password = pvutils.getParametersValue(parameters, PASSWORD, PasswordRecipientinfo.defaultValues(PASSWORD));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$9:
                return (-1);
            case KEY_DERIVATION_ALGORITHM:
                return new AlgorithmIdentifier();
            case KEY_ENCRYPTION_ALGORITHM:
                return new AlgorithmIdentifier();
            case ENCRYPTED_KEY:
                return new asn1js.OctetString();
            case PASSWORD:
                return EMPTY_BUFFER;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$9:
                return (memberValue === (-1));
            case KEY_DERIVATION_ALGORITHM:
            case KEY_ENCRYPTION_ALGORITHM:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case ENCRYPTED_KEY:
                return (memberValue.isEqual(PasswordRecipientinfo.defaultValues(ENCRYPTED_KEY)));
            case PASSWORD:
                return (memberValue.byteLength === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                new asn1js.Constructed({
                    name: (names.keyDerivationAlgorithm || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: AlgorithmIdentifier.schema().valueBlock.value
                }),
                AlgorithmIdentifier.schema(names.keyEncryptionAlgorithm || {}),
                new asn1js.OctetString({ name: (names.encryptedKey || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$p);
        const asn1 = asn1js.compareSchema(schema, schema, PasswordRecipientinfo.schema({
            names: {
                version: VERSION$9,
                keyDerivationAlgorithm: KEY_DERIVATION_ALGORITHM,
                keyEncryptionAlgorithm: {
                    names: {
                        blockName: KEY_ENCRYPTION_ALGORITHM
                    }
                },
                encryptedKey: ENCRYPTED_KEY
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        if (KEY_DERIVATION_ALGORITHM in asn1.result) {
            this.keyDerivationAlgorithm = new AlgorithmIdentifier({
                schema: new asn1js.Sequence({
                    value: asn1.result.keyDerivationAlgorithm.valueBlock.value
                })
            });
        }
        this.keyEncryptionAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.keyEncryptionAlgorithm });
        this.encryptedKey = asn1.result.encryptedKey;
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        if (this.keyDerivationAlgorithm) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: this.keyDerivationAlgorithm.toSchema().valueBlock.value
            }));
        }
        outputArray.push(this.keyEncryptionAlgorithm.toSchema());
        outputArray.push(this.encryptedKey);
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            version: this.version,
            keyEncryptionAlgorithm: this.keyEncryptionAlgorithm.toJSON(),
            encryptedKey: this.encryptedKey.toJSON(),
        };
        if (this.keyDerivationAlgorithm) {
            res.keyDerivationAlgorithm = this.keyDerivationAlgorithm.toJSON();
        }
        return res;
    }
}
PasswordRecipientinfo.CLASS_NAME = "PasswordRecipientInfo";

const ORI_TYPE = "oriType";
const ORI_VALUE = "oriValue";
const CLEAR_PROPS$o = [
    ORI_TYPE,
    ORI_VALUE
];
class OtherRecipientInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.oriType = pvutils.getParametersValue(parameters, ORI_TYPE, OtherRecipientInfo.defaultValues(ORI_TYPE));
        this.oriValue = pvutils.getParametersValue(parameters, ORI_VALUE, OtherRecipientInfo.defaultValues(ORI_VALUE));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case ORI_TYPE:
                return EMPTY_STRING;
            case ORI_VALUE:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case ORI_TYPE:
                return (memberValue === EMPTY_STRING);
            case ORI_VALUE:
                return (Object.keys(memberValue).length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.oriType || EMPTY_STRING) }),
                new asn1js.Any({ name: (names.oriValue || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$o);
        const asn1 = asn1js.compareSchema(schema, schema, OtherRecipientInfo.schema({
            names: {
                oriType: ORI_TYPE,
                oriValue: ORI_VALUE
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.oriType = asn1.result.oriType.valueBlock.toString();
        this.oriValue = asn1.result.oriValue;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.oriType }),
                this.oriValue
            ]
        }));
    }
    toJSON() {
        const res = {
            oriType: this.oriType
        };
        if (!OtherRecipientInfo.compareWithDefault(ORI_VALUE, this.oriValue)) {
            res.oriValue = this.oriValue.toJSON();
        }
        return res;
    }
}
OtherRecipientInfo.CLASS_NAME = "OtherRecipientInfo";

const VARIANT = "variant";
const VALUE = "value";
const CLEAR_PROPS$n = [
    "blockName"
];
class RecipientInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.variant = pvutils.getParametersValue(parameters, VARIANT, RecipientInfo.defaultValues(VARIANT));
        if (VALUE in parameters) {
            this.value = pvutils.getParametersValue(parameters, VALUE, RecipientInfo.defaultValues(VALUE));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VARIANT:
                return (-1);
            case VALUE:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VARIANT:
                return (memberValue === RecipientInfo.defaultValues(memberName));
            case VALUE:
                return (Object.keys(memberValue).length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Choice({
            value: [
                KeyTransRecipientInfo.schema({
                    names: {
                        blockName: (names.blockName || EMPTY_STRING)
                    }
                }),
                new asn1js.Constructed({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: KeyAgreeRecipientInfo.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    value: KEKRecipientInfo.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 3
                    },
                    value: PasswordRecipientinfo.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    name: (names.blockName || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 4
                    },
                    value: OtherRecipientInfo.schema().valueBlock.value
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$n);
        const asn1 = asn1js.compareSchema(schema, schema, RecipientInfo.schema({
            names: {
                blockName: "blockName"
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (asn1.result.blockName.idBlock.tagClass === 1) {
            this.variant = 1;
            this.value = new KeyTransRecipientInfo({ schema: asn1.result.blockName });
        }
        else {
            const blockSequence = new asn1js.Sequence({
                value: asn1.result.blockName.valueBlock.value
            });
            switch (asn1.result.blockName.idBlock.tagNumber) {
                case 1:
                    this.variant = 2;
                    this.value = new KeyAgreeRecipientInfo({ schema: blockSequence });
                    break;
                case 2:
                    this.variant = 3;
                    this.value = new KEKRecipientInfo({ schema: blockSequence });
                    break;
                case 3:
                    this.variant = 4;
                    this.value = new PasswordRecipientinfo({ schema: blockSequence });
                    break;
                case 4:
                    this.variant = 5;
                    this.value = new OtherRecipientInfo({ schema: blockSequence });
                    break;
                default:
                    throw new Error("Incorrect structure of RecipientInfo block");
            }
        }
    }
    toSchema() {
        ParameterError.assertEmpty(this.value, "value", "RecipientInfo");
        const _schema = this.value.toSchema();
        switch (this.variant) {
            case 1:
                return _schema;
            case 2:
            case 3:
            case 4:
                _schema.idBlock.tagClass = 3;
                _schema.idBlock.tagNumber = (this.variant - 1);
                return _schema;
            default:
                return new asn1js.Any();
        }
    }
    toJSON() {
        const res = {
            variant: this.variant
        };
        if (this.value && (this.variant >= 1) && (this.variant <= 4)) {
            res.value = this.value.toJSON();
        }
        return res;
    }
}
RecipientInfo.CLASS_NAME = "RecipientInfo";

const HASH_ALGORITHM$2 = "hashAlgorithm";
const MASK_GEN_ALGORITHM = "maskGenAlgorithm";
const P_SOURCE_ALGORITHM = "pSourceAlgorithm";
const CLEAR_PROPS$m = [
    HASH_ALGORITHM$2,
    MASK_GEN_ALGORITHM,
    P_SOURCE_ALGORITHM
];
class RSAESOAEPParams extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.hashAlgorithm = pvutils.getParametersValue(parameters, HASH_ALGORITHM$2, RSAESOAEPParams.defaultValues(HASH_ALGORITHM$2));
        this.maskGenAlgorithm = pvutils.getParametersValue(parameters, MASK_GEN_ALGORITHM, RSAESOAEPParams.defaultValues(MASK_GEN_ALGORITHM));
        this.pSourceAlgorithm = pvutils.getParametersValue(parameters, P_SOURCE_ALGORITHM, RSAESOAEPParams.defaultValues(P_SOURCE_ALGORITHM));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case HASH_ALGORITHM$2:
                return new AlgorithmIdentifier({
                    algorithmId: "1.3.14.3.2.26",
                    algorithmParams: new asn1js.Null()
                });
            case MASK_GEN_ALGORITHM:
                return new AlgorithmIdentifier({
                    algorithmId: "1.2.840.113549.1.1.8",
                    algorithmParams: (new AlgorithmIdentifier({
                        algorithmId: "1.3.14.3.2.26",
                        algorithmParams: new asn1js.Null()
                    })).toSchema()
                });
            case P_SOURCE_ALGORITHM:
                return new AlgorithmIdentifier({
                    algorithmId: "1.2.840.113549.1.1.9",
                    algorithmParams: new asn1js.OctetString({ valueHex: (new Uint8Array([0xda, 0x39, 0xa3, 0xee, 0x5e, 0x6b, 0x4b, 0x0d, 0x32, 0x55, 0xbf, 0xef, 0x95, 0x60, 0x18, 0x90, 0xaf, 0xd8, 0x07, 0x09])).buffer })
                });
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    optional: true,
                    value: [AlgorithmIdentifier.schema(names.hashAlgorithm || {})]
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    optional: true,
                    value: [AlgorithmIdentifier.schema(names.maskGenAlgorithm || {})]
                }),
                new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    optional: true,
                    value: [AlgorithmIdentifier.schema(names.pSourceAlgorithm || {})]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$m);
        const asn1 = asn1js.compareSchema(schema, schema, RSAESOAEPParams.schema({
            names: {
                hashAlgorithm: {
                    names: {
                        blockName: HASH_ALGORITHM$2
                    }
                },
                maskGenAlgorithm: {
                    names: {
                        blockName: MASK_GEN_ALGORITHM
                    }
                },
                pSourceAlgorithm: {
                    names: {
                        blockName: P_SOURCE_ALGORITHM
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        if (HASH_ALGORITHM$2 in asn1.result)
            this.hashAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.hashAlgorithm });
        if (MASK_GEN_ALGORITHM in asn1.result)
            this.maskGenAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.maskGenAlgorithm });
        if (P_SOURCE_ALGORITHM in asn1.result)
            this.pSourceAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.pSourceAlgorithm });
    }
    toSchema() {
        const outputArray = [];
        if (!this.hashAlgorithm.isEqual(RSAESOAEPParams.defaultValues(HASH_ALGORITHM$2))) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [this.hashAlgorithm.toSchema()]
            }));
        }
        if (!this.maskGenAlgorithm.isEqual(RSAESOAEPParams.defaultValues(MASK_GEN_ALGORITHM))) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: [this.maskGenAlgorithm.toSchema()]
            }));
        }
        if (!this.pSourceAlgorithm.isEqual(RSAESOAEPParams.defaultValues(P_SOURCE_ALGORITHM))) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 2
                },
                value: [this.pSourceAlgorithm.toSchema()]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {};
        if (!this.hashAlgorithm.isEqual(RSAESOAEPParams.defaultValues(HASH_ALGORITHM$2))) {
            res.hashAlgorithm = this.hashAlgorithm.toJSON();
        }
        if (!this.maskGenAlgorithm.isEqual(RSAESOAEPParams.defaultValues(MASK_GEN_ALGORITHM))) {
            res.maskGenAlgorithm = this.maskGenAlgorithm.toJSON();
        }
        if (!this.pSourceAlgorithm.isEqual(RSAESOAEPParams.defaultValues(P_SOURCE_ALGORITHM))) {
            res.pSourceAlgorithm = this.pSourceAlgorithm.toJSON();
        }
        return res;
    }
}
RSAESOAEPParams.CLASS_NAME = "RSAESOAEPParams";

const KEY_INFO = "keyInfo";
const ENTITY_U_INFO = "entityUInfo";
const SUPP_PUB_INFO = "suppPubInfo";
const CLEAR_PROPS$l = [
    KEY_INFO,
    ENTITY_U_INFO,
    SUPP_PUB_INFO
];
class ECCCMSSharedInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.keyInfo = pvutils.getParametersValue(parameters, KEY_INFO, ECCCMSSharedInfo.defaultValues(KEY_INFO));
        if (ENTITY_U_INFO in parameters) {
            this.entityUInfo = pvutils.getParametersValue(parameters, ENTITY_U_INFO, ECCCMSSharedInfo.defaultValues(ENTITY_U_INFO));
        }
        this.suppPubInfo = pvutils.getParametersValue(parameters, SUPP_PUB_INFO, ECCCMSSharedInfo.defaultValues(SUPP_PUB_INFO));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case KEY_INFO:
                return new AlgorithmIdentifier();
            case ENTITY_U_INFO:
                return new asn1js.OctetString();
            case SUPP_PUB_INFO:
                return new asn1js.OctetString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case KEY_INFO:
            case ENTITY_U_INFO:
            case SUPP_PUB_INFO:
                return (memberValue.isEqual(ECCCMSSharedInfo.defaultValues(memberName)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.keyInfo || {}),
                new asn1js.Constructed({
                    name: (names.entityUInfo || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    optional: true,
                    value: [new asn1js.OctetString()]
                }),
                new asn1js.Constructed({
                    name: (names.suppPubInfo || EMPTY_STRING),
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    value: [new asn1js.OctetString()]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$l);
        const asn1 = asn1js.compareSchema(schema, schema, ECCCMSSharedInfo.schema({
            names: {
                keyInfo: {
                    names: {
                        blockName: KEY_INFO
                    }
                },
                entityUInfo: ENTITY_U_INFO,
                suppPubInfo: SUPP_PUB_INFO
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.keyInfo = new AlgorithmIdentifier({ schema: asn1.result.keyInfo });
        if (ENTITY_U_INFO in asn1.result)
            this.entityUInfo = asn1.result.entityUInfo.valueBlock.value[0];
        this.suppPubInfo = asn1.result.suppPubInfo.valueBlock.value[0];
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.keyInfo.toSchema());
        if (this.entityUInfo) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [this.entityUInfo]
            }));
        }
        outputArray.push(new asn1js.Constructed({
            idBlock: {
                tagClass: 3,
                tagNumber: 2
            },
            value: [this.suppPubInfo]
        }));
        return new asn1js.Sequence({
            value: outputArray
        });
    }
    toJSON() {
        const res = {
            keyInfo: this.keyInfo.toJSON(),
            suppPubInfo: this.suppPubInfo.toJSON(),
        };
        if (this.entityUInfo) {
            res.entityUInfo = this.entityUInfo.toJSON();
        }
        return res;
    }
}
ECCCMSSharedInfo.CLASS_NAME = "ECCCMSSharedInfo";

const VERSION$8 = "version";
const ORIGINATOR_INFO = "originatorInfo";
const RECIPIENT_INFOS = "recipientInfos";
const ENCRYPTED_CONTENT_INFO = "encryptedContentInfo";
const UNPROTECTED_ATTRS = "unprotectedAttrs";
const CLEAR_PROPS$k = [
    VERSION$8,
    ORIGINATOR_INFO,
    RECIPIENT_INFOS,
    ENCRYPTED_CONTENT_INFO,
    UNPROTECTED_ATTRS
];
const defaultEncryptionParams = {
    kdfAlgorithm: "SHA-512",
    kekEncryptionLength: 256
};
const curveLengthByName = {
    "P-256": 256,
    "P-384": 384,
    "P-521": 528
};
class EnvelopedData extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$8, EnvelopedData.defaultValues(VERSION$8));
        if (ORIGINATOR_INFO in parameters) {
            this.originatorInfo = pvutils.getParametersValue(parameters, ORIGINATOR_INFO, EnvelopedData.defaultValues(ORIGINATOR_INFO));
        }
        this.recipientInfos = pvutils.getParametersValue(parameters, RECIPIENT_INFOS, EnvelopedData.defaultValues(RECIPIENT_INFOS));
        this.encryptedContentInfo = pvutils.getParametersValue(parameters, ENCRYPTED_CONTENT_INFO, EnvelopedData.defaultValues(ENCRYPTED_CONTENT_INFO));
        if (UNPROTECTED_ATTRS in parameters) {
            this.unprotectedAttrs = pvutils.getParametersValue(parameters, UNPROTECTED_ATTRS, EnvelopedData.defaultValues(UNPROTECTED_ATTRS));
        }
        this.policy = {
            disableSplit: !!parameters.disableSplit,
        };
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$8:
                return 0;
            case ORIGINATOR_INFO:
                return new OriginatorInfo();
            case RECIPIENT_INFOS:
                return [];
            case ENCRYPTED_CONTENT_INFO:
                return new EncryptedContentInfo();
            case UNPROTECTED_ATTRS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$8:
                return (memberValue === EnvelopedData.defaultValues(memberName));
            case ORIGINATOR_INFO:
                return ((memberValue.certs.certificates.length === 0) && (memberValue.crls.crls.length === 0));
            case RECIPIENT_INFOS:
            case UNPROTECTED_ATTRS:
                return (memberValue.length === 0);
            case ENCRYPTED_CONTENT_INFO:
                return ((EncryptedContentInfo.compareWithDefault("contentType", memberValue.contentType)) &&
                    (EncryptedContentInfo.compareWithDefault("contentEncryptionAlgorithm", memberValue.contentEncryptionAlgorithm) &&
                        (EncryptedContentInfo.compareWithDefault("encryptedContent", memberValue.encryptedContent))));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || EMPTY_STRING) }),
                new asn1js.Constructed({
                    name: (names.originatorInfo || EMPTY_STRING),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: OriginatorInfo.schema().valueBlock.value
                }),
                new asn1js.Set({
                    value: [
                        new asn1js.Repeated({
                            name: (names.recipientInfos || EMPTY_STRING),
                            value: RecipientInfo.schema()
                        })
                    ]
                }),
                EncryptedContentInfo.schema(names.encryptedContentInfo || {}),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.unprotectedAttrs || EMPTY_STRING),
                            value: Attribute.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$k);
        const asn1 = asn1js.compareSchema(schema, schema, EnvelopedData.schema({
            names: {
                version: VERSION$8,
                originatorInfo: ORIGINATOR_INFO,
                recipientInfos: RECIPIENT_INFOS,
                encryptedContentInfo: {
                    names: {
                        blockName: ENCRYPTED_CONTENT_INFO
                    }
                },
                unprotectedAttrs: UNPROTECTED_ATTRS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        if (ORIGINATOR_INFO in asn1.result) {
            this.originatorInfo = new OriginatorInfo({
                schema: new asn1js.Sequence({
                    value: asn1.result.originatorInfo.valueBlock.value
                })
            });
        }
        this.recipientInfos = Array.from(asn1.result.recipientInfos, o => new RecipientInfo({ schema: o }));
        this.encryptedContentInfo = new EncryptedContentInfo({ schema: asn1.result.encryptedContentInfo });
        if (UNPROTECTED_ATTRS in asn1.result)
            this.unprotectedAttrs = Array.from(asn1.result.unprotectedAttrs, o => new Attribute({ schema: o }));
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        if (this.originatorInfo) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: this.originatorInfo.toSchema().valueBlock.value
            }));
        }
        outputArray.push(new asn1js.Set({
            value: Array.from(this.recipientInfos, o => o.toSchema())
        }));
        outputArray.push(this.encryptedContentInfo.toSchema());
        if (this.unprotectedAttrs) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: Array.from(this.unprotectedAttrs, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            version: this.version,
            recipientInfos: Array.from(this.recipientInfos, o => o.toJSON()),
            encryptedContentInfo: this.encryptedContentInfo.toJSON(),
        };
        if (this.originatorInfo)
            res.originatorInfo = this.originatorInfo.toJSON();
        if (this.unprotectedAttrs)
            res.unprotectedAttrs = Array.from(this.unprotectedAttrs, o => o.toJSON());
        return res;
    }
    addRecipientByCertificate(certificate, parameters, variant, crypto = getCrypto(true)) {
        const encryptionParameters = Object.assign({ useOAEP: true, oaepHashAlgorithm: "SHA-512" }, defaultEncryptionParams, parameters || {});
        if (certificate.subjectPublicKeyInfo.algorithm.algorithmId.indexOf("1.2.840.113549") !== (-1))
            variant = 1;
        else {
            if (certificate.subjectPublicKeyInfo.algorithm.algorithmId.indexOf("1.2.840.10045") !== (-1))
                variant = 2;
            else
                throw new Error(`Unknown type of certificate's public key: ${certificate.subjectPublicKeyInfo.algorithm.algorithmId}`);
        }
        switch (variant) {
            case 1:
                {
                    let algorithmId;
                    let algorithmParams;
                    if (encryptionParameters.useOAEP === true) {
                        algorithmId = crypto.getOIDByAlgorithm({
                            name: "RSA-OAEP"
                        }, true, "keyEncryptionAlgorithm");
                        const hashOID = crypto.getOIDByAlgorithm({
                            name: encryptionParameters.oaepHashAlgorithm
                        }, true, "RSAES-OAEP-params");
                        const hashAlgorithm = new AlgorithmIdentifier({
                            algorithmId: hashOID,
                            algorithmParams: new asn1js.Null()
                        });
                        const rsaOAEPParams = new RSAESOAEPParams({
                            hashAlgorithm,
                            maskGenAlgorithm: new AlgorithmIdentifier({
                                algorithmId: "1.2.840.113549.1.1.8",
                                algorithmParams: hashAlgorithm.toSchema()
                            })
                        });
                        algorithmParams = rsaOAEPParams.toSchema();
                    }
                    else {
                        algorithmId = crypto.getOIDByAlgorithm({
                            name: "RSAES-PKCS1-v1_5"
                        });
                        if (algorithmId === EMPTY_STRING)
                            throw new Error("Can not find OID for RSAES-PKCS1-v1_5");
                        algorithmParams = new asn1js.Null();
                    }
                    const keyInfo = new KeyTransRecipientInfo({
                        version: 0,
                        rid: new IssuerAndSerialNumber({
                            issuer: certificate.issuer,
                            serialNumber: certificate.serialNumber
                        }),
                        keyEncryptionAlgorithm: new AlgorithmIdentifier({
                            algorithmId,
                            algorithmParams
                        }),
                        recipientCertificate: certificate,
                    });
                    this.recipientInfos.push(new RecipientInfo({
                        variant: 1,
                        value: keyInfo
                    }));
                }
                break;
            case 2:
                {
                    const recipientIdentifier = new KeyAgreeRecipientIdentifier({
                        variant: 1,
                        value: new IssuerAndSerialNumber({
                            issuer: certificate.issuer,
                            serialNumber: certificate.serialNumber
                        })
                    });
                    this._addKeyAgreeRecipientInfo(recipientIdentifier, encryptionParameters, { recipientCertificate: certificate }, crypto);
                }
                break;
            default:
                throw new Error(`Unknown "variant" value: ${variant}`);
        }
        return true;
    }
    addRecipientByPreDefinedData(preDefinedData, parameters = {}, variant, crypto = getCrypto(true)) {
        ArgumentError.assert(preDefinedData, "preDefinedData", "ArrayBuffer");
        if (!preDefinedData.byteLength) {
            throw new Error("Pre-defined data could have zero length");
        }
        if (!parameters.keyIdentifier) {
            const keyIdentifierBuffer = new ArrayBuffer(16);
            const keyIdentifierView = new Uint8Array(keyIdentifierBuffer);
            crypto.getRandomValues(keyIdentifierView);
            parameters.keyIdentifier = keyIdentifierBuffer;
        }
        if (!parameters.hmacHashAlgorithm)
            parameters.hmacHashAlgorithm = "SHA-512";
        if (parameters.iterationCount === undefined) {
            parameters.iterationCount = 2048;
        }
        if (!parameters.keyEncryptionAlgorithm) {
            parameters.keyEncryptionAlgorithm = {
                name: "AES-KW",
                length: 256
            };
        }
        if (!parameters.keyEncryptionAlgorithmParams)
            parameters.keyEncryptionAlgorithmParams = new asn1js.Null();
        switch (variant) {
            case 1:
                {
                    const kekOID = crypto.getOIDByAlgorithm(parameters.keyEncryptionAlgorithm, true, "keyEncryptionAlgorithm");
                    const keyInfo = new KEKRecipientInfo({
                        version: 4,
                        kekid: new KEKIdentifier({
                            keyIdentifier: new asn1js.OctetString({ valueHex: parameters.keyIdentifier })
                        }),
                        keyEncryptionAlgorithm: new AlgorithmIdentifier({
                            algorithmId: kekOID,
                            algorithmParams: parameters.keyEncryptionAlgorithmParams
                        }),
                        preDefinedKEK: preDefinedData
                    });
                    this.recipientInfos.push(new RecipientInfo({
                        variant: 3,
                        value: keyInfo
                    }));
                }
                break;
            case 2:
                {
                    const pbkdf2OID = crypto.getOIDByAlgorithm({ name: "PBKDF2" }, true, "keyDerivationAlgorithm");
                    const saltBuffer = new ArrayBuffer(64);
                    const saltView = new Uint8Array(saltBuffer);
                    crypto.getRandomValues(saltView);
                    const hmacOID = crypto.getOIDByAlgorithm({
                        name: "HMAC",
                        hash: {
                            name: parameters.hmacHashAlgorithm
                        }
                    }, true, "hmacHashAlgorithm");
                    const pbkdf2Params = new PBKDF2Params({
                        salt: new asn1js.OctetString({ valueHex: saltBuffer }),
                        iterationCount: parameters.iterationCount,
                        prf: new AlgorithmIdentifier({
                            algorithmId: hmacOID,
                            algorithmParams: new asn1js.Null()
                        })
                    });
                    const kekOID = crypto.getOIDByAlgorithm(parameters.keyEncryptionAlgorithm, true, "keyEncryptionAlgorithm");
                    const keyInfo = new PasswordRecipientinfo({
                        version: 0,
                        keyDerivationAlgorithm: new AlgorithmIdentifier({
                            algorithmId: pbkdf2OID,
                            algorithmParams: pbkdf2Params.toSchema()
                        }),
                        keyEncryptionAlgorithm: new AlgorithmIdentifier({
                            algorithmId: kekOID,
                            algorithmParams: parameters.keyEncryptionAlgorithmParams
                        }),
                        password: preDefinedData
                    });
                    this.recipientInfos.push(new RecipientInfo({
                        variant: 4,
                        value: keyInfo
                    }));
                }
                break;
            default:
                throw new Error(`Unknown value for "variant": ${variant}`);
        }
    }
    addRecipientByKeyIdentifier(key, keyId, parameters, crypto = getCrypto(true)) {
        const encryptionParameters = Object.assign({}, defaultEncryptionParams, parameters || {});
        const recipientIdentifier = new KeyAgreeRecipientIdentifier({
            variant: 2,
            value: new RecipientKeyIdentifier({
                subjectKeyIdentifier: new asn1js.OctetString({ valueHex: keyId }),
            })
        });
        this._addKeyAgreeRecipientInfo(recipientIdentifier, encryptionParameters, { recipientPublicKey: key }, crypto);
    }
    _addKeyAgreeRecipientInfo(recipientIdentifier, encryptionParameters, extraRecipientInfoParams, crypto = getCrypto(true)) {
        const encryptedKey = new RecipientEncryptedKey({
            rid: recipientIdentifier
        });
        const aesKWoid = crypto.getOIDByAlgorithm({
            name: "AES-KW",
            length: encryptionParameters.kekEncryptionLength
        }, true, "keyEncryptionAlgorithm");
        const aesKW = new AlgorithmIdentifier({
            algorithmId: aesKWoid,
        });
        const ecdhOID = crypto.getOIDByAlgorithm({
            name: "ECDH",
            kdf: encryptionParameters.kdfAlgorithm
        }, true, "KeyAgreeRecipientInfo");
        const ukmBuffer = new ArrayBuffer(64);
        const ukmView = new Uint8Array(ukmBuffer);
        crypto.getRandomValues(ukmView);
        const recipientInfoParams = {
            version: 3,
            ukm: new asn1js.OctetString({ valueHex: ukmBuffer }),
            keyEncryptionAlgorithm: new AlgorithmIdentifier({
                algorithmId: ecdhOID,
                algorithmParams: aesKW.toSchema()
            }),
            recipientEncryptedKeys: new RecipientEncryptedKeys({
                encryptedKeys: [encryptedKey]
            })
        };
        const keyInfo = new KeyAgreeRecipientInfo(Object.assign(recipientInfoParams, extraRecipientInfoParams));
        this.recipientInfos.push(new RecipientInfo({
            variant: 2,
            value: keyInfo
        }));
    }
    async encrypt(contentEncryptionAlgorithm, contentToEncrypt, crypto = getCrypto(true)) {
        const ivBuffer = new ArrayBuffer(16);
        const ivView = new Uint8Array(ivBuffer);
        crypto.getRandomValues(ivView);
        const contentView = new Uint8Array(contentToEncrypt);
        const contentEncryptionOID = crypto.getOIDByAlgorithm(contentEncryptionAlgorithm, true, "contentEncryptionAlgorithm");
        const sessionKey = await crypto.generateKey(contentEncryptionAlgorithm, true, ["encrypt"]);
        const encryptedContent = await crypto.encrypt({
            name: contentEncryptionAlgorithm.name,
            iv: ivView
        }, sessionKey, contentView);
        const exportedSessionKey = await crypto.exportKey("raw", sessionKey);
        this.version = 2;
        this.encryptedContentInfo = new EncryptedContentInfo({
            disableSplit: this.policy.disableSplit,
            contentType: "1.2.840.113549.1.7.1",
            contentEncryptionAlgorithm: new AlgorithmIdentifier({
                algorithmId: contentEncryptionOID,
                algorithmParams: new asn1js.OctetString({ valueHex: ivBuffer })
            }),
            encryptedContent: new asn1js.OctetString({ valueHex: encryptedContent })
        });
        const SubKeyAgreeRecipientInfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            let recipientCurve;
            let recipientPublicKey;
            if (recipientInfo.recipientPublicKey) {
                recipientCurve = recipientInfo.recipientPublicKey.algorithm.namedCurve;
                recipientPublicKey = recipientInfo.recipientPublicKey;
            }
            else if (recipientInfo.recipientCertificate) {
                const curveObject = recipientInfo.recipientCertificate.subjectPublicKeyInfo.algorithm.algorithmParams;
                if (curveObject.constructor.blockName() !== asn1js.ObjectIdentifier.blockName())
                    throw new Error(`Incorrect "recipientCertificate" for index ${index}`);
                const curveOID = curveObject.valueBlock.toString();
                switch (curveOID) {
                    case "1.2.840.10045.3.1.7":
                        recipientCurve = "P-256";
                        break;
                    case "1.3.132.0.34":
                        recipientCurve = "P-384";
                        break;
                    case "1.3.132.0.35":
                        recipientCurve = "P-521";
                        break;
                    default:
                        throw new Error(`Incorrect curve OID for index ${index}`);
                }
                recipientPublicKey = await recipientInfo.recipientCertificate.getPublicKey({
                    algorithm: {
                        algorithm: {
                            name: "ECDH",
                            namedCurve: recipientCurve
                        },
                        usages: []
                    }
                }, crypto);
            }
            else {
                throw new Error("Unsupported RecipientInfo");
            }
            const recipientCurveLength = curveLengthByName[recipientCurve];
            const ecdhKeys = await crypto.generateKey({ name: "ECDH", namedCurve: recipientCurve }, true, ["deriveBits"]);
            const exportedECDHPublicKey = await crypto.exportKey("spki", ecdhKeys.publicKey);
            const derivedBits = await crypto.deriveBits({
                name: "ECDH",
                public: recipientPublicKey
            }, ecdhKeys.privateKey, recipientCurveLength);
            const aesKWAlgorithm = new AlgorithmIdentifier({ schema: recipientInfo.keyEncryptionAlgorithm.algorithmParams });
            const kwAlgorithm = crypto.getAlgorithmByOID(aesKWAlgorithm.algorithmId, true, "aesKWAlgorithm");
            let kwLength = kwAlgorithm.length;
            const kwLengthBuffer = new ArrayBuffer(4);
            const kwLengthView = new Uint8Array(kwLengthBuffer);
            for (let j = 3; j >= 0; j--) {
                kwLengthView[j] = kwLength;
                kwLength >>= 8;
            }
            const eccInfo = new ECCCMSSharedInfo({
                keyInfo: new AlgorithmIdentifier({
                    algorithmId: aesKWAlgorithm.algorithmId
                }),
                entityUInfo: recipientInfo.ukm,
                suppPubInfo: new asn1js.OctetString({ valueHex: kwLengthBuffer })
            });
            const encodedInfo = eccInfo.toSchema().toBER(false);
            const ecdhAlgorithm = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "ecdhAlgorithm");
            const derivedKeyRaw = await kdf(ecdhAlgorithm.kdf, derivedBits, kwAlgorithm.length, encodedInfo, crypto);
            const awsKW = await crypto.importKey("raw", derivedKeyRaw, { name: "AES-KW" }, true, ["wrapKey"]);
            const wrappedKey = await crypto.wrapKey("raw", sessionKey, awsKW, { name: "AES-KW" });
            const originator = new OriginatorIdentifierOrKey();
            originator.variant = 3;
            originator.value = OriginatorPublicKey.fromBER(exportedECDHPublicKey);
            recipientInfo.originator = originator;
            recipientInfo.recipientEncryptedKeys.encryptedKeys[0].encryptedKey = new asn1js.OctetString({ valueHex: wrappedKey });
            return { ecdhPrivateKey: ecdhKeys.privateKey };
        };
        const SubKeyTransRecipientInfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            const algorithmParameters = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "keyEncryptionAlgorithm");
            if (algorithmParameters.name === "RSA-OAEP") {
                const schema = recipientInfo.keyEncryptionAlgorithm.algorithmParams;
                const rsaOAEPParams = new RSAESOAEPParams({ schema });
                algorithmParameters.hash = crypto.getAlgorithmByOID(rsaOAEPParams.hashAlgorithm.algorithmId);
                if (("name" in algorithmParameters.hash) === false)
                    throw new Error(`Incorrect OID for hash algorithm: ${rsaOAEPParams.hashAlgorithm.algorithmId}`);
            }
            try {
                const publicKey = await recipientInfo.recipientCertificate.getPublicKey({
                    algorithm: {
                        algorithm: algorithmParameters,
                        usages: ["encrypt", "wrapKey"]
                    }
                }, crypto);
                const encryptedKey = await crypto.encrypt(publicKey.algorithm, publicKey, exportedSessionKey);
                recipientInfo.encryptedKey = new asn1js.OctetString({ valueHex: encryptedKey });
            }
            catch {
            }
        };
        const SubKEKRecipientInfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            const kekAlgorithm = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "kekAlgorithm");
            const kekKey = await crypto.importKey("raw", new Uint8Array(recipientInfo.preDefinedKEK), kekAlgorithm, true, ["wrapKey"]);
            const wrappedKey = await crypto.wrapKey("raw", sessionKey, kekKey, kekAlgorithm);
            recipientInfo.encryptedKey = new asn1js.OctetString({ valueHex: wrappedKey });
        };
        const SubPasswordRecipientinfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            let pbkdf2Params;
            if (!recipientInfo.keyDerivationAlgorithm)
                throw new Error("Please append encoded \"keyDerivationAlgorithm\"");
            if (!recipientInfo.keyDerivationAlgorithm.algorithmParams)
                throw new Error("Incorrectly encoded \"keyDerivationAlgorithm\"");
            try {
                pbkdf2Params = new PBKDF2Params({ schema: recipientInfo.keyDerivationAlgorithm.algorithmParams });
            }
            catch {
                throw new Error("Incorrectly encoded \"keyDerivationAlgorithm\"");
            }
            const passwordView = new Uint8Array(recipientInfo.password);
            const derivationKey = await crypto.importKey("raw", passwordView, "PBKDF2", false, ["deriveKey"]);
            const kekAlgorithm = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "kekAlgorithm");
            let hmacHashAlgorithm = "SHA-1";
            if (pbkdf2Params.prf) {
                const prfAlgorithm = crypto.getAlgorithmByOID(pbkdf2Params.prf.algorithmId, true, "prfAlgorithm");
                hmacHashAlgorithm = prfAlgorithm.hash.name;
            }
            const saltView = new Uint8Array(pbkdf2Params.salt.valueBlock.valueHex);
            const iterations = pbkdf2Params.iterationCount;
            const derivedKey = await crypto.deriveKey({
                name: "PBKDF2",
                hash: {
                    name: hmacHashAlgorithm
                },
                salt: saltView,
                iterations
            }, derivationKey, kekAlgorithm, true, ["wrapKey"]);
            const wrappedKey = await crypto.wrapKey("raw", sessionKey, derivedKey, kekAlgorithm);
            recipientInfo.encryptedKey = new asn1js.OctetString({ valueHex: wrappedKey });
        };
        const res = [];
        for (let i = 0; i < this.recipientInfos.length; i++) {
            switch (this.recipientInfos[i].variant) {
                case 1:
                    res.push(await SubKeyTransRecipientInfo(i));
                    break;
                case 2:
                    res.push(await SubKeyAgreeRecipientInfo(i));
                    break;
                case 3:
                    res.push(await SubKEKRecipientInfo(i));
                    break;
                case 4:
                    res.push(await SubPasswordRecipientinfo(i));
                    break;
                default:
                    throw new Error(`Unknown recipient type in array with index ${i}`);
            }
        }
        return res;
    }
    async decrypt(recipientIndex, parameters, crypto = getCrypto(true)) {
        const decryptionParameters = parameters || {};
        if ((recipientIndex + 1) > this.recipientInfos.length) {
            throw new Error(`Maximum value for "index" is: ${this.recipientInfos.length - 1}`);
        }
        const SubKeyAgreeRecipientInfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            let curveOID;
            let recipientCurve;
            let recipientCurveLength;
            const originator = recipientInfo.originator;
            if (decryptionParameters.recipientCertificate) {
                const curveObject = decryptionParameters.recipientCertificate.subjectPublicKeyInfo.algorithm.algorithmParams;
                if (curveObject.constructor.blockName() !== asn1js.ObjectIdentifier.blockName()) {
                    throw new Error(`Incorrect "recipientCertificate" for index ${index}`);
                }
                curveOID = curveObject.valueBlock.toString();
            }
            else if (originator.value.algorithm.algorithmParams) {
                const curveObject = originator.value.algorithm.algorithmParams;
                if (curveObject.constructor.blockName() !== asn1js.ObjectIdentifier.blockName()) {
                    throw new Error(`Incorrect originator for index ${index}`);
                }
                curveOID = curveObject.valueBlock.toString();
            }
            else {
                throw new Error("Parameter \"recipientCertificate\" is mandatory for \"KeyAgreeRecipientInfo\" if algorithm params are missing from originator");
            }
            if (!decryptionParameters.recipientPrivateKey)
                throw new Error("Parameter \"recipientPrivateKey\" is mandatory for \"KeyAgreeRecipientInfo\"");
            switch (curveOID) {
                case "1.2.840.10045.3.1.7":
                    recipientCurve = "P-256";
                    recipientCurveLength = 256;
                    break;
                case "1.3.132.0.34":
                    recipientCurve = "P-384";
                    recipientCurveLength = 384;
                    break;
                case "1.3.132.0.35":
                    recipientCurve = "P-521";
                    recipientCurveLength = 528;
                    break;
                default:
                    throw new Error(`Incorrect curve OID for index ${index}`);
            }
            let ecdhPrivateKey;
            let keyCrypto = crypto;
            if (BufferSourceConverter.isBufferSource(decryptionParameters.recipientPrivateKey)) {
                ecdhPrivateKey = await crypto.importKey("pkcs8", decryptionParameters.recipientPrivateKey, {
                    name: "ECDH",
                    namedCurve: recipientCurve
                }, true, ["deriveBits"]);
            }
            else {
                ecdhPrivateKey = decryptionParameters.recipientPrivateKey;
                if ("crypto" in decryptionParameters && decryptionParameters.crypto) {
                    keyCrypto = decryptionParameters.crypto.subtle;
                }
            }
            if (("algorithmParams" in originator.value.algorithm) === false)
                originator.value.algorithm.algorithmParams = new asn1js.ObjectIdentifier({ value: curveOID });
            const buffer = originator.value.toSchema().toBER(false);
            const ecdhPublicKey = await crypto.importKey("spki", buffer, {
                name: "ECDH",
                namedCurve: recipientCurve
            }, true, []);
            const sharedSecret = await keyCrypto.deriveBits({
                name: "ECDH",
                public: ecdhPublicKey
            }, ecdhPrivateKey, recipientCurveLength);
            async function applyKDF(includeAlgorithmParams) {
                includeAlgorithmParams = includeAlgorithmParams || false;
                const aesKWAlgorithm = new AlgorithmIdentifier({ schema: recipientInfo.keyEncryptionAlgorithm.algorithmParams });
                const kwAlgorithm = crypto.getAlgorithmByOID(aesKWAlgorithm.algorithmId, true, "kwAlgorithm");
                let kwLength = kwAlgorithm.length;
                const kwLengthBuffer = new ArrayBuffer(4);
                const kwLengthView = new Uint8Array(kwLengthBuffer);
                for (let j = 3; j >= 0; j--) {
                    kwLengthView[j] = kwLength;
                    kwLength >>= 8;
                }
                const keyInfoAlgorithm = {
                    algorithmId: aesKWAlgorithm.algorithmId
                };
                if (includeAlgorithmParams) {
                    keyInfoAlgorithm.algorithmParams = new asn1js.Null();
                }
                const eccInfo = new ECCCMSSharedInfo({
                    keyInfo: new AlgorithmIdentifier(keyInfoAlgorithm),
                    entityUInfo: recipientInfo.ukm,
                    suppPubInfo: new asn1js.OctetString({ valueHex: kwLengthBuffer })
                });
                const encodedInfo = eccInfo.toSchema().toBER(false);
                const ecdhAlgorithm = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "ecdhAlgorithm");
                if (!ecdhAlgorithm.name) {
                    throw new Error(`Incorrect OID for key encryption algorithm: ${recipientInfo.keyEncryptionAlgorithm.algorithmId}`);
                }
                return kdf(ecdhAlgorithm.kdf, sharedSecret, kwAlgorithm.length, encodedInfo, crypto);
            }
            const kdfResult = await applyKDF();
            const importAesKwKey = async (kdfResult) => {
                return crypto.importKey("raw", kdfResult, { name: "AES-KW" }, true, ["unwrapKey"]);
            };
            const aesKwKey = await importAesKwKey(kdfResult);
            const unwrapSessionKey = async (aesKwKey) => {
                const algorithmId = this.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId;
                const contentEncryptionAlgorithm = crypto.getAlgorithmByOID(algorithmId, true, "contentEncryptionAlgorithm");
                return crypto.unwrapKey("raw", recipientInfo.recipientEncryptedKeys.encryptedKeys[0].encryptedKey.valueBlock.valueHexView, aesKwKey, { name: "AES-KW" }, contentEncryptionAlgorithm, true, ["decrypt"]);
            };
            try {
                return await unwrapSessionKey(aesKwKey);
            }
            catch {
                const kdfResult = await applyKDF(true);
                const aesKwKey = await importAesKwKey(kdfResult);
                return unwrapSessionKey(aesKwKey);
            }
        };
        const SubKeyTransRecipientInfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            if (!decryptionParameters.recipientPrivateKey) {
                throw new Error("Parameter \"recipientPrivateKey\" is mandatory for \"KeyTransRecipientInfo\"");
            }
            const algorithmParameters = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "keyEncryptionAlgorithm");
            if (algorithmParameters.name === "RSA-OAEP") {
                const schema = recipientInfo.keyEncryptionAlgorithm.algorithmParams;
                const rsaOAEPParams = new RSAESOAEPParams({ schema });
                algorithmParameters.hash = crypto.getAlgorithmByOID(rsaOAEPParams.hashAlgorithm.algorithmId);
                if (("name" in algorithmParameters.hash) === false)
                    throw new Error(`Incorrect OID for hash algorithm: ${rsaOAEPParams.hashAlgorithm.algorithmId}`);
            }
            let privateKey;
            let keyCrypto = crypto;
            if (BufferSourceConverter.isBufferSource(decryptionParameters.recipientPrivateKey)) {
                privateKey = await crypto.importKey("pkcs8", decryptionParameters.recipientPrivateKey, algorithmParameters, true, ["decrypt"]);
            }
            else {
                privateKey = decryptionParameters.recipientPrivateKey;
                if ("crypto" in decryptionParameters && decryptionParameters.crypto) {
                    keyCrypto = decryptionParameters.crypto.subtle;
                }
            }
            const sessionKey = await keyCrypto.decrypt(privateKey.algorithm, privateKey, recipientInfo.encryptedKey.valueBlock.valueHexView);
            const algorithmId = this.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId;
            const contentEncryptionAlgorithm = crypto.getAlgorithmByOID(algorithmId, true, "contentEncryptionAlgorithm");
            if (("name" in contentEncryptionAlgorithm) === false)
                throw new Error(`Incorrect "contentEncryptionAlgorithm": ${algorithmId}`);
            return crypto.importKey("raw", sessionKey, contentEncryptionAlgorithm, true, ["decrypt"]);
        };
        const SubKEKRecipientInfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            if (!decryptionParameters.preDefinedData)
                throw new Error("Parameter \"preDefinedData\" is mandatory for \"KEKRecipientInfo\"");
            const kekAlgorithm = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "kekAlgorithm");
            const importedKey = await crypto.importKey("raw", decryptionParameters.preDefinedData, kekAlgorithm, true, ["unwrapKey"]);
            const algorithmId = this.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId;
            const contentEncryptionAlgorithm = crypto.getAlgorithmByOID(algorithmId, true, "contentEncryptionAlgorithm");
            if (!contentEncryptionAlgorithm.name) {
                throw new Error(`Incorrect "contentEncryptionAlgorithm": ${algorithmId}`);
            }
            return crypto.unwrapKey("raw", recipientInfo.encryptedKey.valueBlock.valueHexView, importedKey, kekAlgorithm, contentEncryptionAlgorithm, true, ["decrypt"]);
        };
        const SubPasswordRecipientinfo = async (index) => {
            const recipientInfo = this.recipientInfos[index].value;
            let pbkdf2Params;
            if (!decryptionParameters.preDefinedData) {
                throw new Error("Parameter \"preDefinedData\" is mandatory for \"KEKRecipientInfo\"");
            }
            if (!recipientInfo.keyDerivationAlgorithm) {
                throw new Error("Please append encoded \"keyDerivationAlgorithm\"");
            }
            if (!recipientInfo.keyDerivationAlgorithm.algorithmParams) {
                throw new Error("Incorrectly encoded \"keyDerivationAlgorithm\"");
            }
            try {
                pbkdf2Params = new PBKDF2Params({ schema: recipientInfo.keyDerivationAlgorithm.algorithmParams });
            }
            catch {
                throw new Error("Incorrectly encoded \"keyDerivationAlgorithm\"");
            }
            const pbkdf2Key = await crypto.importKey("raw", decryptionParameters.preDefinedData, "PBKDF2", false, ["deriveKey"]);
            const kekAlgorithm = crypto.getAlgorithmByOID(recipientInfo.keyEncryptionAlgorithm.algorithmId, true, "keyEncryptionAlgorithm");
            const hmacHashAlgorithm = pbkdf2Params.prf
                ? crypto.getAlgorithmByOID(pbkdf2Params.prf.algorithmId, true, "prfAlgorithm").hash.name
                : "SHA-1";
            const saltView = new Uint8Array(pbkdf2Params.salt.valueBlock.valueHex);
            const iterations = pbkdf2Params.iterationCount;
            const kekKey = await crypto.deriveKey({
                name: "PBKDF2",
                hash: {
                    name: hmacHashAlgorithm
                },
                salt: saltView,
                iterations
            }, pbkdf2Key, kekAlgorithm, true, ["unwrapKey"]);
            const algorithmId = this.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId;
            const contentEncryptionAlgorithm = crypto.getAlgorithmByOID(algorithmId, true, "contentEncryptionAlgorithm");
            return crypto.unwrapKey("raw", recipientInfo.encryptedKey.valueBlock.valueHexView, kekKey, kekAlgorithm, contentEncryptionAlgorithm, true, ["decrypt"]);
        };
        let unwrappedKey;
        switch (this.recipientInfos[recipientIndex].variant) {
            case 1:
                unwrappedKey = await SubKeyTransRecipientInfo(recipientIndex);
                break;
            case 2:
                unwrappedKey = await SubKeyAgreeRecipientInfo(recipientIndex);
                break;
            case 3:
                unwrappedKey = await SubKEKRecipientInfo(recipientIndex);
                break;
            case 4:
                unwrappedKey = await SubPasswordRecipientinfo(recipientIndex);
                break;
            default:
                throw new Error(`Unknown recipient type in array with index ${recipientIndex}`);
        }
        const algorithmId = this.encryptedContentInfo.contentEncryptionAlgorithm.algorithmId;
        const contentEncryptionAlgorithm = crypto.getAlgorithmByOID(algorithmId, true, "contentEncryptionAlgorithm");
        const ivBuffer = this.encryptedContentInfo.contentEncryptionAlgorithm.algorithmParams.valueBlock.valueHex;
        const ivView = new Uint8Array(ivBuffer);
        if (!this.encryptedContentInfo.encryptedContent) {
            throw new Error("Required property `encryptedContent` is empty");
        }
        const dataBuffer = this.encryptedContentInfo.getEncryptedContent();
        return crypto.decrypt({
            name: contentEncryptionAlgorithm.name,
            iv: ivView
        }, unwrappedKey, dataBuffer);
    }
}
EnvelopedData.CLASS_NAME = "EnvelopedData";

const SAFE_CONTENTS = "safeContents";
const PARSED_VALUE$1 = "parsedValue";
const CONTENT_INFOS = "contentInfos";
class AuthenticatedSafe extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.safeContents = pvutils.getParametersValue(parameters, SAFE_CONTENTS, AuthenticatedSafe.defaultValues(SAFE_CONTENTS));
        if (PARSED_VALUE$1 in parameters) {
            this.parsedValue = pvutils.getParametersValue(parameters, PARSED_VALUE$1, AuthenticatedSafe.defaultValues(PARSED_VALUE$1));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case SAFE_CONTENTS:
                return [];
            case PARSED_VALUE$1:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case SAFE_CONTENTS:
                return (memberValue.length === 0);
            case PARSED_VALUE$1:
                return ((memberValue instanceof Object) && (Object.keys(memberValue).length === 0));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Repeated({
                    name: (names.contentInfos || EMPTY_STRING),
                    value: ContentInfo.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            CONTENT_INFOS
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, AuthenticatedSafe.schema({
            names: {
                contentInfos: CONTENT_INFOS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.safeContents = Array.from(asn1.result.contentInfos, element => new ContentInfo({ schema: element }));
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: Array.from(this.safeContents, o => o.toSchema())
        }));
    }
    toJSON() {
        return {
            safeContents: Array.from(this.safeContents, o => o.toJSON())
        };
    }
    async parseInternalValues(parameters, crypto = getCrypto(true)) {
        ParameterError.assert(parameters, SAFE_CONTENTS);
        ArgumentError.assert(parameters.safeContents, SAFE_CONTENTS, "Array");
        if (parameters.safeContents.length !== this.safeContents.length) {
            throw new ArgumentError("Length of \"parameters.safeContents\" must be equal to \"this.safeContents.length\"");
        }
        this.parsedValue = {
            safeContents: [],
        };
        for (const [index, content] of this.safeContents.entries()) {
            const safeContent = parameters.safeContents[index];
            const errorTarget = `parameters.safeContents[${index}]`;
            switch (content.contentType) {
                case id_ContentType_Data:
                    {
                        ArgumentError.assert(content.content, "this.safeContents[j].content", asn1js.OctetString);
                        const authSafeContent = content.content.getValue();
                        this.parsedValue.safeContents.push({
                            privacyMode: 0,
                            value: SafeContents.fromBER(authSafeContent)
                        });
                    }
                    break;
                case id_ContentType_EnvelopedData:
                    {
                        const cmsEnveloped = new EnvelopedData({ schema: content.content });
                        ParameterError.assert(errorTarget, safeContent, "recipientCertificate", "recipientKey");
                        const envelopedData = safeContent;
                        const recipientCertificate = envelopedData.recipientCertificate;
                        const recipientKey = envelopedData.recipientKey;
                        const decrypted = await cmsEnveloped.decrypt(0, {
                            recipientCertificate,
                            recipientPrivateKey: recipientKey
                        }, crypto);
                        this.parsedValue.safeContents.push({
                            privacyMode: 2,
                            value: SafeContents.fromBER(decrypted),
                        });
                    }
                    break;
                case id_ContentType_EncryptedData:
                    {
                        const cmsEncrypted = new EncryptedData({ schema: content.content });
                        ParameterError.assert(errorTarget, safeContent, "password");
                        const password = safeContent.password;
                        const decrypted = await cmsEncrypted.decrypt({
                            password
                        }, crypto);
                        this.parsedValue.safeContents.push({
                            privacyMode: 1,
                            value: SafeContents.fromBER(decrypted),
                        });
                    }
                    break;
                default:
                    throw new Error(`Unknown "contentType" for AuthenticatedSafe: " ${content.contentType}`);
            }
        }
    }
    async makeInternalValues(parameters, crypto = getCrypto(true)) {
        if (!(this.parsedValue)) {
            throw new Error("Please run \"parseValues\" first or add \"parsedValue\" manually");
        }
        ArgumentError.assert(this.parsedValue, "this.parsedValue", "object");
        ArgumentError.assert(this.parsedValue.safeContents, "this.parsedValue.safeContents", "Array");
        ArgumentError.assert(parameters, "parameters", "object");
        ParameterError.assert(parameters, "safeContents");
        ArgumentError.assert(parameters.safeContents, "parameters.safeContents", "Array");
        if (parameters.safeContents.length !== this.parsedValue.safeContents.length) {
            throw new ArgumentError("Length of \"parameters.safeContents\" must be equal to \"this.parsedValue.safeContents\"");
        }
        this.safeContents = [];
        for (const [index, content] of this.parsedValue.safeContents.entries()) {
            ParameterError.assert("content", content, "privacyMode", "value");
            ArgumentError.assert(content.value, "content.value", SafeContents);
            switch (content.privacyMode) {
                case 0:
                    {
                        const contentBuffer = content.value.toSchema().toBER(false);
                        this.safeContents.push(new ContentInfo({
                            contentType: "1.2.840.113549.1.7.1",
                            content: new asn1js.OctetString({ valueHex: contentBuffer })
                        }));
                    }
                    break;
                case 1:
                    {
                        const cmsEncrypted = new EncryptedData();
                        const currentParameters = parameters.safeContents[index];
                        currentParameters.contentToEncrypt = content.value.toSchema().toBER(false);
                        await cmsEncrypted.encrypt(currentParameters, crypto);
                        this.safeContents.push(new ContentInfo({
                            contentType: "1.2.840.113549.1.7.6",
                            content: cmsEncrypted.toSchema()
                        }));
                    }
                    break;
                case 2:
                    {
                        const cmsEnveloped = new EnvelopedData();
                        const contentToEncrypt = content.value.toSchema().toBER(false);
                        const safeContent = parameters.safeContents[index];
                        ParameterError.assert(`parameters.safeContents[${index}]`, safeContent, "encryptingCertificate", "encryptionAlgorithm");
                        switch (true) {
                            case (safeContent.encryptionAlgorithm.name.toLowerCase() === "aes-cbc"):
                            case (safeContent.encryptionAlgorithm.name.toLowerCase() === "aes-gcm"):
                                break;
                            default:
                                throw new Error(`Incorrect parameter "encryptionAlgorithm" in "parameters.safeContents[i]": ${safeContent.encryptionAlgorithm}`);
                        }
                        switch (true) {
                            case (safeContent.encryptionAlgorithm.length === 128):
                            case (safeContent.encryptionAlgorithm.length === 192):
                            case (safeContent.encryptionAlgorithm.length === 256):
                                break;
                            default:
                                throw new Error(`Incorrect parameter "encryptionAlgorithm.length" in "parameters.safeContents[i]": ${safeContent.encryptionAlgorithm.length}`);
                        }
                        const encryptionAlgorithm = safeContent.encryptionAlgorithm;
                        cmsEnveloped.addRecipientByCertificate(safeContent.encryptingCertificate, {}, undefined, crypto);
                        await cmsEnveloped.encrypt(encryptionAlgorithm, contentToEncrypt, crypto);
                        this.safeContents.push(new ContentInfo({
                            contentType: "1.2.840.113549.1.7.3",
                            content: cmsEnveloped.toSchema()
                        }));
                    }
                    break;
                default:
                    throw new Error(`Incorrect value for "content.privacyMode": ${content.privacyMode}`);
            }
        }
        return this;
    }
}
AuthenticatedSafe.CLASS_NAME = "AuthenticatedSafe";

const HASH_ALGORITHM$1 = "hashAlgorithm";
const ISSUER_NAME_HASH = "issuerNameHash";
const ISSUER_KEY_HASH = "issuerKeyHash";
const SERIAL_NUMBER$1 = "serialNumber";
const CLEAR_PROPS$j = [
    HASH_ALGORITHM$1,
    ISSUER_NAME_HASH,
    ISSUER_KEY_HASH,
    SERIAL_NUMBER$1,
];
class CertID extends PkiObject {
    static async create(certificate, parameters, crypto = getCrypto(true)) {
        const certID = new CertID();
        await certID.createForCertificate(certificate, parameters, crypto);
        return certID;
    }
    constructor(parameters = {}) {
        super();
        this.hashAlgorithm = pvutils.getParametersValue(parameters, HASH_ALGORITHM$1, CertID.defaultValues(HASH_ALGORITHM$1));
        this.issuerNameHash = pvutils.getParametersValue(parameters, ISSUER_NAME_HASH, CertID.defaultValues(ISSUER_NAME_HASH));
        this.issuerKeyHash = pvutils.getParametersValue(parameters, ISSUER_KEY_HASH, CertID.defaultValues(ISSUER_KEY_HASH));
        this.serialNumber = pvutils.getParametersValue(parameters, SERIAL_NUMBER$1, CertID.defaultValues(SERIAL_NUMBER$1));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case HASH_ALGORITHM$1:
                return new AlgorithmIdentifier();
            case ISSUER_NAME_HASH:
            case ISSUER_KEY_HASH:
                return new asn1js.OctetString();
            case SERIAL_NUMBER$1:
                return new asn1js.Integer();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case HASH_ALGORITHM$1:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case ISSUER_NAME_HASH:
            case ISSUER_KEY_HASH:
            case SERIAL_NUMBER$1:
                return (memberValue.isEqual(CertID.defaultValues(SERIAL_NUMBER$1)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.hashAlgorithmObject || {
                    names: {
                        blockName: (names.hashAlgorithm || EMPTY_STRING)
                    }
                }),
                new asn1js.OctetString({ name: (names.issuerNameHash || EMPTY_STRING) }),
                new asn1js.OctetString({ name: (names.issuerKeyHash || EMPTY_STRING) }),
                new asn1js.Integer({ name: (names.serialNumber || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$j);
        const asn1 = asn1js.compareSchema(schema, schema, CertID.schema({
            names: {
                hashAlgorithm: HASH_ALGORITHM$1,
                issuerNameHash: ISSUER_NAME_HASH,
                issuerKeyHash: ISSUER_KEY_HASH,
                serialNumber: SERIAL_NUMBER$1
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.hashAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.hashAlgorithm });
        this.issuerNameHash = asn1.result.issuerNameHash;
        this.issuerKeyHash = asn1.result.issuerKeyHash;
        this.serialNumber = asn1.result.serialNumber;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.hashAlgorithm.toSchema(),
                this.issuerNameHash,
                this.issuerKeyHash,
                this.serialNumber
            ]
        }));
    }
    toJSON() {
        return {
            hashAlgorithm: this.hashAlgorithm.toJSON(),
            issuerNameHash: this.issuerNameHash.toJSON(),
            issuerKeyHash: this.issuerKeyHash.toJSON(),
            serialNumber: this.serialNumber.toJSON(),
        };
    }
    isEqual(certificateID) {
        if (this.hashAlgorithm.algorithmId !== certificateID.hashAlgorithm.algorithmId) {
            return false;
        }
        if (!pvtsutils.BufferSourceConverter.isEqual(this.issuerNameHash.valueBlock.valueHexView, certificateID.issuerNameHash.valueBlock.valueHexView)) {
            return false;
        }
        if (!pvtsutils.BufferSourceConverter.isEqual(this.issuerKeyHash.valueBlock.valueHexView, certificateID.issuerKeyHash.valueBlock.valueHexView)) {
            return false;
        }
        if (!this.serialNumber.isEqual(certificateID.serialNumber)) {
            return false;
        }
        return true;
    }
    async createForCertificate(certificate, parameters, crypto = getCrypto(true)) {
        ParameterError.assert(parameters, HASH_ALGORITHM$1, "issuerCertificate");
        const hashOID = crypto.getOIDByAlgorithm({ name: parameters.hashAlgorithm }, true, "hashAlgorithm");
        this.hashAlgorithm = new AlgorithmIdentifier({
            algorithmId: hashOID,
            algorithmParams: new asn1js.Null()
        });
        const issuerCertificate = parameters.issuerCertificate;
        this.serialNumber = certificate.serialNumber;
        const hashIssuerName = await crypto.digest({ name: parameters.hashAlgorithm }, issuerCertificate.subject.toSchema().toBER(false));
        this.issuerNameHash = new asn1js.OctetString({ valueHex: hashIssuerName });
        const issuerKeyBuffer = issuerCertificate.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView;
        const hashIssuerKey = await crypto.digest({ name: parameters.hashAlgorithm }, issuerKeyBuffer);
        this.issuerKeyHash = new asn1js.OctetString({ valueHex: hashIssuerKey });
    }
}
CertID.CLASS_NAME = "CertID";

const CERT_ID = "certID";
const CERT_STATUS = "certStatus";
const THIS_UPDATE = "thisUpdate";
const NEXT_UPDATE = "nextUpdate";
const SINGLE_EXTENSIONS = "singleExtensions";
const CLEAR_PROPS$i = [
    CERT_ID,
    CERT_STATUS,
    THIS_UPDATE,
    NEXT_UPDATE,
    SINGLE_EXTENSIONS,
];
class SingleResponse extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.certID = pvutils.getParametersValue(parameters, CERT_ID, SingleResponse.defaultValues(CERT_ID));
        this.certStatus = pvutils.getParametersValue(parameters, CERT_STATUS, SingleResponse.defaultValues(CERT_STATUS));
        this.thisUpdate = pvutils.getParametersValue(parameters, THIS_UPDATE, SingleResponse.defaultValues(THIS_UPDATE));
        if (NEXT_UPDATE in parameters) {
            this.nextUpdate = pvutils.getParametersValue(parameters, NEXT_UPDATE, SingleResponse.defaultValues(NEXT_UPDATE));
        }
        if (SINGLE_EXTENSIONS in parameters) {
            this.singleExtensions = pvutils.getParametersValue(parameters, SINGLE_EXTENSIONS, SingleResponse.defaultValues(SINGLE_EXTENSIONS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case CERT_ID:
                return new CertID();
            case CERT_STATUS:
                return {};
            case THIS_UPDATE:
            case NEXT_UPDATE:
                return new Date(0, 0, 0);
            case SINGLE_EXTENSIONS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case CERT_ID:
                return ((CertID.compareWithDefault("hashAlgorithm", memberValue.hashAlgorithm)) &&
                    (CertID.compareWithDefault("issuerNameHash", memberValue.issuerNameHash)) &&
                    (CertID.compareWithDefault("issuerKeyHash", memberValue.issuerKeyHash)) &&
                    (CertID.compareWithDefault("serialNumber", memberValue.serialNumber)));
            case CERT_STATUS:
                return (Object.keys(memberValue).length === 0);
            case THIS_UPDATE:
            case NEXT_UPDATE:
                return (memberValue === SingleResponse.defaultValues(memberName));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                CertID.schema(names.certID || {}),
                new asn1js.Choice({
                    value: [
                        new asn1js.Primitive({
                            name: (names.certStatus || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 0
                            },
                        }),
                        new asn1js.Constructed({
                            name: (names.certStatus || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 1
                            },
                            value: [
                                new asn1js.GeneralizedTime(),
                                new asn1js.Constructed({
                                    optional: true,
                                    idBlock: {
                                        tagClass: 3,
                                        tagNumber: 0
                                    },
                                    value: [new asn1js.Enumerated()]
                                })
                            ]
                        }),
                        new asn1js.Primitive({
                            name: (names.certStatus || EMPTY_STRING),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 2
                            },
                            lenBlock: { length: 1 }
                        })
                    ]
                }),
                new asn1js.GeneralizedTime({ name: (names.thisUpdate || EMPTY_STRING) }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.GeneralizedTime({ name: (names.nextUpdate || EMPTY_STRING) })]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [Extensions.schema(names.singleExtensions || {})]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$i);
        const asn1 = asn1js.compareSchema(schema, schema, SingleResponse.schema({
            names: {
                certID: {
                    names: {
                        blockName: CERT_ID
                    }
                },
                certStatus: CERT_STATUS,
                thisUpdate: THIS_UPDATE,
                nextUpdate: NEXT_UPDATE,
                singleExtensions: {
                    names: {
                        blockName: SINGLE_EXTENSIONS
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.certID = new CertID({ schema: asn1.result.certID });
        this.certStatus = asn1.result.certStatus;
        this.thisUpdate = asn1.result.thisUpdate.toDate();
        if (NEXT_UPDATE in asn1.result)
            this.nextUpdate = asn1.result.nextUpdate.toDate();
        if (SINGLE_EXTENSIONS in asn1.result)
            this.singleExtensions = Array.from(asn1.result.singleExtensions.valueBlock.value, element => new Extension({ schema: element }));
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.certID.toSchema());
        outputArray.push(this.certStatus);
        outputArray.push(new asn1js.GeneralizedTime({ valueDate: this.thisUpdate }));
        if (this.nextUpdate) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [new asn1js.GeneralizedTime({ valueDate: this.nextUpdate })]
            }));
        }
        if (this.singleExtensions) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: [new asn1js.Sequence({ value: Array.from(this.singleExtensions, o => o.toSchema()) })]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            certID: this.certID.toJSON(),
            certStatus: this.certStatus.toJSON(),
            thisUpdate: this.thisUpdate
        };
        if (this.nextUpdate) {
            res.nextUpdate = this.nextUpdate;
        }
        if (this.singleExtensions) {
            res.singleExtensions = Array.from(this.singleExtensions, o => o.toJSON());
        }
        return res;
    }
}
SingleResponse.CLASS_NAME = "SingleResponse";

const TBS$2 = "tbs";
const VERSION$7 = "version";
const RESPONDER_ID = "responderID";
const PRODUCED_AT = "producedAt";
const RESPONSES = "responses";
const RESPONSE_EXTENSIONS = "responseExtensions";
const RESPONSE_DATA = "ResponseData";
const RESPONSE_DATA_VERSION = `${RESPONSE_DATA}.${VERSION$7}`;
const RESPONSE_DATA_RESPONDER_ID = `${RESPONSE_DATA}.${RESPONDER_ID}`;
const RESPONSE_DATA_PRODUCED_AT = `${RESPONSE_DATA}.${PRODUCED_AT}`;
const RESPONSE_DATA_RESPONSES = `${RESPONSE_DATA}.${RESPONSES}`;
const RESPONSE_DATA_RESPONSE_EXTENSIONS = `${RESPONSE_DATA}.${RESPONSE_EXTENSIONS}`;
const CLEAR_PROPS$h = [
    RESPONSE_DATA,
    RESPONSE_DATA_VERSION,
    RESPONSE_DATA_RESPONDER_ID,
    RESPONSE_DATA_PRODUCED_AT,
    RESPONSE_DATA_RESPONSES,
    RESPONSE_DATA_RESPONSE_EXTENSIONS
];
class ResponseData extends PkiObject {
    get tbs() {
        return pvtsutils.BufferSourceConverter.toArrayBuffer(this.tbsView);
    }
    set tbs(value) {
        this.tbsView = new Uint8Array(value);
    }
    constructor(parameters = {}) {
        super();
        this.tbsView = new Uint8Array(pvutils.getParametersValue(parameters, TBS$2, ResponseData.defaultValues(TBS$2)));
        if (VERSION$7 in parameters) {
            this.version = pvutils.getParametersValue(parameters, VERSION$7, ResponseData.defaultValues(VERSION$7));
        }
        this.responderID = pvutils.getParametersValue(parameters, RESPONDER_ID, ResponseData.defaultValues(RESPONDER_ID));
        this.producedAt = pvutils.getParametersValue(parameters, PRODUCED_AT, ResponseData.defaultValues(PRODUCED_AT));
        this.responses = pvutils.getParametersValue(parameters, RESPONSES, ResponseData.defaultValues(RESPONSES));
        if (RESPONSE_EXTENSIONS in parameters) {
            this.responseExtensions = pvutils.getParametersValue(parameters, RESPONSE_EXTENSIONS, ResponseData.defaultValues(RESPONSE_EXTENSIONS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$7:
                return 0;
            case TBS$2:
                return EMPTY_BUFFER;
            case RESPONDER_ID:
                return {};
            case PRODUCED_AT:
                return new Date(0, 0, 0);
            case RESPONSES:
            case RESPONSE_EXTENSIONS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TBS$2:
                return (memberValue.byteLength === 0);
            case RESPONDER_ID:
                return (Object.keys(memberValue).length === 0);
            case PRODUCED_AT:
                return (memberValue === ResponseData.defaultValues(memberName));
            case RESPONSES:
            case RESPONSE_EXTENSIONS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || RESPONSE_DATA),
            value: [
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Integer({ name: (names.version || RESPONSE_DATA_VERSION) })]
                }),
                new asn1js.Choice({
                    value: [
                        new asn1js.Constructed({
                            name: (names.responderID || RESPONSE_DATA_RESPONDER_ID),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 1
                            },
                            value: [RelativeDistinguishedNames.schema(names.ResponseDataByName || {
                                    names: {
                                        blockName: "ResponseData.byName"
                                    }
                                })]
                        }),
                        new asn1js.Constructed({
                            name: (names.responderID || RESPONSE_DATA_RESPONDER_ID),
                            idBlock: {
                                tagClass: 3,
                                tagNumber: 2
                            },
                            value: [new asn1js.OctetString({ name: (names.ResponseDataByKey || "ResponseData.byKey") })]
                        })
                    ]
                }),
                new asn1js.GeneralizedTime({ name: (names.producedAt || RESPONSE_DATA_PRODUCED_AT) }),
                new asn1js.Sequence({
                    value: [
                        new asn1js.Repeated({
                            name: RESPONSE_DATA_RESPONSES,
                            value: SingleResponse.schema(names.response || {})
                        })
                    ]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [Extensions.schema(names.extensions || {
                            names: {
                                blockName: RESPONSE_DATA_RESPONSE_EXTENSIONS
                            }
                        })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$h);
        const asn1 = asn1js.compareSchema(schema, schema, ResponseData.schema());
        AsnError.assertSchema(asn1, this.className);
        this.tbsView = asn1.result.ResponseData.valueBeforeDecodeView;
        if (RESPONSE_DATA_VERSION in asn1.result)
            this.version = asn1.result[RESPONSE_DATA_VERSION].valueBlock.valueDec;
        if (asn1.result[RESPONSE_DATA_RESPONDER_ID].idBlock.tagNumber === 1)
            this.responderID = new RelativeDistinguishedNames({ schema: asn1.result[RESPONSE_DATA_RESPONDER_ID].valueBlock.value[0] });
        else
            this.responderID = asn1.result[RESPONSE_DATA_RESPONDER_ID].valueBlock.value[0];
        this.producedAt = asn1.result[RESPONSE_DATA_PRODUCED_AT].toDate();
        this.responses = Array.from(asn1.result[RESPONSE_DATA_RESPONSES], element => new SingleResponse({ schema: element }));
        if (RESPONSE_DATA_RESPONSE_EXTENSIONS in asn1.result)
            this.responseExtensions = Array.from(asn1.result[RESPONSE_DATA_RESPONSE_EXTENSIONS].valueBlock.value, element => new Extension({ schema: element }));
    }
    toSchema(encodeFlag = false) {
        let tbsSchema;
        if (encodeFlag === false) {
            if (!this.tbsView.byteLength) {
                return ResponseData.schema();
            }
            const asn1 = asn1js.fromBER(this.tbsView);
            AsnError.assert(asn1, "TBS Response Data");
            tbsSchema = asn1.result;
        }
        else {
            const outputArray = [];
            if (VERSION$7 in this) {
                outputArray.push(new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Integer({ value: this.version })]
                }));
            }
            if (this.responderID instanceof RelativeDistinguishedNames) {
                outputArray.push(new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [this.responderID.toSchema()]
                }));
            }
            else {
                outputArray.push(new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    value: [this.responderID]
                }));
            }
            outputArray.push(new asn1js.GeneralizedTime({ valueDate: this.producedAt }));
            outputArray.push(new asn1js.Sequence({
                value: Array.from(this.responses, o => o.toSchema())
            }));
            if (this.responseExtensions) {
                outputArray.push(new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [new asn1js.Sequence({
                            value: Array.from(this.responseExtensions, o => o.toSchema())
                        })]
                }));
            }
            tbsSchema = new asn1js.Sequence({
                value: outputArray
            });
        }
        return tbsSchema;
    }
    toJSON() {
        const res = {};
        if (VERSION$7 in this) {
            res.version = this.version;
        }
        if (this.responderID) {
            res.responderID = this.responderID;
        }
        if (this.producedAt) {
            res.producedAt = this.producedAt;
        }
        if (this.responses) {
            res.responses = Array.from(this.responses, o => o.toJSON());
        }
        if (this.responseExtensions) {
            res.responseExtensions = Array.from(this.responseExtensions, o => o.toJSON());
        }
        return res;
    }
}
ResponseData.CLASS_NAME = "ResponseData";

const TRUSTED_CERTS = "trustedCerts";
const CERTS$2 = "certs";
const CRLS$1 = "crls";
const OCSPS$1 = "ocsps";
const CHECK_DATE = "checkDate";
const FIND_ORIGIN = "findOrigin";
const FIND_ISSUER = "findIssuer";
var ChainValidationCode;
(function (ChainValidationCode) {
    ChainValidationCode[ChainValidationCode["unknown"] = -1] = "unknown";
    ChainValidationCode[ChainValidationCode["success"] = 0] = "success";
    ChainValidationCode[ChainValidationCode["noRevocation"] = 11] = "noRevocation";
    ChainValidationCode[ChainValidationCode["noPath"] = 60] = "noPath";
    ChainValidationCode[ChainValidationCode["noValidPath"] = 97] = "noValidPath";
})(ChainValidationCode || (ChainValidationCode = {}));
class ChainValidationError extends Error {
    constructor(code, message) {
        super(message);
        this.name = ChainValidationError.NAME;
        this.code = code;
        this.message = message;
    }
}
ChainValidationError.NAME = "ChainValidationError";
function isTrusted(cert, trustedList) {
    for (let i = 0; i < trustedList.length; i++) {
        if (pvtsutils.BufferSourceConverter.isEqual(cert.tbsView, trustedList[i].tbsView)) {
            return true;
        }
    }
    return false;
}
class CertificateChainValidationEngine {
    constructor(parameters = {}) {
        this.trustedCerts = pvutils.getParametersValue(parameters, TRUSTED_CERTS, this.defaultValues(TRUSTED_CERTS));
        this.certs = pvutils.getParametersValue(parameters, CERTS$2, this.defaultValues(CERTS$2));
        this.crls = pvutils.getParametersValue(parameters, CRLS$1, this.defaultValues(CRLS$1));
        this.ocsps = pvutils.getParametersValue(parameters, OCSPS$1, this.defaultValues(OCSPS$1));
        this.checkDate = pvutils.getParametersValue(parameters, CHECK_DATE, this.defaultValues(CHECK_DATE));
        this.findOrigin = pvutils.getParametersValue(parameters, FIND_ORIGIN, this.defaultValues(FIND_ORIGIN));
        this.findIssuer = pvutils.getParametersValue(parameters, FIND_ISSUER, this.defaultValues(FIND_ISSUER));
    }
    static defaultFindOrigin(certificate, validationEngine) {
        if (certificate.tbsView.byteLength === 0) {
            certificate.tbsView = new Uint8Array(certificate.encodeTBS().toBER());
        }
        for (const localCert of validationEngine.certs) {
            if (localCert.tbsView.byteLength === 0) {
                localCert.tbsView = new Uint8Array(localCert.encodeTBS().toBER());
            }
            if (pvtsutils.BufferSourceConverter.isEqual(certificate.tbsView, localCert.tbsView))
                return "Intermediate Certificates";
        }
        for (const trustedCert of validationEngine.trustedCerts) {
            if (trustedCert.tbsView.byteLength === 0)
                trustedCert.tbsView = new Uint8Array(trustedCert.encodeTBS().toBER());
            if (pvtsutils.BufferSourceConverter.isEqual(certificate.tbsView, trustedCert.tbsView))
                return "Trusted Certificates";
        }
        return "Unknown";
    }
    async defaultFindIssuer(certificate, validationEngine, crypto = getCrypto(true)) {
        const result = [];
        let keyIdentifier = null;
        let authorityCertIssuer = null;
        let authorityCertSerialNumber = null;
        if (certificate.subject.isEqual(certificate.issuer)) {
            try {
                const verificationResult = await certificate.verify(undefined, crypto);
                if (verificationResult) {
                    return [certificate];
                }
            }
            catch {
            }
        }
        if (certificate.extensions) {
            for (const extension of certificate.extensions) {
                if (extension.extnID === id_AuthorityKeyIdentifier && extension.parsedValue instanceof AuthorityKeyIdentifier) {
                    if (extension.parsedValue.keyIdentifier) {
                        keyIdentifier = extension.parsedValue.keyIdentifier;
                    }
                    else {
                        if (extension.parsedValue.authorityCertIssuer) {
                            authorityCertIssuer = extension.parsedValue.authorityCertIssuer;
                        }
                        if (extension.parsedValue.authorityCertSerialNumber) {
                            authorityCertSerialNumber = extension.parsedValue.authorityCertSerialNumber;
                        }
                    }
                    break;
                }
            }
        }
        function checkCertificate(possibleIssuer) {
            if (keyIdentifier !== null) {
                if (possibleIssuer.extensions) {
                    let extensionFound = false;
                    for (const extension of possibleIssuer.extensions) {
                        if (extension.extnID === id_SubjectKeyIdentifier && extension.parsedValue) {
                            extensionFound = true;
                            if (pvtsutils.BufferSourceConverter.isEqual(extension.parsedValue.valueBlock.valueHex, keyIdentifier.valueBlock.valueHexView)) {
                                result.push(possibleIssuer);
                            }
                            break;
                        }
                    }
                    if (extensionFound) {
                        return;
                    }
                }
            }
            let authorityCertSerialNumberEqual = false;
            if (authorityCertSerialNumber !== null)
                authorityCertSerialNumberEqual = possibleIssuer.serialNumber.isEqual(authorityCertSerialNumber);
            if (authorityCertIssuer !== null) {
                if (possibleIssuer.subject.isEqual(authorityCertIssuer)) {
                    if (authorityCertSerialNumberEqual)
                        result.push(possibleIssuer);
                }
            }
            else {
                if (certificate.issuer.isEqual(possibleIssuer.subject))
                    result.push(possibleIssuer);
            }
        }
        for (const trustedCert of validationEngine.trustedCerts) {
            checkCertificate(trustedCert);
        }
        for (const intermediateCert of validationEngine.certs) {
            checkCertificate(intermediateCert);
        }
        for (let i = result.length - 1; i >= 0; i--) {
            try {
                const verificationResult = await certificate.verify(result[i], crypto);
                if (verificationResult === false)
                    result.splice(i, 1);
            }
            catch {
                result.splice(i, 1);
            }
        }
        return result;
    }
    defaultValues(memberName) {
        switch (memberName) {
            case TRUSTED_CERTS:
                return [];
            case CERTS$2:
                return [];
            case CRLS$1:
                return [];
            case OCSPS$1:
                return [];
            case CHECK_DATE:
                return new Date();
            case FIND_ORIGIN:
                return CertificateChainValidationEngine.defaultFindOrigin;
            case FIND_ISSUER:
                return this.defaultFindIssuer;
            default:
                throw new Error(`Invalid member name for CertificateChainValidationEngine class: ${memberName}`);
        }
    }
    async sort(passedWhenNotRevValues = false, crypto = getCrypto(true)) {
        const localCerts = [];
        const buildPath = async (certificate, crypto) => {
            const result = [];
            function checkUnique(array) {
                let unique = true;
                for (let i = 0; i < array.length; i++) {
                    for (let j = 0; j < array.length; j++) {
                        if (j === i)
                            continue;
                        if (array[i] === array[j]) {
                            unique = false;
                            break;
                        }
                    }
                    if (!unique)
                        break;
                }
                return unique;
            }
            if (isTrusted(certificate, this.trustedCerts)) {
                return [[certificate]];
            }
            const findIssuerResult = await this.findIssuer(certificate, this, crypto);
            if (findIssuerResult.length === 0) {
                throw new Error("No valid certificate paths found");
            }
            for (let i = 0; i < findIssuerResult.length; i++) {
                if (pvtsutils.BufferSourceConverter.isEqual(findIssuerResult[i].tbsView, certificate.tbsView)) {
                    result.push([findIssuerResult[i]]);
                    continue;
                }
                const buildPathResult = await buildPath(findIssuerResult[i], crypto);
                for (let j = 0; j < buildPathResult.length; j++) {
                    const copy = buildPathResult[j].slice();
                    copy.splice(0, 0, findIssuerResult[i]);
                    if (checkUnique(copy))
                        result.push(copy);
                    else
                        result.push(buildPathResult[j]);
                }
            }
            return result;
        };
        const findCRL = async (certificate) => {
            const issuerCertificates = [];
            const crls = [];
            const crlsAndCertificates = [];
            issuerCertificates.push(...localCerts.filter(element => certificate.issuer.isEqual(element.subject)));
            if (issuerCertificates.length === 0) {
                return {
                    status: 1,
                    statusMessage: "No certificate's issuers"
                };
            }
            crls.push(...this.crls.filter(o => o.issuer.isEqual(certificate.issuer)));
            if (crls.length === 0) {
                return {
                    status: 2,
                    statusMessage: "No CRLs for specific certificate issuer"
                };
            }
            for (let i = 0; i < crls.length; i++) {
                const crl = crls[i];
                if (crl.nextUpdate && crl.nextUpdate.value < this.checkDate) {
                    continue;
                }
                for (let j = 0; j < issuerCertificates.length; j++) {
                    try {
                        const result = await crls[i].verify({ issuerCertificate: issuerCertificates[j] }, crypto);
                        if (result) {
                            crlsAndCertificates.push({
                                crl: crls[i],
                                certificate: issuerCertificates[j]
                            });
                            break;
                        }
                    }
                    catch {
                    }
                }
            }
            if (crlsAndCertificates.length) {
                return {
                    status: 0,
                    statusMessage: EMPTY_STRING,
                    result: crlsAndCertificates
                };
            }
            return {
                status: 3,
                statusMessage: "No valid CRLs found"
            };
        };
        const findOCSP = async (certificate, issuerCertificate) => {
            const hashAlgorithm = crypto.getAlgorithmByOID(certificate.signatureAlgorithm.algorithmId);
            if (!hashAlgorithm.name) {
                return 1;
            }
            if (!hashAlgorithm.hash) {
                return 1;
            }
            for (let i = 0; i < this.ocsps.length; i++) {
                const ocsp = this.ocsps[i];
                const result = await ocsp.getCertificateStatus(certificate, issuerCertificate, crypto);
                if (result.isForCertificate) {
                    if (result.status === 0)
                        return 0;
                    return 1;
                }
            }
            return 2;
        };
        async function checkForCA(certificate, needToCheckCRL = false) {
            let isCA = false;
            let mustBeCA = false;
            let keyUsagePresent = false;
            let cRLSign = false;
            if (certificate.extensions) {
                for (let j = 0; j < certificate.extensions.length; j++) {
                    const extension = certificate.extensions[j];
                    if (extension.critical && !extension.parsedValue) {
                        return {
                            result: false,
                            resultCode: 6,
                            resultMessage: `Unable to parse critical certificate extension: ${extension.extnID}`
                        };
                    }
                    if (extension.extnID === id_KeyUsage) {
                        keyUsagePresent = true;
                        const view = new Uint8Array(extension.parsedValue.valueBlock.valueHex);
                        if ((view[0] & 0x04) === 0x04)
                            mustBeCA = true;
                        if ((view[0] & 0x02) === 0x02)
                            cRLSign = true;
                    }
                    if (extension.extnID === id_BasicConstraints) {
                        if ("cA" in extension.parsedValue) {
                            if (extension.parsedValue.cA === true)
                                isCA = true;
                        }
                    }
                }
                if ((mustBeCA === true) && (isCA === false)) {
                    return {
                        result: false,
                        resultCode: 3,
                        resultMessage: "Unable to build certificate chain - using \"keyCertSign\" flag set without BasicConstraints"
                    };
                }
                if ((keyUsagePresent === true) && (isCA === true) && (mustBeCA === false)) {
                    return {
                        result: false,
                        resultCode: 4,
                        resultMessage: "Unable to build certificate chain - \"keyCertSign\" flag was not set"
                    };
                }
                if ((isCA === true) && (keyUsagePresent === true) && ((needToCheckCRL) && (cRLSign === false))) {
                    return {
                        result: false,
                        resultCode: 5,
                        resultMessage: "Unable to build certificate chain - intermediate certificate must have \"cRLSign\" key usage flag"
                    };
                }
            }
            if (isCA === false) {
                return {
                    result: false,
                    resultCode: 7,
                    resultMessage: "Unable to build certificate chain - more than one possible end-user certificate"
                };
            }
            return {
                result: true,
                resultCode: 0,
                resultMessage: EMPTY_STRING
            };
        }
        const basicCheck = async (path, checkDate) => {
            for (let i = 0; i < path.length; i++) {
                if ((path[i].notBefore.value > checkDate) ||
                    (path[i].notAfter.value < checkDate)) {
                    return {
                        result: false,
                        resultCode: 8,
                        resultMessage: "The certificate is either not yet valid or expired"
                    };
                }
            }
            if (path.length < 2) {
                return {
                    result: false,
                    resultCode: 9,
                    resultMessage: "Too short certificate path"
                };
            }
            for (let i = (path.length - 2); i >= 0; i--) {
                if (path[i].issuer.isEqual(path[i].subject) === false) {
                    if (path[i].issuer.isEqual(path[i + 1].subject) === false) {
                        return {
                            result: false,
                            resultCode: 10,
                            resultMessage: "Incorrect name chaining"
                        };
                    }
                }
            }
            if ((this.crls.length !== 0) || (this.ocsps.length !== 0)) {
                for (let i = 0; i < (path.length - 1); i++) {
                    let ocspResult = 2;
                    let crlResult = {
                        status: 0,
                        statusMessage: EMPTY_STRING
                    };
                    if (this.ocsps.length !== 0) {
                        ocspResult = await findOCSP(path[i], path[i + 1]);
                        switch (ocspResult) {
                            case 0:
                                continue;
                            case 1:
                                return {
                                    result: false,
                                    resultCode: 12,
                                    resultMessage: "One of certificates was revoked via OCSP response"
                                };
                        }
                    }
                    if (this.crls.length !== 0) {
                        crlResult = await findCRL(path[i]);
                        if (crlResult.status === 0 && crlResult.result) {
                            for (let j = 0; j < crlResult.result.length; j++) {
                                const isCertificateRevoked = crlResult.result[j].crl.isCertificateRevoked(path[i]);
                                if (isCertificateRevoked) {
                                    return {
                                        result: false,
                                        resultCode: 12,
                                        resultMessage: "One of certificates had been revoked"
                                    };
                                }
                                const isCertificateCA = await checkForCA(crlResult.result[j].certificate, true);
                                if (isCertificateCA.result === false) {
                                    return {
                                        result: false,
                                        resultCode: 13,
                                        resultMessage: "CRL issuer certificate is not a CA certificate or does not have crlSign flag"
                                    };
                                }
                            }
                        }
                        else {
                            if (passedWhenNotRevValues === false) {
                                throw new ChainValidationError(ChainValidationCode.noRevocation, `No revocation values found for one of certificates: ${crlResult.statusMessage}`);
                            }
                        }
                    }
                    else {
                        if (ocspResult === 2) {
                            return {
                                result: false,
                                resultCode: 11,
                                resultMessage: "No revocation values found for one of certificates"
                            };
                        }
                    }
                    if ((ocspResult === 2) && (crlResult.status === 2) && passedWhenNotRevValues) {
                        const issuerCertificate = path[i + 1];
                        let extensionFound = false;
                        if (issuerCertificate.extensions) {
                            for (const extension of issuerCertificate.extensions) {
                                switch (extension.extnID) {
                                    case id_CRLDistributionPoints:
                                    case id_FreshestCRL:
                                    case id_AuthorityInfoAccess:
                                        extensionFound = true;
                                        break;
                                }
                            }
                        }
                        if (extensionFound) {
                            throw new ChainValidationError(ChainValidationCode.noRevocation, `No revocation values found for one of certificates: ${crlResult.statusMessage}`);
                        }
                    }
                }
            }
            for (const [i, cert] of path.entries()) {
                if (!i) {
                    continue;
                }
                const result = await checkForCA(cert);
                if (!result.result) {
                    return {
                        result: false,
                        resultCode: 14,
                        resultMessage: "One of intermediate certificates is not a CA certificate"
                    };
                }
            }
            return {
                result: true
            };
        };
        localCerts.push(...this.trustedCerts);
        localCerts.push(...this.certs);
        for (let i = 0; i < localCerts.length; i++) {
            for (let j = 0; j < localCerts.length; j++) {
                if (i === j)
                    continue;
                if (pvtsutils.BufferSourceConverter.isEqual(localCerts[i].tbsView, localCerts[j].tbsView)) {
                    localCerts.splice(j, 1);
                    i = 0;
                    break;
                }
            }
        }
        const leafCert = localCerts[localCerts.length - 1];
        let result;
        const certificatePath = [leafCert];
        result = await buildPath(leafCert, crypto);
        if (result.length === 0) {
            throw new ChainValidationError(ChainValidationCode.noPath, "Unable to find certificate path");
        }
        for (let i = result.length - 1; i >= 0; i--) {
            let found = false;
            for (let j = 0; j < (result[i]).length; j++) {
                const certificate = (result[i])[j];
                for (let k = 0; k < this.trustedCerts.length; k++) {
                    if (pvtsutils.BufferSourceConverter.isEqual(certificate.tbsView, this.trustedCerts[k].tbsView)) {
                        found = true;
                        break;
                    }
                }
                if (found)
                    break;
            }
            if (!found) {
                result.splice(i, 1);
            }
        }
        if (result.length === 0) {
            throw new ChainValidationError(ChainValidationCode.noValidPath, "No valid certificate paths found");
        }
        let shortestLength = result[0].length;
        let shortestIndex = 0;
        for (let i = 0; i < result.length; i++) {
            if (result[i].length < shortestLength) {
                shortestLength = result[i].length;
                shortestIndex = i;
            }
        }
        for (let i = 0; i < result[shortestIndex].length; i++)
            certificatePath.push((result[shortestIndex])[i]);
        result = await basicCheck(certificatePath, this.checkDate);
        if (result.result === false)
            throw result;
        return certificatePath;
    }
    async verify(parameters = {}, crypto = getCrypto(true)) {
        function compareDNSName(name, constraint) {
            const namePrepared = stringPrep(name);
            const constraintPrepared = stringPrep(constraint);
            const nameSplitted = namePrepared.split(".");
            const constraintSplitted = constraintPrepared.split(".");
            const nameLen = nameSplitted.length;
            const constrLen = constraintSplitted.length;
            if ((nameLen === 0) || (constrLen === 0) || (nameLen < constrLen)) {
                return false;
            }
            for (let i = 0; i < nameLen; i++) {
                if (nameSplitted[i].length === 0) {
                    return false;
                }
            }
            for (let i = 0; i < constrLen; i++) {
                if (constraintSplitted[i].length === 0) {
                    if (i === 0) {
                        if (constrLen === 1) {
                            return false;
                        }
                        continue;
                    }
                    return false;
                }
            }
            for (let i = 0; i < constrLen; i++) {
                if (constraintSplitted[constrLen - 1 - i].length === 0) {
                    continue;
                }
                if (nameSplitted[nameLen - 1 - i].localeCompare(constraintSplitted[constrLen - 1 - i]) !== 0) {
                    return false;
                }
            }
            return true;
        }
        function compareRFC822Name(name, constraint) {
            const namePrepared = stringPrep(name);
            const constraintPrepared = stringPrep(constraint);
            const nameSplitted = namePrepared.split("@");
            const constraintSplitted = constraintPrepared.split("@");
            if ((nameSplitted.length === 0) || (constraintSplitted.length === 0) || (nameSplitted.length < constraintSplitted.length))
                return false;
            if (constraintSplitted.length === 1) {
                const result = compareDNSName(nameSplitted[1], constraintSplitted[0]);
                if (result) {
                    const ns = nameSplitted[1].split(".");
                    const cs = constraintSplitted[0].split(".");
                    if (cs[0].length === 0)
                        return true;
                    return ns.length === cs.length;
                }
                return false;
            }
            return (namePrepared.localeCompare(constraintPrepared) === 0);
        }
        function compareUniformResourceIdentifier(name, constraint) {
            let namePrepared = stringPrep(name);
            const constraintPrepared = stringPrep(constraint);
            const ns = namePrepared.split("/");
            const cs = constraintPrepared.split("/");
            if (cs.length > 1)
                return false;
            if (ns.length > 1) {
                for (let i = 0; i < ns.length; i++) {
                    if ((ns[i].length > 0) && (ns[i].charAt(ns[i].length - 1) !== ":")) {
                        const nsPort = ns[i].split(":");
                        namePrepared = nsPort[0];
                        break;
                    }
                }
            }
            const result = compareDNSName(namePrepared, constraintPrepared);
            if (result) {
                const nameSplitted = namePrepared.split(".");
                const constraintSplitted = constraintPrepared.split(".");
                if (constraintSplitted[0].length === 0)
                    return true;
                return nameSplitted.length === constraintSplitted.length;
            }
            return false;
        }
        function compareIPAddress(name, constraint) {
            const nameView = name.valueBlock.valueHexView;
            const constraintView = constraint.valueBlock.valueHexView;
            if ((nameView.length === 4) && (constraintView.length === 8)) {
                for (let i = 0; i < 4; i++) {
                    if ((nameView[i] ^ constraintView[i]) & constraintView[i + 4])
                        return false;
                }
                return true;
            }
            if ((nameView.length === 16) && (constraintView.length === 32)) {
                for (let i = 0; i < 16; i++) {
                    if ((nameView[i] ^ constraintView[i]) & constraintView[i + 16])
                        return false;
                }
                return true;
            }
            return false;
        }
        function compareDirectoryName(name, constraint) {
            if ((name.typesAndValues.length === 0) || (constraint.typesAndValues.length === 0))
                return true;
            if (name.typesAndValues.length < constraint.typesAndValues.length)
                return false;
            let result = true;
            let nameStart = 0;
            for (let i = 0; i < constraint.typesAndValues.length; i++) {
                let localResult = false;
                for (let j = nameStart; j < name.typesAndValues.length; j++) {
                    localResult = name.typesAndValues[j].isEqual(constraint.typesAndValues[i]);
                    if (name.typesAndValues[j].type === constraint.typesAndValues[i].type)
                        result = result && localResult;
                    if (localResult === true) {
                        if ((nameStart === 0) || (nameStart === j)) {
                            nameStart = j + 1;
                            break;
                        }
                        else
                            return false;
                    }
                }
                if (localResult === false)
                    return false;
            }
            return (nameStart === 0) ? false : result;
        }
        try {
            if (this.certs.length === 0)
                throw new Error("Empty certificate array");
            const passedWhenNotRevValues = parameters.passedWhenNotRevValues || false;
            const initialPolicySet = parameters.initialPolicySet || [id_AnyPolicy];
            const initialExplicitPolicy = parameters.initialExplicitPolicy || false;
            const initialPolicyMappingInhibit = parameters.initialPolicyMappingInhibit || false;
            const initialInhibitPolicy = parameters.initialInhibitPolicy || false;
            const initialPermittedSubtreesSet = parameters.initialPermittedSubtreesSet || [];
            const initialExcludedSubtreesSet = parameters.initialExcludedSubtreesSet || [];
            const initialRequiredNameForms = parameters.initialRequiredNameForms || [];
            let explicitPolicyIndicator = initialExplicitPolicy;
            let policyMappingInhibitIndicator = initialPolicyMappingInhibit;
            let inhibitAnyPolicyIndicator = initialInhibitPolicy;
            const pendingConstraints = [
                false,
                false,
                false,
            ];
            let explicitPolicyPending = 0;
            let policyMappingInhibitPending = 0;
            let inhibitAnyPolicyPending = 0;
            let permittedSubtrees = initialPermittedSubtreesSet;
            let excludedSubtrees = initialExcludedSubtreesSet;
            const requiredNameForms = initialRequiredNameForms;
            let pathDepth = 1;
            this.certs = await this.sort(passedWhenNotRevValues, crypto);
            const allPolicies = [];
            allPolicies.push(id_AnyPolicy);
            const policiesAndCerts = [];
            const anyPolicyArray = new Array(this.certs.length - 1);
            for (let ii = 0; ii < (this.certs.length - 1); ii++)
                anyPolicyArray[ii] = true;
            policiesAndCerts.push(anyPolicyArray);
            const policyMappings = new Array(this.certs.length - 1);
            const certPolicies = new Array(this.certs.length - 1);
            let explicitPolicyStart = (explicitPolicyIndicator) ? (this.certs.length - 1) : (-1);
            for (let i = (this.certs.length - 2); i >= 0; i--, pathDepth++) {
                const cert = this.certs[i];
                if (cert.extensions) {
                    for (let j = 0; j < cert.extensions.length; j++) {
                        const extension = cert.extensions[j];
                        if (extension.extnID === id_CertificatePolicies) {
                            certPolicies[i] = extension.parsedValue;
                            for (let s = 0; s < allPolicies.length; s++) {
                                if (allPolicies[s] === id_AnyPolicy) {
                                    delete (policiesAndCerts[s])[i];
                                    break;
                                }
                            }
                            for (let k = 0; k < extension.parsedValue.certificatePolicies.length; k++) {
                                let policyIndex = (-1);
                                const policyId = extension.parsedValue.certificatePolicies[k].policyIdentifier;
                                for (let s = 0; s < allPolicies.length; s++) {
                                    if (policyId === allPolicies[s]) {
                                        policyIndex = s;
                                        break;
                                    }
                                }
                                if (policyIndex === (-1)) {
                                    allPolicies.push(policyId);
                                    const certArray = new Array(this.certs.length - 1);
                                    certArray[i] = true;
                                    policiesAndCerts.push(certArray);
                                }
                                else
                                    (policiesAndCerts[policyIndex])[i] = true;
                            }
                        }
                        if (extension.extnID === id_PolicyMappings) {
                            if (policyMappingInhibitIndicator) {
                                return {
                                    result: false,
                                    resultCode: 98,
                                    resultMessage: "Policy mapping prohibited"
                                };
                            }
                            policyMappings[i] = extension.parsedValue;
                        }
                        if (extension.extnID === id_PolicyConstraints) {
                            if (explicitPolicyIndicator === false) {
                                if (extension.parsedValue.requireExplicitPolicy === 0) {
                                    explicitPolicyIndicator = true;
                                    explicitPolicyStart = i;
                                }
                                else {
                                    if (pendingConstraints[0] === false) {
                                        pendingConstraints[0] = true;
                                        explicitPolicyPending = extension.parsedValue.requireExplicitPolicy;
                                    }
                                    else
                                        explicitPolicyPending = (explicitPolicyPending > extension.parsedValue.requireExplicitPolicy) ? extension.parsedValue.requireExplicitPolicy : explicitPolicyPending;
                                }
                                if (extension.parsedValue.inhibitPolicyMapping === 0)
                                    policyMappingInhibitIndicator = true;
                                else {
                                    if (pendingConstraints[1] === false) {
                                        pendingConstraints[1] = true;
                                        policyMappingInhibitPending = extension.parsedValue.inhibitPolicyMapping + 1;
                                    }
                                    else
                                        policyMappingInhibitPending = (policyMappingInhibitPending > (extension.parsedValue.inhibitPolicyMapping + 1)) ? (extension.parsedValue.inhibitPolicyMapping + 1) : policyMappingInhibitPending;
                                }
                            }
                        }
                        if (extension.extnID === id_InhibitAnyPolicy) {
                            if (inhibitAnyPolicyIndicator === false) {
                                if (extension.parsedValue.valueBlock.valueDec === 0)
                                    inhibitAnyPolicyIndicator = true;
                                else {
                                    if (pendingConstraints[2] === false) {
                                        pendingConstraints[2] = true;
                                        inhibitAnyPolicyPending = extension.parsedValue.valueBlock.valueDec;
                                    }
                                    else
                                        inhibitAnyPolicyPending = (inhibitAnyPolicyPending > extension.parsedValue.valueBlock.valueDec) ? extension.parsedValue.valueBlock.valueDec : inhibitAnyPolicyPending;
                                }
                            }
                        }
                    }
                    if (inhibitAnyPolicyIndicator === true) {
                        let policyIndex = (-1);
                        for (let searchAnyPolicy = 0; searchAnyPolicy < allPolicies.length; searchAnyPolicy++) {
                            if (allPolicies[searchAnyPolicy] === id_AnyPolicy) {
                                policyIndex = searchAnyPolicy;
                                break;
                            }
                        }
                        if (policyIndex !== (-1))
                            delete (policiesAndCerts[0])[i];
                    }
                    if (explicitPolicyIndicator === false) {
                        if (pendingConstraints[0] === true) {
                            explicitPolicyPending--;
                            if (explicitPolicyPending === 0) {
                                explicitPolicyIndicator = true;
                                explicitPolicyStart = i;
                                pendingConstraints[0] = false;
                            }
                        }
                    }
                    if (policyMappingInhibitIndicator === false) {
                        if (pendingConstraints[1] === true) {
                            policyMappingInhibitPending--;
                            if (policyMappingInhibitPending === 0) {
                                policyMappingInhibitIndicator = true;
                                pendingConstraints[1] = false;
                            }
                        }
                    }
                    if (inhibitAnyPolicyIndicator === false) {
                        if (pendingConstraints[2] === true) {
                            inhibitAnyPolicyPending--;
                            if (inhibitAnyPolicyPending === 0) {
                                inhibitAnyPolicyIndicator = true;
                                pendingConstraints[2] = false;
                            }
                        }
                    }
                }
            }
            for (let i = 0; i < (this.certs.length - 1); i++) {
                if ((i < (this.certs.length - 2)) && (typeof policyMappings[i + 1] !== "undefined")) {
                    for (let k = 0; k < policyMappings[i + 1].mappings.length; k++) {
                        if ((policyMappings[i + 1].mappings[k].issuerDomainPolicy === id_AnyPolicy) || (policyMappings[i + 1].mappings[k].subjectDomainPolicy === id_AnyPolicy)) {
                            return {
                                result: false,
                                resultCode: 99,
                                resultMessage: "The \"anyPolicy\" should not be a part of policy mapping scheme"
                            };
                        }
                        let issuerDomainPolicyIndex = (-1);
                        let subjectDomainPolicyIndex = (-1);
                        for (let n = 0; n < allPolicies.length; n++) {
                            if (allPolicies[n] === policyMappings[i + 1].mappings[k].issuerDomainPolicy)
                                issuerDomainPolicyIndex = n;
                            if (allPolicies[n] === policyMappings[i + 1].mappings[k].subjectDomainPolicy)
                                subjectDomainPolicyIndex = n;
                        }
                        if (typeof (policiesAndCerts[issuerDomainPolicyIndex])[i] !== "undefined")
                            delete (policiesAndCerts[issuerDomainPolicyIndex])[i];
                        for (let j = 0; j < certPolicies[i].certificatePolicies.length; j++) {
                            if (policyMappings[i + 1].mappings[k].subjectDomainPolicy === certPolicies[i].certificatePolicies[j].policyIdentifier) {
                                if ((issuerDomainPolicyIndex !== (-1)) && (subjectDomainPolicyIndex !== (-1))) {
                                    for (let m = 0; m <= i; m++) {
                                        if (typeof (policiesAndCerts[subjectDomainPolicyIndex])[m] !== "undefined") {
                                            (policiesAndCerts[issuerDomainPolicyIndex])[m] = true;
                                            delete (policiesAndCerts[subjectDomainPolicyIndex])[m];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            for (let i = 0; i < allPolicies.length; i++) {
                if (allPolicies[i] === id_AnyPolicy) {
                    for (let j = 0; j < explicitPolicyStart; j++)
                        delete (policiesAndCerts[i])[j];
                }
            }
            const authConstrPolicies = [];
            for (let i = 0; i < policiesAndCerts.length; i++) {
                let found = true;
                for (let j = 0; j < (this.certs.length - 1); j++) {
                    let anyPolicyFound = false;
                    if ((j < explicitPolicyStart) && (allPolicies[i] === id_AnyPolicy) && (allPolicies.length > 1)) {
                        found = false;
                        break;
                    }
                    if (typeof (policiesAndCerts[i])[j] === "undefined") {
                        if (j >= explicitPolicyStart) {
                            for (let k = 0; k < allPolicies.length; k++) {
                                if (allPolicies[k] === id_AnyPolicy) {
                                    if ((policiesAndCerts[k])[j] === true)
                                        anyPolicyFound = true;
                                    break;
                                }
                            }
                        }
                        if (!anyPolicyFound) {
                            found = false;
                            break;
                        }
                    }
                }
                if (found === true)
                    authConstrPolicies.push(allPolicies[i]);
            }
            let userConstrPolicies = [];
            if ((initialPolicySet.length === 1) && (initialPolicySet[0] === id_AnyPolicy) && (explicitPolicyIndicator === false))
                userConstrPolicies = initialPolicySet;
            else {
                if ((authConstrPolicies.length === 1) && (authConstrPolicies[0] === id_AnyPolicy))
                    userConstrPolicies = initialPolicySet;
                else {
                    for (let i = 0; i < authConstrPolicies.length; i++) {
                        for (let j = 0; j < initialPolicySet.length; j++) {
                            if ((initialPolicySet[j] === authConstrPolicies[i]) || (initialPolicySet[j] === id_AnyPolicy)) {
                                userConstrPolicies.push(authConstrPolicies[i]);
                                break;
                            }
                        }
                    }
                }
            }
            const policyResult = {
                result: (userConstrPolicies.length > 0),
                resultCode: 0,
                resultMessage: (userConstrPolicies.length > 0) ? EMPTY_STRING : "Zero \"userConstrPolicies\" array, no intersections with \"authConstrPolicies\"",
                authConstrPolicies,
                userConstrPolicies,
                explicitPolicyIndicator,
                policyMappings,
                certificatePath: this.certs
            };
            if (userConstrPolicies.length === 0)
                return policyResult;
            if (policyResult.result === false)
                return policyResult;
            pathDepth = 1;
            for (let i = (this.certs.length - 2); i >= 0; i--, pathDepth++) {
                const cert = this.certs[i];
                let subjectAltNames = [];
                let certPermittedSubtrees = [];
                let certExcludedSubtrees = [];
                if (cert.extensions) {
                    for (let j = 0; j < cert.extensions.length; j++) {
                        const extension = cert.extensions[j];
                        if (extension.extnID === id_NameConstraints) {
                            if ("permittedSubtrees" in extension.parsedValue)
                                certPermittedSubtrees = certPermittedSubtrees.concat(extension.parsedValue.permittedSubtrees);
                            if ("excludedSubtrees" in extension.parsedValue)
                                certExcludedSubtrees = certExcludedSubtrees.concat(extension.parsedValue.excludedSubtrees);
                        }
                        if (extension.extnID === id_SubjectAltName)
                            subjectAltNames = subjectAltNames.concat(extension.parsedValue.altNames);
                    }
                }
                let formFound = (requiredNameForms.length <= 0);
                for (let j = 0; j < requiredNameForms.length; j++) {
                    switch (requiredNameForms[j].base.type) {
                        case 4:
                            {
                                if (requiredNameForms[j].base.value.typesAndValues.length !== cert.subject.typesAndValues.length)
                                    continue;
                                formFound = true;
                                for (let k = 0; k < cert.subject.typesAndValues.length; k++) {
                                    if (cert.subject.typesAndValues[k].type !== requiredNameForms[j].base.value.typesAndValues[k].type) {
                                        formFound = false;
                                        break;
                                    }
                                }
                                if (formFound === true)
                                    break;
                            }
                            break;
                        default:
                    }
                }
                if (formFound === false) {
                    policyResult.result = false;
                    policyResult.resultCode = 21;
                    policyResult.resultMessage = "No necessary name form found";
                    throw policyResult;
                }
                const constrGroups = [
                    [],
                    [],
                    [],
                    [],
                    [],
                ];
                for (let j = 0; j < permittedSubtrees.length; j++) {
                    switch (permittedSubtrees[j].base.type) {
                        case 1:
                            constrGroups[0].push(permittedSubtrees[j]);
                            break;
                        case 2:
                            constrGroups[1].push(permittedSubtrees[j]);
                            break;
                        case 4:
                            constrGroups[2].push(permittedSubtrees[j]);
                            break;
                        case 6:
                            constrGroups[3].push(permittedSubtrees[j]);
                            break;
                        case 7:
                            constrGroups[4].push(permittedSubtrees[j]);
                            break;
                        default:
                    }
                }
                for (let p = 0; p < 5; p++) {
                    let groupPermitted = false;
                    let valueExists = false;
                    const group = constrGroups[p];
                    for (let j = 0; j < group.length; j++) {
                        switch (p) {
                            case 0:
                                if (subjectAltNames.length > 0) {
                                    for (let k = 0; k < subjectAltNames.length; k++) {
                                        if (subjectAltNames[k].type === 1) {
                                            valueExists = true;
                                            groupPermitted = groupPermitted || compareRFC822Name(subjectAltNames[k].value, group[j].base.value);
                                        }
                                    }
                                }
                                else {
                                    for (let k = 0; k < cert.subject.typesAndValues.length; k++) {
                                        if ((cert.subject.typesAndValues[k].type === "1.2.840.113549.1.9.1") ||
                                            (cert.subject.typesAndValues[k].type === "0.9.2342.19200300.100.1.3")) {
                                            valueExists = true;
                                            groupPermitted = groupPermitted || compareRFC822Name(cert.subject.typesAndValues[k].value.valueBlock.value, group[j].base.value);
                                        }
                                    }
                                }
                                break;
                            case 1:
                                if (subjectAltNames.length > 0) {
                                    for (let k = 0; k < subjectAltNames.length; k++) {
                                        if (subjectAltNames[k].type === 2) {
                                            valueExists = true;
                                            groupPermitted = groupPermitted || compareDNSName(subjectAltNames[k].value, group[j].base.value);
                                        }
                                    }
                                }
                                break;
                            case 2:
                                valueExists = true;
                                groupPermitted = compareDirectoryName(cert.subject, group[j].base.value);
                                break;
                            case 3:
                                if (subjectAltNames.length > 0) {
                                    for (let k = 0; k < subjectAltNames.length; k++) {
                                        if (subjectAltNames[k].type === 6) {
                                            valueExists = true;
                                            groupPermitted = groupPermitted || compareUniformResourceIdentifier(subjectAltNames[k].value, group[j].base.value);
                                        }
                                    }
                                }
                                break;
                            case 4:
                                if (subjectAltNames.length > 0) {
                                    for (let k = 0; k < subjectAltNames.length; k++) {
                                        if (subjectAltNames[k].type === 7) {
                                            valueExists = true;
                                            groupPermitted = groupPermitted || compareIPAddress(subjectAltNames[k].value, group[j].base.value);
                                        }
                                    }
                                }
                                break;
                            default:
                        }
                        if (groupPermitted)
                            break;
                    }
                    if ((groupPermitted === false) && (group.length > 0) && valueExists) {
                        policyResult.result = false;
                        policyResult.resultCode = 41;
                        policyResult.resultMessage = "Failed to meet \"permitted sub-trees\" name constraint";
                        throw policyResult;
                    }
                }
                let excluded = false;
                for (let j = 0; j < excludedSubtrees.length; j++) {
                    switch (excludedSubtrees[j].base.type) {
                        case 1:
                            if (subjectAltNames.length >= 0) {
                                for (let k = 0; k < subjectAltNames.length; k++) {
                                    if (subjectAltNames[k].type === 1)
                                        excluded = excluded || compareRFC822Name(subjectAltNames[k].value, excludedSubtrees[j].base.value);
                                }
                            }
                            else {
                                for (let k = 0; k < cert.subject.typesAndValues.length; k++) {
                                    if ((cert.subject.typesAndValues[k].type === "1.2.840.113549.1.9.1") ||
                                        (cert.subject.typesAndValues[k].type === "0.9.2342.19200300.100.1.3"))
                                        excluded = excluded || compareRFC822Name(cert.subject.typesAndValues[k].value.valueBlock.value, excludedSubtrees[j].base.value);
                                }
                            }
                            break;
                        case 2:
                            if (subjectAltNames.length > 0) {
                                for (let k = 0; k < subjectAltNames.length; k++) {
                                    if (subjectAltNames[k].type === 2)
                                        excluded = excluded || compareDNSName(subjectAltNames[k].value, excludedSubtrees[j].base.value);
                                }
                            }
                            break;
                        case 4:
                            excluded = excluded || compareDirectoryName(cert.subject, excludedSubtrees[j].base.value);
                            break;
                        case 6:
                            if (subjectAltNames.length > 0) {
                                for (let k = 0; k < subjectAltNames.length; k++) {
                                    if (subjectAltNames[k].type === 6)
                                        excluded = excluded || compareUniformResourceIdentifier(subjectAltNames[k].value, excludedSubtrees[j].base.value);
                                }
                            }
                            break;
                        case 7:
                            if (subjectAltNames.length > 0) {
                                for (let k = 0; k < subjectAltNames.length; k++) {
                                    if (subjectAltNames[k].type === 7)
                                        excluded = excluded || compareIPAddress(subjectAltNames[k].value, excludedSubtrees[j].base.value);
                                }
                            }
                            break;
                        default:
                    }
                    if (excluded)
                        break;
                }
                if (excluded === true) {
                    policyResult.result = false;
                    policyResult.resultCode = 42;
                    policyResult.resultMessage = "Failed to meet \"excluded sub-trees\" name constraint";
                    throw policyResult;
                }
                permittedSubtrees = permittedSubtrees.concat(certPermittedSubtrees);
                excludedSubtrees = excludedSubtrees.concat(certExcludedSubtrees);
            }
            return policyResult;
        }
        catch (error) {
            if (error instanceof Error) {
                if (error instanceof ChainValidationError) {
                    return {
                        result: false,
                        resultCode: error.code,
                        resultMessage: error.message,
                        error: error,
                    };
                }
                return {
                    result: false,
                    resultCode: ChainValidationCode.unknown,
                    resultMessage: error.message,
                    error: error,
                };
            }
            if (error && typeof error === "object" && "resultMessage" in error) {
                return error;
            }
            return {
                result: false,
                resultCode: -1,
                resultMessage: `${error}`,
            };
        }
    }
}

const TBS_RESPONSE_DATA = "tbsResponseData";
const SIGNATURE_ALGORITHM$3 = "signatureAlgorithm";
const SIGNATURE$2 = "signature";
const CERTS$1 = "certs";
const BASIC_OCSP_RESPONSE = "BasicOCSPResponse";
const BASIC_OCSP_RESPONSE_TBS_RESPONSE_DATA = `${BASIC_OCSP_RESPONSE}.${TBS_RESPONSE_DATA}`;
const BASIC_OCSP_RESPONSE_SIGNATURE_ALGORITHM = `${BASIC_OCSP_RESPONSE}.${SIGNATURE_ALGORITHM$3}`;
const BASIC_OCSP_RESPONSE_SIGNATURE = `${BASIC_OCSP_RESPONSE}.${SIGNATURE$2}`;
const BASIC_OCSP_RESPONSE_CERTS = `${BASIC_OCSP_RESPONSE}.${CERTS$1}`;
const CLEAR_PROPS$g = [
    BASIC_OCSP_RESPONSE_TBS_RESPONSE_DATA,
    BASIC_OCSP_RESPONSE_SIGNATURE_ALGORITHM,
    BASIC_OCSP_RESPONSE_SIGNATURE,
    BASIC_OCSP_RESPONSE_CERTS
];
class BasicOCSPResponse extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.tbsResponseData = pvutils.getParametersValue(parameters, TBS_RESPONSE_DATA, BasicOCSPResponse.defaultValues(TBS_RESPONSE_DATA));
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$3, BasicOCSPResponse.defaultValues(SIGNATURE_ALGORITHM$3));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE$2, BasicOCSPResponse.defaultValues(SIGNATURE$2));
        if (CERTS$1 in parameters) {
            this.certs = pvutils.getParametersValue(parameters, CERTS$1, BasicOCSPResponse.defaultValues(CERTS$1));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TBS_RESPONSE_DATA:
                return new ResponseData();
            case SIGNATURE_ALGORITHM$3:
                return new AlgorithmIdentifier();
            case SIGNATURE$2:
                return new asn1js.BitString();
            case CERTS$1:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case "type":
                {
                    let comparisonResult = ((ResponseData.compareWithDefault("tbs", memberValue.tbs)) &&
                        (ResponseData.compareWithDefault("responderID", memberValue.responderID)) &&
                        (ResponseData.compareWithDefault("producedAt", memberValue.producedAt)) &&
                        (ResponseData.compareWithDefault("responses", memberValue.responses)));
                    if ("responseExtensions" in memberValue)
                        comparisonResult = comparisonResult && (ResponseData.compareWithDefault("responseExtensions", memberValue.responseExtensions));
                    return comparisonResult;
                }
            case SIGNATURE_ALGORITHM$3:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case SIGNATURE$2:
                return (memberValue.isEqual(BasicOCSPResponse.defaultValues(memberName)));
            case CERTS$1:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || BASIC_OCSP_RESPONSE),
            value: [
                ResponseData.schema(names.tbsResponseData || {
                    names: {
                        blockName: BASIC_OCSP_RESPONSE_TBS_RESPONSE_DATA
                    }
                }),
                AlgorithmIdentifier.schema(names.signatureAlgorithm || {
                    names: {
                        blockName: BASIC_OCSP_RESPONSE_SIGNATURE_ALGORITHM
                    }
                }),
                new asn1js.BitString({ name: (names.signature || BASIC_OCSP_RESPONSE_SIGNATURE) }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.Sequence({
                            value: [new asn1js.Repeated({
                                    name: BASIC_OCSP_RESPONSE_CERTS,
                                    value: Certificate.schema(names.certs || {})
                                })]
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$g);
        const asn1 = asn1js.compareSchema(schema, schema, BasicOCSPResponse.schema());
        AsnError.assertSchema(asn1, this.className);
        this.tbsResponseData = new ResponseData({ schema: asn1.result[BASIC_OCSP_RESPONSE_TBS_RESPONSE_DATA] });
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result[BASIC_OCSP_RESPONSE_SIGNATURE_ALGORITHM] });
        this.signature = asn1.result[BASIC_OCSP_RESPONSE_SIGNATURE];
        if (BASIC_OCSP_RESPONSE_CERTS in asn1.result) {
            this.certs = Array.from(asn1.result[BASIC_OCSP_RESPONSE_CERTS], element => new Certificate({ schema: element }));
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.tbsResponseData.toSchema());
        outputArray.push(this.signatureAlgorithm.toSchema());
        outputArray.push(this.signature);
        if (this.certs) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    new asn1js.Sequence({
                        value: Array.from(this.certs, o => o.toSchema())
                    })
                ]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            tbsResponseData: this.tbsResponseData.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signature: this.signature.toJSON(),
        };
        if (this.certs) {
            res.certs = Array.from(this.certs, o => o.toJSON());
        }
        return res;
    }
    async getCertificateStatus(certificate, issuerCertificate, crypto = getCrypto(true)) {
        const result = {
            isForCertificate: false,
            status: 2
        };
        const hashesObject = {};
        const certIDs = [];
        for (const response of this.tbsResponseData.responses) {
            const hashAlgorithm = crypto.getAlgorithmByOID(response.certID.hashAlgorithm.algorithmId, true, "CertID.hashAlgorithm");
            if (!hashesObject[hashAlgorithm.name]) {
                hashesObject[hashAlgorithm.name] = 1;
                const certID = new CertID();
                certIDs.push(certID);
                await certID.createForCertificate(certificate, {
                    hashAlgorithm: hashAlgorithm.name,
                    issuerCertificate
                }, crypto);
            }
        }
        for (const response of this.tbsResponseData.responses) {
            for (const id of certIDs) {
                if (response.certID.isEqual(id)) {
                    result.isForCertificate = true;
                    try {
                        switch (response.certStatus.idBlock.isConstructed) {
                            case true:
                                if (response.certStatus.idBlock.tagNumber === 1)
                                    result.status = 1;
                                break;
                            case false:
                                switch (response.certStatus.idBlock.tagNumber) {
                                    case 0:
                                        result.status = 0;
                                        break;
                                    case 2:
                                        result.status = 2;
                                        break;
                                    default:
                                }
                                break;
                            default:
                        }
                    }
                    catch {
                    }
                    return result;
                }
            }
        }
        return result;
    }
    async sign(privateKey, hashAlgorithm = "SHA-1", crypto = getCrypto(true)) {
        if (!privateKey) {
            throw new Error("Need to provide a private key for signing");
        }
        const signatureParams = await crypto.getSignatureParameters(privateKey, hashAlgorithm);
        const algorithm = signatureParams.parameters.algorithm;
        if (!("name" in algorithm)) {
            throw new Error("Empty algorithm");
        }
        this.signatureAlgorithm = signatureParams.signatureAlgorithm;
        this.tbsResponseData.tbsView = new Uint8Array(this.tbsResponseData.toSchema(true).toBER());
        const signature = await crypto.signWithPrivateKey(this.tbsResponseData.tbsView, privateKey, { algorithm });
        this.signature = new asn1js.BitString({ valueHex: signature });
    }
    async verify(params = {}, crypto = getCrypto(true)) {
        let signerCert = null;
        let certIndex = -1;
        const trustedCerts = params.trustedCerts || [];
        if (!this.certs) {
            throw new Error("No certificates attached to the BasicOCSPResponse");
        }
        switch (true) {
            case (this.tbsResponseData.responderID instanceof RelativeDistinguishedNames):
                for (const [index, certificate] of this.certs.entries()) {
                    if (certificate.subject.isEqual(this.tbsResponseData.responderID)) {
                        certIndex = index;
                        break;
                    }
                }
                break;
            case (this.tbsResponseData.responderID instanceof asn1js.OctetString):
                for (const [index, cert] of this.certs.entries()) {
                    const hash = await crypto.digest({ name: "sha-1" }, cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView);
                    if (pvutils.isEqualBuffer(hash, this.tbsResponseData.responderID.valueBlock.valueHex)) {
                        certIndex = index;
                        break;
                    }
                }
                break;
            default:
                throw new Error("Wrong value for responderID");
        }
        if (certIndex === (-1))
            throw new Error("Correct certificate was not found in OCSP response");
        signerCert = this.certs[certIndex];
        const additionalCerts = [signerCert];
        for (const cert of this.certs) {
            const caCert = await checkCA(cert, signerCert);
            if (caCert) {
                additionalCerts.push(caCert);
            }
        }
        const certChain = new CertificateChainValidationEngine({
            certs: additionalCerts,
            trustedCerts,
        });
        const verificationResult = await certChain.verify({}, crypto);
        if (!verificationResult.result) {
            throw new Error("Validation of signer's certificate failed");
        }
        return crypto.verifyWithPublicKey(this.tbsResponseData.tbsView, this.signature, this.certs[certIndex].subjectPublicKeyInfo, this.signatureAlgorithm);
    }
}
BasicOCSPResponse.CLASS_NAME = "BasicOCSPResponse";

const TBS$1 = "tbs";
const VERSION$6 = "version";
const SUBJECT = "subject";
const SPKI = "subjectPublicKeyInfo";
const ATTRIBUTES$1 = "attributes";
const SIGNATURE_ALGORITHM$2 = "signatureAlgorithm";
const SIGNATURE_VALUE = "signatureValue";
const CSR_INFO = "CertificationRequestInfo";
const CSR_INFO_VERSION = `${CSR_INFO}.version`;
const CSR_INFO_SUBJECT = `${CSR_INFO}.subject`;
const CSR_INFO_SPKI = `${CSR_INFO}.subjectPublicKeyInfo`;
const CSR_INFO_ATTRS = `${CSR_INFO}.attributes`;
const CLEAR_PROPS$f = [
    CSR_INFO,
    CSR_INFO_VERSION,
    CSR_INFO_SUBJECT,
    CSR_INFO_SPKI,
    CSR_INFO_ATTRS,
    SIGNATURE_ALGORITHM$2,
    SIGNATURE_VALUE
];
function CertificationRequestInfo(parameters = {}) {
    const names = pvutils.getParametersValue(parameters, "names", {});
    return (new asn1js.Sequence({
        name: (names.CertificationRequestInfo || CSR_INFO),
        value: [
            new asn1js.Integer({ name: (names.CertificationRequestInfoVersion || CSR_INFO_VERSION) }),
            RelativeDistinguishedNames.schema(names.subject || {
                names: {
                    blockName: CSR_INFO_SUBJECT
                }
            }),
            PublicKeyInfo.schema({
                names: {
                    blockName: CSR_INFO_SPKI
                }
            }),
            new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    new asn1js.Repeated({
                        optional: true,
                        name: (names.CertificationRequestInfoAttributes || CSR_INFO_ATTRS),
                        value: Attribute.schema(names.attributes || {})
                    })
                ]
            })
        ]
    }));
}
class CertificationRequest extends PkiObject {
    get tbs() {
        return pvtsutils.BufferSourceConverter.toArrayBuffer(this.tbsView);
    }
    set tbs(value) {
        this.tbsView = new Uint8Array(value);
    }
    constructor(parameters = {}) {
        super();
        this.tbsView = new Uint8Array(pvutils.getParametersValue(parameters, TBS$1, CertificationRequest.defaultValues(TBS$1)));
        this.version = pvutils.getParametersValue(parameters, VERSION$6, CertificationRequest.defaultValues(VERSION$6));
        this.subject = pvutils.getParametersValue(parameters, SUBJECT, CertificationRequest.defaultValues(SUBJECT));
        this.subjectPublicKeyInfo = pvutils.getParametersValue(parameters, SPKI, CertificationRequest.defaultValues(SPKI));
        if (ATTRIBUTES$1 in parameters) {
            this.attributes = pvutils.getParametersValue(parameters, ATTRIBUTES$1, CertificationRequest.defaultValues(ATTRIBUTES$1));
        }
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$2, CertificationRequest.defaultValues(SIGNATURE_ALGORITHM$2));
        this.signatureValue = pvutils.getParametersValue(parameters, SIGNATURE_VALUE, CertificationRequest.defaultValues(SIGNATURE_VALUE));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TBS$1:
                return EMPTY_BUFFER;
            case VERSION$6:
                return 0;
            case SUBJECT:
                return new RelativeDistinguishedNames();
            case SPKI:
                return new PublicKeyInfo();
            case ATTRIBUTES$1:
                return [];
            case SIGNATURE_ALGORITHM$2:
                return new AlgorithmIdentifier();
            case SIGNATURE_VALUE:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            value: [
                CertificationRequestInfo(names.certificationRequestInfo || {}),
                new asn1js.Sequence({
                    name: (names.signatureAlgorithm || SIGNATURE_ALGORITHM$2),
                    value: [
                        new asn1js.ObjectIdentifier(),
                        new asn1js.Any({ optional: true })
                    ]
                }),
                new asn1js.BitString({ name: (names.signatureValue || SIGNATURE_VALUE) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$f);
        const asn1 = asn1js.compareSchema(schema, schema, CertificationRequest.schema());
        AsnError.assertSchema(asn1, this.className);
        this.tbsView = asn1.result.CertificationRequestInfo.valueBeforeDecodeView;
        this.version = asn1.result[CSR_INFO_VERSION].valueBlock.valueDec;
        this.subject = new RelativeDistinguishedNames({ schema: asn1.result[CSR_INFO_SUBJECT] });
        this.subjectPublicKeyInfo = new PublicKeyInfo({ schema: asn1.result[CSR_INFO_SPKI] });
        if (CSR_INFO_ATTRS in asn1.result) {
            this.attributes = Array.from(asn1.result[CSR_INFO_ATTRS], element => new Attribute({ schema: element }));
        }
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.signatureAlgorithm });
        this.signatureValue = asn1.result.signatureValue;
    }
    encodeTBS() {
        const outputArray = [
            new asn1js.Integer({ value: this.version }),
            this.subject.toSchema(),
            this.subjectPublicKeyInfo.toSchema()
        ];
        if (ATTRIBUTES$1 in this) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: Array.from(this.attributes || [], o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toSchema(encodeFlag = false) {
        let tbsSchema;
        if (encodeFlag === false) {
            if (this.tbsView.byteLength === 0) {
                return CertificationRequest.schema();
            }
            const asn1 = asn1js.fromBER(this.tbsView);
            AsnError.assert(asn1, "PKCS#10 Certificate Request");
            tbsSchema = asn1.result;
        }
        else {
            tbsSchema = this.encodeTBS();
        }
        return (new asn1js.Sequence({
            value: [
                tbsSchema,
                this.signatureAlgorithm.toSchema(),
                this.signatureValue
            ]
        }));
    }
    toJSON() {
        const object = {
            tbs: pvtsutils.Convert.ToHex(this.tbsView),
            version: this.version,
            subject: this.subject.toJSON(),
            subjectPublicKeyInfo: this.subjectPublicKeyInfo.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signatureValue: this.signatureValue.toJSON(),
        };
        if (ATTRIBUTES$1 in this) {
            object.attributes = Array.from(this.attributes || [], o => o.toJSON());
        }
        return object;
    }
    async sign(privateKey, hashAlgorithm = "SHA-1", crypto = getCrypto(true)) {
        if (!privateKey) {
            throw new Error("Need to provide a private key for signing");
        }
        const signatureParams = await crypto.getSignatureParameters(privateKey, hashAlgorithm);
        const parameters = signatureParams.parameters;
        this.signatureAlgorithm = signatureParams.signatureAlgorithm;
        this.tbsView = new Uint8Array(this.encodeTBS().toBER());
        const signature = await crypto.signWithPrivateKey(this.tbsView, privateKey, parameters);
        this.signatureValue = new asn1js.BitString({ valueHex: signature });
    }
    async verify(crypto = getCrypto(true)) {
        return crypto.verifyWithPublicKey(this.tbsView, this.signatureValue, this.subjectPublicKeyInfo, this.signatureAlgorithm);
    }
    async getPublicKey(parameters, crypto = getCrypto(true)) {
        return crypto.getPublicKey(this.subjectPublicKeyInfo, this.signatureAlgorithm, parameters);
    }
}
CertificationRequest.CLASS_NAME = "CertificationRequest";

const DIGEST_ALGORITHM$1 = "digestAlgorithm";
const DIGEST = "digest";
const CLEAR_PROPS$e = [
    DIGEST_ALGORITHM$1,
    DIGEST
];
class DigestInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.digestAlgorithm = pvutils.getParametersValue(parameters, DIGEST_ALGORITHM$1, DigestInfo.defaultValues(DIGEST_ALGORITHM$1));
        this.digest = pvutils.getParametersValue(parameters, DIGEST, DigestInfo.defaultValues(DIGEST));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case DIGEST_ALGORITHM$1:
                return new AlgorithmIdentifier();
            case DIGEST:
                return new asn1js.OctetString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case DIGEST_ALGORITHM$1:
                return ((AlgorithmIdentifier.compareWithDefault("algorithmId", memberValue.algorithmId)) &&
                    (("algorithmParams" in memberValue) === false));
            case DIGEST:
                return (memberValue.isEqual(DigestInfo.defaultValues(memberName)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.digestAlgorithm || {
                    names: {
                        blockName: DIGEST_ALGORITHM$1
                    }
                }),
                new asn1js.OctetString({ name: (names.digest || DIGEST) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$e);
        const asn1 = asn1js.compareSchema(schema, schema, DigestInfo.schema({
            names: {
                digestAlgorithm: {
                    names: {
                        blockName: DIGEST_ALGORITHM$1
                    }
                },
                digest: DIGEST
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.digestAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.digestAlgorithm });
        this.digest = asn1.result.digest;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.digestAlgorithm.toSchema(),
                this.digest
            ]
        }));
    }
    toJSON() {
        return {
            digestAlgorithm: this.digestAlgorithm.toJSON(),
            digest: this.digest.toJSON(),
        };
    }
}
DigestInfo.CLASS_NAME = "DigestInfo";

const E_CONTENT_TYPE = "eContentType";
const E_CONTENT = "eContent";
const CLEAR_PROPS$d = [
    E_CONTENT_TYPE,
    E_CONTENT,
];
class EncapsulatedContentInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.eContentType = pvutils.getParametersValue(parameters, E_CONTENT_TYPE, EncapsulatedContentInfo.defaultValues(E_CONTENT_TYPE));
        if (E_CONTENT in parameters) {
            this.eContent = pvutils.getParametersValue(parameters, E_CONTENT, EncapsulatedContentInfo.defaultValues(E_CONTENT));
            if ((this.eContent.idBlock.tagClass === 1) &&
                (this.eContent.idBlock.tagNumber === 4)) {
                if (this.eContent.idBlock.isConstructed === false) {
                    const constrString = new asn1js.OctetString({
                        idBlock: { isConstructed: true },
                        isConstructed: true
                    });
                    let offset = 0;
                    const viewHex = this.eContent.valueBlock.valueHexView.slice().buffer;
                    let length = viewHex.byteLength;
                    while (length > 0) {
                        const pieceView = new Uint8Array(viewHex, offset, ((offset + 65536) > viewHex.byteLength) ? (viewHex.byteLength - offset) : 65536);
                        const _array = new ArrayBuffer(pieceView.length);
                        const _view = new Uint8Array(_array);
                        for (let i = 0; i < _view.length; i++) {
                            _view[i] = pieceView[i];
                        }
                        constrString.valueBlock.value.push(new asn1js.OctetString({ valueHex: _array }));
                        length -= pieceView.length;
                        offset += pieceView.length;
                    }
                    this.eContent = constrString;
                }
            }
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case E_CONTENT_TYPE:
                return EMPTY_STRING;
            case E_CONTENT:
                return new asn1js.OctetString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case E_CONTENT_TYPE:
                return (memberValue === EMPTY_STRING);
            case E_CONTENT:
                {
                    if ((memberValue.idBlock.tagClass === 1) && (memberValue.idBlock.tagNumber === 4))
                        return (memberValue.isEqual(EncapsulatedContentInfo.defaultValues(E_CONTENT)));
                    return false;
                }
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.eContentType || EMPTY_STRING) }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.Any({ name: (names.eContent || EMPTY_STRING) })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$d);
        const asn1 = asn1js.compareSchema(schema, schema, EncapsulatedContentInfo.schema({
            names: {
                eContentType: E_CONTENT_TYPE,
                eContent: E_CONTENT
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.eContentType = asn1.result.eContentType.valueBlock.toString();
        if (E_CONTENT in asn1.result)
            this.eContent = asn1.result.eContent;
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.eContentType }));
        if (this.eContent) {
            if (EncapsulatedContentInfo.compareWithDefault(E_CONTENT, this.eContent) === false) {
                outputArray.push(new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [this.eContent]
                }));
            }
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            eContentType: this.eContentType
        };
        if (this.eContent && EncapsulatedContentInfo.compareWithDefault(E_CONTENT, this.eContent) === false) {
            res.eContent = this.eContent.toJSON();
        }
        return res;
    }
}
EncapsulatedContentInfo.CLASS_NAME = "EncapsulatedContentInfo";

class KeyBag extends PrivateKeyInfo {
    constructor(parameters = {}) {
        super(parameters);
    }
}

const MAC = "mac";
const MAC_SALT = "macSalt";
const ITERATIONS = "iterations";
const CLEAR_PROPS$c = [
    MAC,
    MAC_SALT,
    ITERATIONS
];
class MacData extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.mac = pvutils.getParametersValue(parameters, MAC, MacData.defaultValues(MAC));
        this.macSalt = pvutils.getParametersValue(parameters, MAC_SALT, MacData.defaultValues(MAC_SALT));
        if (ITERATIONS in parameters) {
            this.iterations = pvutils.getParametersValue(parameters, ITERATIONS, MacData.defaultValues(ITERATIONS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case MAC:
                return new DigestInfo();
            case MAC_SALT:
                return new asn1js.OctetString();
            case ITERATIONS:
                return 1;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case MAC:
                return ((DigestInfo.compareWithDefault("digestAlgorithm", memberValue.digestAlgorithm)) &&
                    (DigestInfo.compareWithDefault("digest", memberValue.digest)));
            case MAC_SALT:
                return (memberValue.isEqual(MacData.defaultValues(memberName)));
            case ITERATIONS:
                return (memberValue === MacData.defaultValues(memberName));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            optional: (names.optional || true),
            value: [
                DigestInfo.schema(names.mac || {
                    names: {
                        blockName: MAC
                    }
                }),
                new asn1js.OctetString({ name: (names.macSalt || MAC_SALT) }),
                new asn1js.Integer({
                    optional: true,
                    name: (names.iterations || ITERATIONS)
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$c);
        const asn1 = asn1js.compareSchema(schema, schema, MacData.schema({
            names: {
                mac: {
                    names: {
                        blockName: MAC
                    }
                },
                macSalt: MAC_SALT,
                iterations: ITERATIONS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.mac = new DigestInfo({ schema: asn1.result.mac });
        this.macSalt = asn1.result.macSalt;
        if (ITERATIONS in asn1.result)
            this.iterations = asn1.result.iterations.valueBlock.valueDec;
    }
    toSchema() {
        const outputArray = [
            this.mac.toSchema(),
            this.macSalt
        ];
        if (this.iterations !== undefined) {
            outputArray.push(new asn1js.Integer({ value: this.iterations }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            mac: this.mac.toJSON(),
            macSalt: this.macSalt.toJSON(),
        };
        if (this.iterations !== undefined) {
            res.iterations = this.iterations;
        }
        return res;
    }
}
MacData.CLASS_NAME = "MacData";

const HASH_ALGORITHM = "hashAlgorithm";
const HASHED_MESSAGE = "hashedMessage";
const CLEAR_PROPS$b = [
    HASH_ALGORITHM,
    HASHED_MESSAGE,
];
class MessageImprint extends PkiObject {
    static async create(hashAlgorithm, message, crypto = getCrypto(true)) {
        const hashAlgorithmOID = crypto.getOIDByAlgorithm({ name: hashAlgorithm }, true, "hashAlgorithm");
        const hashedMessage = await crypto.digest(hashAlgorithm, message);
        const res = new MessageImprint({
            hashAlgorithm: new AlgorithmIdentifier({
                algorithmId: hashAlgorithmOID,
                algorithmParams: new asn1js.Null(),
            }),
            hashedMessage: new asn1js.OctetString({ valueHex: hashedMessage })
        });
        return res;
    }
    constructor(parameters = {}) {
        super();
        this.hashAlgorithm = pvutils.getParametersValue(parameters, HASH_ALGORITHM, MessageImprint.defaultValues(HASH_ALGORITHM));
        this.hashedMessage = pvutils.getParametersValue(parameters, HASHED_MESSAGE, MessageImprint.defaultValues(HASHED_MESSAGE));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case HASH_ALGORITHM:
                return new AlgorithmIdentifier();
            case HASHED_MESSAGE:
                return new asn1js.OctetString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case HASH_ALGORITHM:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case HASHED_MESSAGE:
                return (memberValue.isEqual(MessageImprint.defaultValues(memberName)) === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.hashAlgorithm || {}),
                new asn1js.OctetString({ name: (names.hashedMessage || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$b);
        const asn1 = asn1js.compareSchema(schema, schema, MessageImprint.schema({
            names: {
                hashAlgorithm: {
                    names: {
                        blockName: HASH_ALGORITHM
                    }
                },
                hashedMessage: HASHED_MESSAGE
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.hashAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.hashAlgorithm });
        this.hashedMessage = asn1.result.hashedMessage;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                this.hashAlgorithm.toSchema(),
                this.hashedMessage
            ]
        }));
    }
    toJSON() {
        return {
            hashAlgorithm: this.hashAlgorithm.toJSON(),
            hashedMessage: this.hashedMessage.toJSON(),
        };
    }
}
MessageImprint.CLASS_NAME = "MessageImprint";

const REQ_CERT = "reqCert";
const SINGLE_REQUEST_EXTENSIONS = "singleRequestExtensions";
const CLEAR_PROPS$a = [
    REQ_CERT,
    SINGLE_REQUEST_EXTENSIONS,
];
class Request extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.reqCert = pvutils.getParametersValue(parameters, REQ_CERT, Request.defaultValues(REQ_CERT));
        if (SINGLE_REQUEST_EXTENSIONS in parameters) {
            this.singleRequestExtensions = pvutils.getParametersValue(parameters, SINGLE_REQUEST_EXTENSIONS, Request.defaultValues(SINGLE_REQUEST_EXTENSIONS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case REQ_CERT:
                return new CertID();
            case SINGLE_REQUEST_EXTENSIONS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case REQ_CERT:
                return (memberValue.isEqual(Request.defaultValues(memberName)));
            case SINGLE_REQUEST_EXTENSIONS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                CertID.schema(names.reqCert || {}),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [Extensions.schema(names.extensions || {
                            names: {
                                blockName: (names.singleRequestExtensions || EMPTY_STRING)
                            }
                        })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$a);
        const asn1 = asn1js.compareSchema(schema, schema, Request.schema({
            names: {
                reqCert: {
                    names: {
                        blockName: REQ_CERT
                    }
                },
                extensions: {
                    names: {
                        blockName: SINGLE_REQUEST_EXTENSIONS
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.reqCert = new CertID({ schema: asn1.result.reqCert });
        if (SINGLE_REQUEST_EXTENSIONS in asn1.result) {
            this.singleRequestExtensions = Array.from(asn1.result.singleRequestExtensions.valueBlock.value, element => new Extension({ schema: element }));
        }
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.reqCert.toSchema());
        if (this.singleRequestExtensions) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    new asn1js.Sequence({
                        value: Array.from(this.singleRequestExtensions, o => o.toSchema())
                    })
                ]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            reqCert: this.reqCert.toJSON()
        };
        if (this.singleRequestExtensions) {
            res.singleRequestExtensions = Array.from(this.singleRequestExtensions, o => o.toJSON());
        }
        return res;
    }
}
Request.CLASS_NAME = "Request";

const TBS = "tbs";
const VERSION$5 = "version";
const REQUESTOR_NAME = "requestorName";
const REQUEST_LIST = "requestList";
const REQUEST_EXTENSIONS = "requestExtensions";
const TBS_REQUEST$1 = "TBSRequest";
const TBS_REQUEST_VERSION = `${TBS_REQUEST$1}.${VERSION$5}`;
const TBS_REQUEST_REQUESTOR_NAME = `${TBS_REQUEST$1}.${REQUESTOR_NAME}`;
const TBS_REQUEST_REQUESTS = `${TBS_REQUEST$1}.requests`;
const TBS_REQUEST_REQUEST_EXTENSIONS = `${TBS_REQUEST$1}.${REQUEST_EXTENSIONS}`;
const CLEAR_PROPS$9 = [
    TBS_REQUEST$1,
    TBS_REQUEST_VERSION,
    TBS_REQUEST_REQUESTOR_NAME,
    TBS_REQUEST_REQUESTS,
    TBS_REQUEST_REQUEST_EXTENSIONS
];
class TBSRequest extends PkiObject {
    get tbs() {
        return pvtsutils.BufferSourceConverter.toArrayBuffer(this.tbsView);
    }
    set tbs(value) {
        this.tbsView = new Uint8Array(value);
    }
    constructor(parameters = {}) {
        super();
        this.tbsView = new Uint8Array(pvutils.getParametersValue(parameters, TBS, TBSRequest.defaultValues(TBS)));
        if (VERSION$5 in parameters) {
            this.version = pvutils.getParametersValue(parameters, VERSION$5, TBSRequest.defaultValues(VERSION$5));
        }
        if (REQUESTOR_NAME in parameters) {
            this.requestorName = pvutils.getParametersValue(parameters, REQUESTOR_NAME, TBSRequest.defaultValues(REQUESTOR_NAME));
        }
        this.requestList = pvutils.getParametersValue(parameters, REQUEST_LIST, TBSRequest.defaultValues(REQUEST_LIST));
        if (REQUEST_EXTENSIONS in parameters) {
            this.requestExtensions = pvutils.getParametersValue(parameters, REQUEST_EXTENSIONS, TBSRequest.defaultValues(REQUEST_EXTENSIONS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TBS:
                return EMPTY_BUFFER;
            case VERSION$5:
                return 0;
            case REQUESTOR_NAME:
                return new GeneralName();
            case REQUEST_LIST:
            case REQUEST_EXTENSIONS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TBS:
                return (memberValue.byteLength === 0);
            case VERSION$5:
                return (memberValue === TBSRequest.defaultValues(memberName));
            case REQUESTOR_NAME:
                return ((memberValue.type === GeneralName.defaultValues("type")) && (Object.keys(memberValue.value).length === 0));
            case REQUEST_LIST:
            case REQUEST_EXTENSIONS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || TBS_REQUEST$1),
            value: [
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Integer({ name: (names.TBSRequestVersion || TBS_REQUEST_VERSION) })]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [GeneralName.schema(names.requestorName || {
                            names: {
                                blockName: TBS_REQUEST_REQUESTOR_NAME
                            }
                        })]
                }),
                new asn1js.Sequence({
                    name: (names.requestList || "TBSRequest.requestList"),
                    value: [
                        new asn1js.Repeated({
                            name: (names.requests || TBS_REQUEST_REQUESTS),
                            value: Request.schema(names.requestNames || {})
                        })
                    ]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    value: [Extensions.schema(names.extensions || {
                            names: {
                                blockName: (names.requestExtensions || TBS_REQUEST_REQUEST_EXTENSIONS)
                            }
                        })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$9);
        const asn1 = asn1js.compareSchema(schema, schema, TBSRequest.schema());
        AsnError.assertSchema(asn1, this.className);
        this.tbsView = asn1.result.TBSRequest.valueBeforeDecodeView;
        if (TBS_REQUEST_VERSION in asn1.result)
            this.version = asn1.result[TBS_REQUEST_VERSION].valueBlock.valueDec;
        if (TBS_REQUEST_REQUESTOR_NAME in asn1.result)
            this.requestorName = new GeneralName({ schema: asn1.result[TBS_REQUEST_REQUESTOR_NAME] });
        this.requestList = Array.from(asn1.result[TBS_REQUEST_REQUESTS], element => new Request({ schema: element }));
        if (TBS_REQUEST_REQUEST_EXTENSIONS in asn1.result)
            this.requestExtensions = Array.from(asn1.result[TBS_REQUEST_REQUEST_EXTENSIONS].valueBlock.value, element => new Extension({ schema: element }));
    }
    toSchema(encodeFlag = false) {
        let tbsSchema;
        if (encodeFlag === false) {
            if (this.tbsView.byteLength === 0)
                return TBSRequest.schema();
            const asn1 = asn1js.fromBER(this.tbsView);
            AsnError.assert(asn1, "TBS Request");
            if (!(asn1.result instanceof asn1js.Sequence)) {
                throw new Error("ASN.1 result should be SEQUENCE");
            }
            tbsSchema = asn1.result;
        }
        else {
            const outputArray = [];
            if (this.version !== undefined) {
                outputArray.push(new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Integer({ value: this.version })]
                }));
            }
            if (this.requestorName) {
                outputArray.push(new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [this.requestorName.toSchema()]
                }));
            }
            outputArray.push(new asn1js.Sequence({
                value: Array.from(this.requestList, o => o.toSchema())
            }));
            if (this.requestExtensions) {
                outputArray.push(new asn1js.Constructed({
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 2
                    },
                    value: [
                        new asn1js.Sequence({
                            value: Array.from(this.requestExtensions, o => o.toSchema())
                        })
                    ]
                }));
            }
            tbsSchema = new asn1js.Sequence({
                value: outputArray
            });
        }
        return tbsSchema;
    }
    toJSON() {
        const res = {};
        if (this.version != undefined)
            res.version = this.version;
        if (this.requestorName) {
            res.requestorName = this.requestorName.toJSON();
        }
        res.requestList = Array.from(this.requestList, o => o.toJSON());
        if (this.requestExtensions) {
            res.requestExtensions = Array.from(this.requestExtensions, o => o.toJSON());
        }
        return res;
    }
}
TBSRequest.CLASS_NAME = "TBSRequest";

const SIGNATURE_ALGORITHM$1 = "signatureAlgorithm";
const SIGNATURE$1 = "signature";
const CERTS = "certs";
class Signature extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM$1, Signature.defaultValues(SIGNATURE_ALGORITHM$1));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE$1, Signature.defaultValues(SIGNATURE$1));
        if (CERTS in parameters) {
            this.certs = pvutils.getParametersValue(parameters, CERTS, Signature.defaultValues(CERTS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case SIGNATURE_ALGORITHM$1:
                return new AlgorithmIdentifier();
            case SIGNATURE$1:
                return new asn1js.BitString();
            case CERTS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case SIGNATURE_ALGORITHM$1:
                return ((memberValue.algorithmId === EMPTY_STRING) && (("algorithmParams" in memberValue) === false));
            case SIGNATURE$1:
                return (memberValue.isEqual(Signature.defaultValues(memberName)));
            case CERTS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                AlgorithmIdentifier.schema(names.signatureAlgorithm || {}),
                new asn1js.BitString({ name: (names.signature || EMPTY_STRING) }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        new asn1js.Sequence({
                            value: [new asn1js.Repeated({
                                    name: (names.certs || EMPTY_STRING),
                                    value: Certificate.schema({})
                                })]
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            SIGNATURE_ALGORITHM$1,
            SIGNATURE$1,
            CERTS
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, Signature.schema({
            names: {
                signatureAlgorithm: {
                    names: {
                        blockName: SIGNATURE_ALGORITHM$1
                    }
                },
                signature: SIGNATURE$1,
                certs: CERTS
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.signatureAlgorithm });
        this.signature = asn1.result.signature;
        if (CERTS in asn1.result)
            this.certs = Array.from(asn1.result.certs, element => new Certificate({ schema: element }));
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.signatureAlgorithm.toSchema());
        outputArray.push(this.signature);
        if (this.certs) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    new asn1js.Sequence({
                        value: Array.from(this.certs, o => o.toSchema())
                    })
                ]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signature: this.signature.toJSON(),
        };
        if (this.certs) {
            res.certs = Array.from(this.certs, o => o.toJSON());
        }
        return res;
    }
}
Signature.CLASS_NAME = "Signature";

const TBS_REQUEST = "tbsRequest";
const OPTIONAL_SIGNATURE = "optionalSignature";
const CLEAR_PROPS$8 = [
    TBS_REQUEST,
    OPTIONAL_SIGNATURE
];
class OCSPRequest extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.tbsRequest = pvutils.getParametersValue(parameters, TBS_REQUEST, OCSPRequest.defaultValues(TBS_REQUEST));
        if (OPTIONAL_SIGNATURE in parameters) {
            this.optionalSignature = pvutils.getParametersValue(parameters, OPTIONAL_SIGNATURE, OCSPRequest.defaultValues(OPTIONAL_SIGNATURE));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TBS_REQUEST:
                return new TBSRequest();
            case OPTIONAL_SIGNATURE:
                return new Signature();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TBS_REQUEST:
                return ((TBSRequest.compareWithDefault("tbs", memberValue.tbs)) &&
                    (TBSRequest.compareWithDefault("version", memberValue.version)) &&
                    (TBSRequest.compareWithDefault("requestorName", memberValue.requestorName)) &&
                    (TBSRequest.compareWithDefault("requestList", memberValue.requestList)) &&
                    (TBSRequest.compareWithDefault("requestExtensions", memberValue.requestExtensions)));
            case OPTIONAL_SIGNATURE:
                return ((Signature.compareWithDefault("signatureAlgorithm", memberValue.signatureAlgorithm)) &&
                    (Signature.compareWithDefault("signature", memberValue.signature)) &&
                    (Signature.compareWithDefault("certs", memberValue.certs)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: names.blockName || "OCSPRequest",
            value: [
                TBSRequest.schema(names.tbsRequest || {
                    names: {
                        blockName: TBS_REQUEST
                    }
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        Signature.schema(names.optionalSignature || {
                            names: {
                                blockName: OPTIONAL_SIGNATURE
                            }
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$8);
        const asn1 = asn1js.compareSchema(schema, schema, OCSPRequest.schema());
        AsnError.assertSchema(asn1, this.className);
        this.tbsRequest = new TBSRequest({ schema: asn1.result.tbsRequest });
        if (OPTIONAL_SIGNATURE in asn1.result)
            this.optionalSignature = new Signature({ schema: asn1.result.optionalSignature });
    }
    toSchema(encodeFlag = false) {
        const outputArray = [];
        outputArray.push(this.tbsRequest.toSchema(encodeFlag));
        if (this.optionalSignature)
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [
                    this.optionalSignature.toSchema()
                ]
            }));
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            tbsRequest: this.tbsRequest.toJSON()
        };
        if (this.optionalSignature) {
            res.optionalSignature = this.optionalSignature.toJSON();
        }
        return res;
    }
    async createForCertificate(certificate, parameters, crypto = getCrypto(true)) {
        const certID = new CertID();
        await certID.createForCertificate(certificate, parameters, crypto);
        this.tbsRequest.requestList.push(new Request({
            reqCert: certID,
        }));
    }
    async sign(privateKey, hashAlgorithm = "SHA-1", crypto = getCrypto(true)) {
        ParameterError.assertEmpty(privateKey, "privateKey", "OCSPRequest.sign method");
        if (!this.optionalSignature) {
            throw new Error("Need to create \"optionalSignature\" field before signing");
        }
        const signatureParams = await crypto.getSignatureParameters(privateKey, hashAlgorithm);
        const parameters = signatureParams.parameters;
        this.optionalSignature.signatureAlgorithm = signatureParams.signatureAlgorithm;
        const tbs = this.tbsRequest.toSchema(true).toBER(false);
        const signature = await crypto.signWithPrivateKey(tbs, privateKey, parameters);
        this.optionalSignature.signature = new asn1js.BitString({ valueHex: signature });
    }
    verify() {
    }
}
OCSPRequest.CLASS_NAME = "OCSPRequest";

const RESPONSE_TYPE = "responseType";
const RESPONSE = "response";
const CLEAR_PROPS$7 = [
    RESPONSE_TYPE,
    RESPONSE
];
class ResponseBytes extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.responseType = pvutils.getParametersValue(parameters, RESPONSE_TYPE, ResponseBytes.defaultValues(RESPONSE_TYPE));
        this.response = pvutils.getParametersValue(parameters, RESPONSE, ResponseBytes.defaultValues(RESPONSE));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case RESPONSE_TYPE:
                return EMPTY_STRING;
            case RESPONSE:
                return new asn1js.OctetString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case RESPONSE_TYPE:
                return (memberValue === EMPTY_STRING);
            case RESPONSE:
                return (memberValue.isEqual(ResponseBytes.defaultValues(memberName)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.ObjectIdentifier({ name: (names.responseType || EMPTY_STRING) }),
                new asn1js.OctetString({ name: (names.response || EMPTY_STRING) })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$7);
        const asn1 = asn1js.compareSchema(schema, schema, ResponseBytes.schema({
            names: {
                responseType: RESPONSE_TYPE,
                response: RESPONSE
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.responseType = asn1.result.responseType.valueBlock.toString();
        this.response = asn1.result.response;
    }
    toSchema() {
        return (new asn1js.Sequence({
            value: [
                new asn1js.ObjectIdentifier({ value: this.responseType }),
                this.response
            ]
        }));
    }
    toJSON() {
        return {
            responseType: this.responseType,
            response: this.response.toJSON(),
        };
    }
}
ResponseBytes.CLASS_NAME = "ResponseBytes";

const RESPONSE_STATUS = "responseStatus";
const RESPONSE_BYTES = "responseBytes";
class OCSPResponse extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.responseStatus = pvutils.getParametersValue(parameters, RESPONSE_STATUS, OCSPResponse.defaultValues(RESPONSE_STATUS));
        if (RESPONSE_BYTES in parameters) {
            this.responseBytes = pvutils.getParametersValue(parameters, RESPONSE_BYTES, OCSPResponse.defaultValues(RESPONSE_BYTES));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case RESPONSE_STATUS:
                return new asn1js.Enumerated();
            case RESPONSE_BYTES:
                return new ResponseBytes();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case RESPONSE_STATUS:
                return (memberValue.isEqual(OCSPResponse.defaultValues(memberName)));
            case RESPONSE_BYTES:
                return ((ResponseBytes.compareWithDefault("responseType", memberValue.responseType)) &&
                    (ResponseBytes.compareWithDefault("response", memberValue.response)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || "OCSPResponse"),
            value: [
                new asn1js.Enumerated({ name: (names.responseStatus || RESPONSE_STATUS) }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [
                        ResponseBytes.schema(names.responseBytes || {
                            names: {
                                blockName: RESPONSE_BYTES
                            }
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, [
            RESPONSE_STATUS,
            RESPONSE_BYTES
        ]);
        const asn1 = asn1js.compareSchema(schema, schema, OCSPResponse.schema());
        AsnError.assertSchema(asn1, this.className);
        this.responseStatus = asn1.result.responseStatus;
        if (RESPONSE_BYTES in asn1.result)
            this.responseBytes = new ResponseBytes({ schema: asn1.result.responseBytes });
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.responseStatus);
        if (this.responseBytes) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [this.responseBytes.toSchema()]
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            responseStatus: this.responseStatus.toJSON()
        };
        if (this.responseBytes) {
            res.responseBytes = this.responseBytes.toJSON();
        }
        return res;
    }
    async getCertificateStatus(certificate, issuerCertificate, crypto = getCrypto(true)) {
        let basicResponse;
        const result = {
            isForCertificate: false,
            status: 2
        };
        if (!this.responseBytes)
            return result;
        if (this.responseBytes.responseType !== id_PKIX_OCSP_Basic)
            return result;
        try {
            const asn1Basic = asn1js.fromBER(this.responseBytes.response.valueBlock.valueHexView);
            AsnError.assert(asn1Basic, "Basic OCSP response");
            basicResponse = new BasicOCSPResponse({ schema: asn1Basic.result });
        }
        catch {
            return result;
        }
        return basicResponse.getCertificateStatus(certificate, issuerCertificate, crypto);
    }
    async sign(privateKey, hashAlgorithm, crypto = getCrypto(true)) {
        var _a;
        if (this.responseBytes && this.responseBytes.responseType === id_PKIX_OCSP_Basic) {
            const basicResponse = BasicOCSPResponse.fromBER(this.responseBytes.response.valueBlock.valueHexView);
            return basicResponse.sign(privateKey, hashAlgorithm, crypto);
        }
        throw new Error(`Unknown ResponseBytes type: ${((_a = this.responseBytes) === null || _a === void 0 ? void 0 : _a.responseType) || "Unknown"}`);
    }
    async verify(issuerCertificate = null, crypto = getCrypto(true)) {
        var _a;
        if ((RESPONSE_BYTES in this) === false)
            throw new Error("Empty ResponseBytes field");
        if (this.responseBytes && this.responseBytes.responseType === id_PKIX_OCSP_Basic) {
            const basicResponse = BasicOCSPResponse.fromBER(this.responseBytes.response.valueBlock.valueHexView);
            if (issuerCertificate !== null) {
                if (!basicResponse.certs) {
                    basicResponse.certs = [];
                }
                basicResponse.certs.push(issuerCertificate);
            }
            return basicResponse.verify({}, crypto);
        }
        throw new Error(`Unknown ResponseBytes type: ${((_a = this.responseBytes) === null || _a === void 0 ? void 0 : _a.responseType) || "Unknown"}`);
    }
}
OCSPResponse.CLASS_NAME = "OCSPResponse";

const TYPE = "type";
const ATTRIBUTES = "attributes";
const ENCODED_VALUE = "encodedValue";
const CLEAR_PROPS$6 = [
    ATTRIBUTES
];
class SignedAndUnsignedAttributes extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.type = pvutils.getParametersValue(parameters, TYPE, SignedAndUnsignedAttributes.defaultValues(TYPE));
        this.attributes = pvutils.getParametersValue(parameters, ATTRIBUTES, SignedAndUnsignedAttributes.defaultValues(ATTRIBUTES));
        this.encodedValue = pvutils.getParametersValue(parameters, ENCODED_VALUE, SignedAndUnsignedAttributes.defaultValues(ENCODED_VALUE));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case TYPE:
                return (-1);
            case ATTRIBUTES:
                return [];
            case ENCODED_VALUE:
                return EMPTY_BUFFER;
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case TYPE:
                return (memberValue === SignedAndUnsignedAttributes.defaultValues(TYPE));
            case ATTRIBUTES:
                return (memberValue.length === 0);
            case ENCODED_VALUE:
                return (memberValue.byteLength === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Constructed({
            name: (names.blockName || EMPTY_STRING),
            optional: true,
            idBlock: {
                tagClass: 3,
                tagNumber: names.tagNumber || 0
            },
            value: [
                new asn1js.Repeated({
                    name: (names.attributes || EMPTY_STRING),
                    value: Attribute.schema()
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$6);
        const asn1 = asn1js.compareSchema(schema, schema, SignedAndUnsignedAttributes.schema({
            names: {
                tagNumber: this.type,
                attributes: ATTRIBUTES
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.type = asn1.result.idBlock.tagNumber;
        this.encodedValue = pvtsutils.BufferSourceConverter.toArrayBuffer(asn1.result.valueBeforeDecodeView);
        const encodedView = new Uint8Array(this.encodedValue);
        encodedView[0] = 0x31;
        if ((ATTRIBUTES in asn1.result) === false) {
            if (this.type === 0)
                throw new Error("Wrong structure of SignedUnsignedAttributes");
            else
                return;
        }
        this.attributes = Array.from(asn1.result.attributes, element => new Attribute({ schema: element }));
    }
    toSchema() {
        if (SignedAndUnsignedAttributes.compareWithDefault(TYPE, this.type) || SignedAndUnsignedAttributes.compareWithDefault(ATTRIBUTES, this.attributes))
            throw new Error("Incorrectly initialized \"SignedAndUnsignedAttributes\" class");
        return (new asn1js.Constructed({
            optional: true,
            idBlock: {
                tagClass: 3,
                tagNumber: this.type
            },
            value: Array.from(this.attributes, o => o.toSchema())
        }));
    }
    toJSON() {
        if (SignedAndUnsignedAttributes.compareWithDefault(TYPE, this.type) || SignedAndUnsignedAttributes.compareWithDefault(ATTRIBUTES, this.attributes))
            throw new Error("Incorrectly initialized \"SignedAndUnsignedAttributes\" class");
        return {
            type: this.type,
            attributes: Array.from(this.attributes, o => o.toJSON())
        };
    }
}
SignedAndUnsignedAttributes.CLASS_NAME = "SignedAndUnsignedAttributes";

const VERSION$4 = "version";
const SID = "sid";
const DIGEST_ALGORITHM = "digestAlgorithm";
const SIGNED_ATTRS = "signedAttrs";
const SIGNATURE_ALGORITHM = "signatureAlgorithm";
const SIGNATURE = "signature";
const UNSIGNED_ATTRS = "unsignedAttrs";
const SIGNER_INFO = "SignerInfo";
const SIGNER_INFO_VERSION = `${SIGNER_INFO}.${VERSION$4}`;
const SIGNER_INFO_SID = `${SIGNER_INFO}.${SID}`;
const SIGNER_INFO_DIGEST_ALGORITHM = `${SIGNER_INFO}.${DIGEST_ALGORITHM}`;
const SIGNER_INFO_SIGNED_ATTRS = `${SIGNER_INFO}.${SIGNED_ATTRS}`;
const SIGNER_INFO_SIGNATURE_ALGORITHM = `${SIGNER_INFO}.${SIGNATURE_ALGORITHM}`;
const SIGNER_INFO_SIGNATURE = `${SIGNER_INFO}.${SIGNATURE}`;
const SIGNER_INFO_UNSIGNED_ATTRS = `${SIGNER_INFO}.${UNSIGNED_ATTRS}`;
const CLEAR_PROPS$5 = [
    SIGNER_INFO_VERSION,
    SIGNER_INFO_SID,
    SIGNER_INFO_DIGEST_ALGORITHM,
    SIGNER_INFO_SIGNED_ATTRS,
    SIGNER_INFO_SIGNATURE_ALGORITHM,
    SIGNER_INFO_SIGNATURE,
    SIGNER_INFO_UNSIGNED_ATTRS
];
class SignerInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$4, SignerInfo.defaultValues(VERSION$4));
        this.sid = pvutils.getParametersValue(parameters, SID, SignerInfo.defaultValues(SID));
        this.digestAlgorithm = pvutils.getParametersValue(parameters, DIGEST_ALGORITHM, SignerInfo.defaultValues(DIGEST_ALGORITHM));
        if (SIGNED_ATTRS in parameters) {
            this.signedAttrs = pvutils.getParametersValue(parameters, SIGNED_ATTRS, SignerInfo.defaultValues(SIGNED_ATTRS));
        }
        this.signatureAlgorithm = pvutils.getParametersValue(parameters, SIGNATURE_ALGORITHM, SignerInfo.defaultValues(SIGNATURE_ALGORITHM));
        this.signature = pvutils.getParametersValue(parameters, SIGNATURE, SignerInfo.defaultValues(SIGNATURE));
        if (UNSIGNED_ATTRS in parameters) {
            this.unsignedAttrs = pvutils.getParametersValue(parameters, UNSIGNED_ATTRS, SignerInfo.defaultValues(UNSIGNED_ATTRS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$4:
                return 0;
            case SID:
                return new asn1js.Any();
            case DIGEST_ALGORITHM:
                return new AlgorithmIdentifier();
            case SIGNED_ATTRS:
                return new SignedAndUnsignedAttributes({ type: 0 });
            case SIGNATURE_ALGORITHM:
                return new AlgorithmIdentifier();
            case SIGNATURE:
                return new asn1js.OctetString();
            case UNSIGNED_ATTRS:
                return new SignedAndUnsignedAttributes({ type: 1 });
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$4:
                return (SignerInfo.defaultValues(VERSION$4) === memberValue);
            case SID:
                return (memberValue instanceof asn1js.Any);
            case DIGEST_ALGORITHM:
                if ((memberValue instanceof AlgorithmIdentifier) === false)
                    return false;
                return memberValue.isEqual(SignerInfo.defaultValues(DIGEST_ALGORITHM));
            case SIGNED_ATTRS:
                return ((SignedAndUnsignedAttributes.compareWithDefault("type", memberValue.type))
                    && (SignedAndUnsignedAttributes.compareWithDefault("attributes", memberValue.attributes))
                    && (SignedAndUnsignedAttributes.compareWithDefault("encodedValue", memberValue.encodedValue)));
            case SIGNATURE_ALGORITHM:
                if ((memberValue instanceof AlgorithmIdentifier) === false)
                    return false;
                return memberValue.isEqual(SignerInfo.defaultValues(SIGNATURE_ALGORITHM));
            case SIGNATURE:
            case UNSIGNED_ATTRS:
                return ((SignedAndUnsignedAttributes.compareWithDefault("type", memberValue.type))
                    && (SignedAndUnsignedAttributes.compareWithDefault("attributes", memberValue.attributes))
                    && (SignedAndUnsignedAttributes.compareWithDefault("encodedValue", memberValue.encodedValue)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: SIGNER_INFO,
            value: [
                new asn1js.Integer({ name: (names.version || SIGNER_INFO_VERSION) }),
                new asn1js.Choice({
                    value: [
                        IssuerAndSerialNumber.schema(names.sidSchema || {
                            names: {
                                blockName: SIGNER_INFO_SID
                            }
                        }),
                        new asn1js.Choice({
                            value: [
                                new asn1js.Constructed({
                                    optional: true,
                                    name: (names.sid || SIGNER_INFO_SID),
                                    idBlock: {
                                        tagClass: 3,
                                        tagNumber: 0
                                    },
                                    value: [new asn1js.OctetString()]
                                }),
                                new asn1js.Primitive({
                                    optional: true,
                                    name: (names.sid || SIGNER_INFO_SID),
                                    idBlock: {
                                        tagClass: 3,
                                        tagNumber: 0
                                    }
                                }),
                            ]
                        }),
                    ]
                }),
                AlgorithmIdentifier.schema(names.digestAlgorithm || {
                    names: {
                        blockName: SIGNER_INFO_DIGEST_ALGORITHM
                    }
                }),
                SignedAndUnsignedAttributes.schema(names.signedAttrs || {
                    names: {
                        blockName: SIGNER_INFO_SIGNED_ATTRS,
                        tagNumber: 0
                    }
                }),
                AlgorithmIdentifier.schema(names.signatureAlgorithm || {
                    names: {
                        blockName: SIGNER_INFO_SIGNATURE_ALGORITHM
                    }
                }),
                new asn1js.OctetString({ name: (names.signature || SIGNER_INFO_SIGNATURE) }),
                SignedAndUnsignedAttributes.schema(names.unsignedAttrs || {
                    names: {
                        blockName: SIGNER_INFO_UNSIGNED_ATTRS,
                        tagNumber: 1
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$5);
        const asn1 = asn1js.compareSchema(schema, schema, SignerInfo.schema());
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result[SIGNER_INFO_VERSION].valueBlock.valueDec;
        const currentSid = asn1.result[SIGNER_INFO_SID];
        if (currentSid.idBlock.tagClass === 1)
            this.sid = new IssuerAndSerialNumber({ schema: currentSid });
        else
            this.sid = currentSid;
        this.digestAlgorithm = new AlgorithmIdentifier({ schema: asn1.result[SIGNER_INFO_DIGEST_ALGORITHM] });
        if (SIGNER_INFO_SIGNED_ATTRS in asn1.result)
            this.signedAttrs = new SignedAndUnsignedAttributes({ type: 0, schema: asn1.result[SIGNER_INFO_SIGNED_ATTRS] });
        this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result[SIGNER_INFO_SIGNATURE_ALGORITHM] });
        this.signature = asn1.result[SIGNER_INFO_SIGNATURE];
        if (SIGNER_INFO_UNSIGNED_ATTRS in asn1.result)
            this.unsignedAttrs = new SignedAndUnsignedAttributes({ type: 1, schema: asn1.result[SIGNER_INFO_UNSIGNED_ATTRS] });
    }
    toSchema() {
        if (SignerInfo.compareWithDefault(SID, this.sid))
            throw new Error("Incorrectly initialized \"SignerInfo\" class");
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        if (this.sid instanceof IssuerAndSerialNumber)
            outputArray.push(this.sid.toSchema());
        else
            outputArray.push(this.sid);
        outputArray.push(this.digestAlgorithm.toSchema());
        if (this.signedAttrs) {
            if (SignerInfo.compareWithDefault(SIGNED_ATTRS, this.signedAttrs) === false)
                outputArray.push(this.signedAttrs.toSchema());
        }
        outputArray.push(this.signatureAlgorithm.toSchema());
        outputArray.push(this.signature);
        if (this.unsignedAttrs) {
            if (SignerInfo.compareWithDefault(UNSIGNED_ATTRS, this.unsignedAttrs) === false)
                outputArray.push(this.unsignedAttrs.toSchema());
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        if (SignerInfo.compareWithDefault(SID, this.sid)) {
            throw new Error("Incorrectly initialized \"SignerInfo\" class");
        }
        const res = {
            version: this.version,
            digestAlgorithm: this.digestAlgorithm.toJSON(),
            signatureAlgorithm: this.signatureAlgorithm.toJSON(),
            signature: this.signature.toJSON(),
        };
        if (!(this.sid instanceof asn1js.Any))
            res.sid = this.sid.toJSON();
        if (this.signedAttrs && SignerInfo.compareWithDefault(SIGNED_ATTRS, this.signedAttrs) === false) {
            res.signedAttrs = this.signedAttrs.toJSON();
        }
        if (this.unsignedAttrs && SignerInfo.compareWithDefault(UNSIGNED_ATTRS, this.unsignedAttrs) === false) {
            res.unsignedAttrs = this.unsignedAttrs.toJSON();
        }
        return res;
    }
}
SignerInfo.CLASS_NAME = "SignerInfo";

const VERSION$3 = "version";
const POLICY = "policy";
const MESSAGE_IMPRINT$1 = "messageImprint";
const SERIAL_NUMBER = "serialNumber";
const GEN_TIME = "genTime";
const ORDERING = "ordering";
const NONCE$1 = "nonce";
const ACCURACY = "accuracy";
const TSA = "tsa";
const EXTENSIONS$1 = "extensions";
const TST_INFO = "TSTInfo";
const TST_INFO_VERSION = `${TST_INFO}.${VERSION$3}`;
const TST_INFO_POLICY = `${TST_INFO}.${POLICY}`;
const TST_INFO_MESSAGE_IMPRINT = `${TST_INFO}.${MESSAGE_IMPRINT$1}`;
const TST_INFO_SERIAL_NUMBER = `${TST_INFO}.${SERIAL_NUMBER}`;
const TST_INFO_GEN_TIME = `${TST_INFO}.${GEN_TIME}`;
const TST_INFO_ACCURACY = `${TST_INFO}.${ACCURACY}`;
const TST_INFO_ORDERING = `${TST_INFO}.${ORDERING}`;
const TST_INFO_NONCE = `${TST_INFO}.${NONCE$1}`;
const TST_INFO_TSA = `${TST_INFO}.${TSA}`;
const TST_INFO_EXTENSIONS = `${TST_INFO}.${EXTENSIONS$1}`;
const CLEAR_PROPS$4 = [
    TST_INFO_VERSION,
    TST_INFO_POLICY,
    TST_INFO_MESSAGE_IMPRINT,
    TST_INFO_SERIAL_NUMBER,
    TST_INFO_GEN_TIME,
    TST_INFO_ACCURACY,
    TST_INFO_ORDERING,
    TST_INFO_NONCE,
    TST_INFO_TSA,
    TST_INFO_EXTENSIONS
];
class TSTInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$3, TSTInfo.defaultValues(VERSION$3));
        this.policy = pvutils.getParametersValue(parameters, POLICY, TSTInfo.defaultValues(POLICY));
        this.messageImprint = pvutils.getParametersValue(parameters, MESSAGE_IMPRINT$1, TSTInfo.defaultValues(MESSAGE_IMPRINT$1));
        this.serialNumber = pvutils.getParametersValue(parameters, SERIAL_NUMBER, TSTInfo.defaultValues(SERIAL_NUMBER));
        this.genTime = pvutils.getParametersValue(parameters, GEN_TIME, TSTInfo.defaultValues(GEN_TIME));
        if (ACCURACY in parameters) {
            this.accuracy = pvutils.getParametersValue(parameters, ACCURACY, TSTInfo.defaultValues(ACCURACY));
        }
        if (ORDERING in parameters) {
            this.ordering = pvutils.getParametersValue(parameters, ORDERING, TSTInfo.defaultValues(ORDERING));
        }
        if (NONCE$1 in parameters) {
            this.nonce = pvutils.getParametersValue(parameters, NONCE$1, TSTInfo.defaultValues(NONCE$1));
        }
        if (TSA in parameters) {
            this.tsa = pvutils.getParametersValue(parameters, TSA, TSTInfo.defaultValues(TSA));
        }
        if (EXTENSIONS$1 in parameters) {
            this.extensions = pvutils.getParametersValue(parameters, EXTENSIONS$1, TSTInfo.defaultValues(EXTENSIONS$1));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$3:
                return 0;
            case POLICY:
                return EMPTY_STRING;
            case MESSAGE_IMPRINT$1:
                return new MessageImprint();
            case SERIAL_NUMBER:
                return new asn1js.Integer();
            case GEN_TIME:
                return new Date(0, 0, 0);
            case ACCURACY:
                return new Accuracy();
            case ORDERING:
                return false;
            case NONCE$1:
                return new asn1js.Integer();
            case TSA:
                return new GeneralName();
            case EXTENSIONS$1:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$3:
            case POLICY:
            case GEN_TIME:
            case ORDERING:
                return (memberValue === TSTInfo.defaultValues(ORDERING));
            case MESSAGE_IMPRINT$1:
                return ((MessageImprint.compareWithDefault(HASH_ALGORITHM, memberValue.hashAlgorithm)) &&
                    (MessageImprint.compareWithDefault(HASHED_MESSAGE, memberValue.hashedMessage)));
            case SERIAL_NUMBER:
            case NONCE$1:
                return (memberValue.isEqual(TSTInfo.defaultValues(NONCE$1)));
            case ACCURACY:
                return ((Accuracy.compareWithDefault(SECONDS, memberValue.seconds)) &&
                    (Accuracy.compareWithDefault(MILLIS, memberValue.millis)) &&
                    (Accuracy.compareWithDefault(MICROS, memberValue.micros)));
            case TSA:
                return ((GeneralName.compareWithDefault(TYPE$4, memberValue.type)) &&
                    (GeneralName.compareWithDefault(VALUE$5, memberValue.value)));
            case EXTENSIONS$1:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || TST_INFO),
            value: [
                new asn1js.Integer({ name: (names.version || TST_INFO_VERSION) }),
                new asn1js.ObjectIdentifier({ name: (names.policy || TST_INFO_POLICY) }),
                MessageImprint.schema(names.messageImprint || {
                    names: {
                        blockName: TST_INFO_MESSAGE_IMPRINT
                    }
                }),
                new asn1js.Integer({ name: (names.serialNumber || TST_INFO_SERIAL_NUMBER) }),
                new asn1js.GeneralizedTime({ name: (names.genTime || TST_INFO_GEN_TIME) }),
                Accuracy.schema(names.accuracy || {
                    names: {
                        blockName: TST_INFO_ACCURACY
                    }
                }),
                new asn1js.Boolean({
                    name: (names.ordering || TST_INFO_ORDERING),
                    optional: true
                }),
                new asn1js.Integer({
                    name: (names.nonce || TST_INFO_NONCE),
                    optional: true
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [GeneralName.schema(names.tsa || {
                            names: {
                                blockName: TST_INFO_TSA
                            }
                        })]
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: [
                        new asn1js.Repeated({
                            name: (names.extensions || TST_INFO_EXTENSIONS),
                            value: Extension.schema(names.extension || {})
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$4);
        const asn1 = asn1js.compareSchema(schema, schema, TSTInfo.schema());
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result[TST_INFO_VERSION].valueBlock.valueDec;
        this.policy = asn1.result[TST_INFO_POLICY].valueBlock.toString();
        this.messageImprint = new MessageImprint({ schema: asn1.result[TST_INFO_MESSAGE_IMPRINT] });
        this.serialNumber = asn1.result[TST_INFO_SERIAL_NUMBER];
        this.genTime = asn1.result[TST_INFO_GEN_TIME].toDate();
        if (TST_INFO_ACCURACY in asn1.result)
            this.accuracy = new Accuracy({ schema: asn1.result[TST_INFO_ACCURACY] });
        if (TST_INFO_ORDERING in asn1.result)
            this.ordering = asn1.result[TST_INFO_ORDERING].valueBlock.value;
        if (TST_INFO_NONCE in asn1.result)
            this.nonce = asn1.result[TST_INFO_NONCE];
        if (TST_INFO_TSA in asn1.result)
            this.tsa = new GeneralName({ schema: asn1.result[TST_INFO_TSA] });
        if (TST_INFO_EXTENSIONS in asn1.result)
            this.extensions = Array.from(asn1.result[TST_INFO_EXTENSIONS], element => new Extension({ schema: element }));
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        outputArray.push(new asn1js.ObjectIdentifier({ value: this.policy }));
        outputArray.push(this.messageImprint.toSchema());
        outputArray.push(this.serialNumber);
        outputArray.push(new asn1js.GeneralizedTime({ valueDate: this.genTime }));
        if (this.accuracy)
            outputArray.push(this.accuracy.toSchema());
        if (this.ordering !== undefined)
            outputArray.push(new asn1js.Boolean({ value: this.ordering }));
        if (this.nonce)
            outputArray.push(this.nonce);
        if (this.tsa) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: [this.tsa.toSchema()]
            }));
        }
        if (this.extensions) {
            outputArray.push(new asn1js.Constructed({
                optional: true,
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: Array.from(this.extensions, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            version: this.version,
            policy: this.policy,
            messageImprint: this.messageImprint.toJSON(),
            serialNumber: this.serialNumber.toJSON(),
            genTime: this.genTime
        };
        if (this.accuracy)
            res.accuracy = this.accuracy.toJSON();
        if (this.ordering !== undefined)
            res.ordering = this.ordering;
        if (this.nonce)
            res.nonce = this.nonce.toJSON();
        if (this.tsa)
            res.tsa = this.tsa.toJSON();
        if (this.extensions)
            res.extensions = Array.from(this.extensions, o => o.toJSON());
        return res;
    }
    async verify(params, crypto = getCrypto(true)) {
        if (!params.data) {
            throw new Error("\"data\" is a mandatory attribute for TST_INFO verification");
        }
        const data = params.data;
        if (params.notBefore) {
            if (this.genTime < params.notBefore)
                throw new Error("Generation time for TSTInfo object is less than notBefore value");
        }
        if (params.notAfter) {
            if (this.genTime > params.notAfter)
                throw new Error("Generation time for TSTInfo object is more than notAfter value");
        }
        const shaAlgorithm = crypto.getAlgorithmByOID(this.messageImprint.hashAlgorithm.algorithmId, true, "MessageImprint.hashAlgorithm");
        const hash = await crypto.digest(shaAlgorithm.name, new Uint8Array(data));
        return pvtsutils.BufferSourceConverter.isEqual(hash, this.messageImprint.hashedMessage.valueBlock.valueHexView);
    }
}
TSTInfo.CLASS_NAME = "TSTInfo";

const VERSION$2 = "version";
const DIGEST_ALGORITHMS = "digestAlgorithms";
const ENCAP_CONTENT_INFO = "encapContentInfo";
const CERTIFICATES = "certificates";
const CRLS = "crls";
const SIGNER_INFOS = "signerInfos";
const OCSPS = "ocsps";
const SIGNED_DATA = "SignedData";
const SIGNED_DATA_VERSION = `${SIGNED_DATA}.${VERSION$2}`;
const SIGNED_DATA_DIGEST_ALGORITHMS = `${SIGNED_DATA}.${DIGEST_ALGORITHMS}`;
const SIGNED_DATA_ENCAP_CONTENT_INFO = `${SIGNED_DATA}.${ENCAP_CONTENT_INFO}`;
const SIGNED_DATA_CERTIFICATES = `${SIGNED_DATA}.${CERTIFICATES}`;
const SIGNED_DATA_CRLS = `${SIGNED_DATA}.${CRLS}`;
const SIGNED_DATA_SIGNER_INFOS = `${SIGNED_DATA}.${SIGNER_INFOS}`;
const CLEAR_PROPS$3 = [
    SIGNED_DATA_VERSION,
    SIGNED_DATA_DIGEST_ALGORITHMS,
    SIGNED_DATA_ENCAP_CONTENT_INFO,
    SIGNED_DATA_CERTIFICATES,
    SIGNED_DATA_CRLS,
    SIGNED_DATA_SIGNER_INFOS
];
class SignedDataVerifyError extends Error {
    constructor({ message, code = 0, date = new Date(), signatureVerified = null, signerCertificate = null, signerCertificateVerified = null, timestampSerial = null, certificatePath = [], }) {
        super(message);
        this.name = "SignedDataVerifyError";
        this.date = date;
        this.code = code;
        this.timestampSerial = timestampSerial;
        this.signatureVerified = signatureVerified;
        this.signerCertificate = signerCertificate;
        this.signerCertificateVerified = signerCertificateVerified;
        this.certificatePath = certificatePath;
    }
}
class SignedData extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$2, SignedData.defaultValues(VERSION$2));
        this.digestAlgorithms = pvutils.getParametersValue(parameters, DIGEST_ALGORITHMS, SignedData.defaultValues(DIGEST_ALGORITHMS));
        this.encapContentInfo = pvutils.getParametersValue(parameters, ENCAP_CONTENT_INFO, SignedData.defaultValues(ENCAP_CONTENT_INFO));
        if (CERTIFICATES in parameters) {
            this.certificates = pvutils.getParametersValue(parameters, CERTIFICATES, SignedData.defaultValues(CERTIFICATES));
        }
        if (CRLS in parameters) {
            this.crls = pvutils.getParametersValue(parameters, CRLS, SignedData.defaultValues(CRLS));
        }
        if (OCSPS in parameters) {
            this.ocsps = pvutils.getParametersValue(parameters, OCSPS, SignedData.defaultValues(OCSPS));
        }
        this.signerInfos = pvutils.getParametersValue(parameters, SIGNER_INFOS, SignedData.defaultValues(SIGNER_INFOS));
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$2:
                return 0;
            case DIGEST_ALGORITHMS:
                return [];
            case ENCAP_CONTENT_INFO:
                return new EncapsulatedContentInfo();
            case CERTIFICATES:
                return [];
            case CRLS:
                return [];
            case OCSPS:
                return [];
            case SIGNER_INFOS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$2:
                return (memberValue === SignedData.defaultValues(VERSION$2));
            case ENCAP_CONTENT_INFO:
                return EncapsulatedContentInfo.compareWithDefault("eContentType", memberValue.eContentType) &&
                    EncapsulatedContentInfo.compareWithDefault("eContent", memberValue.eContent);
            case DIGEST_ALGORITHMS:
            case CERTIFICATES:
            case CRLS:
            case OCSPS:
            case SIGNER_INFOS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        if (names.optional === undefined) {
            names.optional = false;
        }
        return (new asn1js.Sequence({
            name: (names.blockName || SIGNED_DATA),
            optional: names.optional,
            value: [
                new asn1js.Integer({ name: (names.version || SIGNED_DATA_VERSION) }),
                new asn1js.Set({
                    value: [
                        new asn1js.Repeated({
                            name: (names.digestAlgorithms || SIGNED_DATA_DIGEST_ALGORITHMS),
                            value: AlgorithmIdentifier.schema()
                        })
                    ]
                }),
                EncapsulatedContentInfo.schema(names.encapContentInfo || {
                    names: {
                        blockName: SIGNED_DATA_ENCAP_CONTENT_INFO
                    }
                }),
                new asn1js.Constructed({
                    name: (names.certificates || SIGNED_DATA_CERTIFICATES),
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: CertificateSet.schema().valueBlock.value
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 1
                    },
                    value: RevocationInfoChoices.schema(names.crls || {
                        names: {
                            crls: SIGNED_DATA_CRLS
                        }
                    }).valueBlock.value
                }),
                new asn1js.Set({
                    value: [
                        new asn1js.Repeated({
                            name: (names.signerInfos || SIGNED_DATA_SIGNER_INFOS),
                            value: SignerInfo.schema()
                        })
                    ]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$3);
        const asn1 = asn1js.compareSchema(schema, schema, SignedData.schema());
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result[SIGNED_DATA_VERSION].valueBlock.valueDec;
        if (SIGNED_DATA_DIGEST_ALGORITHMS in asn1.result)
            this.digestAlgorithms = Array.from(asn1.result[SIGNED_DATA_DIGEST_ALGORITHMS], algorithm => new AlgorithmIdentifier({ schema: algorithm }));
        this.encapContentInfo = new EncapsulatedContentInfo({ schema: asn1.result[SIGNED_DATA_ENCAP_CONTENT_INFO] });
        if (SIGNED_DATA_CERTIFICATES in asn1.result) {
            const certificateSet = new CertificateSet({
                schema: new asn1js.Set({
                    value: asn1.result[SIGNED_DATA_CERTIFICATES].valueBlock.value
                })
            });
            this.certificates = certificateSet.certificates.slice(0);
        }
        if (SIGNED_DATA_CRLS in asn1.result) {
            this.crls = Array.from(asn1.result[SIGNED_DATA_CRLS], (crl) => {
                if (crl.idBlock.tagClass === 1)
                    return new CertificateRevocationList({ schema: crl });
                crl.idBlock.tagClass = 1;
                crl.idBlock.tagNumber = 16;
                return new OtherRevocationInfoFormat({ schema: crl });
            });
        }
        if (SIGNED_DATA_SIGNER_INFOS in asn1.result)
            this.signerInfos = Array.from(asn1.result[SIGNED_DATA_SIGNER_INFOS], signerInfoSchema => new SignerInfo({ schema: signerInfoSchema }));
    }
    toSchema(encodeFlag = false) {
        const outputArray = [];
        if ((this.certificates && this.certificates.length && this.certificates.some(o => o instanceof OtherCertificateFormat))
            || (this.crls && this.crls.length && this.crls.some(o => o instanceof OtherRevocationInfoFormat))) {
            this.version = 5;
        }
        else if (this.certificates && this.certificates.length && this.certificates.some(o => o instanceof AttributeCertificateV2)) {
            this.version = 4;
        }
        else if ((this.certificates && this.certificates.length && this.certificates.some(o => o instanceof AttributeCertificateV1))
            || this.signerInfos.some(o => o.version === 3)
            || this.encapContentInfo.eContentType !== SignedData.ID_DATA) {
            this.version = 3;
        }
        else {
            this.version = 1;
        }
        outputArray.push(new asn1js.Integer({ value: this.version }));
        outputArray.push(new asn1js.Set({
            value: Array.from(this.digestAlgorithms, algorithm => algorithm.toSchema())
        }));
        outputArray.push(this.encapContentInfo.toSchema());
        if (this.certificates) {
            const certificateSet = new CertificateSet({ certificates: this.certificates });
            const certificateSetSchema = certificateSet.toSchema();
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: certificateSetSchema.valueBlock.value
            }));
        }
        if (this.crls) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 1
                },
                value: Array.from(this.crls, crl => {
                    if (crl instanceof OtherRevocationInfoFormat) {
                        const crlSchema = crl.toSchema();
                        crlSchema.idBlock.tagClass = 3;
                        crlSchema.idBlock.tagNumber = 1;
                        return crlSchema;
                    }
                    return crl.toSchema(encodeFlag);
                })
            }));
        }
        outputArray.push(new asn1js.Set({
            value: Array.from(this.signerInfos, signerInfo => signerInfo.toSchema())
        }));
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            version: this.version,
            digestAlgorithms: Array.from(this.digestAlgorithms, algorithm => algorithm.toJSON()),
            encapContentInfo: this.encapContentInfo.toJSON(),
            signerInfos: Array.from(this.signerInfos, signerInfo => signerInfo.toJSON()),
        };
        if (this.certificates) {
            res.certificates = Array.from(this.certificates, certificate => certificate.toJSON());
        }
        if (this.crls) {
            res.crls = Array.from(this.crls, crl => crl.toJSON());
        }
        return res;
    }
    async verify({ signer = (-1), data = (EMPTY_BUFFER), trustedCerts = [], checkDate = (new Date()), checkChain = false, passedWhenNotRevValues = false, extendedMode = false, findOrigin = null, findIssuer = null } = {}, crypto = getCrypto(true)) {
        let signerCert = null;
        let timestampSerial = null;
        try {
            let messageDigestValue = EMPTY_BUFFER;
            let shaAlgorithm = EMPTY_STRING;
            let certificatePath = [];
            const signerInfo = this.signerInfos[signer];
            if (!signerInfo) {
                throw new SignedDataVerifyError({
                    date: checkDate,
                    code: 1,
                    message: "Unable to get signer by supplied index",
                });
            }
            if (!this.certificates) {
                throw new SignedDataVerifyError({
                    date: checkDate,
                    code: 2,
                    message: "No certificates attached to this signed data",
                });
            }
            if (signerInfo.sid instanceof IssuerAndSerialNumber) {
                for (const certificate of this.certificates) {
                    if (!(certificate instanceof Certificate))
                        continue;
                    if ((certificate.issuer.isEqual(signerInfo.sid.issuer)) &&
                        (certificate.serialNumber.isEqual(signerInfo.sid.serialNumber))) {
                        signerCert = certificate;
                        break;
                    }
                }
            }
            else {
                const sid = signerInfo.sid;
                const keyId = sid.idBlock.isConstructed
                    ? sid.valueBlock.value[0].valueBlock.valueHex
                    : sid.valueBlock.valueHex;
                for (const certificate of this.certificates) {
                    if (!(certificate instanceof Certificate)) {
                        continue;
                    }
                    const digest = await crypto.digest({ name: "sha-1" }, certificate.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView);
                    if (pvutils.isEqualBuffer(digest, keyId)) {
                        signerCert = certificate;
                        break;
                    }
                }
            }
            if (!signerCert) {
                throw new SignedDataVerifyError({
                    date: checkDate,
                    code: 3,
                    message: "Unable to find signer certificate",
                });
            }
            if (this.encapContentInfo.eContentType === id_eContentType_TSTInfo) {
                if (!this.encapContentInfo.eContent) {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 15,
                        message: "Error during verification: TSTInfo eContent is empty",
                        signatureVerified: null,
                        signerCertificate: signerCert,
                        timestampSerial,
                        signerCertificateVerified: true
                    });
                }
                let tstInfo;
                try {
                    tstInfo = TSTInfo.fromBER(this.encapContentInfo.eContent.valueBlock.valueHexView);
                }
                catch {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 15,
                        message: "Error during verification: TSTInfo wrong ASN.1 schema ",
                        signatureVerified: null,
                        signerCertificate: signerCert,
                        timestampSerial,
                        signerCertificateVerified: true
                    });
                }
                checkDate = tstInfo.genTime;
                timestampSerial = tstInfo.serialNumber.valueBlock.valueHexView.slice().buffer;
                if (data.byteLength === 0) {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 4,
                        message: "Missed detached data input array",
                    });
                }
                if (!(await tstInfo.verify({ data }, crypto))) {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 15,
                        message: "Error during verification: TSTInfo verification is failed",
                        signatureVerified: false,
                        signerCertificate: signerCert,
                        timestampSerial,
                        signerCertificateVerified: true
                    });
                }
            }
            if (checkChain) {
                const certs = this.certificates.filter(certificate => (certificate instanceof Certificate && !!checkCA(certificate, signerCert)));
                const chainParams = {
                    checkDate,
                    certs,
                    trustedCerts,
                };
                if (findIssuer) {
                    chainParams.findIssuer = findIssuer;
                }
                if (findOrigin) {
                    chainParams.findOrigin = findOrigin;
                }
                const chainEngine = new CertificateChainValidationEngine(chainParams);
                chainEngine.certs.push(signerCert);
                if (this.crls) {
                    for (const crl of this.crls) {
                        if ("thisUpdate" in crl)
                            chainEngine.crls.push(crl);
                        else {
                            if (crl.otherRevInfoFormat === id_PKIX_OCSP_Basic)
                                chainEngine.ocsps.push(new BasicOCSPResponse({ schema: crl.otherRevInfo }));
                        }
                    }
                }
                if (this.ocsps) {
                    chainEngine.ocsps.push(...(this.ocsps));
                }
                const verificationResult = await chainEngine.verify({ passedWhenNotRevValues }, crypto)
                    .catch(e => {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 5,
                        message: `Validation of signer's certificate failed with error: ${((e instanceof Object) ? e.resultMessage : e)}`,
                        signerCertificate: signerCert,
                        signerCertificateVerified: false
                    });
                });
                if (verificationResult.certificatePath) {
                    certificatePath = verificationResult.certificatePath;
                }
                if (!verificationResult.result)
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 5,
                        message: `Validation of signer's certificate failed: ${verificationResult.resultMessage}`,
                        signerCertificate: signerCert,
                        signerCertificateVerified: false
                    });
            }
            const signerInfoHashAlgorithm = crypto.getAlgorithmByOID(signerInfo.digestAlgorithm.algorithmId);
            if (!("name" in signerInfoHashAlgorithm)) {
                throw new SignedDataVerifyError({
                    date: checkDate,
                    code: 7,
                    message: `Unsupported signature algorithm: ${signerInfo.digestAlgorithm.algorithmId}`,
                    signerCertificate: signerCert,
                    signerCertificateVerified: true
                });
            }
            shaAlgorithm = signerInfoHashAlgorithm.name;
            const eContent = this.encapContentInfo.eContent;
            if (eContent) {
                if ((eContent.idBlock.tagClass === 1) &&
                    (eContent.idBlock.tagNumber === 4)) {
                    data = eContent.getValue();
                }
                else
                    data = eContent.valueBlock.valueBeforeDecodeView.slice().buffer;
            }
            else {
                if (data.byteLength === 0) {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 8,
                        message: "Missed detached data input array",
                        signerCertificate: signerCert,
                        signerCertificateVerified: true
                    });
                }
            }
            if (signerInfo.signedAttrs) {
                let foundContentType = false;
                let foundMessageDigest = false;
                for (const attribute of signerInfo.signedAttrs.attributes) {
                    if (attribute.type === "1.2.840.113549.1.9.3")
                        foundContentType = true;
                    if (attribute.type === "1.2.840.113549.1.9.4") {
                        foundMessageDigest = true;
                        messageDigestValue = attribute.values[0].valueBlock.valueHex;
                    }
                    if (foundContentType && foundMessageDigest)
                        break;
                }
                if (foundContentType === false) {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 9,
                        message: "Attribute \"content-type\" is a mandatory attribute for \"signed attributes\"",
                        signerCertificate: signerCert,
                        signerCertificateVerified: true
                    });
                }
                if (foundMessageDigest === false) {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 10,
                        message: "Attribute \"message-digest\" is a mandatory attribute for \"signed attributes\"",
                        signatureVerified: null,
                        signerCertificate: signerCert,
                        signerCertificateVerified: true
                    });
                }
            }
            if (signerInfo.signedAttrs) {
                const messageDigest = await crypto.digest(shaAlgorithm, new Uint8Array(data));
                if (!pvutils.isEqualBuffer(messageDigest, messageDigestValue)) {
                    throw new SignedDataVerifyError({
                        date: checkDate,
                        code: 15,
                        message: "Error during verification: Message digest doesn't match",
                        signatureVerified: null,
                        signerCertificate: signerCert,
                        timestampSerial,
                        signerCertificateVerified: true
                    });
                }
                data = signerInfo.signedAttrs.encodedValue;
            }
            const verifyResult = signerInfo.signatureAlgorithm.algorithmId === "1.2.840.113549.1.1.1"
                ? await crypto.verifyWithPublicKey(data, signerInfo.signature, signerCert.subjectPublicKeyInfo, signerInfo.signatureAlgorithm, shaAlgorithm)
                : await crypto.verifyWithPublicKey(data, signerInfo.signature, signerCert.subjectPublicKeyInfo, signerInfo.signatureAlgorithm);
            if (extendedMode) {
                return {
                    date: checkDate,
                    code: 14,
                    message: EMPTY_STRING,
                    signatureVerified: verifyResult,
                    signerCertificate: signerCert,
                    timestampSerial,
                    signerCertificateVerified: true,
                    certificatePath
                };
            }
            else {
                return verifyResult;
            }
        }
        catch (e) {
            if (e instanceof SignedDataVerifyError) {
                throw e;
            }
            throw new SignedDataVerifyError({
                date: checkDate,
                code: 15,
                message: `Error during verification: ${e instanceof Error ? e.message : e}`,
                signatureVerified: null,
                signerCertificate: signerCert,
                timestampSerial,
                signerCertificateVerified: true
            });
        }
    }
    async sign(privateKey, signerIndex, hashAlgorithm = "SHA-1", data = (EMPTY_BUFFER), crypto = getCrypto(true)) {
        var _a;
        if (!privateKey)
            throw new Error("Need to provide a private key for signing");
        const signerInfo = this.signerInfos[signerIndex];
        if (!signerInfo) {
            throw new RangeError("SignerInfo index is out of range");
        }
        if (!((_a = signerInfo.signedAttrs) === null || _a === void 0 ? void 0 : _a.attributes.length) && "hash" in privateKey.algorithm && "hash" in privateKey.algorithm && privateKey.algorithm.hash) {
            hashAlgorithm = privateKey.algorithm.hash.name;
        }
        const hashAlgorithmOID = crypto.getOIDByAlgorithm({ name: hashAlgorithm }, true, "hashAlgorithm");
        if ((this.digestAlgorithms.filter(algorithm => algorithm.algorithmId === hashAlgorithmOID)).length === 0) {
            this.digestAlgorithms.push(new AlgorithmIdentifier({
                algorithmId: hashAlgorithmOID,
                algorithmParams: new asn1js.Null()
            }));
        }
        signerInfo.digestAlgorithm = new AlgorithmIdentifier({
            algorithmId: hashAlgorithmOID,
            algorithmParams: new asn1js.Null()
        });
        const signatureParams = await crypto.getSignatureParameters(privateKey, hashAlgorithm);
        const parameters = signatureParams.parameters;
        signerInfo.signatureAlgorithm = signatureParams.signatureAlgorithm;
        if (signerInfo.signedAttrs) {
            if (signerInfo.signedAttrs.encodedValue.byteLength !== 0)
                data = signerInfo.signedAttrs.encodedValue;
            else {
                data = signerInfo.signedAttrs.toSchema().toBER();
                const view = pvtsutils.BufferSourceConverter.toUint8Array(data);
                view[0] = 0x31;
            }
        }
        else {
            const eContent = this.encapContentInfo.eContent;
            if (eContent) {
                if ((eContent.idBlock.tagClass === 1) &&
                    (eContent.idBlock.tagNumber === 4)) {
                    data = eContent.getValue();
                }
                else
                    data = eContent.valueBlock.valueBeforeDecodeView.slice().buffer;
            }
            else {
                if (data.byteLength === 0)
                    throw new Error("Missed detached data input array");
            }
        }
        const signature = await crypto.signWithPrivateKey(data, privateKey, parameters);
        signerInfo.signature = new asn1js.OctetString({ valueHex: signature });
    }
}
SignedData.CLASS_NAME = "SignedData";
SignedData.ID_DATA = id_ContentType_Data;

const VERSION$1 = "version";
const AUTH_SAFE = "authSafe";
const MAC_DATA = "macData";
const PARSED_VALUE = "parsedValue";
const CLERA_PROPS = [
    VERSION$1,
    AUTH_SAFE,
    MAC_DATA
];
class PFX extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION$1, PFX.defaultValues(VERSION$1));
        this.authSafe = pvutils.getParametersValue(parameters, AUTH_SAFE, PFX.defaultValues(AUTH_SAFE));
        if (MAC_DATA in parameters) {
            this.macData = pvutils.getParametersValue(parameters, MAC_DATA, PFX.defaultValues(MAC_DATA));
        }
        if (PARSED_VALUE in parameters) {
            this.parsedValue = pvutils.getParametersValue(parameters, PARSED_VALUE, PFX.defaultValues(PARSED_VALUE));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION$1:
                return 3;
            case AUTH_SAFE:
                return (new ContentInfo());
            case MAC_DATA:
                return (new MacData());
            case PARSED_VALUE:
                return {};
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION$1:
                return (memberValue === PFX.defaultValues(memberName));
            case AUTH_SAFE:
                return ((ContentInfo.compareWithDefault("contentType", memberValue.contentType)) &&
                    (ContentInfo.compareWithDefault("content", memberValue.content)));
            case MAC_DATA:
                return ((MacData.compareWithDefault("mac", memberValue.mac)) &&
                    (MacData.compareWithDefault("macSalt", memberValue.macSalt)) &&
                    (MacData.compareWithDefault("iterations", memberValue.iterations)));
            case PARSED_VALUE:
                return ((memberValue instanceof Object) && (Object.keys(memberValue).length === 0));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.version || VERSION$1) }),
                ContentInfo.schema(names.authSafe || {
                    names: {
                        blockName: AUTH_SAFE
                    }
                }),
                MacData.schema(names.macData || {
                    names: {
                        blockName: MAC_DATA,
                        optional: true
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLERA_PROPS);
        const asn1 = asn1js.compareSchema(schema, schema, PFX.schema({
            names: {
                version: VERSION$1,
                authSafe: {
                    names: {
                        blockName: AUTH_SAFE
                    }
                },
                macData: {
                    names: {
                        blockName: MAC_DATA
                    }
                }
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result.version.valueBlock.valueDec;
        this.authSafe = new ContentInfo({ schema: asn1.result.authSafe });
        if (MAC_DATA in asn1.result)
            this.macData = new MacData({ schema: asn1.result.macData });
    }
    toSchema() {
        const outputArray = [
            new asn1js.Integer({ value: this.version }),
            this.authSafe.toSchema()
        ];
        if (this.macData) {
            outputArray.push(this.macData.toSchema());
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const output = {
            version: this.version,
            authSafe: this.authSafe.toJSON()
        };
        if (this.macData) {
            output.macData = this.macData.toJSON();
        }
        return output;
    }
    async makeInternalValues(parameters = {}, crypto = getCrypto(true)) {
        ArgumentError.assert(parameters, "parameters", "object");
        if (!this.parsedValue) {
            throw new Error("Please call \"parseValues\" function first in order to make \"parsedValue\" data");
        }
        ParameterError.assertEmpty(this.parsedValue.integrityMode, "integrityMode", "parsedValue");
        ParameterError.assertEmpty(this.parsedValue.authenticatedSafe, "authenticatedSafe", "parsedValue");
        switch (this.parsedValue.integrityMode) {
            case 0:
                {
                    if (!("iterations" in parameters))
                        throw new ParameterError("iterations");
                    ParameterError.assertEmpty(parameters.pbkdf2HashAlgorithm, "pbkdf2HashAlgorithm");
                    ParameterError.assertEmpty(parameters.hmacHashAlgorithm, "hmacHashAlgorithm");
                    ParameterError.assertEmpty(parameters.password, "password");
                    const saltBuffer = new ArrayBuffer(64);
                    const saltView = new Uint8Array(saltBuffer);
                    crypto.getRandomValues(saltView);
                    const data = this.parsedValue.authenticatedSafe.toSchema().toBER(false);
                    this.authSafe = new ContentInfo({
                        contentType: ContentInfo.DATA,
                        content: new asn1js.OctetString({ valueHex: data })
                    });
                    const result = await crypto.stampDataWithPassword({
                        password: parameters.password,
                        hashAlgorithm: parameters.hmacHashAlgorithm,
                        salt: saltBuffer,
                        iterationCount: parameters.iterations,
                        contentToStamp: data
                    });
                    this.macData = new MacData({
                        mac: new DigestInfo({
                            digestAlgorithm: new AlgorithmIdentifier({
                                algorithmId: crypto.getOIDByAlgorithm({ name: parameters.hmacHashAlgorithm }, true, "hmacHashAlgorithm"),
                            }),
                            digest: new asn1js.OctetString({ valueHex: result })
                        }),
                        macSalt: new asn1js.OctetString({ valueHex: saltBuffer }),
                        iterations: parameters.iterations
                    });
                }
                break;
            case 1:
                {
                    if (!("signingCertificate" in parameters)) {
                        throw new ParameterError("signingCertificate");
                    }
                    ParameterError.assertEmpty(parameters.privateKey, "privateKey");
                    ParameterError.assertEmpty(parameters.hashAlgorithm, "hashAlgorithm");
                    const toBeSigned = this.parsedValue.authenticatedSafe.toSchema().toBER(false);
                    const cmsSigned = new SignedData({
                        version: 1,
                        encapContentInfo: new EncapsulatedContentInfo({
                            eContentType: "1.2.840.113549.1.7.1",
                            eContent: new asn1js.OctetString({ valueHex: toBeSigned })
                        }),
                        certificates: [parameters.signingCertificate]
                    });
                    const result = await crypto.digest({ name: parameters.hashAlgorithm }, new Uint8Array(toBeSigned));
                    const signedAttr = [];
                    signedAttr.push(new Attribute({
                        type: "1.2.840.113549.1.9.3",
                        values: [
                            new asn1js.ObjectIdentifier({ value: "1.2.840.113549.1.7.1" })
                        ]
                    }));
                    signedAttr.push(new Attribute({
                        type: "1.2.840.113549.1.9.5",
                        values: [
                            new asn1js.UTCTime({ valueDate: new Date() })
                        ]
                    }));
                    signedAttr.push(new Attribute({
                        type: "1.2.840.113549.1.9.4",
                        values: [
                            new asn1js.OctetString({ valueHex: result })
                        ]
                    }));
                    cmsSigned.signerInfos.push(new SignerInfo({
                        version: 1,
                        sid: new IssuerAndSerialNumber({
                            issuer: parameters.signingCertificate.issuer,
                            serialNumber: parameters.signingCertificate.serialNumber
                        }),
                        signedAttrs: new SignedAndUnsignedAttributes({
                            type: 0,
                            attributes: signedAttr
                        })
                    }));
                    await cmsSigned.sign(parameters.privateKey, 0, parameters.hashAlgorithm, undefined, crypto);
                    this.authSafe = new ContentInfo({
                        contentType: "1.2.840.113549.1.7.2",
                        content: cmsSigned.toSchema(true)
                    });
                }
                break;
            default:
                throw new Error(`Parameter "integrityMode" has unknown value: ${this.parsedValue.integrityMode}`);
        }
    }
    async parseInternalValues(parameters, crypto = getCrypto(true)) {
        ArgumentError.assert(parameters, "parameters", "object");
        if (parameters.checkIntegrity === undefined) {
            parameters.checkIntegrity = true;
        }
        this.parsedValue = {};
        switch (this.authSafe.contentType) {
            case ContentInfo.DATA:
                {
                    ParameterError.assertEmpty(parameters.password, "password");
                    this.parsedValue.integrityMode = 0;
                    ArgumentError.assert(this.authSafe.content, "authSafe.content", asn1js.OctetString);
                    const authSafeContent = this.authSafe.content.getValue();
                    this.parsedValue.authenticatedSafe = AuthenticatedSafe.fromBER(authSafeContent);
                    if (parameters.checkIntegrity) {
                        if (!this.macData) {
                            throw new Error("Absent \"macData\" value, can not check PKCS#12 data integrity");
                        }
                        const hashAlgorithm = crypto.getAlgorithmByOID(this.macData.mac.digestAlgorithm.algorithmId, true, "digestAlgorithm");
                        const result = await crypto.verifyDataStampedWithPassword({
                            password: parameters.password,
                            hashAlgorithm: hashAlgorithm.name,
                            salt: BufferSourceConverter.toArrayBuffer(this.macData.macSalt.valueBlock.valueHexView),
                            iterationCount: this.macData.iterations || 1,
                            contentToVerify: authSafeContent,
                            signatureToVerify: BufferSourceConverter.toArrayBuffer(this.macData.mac.digest.valueBlock.valueHexView),
                        });
                        if (!result) {
                            throw new Error("Integrity for the PKCS#12 data is broken!");
                        }
                    }
                }
                break;
            case ContentInfo.SIGNED_DATA:
                {
                    this.parsedValue.integrityMode = 1;
                    const cmsSigned = new SignedData({ schema: this.authSafe.content });
                    const eContent = cmsSigned.encapContentInfo.eContent;
                    ParameterError.assert(eContent, "eContent", "cmsSigned.encapContentInfo");
                    ArgumentError.assert(eContent, "eContent", asn1js.OctetString);
                    const data = eContent.getValue();
                    this.parsedValue.authenticatedSafe = AuthenticatedSafe.fromBER(data);
                    const ok = await cmsSigned.verify({ signer: 0, checkChain: false }, crypto);
                    if (!ok) {
                        throw new Error("Integrity for the PKCS#12 data is broken!");
                    }
                }
                break;
            default:
                throw new Error(`Incorrect value for "this.authSafe.contentType": ${this.authSafe.contentType}`);
        }
    }
}
PFX.CLASS_NAME = "PFX";

const STATUS$1 = "status";
const STATUS_STRINGS = "statusStrings";
const FAIL_INFO = "failInfo";
const CLEAR_PROPS$2 = [
    STATUS$1,
    STATUS_STRINGS,
    FAIL_INFO
];
var PKIStatus;
(function (PKIStatus) {
    PKIStatus[PKIStatus["granted"] = 0] = "granted";
    PKIStatus[PKIStatus["grantedWithMods"] = 1] = "grantedWithMods";
    PKIStatus[PKIStatus["rejection"] = 2] = "rejection";
    PKIStatus[PKIStatus["waiting"] = 3] = "waiting";
    PKIStatus[PKIStatus["revocationWarning"] = 4] = "revocationWarning";
    PKIStatus[PKIStatus["revocationNotification"] = 5] = "revocationNotification";
})(PKIStatus || (PKIStatus = {}));
class PKIStatusInfo extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.status = pvutils.getParametersValue(parameters, STATUS$1, PKIStatusInfo.defaultValues(STATUS$1));
        if (STATUS_STRINGS in parameters) {
            this.statusStrings = pvutils.getParametersValue(parameters, STATUS_STRINGS, PKIStatusInfo.defaultValues(STATUS_STRINGS));
        }
        if (FAIL_INFO in parameters) {
            this.failInfo = pvutils.getParametersValue(parameters, FAIL_INFO, PKIStatusInfo.defaultValues(FAIL_INFO));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case STATUS$1:
                return 2;
            case STATUS_STRINGS:
                return [];
            case FAIL_INFO:
                return new asn1js.BitString();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case STATUS$1:
                return (memberValue === PKIStatusInfo.defaultValues(memberName));
            case STATUS_STRINGS:
                return (memberValue.length === 0);
            case FAIL_INFO:
                return (memberValue.isEqual(PKIStatusInfo.defaultValues(memberName)));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || EMPTY_STRING),
            value: [
                new asn1js.Integer({ name: (names.status || EMPTY_STRING) }),
                new asn1js.Sequence({
                    optional: true,
                    value: [
                        new asn1js.Repeated({
                            name: (names.statusStrings || EMPTY_STRING),
                            value: new asn1js.Utf8String()
                        })
                    ]
                }),
                new asn1js.BitString({
                    name: (names.failInfo || EMPTY_STRING),
                    optional: true
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$2);
        const asn1 = asn1js.compareSchema(schema, schema, PKIStatusInfo.schema({
            names: {
                status: STATUS$1,
                statusStrings: STATUS_STRINGS,
                failInfo: FAIL_INFO
            }
        }));
        AsnError.assertSchema(asn1, this.className);
        const _status = asn1.result.status;
        if ((_status.valueBlock.isHexOnly === true) ||
            (_status.valueBlock.valueDec < 0) ||
            (_status.valueBlock.valueDec > 5))
            throw new Error("PKIStatusInfo \"status\" has invalid value");
        this.status = _status.valueBlock.valueDec;
        if (STATUS_STRINGS in asn1.result)
            this.statusStrings = asn1.result.statusStrings;
        if (FAIL_INFO in asn1.result)
            this.failInfo = asn1.result.failInfo;
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.status }));
        if (this.statusStrings) {
            outputArray.push(new asn1js.Sequence({
                optional: true,
                value: this.statusStrings
            }));
        }
        if (this.failInfo) {
            outputArray.push(this.failInfo);
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            status: this.status
        };
        if (this.statusStrings) {
            res.statusStrings = Array.from(this.statusStrings, o => o.toJSON());
        }
        if (this.failInfo) {
            res.failInfo = this.failInfo.toJSON();
        }
        return res;
    }
}
PKIStatusInfo.CLASS_NAME = "PKIStatusInfo";

const VERSION = "version";
const MESSAGE_IMPRINT = "messageImprint";
const REQ_POLICY = "reqPolicy";
const NONCE = "nonce";
const CERT_REQ = "certReq";
const EXTENSIONS = "extensions";
const TIME_STAMP_REQ = "TimeStampReq";
const TIME_STAMP_REQ_VERSION = `${TIME_STAMP_REQ}.${VERSION}`;
const TIME_STAMP_REQ_MESSAGE_IMPRINT = `${TIME_STAMP_REQ}.${MESSAGE_IMPRINT}`;
const TIME_STAMP_REQ_POLICY = `${TIME_STAMP_REQ}.${REQ_POLICY}`;
const TIME_STAMP_REQ_NONCE = `${TIME_STAMP_REQ}.${NONCE}`;
const TIME_STAMP_REQ_CERT_REQ = `${TIME_STAMP_REQ}.${CERT_REQ}`;
const TIME_STAMP_REQ_EXTENSIONS = `${TIME_STAMP_REQ}.${EXTENSIONS}`;
const CLEAR_PROPS$1 = [
    TIME_STAMP_REQ_VERSION,
    TIME_STAMP_REQ_MESSAGE_IMPRINT,
    TIME_STAMP_REQ_POLICY,
    TIME_STAMP_REQ_NONCE,
    TIME_STAMP_REQ_CERT_REQ,
    TIME_STAMP_REQ_EXTENSIONS,
];
class TimeStampReq extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.version = pvutils.getParametersValue(parameters, VERSION, TimeStampReq.defaultValues(VERSION));
        this.messageImprint = pvutils.getParametersValue(parameters, MESSAGE_IMPRINT, TimeStampReq.defaultValues(MESSAGE_IMPRINT));
        if (REQ_POLICY in parameters) {
            this.reqPolicy = pvutils.getParametersValue(parameters, REQ_POLICY, TimeStampReq.defaultValues(REQ_POLICY));
        }
        if (NONCE in parameters) {
            this.nonce = pvutils.getParametersValue(parameters, NONCE, TimeStampReq.defaultValues(NONCE));
        }
        if (CERT_REQ in parameters) {
            this.certReq = pvutils.getParametersValue(parameters, CERT_REQ, TimeStampReq.defaultValues(CERT_REQ));
        }
        if (EXTENSIONS in parameters) {
            this.extensions = pvutils.getParametersValue(parameters, EXTENSIONS, TimeStampReq.defaultValues(EXTENSIONS));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case VERSION:
                return 0;
            case MESSAGE_IMPRINT:
                return new MessageImprint();
            case REQ_POLICY:
                return EMPTY_STRING;
            case NONCE:
                return new asn1js.Integer();
            case CERT_REQ:
                return false;
            case EXTENSIONS:
                return [];
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case VERSION:
            case REQ_POLICY:
            case CERT_REQ:
                return (memberValue === TimeStampReq.defaultValues(memberName));
            case MESSAGE_IMPRINT:
                return ((MessageImprint.compareWithDefault("hashAlgorithm", memberValue.hashAlgorithm)) &&
                    (MessageImprint.compareWithDefault("hashedMessage", memberValue.hashedMessage)));
            case NONCE:
                return (memberValue.isEqual(TimeStampReq.defaultValues(memberName)));
            case EXTENSIONS:
                return (memberValue.length === 0);
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || TIME_STAMP_REQ),
            value: [
                new asn1js.Integer({ name: (names.version || TIME_STAMP_REQ_VERSION) }),
                MessageImprint.schema(names.messageImprint || {
                    names: {
                        blockName: TIME_STAMP_REQ_MESSAGE_IMPRINT
                    }
                }),
                new asn1js.ObjectIdentifier({
                    name: (names.reqPolicy || TIME_STAMP_REQ_POLICY),
                    optional: true
                }),
                new asn1js.Integer({
                    name: (names.nonce || TIME_STAMP_REQ_NONCE),
                    optional: true
                }),
                new asn1js.Boolean({
                    name: (names.certReq || TIME_STAMP_REQ_CERT_REQ),
                    optional: true
                }),
                new asn1js.Constructed({
                    optional: true,
                    idBlock: {
                        tagClass: 3,
                        tagNumber: 0
                    },
                    value: [new asn1js.Repeated({
                            name: (names.extensions || TIME_STAMP_REQ_EXTENSIONS),
                            value: Extension.schema()
                        })]
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS$1);
        const asn1 = asn1js.compareSchema(schema, schema, TimeStampReq.schema());
        AsnError.assertSchema(asn1, this.className);
        this.version = asn1.result[TIME_STAMP_REQ_VERSION].valueBlock.valueDec;
        this.messageImprint = new MessageImprint({ schema: asn1.result[TIME_STAMP_REQ_MESSAGE_IMPRINT] });
        if (TIME_STAMP_REQ_POLICY in asn1.result)
            this.reqPolicy = asn1.result[TIME_STAMP_REQ_POLICY].valueBlock.toString();
        if (TIME_STAMP_REQ_NONCE in asn1.result)
            this.nonce = asn1.result[TIME_STAMP_REQ_NONCE];
        if (TIME_STAMP_REQ_CERT_REQ in asn1.result)
            this.certReq = asn1.result[TIME_STAMP_REQ_CERT_REQ].valueBlock.value;
        if (TIME_STAMP_REQ_EXTENSIONS in asn1.result)
            this.extensions = Array.from(asn1.result[TIME_STAMP_REQ_EXTENSIONS], element => new Extension({ schema: element }));
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(new asn1js.Integer({ value: this.version }));
        outputArray.push(this.messageImprint.toSchema());
        if (this.reqPolicy)
            outputArray.push(new asn1js.ObjectIdentifier({ value: this.reqPolicy }));
        if (this.nonce)
            outputArray.push(this.nonce);
        if ((CERT_REQ in this) && (TimeStampReq.compareWithDefault(CERT_REQ, this.certReq) === false))
            outputArray.push(new asn1js.Boolean({ value: this.certReq }));
        if (this.extensions) {
            outputArray.push(new asn1js.Constructed({
                idBlock: {
                    tagClass: 3,
                    tagNumber: 0
                },
                value: Array.from(this.extensions, o => o.toSchema())
            }));
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            version: this.version,
            messageImprint: this.messageImprint.toJSON()
        };
        if (this.reqPolicy !== undefined)
            res.reqPolicy = this.reqPolicy;
        if (this.nonce !== undefined)
            res.nonce = this.nonce.toJSON();
        if ((this.certReq !== undefined) && (TimeStampReq.compareWithDefault(CERT_REQ, this.certReq) === false))
            res.certReq = this.certReq;
        if (this.extensions) {
            res.extensions = Array.from(this.extensions, o => o.toJSON());
        }
        return res;
    }
}
TimeStampReq.CLASS_NAME = "TimeStampReq";

const STATUS = "status";
const TIME_STAMP_TOKEN = "timeStampToken";
const TIME_STAMP_RESP = "TimeStampResp";
const TIME_STAMP_RESP_STATUS = `${TIME_STAMP_RESP}.${STATUS}`;
const TIME_STAMP_RESP_TOKEN = `${TIME_STAMP_RESP}.${TIME_STAMP_TOKEN}`;
const CLEAR_PROPS = [
    TIME_STAMP_RESP_STATUS,
    TIME_STAMP_RESP_TOKEN
];
class TimeStampResp extends PkiObject {
    constructor(parameters = {}) {
        super();
        this.status = pvutils.getParametersValue(parameters, STATUS, TimeStampResp.defaultValues(STATUS));
        if (TIME_STAMP_TOKEN in parameters) {
            this.timeStampToken = pvutils.getParametersValue(parameters, TIME_STAMP_TOKEN, TimeStampResp.defaultValues(TIME_STAMP_TOKEN));
        }
        if (parameters.schema) {
            this.fromSchema(parameters.schema);
        }
    }
    static defaultValues(memberName) {
        switch (memberName) {
            case STATUS:
                return new PKIStatusInfo();
            case TIME_STAMP_TOKEN:
                return new ContentInfo();
            default:
                return super.defaultValues(memberName);
        }
    }
    static compareWithDefault(memberName, memberValue) {
        switch (memberName) {
            case STATUS:
                return ((PKIStatusInfo.compareWithDefault(STATUS, memberValue.status)) &&
                    (("statusStrings" in memberValue) === false) &&
                    (("failInfo" in memberValue) === false));
            case TIME_STAMP_TOKEN:
                return ((memberValue.contentType === EMPTY_STRING) &&
                    (memberValue.content instanceof asn1js.Any));
            default:
                return super.defaultValues(memberName);
        }
    }
    static schema(parameters = {}) {
        const names = pvutils.getParametersValue(parameters, "names", {});
        return (new asn1js.Sequence({
            name: (names.blockName || TIME_STAMP_RESP),
            value: [
                PKIStatusInfo.schema(names.status || {
                    names: {
                        blockName: TIME_STAMP_RESP_STATUS
                    }
                }),
                ContentInfo.schema(names.timeStampToken || {
                    names: {
                        blockName: TIME_STAMP_RESP_TOKEN,
                        optional: true
                    }
                })
            ]
        }));
    }
    fromSchema(schema) {
        pvutils.clearProps(schema, CLEAR_PROPS);
        const asn1 = asn1js.compareSchema(schema, schema, TimeStampResp.schema());
        AsnError.assertSchema(asn1, this.className);
        this.status = new PKIStatusInfo({ schema: asn1.result[TIME_STAMP_RESP_STATUS] });
        if (TIME_STAMP_RESP_TOKEN in asn1.result)
            this.timeStampToken = new ContentInfo({ schema: asn1.result[TIME_STAMP_RESP_TOKEN] });
    }
    toSchema() {
        const outputArray = [];
        outputArray.push(this.status.toSchema());
        if (this.timeStampToken) {
            outputArray.push(this.timeStampToken.toSchema());
        }
        return (new asn1js.Sequence({
            value: outputArray
        }));
    }
    toJSON() {
        const res = {
            status: this.status.toJSON()
        };
        if (this.timeStampToken) {
            res.timeStampToken = this.timeStampToken.toJSON();
        }
        return res;
    }
    async sign(privateKey, hashAlgorithm, crypto = getCrypto(true)) {
        this.assertContentType();
        const signed = new SignedData({ schema: this.timeStampToken.content });
        return signed.sign(privateKey, 0, hashAlgorithm, undefined, crypto);
    }
    async verify(verificationParameters = { signer: 0, trustedCerts: [], data: EMPTY_BUFFER }, crypto = getCrypto(true)) {
        this.assertContentType();
        const signed = new SignedData({ schema: this.timeStampToken.content });
        return signed.verify(verificationParameters, crypto);
    }
    assertContentType() {
        if (!this.timeStampToken) {
            throw new Error("timeStampToken is absent in TSP response");
        }
        if (this.timeStampToken.contentType !== id_ContentType_SignedData) {
            throw new Error(`Wrong format of timeStampToken: ${this.timeStampToken.contentType}`);
        }
    }
}
TimeStampResp.CLASS_NAME = "TimeStampResp";

function initCryptoEngine() {
    if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
        let engineName = "webcrypto";
        if ("webkitSubtle" in globalThis.crypto) {
            engineName = "safari";
        }
        setEngine(engineName, new CryptoEngine({ name: engineName, crypto: globalThis.crypto }));
    }
    else if (typeof crypto !== "undefined" && "webcrypto" in crypto) {
        const name = "NodeJS ^15";
        const nodeCrypto = crypto.webcrypto;
        setEngine(name, new CryptoEngine({ name, crypto: nodeCrypto }));
    }
}

initCryptoEngine();

export { AbstractCryptoEngine, AccessDescription, Accuracy, AlgorithmIdentifier, AltName, ArgumentError, AsnError, AttCertValidityPeriod, Attribute, AttributeCertificateInfoV1, AttributeCertificateInfoV2, AttributeCertificateV1, AttributeCertificateV2, AttributeTypeAndValue, AuthenticatedSafe, AuthorityKeyIdentifier, BasicConstraints, BasicOCSPResponse, CAVersion, CRLBag, CRLDistributionPoints, CertBag, CertID, Certificate, CertificateChainValidationEngine, CertificatePolicies, CertificateRevocationList, CertificateSet, CertificateTemplate, CertificationRequest, ChainValidationCode, ChainValidationError, ContentInfo, CryptoEngine, DigestInfo, DistributionPoint, ECCCMSSharedInfo, ECNamedCurves, ECPrivateKey, ECPublicKey, EncapsulatedContentInfo, EncryptedContentInfo, EncryptedData, EnvelopedData, ExtKeyUsage, Extension, ExtensionValueFactory, Extensions, GeneralName, GeneralNames, GeneralSubtree, HASHED_MESSAGE, HASH_ALGORITHM, Holder, InfoAccess, IssuerAndSerialNumber, IssuerSerial, IssuingDistributionPoint, KEKIdentifier, KEKRecipientInfo, KeyAgreeRecipientIdentifier, KeyAgreeRecipientInfo, KeyBag, KeyTransRecipientInfo, MICROS, MILLIS, MacData, MessageImprint, NameConstraints, OCSPRequest, OCSPResponse, ObjectDigestInfo, OriginatorIdentifierOrKey, OriginatorInfo, OriginatorPublicKey, OtherCertificateFormat, OtherKeyAttribute, OtherPrimeInfo, OtherRecipientInfo, OtherRevocationInfoFormat, PBES2Params, PBKDF2Params, PFX, PKCS8ShroudedKeyBag, PKIStatus, PKIStatusInfo, POLICY_IDENTIFIER, POLICY_QUALIFIERS, ParameterError, PasswordRecipientinfo, PkiObject, PolicyConstraints, PolicyInformation, PolicyMapping, PolicyMappings, PolicyQualifierInfo, PrivateKeyInfo, PrivateKeyUsagePeriod, PublicKeyInfo, QCStatement, QCStatements, RDN, RSAESOAEPParams, RSAPrivateKey, RSAPublicKey, RSASSAPSSParams, RecipientEncryptedKey, RecipientEncryptedKeys, RecipientIdentifier, RecipientInfo, RecipientKeyIdentifier, RelativeDistinguishedNames, Request, ResponseBytes, ResponseData, RevocationInfoChoices, RevokedCertificate, SECONDS, SafeBag, SafeBagValueFactory, SafeContents, SecretBag, Signature, SignedAndUnsignedAttributes, SignedCertificateTimestamp, SignedCertificateTimestampList, SignedData, SignedDataVerifyError, SignerInfo, SingleResponse, SubjectDirectoryAttributes, TBSRequest, TSTInfo, TYPE$4 as TYPE, TYPE_AND_VALUES, Time, TimeStampReq, TimeStampResp, TimeType, V2Form, VALUE$5 as VALUE, VALUE_BEFORE_DECODE, checkCA, createCMSECDSASignature, createECDSASignatureFromCMS, engine, getAlgorithmByOID, getAlgorithmParameters, getCrypto, getEngine, getHashAlgorithm, getOIDByAlgorithm, getRandomValues, id_AnyPolicy, id_AuthorityInfoAccess, id_AuthorityKeyIdentifier, id_BaseCRLNumber, id_BasicConstraints, id_CRLBag_X509CRL, id_CRLDistributionPoints, id_CRLNumber, id_CRLReason, id_CertBag_AttributeCertificate, id_CertBag_SDSICertificate, id_CertBag_X509Certificate, id_CertificateIssuer, id_CertificatePolicies, id_ContentType_Data, id_ContentType_EncryptedData, id_ContentType_EnvelopedData, id_ContentType_SignedData, id_ExtKeyUsage, id_FreshestCRL, id_InhibitAnyPolicy, id_InvalidityDate, id_IssuerAltName, id_IssuingDistributionPoint, id_KeyUsage, id_MicrosoftAppPolicies, id_MicrosoftCaVersion, id_MicrosoftCertTemplateV1, id_MicrosoftCertTemplateV2, id_MicrosoftPrevCaCertHash, id_NameConstraints, id_PKIX_OCSP_Basic, id_PolicyConstraints, id_PolicyMappings, id_PrivateKeyUsagePeriod, id_QCStatements, id_SignedCertificateTimestampList, id_SubjectAltName, id_SubjectDirectoryAttributes, id_SubjectInfoAccess, id_SubjectKeyIdentifier, id_ad, id_ad_caIssuers, id_ad_ocsp, id_eContentType_TSTInfo, id_pkix, id_sha1, id_sha256, id_sha384, id_sha512, kdf, setEngine, stringPrep, verifySCTsForCertificate };
