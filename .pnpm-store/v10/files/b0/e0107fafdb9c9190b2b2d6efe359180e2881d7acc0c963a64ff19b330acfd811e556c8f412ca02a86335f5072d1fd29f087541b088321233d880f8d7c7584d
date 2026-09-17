# @electron/universal

> Create universal macOS Electron applications

[![Test](https://github.com/electron/universal/actions/workflows/test.yml/badge.svg)](https://github.com/electron/universal/actions/workflows/test.yml)
[![NPM package](https://img.shields.io/npm/v/@electron/universal)](https://npm.im/@electron/universal)

## Usage

This package takes an x64 app and an arm64 app and glues them together into a
[Universal macOS binary](https://developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary).

Note that parameters need to be **absolute** paths.

```typescript
import { makeUniversalApp } from '@electron/universal';

await makeUniversalApp({
  x64AppPath: 'path/to/App_x64.app',
  arm64AppPath: 'path/to/App_arm64.app',
  outAppPath: 'path/to/App_universal.app',
});
```

## Advanced configuration

The basic usage patterns will work for most apps out of the box. Additional configuration
options are available for advanced usecases.

### Merging ASAR archives to reduce app size

**Added in [v1.2.0](https://github.com/electron/universal/commit/38ab1c3559e25382957d608e49e624dc72a4409c)**

If you are using ASAR archives to store your Electron app's JavaScript code, you can use the
`mergeASARs` option to merge your x64 and arm64 ASAR files to reduce the bundle size of
the output Universal app.

If some files are present in only the x64 app but not the arm64 version (or vice-versa),
you can exclude them from the merging process by specifying a `minimatch` pattern
in `singleArchFiles`.

```typescript
import { makeUniversalApp } from '@electron/universal';

await makeUniversalApp({
  x64AppPath: 'path/to/App_x64.app',
  arm64AppPath: 'path/to/App_arm64.app',
  outAppPath: 'path/to/App_universal.app',
  mergeASARs: true,
  singleArchFiles: 'node_modules/some-native-module/lib/binding/Release/**', // if you have files in your asar that are unique to x64 or arm64 apps
});
```

If `@electron/universal` detects an architecture-unique file that isn't covered by the
`singleArchFiles` rule, an error will be thrown.

### Skip lipo for certain binaries in your Universal app

**Added in [1.3.0](https://github.com/electron/universal/commit/01dfb8a9636965fe154192b07934670dd42509f3)**

If your Electron app contains binary resources that are already merged with the
`lipo` tool, providing a [`minimatch`] pattern to matching files in the `x64ArchFiles`
parameter will prevent `@electron/universal` from attempting to merge them a second time.

```typescript
import { makeUniversalApp } from '@electron/universal';

await makeUniversalApp({
  x64AppPath: 'path/to/App_x64.app',
  arm64AppPath: 'path/to/App_arm64.app',
  outAppPath: 'path/to/App_universal.app',
  mergeASARs: true,
  x64ArchFiles: '*/electron-helper', // `electron-helper` is a binary merged using `lipo`
});
```

If `@electron/universal` detects a lipo'd file that isn't covered by the `x64ArchFiles` rule,
an error will be thrown.

### Including already codesigned app bundles into your Universal app

**Added in [v1.4.0](https://github.com/electron/universal/commit/b02ce7697fd2a3c2c79e1f6ab6bf7052125865cc)**

By default, the merging process will generate an `ElectronAsarIntegrity` key for
any `Info.plist` files in your Electron app.

If your Electron app bundles another `.app` that is already signed, you need to use
the `infoPlistsToIgnore` option to avoid modifying that app's plist.

```typescript
import { makeUniversalApp } from '@electron/universal';

await makeUniversalApp({
  x64AppPath: 'path/to/App_x64.app',
  arm64AppPath: 'path/to/App_arm64.app',
  outAppPath: 'path/to/App_universal.app',
  infoPlistsToIgnore: 'my-internal.app/Contents/Info.plist'
});
```

## FAQ

#### The app is twice as big now, why?

A Universal app is just the x64 app and the arm64 app glued together into a single application.
It's twice as big because it contains two apps in one.

Merging your ASAR bundles can yield significant app size reductions depending on how large
your `app.asar` file is.

#### What about native modules?

Out of the box, you don't need to worry about building universal versions of your
native modules. As long as your x64 and arm64 apps work in isolation, the Universal
app will work as well.

Note that if you are using `mergeASARs`, you may need to add architecture-specific
binary resources to the `singleArchFiles` pattern.
See [Merging ASARs usage](#merging-asar-archives-to-reduce-app-size) for an example.

#### How do I build my app for Apple silicon in the first place?

Check out the [Electron Apple silicon blog post](https://www.electronjs.org/blog/apple-silicon).

[`minimatch`]: https://github.com/isaacs/minimatch?tab=readme-ov-file#features
