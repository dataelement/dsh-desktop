"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPABILITIES = void 0;
exports.isValidCapabilityName = isValidCapabilityName;
class AppxCapability {
    constructor(nsAlias, nsURI, declareNS, elementName, name) {
        this.nsAlias = nsAlias;
        this.nsURI = nsURI;
        this.declareNS = declareNS;
        this.elementName = elementName;
        this.name = name;
        if (!this.nsAlias && this.declareNS) {
            throw new Error("local declaration of namespace without prefix is not supported");
        }
    }
    toXMLString() {
        const tagName = this.nsAlias ? `${this.nsAlias}:${this.elementName}` : this.elementName;
        if (this.declareNS) {
            return `<${tagName} xmlns:${this.nsAlias}="${this.nsURI}" Name="${this.name}"/>`;
        }
        return `<${tagName} Name="${this.name}"/>`;
    }
}
// Capability type configurations
const CAPABILITY_TYPES = {
    common: {
        nsAlias: null,
        nsURI: "http://schemas.microsoft.com/appx/manifest/foundation/windows10",
        declareNS: false,
        elementName: "Capability",
    },
    uap: {
        nsAlias: "uap",
        nsURI: "http://schemas.microsoft.com/appx/manifest/uap/windows10",
        declareNS: false, // ns already declared in template
        elementName: "Capability",
    },
    device: {
        nsAlias: null,
        nsURI: "http://schemas.microsoft.com/appx/manifest/foundation/windows10",
        declareNS: false,
        elementName: "DeviceCapability",
    },
    uap6: {
        nsAlias: "uap6",
        nsURI: "http://schemas.microsoft.com/appx/manifest/uap/windows10/6",
        declareNS: true,
        elementName: "Capability",
    },
    uap7: {
        nsAlias: "uap7",
        nsURI: "http://schemas.microsoft.com/appx/manifest/uap/windows10/7",
        declareNS: true,
        elementName: "Capability",
    },
    mobile: {
        nsAlias: "mobile",
        nsURI: "http://schemas.microsoft.com/appx/manifest/mobile/windows10",
        declareNS: true,
        elementName: "Capability",
    },
    rescap: {
        nsAlias: "rescap",
        nsURI: "http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities",
        declareNS: false, // ns already declared in template
        elementName: "Capability",
    },
};
// Map of capability types to their capability names (grouped by type)
const CAPABILITY_MAP = new Map([
    // Common capabilities
    [
        "common",
        [
            "internetClient",
            "internetClientServer",
            "privateNetworkClientServer",
            "codeGeneration",
            "allJoyn",
            "backgroundMediaPlayback",
            "remoteSystem",
            "spatialPerception",
            "userDataTasks",
            "userNotificationListener",
        ],
    ],
    // UAP capabilities
    [
        "uap",
        [
            "musicLibrary",
            "picturesLibrary",
            "videosLibrary",
            "removableStorage",
            "appointments",
            "contacts",
            "phoneCall",
            "phoneCallHistoryPublic",
            "userAccountInformation",
            "voipCall",
            "objects3D",
            "chat",
            "blockedChatMessages",
            "enterpriseAuthentication",
            "sharedUserCertificates",
            "documentsLibrary",
        ],
    ],
    // Mobile capabilities
    ["mobile", ["recordedCallsFolder"]],
    // Restricted capabilities
    [
        "rescap",
        [
            "enterpriseDataPolicy",
            "appCaptureSettings",
            "cellularDeviceControl",
            "cellularDeviceIdentity",
            "cellularMessaging",
            "deviceUnlock",
            "dualSimTiles",
            "enterpriseDeviceLockdown",
            "inputInjectionBrokered",
            "inputObservation",
            "inputSuppression",
            "networkingVpnProvider",
            "packageManagement",
            "screenDuplication",
            "userPrincipalName",
            "walletSystem",
            "locationHistory",
            "confirmAppClose",
            "phoneCallHistory",
            "appointmentsSystem",
            "chatSystem",
            "contactsSystem",
            "email",
            "emailSystem",
            "phoneCallHistorySystem",
            "smsSend",
            "userDataSystem",
            "previewStore",
            "firstSignInSettings",
            "teamEditionExperience",
            "remotePassportAuthentication",
            "previewUiComposition",
            "secureAssessment",
            "networkConnectionManagerProvisioning",
            "networkDataPlanProvisioning",
            "slapiQueryLicenseValue",
            "extendedBackgroundTaskTime",
            "extendedExecutionBackgroundAudio",
            "extendedExecutionCritical",
            "extendedExecutionUnconstrained",
            "deviceManagementDmAccount",
            "deviceManagementFoundation",
            "deviceManagementWapSecurityPolicies",
            "deviceManagementEmailAccount",
            "packagePolicySystem",
            "gameList",
            "xboxAccessoryManagement",
            "cortanaSpeechAccessory",
            "accessoryManager",
            "interopServices",
            "inputForegroundObservation",
            "oemDeployment",
            "oemPublicDirectory",
            "appLicensing",
            "locationSystem",
            "userDataAccountsProvider",
            "previewPenWorkspace",
            "secondaryAuthenticationFactor",
            "storeLicenseManagement",
            "userSystemId",
            "targetedContent",
            "uiAutomation",
            "gameBarServices",
            "appCaptureServices",
            "appBroadcastServices",
            "audioDeviceConfiguration",
            "backgroundMediaRecording",
            "previewInkWorkspace",
            "startScreenManagement",
            "cortanaPermissions",
            "allAppMods",
            "expandedResources",
            "protectedApp",
            "gameMonitor",
            "appDiagnostics",
            "devicePortalProvider",
            "enterpriseCloudSSO",
            "backgroundVoIP",
            "oneProcessVoIP",
            "developmentModeNetwork",
            "broadFileSystemAccess",
            "smbios",
            "runFullTrust",
            "allowElevation",
            "teamEditionDeviceCredential",
            "teamEditionView",
            "cameraProcessingExtension",
            "networkDataUsageManagement",
            "phoneLineTransportManagement",
            "unvirtualizedResources",
            "modifiableApp",
            "packageWriteRedirectionCompatibilityShim",
            "customInstallActions",
            "packagedServices",
            "localSystemServices",
            "backgroundSpatialPerception",
            "uiAccess",
        ],
    ],
    // UAP6 capabilities
    ["uap6", ["graphicsCapture"]],
    // UAP7 capabilities
    ["uap7", ["globalMediaControl"]],
    // Device capabilities
    [
        "device",
        [
            "location",
            "microphone",
            "webcam",
            "proximity",
            "pointOfService",
            "wiFiControl",
            "radios",
            "optical",
            "activity",
            "humanPresence",
            "serialcommunication",
            "gazeInput",
            "lowLevel",
            "packageQuery",
        ],
    ],
]);
// Factory function to create capabilities
function createCapability(type, name) {
    const config = CAPABILITY_TYPES[type];
    if (!config) {
        throw new Error(`unknown capability type '${type}'`);
    }
    return new AppxCapability(config.nsAlias, config.nsURI, config.declareNS, config.elementName, name);
}
// Export ordered list of all capabilities (order matters per Microsoft docs)
// Schema: https://learn.microsoft.com/en-us/uwp/schemas/appxpackage/uapmanifestschema/schema-root
// Packaging: https://learn.microsoft.com/en-us/windows/uwp/packaging/app-capability-declarations
// !! the docs are not clear in which order is correct. the schema doc specifies an order that differs from the order described in packaging doc !!
// https://learn.microsoft.com/en-us/answers/questions/92754/why-does-the-order-of-items-in-(capabilities)-of-p
// as stated in the above post the packaging docs is the one to follow as MakeAppx.exe is following this specification when it checks the manifests validity
exports.CAPABILITIES = Array.from(CAPABILITY_MAP.entries()).flatMap(([type, names]) => names.map(name => createCapability(type, name)));
const CAPABILITY_NAMES = new Set(Array.from(CAPABILITY_MAP.values()).flat());
function isValidCapabilityName(name) {
    return !!name && CAPABILITY_NAMES.has(name);
}
//# sourceMappingURL=AppxCapabilities.js.map