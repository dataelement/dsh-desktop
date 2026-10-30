// Run with node_modules/.bin/electron scripts/check-workbench-header-layout.cjs.
// Uses the shipped host stylesheet in an isolated Chromium window; native drag
// requires manual acceptance and is deliberately not claimed by this probe.
const { app, BrowserWindow } = require('electron')
const { readFileSync, mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const interactive = process.argv.includes('--interactive')
const profile = mkdtempSync(join(tmpdir(), 'dsh-header-layout-'))
app.setPath('userData', profile)
const source = readFileSync(join(__dirname, '../packages/dsh-desktop-workbenches/client.js'), 'utf8')
const dragHelper = source.slice(source.indexOf('    function mountNativeDragRegions('), source.indexOf('    function Frame(', source.indexOf('    function mountNativeDragRegions(')))
const css = source.match(/const css = `([\s\S]*?)`/)[1]
app.whenReady().then(async () => {
  const win = new BrowserWindow({ title: 'DSH Header Layout Fixture', show: true, width: 800, height: 500, webPreferences: { nodeIntegration: false, contextIsolation: true } })
  try {
    await win.loadURL('data:text/html,' + encodeURIComponent('<html data-platform="darwin"><style>' + css + '</style><body style="margin:0"><div id="shell" data-sidebar-collapsed><div class="dshWbFrame" style="height:400px"><div class="dshWbCaptionRow"></div><div id="provider"><section><div id="toolbar" data-dsh-workbench-toolbar><button id="button"><span style="-webkit-app-region:drag">Refresh</span></button><input id="input"><div id="menu" role="menu"><button>Menu item</button></div></div><div id="content">A long business description retains the full width.</div></section></div></div></div></body></html>'))
    const checks = await win.webContents.executeJavaScript(`(() => {
      const check = (condition, message) => { if (!condition) throw new Error(message) }
      const row = document.querySelector('.dshWbCaptionRow'), host = document.querySelector('#provider'), bar = document.querySelector('#toolbar')
      const style = node => getComputedStyle(node)
      check(style(row).height === '48px', 'default row reserves 48px')
      check(document.querySelector('#content').getBoundingClientRect().width === 800, 'default keeps business width')
      host.setAttribute('data-dsh-compact-valid', 'true'); bar.setAttribute('data-dsh-compact-toolbar', '')
      check(style(row).display === 'none', 'compact has no extra row')
      check(style(bar).paddingLeft === '160px', 'compact clears window controls')
      check(style(bar).webkitAppRegion === 'drag', 'compact blank space is draggable')
      for (const selector of ['#button', '#button span', '#input', '#menu', '#menu button']) check(style(document.querySelector(selector)).webkitAppRegion === 'no-drag', selector + ' remains interactive')
      let clicks = 0; document.querySelector('#button').onclick = () => clicks++; document.querySelector('#button').click(); check(clicks === 1, 'button receives click')
      document.documentElement.dataset.fullscreen = 'true'
      check(style(bar).paddingLeft === '0px', 'fullscreen removes leading clearance')
      host.removeAttribute('data-dsh-compact-valid'); check(style(row).display === 'none', 'fullscreen removes default row')
      delete document.documentElement.dataset.fullscreen
      document.querySelector('#shell').removeAttribute('data-sidebar-collapsed'); check(style(row).display === 'none', 'expanded sidebar removes row')
      document.querySelector('#shell').setAttribute('data-sidebar-collapsed', '')
      document.documentElement.dataset.platform = 'win32'; check(style(row).display === 'none', 'Windows has its own titlebar')
      check(style(bar).paddingLeft === '0px', 'Windows has no macOS leading clearance')
      document.documentElement.dataset.platform = 'darwin'
      host.className = 'dshWbBusiness'; host.dataset.side = 'left'; host.setAttribute('data-dsh-compact-valid', 'true')
      host.style.height = '140px'; host.style.width = '100%'; host.style.flex = 'none'; host.querySelector('section').style.minHeight = '600px'
      check(style(host).paddingTop === '0px' && style(host).paddingLeft === '18px', 'ordinary left compact removes only top gutter')
      check(bar.getBoundingClientRect().top === host.getBoundingClientRect().top, 'ordinary left toolbar starts at caption top')
      check(document.querySelector('#button').getBoundingClientRect().left >= host.getBoundingClientRect().left + 160, 'ordinary left actions clear system controls')
      host.scrollTop = 100
      check(bar.getBoundingClientRect().top === host.getBoundingClientRect().top, 'ordinary left toolbar stays safe when body scrolls')
      host.scrollTop = 0
      return 19
    })()`)
    const geometryChecks = await win.webContents.executeJavaScript(`(() => {
      ${dragHelper}
      const check = (condition, message) => { if (!condition) throw new Error(message) }
      const frame = document.querySelector('.dshWbFrame'), host = document.querySelector('#provider'), bar = document.querySelector('#toolbar')
      const shell = document.querySelector('#shell')
      shell.removeAttribute('data-sidebar-collapsed'); host.removeAttribute('data-dsh-compact-valid'); bar.removeAttribute('data-dsh-compact-toolbar')
      host.className = ''; host.style.cssText = ''; bar.style.cssText = 'height:48px;display:flex;align-items:center;gap:16px'
      bar.setAttribute('role', 'toolbar')
      const before = bar.getBoundingClientRect().top
      window.__cleanupDrag = mountNativeDragRegions(frame)
      check(bar.getBoundingClientRect().top === before && before === 0, 'expanded header retains original position')
      const button = document.querySelector('#button'), r = button.getBoundingClientRect()
      check(document.elementFromPoint(r.left + 2, r.top + 2).closest('#button'), 'segments do not intercept button')
      check([...document.querySelectorAll('.dshWbNativeDragSegment')].some(node => node.getBoundingClientRect().width > 0), 'toolbar role leaves blank draggable pieces')
      const blank = document.elementFromPoint(780, 20)
      check(blank.classList.contains('dshWbNativeDragSegment'), 'right blank band hits a generated segment')
      check(getComputedStyle(blank).webkitAppRegion === 'drag', 'blank uses native region styling')
      return 5
    })()`)
    await win.webContents.executeJavaScript(`window.__clicks = 0; document.querySelector('#button').onclick = () => window.__clicks++; true`);
    const point = await win.webContents.executeJavaScript(`(() => { const r = document.querySelector('#button').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })()`);
    win.webContents.sendInputEvent({ type: 'mouseMove', ...point })
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point })
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point })
    await new Promise(resolve => setTimeout(resolve, 50))
    const clicks = await win.webContents.executeJavaScript('window.__clicks')
    if (clicks !== 1) throw new Error('Native Chromium pointer input did not click toolbar action')
    if (interactive) await win.webContents.executeJavaScript(`document.documentElement.dataset.platform = 'darwin'; document.querySelector('#provider').setAttribute('data-dsh-compact-valid', 'true'); true`)
    console.log(`PASS: ${checks + geometryChecks} Chromium layout/interaction checks; native drag remains manual.`)
  } catch (error) { console.error(error); process.exitCode = 1 } finally { if (!interactive || process.exitCode) { win.destroy(); app.exit(process.exitCode || 0) } }
}).catch(error => { console.error(error); app.exit(1) })
app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => rmSync(profile, { recursive: true, force: true }))
