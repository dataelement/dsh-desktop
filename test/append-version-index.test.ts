import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

describe('ModelScope release history append', () => {
  it('preserves origin history across releases and refuses writes after read or validation failures', () => {
    const output = execFileSync('python3', ['-c', String.raw`
import json, sys, urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch
sys.path.insert(0, '.github/scripts')
import append_version_index as catalog

api = MagicMock()
current = {'owner': 'desktop', 'versions': [{'version': '1.0.0', 'tag': 'V1.0.0', 'archiveUrl': 'https://example.com/archive/1.0.0/', 'description': 'historical metadata'}]}
old_entry = dict(current['versions'][0])
def uploaded(**kwargs):
    global current
    assert kwargs['path_in_repo'] == 'releases/versions.json'
    current = json.loads(Path(kwargs['path_or_fileobj']).read_text())
api.upload_file.side_effect = uploaded
response = MagicMock()
response.__enter__.return_value = response
response.read.side_effect = lambda: json.dumps(current).encode()
with patch.object(catalog.urllib.request, 'urlopen', return_value=response) as read:
    catalog.append_version_index(api, 'example/desktop', 'fixture', '1.1.0')
    assert [v['version'] for v in current['versions']] == ['1.1.0', '1.0.0']
    assert current['versions'][1] == old_entry and current['owner'] == 'desktop'
    catalog.append_version_index(api, 'example/desktop', 'fixture', '1.2.0')
    catalog.append_version_index(api, 'example/desktop', 'fixture', '1.2.0')
    assert [v['version'] for v in current['versions']] == ['1.2.0', '1.1.0', '1.0.0']
    requests = [call.args[0] for call in read.call_args_list]
    assert all(req.full_url.startswith('https://modelscope.cn/models/example/desktop/resolve/master/releases/versions.json?') for req in requests)
    assert len({req.full_url for req in requests}) == 3
    assert requests[0].get_header('Cache-control') == 'no-cache'
for error in [TimeoutError('temporary failure'), urllib.error.HTTPError('https://example.com', 404, 'missing', {}, None)]:
    api.upload_file.reset_mock()
    with patch.object(catalog.urllib.request, 'urlopen', side_effect=error):
        try:
            catalog.append_version_index(api, 'example/desktop', 'fixture', '1.3.0')
        except Exception:
            pass
        else:
            raise AssertionError('read failure swallowed')
    api.upload_file.assert_not_called()
for invalid in [b'not json', b'{}', b'{"versions":[{"version":"bad"}]}']:
    api.upload_file.reset_mock()
    response.read.side_effect = None
    response.read.return_value = invalid
    with patch.object(catalog.urllib.request, 'urlopen', return_value=response):
        try:
            catalog.append_version_index(api, 'example/desktop', 'fixture', '1.3.0')
        except Exception:
            pass
        else:
            raise AssertionError('invalid catalog accepted')
    api.upload_file.assert_not_called()
print('append history behavior passed')
`], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    expect(output).toContain('append history behavior passed')
  })

  it('serializes release and backfill writers and fetches signed changelog history', () => {
    const require = createRequire(import.meta.url)
    const yaml = require('js-yaml') as { load(source: string): {
      jobs: Record<string, { concurrency?: { group: string; 'cancel-in-progress': boolean }; steps: Array<{
        uses?: string; with?: { 'fetch-depth'?: number }; run?: string
      }> }>
    } }
    const release = yaml.load(readFileSync('.github/workflows/release.yml', 'utf8'))
    const backfill = yaml.load(readFileSync('.github/workflows/backfill-archive.yml', 'utf8'))
    for (const job of [release.jobs.publish, backfill.jobs.backfill]) {
      expect(job?.concurrency).toEqual({ group: 'desktop-modelscope-release-history', 'cancel-in-progress': false })
      expect(job?.steps.some(step => step.run?.includes('append_version_index(api, repo_id, token, version)'))).toBe(true)
      expect(job?.steps.some(step => step.run?.includes('dshdesktop.com/updates/versions.json'))).toBe(false)
    }
    const checkout = release.jobs['publish-signed-test']?.steps.find(step => step.uses === 'actions/checkout@v4')
    expect(checkout?.with?.['fetch-depth']).toBe(0)
  })
})
