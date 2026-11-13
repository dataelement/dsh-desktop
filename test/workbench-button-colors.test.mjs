import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
const css = code.match(/const css = `([\s\S]*?)`/)[1]

// jsdom does not implement Chromium's selector specificity/cascade accurately.
// Opt in to the real renderer; use an isolated profile, never the running app.
it.skipIf(process.env.DSH_TEST_WORKBENCH_COLORS !== '1')('keeps workbench action labels visible across themes, sizes and interaction states', async () => {
  const themeSource = await readFile(require.resolve('@deepseek-ai/dsh-client-ui-theme/client'), 'utf8')
  const theme = vm.runInNewContext(themeSource.match(/var design_platform_css_default = ("(?:[^"\\]|\\.)*")/)[1])
  const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-colors-'))
  const entry = join(root, 'fixture.cjs')
  await writeFile(entry, `
    const { app, BrowserWindow } = require('electron')
    app.setPath('userData', ${JSON.stringify(join(root, 'profile'))})
    app.whenReady().then(async () => {
      const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } })
      try {
        await win.loadURL('data:text/html,' + encodeURIComponent('<style>' + ${JSON.stringify(theme + css)} + '</style><body></body>'))
        for (const width of [390, 1280]) {
          win.setSize(width, 800)
          for (const dark of [false, true]) {
            await win.webContents.executeJavaScript('document.body.toggleAttribute("data-ds-dark-theme", ' + dark + ')')
            await win.webContents.executeJavaScript(
              '(' + ${JSON.stringify(`() => {
                const check = (value, message) => { if (!value) throw new Error(message) }
                for (const surface of ['dshWbMarket', 'dshWbInit', 'dshWbNotice']) {
                  document.body.innerHTML = '<section class="dshWb ' + surface + '"><button class="dshWbBtn dshWbPrimary">安装</button><button class="dshWbBtn dshWbPrimary" disabled>正在安装…</button><a class="dshWbBtn dshWbPrimary" href="#">打开</a><button class="dshWbFavorite">收藏</button><button class="dshWbFavorite" disabled>收藏</button><button data-dsh-wb-primitive style="color:rgb(10, 20, 30)">Native</button></section>'
                  const host = document.querySelector('section')
                  const probe = document.createElement('span')
                  probe.style.color = 'var(--dsw-alias-label-primary-foreground)'
                  host.append(probe)
                  const foreground = getComputedStyle(probe).color
                  for (const button of host.querySelectorAll('.dshWbPrimary')) {
                    const assertColor = () => {
                      const style = getComputedStyle(button)
                      check(style.color === foreground, surface + ': primary foreground overwritten: ' + style.color)
                      check(style.color !== style.backgroundColor, surface + ': invisible label')
                    }
                    assertColor()
                    button.focus()
                    assertColor()
                  }
                  const disabled = host.querySelector('.dshWbFavorite:disabled')
                  probe.style.color = 'var(--dsw-alias-label-secondary)'
                  check(getComputedStyle(disabled).color === getComputedStyle(probe).color, 'secondary disabled color')
                  check(getComputedStyle(host.querySelector('[data-dsh-wb-primitive]')).color === 'rgb(10, 20, 30)', 'native primitive ownership')
                }
                document.body.innerHTML = '<aside class="dshRestartNotice"><div class="dshRestartRow"><div class="dshRestartBody"><p class="dshRestartTitle">有工作台加载失败</p></div><div class="dshRestartActions"><button class="dshRestartToggle">查看详情</button><button class="dshRestartPrimary">重启 Harness</button></div></div><div class="dshRestartDetails"><p></p></div></aside>'
                document.querySelector('.dshRestartDetails p').textContent = 'very-long-package/'.repeat(200)
                const notice = document.querySelector('aside')
                const action = notice.querySelector('.dshRestartPrimary')
                check(getComputedStyle(action).color !== getComputedStyle(action).backgroundColor, 'restart button contrast')
                check(notice.scrollWidth <= notice.clientWidth, 'diagnostic does not overflow horizontally')
                check(notice.getBoundingClientRect().right <= innerWidth, 'notice fits narrow viewport')
                check(notice.querySelector('.dshRestartDetails').scrollHeight > 240, 'long diagnostics remain scrollable')
              }`)} + ')()'
            )
          }
        }
        console.log('PASS workbench button colors: 2 themes × 2 widths × 3 surfaces')
      } catch (error) { console.error(error); process.exitCode = 1 }
      finally { win.destroy(); app.exit(process.exitCode || 0) }
    }).catch(error => { console.error(error); app.exit(1) })
  `)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const result = spawnSync(require('electron'), [entry], { env, encoding: 'utf8', timeout: 30000 })
  const evidence = result.stdout + '\n' + result.stderr
  expect(result.error, evidence).toBeUndefined()
  expect(result.status, evidence).toBe(0)
  expect(result.stdout).toContain('PASS workbench button colors')
}, 35000)
