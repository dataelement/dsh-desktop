import { describe, expect, it } from 'vitest'
import {
  renderDesktopPairingPage,
  renderMobilePage,
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
    expect(html).toContain('/brand-logo/light')
    expect(html).toContain('id="chatTitle"')
    expect(html).toContain('class=\"skeleton\"')
    expect(html).toContain('agentRunning?250:750')
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
    expect(html).toContain('class=\"thinking\"')
    expect(html).toContain("streamKey=kind+':'+String(chunk.index??0)")
    expect(html).toContain("(streaming?' open':'')")
    expect(html).toContain('key=JSON.stringify(messages)')
    expect(html).toContain('class=\"tool\"')
    expect(html).toContain('function markdown(text)')
    expect(html).toContain('function tableCells(line)')
    expect(html).toContain('class=\"table-wrap\"')
    expect(html).toContain('flex-direction:column;gap:0')
    expect(html).toContain('visualViewport')
    expect(html).toContain('var(--app-height,100dvh)')
    expect(html).toContain('id=\"workspaceHint\"')
    expect(html).toContain('id=\"newSession\" class=\"new-session\" disabled')
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
    expect(html).toContain('setInterval(checkConnection,1500)')
    expect(html).toContain("status.classList.add('error-state')")
    expect(html).toContain('archived=new Set(value.archivedSessionIds||[])')
    expect(html).toContain('!archived.has(s.sessionId)')
    expect(html).toContain('archive-btn')
    expect(html).toContain('data-action="archive"')
    expect(html).toContain('function archiveSession(')
    expect(html).toContain("rpc('workspace.archiveSession'")
    expect(html).toContain('归档会话')
    expect(html).toContain('已归档')
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
      expect(html).toContain('--brand:#4d6bfe')
      expect(html).toContain('/brand-logo/light')
      for (const script of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
        (match) => match[1]!
      ))
        expect(() => new Function(script)).not.toThrow()
    }
    expect(desktop).toContain('/desktop/disconnect')
    expect(desktop).toContain('prefers-color-scheme:dark')
    expect(desktop).toContain('/brand-logo/dark')
    expect(desktop).toContain('--bg:#141416')
    expect(desktop).toContain('.qr{display:inline-flex;background:#fff')
    expect(desktop).toContain('Phone connected')
    expect(desktop).toContain('You can close this window now.')
    expect(desktop).toContain('onclick="window.close()">Done</button>')
    expect(desktop).toContain("document.body.classList.toggle('phone-connected'")
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
    expect(desktop).toContain('连接你的手机')
    expect(desktop).toContain('断开连接')
    expect(desktop).toContain('现在可以关闭此窗口。')
    expect(desktop).toContain('onclick="window.close()">完成</button>')
    expect(phone).toContain('请在 DSH Desktop 中确认连接请求。')
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
  })
})
