# @electron/fuses

> Flip [Electron Fuses](https://github.com/electron/electron/blob/main/docs/tutorial/fuses.md) and customize your packaged build of Electron

[![CircleCI](https://circleci.com/gh/electron/fuses.svg?style=shield)](https://circleci.com/gh/electron/fuses)
[![npm version](http://img.shields.io/npm/v/@electron/fuses.svg)](https://npmjs.org/package/@electron/fuses)

## Usage

### Via JavaScript

```typescript
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';

// During your build / package process
await flipFuses(
  require('electron'), // Returns the path to the electron binary
  {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false, // Disables ELECTRON_RUN_AS_NODE
    [FuseV1Options.EnableCookieEncryption]: true, // Enables cookie encryption
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false, // Disables the NODE_OPTIONS environment variable
    [FuseV1Options.EnableNodeCliInspectArguments]: false, // Disables the --inspect and --inspect-brk family of CLI options
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true, // Enables validation of the app.asar archive on macOS
    [FuseV1Options.OnlyLoadAppFromAsar]: true, // Enforces that Electron will only load your app from "app.asar" instead of its normal search paths
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: true, // Loads V8 Snapshot from `browser_v8_context_snapshot.bin` for the browser process
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: true, // Grants the file protocol extra privileges
  },
);
```

### From the command line

```sh
$ npx @electron/fuses read --app /Applications/Foo.app
$ npx @electron/fuses write --app /Applications/Foo.app <...key=on/off>
```

### Apple Silicon

For `arm64` macOS builds of your app if you are not immediately codesigning your app after flipping
the fuses you will need to pass `resetAdHocDarwinSignature: true` to the `flipFuses` method.  Otherwise
the app will refuse to launch with code signature validation errors.  This is a new security measure on
Apple Silicon devices.

```typescript
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';

await flipFuses(
  require('electron'),
  {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: targetPlatform === 'darwin' && targetArch === 'arm64',
    [FuseV1Options.RunAsNode]: false,
  },
);
```

### New Fuses

If you want to ensure you provide a config for every fuse, even newly added fuses during Electron upgrades
you can set the `strictlyRequireAllFuses` option to `true`. This will hard fail the build if you are on
a version of `@electron/fuses` that doesn't have configuration options for every fuse in the Electron binary
you are targetting or if you don't provide a configuration for a specific fuse present in the Electron binary
you are targetting.

```typescript
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';

await flipFuses(
  require('electron'),
  {
    version: FuseVersion.V1,
    strictlyRequireAllFuses: true,
    [FuseV1Options.RunAsNode]: false,
  },
);
```
