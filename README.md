# DSH Desktop — Unofficial Linux builds

English | [简体中文](README.zh-CN.md)

Community-maintained Linux amd64 `.deb` packages of
[dataelement/dsh-desktop](https://github.com/dataelement/dsh-desktop),
which only ships official Windows and macOS installers.

This repository contains **no application source**. A GitHub Actions
workflow checks upstream every 3 hours, builds each new release tag
(`vX.Y.Z`) from the unmodified upstream source, and publishes it here as
`linux-vX.Y.Z`.

## Install

Download the latest `.deb` from [Releases](../../releases), then:

```bash
sudo apt install ./dsh-desktop-<version>-linux-amd64.deb
```

Verify the download with the `SHA256SUMS` file attached to each release:

```bash
sha256sum -c SHA256SUMS
```

## Notes

- Only packaging metadata is added (version, icons, `.desktop` entry);
  the application code is exactly the upstream tag.
- Prerelease tags (e.g. `v0.10.0-beta`) are published as GitHub prereleases.
- Report application bugs upstream; report packaging issues here.
- This is not an official DataElement release.

## Build manually

Actions → **Build unofficial Linux DEB** → Run workflow, optionally with a
specific upstream tag and "force" to rebuild.
