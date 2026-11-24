import { spawn } from 'node:child_process'
import { expect, it } from 'vitest'

// Use fresh Node and Electron-as-Node processes: Vitest's fetch mocks would hide
// the embedded Undici / installed dispatcher boundary that failed in production.
const scenario = String.raw`
import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { once } from 'node:events'
import { installProxyFromEnvironment } from '@deepseek-ai/dsh-http-proxy'
import * as undici from 'undici'
const original = Object.fromEntries(['fetch','Headers','Request','Response','FormData','WebSocket'].map(key => [key,globalThis[key]]))
const sockets = new Set()
const target = http.createServer(async (req,res) => {
  if (req.url === '/wait') return
  const chunks=[]; for await (const chunk of req) chunks.push(chunk)
  res.writeHead(req.url === '/unauthorized' ? 401 : 200, {'content-type':'application/json'})
  res.end(JSON.stringify({body:Buffer.concat(chunks).toString(), type:req.headers['content-type']}))
})
const proxy = http.createServer()
let tunnels=0
proxy.on('request',(req,res)=>{
  tunnels++
  const forward=http.request({hostname:'127.0.0.1',port:target.address().port,path:new URL(req.url).pathname,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)})
  forward.on('error',()=>res.destroy()); req.pipe(forward)
})
proxy.on('connect',(req,socket,head)=>{
  tunnels++
  const upstream=net.connect(target.address().port,'127.0.0.1',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n'); if(head.length) upstream.write(head); socket.pipe(upstream); upstream.pipe(socket)})
  sockets.add(socket); sockets.add(upstream)
  socket.on('error',()=>upstream.destroy()); upstream.on('error',()=>socket.destroy())
})
target.listen(0,'127.0.0.1'); proxy.listen(0,'127.0.0.1')
await Promise.all([once(target,'listening'),once(proxy,'listening')])
let dispose
const environment = values => ({get:name => values[name] === undefined ? undefined : {value:values[name]}})
try {
  dispose = await installProxyFromEnvironment(environment({http_proxy:'http://127.0.0.1:'+proxy.address().port}),()=>{})
  for(const key of ['fetch','Headers','Request','Response','FormData']) assert.equal(globalThis[key],undici[key],key)
  assert.equal(WebSocket,original.WebSocket)
  const unauthenticated = await fetch('http://fixture.invalid/unauthorized')
  assert.equal(unauthenticated.status,401); await unauthenticated.text()
  const form=new FormData(); form.set('value','roundtrip')
  const response=await fetch(new Request('http://fixture.invalid/form',{method:'POST',headers:new Headers({'x-test':'yes'}),body:form}))
  assert.ok(response instanceof Response)
  const data=await response.json(); assert.match(data.body,/roundtrip/); assert.match(data.type,/multipart\/form-data/)
  await assert.rejects(fetch('http://fixture.invalid/wait',{signal:AbortSignal.timeout(40)}),error=>error.name==='TimeoutError')
  const count=tunnels
  const local=await fetch('http://127.0.0.1:'+target.address().port+'/local'); assert.equal(local.status,200); await local.text()
  assert.equal(tunnels,count,'loopback bypass must remain direct')
  await dispose(); dispose=undefined
  for(const key of Object.keys(original)) assert.equal(globalThis[key],original[key],key+' restored')
  const direct=await installProxyFromEnvironment(environment({}),()=>{})
  assert.equal(fetch,undici.fetch,'direct mode also uses the same fetch implementation')
  await direct(); await direct()
  assert.equal(fetch,original.fetch)
  console.log(JSON.stringify({ok:true,embedded:process.versions.undici,tunnels}))
} finally {
  for(const socket of sockets) socket.destroy()
  target.closeAllConnections(); proxy.closeAllConnections()
  await dispose?.()
  await Promise.all([new Promise(resolve=>target.close(resolve)),new Promise(resolve=>proxy.close(resolve))])
}
`

for (const runtime of ['node', 'electron']) it(`uses Undici 8 fetch and proxy together in ${runtime}`, async () => {
  const executable = runtime === 'node' ? process.execPath : (await import('electron')).default
  const result = await new Promise((resolve, reject) => {
    const child = spawn(executable, ['--input-type=module', '-e', scenario], { cwd: process.cwd(), env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } })
    let stdout = '', stderr = ''
    const timeout = setTimeout(() => { child.kill(); reject(new Error('HTTP scenario timed out: ' + stderr)) }, 12000)
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.once('error', reject)
    child.once('exit', code => { clearTimeout(timeout); code === 0 ? resolve(stdout) : reject(new Error(stderr)) })
  })
  expect(JSON.parse(result)).toMatchObject({ ok: true })
}, 20000)
