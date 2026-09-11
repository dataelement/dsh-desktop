#!/usr/bin/env node
/**
 * Registry data gate — P1-8 in IMPROVEMENT-PLAN.md ("目录数据治理").
 *
 * Offline, dependency-free validation of data/registry-snapshot.json, the
 * curated plugin catalog the market serves. It catches the defects that would
 * otherwise reach users as a broken install or an ambiguous entry:
 *
 *   E1  required string fields present and non-empty
 *   E2  description carries both non-empty "en" and "zh" (the market is bilingual)
 *   E3  npm is null or a syntactically valid npm package name
 *   E4  stars is a non-negative integer, or null when the catalog has no count
 *   E5  url is a github repo or tree(subpath) url
 *   E6  owner field matches the owner parsed from url
 *   E7  category is in the declared whitelist (top-level `categories`)
 *   E8  page is an awesome-dsh-plugin.com/p/ url
 *   E9  added is a YYYY-MM-DD date not in the future
 *   E10 install command references the entry's real target (npm name,
 *       github:owner/repo[+ #path:], or a release archive under that same repo)
 *   E11 no duplicate install identity (same repo+subpath, or same npm package)
 *   E12 top-level `count` matches plugins.length
 *
 * Network existence probes (does the npm package / github repo actually exist)
 * are intentionally out of scope: they need network, are slow, and are flaky in
 * CI. They belong in a separate `--probe` maintainer tool, not the merge gate.
 *
 * Exit code: 0 when there are no hard errors, 1 otherwise. Warnings never fail
 * the run — they surface informational signal (display-name collisions across
 * distinct authors/monorepos are permitted by design).
 */

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const SNAPSHOT = fileURLToPath(new URL('../data/registry-snapshot.json', import.meta.url))

// npm package-name syntax (scoped or simple), lowercased per npm rules.
const NPM_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
// repo root, or a /tree/<branch>/<subpath> monorepo subpackage.
const GITHUB_URL_RE = /^https:\/\/github\.com\/([^/]+)\/([^/]+)(\/tree\/[^/]+\/(.+))?$/
const PAGE_RE = /^https:\/\/awesome-dsh-plugin\.com\/p\//
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const INSTALL_RE = /^dsh plugin --profile \S+ add (.+)$/

const now = new Date()

/**
 * The `owner/repo` a GitHub release archive belongs to, or null when the
 * target is not one. Mirrors releaseTarballTarget in src/sources.ts.
 * @param target - the install target from the entry's install command.
 * @returns lowercase `owner/repo`, or null.
 */
function releaseTargetRepo(target) {
  let url
  try { url = new URL(target) } catch { return null }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null
  if (!url.pathname.endsWith('.tgz') && !url.pathname.endsWith('.tar.gz')) return null
  const segments = url.pathname.split('/').filter(segment => segment !== '')
  if (segments.length < 4 || segments[2] !== 'releases') return null
  return `${segments[0]}/${segments[1]}`.toLowerCase()
}

function fail(errors, entry, code, msg) {
  errors.push({ entry: entry && entry.name ? entry.name : '<unknown>', code, msg })
}

function main() {
  const errors = []
  const warnings = []

  let raw
  try {
    raw = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
  } catch (e) {
    console.error(`validate-registry: cannot read ${SNAPSHOT}: ${e.message}`)
    process.exit(1)
  }

  const plugins = raw && raw.plugins
  if (!Array.isArray(plugins)) {
    console.error('validate-registry: snapshot.plugins is not an array')
    process.exit(1)
  }

  const categories = new Set(Object.keys((raw && raw.categories) || {}))
  const requiredStrings = ['name', 'owner', 'url', 'page', 'category', 'install', 'added']

  const identSeen = new Map() // true install identity -> first entry name
  const nameToEntries = new Map() // display name -> [owners]
  let subpathCount = 0

  for (const p of plugins) {
    // E1 — required string fields
    for (const f of requiredStrings) {
      if (typeof p[f] !== 'string' || p[f].length === 0) {
        fail(errors, p, 'E1', `missing or empty string field "${f}"`)
      }
    }

    // E2 — bilingual description
    if (
      typeof p.description !== 'object' || p.description === null ||
      typeof p.description.en !== 'string' || p.description.en.length === 0 ||
      typeof p.description.zh !== 'string' || p.description.zh.length === 0
    ) {
      fail(errors, p, 'E2', 'description must be an object with non-empty "en" and "zh" strings')
    }

    // E3 — npm type & syntax
    if (!(p.npm === null || typeof p.npm === 'string')) {
      fail(errors, p, 'E3', 'npm must be null or a string')
    } else if (p.npm && !NPM_NAME_RE.test(p.npm)) {
      fail(errors, p, 'E3', `npm "${p.npm}" is not a valid npm package name`)
    }

    // E4 — stars
    //
    // null is a legitimate value, not a defect: the catalog probes star counts
    // against the GitHub API, whose anonymous quota it can exhaust, and its own
    // publish guard ships as long as two thirds of entries have a count. So up
    // to a third of a perfectly good plugins.json can carry `stars: null`, and
    // the market renders those cards without the star line already
    // (`typeof p.stars === 'number' &&`). Requiring a number here made this
    // check pass only by luck — on the snapshot refresh where 302 entries came
    // back null it failed the build for data that was doing nothing wrong.
    if (p.stars !== null && p.stars !== undefined
      && (typeof p.stars !== 'number' || !Number.isInteger(p.stars) || p.stars < 0)) {
      fail(errors, p, 'E4', `stars must be a non-negative integer or null, got ${JSON.stringify(p.stars)}`)
    }

    // E5 — url shape (repo root or tree subpath)
    const um = typeof p.url === 'string' ? p.url.match(GITHUB_URL_RE) : null
    if (!um) {
      fail(errors, p, 'E5', `url is not a github repo/tree url: ${p.url}`)
    } else if (um[4] !== undefined) {
      subpathCount++
    }

    // E6 — owner matches url owner
    if (um && p.owner !== um[1]) {
      fail(errors, p, 'E6', `owner "${p.owner}" does not match url owner "${um[1]}"`)
    }

    // E7 — category whitelist
    if (!categories.has(p.category)) {
      fail(errors, p, 'E7', `category "${p.category}" is not in the declared whitelist`)
    }

    // E8 — page url
    if (typeof p.page !== 'string' || !PAGE_RE.test(p.page)) {
      fail(errors, p, 'E8', `page is not an awesome-dsh-plugin url: ${p.page}`)
    }

    // E9 — added date, not future
    if (typeof p.added !== 'string' || !DATE_RE.test(p.added)) {
      fail(errors, p, 'E9', `added "${p.added}" is not YYYY-MM-DD`)
    } else {
      const dt = new Date(p.added + 'T00:00:00Z')
      if (Number.isNaN(dt.getTime())) fail(errors, p, 'E9', `added "${p.added}" is not a valid date`)
      else if (dt > now) fail(errors, p, 'E9', `added "${p.added}" is in the future`)
    }

    // E10 — install references the real target
    const im = typeof p.install === 'string' ? p.install.match(INSTALL_RE) : null
    if (!im) {
      fail(errors, p, 'E10', `install must match "dsh plugin --profile <p> add <target>": ${p.install}`)
    } else {
      // The command quotes a URL target, so the quotes are part of the match.
      const target = im[1].replace(/^"(.*)"$/, '$1')
      if (p.npm) {
        if (target !== p.npm) fail(errors, p, 'E10', `install target "${target}" does not match npm "${p.npm}"`)
      } else if (um) {
        const expect = `github:${um[1]}/${um[2]}`
        // An author-published release archive is a legitimate target — it is
        // the prebuilt path that makes a source-only plugin install in
        // seconds. What matters is the same thing the market enforces at
        // install time (releaseTarballTarget in src/sources.ts): the archive
        // must live under the entry's OWN repo, or an entry could name a
        // trusted repository and serve bytes from somewhere else. Kept in
        // step with that function deliberately, including the case-insensitive
        // owner/repo compare and the refusal of the release CDN hosts, whose
        // paths carry no owner to bind to.
        const release = releaseTargetRepo(target)
        if (release !== null) {
          if (release !== `${um[1]}/${um[2]}`.toLowerCase()) {
            fail(errors, p, 'E10', `release archive "${target}" belongs to ${release}, not ${um[1]}/${um[2]}`)
          }
        } else if (!target.startsWith(expect)) {
          fail(errors, p, 'E10', `install target "${target}" does not reference ${expect}`)
        }
      }
    }

    // E12 — screenshots (optional): 1-8 https URLs on GitHub image hosting.
    // Mirrors the upstream build gate — a snapshot must never carry an image
    // URL that would let a compromised registry plant a tracking pixel in
    // every market user's browser (#61).
    if (p.screenshots !== undefined) {
      const SHOT_HOSTS = new Set(['raw.githubusercontent.com', 'user-images.githubusercontent.com', 'camo.githubusercontent.com', 'github.com'])
      if (!Array.isArray(p.screenshots) || p.screenshots.length === 0 || p.screenshots.length > 8) {
        fail(errors, p, 'E12', 'screenshots must be an array of 1-8 URLs when present')
      } else {
        for (const shot of p.screenshots) {
          let parsed = null
          try { parsed = new URL(String(shot)) } catch { /* fails below */ }
          if (parsed === null || parsed.protocol !== 'https:' || !SHOT_HOSTS.has(parsed.hostname)) {
            fail(errors, p, 'E12', `screenshot must be an https URL on GitHub hosting: ${String(shot)}`)
          }
        }
      }
    }

    // E11 — true install-identity uniqueness
    let identity
    if (p.npm) {
      identity = `npm:${p.npm}`
    } else if (um) {
      // The subpath comes from `url`, which every entry has, rather than from
      // the install command, which only carries `#path:` for the github:
      // shortcut form. An entry that installs from a release archive has no
      // such fragment, so reading the command collapsed every plugin in one
      // monorepo onto a single identity and reported unrelated plugins as
      // duplicates of each other.
      const sp = um[4] ?? (im && (im[1].match(/#path:\/(.+)$/) || [])[1]) ?? ''
      identity = `gh:${um[1]}/${um[2]}#${sp}`
    } else {
      identity = `??:${p.url}`
    }
    if (identSeen.has(identity)) {
      fail(errors, p, 'E11', `duplicate install identity with "${identSeen.get(identity)}" (same repo+subpath or npm package)`)
    } else {
      identSeen.set(identity, p.name)
    }

    // W1 — display-name collision (allowed across distinct authors / monorepos)
    const seen = nameToEntries.get(p.name)
    if (seen) seen.push(p.owner)
    else nameToEntries.set(p.name, [p.owner])
  }

  // E12 — count integrity
  if (typeof raw.count === 'number' && raw.count !== plugins.length) {
    fail(errors, null, 'E12', `top-level count ${raw.count} != plugins.length ${plugins.length}`)
  }

  // Assemble warnings
  let nameCollisionGroups = 0
  for (const [name, owners] of nameToEntries) {
    if (owners.length > 1) {
      nameCollisionGroups++
      warnings.push(`display name "${name}" used by ${owners.length} entries (owners: ${owners.join(', ')}); allowed, but worth a glance`)
    }
  }
  const gitOnly = plugins.filter((p) => p.npm === null).length
  const npmPublished = plugins.length - gitOnly
  const stars0 = plugins.filter((p) => p.stars === 0).length

  // Report
  const rel = SNAPSHOT.replace(/\\/g, '/').replace(/.*dsh-market\//, 'dsh-market/')
  console.log(`validate-registry: ${rel}`)
  console.log(
    `  plugins: ${plugins.length} | categories: ${categories.size} | ` +
    `npm-published: ${npmPublished} | git-only: ${gitOnly} | monorepo-subpath: ${subpathCount}`
  )

  if (errors.length > 0) {
    console.error(`\n  ${errors.length} error(s):`)
    for (const e of errors) {
      console.error(`   [${e.code}] ${e.entry}: ${e.msg}`)
    }
    console.log(`\n  warnings: ${warnings.length} (display-name collisions: ${nameCollisionGroups}, stars=0: ${stars0})`)
    process.exit(1)
  }

  console.log(`  warnings: ${warnings.length} (display-name collisions: ${nameCollisionGroups}, stars=0: ${stars0})`)
  if (warnings.length > 0) {
    for (const w of warnings) console.log(`   - ${w}`)
  }
  console.log('\n  registry ok ✓')
}

main()
