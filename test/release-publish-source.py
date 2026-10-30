"""Offline provenance checks; never downloads artifacts or publishes."""
import copy
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.github/scripts'))
from validate_publish_source import ARTIFACTS, JOBS, validate_source


class SourceTests(unittest.TestCase):
    def setUp(self):
        self.repo, self.tag, self.sha = 'example/desktop', 'v1.2.3', 'a' * 40
        base = f'repos/{self.repo}'
        self.ref = {'type': 'commit', 'sha': self.sha}
        self.run = {'id': 42, 'repository': {'id': 7, 'full_name': self.repo},
                    'head_repository': {'full_name': self.repo}, 'path': '.github/workflows/release.yml',
                    'event': 'push', 'head_branch': self.tag, 'head_sha': self.sha,
                    'status': 'completed', 'conclusion': 'failure', 'run_attempt': 2}
        self.jobs = [{'name': name, 'conclusion': 'success'} for name in JOBS]
        self.artifacts = [{'id': index + 1, 'name': name, 'expired': False, 'size_in_bytes': 10,
                           'workflow_run': {'id': 42, 'head_sha': self.sha, 'head_branch': self.tag,
                                            'repository_id': 7, 'head_repository_id': 7}}
                          for index, name in enumerate(ARTIFACTS)]
        self.paths = {f'{base}/git/ref/tags/{self.tag}': lambda: {'object': self.ref},
                      f'{base}/actions/runs/42': lambda: self.run,
                      f'{base}/actions/runs/42/attempts/2/jobs?per_page=100&page=1': lambda: {'jobs': self.jobs},
                      f'{base}/actions/runs/42/artifacts?per_page=100&page=1': lambda: {'artifacts': self.artifacts}}

    def api(self, path):
        return copy.deepcopy(self.paths[path]())

    def validate(self):
        return validate_source(self.repo, self.tag, '42', self.api)

    def test_failed_publish_with_successful_builds_is_accepted(self):
        self.assertEqual(self.validate(), {'sha': self.sha, 'artifact_ids': '1,2,3',
                                          'source_run_id': '42', 'release_tag': self.tag})

    def test_annotated_tag_is_peeled(self):
        self.ref = {'type': 'tag', 'sha': 'tag-object'}
        self.paths[f'repos/{self.repo}/git/tags/tag-object'] = lambda: {'object': {'type': 'commit', 'sha': self.sha}}
        self.assertEqual(self.validate()['sha'], self.sha)

    def test_moved_tag_or_untrusted_run_is_blocked(self):
        for key, value in [('head_sha', 'b' * 40), ('head_branch', 'main'), ('event', 'workflow_dispatch'),
                           ('path', '.github/workflows/other.yml'), ('status', 'in_progress'),
                           ('head_repository', {'full_name': 'fork/desktop'}),
                           ('repository', {'full_name': 'fork/desktop', 'id': 8})]:
            with self.subTest(key=key):
                old = self.run[key]
                self.run[key] = value
                with self.assertRaises(ValueError): self.validate()
                self.run[key] = old

    def test_every_build_and_sign_job_must_succeed(self):
        for job in self.jobs:
            for conclusion in ['failure', 'skipped', 'cancelled', None]:
                with self.subTest(name=job['name'], conclusion=conclusion):
                    job['conclusion'] = conclusion
                    with self.assertRaises(ValueError): self.validate()
            job['conclusion'] = 'success'

    def test_missing_duplicate_expired_empty_or_mismatched_artifacts_are_blocked(self):
        original = copy.deepcopy(self.artifacts)
        mutations = [lambda: self.artifacts.pop(), lambda: self.artifacts.append(copy.deepcopy(self.artifacts[0])),
                     lambda: self.artifacts[0].update(expired=True), lambda: self.artifacts[0].update(size_in_bytes=0)]
        for key, value in [('id', 43), ('head_sha', 'wrong'), ('head_branch', 'main'),
                           ('repository_id', 8), ('head_repository_id', 8)]:
            mutations.append(lambda key=key, value=value: self.artifacts[0]['workflow_run'].update({key: value}))
        for mutate in mutations:
            self.artifacts = copy.deepcopy(original)
            mutate()
            with self.assertRaises(ValueError): self.validate()

    def test_inputs_fail_before_api_access(self):
        for tag, run in [('v1x2x3', '42'), ('1.2.3', '42'), ('v1.2.3-rc.1', '42'),
                         ('v1.2.3', '0'), ('v1.2.3', '../42')]:
            with self.subTest(tag=tag, run=run):
                with self.assertRaises(ValueError): validate_source(self.repo, tag, run, lambda _: self.fail('API called'))

    def test_pagination_and_api_failure_fail_closed(self):
        base = f'repos/{self.repo}/actions/runs/42/artifacts?per_page=100&page='
        first = copy.deepcopy(self.artifacts)
        self.artifacts = [{'name': f'irrelevant-{i}'} for i in range(100)]
        self.paths[base + '2'] = lambda: {'artifacts': first}
        self.assertEqual(self.validate()['artifact_ids'], '1,2,3')
        with self.assertRaises(RuntimeError):
            validate_source(self.repo, self.tag, '42', lambda _: (_ for _ in ()).throw(RuntimeError('API unavailable')))


if __name__ == '__main__':
    unittest.main()
