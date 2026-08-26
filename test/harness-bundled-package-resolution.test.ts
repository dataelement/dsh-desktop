import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('bundled Harness package resolution', () => {
  it('maps the session-model search package to Sherlock app resources', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'sherlock-bundled-search-'))
    try {
      const providerEntry = join(fixture, 'bundled-provider.mjs')
      const profileDirectory = join(fixture, 'profile')
      const dshEntry = join(profileDirectory, 'runner.mjs')
      await mkdir(profileDirectory)
      await writeFile(providerEntry, "export const source = 'bundled-sherlock'\n", 'utf8')
      await writeFile(
        dshEntry,
        "import { source } from 'dsh-web-search-session-model'\nprocess.stdout.write(`provider=${source}\\n`)\n",
        'utf8'
      )

      const result = spawnSync(
        resolve('node_modules/node/bin/node'),
        [
          '--expose-internals',
          resolve('build/harness-node-entry.mjs'),
          dshEntry
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            DSH_DESKTOP_WEB_SEARCH_ENTRY: pathToFileURL(providerEntry).href
          }
        }
      )

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('provider=bundled-sherlock')
    } finally {
      await rm(fixture, { recursive: true, force: true })
    }
  })

  it('maps the market installer package to Sherlock app resources', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'sherlock-bundled-market-installer-'))
    try {
      const installerEntry = join(fixture, 'bundled-installer.mjs')
      const profileDirectory = join(fixture, 'profile')
      const dshEntry = join(profileDirectory, 'runner.mjs')
      await mkdir(profileDirectory)
      await writeFile(installerEntry, "export const source = 'bundled-installer'\n", 'utf8')
      await writeFile(
        dshEntry,
        "import { source } from 'dsh-desktop-market-installer'\nprocess.stdout.write(`installer=${source}\\n`)\n",
        'utf8'
      )

      const result = spawnSync(
        resolve('node_modules/node/bin/node'),
        ['--expose-internals', resolve('build/harness-node-entry.mjs'), dshEntry],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            DSH_DESKTOP_MARKET_INSTALLER_ENTRY: pathToFileURL(installerEntry).href
          }
        }
      )

      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('installer=bundled-installer')
    } finally {
      await rm(fixture, { recursive: true, force: true })
    }
  })
})
