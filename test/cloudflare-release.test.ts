import { execFile as execFileCallback } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { buildCloudflareReleasePlan } from '../scripts/cloudflare-release-plan.mjs'

const temporaryRoots: string[] = []
const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })))
})

async function fixture(): Promise<{ assets: string; prepared: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'sherlock-cloudflare-release-'))
  temporaryRoots.push(root)
  const assets = path.join(root, 'release-assets')
  const prepared = path.join(root, 'release-cloudflare')
  await mkdir(assets)

  await Promise.all([
    writeFile(path.join(assets, 'sherlock-mac-arm64.zip'), 'arm zip'),
    writeFile(path.join(assets, 'sherlock-mac-arm64.zip.blockmap'), 'arm blockmap'),
    writeFile(path.join(assets, 'sherlock-mac-arm64.dmg'), 'arm dmg'),
    writeFile(path.join(assets, 'sherlock-windows-x64-setup.exe'), 'windows exe'),
    writeFile(path.join(assets, 'sherlock-windows-x64-setup.exe.blockmap'), 'windows blockmap'),
    writeFile(
      path.join(assets, 'latest-mac.yml'),
      stringify({
        version: '0.6.0',
        files: [{ url: 'sherlock-mac-arm64.zip', sha512: 'arm-sha', size: 7 }],
        path: 'sherlock-mac-arm64.zip',
        sha512: 'arm-sha'
      })
    ),
    writeFile(
      path.join(assets, 'latest.yml'),
      stringify({
        version: '0.6.0',
        files: [
          { url: 'sherlock-windows-x64-setup.exe', sha512: 'win-sha', size: 11 }
        ],
        path: 'sherlock-windows-x64-setup.exe',
        sha512: 'win-sha'
      })
    )
  ])
  return { assets, prepared }
}

describe('Cloudflare release plan', () => {
  it('uploads immutable assets before stable downloads and metadata promotion', async () => {
    const { assets, prepared } = await fixture()
    const plan = await buildCloudflareReleasePlan({
      version: '0.6.0',
      tag: 'v0.6.0',
      assetDirectory: assets,
      outputDirectory: prepared
    })

    expect(plan.filter((item) => item.phase === 'immutable').map((item) => item.key)).toContain(
      'releases/v0.6.0/sherlock-mac-arm64.zip'
    )
    expect(plan.filter((item) => item.phase === 'stable').map((item) => item.key)).toContain(
      'download/sherlock-mac-arm64.dmg'
    )

    const metadata = parse(await readFile(path.join(prepared, 'latest-mac.yml'), 'utf8')) as {
      files: Array<{ url: string }>
      path: string
    }
    expect(metadata.files[0]?.url).toBe(
      '../releases/v0.6.0/sherlock-mac-arm64.zip'
    )
    expect(metadata.path).toBe('../releases/v0.6.0/sherlock-mac-arm64.zip')
    expect(plan.map((item) => item.phase)).toEqual([
      'immutable',
      'immutable',
      'immutable',
      'immutable',
      'immutable',
      'stable',
      'metadata',
      'metadata'
    ])
    expect(plan.at(-1)?.key).toBe('latest/latest-mac.yml')
    expect(plan.at(-1)?.cacheControl).toBe('no-cache, max-age=0, must-revalidate')
  })

  it('rejects missing referenced files and empty hashes', async () => {
    const missing = await fixture()
    await rm(path.join(missing.assets, 'sherlock-mac-arm64.zip'))
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        assetDirectory: missing.assets,
        outputDirectory: missing.prepared
      })
    ).rejects.toThrow('missing')

    const hashless = await fixture()
    const metadataPath = path.join(hashless.assets, 'latest-mac.yml')
    const metadata = parse(await readFile(metadataPath, 'utf8'))
    metadata.files[0].sha512 = ''
    await writeFile(metadataPath, stringify(metadata))
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        assetDirectory: hashless.assets,
        outputDirectory: hashless.prepared
      })
    ).rejects.toThrow('sha512')
  })

  it('rejects tag/version mismatches and path traversal', async () => {
    const mismatch = await fixture()
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        tag: 'v0.6.1',
        assetDirectory: mismatch.assets,
        outputDirectory: mismatch.prepared
      })
    ).rejects.toThrow('tag')

    const traversal = await fixture()
    const metadataPath = path.join(traversal.assets, 'latest-mac.yml')
    const metadata = parse(await readFile(metadataPath, 'utf8'))
    metadata.files[0].url = '../private.key'
    await writeFile(metadataPath, stringify(metadata))
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        assetDirectory: traversal.assets,
        outputDirectory: traversal.prepared
      })
    ).rejects.toThrow('safe asset filename')
  })

  it('supports a credential-free dry run through the pinned publisher CLI', async () => {
    const { assets, prepared } = await fixture()
    const { stdout } = await execFile(process.execPath, [
      path.join(projectRoot, 'scripts', 'publish-cloudflare-release.mjs'),
      '--bucket',
      'sherlock-releases',
      '--version',
      '0.6.0',
      '--assets',
      assets,
      '--prepared',
      prepared,
      '--dry-run'
    ])

    const plan = JSON.parse(stdout) as Array<{ phase: string; key: string }>
    expect(plan[0]?.phase).toBe('immutable')
    expect(plan.at(-1)?.key).toBe('latest/latest-mac.yml')
  })
})
