import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { MenuItemConstructorOptions } from 'electron'
import { disableProfilePlugin, enableProfilePlugin } from './state/plugin-disable'
import { readRepairJournal } from './state/repair-job'
import type { PluginRecoveryCheck } from './plugin-recovery-market'
import type { PluginUpgradeCandidate } from './state/plugin-market-check'

export const DEMO_PLUGIN = 'dsh-demo-startup-failure'
const OWNER = 'dsh-desktop-development-repair-demo-v1'
const SOURCE = "export const name = 'demo-startup-failure';\nexport function apply() { throw new Error('[DEMO] Local repair demonstration: intentional startup failure'); }\n"
const PATCH = '- insert:\n    - id: demo-startup-failure\n      name: dsh-demo-startup-failure\n'
interface DemoOptions {
  enabled: boolean
  profile: string
  dshHome: string
  restartNormal: () => Promise<unknown>
  showUnknownRecovery: () => Promise<unknown>
  openNormalRepair: () => Promise<unknown>
  openSafeRepair: () => Promise<unknown>
  note: (message: string) => unknown
}

/** Explicit opt-in only; this module never selects or modifies a normal user Profile. */
export function createDevelopmentRepairDemo(options: DemoOptions) {
  if (!options.enabled || process.env.DSH_DEV_REPAIR_DEMO !== '1' ||
    !/^[a-zA-Z0-9_-]*repair-demo[a-zA-Z0-9_-]*$/.test(options.profile) ||
    !resolve(options.dshHome).split(sep).includes(options.profile)) return undefined
  const home = resolve(options.dshHome)
  const profileDirectory = join(home, 'profiles', 'web')
  const fixture = join(profileDirectory, 'node_modules', DEMO_PLUGIN)
  let busy = false
  let rollbackOutcome: 'success' | 'failure' | undefined

  async function guard(path: string) {
    const relative = path.slice(home.length + 1)
    if (!path.startsWith(`${home}${sep}`) || relative.split(sep).includes('..')) throw new Error('Demo path outside dedicated Profile')
    // Reject symlinks at every existing ancestor, not just at the fixture leaf.
    let current = home
    for (const part of ['', ...relative.split(sep)]) {
      if (part) current = join(current, part)
      try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Demo refuses symlink: ${current}`) }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    }
    const physicalHome = await realpath(home)
    if (physicalHome !== home) throw new Error('Demo home must be a physical dedicated directory')
  }
  async function atomic(path: string, content: string) {
    await guard(path)
    await mkdir(resolve(path, '..'), { recursive: true })
    try {
      const previous = await readFile(path)
      const backup = `${path}.repair-demo-backup-${randomUUID()}`
      const temporaryBackup = `${backup}.tmp`
      await writeFile(temporaryBackup, previous, { flag: 'wx', mode: 0o600 })
      await rename(temporaryBackup, backup)
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    const temporary = `${path}.${randomUUID()}.tmp`
    await writeFile(temporary, content, { flag: 'wx', mode: 0o600 })
    await rename(temporary, path)
  }
  async function owned(): Promise<Record<string, unknown> | undefined> {
    await guard(join(fixture, 'package.json'))
    try {
      const manifest = JSON.parse(await readFile(join(fixture, 'package.json'), 'utf8'))
      if (manifest.name !== DEMO_PLUGIN || manifest.repairDemoOwner !== OWNER ||
        !['1.0.0', '2.0.0'].includes(manifest.version) ||
        await readFile(join(fixture, 'index.js'), 'utf8') !== SOURCE ||
        await readFile(join(fixture, 'cordis.patch.yml'), 'utf8') !== PATCH) throw new Error('Refusing to overwrite an unowned demo plugin')
      return manifest
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        try { await lstat(fixture) } catch (absent) { if ((absent as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw absent }
      }
      throw error
    }
  }
  async function install() {
    await owned()
    const manifestPath = join(profileDirectory, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    if (!manifest.dsh?.profile || !Array.isArray(manifest.dsh.profile.bundles)) throw new Error('Dedicated runtime Profile is not ready')
    if (manifest.dependencies?.[DEMO_PLUGIN] && manifest.dependencies[DEMO_PLUGIN] !== `file:node_modules/${DEMO_PLUGIN}`) throw new Error('Existing demo dependency is not owned')
    await atomic(join(fixture, 'package.json'), JSON.stringify({ name: DEMO_PLUGIN, version: '1.0.0', private: true, type: 'module', main: './index.js', repairDemoOwner: OWNER, dsh: { bundle: { patch: 'cordis.patch.yml' } } }, null, 2))
    await atomic(join(fixture, 'index.js'), SOURCE)
    await atomic(join(fixture, 'cordis.patch.yml'), PATCH)
    manifest.dependencies = { ...manifest.dependencies, [DEMO_PLUGIN]: `file:node_modules/${DEMO_PLUGIN}` }
    if (!manifest.dsh.profile.bundles.includes(DEMO_PLUGIN)) manifest.dsh.profile.bundles.push(DEMO_PLUGIN)
    await atomic(manifestPath, JSON.stringify(manifest, null, 2))
    for (const file of ['cordis.patch.yml', '.dsh-market/state.json']) {
      const path = join(profileDirectory, file)
      try { await atomic(path, await readFile(path, 'utf8')) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    }
    const result = await enableProfilePlugin(home, DEMO_PLUGIN)
    if (!result.ok) throw new Error(result.detail)
    const journal = await readRepairJournal(home)
    const attempts = journal.attempts.filter(entry => entry.status === 'verified' || !entry.plugins.includes(DEMO_PLUGIN))
    if (attempts.length !== journal.attempts.length) await atomic(join(home, 'repair-journal.json'), JSON.stringify({ attempts }))
    await options.restartNormal()
  }
  function item(label: string, action: () => Promise<unknown>): MenuItemConstructorOptions {
    return { label, click: async () => {
      if (busy) return
      busy = true
      try { await action() } catch (error) { options.note(`维修演示失败：${error instanceof Error ? error.message : String(error)}`) }
      finally { busy = false }
    } }
  }
  return {
    menu: [
      item('1. 模拟插件阻断启动（真实故障）', async () => { rollbackOutcome = undefined; await install() }),
      item('2. 预览未知启动错误（模拟证据）', async () => { options.note('这是未知错误证据预览，并非实际发生的崩溃。'); await options.showUnknownRecovery() }),
      item('3. 清除演示故障并正常重启', async () => {
        rollbackOutcome = undefined
        if (await owned()) {
          for (const file of ['cordis.patch.yml', '.dsh-market/state.json']) {
            const path = join(profileDirectory, file)
            try { await atomic(path, await readFile(path, 'utf8')) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
          }
          const result = await disableProfilePlugin(home, DEMO_PLUGIN)
          if (!result.ok) throw new Error(result.detail)
        }
        await options.restartNormal()
      }),
      item('4. 打开正常环境维修 Agent', options.openNormalRepair),
      item('5. 打开安全模式维修 Agent', options.openSafeRepair),
      item('6. 模拟应用版本回退成功', async () => { rollbackOutcome = 'success'; await install() }),
      item('7. 模拟应用版本回退失败', async () => { rollbackOutcome = 'failure'; await install() })
    ],
    rollbackTarget() { return rollbackOutcome ? '0.12.0' : undefined },
    async simulateRollback() {
      const outcome = rollbackOutcome
      if (!outcome) throw new Error('Rollback simulation is not armed')
      rollbackOutcome = undefined
      if (outcome === 'failure') throw new Error('[模拟] 应用版本回退失败；实际应用版本和用户数据未更改。')
      if (!await owned()) throw new Error('Owned demonstration fixture is missing')
      const result = await disableProfilePlugin(home, DEMO_PLUGIN)
      if (!result.ok) throw new Error(result.detail)
    },
    async checkPlugin(packageName: string): Promise<PluginRecoveryCheck | undefined> {
      if (packageName !== DEMO_PLUGIN) return undefined
      const manifest = await owned()
      if (!manifest) return undefined
      return { packageName, hint: '本地演示插件：模拟升级后仍故障，下一轮停用。', removalRecommended: true,
        ...(manifest.version === '1.0.0' ? { upgradeCandidate: { packageName, installedVersion: '1.0.0', targetVersion: '2.0.0', upgradeHint: '本地模拟升级（非市场下载）' } } : {}) }
    },
    async upgradePlugin(candidate: PluginUpgradeCandidate): Promise<{ ok: boolean; detail?: string } | undefined> {
      if (candidate.packageName !== DEMO_PLUGIN || candidate.targetVersion !== '2.0.0') return undefined
      const manifest = await owned()
      if (!manifest) return { ok: false, detail: '演示插件不存在' }
      await atomic(join(fixture, 'package.json'), JSON.stringify({ ...manifest, version: '2.0.0' }, null, 2))
      return { ok: true, detail: '已执行本地模拟升级；故意保留故障以演示下一轮停用。' }
    }
  }
}
