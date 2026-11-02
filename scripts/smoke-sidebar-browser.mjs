/** Real Electron guest smoke using isolated, disposable user data and an X-Frame-Options DENY page. */
import { build } from 'esbuild'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const directory = await mkdtemp(join(tmpdir(), 'dsh-browser-smoke-'))
try {
  const entry = join(directory, 'main.cjs')
  const preload = join(directory, 'preload.cjs')
  await writeFile(preload, `const {contextBridge,ipcRenderer}=require('electron');contextBridge.exposeInMainWorld('smoke',{acquire:()=>ipcRenderer.invoke('acquire'),release:id=>ipcRenderer.invoke('release',id)});`)
  const source = `
    import {app,BrowserWindow,ipcMain,webContents} from 'electron'
    import {createServer} from 'node:http'
    import {writeFile} from 'node:fs/promises'
    import {SidebarBrowserGuests} from ` + JSON.stringify(join(root, 'src/main/sidebar-browser.ts')) + `
    ;(async () => {
    app.setPath('userData', ` + JSON.stringify(join(directory, 'profile')) + `)
    const deadline=setTimeout(()=>{console.error('browser smoke timed out');app.exit(1)},45000)
    let server
    let owner
    try {
      await app.whenReady()
      server=createServer((req,res)=>{res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"frame-ancestors 'none'");res.end('<html><head><title>Isolated browser works</title></head><body><input id="input"/><h1>Guest loaded with frame denial preserved</h1></body></html>')})
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
      const target='http://127.0.0.1:'+server.address().port+'/'
      const guests=new SidebarBrowserGuests(()=> 'http://127.0.0.1:1/')
      owner=new BrowserWindow({show:false,width:1000,height:700,webPreferences:{preload:` + JSON.stringify(preload) + `,webviewTag:true,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}})
      guests.bind(owner)
      ipcMain.handle('acquire',event=>{if(event.sender!==owner.webContents||event.senderFrame!==owner.webContents.mainFrame)throw Error('wrong sender');return guests.acquire(event.sender,'smoke-workspace')})
      ipcMain.handle('release',(event,id)=>guests.release(event.sender,id))
      const host=` + JSON.stringify(join(directory, 'host.html')) + `
      await writeFile(host,'<!doctype html><html><body><h1>Native browser smoke</h1></body></html>')
      await owner.loadFile(host)
      const result=await owner.webContents.executeJavaScript('('+async function(target) {
        const reservation=await window.smoke.acquire()
        const view=document.createElement('webview')
        view.style='display:flex;width:950px;height:600px'
        view.setAttribute('partition',reservation.partition)
        view.setAttribute('src','about:blank#'+reservation.lease)
        const ready=new Promise((resolve,reject)=>{view.addEventListener('dom-ready',resolve,{once:true});view.addEventListener('did-fail-load',e=>reject(Error(e.errorDescription)),{once:true})})
        document.body.append(view)
        await ready
        await view.loadURL(target)
        const security=await view.executeJavaScript('({url:location.href,title:document.title,node:typeof require,bridge:typeof window.dshDesktop})')
        // Real guest focus, text input, and execution remain within its own page.
        view.focus()
        await view.executeJavaScript('document.querySelector("input").value="browser-input-ok"')
        const value=await view.executeJavaScript('document.querySelector("input").value')
        return {reservation,security,value,guestId:view.getWebContentsId()}
      }.toString()+')('+JSON.stringify(target)+')')
      if(result.security.title!=='Isolated browser works'||result.security.node!=='undefined'||result.security.bridge!=='undefined'||result.value!=='browser-input-ok')throw Error(JSON.stringify(result))
      const guest=webContents.fromId(result.guestId)
      if(!guest||guest.getLastWebPreferences().sandbox!==true||guest.getLastWebPreferences().nodeIntegration!==false)throw Error('guest isolation missing')
      await guests.release(owner.webContents,result.reservation.lease)
      if(!guest.isDestroyed())throw Error('guest release did not destroy contents')
      console.log(JSON.stringify({passed:true,...result.security,input:result.value,guestDestroyed:true}))
      app.exit(0)
    } catch(error) {console.error(error);app.exit(1)}
    finally {clearTimeout(deadline);server?.close()}
    })().catch(error => { console.error(error); app.exit(1) })
  `
  await build({ stdin: { contents: source, resolveDir: root, sourcefile: 'browser-smoke.ts', loader: 'ts' }, outfile: entry, bundle: true, platform: 'node', format: 'cjs', external: ['electron'], target: 'node22' })
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  const { stdout, stderr } = await promisify(execFile)(require('electron'), [entry], { env, timeout: 55_000, maxBuffer: 2 * 1024 * 1024 })
  console.log(stdout.trim())
  if (stderr.trim()) console.error(stderr.trim())
} finally {
  await rm(directory, { recursive: true, force: true })
}
