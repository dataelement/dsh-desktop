# @electron/osx-sign [![npm][npm_img]][npm_url] [![Test][gha_img]][gha_url]

Codesign Electron macOS apps

## About

[`@electron/osx-sign`][electron-osx-sign] minimizes the extra work needed to eventually prepare
your apps for shipping, providing options that work out of the box for most applications.
Additional configuration is available via its API.

There are two main functionalities exposed via this package:
* Signing macOS apps via `sign` functions. Under the hood, this uses the `codesign` utility.
* Creating `.pkg` installer packages via `flat` functions. Under the hood, this uses the `productbuild` utility.

## Installation

`@electron/osx-sign` is integrated into other Electron packaging tools, and can be configured accordingly:
* [Electron Packager](https://electron.github.io/packager/main/types/OsxSignOptions.html)
* [Electron Forge](https://www.electronforge.io/guides/code-signing/code-signing-macos)

You can also install `@electron/osx-sign` separately if your packaging pipeline does not involve those tools:

```sh
npm install --save-dev @electron/osx-sign
```

## Code signing

The signing procedure implemented in this package is based on what described in Electron's [Code Signing Guide](https://github.com/electron/electron/blob/main/docs/tutorial/code-signing.md).

### Prerequisites

* You must be a registered member of the [Apple Developer Program](https://developer.apple.com/programs/).
  Please note that you could be charged by Apple in order to get issued with the required certificates.
* You must have [Xcode](https://developer.apple.com/xcode/) installed from the
  [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835). It is not recommended to download your
  copy from other 3rd party sources for security reasons.
* You must have Xcode Command Line Tools installed. To check whether it is available,
  try `xcode-select --install` and follow the instructions.
* To distribute your app on the Mac App Store, You must create a Mac App on [App Store Connect](https://appstoreconnect.apple.com/).
* You must give your app a unique Bundle ID.
* You must give your app a version number.

### Certificates

In order to distribute your application either inside or outside the Mac App Store,
you will have to have the following certificates from Apple after becoming a registered developer.

Certificates can be created through the
[Certificates, Identities & Profiles](https://developer.apple.com/account/resources/certificates/add)
page in the Apple Developer website or via [Account Preferences in Xcode](https://help.apple.com/xcode/mac/current/#/dev3a05256b8).

For distribution inside the Mac App Store, you will need to create:
* Mac App Distribution: `3rd Party Mac Developer Application: * (*)`
* Mac Installer Distribution: `3rd Party Mac Developer Installer: * (*)`

For distribution outside the Mac App Store:
* Developer ID Application: `Developer ID Application: * (*)`
* Developer ID Installer: `Developer ID Installer: * (*)`

After you create the necessary certifications, download them and open each so that they are
installed in your keychain. We recommend installing them in your system default keychain so
that `@electron/osx-sign` can detect them automatically.

**Note:** They appear to come in pairs. It is preferred to have every one of them installed so not to 
are about which is not yet installed for future works. However, if you may only want to distribute
outside the Mac App Store, there is no need to have the 3rd Party Mac Developer ones installed and vice versa.

### API

```javascript
const { signAsync } = require('@electron/osx-sign')
const opts = {
  app: 'path/to/my.app'
};
signAsync(opts)
  .then(function () {
    // Application signed
  })
  .catch(function (err) {
    // Handle the error
  })
```

The only mandatory option for `signAsync` is a path to your `.app` package.
Configuration for most Electron apps should work out of the box.
For full configuration options, see the [API documentation].

### Usage examples

#### Signing for Mac App Store distribution

```javascript
const { signAsync } = require('@electron/osx-sign')
const opts = {
  app: 'path/to/my.app',
  // optional parameters for additional customization
  platform: "mas", // should be auto-detected if your app was packaged for MAS via Packager or Forge
  type: "distribution", // defaults to "distribution" for submission to App Store Connect
  provisioningProfile: 'path/to/my.provisionprofile', // defaults to the current working directory
  keychain: 'my-keychain', // defaults to the system default login keychain
};
signAsync(opts)
  .then(function () {
    // Application signed
  })
  .catch(function (err) {
    // Handle the error
  })
```

Mac App Store apps require a [Provisioning Profile](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide#prepare-provisioning-profile)
for submission to App Store Connect. We recommend having the provisioning profile for distribution
placed in the current working directory and the signing identity installed in the default keychain.

The app is not expected to run after codesigning since there is no provisioned device, and it is
intended only for submission to App Store Connect. Since `@electron/osx-sign` adds the entry
`com.apple.developer.team-identifier` to a temporary copy of the specified entitlements file
(with the default option `preAutoEntitlements`), distribution builds can no longer be run directly.

To run an app codesigned for distribution locally after codesigning, you may manually add
`ElectronTeamID` in your `Info.plist` and `com.apple.security.application-groups` in the
entitlements file, and set `preAutoEntitlements: false` for `@electron/osx-sign` to avoid
this extra bit. Note that "certain features are only allowed across apps whose team-identifier value match"
([Technical Note TN2415](https://developer.apple.com/library/content/technotes/tn2415/_index.html#//apple_ref/doc/uid/DTS40016427-CH1-ENTITLEMENTSLIST)).

Alternatively, set the app's `type` to `development` to codesign a development version of your app,
which will allow it to be run on your development provisioned machine. Apps signed for development
will not be eligible for submission via App Store Connect.

#### Signing with `--deep`

Some subresources that you may include in your Electron app may need to be signed with `--deep`.
This is not typically safe to apply to the entire Electron app and therefore should be applied to _just_ your file.

```javascript
signAsync({
  app: 'path/to/my.app',
  optionsForFile: (filePath) => {
    // For our one specific file we can pass extra options to be merged
    // with the default options
    if (path.basename(filePath) === 'myStrangeFile.jar') {
      return {
        additionalArguments: ['--deep'],
      };
    }

    // Just use the default options for everything else
    return null;
  },
});
```

#### Signing legacy versions of Electron

`@electron/osx-sign` maintains backwards compatibility with older versions of Electron, but
generally assumes that you are on the latest stable version.

If you are running an older unsupported version of Electron, you should pass in the `version`
option as such:

```javascript
signAsync({
  app: 'path/to/my.app',
  version: '0.34.0',
});
```

## Flat installer packaging

This module also handles the creation of flat installer packages (`.pkg` installers).

> [!NOTE]
> Modern `.pkg` installers are also named "flat" packages for historical purposes. Prior
> to Mac OS X Leopard (10.5), installation packages were organized in hierarchical
> directories. OS X Leopard introduced a new flat package format that is used for modern
> `.pkg` installers.

### API usage

```javascript
const { flatAsync } = require('@electron/osx-sign')
flatAsync({
  app: 'path/to/my.app'
})
  .then(function () {
    // Application flattened
  })
  .catch(function (err) {
    // Handle the error
  })
```

The only mandatory option for `flatAsync` is a path to your `.app` package.
For full configuration options, see the [API documentation].

## CLI

`@electron/osx-sign` also exposes a legacy command-line interface (CLI) for both signing
and installer generation. However, we recommend using the JavaScript API as it has a more
complete API surface (e.g. `optionsForFile` is only available via JS).

```sh
# install the package locally into devDependencies
npm install --save-dev @electron/osx-sign

# Sign a packaged .app bundle
npx electron-osx-sign path/to/my.app [options ...]

# Create a .pkg installer from a packaged .app bundle
npx electron-osx-flat path/to/my.app [options ...]
```

For full options, use the `--help` flag for either command.


## Debug

The [`debug`](https://www.npmjs.com/package/debug) module is used to display advanced logs and messages.
If you are having problems with signing your app with `@electron/osx-sign`, run your signing scripts with
the `DEBUG=electron-osx-sign*` environment variable.

## Test

The project's configured to run automated tests on CircleCI.

If you wish to manually test the module, first comment out `opts.identity` in `test/basic.js` to enable
auto discovery. Then run the command `npm test` from the dev directory.

When this command is run for the first time: `@electron/get` will download macOS Electron releases defined
in `test/config.json`, and save to `~/.electron/`, which might take up less than 1GB of disk space.

A successful testing should look something like:

```
$ npm test

> electron-osx-sign@0.4.17 pretest electron-osx-sign
> rimraf test/work

> electron-osx-sign@0.4.17 test electron-osx-sign
> standard && tape test

Calling @electron/get before running tests...
Running tests...
TAP version 13
# setup
# defaults-test:v7.0.0-beta.3-darwin-x64
ok 1 app signed
# defaults-test:v7.0.0-beta.3-mas-x64
ok 2 app signed
# defaults-test:v6.0.3-darwin-x64
ok 3 app signed
# defaults-test:v6.0.3-mas-x64
ok 4 app signed
# defaults-test:v5.0.10-darwin-x64
ok 5 app signed
# defaults-test:v5.0.10-mas-x64
ok 6 app signed
# defaults-test:v4.2.9-darwin-x64
ok 7 app signed
# defaults-test:v4.2.9-mas-x64
ok 8 app signed
# defaults-test:v3.1.2-darwin-x64
ok 9 app signed
# defaults-test:v3.1.2-mas-x64
ok 10 app signed
# teardown

1..10
# tests 10
# pass  10

# ok
```

[Electron]: https://github.com/electron/electron
[electron-osx-sign]: https://github.com/electron/osx-sign
[npm_img]: https://img.shields.io/npm/v/@electron/osx-sign.svg
[npm_url]: https://npmjs.org/package/@electron/osx-sign
[gha_img]: https://github.com/electron/osx-sign/actions/workflows/test.yml/badge.svg
[gha_url]: https://github.com/electron/osx-sign/actions/workflows/test.yml
