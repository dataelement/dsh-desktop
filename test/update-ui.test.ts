import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import type { UpdateStatus } from '../src/shared/contracts'
import {
  isUpdateDismissed,
  shouldShowUpdate,
  updateMessage
} from '../src/preload/update-view'

const downloading: UpdateStatus = {
  phase: 'downloading',
  currentVersion: '1.0.0',
  availableVersion: '1.1.0',
  percent: 42.2,
  manual: false
}

const downloaded: UpdateStatus = {
  phase: 'downloaded',
  currentVersion: '1.0.0',
  availableVersion: '1.1.0',
  manual: false
}

describe('desktop update card visibility', () => {
  it('shows automatic downloads but keeps automatic background checks quiet', () => {
    expect(shouldShowUpdate(downloading)).toBe(true)
    expect(
      shouldShowUpdate({ phase: 'checking', currentVersion: '1.0.0', manual: false })
    ).toBe(false)
    expect(
      shouldShowUpdate({ phase: 'checking', currentVersion: '1.0.0', manual: true })
    ).toBe(true)
  })

  it('keeps a dismissed version hidden while its download phase changes', () => {
    expect(isUpdateDismissed(downloading, '1.1.0')).toBe(true)
    expect(isUpdateDismissed({ ...downloading, availableVersion: '1.2.0' }, '1.1.0')).toBe(
      false
    )
  })

  it('dismisses a downloaded update when the user closes the card', () => {
    expect(isUpdateDismissed(downloaded, null)).toBe(false)
    expect(isUpdateDismissed(downloaded, '1.0.0')).toBe(false)
    expect(isUpdateDismissed(downloaded, '1.1.0')).toBe(true)
  })

  it('formats localized progress copy', () => {
    expect(updateMessage(downloading, 'zh')).toBe('正在下载更新 42%')
    expect(updateMessage(downloading, 'en')).toBe('Downloading update 42%')
  })
})

describe('secure update card wiring', () => {
  it('bundles a preload and mounts it without enabling Node in Harness', async () => {
    const [config, main, preload] = await Promise.all([
      readFile('electron.vite.config.ts', 'utf8'),
      readFile('src/main/index.ts', 'utf8'),
      readFile('src/preload/index.ts', 'utf8')
    ])

    expect(config).toContain('preload:')
    expect(main).toContain("preload: join(import.meta.dirname, '../preload/index.cjs')")
    expect(main).toContain('nodeIntegration: false')
    expect(preload).toContain("ipcRenderer.on('updates:status-changed'")
    expect(preload).toContain("ipcRenderer.invoke('updates:install')")
    expect(preload).toContain("'right:20px'")
    expect(preload).toContain("'bottom:20px'")
  })
})
