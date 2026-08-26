import { spawnSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const fixtures: string[] = []

async function executable(filePath: string, contents: string): Promise<void> {
  await writeFile(filePath, contents, 'utf8')
  await chmod(filePath, 0o755)
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true })))
})

describe('formal Sherlock build and run', () => {
  it('repairs a missing workspace Node runtime before packaging a local test app', async () => {
    const fixture = await mkdtemp(path.join(tmpdir(), 'sherlock-build-and-run-repair-'))
    fixtures.push(fixture)

    const scriptDirectory = path.join(fixture, 'script')
    const fakeBinDirectory = path.join(fixture, 'fake-bin')
    const packagedApp = path.join(
      fixture,
      'dist-notarized/mac-arm64/Sherlock.app'
    )
    await mkdir(scriptDirectory)
    await mkdir(fakeBinDirectory)
    await writeFile(
      path.join(scriptDirectory, 'build_and_run.sh'),
      await readFile(path.resolve('script/build_and_run.sh'), 'utf8'),
      'utf8'
    )

    await executable(path.join(fakeBinDirectory, 'uname'), '#!/bin/sh\necho arm64\n')
    await executable(path.join(fakeBinDirectory, 'pkill'), '#!/bin/sh\nexit 0\n')
    await executable(
      path.join(fakeBinDirectory, 'npm'),
      `#!/bin/sh
case "$*" in
  "rebuild node")
    mkdir -p "${fixture}/node_modules/node/bin"
    touch "${fixture}/node_modules/node/bin/node"
    chmod +x "${fixture}/node_modules/node/bin/node"
    ;;
  "run package:formal:dir")
    mkdir -p "${packagedApp}/Contents/MacOS"
    touch "${packagedApp}/Contents/MacOS/Sherlock"
    chmod +x "${packagedApp}/Contents/MacOS/Sherlock"
    if [ -x "${fixture}/node_modules/node/bin/node" ]; then
      mkdir -p "${packagedApp}/Contents/Resources/app/node_modules/node/bin"
      cp "${fixture}/node_modules/node/bin/node" \
        "${packagedApp}/Contents/Resources/app/node_modules/node/bin/node"
    fi
    ;;
  *)
    exit 2
    ;;
esac
`
    )
    await executable(path.join(fakeBinDirectory, 'codesign'), '#!/bin/sh\nexit 0\n')
    await executable(
      path.join(fakeBinDirectory, 'open'),
      `#!/bin/sh
printf '%s\n' "$*" > "${fixture}/opened-app.txt"
`
    )

    const result = spawnSync(
      '/bin/bash',
      [path.join(scriptDirectory, 'build_and_run.sh'), '--run'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${fakeBinDirectory}:/usr/bin:/bin`
        }
      }
    )

    expect(result.status, result.stderr).toBe(0)
    expect(await readFile(path.join(fixture, 'opened-app.txt'), 'utf8')).toContain(
      packagedApp
    )
  })

  it('refuses to launch a package whose bundled Node runtime is missing', async () => {
    const fixture = await mkdtemp(path.join(tmpdir(), 'sherlock-build-and-run-'))
    fixtures.push(fixture)

    const scriptDirectory = path.join(fixture, 'script')
    const fakeBinDirectory = path.join(fixture, 'fake-bin')
    await mkdir(scriptDirectory)
    await mkdir(fakeBinDirectory)
    await writeFile(
      path.join(scriptDirectory, 'build_and_run.sh'),
      await readFile(path.resolve('script/build_and_run.sh'), 'utf8'),
      'utf8'
    )

    await executable(path.join(fakeBinDirectory, 'uname'), '#!/bin/sh\necho arm64\n')
    await executable(path.join(fakeBinDirectory, 'pkill'), '#!/bin/sh\nexit 0\n')
    await executable(
      path.join(fakeBinDirectory, 'npm'),
      `#!/bin/sh
if [ "$*" = "rebuild node" ]; then
  mkdir -p "${fixture}/node_modules/node/bin"
  touch "${fixture}/node_modules/node/bin/node"
  chmod +x "${fixture}/node_modules/node/bin/node"
else
  mkdir -p "${fixture}/dist-notarized/mac-arm64/Sherlock.app/Contents/MacOS"
  touch "${fixture}/dist-notarized/mac-arm64/Sherlock.app/Contents/MacOS/Sherlock"
  chmod +x "${fixture}/dist-notarized/mac-arm64/Sherlock.app/Contents/MacOS/Sherlock"
fi
`
    )
    await executable(path.join(fakeBinDirectory, 'codesign'), '#!/bin/sh\nexit 0\n')
    await executable(path.join(fakeBinDirectory, 'open'), '#!/bin/sh\nexit 0\n')

    const result = spawnSync(
      '/bin/bash',
      [path.join(scriptDirectory, 'build_and_run.sh'), '--run'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${fakeBinDirectory}:/usr/bin:/bin`
        }
      }
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Bundled Node.js runtime was not built')
  })
})
