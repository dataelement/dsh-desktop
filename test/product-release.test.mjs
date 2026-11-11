import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import { describe, expect, it } from 'vitest'
import { releaseAssetNames, verifyReleaseAssets } from '../scripts/verify/verify-release-assets.mjs'
import { buildJsignArgs } from '../scripts/release/sign-windows-unpacked.mjs'

const minimumBytes = { dmg: 1, zip: 1, exe: 1, blockmap: 1, yml: 1 }
const invalidPrefixes = ['', '../other', 'foo/bar', 'foo\\bar', 'https://user:password@example.org', 'foo:bar', 'foo.bar', 'UPPER', 'foo--bar', '-foo', 'foo-', 'foo\n', 'nul', 'com1', 'x'.repeat(65)]
async function fixture(directory, prefix) {
  const entries = []
  for (const name of releaseAssetNames(prefix).filter(name => !name.endsWith('.yml'))) {
    const content = Buffer.from(name.endsWith('.exe') ? 'MZ-fixture' : name.endsWith('.zip') ? 'PK-fixture' : name.endsWith('.dmg') ? 'koly' : 'blockmap')
    await writeFile(path.join(directory, name), content)
    entries.push({ url: name, size: content.length, sha512: createHash('sha512').update(content).digest('base64') })
  }
  for (const [name, suffix] of [['latest.yml', '.exe'], ['latest-mac.yml', '.zip']]) {
    await writeFile(path.join(directory, name), stringify({ version: '1.2.3', files: entries.filter(entry => entry.url.endsWith(suffix)) }))
  }
}

describe('generic release product API', () => {
  it('retains exact default names and accepts a separate portable product prefix', () => {
    expect(releaseAssetNames()).toEqual([
      'dsh-desktop-mac-arm64.dmg', 'dsh-desktop-mac-arm64.zip', 'dsh-desktop-mac-arm64.zip.blockmap',
      'dsh-desktop-mac-x64.dmg', 'dsh-desktop-mac-x64.zip', 'dsh-desktop-mac-x64.zip.blockmap',
      'dsh-desktop-windows-x64-setup.exe', 'dsh-desktop-windows-x64-setup.exe.blockmap', 'latest-mac.yml', 'latest.yml'
    ])
    expect(releaseAssetNames('example-desktop-2')[0]).toBe('example-desktop-2-mac-arm64.dmg')
    for (const prefix of invalidPrefixes) expect(() => releaseAssetNames(prefix), JSON.stringify(prefix)).toThrow('prefix')
    for (const prefix of [null, 42, {}, ['sample']]) expect(() => releaseAssetNames(prefix)).toThrow('prefix')
  })

  it('validates product metadata and rejects wrong brand, version, missing files and corruption', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'product-release-'))
    try {
      const options = { minimumBytes, artifactPrefix: 'sample-desktop' }
      await fixture(root, options.artifactPrefix)
      await expect(verifyReleaseAssets(root, '1.2.3', options)).resolves.toBeUndefined()
      await expect(verifyReleaseAssets(root, '1.2.3', { minimumBytes })).rejects.toThrow('dsh-desktop-mac-arm64.dmg')
      await expect(verifyReleaseAssets(root, '1.2.4', options)).rejects.toThrow('does not describe release')
      await expect(verifyReleaseAssets(root, '1.2.3', { artifactPrefix: options.artifactPrefix })).rejects.toThrow('unexpectedly small')
      const feed = path.join(root, 'latest-mac.yml')
      for (const mutation of [entry => { entry.url = '../outside.zip' }, entry => { entry.sha512 = 'wrong' }, entry => { entry.size++ }]) {
        await fixture(root, options.artifactPrefix)
        const metadata = parse(await readFile(feed, 'utf8'))
        mutation(metadata.files[0])
        await writeFile(feed, stringify(metadata))
        await expect(verifyReleaseAssets(root, '1.2.3', options)).rejects.toThrow()
      }
      for (const name of releaseAssetNames(options.artifactPrefix).filter(name => !name.endsWith('.yml'))) {
        await fixture(root, options.artifactPrefix)
        await rm(path.join(root, name))
        await expect(verifyReleaseAssets(root, '1.2.3', options)).rejects.toThrow('Missing required release asset')
      }
      for (const [suffix, message] of [['.exe', 'PE executable'], ['.zip', 'ZIP archive'], ['.dmg', 'UDIF disk image']]) {
        await fixture(root, options.artifactPrefix)
        await writeFile(path.join(root, releaseAssetNames(options.artifactPrefix).find(name => name.endsWith(suffix))), 'wrong-header')
        await expect(verifyReleaseAssets(root, '1.2.3', options)).rejects.toThrow(message)
      }
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('parses explicit prefix through the real CLI and refuses malformed or unknown options', () => {
    const script = 'scripts/verify/verify-release-assets.mjs'
    const run = args => spawnSync('node', [script, 'missing-release-directory', '1.2.3', ...args], { encoding: 'utf8' })
    expect(run(['--artifact-prefix', 'sample']).stderr).toContain('sample-mac-arm64.dmg')
    expect(run([]).stderr).toContain('dsh-desktop-mac-arm64.dmg')
    for (const prefix of invalidPrefixes) {
      const result = run(['--artifact-prefix', prefix])
      expect(result.status).not.toBe(0)
      expect(result.stderr).toMatch(/prefix|argument|option/)
    }
    expect(run(['--disable-verification']).status).not.toBe(0)
    expect(run(['--artifact-prefix']).status).not.toBe(0)
    expect(run(['extra-positional']).status).not.toBe(0)
  })

  it('changes only signing display metadata and validates product URLs and names', () => {
    const common = { jsignJar: 'fixture.jar', pinFile: 'pin.txt', targetFile: 'sample.exe' }
    const defaults = buildJsignArgs(common)
    const branded = buildJsignArgs({ ...common, name: 'Sample Desktop', url: 'https://example.org/desktop/' })
    expect(branded.slice(0, 16)).toEqual(defaults.slice(0, 16))
    expect(branded).toEqual(defaults.map(value => value === 'DSH Desktop' ? 'Sample Desktop' : value === 'https://www.dshdesktop.com' ? 'https://example.org/desktop/' : value))
    for (const name of ['', '../Product', 'Product\n', 'Product*', 'x'.repeat(81)]) expect(() => buildJsignArgs({ ...common, name })).toThrow()
    for (const url of ['http://example.org', 'https://user:secret@example.org/', 'https://example.org/?token=secret', 'https://example.org/#secret', 'file:///tmp/a', 'https://example.org/ bad']) expect(() => buildJsignArgs({ ...common, url })).toThrow()
  })

  it('passes JSIGN_NAME and JSIGN_URL through the real unpacked-signing CLI', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'product-sign-'))
    try {
      const bytes = Buffer.alloc(132)
      bytes.write('MZ')
      bytes.writeUInt32LE(128, 0x3c)
      bytes.write('PE\0\0', 128)
      await writeFile(path.join(root, 'Sample.exe'), bytes)
      const run = patch => spawnSync('node', ['scripts/release/sign-windows-unpacked.mjs', root], {
        encoding: 'utf8', env: { ...process.env, DRY_RUN: '1', JSIGN_NAME: 'Sample Desktop', JSIGN_URL: 'https://example.org/desktop/', ...patch }
      })
      const result = run({})
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('--name Sample Desktop --url https://example.org/desktop/')
      expect(run({ JSIGN_URL: 'https://user:secret@example.org/' }).status).not.toBe(0)
      expect(run({ JSIGN_NAME: 'Bad\nName' }).status).not.toBe(0)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('uses branded Python installers without weakening download or notification failure gates', () => {
    const output = execFileSync('python3', ['-c', String.raw`
import sys, os, tempfile, types
from pathlib import Path
from unittest.mock import patch, MagicMock
sys.path.insert(0, '.github/scripts')
import signed_test_build as build
for value in ['', '../x', 'x/y', 'x\\y', 'https://user:secret@host', 'foo\n', 'nul', 'a'*65]:
    try: build.artifact_prefix(value)
    except ValueError: pass
    else: raise AssertionError('bad prefix accepted')
for value in ['', '../Product', 'Sample ', 'Bad\nName', '[link](https://host)', 'a'*81]:
    try: build.product_name(value)
    except ValueError: pass
    else: raise AssertionError('bad product accepted')
with tempfile.TemporaryDirectory() as work:
    root = Path(work)
    for names in build.INSTALLERS.values():
        for _, name in names: (root / name.replace('dsh-desktop', 'sample-desktop')).write_bytes(b'fixture')
    for target, count in [('all', 3), ('macos', 2), ('windows', 1)]:
        assert len(build.installer_paths(root, target, 'sample-desktop')) == count
    events = []
    api = MagicMock()
    api.upload_file.side_effect = lambda **kw: events.append(('upload', kw['path_in_repo']))
    sdk = types.ModuleType('modelscope.hub.api')
    sdk.HubApi = lambda: api
    argv = ['signed_test_build.py', '--directory', work, '--target', 'windows', '--version', '1.2.3-test.1', '--run-id', '42', '--artifact-prefix', 'sample-desktop', '--product-name', 'Sample Desktop']
    environment = dict(MODELSCOPE_REPO_ID='example/desktop', MODELSCOPE_TOKEN='fixture', FEISHU_RELEASE_WEBHOOK='fixture', GITHUB_SERVER_URL='https://github.com', GITHUB_REPOSITORY='example/desktop')
    with patch.dict(sys.modules, {'modelscope': types.ModuleType('modelscope'), 'modelscope.hub': types.ModuleType('modelscope.hub'), 'modelscope.hub.api': sdk}), patch.dict(os.environ, environment), patch.object(sys, 'argv', argv), patch.object(build, 'build_test_changes', return_value='fixture commit evidence') as evidence, patch.object(build, 'summarize_test_changes', return_value='fixture summary'), patch.object(build, 'verify_download', side_effect=lambda *a: events.append(('verify', a))) as verify, patch.object(build, 'send_feishu_notification', side_effect=lambda *a, **kw: events.append(('notify', a))) as notify:
        build.main()
        assert [e[0] for e in events] == ['upload', 'verify', 'upload', 'verify', 'notify']
        assert events[0][1].endswith('/sample-desktop-windows-x64-setup.exe')
        assert 'Sample Desktop 1.2.3-test.1' in notify.call_args.args[2]
        assert 'https://github.com/example/desktop/actions/runs/42' in notify.call_args.args[2]
        assert '# Sample Desktop' in (root / 'test-changes.md').read_text()
        assert verify.call_args_list[0].args[1] == 7
        for stage in ['upload', 'download', 'evidence']:
            notify.reset_mock(); api.reset_mock(); verify.reset_mock()
            api.upload_file.side_effect = RuntimeError('upload') if stage == 'upload' else None
            verify.side_effect = RuntimeError('download') if stage == 'download' else None
            evidence.side_effect = RuntimeError('evidence') if stage == 'evidence' else None
            try: build.main()
            except RuntimeError: pass
            else: raise AssertionError('failed stage accepted')
            notify.assert_not_called()
            if stage == 'evidence': api.upload_file.assert_not_called()
print('product Python gates passed')
`], { encoding: 'utf8' })
    expect(output).toContain('product Python gates passed')
  })
})
