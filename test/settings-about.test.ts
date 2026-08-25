import { describe, expect, it } from 'vitest'

describe('Sherlock About information', () => {
  it('builds the approved release-notes page around the runtime version', async () => {
    const about = await import('../src/preload/about-info').catch(() => null)

    expect(about).not.toBeNull()
    if (about === null) return

    const info = about.buildSherlockAboutInfo('9.8.7', 'zh')
    expect(info.productName).toBe('Sherlock')
    expect(info.version).toBe('9.8.7')
    expect(info.releaseNotes[0]).toMatchObject({
      version: '0.7.0',
      date: '2026-08-25',
      items: expect.arrayContaining([
        '新增研究画布，与对话和轨迹并列切换',
        '新增关于页面，可查看当前版本和更新日志',
        '正式安装包内置 Memory、附件上传与工作区插件'
      ])
    })

    const bridge = about.createSherlockAboutBridge(
      async () => ({ currentVersion: '7.6.5' }),
      'zh'
    )
    expect((await bridge.getInfo()).version).toBe('7.6.5')
  })
})
