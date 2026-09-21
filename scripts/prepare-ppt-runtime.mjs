/** Generate templates and assemble the installed PPT runtime from a clean staging root. */
import { rm, mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'

const outputRoot = path.resolve('.build/ppt-runtime')
const templateRoot = path.join(outputRoot, 'templates')

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve(script)], {
      stdio: 'inherit',
      env: { ...process.env, DSH_PPT_TEMPLATE_OUTPUT: templateRoot }
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(script + ' failed (' + (signal ?? ('exit ' + code)) + ')'))
    })
  })
}

await rm(outputRoot, { recursive: true, force: true })
await mkdir(templateRoot, { recursive: true })
for (const script of [
  'scripts/generate-zara-ppt-templates.mjs',
  'scripts/localize-ppt-templates.mjs',
  'scripts/enrich-ppt-templates.mjs',
  'scripts/build-ppt-runtime.mjs'
]) {
  await run(script)
}
