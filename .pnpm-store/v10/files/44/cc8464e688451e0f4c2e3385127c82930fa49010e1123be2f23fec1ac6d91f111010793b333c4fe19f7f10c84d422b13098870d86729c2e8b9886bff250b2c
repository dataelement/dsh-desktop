"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsSignAzureManager = void 0;
const builder_util_1 = require("builder-util");
const builder_util_runtime_1 = require("builder-util-runtime");
const lazy_val_1 = require("lazy-val");
class WindowsSignAzureManager {
    constructor(packager) {
        this.packager = packager;
        this.computedPublisherName = new lazy_val_1.Lazy(() => {
            var _a;
            const publisherName = (_a = this.platformSpecificBuildOptions.azureSignOptions) === null || _a === void 0 ? void 0 : _a.publisherName;
            if (publisherName === null) {
                return Promise.resolve(null);
            }
            else if (publisherName != null) {
                return Promise.resolve((0, builder_util_1.asArray)(publisherName));
            }
            // TODO: Is there another way to automatically pull Publisher Name from AzureTrusted service?
            // For now return null.
            return Promise.resolve(null);
        });
        this.cscInfo = new builder_util_runtime_1.MemoLazy(() => this.packager.platformSpecificBuildOptions, _selected => Promise.resolve(null));
        this.platformSpecificBuildOptions = packager.platformSpecificBuildOptions;
    }
    async initialize() {
        const vm = await this.packager.vm.value;
        const ps = await vm.powershellCommand.value;
        builder_util_1.log.info(null, "installing required module (TrustedSigning) with scope CurrentUser");
        try {
            await vm.exec(ps, ["-NoProfile", "-NonInteractive", "-Command", "Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Scope CurrentUser"]);
        }
        catch (error) {
            // Might not be needed, seems GH runners already have NuGet set up.
            // Logging to debug just in case users run into this. If NuGet isn't present, Install-Module -Name TrustedSigning will fail, so we'll get the logs at that point
            builder_util_1.log.debug({ message: error.message || error.stack }, "unable to install PackageProvider Nuget. Might be a false alarm though as some systems already have it installed");
        }
        await vm.exec(ps, ["-NoProfile", "-NonInteractive", "-Command", "Install-Module -Name TrustedSigning -MinimumVersion 0.5.0 -Force -Repository PSGallery -Scope CurrentUser"]);
        // If signing has been misconfigured it, the error from the TrustedSigning module should be descriptive enough to help them fix their configuration.
        // Options: https://learn.microsoft.com/en-us/dotnet/api/azure.identity.environmentcredential?view=azure-dotnet#definition
    }
    computePublisherName() {
        return Promise.resolve(this.packager.platformSpecificBuildOptions.azureSignOptions.publisherName);
    }
    // prerequisite: requires `initializeProviderModules` to already have been executed
    async signFile(options) {
        const vm = await this.packager.vm.value;
        const ps = await vm.powershellCommand.value;
        const { publisherName: _publisher, // extract from `extraSigningArgs`
        endpoint, certificateProfileName, codeSigningAccountName, fileDigest, timestampRfc3161, timestampDigest, ...extraSigningArgs } = options.options.azureSignOptions;
        const params = {
            ...extraSigningArgs,
            Endpoint: endpoint,
            CertificateProfileName: certificateProfileName,
            CodeSigningAccountName: codeSigningAccountName,
            TimestampRfc3161: timestampRfc3161 || "http://timestamp.acs.microsoft.com",
            TimestampDigest: timestampDigest || "SHA256",
            FileDigest: fileDigest || "SHA256",
            Files: vm.toVmFile(options.path),
        };
        const paramsString = Object.entries(params)
            .filter(([_, value]) => value != null)
            .reduce((res, [field, value]) => {
            const escapedValue = String(value).replace(/'/g, "''");
            return [...res, `-${field}`, `'${escapedValue}'`];
        }, [])
            .join(" ");
        await vm.exec(ps, ["-NoProfile", "-NonInteractive", "-Command", `Invoke-TrustedSigning ${paramsString}`]);
        return true;
    }
}
exports.WindowsSignAzureManager = WindowsSignAzureManager;
//# sourceMappingURL=windowsSignAzureManager.js.map