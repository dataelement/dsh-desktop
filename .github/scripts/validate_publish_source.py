"""Fail closed before reusing signed artifacts from an official tag run."""
import json
import os
import re
import subprocess


ARTIFACTS = ('macos-apple-silicon', 'macos-intel', 'windows-x64')
JOBS = ('macOS Apple Silicon', 'macOS Intel', 'Windows x64', 'Sign Windows package locally with UKey')


def github_api(path):
    result = subprocess.run(['gh', 'api', path], check=True, capture_output=True, text=True, timeout=60)
    return json.loads(result.stdout)


def validate_source(repository, tag, run_id, api=github_api):
    if not re.fullmatch(r'v[0-9]+[.][0-9]+[.][0-9]+', tag):
        raise ValueError('release_tag must be an existing official vX.Y.Z tag')
    if not re.fullmatch(r'[1-9][0-9]*', str(run_id)):
        raise ValueError('source_run_id must be a positive run ID')
    base = f'repos/{repository}'
    ref = api(f'{base}/git/ref/tags/{tag}')['object']
    # Annotated tags must resolve to their commit, not the tag object's SHA.
    for _ in range(10):
        if ref['type'] == 'commit':
            break
        if ref['type'] != 'tag':
            raise ValueError('Release tag does not point to a commit')
        ref = api(f'{base}/git/tags/{ref["sha"]}')['object']
    else:
        raise ValueError('Release tag nesting exceeds limit')
    sha = ref['sha']
    run = api(f'{base}/actions/runs/{run_id}')
    if (run['id'] != int(run_id) or run['repository']['full_name'] != repository
            or run['head_repository']['full_name'] != repository
            or run['path'] != '.github/workflows/release.yml'
            or run['event'] != 'push' or run['head_branch'] != tag
            or run['head_sha'] != sha or run['status'] != 'completed'):
        raise ValueError('Source must be a completed official tag release run at the unchanged tag SHA')

    def pages(path, key):
        result = []
        for page in range(1, 101):
            items = api(f'{path}?per_page=100&page={page}')[key]
            result.extend(items)
            if len(items) < 100:
                return result
        raise ValueError('GitHub pagination exceeds limit')

    # Use this attempt explicitly; never accept successes from an older attempt.
    jobs = pages(f'{base}/actions/runs/{run_id}/attempts/{run["run_attempt"]}/jobs', 'jobs')
    for name in JOBS:
        matches = [job for job in jobs if job['name'] == name]
        if len(matches) != 1 or matches[0]['conclusion'] != 'success':
            raise ValueError(f'Source build/sign job did not succeed: {name}')
    artifacts = pages(f'{base}/actions/runs/{run_id}/artifacts', 'artifacts')
    ids = []
    for name in ARTIFACTS:
        matches = [artifact for artifact in artifacts if artifact['name'] == name]
        if len(matches) != 1:
            raise ValueError(f'Missing or duplicate signed artifact: {name}')
        artifact = matches[0]
        source = artifact['workflow_run']
        if (artifact['expired'] or artifact['size_in_bytes'] <= 0
                or source['id'] != int(run_id) or source['head_sha'] != sha
                or source['head_branch'] != tag
                or source['repository_id'] != run['repository']['id']
                or source['head_repository_id'] != run['repository']['id']):
            raise ValueError(f'Expired, empty or mismatched signed artifact: {name}')
        ids.append(str(artifact['id']))
    return {'sha': sha, 'artifact_ids': ','.join(ids), 'source_run_id': str(run_id), 'release_tag': tag}


if __name__ == '__main__':
    result = validate_source(os.environ['GITHUB_REPOSITORY'], os.environ['RELEASE_TAG'], os.environ['SOURCE_RUN_ID'])
    print(json.dumps(result, sort_keys=True))
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            for key, value in result.items():
                output.write(f'{key}={value}\n')
