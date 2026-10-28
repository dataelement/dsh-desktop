"""Feishu card gate. Submitting Chinese edits authorizes translation and publication."""
import hashlib
import json
import os
import queue
import secrets
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path
from feishu_release_card import render
from update_popup_notes import chinese_draft_error, translate_chinese, validate


class Feishu:
    def __init__(self):
        self.token = None
        self.expires = 0

    def request(self, path, data=None, method=None):
        if path.startswith('/im/') and time.monotonic() >= self.expires:
            auth = self.request('/auth/v3/tenant_access_token/internal', {
                'app_id': os.environ['FEISHU_APP_ID'], 'app_secret': os.environ['FEISHU_APP_SECRET']})
            self.token = auth['tenant_access_token']
            self.expires = time.monotonic() + min(auth['expire'] - 60, 3600)
        headers = {'Content-Type': 'application/json'}
        if path.startswith('/im/'):
            headers['Authorization'] = f'Bearer {self.token}'
        req = urllib.request.Request('https://open.feishu.cn/open-apis' + path,
            data=None if data is None else json.dumps(data).encode(), headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=20) as response:
            result = json.load(response)
        if result.get('code') != 0:
            raise RuntimeError(f'Feishu API failed: code={result.get("code")}')
        return result

    def send_card(self, chat, card):
        result = self.request('/im/v1/messages?receive_id_type=chat_id', {
            'receive_id': chat, 'msg_type': 'interactive', 'content': json.dumps(card),
            'uuid': secrets.token_hex(16)})
        return result['data']['message_id']

    def update_card(self, message, card):
        self.request(f'/im/v1/messages/{message}', {'content': json.dumps(card)}, method='PATCH')


class CardEvents:
    """Own one SDK process for this run; never write credentials to disk or stdout."""
    def __enter__(self):
        self.messages = queue.Queue(maxsize=1000)
        self.failed = threading.Event()
        self.process = subprocess.Popen([sys.executable, str(Path(__file__).with_name('feishu_card_events.py'))],
                                        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)

        def read():
            try:
                for line in self.process.stdout:
                    if len(line) > 32000:
                        break
                    event = json.loads(line)
                    if event.get('type') == 'fatal':
                        self.failed.set()
                    self.messages.put(event, timeout=1)
            except (ValueError, queue.Full):
                # Parent observes EOF/fatal and never releases on an incomplete stream.
                pass
            finally:
                self.failed.set()
                try:
                    self.messages.put({'type': 'fatal', 'stage': 'event-stream-ended'}, timeout=1)
                except queue.Full:
                    self.process.terminate()

        threading.Thread(target=read, daemon=True).start()
        try:
            first = self.next(30)
            if not first or first.get('type') != 'ready':
                raise RuntimeError('Feishu callback connection not ready; release blocked')
        except Exception:
            self.__exit__(None, None, None)
            raise
        return self

    def check_health(self):
        # A fatal behind queued actions must still block a synchronous translation.
        if self.failed.is_set():
            raise RuntimeError('Feishu event connection failed; release blocked')
        if self.process.poll() is not None:
            raise RuntimeError('Feishu event listener exited; release blocked')

    def next(self, timeout):
        self.check_health()
        try:
            event = self.messages.get(timeout=max(0, timeout))
        except queue.Empty:
            if self.process.poll() is not None:
                raise RuntimeError('Feishu event listener exited; release blocked')
            return None
        if event.get('type') == 'fatal':
            raise RuntimeError('Feishu event connection failed; release blocked')
        return event

    def __exit__(self, *_):
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            # This SDK process owns only an outbound socket, no durable subscriptions.
            self.process.kill()
            self.process.wait()
        self.process.stdout.close()


class Review:
    def __init__(self, api, metadata, notes, chat, reviewer=None, translate=translate_chinese, clock=time.monotonic):
        self.api, self.metadata, self.notes = api, metadata, validate(notes)
        self.chat, self.reviewer, self.translate, self.clock = chat, reviewer, translate, clock
        self.state, self.revision, self.owner = 'preview', secrets.token_hex(12), None
        self.draft, self.error, self.seen = '', '', set()
        self.root = None
        self.deadline = clock() + 3600

    def card(self):
        return render(self.metadata['RELEASE_TAG'], self.notes, self.state, self.revision, self.draft, self.error)

    def start(self):
        self.root = self.api.send_card(self.chat, self.card())
        print(f'Feishu release review sent: message_id={self.root}', flush=True)

    def change(self, state, error=''):
        self.state, self.error, self.revision = state, error, secrets.token_hex(12)
        self.api.update_card(self.root, self.card())

    def expire(self):
        self.change('expired', '等待确认超时，请重新运行发布流程。')
        raise RuntimeError('Release approval timed out')

    def handle(self, event, check_health=lambda: None):
        if self.clock() >= self.deadline:
            self.expire()
        if not isinstance(event, dict) or event.get('type') != 'action':
            return None
        if (event.get('host') != 'im_message' or event.get('message_id') != self.root
                or event.get('chat_id') != self.chat or not isinstance(event.get('operator'), str)
                or not event['operator'] or (self.reviewer and event['operator'] != self.reviewer)):
            return None
        eid = event.get('event_id')
        if not isinstance(eid, str) or not eid or eid in self.seen:
            return None
        if len(self.seen) >= 5000:
            raise RuntimeError('Too many review events; release blocked')
        self.seen.add(eid)
        action = event.get('action')
        if not isinstance(action, dict) or action.get('tag') != 'button':
            return None
        if self.state == 'editing':
            if event['operator'] != self.owner:
                return None
            name = action.get('name')
            if name == f'cancel_{self.revision}':
                self.owner, self.draft = None, ''
                self.change('preview')
                return None
            if name != f'submit_{self.revision}':
                return None
            fields = action.get('form_value')
            draft = fields.get('rewrite_zh') if isinstance(fields, dict) else None
            error = chinese_draft_error(draft)
            if isinstance(draft, str) and len(draft) <= 1000:
                self.draft = draft.strip()
            if error:
                self.change('editing', error)
                return None
            if self.draft == self.notes['zh'].strip():
                self.change('editing', '内容未修改，可取消编辑后直接确认并发布。')
                return None
            self.change('processing', '已提交，处理中；校验通过后自动继续发布。')
            try:
                translated = validate(self.translate(self.draft))
                if translated['zh'] != self.draft:
                    raise ValueError('Translation changed authoritative Chinese')
            except (ValueError, subprocess.SubprocessError, OSError):
                print('Popup translation failed validation or execution; release remains blocked.', flush=True)
                if self.clock() >= self.deadline:
                    self.expire()
                self.change('editing', '处理失败，中文内容已保留。请重试提交并发布，或取消修改。')
                return None
            self.notes = translated
        elif self.state == 'preview':
            value = action.get('value')
            if not isinstance(value, dict) or value.get('revision') != self.revision:
                return None
            if value.get('action') == 'rewrite':
                self.owner, self.draft = event['operator'], self.notes['zh']
                self.change('editing')
                return None
            if value.get('action') != 'approve':
                return None
            self.change('processing', '已确认，正在准备继续发布。')
        else:
            return None
        if self.clock() >= self.deadline:
            self.expire()
        check_health()
        self.change('approved', '已批准文案，CI 将继续发布。后续构建发布结果以流水线为准。')
        return {**self.metadata, 'notes': self.notes, 'reviewer': event['operator'], 'event_id': eid,
                'message_id': self.root, 'root_id': self.root, 'revision': self.revision,
                'sha256': hashlib.sha256(json.dumps(self.notes, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}


def run():
    for key in ['FEISHU_APP_ID', 'FEISHU_APP_SECRET', 'FEISHU_RELEASE_CHAT_ID', 'COPILOT_GITHUB_TOKEN',
                'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'RELEASE_TAG']:
        if not os.environ.get(key):
            raise RuntimeError(f'Missing {key}; release is blocked')
    folder = Path('.github/release-artifacts')
    output = folder / 'approved-popup.json'
    output.unlink(missing_ok=True)
    notes = json.loads((folder / 'popup-notes.json').read_text(encoding='utf-8'))
    metadata = {key: os.environ[key] for key in ['RELEASE_TAG', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']}
    review = Review(Feishu(), metadata, notes, os.environ['FEISHU_RELEASE_CHAT_ID'], os.environ.get('FEISHU_RELEASE_REVIEWER_ID'))
    try:
        with CardEvents() as events:
            review.start()
            while True:
                event = events.next(min(15, max(0, review.deadline - time.monotonic())))
                if time.monotonic() >= review.deadline:
                    review.expire()
                approval = review.handle(event, events.check_health)
                if approval:
                    events.check_health()
                    temporary = output.with_suffix('.tmp')
                    temporary.write_text(json.dumps(approval, ensure_ascii=False), encoding='utf-8')
                    temporary.replace(output)
                    return
    except Exception:
        if review.root and review.state not in ['expired', 'approved']:
            try:
                review.change('failed', '流程中断，未放行。请检查 CI 日志后重新运行。')
            except Exception:
                print('Could not update the failed review card; release is still blocked.', flush=True)
        raise


if __name__ == '__main__':
    run()
