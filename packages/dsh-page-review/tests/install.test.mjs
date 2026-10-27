import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const exec = promisify(execFile)
const script = new URL('../install-local.mjs', import.meta.url).pathname

test('installer requires an explicit profile instead of editing production by default', async () => {
  const env = { ...process.env }
  delete env.DSH_REVIEW_PROFILE
  await assert.rejects(
    exec(process.execPath, [script], { env }),
    /explicit development profile/,
  )
})

test('install/reinstall/remove only changes this bundle and preserves unrelated profile data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-review-install-'))
  try {
    await mkdir(join(root, 'node_modules'))
    const original = {
      dependencies: { unrelated: '1.0.0' },
      dsh: { profile: { bundles: ['unrelated'] } },
    }
    await writeFile(join(root, 'package.json'), JSON.stringify(original))
    await writeFile(join(root, 'keep.txt'), 'user data')
    const env = { ...process.env, DSH_REVIEW_PROFILE: root }
    await exec(process.execPath, [script], { env })
    await exec(process.execPath, [script], { env })
    const installed = JSON.parse(
      await readFile(join(root, 'package.json'), 'utf8'),
    )
    assert.equal(installed.dependencies.unrelated, '1.0.0')
    assert.equal(
      installed.dsh.profile.bundles.filter((x) => x === 'dsh-page-review')
        .length,
      1,
    )
    await exec(process.execPath, [script, '--remove'], { env })
    assert.deepEqual(
      JSON.parse(await readFile(join(root, 'package.json'), 'utf8')),
      original,
    )
    assert.equal(await readFile(join(root, 'keep.txt'), 'utf8'), 'user data')
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})
