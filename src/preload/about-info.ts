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
      version: '0.7.1',
      date: '2026-08-26',
      items: [
        '新增跨模型联网搜索，在模型原生搜索不可用时自动回退到本地浏览器搜索',
        '内置 PPT Skill 升级至 1.0.6，并自动备份替换过期官方副本',
        '新增正式构建 Git 门禁，防止遗漏其他会话的已提交改动'
      ]
    },
    {
      version: '0.7.0',
      date: '2026-08-25',
      items: [
        '新增研究画布，与对话和轨迹并列切换',
        '新增关于页面，可查看当前版本和更新日志',
        '正式安装包内置 Memory、附件上传与工作区插件',
        '记忆、技能、待办与 Memory Evolve 设置仅在开发者模式显示'
      ]
    }
  ],
  en: [
    {
      version: '0.7.1',
      date: '2026-08-26',
      items: [
        'Added cross-model web search with automatic local-browser fallback when native search is unavailable',
        'Updated the bundled PPT Skill to 1.0.6 and added automatic backup and replacement of stale official copies',
        'Added formal-build Git gates to prevent committed work from other sessions being omitted'
      ]
    },
    {
      version: '0.7.0',
      date: '2026-08-25',
      items: [
        'Added a Research canvas alongside Chat and Trajectory',
        'Added an About page for the current version and release notes',
        'Bundled Memory, file upload, and workspace plugins in the formal installer',
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
