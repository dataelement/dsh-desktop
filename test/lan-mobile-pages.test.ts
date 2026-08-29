import { describe, expect, it } from 'vitest'
import {
  renderDesktopPairingPage,
  renderMobilePage,
  renderMobileReconnectPage,
  renderPairingWaitPage
} from '../src/main/mobile/lan-mobile-pages'

describe('LAN mobile page', () => {
  it('emits parseable browser JavaScript', () => {
    const html = renderMobilePage({ locale: 'zh' })
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]!)
    expect(scripts).not.toHaveLength(0)
    for (const script of scripts) expect(() => new Function(script)).not.toThrow()
  })

  it('uses the DSH brand color and follows system dark mode', () => {
    const html = renderMobilePage({ locale: 'en' })
    expect(html).toContain('--brand:#4d6bfe')
    expect(html).toContain('prefers-color-scheme:dark')
    expect(html).toContain('content="#ffffff" media="(prefers-color-scheme:light)"')
    expect(html).toContain('content="#141416" media="(prefers-color-scheme:dark)"')
    expect(html).toContain('/brand-logo/light')
    expect(html).not.toContain('id="chatTitle"')
    expect(html).toContain('body.chat-open header{display:none}')
    expect(html).toContain('body.chat-open .shell{padding:env(safe-area-inset-top) 14px 0}')
    expect(html).toContain('.chat-toolbar{position:absolute;inset:0 0 auto;z-index:2;min-height:40px;padding:0;background:transparent')
    expect(html).toContain('background:var(--card)!important;box-shadow:0 2px 8px')
    expect(html).toContain('.chat-open .messages{padding-top:4px;padding-bottom:84px}')
    expect(html).toContain('.composer{position:absolute;z-index:2;inset:auto 0 0;padding:10px 0 5px;background:transparent;pointer-events:none}')
    expect(html).toContain('.composer-inner:focus-within{border-color:color-mix')
    expect(html).toContain('box-shadow:inset 0 0 0 1px color-mix')
    expect(html).not.toContain('class="send-label"')
    expect(html).toContain('id="send" class="primary" aria-label="Send" disabled')
    expect(html).toContain('.composer .primary,.primary.cancel{width:40px;min-width:40px;border-radius:50%')
    expect(html).toContain('id="prompt" rows="1"')
    expect(html).toContain('function syncPromptUi()')
    expect(html).toContain("prompt.style.height='40px'")
    expect(html).toContain('Math.min(150,Math.max(40,prompt.scrollHeight))')
    expect(html).toContain("$('prompt').oninput=syncPromptUi")
    expect(html).toContain('@media(display-mode:standalone)')
    expect(html).not.toContain("</svg>返回</button>")
    expect(html).not.toContain("</svg>Back</button>")
    expect(html).toContain("document.body.classList.add('chat-open')")
    expect(html).toContain("document.body.classList.remove('chat-open')")
    expect(html).toContain("history.replaceState({view:'sessions'},'')")
    expect(html).toContain("history.pushState({view:'chat',sessionId:id")
    expect(html).toContain("window.addEventListener('popstate'")
    expect(html).toContain("if(history.state?.view==='chat')history.back()")
    expect(html).toContain("function showSessionList()")
    expect(html).toContain("function handleHistory(state)")
    expect(html).toContain("function recentSession()")
    expect(html).toContain("await openRecentSession()")
    expect(html).toContain("new EventSource('/api/session/stream?sessionId='")
    expect(html).toContain("source.addEventListener('snapshot'")
    expect(html).toContain("source.addEventListener('event'")
    expect(html).toContain('requestAnimationFrame(()=>flushStreamRender(sessionId))')
    expect(html).toContain('function patchLastStreamMessage(messages)')
    expect(html).toContain("queueStreamRender(sessionId,type!=='assistant/chunk')")
    expect(html).toContain("if(type!=='assistant/chunk')schedulePendingSync(sessionId)")
    expect(html).not.toContain("applyHistory({events:streamEvents,projections:streamProjections},pendingQuestion,false);void rpc('interaction.pending'")
    expect(html.indexOf('openSessionStream(id);await loadHistory(true)')).toBeGreaterThan(-1)
    expect(html).toContain('id="questionComposer" class="question-composer" hidden')
    expect(html).toContain("rpc('interaction.pending',{sessionId})")
    expect(html).toContain("rpc('interaction.answer',{rpcId:current.rpcId")
    expect(html).toContain("rpc('interaction.cancel',{rpcId:current.rpcId")
    expect(html).toContain("block.name==='ask_user_question'")
    expect(html).toContain('Submit answers')
    expect(html).toContain('Recommended')
    expect(html).not.toContain('id="presetControl"')
    expect(html).not.toContain('class="preset-control"')
    expect(html).toContain('id="settings" class="settings-trigger"')
    expect(html).toContain('id="sessionSettings" class="session-settings" hidden')
    expect(html).toContain('#composer .session-settings{z-index:1;bottom:76px}')
    expect(html).toContain("rpc('agentPreset.list',{})")
    expect(html).toContain("rpc('agentPreset.select',{sessionId:activeSession,agentPreset:next})")
    expect(html).toContain("rpc('session.models',{sessionId})")
    expect(html).toContain("rpc('session.selectModel',{sessionId:activeSession,provider,model")
    expect(html).toContain("rpc('session.create',{workspaceId})")
    expect(html).not.toContain("session.create',{workspaceId,...(agentPreset")
    expect(html).toContain("preset=>!preset.broken")
    expect(html).toContain('function presetIsLocked(){return!sessionBlank||optimisticPrompts.length>0}')
    expect(html).toContain('sessionBlank=false;awaitingTurnStartedAt=Date.now()-1000;agentRunning=true')
    expect(html).toContain('Preset is locked after the first message.')
    expect(html).toContain('id="todoDock" class="todo-dock"')
    expect(html).toContain('function updateTodos(projections)')
    expect(html).toContain('projections?.values?.todos')
    expect(html).toContain('Deep diving...</div>')
    expect(html).toContain("box.innerHTML=messages.map(renderMessage).join('')+status")
    expect(html).not.toContain('id="turnStatus"')
    expect(html).toContain('.messages .turn-status{align-self:flex-start;flex:none;margin:3px 4px}')
    expect(html).not.toContain("||'<div class=\"empty\">'+L.noSessions+'</div>'")
    expect(html).toContain('.thinking[data-state=running] .activity-summary:after')
    expect(html).not.toContain('.thinking[data-state=running] summary:after')
    expect(html).toContain('function messagesWithOptimistic(durable)')
    expect(html).toContain('targetCount:nextOptimisticTarget(text)')
    expect(html).toContain("optimisticPrompts=optimisticPrompts.filter(item=>(counts.get(item.text)||0)<item.targetCount)")
    expect(html).toContain('class=\"skeleton\"')
    expect(html).toContain(
      'const delay=streamConnected?HISTORY_POLL_IDLE_CAP_MS:agentRunning||pendingQuestion?HISTORY_POLL_ACTIVE_MS:idlePollMs'
    )
    expect(html).toContain('HISTORY_POLL_ACTIVE_MS=250,HISTORY_POLL_IDLE_MS=750')
    // An idle chat left open must not keep refetching the whole history forever.
    expect(html).toContain('if(!activeSession||document.hidden)return')
    expect(html).toContain(
      'idlePollMs=Math.min(Math.round(idlePollMs*1.5),HISTORY_POLL_IDLE_CAP_MS)'
    )
    expect(html).toContain("t==='user/message'")
    expect(html).toContain("message.source?.kind==='user'")
    expect(html).toContain("t==='assistant/message'")
    expect(html).not.toContain('id=\"stop\"')
    expect(html).toContain('id=\"cancel\"')
    expect(html).toContain("chunk.type==='text-delta'")
    expect(html).toContain("block?.type==='text'")
    expect(html).toContain('font-size:16px')
    expect(html).toContain('maximum-scale=1')
    expect(html).toContain('rel="apple-touch-icon" href="/app-icon"')
    expect(html).toContain('apple-mobile-web-app-capable')
    expect(html).toContain("chunk.type!=='reasoning-delta'")
    expect(html).toContain('class=\"thinking\" data-state=')
    expect(html).toContain("streamKey=kind+':'+String(chunk.index??0)")
    expect(html).not.toContain("(streaming?' open':'')")
    expect(html).toContain('class="thinking" data-state="\'+state+\'"')
    expect(html).toContain(
      'key=JSON.stringify([messages,pendingQuestion?.rpcId||null,agentRunning,currentTodos,todoExpanded])'
    )
    expect(html).toContain('class=\"tool\" data-state=')
    expect(html).toContain('class=\"activity-leading\"')
    expect(html).toContain('class=\"activity-dot\"')
    expect(html).toContain('class=\"activity-summary\"')
    expect(html).toContain('function reasoningSummary(text,streaming)')
    expect(html).toContain('.thinking,.tool{position:relative;margin:0;white-space:normal}')
    expect(html).not.toContain('.thinking,.tool{border:1px solid var(--line)')
    expect(html).toContain('function markdown(text)')
    expect(html).toContain('function tableCells(line)')
    expect(html).toContain('class=\"table-wrap\"')
    expect(html).toContain('flex-direction:column;gap:0')
    expect(html).toContain('visualViewport')
    expect(html).toContain('var(--app-height,100dvh)')
    expect(html).toContain('id=\"workspaceHint\"')
    expect(html).toContain('id=\"newSession\" class=\"new-session\" disabled')
    expect(html).toContain('class=\"session-hero\"')
    expect(html).toContain('class=\"workspace-panel\"')
    expect(html).toContain('padding:calc(6px + env(safe-area-inset-top))')
    expect(html).toContain('header{height:48px')
    expect(html).toContain('.session-hero{display:flex;align-items:center')
    expect(html).toContain('padding:7px 2px 11px')
    expect(html).toContain('.session-actions select{flex:1;min-width:0;height:39px')
    expect(html).toContain('id=\"sessionCount\" class=\"session-count\"')
    expect(html).toContain('class=\"session-mark\"')
    expect(html).toContain('class=\"row-copy\"')
    expect(html).toContain("workspaces[0].workspaceId")
    expect(html).toContain('function refreshAll()')
    expect(html).toContain('function relativeTime(value)')
    expect(html).toContain("<time>'+esc(relativeTime(s.updatedAt))+'</time>")
    expect(html).toContain("$('workspaceHint').hidden=selected")
    expect(html).toContain('showToast(L.refreshed)')
    expect(html).not.toContain("esc(s.cwd||s.sessionId)")
    expect(html).toContain('@keyframes connectedPulse')
    expect(html).not.toContain('Connected on local network')
    expect(html).toContain("fetch('/api/status',{cache:'no-store'})")
    expect(html).toContain("location.replace('/disconnected')")
    expect(html).toContain('setInterval(checkConnection,1500)')
    expect(html).toContain("status.classList.add('error-state')")
    expect(html).toContain("if(r.status===401)")
    expect(html).toContain('e.disconnected=true')
    expect(html).toContain("function showError(id,error)")
    expect(html).toContain("showError('chatError',e)")
    expect(html).not.toContain("$('chatError').textContent=e.message")
    expect(html).toContain('archivedSessionIds=value.archivedSessionIds||[]')
    expect(html).toContain('archived=new Set(archivedSessionIds)')
    expect(html).not.toContain('new Set(value.archivedSessionIds||[])')
    expect(html).toContain('!archived.has(s.sessionId)')
  })

  it('renders an adaptive reconnect action for the Home Screen app', () => {
    const zh = renderMobileReconnectPage('zh')
    const en = renderMobileReconnectPage('en')
    const tunnelZh = renderMobileReconnectPage('zh', 'tunnel')
    expect(zh).toContain('连接已断开')
    expect(zh).toContain('href="/reconnect">重新连接')
    expect(zh).toContain('请确保手机和电脑连接到同一 Wi-Fi。点击重新连接后，在电脑上的 DSH Desktop 中允许此手机。')
    expect(zh).not.toContain('class="approval"')
    expect(zh).not.toContain('class="network"')
    expect(zh).not.toContain('class="symbol"')
    expect(en).toContain('Connection lost')
    expect(tunnelZh).toContain('点击重新连接，然后在电脑上的 DSH Desktop 中允许此移动设备。')
    expect(tunnelZh).not.toContain('连接到同一 Wi-Fi')
    for (const html of [zh, en]) {
      expect(html).toContain('prefers-color-scheme:dark')
      expect(html).toContain('/brand-logo/light')
      expect(html).toContain('/brand-logo/dark')
    }
  })

  it('uses DSH styling on both pairing surfaces', () => {
    const desktop = renderDesktopPairingPage({
      qrSvg: '<svg></svg>',
      pairingUrl: 'http://192.168.1.2/pair?token=test',
      expiresAt: Date.now() + 60_000,
      locale: 'en',
      connected: false
    })
    const phone = renderPairingWaitPage('pairing-id', 'en')
    for (const html of [desktop, phone]) {
      expect(html).toContain('/brand-logo/light')
      for (const script of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        (match) => match[1]!
      ))
        expect(() => new Function(script)).not.toThrow()
    }
    expect(desktop).toContain('/desktop/disconnect')
    expect(desktop).toContain('--request-accent:#c16f52')
    expect(desktop).toContain('--request-border:#dfbcae')
    expect(desktop).toContain('--request-bg:#fbf6f3')
    expect(desktop).not.toContain('--request-bg:#f5f7ff')
    expect(desktop).toContain('prefers-color-scheme:dark')
    expect(desktop).toContain('/brand-logo/dark')
    expect(desktop).toContain('--bg:#141416')
    expect(desktop).toContain('.qr{display:inline-flex;background:#fff')
    expect(desktop).toContain('Creating a global network link')
    expect(desktop).toContain('Switching to WiFi connection mode')
    expect(desktop).toContain('class="mode-panel"')
    expect(desktop).toContain('class="tunnel-progress" aria-hidden="true"')
    expect(desktop).toContain('id="tunnelProgressValue" class="loading-value">0%</span>')
    expect(desktop).toContain('id="tunnelProgressBar"')
    expect(desktop).toContain('</div></div><div class="url-row">')
    expect(desktop).toContain(
      '.has-request .qr,.has-request .url-row,.has-request .expires{display:none}'
    )
    expect(desktop).toContain("document.body.classList.toggle('has-request',!!pendingId)")
    expect(desktop).toContain('duration=enableTunnel?4500:800')
    expect(desktop).toContain('Math.min(99,(Date.now()-tunnelProgressStartedAt)/duration*100)')
    expect(desktop).toContain('setTunnelProgress(100)')
    expect(desktop).not.toContain('width:88%')
    expect(desktop).not.toContain('@keyframes tunnelProgress')
    expect(desktop).not.toContain('animation:tunnelProgress')
    expect(desktop).not.toContain('<div class="spinner">')
    expect(desktop).toContain('id="qrCode"><svg></svg></div>')
    expect(desktop).toContain("document.getElementById('qrCode').innerHTML=j.qrSvg")
    expect(desktop).not.toContain("document.getElementById('qrContainer').innerHTML=j.qrSvg")
    expect(desktop).toContain('if(phoneConnected||modeSwitching||tunnelActive===enableTunnel)return')
    expect(desktop).toContain('await finishTunnelProgress(completed,progressDuration)')
    expect(desktop).toContain('Phone connected')
    expect(desktop).toContain('You can close this window now.')
    expect(desktop).toContain('onclick="window.close()">Done</button>')
    expect(desktop).toContain("document.body.classList.toggle('phone-connected'")
    expect(desktop).toContain('function syncModeControls(connected)')
    expect(desktop).toContain(
      'if(phoneConnected||modeSwitching||tunnelActive===enableTunnel)return'
    )
    expect(desktop).not.toContain('📶')
    expect(desktop).not.toContain('🌐')
    const modePanel = desktop.slice(
      desktop.indexOf('class="mode-panel"'),
      desktop.indexOf('<div id="connection"')
    )
    expect(modePanel.indexOf('class="mode-switch"')).toBeLessThan(
      modePanel.indexOf('class="hint" id="modeHint"')
    )
    expect(phone).toContain('prefers-color-scheme:dark')
    expect(phone).toContain('--brand:#4d6bfe')
    expect(phone).toContain('--bg:#141416')
    expect(phone).toContain('/brand-logo/dark')
    expect(phone).toContain('background:var(--panel)')
    expect(phone).toContain('content="#141416" media="(prefers-color-scheme:dark)"')
    expect(phone).toContain('id="retry" class="retry"')
    expect(phone).toContain("fetch('/pair/retry'")
    expect(phone).toContain('Request approval again')
    expect(phone).toContain('Cannot reach the desktop. Start DSH Desktop and try again.')
    expect(phone).toContain("location.replace('/')")
    expect(phone).not.toContain("location.href='/'")
  })

  it('keeps the loading layer intact across consecutive mode switches', async () => {
    const desktop = renderDesktopPairingPage({
      qrSvg: '<svg id="initial"></svg>',
      pairingUrl: 'http://192.168.1.2/pair?token=test',
      expiresAt: Date.now() + 60_000,
      locale: 'en',
      connected: false
    })
    const script = /<script>([\s\S]*?)<\/script>/.exec(desktop)?.[1]
    expect(script).toBeTruthy()

    const classList = () => {
      const values = new Set<string>()
      return {
        add: (...names: string[]) => names.forEach((name) => values.add(name)),
        remove: (...names: string[]) => names.forEach((name) => values.delete(name)),
        toggle: (name: string, force?: boolean) => {
          const next = force ?? !values.has(name)
          if (next) values.add(name)
          else values.delete(name)
          return next
        },
        contains: (name: string) => values.has(name)
      }
    }
    const ids = [
      'qrLoading',
      'tunnelLoadingText',
      'tunnelProgressValue',
      'tunnelProgressBar',
      'btnLan',
      'btnTunnel',
      'url',
      'qrCode',
      'modeHint',
      'tunnelError',
      'requestMode',
      'address',
      'request',
      'connection',
      'expires'
    ]
    const elements = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          id,
          classList: classList(),
          disabled: false,
          textContent: '',
          innerHTML: '',
          offsetWidth: 152,
          style: { width: '' }
        }
      ])
    )
    const document = {
      body: { classList: classList() },
      getElementById: (id: string) => elements[id]
    }
    const toggleResults = [
      {
        ok: true,
        active: true,
        pairingUrl: 'https://example.trycloudflare.com/pair?token=test',
        qrSvg: '<svg id="tunnel"></svg>',
        expiresAt: Date.now() + 60_000
      },
      {
        ok: true,
        active: false,
        pairingUrl: 'http://192.168.1.2/pair?token=next',
        qrSvg: '<svg id="lan"></svg>',
        expiresAt: Date.now() + 60_000
      }
    ]
    const fetch = async (input: string) => {
      if (input === '/desktop/tunnel/toggle') {
        const value = toggleResults.shift()
        return { ok: true, json: async () => value }
      }
      if (input === '/desktop/pending') {
        return {
          ok: true,
          json: async () => ({ id: 'pending', mode: 'tunnel', remoteAddress: '203.0.113.8' })
        }
      }
      if (input === '/desktop/status') {
        return { ok: true, json: async () => ({ connected: false }) }
      }
      throw new Error(`Unexpected request: ${input}`)
    }
    const run = new Function(
      'document',
      'fetch',
      'navigator',
      'setInterval',
      'setTimeout',
      'location',
      'window',
      `${script};return {switchMode}`
    )
    const api = run(
      document,
      fetch,
      { clipboard: { writeText: () => undefined } },
      () => 0,
      (callback: () => void) => {
        callback()
        return 0
      },
      { reload: () => undefined },
      { close: () => undefined }
    ) as { switchMode: (enabled: boolean) => Promise<void> }
    const loadingNode = elements.qrLoading

    await api.switchMode(true)
    expect(document.body.classList.contains('has-request')).toBe(true)
    expect(elements.request?.classList.contains('show')).toBe(true)
    expect(elements.requestMode?.textContent).toBe('Connection: Internet connection mode')
    expect(elements.qrCode?.innerHTML).toBe('<svg id="tunnel"></svg>')
    expect(elements.qrLoading).toBe(loadingNode)
    expect(elements.qrLoading?.classList.contains('show')).toBe(false)
    expect(elements.tunnelLoadingText?.textContent).toBe('Creating a global network link')
    expect(elements.tunnelProgressValue?.textContent).toBe('0%')
    expect(elements.tunnelProgressBar?.style.width).toBe('0%')

    await api.switchMode(false)
    expect(elements.qrCode?.innerHTML).toBe('<svg id="lan"></svg>')
    expect(elements.qrLoading).toBe(loadingNode)
    expect(elements.qrLoading?.classList.contains('show')).toBe(false)
    expect(elements.tunnelLoadingText?.textContent).toBe('Switching to WiFi connection mode')
    expect(toggleResults).toHaveLength(0)
  })

  it('localizes both pairing surfaces from the desktop preference', () => {
    const desktop = renderDesktopPairingPage({
      qrSvg: '<svg></svg>',
      pairingUrl: 'http://192.168.1.2/pair?token=test',
      expiresAt: Date.now() + 60_000,
      locale: 'zh',
      connected: false
    })
    const phone = renderPairingWaitPage('pairing-id', 'zh')
    expect(desktop).toContain('<html lang="zh-CN">')
    expect(desktop).toContain('连接移动设备')
    expect(desktop).toContain('WiFi连接模式')
    expect(desktop).toContain('互联网连接模式')
    expect(desktop).toContain('移动设备与电脑需连接至同一 WiFi，同步实时性高')
    expect(desktop).toContain('正在创建全球网络链接')
    expect(desktop).toContain('连接方式：WiFi 连接模式')
    expect(desktop).toContain('连接方式：互联网连接模式')
    expect(desktop).toContain(
      '移动设备通过互联网（如 4G/5G 或其他WiFi网络等）均可远程操控，同步实时性中等'
    )
    expect(desktop).toContain('断开连接')
    expect(desktop).toContain('现在可以关闭此窗口。')
    expect(desktop).toContain('onclick="window.close()">完成</button>')
    expect(phone).toContain('请在 DSH Desktop 中确认连接请求。')
    expect(phone).toContain('再次发起申请')
    expect(phone).toContain('暂时无法连接桌面端，请先启动 DSH Desktop。')
  })

  it('renders a compact management state when a phone is already connected', () => {
    const desktop = renderDesktopPairingPage({
      qrSvg: '<svg></svg>',
      pairingUrl: 'http://192.168.1.2/pair?token=test',
      expiresAt: Date.now() + 60_000,
      locale: 'en',
      connected: true
    })
    expect(desktop).toContain('class="phone-connected manage-connected"')
    expect(desktop).toContain('Manage phone connection')
    expect(desktop).toContain('Your phone is currently connected to DSH Desktop.')
    expect(desktop).toContain('.manage-connected .connection-hint,.manage-connected .done{display:none}')
    expect(desktop).toContain(
      'onclick="switchMode(false)" disabled>WiFi Connection Mode</button>'
    )
    expect(desktop).toContain(
      'onclick="switchMode(true)" disabled>Internet Connection Mode</button>'
    )
    expect(desktop).toContain('.mode-btn:disabled{cursor:not-allowed;opacity:.5}')
  })
})
describe('desktop pairing page QR expiry self-healing', () => {
  it('reloads the page when the pairing countdown reaches zero and no phone is connected', () => {
    const html = renderDesktopPairingPage({
      qrSvg: '<svg></svg>',
      pairingUrl: 'http://192.168.1.4:39871/pair?token=abc123',
      expiresAt: Date.now() + 60_000,
      locale: 'en',
      connected: false,
      tunnelActive: false,
      tunnelLoading: false,
      tunnelUrl: undefined,
      tunnelError: undefined
    })
    const countdown = /setInterval\(\(\)=>\{const n=[\s\S]*?\},1000\)/.exec(html)?.[0]
    expect(countdown).toBeTruthy()
    expect(countdown).toContain('T.expired')
    expect(countdown).toContain('location.reload()')
    expect(countdown).toContain('phoneConnected')
    expect(countdown).toContain('pendingId')
    expect(countdown).toContain('modeSwitching')
  })
})

describe('desktop pairing page expiry copy', () => {
  it('describes automatic refresh instead of asking the user to reopen the window', () => {
    const html = renderDesktopPairingPage({
      qrSvg: '<svg></svg>',
      pairingUrl: 'http://192.168.1.4:39871/pair?token=abc123',
      expiresAt: Date.now() + 60_000,
      locale: 'en',
      connected: false,
      tunnelActive: false,
      tunnelLoading: false,
      tunnelUrl: undefined,
      tunnelError: undefined
    })
    expect(html).toContain('QR expired. Refreshing automatically')
    expect(html).not.toContain('Reopen this window')
  })
})
