import { beforeEach, expect, it, vi } from 'vitest'
import { desktopDailyText } from '../../src/shared/desktop-daily-messages'
import type { DesktopLocale } from '../../src/shared/desktop-locale'
import { presentMobilePairing } from '../../src/main/shell/mobile-window'

const native = vi.hoisted(() => ({ showMessageBox: vi.fn(async () => ({ response: 0 })) }))
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(), dialog: { showMessageBox: native.showMessageBox }, nativeTheme: { shouldUseDarkColors: false }
}))
vi.mock('../../src/main/security', () => ({ secureWindow: vi.fn() }))
const locales: DesktopLocale[] = ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt']
beforeEach(() => native.showMessageBox.mockClear())
it.each(locales)('localizes the daily mobile startup feedback in %s without opening a pairing page', async locale => {
  // Host readiness is checked before the bridge is used.
  const bridge = {} as Parameters<typeof presentMobilePairing>[0]['bridge']
  expect(await presentMobilePairing({ bridge, locale, hostReady: false })).toBeUndefined()
  expect(native.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
    message: desktopDailyText(locale, 'mobileStarting'), detail: desktopDailyText(locale, 'mobileWait')
  }))
  for (const key of ['trayShow', 'appInstallFailed', 'repairNotReady', 'repairOpenFailed', 'mobileWindowTitle', 'harnessStopFailed'] as const) {
    expect(desktopDailyText(locale, key)).toBeTruthy()
  }
})
