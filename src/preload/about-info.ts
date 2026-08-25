export type SherlockAboutLocale = 'zh' | 'en'

export type SherlockReleaseNote = {
  version: string
  date: string
  items: string[]
}

export type SherlockAboutInfo = {
  productName: 'Sherlock'
  version: string
  releaseNotes: SherlockReleaseNote[]
}

type UpdateVersionReader = () => Promise<{ currentVersion: string }>

const releaseNotes: Record<SherlockAboutLocale, SherlockReleaseNote[]> = {
  zh: [
    {
      version: '0.6.7',
      date: '2026-08-25',
      items: [
        '新增研究画布，与对话和轨迹并列切换',
        '新增关于页面，可查看当前版本和更新日志',
        '记忆、技能、待办与 Memory Evolve 设置仅在开发者模式显示'
      ]
    }
  ],
  en: [
    {
      version: '0.6.7',
      date: '2026-08-25',
      items: [
        'Added a Research canvas alongside Chat and Trajectory',
        'Added an About page for the current version and release notes',
        'Limited Memory, Skills, Todos, and Memory Evolve Settings to developer mode'
      ]
    }
  ]
}

export function buildSherlockAboutInfo(
  version: string,
  locale: SherlockAboutLocale
): SherlockAboutInfo {
  return {
    productName: 'Sherlock',
    version,
    releaseNotes: releaseNotes[locale].map((note) => ({
      ...note,
      items: [...note.items]
    }))
  }
}

export function createSherlockAboutBridge(
  readUpdateStatus: UpdateVersionReader,
  locale: SherlockAboutLocale
): { getInfo(): Promise<SherlockAboutInfo> } {
  return Object.freeze({
    async getInfo(): Promise<SherlockAboutInfo> {
      const status = await readUpdateStatus()
      return buildSherlockAboutInfo(status.currentVersion, locale)
    }
  })
}
