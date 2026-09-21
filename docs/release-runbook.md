# Desktop release runbook

## Manual workflow dispatch

The `Release desktop installers` workflow accepts a `mode` on `workflow_dispatch`. `target` is always honored: `macos` does not start Windows jobs, and `windows` does not start macOS jobs.

- `development` (default): unsigned Dev packages, no signing, no publish.
- `signed`: production-identity signed packages only. Fill `signed_version` with a non-`v` semver such as `0.9.2-test.1`. Artifacts stay on the workflow run; GitHub Release, ModelScope, rollout, and Feishu do not run. These builds use the production app id and update feed, so an installed copy may later see the live `latest` channel.
- `prerelease`: production-identity signed packages. Fill `prerelease_tag` with a non-`v` semver such as `2.1.0-rc.1`. Publish to GitHub `--prerelease` and ModelScope `releases/prerelease/` only when `target` is `all`. A single-platform prerelease signs that platform and skips publish.

Official releases are still created by pushing a `v*` tag, not by filling the dispatch form. Do not put `v0.9.1` in `prerelease_tag` or `signed_version`.

## Local Windows UKey signing runner

Windows packaging and signing run as separate jobs. The GitHub-hosted Windows runner builds an unsigned NSIS installer and uploads a short-lived workflow artifact. A local macOS ARM64 runner downloads it, signs the installer with Jsign and the SafeNet UKey, regenerates the blockmap and `latest.yml`, and uploads the signed release set. The GitHub Release job cannot start unless signing succeeds.

Prepare the local runner once:

1. Register it with the `self-hosted`, `macOS`, and `ARM64` labels.
2. Install SafeNet Authentication Client and confirm `/usr/local/lib/libeTPkcs11.dylib` is readable.
3. Connect the UKey before pushing a release tag.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions** and create a repository secret named `DESKTOP_WINDOWS_SIGNING_PIN` containing the UKey PIN. For stronger release controls, use an environment secret and add the matching `environment` to the `sign-windows` job.
5. Restrict release tag creation and workflow changes to trusted maintainers. A self-hosted runner can access any secret injected into its job.

The workflow pins Jsign 7.5 by SHA-256 and uses the SafeNet `ETOKEN` store, SHA-256 signing, and a DigiCert RFC 3161 timestamp. GitHub injects the PIN only into the signing step. The step copies it to a mode-`600` temporary file, removes it from the shell environment, and deletes the file when the step exits. The workflow never prints the PIN or passes it as a command-line argument.

After a tag release succeeds, verify that the Windows installer shows the expected publisher and a valid RFC 3161 timestamp in its Digital Signatures properties. Never reuse a published tag; fix the issue and release a new version.
