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
type ManualUpdateChecker = () => Promise<UpdateStatus>

const releaseNotes: Record<SherlockAboutLocale, SherlockReleaseNote[]> = {
  zh: [
    {
      version: '0.7.3',
      date: '2026-08-27',
      items: [
        '移除 Memory Evolve 插件及其自动注入的记忆与待办提示',
        '升级时自动替换内置插件配置并卸载旧插件，同时保留用户数据与回滚备份'
      ]
    },
    {
      version: '0.7.2',
      date: '2026-08-26',
      items: [
        '新增关于页手动检查更新，并在下载完成后自动退出终端、安装和重启',
        '优化侧栏更新按钮的悬停提示与圆环下载进度',
        '汉化权限菜单，并支持为模型标记视觉输入能力'
      ]
    },
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
        '内部记忆、技能与待办页面仅在开发者模式显示'
      ]
    }
  ],
  en: [
    {
      version: '0.7.3',
      date: '2026-08-27',
      items: [
        'Removed Memory Evolve and its automatically injected memory and todo prompts',
        'Upgrades now replace the bundled plugin profile and uninstall retired plugins while preserving user data and a rollback backup'
      ]
    },
    {
      version: '0.7.2',
      date: '2026-08-26',
      items: [
        'Added manual update checks in About, with automatic terminal shutdown, installation, and restart after download',
        'Improved the sidebar update control with a hover label and circular download progress',
        'Localized permission modes and added per-model Vision capability settings'
      ]
    },
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
        'Limited internal Memory, Skills, and Todos pages to developer mode'
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
  checkForUpdates: ManualUpdateChecker,
  locale: SherlockAboutLocale
): {
  getInfo(): Promise<SherlockAboutInfo>
  checkForUpdates(): Promise<UpdateStatus>
} {
  return Object.freeze({
    async getInfo(): Promise<SherlockAboutInfo> {
      const status = await readUpdateStatus()
      return buildSherlockAboutInfo(status.currentVersion, locale)
    },
    checkForUpdates(): Promise<UpdateStatus> {
      return checkForUpdates()
    }
  })
}
import type { UpdateStatus } from '../shared/contracts'
