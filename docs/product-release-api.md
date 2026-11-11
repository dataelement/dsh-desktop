# Product parameters for release tooling

Release helpers preserve their default DSH Desktop contract and accept explicit product branding from a downstream workflow. Product branding changes file selection and display metadata; it never disables native target checks, afterPack validation, signing, notarization, update metadata verification, human review or source-run checks.

## Artifact verification

[verify-release-assets.mjs](../scripts/verify/verify-release-assets.mjs) accepts an optional artifact prefix:

~~~bash
node scripts/verify/verify-release-assets.mjs release-assets 1.2.3 --artifact-prefix sample-desktop
~~~

The exported verifyReleaseAssets(directory, version, { artifactPrefix }) uses the same prefix. Omission retains dsh-desktop. releaseAssetNames(prefix) exposes the exact inventory: DMG, ZIP and ZIP blockmap for Mac arm64/x64, Windows x64 setup EXE and blockmap, plus latest-mac.yml and latest.yml.

Prefixes must be 1–64 lowercase ASCII letters/digits in nonempty hyphen-separated segments. Path separators, dots, whitespace, credentials/URLs and Windows reserved device names are rejected. Unknown CLI options, extra positionals and a missing flag value fail. CLI verification retains production minimum sizes; only the existing library fixture option minimumBytes remains available to unit tests.

The same selected names drive all required-file checks and the three updater metadata entries. Existing format headers, minimum sizes, exact release version, file size and streaming SHA-512 checks remain mandatory. An alternate prefix does not accept default-brand files or a metadata URL naming a different file. Downstream workflows should derive the prefix from their builder artifactName when possible and assert that their upload paths match that configuration.

## Windows signing metadata

[sign-windows-unpacked.mjs](../scripts/release/sign-windows-unpacked.mjs) reads optional JSIGN_NAME and JSIGN_URL and passes them to the existing buildJsignArgs function:

~~~bash
JSIGN_NAME='Sample Desktop' JSIGN_URL='https://example.org/desktop/' \
  node scripts/release/sign-windows-unpacked.mjs release/win-unpacked
~~~

Existing JSIGN_JAR and JSIGN_PIN_FILE credentials remain required for actual signing. Defaults remain DSH Desktop and https://www.dshdesktop.com. Names permit letters/numbers, spaces, dots, underscores and hyphens, start with a letter/number, have no surrounding whitespace and are limited to 80 characters. Product URLs require HTTPS and reject credentials, queries, fragments and whitespace. These parameters modify only Authenticode display metadata; binary discovery, existing vendor-signature retention, ETOKEN, SHA-256, RFC3161 timestamping, retries and signature extraction remain unchanged. The workflow's separate final-installer signing command must use the same product name.

## Signed-test uploads and notifications

[signed_test_build.py](../.github/scripts/signed_test_build.py) accepts matching parameters:

~~~bash
python3 .github/scripts/signed_test_build.py \
  --directory test-assets --target all --version 1.2.3-test.1 --run-id 42 \
  --artifact-prefix sample-desktop --product-name 'Sample Desktop'
~~~

Defaults retain dsh-desktop filenames and DSH Desktop text. Prefix rules match the verifier. Product names are bounded plain text, preventing Markdown links or multiline text from being injected into notification titles. The selected prefix determines only installer filenames; version/run-derived storage paths, repository validation and Git evidence remain authoritative. Product text appears in the changelog heading and notification heading.

Uploads still require nonempty selected installers, complete reachable Git history, per-file upload success, then a public download probe with the expected Range or Content-Length and a readable first byte before any Feishu notification. The public probe checks availability and size; it is not a remote whole-file digest check. Formal release assets retain their SHA-512 verification through the verifier. Credentials, the notification target and source-run provenance are not configurable through product parameters.

[product-release.test.mjs](../test/product-release.test.mjs) exercises alternate products, unsafe inputs, the real verifier CLI and signer dry-run CLI, file/metadata corruption and Python upload/download/evidence failure ordering. Existing default-product tests continue to enforce exact legacy output.
