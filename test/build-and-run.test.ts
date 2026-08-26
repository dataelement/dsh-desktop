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
mkdir -p "${fixture}/dist-notarized/mac-arm64/Sherlock.app/Contents/MacOS"
touch "${fixture}/dist-notarized/mac-arm64/Sherlock.app/Contents/MacOS/Sherlock"
chmod +x "${fixture}/dist-notarized/mac-arm64/Sherlock.app/Contents/MacOS/Sherlock"
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
