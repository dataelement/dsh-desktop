// Native Electron verification with an isolated profile; never signs out the host.
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const electron = require('electron')
const root = await mkdtemp(join(tmpdir(), 'dsh-stability-native-'))
try {
  for (const [source, target] of [
    ['src/main/runtime/disclaimed-utility-process.ts', 'utility.cjs']
  ]) {
    const code = ts.transpileModule(await readFile(resolve(source), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText
    await writeFile(join(root, target), code)
  }
  const fixture = join(root, 'fixture.mjs')
  await writeFile(fixture, `import {getHeapStatistics} from 'node:v8'; export function runCli() { process.stdout.write('HEAP_LIMIT='+getHeapStatistics().heap_size_limit+'\\n',()=>setTimeout(()=>process.exit(0),500)); }`)
  const runner = join(root, 'main.cjs')
  await writeFile(runner, `
const {app,BrowserWindow,utilityProcess}=require('electron');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {buildDisclaimedUtilityProcessSpec}=require('./utility.cjs');
app.setPath('userData',${JSON.stringify(join(root, 'profile'))});
const timeout=setTimeout(()=>{console.error('Native smoke timeout');app.exit(2)},30000);
app.whenReady().then(async()=>{
  const window=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
  await window.loadURL('data:text/html,<title>Stability verification</title><p>isolated</p>');
  const rendererHeap=await window.webContents.executeJavaScript('performance.memory.jsHeapSizeLimit');
  assert(Number.isFinite(rendererHeap) && rendererHeap>0, 'renderer default heap unavailable');
  const args=['--expose-internals',${JSON.stringify(resolve('build/harness-node-entry.mjs'))},${JSON.stringify(fixture)}];
  const env={...process.env,DSH_HOME:${JSON.stringify(join(root, 'harness'))}};
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  let child;
  if(process.platform==='darwin'){
    const spec=buildDisclaimedUtilityProcessSpec(args,{cwd:${JSON.stringify(root)},env},{disclaim:false});
    child=utilityProcess.fork(spec.modulePath,spec.args,spec.options);
  }else{
    child=spawn(process.execPath,args,{cwd:${JSON.stringify(root)},env:{...env,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true});
  }
  let output='';let errors='';
  child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>errors+=chunk);
  await new Promise((resolve,reject)=>{child.once('exit',code=>code===0?resolve():reject(Error('Harness exit '+code+': '+errors)));child.once('error',reject)});
  const heap=Number(output.match(/HEAP_LIMIT=(\\d+)/)?.[1]);
  assert(heap>0,'Missing Harness heap evidence: '+output+' '+errors);
  console.log(JSON.stringify({platform:process.platform,rendererHeap,harnessHeap:heap,customHeapLimit:false,isolatedProfile:true}));
  window.destroy();clearTimeout(timeout);app.quit();
}).catch(error=>{console.error(error);app.exit(1)});
`)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  delete env.NODE_OPTIONS
  const code = await new Promise((resolveCode, reject) => {
    const child = spawn(electron, [runner], { env, stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', resolveCode)
  })
  if (code !== 0) throw new Error(`Native stability verification exited ${code}`)
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 })
}
