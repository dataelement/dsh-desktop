"""Offline card/state/translation tests. No credentials, API calls or group messages."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import os
import sys
import threading
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.github/scripts'))
from confirm_popup_release import Review
import confirm_popup_release as gate
from update_popup_notes import translate_chinese, validate


# Exercise Windows' legacy default on every platform; explicit UTF-8 must win.
_path_read_text = Path.read_text
_path_write_text = Path.write_text


def _legacy_read_text(self, encoding=None, **kwargs):
    return _path_read_text(self, encoding=encoding or 'cp1252', **kwargs)


def _legacy_write_text(self, data, encoding=None, **kwargs):
    return _path_write_text(self, data, encoding=encoding or 'cp1252', **kwargs)


def setUpModule():
    for name, replacement in [('read_text', _legacy_read_text), ('write_text', _legacy_write_text)]:
        patcher = patch.object(Path, name, replacement)
        patcher.start()
        unittest.addModuleCleanup(patcher.stop)


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


class Api:
    def __init__(self): self.cards = []
    def send_card(self, chat, card):
        self.cards.append(card)
        return 'root'
    def update_card(self, message, card): self.cards.append(card)


class GateTests(unittest.TestCase):
    def setUp(self):
        self.api, self.now, self.counter = Api(), 0, 0
        self.translations = []
        self.metadata = {'RELEASE_TAG': 'v1.2.3', 'GITHUB_SHA': 'abc', 'GITHUB_RUN_ID': '42', 'GITHUB_RUN_ATTEMPT': '1'}
        def translate(text):
            self.translations.append(text)
            return {'zh': text, 'en': '- Fix Save As'}
        self.review = Review(self.api, self.metadata, {'zh': '- 修复保存', 'en': '- Fix saving'},
                             'chat', translate=translate, clock=lambda: self.now)
        self.review.start()

    def event(self, action, text=None, operator='human'):
        self.counter += 1
        payload = {'tag': 'button'}
        if action in ['submit', 'cancel']:
            payload.update(name=f'{action}_{self.review.revision}', form_value={'rewrite_zh': text})
        else:
            payload['value'] = {'action': action, 'revision': self.review.revision}
        return {'type': 'action', 'event_id': str(self.counter), 'host': 'im_message', 'message_id': 'root',
                'chat_id': 'chat', 'operator': operator, 'action': payload}

    def test_preview_has_no_input_and_explicit_publish(self):
        items = list(nodes(self.review.card()))
        self.assertFalse(any(item.get('tag') == 'input' for item in items))
        labels = [item['text']['content'] for item in items if item.get('tag') == 'button']
        self.assertEqual(labels, ['确认并发布', '重写'])

    def test_rewrite_opens_only_prefilled_chinese(self):
        self.review.handle(self.event('rewrite'))
        inputs = [item for item in nodes(self.review.card()) if item.get('tag') == 'input']
        self.assertEqual(len(inputs), 1)
        self.assertEqual(inputs[0]['name'], 'rewrite_zh')
        self.assertEqual(inputs[0]['default_value'], '- 修复保存')
        self.assertEqual(inputs[0]['width'], 'fill')
        self.assertNotIn('确认并发布', json.dumps(self.review.card(), ensure_ascii=False))

    def test_approve_publishes_without_translation(self):
        approval = self.review.handle(self.event('approve'))
        self.assertEqual(approval['GITHUB_RUN_ATTEMPT'], '1')
        self.assertEqual(approval['reviewer'], 'human')
        self.assertEqual(self.translations, [])
        self.assertEqual(self.review.state, 'approved')
        self.assertEqual(approval['sha256'], hashlib.sha256(json.dumps(approval['notes'], sort_keys=True, separators=(',', ':')).encode()).hexdigest())

    def test_submit_translates_and_releases_without_reconfirmation(self):
        self.review.handle(self.event('rewrite'))
        submitted = self.event('submit', '- 修复另存为')
        approval = self.review.handle(submitted)
        self.assertEqual(approval['notes'], {'zh': '- 修复另存为', 'en': '- Fix Save As'})
        self.assertEqual(self.translations, ['- 修复另存为'])
        self.assertEqual(self.review.state, 'approved')
        self.assertIsNone(self.review.handle(submitted))
        self.assertEqual(len(self.translations), 1)
        self.assertTrue(all(item.get('disabled') for item in nodes(self.review.card()) if item.get('tag') == 'button'))

    def test_cancel_discards_edit_without_publication(self):
        self.review.handle(self.event('rewrite'))
        self.assertIsNone(self.review.handle(self.event('cancel', '- 丢弃这份修改')))
        self.assertEqual(self.review.state, 'preview')
        self.assertEqual(self.review.notes['zh'], '- 修复保存')

    def test_empty_invalid_and_unchanged_do_not_release(self):
        self.review.handle(self.event('rewrite'))
        for text in [' ', '', 'missing bullets', '- 修复保存', '- ' + 'x' * 1001]:
            self.assertIsNone(self.review.handle(self.event('submit', text)))
            self.assertEqual(self.review.state, 'editing')
            self.assertTrue(self.review.error)
        self.assertEqual(self.translations, [])

    def test_invalid_draft_is_preserved_with_visible_actionable_error(self):
        self.review.handle(self.event('rewrite'))
        cases = [('修复保存', '减号和空格'), ('-修复保存', '减号和空格'),
                 ('\n'.join(['- 修改'] * 13), '1–12'),
                 ('- https://example.com', '不能包含链接'), ('', '请填写')]
        for draft, hint in cases:
            self.assertIsNone(self.review.handle(self.event('submit', draft)))
            self.assertEqual(self.review.state, 'editing')
            self.assertEqual(self.review.draft, draft)
            self.assertIn(hint, self.review.error)
            elements = self.review.card()['body']['elements']
            form_index = next(i for i, item in enumerate(elements) if item['tag'] == 'form')
            self.assertTrue(any('尚未发布' in item.get('content', '')
                                for item in elements[:form_index]))
        self.assertEqual(self.translations, [])

    def test_old_card_other_chat_and_missing_actor_do_not_release(self):
        for key, value in [('message_id', 'old-root'), ('chat_id', 'other-chat'), ('operator', ''), ('host', 'other')]:
            event = self.event('approve')
            event[key] = value
            self.assertIsNone(self.review.handle(event))
        stale = self.event('approve')
        self.review.handle(self.event('rewrite'))
        self.assertIsNone(self.review.handle(stale))
        self.assertEqual(self.review.state, 'editing')

    def test_another_user_cannot_submit_or_cancel_active_edit(self):
        self.review.handle(self.event('rewrite'))
        revision, draft = self.review.revision, self.review.draft
        for action in ['submit', 'cancel']:
            self.assertIsNone(self.review.handle(self.event(action, '- 修改', 'other-human')))
        self.assertEqual(self.review.state, 'editing')
        self.assertEqual((self.review.revision, self.review.draft), (revision, draft))
        self.assertEqual(self.translations, [])
        for error in ['', '文案格式错误']:
            self.review.error = error
            text = json.dumps(self.review.card(), ensure_ascii=False)
            self.assertIn('仅最初点击“重写”的人可以提交或取消', text)
            self.assertIn('其他成员点击不会生效', text)
        self.review.handle(self.event('cancel'))
        self.assertEqual(self.review.state, 'preview')
        self.review.handle(self.event('rewrite', operator='other-human'))
        self.assertIsNotNone(self.review.handle(self.event('submit', '- 修改', 'other-human')))

    def test_optional_reviewer(self):
        self.review.reviewer = 'reviewer'
        self.assertIsNone(self.review.handle(self.event('approve')))
        self.assertIsNotNone(self.review.handle(self.event('approve', operator='reviewer')))

    def test_translation_failure_retains_input_and_allows_retry(self):
        self.review.handle(self.event('rewrite'))
        original = self.review.translate
        for failure in [ValueError('invalid translation'), subprocess.TimeoutExpired('copilot', 120)]:
            with patch.object(self.review, 'translate', side_effect=failure):
                self.assertIsNone(self.review.handle(self.event('submit', '- 修复另存为')))
            self.assertEqual(self.review.state, 'editing')
            self.assertEqual(self.review.draft, '- 修复另存为')
        self.review.translate = original
        self.assertIsNotNone(self.review.handle(self.event('submit', '- 修复另存为')))

    def test_changed_chinese_translation_is_rejected(self):
        self.review.handle(self.event('rewrite'))
        self.review.translate = lambda _: {'zh': '- invented', 'en': '- invented'}
        self.assertIsNone(self.review.handle(self.event('submit', '- 修复另存为')))
        self.assertEqual(self.review.state, 'editing')

    def test_timeout_does_not_approve(self):
        self.now = 3601
        with self.assertRaises(RuntimeError): self.review.handle(self.event('approve'))
        self.assertEqual(self.review.state, 'expired')

    def test_fatal_during_translation_prevents_approval(self):
        listener = gate.CardEvents()
        listener.failed = threading.Event()
        listener.process = Mock()
        listener.process.poll.return_value = None
        self.review.handle(self.event('rewrite'))
        def disconnected_translation(text):
            listener.failed.set()
            return {'zh': text, 'en': '- Fix Save As'}
        self.review.translate = disconnected_translation
        with self.assertRaisesRegex(RuntimeError, 'Feishu event connection failed'):
            self.review.handle(self.event('submit', '- 修复另存为'), listener.check_health)
        self.assertNotEqual(self.review.state, 'approved')

    def test_exited_listener_prevents_approval(self):
        listener = gate.CardEvents()
        listener.failed = threading.Event()
        listener.process = Mock()
        listener.process.poll.return_value = 1
        with self.assertRaisesRegex(RuntimeError, 'Feishu event listener exited'):
            self.review.handle(self.event('approve'), listener.check_health)
        self.assertNotEqual(self.review.state, 'approved')

    def test_timeout_during_translation(self):
        self.review.handle(self.event('rewrite'))
        def slow(text):
            self.now = 3601
            return {'zh': text, 'en': '- Fix Save As'}
        self.review.translate = slow
        with self.assertRaises(RuntimeError): self.review.handle(self.event('submit', '- 修复另存为'))
        self.assertEqual(self.review.state, 'expired')

    def test_api_failure_prevents_release(self):
        with patch.object(self.api, 'update_card', side_effect=RuntimeError('network')):
            with self.assertRaises(RuntimeError): self.review.handle(self.event('approve'))
        self.assertNotEqual(self.review.state, 'approved')


class RunnerTests(unittest.TestCase):
    def test_persists_only_after_callback_approval(self):
        api = Api()
        class Events:
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def check_health(self): pass
            def next(self, _):
                action = next(item for item in nodes(api.cards[-1]) if item.get('tag') == 'button')['behaviors'][0]['value']
                return {'type': 'action', 'event_id': 'approved-event', 'host': 'im_message',
                        'operator': 'human', 'chat_id': 'chat', 'message_id': 'root',
                        'action': {'tag': 'button', 'value': action}}
        env = {'FEISHU_APP_ID': 'fixture', 'FEISHU_APP_SECRET': 'fixture', 'FEISHU_RELEASE_CHAT_ID': 'chat',
               'COPILOT_GITHUB_TOKEN': 'fixture', 'GITHUB_SHA': 'abc', 'GITHUB_RUN_ID': '42',
               'GITHUB_RUN_ATTEMPT': '1', 'RELEASE_TAG': 'v1.2.3'}
        old = Path.cwd()
        with tempfile.TemporaryDirectory() as temporary:
            try:
                os.chdir(temporary)
                folder = Path('.github/release-artifacts')
                folder.mkdir(parents=True)
                (folder / 'popup-notes.json').write_text(json.dumps({'zh': '- 修复保存', 'en': '- Fix saving'}, ensure_ascii=False), encoding='utf-8')
                with patch.dict(os.environ, env, clear=True), patch.object(gate, 'Feishu', return_value=api), patch.object(gate, 'CardEvents', Events):
                    gate.run()
                result = json.loads((folder / 'approved-popup.json').read_text(encoding='utf-8'))
                self.assertEqual(result['notes']['zh'], '- 修复保存')
                self.assertEqual(result['event_id'], 'approved-event')
                self.assertEqual(result['GITHUB_SHA'], 'abc')
                self.assertFalse((folder / 'approved-popup.tmp').exists())
                # A rerun loses the old approval before a failed connection can proceed.
                with patch.dict(os.environ, env, clear=True), patch.object(gate, 'CardEvents', side_effect=RuntimeError('connection')):
                    with self.assertRaises(RuntimeError): gate.run()
                self.assertFalse((folder / 'approved-popup.json').exists())
            finally:
                os.chdir(old)


class GenerationTests(unittest.TestCase):
    def test_initial_generation_denies_tools(self):
        workflow = (Path(__file__).resolve().parents[1] / '.github/workflows/release.yml').read_text(encoding='utf-8')
        command = next(line for line in workflow.splitlines()
                       if 'copilot -p' in line and 'popup-notes.json' in line)
        self.assertIn("--available-tools= --disable-builtin-mcps", command)
        self.assertNotIn("--deny-tool", command)


class TranslationTests(unittest.TestCase):
    def test_translation_keeps_chinese_and_is_tool_and_secret_restricted(self):
        output = subprocess.CompletedProcess([], 0, '{"en":"- Fix v1.2.3 saving"}')
        with patch('update_popup_notes.subprocess.run', return_value=output) as run, \
             patch.dict('os.environ', {'FEISHU_APP_SECRET': 'dummy', 'COPILOT_GITHUB_TOKEN': 'model-token'}):
            self.assertEqual(translate_chinese('- 修复 v1.2.3 保存'), {'zh': '- 修复 v1.2.3 保存', 'en': '- Fix v1.2.3 saving'})
        args, kwargs = run.call_args
        self.assertEqual(args[0][-2:], ['--available-tools=', '--disable-builtin-mcps'])
        self.assertNotIn('FEISHU_APP_SECRET', kwargs['env'])
        self.assertEqual(kwargs['timeout'], 120)

    def test_malformed_extra_claims_and_changed_numbers_rejected(self):
        for response in ['not json', '{"en":"- Fix v1.2.4 saving"}', '{"en":"- Fix v1.2.3 saving\\n- Another claim"}',
                         '{"en":"- Fix v1.2.3 saving", "zh":"changed"}']:
            with patch('update_popup_notes.subprocess.run', return_value=subprocess.CompletedProcess([], 0, response)):
                with self.assertRaises(ValueError): translate_chinese('- 修复 v1.2.3 保存')


if __name__ == '__main__':
    unittest.main()
