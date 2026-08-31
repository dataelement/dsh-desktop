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
      version: '0.7.5',
      date: '2026-08-31',
      items: [
        '侧栏新增并排的“新对话”和“新研究”入口，“新研究”可直接创建并进入研究模式',
        '优化研究组件引用标签：选择组件后先以半透明状态提示，取消选择会自动移除，点击输入区后则固定保留',
        '进一步放宽研究画布的缩小范围，并在视口偏离内容时提供快速回到内容的入口',
        '新增简洁的 Sherlock 启动动画，改善客户端启动时的视觉衔接',
        '修复“新研究”首屏画布、顶栏和右侧对话区布局异常，并使用专用研究图标',
        '修复研究画布中 PDF 已加载但页面显示为空白的问题'
      ]
    },
    {
      version: '0.7.4',
      date: '2026-08-31',
      items: [
        '统一 Sherlock Agent 品牌表述，并修正部分会话中用户消息与助手回复的显示顺序',
        '修复退出客户端时访问已销毁窗口导致的 JavaScript 报错',
        '完善研究画布引用交互：点击文件、PPT 或助手回复组件即可选中并作为输入标签引用，PPT 组件不再显示下载按钮',
        '优化研究输入标签：支持在标签之间准确放置光标，清晰显示输入位置，并消除选中时的抖动和位移',
        '输入框可随内容行数自适应增高，画布中的助手回复内容支持直接编辑',
        '对话和研究模式统一使用文件标签：按类型显示图标，悬停可查看包含后缀的完整文件名，并在发送时保留完整路径',
        '完整汉化权限菜单，并优化研究组件、侧栏和输入框的交互细节'
      ]
    },
    {
      version: '0.7.3',
      date: '2026-08-28',
      items: [
        '新增完整研究模式：中央画布与右侧固定对话协同工作，支持文件拖入、框选、多选、移动和删除',
        '文件标签可与输入文字混合编辑，支持拖动排序、选中、键盘删除并随消息发送',
        '升级画布可视化组件：支持图片、PDF 连续滚动、HTML 交互以及 Word、Excel、PPT、Markdown 和代码预览',
        '支持调整画布组件尺寸与名称，并同步更新输入框中的附件标签',
        '优化对话、研究与轨迹页的输入框、滚动、菜单层级、加载状态和响应式布局',
        '修复旧对话模型选择丢失，并移除 Memory Evolve 与 Hindsight 记忆插件及其工具调用'
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
      version: '0.7.5',
      date: '2026-08-31',
      items: [
        'Added separate New Chat and New Research sidebar actions, with New Research opening directly in Research mode',
        'Refined Research reference tags with a provisional translucent state, automatic removal on deselection, and persistent tags after focusing the composer',
        'Expanded the Research canvas zoom-out range and added a quick way to return to content when the viewport drifts away',
        'Added a restrained Sherlock launch animation for a smoother transition into the client',
        'Fixed the New Research first-screen canvas, header, and right-side conversation layout, and added a dedicated Research icon',
        'Fixed blank PDF pages in the Research canvas after successful document loading'
      ]
    },
    {
      version: '0.7.4',
      date: '2026-08-31',
      items: [
        'Standardized Sherlock Agent branding and fixed the display order of user messages and assistant replies in affected conversations',
        'Fixed a JavaScript error caused by accessing a destroyed window while quitting the client',
        'Improved Research canvas references: click a file, PowerPoint, or assistant reply component to select and cite it as an input tag, while PowerPoint components no longer show a download button',
        'Improved Research input tags with precise caret placement between tags, a clearly visible insertion point, and stable selection without jitter or displacement',
        'Made the composer grow with its content and added direct editing for assistant reply components on the canvas',
        'Unified file tags across Chat and Research with file-type icons, delayed full-name tooltips including extensions, and preserved full paths on send',
        'Completed permission-menu localization and refined Research components, the sidebar, and composer interactions'
      ]
    },
    {
      version: '0.7.3',
      date: '2026-08-28',
      items: [
        'Added a complete Research mode with a central canvas, fixed right-side conversation, file drops, marquee selection, multi-select, movement, and deletion',
        'File tags now mix naturally with typed text and support drag reordering, selection, keyboard deletion, and message attachments',
        'Expanded visual canvas components with images, continuous PDF scrolling, interactive HTML, and Word, Excel, PowerPoint, Markdown, and code previews',
        'Added resizable and renameable canvas components with synchronized attachment tag names',
        'Improved composer layout, scrolling, menu layering, loading states, and responsive behavior across Chat, Research, and Trajectory',
        'Fixed missing model selections in existing conversations and removed Memory Evolve, Hindsight, and their memory tool calls'
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
