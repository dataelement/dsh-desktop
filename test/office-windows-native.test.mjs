import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { runIsolated, withJob } from '../packages/dsh-office/lib/runtime.js'

const enabled = process.platform === 'win32' && Boolean(process.env.DSH_OFFICE_BUNDLE_ROOT)
if (process.platform === 'win32' && process.env.DSH_OFFICE_REQUIRE_NATIVE === '1' && !enabled) throw new Error('Windows Office gate requires the AppContainer runner')
describe.skipIf(!enabled)('Windows Office AppContainer boundary', () => {
  const windowsSandbox = process.env.DSH_OFFICE_BUNDLE_ROOT && path.join(process.env.DSH_OFFICE_BUNDLE_ROOT, 'bin/office-sandbox.exe')
  const invoke = (job, source, options = {}) => runIsolated([process.execPath, '-e', source], {
    job, readRoots: [path.dirname(process.execPath)], windowsSandbox, ...options
  })
  it('denies ambient app-package reads and writes, preserves explicit job access, and blocks network', async () => {
    const outside = await mkdtemp(path.join(tmpdir(), 'office-private-'))
    const fixture = path.join(outside, 'private.txt')
    await writeFile(fixture, 'private')
    // Regular AppContainer access would allow this; LPAC must still deny it.
    execFileSync('icacls.exe', [outside, '/grant', '*S-1-15-2-1:(OI)(CI)(RX)'])
    process.env.DSH_OFFICE_PRIVATE_FIXTURE = 'secret'
    try {
      await withJob(async job => {
        const source = `const fs=require('fs'),net=require('net');
if(process.env.DSH_OFFICE_PRIVATE_FIXTURE)throw Error('inherited secret');
for(const op of [()=>fs.readFileSync(${JSON.stringify(fixture)}),()=>fs.writeFileSync(${JSON.stringify(path.join(outside,'escaped'))},'x')]){
  try{op();throw Error('filesystem escaped')}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e}
}
const socket=net.connect(9,'127.0.0.1');socket.on('connect',()=>{throw Error('network escaped')});
socket.on('error',e=>{if(!['EPERM','EACCES'].includes(e.code))throw e;fs.writeFileSync('boundary.txt','PASS')});`
        const result = await invoke(job, source)
        expect(result.confinement.backend).toBe('windows-appcontainer')
        expect(await readFile(path.join(job, 'boundary.txt'), 'utf8')).toBe('PASS')
      })
      expect(await readFile(fixture, 'utf8')).toBe('private')
    } finally { delete process.env.DSH_OFFICE_PRIVATE_FIXTURE; await rm(outside, { recursive: true, force: true }) }
  }, 60000)
  it('terminates background descendants when the author process exits', async () => {
    await withJob(async job => {
      const grandchild = `setTimeout(()=>require('fs').writeFileSync('escaped-child.txt','escaped'),1500)`
      await invoke(job, `const c=require('child_process').spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{windowsHide:true,stdio:'inherit'});c.on('error',e=>{throw e});c.unref()`)
      await new Promise(resolve => setTimeout(resolve, 1800))
      await expect(access(path.join(job, 'escaped-child.txt'))).rejects.toThrow()
    })
  }, 30000)
  it('keeps simultaneous workspace grants independent through cleanup', async () => {
    await Promise.all([600, 900, 1200].map(delay => withJob(async job => {
      await invoke(job, `const fs=require('fs');const timer=setInterval(()=>fs.readFileSync(process.execPath),50);setTimeout(()=>{clearInterval(timer);fs.writeFileSync('parallel.txt','PASS')},${delay})`)
      expect(await readFile(path.join(job, 'parallel.txt'), 'utf8')).toBe('PASS')
    })))
  }, 30000)
  it('settles cancellation and timeout before job cleanup', async () => {
    await withJob(async job => {
      await expect(invoke(job, 'setInterval(()=>{},1000)', { timeoutMs: 200 })).rejects.toThrow('time limit')
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 300)
      try { await expect(invoke(job, 'setInterval(()=>{},1000)', { signal: controller.signal })).rejects.toThrow('cancelled') }
      finally { clearTimeout(timer) }
    })
  }, 30000)
})
