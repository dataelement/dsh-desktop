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
import { BitString, OctetString } from 'asn1js';
import * as bs from 'bytestreamjs';

type SchemaType = any;
type SchemaNames = {
    blockName?: string;
    optional?: boolean;
};
interface SchemaCompatible {
    /**
     * Converts parsed ASN.1 object into current class
     * @param schema
     */
    fromSchema(schema: SchemaType): void;
    /**
     * Convert current object to asn1js object and set correct values
     * @returns asn1js object
     */
    toSchema(): SchemaType;
    toJSON(): any;
}
interface SchemaConstructor {
    schema?: SchemaType;
}
/**
 * Parameters for schema generation
 */
interface SchemaParameters<N extends Record<string, any> = object> {
    names?: SchemaNames & N;
}

interface PkiObjectParameters {
    schema?: SchemaType;
}
interface PkiObjectConstructor<T extends PkiObject = PkiObject> {
    new (params: PkiObjectParameters): T;
    CLASS_NAME: string;
}
declare abstract class PkiObject {
    /**
     * Name of the class
     */
    static CLASS_NAME: string;
    /**
     * Returns block name
     * @returns Returns string block name
     */
    static blockName(): string;
    /**
     * Creates PKI object from the raw data
     * @param raw ASN.1 encoded raw data
     * @returns Initialized and filled current class object
     */
    static fromBER<T extends PkiObject>(this: PkiObjectConstructor<T>, raw: BufferSource): T;
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: string): any;
    /**
     * Returns value of pre-defined ASN.1 schema for current class
     * @param parameters Input parameters for the schema
     * @returns ASN.1 schema object
     */
    static schema(parameters?: SchemaParameters): SchemaType;
    get className(): string;
    /**
     * Converts parsed ASN.1 object into current class
     * @param schema ASN.1 schema
     */
    abstract fromSchema(schema: SchemaType): void;
    /**
     * Converts current object to ASN.1 object and sets correct values
     * @param encodeFlag If param equal to `false` then creates schema via decoding stored value. In other case creates schema via assembling from cached parts
     * @returns ASN.1 object
     */
    abstract toSchema(encodeFlag?: boolean): SchemaType;
    /**
     * Converts the class to JSON object
     * @returns JSON object
     */
    abstract toJSON(): any;
    toString(encoding?: "hex" | "base64" | "base64url"): string;
}

declare const TYPE$5 = "type";
declare const VALUE$6 = "value";
interface IGeneralName {
    /**
     * value type - from a tagged value (0 for "otherName", 1 for "rfc822Name" etc.)
     */
    type: number;
    /**
     * ASN.1 object having GeneralName value (type depends on TYPE value)
     */
    value: any;
}
type GeneralNameParameters = PkiObjectParameters & Partial<{
    type: 1 | 2 | 6;
    value: string;
} | {
    type: 0 | 3 | 4 | 7 | 8;
    value: any;
}>;
interface GeneralNameSchema {
    names?: {
        blockName?: string;
        directoryName?: object;
        builtInStandardAttributes?: object;
        otherName?: string;
        rfc822Name?: string;
        dNSName?: string;
        x400Address?: string;
        ediPartyName?: string;
        uniformResourceIdentifier?: string;
        iPAddress?: string;
        registeredID?: string;
    };
}
interface GeneralNameJson {
    type: number;
    value: string;
}
/**
 * Represents the GeneralName structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class GeneralName extends PkiObject implements IGeneralName {
    static CLASS_NAME: string;
    type: number;
    value: any;
    /**
     * Initializes a new instance of the {@link GeneralName} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: GeneralNameParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TYPE$5): number;
    static defaultValues(memberName: typeof VALUE$6): any;
    /**
     * Compares values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * GeneralName ::= Choice {
     *    otherName                       [0]     OtherName,
     *    rfc822Name                      [1]     IA5String,
     *    dNSName                         [2]     IA5String,
     *    x400Address                     [3]     ORAddress,
     *    directoryName                   [4]     value,
     *    ediPartyName                    [5]     EDIPartyName,
     *    uniformResourceIdentifier       [6]     IA5String,
     *    iPAddress                       [7]     OCTET STRING,
     *    registeredID                    [8]     OBJECT IDENTIFIER }
     *```
     */
    static schema(parameters?: GeneralNameSchema): asn1js.Choice;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Constructed | asn1js.IA5String | asn1js.ObjectIdentifier | asn1js.Choice;
    toJSON(): GeneralNameJson;
}

declare const ACCESS_METHOD = "accessMethod";
declare const ACCESS_LOCATION = "accessLocation";
interface IAccessDescription {
    /**
     * The type and format of the information are specified by the accessMethod field. This profile defines two accessMethod OIDs: id-ad-caIssuers and id-ad-ocsp
     */
    accessMethod: string;
    /**
     * The accessLocation field specifies the location of the information
     */
    accessLocation: GeneralName;
}
type AccessDescriptionParameters = PkiObjectParameters & Partial<IAccessDescription>;
/**
 * JSON representation of {@link AccessDescription}
 */
interface AccessDescriptionJson {
    accessMethod: string;
    accessLocation: GeneralNameJson;
}
/**
 * Represents the AccessDescription structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 *
 * The authority information access extension indicates how to access
 * information and services for the issuer of the certificate in which
 * the extension appears. Information and services may include on-line
 * validation services and CA policy data. This extension may be included in
 * end entity or CA certificates. Conforming CAs MUST mark this
 * extension as non-critical.
 */
declare class AccessDescription extends PkiObject implements IAccessDescription {
    static CLASS_NAME: string;
    accessMethod: string;
    accessLocation: GeneralName;
    /**
     * Initializes a new instance of the {@link AccessDescription} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AccessDescriptionParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ACCESS_METHOD): string;
    static defaultValues(memberName: typeof ACCESS_LOCATION): GeneralName;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AccessDescription ::= SEQUENCE {
     *    accessMethod          OBJECT IDENTIFIER,
     *    accessLocation        GeneralName  }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        accessMethod?: string;
        accessLocation?: GeneralNameSchema;
    }>): asn1js.Sequence;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AccessDescriptionJson;
}

declare const SECONDS = "seconds";
declare const MILLIS = "millis";
declare const MICROS = "micros";
interface IAccuracy {
    /**
     * Seconds
     */
    seconds?: number;
    /**
     * Milliseconds
     */
    millis?: number;
    /**
     * Microseconds
     */
    micros?: number;
}
type AccuracyParameters = PkiObjectParameters & Partial<IAccuracy>;
type AccuracySchema = SchemaParameters<{
    seconds?: string;
    millis?: string;
    micros?: string;
}>;
/**
 * JSON representation of {@link Accuracy}
 */
interface AccuracyJson {
    seconds?: number;
    millis?: number;
    micros?: number;
}
/**
 * Represents the time deviation around the UTC time contained in GeneralizedTime. Described in [RFC3161](https://www.ietf.org/rfc/rfc3161.txt)
 */
declare class Accuracy extends PkiObject implements IAccuracy {
    static CLASS_NAME: string;
    seconds?: number;
    millis?: number;
    micros?: number;
    /**
     * Initializes a new instance of the {@link Accuracy} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AccuracyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof SECONDS): number;
    static defaultValues(memberName: typeof MILLIS): number;
    static defaultValues(memberName: typeof MICROS): number;
    static defaultValues(memberName: string): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: typeof SECONDS | typeof MILLIS | typeof MICROS, memberValue: number): boolean;
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Accuracy ::= SEQUENCE {
     *    seconds        INTEGER              OPTIONAL,
     *    millis     [0] INTEGER  (1..999)    OPTIONAL,
     *    micros     [1] INTEGER  (1..999)    OPTIONAL  }
     *```
     */
    static schema(parameters?: AccuracySchema): any;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AccuracyJson;
}

declare const ALGORITHM_ID = "algorithmId";
declare const ALGORITHM_PARAMS = "algorithmParams";
interface IAlgorithmIdentifier {
    /**
     * ObjectIdentifier for algorithm (string representation)
     */
    algorithmId: string;
    /**
     * Any algorithm parameters
     */
    algorithmParams?: any;
}
type AlgorithmIdentifierParameters = PkiObjectParameters & Partial<IAlgorithmIdentifier>;
/**
 * JSON representation of {@link AlgorithmIdentifier}
 */
interface AlgorithmIdentifierJson {
    algorithmId: string;
    algorithmParams?: any;
}
type AlgorithmIdentifierSchema = SchemaParameters<{
    algorithmIdentifier?: string;
    algorithmParams?: string;
}>;
/**
 * Represents the AlgorithmIdentifier structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class AlgorithmIdentifier extends PkiObject implements IAlgorithmIdentifier {
    static CLASS_NAME: string;
    algorithmId: string;
    algorithmParams?: any;
    /**
     * Initializes a new instance of the {@link AlgorithmIdentifier} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AlgorithmIdentifierParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ALGORITHM_ID): string;
    static defaultValues(memberName: typeof ALGORITHM_PARAMS): any;
    /**
     * Compares values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AlgorithmIdentifier ::= Sequence  {
     *    algorithm               OBJECT IDENTIFIER,
     *    parameters              ANY DEFINED BY algorithm OPTIONAL  }
     *```
     */
    static schema(parameters?: AlgorithmIdentifierSchema): any;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AlgorithmIdentifierJson;
    /**
     * Checks that two "AlgorithmIdentifiers" are equal
     * @param algorithmIdentifier
     */
    isEqual(algorithmIdentifier: unknown): boolean;
}

declare const ALT_NAMES = "altNames";
interface IAltName {
    /**
     * Array of alternative names in GeneralName type
     */
    altNames: GeneralName[];
}
type AltNameParameters = PkiObjectParameters & Partial<IAltName>;
interface AltNameJson {
    altNames: GeneralNameJson[];
}
/**
 * Represents the AltName structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class AltName extends PkiObject implements IAltName {
    static CLASS_NAME: string;
    altNames: GeneralName[];
    /**
     * Initializes a new instance of the {@link AltName} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AltNameParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ALT_NAMES): GeneralName[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AltName ::= GeneralNames
     *```
     */
    static schema(parameters?: SchemaParameters<{
        altNames?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AltNameJson;
}

declare const TYPE$4 = "type";
declare const VALUES$1 = "values";
interface IAttribute {
    /**
     * Specifies type of attribute value
     */
    type: string;
    /**
     * List of attribute values
     */
    values: any[];
}
type AttributeParameters = PkiObjectParameters & Partial<IAttribute>;
type AttributeSchema = SchemaParameters<{
    setName?: string;
    type?: string;
    values?: string;
}>;
interface AttributeJson {
    type: string;
    values: any[];
}
/**
 * Represents the Attribute structure described in [RFC2986](https://datatracker.ietf.org/doc/html/rfc2986)
 */
declare class Attribute extends PkiObject implements IAttribute {
    static CLASS_NAME: string;
    type: string;
    values: any[];
    /**
     * Initializes a new instance of the {@link Attribute} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AttributeParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TYPE$4): string;
    static defaultValues(memberName: typeof VALUES$1): any[];
    /**
     * Compares values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Attribute { ATTRIBUTE:IOSet } ::= SEQUENCE {
     *    type   ATTRIBUTE.&id({IOSet}),
     *    values SET SIZE(1..MAX) OF ATTRIBUTE.&Type({IOSet}{@type})
     * }
     *```
     */
    static schema(parameters?: AttributeSchema): asn1js.Sequence;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AttributeJson;
}

declare const NOT_BEFORE_TIME = "notBeforeTime";
declare const NOT_AFTER_TIME = "notAfterTime";
interface IAttCertValidityPeriod {
    notBeforeTime: Date;
    notAfterTime: Date;
}
type AttCertValidityPeriodParameters = PkiObjectParameters & Partial<IAttCertValidityPeriod>;
type AttCertValidityPeriodSchema = SchemaParameters<{
    notBeforeTime?: string;
    notAfterTime?: string;
}>;
interface AttCertValidityPeriodJson {
    notBeforeTime: Date;
    notAfterTime: Date;
}
/**
 * Represents the AttCertValidityPeriod structure described in [RFC5755 Section 4.1](https://datatracker.ietf.org/doc/html/rfc5755#section-4.1)
 */
declare class AttCertValidityPeriod extends PkiObject implements IAttCertValidityPeriod {
    static CLASS_NAME: string;
    notBeforeTime: Date;
    notAfterTime: Date;
    /**
     * Initializes a new instance of the {@link AttCertValidityPeriod} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AttCertValidityPeriodParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof NOT_BEFORE_TIME): Date;
    static defaultValues(memberName: typeof NOT_AFTER_TIME): Date;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AttCertValidityPeriod ::= SEQUENCE {
     *   notBeforeTime  GeneralizedTime,
     *   notAfterTime   GeneralizedTime
     * }
     *```
     */
    static schema(parameters?: AttCertValidityPeriodSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AttCertValidityPeriodJson;
}

declare const NAMES = "names";
interface IGeneralNames {
    names: GeneralName[];
}
type GeneralNamesParameters = PkiObjectParameters & Partial<IGeneralNames>;
type GeneralNamesSchema = SchemaParameters<{
    generalNames?: string;
}>;
interface GeneralNamesJson {
    names: GeneralNameJson[];
}
/**
 * Represents the GeneralNames structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class GeneralNames extends PkiObject implements IGeneralNames {
    static CLASS_NAME: string;
    /**
     * Array of "general names"
     */
    names: GeneralName[];
    /**
     * Initializes a new instance of the {@link GeneralNames} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: GeneralNamesParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof NAMES): GeneralName[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * GeneralNames ::= SEQUENCE SIZE (1..MAX) OF GeneralName
     * ```
     *
     * @param parameters Input parameters for the schema
     * @param optional Flag would be element optional or not
     * @returns ASN.1 schema object
     */
    static schema(parameters?: GeneralNamesSchema, optional?: boolean): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): GeneralNamesJson;
}

type ExtensionParsedValue = (SchemaCompatible & {
    parsingError?: string;
}) | SchemaType;
interface ExtensionValueType {
    name: string;
    type: ExtensionValueConstructor;
}
interface ExtensionValueConstructor {
    new (params?: {
        schema: any;
    }): SchemaCompatible;
}
declare class ExtensionValueFactory {
    static types?: Record<string, ExtensionValueType>;
    private static getItems;
    static fromBER(id: string, raw: BufferSource): ExtensionParsedValue | null;
    static find(id: string): ExtensionValueType | null;
    static register(id: string, name: string, type: ExtensionValueConstructor): void;
}

declare const EXTN_ID = "extnID";
declare const CRITICAL = "critical";
declare const EXTN_VALUE = "extnValue";
declare const PARSED_VALUE$5 = "parsedValue";
interface IExtension {
    extnID: string;
    critical: boolean;
    extnValue: asn1js.OctetString;
    parsedValue?: ExtensionParsedValue;
}
interface ExtensionConstructorParameters {
    extnID?: string;
    critical?: boolean;
    extnValue?: ArrayBuffer;
    parsedValue?: ExtensionParsedValue;
}
type ExtensionParameters = PkiObjectParameters & ExtensionConstructorParameters;
type ExtensionSchema = SchemaParameters<{
    extnID?: string;
    critical?: string;
    extnValue?: string;
}>;
interface ExtensionJson {
    extnID: string;
    extnValue: asn1js.OctetStringJson;
    critical?: boolean;
    parsedValue?: any;
}
/**
 * Represents the Extension structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class Extension extends PkiObject implements IExtension {
    static CLASS_NAME: string;
    extnID: string;
    critical: boolean;
    extnValue: asn1js.OctetString;
    private _parsedValue?;
    get parsedValue(): ExtensionParsedValue | undefined;
    set parsedValue(value: ExtensionParsedValue | undefined);
    /**
     * Initializes a new instance of the {@link Extension} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ExtensionParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof EXTN_ID): string;
    static defaultValues(memberName: typeof CRITICAL): boolean;
    static defaultValues(memberName: typeof EXTN_VALUE): asn1js.OctetString;
    static defaultValues(memberName: typeof PARSED_VALUE$5): ExtensionParsedValue;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Extension ::= SEQUENCE  {
     *    extnID      OBJECT IDENTIFIER,
     *    critical    BOOLEAN DEFAULT FALSE,
     *    extnValue   OCTET STRING
     * }
     *```
     */
    static schema(parameters?: ExtensionSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ExtensionJson;
}

declare const EXTENSIONS$6 = "extensions";
interface IExtensions {
    /**
     * List of extensions
     */
    extensions: Extension[];
}
type ExtensionsParameters = PkiObjectParameters & Partial<IExtensions>;
type ExtensionsSchema = SchemaParameters<{
    extensions?: string;
    extension?: ExtensionSchema;
}>;
interface ExtensionsJson {
    extensions: ExtensionJson[];
}
/**
 * Represents the Extensions structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class Extensions extends PkiObject implements IExtensions {
    static CLASS_NAME: string;
    extensions: Extension[];
    /**
     * Initializes a new instance of the {@link Extensions} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ExtensionsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof EXTENSIONS$6): Extension[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Extensions ::= SEQUENCE SIZE (1..MAX) OF Extension
     * ```
     *
     * @param parameters Input parameters for the schema
     * @param optional Flag that current schema should be optional
     * @returns ASN.1 schema object
     */
    static schema(parameters?: ExtensionsSchema, optional?: boolean): asn1js.Sequence;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ExtensionsJson;
}

declare const ISSUER$5 = "issuer";
declare const SERIAL_NUMBER$6 = "serialNumber";
declare const ISSUER_UID = "issuerUID";
interface IIssuerSerial {
    /**
     * Issuer name
     */
    issuer: GeneralNames;
    /**
     * Serial number
     */
    serialNumber: asn1js.Integer;
    /**
     * Issuer unique identifier
     */
    issuerUID?: asn1js.BitString;
}
type IssuerSerialParameters = PkiObjectParameters & Partial<IIssuerSerial>;
interface IssuerSerialJson {
    issuer: GeneralNamesJson;
    serialNumber: asn1js.IntegerJson;
    issuerUID?: asn1js.BitStringJson;
}
/**
 * Represents the IssuerSerial structure described in [RFC5755](https://datatracker.ietf.org/doc/html/rfc5755)
 */
declare class IssuerSerial extends PkiObject implements IIssuerSerial {
    static CLASS_NAME: string;
    issuer: GeneralNames;
    serialNumber: asn1js.Integer;
    issuerUID?: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link IssuerSerial} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: IssuerSerialParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ISSUER$5): GeneralNames;
    static defaultValues(memberName: typeof SERIAL_NUMBER$6): asn1js.Integer;
    static defaultValues(memberName: typeof ISSUER_UID): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * IssuerSerial ::= SEQUENCE {
     *     issuer         GeneralNames,
     *     serial         CertificateSerialNumber,
     *     issuerUID      UniqueIdentifier OPTIONAL
     * }
     *
     * CertificateSerialNumber ::= INTEGER
     * UniqueIdentifier ::= BIT STRING
     *```
     */
    static schema(parameters?: SchemaParameters<{
        issuer?: GeneralNamesSchema;
        serialNumber?: string;
        issuerUID?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): IssuerSerialJson;
}

declare const VERSION$k = "version";
declare const BASE_CERTIFICATE_ID$2 = "baseCertificateID";
declare const SUBJECT_NAME = "subjectName";
declare const ISSUER$4 = "issuer";
declare const SIGNATURE$7 = "signature";
declare const SERIAL_NUMBER$5 = "serialNumber";
declare const ATTR_CERT_VALIDITY_PERIOD$1 = "attrCertValidityPeriod";
declare const ATTRIBUTES$4 = "attributes";
declare const ISSUER_UNIQUE_ID$2 = "issuerUniqueID";
declare const EXTENSIONS$5 = "extensions";
interface IAttributeCertificateInfoV1 {
    /**
     * The version field MUST have the value of v2
     */
    version: number;
    baseCertificateID?: IssuerSerial;
    subjectName?: GeneralNames;
    issuer: GeneralNames;
    /**
     * Contains the algorithm identifier used to validate the AC signature
     */
    signature: AlgorithmIdentifier;
    serialNumber: asn1js.Integer;
    /**
     * Specifies the period for which the AC issuer certifies that the binding between
     * the holder and the attributes fields will be valid
     */
    attrCertValidityPeriod: AttCertValidityPeriod;
    /**
     * The attributes field gives information about the AC holder
     */
    attributes: Attribute[];
    /**
     * Issuer unique identifier
     */
    issuerUniqueID?: asn1js.BitString;
    /**
     * The extensions field generally gives information about the AC as opposed
     * to information about the AC holder
     */
    extensions?: Extensions;
}
interface AttributeCertificateInfoV1Json {
    version: number;
    baseCertificateID?: IssuerSerialJson;
    subjectName?: GeneralNamesJson;
    issuer: GeneralNamesJson;
    signature: AlgorithmIdentifierJson;
    serialNumber: asn1js.IntegerJson;
    attrCertValidityPeriod: AttCertValidityPeriodJson;
    attributes: AttributeJson[];
    issuerUniqueID: asn1js.BitStringJson;
    extensions: ExtensionsJson;
}
type AttributeCertificateInfoV1Parameters = PkiObjectParameters & Partial<IAttributeCertificateInfoV1>;
type AttributeCertificateInfoV1Schema = SchemaParameters<{
    version?: string;
    baseCertificateID?: string;
    subjectName?: string;
    signature?: AlgorithmIdentifierSchema;
    issuer?: string;
    attrCertValidityPeriod?: AttCertValidityPeriodSchema;
    serialNumber?: string;
    attributes?: string;
    issuerUniqueID?: string;
    extensions?: ExtensionsSchema;
}>;
/**
 * Represents the AttributeCertificateInfoV1 structure described in [RFC5755](https://datatracker.ietf.org/doc/html/rfc5755)
 */
declare class AttributeCertificateInfoV1 extends PkiObject implements IAttributeCertificateInfoV1 {
    static CLASS_NAME: string;
    version: number;
    baseCertificateID?: IssuerSerial;
    subjectName?: GeneralNames;
    issuer: GeneralNames;
    signature: AlgorithmIdentifier;
    serialNumber: asn1js.Integer;
    attrCertValidityPeriod: AttCertValidityPeriod;
    attributes: Attribute[];
    issuerUniqueID?: asn1js.BitString;
    extensions?: Extensions;
    /**
     * Initializes a new instance of the {@link AttributeCertificateInfoV1} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AttributeCertificateInfoV1Parameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$k): number;
    static defaultValues(memberName: typeof BASE_CERTIFICATE_ID$2): IssuerSerial;
    static defaultValues(memberName: typeof SUBJECT_NAME): GeneralNames;
    static defaultValues(memberName: typeof ISSUER$4): GeneralNames;
    static defaultValues(memberName: typeof SIGNATURE$7): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SERIAL_NUMBER$5): asn1js.Integer;
    static defaultValues(memberName: typeof ATTR_CERT_VALIDITY_PERIOD$1): AttCertValidityPeriod;
    static defaultValues(memberName: typeof ATTRIBUTES$4): Attribute[];
    static defaultValues(memberName: typeof ISSUER_UNIQUE_ID$2): asn1js.BitString;
    static defaultValues(memberName: typeof EXTENSIONS$5): Extensions;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AttributeCertificateInfo ::= SEQUENCE {
     *   version Version DEFAULT v1,
     *   subject CHOICE {
     *     baseCertificateID [0] IssuerSerial, -- associated with a Public Key Certificate
     *     subjectName [1] GeneralNames }, -- associated with a name
     *   issuer GeneralNames, -- CA issuing the attribute certificate
     *   signature AlgorithmIdentifier,
     *   serialNumber CertificateSerialNumber,
     *   attrCertValidityPeriod AttCertValidityPeriod,
     *   attributes SEQUENCE OF Attribute,
     *   issuerUniqueID UniqueIdentifier OPTIONAL,
     *   extensions Extensions OPTIONAL
     * }
     *```
     */
    static schema(parameters?: AttributeCertificateInfoV1Schema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AttributeCertificateInfoV1Json;
}

declare const ACINFO$1 = "acinfo";
declare const SIGNATURE_ALGORITHM$8 = "signatureAlgorithm";
declare const SIGNATURE_VALUE$4 = "signatureValue";
interface IAttributeCertificateV1 {
    /**
     * Attribute certificate information
     */
    acinfo: AttributeCertificateInfoV1;
    /**
     * Signature algorithm
     */
    signatureAlgorithm: AlgorithmIdentifier;
    /**
     * Signature value
     */
    signatureValue: asn1js.BitString;
}
interface AttributeCertificateV1Json {
    acinfo: AttributeCertificateInfoV1Json;
    signatureAlgorithm: AlgorithmIdentifierJson;
    signatureValue: asn1js.BitStringJson;
}
type AttributeCertificateV1Parameters = PkiObjectParameters & Partial<IAttributeCertificateV1>;
/**
 * Class from X.509:1997
 */
declare class AttributeCertificateV1 extends PkiObject implements IAttributeCertificateV1 {
    static CLASS_NAME: string;
    acinfo: AttributeCertificateInfoV1;
    signatureAlgorithm: AlgorithmIdentifier;
    signatureValue: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link AttributeCertificateV1} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AttributeCertificateV1Parameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ACINFO$1): AttributeCertificateInfoV1;
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$8): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE_VALUE$4): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AttributeCertificate ::= SEQUENCE {
     *   acinfo               AttributeCertificateInfoV1,
     *   signatureAlgorithm   AlgorithmIdentifier,
     *   signatureValue       BIT STRING
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        acinfo?: AttributeCertificateInfoV1Schema;
        signatureAlgorithm?: AlgorithmIdentifierSchema;
        signatureValue?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AttributeCertificateV1Json;
}

declare const DIGESTED_OBJECT_TYPE = "digestedObjectType";
declare const OTHER_OBJECT_TYPE_ID = "otherObjectTypeID";
declare const DIGEST_ALGORITHM$2 = "digestAlgorithm";
declare const OBJECT_DIGEST = "objectDigest";
interface IObjectDigestInfo {
    digestedObjectType: asn1js.Enumerated;
    otherObjectTypeID?: asn1js.ObjectIdentifier;
    digestAlgorithm: AlgorithmIdentifier;
    objectDigest: asn1js.BitString;
}
type ObjectDigestInfoParameters = PkiObjectParameters & Partial<IObjectDigestInfo>;
interface ObjectDigestInfoJson {
    digestedObjectType: asn1js.EnumeratedJson;
    otherObjectTypeID?: asn1js.ObjectIdentifierJson;
    digestAlgorithm: AlgorithmIdentifierJson;
    objectDigest: asn1js.BitStringJson;
}
/**
 * Represents the ObjectDigestInfo structure described in [RFC5755](https://datatracker.ietf.org/doc/html/rfc5755)
 */
declare class ObjectDigestInfo extends PkiObject implements IObjectDigestInfo {
    static CLASS_NAME: string;
    digestedObjectType: asn1js.Enumerated;
    otherObjectTypeID?: asn1js.ObjectIdentifier;
    digestAlgorithm: AlgorithmIdentifier;
    objectDigest: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link ObjectDigestInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ObjectDigestInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof DIGESTED_OBJECT_TYPE): asn1js.Enumerated;
    static defaultValues(memberName: typeof OTHER_OBJECT_TYPE_ID): asn1js.ObjectIdentifier;
    static defaultValues(memberName: typeof DIGEST_ALGORITHM$2): AlgorithmIdentifier;
    static defaultValues(memberName: typeof OBJECT_DIGEST): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * ObjectDigestInfo ::= SEQUENCE {
     *   digestedObjectType  ENUMERATED {
     *     publicKey            (0),
     *     publicKeyCert        (1),
     *     otherObjectTypes     (2) },
     *   -- otherObjectTypes MUST NOT
     *   -- be used in this profile
     *   otherObjectTypeID   OBJECT IDENTIFIER OPTIONAL,
     *   digestAlgorithm     AlgorithmIdentifier,
     *   objectDigest        BIT STRING
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        digestedObjectType?: string;
        otherObjectTypeID?: string;
        digestAlgorithm?: AlgorithmIdentifierSchema;
        objectDigest?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ObjectDigestInfoJson;
}

declare const ISSUER_NAME = "issuerName";
declare const BASE_CERTIFICATE_ID$1 = "baseCertificateID";
declare const OBJECT_DIGEST_INFO$1 = "objectDigestInfo";
interface IV2Form {
    issuerName?: GeneralNames;
    baseCertificateID?: IssuerSerial;
    objectDigestInfo?: ObjectDigestInfo;
}
type V2FormParameters = PkiObjectParameters & Partial<IV2Form>;
interface V2FormJson {
    issuerName?: GeneralNamesJson;
    baseCertificateID?: IssuerSerialJson;
    objectDigestInfo?: ObjectDigestInfoJson;
}
/**
 * Represents the V2Form structure described in [RFC5755](https://datatracker.ietf.org/doc/html/rfc5755)
 */
declare class V2Form extends PkiObject implements IV2Form {
    static CLASS_NAME: string;
    issuerName?: GeneralNames;
    baseCertificateID?: IssuerSerial;
    objectDigestInfo?: ObjectDigestInfo;
    /**
     * Initializes a new instance of the {@link V2Form} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: V2FormParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ISSUER_NAME): GeneralNames;
    static defaultValues(memberName: typeof BASE_CERTIFICATE_ID$1): IssuerSerial;
    static defaultValues(memberName: typeof OBJECT_DIGEST_INFO$1): ObjectDigestInfo;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * V2Form ::= SEQUENCE {
     *   issuerName            GeneralNames  OPTIONAL,
     *   baseCertificateID     [0] IssuerSerial  OPTIONAL,
     *   objectDigestInfo      [1] ObjectDigestInfo  OPTIONAL
     *     -- issuerName MUST be present in this profile
     *     -- baseCertificateID and objectDigestInfo MUST NOT
     *     -- be present in this profile
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        issuerName?: string;
        baseCertificateID?: string;
        objectDigestInfo?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): V2FormJson;
}

declare const BASE_CERTIFICATE_ID = "baseCertificateID";
declare const ENTITY_NAME = "entityName";
declare const OBJECT_DIGEST_INFO = "objectDigestInfo";
interface IHolder {
    baseCertificateID?: IssuerSerial;
    entityName?: GeneralNames;
    objectDigestInfo?: ObjectDigestInfo;
}
type HolderParameters = PkiObjectParameters & Partial<IHolder>;
type HolderSchema = SchemaParameters<{
    baseCertificateID?: string;
    entityName?: string;
    objectDigestInfo?: string;
}>;
interface HolderJson {
    baseCertificateID?: IssuerSerialJson;
    entityName?: GeneralNamesJson;
    objectDigestInfo?: ObjectDigestInfoJson;
}
/**
 * Represents the Holder structure described in [RFC5755](https://datatracker.ietf.org/doc/html/rfc5755)
 */
declare class Holder extends PkiObject implements IHolder {
    static CLASS_NAME: string;
    baseCertificateID?: IssuerSerial;
    entityName?: GeneralNames;
    objectDigestInfo?: ObjectDigestInfo;
    /**
     * Initializes a new instance of the {@link AttributeCertificateInfoV1} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: HolderParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof BASE_CERTIFICATE_ID): IssuerSerial;
    static defaultValues(memberName: typeof ENTITY_NAME): GeneralNames;
    static defaultValues(memberName: typeof OBJECT_DIGEST_INFO): ObjectDigestInfo;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Holder ::= SEQUENCE {
     *   baseCertificateID   [0] IssuerSerial OPTIONAL,
     *       -- the issuer and serial number of
     *       -- the holder's Public Key Certificate
     *   entityName          [1] GeneralNames OPTIONAL,
     *       -- the name of the claimant or role
     *   objectDigestInfo    [2] ObjectDigestInfo OPTIONAL
     *       -- used to directly authenticate the holder,
     *       -- for example, an executable
     * }
     *```
     */
    static schema(parameters?: HolderSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): HolderJson;
}

declare const VERSION$j = "version";
declare const HOLDER = "holder";
declare const ISSUER$3 = "issuer";
declare const SIGNATURE$6 = "signature";
declare const SERIAL_NUMBER$4 = "serialNumber";
declare const ATTR_CERT_VALIDITY_PERIOD = "attrCertValidityPeriod";
declare const ATTRIBUTES$3 = "attributes";
declare const ISSUER_UNIQUE_ID$1 = "issuerUniqueID";
declare const EXTENSIONS$4 = "extensions";
interface IAttributeCertificateInfoV2 {
    version: number;
    holder: Holder;
    issuer: GeneralNames | V2Form;
    signature: AlgorithmIdentifier;
    serialNumber: asn1js.Integer;
    attrCertValidityPeriod: AttCertValidityPeriod;
    attributes: Attribute[];
    issuerUniqueID?: asn1js.BitString;
    extensions?: Extensions;
}
type AttributeCertificateInfoV2Parameters = PkiObjectParameters & Partial<AttributeCertificateInfoV2>;
type AttributeCertificateInfoV2Schema = SchemaParameters<{
    version?: string;
    holder?: HolderSchema;
    issuer?: string;
    signature?: AlgorithmIdentifierSchema;
    serialNumber?: string;
    attrCertValidityPeriod?: AttCertValidityPeriodSchema;
    attributes?: string;
    issuerUniqueID?: string;
    extensions?: ExtensionsSchema;
}>;
interface AttributeCertificateInfoV2Json {
    version: number;
    holder: HolderJson;
    issuer: GeneralNamesJson | V2FormJson;
    signature: AlgorithmIdentifierJson;
    serialNumber: asn1js.IntegerJson;
    attrCertValidityPeriod: AttCertValidityPeriodJson;
    attributes: AttributeJson[];
    issuerUniqueID?: asn1js.BitStringJson;
    extensions?: ExtensionsJson;
}
/**
 * Represents the AttributeCertificateInfoV2 structure described in [RFC5755](https://datatracker.ietf.org/doc/html/rfc5755)
 */
declare class AttributeCertificateInfoV2 extends PkiObject implements IAttributeCertificateInfoV2 {
    static CLASS_NAME: string;
    version: number;
    holder: Holder;
    issuer: GeneralNames | V2Form;
    signature: AlgorithmIdentifier;
    serialNumber: asn1js.Integer;
    attrCertValidityPeriod: AttCertValidityPeriod;
    attributes: Attribute[];
    issuerUniqueID?: asn1js.BitString;
    extensions?: Extensions;
    /**
     * Initializes a new instance of the {@link AttributeCertificateInfoV2} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AttributeCertificateInfoV2Parameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$j): number;
    static defaultValues(memberName: typeof HOLDER): Holder;
    static defaultValues(memberName: typeof ISSUER$3): GeneralNames | V2Form;
    static defaultValues(memberName: typeof SIGNATURE$6): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SERIAL_NUMBER$4): asn1js.Integer;
    static defaultValues(memberName: typeof ATTR_CERT_VALIDITY_PERIOD): AttCertValidityPeriod;
    static defaultValues(memberName: typeof ATTRIBUTES$3): Attribute[];
    static defaultValues(memberName: typeof ISSUER_UNIQUE_ID$1): asn1js.BitString;
    static defaultValues(memberName: typeof EXTENSIONS$4): Extensions;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AttributeCertificateInfoV2 ::= SEQUENCE {
     *   version                 AttCertVersion, -- version is v2
     *   holder                  Holder,
     *   issuer                  AttCertIssuer,
     *   signature               AlgorithmIdentifier,
     *   serialNumber            CertificateSerialNumber,
     *   attrCertValidityPeriod  AttCertValidityPeriod,
     *   attributes              SEQUENCE OF Attribute,
     *   issuerUniqueID          UniqueIdentifier OPTIONAL,
     *   extensions              Extensions OPTIONAL
     * }
     *```
     */
    static schema(parameters?: AttributeCertificateInfoV2Schema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AttributeCertificateInfoV2Json;
}

declare const ACINFO = "acinfo";
declare const SIGNATURE_ALGORITHM$7 = "signatureAlgorithm";
declare const SIGNATURE_VALUE$3 = "signatureValue";
interface IAttributeCertificateV2 {
    /**
     * Attribute certificate information
     */
    acinfo: AttributeCertificateInfoV2;
    /**
     * Signature algorithm
     */
    signatureAlgorithm: AlgorithmIdentifier;
    /**
     * Signature value
     */
    signatureValue: asn1js.BitString;
}
type AttributeCertificateV2Parameters = PkiObjectParameters & Partial<IAttributeCertificateV2>;
interface AttributeCertificateV2Json {
    acinfo: AttributeCertificateInfoV2Json;
    signatureAlgorithm: AlgorithmIdentifierJson;
    signatureValue: asn1js.BitStringJson;
}
/**
 * Represents the AttributeCertificateV2 structure described in [RFC5755](https://datatracker.ietf.org/doc/html/rfc5755)
 */
declare class AttributeCertificateV2 extends PkiObject implements IAttributeCertificateV2 {
    static CLASS_NAME: string;
    acinfo: AttributeCertificateInfoV2;
    signatureAlgorithm: AlgorithmIdentifier;
    signatureValue: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link AttributeCertificateV2} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AttributeCertificateV2Parameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ACINFO): AttributeCertificateInfoV2;
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$7): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE_VALUE$3): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AttributeCertificate ::= SEQUENCE {
     *   acinfo               AttributeCertificateInfoV2,
     *   signatureAlgorithm   AlgorithmIdentifier,
     *   signatureValue       BIT STRING
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        acinfo?: AttributeCertificateInfoV2Schema;
        signatureAlgorithm?: AlgorithmIdentifierSchema;
        signatureValue?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AttributeCertificateV2Json;
}

declare const TYPE$3 = "type";
declare const VALUE$5 = "value";
interface IAttributeTypeAndValue {
    type: string;
    value: AttributeValueType;
}
type AttributeTypeAndValueParameters = PkiObjectParameters & Partial<IAttributeTypeAndValue>;
type AttributeValueType = asn1js.Utf8String | asn1js.BmpString | asn1js.UniversalString | asn1js.NumericString | asn1js.PrintableString | asn1js.TeletexString | asn1js.VideotexString | asn1js.IA5String | asn1js.GraphicString | asn1js.VisibleString | asn1js.GeneralString | asn1js.CharacterString;
interface AttributeTypeAndValueJson {
    type: string;
    value: any;
}
/**
 * Represents the AttributeTypeAndValue structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class AttributeTypeAndValue extends PkiObject implements IAttributeTypeAndValue {
    static CLASS_NAME: string;
    type: string;
    value: AttributeValueType;
    /**
     * Initializes a new instance of the {@link AttributeTypeAndValue} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AttributeTypeAndValueParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TYPE$3): string;
    static defaultValues(memberName: typeof VALUE$5): AttributeValueType;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AttributeTypeAndValue ::= Sequence {
     *    type     AttributeType,
     *    value    AttributeValue }
     *
     * AttributeType ::= OBJECT IDENTIFIER
     *
     * AttributeValue ::= ANY -- DEFINED BY AttributeType
     *```
     */
    static schema(parameters?: SchemaParameters<{
        type?: string;
        value?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AttributeTypeAndValueJson;
    /**
     * Compares two AttributeTypeAndValue values, or AttributeTypeAndValue with ArrayBuffer value
     * @param compareTo The value compare to current
     */
    isEqual(compareTo: AttributeTypeAndValue | ArrayBuffer): boolean;
}

declare const CONTENT_TYPE$1 = "contentType";
declare const CONTENT = "content";
interface IContentInfo {
    contentType: string;
    content: any;
}
type ContentInfoParameters = PkiObjectParameters & Partial<IContentInfo>;
type ContentInfoSchema = SchemaParameters<{
    contentType?: string;
    content?: string;
}>;
interface ContentInfoJson {
    contentType: string;
    content?: any;
}
/**
 * Represents the ContentInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class ContentInfo extends PkiObject implements IContentInfo {
    static CLASS_NAME: string;
    static readonly DATA = "1.2.840.113549.1.7.1";
    static readonly SIGNED_DATA = "1.2.840.113549.1.7.2";
    static readonly ENVELOPED_DATA = "1.2.840.113549.1.7.3";
    static readonly ENCRYPTED_DATA = "1.2.840.113549.1.7.6";
    contentType: string;
    content: any;
    /**
     * Initializes a new instance of the {@link ContentInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ContentInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CONTENT_TYPE$1): string;
    static defaultValues(memberName: typeof CONTENT): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault<T>(memberName: string, memberValue: T): memberValue is T;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * ContentInfo ::= SEQUENCE {
     *    contentType ContentType,
     *    content [0] EXPLICIT ANY DEFINED BY contentType }
     *```
     */
    static schema(parameters?: ContentInfoSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ContentInfoJson;
}

declare const CONTENT_TYPE = "contentType";
declare const CONTENT_ENCRYPTION_ALGORITHM = "contentEncryptionAlgorithm";
declare const ENCRYPTED_CONTENT = "encryptedContent";
interface IEncryptedContentInfo {
    contentType: string;
    contentEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedContent?: asn1js.OctetString;
}
interface EncryptedContentInfoJson {
    contentType: string;
    contentEncryptionAlgorithm: AlgorithmIdentifierJson;
    encryptedContent?: asn1js.OctetStringJson;
}
interface EncryptedContentInfoSplit {
    /**
     * Disables OctetString splitting for encryptedContent.
     */
    disableSplit?: boolean;
}
type EncryptedContentParameters = PkiObjectParameters & Partial<IEncryptedContentInfo> & EncryptedContentInfoSplit;
type EncryptedContentInfoSchema = SchemaParameters<{
    contentType?: string;
    contentEncryptionAlgorithm?: AlgorithmIdentifierSchema;
    encryptedContent?: string;
}>;
/**
 * Represents the EncryptedContentInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class EncryptedContentInfo extends PkiObject implements IEncryptedContentInfo {
    static CLASS_NAME: string;
    contentType: string;
    contentEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedContent?: asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link EncryptedContentInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: EncryptedContentParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CONTENT_TYPE): string;
    static defaultValues(memberName: typeof CONTENT_ENCRYPTION_ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ENCRYPTED_CONTENT): asn1js.OctetString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * EncryptedContentInfo ::= SEQUENCE {
     *    contentType ContentType,
     *    contentEncryptionAlgorithm ContentEncryptionAlgorithmIdentifier,
     *    encryptedContent [0] IMPLICIT EncryptedContent OPTIONAL }
     *
     * Comment: Strange, but modern crypto engines create ENCRYPTED_CONTENT as "[0] EXPLICIT EncryptedContent"
     *
     * EncryptedContent ::= OCTET STRING
     *```
     */
    static schema(parameters?: EncryptedContentInfoSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): EncryptedContentInfoJson;
    /**
     * Returns concatenated buffer from `encryptedContent` field.
     * @returns Array buffer
     * @since 3.0.0
     * @throws Throws Error if `encryptedContent` is undefined
     */
    getEncryptedContent(): ArrayBuffer;
}

declare const X = "x";
declare const Y = "y";
declare const NAMED_CURVE$1 = "namedCurve";
interface IECPublicKey {
    namedCurve: string;
    x: ArrayBuffer;
    y: ArrayBuffer;
}
interface ECPublicKeyJson {
    crv: string;
    x: string;
    y: string;
}
type ECPublicKeyParameters = PkiObjectParameters & Partial<IECPublicKey> & {
    json?: ECPublicKeyJson;
};
/**
 * Represents the PrivateKeyInfo structure described in [RFC5480](https://datatracker.ietf.org/doc/html/rfc5480)
 */
declare class ECPublicKey extends PkiObject implements IECPublicKey {
    static CLASS_NAME: string;
    namedCurve: string;
    x: ArrayBuffer;
    y: ArrayBuffer;
    /**
     * Initializes a new instance of the {@link ECPublicKey} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ECPublicKeyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof NAMED_CURVE$1): string;
    static defaultValues(memberName: typeof X | typeof Y): ArrayBuffer;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault<T>(memberName: string, memberValue: T): memberValue is T;
    /**
     * Returns value of pre-defined ASN.1 schema for current class
     * @param parameters Input parameters for the schema
     * @returns ASN.1 schema object
     */
    static schema(): SchemaType;
    fromSchema(schema1: BufferSource): any;
    toSchema(): asn1js.RawData;
    toJSON(): ECPublicKeyJson;
    /**
     * Converts JSON value into current object
     * @param json JSON object
     */
    fromJSON(json: any): void;
}

interface IRSAPublicKey {
    /**
     * Modulus part of RSA public key
     */
    modulus: asn1js.Integer;
    /**
     * Public exponent of RSA public key
     */
    publicExponent: asn1js.Integer;
}
interface RSAPublicKeyJson {
    n: string;
    e: string;
}
type RSAPublicKeyParameters = PkiObjectParameters & Partial<IRSAPublicKey> & {
    json?: RSAPublicKeyJson;
};
declare const MODULUS$1 = "modulus";
declare const PUBLIC_EXPONENT$1 = "publicExponent";
/**
 * Represents the RSAPublicKey structure described in [RFC3447](https://datatracker.ietf.org/doc/html/rfc3447)
 */
declare class RSAPublicKey extends PkiObject implements IRSAPublicKey {
    static CLASS_NAME: string;
    modulus: asn1js.Integer;
    publicExponent: asn1js.Integer;
    /**
     * Initializes a new instance of the {@link RSAPublicKey} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RSAPublicKeyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof MODULUS$1 | typeof PUBLIC_EXPONENT$1): asn1js.Integer;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RSAPublicKey ::= Sequence {
     *    modulus           Integer,  -- n
     *    publicExponent    Integer   -- e
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        modulus?: string;
        publicExponent?: string;
    }>): SchemaType;
    fromSchema(schema: asn1js.AsnType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RSAPublicKeyJson;
    /**
     * Converts JSON value into current object
     * @param json JSON object
     */
    fromJSON(json: RSAPublicKeyJson): void;
}

declare const ALGORITHM$1 = "algorithm";
declare const SUBJECT_PUBLIC_KEY = "subjectPublicKey";
interface IPublicKeyInfo {
    /**
     * Algorithm identifier
     */
    algorithm: AlgorithmIdentifier;
    /**
     * Subject public key value
     */
    subjectPublicKey: asn1js.BitString;
    /**
     * Parsed public key value
     */
    parsedKey?: ECPublicKey | RSAPublicKey | undefined;
}
type PublicKeyInfoParameters = PkiObjectParameters & Partial<IPublicKeyInfo> & {
    json?: JsonWebKey;
};
interface PublicKeyInfoJson {
    algorithm: AlgorithmIdentifierJson;
    subjectPublicKey: asn1js.BitStringJson;
}
type PublicKeyInfoSchema = SchemaParameters<{
    algorithm?: AlgorithmIdentifierSchema;
    subjectPublicKey?: string;
}>;
/**
 * Represents the PublicKeyInfo structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class PublicKeyInfo extends PkiObject implements IPublicKeyInfo {
    static CLASS_NAME: string;
    algorithm: AlgorithmIdentifier;
    subjectPublicKey: asn1js.BitString;
    private _parsedKey?;
    get parsedKey(): ECPublicKey | RSAPublicKey | undefined;
    set parsedKey(value: ECPublicKey | RSAPublicKey | undefined);
    /**
     * Initializes a new instance of the {@link PublicKeyInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PublicKeyInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ALGORITHM$1): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SUBJECT_PUBLIC_KEY): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SubjectPublicKeyInfo ::= Sequence  {
     *    algorithm            AlgorithmIdentifier,
     *    subjectPublicKey     BIT STRING  }
     *```
     */
    static schema(parameters?: PublicKeyInfoSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PublicKeyInfoJson | JsonWebKey;
    /**
     * Converts JSON value into current object
     * @param json JSON object
     */
    fromJSON(json: any): void;
    importKey(publicKey: CryptoKey, crypto?: ICryptoEngine): Promise<void>;
}

type CryptoEngineAlgorithmOperation = "sign" | "encrypt" | "generateKey" | "importKey" | "exportKey" | "verify";
/**
 * Algorithm parameters
 */
interface CryptoEngineAlgorithmParams {
    /**
     * Algorithm
     */
    algorithm: Algorithm | object;
    /**
     * Key usages
     */
    usages: KeyUsage[];
}
interface CryptoEngineSignatureParams {
    signatureAlgorithm: AlgorithmIdentifier;
    parameters: CryptoEngineAlgorithmParams;
}
interface CryptoEngineSignWithPrivateKeyParams {
    algorithm: Algorithm;
}
/**
 * Public key parameters
 */
interface CryptoEnginePublicKeyParams {
    /**
     * Algorithm
     */
    algorithm: CryptoEngineAlgorithmParams;
}
type ContentEncryptionAesCbcParams = AesCbcParams & AesDerivedKeyParams;
type ContentEncryptionAesGcmParams = AesGcmParams & AesDerivedKeyParams;
type ContentEncryptionAlgorithm = ContentEncryptionAesCbcParams | ContentEncryptionAesGcmParams;
interface CryptoEngineEncryptParams {
    password: ArrayBuffer;
    contentEncryptionAlgorithm: ContentEncryptionAlgorithm;
    hmacHashAlgorithm: string;
    iterationCount: number;
    contentToEncrypt: ArrayBuffer;
    contentType: string;
}
interface CryptoEngineDecryptParams {
    password: ArrayBuffer;
    encryptedContentInfo: EncryptedContentInfo;
}
interface CryptoEngineStampDataWithPasswordParams {
    password: ArrayBuffer;
    hashAlgorithm: string;
    salt: ArrayBuffer;
    iterationCount: number;
    contentToStamp: ArrayBuffer;
}
interface CryptoEngineVerifyDataStampedWithPasswordParams {
    password: ArrayBuffer;
    hashAlgorithm: string;
    salt: ArrayBuffer;
    iterationCount: number;
    contentToVerify: ArrayBuffer;
    signatureToVerify: ArrayBuffer;
}
interface ICryptoEngine extends SubtleCrypto {
    name: string;
    crypto: Crypto;
    subtle: SubtleCrypto;
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
    /**
     * Get OID for each specific algorithm
     * @param algorithm WebCrypto Algorithm
     * @param safety If `true` throws exception on unknown algorithm. Default is `false`
     * @param target Name of the target
     * @throws Throws {@link Error} exception if unknown WebCrypto algorithm
     */
    getOIDByAlgorithm(algorithm: Algorithm, safety?: boolean, target?: string): string;
    /**
     * Get default algorithm parameters for each kind of operation
     * @param algorithmName Algorithm name to get common parameters for
     * @param operation Kind of operation: "sign", "encrypt", "generateKey", "importKey", "exportKey", "verify"
     */
    getAlgorithmParameters(algorithmName: string, operation: CryptoEngineAlgorithmOperation): CryptoEngineAlgorithmParams;
    /**
     * Gets WebCrypto algorithm by wel-known OID
     * @param oid algorithm identifier
     * @param safety if `true` throws exception on unknown algorithm identifier
     * @param target name of the target
     * @returns Returns WebCrypto algorithm or an empty object
     */
    getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety?: boolean, target?: string): T | object;
    /**
     * Gets WebCrypto algorithm by wel-known OID
     * @param oid algorithm identifier
     * @param safety if `true` throws exception on unknown algorithm identifier
     * @param target name of the target
     * @returns Returns WebCrypto algorithm
     * @throws Throws {@link Error} exception if unknown algorithm identifier
     */
    getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety: true, target?: string): T;
    /**
     * Getting hash algorithm by signature algorithm
     * @param signatureAlgorithm Signature algorithm
     */
    getHashAlgorithm(signatureAlgorithm: AlgorithmIdentifier): string;
    /**
     * Get signature parameters by analyzing private key algorithm
     * @param privateKey The private key user would like to use
     * @param hashAlgorithm Hash algorithm user would like to use. Default is SHA-1
     */
    getSignatureParameters(privateKey: CryptoKey, hashAlgorithm?: string): Promise<CryptoEngineSignatureParams>;
    /**
     * Sign data with pre-defined private key
     * @param data Data to be signed
     * @param privateKey Private key to use
     * @param parameters Parameters for used algorithm
     */
    signWithPrivateKey(data: BufferSource, privateKey: CryptoKey, parameters: CryptoEngineSignWithPrivateKeyParams): Promise<ArrayBuffer>;
    /**
     * Verify data with the public key
     * @param data Data to be verified
     * @param signature Signature value
     * @param publicKeyInfo Public key information
     * @param signatureAlgorithm Signature algorithm
     * @param shaAlgorithm Hash algorithm
     */
    verifyWithPublicKey(data: BufferSource, signature: asn1js.BitString | asn1js.OctetString, publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier, shaAlgorithm?: string): Promise<boolean>;
    getPublicKey(publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier, parameters?: CryptoEnginePublicKeyParams): Promise<CryptoKey>;
    /**
     * Specialized function encrypting "EncryptedContentInfo" object using parameters
     * @param parameters
     */
    encryptEncryptedContentInfo(parameters: CryptoEngineEncryptParams): Promise<EncryptedContentInfo>;
    /**
     * Decrypt data stored in "EncryptedContentInfo" object using parameters
     * @param parameters
     */
    decryptEncryptedContentInfo(parameters: CryptoEngineDecryptParams): Promise<ArrayBuffer>;
    /**
     * Stamping (signing) data using algorithm similar to HMAC
     * @param parameters
     */
    stampDataWithPassword(parameters: CryptoEngineStampDataWithPasswordParams): Promise<ArrayBuffer>;
    verifyDataStampedWithPassword(parameters: CryptoEngineVerifyDataStampedWithPasswordParams): Promise<boolean>;
}
interface CryptoEngineParameters {
    name?: string;
    crypto: Crypto;
    /**
     * @deprecated
     */
    subtle?: SubtleCrypto;
}
interface CryptoEngineConstructor {
    new (params: CryptoEngineParameters): ICryptoEngine;
}

interface GlobalCryptoEngine {
    name: string;
    crypto: ICryptoEngine | null;
}
declare let engine: GlobalCryptoEngine;
/**
 * Sets global crypto engine
 * @param name Name of the crypto engine
 * @param crypto
 * @param subtle
 * @deprecated Since version 3.0.0
 */
declare function setEngine(name: string, crypto: ICryptoEngine | Crypto, subtle: ICryptoEngine | SubtleCrypto): void;
/**
 * Sets global crypto engine
 * @param name Name of the crypto engine
 * @param crypto Crypto engine. If the parameter is omitted, `CryptoEngine` with `self.crypto` are used
 * @since 3.0.0
 */
declare function setEngine(name: string, crypto?: ICryptoEngine): void;
declare function getEngine(): GlobalCryptoEngine;
/**
 * Gets crypto subtle from the current "crypto engine"
 * @param safety
 * @returns Reruns {@link ICryptoEngine} or `null`
 */
declare function getCrypto(safety?: boolean): ICryptoEngine | null;
/**
 * Gets crypto subtle from the current "crypto engine"
 * @param safety
 * @returns Reruns {@link ICryptoEngine} or throws en exception
 * @throws Throws {@link Error} if `subtle` is empty
 */
declare function getCrypto(safety: true): ICryptoEngine;
/**
 * Initialize input Uint8Array by random values (with help from current "crypto engine")
 * @param view
 */
declare function getRandomValues(view: Uint8Array): Uint8Array<ArrayBufferLike>;
/**
 * Get OID for each specific algorithm
 * @param algorithm WebCrypto Algorithm
 * @param safety if `true` throws exception on unknown algorithm
 * @param target name of the target
 * @throws Throws {@link Error} exception if unknown WebCrypto algorithm
 */
declare function getOIDByAlgorithm(algorithm: Algorithm, safety?: boolean, target?: string): string;
/**
 * Get default algorithm parameters for each kind of operation
 * @param algorithmName Algorithm name to get common parameters for
 * @param operation Kind of operation: "sign", "encrypt", "generateKey", "importKey", "exportKey", "verify"
 */
declare function getAlgorithmParameters(algorithmName: string, operation: CryptoEngineAlgorithmOperation): CryptoEngineAlgorithmParams;
/**
 * Create CMS ECDSA signature from WebCrypto ECDSA signature
 * @param signatureBuffer WebCrypto result of "sign" function
 */
declare function createCMSECDSASignature(signatureBuffer: ArrayBuffer): ArrayBuffer;
/**
 * Create a single ArrayBuffer from CMS ECDSA signature
 * @param cmsSignature ASN.1 SEQUENCE contains CMS ECDSA signature
 * @param pointSize Size of EC point. Use {@link ECNamedCurves.find} to get correct point size
 * @returns WebCrypto signature
 */
declare function createECDSASignatureFromCMS(cmsSignature: asn1js.AsnType, pointSize: number): ArrayBuffer;
/**
 * Gets WebCrypto algorithm by well-known OID
 * @param oid algorithm identifier
 * @param safety if true throws exception on unknown algorithm identifier
 * @param target name of the target
 * @returns WebCrypto algorithm or an empty object
 */
declare function getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety?: boolean, target?: string): T | object;
declare function getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety: true, target?: string): T;
/**
 * Getting hash algorithm by signature algorithm
 * @param signatureAlgorithm Signature algorithm
 */
declare function getHashAlgorithm(signatureAlgorithm: AlgorithmIdentifier): string;
/**
 * ANS X9.63 Key Derivation Function
 * @param hashFunction Used hash function
 * @param Zbuffer ArrayBuffer containing ECDH shared secret to derive from
 * @param keydatalen Length (!!! in BITS !!!) of used kew derivation function
 * @param SharedInfo Usually DER encoded "ECC_CMS_SharedInfo" structure
 * @param crypto Crypto engine
 */
declare function kdf(hashFunction: string, Zbuffer: ArrayBuffer, keydatalen: number, SharedInfo: ArrayBuffer, crypto?: ICryptoEngine): Promise<ArrayBuffer>;

declare const TYPE_AND_VALUES = "typesAndValues";
declare const VALUE_BEFORE_DECODE = "valueBeforeDecode";
declare const RDN = "RDN";
interface IRelativeDistinguishedNames {
    /**
     * Array of "type and value" objects
     */
    typesAndValues: AttributeTypeAndValue[];
    /**
     * Value of the RDN before decoding from schema
     */
    valueBeforeDecode: ArrayBuffer;
}
type RelativeDistinguishedNamesParameters = PkiObjectParameters & Partial<IRelativeDistinguishedNames>;
type RelativeDistinguishedNamesSchema = SchemaParameters<{
    repeatedSequence?: string;
    repeatedSet?: string;
    typeAndValue?: SchemaType;
}>;
interface RelativeDistinguishedNamesJson {
    typesAndValues: AttributeTypeAndValueJson[];
}
/**
 * Represents the RelativeDistinguishedNames structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class RelativeDistinguishedNames extends PkiObject implements IRelativeDistinguishedNames {
    static CLASS_NAME: string;
    typesAndValues: AttributeTypeAndValue[];
    valueBeforeDecode: ArrayBuffer;
    /**
     * Initializes a new instance of the {@link RelativeDistinguishedNames} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RelativeDistinguishedNamesParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TYPE_AND_VALUES): AttributeTypeAndValue[];
    static defaultValues(memberName: typeof VALUE_BEFORE_DECODE): ArrayBuffer;
    /**
     * Compares values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RDNSequence ::= Sequence OF RelativeDistinguishedName
     *
     * RelativeDistinguishedName ::=
     * SET SIZE (1..MAX) OF AttributeTypeAndValue
     *```
     */
    static schema(parameters?: RelativeDistinguishedNamesSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RelativeDistinguishedNamesJson;
    /**
     * Compares two RDN values, or RDN with ArrayBuffer value
     * @param compareTo The value compare to current
     */
    isEqual(compareTo: unknown): boolean;
}

declare const TYPE$2 = "type";
declare const VALUE$4 = "value";
declare enum TimeType {
    UTCTime = 0,
    GeneralizedTime = 1,
    empty = 2
}
interface ITime {
    /**
     * 0 - UTCTime; 1 - GeneralizedTime; 2 - empty value
     */
    type: TimeType;
    /**
     * Value of the TIME class
     */
    value: Date;
}
type TimeParameters = PkiObjectParameters & Partial<ITime>;
type TimeSchema = SchemaParameters<{
    utcTimeName?: string;
    generalTimeName?: string;
}>;
interface TimeJson {
    type: TimeType;
    value: Date;
}
/**
 * Represents the Time structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class Time extends PkiObject implements ITime {
    static CLASS_NAME: string;
    type: TimeType;
    value: Date;
    /**
     * Initializes a new instance of the {@link Time} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: TimeParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TYPE$2): TimeType;
    static defaultValues(memberName: typeof VALUE$4): Date;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Time ::= CHOICE {
       *   utcTime        UTCTime,
       *   generalTime    GeneralizedTime }
     * ```
     *
     * @param parameters Input parameters for the schema
     * @param optional Flag that current schema should be optional
     * @returns ASN.1 schema object
     */
    static schema(parameters?: TimeSchema, optional?: boolean): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.UTCTime | asn1js.GeneralizedTime;
    toJSON(): TimeJson;
}

declare const TBS$4 = "tbs";
declare const VERSION$i = "version";
declare const SERIAL_NUMBER$3 = "serialNumber";
declare const SIGNATURE$5 = "signature";
declare const ISSUER$2 = "issuer";
declare const NOT_BEFORE$1 = "notBefore";
declare const NOT_AFTER$1 = "notAfter";
declare const SUBJECT$1 = "subject";
declare const SUBJECT_PUBLIC_KEY_INFO = "subjectPublicKeyInfo";
declare const ISSUER_UNIQUE_ID = "issuerUniqueID";
declare const SUBJECT_UNIQUE_ID = "subjectUniqueID";
declare const EXTENSIONS$3 = "extensions";
declare const SIGNATURE_ALGORITHM$6 = "signatureAlgorithm";
declare const SIGNATURE_VALUE$2 = "signatureValue";
type TBSCertificateSchema = SchemaParameters<{
    tbsCertificateVersion?: string;
    tbsCertificateSerialNumber?: string;
    signature?: AlgorithmIdentifierSchema;
    issuer?: RelativeDistinguishedNamesSchema;
    tbsCertificateValidity?: string;
    notBefore?: TimeSchema;
    notAfter?: TimeSchema;
    subject?: RelativeDistinguishedNamesSchema;
    subjectPublicKeyInfo?: PublicKeyInfoSchema;
    tbsCertificateIssuerUniqueID?: string;
    tbsCertificateSubjectUniqueID?: string;
    extensions?: ExtensionsSchema;
}>;
interface ICertificate {
    /**
     * ToBeSigned (TBS) part of the certificate
     */
    tbs: ArrayBuffer;
    /**
     * Version number
     */
    version: number;
    /**
     * Serial number of the certificate
     */
    serialNumber: asn1js.Integer;
    /**
     * This field contains the algorithm identifier for the algorithm used by the CA to sign the certificate
     */
    signature: AlgorithmIdentifier;
    /**
     * The issuer field identifies the entity that has signed and issued the certificate
     */
    issuer: RelativeDistinguishedNames;
    /**
     * The date on which the certificate validity period begins
     */
    notBefore: Time;
    /**
     * The date on which the certificate validity period ends
     */
    notAfter: Time;
    /**
     * The subject field identifies the entity associated with the public key stored in the subject public key field
     */
    subject: RelativeDistinguishedNames;
    /**
     * This field is used to carry the public key and identify the algorithm with which the key is used
     */
    subjectPublicKeyInfo: PublicKeyInfo;
    /**
     * The subject and issuer unique identifiers are present in the certificate to handle the possibility of reuse of subject and/or issuer names over time
     */
    issuerUniqueID?: ArrayBuffer;
    /**
     * The subject and issuer unique identifiers are present in the certificate to handle the possibility of reuse of subject and/or issuer names over time
     */
    subjectUniqueID?: ArrayBuffer;
    /**
     * If present, this field is a SEQUENCE of one or more certificate extensions
     */
    extensions?: Extension[];
    /**
     * The signatureAlgorithm field contains the identifier for the cryptographic algorithm used by the CA to sign this certificate
     */
    signatureAlgorithm: AlgorithmIdentifier;
    /**
     * The signatureValue field contains a digital signature computed upon the ASN.1 DER encoded tbsCertificate
     */
    signatureValue: asn1js.BitString;
}
/**
 * Constructor parameters for the {@link Certificate} class
 */
type CertificateParameters = PkiObjectParameters & Partial<ICertificate>;
/**
 * Parameters for {@link Certificate} schema generation
 */
type CertificateSchema = SchemaParameters<{
    tbsCertificate?: TBSCertificateSchema;
    signatureAlgorithm?: AlgorithmIdentifierSchema;
    signatureValue?: string;
}>;
interface CertificateJson {
    tbs: string;
    version: number;
    serialNumber: asn1js.IntegerJson;
    signature: AlgorithmIdentifierJson;
    issuer: RelativeDistinguishedNamesJson;
    notBefore: TimeJson;
    notAfter: TimeJson;
    subject: RelativeDistinguishedNamesJson;
    subjectPublicKeyInfo: PublicKeyInfoJson | JsonWebKey;
    issuerUniqueID?: string;
    subjectUniqueID?: string;
    extensions?: ExtensionJson[];
    signatureAlgorithm: AlgorithmIdentifierJson;
    signatureValue: asn1js.BitStringJson;
}
/**
 * Represents an X.509 certificate described in [RFC5280 Section 4](https://datatracker.ietf.org/doc/html/rfc5280#section-4).
 *
 * @example The following example demonstrates how to parse X.509 Certificate
 * ```js
 * const asn1 = asn1js.fromBER(raw);
 * if (asn1.offset === -1) {
 *   throw new Error("Incorrect encoded ASN.1 data");
 * }
 *
 * const cert = new pkijs.Certificate({ schema: asn1.result });
 * ```
 *
 * @example The following example demonstrates how to create self-signed certificate
 * ```js
 * const crypto = pkijs.getCrypto(true);
 *
 * // Create certificate
 * const certificate = new pkijs.Certificate();
 * certificate.version = 2;
 * certificate.serialNumber = new asn1js.Integer({ value: 1 });
 * certificate.issuer.typesAndValues.push(new pkijs.AttributeTypeAndValue({
 *   type: "2.5.4.3", // Common name
 *   value: new asn1js.BmpString({ value: "Test" })
 * }));
 * certificate.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({
 *   type: "2.5.4.3", // Common name
 *   value: new asn1js.BmpString({ value: "Test" })
 * }));
 *
 * certificate.notBefore.value = new Date();
 * const notAfter = new Date();
 * notAfter.setUTCFullYear(notAfter.getUTCFullYear() + 1);
 * certificate.notAfter.value = notAfter;
 *
 * certificate.extensions = []; // Extensions are not a part of certificate by default, it's an optional array
 *
 * // "BasicConstraints" extension
 * const basicConstr = new pkijs.BasicConstraints({
 *   cA: true,
 *   pathLenConstraint: 3
 * });
 * certificate.extensions.push(new pkijs.Extension({
 *   extnID: "2.5.29.19",
 *   critical: false,
 *   extnValue: basicConstr.toSchema().toBER(false),
 *   parsedValue: basicConstr // Parsed value for well-known extensions
 * }));
 *
 * // "KeyUsage" extension
 * const bitArray = new ArrayBuffer(1);
 * const bitView = new Uint8Array(bitArray);
 * bitView[0] |= 0x02; // Key usage "cRLSign" flag
 * bitView[0] |= 0x04; // Key usage "keyCertSign" flag
 * const keyUsage = new asn1js.BitString({ valueHex: bitArray });
 * certificate.extensions.push(new pkijs.Extension({
 *   extnID: "2.5.29.15",
 *   critical: false,
 *   extnValue: keyUsage.toBER(false),
 *   parsedValue: keyUsage // Parsed value for well-known extensions
 * }));
 *
 * const algorithm = pkijs.getAlgorithmParameters("RSASSA-PKCS1-v1_5", "generateKey");
 * if ("hash" in algorithm.algorithm) {
 *   algorithm.algorithm.hash.name = "SHA-256";
 * }
 *
 * const keys = await crypto.generateKey(algorithm.algorithm, true, algorithm.usages);
 *
 * // Exporting public key into "subjectPublicKeyInfo" value of certificate
 * await certificate.subjectPublicKeyInfo.importKey(keys.publicKey);
 *
 * // Signing final certificate
 * await certificate.sign(keys.privateKey, "SHA-256");
 *
 * const raw = certificate.toSchema().toBER();
 * ```
 */
declare class Certificate extends PkiObject implements ICertificate {
    static CLASS_NAME: string;
    tbsView: Uint8Array;
    /**
     * @deprecated Since version 3.0.0
     */
    get tbs(): ArrayBuffer;
    /**
     * @deprecated Since version 3.0.0
     */
    set tbs(value: ArrayBuffer);
    version: number;
    serialNumber: asn1js.Integer;
    signature: AlgorithmIdentifier;
    issuer: RelativeDistinguishedNames;
    notBefore: Time;
    notAfter: Time;
    subject: RelativeDistinguishedNames;
    subjectPublicKeyInfo: PublicKeyInfo;
    issuerUniqueID?: ArrayBuffer;
    subjectUniqueID?: ArrayBuffer;
    extensions?: Extension[];
    signatureAlgorithm: AlgorithmIdentifier;
    signatureValue: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link Certificate} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertificateParameters);
    /**
     * Return default values for all class members
     * @param memberName String name for a class member
     * @returns Predefined default value
     */
    static defaultValues(memberName: typeof TBS$4): ArrayBuffer;
    static defaultValues(memberName: typeof VERSION$i): number;
    static defaultValues(memberName: typeof SERIAL_NUMBER$3): asn1js.Integer;
    static defaultValues(memberName: typeof SIGNATURE$5): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ISSUER$2): RelativeDistinguishedNames;
    static defaultValues(memberName: typeof NOT_BEFORE$1): Time;
    static defaultValues(memberName: typeof NOT_AFTER$1): Time;
    static defaultValues(memberName: typeof SUBJECT$1): RelativeDistinguishedNames;
    static defaultValues(memberName: typeof SUBJECT_PUBLIC_KEY_INFO): PublicKeyInfo;
    static defaultValues(memberName: typeof ISSUER_UNIQUE_ID): ArrayBuffer;
    static defaultValues(memberName: typeof SUBJECT_UNIQUE_ID): ArrayBuffer;
    static defaultValues(memberName: typeof EXTENSIONS$3): Extension[];
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$6): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE_VALUE$2): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Certificate ::= SEQUENCE  {
     *    tbsCertificate       TBSCertificate,
     *    signatureAlgorithm   AlgorithmIdentifier,
     *    signatureValue       BIT STRING  }
     *
     * TBSCertificate ::= SEQUENCE  {
     *     version         [0]  EXPLICIT Version DEFAULT v1,
     *     serialNumber         CertificateSerialNumber,
     *     signature            AlgorithmIdentifier,
     *     issuer               Name,
     *     validity             Validity,
     *     subject              Name,
     *     subjectPublicKeyInfo SubjectPublicKeyInfo,
     *     issuerUniqueID  [1]  IMPLICIT UniqueIdentifier OPTIONAL,
     *                           -- If present, version MUST be v2 or v3
     *     subjectUniqueID [2]  IMPLICIT UniqueIdentifier OPTIONAL,
     *                           -- If present, version MUST be v2 or v3
     *     extensions      [3]  EXPLICIT Extensions OPTIONAL
     *                           -- If present, version MUST be v3
     *     }
     *
     * Version ::= INTEGER  {  v1(0), v2(1), v3(2)  }
     *
     * CertificateSerialNumber ::= INTEGER
     *
     * Validity ::= SEQUENCE {
     *     notBefore      Time,
     *     notAfter       Time }
     *
     * Time ::= CHOICE {
     *     utcTime        UTCTime,
     *     generalTime    GeneralizedTime }
     *
     * UniqueIdentifier ::= BIT STRING
     *
     * SubjectPublicKeyInfo ::= SEQUENCE  {
     *     algorithm            AlgorithmIdentifier,
     *     subjectPublicKey     BIT STRING  }
     *
     * Extensions ::= SEQUENCE SIZE (1..MAX) OF Extension
     *
     * Extension ::= SEQUENCE  {
     *     extnID      OBJECT IDENTIFIER,
     *     critical    BOOLEAN DEFAULT FALSE,
     *     extnValue   OCTET STRING
     *                 -- contains the DER encoding of an ASN.1 value
     *                 -- corresponding to the extension type identified
     *                 -- by extnID
     *     }
     *```
     */
    static schema(parameters?: CertificateSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    /**
     * Creates ASN.1 schema for existing values of TBS part for the certificate
     * @returns ASN.1 SEQUENCE
     */
    encodeTBS(): asn1js.Sequence;
    toSchema(encodeFlag?: boolean): asn1js.Sequence;
    toJSON(): CertificateJson;
    /**
     * Importing public key for current certificate
     * @param parameters Public key export parameters
     * @param crypto Crypto engine
     * @returns WebCrypto public key
     */
    getPublicKey(parameters?: CryptoEnginePublicKeyParams, crypto?: ICryptoEngine): Promise<CryptoKey>;
    /**
     * Get hash value for subject public key (default SHA-1)
     * @param hashAlgorithm Hashing algorithm name
     * @param crypto Crypto engine
     * @returns Computed hash value from `Certificate.tbsCertificate.subjectPublicKeyInfo.subjectPublicKey`
     */
    getKeyHash(hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<ArrayBuffer>;
    /**
     * Make a signature for current value from TBS section
     * @param privateKey Private key for SUBJECT_PUBLIC_KEY_INFO structure
     * @param hashAlgorithm Hashing algorithm
     * @param crypto Crypto engine
     */
    sign(privateKey: CryptoKey, hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Verifies the certificate signature
     * @param issuerCertificate
     * @param crypto Crypto engine
     */
    verify(issuerCertificate?: Certificate, crypto?: ICryptoEngine): Promise<boolean>;
}
/**
 * Check CA flag for the certificate
 * @param cert Certificate to find CA flag for
 * @returns Returns {@link Certificate} if `cert` is CA certificate otherwise return `null`
 */
declare function checkCA(cert: Certificate, signerCert?: Certificate | null): Certificate | null;

declare const OTHER_CERT_FORMAT = "otherCertFormat";
declare const OTHER_CERT = "otherCert";
interface IOtherCertificateFormat {
    otherCertFormat: string;
    otherCert: any;
}
interface OtherCertificateFormatJson {
    otherCertFormat: string;
    otherCert?: any;
}
type OtherCertificateFormatParameters = PkiObjectParameters & Partial<IOtherCertificateFormat>;
/**
 * Represents the OtherCertificateFormat structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class OtherCertificateFormat extends PkiObject implements IOtherCertificateFormat {
    otherCertFormat: string;
    otherCert: any;
    /**
     * Initializes a new instance of the {@link OtherCertificateFormat} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OtherCertificateFormatParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof OTHER_CERT_FORMAT): string;
    static defaultValues(memberName: typeof OTHER_CERT): asn1js.Any;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OtherCertificateFormat ::= SEQUENCE {
     *    otherCertFormat OBJECT IDENTIFIER,
     *    otherCert ANY DEFINED BY otherCertFormat }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        otherCertFormat?: string;
        otherCert?: string;
    }>): SchemaType;
    fromSchema(schema: any): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OtherCertificateFormatJson;
}

declare const CERTIFICATES$1 = "certificates";
interface ICertificateSet {
    certificates: CertificateSetItem[];
}
interface CertificateSetJson {
    certificates: CertificateSetItemJson[];
}
type CertificateSetItemJson = CertificateJson | AttributeCertificateV1Json | AttributeCertificateV2Json | OtherCertificateFormatJson;
type CertificateSetItem = Certificate | AttributeCertificateV1 | AttributeCertificateV2 | OtherCertificateFormat;
type CertificateSetParameters = PkiObjectParameters & Partial<ICertificateSet>;
/**
 * Represents the CertificateSet structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class CertificateSet extends PkiObject implements ICertificateSet {
    static CLASS_NAME: string;
    certificates: CertificateSetItem[];
    /**
     * Initializes a new instance of the {@link CertificateSet} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertificateSetParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CERTIFICATES$1): CertificateSetItem[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CertificateSet ::= SET OF CertificateChoices
     *
     * CertificateChoices ::= CHOICE {
     *    certificate Certificate,
     *    extendedCertificate [0] IMPLICIT ExtendedCertificate,  -- Obsolete
     *    v1AttrCert [1] IMPLICIT AttributeCertificateV1,        -- Obsolete
     *    v2AttrCert [2] IMPLICIT AttributeCertificateV2,
     *    other [3] IMPLICIT OtherCertificateFormat }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        certificates?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Set;
    toJSON(): CertificateSetJson;
}

declare const USER_CERTIFICATE = "userCertificate";
declare const REVOCATION_DATE = "revocationDate";
declare const CRL_ENTRY_EXTENSIONS = "crlEntryExtensions";
interface IRevokedCertificate {
    userCertificate: asn1js.Integer;
    revocationDate: Time;
    crlEntryExtensions?: Extensions;
}
type RevokedCertificateParameters = PkiObjectParameters & Partial<IRevokedCertificate>;
interface RevokedCertificateJson {
    userCertificate: asn1js.IntegerJson;
    revocationDate: TimeJson;
    crlEntryExtensions?: ExtensionsJson;
}
/**
 * Represents the RevokedCertificate structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class RevokedCertificate extends PkiObject implements IRevokedCertificate {
    static CLASS_NAME: string;
    userCertificate: asn1js.Integer;
    revocationDate: Time;
    crlEntryExtensions?: Extensions;
    /**
     * Initializes a new instance of the {@link RevokedCertificate} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RevokedCertificateParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof USER_CERTIFICATE): asn1js.Integer;
    static defaultValues(memberName: typeof REVOCATION_DATE): Time;
    static defaultValues(memberName: typeof CRL_ENTRY_EXTENSIONS): Extensions;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * revokedCertificates     SEQUENCE OF SEQUENCE  {
       *        userCertificate         CertificateSerialNumber,
       *        revocationDate          Time,
       *        crlEntryExtensions      Extensions OPTIONAL
       *                                 -- if present, version MUST be v2
       *                             }  OPTIONAL,
     *```
     */
    static schema(parameters?: SchemaParameters<{
        userCertificate?: string;
        revocationDate?: string;
        crlEntryExtensions?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RevokedCertificateJson;
}

declare const TBS$3 = "tbs";
declare const VERSION$h = "version";
declare const SIGNATURE$4 = "signature";
declare const ISSUER$1 = "issuer";
declare const THIS_UPDATE$1 = "thisUpdate";
declare const NEXT_UPDATE$1 = "nextUpdate";
declare const REVOKED_CERTIFICATES = "revokedCertificates";
declare const CRL_EXTENSIONS = "crlExtensions";
declare const SIGNATURE_ALGORITHM$5 = "signatureAlgorithm";
declare const SIGNATURE_VALUE$1 = "signatureValue";
interface ICertificateRevocationList {
    tbs: ArrayBuffer;
    version: number;
    signature: AlgorithmIdentifier;
    issuer: RelativeDistinguishedNames;
    thisUpdate: Time;
    nextUpdate?: Time;
    revokedCertificates?: RevokedCertificate[];
    crlExtensions?: Extensions;
    signatureAlgorithm: AlgorithmIdentifier;
    signatureValue: asn1js.BitString;
}
type TBSCertListSchema = SchemaParameters<{
    tbsCertListVersion?: string;
    signature?: AlgorithmIdentifierSchema;
    issuer?: RelativeDistinguishedNamesSchema;
    tbsCertListThisUpdate?: TimeSchema;
    tbsCertListNextUpdate?: TimeSchema;
    tbsCertListRevokedCertificates?: string;
    crlExtensions?: ExtensionsSchema;
}>;
interface CertificateRevocationListJson {
    tbs: string;
    version: number;
    signature: AlgorithmIdentifierJson;
    issuer: RelativeDistinguishedNamesJson;
    thisUpdate: TimeJson;
    nextUpdate?: TimeJson;
    revokedCertificates?: RevokedCertificateJson[];
    crlExtensions?: ExtensionsJson;
    signatureAlgorithm: AlgorithmIdentifierJson;
    signatureValue: asn1js.BitStringJson;
}
type CertificateRevocationListParameters = PkiObjectParameters & Partial<ICertificateRevocationList>;
interface CertificateRevocationListVerifyParams {
    issuerCertificate?: Certificate;
    publicKeyInfo?: PublicKeyInfo;
}
/**
 * Represents the CertificateRevocationList structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class CertificateRevocationList extends PkiObject implements ICertificateRevocationList {
    static CLASS_NAME: string;
    tbsView: Uint8Array;
    /**
     * @deprecated Since version 3.0.0
     */
    get tbs(): ArrayBuffer;
    /**
     * @deprecated Since version 3.0.0
     */
    set tbs(value: ArrayBuffer);
    version: number;
    signature: AlgorithmIdentifier;
    issuer: RelativeDistinguishedNames;
    thisUpdate: Time;
    nextUpdate?: Time;
    revokedCertificates?: RevokedCertificate[];
    crlExtensions?: Extensions;
    signatureAlgorithm: AlgorithmIdentifier;
    signatureValue: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link CertificateRevocationList} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertificateRevocationListParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TBS$3): ArrayBuffer;
    static defaultValues(memberName: typeof VERSION$h): number;
    static defaultValues(memberName: typeof SIGNATURE$4): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ISSUER$1): RelativeDistinguishedNames;
    static defaultValues(memberName: typeof THIS_UPDATE$1): Time;
    static defaultValues(memberName: typeof NEXT_UPDATE$1): Time;
    static defaultValues(memberName: typeof REVOKED_CERTIFICATES): RevokedCertificate[];
    static defaultValues(memberName: typeof CRL_EXTENSIONS): Extensions;
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$5): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE_VALUE$1): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CertificateList ::= SEQUENCE  {
     *    tbsCertList          TBSCertList,
     *    signatureAlgorithm   AlgorithmIdentifier,
     *    signatureValue       BIT STRING  }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        tbsCertListVersion?: string;
        signature?: AlgorithmIdentifierSchema;
        issuer?: RelativeDistinguishedNamesSchema;
        tbsCertListThisUpdate?: TimeSchema;
        tbsCertListNextUpdate?: TimeSchema;
        tbsCertListRevokedCertificates?: string;
        crlExtensions?: ExtensionsSchema;
        signatureAlgorithm?: AlgorithmIdentifierSchema;
        signatureValue?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    protected encodeTBS(): asn1js.Sequence;
    /**
     * Convert current object to asn1js object and set correct values
     * @returns asn1js object
     */
    toSchema(encodeFlag?: boolean): any;
    toJSON(): CertificateRevocationListJson;
    /**
     * Returns `true` if supplied certificate is revoked, otherwise `false`
     * @param certificate
     */
    isCertificateRevoked(certificate: Certificate): boolean;
    /**
     * Make a signature for existing CRL data
     * @param privateKey Private key for "subjectPublicKeyInfo" structure
     * @param hashAlgorithm Hashing algorithm. Default SHA-1
     * @param crypto Crypto engine
     */
    sign(privateKey: CryptoKey, hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Verify existing signature
     * @param parameters
     * @param crypto Crypto engine
     */
    verify(parameters?: CertificateRevocationListVerifyParams, crypto?: ICryptoEngine): Promise<boolean>;
}

declare const OTHER_REV_INFO_FORMAT = "otherRevInfoFormat";
declare const OTHER_REV_INFO = "otherRevInfo";
interface IOtherRevocationInfoFormat {
    otherRevInfoFormat: string;
    otherRevInfo: any;
}
interface OtherRevocationInfoFormatJson {
    otherRevInfoFormat: string;
    otherRevInfo?: any;
}
type OtherRevocationInfoFormatParameters = PkiObjectParameters & Partial<IOtherRevocationInfoFormat>;
/**
 * Represents the OtherRevocationInfoFormat structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class OtherRevocationInfoFormat extends PkiObject implements IOtherRevocationInfoFormat {
    static CLASS_NAME: string;
    otherRevInfoFormat: string;
    otherRevInfo: any;
    /**
     * Initializes a new instance of the {@link OtherRevocationInfoFormat} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OtherRevocationInfoFormatParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof OTHER_REV_INFO_FORMAT): string;
    static defaultValues(memberName: typeof OTHER_REV_INFO): any;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OtherCertificateFormat ::= SEQUENCE {
     *    otherRevInfoFormat OBJECT IDENTIFIER,
     *    otherRevInfo ANY DEFINED BY otherCertFormat }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        otherRevInfoFormat?: string;
        otherRevInfo?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OtherRevocationInfoFormatJson;
}

declare const CRLS$3 = "crls";
declare const OTHER_REVOCATION_INFOS = "otherRevocationInfos";
interface IRevocationInfoChoices {
    crls: CertificateRevocationList[];
    otherRevocationInfos: OtherRevocationInfoFormat[];
}
interface RevocationInfoChoicesJson {
    crls: CertificateRevocationListJson[];
    otherRevocationInfos: OtherRevocationInfoFormatJson[];
}
type RevocationInfoChoicesParameters = PkiObjectParameters & Partial<IRevocationInfoChoices>;
type RevocationInfoChoicesSchema = SchemaParameters<{
    crls?: string;
}>;
/**
 * Represents the RevocationInfoChoices structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class RevocationInfoChoices extends PkiObject implements IRevocationInfoChoices {
    static CLASS_NAME: string;
    crls: CertificateRevocationList[];
    otherRevocationInfos: OtherRevocationInfoFormat[];
    /**
     * Initializes a new instance of the {@link RevocationInfoChoices} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RevocationInfoChoicesParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CRLS$3): CertificateRevocationList[];
    static defaultValues(memberName: typeof OTHER_REVOCATION_INFOS): OtherRevocationInfoFormat[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RevocationInfoChoices ::= SET OF RevocationInfoChoice
     *
     * RevocationInfoChoice ::= CHOICE {
     *    crl CertificateList,
     *    other [1] IMPLICIT OtherRevocationInfoFormat }
     *```
     */
    static schema(parameters?: RevocationInfoChoicesSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RevocationInfoChoicesJson;
}

declare const CERTS$3 = "certs";
declare const CRLS$2 = "crls";
interface IOriginatorInfo {
    /**
     * Collection of certificates. In may contain originator certificates associated with several different
     * key management algorithms. It may also contain attribute certificates associated with the originator.
     */
    certs?: CertificateSet;
    /**
     * Collection of CRLs. It is intended that the set contain information sufficient to determine whether
     * or not the certificates in the certs field are valid, but such correspondence is not necessary
     */
    crls?: RevocationInfoChoices;
}
interface OriginatorInfoJson {
    certs?: CertificateSetJson;
    crls?: RevocationInfoChoicesJson;
}
type OriginatorInfoParameters = PkiObjectParameters & Partial<IOriginatorInfo>;
/**
 * Represents the OriginatorInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class OriginatorInfo extends PkiObject implements IOriginatorInfo {
    static CLASS_NAME: string;
    certs?: CertificateSet;
    crls?: RevocationInfoChoices;
    /**
     * Initializes a new instance of the {@link CertificateSet} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OriginatorInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CERTS$3): CertificateSet;
    static defaultValues(memberName: typeof CRLS$2): RevocationInfoChoices;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OriginatorInfo ::= SEQUENCE {
     *    certs [0] IMPLICIT CertificateSet OPTIONAL,
     *    crls [1] IMPLICIT RevocationInfoChoices OPTIONAL }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        certs?: string;
        crls?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OriginatorInfoJson;
}

declare const ISSUER = "issuer";
declare const SERIAL_NUMBER$2 = "serialNumber";
interface IIssuerAndSerialNumber {
    /**
     * Certificate issuer name
     */
    issuer: RelativeDistinguishedNames;
    /**
     * Certificate serial number
     */
    serialNumber: asn1js.Integer;
}
interface IssuerAndSerialNumberJson {
    issuer: RelativeDistinguishedNamesJson;
    serialNumber: asn1js.IntegerJson;
}
type IssuerAndSerialNumberParameters = PkiObjectParameters & Partial<IIssuerAndSerialNumber>;
type IssuerAndSerialNumberSchema = SchemaParameters<{
    issuer?: RelativeDistinguishedNamesSchema;
    serialNumber?: string;
}>;
/**
 * Represents the IssuerAndSerialNumber structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class IssuerAndSerialNumber extends PkiObject implements IIssuerAndSerialNumber {
    static CLASS_NAME: string;
    issuer: RelativeDistinguishedNames;
    serialNumber: asn1js.Integer;
    /**
     * Initializes a new instance of the {@link IssuerAndSerialNumber} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: IssuerAndSerialNumberParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ISSUER): RelativeDistinguishedNames;
    static defaultValues(memberName: typeof SERIAL_NUMBER$2): asn1js.Integer;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * IssuerAndSerialNumber ::= SEQUENCE {
     *    issuer Name,
     *    serialNumber CertificateSerialNumber }
     *
     * CertificateSerialNumber ::= INTEGER
     *```
     */
    static schema(parameters?: IssuerAndSerialNumberSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): IssuerAndSerialNumberJson;
}

declare const VARIANT$3 = "variant";
declare const VALUE$3 = "value";
interface IRecipientIdentifier {
    variant: number;
    value: IssuerAndSerialNumber | asn1js.OctetString;
}
interface RecipientIdentifierJson {
    variant: number;
    value?: IssuerAndSerialNumberJson | asn1js.OctetStringJson;
}
type RecipientIdentifierParameters = PkiObjectParameters & Partial<IRecipientIdentifier>;
type RecipientIdentifierSchema = SchemaParameters;
/**
 * Represents the RecipientIdentifier structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class RecipientIdentifier extends PkiObject implements IRecipientIdentifier {
    static CLASS_NAME: string;
    variant: number;
    value: IssuerAndSerialNumber | asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link RecipientIdentifier} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RecipientIdentifierParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VARIANT$3): number;
    static defaultValues(memberName: typeof VALUE$3): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RecipientIdentifier ::= CHOICE {
     *    issuerAndSerialNumber IssuerAndSerialNumber,
     *    subjectKeyIdentifier [0] SubjectKeyIdentifier }
     *
     * SubjectKeyIdentifier ::= OCTET STRING
     *```
     */
    static schema(parameters?: RecipientIdentifierSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.BaseBlock<any>;
    toJSON(): RecipientIdentifierJson;
}

declare const VERSION$g = "version";
declare const RID$1 = "rid";
declare const KEY_ENCRYPTION_ALGORITHM$3 = "keyEncryptionAlgorithm";
declare const ENCRYPTED_KEY$3 = "encryptedKey";
declare const RECIPIENT_CERTIFICATE$1 = "recipientCertificate";
interface IKeyTransRecipientInfo {
    version: number;
    rid: RecipientIdentifierType;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedKey: asn1js.OctetString;
    recipientCertificate: Certificate;
}
interface KeyTransRecipientInfoJson {
    version: number;
    rid: RecipientIdentifierMixedJson;
    keyEncryptionAlgorithm: AlgorithmIdentifierJson;
    encryptedKey: asn1js.OctetStringJson;
}
type RecipientIdentifierType = IssuerAndSerialNumber | asn1js.OctetString;
type RecipientIdentifierMixedJson = IssuerAndSerialNumberJson | asn1js.OctetStringJson;
type KeyTransRecipientInfoParameters = PkiObjectParameters & Partial<IKeyTransRecipientInfo>;
/**
 * Represents the KeyTransRecipientInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class KeyTransRecipientInfo extends PkiObject implements IKeyTransRecipientInfo {
    static CLASS_NAME: string;
    version: number;
    rid: RecipientIdentifierType;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedKey: asn1js.OctetString;
    recipientCertificate: Certificate;
    /**
     * Initializes a new instance of the {@link KeyTransRecipientInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: KeyTransRecipientInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$g): number;
    static defaultValues(memberName: typeof RID$1): RecipientIdentifierType;
    static defaultValues(memberName: typeof KEY_ENCRYPTION_ALGORITHM$3): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ENCRYPTED_KEY$3): asn1js.OctetString;
    static defaultValues(memberName: typeof RECIPIENT_CERTIFICATE$1): Certificate;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * KeyTransRecipientInfo ::= SEQUENCE {
     *    version CMSVersion,  -- always set to 0 or 2
     *    rid RecipientIdentifier,
     *    keyEncryptionAlgorithm KeyEncryptionAlgorithmIdentifier,
     *    encryptedKey EncryptedKey }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        rid?: RecipientIdentifierSchema;
        keyEncryptionAlgorithm?: AlgorithmIdentifierSchema;
        encryptedKey?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): KeyTransRecipientInfoJson;
}

declare const VARIANT$2 = "variant";
declare const VALUE$2 = "value";
interface IOriginatorIdentifierOrKey {
    variant: number;
    value?: any;
}
interface OriginatorIdentifierOrKeyJson {
    variant: number;
    value?: any;
}
type OriginatorIdentifierOrKeyParameters = PkiObjectParameters & Partial<IOriginatorIdentifierOrKey>;
type OriginatorIdentifierOrKeySchema = SchemaParameters;
/**
 * Represents the OriginatorIdentifierOrKey structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class OriginatorIdentifierOrKey extends PkiObject implements IOriginatorIdentifierOrKey {
    static CLASS_NAME: string;
    variant: number;
    value?: any;
    /**
     * Initializes a new instance of the {@link OriginatorIdentifierOrKey} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OriginatorIdentifierOrKeyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VARIANT$2): number;
    static defaultValues(memberName: typeof VALUE$2): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OriginatorIdentifierOrKey ::= CHOICE {
     *    issuerAndSerialNumber IssuerAndSerialNumber,
     *    subjectKeyIdentifier [0] SubjectKeyIdentifier,
     *    originatorKey [1] OriginatorPublicKey }
     *```
     */
    static schema(parameters?: OriginatorIdentifierOrKeySchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.BaseBlock<any>;
    toJSON(): OriginatorIdentifierOrKeyJson;
}

declare const KEY_ATTR_ID = "keyAttrId";
declare const KEY_ATTR = "keyAttr";
interface IOtherKeyAttribute {
    keyAttrId: string;
    keyAttr?: any;
}
interface OtherKeyAttributeJson {
    keyAttrId: string;
    keyAttr?: any;
}
type OtherKeyAttributeParameters = PkiObjectParameters & Partial<IOtherKeyAttribute>;
type OtherKeyAttributeSchema = SchemaType;
/**
 * Represents the OtherKeyAttribute structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class OtherKeyAttribute extends PkiObject implements IOtherKeyAttribute {
    static CLASS_NAME: string;
    keyAttrId: string;
    keyAttr?: any;
    /**
     * Initializes a new instance of the {@link OtherKeyAttribute} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OtherKeyAttributeParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof KEY_ATTR_ID): string;
    static defaultValues(memberName: typeof KEY_ATTR): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault<T extends object>(memberName: string, memberValue: T): memberValue is T;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OtherKeyAttribute ::= SEQUENCE {
     *    keyAttrId OBJECT IDENTIFIER,
     *    keyAttr ANY DEFINED BY keyAttrId OPTIONAL }
     *```
     */
    static schema(parameters?: OtherKeyAttributeSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OtherKeyAttributeJson;
}

declare const SUBJECT_KEY_IDENTIFIER = "subjectKeyIdentifier";
declare const DATE$1 = "date";
declare const OTHER$1 = "other";
interface IRecipientKeyIdentifier {
    subjectKeyIdentifier: asn1js.OctetString;
    date?: asn1js.GeneralizedTime;
    other?: OtherKeyAttribute;
}
interface RecipientKeyIdentifierJson {
    subjectKeyIdentifier: asn1js.OctetStringJson;
    date?: asn1js.BaseBlockJson;
    other?: OtherKeyAttributeJson;
}
type RecipientKeyIdentifierParameters = PkiObjectParameters & Partial<IRecipientKeyIdentifier>;
type RecipientKeyIdentifierSchema = SchemaParameters<{
    subjectKeyIdentifier?: string;
    date?: string;
    other?: OtherKeyAttributeSchema;
}>;
/**
 * Represents the RecipientKeyIdentifier structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class RecipientKeyIdentifier extends PkiObject implements IRecipientKeyIdentifier {
    static CLASS_NAME: string;
    subjectKeyIdentifier: asn1js.OctetString;
    date?: asn1js.GeneralizedTime;
    other?: OtherKeyAttribute;
    /**
     * Initializes a new instance of the {@link RecipientKeyIdentifier} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RecipientKeyIdentifierParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof SUBJECT_KEY_IDENTIFIER): asn1js.OctetString;
    static defaultValues(memberName: typeof DATE$1): asn1js.GeneralizedTime;
    static defaultValues(memberName: typeof OTHER$1): OtherKeyAttribute;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RecipientKeyIdentifier ::= SEQUENCE {
     *    subjectKeyIdentifier SubjectKeyIdentifier,
     *    date GeneralizedTime OPTIONAL,
     *    other OtherKeyAttribute OPTIONAL }
     *```
     */
    static schema(parameters?: RecipientKeyIdentifierSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RecipientKeyIdentifierJson;
}

declare const VARIANT$1 = "variant";
declare const VALUE$1 = "value";
interface IKeyAgreeRecipientIdentifier {
    variant: number;
    value: any;
}
interface KeyAgreeRecipientIdentifierJson {
    variant: number;
    value?: IssuerAndSerialNumberJson | RecipientKeyIdentifierJson;
}
type KeyAgreeRecipientIdentifierParameters = PkiObjectParameters & Partial<IKeyAgreeRecipientIdentifier>;
type KeyAgreeRecipientIdentifierSchema = SchemaParameters<{
    issuerAndSerialNumber?: IssuerAndSerialNumberSchema;
    rKeyId?: RecipientKeyIdentifierSchema;
}>;
/**
 * Represents the KeyAgreeRecipientIdentifier structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class KeyAgreeRecipientIdentifier extends PkiObject implements IKeyAgreeRecipientIdentifier {
    static CLASS_NAME: string;
    variant: number;
    value: any;
    /**
     * Initializes a new instance of the {@link KeyAgreeRecipientIdentifier} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: KeyAgreeRecipientIdentifierParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VARIANT$1): number;
    static defaultValues(memberName: typeof VALUE$1): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * KeyAgreeRecipientIdentifier ::= CHOICE {
     *    issuerAndSerialNumber IssuerAndSerialNumber,
     *    rKeyId [0] IMPLICIT RecipientKeyIdentifier }
     *```
     */
    static schema(parameters?: KeyAgreeRecipientIdentifierSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.BaseBlock<any>;
    toJSON(): KeyAgreeRecipientIdentifierJson;
}

declare const RID = "rid";
declare const ENCRYPTED_KEY$2 = "encryptedKey";
interface IRecipientEncryptedKey {
    rid: KeyAgreeRecipientIdentifier;
    encryptedKey: asn1js.OctetString;
}
interface RecipientEncryptedKeyJson {
    rid: KeyAgreeRecipientIdentifierJson;
    encryptedKey: asn1js.OctetStringJson;
}
type RecipientEncryptedKeyParameters = PkiObjectParameters & Partial<IRecipientEncryptedKey>;
/**
 * Represents the RecipientEncryptedKey structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class RecipientEncryptedKey extends PkiObject implements IRecipientEncryptedKey {
    static CLASS_NAME: string;
    rid: KeyAgreeRecipientIdentifier;
    encryptedKey: asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link RecipientEncryptedKey} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RecipientEncryptedKeyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof RID): KeyAgreeRecipientIdentifier;
    static defaultValues(memberName: typeof ENCRYPTED_KEY$2): asn1js.OctetString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RecipientEncryptedKey ::= SEQUENCE {
     *    rid KeyAgreeRecipientIdentifier,
     *    encryptedKey EncryptedKey }
     *
     * EncryptedKey ::= OCTET STRING
     *```
     */
    static schema(parameters?: SchemaParameters<{
        rid?: KeyAgreeRecipientIdentifierSchema;
        encryptedKey?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RecipientEncryptedKeyJson;
}

declare const ENCRYPTED_KEYS = "encryptedKeys";
interface IRecipientEncryptedKeys {
    encryptedKeys: RecipientEncryptedKey[];
}
interface RecipientEncryptedKeysJson {
    encryptedKeys: RecipientEncryptedKeyJson[];
}
type RecipientEncryptedKeysParameters = PkiObjectParameters & Partial<IRecipientEncryptedKeys>;
type RecipientEncryptedKeysSchema = SchemaParameters<{
    RecipientEncryptedKeys?: string;
}>;
/**
 * Represents the RecipientEncryptedKeys structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class RecipientEncryptedKeys extends PkiObject implements IRecipientEncryptedKeys {
    static CLASS_NAME: string;
    encryptedKeys: RecipientEncryptedKey[];
    /**
     * Initializes a new instance of the {@link RecipientEncryptedKeys} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RecipientEncryptedKeysParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ENCRYPTED_KEYS): RecipientEncryptedKey[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RecipientEncryptedKeys ::= SEQUENCE OF RecipientEncryptedKey
     *```
     */
    static schema(parameters?: RecipientEncryptedKeysSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RecipientEncryptedKeysJson;
}

declare const VERSION$f = "version";
declare const ORIGINATOR = "originator";
declare const UKM = "ukm";
declare const KEY_ENCRYPTION_ALGORITHM$2 = "keyEncryptionAlgorithm";
declare const RECIPIENT_ENCRYPTED_KEY = "recipientEncryptedKeys";
declare const RECIPIENT_CERTIFICATE = "recipientCertificate";
declare const RECIPIENT_PUBLIC_KEY = "recipientPublicKey";
interface IKeyAgreeRecipientInfo {
    version: number;
    originator: OriginatorIdentifierOrKey;
    ukm?: asn1js.OctetString;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    recipientEncryptedKeys: RecipientEncryptedKeys;
    recipientCertificate: Certificate;
    recipientPublicKey: CryptoKey | null;
}
interface KeyAgreeRecipientInfoJson {
    version: number;
    originator: OriginatorIdentifierOrKeyJson;
    ukm?: asn1js.OctetStringJson;
    keyEncryptionAlgorithm: AlgorithmIdentifierJson;
    recipientEncryptedKeys: RecipientEncryptedKeysJson;
}
type KeyAgreeRecipientInfoParameters = PkiObjectParameters & Partial<IKeyAgreeRecipientInfo>;
/**
 * Represents the KeyAgreeRecipientInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class KeyAgreeRecipientInfo extends PkiObject implements IKeyAgreeRecipientInfo {
    static CLASS_NAME: string;
    version: number;
    originator: OriginatorIdentifierOrKey;
    ukm?: asn1js.OctetString;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    recipientEncryptedKeys: RecipientEncryptedKeys;
    recipientCertificate: Certificate;
    recipientPublicKey: CryptoKey | null;
    /**
     * Initializes a new instance of the {@link KeyAgreeRecipientInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: KeyAgreeRecipientInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$f): number;
    static defaultValues(memberName: typeof ORIGINATOR): OriginatorIdentifierOrKey;
    static defaultValues(memberName: typeof UKM): asn1js.OctetString;
    static defaultValues(memberName: typeof KEY_ENCRYPTION_ALGORITHM$2): AlgorithmIdentifier;
    static defaultValues(memberName: typeof RECIPIENT_ENCRYPTED_KEY): RecipientEncryptedKeys;
    static defaultValues(memberName: typeof RECIPIENT_CERTIFICATE): Certificate;
    static defaultValues(memberName: typeof RECIPIENT_PUBLIC_KEY): null;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * KeyAgreeRecipientInfo ::= SEQUENCE {
     *    version CMSVersion,  -- always set to 3
     *    originator [0] EXPLICIT OriginatorIdentifierOrKey,
     *    ukm [1] EXPLICIT UserKeyingMaterial OPTIONAL,
     *    keyEncryptionAlgorithm KeyEncryptionAlgorithmIdentifier,
     *    recipientEncryptedKeys RecipientEncryptedKeys }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        originator?: OriginatorIdentifierOrKeySchema;
        ukm?: string;
        keyEncryptionAlgorithm?: AlgorithmIdentifierSchema;
        recipientEncryptedKeys?: RecipientEncryptedKeysSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    /**
     * Conversion for the class to JSON object
     * @returns
     */
    toJSON(): KeyAgreeRecipientInfoJson;
}

declare const KEY_IDENTIFIER$1 = "keyIdentifier";
declare const DATE = "date";
declare const OTHER = "other";
interface IKEKIdentifier {
    keyIdentifier: asn1js.OctetString;
    date?: asn1js.GeneralizedTime;
    other?: OtherKeyAttribute;
}
interface KEKIdentifierJson {
    keyIdentifier: asn1js.OctetStringJson;
    date?: asn1js.GeneralizedTime;
    other?: OtherKeyAttributeJson;
}
type KEKIdentifierParameters = PkiObjectParameters & Partial<IKEKIdentifier>;
type KEKIdentifierSchema = SchemaParameters<{
    keyIdentifier?: string;
    date?: string;
    other?: OtherKeyAttributeSchema;
}>;
/**
 * Represents the KEKIdentifier structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class KEKIdentifier extends PkiObject implements IKEKIdentifier {
    static CLASS_NAME: string;
    keyIdentifier: asn1js.OctetString;
    date?: asn1js.GeneralizedTime;
    other?: OtherKeyAttribute;
    /**
     * Initializes a new instance of the {@link KEKIdentifier} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: KEKIdentifierParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof KEY_IDENTIFIER$1): asn1js.OctetString;
    static defaultValues(memberName: typeof DATE): asn1js.GeneralizedTime;
    static defaultValues(memberName: typeof OTHER): OtherKeyAttribute;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * KEKIdentifier ::= SEQUENCE {
     *    keyIdentifier OCTET STRING,
     *    date GeneralizedTime OPTIONAL,
     *    other OtherKeyAttribute OPTIONAL }
     *```
     */
    static schema(parameters?: KEKIdentifierSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): KEKIdentifierJson;
}

declare const VERSION$e = "version";
declare const KEK_ID = "kekid";
declare const KEY_ENCRYPTION_ALGORITHM$1 = "keyEncryptionAlgorithm";
declare const ENCRYPTED_KEY$1 = "encryptedKey";
declare const PER_DEFINED_KEK = "preDefinedKEK";
interface IKEKRecipientInfo {
    version: number;
    kekid: KEKIdentifier;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedKey: asn1js.OctetString;
    preDefinedKEK: ArrayBuffer;
}
interface KEKRecipientInfoJson {
    version: number;
    kekid: KEKIdentifierJson;
    keyEncryptionAlgorithm: AlgorithmIdentifierJson;
    encryptedKey: asn1js.OctetStringJson;
}
type KEKRecipientInfoParameters = PkiObjectParameters & Partial<IKEKRecipientInfo>;
/**
 * Represents the KEKRecipientInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class KEKRecipientInfo extends PkiObject implements IKEKRecipientInfo {
    static CLASS_NAME: string;
    version: number;
    kekid: KEKIdentifier;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedKey: asn1js.OctetString;
    preDefinedKEK: ArrayBuffer;
    /**
     * Initializes a new instance of the {@link KEKRecipientInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: KEKRecipientInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$e): number;
    static defaultValues(memberName: typeof KEK_ID): KEKIdentifier;
    static defaultValues(memberName: typeof KEY_ENCRYPTION_ALGORITHM$1): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ENCRYPTED_KEY$1): asn1js.OctetString;
    static defaultValues(memberName: typeof PER_DEFINED_KEK): ArrayBuffer;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * KEKRecipientInfo ::= SEQUENCE {
     *    version CMSVersion,  -- always set to 4
     *    kekid KEKIdentifier,
     *    keyEncryptionAlgorithm KeyEncryptionAlgorithmIdentifier,
     *    encryptedKey EncryptedKey }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        kekid?: KEKIdentifierSchema;
        keyEncryptionAlgorithm?: AlgorithmIdentifierSchema;
        encryptedKey?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): KEKRecipientInfoJson;
}

declare const VERSION$d = "version";
declare const KEY_DERIVATION_ALGORITHM = "keyDerivationAlgorithm";
declare const KEY_ENCRYPTION_ALGORITHM = "keyEncryptionAlgorithm";
declare const ENCRYPTED_KEY = "encryptedKey";
declare const PASSWORD = "password";
interface IPasswordRecipientInfo {
    version: number;
    keyDerivationAlgorithm?: AlgorithmIdentifier;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedKey: asn1js.OctetString;
    password: ArrayBuffer;
}
interface PasswordRecipientInfoJson {
    version: number;
    keyDerivationAlgorithm?: AlgorithmIdentifierJson;
    keyEncryptionAlgorithm: AlgorithmIdentifierJson;
    encryptedKey: asn1js.OctetStringJson;
}
type PasswordRecipientinfoParameters = PkiObjectParameters & Partial<IPasswordRecipientInfo>;
/**
 * Represents the PasswordRecipientInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class PasswordRecipientinfo extends PkiObject implements IPasswordRecipientInfo {
    static CLASS_NAME: string;
    version: number;
    keyDerivationAlgorithm?: AlgorithmIdentifier;
    keyEncryptionAlgorithm: AlgorithmIdentifier;
    encryptedKey: asn1js.OctetString;
    password: ArrayBuffer;
    /**
     * Initializes a new instance of the {@link PasswordRecipientinfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PasswordRecipientinfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$d): number;
    static defaultValues(memberName: typeof KEY_DERIVATION_ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof KEY_ENCRYPTION_ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ENCRYPTED_KEY): asn1js.OctetString;
    static defaultValues(memberName: typeof PASSWORD): ArrayBuffer;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PasswordRecipientInfo ::= SEQUENCE {
     *    version CMSVersion,   -- Always set to 0
     *    keyDerivationAlgorithm [0] KeyDerivationAlgorithmIdentifier OPTIONAL,
     *    keyEncryptionAlgorithm KeyEncryptionAlgorithmIdentifier,
     *    encryptedKey EncryptedKey }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        keyDerivationAlgorithm?: string;
        keyEncryptionAlgorithm?: AlgorithmIdentifierSchema;
        encryptedKey?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PasswordRecipientInfoJson;
}

declare const ORI_TYPE = "oriType";
declare const ORI_VALUE = "oriValue";
interface IOtherRecipientInfo {
    oriType: string;
    oriValue: any;
}
interface OtherRecipientInfoJson {
    oriType: string;
    oriValue?: any;
}
type OtherRecipientInfoParameters = PkiObjectParameters & Partial<IOtherRecipientInfo>;
/**
 * Represents the OtherRecipientInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class OtherRecipientInfo extends PkiObject implements IOtherRecipientInfo {
    static CLASS_NAME: string;
    oriType: string;
    oriValue: any;
    /**
     * Initializes a new instance of the {@link OtherRecipientInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OtherRecipientInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ORI_TYPE): string;
    static defaultValues(memberName: typeof ORI_VALUE): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OtherRecipientInfo ::= SEQUENCE {
     *    oriType OBJECT IDENTIFIER,
     *    oriValue ANY DEFINED BY oriType }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        oriType?: string;
        oriValue?: string;
    }>): asn1js.Sequence;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OtherRecipientInfoJson;
}

declare const VARIANT = "variant";
declare const VALUE = "value";
interface IRecipientInfo {
    variant: number;
    value?: RecipientInfoValue;
}
interface RecipientInfoJson {
    variant: number;
    value?: RecipientInfoValueJson;
}
type RecipientInfoValue = KeyTransRecipientInfo | KeyAgreeRecipientInfo | KEKRecipientInfo | PasswordRecipientinfo | OtherRecipientInfo;
type RecipientInfoValueJson = KeyTransRecipientInfoJson | KeyAgreeRecipientInfoJson | KEKRecipientInfoJson | PasswordRecipientInfoJson | OtherRecipientInfoJson;
type RecipientInfoParameters = PkiObjectParameters & Partial<IRecipientInfo>;
/**
 * Represents the RecipientInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class RecipientInfo extends PkiObject implements IRecipientInfo {
    static CLASS_NAME: string;
    variant: number;
    value?: RecipientInfoValue;
    /**
     * Initializes a new instance of the {@link RecipientInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RecipientInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VARIANT): number;
    static defaultValues(memberName: typeof VALUE): RecipientInfoValue;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RecipientInfo ::= CHOICE {
     *    ktri KeyTransRecipientInfo,
     *    kari [1] KeyAgreeRecipientInfo,
     *    kekri [2] KEKRecipientInfo,
     *    pwri [3] PasswordRecipientinfo,
     *    ori [4] OtherRecipientInfo }
     *```
     */
    static schema(parameters?: SchemaParameters): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.BaseBlock<any>;
    toJSON(): RecipientInfoJson;
}

declare const VERSION$c = "version";
declare const ORIGINATOR_INFO = "originatorInfo";
declare const RECIPIENT_INFOS = "recipientInfos";
declare const ENCRYPTED_CONTENT_INFO$1 = "encryptedContentInfo";
declare const UNPROTECTED_ATTRS$1 = "unprotectedAttrs";
interface IEnvelopedData {
    /**
     * Version number.
     *
     * The appropriate value depends on `originatorInfo`, `RecipientInfo`, and `unprotectedAttrs`.
     *
     * The version MUST be assigned as follows:
     * ```
     * IF (originatorInfo is present) AND
     *    ((any certificates with a type of other are present) OR
     *    (any crls with a type of other are present))
     * THEN version is 4
     * ELSE
     *    IF ((originatorInfo is present) AND
     *       (any version 2 attribute certificates are present)) OR
     *       (any RecipientInfo structures include pwri) OR
     *       (any RecipientInfo structures include ori)
     *    THEN version is 3
     *    ELSE
     *       IF (originatorInfo is absent) AND
     *          (unprotectedAttrs is absent) AND
     *          (all RecipientInfo structures are version 0)
     *       THEN version is 0
     *       ELSE version is 2
     * ```
     */
    version: number;
    /**
     * Optionally provides information about the originator. It is present only if required by the key management algorithm.
     * It may contain certificates and CRLs.
     */
    originatorInfo?: OriginatorInfo;
    /**
     * Collection of per-recipient information. There MUST be at least one element in the collection.
     */
    recipientInfos: RecipientInfo[];
    /**
     * Encrypted content information
     */
    encryptedContentInfo: EncryptedContentInfo;
    /**
     * Collection of attributes that are not encrypted
     */
    unprotectedAttrs?: Attribute[];
}
/**
 * JSON representation of {@link EnvelopedData}
 */
interface EnvelopedDataJson {
    version: number;
    originatorInfo?: OriginatorInfoJson;
    recipientInfos: RecipientInfoJson[];
    encryptedContentInfo: EncryptedContentInfoJson;
    unprotectedAttrs?: AttributeJson[];
}
type EnvelopedDataParameters = PkiObjectParameters & Partial<IEnvelopedData> & EncryptedContentInfoSplit;
interface EnvelopedDataEncryptionParams {
    kekEncryptionLength: number;
    kdfAlgorithm: string;
}
interface EnvelopedDataDecryptBaseParams {
    preDefinedData?: BufferSource;
    recipientCertificate?: Certificate;
}
interface EnvelopedDataDecryptKeyParams extends EnvelopedDataDecryptBaseParams {
    recipientPrivateKey: CryptoKey;
    /**
     * Crypto provider assigned to `recipientPrivateKey`. If the filed is empty uses default crypto provider.
     */
    crypto?: Crypto;
}
interface EnvelopedDataDecryptBufferParams extends EnvelopedDataDecryptBaseParams {
    recipientPrivateKey?: BufferSource;
}
type EnvelopedDataDecryptParams = EnvelopedDataDecryptBufferParams | EnvelopedDataDecryptKeyParams;
/**
 * Represents the EnvelopedData structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 *
 * @example The following example demonstrates how to create and encrypt CMS Enveloped Data
 * ```js
 * const cmsEnveloped = new pkijs.EnvelopedData();
 *
 * // Add recipient
 * cmsEnveloped.addRecipientByCertificate(cert, { oaepHashAlgorithm: "SHA-256" });
 *
 * // Secret key algorithm
 * const alg = {
 *   name: "AES-GCM",
 *   length: 256,
 * }
 * await cmsEnveloped.encrypt(alg, dataToEncrypt);
 *
 * // Add Enveloped Data into CMS Content Info
 * const cmsContent = new pkijs.ContentInfo();
 * cmsContent.contentType = pkijs.ContentInfo.ENVELOPED_DATA;
 * cmsContent.content = cmsEnveloped.toSchema();
 *
 * const cmsContentRaw = cmsContent.toSchema().toBER();
 * ```
 *
 * @example The following example demonstrates how to decrypt CMS Enveloped Data
 * ```js
 * // Get a "crypto" extension
 * const crypto = pkijs.getCrypto();
 *
 * // Parse CMS Content Info
 * const cmsContent = pkijs.ContentInfo.fromBER(cmsContentRaw);
 * if (cmsContent.contentType !== pkijs.ContentInfo.ENVELOPED_DATA) {
 *   throw new Error("CMS is not Enveloped Data");
 * }
 * // Parse CMS Enveloped Data
 * const cmsEnveloped = new pkijs.EnvelopedData({ schema: cmsContent.content });
 *
 * // Export private key to PKCS#8
 * const pkcs8 = await crypto.exportKey("pkcs8", keys.privateKey);
 *
 * // Decrypt data
 * const decryptedData = await cmsEnveloped.decrypt(0, {
 *   recipientCertificate: cert,
 *   recipientPrivateKey: pkcs8,
 * });
 * ```
 */
declare class EnvelopedData extends PkiObject implements IEnvelopedData {
    static CLASS_NAME: string;
    version: number;
    originatorInfo?: OriginatorInfo;
    recipientInfos: RecipientInfo[];
    encryptedContentInfo: EncryptedContentInfo;
    unprotectedAttrs?: Attribute[];
    policy: Required<EncryptedContentInfoSplit>;
    /**
     * Initializes a new instance of the {@link EnvelopedData} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: EnvelopedDataParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$c): number;
    static defaultValues(memberName: typeof ORIGINATOR_INFO): OriginatorInfo;
    static defaultValues(memberName: typeof RECIPIENT_INFOS): RecipientInfo[];
    static defaultValues(memberName: typeof ENCRYPTED_CONTENT_INFO$1): EncryptedContentInfo;
    static defaultValues(memberName: typeof UNPROTECTED_ATTRS$1): Attribute[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * EnvelopedData ::= SEQUENCE {
     *    version CMSVersion,
     *    originatorInfo [0] IMPLICIT OriginatorInfo OPTIONAL,
     *    recipientInfos RecipientInfos,
     *    encryptedContentInfo EncryptedContentInfo,
     *    unprotectedAttrs [1] IMPLICIT UnprotectedAttributes OPTIONAL }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        originatorInfo?: string;
        recipientInfos?: string;
        encryptedContentInfo?: EncryptedContentInfoSchema;
        unprotectedAttrs?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): EnvelopedDataJson;
    /**
     * Helpers function for filling "RecipientInfo" based on recipient's certificate.
     * Problem with WebCrypto is that for RSA certificates we have only one option - "key transport" and
     * for ECC certificates we also have one option - "key agreement". As soon as Google will implement
     * DH algorithm it would be possible to use "key agreement" also for RSA certificates.
     * @param certificate Recipient's certificate
     * @param parameters Additional parameters necessary for "fine tunning" of encryption process
     * @param variant Variant = 1 is for "key transport", variant = 2 is for "key agreement". In fact the "variant" is unnecessary now because Google has no DH algorithm implementation. Thus key encryption scheme would be choosen by certificate type only: "key transport" for RSA and "key agreement" for ECC certificates.
     * @param crypto Crypto engine
     */
    addRecipientByCertificate(certificate: Certificate, parameters?: object, variant?: number, crypto?: ICryptoEngine): boolean;
    /**
     * Add recipient based on pre-defined data like password or KEK
     * @param preDefinedData ArrayBuffer with pre-defined data
     * @param parameters Additional parameters necessary for "fine tunning" of encryption process
     * @param variant Variant = 1 for pre-defined "key encryption key" (KEK). Variant = 2 for password-based encryption.
     * @param crypto Crypto engine
     */
    addRecipientByPreDefinedData(preDefinedData: ArrayBuffer, parameters: {
        keyIdentifier?: ArrayBuffer;
        hmacHashAlgorithm?: string;
        iterationCount?: number;
        keyEncryptionAlgorithm?: AesKeyGenParams;
        keyEncryptionAlgorithmParams?: any;
    } | undefined, variant: number, crypto?: ICryptoEngine): void;
    /**
     * Add a "RecipientInfo" using a KeyAgreeRecipientInfo of type RecipientKeyIdentifier.
     * @param key Recipient's public key
     * @param keyId The id for the recipient's public key
     * @param parameters Additional parameters for "fine tuning" the encryption process
     * @param crypto Crypto engine
     */
    addRecipientByKeyIdentifier(key?: CryptoKey, keyId?: ArrayBuffer, parameters?: any, crypto?: ICryptoEngine): void;
    /**
     * Add a "RecipientInfo" using a KeyAgreeRecipientInfo of type RecipientKeyIdentifier.
     * @param recipientIdentifier Recipient identifier
     * @param encryptionParameters Additional parameters for "fine tuning" the encryption process
     * @param extraRecipientInfoParams Additional params for KeyAgreeRecipientInfo
     * @param crypto Crypto engine
     */
    private _addKeyAgreeRecipientInfo;
    /**
     * Creates a new CMS Enveloped Data content with encrypted data
     * @param contentEncryptionAlgorithm WebCrypto algorithm. For the moment here could be only "AES-CBC" or "AES-GCM" algorithms.
     * @param contentToEncrypt Content to encrypt
     * @param crypto Crypto engine
     */
    encrypt(contentEncryptionAlgorithm: Algorithm, contentToEncrypt: ArrayBuffer, crypto?: ICryptoEngine): Promise<(void | {
        ecdhPrivateKey: CryptoKey;
    })[]>;
    /**
     * Decrypts existing CMS Enveloped Data content
     * @param recipientIndex Index of recipient
     * @param parameters Additional parameters
     * @param crypto Crypto engine
     */
    decrypt(recipientIndex: number, parameters: EnvelopedDataDecryptParams, crypto?: ICryptoEngine): Promise<ArrayBuffer>;
}

declare const VERSION$b = "version";
declare const ENCRYPTED_CONTENT_INFO = "encryptedContentInfo";
declare const UNPROTECTED_ATTRS = "unprotectedAttrs";
interface IEncryptedData {
    /**
     * Version number.
     *
     * If `unprotectedAttrs` is present, then the version MUST be 2. If `unprotectedAttrs` is absent, then version MUST be 0.
     */
    version: number;
    /**
     * Encrypted content information
     */
    encryptedContentInfo: EncryptedContentInfo;
    /**
     * Collection of attributes that are not encrypted
     */
    unprotectedAttrs?: Attribute[];
}
interface EncryptedDataJson {
    version: number;
    encryptedContentInfo: EncryptedContentInfoJson;
    unprotectedAttrs?: AttributeJson[];
}
type EncryptedDataParameters = PkiObjectParameters & Partial<IEncryptedData>;
type EncryptedDataEncryptParams = Omit<CryptoEngineEncryptParams, "contentType">;
/**
 * Represents the EncryptedData structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 *
 * @example The following example demonstrates how to create and encrypt CMS Encrypted Data
 * ```js
 * const cmsEncrypted = new pkijs.EncryptedData();
 *
 * await cmsEncrypted.encrypt({
 *   contentEncryptionAlgorithm: {
 *     name: "AES-GCM",
 *     length: 256,
 *   },
 *   hmacHashAlgorithm: "SHA-256",
 *   iterationCount: 1000,
 *   password: password,
 *   contentToEncrypt: dataToEncrypt,
 * });
 *
 * // Add Encrypted Data into CMS Content Info
 * const cmsContent = new pkijs.ContentInfo();
 * cmsContent.contentType = pkijs.ContentInfo.ENCRYPTED_DATA;
 * cmsContent.content = cmsEncrypted.toSchema();
 *
 * const cmsContentRaw = cmsContent.toSchema().toBER();
 * ```
 *
 * @example The following example demonstrates how to decrypt CMS Encrypted Data
 * ```js
 * // Parse CMS Content Info
 * const cmsContent = pkijs.ContentInfo.fromBER(cmsContentRaw);
 * if (cmsContent.contentType !== pkijs.ContentInfo.ENCRYPTED_DATA) {
 *   throw new Error("CMS is not Encrypted Data");
 * }
 * // Parse CMS Encrypted Data
 * const cmsEncrypted = new pkijs.EncryptedData({ schema: cmsContent.content });
 *
 * // Decrypt data
 * const decryptedData = await cmsEncrypted.decrypt({
 *   password: password,
 * });
 * ```
 */
declare class EncryptedData extends PkiObject implements IEncryptedData {
    static CLASS_NAME: string;
    version: number;
    encryptedContentInfo: EncryptedContentInfo;
    unprotectedAttrs?: Attribute[];
    /**
     * Initializes a new instance of the {@link EncryptedData} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: EncryptedDataParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$b): number;
    static defaultValues(memberName: typeof ENCRYPTED_CONTENT_INFO): EncryptedContentInfo;
    static defaultValues(memberName: typeof UNPROTECTED_ATTRS): Attribute[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * EncryptedData ::= SEQUENCE {
     *    version CMSVersion,
     *    encryptedContentInfo EncryptedContentInfo,
     *    unprotectedAttrs [1] IMPLICIT UnprotectedAttributes OPTIONAL }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        encryptedContentInfo?: EncryptedContentInfoSchema;
        unprotectedAttrs?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): EncryptedDataJson;
    /**
     * Creates a new CMS Encrypted Data content
     * @param parameters Parameters necessary for encryption
     */
    encrypt(parameters: EncryptedDataEncryptParams, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Creates a new CMS Encrypted Data content
     * @param parameters Parameters necessary for encryption
     * @param crypto Crypto engine
     * @returns Returns decrypted raw data
     */
    decrypt(parameters: {
        password: ArrayBuffer;
    }, crypto?: ICryptoEngine): Promise<ArrayBuffer>;
}

declare const SAFE_CONTENTS = "safeContents";
declare const PARSED_VALUE$4 = "parsedValue";
interface IAuthenticatedSafe {
    safeContents: ContentInfo[];
    parsedValue: any;
}
type AuthenticatedSafeParameters = PkiObjectParameters & Partial<IAuthenticatedSafe>;
interface AuthenticatedSafeJson {
    safeContents: ContentInfoJson[];
}
type SafeContent = ContentInfo | EncryptedData | EnvelopedData | object;
/**
 * Represents the AuthenticatedSafe structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class AuthenticatedSafe extends PkiObject implements IAuthenticatedSafe {
    static CLASS_NAME: string;
    safeContents: ContentInfo[];
    parsedValue: any;
    /**
     * Initializes a new instance of the {@link AuthenticatedSafe} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AuthenticatedSafeParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof SAFE_CONTENTS): ContentInfo[];
    static defaultValues(memberName: typeof PARSED_VALUE$4): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AuthenticatedSafe ::= SEQUENCE OF ContentInfo
     * -- Data if unencrypted
     * -- EncryptedData if password-encrypted
     * -- EnvelopedData if public key-encrypted
     *```
     */
    static schema(parameters?: SchemaParameters<{
        contentInfos?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AuthenticatedSafeJson;
    parseInternalValues(parameters: {
        safeContents: SafeContent[];
    }, crypto?: ICryptoEngine): Promise<void>;
    makeInternalValues(parameters: {
        safeContents: any[];
    }, crypto?: ICryptoEngine): Promise<this>;
}

declare const KEY_IDENTIFIER = "keyIdentifier";
declare const AUTHORITY_CERT_ISSUER = "authorityCertIssuer";
declare const AUTHORITY_CERT_SERIAL_NUMBER = "authorityCertSerialNumber";
interface IAuthorityKeyIdentifier {
    keyIdentifier?: asn1js.OctetString;
    authorityCertIssuer?: GeneralName[];
    authorityCertSerialNumber?: asn1js.Integer;
}
type AuthorityKeyIdentifierParameters = PkiObjectParameters & Partial<IAuthorityKeyIdentifier>;
interface AuthorityKeyIdentifierJson {
    keyIdentifier?: asn1js.OctetStringJson;
    authorityCertIssuer?: GeneralNameJson[];
    authorityCertSerialNumber?: asn1js.IntegerJson;
}
/**
 * Represents the AuthorityKeyIdentifier structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class AuthorityKeyIdentifier extends PkiObject implements IAuthorityKeyIdentifier {
    static CLASS_NAME: string;
    keyIdentifier?: asn1js.OctetString;
    authorityCertIssuer?: GeneralName[];
    authorityCertSerialNumber?: asn1js.Integer;
    /**
     * Initializes a new instance of the {@link AuthorityKeyIdentifier} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: AuthorityKeyIdentifierParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof KEY_IDENTIFIER): asn1js.OctetString;
    static defaultValues(memberName: typeof AUTHORITY_CERT_ISSUER): GeneralName[];
    static defaultValues(memberName: typeof AUTHORITY_CERT_SERIAL_NUMBER): asn1js.Integer;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AuthorityKeyIdentifier OID ::= 2.5.29.35
     *
     * AuthorityKeyIdentifier ::= SEQUENCE {
     *    keyIdentifier             [0] KeyIdentifier           OPTIONAL,
     *    authorityCertIssuer       [1] GeneralNames            OPTIONAL,
     *    authorityCertSerialNumber [2] CertificateSerialNumber OPTIONAL  }
     *
     * KeyIdentifier ::= OCTET STRING
     *```
     */
    static schema(parameters?: SchemaParameters<{
        keyIdentifier?: string;
        authorityCertIssuer?: string;
        authorityCertSerialNumber?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): AuthorityKeyIdentifierJson;
}

declare const CA = "cA";
interface IBasicConstraints {
    cA: boolean;
    pathLenConstraint?: number | asn1js.Integer;
}
type BasicConstraintsParameters = PkiObjectParameters & Partial<IBasicConstraints>;
interface BasicConstraintsJson {
    cA?: boolean;
    pathLenConstraint?: asn1js.IntegerJson | number;
}
/**
 * Represents the BasicConstraints structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class BasicConstraints extends PkiObject implements IBasicConstraints {
    static CLASS_NAME: string;
    cA: boolean;
    pathLenConstraint?: number | asn1js.Integer;
    /**
     * Initializes a new instance of the {@link AuthorityKeyIdentifier} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: BasicConstraintsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CA): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * BasicConstraints ::= SEQUENCE {
     *    cA                      BOOLEAN DEFAULT FALSE,
     *    pathLenConstraint       INTEGER (0..MAX) OPTIONAL }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        cA?: string;
        pathLenConstraint?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    /**
     * Conversion for the class to JSON object
     * @returns
     */
    toJSON(): BasicConstraintsJson;
}

declare const HASH_ALGORITHM$4 = "hashAlgorithm";
declare const ISSUER_NAME_HASH = "issuerNameHash";
declare const ISSUER_KEY_HASH = "issuerKeyHash";
declare const SERIAL_NUMBER$1 = "serialNumber";
interface ICertID {
    /**
     * Hash algorithm used to generate the `issuerNameHash` and `issuerKeyHash` values
     */
    hashAlgorithm: AlgorithmIdentifier;
    /**
     * Hash of the issuer's distinguished name (DN). The hash shall be calculated over the DER encoding
     * of the issuer's name field in the certificate being checked.
     */
    issuerNameHash: asn1js.OctetString;
    /**
     * Hash of the issuer's public key. The hash shall be calculated over the value (excluding tag and length)
     * of the subject public key field in the issuer's certificate.
     */
    issuerKeyHash: asn1js.OctetString;
    /**
     * Serial number of the certificate for which status is being requested
     */
    serialNumber: asn1js.Integer;
}
type CertIDParameters = PkiObjectParameters & Partial<ICertID>;
type CertIDSchema = SchemaParameters<{
    hashAlgorithm?: string;
    hashAlgorithmObject?: AlgorithmIdentifierSchema;
    issuerNameHash?: string;
    issuerKeyHash?: string;
    serialNumber?: string;
}>;
interface CertIDJson {
    hashAlgorithm: AlgorithmIdentifierJson;
    issuerNameHash: asn1js.OctetStringJson;
    issuerKeyHash: asn1js.OctetStringJson;
    serialNumber: asn1js.IntegerJson;
}
interface CertIDCreateParams {
    issuerCertificate: Certificate;
    hashAlgorithm: string;
}
/**
 * Represents an CertID described in [RFC6960](https://datatracker.ietf.org/doc/html/rfc6960)
 */
declare class CertID extends PkiObject implements ICertID {
    static CLASS_NAME: string;
    /**
     * Making OCSP certificate identifier for specific certificate
     * @param certificate Certificate making OCSP Request for
     * @param parameters Additional parameters
     * @param crypto Crypto engine
     * @returns Returns created CertID object
     */
    static create(certificate: Certificate, parameters: CertIDCreateParams, crypto?: ICryptoEngine): Promise<CertID>;
    hashAlgorithm: AlgorithmIdentifier;
    issuerNameHash: asn1js.OctetString;
    issuerKeyHash: asn1js.OctetString;
    serialNumber: asn1js.Integer;
    /**
     * Initializes a new instance of the {@link CertID} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertIDParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof HASH_ALGORITHM$4): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ISSUER_NAME_HASH): asn1js.OctetString;
    static defaultValues(memberName: typeof ISSUER_KEY_HASH): asn1js.OctetString;
    static defaultValues(memberName: typeof SERIAL_NUMBER$1): asn1js.Integer;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CertID ::= SEQUENCE {
     *    hashAlgorithm       AlgorithmIdentifier,
     *    issuerNameHash      OCTET STRING, -- Hash of issuer's DN
     *    issuerKeyHash       OCTET STRING, -- Hash of issuer's public key
     *    serialNumber        CertificateSerialNumber }
     *```
     */
    static schema(parameters?: CertIDSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): CertIDJson;
    /**
     * Checks that two "CertIDs" are equal
     * @param certificateID Identifier of the certificate to be checked
     */
    isEqual(certificateID: CertID): boolean;
    /**
     * Making OCSP certificate identifier for specific certificate
     * @param certificate Certificate making OCSP Request for
     * @param parameters Additional parameters
     * @param crypto Crypto engine
     */
    createForCertificate(certificate: Certificate, parameters: CertIDCreateParams, crypto?: ICryptoEngine): Promise<void>;
}

declare const CERT_ID$1 = "certID";
declare const CERT_STATUS = "certStatus";
declare const THIS_UPDATE = "thisUpdate";
declare const NEXT_UPDATE = "nextUpdate";
declare const SINGLE_EXTENSIONS = "singleExtensions";
interface ISingleResponse {
    certID: CertID;
    certStatus: any;
    thisUpdate: Date;
    nextUpdate?: Date;
    singleExtensions?: Extension[];
}
type SingleResponseParameters = PkiObjectParameters & Partial<ISingleResponse>;
type SingleResponseSchema = SchemaParameters<{
    certID?: CertIDSchema;
    certStatus?: string;
    thisUpdate?: string;
    nextUpdate?: string;
    singleExtensions?: ExtensionsSchema;
}>;
interface SingleResponseJson {
    certID: CertIDJson;
    certStatus: any;
    thisUpdate: Date;
    nextUpdate?: Date;
    singleExtensions?: ExtensionJson[];
}
/**
 * Represents an SingleResponse described in [RFC6960](https://datatracker.ietf.org/doc/html/rfc6960)
 */
declare class SingleResponse extends PkiObject implements ISingleResponse {
    static CLASS_NAME: string;
    certID: CertID;
    certStatus: any;
    thisUpdate: Date;
    nextUpdate?: Date;
    singleExtensions?: Extension[];
    /**
     * Initializes a new instance of the {@link SingleResponse} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SingleResponseParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CERT_ID$1): CertID;
    static defaultValues(memberName: typeof CERT_STATUS): any;
    static defaultValues(memberName: typeof THIS_UPDATE): Date;
    static defaultValues(memberName: typeof NEXT_UPDATE): Date;
    static defaultValues(memberName: typeof SINGLE_EXTENSIONS): Extension[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SingleResponse ::= SEQUENCE {
     *    certID                       CertID,
     *    certStatus                   CertStatus,
     *    thisUpdate                   GeneralizedTime,
     *    nextUpdate         [0]       EXPLICIT GeneralizedTime OPTIONAL,
     *    singleExtensions   [1]       EXPLICIT Extensions OPTIONAL }
     *
     * CertStatus ::= CHOICE {
     *    good        [0]     IMPLICIT NULL,
     *    revoked     [1]     IMPLICIT RevokedInfo,
     *    unknown     [2]     IMPLICIT UnknownInfo }
     *
     * RevokedInfo ::= SEQUENCE {
     *    revocationTime              GeneralizedTime,
     *    revocationReason    [0]     EXPLICIT CRLReason OPTIONAL }
     *
     * UnknownInfo ::= NULL
     *```
     */
    static schema(parameters?: SingleResponseSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SingleResponseJson;
}

declare const TBS$2 = "tbs";
declare const VERSION$a = "version";
declare const RESPONDER_ID = "responderID";
declare const PRODUCED_AT = "producedAt";
declare const RESPONSES = "responses";
declare const RESPONSE_EXTENSIONS = "responseExtensions";
interface IResponseData {
    version?: number;
    tbs: ArrayBuffer;
    responderID: any;
    producedAt: Date;
    responses: SingleResponse[];
    responseExtensions?: Extension[];
}
type ResponseDataParameters = PkiObjectParameters & Partial<IResponseData>;
type ResponseDataSchema = SchemaParameters<{
    version?: string;
    responderID?: string;
    ResponseDataByName?: RelativeDistinguishedNamesSchema;
    ResponseDataByKey?: string;
    producedAt?: string;
    response?: SingleResponseSchema;
    extensions?: ExtensionsSchema;
}>;
interface ResponseDataJson {
    version?: number;
    tbs: string;
    responderID: any;
    producedAt: Date;
    responses: SingleResponseJson[];
    responseExtensions?: ExtensionJson[];
}
/**
 * Represents an ResponseData described in [RFC6960](https://datatracker.ietf.org/doc/html/rfc6960)
 */
declare class ResponseData extends PkiObject implements IResponseData {
    static CLASS_NAME: string;
    version?: number;
    tbsView: Uint8Array;
    /**
     * @deprecated Since version 3.0.0
     */
    get tbs(): ArrayBuffer;
    /**
     * @deprecated Since version 3.0.0
     */
    set tbs(value: ArrayBuffer);
    responderID: any;
    producedAt: Date;
    responses: SingleResponse[];
    responseExtensions?: Extension[];
    /**
     * Initializes a new instance of the {@link ResponseData} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ResponseDataParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TBS$2): ArrayBuffer;
    static defaultValues(memberName: typeof VERSION$a): number;
    static defaultValues(memberName: typeof RESPONDER_ID): any;
    static defaultValues(memberName: typeof PRODUCED_AT): Date;
    static defaultValues(memberName: typeof RESPONSES): SingleResponse[];
    static defaultValues(memberName: typeof RESPONSE_EXTENSIONS): Extension[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * ResponseData ::= SEQUENCE {
     *    version              [0] EXPLICIT Version DEFAULT v1,
     *    responderID              ResponderID,
     *    producedAt               GeneralizedTime,
     *    responses                SEQUENCE OF SingleResponse,
     *    responseExtensions   [1] EXPLICIT Extensions OPTIONAL }
     *```
     */
    static schema(parameters?: ResponseDataSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(encodeFlag?: boolean): SchemaType;
    toJSON(): ResponseDataJson;
}

declare const TBS_RESPONSE_DATA = "tbsResponseData";
declare const SIGNATURE_ALGORITHM$4 = "signatureAlgorithm";
declare const SIGNATURE$3 = "signature";
declare const CERTS$2 = "certs";
interface IBasicOCSPResponse {
    tbsResponseData: ResponseData;
    signatureAlgorithm: AlgorithmIdentifier;
    signature: asn1js.BitString;
    certs?: Certificate[];
}
interface CertificateStatus {
    isForCertificate: boolean;
    /**
     * 0 = good, 1 = revoked, 2 = unknown
     */
    status: number;
}
type BasicOCSPResponseParameters = PkiObjectParameters & Partial<IBasicOCSPResponse>;
interface BasicOCSPResponseVerifyParams {
    trustedCerts?: Certificate[];
}
interface BasicOCSPResponseJson {
    tbsResponseData: ResponseDataJson;
    signatureAlgorithm: AlgorithmIdentifierJson;
    signature: asn1js.BitStringJson;
    certs?: CertificateJson[];
}
/**
 * Represents the BasicOCSPResponse structure described in [RFC6960](https://datatracker.ietf.org/doc/html/rfc6960)
 */
declare class BasicOCSPResponse extends PkiObject implements IBasicOCSPResponse {
    static CLASS_NAME: string;
    tbsResponseData: ResponseData;
    signatureAlgorithm: AlgorithmIdentifier;
    signature: asn1js.BitString;
    certs?: Certificate[];
    /**
     * Initializes a new instance of the {@link BasicOCSPResponse} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: BasicOCSPResponseParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TBS_RESPONSE_DATA): ResponseData;
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$4): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE$3): asn1js.BitString;
    static defaultValues(memberName: typeof CERTS$2): Certificate[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * BasicOCSPResponse ::= SEQUENCE {
     *    tbsResponseData      ResponseData,
     *    signatureAlgorithm   AlgorithmIdentifier,
     *    signature            BIT STRING,
     *    certs            [0] EXPLICIT SEQUENCE OF Certificate OPTIONAL }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        tbsResponseData?: ResponseDataSchema;
        signatureAlgorithm?: AlgorithmIdentifierSchema;
        signature?: string;
        certs?: CertificateSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): BasicOCSPResponseJson;
    /**
     * Get OCSP response status for specific certificate
     * @param certificate Certificate to be checked
     * @param issuerCertificate Certificate of issuer for certificate to be checked
     * @param crypto Crypto engine
     */
    getCertificateStatus(certificate: Certificate, issuerCertificate: Certificate, crypto?: ICryptoEngine): Promise<CertificateStatus>;
    /**
     * Make signature for current OCSP Basic Response
     * @param privateKey Private key for "subjectPublicKeyInfo" structure
     * @param hashAlgorithm Hashing algorithm. Default SHA-1
     * @param crypto Crypto engine
     */
    sign(privateKey: CryptoKey, hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Verify existing OCSP Basic Response
     * @param params Additional parameters
     * @param crypto Crypto engine
     */
    verify(params?: BasicOCSPResponseVerifyParams, crypto?: ICryptoEngine): Promise<boolean>;
}

declare const CERTIFICATE_INDEX = "certificateIndex";
declare const KEY_INDEX = "keyIndex";
interface ICAVersion {
    certificateIndex: number;
    keyIndex: number;
}
type CAVersionParameters = PkiObjectParameters & Partial<ICAVersion>;
interface CAVersionJson {
    certificateIndex: number;
    keyIndex: number;
}
/**
 * Represents an CAVersion described in [Certification Authority Renewal](https://docs.microsoft.com/en-us/windows/desktop/seccrypto/certification-authority-renewal)
 */
declare class CAVersion extends PkiObject implements ICAVersion {
    static CLASS_NAME: string;
    certificateIndex: number;
    keyIndex: number;
    /**
     * Initializes a new instance of the {@link CAVersion} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CAVersionParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CERTIFICATE_INDEX): number;
    static defaultValues(memberName: typeof KEY_INDEX): number;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CAVersion ::= INTEGER
     *```
     */
    static schema(): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Integer;
    toJSON(): CAVersionJson;
}

declare const CRL_ID = "crlId";
declare const CRL_VALUE = "crlValue";
declare const PARSED_VALUE$3 = "parsedValue";
interface ICRLBag {
    crlId: string;
    crlValue: any;
    parsedValue?: any;
    certValue?: any;
}
interface CRLBagJson {
    crlId: string;
    crlValue: any;
}
type CRLBagParameters = PkiObjectParameters & Partial<ICRLBag>;
/**
 * Represents the CRLBag structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class CRLBag extends PkiObject implements ICRLBag {
    static CLASS_NAME: string;
    crlId: string;
    crlValue: any;
    parsedValue?: any;
    certValue?: any;
    /**
     * Initializes a new instance of the {@link CRLBag} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CRLBagParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CRL_ID): string;
    static defaultValues(memberName: typeof CRL_VALUE): any;
    static defaultValues(memberName: typeof PARSED_VALUE$3): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CRLBag ::= SEQUENCE {
     *    crlId      BAG-TYPE.&id ({CRLTypes}),
     *    crlValue   [0] EXPLICIT BAG-TYPE.&Type ({CRLTypes}{@crlId})
     *}
     *```
     */
    static schema(parameters?: SchemaParameters<{
        id?: string;
        value?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): CRLBagJson;
}

declare const DISTRIBUTION_POINT$1 = "distributionPoint";
declare const ONLY_CONTAINS_USER_CERTS = "onlyContainsUserCerts";
declare const ONLY_CONTAINS_CA_CERTS = "onlyContainsCACerts";
declare const ONLY_SOME_REASON = "onlySomeReasons";
declare const INDIRECT_CRL = "indirectCRL";
declare const ONLY_CONTAINS_ATTRIBUTE_CERTS = "onlyContainsAttributeCerts";
interface IIssuingDistributionPoint {
    distributionPoint?: DistributionPointName;
    onlyContainsUserCerts: boolean;
    onlyContainsCACerts: boolean;
    onlySomeReasons?: number;
    indirectCRL: boolean;
    onlyContainsAttributeCerts: boolean;
}
interface IssuingDistributionPointJson {
    distributionPoint?: DistributionPointNameJson;
    onlyContainsUserCerts?: boolean;
    onlyContainsCACerts?: boolean;
    onlySomeReasons?: number;
    indirectCRL?: boolean;
    onlyContainsAttributeCerts?: boolean;
}
type DistributionPointName = GeneralName[] | RelativeDistinguishedNames;
type DistributionPointNameJson = GeneralNameJson[] | RelativeDistinguishedNamesJson;
type IssuingDistributionPointParameters = PkiObjectParameters & Partial<IIssuingDistributionPoint>;
/**
 * Represents the IssuingDistributionPoint structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class IssuingDistributionPoint extends PkiObject implements IIssuingDistributionPoint {
    static CLASS_NAME: string;
    distributionPoint?: DistributionPointName;
    onlyContainsUserCerts: boolean;
    onlyContainsCACerts: boolean;
    onlySomeReasons?: number;
    indirectCRL: boolean;
    onlyContainsAttributeCerts: boolean;
    /**
     * Initializes a new instance of the {@link IssuingDistributionPoint} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: IssuingDistributionPointParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof DISTRIBUTION_POINT$1): DistributionPointName;
    static defaultValues(memberName: typeof ONLY_CONTAINS_USER_CERTS): boolean;
    static defaultValues(memberName: typeof ONLY_CONTAINS_CA_CERTS): boolean;
    static defaultValues(memberName: typeof ONLY_SOME_REASON): number;
    static defaultValues(memberName: typeof INDIRECT_CRL): boolean;
    static defaultValues(memberName: typeof ONLY_CONTAINS_ATTRIBUTE_CERTS): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * IssuingDistributionPoint ::= SEQUENCE {
     *    distributionPoint          [0] DistributionPointName OPTIONAL,
     *    onlyContainsUserCerts      [1] BOOLEAN DEFAULT FALSE,
     *    onlyContainsCACerts        [2] BOOLEAN DEFAULT FALSE,
     *    onlySomeReasons            [3] ReasonFlags OPTIONAL,
     *    indirectCRL                [4] BOOLEAN DEFAULT FALSE,
     *    onlyContainsAttributeCerts [5] BOOLEAN DEFAULT FALSE }
     *
     * ReasonFlags ::= BIT STRING {
     *    unused                  (0),
     *    keyCompromise           (1),
     *    cACompromise            (2),
     *    affiliationChanged      (3),
     *    superseded              (4),
     *    cessationOfOperation    (5),
     *    certificateHold         (6),
     *    privilegeWithdrawn      (7),
     *    aACompromise            (8) }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        distributionPoint?: string;
        distributionPointNames?: string;
        onlyContainsUserCerts?: string;
        onlyContainsCACerts?: string;
        onlySomeReasons?: string;
        indirectCRL?: string;
        onlyContainsAttributeCerts?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): IssuingDistributionPointJson;
}

declare const DISTRIBUTION_POINT = "distributionPoint";
declare const REASONS = "reasons";
declare const CRL_ISSUER = "cRLIssuer";
interface IDistributionPoint {
    distributionPoint?: DistributionPointName;
    reasons?: asn1js.BitString;
    cRLIssuer?: GeneralName[];
}
interface DistributionPointJson {
    distributionPoint?: DistributionPointNameJson;
    reasons?: asn1js.BitStringJson;
    cRLIssuer?: GeneralNameJson[];
}
type DistributionPointParameters = PkiObjectParameters & Partial<IDistributionPoint>;
/**
 * Represents the DistributionPoint structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class DistributionPoint extends PkiObject implements IDistributionPoint {
    static CLASS_NAME: string;
    distributionPoint?: DistributionPointName;
    reasons?: asn1js.BitString;
    cRLIssuer?: GeneralName[];
    /**
     * Initializes a new instance of the {@link DistributionPoint} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: DistributionPointParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof DISTRIBUTION_POINT): DistributionPointName;
    static defaultValues(memberName: typeof REASONS): asn1js.BitString;
    static defaultValues(memberName: typeof CRL_ISSUER): GeneralName[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * DistributionPoint ::= SEQUENCE {
     *    distributionPoint       [0]     DistributionPointName OPTIONAL,
     *    reasons                 [1]     ReasonFlags OPTIONAL,
     *    cRLIssuer               [2]     GeneralNames OPTIONAL }
     *
     * DistributionPointName ::= CHOICE {
     *    fullName                [0]     GeneralNames,
     *    nameRelativeToCRLIssuer [1]     RelativeDistinguishedName }
     *
     * ReasonFlags ::= BIT STRING {
     *    unused                  (0),
     *    keyCompromise           (1),
     *    cACompromise            (2),
     *    affiliationChanged      (3),
     *    superseded              (4),
     *    cessationOfOperation    (5),
     *    certificateHold         (6),
     *    privilegeWithdrawn      (7),
     *    aACompromise            (8) }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        distributionPoint?: string;
        distributionPointNames?: string;
        reasons?: string;
        cRLIssuer?: string;
        cRLIssuerNames?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): DistributionPointJson;
}

interface ICRLDistributionPoints {
    distributionPoints: DistributionPoint[];
}
interface CRLDistributionPointsJson {
    distributionPoints: DistributionPointJson[];
}
type CRLDistributionPointsParameters = PkiObjectParameters & Partial<ICRLDistributionPoints>;
/**
 * Represents the CRLDistributionPoints structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class CRLDistributionPoints extends PkiObject implements ICRLDistributionPoints {
    static CLASS_NAME: string;
    distributionPoints: DistributionPoint[];
    /**
     * Initializes a new instance of the {@link CRLDistributionPoints} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CRLDistributionPointsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: string): DistributionPoint[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CRLDistributionPoints ::= SEQUENCE SIZE (1..MAX) OF DistributionPoint
     *```
     */
    static schema(parameters?: SchemaParameters<{
        distributionPoints?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): CRLDistributionPointsJson;
}

declare const CERT_ID = "certId";
declare const CERT_VALUE = "certValue";
declare const PARSED_VALUE$2 = "parsedValue";
interface ICertBag {
    certId: string;
    certValue: asn1js.OctetString | PkiObject;
    parsedValue: any;
}
type CertBagParameters = PkiObjectParameters & Partial<ICertBag>;
interface CertBagJson {
    certId: string;
    certValue: any;
}
/**
 * Represents the CertBag structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class CertBag extends PkiObject implements ICertBag {
    static CLASS_NAME: string;
    certId: string;
    certValue: PkiObject | asn1js.OctetString;
    parsedValue: any;
    /**
     * Initializes a new instance of the {@link CertBag} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertBagParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CERT_ID): string;
    static defaultValues(memberName: typeof CERT_VALUE): any;
    static defaultValues(memberName: typeof PARSED_VALUE$2): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CertBag ::= SEQUENCE {
     *    certId    BAG-TYPE.&id   ({CertTypes}),
     *    certValue [0] EXPLICIT BAG-TYPE.&Type ({CertTypes}{@certId})
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        id?: string;
        value?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): CertBagJson;
}

declare const BASE = "base";
declare const MINIMUM = "minimum";
declare const MAXIMUM = "maximum";
interface IGeneralSubtree {
    base: GeneralName;
    minimum: number | asn1js.Integer;
    maximum?: number | asn1js.Integer;
}
interface GeneralSubtreeJson {
    base: GeneralNameJson;
    minimum?: number | asn1js.IntegerJson;
    maximum?: number | asn1js.IntegerJson;
}
type GeneralSubtreeParameters = PkiObjectParameters & Partial<IGeneralSubtree>;
/**
 * Represents the GeneralSubtree structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class GeneralSubtree extends PkiObject implements IGeneralSubtree {
    static CLASS_NAME: string;
    base: GeneralName;
    minimum: number | asn1js.Integer;
    maximum?: number | asn1js.Integer;
    /**
     * Initializes a new instance of the {@link GeneralSubtree} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: GeneralSubtreeParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof BASE): GeneralName;
    static defaultValues(memberName: typeof MINIMUM): number;
    static defaultValues(memberName: typeof MAXIMUM): number;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * GeneralSubtree ::= SEQUENCE {
     *    base                    GeneralName,
     *    minimum         [0]     BaseDistance DEFAULT 0,
     *    maximum         [1]     BaseDistance OPTIONAL }
     *
     * BaseDistance ::= INTEGER (0..MAX)
     *```
     */
    static schema(parameters?: SchemaParameters<{
        base?: GeneralNameSchema;
        minimum?: string;
        maximum?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): GeneralSubtreeJson;
}

declare const TRUSTED_CERTS = "trustedCerts";
declare const CERTS$1 = "certs";
declare const CRLS$1 = "crls";
declare const OCSPS$1 = "ocsps";
declare const CHECK_DATE = "checkDate";
declare const FIND_ORIGIN = "findOrigin";
declare const FIND_ISSUER = "findIssuer";
declare enum ChainValidationCode {
    unknown = -1,
    success = 0,
    noRevocation = 11,
    noPath = 60,
    noValidPath = 97
}
declare class ChainValidationError extends Error {
    static readonly NAME = "ChainValidationError";
    code: ChainValidationCode;
    constructor(code: ChainValidationCode, message: string);
}
interface CertificateChainValidationEngineVerifyResult {
    result: boolean;
    resultCode: number;
    resultMessage: string;
    error?: Error | ChainValidationError;
    authConstrPolicies?: string[];
    userConstrPolicies?: string[];
    explicitPolicyIndicator?: boolean;
    policyMappings?: string[];
    certificatePath?: Certificate[];
}
type FindOriginCallback = (certificate: Certificate, validationEngine: CertificateChainValidationEngine) => string;
type FindIssuerCallback = (certificate: Certificate, validationEngine: CertificateChainValidationEngine, crypto?: ICryptoEngine) => Promise<Certificate[]>;
interface CertificateChainValidationEngineParameters {
    trustedCerts?: Certificate[];
    certs?: Certificate[];
    crls?: CertificateRevocationList[];
    ocsps?: BasicOCSPResponse[];
    checkDate?: Date;
    findOrigin?: FindOriginCallback;
    findIssuer?: FindIssuerCallback;
}
interface CertificateChainValidationEngineVerifyParams {
    initialPolicySet?: string[];
    initialExplicitPolicy?: boolean;
    initialPolicyMappingInhibit?: boolean;
    initialInhibitPolicy?: boolean;
    initialPermittedSubtreesSet?: GeneralSubtree[];
    initialExcludedSubtreesSet?: GeneralSubtree[];
    initialRequiredNameForms?: GeneralSubtree[];
    passedWhenNotRevValues?: boolean;
}
/**
 * Represents a chain-building engine for {@link Certificate} certificates.
 *
 * @example
 * ```js The following example demonstrates how to verify certificate chain
 * const rootCa = pkijs.Certificate.fromBER(certRaw1);
 * const intermediateCa = pkijs.Certificate.fromBER(certRaw2);
 * const leafCert = pkijs.Certificate.fromBER(certRaw3);
 * const crl1 = pkijs.CertificateRevocationList.fromBER(crlRaw1);
 * const ocsp1 = pkijs.BasicOCSPResponse.fromBER(ocspRaw1);
 *
 * const chainEngine = new pkijs.CertificateChainValidationEngine({
 *   certs: [rootCa, intermediateCa, leafCert],
 *   crls: [crl1],
 *   ocsps: [ocsp1],
 *   checkDate: new Date("2015-07-13"), // optional
 *   trustedCerts: [rootCa],
 * });
 *
 * const chain = await chainEngine.verify();
 * ```
 */
declare class CertificateChainValidationEngine {
    /**
     * Array of pre-defined trusted (by user) certificates
     */
    trustedCerts: Certificate[];
    /**
     * Array with certificate chain. Could be only one end-user certificate in there!
     */
    certs: Certificate[];
    /**
     * Array of all CRLs for all certificates from certificate chain
     */
    crls: CertificateRevocationList[];
    /**
     * Array of all OCSP responses
     */
    ocsps: BasicOCSPResponse[];
    /**
     * The date at which the check would be
     */
    checkDate: Date;
    /**
     * The date at which the check would be
     */
    findOrigin: FindOriginCallback;
    /**
     * The date at which the check would be
     */
    findIssuer: FindIssuerCallback;
    /**
     * Constructor for CertificateChainValidationEngine class
     * @param parameters
     */
    constructor(parameters?: CertificateChainValidationEngineParameters);
    static defaultFindOrigin(certificate: Certificate, validationEngine: CertificateChainValidationEngine): string;
    defaultFindIssuer(certificate: Certificate, validationEngine: CertificateChainValidationEngine, crypto?: ICryptoEngine): Promise<Certificate[]>;
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    defaultValues(memberName: typeof TRUSTED_CERTS): Certificate[];
    defaultValues(memberName: typeof CERTS$1): Certificate[];
    defaultValues(memberName: typeof CRLS$1): CertificateRevocationList[];
    defaultValues(memberName: typeof OCSPS$1): BasicOCSPResponse[];
    defaultValues(memberName: typeof CHECK_DATE): Date;
    defaultValues(memberName: typeof FIND_ORIGIN): FindOriginCallback;
    defaultValues(memberName: typeof FIND_ISSUER): FindIssuerCallback;
    sort(passedWhenNotRevValues?: boolean, crypto?: ICryptoEngine): Promise<Certificate[]>;
    /**
     * Major verification function for certificate chain.
     * @param parameters
     * @param crypto Crypto engine
     * @returns
     */
    verify(parameters?: CertificateChainValidationEngineVerifyParams, crypto?: ICryptoEngine): Promise<CertificateChainValidationEngineVerifyResult>;
}

declare const POLICY_QUALIFIER_ID = "policyQualifierId";
declare const QUALIFIER = "qualifier";
interface IPolicyQualifierInfo {
    policyQualifierId: string;
    qualifier: SchemaType;
}
type PolicyQualifierInfoParameters = PkiObjectParameters & Partial<IPolicyQualifierInfo>;
interface PolicyQualifierInfoJson {
    policyQualifierId: string;
    qualifier: any;
}
/**
 * Represents the PolicyQualifierInfo structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class PolicyQualifierInfo extends PkiObject implements IPolicyQualifierInfo {
    static CLASS_NAME: string;
    policyQualifierId: string;
    qualifier: SchemaType;
    /**
     * Initializes a new instance of the {@link PolicyQualifierInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PolicyQualifierInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof POLICY_QUALIFIER_ID): string;
    static defaultValues(memberName: typeof QUALIFIER): asn1js.Any;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PolicyQualifierInfo ::= SEQUENCE {
     *    policyQualifierId  PolicyQualifierId,
     *    qualifier          ANY DEFINED BY policyQualifierId }
     *
     * id-qt          OBJECT IDENTIFIER ::= { id-pkix 2 }
     * id-qt-cps      OBJECT IDENTIFIER ::= { id-qt 1 }
     * id-qt-unotice  OBJECT IDENTIFIER ::= { id-qt 2 }
     *
     * PolicyQualifierId ::= OBJECT IDENTIFIER ( id-qt-cps | id-qt-unotice )
     *```
     */
    static schema(parameters?: SchemaParameters<{
        policyQualifierId?: string;
        qualifier?: string;
    }>): asn1js.Sequence;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PolicyQualifierInfoJson;
}

declare const POLICY_IDENTIFIER = "policyIdentifier";
declare const POLICY_QUALIFIERS = "policyQualifiers";
interface IPolicyInformation {
    policyIdentifier: string;
    policyQualifiers?: PolicyQualifierInfo[];
}
type PolicyInformationParameters = PkiObjectParameters & Partial<IPolicyInformation>;
interface PolicyInformationJson {
    policyIdentifier: string;
    policyQualifiers?: PolicyQualifierInfoJson[];
}
/**
 * Represents the PolicyInformation structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class PolicyInformation extends PkiObject implements IPolicyInformation {
    static CLASS_NAME: string;
    policyIdentifier: string;
    policyQualifiers?: PolicyQualifierInfo[];
    /**
     * Initializes a new instance of the {@link PolicyInformation} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PolicyInformationParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof POLICY_IDENTIFIER): string;
    static defaultValues(memberName: typeof POLICY_QUALIFIERS): PolicyQualifierInfo[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PolicyInformation ::= SEQUENCE {
     *    policyIdentifier   CertPolicyId,
     *    policyQualifiers   SEQUENCE SIZE (1..MAX) OF
     *    PolicyQualifierInfo OPTIONAL }
     *
     * CertPolicyId ::= OBJECT IDENTIFIER
     *```
     */
    static schema(parameters?: SchemaParameters<{
        policyIdentifier?: string;
        policyQualifiers?: string;
    }>): SchemaType;
    /**
     * Converts parsed ASN.1 object into current class
     * @param schema
     */
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PolicyInformationJson;
}

declare const CERTIFICATE_POLICIES = "certificatePolicies";
interface ICertificatePolicies {
    certificatePolicies: PolicyInformation[];
}
type CertificatePoliciesParameters = PkiObjectParameters & Partial<ICertificatePolicies>;
interface CertificatePoliciesJson {
    certificatePolicies: PolicyInformationJson[];
}
/**
 * Represents the CertificatePolicies structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class CertificatePolicies extends PkiObject implements ICertificatePolicies {
    static CLASS_NAME: string;
    certificatePolicies: PolicyInformation[];
    /**
     * Initializes a new instance of the {@link CertificatePolicies} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertificatePoliciesParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof CERTIFICATE_POLICIES): PolicyInformation[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * certificatePolicies ::= SEQUENCE SIZE (1..MAX) OF PolicyInformation
     *```
     */
    static schema(parameters?: SchemaParameters<{
        certificatePolicies?: string;
    }>): asn1js.Sequence;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): CertificatePoliciesJson;
}

declare const TEMPLATE_ID = "templateID";
declare const TEMPLATE_MAJOR_VERSION = "templateMajorVersion";
declare const TEMPLATE_MINOR_VERSION = "templateMinorVersion";
interface ICertificateTemplate {
    templateID: string;
    templateMajorVersion?: number;
    templateMinorVersion?: number;
}
interface CertificateTemplateJson {
    templateID: string;
    templateMajorVersion?: number;
    templateMinorVersion?: number;
}
type CertificateTemplateParameters = PkiObjectParameters & Partial<ICertificateTemplate>;
/**
 * Class from "[MS-WCCE]: Windows Client Certificate Enrollment Protocol"
 */
declare class CertificateTemplate extends PkiObject implements ICertificateTemplate {
    templateID: string;
    templateMajorVersion?: number;
    templateMinorVersion?: number;
    /**
     * Initializes a new instance of the {@link CertificateTemplate} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertificateTemplateParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TEMPLATE_MINOR_VERSION): number;
    static defaultValues(memberName: typeof TEMPLATE_MAJOR_VERSION): number;
    static defaultValues(memberName: typeof TEMPLATE_ID): string;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CertificateTemplateOID ::= SEQUENCE {
     *    templateID              OBJECT IDENTIFIER,
     *    templateMajorVersion    INTEGER (0..4294967295) OPTIONAL,
     *    templateMinorVersion    INTEGER (0..4294967295) OPTIONAL
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        templateID?: string;
        templateMajorVersion?: string;
        templateMinorVersion?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): CertificateTemplateJson;
}

declare const TBS$1 = "tbs";
declare const VERSION$9 = "version";
declare const SUBJECT = "subject";
declare const SPKI = "subjectPublicKeyInfo";
declare const ATTRIBUTES$2 = "attributes";
declare const SIGNATURE_ALGORITHM$3 = "signatureAlgorithm";
declare const SIGNATURE_VALUE = "signatureValue";
interface ICertificationRequest {
    /**
     * Value being signed
     */
    tbs: ArrayBuffer;
    /**
     * Version number. It should be 0
     */
    version: number;
    /**
     * Distinguished name of the certificate subject
     */
    subject: RelativeDistinguishedNames;
    /**
     * Information about the public key being certified
     */
    subjectPublicKeyInfo: PublicKeyInfo;
    /**
     * Collection of attributes providing additional information about the subject of the certificate
     */
    attributes?: Attribute[];
    /**
     * signature algorithm (and any associated parameters) under which the certification-request information is signed
     */
    signatureAlgorithm: AlgorithmIdentifier;
    /**
     * result of signing the certification request information with the certification request subject's private key
     */
    signatureValue: asn1js.BitString;
}
/**
 * JSON representation of {@link CertificationRequest}
 */
interface CertificationRequestJson {
    tbs: string;
    version: number;
    subject: RelativeDistinguishedNamesJson;
    subjectPublicKeyInfo: PublicKeyInfoJson | JsonWebKey;
    attributes?: AttributeJson[];
    signatureAlgorithm: AlgorithmIdentifierJson;
    signatureValue: asn1js.BitStringJson;
}
interface CertificationRequestInfoParameters {
    names?: {
        blockName?: string;
        CertificationRequestInfo?: string;
        CertificationRequestInfoVersion?: string;
        subject?: RelativeDistinguishedNamesSchema;
        CertificationRequestInfoAttributes?: string;
        attributes?: AttributeSchema;
    };
}
type CertificationRequestParameters = PkiObjectParameters & Partial<ICertificationRequest>;
/**
 * Represents the CertificationRequest structure described in [RFC2986](https://datatracker.ietf.org/doc/html/rfc2986)
 *
 * @example The following example demonstrates how to parse PKCS#11 certification request
 * and verify its challenge password extension and signature value
 * ```js
 * const pkcs10 = pkijs.CertificationRequest.fromBER(pkcs10Raw);
 *
 * // Get and validate challenge password extension
 * if (pkcs10.attributes) {
 *   const attrExtensions = pkcs10.attributes.find(o => o.type === "1.2.840.113549.1.9.14"); // pkcs-9-at-extensionRequest
 *   if (attrExtensions) {
 *     const extensions = new pkijs.Extensions({ schema: attrExtensions.values[0] });
 *     for (const extension of extensions.extensions) {
 *       if (extension.extnID === "1.2.840.113549.1.9.7") { // pkcs-9-at-challengePassword
 *         const asn = asn1js.fromBER(extension.extnValue.valueBlock.valueHex);
 *         if (asn.result.valueBlock.value !== "passwordChallenge") {
 *           throw new Error("PKCS#11 certification request is invalid. Challenge password is incorrect");
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * // Verify signature value
 * const ok = await pkcs10.verify();
 * if (!ok) {
 *   throw Error("PKCS#11 certification request is invalid. Signature is wrong")
 * }
 * ```
 *
 * @example The following example demonstrates how to create PKCS#11 certification request
 * ```js
 * // Get a "crypto" extension
 * const crypto = pkijs.getCrypto(true);
 *
 * const pkcs10 = new pkijs.CertificationRequest();
 *
 * pkcs10.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({
 *   type: "2.5.4.3",
 *   value: new asn1js.Utf8String({ value: "Test" })
 * }));
 *
 *
 * await pkcs10.subjectPublicKeyInfo.importKey(keys.publicKey);
 *
 * pkcs10.attributes = [];
 *
 * // Subject Alternative Name
 * const altNames = new pkijs.GeneralNames({
 *   names: [
 *     new pkijs.GeneralName({ // email
 *       type: 1,
 *       value: "email@address.com"
 *     }),
 *     new pkijs.GeneralName({ // domain
 *       type: 2,
 *       value: "www.domain.com"
 *     }),
 *   ]
 * });
 *
 * // SubjectKeyIdentifier
 * const subjectKeyIdentifier = await crypto.digest({ name: "SHA-1" }, pkcs10.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHex);
 *
 * pkcs10.attributes.push(new pkijs.Attribute({
 *   type: "1.2.840.113549.1.9.14", // pkcs-9-at-extensionRequest
 *   values: [(new pkijs.Extensions({
 *     extensions: [
 *       new pkijs.Extension({
 *         extnID: "2.5.29.14", // id-ce-subjectKeyIdentifier
 *         critical: false,
 *         extnValue: (new asn1js.OctetString({ valueHex: subjectKeyIdentifier })).toBER(false)
 *       }),
 *       new pkijs.Extension({
 *         extnID: "2.5.29.17", // id-ce-subjectAltName
 *         critical: false,
 *         extnValue: altNames.toSchema().toBER(false)
 *       }),
 *       new pkijs.Extension({
 *         extnID: "1.2.840.113549.1.9.7", // pkcs-9-at-challengePassword
 *         critical: false,
 *         extnValue: (new asn1js.PrintableString({ value: "passwordChallenge" })).toBER(false)
 *       })
 *     ]
 *   })).toSchema()]
 * }));
 *
 * // Signing final PKCS#10 request
 * await pkcs10.sign(keys.privateKey, "SHA-256");
 *
 * const pkcs10Raw = pkcs10.toSchema(true).toBER();
 * ```
 */
declare class CertificationRequest extends PkiObject implements ICertificationRequest {
    static CLASS_NAME: string;
    tbsView: Uint8Array;
    /**
     * @deprecated Since version 3.0.0
     */
    get tbs(): ArrayBuffer;
    /**
     * @deprecated Since version 3.0.0
     */
    set tbs(value: ArrayBuffer);
    version: number;
    subject: RelativeDistinguishedNames;
    subjectPublicKeyInfo: PublicKeyInfo;
    attributes?: Attribute[];
    signatureAlgorithm: AlgorithmIdentifier;
    signatureValue: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link CertificationRequest} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: CertificationRequestParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TBS$1): ArrayBuffer;
    static defaultValues(memberName: typeof VERSION$9): number;
    static defaultValues(memberName: typeof SUBJECT): RelativeDistinguishedNames;
    static defaultValues(memberName: typeof SPKI): PublicKeyInfo;
    static defaultValues(memberName: typeof ATTRIBUTES$2): Attribute[];
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$3): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE_VALUE): asn1js.BitString;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * CertificationRequest ::= SEQUENCE {
     *    certificationRequestInfo CertificationRequestInfo,
     *    signatureAlgorithm       AlgorithmIdentifier{{ SignatureAlgorithms }},
     *    signature                BIT STRING
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        certificationRequestInfo?: CertificationRequestInfoParameters;
        signatureAlgorithm?: string;
        signatureValue?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    /**
     * Aux function making ASN1js Sequence from current TBS
     * @returns
     */
    protected encodeTBS(): asn1js.Sequence;
    toSchema(encodeFlag?: boolean): asn1js.Sequence;
    toJSON(): CertificationRequestJson;
    /**
     * Makes signature for current certification request
     * @param privateKey WebCrypto private key
     * @param hashAlgorithm String representing current hashing algorithm
     * @param crypto Crypto engine
     */
    sign(privateKey: CryptoKey, hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Verify existing certification request signature
     * @param crypto Crypto engine
     * @returns Returns `true` if signature value is valid, otherwise `false`
     */
    verify(crypto?: ICryptoEngine): Promise<boolean>;
    /**
     * Importing public key for current certificate request
     * @param parameters
     * @param crypto Crypto engine
     * @returns WebCrypt public key
     */
    getPublicKey(parameters?: CryptoEnginePublicKeyParams, crypto?: ICryptoEngine): Promise<CryptoKey>;
}

declare abstract class AbstractCryptoEngine implements ICryptoEngine {
    name: string;
    crypto: Crypto;
    subtle: SubtleCrypto;
    /**
     * Constructor for CryptoEngine class
     * @param parameters
     */
    constructor(parameters: CryptoEngineParameters);
    abstract getOIDByAlgorithm(algorithm: Algorithm, safety?: boolean, target?: string): string;
    abstract getAlgorithmParameters(algorithmName: string, operation: CryptoEngineAlgorithmOperation): CryptoEngineAlgorithmParams;
    abstract getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety?: boolean, target?: string): object | T;
    abstract getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety: true, target?: string): T;
    abstract getAlgorithmByOID(oid: any, safety?: any, target?: any): object;
    abstract getHashAlgorithm(signatureAlgorithm: AlgorithmIdentifier): string;
    abstract getSignatureParameters(privateKey: CryptoKey, hashAlgorithm?: string): Promise<CryptoEngineSignatureParams>;
    abstract signWithPrivateKey(data: BufferSource, privateKey: CryptoKey, parameters: CryptoEngineSignWithPrivateKeyParams): Promise<ArrayBuffer>;
    abstract verifyWithPublicKey(data: BufferSource, signature: BitString | OctetString, publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier, shaAlgorithm?: string): Promise<boolean>;
    abstract getPublicKey(publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier, parameters?: CryptoEnginePublicKeyParams): Promise<CryptoKey>;
    abstract encryptEncryptedContentInfo(parameters: CryptoEngineEncryptParams): Promise<EncryptedContentInfo>;
    abstract decryptEncryptedContentInfo(parameters: CryptoEngineDecryptParams): Promise<ArrayBuffer>;
    abstract stampDataWithPassword(parameters: CryptoEngineStampDataWithPasswordParams): Promise<ArrayBuffer>;
    abstract verifyDataStampedWithPassword(parameters: CryptoEngineVerifyDataStampedWithPasswordParams): Promise<boolean>;
    encrypt(algorithm: globalThis.AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
    decrypt(algorithm: globalThis.AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
    sign(algorithm: globalThis.AlgorithmIdentifier | RsaPssParams | EcdsaParams, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer>;
    verify(algorithm: globalThis.AlgorithmIdentifier | RsaPssParams | EcdsaParams, key: CryptoKey, signature: BufferSource, data: BufferSource): Promise<boolean>;
    digest(algorithm: globalThis.AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer>;
    generateKey(algorithm: "Ed25519", extractable: boolean, keyUsages: ReadonlyArray<"sign" | "verify">): Promise<CryptoKeyPair>;
    generateKey(algorithm: RsaHashedKeyGenParams | EcKeyGenParams, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKeyPair>;
    generateKey(algorithm: AesKeyGenParams | HmacKeyGenParams | Pbkdf2Params, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    generateKey(algorithm: globalThis.AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKeyPair | CryptoKey>;
    deriveKey(algorithm: globalThis.AlgorithmIdentifier | EcdhKeyDeriveParams | HkdfParams | Pbkdf2Params, baseKey: CryptoKey, derivedKeyType: globalThis.AlgorithmIdentifier | HkdfParams | Pbkdf2Params | AesDerivedKeyParams | HmacImportParams, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    deriveKey(algorithm: globalThis.AlgorithmIdentifier | EcdhKeyDeriveParams | HkdfParams | Pbkdf2Params, baseKey: CryptoKey, derivedKeyType: globalThis.AlgorithmIdentifier | HkdfParams | Pbkdf2Params | AesDerivedKeyParams | HmacImportParams, extractable: boolean, keyUsages: Iterable<KeyUsage>): Promise<CryptoKey>;
    deriveBits(algorithm: globalThis.AlgorithmIdentifier | EcdhKeyDeriveParams | HkdfParams | Pbkdf2Params, baseKey: CryptoKey, length: number): Promise<ArrayBuffer>;
    wrapKey(format: KeyFormat, key: CryptoKey, wrappingKey: CryptoKey, wrapAlgorithm: globalThis.AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams): Promise<ArrayBuffer>;
    unwrapKey(format: KeyFormat, wrappedKey: BufferSource, unwrappingKey: CryptoKey, unwrapAlgorithm: globalThis.AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams, unwrappedKeyAlgorithm: globalThis.AlgorithmIdentifier | HmacImportParams | RsaHashedImportParams | EcKeyImportParams | AesKeyAlgorithm, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    unwrapKey(format: KeyFormat, wrappedKey: BufferSource, unwrappingKey: CryptoKey, unwrapAlgorithm: globalThis.AlgorithmIdentifier | RsaOaepParams | AesCtrParams | AesCbcParams | AesGcmParams, unwrappedKeyAlgorithm: globalThis.AlgorithmIdentifier | HmacImportParams | RsaHashedImportParams | EcKeyImportParams | AesKeyAlgorithm, extractable: boolean, keyUsages: Iterable<KeyUsage>): Promise<CryptoKey>;
    exportKey(format: "jwk", key: CryptoKey): Promise<JsonWebKey>;
    exportKey(format: "pkcs8" | "raw" | "spki", key: CryptoKey): Promise<ArrayBuffer>;
    importKey(format: "jwk", keyData: JsonWebKey, algorithm: globalThis.AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    importKey(format: "pkcs8" | "raw" | "spki", keyData: BufferSource, algorithm: globalThis.AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    importKey(format: "jwk", keyData: JsonWebKey, algorithm: globalThis.AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    importKey(format: "pkcs8" | "raw" | "spki", keyData: BufferSource, algorithm: globalThis.AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm, extractable: boolean, keyUsages: Iterable<KeyUsage>): Promise<CryptoKey>;
    getRandomValues<T extends ArrayBufferView | null>(array: T): T;
}

/**
 * Default cryptographic engine for Web Cryptography API
 */
declare class CryptoEngine extends AbstractCryptoEngine {
    importKey(format: KeyFormat, keyData: BufferSource | JsonWebKey, algorithm: globalThis.AlgorithmIdentifier, extractable: boolean, keyUsages: KeyUsage[]): Promise<CryptoKey>;
    /**
     * Export WebCrypto keys to different formats
     * @param format
     * @param key
     */
    exportKey(format: "jwk", key: CryptoKey): Promise<JsonWebKey>;
    exportKey(format: Exclude<KeyFormat, "jwk">, key: CryptoKey): Promise<ArrayBuffer>;
    exportKey(format: string, key: CryptoKey): Promise<ArrayBuffer | JsonWebKey>;
    /**
     * Convert WebCrypto keys between different export formats
     * @param  inputFormat
     * @param  outputFormat
     * @param  keyData
     * @param  algorithm
     * @param  extractable
     * @param  keyUsages
     */
    convert(inputFormat: KeyFormat, outputFormat: KeyFormat, keyData: ArrayBuffer | JsonWebKey, algorithm: Algorithm, extractable: boolean, keyUsages: KeyUsage[]): Promise<ArrayBuffer | JsonWebKey>;
    /**
     * Gets WebCrypto algorithm by wel-known OID
     * @param oid algorithm identifier
     * @param safety if `true` throws exception on unknown algorithm identifier
     * @param target name of the target
     * @returns Returns WebCrypto algorithm or an empty object
     */
    getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety?: boolean, target?: string): T | object;
    /**
     * Gets WebCrypto algorithm by wel-known OID
     * @param oid algorithm identifier
     * @param safety if `true` throws exception on unknown algorithm identifier
     * @param target name of the target
     * @returns Returns WebCrypto algorithm
     * @throws Throws {@link Error} exception if unknown algorithm identifier
     */
    getAlgorithmByOID<T extends Algorithm = Algorithm>(oid: string, safety: true, target?: string): T;
    getOIDByAlgorithm(algorithm: Algorithm, safety?: boolean, target?: string): string;
    getAlgorithmParameters(algorithmName: string, operation: CryptoEngineAlgorithmOperation): CryptoEngineAlgorithmParams;
    /**
     * Getting hash algorithm by signature algorithm
     * @param signatureAlgorithm Signature algorithm
     */
    getHashAlgorithm(signatureAlgorithm: AlgorithmIdentifier): string;
    encryptEncryptedContentInfo(parameters: CryptoEngineEncryptParams): Promise<EncryptedContentInfo>;
    /**
     * Decrypt data stored in "EncryptedContentInfo" object using parameters
     * @param parameters
     */
    decryptEncryptedContentInfo(parameters: CryptoEngineDecryptParams): Promise<ArrayBuffer>;
    stampDataWithPassword(parameters: CryptoEngineStampDataWithPasswordParams): Promise<ArrayBuffer>;
    verifyDataStampedWithPassword(parameters: CryptoEngineVerifyDataStampedWithPasswordParams): Promise<boolean>;
    getSignatureParameters(privateKey: CryptoKey, hashAlgorithm?: string): Promise<CryptoEngineSignatureParams>;
    signWithPrivateKey(data: BufferSource, privateKey: CryptoKey, parameters: CryptoEngineSignWithPrivateKeyParams): Promise<ArrayBuffer>;
    fillPublicKeyParameters(publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier): CryptoEnginePublicKeyParams;
    getPublicKey(publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier, parameters?: CryptoEnginePublicKeyParams): Promise<CryptoKey>;
    verifyWithPublicKey(data: BufferSource, signature: asn1js.BitString | asn1js.OctetString, publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier, shaAlgorithm?: string): Promise<boolean>;
}

declare const DIGEST_ALGORITHM$1 = "digestAlgorithm";
declare const DIGEST = "digest";
interface IDigestInfo {
    digestAlgorithm: AlgorithmIdentifier;
    digest: asn1js.OctetString;
}
interface DigestInfoJson {
    digestAlgorithm: AlgorithmIdentifierJson;
    digest: asn1js.OctetStringJson;
}
type DigestInfoParameters = PkiObjectParameters & Partial<IDigestInfo>;
type DigestInfoSchema = SchemaParameters<{
    digestAlgorithm?: AlgorithmIdentifierSchema;
    digest?: string;
}>;
/**
 * Represents the DigestInfo structure described in [RFC3447](https://datatracker.ietf.org/doc/html/rfc3447)
 */
declare class DigestInfo extends PkiObject implements IDigestInfo {
    static CLASS_NAME: string;
    digestAlgorithm: AlgorithmIdentifier;
    digest: asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link DigestInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: DigestInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof DIGEST_ALGORITHM$1): AlgorithmIdentifier;
    static defaultValues(memberName: typeof DIGEST): asn1js.OctetString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * DigestInfo ::= SEQUENCE {
     *    digestAlgorithm DigestAlgorithmIdentifier,
     *    digest Digest }
     *
     * Digest ::= OCTET STRING
     *```
     */
    static schema(parameters?: DigestInfoSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): DigestInfoJson;
}

declare const KEY_INFO = "keyInfo";
declare const ENTITY_U_INFO = "entityUInfo";
declare const SUPP_PUB_INFO = "suppPubInfo";
interface IECCCMSSharedInfo {
    keyInfo: AlgorithmIdentifier;
    entityUInfo?: asn1js.OctetString;
    suppPubInfo: asn1js.OctetString;
}
interface ECCCMSSharedInfoJson {
    keyInfo: AlgorithmIdentifierJson;
    entityUInfo?: asn1js.OctetStringJson;
    suppPubInfo: asn1js.OctetStringJson;
}
type ECCCMSSharedInfoParameters = PkiObjectParameters & Partial<IECCCMSSharedInfo>;
/**
 * Represents the ECCCMSSharedInfo structure described in [RFC6318](https://datatracker.ietf.org/doc/html/rfc6318)
 */
declare class ECCCMSSharedInfo extends PkiObject implements IECCCMSSharedInfo {
    static CLASS_NAME: string;
    keyInfo: AlgorithmIdentifier;
    entityUInfo?: asn1js.OctetString;
    suppPubInfo: asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link ECCCMSSharedInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ECCCMSSharedInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof KEY_INFO): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ENTITY_U_INFO): asn1js.OctetString;
    static defaultValues(memberName: typeof SUPP_PUB_INFO): asn1js.OctetString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * ECC-CMS-SharedInfo ::= SEQUENCE {
     *    keyInfo      AlgorithmIdentifier,
     *    entityUInfo  [0] EXPLICIT OCTET STRING OPTIONAL,
     *    suppPubInfo  [2] EXPLICIT OCTET STRING }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        keyInfo?: AlgorithmIdentifierSchema;
        entityUInfo?: string;
        suppPubInfo?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ECCCMSSharedInfoJson;
}

interface ECNamedCurve {
    /**
     * The curve ASN.1 object identifier
     */
    id: string;
    /**
     * The name of the curve
     */
    name: string;
    /**
     * The coordinate length in bytes
     */
    size: number;
}
declare class ECNamedCurves {
    static readonly namedCurves: Record<string, ECNamedCurve>;
    /**
     * Registers an ECC named curve
     * @param name The name o the curve
     * @param id The curve ASN.1 object identifier
     * @param size The coordinate length in bytes
     */
    static register(name: string, id: string, size: number): void;
    /**
    * Returns an ECC named curve object
    * @param nameOrId Name or identifier of the named curve
    * @returns
    */
    static find(nameOrId: string): ECNamedCurve | null;
}

declare const VERSION$8 = "version";
declare const PRIVATE_KEY = "privateKey";
declare const NAMED_CURVE = "namedCurve";
declare const PUBLIC_KEY$1 = "publicKey";
interface IECPrivateKey {
    version: number;
    privateKey: asn1js.OctetString;
    namedCurve?: string;
    publicKey?: ECPublicKey;
}
type ECPrivateKeyParameters = PkiObjectParameters & Partial<IECPrivateKey> & {
    json?: ECPrivateKeyJson;
};
interface ECPrivateKeyJson {
    crv: string;
    y?: string;
    x?: string;
    d: string;
}
/**
 * Represents the PrivateKeyInfo structure described in [RFC5915](https://datatracker.ietf.org/doc/html/rfc5915)
 */
declare class ECPrivateKey extends PkiObject implements IECPrivateKey {
    static CLASS_NAME: string;
    version: number;
    privateKey: asn1js.OctetString;
    namedCurve?: string;
    publicKey?: ECPublicKey;
    /**
     * Initializes a new instance of the {@link ECPrivateKey} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ECPrivateKeyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$8): 1;
    static defaultValues(memberName: typeof PRIVATE_KEY): asn1js.OctetString;
    static defaultValues(memberName: typeof NAMED_CURVE): string;
    static defaultValues(memberName: typeof PUBLIC_KEY$1): ECPublicKey;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * ECPrivateKey ::= SEQUENCE {
     * version        INTEGER { ecPrivkeyVer1(1) } (ecPrivkeyVer1),
     * privateKey     OCTET STRING,
     * parameters [0] ECParameters {{ NamedCurve }} OPTIONAL,
     * publicKey  [1] BIT STRING OPTIONAL
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        privateKey?: string;
        namedCurve?: string;
        publicKey?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ECPrivateKeyJson;
    /**
     * Converts JSON value into current object
     * @param json JSON object
     */
    fromJSON(json: any): void;
}

declare const E_CONTENT_TYPE = "eContentType";
declare const E_CONTENT = "eContent";
interface IEncapsulatedContentInfo {
    eContentType: string;
    eContent?: asn1js.OctetString;
}
interface EncapsulatedContentInfoJson {
    eContentType: string;
    eContent?: asn1js.OctetStringJson;
}
type EncapsulatedContentInfoParameters = PkiObjectParameters & Partial<IEncapsulatedContentInfo>;
type EncapsulatedContentInfoSchema = SchemaParameters<{
    eContentType?: string;
    eContent?: string;
}>;
/**
 * Represents the EncapsulatedContentInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class EncapsulatedContentInfo extends PkiObject implements IEncapsulatedContentInfo {
    static CLASS_NAME: string;
    eContentType: string;
    eContent?: asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link EncapsulatedContentInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: EncapsulatedContentInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof E_CONTENT_TYPE): string;
    static defaultValues(memberName: typeof E_CONTENT): asn1js.OctetString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * EncapsulatedContentInfo ::= SEQUENCE {
     *    eContentType ContentType,
     *    eContent [0] EXPLICIT OCTET STRING OPTIONAL } * Changed it to ANY, as in PKCS#7
     *```
     */
    static schema(parameters?: EncapsulatedContentInfoSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): EncapsulatedContentInfoJson;
}

declare const KEY_PURPOSES = "keyPurposes";
interface IExtKeyUsage {
    keyPurposes: string[];
}
interface ExtKeyUsageJson {
    keyPurposes: string[];
}
type ExtKeyUsageParameters = PkiObjectParameters & Partial<IExtKeyUsage>;
/**
 * Represents the ExtKeyUsage structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class ExtKeyUsage extends PkiObject implements IExtKeyUsage {
    static CLASS_NAME: string;
    keyPurposes: string[];
    /**
     * Initializes a new instance of the {@link ExtKeyUsage} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ExtKeyUsageParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof KEY_PURPOSES): string[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * ExtKeyUsage ::= SEQUENCE SIZE (1..MAX) OF KeyPurposeId
     *
     * KeyPurposeId ::= OBJECT IDENTIFIER
     *```
     */
    static schema(parameters?: SchemaParameters<{
        keyPurposes?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ExtKeyUsageJson;
}

/**
 * String preparation function. In a future here will be realization of algorithm from RFC4518
 * @param inputString JavaScript string. As soon as for each ASN.1 string type we have a specific
 *                    transformation function here we will work with pure JavaScript string
 * @returns Formatted string
 */
declare function stringPrep(inputString: string): string;

declare const ACCESS_DESCRIPTIONS = "accessDescriptions";
interface IInfoAccess {
    accessDescriptions: AccessDescription[];
}
interface InfoAccessJson {
    accessDescriptions: AccessDescriptionJson[];
}
type InfoAccessParameters = PkiObjectParameters & Partial<IInfoAccess>;
/**
 * Represents the InfoAccess structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class InfoAccess extends PkiObject implements IInfoAccess {
    static CLASS_NAME: string;
    accessDescriptions: AccessDescription[];
    /**
     * Initializes a new instance of the {@link InfoAccess} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: InfoAccessParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ACCESS_DESCRIPTIONS): AccessDescription[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * AuthorityInfoAccessSyntax  ::=
     * SEQUENCE SIZE (1..MAX) OF AccessDescription
     *```
     */
    static schema(parameters?: SchemaParameters<{
        accessDescriptions?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): InfoAccessJson;
}

declare const PRIME = "prime";
declare const EXPONENT = "exponent";
declare const COEFFICIENT$1 = "coefficient";
interface IOtherPrimeInfo {
    prime: asn1js.Integer;
    exponent: asn1js.Integer;
    coefficient: asn1js.Integer;
}
type OtherPrimeInfoParameters = PkiObjectParameters & Partial<IOtherPrimeInfo> & {
    json?: OtherPrimeInfoJson;
};
interface OtherPrimeInfoJson {
    r: string;
    d: string;
    t: string;
}
type OtherPrimeInfoSchema = SchemaParameters<{
    prime?: string;
    exponent?: string;
    coefficient?: string;
}>;
/**
 * Represents the OtherPrimeInfo structure described in [RFC3447](https://datatracker.ietf.org/doc/html/rfc3447)
 */
declare class OtherPrimeInfo extends PkiObject implements IOtherPrimeInfo {
    static CLASS_NAME: string;
    prime: asn1js.Integer;
    exponent: asn1js.Integer;
    coefficient: asn1js.Integer;
    /**
     * Initializes a new instance of the {@link OtherPrimeInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OtherPrimeInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof PRIME | typeof EXPONENT | typeof COEFFICIENT$1): asn1js.Integer;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OtherPrimeInfo ::= Sequence {
     *    prime             Integer,  -- ri
     *    exponent          Integer,  -- di
     *    coefficient       Integer   -- ti
     * }
     *```
     */
    static schema(parameters?: OtherPrimeInfoSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OtherPrimeInfoJson;
    /**
     * Converts JSON value into current object
     * @param json JSON object
     */
    fromJSON(json: OtherPrimeInfoJson): void;
}

declare const VERSION$7 = "version";
declare const MODULUS = "modulus";
declare const PUBLIC_EXPONENT = "publicExponent";
declare const PRIVATE_EXPONENT = "privateExponent";
declare const PRIME1 = "prime1";
declare const PRIME2 = "prime2";
declare const EXPONENT1 = "exponent1";
declare const EXPONENT2 = "exponent2";
declare const COEFFICIENT = "coefficient";
declare const OTHER_PRIME_INFOS = "otherPrimeInfos";
interface IRSAPrivateKey {
    version: number;
    modulus: asn1js.Integer;
    publicExponent: asn1js.Integer;
    privateExponent: asn1js.Integer;
    prime1: asn1js.Integer;
    prime2: asn1js.Integer;
    exponent1: asn1js.Integer;
    exponent2: asn1js.Integer;
    coefficient: asn1js.Integer;
    otherPrimeInfos?: OtherPrimeInfo[];
}
type RSAPrivateKeyParameters = PkiObjectParameters & Partial<IRSAPrivateKey> & {
    json?: RSAPrivateKeyJson;
};
interface RSAPrivateKeyJson {
    n: string;
    e: string;
    d: string;
    p: string;
    q: string;
    dp: string;
    dq: string;
    qi: string;
    oth?: OtherPrimeInfoJson[];
}
/**
 * Represents the PrivateKeyInfo structure described in [RFC3447](https://datatracker.ietf.org/doc/html/rfc3447)
 */
declare class RSAPrivateKey extends PkiObject implements IRSAPrivateKey {
    static CLASS_NAME: string;
    version: number;
    modulus: asn1js.Integer;
    publicExponent: asn1js.Integer;
    privateExponent: asn1js.Integer;
    prime1: asn1js.Integer;
    prime2: asn1js.Integer;
    exponent1: asn1js.Integer;
    exponent2: asn1js.Integer;
    coefficient: asn1js.Integer;
    otherPrimeInfos?: OtherPrimeInfo[];
    /**
     * Initializes a new instance of the {@link RSAPrivateKey} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RSAPrivateKeyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$7): number;
    static defaultValues(memberName: typeof MODULUS): asn1js.Integer;
    static defaultValues(memberName: typeof PUBLIC_EXPONENT): asn1js.Integer;
    static defaultValues(memberName: typeof PRIVATE_EXPONENT): asn1js.Integer;
    static defaultValues(memberName: typeof PRIME1): asn1js.Integer;
    static defaultValues(memberName: typeof PRIME2): asn1js.Integer;
    static defaultValues(memberName: typeof EXPONENT1): asn1js.Integer;
    static defaultValues(memberName: typeof EXPONENT2): asn1js.Integer;
    static defaultValues(memberName: typeof COEFFICIENT): asn1js.Integer;
    static defaultValues(memberName: typeof OTHER_PRIME_INFOS): OtherPrimeInfo[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RSAPrivateKey ::= Sequence {
     *    version           Version,
     *    modulus           Integer,  -- n
     *    publicExponent    Integer,  -- e
     *    privateExponent   Integer,  -- d
     *    prime1            Integer,  -- p
     *    prime2            Integer,  -- q
     *    exponent1         Integer,  -- d mod (p-1)
     *    exponent2         Integer,  -- d mod (q-1)
     *    coefficient       Integer,  -- (inverse of q) mod p
     *    otherPrimeInfos   OtherPrimeInfos OPTIONAL
     * }
     *
     * OtherPrimeInfos ::= Sequence SIZE(1..MAX) OF OtherPrimeInfo
     * ```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        modulus?: string;
        publicExponent?: string;
        privateExponent?: string;
        prime1?: string;
        prime2?: string;
        exponent1?: string;
        exponent2?: string;
        coefficient?: string;
        otherPrimeInfosName?: string;
        otherPrimeInfo?: OtherPrimeInfoSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RSAPrivateKeyJson;
    /**
     * Converts JSON value into current object
     * @param json JSON object
     */
    fromJSON(json: any): void;
}

interface IPrivateKeyInfo {
    version: number;
    privateKeyAlgorithm: AlgorithmIdentifier;
    privateKey: asn1js.OctetString;
    attributes?: Attribute[];
    parsedKey?: RSAPrivateKey | ECPrivateKey;
}
type PrivateKeyInfoParameters = PkiObjectParameters & Partial<IPrivateKeyInfo> & {
    json?: JsonWebKey;
};
interface PrivateKeyInfoJson {
    version: number;
    privateKeyAlgorithm: AlgorithmIdentifierJson;
    privateKey: asn1js.OctetStringJson;
    attributes?: AttributeJson[];
}
/**
 * Represents the PrivateKeyInfo structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5208)
 */
declare class PrivateKeyInfo extends PkiObject implements IPrivateKeyInfo {
    static CLASS_NAME: string;
    version: number;
    privateKeyAlgorithm: AlgorithmIdentifier;
    privateKey: asn1js.OctetString;
    attributes?: Attribute[];
    parsedKey?: RSAPrivateKey | ECPrivateKey;
    /**
     * Initializes a new instance of the {@link PrivateKeyInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PrivateKeyInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: string): any;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PrivateKeyInfo ::= SEQUENCE {
     *    version Version,
     *    privateKeyAlgorithm AlgorithmIdentifier {{PrivateKeyAlgorithms}},
     *    privateKey PrivateKey,
     *    attributes [0] Attributes OPTIONAL }
     *
     * Version ::= INTEGER {v1(0)} (v1,...)
     *
     * PrivateKey ::= OCTET STRING
     *
     * Attributes ::= SET OF Attribute
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        privateKeyAlgorithm?: AlgorithmIdentifierSchema;
        privateKey?: string;
        attributes?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PrivateKeyInfoJson | JsonWebKey;
    /**
     * Converts JSON value into current object
     * @param json JSON object
     */
    fromJSON(json: any): void;
}

/**
 * Class from RFC5208
 */
declare class KeyBag extends PrivateKeyInfo {
    /**
     * Constructor for Attribute class
     * @param parameters
     */
    constructor(parameters?: {});
}

declare const MAC = "mac";
declare const MAC_SALT = "macSalt";
declare const ITERATIONS = "iterations";
interface IMacData {
    mac: DigestInfo;
    macSalt: asn1js.OctetString;
    iterations?: number;
}
interface MacDataJson {
    mac: DigestInfoJson;
    macSalt: asn1js.OctetStringJson;
    iterations?: number;
}
type MacDataParameters = PkiObjectParameters & Partial<IMacData>;
type MacDataSchema = SchemaParameters<{
    mac?: DigestInfoSchema;
    macSalt?: string;
    iterations?: string;
}>;
/**
 * Represents the MacData structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class MacData extends PkiObject implements IMacData {
    static CLASS_NAME: string;
    mac: DigestInfo;
    macSalt: asn1js.OctetString;
    iterations?: number;
    /**
     * Initializes a new instance of the {@link MacData} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: MacDataParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof MAC): DigestInfo;
    static defaultValues(memberName: typeof MAC_SALT): asn1js.OctetString;
    static defaultValues(memberName: typeof ITERATIONS): number;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * MacData ::= SEQUENCE {
     *    mac           DigestInfo,
     *    macSalt       OCTET STRING,
     *    iterations    INTEGER DEFAULT 1
     *    -- Note: The default is for historical reasons and its use is
     *    -- deprecated. A higher value, like 1024 is recommended.
     *    }
     *```
     */
    static schema(parameters?: MacDataSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): MacDataJson;
}

declare const HASH_ALGORITHM$3 = "hashAlgorithm";
declare const HASHED_MESSAGE = "hashedMessage";
interface IMessageImprint {
    hashAlgorithm: AlgorithmIdentifier;
    hashedMessage: asn1js.OctetString;
}
interface MessageImprintJson {
    hashAlgorithm: AlgorithmIdentifierJson;
    hashedMessage: asn1js.OctetStringJson;
}
type MessageImprintParameters = PkiObjectParameters & Partial<IMessageImprint>;
type MessageImprintSchema = SchemaParameters<{
    hashAlgorithm?: AlgorithmIdentifierSchema;
    hashedMessage?: string;
}>;
/**
 * Represents the MessageImprint structure described in [RFC3161](https://www.ietf.org/rfc/rfc3161.txt)
 */
declare class MessageImprint extends PkiObject implements IMessageImprint {
    static CLASS_NAME: string;
    /**
     * Creates and fills a new instance of {@link MessageImprint}
     * @param hashAlgorithm
     * @param message
     * @param crypto Crypto engine
     * @returns New instance of {@link MessageImprint}
     */
    static create(hashAlgorithm: string, message: BufferSource, crypto?: ICryptoEngine): Promise<MessageImprint>;
    hashAlgorithm: AlgorithmIdentifier;
    hashedMessage: asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link MessageImprint} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: MessageImprintParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof HASH_ALGORITHM$3): AlgorithmIdentifier;
    static defaultValues(memberName: typeof HASHED_MESSAGE): asn1js.OctetString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * MessageImprint ::= SEQUENCE  {
     *    hashAlgorithm                AlgorithmIdentifier,
     *    hashedMessage                OCTET STRING  }
     *```
     */
    static schema(parameters?: MessageImprintSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): MessageImprintJson;
}

declare const PERMITTED_SUBTREES = "permittedSubtrees";
declare const EXCLUDED_SUBTREES = "excludedSubtrees";
interface INameConstraints {
    permittedSubtrees?: GeneralSubtree[];
    excludedSubtrees?: GeneralSubtree[];
}
interface NameConstraintsJson {
    permittedSubtrees?: GeneralSubtreeJson[];
    excludedSubtrees?: GeneralSubtreeJson[];
}
type NameConstraintsParameters = PkiObjectParameters & Partial<INameConstraints>;
/**
 * Represents the NameConstraints structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class NameConstraints extends PkiObject implements INameConstraints {
    static CLASS_NAME: string;
    permittedSubtrees?: GeneralSubtree[];
    excludedSubtrees?: GeneralSubtree[];
    /**
     * Initializes a new instance of the {@link NameConstraints} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: NameConstraintsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof PERMITTED_SUBTREES): GeneralSubtree[];
    static defaultValues(memberName: typeof EXCLUDED_SUBTREES): GeneralSubtree[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * NameConstraints ::= SEQUENCE {
     *    permittedSubtrees       [0]     GeneralSubtrees OPTIONAL,
     *    excludedSubtrees        [1]     GeneralSubtrees OPTIONAL }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        permittedSubtrees?: string;
        excludedSubtrees?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): NameConstraintsJson;
}

declare const REQ_CERT = "reqCert";
declare const SINGLE_REQUEST_EXTENSIONS = "singleRequestExtensions";
interface IRequest {
    reqCert: CertID;
    singleRequestExtensions?: Extension[];
}
interface RequestJson {
    reqCert: CertIDJson;
    singleRequestExtensions?: ExtensionJson[];
}
type RequestParameters = PkiObjectParameters & Partial<IRequest>;
type RequestSchema = SchemaParameters<{
    reqCert?: CertIDSchema;
    extensions?: ExtensionsSchema;
    singleRequestExtensions?: string;
}>;
/**
 * Represents an Request described in [RFC6960](https://datatracker.ietf.org/doc/html/rfc6960)
 */
declare class Request extends PkiObject implements IRequest {
    static CLASS_NAME: string;
    reqCert: CertID;
    singleRequestExtensions?: Extension[];
    /**
     * Initializes a new instance of the {@link Request} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RequestParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof REQ_CERT): CertID;
    static defaultValues(memberName: typeof SINGLE_REQUEST_EXTENSIONS): Extension[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Request ::= SEQUENCE {
     *    reqCert                     CertID,
     *    singleRequestExtensions     [0] EXPLICIT Extensions OPTIONAL }
     *```
     */
    static schema(parameters?: RequestSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RequestJson;
}

declare const TBS = "tbs";
declare const VERSION$6 = "version";
declare const REQUESTOR_NAME = "requestorName";
declare const REQUEST_LIST = "requestList";
declare const REQUEST_EXTENSIONS = "requestExtensions";
interface ITBSRequest {
    tbs: ArrayBuffer;
    version?: number;
    requestorName?: GeneralName;
    requestList: Request[];
    requestExtensions?: Extension[];
}
interface TBSRequestJson {
    tbs: string;
    version?: number;
    requestorName?: GeneralNameJson;
    requestList: RequestJson[];
    requestExtensions?: ExtensionJson[];
}
type TBSRequestParameters = PkiObjectParameters & Partial<ITBSRequest>;
type TBSRequestSchema = SchemaParameters<{
    TBSRequestVersion?: string;
    requestorName?: GeneralNameSchema;
    requestList?: string;
    requests?: string;
    requestNames?: RequestSchema;
    extensions?: ExtensionsSchema;
    requestExtensions?: string;
}>;
/**
 * Represents the TBSRequest structure described in [RFC6960](https://datatracker.ietf.org/doc/html/rfc6960)
 */
declare class TBSRequest extends PkiObject implements ITBSRequest {
    static CLASS_NAME: string;
    tbsView: Uint8Array;
    /**
     * @deprecated Since version 3.0.0
     */
    get tbs(): ArrayBuffer;
    /**
     * @deprecated Since version 3.0.0
     */
    set tbs(value: ArrayBuffer);
    version?: number;
    requestorName?: GeneralName;
    requestList: Request[];
    requestExtensions?: Extension[];
    /**
     * Initializes a new instance of the {@link TBSRequest} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: TBSRequestParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TBS): ArrayBuffer;
    static defaultValues(memberName: typeof VERSION$6): number;
    static defaultValues(memberName: typeof REQUESTOR_NAME): GeneralName;
    static defaultValues(memberName: typeof REQUEST_LIST): Request[];
    static defaultValues(memberName: typeof REQUEST_EXTENSIONS): Extension[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * TBSRequest ::= SEQUENCE {
     *    version             [0]     EXPLICIT Version DEFAULT v1,
     *    requestorName       [1]     EXPLICIT GeneralName OPTIONAL,
     *    requestList                 SEQUENCE OF Request,
     *    requestExtensions   [2]     EXPLICIT Extensions OPTIONAL }
     *```
     */
    static schema(parameters?: TBSRequestSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    /**
     * Convert current object to asn1js object and set correct values
     * @param encodeFlag If param equal to false then create TBS schema via decoding stored value. In othe case create TBS schema via assembling from TBS parts.
     * @returns asn1js object
     */
    toSchema(encodeFlag?: boolean): asn1js.Sequence;
    toJSON(): TBSRequestJson;
}

declare const SIGNATURE_ALGORITHM$2 = "signatureAlgorithm";
declare const SIGNATURE$2 = "signature";
declare const CERTS = "certs";
interface ISignature {
    signatureAlgorithm: AlgorithmIdentifier;
    signature: asn1js.BitString;
    certs?: Certificate[];
}
interface SignatureJson {
    signatureAlgorithm: AlgorithmIdentifierJson;
    signature: asn1js.BitStringJson;
    certs?: CertificateJson[];
}
type SignatureParameters = PkiObjectParameters & Partial<ISignature>;
type SignatureSchema = SchemaParameters<{
    signatureAlgorithm?: AlgorithmIdentifierSchema;
    signature?: string;
    certs?: string;
}>;
/**
 * Represents the Signature structure described in [RFC6960](https://datatracker.ietf.org/doc/html/rfc6960)
 */
declare class Signature extends PkiObject implements ISignature {
    static CLASS_NAME: string;
    signatureAlgorithm: AlgorithmIdentifier;
    signature: asn1js.BitString;
    certs?: Certificate[];
    /**
     * Initializes a new instance of the {@link Signature} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SignatureParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$2): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE$2): asn1js.BitString;
    static defaultValues(memberName: typeof CERTS): Certificate[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * Signature ::= SEQUENCE {
     *    signatureAlgorithm      AlgorithmIdentifier,
     *    signature               BIT STRING,
     *    certs               [0] EXPLICIT SEQUENCE OF Certificate OPTIONAL }
     *```
     */
    static schema(parameters?: SignatureSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SignatureJson;
}

declare const TBS_REQUEST = "tbsRequest";
declare const OPTIONAL_SIGNATURE = "optionalSignature";
interface IOCSPRequest {
    tbsRequest: TBSRequest;
    optionalSignature?: Signature;
}
interface OCSPRequestJson {
    tbsRequest: TBSRequestJson;
    optionalSignature?: SignatureJson;
}
type OCSPRequestParameters = PkiObjectParameters & Partial<IOCSPRequest>;
/**
 * Represents an OCSP request described in [RFC6960 Section 4.1](https://datatracker.ietf.org/doc/html/rfc6960#section-4.1)
 *
 * @example The following example demonstrates how to create OCSP request
 * ```js
 * // Create OCSP request
 * const ocspReq = new pkijs.OCSPRequest();
 *
 * ocspReq.tbsRequest.requestorName = new pkijs.GeneralName({
 *   type: 4,
 *   value: cert.subject,
 * });
 *
 * await ocspReq.createForCertificate(cert, {
 *   hashAlgorithm: "SHA-256",
 *   issuerCertificate: issuerCert,
 * });
 *
 * const nonce = pkijs.getRandomValues(new Uint8Array(10));
 * ocspReq.tbsRequest.requestExtensions = [
 *   new pkijs.Extension({
 *     extnID: "1.3.6.1.5.5.7.48.1.2", // nonce
 *     extnValue: new asn1js.OctetString({ valueHex: nonce.buffer }).toBER(),
 *   })
 * ];
 *
 * // Encode OCSP request
 * const ocspReqRaw = ocspReq.toSchema(true).toBER();
 * ```
 */
declare class OCSPRequest extends PkiObject implements IOCSPRequest {
    static CLASS_NAME: string;
    tbsRequest: TBSRequest;
    optionalSignature?: Signature;
    /**
     * Initializes a new instance of the {@link OCSPRequest} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OCSPRequestParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TBS_REQUEST): TBSRequest;
    static defaultValues(memberName: typeof OPTIONAL_SIGNATURE): Signature;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     * @returns Returns `true` if `memberValue` is equal to default value for selected class member
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OCSPRequest ::= SEQUENCE {
     *    tbsRequest                  TBSRequest,
     *    optionalSignature   [0]     EXPLICIT Signature OPTIONAL }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        tbsRequest?: TBSRequestSchema;
        optionalSignature?: SignatureSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(encodeFlag?: boolean): asn1js.Sequence;
    toJSON(): OCSPRequestJson;
    /**
     * Making OCSP Request for specific certificate
     * @param certificate Certificate making OCSP Request for
     * @param parameters Additional parameters
     * @param crypto Crypto engine
     */
    createForCertificate(certificate: Certificate, parameters: CertIDCreateParams, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Make signature for current OCSP Request
     * @param privateKey Private key for "subjectPublicKeyInfo" structure
     * @param hashAlgorithm Hashing algorithm. Default SHA-1
     * @param crypto Crypto engine
     */
    sign(privateKey: CryptoKey, hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<void>;
    verify(): void;
}

declare const RESPONSE_TYPE = "responseType";
declare const RESPONSE = "response";
interface IResponseBytes {
    responseType: string;
    response: asn1js.OctetString;
}
interface ResponseBytesJson {
    responseType: string;
    response: asn1js.OctetStringJson;
}
type ResponseBytesParameters = PkiObjectParameters & Partial<IResponseBytes>;
type ResponseBytesSchema = SchemaParameters<{
    responseType?: string;
    response?: string;
}>;
/**
 * Class from RFC6960
 */
declare class ResponseBytes extends PkiObject implements IResponseBytes {
    static CLASS_NAME: string;
    responseType: string;
    response: asn1js.OctetString;
    /**
     * Initializes a new instance of the {@link Request} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: ResponseBytesParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof RESPONSE_TYPE): string;
    static defaultValues(memberName: typeof RESPONSE): asn1js.OctetString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * ResponseBytes ::= SEQUENCE {
     *    responseType   OBJECT IDENTIFIER,
     *    response       OCTET STRING }
     *```
     */
    static schema(parameters?: ResponseBytesSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): ResponseBytesJson;
}

declare const RESPONSE_STATUS = "responseStatus";
declare const RESPONSE_BYTES = "responseBytes";
interface IOCSPResponse {
    responseStatus: asn1js.Enumerated;
    responseBytes?: ResponseBytes;
}
interface OCSPResponseJson {
    responseStatus: asn1js.EnumeratedJson;
    responseBytes?: ResponseBytesJson;
}
type OCSPResponseParameters = PkiObjectParameters & Partial<IOCSPResponse>;
/**
 * Represents an OCSP response described in [RFC6960 Section 4.2](https://datatracker.ietf.org/doc/html/rfc6960#section-4.2)
 *
 * @example The following example demonstrates how to verify OCSP response
 * ```js
 * const asnOcspResp = asn1js.fromBER(ocspRespRaw);
 * const ocspResp = new pkijs.OCSPResponse({ schema: asnOcspResp.result });
 *
 * if (!ocspResp.responseBytes) {
 *   throw new Error("No \"ResponseBytes\" in the OCSP Response - nothing to verify");
 * }
 *
 * const asnOcspRespBasic = asn1js.fromBER(ocspResp.responseBytes.response.valueBlock.valueHex);
 * const ocspBasicResp = new pkijs.BasicOCSPResponse({ schema: asnOcspRespBasic.result });
 * const ok = await ocspBasicResp.verify({ trustedCerts: [cert] });
 * ```
 *
 * @example The following example demonstrates how to create OCSP response
 * ```js
 * const ocspBasicResp = new pkijs.BasicOCSPResponse();
 *
 * // Create specific TST info structure to sign
 * ocspBasicResp.tbsResponseData.responderID = issuerCert.subject;
 * ocspBasicResp.tbsResponseData.producedAt = new Date();
 *
 * const certID = new pkijs.CertID();
 * await certID.createForCertificate(cert, {
 *   hashAlgorithm: "SHA-256",
 *   issuerCertificate: issuerCert,
 * });
 * const response = new pkijs.SingleResponse({
 *   certID,
 * });
 * response.certStatus = new asn1js.Primitive({
 *   idBlock: {
 *     tagClass: 3, // CONTEXT-SPECIFIC
 *     tagNumber: 0 // [0]
 *   },
 *   lenBlockLength: 1 // The length contains one byte 0x00
 * }); // status - success
 * response.thisUpdate = new Date();
 *
 * ocspBasicResp.tbsResponseData.responses.push(response);
 *
 * // Add certificates for chain OCSP response validation
 * ocspBasicResp.certs = [issuerCert];
 *
 * await ocspBasicResp.sign(keys.privateKey, "SHA-256");
 *
 * // Finally create completed OCSP response structure
 * const ocspBasicRespRaw = ocspBasicResp.toSchema().toBER(false);
 *
 * const ocspResp = new pkijs.OCSPResponse({
 *   responseStatus: new asn1js.Enumerated({ value: 0 }), // success
 *   responseBytes: new pkijs.ResponseBytes({
 *     responseType: pkijs.id_PKIX_OCSP_Basic,
 *     response: new asn1js.OctetString({ valueHex: ocspBasicRespRaw }),
 *   }),
 * });
 *
 * const ocspRespRaw = ocspResp.toSchema().toBER();
 * ```
 */
declare class OCSPResponse extends PkiObject implements IOCSPResponse {
    static CLASS_NAME: string;
    responseStatus: asn1js.Enumerated;
    responseBytes?: ResponseBytes;
    /**
     * Initializes a new instance of the {@link OCSPResponse} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OCSPResponseParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof RESPONSE_STATUS): asn1js.Enumerated;
    static defaultValues(memberName: typeof RESPONSE_BYTES): ResponseBytes;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OCSPResponse ::= SEQUENCE {
     *    responseStatus         OCSPResponseStatus,
     *    responseBytes          [0] EXPLICIT ResponseBytes OPTIONAL }
     *
     * OCSPResponseStatus ::= ENUMERATED {
     *    successful            (0),  -- Response has valid confirmations
     *    malformedRequest      (1),  -- Illegal confirmation request
     *    internalError         (2),  -- Internal error in issuer
     *    tryLater              (3),  -- Try again later
     *    -- (4) is not used
     *    sigRequired           (5),  -- Must sign the request
     *    unauthorized          (6)   -- Request unauthorized
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        responseStatus?: string;
        responseBytes?: ResponseBytesSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OCSPResponseJson;
    /**
     * Get OCSP response status for specific certificate
     * @param certificate
     * @param issuerCertificate
     * @param crypto Crypto engine
     */
    getCertificateStatus(certificate: Certificate, issuerCertificate: Certificate, crypto?: ICryptoEngine): Promise<{
        isForCertificate: boolean;
        status: number;
    }>;
    /**
     * Make a signature for current OCSP Response
     * @param privateKey Private key for "subjectPublicKeyInfo" structure
     * @param hashAlgorithm Hashing algorithm. Default SHA-1
     */
    sign(privateKey: CryptoKey, hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Verify current OCSP Response
     * @param issuerCertificate In order to decrease size of resp issuer cert could be omitted. In such case you need manually provide it.
     * @param crypto Crypto engine
     */
    verify(issuerCertificate?: Certificate | null, crypto?: ICryptoEngine): Promise<boolean>;
}

declare const id_SubjectDirectoryAttributes = "2.5.29.9";
declare const id_SubjectKeyIdentifier = "2.5.29.14";
declare const id_KeyUsage = "2.5.29.15";
declare const id_PrivateKeyUsagePeriod = "2.5.29.16";
declare const id_SubjectAltName = "2.5.29.17";
declare const id_IssuerAltName = "2.5.29.18";
declare const id_BasicConstraints = "2.5.29.19";
declare const id_CRLNumber = "2.5.29.20";
declare const id_BaseCRLNumber = "2.5.29.27";
declare const id_CRLReason = "2.5.29.21";
declare const id_InvalidityDate = "2.5.29.24";
declare const id_IssuingDistributionPoint = "2.5.29.28";
declare const id_CertificateIssuer = "2.5.29.29";
declare const id_NameConstraints = "2.5.29.30";
declare const id_CRLDistributionPoints = "2.5.29.31";
declare const id_FreshestCRL = "2.5.29.46";
declare const id_CertificatePolicies = "2.5.29.32";
declare const id_AnyPolicy = "2.5.29.32.0";
declare const id_MicrosoftAppPolicies = "1.3.6.1.4.1.311.21.10";
declare const id_PolicyMappings = "2.5.29.33";
declare const id_AuthorityKeyIdentifier = "2.5.29.35";
declare const id_PolicyConstraints = "2.5.29.36";
declare const id_ExtKeyUsage = "2.5.29.37";
declare const id_InhibitAnyPolicy = "2.5.29.54";
declare const id_AuthorityInfoAccess = "1.3.6.1.5.5.7.1.1";
declare const id_SubjectInfoAccess = "1.3.6.1.5.5.7.1.11";
declare const id_SignedCertificateTimestampList = "1.3.6.1.4.1.11129.2.4.2";
declare const id_MicrosoftCertTemplateV1 = "1.3.6.1.4.1.311.20.2";
declare const id_MicrosoftPrevCaCertHash = "1.3.6.1.4.1.311.21.2";
declare const id_MicrosoftCertTemplateV2 = "1.3.6.1.4.1.311.21.7";
declare const id_MicrosoftCaVersion = "1.3.6.1.4.1.311.21.1";
declare const id_QCStatements = "1.3.6.1.5.5.7.1.3";
declare const id_ContentType_Data = "1.2.840.113549.1.7.1";
declare const id_ContentType_SignedData = "1.2.840.113549.1.7.2";
declare const id_ContentType_EnvelopedData = "1.2.840.113549.1.7.3";
declare const id_ContentType_EncryptedData = "1.2.840.113549.1.7.6";
declare const id_eContentType_TSTInfo = "1.2.840.113549.1.9.16.1.4";
declare const id_CertBag_X509Certificate = "1.2.840.113549.1.9.22.1";
declare const id_CertBag_SDSICertificate = "1.2.840.113549.1.9.22.2";
declare const id_CertBag_AttributeCertificate = "1.2.840.113549.1.9.22.3";
declare const id_CRLBag_X509CRL = "1.2.840.113549.1.9.23.1";
declare const id_pkix = "1.3.6.1.5.5.7";
declare const id_ad = "1.3.6.1.5.5.7.48";
declare const id_PKIX_OCSP_Basic = "1.3.6.1.5.5.7.48.1.1";
declare const id_ad_caIssuers = "1.3.6.1.5.5.7.48.2";
declare const id_ad_ocsp = "1.3.6.1.5.5.7.48.1";
declare const id_sha1 = "1.3.14.3.2.26";
declare const id_sha256 = "2.16.840.1.101.3.4.2.1";
declare const id_sha384 = "2.16.840.1.101.3.4.2.2";
declare const id_sha512 = "2.16.840.1.101.3.4.2.3";

declare const ALGORITHM = "algorithm";
declare const PUBLIC_KEY = "publicKey";
interface IOriginatorPublicKey {
    algorithm: AlgorithmIdentifier;
    publicKey: asn1js.BitString;
}
interface OriginatorPublicKeyJson {
    algorithm: AlgorithmIdentifierJson;
    publicKey: asn1js.BitStringJson;
}
type OriginatorPublicKeyParameters = PkiObjectParameters & Partial<IOriginatorPublicKey>;
/**
 * Represents the OriginatorPublicKey structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class OriginatorPublicKey extends PkiObject implements IOriginatorPublicKey {
    static CLASS_NAME: string;
    algorithm: AlgorithmIdentifier;
    publicKey: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link OriginatorPublicKey} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: OriginatorPublicKeyParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof PUBLIC_KEY): asn1js.BitString;
    static defaultValues(memberName: string): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault<T extends {
        isEqual(data: any): boolean;
    }>(memberName: string, memberValue: T): memberValue is T;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * OriginatorPublicKey ::= SEQUENCE {
     *    algorithm AlgorithmIdentifier,
     *    publicKey BIT STRING }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        algorithm?: AlgorithmIdentifierSchema;
        publicKey?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): OriginatorPublicKeyJson;
}

declare const KEY_DERIVATION_FUNC = "keyDerivationFunc";
declare const ENCRYPTION_SCHEME = "encryptionScheme";
interface IPBES2Params {
    keyDerivationFunc: AlgorithmIdentifier;
    encryptionScheme: AlgorithmIdentifier;
}
interface PBES2ParamsJson {
    keyDerivationFunc: AlgorithmIdentifierJson;
    encryptionScheme: AlgorithmIdentifierJson;
}
type PBES2ParamsParameters = PkiObjectParameters & Partial<IPBES2Params>;
/**
 * Represents the PBES2Params structure described in [RFC2898](https://www.ietf.org/rfc/rfc2898.txt)
 */
declare class PBES2Params extends PkiObject implements IPBES2Params {
    static CLASS_NAME: string;
    keyDerivationFunc: AlgorithmIdentifier;
    encryptionScheme: AlgorithmIdentifier;
    /**
     * Initializes a new instance of the {@link PBES2Params} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PBES2ParamsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof KEY_DERIVATION_FUNC): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ENCRYPTION_SCHEME): AlgorithmIdentifier;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PBES2-params ::= SEQUENCE {
     *    keyDerivationFunc AlgorithmIdentifier {{PBES2-KDFs}},
     *    encryptionScheme AlgorithmIdentifier {{PBES2-Encs}} }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        keyDerivationFunc?: AlgorithmIdentifierSchema;
        encryptionScheme?: AlgorithmIdentifierSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PBES2ParamsJson;
}

declare const SALT = "salt";
declare const ITERATION_COUNT = "iterationCount";
declare const KEY_LENGTH = "keyLength";
declare const PRF = "prf";
interface IPBKDF2Params {
    salt: any;
    iterationCount: number;
    keyLength?: number;
    prf?: AlgorithmIdentifier;
}
interface PBKDF2ParamsJson {
    salt: any;
    iterationCount: number;
    keyLength?: number;
    prf?: AlgorithmIdentifierJson;
}
type PBKDF2ParamsParameters = PkiObjectParameters & Partial<IPBKDF2Params>;
/**
 * Represents the PBKDF2Params structure described in [RFC2898](https://www.ietf.org/rfc/rfc2898.txt)
 */
declare class PBKDF2Params extends PkiObject implements IPBKDF2Params {
    static CLASS_NAME: string;
    salt: any;
    iterationCount: number;
    keyLength?: number;
    prf?: AlgorithmIdentifier;
    /**
     * Initializes a new instance of the {@link PBKDF2Params} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PBKDF2ParamsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof SALT): any;
    static defaultValues(memberName: typeof ITERATION_COUNT): number;
    static defaultValues(memberName: typeof KEY_LENGTH): number;
    static defaultValues(memberName: typeof PRF): AlgorithmIdentifier;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PBKDF2-params ::= SEQUENCE {
     *    salt CHOICE {
     *        specified OCTET STRING,
     *        otherSource AlgorithmIdentifier },
     *  iterationCount INTEGER (1..MAX),
     *  keyLength INTEGER (1..MAX) OPTIONAL,
     *  prf AlgorithmIdentifier
     *    DEFAULT { algorithm hMAC-SHA1, parameters NULL } }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        saltPrimitive?: string;
        saltConstructed?: AlgorithmIdentifierSchema;
        iterationCount?: string;
        keyLength?: string;
        prf?: AlgorithmIdentifierSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PBKDF2ParamsJson;
}

declare const VERSION$5 = "version";
declare const AUTH_SAFE = "authSafe";
declare const MAC_DATA = "macData";
declare const PARSED_VALUE$1 = "parsedValue";
interface IPFX {
    version: number;
    authSafe: ContentInfo;
    macData?: MacData;
    parsedValue?: PFXParsedValue;
}
interface PFXJson {
    version: number;
    authSafe: ContentInfoJson;
    macData?: MacDataJson;
}
type PFXParameters = PkiObjectParameters & Partial<IPFX>;
interface PFXParsedValue {
    authenticatedSafe?: AuthenticatedSafe;
    integrityMode?: number;
}
type MakeInternalValuesParams = object | {
    iterations: number;
    pbkdf2HashAlgorithm: Algorithm;
    hmacHashAlgorithm: string;
    password: ArrayBuffer;
} | {
    signingCertificate: Certificate;
    privateKey: CryptoKey;
    hashAlgorithm: string;
};
/**
 * Represents the PFX structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class PFX extends PkiObject implements IPFX {
    static CLASS_NAME: string;
    version: number;
    authSafe: ContentInfo;
    macData?: MacData;
    parsedValue?: PFXParsedValue;
    /**
     * Initializes a new instance of the {@link PFX} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PFXParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$5): number;
    static defaultValues(memberName: typeof AUTH_SAFE): ContentInfo;
    static defaultValues(memberName: typeof MAC_DATA): MacData;
    static defaultValues(memberName: typeof PARSED_VALUE$1): PFXParsedValue;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PFX ::= SEQUENCE {
     *    version     INTEGER {v3(3)}(v3,...),
     *    authSafe    ContentInfo,
     *    macData     MacData OPTIONAL
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        authSafe?: ContentInfoSchema;
        macData?: MacDataSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PFXJson;
    /**
     * Making ContentInfo from PARSED_VALUE object
     * @param parameters Parameters, specific to each "integrity mode"
     * @param crypto Crypto engine
     */
    makeInternalValues(parameters?: MakeInternalValuesParams, crypto?: ICryptoEngine): Promise<void>;
    parseInternalValues(parameters: {
        checkIntegrity?: boolean;
        password?: ArrayBuffer;
    }, crypto?: ICryptoEngine): Promise<void>;
}

declare const ENCRYPTION_ALGORITHM = "encryptionAlgorithm";
declare const ENCRYPTED_DATA = "encryptedData";
declare const PARSED_VALUE = "parsedValue";
interface IPKCS8ShroudedKeyBag {
    encryptionAlgorithm: AlgorithmIdentifier;
    encryptedData: asn1js.OctetString;
    parsedValue?: PrivateKeyInfo;
}
type PKCS8ShroudedKeyBagParameters = PkiObjectParameters & Partial<IPKCS8ShroudedKeyBag>;
interface PKCS8ShroudedKeyBagJson {
    encryptionAlgorithm: AlgorithmIdentifierJson;
    encryptedData: asn1js.OctetStringJson;
}
type PKCS8ShroudedKeyBagMakeInternalValuesParams = Omit<EncryptedDataEncryptParams, "contentToEncrypt">;
/**
 * Represents the PKCS8ShroudedKeyBag structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class PKCS8ShroudedKeyBag extends PkiObject implements IPKCS8ShroudedKeyBag {
    static CLASS_NAME: string;
    encryptionAlgorithm: AlgorithmIdentifier;
    encryptedData: asn1js.OctetString;
    parsedValue?: PrivateKeyInfo;
    /**
     * Initializes a new instance of the {@link PKCS8ShroudedKeyBag} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PKCS8ShroudedKeyBagParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ENCRYPTION_ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof ENCRYPTED_DATA): asn1js.OctetString;
    static defaultValues(memberName: typeof PARSED_VALUE): PrivateKeyInfo;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PKCS8ShroudedKeyBag ::= EncryptedPrivateKeyInfo
     *
     * EncryptedPrivateKeyInfo ::= SEQUENCE {
     *    encryptionAlgorithm AlgorithmIdentifier {{KeyEncryptionAlgorithms}},
     *    encryptedData EncryptedData
     * }
     *
     * EncryptedData ::= OCTET STRING
     *```
     */
    static schema(parameters?: SchemaParameters<{
        encryptionAlgorithm?: AlgorithmIdentifierSchema;
        encryptedData?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PKCS8ShroudedKeyBagJson;
    protected parseInternalValues(parameters: {
        password: ArrayBuffer;
    }, crypto?: ICryptoEngine): Promise<void>;
    makeInternalValues(parameters: PKCS8ShroudedKeyBagMakeInternalValuesParams, crypto?: ICryptoEngine): Promise<void>;
}

declare const STATUS$1 = "status";
declare const STATUS_STRINGS = "statusStrings";
declare const FAIL_INFO = "failInfo";
interface IPKIStatusInfo {
    status: PKIStatus;
    statusStrings?: asn1js.Utf8String[];
    failInfo?: asn1js.BitString;
}
interface PKIStatusInfoJson {
    status: PKIStatus;
    statusStrings?: asn1js.Utf8StringJson[];
    failInfo?: asn1js.BitStringJson;
}
type PKIStatusInfoParameters = PkiObjectParameters & Partial<IPKIStatusInfo>;
type PKIStatusInfoSchema = SchemaParameters<{
    status?: string;
    statusStrings?: string;
    failInfo?: string;
}>;
declare enum PKIStatus {
    granted = 0,
    grantedWithMods = 1,
    rejection = 2,
    waiting = 3,
    revocationWarning = 4,
    revocationNotification = 5
}
/**
 * Represents the PKIStatusInfo structure described in [RFC3161](https://www.ietf.org/rfc/rfc3161.txt)
 */
declare class PKIStatusInfo extends PkiObject implements IPKIStatusInfo {
    static CLASS_NAME: string;
    status: PKIStatus;
    statusStrings?: asn1js.Utf8String[];
    failInfo?: asn1js.BitString;
    /**
     * Initializes a new instance of the {@link PBKDF2Params} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PKIStatusInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof STATUS$1): number;
    static defaultValues(memberName: typeof STATUS_STRINGS): asn1js.Utf8String[];
    static defaultValues(memberName: typeof FAIL_INFO): asn1js.BitString;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PKIStatusInfo ::= SEQUENCE {
     *    status        PKIStatus,
     *    statusString  PKIFreeText     OPTIONAL,
     *    failInfo      PKIFailureInfo  OPTIONAL  }
     *```
     */
    static schema(parameters?: PKIStatusInfoSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PKIStatusInfoJson;
}

declare const REQUIRE_EXPLICIT_POLICY = "requireExplicitPolicy";
declare const INHIBIT_POLICY_MAPPING = "inhibitPolicyMapping";
interface IPolicyConstraints {
    requireExplicitPolicy?: number;
    inhibitPolicyMapping?: number;
}
interface PolicyConstraintsJson {
    requireExplicitPolicy?: number;
    inhibitPolicyMapping?: number;
}
type PolicyConstraintsParameters = PkiObjectParameters & Partial<IPolicyConstraints>;
/**
 * Represents the PolicyConstraints structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class PolicyConstraints extends PkiObject implements IPolicyConstraints {
    static CLASS_NAME: string;
    requireExplicitPolicy?: number;
    inhibitPolicyMapping?: number;
    /**
     * Initializes a new instance of the {@link PolicyConstraints} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PolicyConstraintsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof REQUIRE_EXPLICIT_POLICY): number;
    static defaultValues(memberName: typeof INHIBIT_POLICY_MAPPING): number;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PolicyConstraints ::= SEQUENCE {
     *    requireExplicitPolicy           [0] SkipCerts OPTIONAL,
     *    inhibitPolicyMapping            [1] SkipCerts OPTIONAL }
     *
     * SkipCerts ::= INTEGER (0..MAX)
     *```
     */
    static schema(parameters?: SchemaParameters<{
        requireExplicitPolicy?: string;
        inhibitPolicyMapping?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PolicyConstraintsJson;
}

declare const ISSUER_DOMAIN_POLICY = "issuerDomainPolicy";
declare const SUBJECT_DOMAIN_POLICY = "subjectDomainPolicy";
interface IPolicyMapping {
    issuerDomainPolicy: string;
    subjectDomainPolicy: string;
}
interface PolicyMappingJson {
    issuerDomainPolicy: string;
    subjectDomainPolicy: string;
}
type PolicyMappingParameters = PkiObjectParameters & Partial<IPolicyMapping>;
/**
 * Represents the PolicyMapping structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class PolicyMapping extends PkiObject implements IPolicyMapping {
    static CLASS_NAME: string;
    issuerDomainPolicy: string;
    subjectDomainPolicy: string;
    /**
     * Initializes a new instance of the {@link PolicyMapping} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PolicyMappingParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ISSUER_DOMAIN_POLICY): string;
    static defaultValues(memberName: typeof SUBJECT_DOMAIN_POLICY): string;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PolicyMapping ::= SEQUENCE {
     *    issuerDomainPolicy      CertPolicyId,
     *    subjectDomainPolicy     CertPolicyId }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        issuerDomainPolicy?: string;
        subjectDomainPolicy?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PolicyMappingJson;
}

interface IPolicyMappings {
    mappings: PolicyMapping[];
}
interface PolicyMappingsJson {
    mappings: PolicyMappingJson[];
}
type PolicyMappingsParameters = PkiObjectParameters & Partial<IPolicyMappings>;
/**
 * Represents the PolicyMappings structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class PolicyMappings extends PkiObject implements IPolicyMappings {
    static CLASS_NAME: string;
    mappings: PolicyMapping[];
    /**
     * Initializes a new instance of the {@link PolicyMappings} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PolicyMappingsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: string): PolicyMapping[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PolicyMappings ::= SEQUENCE SIZE (1..MAX) OF PolicyMapping
     *```
     */
    static schema(parameters?: SchemaParameters<{
        mappings?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PolicyMappingsJson;
}

declare const NOT_BEFORE = "notBefore";
declare const NOT_AFTER = "notAfter";
interface IPrivateKeyUsagePeriod {
    notBefore?: Date;
    notAfter?: Date;
}
interface PrivateKeyUsagePeriodJson {
    notBefore?: Date;
    notAfter?: Date;
}
type PrivateKeyUsagePeriodParameters = PkiObjectParameters & Partial<IPrivateKeyUsagePeriod>;
/**
 * Represents the PrivateKeyUsagePeriod structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class PrivateKeyUsagePeriod extends PkiObject implements IPrivateKeyUsagePeriod {
    static CLASS_NAME: string;
    notBefore?: Date;
    notAfter?: Date;
    /**
     * Initializes a new instance of the {@link PrivateKeyUsagePeriod} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: PrivateKeyUsagePeriodParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof NOT_BEFORE): Date;
    static defaultValues(memberName: typeof NOT_AFTER): Date;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * PrivateKeyUsagePeriod OID ::= 2.5.29.16
     *
     * PrivateKeyUsagePeriod ::= SEQUENCE {
     *    notBefore       [0]     GeneralizedTime OPTIONAL,
     *    notAfter        [1]     GeneralizedTime OPTIONAL }
     * -- either notBefore or notAfter MUST be present
     *```
     */
    static schema(parameters?: SchemaParameters<{
        notBefore?: string;
        notAfter?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): PrivateKeyUsagePeriodJson;
}

declare const ID = "id";
declare const TYPE$1 = "type";
declare const VALUES = "values";
interface IQCStatement {
    id: string;
    type?: any;
}
interface QCStatementJson {
    id: string;
    type?: any;
}
type QCStatementParameters = PkiObjectParameters & Partial<IQCStatement>;
type QCStatementSchema = SchemaParameters<{
    id?: string;
    type?: string;
}>;
/**
 * Represents the QCStatement structure described in [RFC3739](https://datatracker.ietf.org/doc/html/rfc3739)
 */
declare class QCStatement extends PkiObject implements IQCStatement {
    static CLASS_NAME: string;
    id: string;
    type?: any;
    /**
     * Initializes a new instance of the {@link QCStatement} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: QCStatementParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ID): string;
    static defaultValues(memberName: typeof TYPE$1): any;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * QCStatement ::= SEQUENCE {
     *       statementId   QC-STATEMENT.&id({SupportedStatements}),
     *       statementInfo QC-STATEMENT.&Type({SupportedStatements}{@statementId}) OPTIONAL
     *   }
     *```
     */
    static schema(parameters?: QCStatementSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): QCStatementJson;
}
interface IQCStatements {
    values: QCStatement[];
}
interface QCStatementsJson {
    values: QCStatementJson[];
}
type QCStatementsParameters = PkiObjectParameters & Partial<IQCStatements>;
/**
 * Represents the QCStatements structure described in [RFC3739](https://datatracker.ietf.org/doc/html/rfc3739)
 */
declare class QCStatements extends PkiObject implements IQCStatements {
    static CLASS_NAME: string;
    values: QCStatement[];
    /**
     * Initializes a new instance of the {@link QCStatement} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: QCStatementParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VALUES): QCStatement[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * QCStatements ::= SEQUENCE OF QCStatement
     *```
     */
    static schema(parameters?: SchemaParameters<{
        values?: string;
        value?: QCStatementSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): QCStatementsJson;
}

declare const HASH_ALGORITHM$2 = "hashAlgorithm";
declare const MASK_GEN_ALGORITHM$1 = "maskGenAlgorithm";
declare const P_SOURCE_ALGORITHM = "pSourceAlgorithm";
interface IRSAESOAEPParams {
    hashAlgorithm: AlgorithmIdentifier;
    maskGenAlgorithm: AlgorithmIdentifier;
    pSourceAlgorithm: AlgorithmIdentifier;
}
interface RSAESOAEPParamsJson {
    hashAlgorithm?: AlgorithmIdentifierJson;
    maskGenAlgorithm?: AlgorithmIdentifierJson;
    pSourceAlgorithm?: AlgorithmIdentifierJson;
}
type RSAESOAEPParamsParameters = PkiObjectParameters & Partial<IRSAESOAEPParams>;
/**
 * Class from RFC3447
 */
declare class RSAESOAEPParams extends PkiObject implements IRSAESOAEPParams {
    static CLASS_NAME: string;
    hashAlgorithm: AlgorithmIdentifier;
    maskGenAlgorithm: AlgorithmIdentifier;
    pSourceAlgorithm: AlgorithmIdentifier;
    /**
     * Initializes a new instance of the {@link RSAESOAEPParams} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RSAESOAEPParamsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof HASH_ALGORITHM$2): AlgorithmIdentifier;
    static defaultValues(memberName: typeof MASK_GEN_ALGORITHM$1): AlgorithmIdentifier;
    static defaultValues(memberName: typeof P_SOURCE_ALGORITHM): AlgorithmIdentifier;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RSAES-OAEP-params ::= SEQUENCE {
     *    hashAlgorithm     [0] HashAlgorithm    DEFAULT sha1,
     *    maskGenAlgorithm  [1] MaskGenAlgorithm DEFAULT mgf1SHA1,
     *    pSourceAlgorithm  [2] PSourceAlgorithm DEFAULT pSpecifiedEmpty
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        hashAlgorithm?: AlgorithmIdentifierSchema;
        maskGenAlgorithm?: AlgorithmIdentifierSchema;
        pSourceAlgorithm?: AlgorithmIdentifierSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RSAESOAEPParamsJson;
}

declare const HASH_ALGORITHM$1 = "hashAlgorithm";
declare const MASK_GEN_ALGORITHM = "maskGenAlgorithm";
declare const SALT_LENGTH = "saltLength";
declare const TRAILER_FIELD = "trailerField";
interface IRSASSAPSSParams {
    /**
     * Algorithms of hashing (DEFAULT sha1)
     */
    hashAlgorithm: AlgorithmIdentifier;
    /**
     * Salt length (DEFAULT 20)
     */
    maskGenAlgorithm: AlgorithmIdentifier;
    /**
     * Salt length (DEFAULT 20)
     */
    saltLength: number;
    /**
     * (DEFAULT 1)
     */
    trailerField: number;
}
interface RSASSAPSSParamsJson {
    hashAlgorithm?: AlgorithmIdentifierJson;
    maskGenAlgorithm?: AlgorithmIdentifierJson;
    saltLength?: number;
    trailerField?: number;
}
type RSASSAPSSParamsParameters = PkiObjectParameters & Partial<IRSASSAPSSParams>;
/**
 * Represents the RSASSAPSSParams structure described in [RFC4055](https://datatracker.ietf.org/doc/html/rfc4055)
 */
declare class RSASSAPSSParams extends PkiObject implements IRSASSAPSSParams {
    static CLASS_NAME: string;
    hashAlgorithm: AlgorithmIdentifier;
    maskGenAlgorithm: AlgorithmIdentifier;
    saltLength: number;
    trailerField: number;
    /**
     * Initializes a new instance of the {@link RSASSAPSSParams} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: RSASSAPSSParamsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof HASH_ALGORITHM$1): AlgorithmIdentifier;
    static defaultValues(memberName: typeof MASK_GEN_ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SALT_LENGTH): number;
    static defaultValues(memberName: typeof TRAILER_FIELD): number;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * RSASSA-PSS-params ::= Sequence  {
     *    hashAlgorithm      [0] HashAlgorithm DEFAULT sha1Identifier,
     *    maskGenAlgorithm   [1] MaskGenAlgorithm DEFAULT mgf1SHA1Identifier,
     *    saltLength         [2] Integer DEFAULT 20,
     *    trailerField       [3] Integer DEFAULT 1  }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        hashAlgorithm?: AlgorithmIdentifierSchema;
        maskGenAlgorithm?: AlgorithmIdentifierSchema;
        saltLength?: string;
        trailerField?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): RSASSAPSSParamsJson;
}

declare const SAFE_BUGS = "safeBags";
interface ISafeContents {
    safeBags: SafeBag[];
}
type SafeContentsParameters = PkiObjectParameters & Partial<ISafeContents>;
interface SafeContentsJson {
    safeBags: SafeBagJson[];
}
/**
 * Represents the SafeContents structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class SafeContents extends PkiObject implements ISafeContents {
    static CLASS_NAME: string;
    safeBags: SafeBag[];
    /**
     * Initializes a new instance of the {@link SafeContents} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SafeContentsParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof SAFE_BUGS): SafeBag[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SafeContents ::= SEQUENCE OF SafeBag
     *```
     */
    static schema(parameters?: SchemaParameters<{
        safeBags?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SafeContentsJson;
}

declare const SECRET_TYPE_ID = "secretTypeId";
declare const SECRET_VALUE = "secretValue";
interface ISecretBag {
    secretTypeId: string;
    secretValue: SchemaCompatible;
}
interface SecretBagJson {
    secretTypeId: string;
    secretValue: asn1js.BaseBlockJson;
}
type SecretBagParameters = PkiObjectParameters & Partial<ISecretBag>;
/**
 * Represents the SecretBag structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class SecretBag extends PkiObject implements ISecretBag {
    static CLASS_NAME: string;
    secretTypeId: string;
    secretValue: SchemaCompatible;
    /**
     * Initializes a new instance of the {@link SecretBag} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SecretBagParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof SECRET_TYPE_ID): string;
    static defaultValues(memberName: typeof SECRET_VALUE): SchemaCompatible;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SecretBag ::= SEQUENCE {
     *    secretTypeId BAG-TYPE.&id ({SecretTypes}),
     *    secretValue  [0] EXPLICIT BAG-TYPE.&Type ({SecretTypes}{@secretTypeId})
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        id?: string;
        value?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SecretBagJson;
}

type BagType = PrivateKeyInfo | PKCS8ShroudedKeyBag | CertBag | CRLBag | SecretBag | SafeContents;
type BagTypeJson = PrivateKeyInfoJson | JsonWebKey | PKCS8ShroudedKeyBagJson | CertBagJson | CRLBagJson | SecretBagJson | SafeContentsJson;
interface BagTypeConstructor<T extends BagType> {
    new (params: {
        schema: any;
    }): T;
}
declare class SafeBagValueFactory {
    private static items?;
    private static getItems;
    static register<T extends BagType = BagType>(id: string, type: BagTypeConstructor<T>): void;
    static find(id: string): BagTypeConstructor<BagType> | null;
}

declare const BAG_ID = "bagId";
declare const BAG_VALUE = "bagValue";
declare const BAG_ATTRIBUTES = "bagAttributes";
interface ISafeBag<T extends BagType = BagType> {
    bagId: string;
    bagValue: T;
    bagAttributes?: Attribute[];
}
type SafeBagParameters<T extends BagType = BagType> = PkiObjectParameters & Partial<ISafeBag<T>>;
interface SafeBagJson {
    bagId: string;
    bagValue: BagTypeJson;
    bagAttributes?: AttributeJson[];
}
/**
 * Represents the SafeBag structure described in [RFC7292](https://datatracker.ietf.org/doc/html/rfc7292)
 */
declare class SafeBag<T extends BagType = BagType> extends PkiObject implements ISafeBag<T> {
    static CLASS_NAME: string;
    bagId: string;
    bagValue: T;
    bagAttributes?: Attribute[];
    /**
     * Initializes a new instance of the {@link SafeBag} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SafeBagParameters<T>);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof BAG_ID): string;
    static defaultValues(memberName: typeof BAG_VALUE): BagType;
    static defaultValues(memberName: typeof BAG_ATTRIBUTES): Attribute[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SafeBag ::= SEQUENCE {
     *    bagId         BAG-TYPE.&id ({PKCS12BagSet}),
     *    bagValue      [0] EXPLICIT BAG-TYPE.&Type({PKCS12BagSet}{@bagId}),
     *    bagAttributes SET OF PKCS12Attribute OPTIONAL
     * }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        bagId?: string;
        bagValue?: string;
        bagAttributes?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SafeBagJson;
}

declare const TYPE = "type";
declare const ATTRIBUTES$1 = "attributes";
declare const ENCODED_VALUE = "encodedValue";
interface ISignedAndUnsignedAttributes {
    type: number;
    attributes: Attribute[];
    /**
     * Need to have it in order to successfully process with signature verification
     */
    encodedValue: ArrayBuffer;
}
interface SignedAndUnsignedAttributesJson {
    type: number;
    attributes: AttributeJson[];
}
type SignedAndUnsignedAttributesParameters = PkiObjectParameters & Partial<ISignedAndUnsignedAttributes>;
type SignedAndUnsignedAttributesSchema = SchemaParameters<{
    tagNumber?: number;
    attributes?: string;
}>;
/**
 * Represents the SignedAndUnsignedAttributes structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class SignedAndUnsignedAttributes extends PkiObject implements ISignedAndUnsignedAttributes {
    static CLASS_NAME: string;
    type: number;
    attributes: Attribute[];
    encodedValue: ArrayBuffer;
    /**
     * Initializes a new instance of the {@link SignedAndUnsignedAttributes} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SignedAndUnsignedAttributesParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TYPE): number;
    static defaultValues(memberName: typeof ATTRIBUTES$1): Attribute[];
    static defaultValues(memberName: typeof ENCODED_VALUE): ArrayBuffer;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SignedAttributes ::= SET SIZE (1..MAX) OF Attribute
     *
     * UnsignedAttributes ::= SET SIZE (1..MAX) OF Attribute
     *```
     */
    static schema(parameters?: SignedAndUnsignedAttributesSchema): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SignedAndUnsignedAttributesJson;
}

declare const VERSION$4 = "version";
declare const LOG_ID = "logID";
declare const EXTENSIONS$2 = "extensions";
declare const TIMESTAMP = "timestamp";
declare const HASH_ALGORITHM = "hashAlgorithm";
declare const SIGNATURE_ALGORITHM$1 = "signatureAlgorithm";
declare const SIGNATURE$1 = "signature";
interface ISignedCertificateTimestamp {
    version: number;
    logID: ArrayBuffer;
    timestamp: Date;
    extensions: ArrayBuffer;
    hashAlgorithm: string;
    signatureAlgorithm: string;
    signature: ArrayBuffer;
}
interface SignedCertificateTimestampJson {
    version: number;
    logID: string;
    timestamp: Date;
    extensions: string;
    hashAlgorithm: string;
    signatureAlgorithm: string;
    signature: string;
}
type SignedCertificateTimestampParameters = PkiObjectParameters & Partial<ISignedCertificateTimestamp> & {
    stream?: bs.SeqStream;
};
declare class SignedCertificateTimestamp extends PkiObject implements ISignedCertificateTimestamp {
    static CLASS_NAME: string;
    version: number;
    logID: ArrayBuffer;
    timestamp: Date;
    extensions: ArrayBuffer;
    hashAlgorithm: string;
    signatureAlgorithm: string;
    signature: ArrayBuffer;
    /**
     * Initializes a new instance of the {@link SignedCertificateTimestamp} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SignedCertificateTimestampParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$4): number;
    static defaultValues(memberName: typeof LOG_ID): ArrayBuffer;
    static defaultValues(memberName: typeof EXTENSIONS$2): ArrayBuffer;
    static defaultValues(memberName: typeof TIMESTAMP): Date;
    static defaultValues(memberName: typeof HASH_ALGORITHM): string;
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM$1): string;
    static defaultValues(memberName: typeof SIGNATURE$1): ArrayBuffer;
    fromSchema(schema: SchemaType): void;
    /**
     * Converts SeqStream data into current class
     * @param stream
     */
    fromStream(stream: bs.SeqStream): void;
    toSchema(): asn1js.RawData;
    /**
     * Converts current object to SeqStream data
     * @returns SeqStream object
     */
    toStream(): bs.SeqStream;
    toJSON(): SignedCertificateTimestampJson;
    /**
     * Verify SignedCertificateTimestamp for specific input data
     * @param logs Array of objects with information about each CT Log (like here: https://ct.grahamedgecombe.com/logs.json)
     * @param data Data to verify signature against. Could be encoded Certificate or encoded PreCert
     * @param dataType Type = 0 (data is encoded Certificate), type = 1 (data is encoded PreCert)
     * @param crypto Crypto engine
     */
    verify(logs: Log[], data: ArrayBuffer, dataType?: number, crypto?: ICryptoEngine): Promise<boolean>;
}
interface Log {
    /**
     * Identifier of the CT Log encoded in BASE-64 format
     */
    log_id: string;
    /**
     * Public key of the CT Log encoded in BASE-64 format
     */
    key: string;
}
interface Log {
    /**
     * Identifier of the CT Log encoded in BASE-64 format
     */
    log_id: string;
    /**
     * Public key of the CT Log encoded in BASE-64 format
     */
    key: string;
}
/**
 * Verify SignedCertificateTimestamp for specific certificate content
 * @param certificate Certificate for which verification would be performed
 * @param issuerCertificate Certificate of the issuer of target certificate
 * @param logs Array of objects with information about each CT Log (like here: https://ct.grahamedgecombe.com/logs.json)
 * @param index Index of SignedCertificateTimestamp inside SignedCertificateTimestampList (for -1 would verify all)
 * @param crypto Crypto engine
 * @return Array of verification results
 */
declare function verifySCTsForCertificate(certificate: Certificate, issuerCertificate: Certificate, logs: Log[], index?: number, crypto?: ICryptoEngine): Promise<boolean[]>;

declare const TIMESTAMPS = "timestamps";
interface ISignedCertificateTimestampList {
    timestamps: SignedCertificateTimestamp[];
}
interface SignedCertificateTimestampListJson {
    timestamps: SignedCertificateTimestampJson[];
}
type SignedCertificateTimestampListParameters = PkiObjectParameters & Partial<ISignedCertificateTimestampList>;
/**
 * Represents the SignedCertificateTimestampList structure described in [RFC6962](https://datatracker.ietf.org/doc/html/rfc6962)
 */
declare class SignedCertificateTimestampList extends PkiObject implements ISignedCertificateTimestampList {
    static CLASS_NAME: string;
    timestamps: SignedCertificateTimestamp[];
    /**
     * Initializes a new instance of the {@link SignedCertificateTimestampList} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SignedCertificateTimestampListParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof TIMESTAMPS): SignedCertificateTimestamp[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SignedCertificateTimestampList ::= OCTET STRING
     *```
     */
    static schema(parameters?: SchemaParameters): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.OctetString;
    toJSON(): SignedCertificateTimestampListJson;
}

declare const VERSION$3 = "version";
declare const SID = "sid";
declare const DIGEST_ALGORITHM = "digestAlgorithm";
declare const SIGNED_ATTRS = "signedAttrs";
declare const SIGNATURE_ALGORITHM = "signatureAlgorithm";
declare const SIGNATURE = "signature";
declare const UNSIGNED_ATTRS = "unsignedAttrs";
interface ISignerInfo {
    version: number;
    sid: SchemaType;
    digestAlgorithm: AlgorithmIdentifier;
    signedAttrs?: SignedAndUnsignedAttributes;
    signatureAlgorithm: AlgorithmIdentifier;
    signature: asn1js.OctetString;
    unsignedAttrs?: SignedAndUnsignedAttributes;
}
interface SignerInfoJson {
    version: number;
    sid?: SchemaType;
    digestAlgorithm: AlgorithmIdentifierJson;
    signedAttrs?: SignedAndUnsignedAttributesJson;
    signatureAlgorithm: AlgorithmIdentifierJson;
    signature: asn1js.OctetStringJson;
    unsignedAttrs?: SignedAndUnsignedAttributesJson;
}
type SignerInfoParameters = PkiObjectParameters & Partial<ISignerInfo>;
/**
 * Represents the SignerInfo structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 */
declare class SignerInfo extends PkiObject implements ISignerInfo {
    static CLASS_NAME: string;
    version: number;
    sid: SchemaType;
    digestAlgorithm: AlgorithmIdentifier;
    signedAttrs?: SignedAndUnsignedAttributes;
    signatureAlgorithm: AlgorithmIdentifier;
    signature: asn1js.OctetString;
    unsignedAttrs?: SignedAndUnsignedAttributes;
    /**
     * Initializes a new instance of the {@link SignerInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SignerInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$3): number;
    static defaultValues(memberName: typeof SID): SchemaType;
    static defaultValues(memberName: typeof DIGEST_ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNED_ATTRS): SignedAndUnsignedAttributes;
    static defaultValues(memberName: typeof SIGNATURE_ALGORITHM): AlgorithmIdentifier;
    static defaultValues(memberName: typeof SIGNATURE): asn1js.OctetString;
    static defaultValues(memberName: typeof UNSIGNED_ATTRS): SignedAndUnsignedAttributes;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SignerInfo ::= SEQUENCE {
     *    version CMSVersion,
     *    sid SignerIdentifier,
     *    digestAlgorithm DigestAlgorithmIdentifier,
     *    signedAttrs [0] IMPLICIT SignedAttributes OPTIONAL,
     *    signatureAlgorithm SignatureAlgorithmIdentifier,
     *    signature SignatureValue,
     *    unsignedAttrs [1] IMPLICIT UnsignedAttributes OPTIONAL }
     *
     * SignerIdentifier ::= CHOICE {
     *    issuerAndSerialNumber IssuerAndSerialNumber,
     *    subjectKeyIdentifier [0] SubjectKeyIdentifier }
     *
     * SubjectKeyIdentifier ::= OCTET STRING
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        sidSchema?: IssuerAndSerialNumberSchema;
        sid?: string;
        digestAlgorithm?: AlgorithmIdentifierSchema;
        signedAttrs?: SignedAndUnsignedAttributesSchema;
        signatureAlgorithm?: AlgorithmIdentifierSchema;
        signature?: string;
        unsignedAttrs?: SignedAndUnsignedAttributesSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SignerInfoJson;
}

type SignedDataCRL = CertificateRevocationList | OtherRevocationInfoFormat;
type SignedDataCRLJson = CertificateRevocationListJson | OtherRevocationInfoFormatJson;
declare const VERSION$2 = "version";
declare const DIGEST_ALGORITHMS = "digestAlgorithms";
declare const ENCAP_CONTENT_INFO = "encapContentInfo";
declare const CERTIFICATES = "certificates";
declare const CRLS = "crls";
declare const SIGNER_INFOS = "signerInfos";
declare const OCSPS = "ocsps";
interface ISignedData {
    version: number;
    digestAlgorithms: AlgorithmIdentifier[];
    encapContentInfo: EncapsulatedContentInfo;
    certificates?: CertificateSetItem[];
    crls?: SignedDataCRL[];
    ocsps?: BasicOCSPResponse[];
    signerInfos: SignerInfo[];
}
interface SignedDataJson {
    version: number;
    digestAlgorithms: AlgorithmIdentifierJson[];
    encapContentInfo: EncapsulatedContentInfoJson;
    certificates?: CertificateSetItemJson[];
    crls?: SignedDataCRLJson[];
    ocsps?: BasicOCSPResponseJson[];
    signerInfos: SignerInfoJson[];
}
type SignedDataParameters = PkiObjectParameters & Partial<ISignedData>;
interface SignedDataVerifyParams {
    signer?: number;
    data?: ArrayBuffer;
    trustedCerts?: Certificate[];
    checkDate?: Date;
    checkChain?: boolean;
    passedWhenNotRevValues?: boolean;
    extendedMode?: boolean;
    findOrigin?: FindOriginCallback | null;
    findIssuer?: FindIssuerCallback | null;
}
interface SignedDataVerifyErrorParams {
    message: string;
    date?: Date;
    code?: number;
    timestampSerial?: ArrayBuffer | null;
    signatureVerified?: boolean | null;
    signerCertificate?: Certificate | null;
    signerCertificateVerified?: boolean | null;
    certificatePath?: Certificate[];
}
interface SignedDataVerifyResult {
    message: string;
    date?: Date;
    code?: number;
    timestampSerial?: ArrayBuffer | null;
    signatureVerified?: boolean | null;
    signerCertificate?: Certificate | null;
    signerCertificateVerified?: boolean | null;
    certificatePath: Certificate[];
}
declare class SignedDataVerifyError extends Error implements SignedDataVerifyResult {
    date: Date;
    code: number;
    signatureVerified: boolean | null;
    signerCertificate: Certificate | null;
    signerCertificateVerified: boolean | null;
    timestampSerial: ArrayBuffer | null;
    certificatePath: Certificate[];
    constructor({ message, code, date, signatureVerified, signerCertificate, signerCertificateVerified, timestampSerial, certificatePath, }: SignedDataVerifyErrorParams);
}
/**
 * Represents the SignedData structure described in [RFC5652](https://datatracker.ietf.org/doc/html/rfc5652)
 *
 * @example The following example demonstrates how to create and sign CMS Signed Data
 * ```js
 * // Create a new CMS Signed Data
 * const cmsSigned = new pkijs.SignedData({
 *   encapContentInfo: new pkijs.EncapsulatedContentInfo({
 *     eContentType: pkijs.ContentInfo.DATA,, // "data" content type
 *     eContent: new asn1js.OctetString({ valueHex: buffer })
 *   }),
 *   signerInfos: [
 *     new pkijs.SignerInfo({
 *       sid: new pkijs.IssuerAndSerialNumber({
 *         issuer: cert.issuer,
 *         serialNumber: cert.serialNumber
 *       })
 *     })
 *   ],
 *   // Signer certificate for chain validation
 *   certificates: [cert]
 * });
 *
 * await cmsSigned.sign(keys.privateKey, 0, "SHA-256");
 *
 * // Add Signed Data to Content Info
 * const cms = new pkijs.ContentInfo({
 *   contentType: pkijs.ContentInfo.SIGNED_DATA,,
 *   content: cmsSigned.toSchema(true),
 * });
 *
 * // Encode CMS to ASN.1
 * const cmsRaw = cms.toSchema().toBER();
 * ```
 *
 * @example The following example demonstrates how to verify CMS Signed Data
 * ```js
 * // Parse CMS and detect it's Signed Data
 * const cms = pkijs.ContentInfo.fromBER(cmsRaw);
 * if (cms.contentType !== pkijs.ContentInfo.SIGNED_DATA) {
 *   throw new Error("CMS is not Signed Data");
 * }
 *
 * // Read Signed Data
 * const signedData = new pkijs.SignedData({ schema: cms.content });
 *
 * // Verify Signed Data signature
 * const ok = await signedData.verify({
 *   signer: 0,
 *   checkChain: true,
 *   trustedCerts: [trustedCert],
 * });
 *
 * if (!ok) {
 *   throw new Error("CMS signature is invalid")
 * }
 * ```
 */
declare class SignedData extends PkiObject implements ISignedData {
    static CLASS_NAME: string;
    static ID_DATA: typeof id_ContentType_Data;
    version: number;
    digestAlgorithms: AlgorithmIdentifier[];
    encapContentInfo: EncapsulatedContentInfo;
    certificates?: CertificateSetItem[];
    crls?: SignedDataCRL[];
    ocsps?: BasicOCSPResponse[];
    signerInfos: SignerInfo[];
    /**
     * Initializes a new instance of the {@link SignedData} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SignedDataParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$2): number;
    static defaultValues(memberName: typeof DIGEST_ALGORITHMS): AlgorithmIdentifier[];
    static defaultValues(memberName: typeof ENCAP_CONTENT_INFO): EncapsulatedContentInfo;
    static defaultValues(memberName: typeof CERTIFICATES): CertificateSetItem[];
    static defaultValues(memberName: typeof CRLS): SignedDataCRL[];
    static defaultValues(memberName: typeof OCSPS): BasicOCSPResponse[];
    static defaultValues(memberName: typeof SIGNER_INFOS): SignerInfo[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SignedData ::= SEQUENCE {
     *    version CMSVersion,
     *    digestAlgorithms DigestAlgorithmIdentifiers,
     *    encapContentInfo EncapsulatedContentInfo,
     *    certificates [0] IMPLICIT CertificateSet OPTIONAL,
     *    crls [1] IMPLICIT RevocationInfoChoices OPTIONAL,
     *    signerInfos SignerInfos }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        digestAlgorithms?: string;
        encapContentInfo?: EncapsulatedContentInfoSchema;
        certificates?: string;
        crls?: RevocationInfoChoicesSchema;
        signerInfos?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(encodeFlag?: boolean): SchemaType;
    toJSON(): SignedDataJson;
    verify(params?: SignedDataVerifyParams & {
        extendedMode?: false;
    }, crypto?: ICryptoEngine): Promise<boolean>;
    verify(params: SignedDataVerifyParams & {
        extendedMode: true;
    }, crypto?: ICryptoEngine): Promise<SignedDataVerifyResult>;
    /**
     * Signing current SignedData
     * @param privateKey Private key for "subjectPublicKeyInfo" structure
     * @param signerIndex Index number (starting from 0) of signer index to make signature for
     * @param hashAlgorithm Hashing algorithm. Default SHA-1
     * @param data Detached data
     * @param crypto Crypto engine
     */
    sign(privateKey: CryptoKey, signerIndex: number, hashAlgorithm?: string, data?: BufferSource, crypto?: ICryptoEngine): Promise<void>;
}

declare const ATTRIBUTES = "attributes";
interface ISubjectDirectoryAttributes {
    attributes: Attribute[];
}
interface SubjectDirectoryAttributesJson {
    attributes: AttributeJson[];
}
type SubjectDirectoryAttributesParameters = PkiObjectParameters & Partial<ISubjectDirectoryAttributes>;
/**
 * Represents the SubjectDirectoryAttributes structure described in [RFC5280](https://datatracker.ietf.org/doc/html/rfc5280)
 */
declare class SubjectDirectoryAttributes extends PkiObject implements ISubjectDirectoryAttributes {
    static CLASS_NAME: string;
    attributes: Attribute[];
    /**
     * Initializes a new instance of the {@link SubjectDirectoryAttributes} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: SubjectDirectoryAttributesParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof ATTRIBUTES): Attribute[];
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * SubjectDirectoryAttributes ::= SEQUENCE SIZE (1..MAX) OF Attribute
     *```
     */
    static schema(parameters?: SchemaParameters<{
        attributes?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): SubjectDirectoryAttributesJson;
}

declare const VERSION$1 = "version";
declare const POLICY = "policy";
declare const MESSAGE_IMPRINT$1 = "messageImprint";
declare const SERIAL_NUMBER = "serialNumber";
declare const GEN_TIME = "genTime";
declare const ORDERING = "ordering";
declare const NONCE$1 = "nonce";
declare const ACCURACY = "accuracy";
declare const TSA = "tsa";
declare const EXTENSIONS$1 = "extensions";
interface ITSTInfo {
    /**
     * Version of the time-stamp token.
     *
     * Conforming time-stamping servers MUST be able to provide version 1 time-stamp tokens.
     */
    version: number;
    /**
     * TSA's policy under which the response was produced.
     *
     * If a similar field was present in the TimeStampReq, then it MUST have the same value,
     * otherwise an error (unacceptedPolicy) MUST be returned
     */
    policy: string;
    /**
     * The messageImprint MUST have the same value as the similar field in
     * TimeStampReq, provided that the size of the hash value matches the
     * expected size of the hash algorithm identified in hashAlgorithm.
     */
    messageImprint: MessageImprint;
    /**
     * Integer assigned by the TSA to each TimeStampToken.
     *
     * It MUST be unique for each TimeStampToken issued by a given TSA.
     */
    serialNumber: asn1js.Integer;
    /**
     * Time at which the time-stamp token has been created by the TSA
     */
    genTime: Date;
    /**
     * Represents the time deviation around the UTC time contained in GeneralizedTime
     */
    accuracy?: Accuracy;
    /**
     * If the ordering field is missing, or if the ordering field is present
     * and set to false, then the genTime field only indicates the time at
     * which the time-stamp token has been created by the TSA.In such a
     * case, the ordering of time-stamp tokens issued by the same TSA or
     * different TSAs is only possible when the difference between the
     * genTime of the first time-stamp token and the genTime of the second
     * time-stamp token is greater than the sum of the accuracies of the
     * genTime for each time-stamp token.
     *
     * If the ordering field is present and set to true, every time-stamp
     * token from the same TSA can always be ordered based on the genTime
     * field, regardless of the genTime accuracy.
     */
    ordering?: boolean;
    /**
     * Field MUST be present if it was present in the TimeStampReq.
     * In such a case it MUST equal the value provided in the TimeStampReq structure.
     */
    nonce?: asn1js.Integer;
    /**
     * `tsa` field is to give a hint in identifying the name of the TSA.
     * If present, it MUST correspond to one of the subject names included
     * in the certificate that is to be used to verify the token.
     */
    tsa?: GeneralName;
    /**
     * Additional information in the future.  Extensions is defined in [RFC2459](https://datatracker.ietf.org/doc/html/rfc2459)
     */
    extensions?: Extension[];
}
interface TSTInfoJson {
    version: number;
    policy: string;
    messageImprint: MessageImprintJson;
    serialNumber: asn1js.IntegerJson;
    genTime: Date;
    accuracy?: AccuracyJson;
    ordering?: boolean;
    nonce?: asn1js.IntegerJson;
    tsa?: GeneralNameJson;
    extensions?: ExtensionJson[];
}
type TSTInfoParameters = PkiObjectParameters & Partial<ITSTInfo>;
interface TSTInfoVerifyParams {
    data: ArrayBuffer;
    notBefore?: Date;
    notAfter?: Date;
}
/**
 * Represents the TSTInfo structure described in [RFC3161](https://www.ietf.org/rfc/rfc3161.txt)
 */
declare class TSTInfo extends PkiObject implements ITSTInfo {
    static CLASS_NAME: string;
    version: number;
    policy: string;
    messageImprint: MessageImprint;
    serialNumber: asn1js.Integer;
    genTime: Date;
    accuracy?: Accuracy;
    ordering?: boolean;
    nonce?: asn1js.Integer;
    tsa?: GeneralName;
    extensions?: Extension[];
    /**
     * Initializes a new instance of the {@link TSTInfo} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: TSTInfoParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION$1): number;
    static defaultValues(memberName: typeof POLICY): string;
    static defaultValues(memberName: typeof MESSAGE_IMPRINT$1): MessageImprint;
    static defaultValues(memberName: typeof SERIAL_NUMBER): asn1js.Integer;
    static defaultValues(memberName: typeof GEN_TIME): Date;
    static defaultValues(memberName: typeof ACCURACY): Accuracy;
    static defaultValues(memberName: typeof ORDERING): boolean;
    static defaultValues(memberName: typeof NONCE$1): asn1js.Integer;
    static defaultValues(memberName: typeof TSA): GeneralName;
    static defaultValues(memberName: typeof EXTENSIONS$1): Extension[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * TSTInfo ::= SEQUENCE  {
     *   version                      INTEGER  { v1(1) },
     *   policy                       TSAPolicyId,
     *   messageImprint               MessageImprint,
     *   serialNumber                 INTEGER,
     *   genTime                      GeneralizedTime,
     *   accuracy                     Accuracy                 OPTIONAL,
     *   ordering                     BOOLEAN             DEFAULT FALSE,
     *   nonce                        INTEGER                  OPTIONAL,
     *   tsa                          [0] GeneralName          OPTIONAL,
     *   extensions                   [1] IMPLICIT Extensions  OPTIONAL  }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        policy?: string;
        messageImprint?: MessageImprintSchema;
        serialNumber?: string;
        genTime?: string;
        accuracy?: AccuracySchema;
        ordering?: string;
        nonce?: string;
        tsa?: GeneralNameSchema;
        extensions?: string;
        extension?: ExtensionSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): TSTInfoJson;
    /**
     * Verify current TST Info value
     * @param params Input parameters
     * @param crypto Crypto engine
     */
    verify(params: TSTInfoVerifyParams, crypto?: ICryptoEngine): Promise<boolean>;
}

declare const VERSION = "version";
declare const MESSAGE_IMPRINT = "messageImprint";
declare const REQ_POLICY = "reqPolicy";
declare const NONCE = "nonce";
declare const CERT_REQ = "certReq";
declare const EXTENSIONS = "extensions";
interface ITimeStampReq {
    /**
     * Version of the Time-Stamp request. Should be version 1.
     */
    version: number;
    /**
     * Contains the hash of the datum to be time-stamped
     */
    messageImprint: MessageImprint;
    /**
     * Indicates the TSA policy under which the TimeStampToken SHOULD be provided.
     */
    reqPolicy?: string;
    /**
     * The nonce, if included, allows the client to verify the timeliness of
     * the response when no local clock is available. The nonce is a large
     * random number with a high probability that the client generates it
     * only once.
     */
    nonce?: asn1js.Integer;
    /**
     * If the certReq field is present and set to true, the TSA's public key
     * certificate that is referenced by the ESSCertID identifier inside a
     * SigningCertificate attribute in the response MUST be provided by the
     * TSA in the certificates field from the SignedData structure in that
     * response. That field may also contain other certificates.
     *
     * If the certReq field is missing or if the certReq field is present
     * and set to false then the certificates field from the SignedData
     * structure MUST not be present in the response.
     */
    certReq?: boolean;
    /**
     * The extensions field is a generic way to add additional information
     * to the request in the future.
     */
    extensions?: Extension[];
}
interface TimeStampReqJson {
    version: number;
    messageImprint: MessageImprintJson;
    reqPolicy?: string;
    nonce?: asn1js.IntegerJson;
    certReq?: boolean;
    extensions?: ExtensionJson[];
}
type TimeStampReqParameters = PkiObjectParameters & Partial<ITimeStampReq>;
/**
 * Represents the TimeStampReq structure described in [RFC3161](https://www.ietf.org/rfc/rfc3161.txt)
 *
 * @example The following example demonstrates how to create Time-Stamp Request
 * ```js
 * const nonce = pkijs.getRandomValues(new Uint8Array(10)).buffer;
 *
 * const tspReq = new pkijs.TimeStampReq({
 *   version: 1,
 *   messageImprint: await pkijs.MessageImprint.create("SHA-256", message),
 *   reqPolicy: "1.2.3.4.5.6",
 *   certReq: true,
 *   nonce: new asn1js.Integer({ valueHex: nonce }),
 * });
 *
 * const tspReqRaw = tspReq.toSchema().toBER();
 * ```
 */
declare class TimeStampReq extends PkiObject implements ITimeStampReq {
    static CLASS_NAME: string;
    version: number;
    messageImprint: MessageImprint;
    reqPolicy?: string;
    nonce?: asn1js.Integer;
    certReq?: boolean;
    extensions?: Extension[];
    /**
     * Initializes a new instance of the {@link TimeStampReq} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: TimeStampReqParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof VERSION): number;
    static defaultValues(memberName: typeof MESSAGE_IMPRINT): MessageImprint;
    static defaultValues(memberName: typeof REQ_POLICY): string;
    static defaultValues(memberName: typeof NONCE): asn1js.Integer;
    static defaultValues(memberName: typeof CERT_REQ): boolean;
    static defaultValues(memberName: typeof EXTENSIONS): Extension[];
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * TimeStampReq ::= SEQUENCE  {
     *    version               INTEGER  { v1(1) },
     *    messageImprint        MessageImprint,
     *    reqPolicy             TSAPolicyId              OPTIONAL,
     *    nonce                 INTEGER                  OPTIONAL,
     *    certReq               BOOLEAN                  DEFAULT FALSE,
     *    extensions            [0] IMPLICIT Extensions  OPTIONAL  }
     *
     * TSAPolicyId ::= OBJECT IDENTIFIER
     *```
     */
    static schema(parameters?: SchemaParameters<{
        version?: string;
        messageImprint?: MessageImprintSchema;
        reqPolicy?: string;
        nonce?: string;
        certReq?: string;
        extensions?: string;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): TimeStampReqJson;
}

declare const STATUS = "status";
declare const TIME_STAMP_TOKEN = "timeStampToken";
interface ITimeStampResp {
    /**
     * Time-Stamp status
     */
    status: PKIStatusInfo;
    /**
     * Time-Stamp token
     */
    timeStampToken?: ContentInfo;
}
interface TimeStampRespJson {
    status: PKIStatusInfoJson;
    timeStampToken?: ContentInfoJson;
}
interface TimeStampRespVerifyParams {
    signer?: number;
    trustedCerts?: Certificate[];
    data?: ArrayBuffer;
}
type TimeStampRespParameters = PkiObjectParameters & Partial<ITimeStampResp>;
/**
 * Represents the TimeStampResp structure described in [RFC3161](https://www.ietf.org/rfc/rfc3161.txt)
 *
 * @example The following example demonstrates how to create and sign Time-Stamp Response
 * ```js
 * // Generate random serial number
 * const serialNumber = pkijs.getRandomValues(new Uint8Array(10)).buffer;
 *
 * // Create specific TST info structure to sign
 * const tstInfo = new pkijs.TSTInfo({
 *   version: 1,
 *   policy: tspReq.reqPolicy,
 *   messageImprint: tspReq.messageImprint,
 *   serialNumber: new asn1js.Integer({ valueHex: serialNumber }),
 *   genTime: new Date(),
 *   ordering: true,
 *   accuracy: new pkijs.Accuracy({
 *     seconds: 1,
 *     millis: 1,
 *     micros: 10
 *   }),
 *   nonce: tspReq.nonce,
 * });
 *
 * // Create and sign CMS Signed Data with TSTInfo
 * const cmsSigned = new pkijs.SignedData({
 *   version: 3,
 *   encapContentInfo: new pkijs.EncapsulatedContentInfo({
 *     eContentType: "1.2.840.113549.1.9.16.1.4", // "tSTInfo" content type
 *     eContent: new asn1js.OctetString({ valueHex: tstInfo.toSchema().toBER() }),
 *   }),
 *   signerInfos: [
 *     new pkijs.SignerInfo({
 *       version: 1,
 *       sid: new pkijs.IssuerAndSerialNumber({
 *         issuer: cert.issuer,
 *         serialNumber: cert.serialNumber
 *       })
 *     })
 *   ],
 *   certificates: [cert]
 * });
 *
 * await cmsSigned.sign(keys.privateKey, 0, "SHA-256");
 *
 * // Create CMS Content Info
 * const cmsContent = new pkijs.ContentInfo({
 *   contentType: pkijs.ContentInfo.SIGNED_DATA,
 *   content: cmsSigned.toSchema(true)
 * });
 *
 * // Finally create completed TSP response structure
 * const tspResp = new pkijs.TimeStampResp({
 *   status: new pkijs.PKIStatusInfo({ status: pkijs.PKIStatus.granted }),
 *   timeStampToken: new pkijs.ContentInfo({ schema: cmsContent.toSchema() })
 * });
 *
 * const tspRespRaw = tspResp.toSchema().toBER();
 * ```
 */
declare class TimeStampResp extends PkiObject implements ITimeStampResp {
    static CLASS_NAME: string;
    status: PKIStatusInfo;
    timeStampToken?: ContentInfo;
    /**
     * Initializes a new instance of the {@link TimeStampResp} class
     * @param parameters Initialization parameters
     */
    constructor(parameters?: TimeStampRespParameters);
    /**
     * Returns default values for all class members
     * @param memberName String name for a class member
     * @returns Default value
     */
    static defaultValues(memberName: typeof STATUS): PKIStatusInfo;
    static defaultValues(memberName: typeof TIME_STAMP_TOKEN): ContentInfo;
    /**
     * Compare values with default values for all class members
     * @param memberName String name for a class member
     * @param memberValue Value to compare with default value
     */
    static compareWithDefault(memberName: string, memberValue: any): boolean;
    /**
     * @inheritdoc
     * @asn ASN.1 schema
     * ```asn
     * TimeStampResp ::= SEQUENCE  {
     *    status                  PKIStatusInfo,
     *    timeStampToken          TimeStampToken     OPTIONAL  }
     *```
     */
    static schema(parameters?: SchemaParameters<{
        status?: PKIStatusInfoSchema;
        timeStampToken?: ContentInfoSchema;
    }>): SchemaType;
    fromSchema(schema: SchemaType): void;
    toSchema(): asn1js.Sequence;
    toJSON(): TimeStampRespJson;
    /**
     * Sign current TSP Response
     * @param privateKey Private key for "subjectPublicKeyInfo" structure
     * @param hashAlgorithm Hashing algorithm. Default SHA-1
     * @param crypto Crypto engine
     */
    sign(privateKey: CryptoKey, hashAlgorithm?: string, crypto?: ICryptoEngine): Promise<void>;
    /**
     * Verify current TSP Response
     * @param verificationParameters Input parameters for verification
     * @param crypto Crypto engine
     */
    verify(verificationParameters?: TimeStampRespVerifyParams, crypto?: ICryptoEngine): Promise<boolean>;
    private assertContentType;
}

declare class ParameterError extends TypeError {
    static readonly NAME = "ParameterError";
    static assert(target: string, params: any, ...fields: string[]): void;
    static assert(params: any, ...fields: string[]): void;
    static assertEmpty(value: unknown, name: string, target?: string): asserts value;
    name: typeof ParameterError.NAME;
    field: string;
    target?: string;
    constructor(field: string, target?: string | null, message?: string);
}

interface AnyConstructor {
    new (args: any): any;
}
type ArgumentType = "undefined" | "null" | "boolean" | "number" | "string" | "object" | "Array" | "ArrayBuffer" | "ArrayBufferView" | AnyConstructor;
declare class ArgumentError extends TypeError {
    static readonly NAME = "ArgumentError";
    static isType(value: any, type: "undefined"): value is undefined;
    static isType(value: any, type: "null"): value is null;
    static isType(value: any, type: "boolean"): value is boolean;
    static isType(value: any, type: "number"): value is number;
    static isType(value: any, type: "object"): value is object;
    static isType(value: any, type: "string"): value is string;
    static isType(value: any, type: "Array"): value is any[];
    static isType(value: any, type: "ArrayBuffer"): value is ArrayBuffer;
    static isType(value: any, type: "ArrayBufferView"): value is ArrayBufferView;
    static isType<T>(value: any, type: new (...args: any[]) => T): value is T;
    static isType(value: any, type: ArgumentType): boolean;
    static assert(value: any, name: string, type: "undefined"): asserts value is undefined;
    static assert(value: any, name: string, type: "null"): asserts value is null;
    static assert(value: any, name: string, type: "boolean"): asserts value is boolean;
    static assert(value: any, name: string, type: "number"): asserts value is number;
    static assert(value: any, name: string, type: "object"): asserts value is {
        [key: string]: any;
    };
    static assert(value: any, name: string, type: "string"): asserts value is string;
    static assert(value: any, name: string, type: "Array"): asserts value is any[];
    static assert(value: any, name: string, type: "ArrayBuffer"): asserts value is ArrayBuffer;
    static assert(value: any, name: string, type: "ArrayBufferView"): asserts value is ArrayBufferView;
    static assert<T>(value: any, name: string, type: new (...args: any[]) => T): asserts value is T;
    static assert(value: any, name: string, type: ArgumentType, ...types: ArgumentType[]): void;
    name: typeof ArgumentError.NAME;
}

interface AsnFromBerResult {
    offset: number;
    result: any;
}
interface AsnCompareSchemaResult {
    verified: boolean;
    result?: any;
}
declare class AsnError extends Error {
    static assertSchema(asn1: AsnCompareSchemaResult, target: string): asserts asn1 is {
        verified: true;
        result: any;
    };
    static assert(asn: AsnFromBerResult, target: string): void;
    constructor(message: string);
}

export { AbstractCryptoEngine, AccessDescription, Accuracy, AlgorithmIdentifier, AltName, ArgumentError, AsnError, AttCertValidityPeriod, Attribute, AttributeCertificateInfoV1, AttributeCertificateInfoV2, AttributeCertificateV1, AttributeCertificateV2, AttributeTypeAndValue, AuthenticatedSafe, AuthorityKeyIdentifier, BasicConstraints, BasicOCSPResponse, CAVersion, CRLBag, CRLDistributionPoints, CertBag, CertID, Certificate, CertificateChainValidationEngine, CertificatePolicies, CertificateRevocationList, CertificateSet, CertificateTemplate, CertificationRequest, ChainValidationCode, ChainValidationError, ContentInfo, CryptoEngine, DigestInfo, DistributionPoint, ECCCMSSharedInfo, ECNamedCurves, ECPrivateKey, ECPublicKey, EncapsulatedContentInfo, EncryptedContentInfo, EncryptedData, EnvelopedData, ExtKeyUsage, Extension, ExtensionValueFactory, Extensions, GeneralName, GeneralNames, GeneralSubtree, HASHED_MESSAGE, HASH_ALGORITHM$3 as HASH_ALGORITHM, Holder, InfoAccess, IssuerAndSerialNumber, IssuerSerial, IssuingDistributionPoint, KEKIdentifier, KEKRecipientInfo, KeyAgreeRecipientIdentifier, KeyAgreeRecipientInfo, KeyBag, KeyTransRecipientInfo, MICROS, MILLIS, MacData, MessageImprint, NameConstraints, OCSPRequest, OCSPResponse, ObjectDigestInfo, OriginatorIdentifierOrKey, OriginatorInfo, OriginatorPublicKey, OtherCertificateFormat, OtherKeyAttribute, OtherPrimeInfo, OtherRecipientInfo, OtherRevocationInfoFormat, PBES2Params, PBKDF2Params, PFX, PKCS8ShroudedKeyBag, PKIStatus, PKIStatusInfo, POLICY_IDENTIFIER, POLICY_QUALIFIERS, ParameterError, PasswordRecipientinfo, PkiObject, PolicyConstraints, PolicyInformation, PolicyMapping, PolicyMappings, PolicyQualifierInfo, PrivateKeyInfo, PrivateKeyUsagePeriod, PublicKeyInfo, QCStatement, QCStatements, RDN, RSAESOAEPParams, RSAPrivateKey, RSAPublicKey, RSASSAPSSParams, RecipientEncryptedKey, RecipientEncryptedKeys, RecipientIdentifier, RecipientInfo, RecipientKeyIdentifier, RelativeDistinguishedNames, Request, ResponseBytes, ResponseData, RevocationInfoChoices, RevokedCertificate, SECONDS, SafeBag, SafeBagValueFactory, SafeContents, SecretBag, Signature, SignedAndUnsignedAttributes, SignedCertificateTimestamp, SignedCertificateTimestampList, SignedData, SignedDataVerifyError, SignerInfo, SingleResponse, SubjectDirectoryAttributes, TBSRequest, TSTInfo, TYPE$5 as TYPE, TYPE_AND_VALUES, Time, TimeStampReq, TimeStampResp, TimeType, V2Form, VALUE$6 as VALUE, VALUE_BEFORE_DECODE, checkCA, createCMSECDSASignature, createECDSASignatureFromCMS, engine, getAlgorithmByOID, getAlgorithmParameters, getCrypto, getEngine, getHashAlgorithm, getOIDByAlgorithm, getRandomValues, id_AnyPolicy, id_AuthorityInfoAccess, id_AuthorityKeyIdentifier, id_BaseCRLNumber, id_BasicConstraints, id_CRLBag_X509CRL, id_CRLDistributionPoints, id_CRLNumber, id_CRLReason, id_CertBag_AttributeCertificate, id_CertBag_SDSICertificate, id_CertBag_X509Certificate, id_CertificateIssuer, id_CertificatePolicies, id_ContentType_Data, id_ContentType_EncryptedData, id_ContentType_EnvelopedData, id_ContentType_SignedData, id_ExtKeyUsage, id_FreshestCRL, id_InhibitAnyPolicy, id_InvalidityDate, id_IssuerAltName, id_IssuingDistributionPoint, id_KeyUsage, id_MicrosoftAppPolicies, id_MicrosoftCaVersion, id_MicrosoftCertTemplateV1, id_MicrosoftCertTemplateV2, id_MicrosoftPrevCaCertHash, id_NameConstraints, id_PKIX_OCSP_Basic, id_PolicyConstraints, id_PolicyMappings, id_PrivateKeyUsagePeriod, id_QCStatements, id_SignedCertificateTimestampList, id_SubjectAltName, id_SubjectDirectoryAttributes, id_SubjectInfoAccess, id_SubjectKeyIdentifier, id_ad, id_ad_caIssuers, id_ad_ocsp, id_eContentType_TSTInfo, id_pkix, id_sha1, id_sha256, id_sha384, id_sha512, kdf, setEngine, stringPrep, verifySCTsForCertificate };
export type { AccessDescriptionJson, AccessDescriptionParameters, AccuracyJson, AccuracyParameters, AccuracySchema, AlgorithmIdentifierJson, AlgorithmIdentifierParameters, AlgorithmIdentifierSchema, AltNameJson, AltNameParameters, AnyConstructor, ArgumentType, AsnCompareSchemaResult, AsnFromBerResult, AttCertValidityPeriodJson, AttCertValidityPeriodParameters, AttCertValidityPeriodSchema, AttributeCertificateInfoV1Json, AttributeCertificateInfoV1Parameters, AttributeCertificateInfoV1Schema, AttributeCertificateInfoV2Json, AttributeCertificateInfoV2Parameters, AttributeCertificateInfoV2Schema, AttributeCertificateV1Json, AttributeCertificateV1Parameters, AttributeCertificateV2Json, AttributeCertificateV2Parameters, AttributeJson, AttributeParameters, AttributeSchema, AttributeTypeAndValueJson, AttributeTypeAndValueParameters, AttributeValueType, AuthenticatedSafeJson, AuthenticatedSafeParameters, AuthorityKeyIdentifierJson, AuthorityKeyIdentifierParameters, BagType, BagTypeConstructor, BagTypeJson, BasicConstraintsJson, BasicConstraintsParameters, BasicOCSPResponseJson, BasicOCSPResponseParameters, BasicOCSPResponseVerifyParams, CAVersionJson, CAVersionParameters, CRLBagJson, CRLBagParameters, CRLDistributionPointsJson, CRLDistributionPointsParameters, CertBagJson, CertBagParameters, CertIDCreateParams, CertIDJson, CertIDParameters, CertIDSchema, CertificateChainValidationEngineParameters, CertificateChainValidationEngineVerifyParams, CertificateChainValidationEngineVerifyResult, CertificateJson, CertificateParameters, CertificatePoliciesJson, CertificatePoliciesParameters, CertificateRevocationListJson, CertificateRevocationListParameters, CertificateRevocationListVerifyParams, CertificateSchema, CertificateSetItem, CertificateSetItemJson, CertificateSetJson, CertificateSetParameters, CertificateStatus, CertificateTemplateJson, CertificateTemplateParameters, CertificationRequestInfoParameters, CertificationRequestJson, CertificationRequestParameters, ContentEncryptionAesCbcParams, ContentEncryptionAesGcmParams, ContentEncryptionAlgorithm, ContentInfoJson, ContentInfoParameters, ContentInfoSchema, CryptoEngineAlgorithmOperation, CryptoEngineAlgorithmParams, CryptoEngineConstructor, CryptoEngineDecryptParams, CryptoEngineEncryptParams, CryptoEngineParameters, CryptoEnginePublicKeyParams, CryptoEngineSignWithPrivateKeyParams, CryptoEngineSignatureParams, CryptoEngineStampDataWithPasswordParams, CryptoEngineVerifyDataStampedWithPasswordParams, DigestInfoJson, DigestInfoParameters, DigestInfoSchema, DistributionPointJson, DistributionPointName, DistributionPointNameJson, DistributionPointParameters, ECCCMSSharedInfoJson, ECCCMSSharedInfoParameters, ECNamedCurve, ECPrivateKeyJson, ECPrivateKeyParameters, ECPublicKeyJson, ECPublicKeyParameters, EncapsulatedContentInfoJson, EncapsulatedContentInfoParameters, EncapsulatedContentInfoSchema, EncryptedContentInfoJson, EncryptedContentInfoSchema, EncryptedContentInfoSplit, EncryptedContentParameters, EncryptedDataEncryptParams, EncryptedDataJson, EncryptedDataParameters, EnvelopedDataDecryptBaseParams, EnvelopedDataDecryptBufferParams, EnvelopedDataDecryptKeyParams, EnvelopedDataDecryptParams, EnvelopedDataEncryptionParams, EnvelopedDataJson, EnvelopedDataParameters, ExtKeyUsageJson, ExtKeyUsageParameters, ExtensionConstructorParameters, ExtensionJson, ExtensionParameters, ExtensionParsedValue, ExtensionSchema, ExtensionValueConstructor, ExtensionValueType, ExtensionsJson, ExtensionsParameters, ExtensionsSchema, FindIssuerCallback, FindOriginCallback, GeneralNameJson, GeneralNameParameters, GeneralNameSchema, GeneralNamesJson, GeneralNamesParameters, GeneralNamesSchema, GeneralSubtreeJson, GeneralSubtreeParameters, GlobalCryptoEngine, HolderJson, HolderParameters, HolderSchema, IAccessDescription, IAccuracy, IAlgorithmIdentifier, IAltName, IAttCertValidityPeriod, IAttribute, IAttributeCertificateInfoV1, IAttributeCertificateInfoV2, IAttributeCertificateV1, IAttributeCertificateV2, IAttributeTypeAndValue, IAuthenticatedSafe, IAuthorityKeyIdentifier, IBasicConstraints, IBasicOCSPResponse, ICAVersion, ICRLBag, ICRLDistributionPoints, ICertBag, ICertID, ICertificate, ICertificatePolicies, ICertificateRevocationList, ICertificateSet, ICertificateTemplate, ICertificationRequest, IContentInfo, ICryptoEngine, IDigestInfo, IDistributionPoint, IECCCMSSharedInfo, IECPrivateKey, IECPublicKey, IEncapsulatedContentInfo, IEncryptedContentInfo, IEncryptedData, IEnvelopedData, IExtKeyUsage, IExtension, IExtensions, IGeneralName, IGeneralNames, IGeneralSubtree, IHolder, IInfoAccess, IIssuerAndSerialNumber, IIssuerSerial, IIssuingDistributionPoint, IKEKIdentifier, IKEKRecipientInfo, IKeyAgreeRecipientIdentifier, IKeyAgreeRecipientInfo, IKeyTransRecipientInfo, IMacData, IMessageImprint, INameConstraints, IOCSPRequest, IOCSPResponse, IObjectDigestInfo, IOriginatorIdentifierOrKey, IOriginatorInfo, IOriginatorPublicKey, IOtherCertificateFormat, IOtherKeyAttribute, IOtherPrimeInfo, IOtherRecipientInfo, IOtherRevocationInfoFormat, IPBES2Params, IPBKDF2Params, IPFX, IPKCS8ShroudedKeyBag, IPKIStatusInfo, IPasswordRecipientInfo, IPolicyConstraints, IPolicyInformation, IPolicyMapping, IPolicyMappings, IPolicyQualifierInfo, IPrivateKeyInfo, IPrivateKeyUsagePeriod, IPublicKeyInfo, IQCStatement, IQCStatements, IRSAESOAEPParams, IRSAPrivateKey, IRSAPublicKey, IRSASSAPSSParams, IRecipientEncryptedKey, IRecipientEncryptedKeys, IRecipientIdentifier, IRecipientInfo, IRecipientKeyIdentifier, IRelativeDistinguishedNames, IRequest, IResponseBytes, IResponseData, IRevocationInfoChoices, IRevokedCertificate, ISafeBag, ISafeContents, ISecretBag, ISignature, ISignedAndUnsignedAttributes, ISignedCertificateTimestamp, ISignedCertificateTimestampList, ISignedData, ISignerInfo, ISingleResponse, ISubjectDirectoryAttributes, ITBSRequest, ITSTInfo, ITime, ITimeStampReq, ITimeStampResp, IV2Form, InfoAccessJson, InfoAccessParameters, IssuerAndSerialNumberJson, IssuerAndSerialNumberParameters, IssuerAndSerialNumberSchema, IssuerSerialJson, IssuerSerialParameters, IssuingDistributionPointJson, IssuingDistributionPointParameters, KEKIdentifierJson, KEKIdentifierParameters, KEKIdentifierSchema, KEKRecipientInfoJson, KEKRecipientInfoParameters, KeyAgreeRecipientIdentifierJson, KeyAgreeRecipientIdentifierParameters, KeyAgreeRecipientIdentifierSchema, KeyAgreeRecipientInfoJson, KeyAgreeRecipientInfoParameters, KeyTransRecipientInfoJson, KeyTransRecipientInfoParameters, Log, MacDataJson, MacDataParameters, MacDataSchema, MakeInternalValuesParams, MessageImprintJson, MessageImprintParameters, MessageImprintSchema, NameConstraintsJson, NameConstraintsParameters, OCSPRequestJson, OCSPRequestParameters, OCSPResponseJson, OCSPResponseParameters, ObjectDigestInfoJson, ObjectDigestInfoParameters, OriginatorIdentifierOrKeyJson, OriginatorIdentifierOrKeyParameters, OriginatorIdentifierOrKeySchema, OriginatorInfoJson, OriginatorInfoParameters, OriginatorPublicKeyJson, OriginatorPublicKeyParameters, OtherCertificateFormatJson, OtherCertificateFormatParameters, OtherKeyAttributeJson, OtherKeyAttributeParameters, OtherKeyAttributeSchema, OtherPrimeInfoJson, OtherPrimeInfoParameters, OtherPrimeInfoSchema, OtherRecipientInfoJson, OtherRecipientInfoParameters, OtherRevocationInfoFormatJson, OtherRevocationInfoFormatParameters, PBES2ParamsJson, PBES2ParamsParameters, PBKDF2ParamsJson, PBKDF2ParamsParameters, PFXJson, PFXParameters, PFXParsedValue, PKCS8ShroudedKeyBagJson, PKCS8ShroudedKeyBagParameters, PKIStatusInfoJson, PKIStatusInfoParameters, PKIStatusInfoSchema, PasswordRecipientInfoJson, PasswordRecipientinfoParameters, PkiObjectParameters, PolicyConstraintsJson, PolicyConstraintsParameters, PolicyInformationJson, PolicyInformationParameters, PolicyMappingJson, PolicyMappingParameters, PolicyMappingsJson, PolicyMappingsParameters, PolicyQualifierInfoJson, PolicyQualifierInfoParameters, PrivateKeyInfoJson, PrivateKeyInfoParameters, PrivateKeyUsagePeriodJson, PrivateKeyUsagePeriodParameters, PublicKeyInfoJson, PublicKeyInfoParameters, PublicKeyInfoSchema, QCStatementJson, QCStatementParameters, QCStatementSchema, QCStatementsJson, QCStatementsParameters, RSAESOAEPParamsJson, RSAESOAEPParamsParameters, RSAPrivateKeyJson, RSAPrivateKeyParameters, RSAPublicKeyJson, RSAPublicKeyParameters, RSASSAPSSParamsJson, RSASSAPSSParamsParameters, RecipientEncryptedKeyJson, RecipientEncryptedKeyParameters, RecipientEncryptedKeysJson, RecipientEncryptedKeysParameters, RecipientEncryptedKeysSchema, RecipientIdentifierJson, RecipientIdentifierMixedJson, RecipientIdentifierParameters, RecipientIdentifierSchema, RecipientIdentifierType, RecipientInfoJson, RecipientInfoParameters, RecipientInfoValue, RecipientInfoValueJson, RecipientKeyIdentifierJson, RecipientKeyIdentifierParameters, RecipientKeyIdentifierSchema, RelativeDistinguishedNamesJson, RelativeDistinguishedNamesParameters, RelativeDistinguishedNamesSchema, RequestJson, RequestParameters, RequestSchema, ResponseBytesJson, ResponseBytesParameters, ResponseBytesSchema, ResponseDataJson, ResponseDataParameters, ResponseDataSchema, RevocationInfoChoicesJson, RevocationInfoChoicesParameters, RevocationInfoChoicesSchema, RevokedCertificateJson, RevokedCertificateParameters, SafeBagJson, SafeBagParameters, SafeContent, SafeContentsJson, SafeContentsParameters, SchemaCompatible, SchemaConstructor, SchemaNames, SchemaParameters, SchemaType, SecretBagJson, SecretBagParameters, SignatureJson, SignatureParameters, SignatureSchema, SignedAndUnsignedAttributesJson, SignedAndUnsignedAttributesParameters, SignedAndUnsignedAttributesSchema, SignedCertificateTimestampJson, SignedCertificateTimestampListJson, SignedCertificateTimestampListParameters, SignedCertificateTimestampParameters, SignedDataCRL, SignedDataCRLJson, SignedDataJson, SignedDataParameters, SignedDataVerifyErrorParams, SignedDataVerifyParams, SignedDataVerifyResult, SignerInfoJson, SignerInfoParameters, SingleResponseJson, SingleResponseParameters, SingleResponseSchema, SubjectDirectoryAttributesJson, SubjectDirectoryAttributesParameters, TBSCertListSchema, TBSCertificateSchema, TBSRequestJson, TBSRequestParameters, TBSRequestSchema, TSTInfoJson, TSTInfoParameters, TSTInfoVerifyParams, TimeJson, TimeParameters, TimeSchema, TimeStampReqJson, TimeStampReqParameters, TimeStampRespJson, TimeStampRespParameters, TimeStampRespVerifyParams, V2FormJson, V2FormParameters };
