import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { expect, it } from 'vitest'
import { nativeLocaleRelaunchArguments } from '../../src/main/shell/native-locale'
import { DESKTOP_LOCALES, desktopLocale, nativeLanguage } from '../../src/shared/desktop-locale'

const enabled = process.platform === 'darwin' && process.env.DSH_TEST_NATIVE_LOCALE_ELECTRON === '1'

it.skipIf(!enabled)('passes the selected language to a real Cocoa application domain', async () => {
  const electron: unknown = createRequire(import.meta.url)('electron')
  if (typeof electron !== 'string') throw new Error('Electron executable is required')
  const root = await mkdtemp(join(tmpdir(), 'dsh-native-locale-'))
  const entry = join(root, 'fixture.cjs')
  await writeFile(entry, `
    const { app, systemPreferences } = require('electron')
    app.setPath('userData', ${JSON.stringify(join(root, 'user-data'))})
    app.whenReady().then(() => {
      console.log('NATIVE-LOCALE ' + JSON.stringify({
        locale: app.getLocale(),
        languages: systemPreferences.getUserDefault('AppleLanguages', 'array')
      }))
      app.quit()
    }).catch(error => { console.error(error); app.exit(1) })
  `)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  for (const locale of DESKTOP_LOCALES) {
    const result = spawnSync(electron, nativeLocaleRelaunchArguments([electron, entry], locale), {
      cwd: root, env, encoding: 'utf8', timeout: 15_000
    })
    const evidence = result.stdout + '\n' + result.stderr
    expect(result.error, evidence).toBeUndefined()
    expect(result.status, evidence).toBe(0)
    const line = result.stdout.split('\n').find(row => row.startsWith('NATIVE-LOCALE '))
    expect(line, evidence).toBeDefined()
    const observed: { locale: string; languages: string[] } = JSON.parse(line?.slice('NATIVE-LOCALE '.length) ?? 'null')
    expect(desktopLocale(observed.locale)).toBe(locale)
    expect(observed.languages).toEqual([nativeLanguage(locale)])
  }
  // Keep isolated evidence directories for diagnosing native process failures.
}, 35_000)

it.skipIf(!enabled)('calibrates auto on two independent cold launches and preserves its saved preference', async () => {
  const electron: unknown = createRequire(import.meta.url)('electron')
  if (typeof electron !== 'string') throw new Error('Electron executable is required')
  const root = await mkdtemp(join(tmpdir(), 'dsh-native-relaunch-'))
  const entry = join(root, 'relaunch.cjs')
  const home = join(root, 'home')
  const patchPath = join(home, 'profiles', 'desktop', 'cordis.patch.yml')
  const patch = '- id: locale\n  config:\n    preference: auto\n'
  await mkdir(join(home, 'profiles', 'desktop'), { recursive: true })
  await writeFile(patchPath, patch)
  await build({
    stdin: { resolveDir: process.cwd(), loader: 'ts', contents: `
      import { app } from 'electron'
      import { writeFileSync } from 'node:fs'
      import { nativeLocaleRelaunchArguments, shouldCalibrateNativeLocale } from ${JSON.stringify(resolve('src/main/shell/native-locale.ts'))}
      import { savedDesktopLocaleValue } from ${JSON.stringify(resolve('src/main/shell/desktop-locale-preference.ts'))}
      import { effectiveNativeLocale } from ${JSON.stringify(resolve('src/shared/desktop-locale.ts'))}
      app.setPath('userData', ${JSON.stringify(join(root, 'profile'))})
      if (!app.requestSingleInstanceLock()) app.exit(2)
      app.whenReady().then(async () => {
        const actual = app.getLocale()
        const preference = effectiveNativeLocale(await savedDesktopLocaleValue(${JSON.stringify(home)}, 'desktop'), app.getPreferredSystemLanguages())
        if (preference && shouldCalibrateNativeLocale({ platform: process.platform, preference, actual, argv: process.argv })) {
          app.relaunch({ args: nativeLocaleRelaunchArguments(process.argv, preference) })
          app.quit()
          return
        }
        writeFileSync(process.env.DSH_LOCALE_EVIDENCE, JSON.stringify({ actual, safe: process.argv.includes('--safe-mode') }))
        app.quit()
      })
    ` }, bundle: true, platform: 'node', format: 'cjs', external: ['electron'], outfile: entry
  })
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  for (const launch of [1, 2]) {
    const evidence = join(root, `evidence-${launch}.json`)
    // Simulate a fresh Finder launch each time: no calibration attempt or prior
    // Japanese argument is carried over. Korean is the native first preference.
    const result = spawnSync(electron, [entry, '--safe-mode', '-AppleLanguages', '(ko, ja)'], {
      env: { ...env, DSH_LOCALE_EVIDENCE: evidence }, cwd: root, encoding: 'utf8', timeout: 15000
    })
    expect(result.status, result.stdout + result.stderr).toBe(0)
    const started = Date.now()
    let observed: string | undefined
    while (Date.now() - started < 10000) {
      try { observed = await readFile(evidence, 'utf8'); break } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    expect(observed).toBeDefined()
    expect(JSON.parse(observed ?? '{}')).toEqual({ actual: 'ja', safe: true })
    expect(await readFile(patchPath, 'utf8')).toBe(patch)
  }
}, 35000)
