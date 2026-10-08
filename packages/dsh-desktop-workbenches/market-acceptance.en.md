# Workbench Market Acceptance Standard

Version: 2026-09-29 · The website is authoritative; DSH Desktop bundles a copy for offline use.

Official page: https://dshdesktop.com/workbench/docs/market-acceptance-en/

Markdown source for agents: https://dshdesktop.com/workbench/docs/market-acceptance-en.md

Before development or submission, see the [six-step quickstart](https://dshdesktop.com/workbench/docs/quickstart-en/) ([Markdown](https://dshdesktop.com/workbench/docs/quickstart-en.md)). [中文版](https://dshdesktop.com/workbench/docs/market-acceptance/).

This document applies only when an author **wants to list a workbench in the Workbench Market**. For a workbench developed and used locally, meeting the [Workbench Development Standard](https://dshdesktop.com/workbench/docs/development-en/) and passing the local self-test is enough. There is no need to read this document, publish code, or upload materials.

Listing follows the DSH plugin market model: the author places code in their own public GitHub repository and submits one listing PR to [awesome-dsh-workbench](https://github.com/dataelement/awesome-dsh-workbench). Descriptions and screenshots are needed only at this stage. The listing YAML and client index fields are defined by that repository's `catalog/README.md` and `schema/`; this document describes author and review requirements without redefining the fields.

Rule levels are **required** (failure prevents listing or installation), **recommended**, and **optional**.

## 1. Listing prerequisites

- A market submission is a separate user intent. Generic development instructions, discovery of an existing workbench, or completion of local development do not authorize publication or submission. Without an explicit listing request, stop at local delivery. If the development goal is unclear, use the requirements confirmation gate in the Development Standard first.
- **Required**: Meet every required item in the Development Standard and pass its local self-test checklist.
- **Required**: Install and actually open the workbench in a real DSH Desktop. Record the tested Desktop version, OS, and architecture. Do not claim compatibility with untested platforms.
- Before submitting, check the actual evidence: final installation source and version, package verification, Desktop installation and opening records, self-test results, and corresponding screenshots. Mark unsupported claims “unverified” and complete verification first. An agent plan, successful build, or expectation that a package should install is not evidence of acceptance and must not be used to submit a public PR as “passed.”

## 2. Listing process

1. **Public repository**: Commit the code to the author's own public GitHub repository.
2. **Installation source**: Publish an npm package, upload a GitHub Release package, or make the repository source directly installable (Section 4).
3. **Listing materials**: Prepare the name, category, Chinese and English descriptions, and screenshots (Section 5).
4. **Listing PR**: Add one `data/workbenches/<owner>__<repo>.yml` to awesome-dsh-workbench. A submitted PR enters review. Track progress on GitHub; the local app does not store submission status.
5. **Review**: Automated checks and first-time human review (Section 6). Address feedback and verify checks against the latest commit.
6. **Listing**: After the PR merges and the catalog updates, the workbench appears in the market and users can install it.

A created PR is “submitted”; after merge, it is “merged, awaiting catalog update”; call it “listed” only once the entry appears in the market.

### Three shortest submission paths

All three paths require package verification and real local installation evidence under the Development Standard. Put screenshots of the final installable version running in Desktop in the author's repository, then submit the Section 5 YAML. Choose one source:

| Path | Shortest steps | Check before submission |
|---|---|---|
| Source only | Public default branch contains directly installable `package.json`, entries, bundle patch, and built output → install that commit locally → submit YAML | Pin installation to that commit; the market does not run a build |
| GitHub Release | `pnpm pack` → upload `.tgz` to a Release → set `tarball` in YAML → install from that download URL locally | URL accessible; package version matches Release; `latest/download` uses a fixed filename |
| npm | Inspect `pnpm pack` output → publish the same version to npm → install that npm version locally → submit YAML | npm `repository` points to the submitted repository; version and package name agree |

After opening the PR, inspect every check and actual log for its latest commit. Call acceptance “passed” only when checks actually ran and passed. **Submitted** means awaiting review; **merged** means awaiting catalog update; **market-visible** means the Desktop market displays an installable entry. Fork PRs and upstream branch PRs have the same check requirements. A skipped check or missing associated PR is “incomplete/failed,” never “passed.”

## 3. Repository and code requirements

As in the DSH plugin market:

- **Required**: The author's own public GitHub repository with a license. A private repository cannot enter the public market, but may be used locally or within a team.
- **Required**: Declare `dsh.bundle`. A package containing only `dsh.client` is not installable and will not be listed.
- **Required**: Real usable code. Placeholder, README-only, and name-squatting repositories are not accepted. Maintain the project; long-broken or archived listings may be reviewed.
- Aggregator packages containing only dependencies and copies of DSH itself are not accepted.
- Dependencies **must** point to the original author's repository or published npm package. Do not reupload someone else's plugin under your own name and depend on it.
- No obfuscated code, credential theft, or unexpected installation behavior.

Additional Workbench Market requirements:

- v1 supports **one workbench at the repository root**; monorepo subdirectories are not supported yet.
- `package.json` is the installation contract: full SemVer version; `repository` pointing back to this repository; `dsh.bundle.patch`; `dsh.client.inject` including `dsh-desktop-workbenches`; and an existing `exports["./client"]`. New packages do not declare `id` in `register()`. The market uses GitHub `owner/repository` as the unique identity.
- All UI boundary, directory selection, session ownership, and mode-switching rules in Sections 4–7 of the Development Standard must pass. Market acceptance does not create separate runtime rules.

## 4. Package and installation source

The market chooses **npm → GitHub Release package → GitHub source**, locks installation to a specific version or commit, and reports validation failure rather than silently falling back to another source.

| Source | Author action |
|---|---|
| npm package (recommended) | Publish a real version. The `package.json` `name` must match the npm package name and `repository` **must** point back to the listed repository, or the market will not use npm |
| GitHub Release package | Upload the `.tgz` or `.tar.gz` generated by `pnpm pack`, and set its URL in YAML `tarball`. For `releases/latest/download/<fixed-filename>`, keep the filename version-free; otherwise pin a tag |
| GitHub source | Default branch contains directly installable entries, built output, and bundle patch |

- Packed size **must** be at most 8 MiB.
- The package **must not** contain `.env`, tokens, keys, customer data, databases, local absolute paths, or materials the author may not publish.
- Shipping a built package is **recommended**. Source installation only downloads source and does not run `build`; scripts such as `prepare` require separate user authorization and make installation harder.
- Avoid native modules needing local tools (node-gyp, Python, Rust, etc.) unless distributed only through prebuilt packages.

## 5. Listing materials

Put materials in the listing YAML; follow awesome-dsh-workbench's `catalog/README.md` for the format:

```yaml
url: https://github.com/owner/repo
name: Project Assistant
category: productivity
description:
  zh: 帮助整理项目资料、跟进任务并生成工作报告。
  en: Organize project materials, track tasks, and generate work reports.
screenshots:
  - https://raw.githubusercontent.com/owner/repo/main/docs/images/overview.webp
```

This is the **minimal YAML** for all three paths. Only the GitHub Release path adds `tarball: https://github.com/owner/repo/releases/latest/download/my-workbench.tgz`. Omit it for source-only and npm paths. An old package migration may retain `workbenchId: wb-owner-repo`; do not add it to new submissions.

| Field | Level | Requirement |
|---|---|---|
| `url` | Required | Repository homepage, matching `<owner>__<repo>.yml` |
| `workbenchId` | Optional, legacy only | Omit for new submissions. During old-ID migration, it must be repository-derived `wb-<owner>-<repo>`; it does not replace repository identity or require `register({ id })` in a new package |
| `name` | Required | One-line market display name |
| `category` | Required | One category from market `data/categories.json` |
| `description.zh`, `description.en` | Required | One line in each language; **must** accurately describe the code without inflated or promotional claims |
| `screenshots` | Required | 1–5 images; first is the cover |
| `tarball` | Optional | Only to specify a Release installation package |

Screenshot rules:

- Host images in the author's own repository using full HTTPS URLs (`raw.githubusercontent.com` or `github.com/.../blob/...`). Relative paths, other repositories, and third-party image hosts are not accepted.
- PNG, JPEG, or WebP, no more than 2 MiB each. Landscape 16:9 and at least 1280px wide are recommended.
- **Required**: Actually open the **final submitted installable version** in Desktop and capture real product UI. Retake screenshots if a package revision changes the UI. Images must match the installable version, be licensed for use, and contain no credentials, personal information, or customer data.

Do not put version, npm package name, checksums, or author ID in the YAML; these are detected automatically. Do not edit generated files in the market repository. Change only your own entry.

In the PR description, state the workbench purpose, local acceptance results, tested Desktop version and platform, installation source, and noteworthy external dependencies, network access, and data locations.

### Differences from the DSH plugin market

| Item | DSH plugin market | Workbench Market |
|---|---|---|
| Listing repository | `awesome-dsh-plugin` | `dataelement/awesome-dsh-workbench` |
| File | `data/plugins/<owner>__<repo>.yml` | `data/workbenches/<owner>__<repo>.yml` |
| Categories | 23 plugin categories | 7 workbench categories |
| Descriptions | `en` required, `zh` optional | Both `zh` and `en` required |
| Screenshots | Author repository `screenshots.json`, 1–8 images | Listing YAML, 1–5 images |
| Monorepo | Subpackages supported | Not supported in v1 |
| Extra checks | — | `package.json` installation contract, client entry, package size |

## 6. Review and acceptance

**Automated checks** (on the PR):

- YAML format, fields, category, filename, duplicate entries, and change scope.
- Accessible, non-archived repository with real code, valid `package.json` installation contract, and license.
- Download the actual package from the selected source; verify package name, version, workbench ID, entries, bundle patch, and size.
- Accessible screenshots with valid format, size, and count.

Checks unfinished due to network or quota are “incomplete,” not “passed.” Use the latest commit's check results before merging. Authors may run `npm run check` in the market repository, then inspect PR workflow logs to confirm the associated PR check actually ran. A successful workflow with skipped checks is not acceptance.

**First-time human review**: Maintainers compare description with code, look for duplication and obvious abnormal behavior, and check the Development Standard's runtime rules. This is not a complete security audit.

**Acceptance checklist** (author before submission; reviewer during review):

- [ ] Package verification for the final source and version, local installation, and evidence of opening the UI. Record each local self-test result and unverified item, plus Desktop version and platform.
- [ ] Public, licensed repository; real usable code; no keys or user data.
- [ ] At least one valid installation source; npm `repository` points here; packed size at most 8 MiB.
- [ ] Verify Development Standard Sections 4–7 individually, including directory selection, session ownership, mode switching, sidebar state, and workbench icon.
- [ ] Complete YAML using `owner/repo` identity; truthful Chinese and English descriptions; screenshots of the final installable version.
- [ ] PR adds only the author's one YAML file and states acceptance results and platform.

## 7. After listing

- **Version updates**: A merged source PR or changed `package.json` version alone is not a market release. For npm, publish a new npm version. For GitHub Release, create a new Release and upload the filename agreed by the listing. With `releases/latest/download/<fixed-filename>`, another listing PR is usually unnecessary, but verify the URL, package version, and integrity; open a PR if the URL or filename changes. Source updates can be rediscovered by the market. The author must test and accept each version.
- **Metadata changes**: Open a PR to change name, category, descriptions, screenshot URLs, or repository URL in YAML.
- **User side**: The user triggers installs and updates in Desktop; they take effect after restarting Harness and never silently upgrade. Uninstall removes the package and entry but keeps sessions, project files, notes, and favorites.
- **Delisting**: The market repository updates the index. An absent entry no longer appears in the market and cannot be newly installed; existing users may continue using it.

## References

- DSH plugin market listing rules: [awesome-dsh-plugin contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md), [dsh-market](https://github.com/dsh-market/dsh-market).
- Workbench Market listing format: `catalog/README.md` and `schema/` in [awesome-dsh-workbench](https://github.com/dataelement/awesome-dsh-workbench).
- Development rules: [Workbench Development Standard](https://dshdesktop.com/workbench/docs/development-en/).
