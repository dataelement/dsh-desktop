import { spawnSync } from 'node:child_process'
import { lstat, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Operator setup: a dedicated virtual environment, never the system Python.
// The installed interpreter is configured on the Office Host plugin.
const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
const root = option('--root'), python = option('--python') || (process.platform === 'win32' ? 'python' : 'python3')
if (!root || !path.isAbsolute(root)) throw new Error('Usage: node setup-runtime.mjs --root /absolute/office-state-root [--python /absolute/python3]')
const target = path.join(root, 'runtime')
try { await lstat(target); throw new Error(`Runtime already exists: ${target}. Preserve it or select a new root.`) } catch (error) { if (error.code !== 'ENOENT') throw error }
await mkdir(root, { recursive: true })
const run = argv => {
  const result = spawnSync(argv[0], argv.slice(1), { stdio: 'inherit', shell: false })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Runtime setup failed with exit ${result.status}`)
}
try {
  run([python, '-I', '-m', 'venv', target])
  const installed = path.join(target, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python3')
  run([installed, '-I', '-m', 'pip', 'install', '--disable-pip-version-check', '--no-input', '-r', fileURLToPath(new URL('../requirements.txt', import.meta.url))])
  run([installed, '-I', '-c', 'import openpyxl; assert openpyxl.__version__ == "3.1.5"; print("Office Python ready: openpyxl " + openpyxl.__version__)'])
  console.log(JSON.stringify({ python: installed }))
} catch (error) {
  await rm(target, { recursive: true, force: true }); throw error
}
