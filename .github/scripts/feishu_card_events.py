"""Pinned SDK adapter: authenticated WebSocket callbacks -> bounded parent-process queue.

No model, publication or HTTP mutations run in the callback (Feishu requires a fast ACK).
SDK diagnostics are suppressed because its connection log includes access-bearing URLs.
"""
import json
import logging
import os
import sys
from update_popup_notes import chinese_draft_error


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def main():
    import lark_oapi as lark
    from lark_oapi.event.callback.model.p2_card_action_trigger import P2CardActionTriggerResponse

    def callback(data):
        event = data.event
        toast = {'type': 'info', 'content': '已收到，正在校验并处理，请以卡片状态为准。'}
        if isinstance(event.action.name, str) and event.action.name.startswith('submit_'):
            fields = event.action.form_value
            error = chinese_draft_error(fields.get('rewrite_zh') if isinstance(fields, dict) else None)
            if error:
                toast = {'type': 'error', 'content': error}
        emit({'type': 'action', 'event_id': data.header.event_id,
              'operator': event.operator.open_id, 'host': event.host,
              'message_id': event.context.open_message_id, 'chat_id': event.context.open_chat_id,
              'action': {'tag': event.action.tag, 'name': event.action.name,
                         'value': event.action.value, 'form_value': event.action.form_value}})
        return P2CardActionTriggerResponse({'toast': toast})

    handler = lark.EventDispatcherHandler.builder('', '').register_p2_card_action_trigger(callback).build()

    # The pinned SDK exposes no ready/disconnected hooks. Keep the two lifecycle
    # overrides here; offline SDK tests verify their contracts on upgrades.
    class Client(lark.ws.Client):
        async def _connect(self):
            await super()._connect()
            emit({'type': 'ready'})

        async def _disconnect(self):
            emit({'type': 'fatal', 'stage': 'websocket-disconnected'})
            await super()._disconnect()

    logging.disable(logging.CRITICAL)
    try:
        Client(os.environ['FEISHU_APP_ID'], os.environ['FEISHU_APP_SECRET'],
               event_handler=handler, auto_reconnect=False).start()
    except Exception:
        # No original exception: SDK errors may embed authenticated endpoint URLs.
        emit({'type': 'fatal', 'stage': 'websocket-start'})
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
