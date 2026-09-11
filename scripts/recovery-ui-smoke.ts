import { app, BrowserWindow, WebContentsView, ipcMain, shell, desktopCapturer } from 'electron'
import { strict as assert } from 'node:assert'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SafeModeOverlay } from '../src/main/safe-mode-overlay'
import { buildSafeModeViewModel } from '../src/main/safe-mode'
import { buildPluginRecoveryViewModel } from '../src/main/plugin-recovery-view'
import { windowsMenuViewBounds } from '../src/main/windows-menu-view'
import { secureWindow } from '../src/main/security'

const scale = process.env.RECOVERY_UI_SCALE || '1'
const output = join(process.env.RECOVERY_UI_OUTPUT!, `scale-${scale}`)
mkdirSync(output, { recursive: true })
app.setPath('userData', join(output, 'profile'))
app.commandLine.appendSwitch('force-device-scale-factor', scale)
app.on('window-all-closed', () => {})
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const results: unknown[] = []
const external: string[] = []
shell.openExternal = async url => { external.push(url) }
ipcMain.on('dsh:storage-load-sync', event => { event.returnValue = {} })
ipcMain.on('dsh:storage-sync', () => {})
ipcMain.handle('updates:status', () => ({ phase: 'idle', currentVersion: '0.0.0', manual: false }))
ipcMain.handle('mobile:status', () => ({ connected: false }))
ipcMain.handle('desktop-titlebar:close-menu', () => {})
ipcMain.handle('desktop-titlebar:set-theme', () => {})

async function capture(contents: Electron.WebContents, path: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      writeFileSync(path, (await contents.capturePage(undefined, { stayAwake: true })).toPNG())
      return
    } catch (error) {
      if (attempt === 2) throw new Error(`Unable to capture ${path}`, { cause: error })
      await delay(250)
    }
  }
}

async function main(): Promise<void> {
  await app.whenReady()
  const parent = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 640,
    show: true, frame: process.platform !== 'darwin',
    ...(process.platform === 'win32' ? {
      titleBarStyle: 'hidden' as const,
      titleBarOverlay: { color: '#00000000', symbolColor: '#fafafa', height: 36 },
      autoHideMenuBar: true
    } : {}),
    backgroundColor: '#18181b',
    webPreferences: { sandbox: true, contextIsolation: true }
  })
  parent.setMenuBarVisibility(false)
  secureWindow(parent)
  const menu = new WebContentsView({ webPreferences: { sandbox: true } })
  menu.setBackgroundColor('#00000000')
  if (process.platform === 'win32') parent.contentView.addChildView(menu)
  const preload = join(process.cwd(), 'out/preload/index.cjs')
  const names = ['calendar-plugin', 'search-plugin', 'notes-plugin', '@community/billing-plugin', '@community/longer-agent-memory-plugin', 'mobile-plugin']
  let closed = 0
  for (const scenario of ['safe-mode', 'plugin-recovery', 'multiple-plugins', 'market-offline', 'unidentified-plugin']) {
    const page = scenario === 'unidentified-plugin' || scenario === 'multiple-plugins' || scenario === 'market-offline' ? 'plugin-recovery' : scenario
    await parent.loadURL('data:text/html,<body style="background:%2318181b;color:%23999">DSH Desktop</body>')
    const overlay = page === 'safe-mode' ? new SafeModeOverlay(parent, preload, () => { closed++ }) : undefined
    const contents = overlay?.webContents ?? parent.webContents
    const rendererErrors: string[] = []
    contents.on('console-message', event => { if (event.level === 'error') rendererErrors.push(event.message) })
    for (const locale of ['zh', 'en'] as const) for (const theme of ['light', 'dark']) for (const [width, height] of [[1280,800], [900,640]]) {
      parent.setSize(width!, height!)
      if (process.platform === 'win32') {
        parent.setTitleBarOverlay({ color: '#00000000', symbolColor: theme === 'dark' ? '#fafafa' : '#18181b', height: 36 })
        menu.setBounds(windowsMenuViewBounds({ width: width!, height: height! }, false))
      }
      const model = page === 'safe-mode' ? buildSafeModeViewModel({ locale, plugins: names }) : buildPluginRecoveryViewModel({
        locale, plugins: scenario === 'unidentified-plugin' ? [] : (scenario === 'multiple-plugins' || scenario === 'market-offline') ? names.slice(0, 3) : [names[0]!], removedPlugins: [],
        pluginChecks: scenario === 'market-offline' ? names.slice(0, 3).map(packageName => ({ packageName, hint: 'ENOTFOUND — 请重新检查更新' })) : scenario === 'multiple-plugins' ? names.slice(0, 3).map((packageName, index) => ({
          packageName, hint: index === 1 ? '已是 latest，仍阻挡启动，请卸载此插件。' : '可尝试升级，兼容性未确认；升级后仍需验证启动。',
          removalRecommended: index === 1,
          upgradeCandidate: index === 1 ? undefined : { packageName, targetVersion: '2.0.0' }
        })) : undefined,
        snapshot: { phase: 'failed', message: 'Plugin startup conflict', logs: ['duplicate prefix route "/calendar/api"'] }
      })
      if ('pluginItems' in model) {
        model.pluginItems.forEach((item, index) => {
          item.installedVersion = '0.4.0'
          if (index < 3) return
          Object.assign(item, { upgradeReady: true, upgradeVersion: '0.5.1', statusTone: 'success',
            statusLabel: locale === 'zh' ? '（发现新版本 v0.5.1）' : '(Update available v0.5.1)',
            upgradeButtonLabel: locale === 'zh' ? '升级至 v0.5.1' : 'Upgrade to v0.5.1' })
        })
        model.upgradeReadyCount = 3
        model.upgradeAllLabel = locale === 'zh' ? '一键升级 3 个已适配插件' : 'Upgrade 3 compatible plugins'
      }
      await contents.loadFile(join(process.cwd(), 'build', `${page}.html`), { query: { state: JSON.stringify(model), theme, icon: 'app-icon.png' } })
      overlay?.show()
      contents.focus()
      await delay(150)
      if (overlay) {
        const size = parent.getContentBounds()
        assert.deepEqual(overlay.view.getBounds(), { x: 0, y: 0, width: size.width, height: size.height })
        assert.equal(parent.contentView.children.at(-1), overlay.view)
        assert.equal(BrowserWindow.getAllWindows().length, 1, 'The dialog must not create another native window')
      }
      const layout = await contents.executeJavaScript(`(() => {
        const content=document.querySelector('.content'), list=document.querySelector('.plugins'), footer=document.querySelector('.footer');
        const cr=content.getBoundingClientRect();
        return { width:innerWidth, height:innerHeight, dpr:devicePixelRatio,
          outerScroll:document.documentElement.scrollHeight>innerHeight || document.documentElement.scrollWidth>innerWidth,
          contentScroll:content.scrollHeight>content.clientHeight,
          listScroll:list ? list.scrollHeight>list.clientHeight : false,
          buttonsVisible:[...document.querySelectorAll('.actions button:not([hidden])')].filter(b=>b.getBoundingClientRect().height).every(b=>{const r=b.getBoundingClientRect();return r.top>=cr.top&&r.bottom<=cr.bottom&&r.right<=innerWidth}),
          footerVisible:footer.getBoundingClientRect().bottom<=innerHeight,
          wechatLabel:document.querySelector('#community-wechat').innerText }
      })()`)
      assert.equal(layout.outerScroll, false)
      assert.equal(layout.footerVisible, true)
      if (page === 'safe-mode') {
        assert.equal(layout.contentScroll, false)
        assert.equal(layout.buttonsVisible, true)
        if (width === 1280) assert.equal(layout.listScroll, false)
      }
      if (page === 'plugin-recovery') {
        const actions = await contents.executeJavaScript(`Array.from(document.querySelectorAll('.actions button')).filter(b => b.getBoundingClientRect().height > 0).map(b => b.textContent)`)
        const safeModeLabel = locale === 'zh' ? '进入安全模式' : 'Enter Safe Mode'
        assert.equal(actions.filter((label: string) => label === safeModeLabel).length, 1)
        if (scenario === 'unidentified-plugin') assert.deepEqual(actions, [safeModeLabel])
      }
      const prefix = `${scenario}-${locale}-${theme}-${width}`
      await capture(contents, join(output, `${prefix}.png`))
      const before = contents.getURL()
      await contents.executeJavaScript("document.getElementById('community-wechat').dispatchEvent(new PointerEvent('pointerenter'))")
      await delay(60)
      const popup = await contents.executeJavaScript(`(()=>{const p=document.getElementById('wechat-popover'),r=p.getBoundingClientRect(),img=document.getElementById('wechat-qr');return {open:p.matches(':popover-open'),image:img.complete&&img.naturalWidth===400,visible:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}})()`)
      assert.deepEqual(popup, { open: true, image: true, visible: true })
      await capture(contents, join(output, `${prefix}-qr.png`))
      contents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })
      contents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' })
      await delay(60)
      assert.equal(await contents.executeJavaScript("document.getElementById('wechat-popover').matches(':popover-open')"), false)
      assert.equal(external.length, 0, 'WeChat must not open an external page')
      await contents.executeJavaScript("document.getElementById('community-discord').click()")
      await delay(60)
      assert.equal(contents.getURL(), before)
      assert.deepEqual(external.splice(0), ['https://discord.gg/he2gAKCpj'])
      if (scenario === 'unidentified-plugin') {
        const action = await contents.executeJavaScript(`(() => {
          let action;
          window.dshRecovery = { action: value => { action = value } };
          document.getElementById('primary').click();
          return { action, disabled: document.getElementById('primary').disabled };
        })()`)
        assert.deepEqual(action, { action: 'safe-mode', disabled: true })
      }
      if (scenario === 'multiple-plugins') {
        const perPluginActions = await contents.executeJavaScript(`(() => {
          const actions = [];
          window.dshRecovery = { action: value => { actions.push(value) } };
          const rows = [...document.querySelectorAll('#plugins li')];
          for (const button of document.querySelectorAll('#plugins button')) {
            document.querySelectorAll('button').forEach(control => { control.disabled = false });
            button.click();
          }
          document.querySelectorAll('button').forEach(control => { control.disabled = false });
          document.getElementById('primary').click();
          return { actions, hints: rows.map(row => row.querySelector('.plugin-check-hint').textContent) };
        })()`)
        assert.deepEqual(perPluginActions.actions, [
          `upgrade:${names[0]}`, `uninstall:${names[0]}`, `uninstall:${names[1]}`,
          `upgrade:${names[2]}`, `uninstall:${names[2]}`, 'auto-process'
        ])
        assert.equal(perPluginActions.hints.length, 3)
      }
      if (scenario === 'market-offline') {
        const retry = await contents.executeJavaScript(`(() => {
          let action;
          window.dshRecovery = { action: value => { action = value } };
          const label = document.getElementById('primary').textContent;
          document.getElementById('primary').click();
          return { action, label };
        })()`)
        assert.deepEqual(retry, { action: 'check-updates', label: locale === 'zh' ? '重新检查更新' : 'Retry update checks' })
      }
      results.push({ page, scenario, locale, theme, requestedSize: [width,height], layout, popup })
    }
    assert.deepEqual(rendererErrors, [])
    if (overlay) {
      overlay.close(); overlay.close(); await delay(60)
      assert.equal(closed, 1)
      assert.equal(parent.contentView.children.includes(overlay.view), false)
      assert.equal(overlay.webContents.isDestroyed(), true)
    }
  }
  // Save a native-window thumbnail as well as renderer captures where the runner supports it.
  const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 1280, height: 800 } })
  const source = sources.find(item => item.id === parent.getMediaSourceId())
  if (source && !source.thumbnail.isEmpty()) writeFileSync(join(output, 'native-window.png'), source.thumbnail.toPNG())
  const overlay = new SafeModeOverlay(parent, preload, () => { closed++ })
  parent.destroy(); await delay(60)
  assert.equal(overlay.isDestroyed(), true)
  assert.equal(closed, 2)
  if (!menu.webContents.isDestroyed()) menu.webContents.close()
  writeFileSync(join(output, 'results.json'), JSON.stringify({ platform: process.platform, arch: process.arch, scale, results, closed }, null, 2))
  console.log(JSON.stringify({ platform: process.platform, scale, variants: results.length, status: 'passed' }))
}
main().then(() => app.quit()).catch(error => { console.error(error); app.exit(1) })
