"""Offline check against the pinned SDK. Never opens a socket or sends messages."""
import asyncio
import contextlib
import io
import json
import logging
import os
from pathlib import Path
import sys
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.github/scripts'))
import lark_oapi as lark
import feishu_card_events
from lark_oapi.ws.client import loop

clients = []
stream = io.StringIO()
try:
    with patch.dict(os.environ, {'FEISHU_APP_ID': 'fixture', 'FEISHU_APP_SECRET': 'fixture'}), \
         patch.object(lark.ws.Client, 'start', autospec=True, side_effect=lambda client: clients.append(client)), \
         contextlib.redirect_stdout(stream):
        assert feishu_card_events.main() == 0
    client = clients[0]
    event = {'schema': '2.0', 'header': {'event_id': 'evt', 'event_type': 'card.action.trigger'},
             'event': {'operator': {'open_id': 'actor'}, 'host': 'im_message',
                       'context': {'open_message_id': 'message', 'open_chat_id': 'chat'},
                       'action': {'tag': 'button', 'name': 'submit_nonce', 'form_value': {'rewrite_zh': '- 修改'}}}}
    with contextlib.redirect_stdout(stream):
        response = client._event_handler.do_without_validation(json.dumps(event).encode())
    action = json.loads(stream.getvalue().splitlines()[-1])
    assert action['event_id'] == 'evt'
    assert action['operator'] == 'actor'
    assert action['action']['form_value']['rewrite_zh'] == '- 修改'
    assert response.toast.type == 'info'
    assert not client._auto_reconnect
    async def lifecycle():
        with patch.object(lark.ws.Client, '_connect', new_callable=AsyncMock), \
             patch.object(lark.ws.Client, '_disconnect', new_callable=AsyncMock):
            await client._connect()
            await client._disconnect()
    with contextlib.redirect_stdout(stream):
        loop.run_until_complete(lifecycle())
    states = [json.loads(line)['type'] for line in stream.getvalue().splitlines()]
    assert states[-2:] == ['ready', 'fatal']
finally:
    tasks = asyncio.all_tasks(loop)
    for task in tasks:
        task.cancel()
    if tasks:
        loop.run_until_complete(asyncio.gather(*tasks, return_exceptions=True))
    loop.close()
    logging.disable(logging.NOTSET)
print('Pinned SDK callback and lifecycle contracts passed (offline).')
