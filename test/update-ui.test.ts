import { describe, expect, it } from 'vitest'
import type { UpdateStatus } from '../src/shared/contracts'
import {
  isUpdateDismissed,
  shouldShowUpdate,
  updateHeadline,
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

describe('downgrade copy', () => {
  it('names the downgrade in both locales', () => {
    const status: UpdateStatus = {
      phase: 'downloading',
      currentVersion: '1.5.0',
      availableVersion: '1.2.0',
      manual: true,
      downgrade: true,
      percent: 30
    }
    expect(updateHeadline(status, 'zh').title).toContain('降级')
    expect(updateMessage(status, 'zh')).toContain('1.2.0')
    expect(updateHeadline(status, 'en').title.toLowerCase()).toContain('downgrad')
    expect(updateMessage(status, 'en')).toContain('1.2.0')
  })
})

describe('accepting an update is what starts the download', () => {
  it('asks rather than announcing a download already under way', () => {
    const available: UpdateStatus = {
      phase: 'available',
      currentVersion: '0.4.3',
      availableVersion: '0.4.4',
      manual: false
    }
    expect(updateMessage(available, 'zh')).toBe('发现新版本 0.4.4，是否更新？')
    expect(updateMessage(available, 'en')).toBe('DSH Desktop 0.4.4 is available. Update now?')
  })
})

