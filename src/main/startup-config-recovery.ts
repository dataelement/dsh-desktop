import { readFile } from 'node:fs/promises'
import type { MessageBoxOptions, OpenDialogOptions } from 'electron'
import { importStartupConfig, inspectStartupConfiguration, repairStartupConfig } from './state/startup-config-recovery'

interface ConfigRecoveryOperations {
  dshHome: string
  profile?: string
  environment: NodeJS.ProcessEnv
  launchDirectory?: string
  chinese: boolean
  beforeInspect?(): Promise<void>
  cancelled?(): boolean
  stop(): Promise<void>
  show(options: MessageBoxOptions): Promise<{ response: number }>
  selectFile(options: OpenDialogOptions): Promise<{ canceled: boolean; filePaths: string[] }>
  reveal(path: string): void
  note(message: string): void
}

/** Native dialogs stay usable even when both Harness and its renderer cannot start. */
export async function recoverStartupConfiguration(ops: ConfigRecoveryOperations): Promise<'retry' | 'continue'> {
  // Failed launches may still be rolling back a Profile; wait before reading or editing it.
  await ops.beforeInspect?.()
  const zh = ops.chinese
  let changed = false
  let notice = ''
  for (;;) {
    if (ops.cancelled?.()) return 'continue'
    const problem = (await inspectStartupConfiguration(ops.dshHome, ops.profile, ops.environment, ops.launchDirectory))[0]
    if (!problem) return changed ? 'retry' : 'continue'
    if (problem.kind === 'legacy-workflow' && problem.repair) {
      try {
        await ops.stop()
        const backup = await repairStartupConfig(ops.dshHome, problem)
        changed = true
        ops.note(`[desktop] configuration recovery auto-migrated legacy-workflow to workflow-ptc; backup: ${backup}`)
        continue
      } catch (error) {
        ops.note(`[desktop] configuration recovery auto-migration failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const repairLabel = problem.repair === 'replace-legacy'
      ? zh ? '升级工作流组件' : 'Upgrade Workflow Component'
      : problem.repair === 'disable-legacy'
        ? zh ? '备份并停用旧条目' : 'Back Up and Disable Legacy Entry'
        : problem.repair === 'reset-endpoint'
          ? zh ? '备份并恢复默认地址' : 'Back Up and Restore Default Endpoint'
          : zh ? '备份并修复' : 'Back Up and Repair'
    const actions = [
      ...(problem.repair ? [{ id: 'repair', label: repairLabel }] : []),
      ...(problem.path && !problem.manualOnly ? [{ id: 'import', label: zh ? '导入修正文件或备份' : 'Import Corrected File or Backup' }] : []),
      ...(problem.path ? [{ id: 'reveal', label: zh ? '定位原文件' : 'Reveal Original File' }] : []),
      { id: 'retry', label: zh ? '重新检查' : 'Check Again' },
      { id: 'continue', label: zh ? '返回' : 'Back' }
    ]
    const { response } = await ops.show({
      type: 'error', title: zh ? '启动配置恢复' : 'Startup Configuration Recovery',
      message: zh ? `配置需要处理：${problem.kind}` : `Configuration needs attention: ${problem.kind}`,
      detail: `${problem.source}\n${problem.path}\n${problem.detail}\n\n${notice}\n` +
        (zh ? '原文件会在任何修复前保留。未知格式不会自动重置。环境变量需在其来源处修改并重新启动应用。'
          : 'Every repair keeps the original file. Unknown formats are never reset. Correct environment variables at their source and restart the application.'),
      buttons: actions.map(action => action.label), cancelId: actions.length - 1,
      defaultId: actions.length - 1, noLink: true
    })
    const action = actions[response]?.id ?? 'continue'
    if (action === 'continue') return changed ? 'retry' : 'continue'
    if (action === 'reveal') { ops.reveal(problem.path); continue }
    if (action === 'retry') { changed = true; continue }
    try {
      await ops.stop()
      let backup: string
      if (action === 'repair') {
        backup = await repairStartupConfig(ops.dshHome, problem)
      } else {
        const selected = await ops.selectFile({
          title: zh ? '选择修正文件或有效备份' : 'Select a Corrected File or Valid Backup',
          properties: ['openFile'], filters: [{ name: 'Configuration', extensions: ['yaml', 'yml', 'json', 'bak'] }]
        })
        const path = selected.filePaths[0]
        if (selected.canceled || !path) continue
        backup = await importStartupConfig(ops.dshHome, problem.path, await readFile(path, 'utf8'))
      }
      changed = true
      notice = `${zh ? '已保留备份' : 'Backup retained'}: ${backup}`
      ops.note(`[desktop] configuration recovery ${problem.kind}; backup: ${backup}`)
    } catch (error) {
      // Error messages from this module name only paths/operations, never YAML values.
      notice = zh ? '恢复失败，原文件及备份已保留。请检查文件权限并重试。' : 'Recovery failed. Original files and backups are retained. Check permissions and retry.'
      ops.note(`[desktop] configuration recovery failed: ${error instanceof Error && 'code' in error ? String(error.code) : 'validation or concurrent change'}`)
    }
  }
}
