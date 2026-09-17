# vscode-ripgrep

This is an npm module for using [ripgrep](https://github.com/BurntSushi/ripgrep) in a Node project. It's used by VS Code.

## How it works

- Ripgrep is built in [microsoft/ripgrep-prebuilt](https://github.com/microsoft/ripgrep-prebuilt) and published as release assets for each tag.
- At publish time, the binaries for every supported platform are downloaded by `build/prepare-binaries.js`, verified against `binaries.lock.json` (SHA256), and placed under `bin/<target>/rg[.exe]`. They ship inside the npm tarball.
- At runtime, `lib/index.js` resolves `rgPath` from `process.platform`/`process.arch` to the correct `bin/<target>/<binary>`.
- There is no `postinstall` step and no runtime network access.

### Usage example

```js
const { rgPath } = require('@vscode/ripgrep');

// child_process.spawn(rgPath, ...)
```

### Updating ripgrep

1. Edit the `VERSION` (or `MULTI_ARCH_VERSION`) constant in `lib/platforms.js`.
2. Run `npm run update-lock`. This re-downloads every platform's archive and rewrites `binaries.lock.json` with the fresh SHA256 hashes.
3. Commit the updated `lib/platforms.js` and `binaries.lock.json`.

### Building locally

- `npm run prepare-binaries` — downloads any missing binaries and verifies them against `binaries.lock.json`. Fails on hash mismatch.
- `npm run prepare-binaries -- --force` — forces a clean re-download (still verifies).
- `npm run update-lock` — refreshes `binaries.lock.json` after a version bump.

Set `GITHUB_TOKEN` to avoid GitHub's anonymous API rate limit during downloads.

