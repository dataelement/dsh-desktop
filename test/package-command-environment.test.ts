import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { electronNodeExecutable } from '../src/main/runtime/electron-node-executable'
import { packageCommandEnvironment } from '../src/main/runtime/profile-plugin-command'

const electron = electronNodeExecutable(createRequire(import.meta.url)('electron') as string)
const pnpmEntryPath = join(process.cwd(), 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
const runnerPath = join(process.cwd(), 'packages', 'dsh-desktop-market-installer', 'pnpm-runner.mjs')
// A launchd-like base PATH: no Node anywhere, as the packaged main process sees it.
const BASE_PATH = '/usr/bin:/bin:/usr/sbin:/sbin'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function temporaryHome(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-package-env-')))
  roots.push(root)
  await mkdir(join(root, 'profiles', 'web'), { recursive: true })
  return root
}

describe.runIf(process.platform !== 'win32')('packageCommandEnvironment', () => {
  it('replaces shims left by an install whose standalone Node was removed', async () => {
    const dshHome = await temporaryHome()
    const shims = join(dshHome, '.desktop-bin')
    await mkdir(shims, { recursive: true })
    // The shape the previous macOS release wrote, naming its bundled Node.
    const removedNode = '/Applications/DSH Desktop.app/Contents/Resources/app.asar.unpacked/node_modules/node/bin/node'
    await writeFile(join(shims, 'node'), `#!/bin/sh\nexec '${removedNode}' "$@"\n`)
    await chmod(join(shims, 'node'), 0o755)

    const environment = await packageCommandEnvironment({
      dshHome, nodeExecutablePath: electron, pnpmEntryPath, pnpmRunnerPath: runnerPath,
      environment: { HOME: process.env.HOME, PATH: BASE_PATH }
    })
    const node = spawnSync('node', ['-p', 'process.versions.electron'], { env: environment, encoding: 'utf8' })

    expect(node.status).toBe(0)
    expect(node.stdout.trim()).toMatch(/^\d+\./u)
    expect(await readFile(join(shims, 'node'), 'utf8')).not.toContain(removedNode)
  }, 60_000)

  it('lets dependency install scripts run `node` when pnpm runs on the Electron runtime', async () => {
    const dshHome = await temporaryHome()
    const dependency = join(dshHome, 'lifecycle-dep')
    const project = join(dshHome, 'project')
    await mkdir(dependency, { recursive: true })
    await mkdir(project, { recursive: true })
    await writeFile(join(dependency, 'package.json'), JSON.stringify({
      name: 'lifecycle-dep',
      version: '1.0.0',
      scripts: { postinstall: 'node -e "require(\'fs\').writeFileSync(\'ran.txt\', process.versions.electron)"' }
    }))
    await writeFile(join(project, 'package.json'), JSON.stringify({
      name: 'project', private: true, dependencies: { 'lifecycle-dep': `file:${dependency}` }
    }))

    const environment = await packageCommandEnvironment({
      dshHome, nodeExecutablePath: electron, pnpmEntryPath, pnpmRunnerPath: runnerPath,
      environment: { HOME: process.env.HOME, PATH: BASE_PATH }
    })
    const install = spawnSync(electron, [pnpmEntryPath, 'install', '--config.dangerously-allow-all-builds=true',
      '--config.side-effects-cache=false', '--offline'], { cwd: project, env: environment, encoding: 'utf8' })

    expect(install.status, install.stdout + install.stderr).toBe(0)
    const marker = await readFile(join(project, 'node_modules', 'lifecycle-dep', 'ran.txt'), 'utf8')
    expect(marker).toMatch(/^\d+\./u)
  }, 120_000)
})
