# @malept/flatpak-bundler [![Version](https://img.shields.io/npm/v/@malept/flatpak-bundler.svg)](https://www.npmjs.com/package/@malept/flatpak-bundler) [![Build Status](https://github.com/malept/flatpak-bundler/workflows/CI/badge.svg)](https://github.com/malept/flatpak-bundler/actions?query=workflow%3ACI)
Build [flatpaks](https://flatpak.org/) from Node.js.

# Quick Start

Install `@malept/flatpak-bundler`.
```shell
$ npm install @malept/flatpak-bundler
```

[Build a flatpak with a Node script](#hello-world).

Install and run it!
```shell
$ flatpak install --user --bundle hello.flatpak
$ flatpak run org.world.Hello
Hello, world!
```

## Overview
This modules allows building flatpaks programmatically from Node. It requires
Node 10 or above and flatpak >= 0.6.13 to be installed on your system.

Under the hood, this is just a wrapper for the [flatpak-builder](https://docs.flatpak.org/en/latest/flatpak-builder.html)
tool with some extra sugar added.

With `flatpak-builder`, you specify a runtime, sandbox permissions and software
modules to build into your application, and build a flatpak from start to finish.
This module provides a few additional features:

 - Supports auto installing flatpak runtime and app dependencies
 - Supports exporting directly to the a single file flatpak bundle
 - Supports easy copying files and creating symlinks directly in `/app`

The latter is particularly useful for [Electron](https://electronjs.org/) and
[nw.js](http://nwjs.io/) style Node applications, which often create packages
from prebuilt binaries and do not attempt to follow an autotools-like
[build api](https://github.com/cgwalters/build-api).

This module should make it easy to plug flatpak support into an Electron or nw.js
app packaging phase.

## Usage

### translateArch(arch)

Used to translate a Node-style arch (e.g., `x64`) into a Flatpak-compatible arch (e.g., `x86_64`).

If the arch is unknown, it will pass through the input value.

### bundle(manifest, buildOptions)

Takes an [app manifest](#manifest) and a build options object. It returns a Promise.

Both the manifest and options objects support both camelCase and dash-separated
variants of any option.

The promise is returned with a `finalBuildOptions` value. It contains the build
options after default values have been applied. Useful to read out the
`workingDir`, for example.

#### Manifest

This matches the format for [`flatpak-builder` app
manifests](https://docs.flatpak.org/en/latest/manifests.html), with a few extra
options added and camelCase variants supported.

 - **id**: Required. The application id.
 - **runtime**: Required. The runtime for your flatpak application.
 - **sdk**: Required. The sdk for your flatpak application.
 - **base**: An app to inherit from. Use the app as a "base" for `/app`
   contents.
 - **finishArgs**: The arguments to pass to `flatpak build-finish`. Use this to
   add sandbox permissions. See the [Electron app example](#electron-app) for
   some common app permissions.
 - **modules**: If you need to build other software modules into you flatpak app
   (anything not already in your runtime or base app), you can specify them
   here.

#### Build Options

 - **bundlePath**: Output location for a single file version of the flatpak. If
   non supplied, the single file flatpak will not be created.
 - **arch**: The architecture for the flatpak bundle. x86_64, i386 or arm.
 - **workingDir**: The working directory to call `flatpak-builder` from.
   Defaults to a new tmp directory.
 - **buildDir**: The directory to build the application in. Defaults to
   `${workingDir}/build`
 - **repoDir**: The directory for a flatpak repo, can be used to publish to an
   existing repo. Defaults to `${workingDir}/repo`
 - **cleanTmpdirs**: Cleanup any tmp directories created during the build on
   process exit. Defaults to true. Set false for easier debugging.
 - **autoInstallRuntime**: Install/update the runtime while building. Defaults
   to true if runtimeFlatpakref is set in the manifest.
 - **autoInstallSdk**: Install/update the sdk while building. Defaults
   to true if sdkFlatpakref is set in the manifest.
 - **autoInstallBase**: Install/update the base app while building. Defaults
   to true if baseFlatpakref is set in the manifest.
 - **gpgSign**: The gpg key to use to sign the flatpak repo and bundle file.
 - **gpgHomedir**: The gpg homedir to use when signing.
 - **subject**: The single line subject to use for the flatpak repo commit
   message.
 - **body**: The description to use for the flatpak repo commit message.
 - **files**: Files to copy directly into the app. Should be a list of [source,
   dest] tuples. Source should be a relative/absolute path to a file/directory
   to copy into the flatpak, and dest should be the path inside the app install
   prefix (e.g. `/share/applications/`)
 - **symlinks**: Symlinks to create in the app files. Should be a list of
   [target, location] symlink tuples. Target can be either a relative or
   absolute path inside the app install prefix, and location should be a
   absolute path inside the prefix to create the symlink at.
 - **extraExports**: Files to export outside of the flatpak sandbox, in addition
   to the application desktop file, icons and appstream. File basename *must*
   be prefixed with the app id. Should not be needed for common use.
 - **runtimeFlatpakref**: A pathname or url to a flatpakref file to use to auto
   install the runtime.
 - **sdkFlatpakref**: A pathname or url to a flatpakref file to use to auto
   install the sdk.
 - **baseFlatpakref**: A pathname or url to a flatpakref file to use to auto
   install the base app.
 - **bundleRepoUrl**: Repo url for the single file bundle. Installing the bundle
   will automatically configure a remote for this URL.
 - **extraFlatpakBuilderArgs**: List of extra arguments to pass to the
   [flatpak-builder](https://docs.flatpak.org/en/latest/flatpak-builder-command-reference.html) command.
 - **extraFlatpakBuildExportArgs**: List of extra arguments to pass to the
   [flatpak build-export](https://docs.flatpak.org/en/latest/flatpak-command-reference.html#flatpak-build-export) command.
 - **extraFlatpakBuildBundleArgs**: List of extra arguments to pass to the
   [flatpak build-bundle](https://docs.flatpak.org/en/latest/flatpak-command-reference.html#flatpak-build-bundle) command.

### Logging
To turn on debugging output, set the DEBUG environment variable:

```shell
DEBUG=flatpak-bundler npm run my-flatpak-command
```

## Examples

### Hello world

```javascript
const flatpakBundler = require('@malept/flatpak-bundler')
const fs = require('fs-extra')

// Write a hello world script to disk
await fs.writeFile('hello',
`#!/bin/bash
echo "Hello, world!"`, { mode: 0o755 })

// Make a flatpak with it!
try {
  await flatpakBundler.bundle({
    id: 'org.world.Hello',
    runtime: 'org.freedesktop.Platform',
    runtimeVersion: '1.4',
    sdk: 'org.freedesktop.Sdk',
  }, {
    bundlePath: 'hello.flatpak',
    files: [
      ['hello', '/bin/hello']
    ],
    runtimeFlatpakref: 'https://raw.githubusercontent.com/endlessm/flatpak-bundler/master/refs/freedesktop-runtime-1.4.flatpakref'
  })
  console.log('Flatpak built successfully')
} catch (error) {
    console.error('Error building flatpak', error)
}
```

### Electron App

```javascript
const flatpakBundler = require('@malept/flatpak-bundler')

try {
  const finalBuildOptions = await flatpakBundler.bundle({ // Manifest
    id: 'org.world.Hello',
    base: 'io.atom.electron.BaseApp', // Electron base application
    runtime: 'org.freedesktop.Platform', // Use the freedesktop runtime
    runtimeVersion: '1.4',
    sdk: 'org.freedesktop.Sdk',
    finishArgs: [
      '--share=ipc', '--socket=x11', // Allow app to show windows with X11
      '--socket=pulseaudio', // Allow audio output
      '--filesystem=home', // Allow access to users home directory
      '--share=network', // Allow network access
      '--device=dri' // Allow OpenGL rendering
    ],
    renameDesktopFile: 'hello.desktop', // Rename the desktop file to agree with the app ID so flatpak will export it
    renameIcon: 'hello' // Rename the icon to agree with the app ID so flatpak will export it
  }, { // Build options
    arch: 'x86_64',
    baseFlatpakref: 'https://s3-us-west-2.amazonaws.com/electron-flatpak.endlessm.com/electron-base-app-master.flatpakref', // So we can auto install the runtime
    bundlePath: 'dist/hello_x86_64.flatpak',
    files: [
      [ 'static/linux', '/share/' ], // Desktop file and icons
      [ packagedFileDir, '/share/bar' ] // Application binaries and assets
    ],
    gpgSign: '1234ABCD', // GPG key to sign with
    runtimeFlatpakref: 'https://raw.githubusercontent.com/endlessm/flatpak-bundler/master/refs/freedesktop-runtime-1.4.flatpakref',
    symlinks: [
      [ '/share/bar/Bar', '/bin/Bar' ] // Create a symlink in /bin to to app executable
    ]
  })
  console.log('Flatpak built successfully.')
  console.log(`Build dir and repo in ${finalBuildOptions.workingDir}`)
} catch (error) {
  console.error('Error building flatpak', error)
}
```
