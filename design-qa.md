# 研究模式全局右栏与画布文件设计 QA

## 设计基线

- 研究模式成品参考：`/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-310aa5f4-0744-4807-b91a-f143b116f511.png`。
- 对话模式全局侧边栏顶栏参考：`/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-44e987c8-76f5-4c9c-a2c9-b18f61d47e87.png`。
- 窄屏问题参考：`/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-1deab8b3-3fdf-4558-b2e0-80cf70dd1033.png`。
- 当前宽屏实机图：`/tmp/sherlock-research-global-wide.png`，1178 × 768 px。
- 当前窄屏实机图：`/tmp/sherlock-research-global-narrow.png`，900 × 768 px。
- 精确应用路径：`/Users/heyafeng/Documents/ChatGPT/dsh/.worktrees/research-canvas-file-drop/dist-notarized/mac-arm64/Sherlock.app`。

## 全局右侧栏

- Research 不再创建私有右栏，而是复用 `dsh-better-sidebar` 的全局页签、分栏、折叠和宽度状态。
- 进入 Research 自动展开右栏；离开时恢复进入前的页签、开关和宽度状态。
- `对话` 固定在最左侧，不能关闭、不能拖动；现有 `Files` 及后续页签排列在它后面，仍使用原有关闭和新建页签交互。
- 真实应用可访问性树顺序为 `对话`、`Files`、`新建标签页`；关闭按钮只属于 `Files`，`对话` 没有关闭控件。
- 消息历史、执行过程、消息动作、统计和同一个 composer 完整迁入右栏；中央只保留点阵画布，不再出现底部重复输入框。

## 画布文件与输入附件

- 画布文件支持单选、Shift/Command 增选、空白区域框选、多选、单卡拖动和整组拖动，位置及选择状态按会话持久化。
- 选中的文件同步为输入框附件标签；标签仅保留文件名和删除按钮，不再显示左右移动箭头。标签可直接拖动排序，删除标签只取消本次附件，不会删除画布节点或磁盘文件。
- 已选画布节点支持 `Delete` / `Backspace` 删除，也支持右键 `从画布删除`；删除只更新画布状态，不会删除源文件。
- 实机已验证右键菜单准确显示 `从画布删除`，并已通过 `Delete` 删除测试卡片；源目录临时测试文件随后清理，未发生磁盘联动删除。
- Computer Use 无法稳定构造 Electron 自定义 `DataTransfer` MIME，因此 Finder/Files → 画布拖入和真实文件标签的像素状态未冒充为实机自动验证；对应行为由聚焦测试覆盖，当前测试包保持打开供手动拖入复核。

## 响应式比较

- 在与窄屏参考同一比较输入中检查当前 900 × 768 实机图：右栏内容自然换行，长路径限制在消息列内，动作行和输入框不再互相覆盖。
- 窄窗时左侧工作区导航自动收为图标栏，中央画布仍保有可操作宽度；右栏保持统一顶栏和固定底部 composer。
- 输入框内模型、上下文、访问模式和发送按钮在可用宽度内收缩；状态统计允许裁切/省略，不侵入消息动作区。
- 宽屏下右栏默认宽度与参考一致地保持稳定，中央画布吸收额外空间；没有重复页签、重复 composer 或水平滚动条。

## 运行时修复与验证

1. 修复可选全局侧栏过早注入导致 session chat store 重复挂载、应用进入 Harness recovery 的问题；共享 store seat 完成挂载后才接入侧栏。
2. 修复对话内容直接跨 React 根渲染导致 `slot machinery rendered outside the installed renderer tree`；现在由原会话树创建 portal，右栏仅提供宿主节点。
3. 为打包插件增加内容指纹；插件代码变化即重新安装用户 profile，避免 manifest/version 未变时继续加载旧实现。
4. 为已有的可关闭 `对话` 页签增加启动时协调：重新落位到右侧第一个 pane，并更新为固定、不可关闭状态。
5. 聚焦测试：`research-file-drop`、`sherlock-composer-workspace-ui`、`desktop-shell-controls`、`bundled-plugin-profile` 共 107/107 通过。
6. `npm run typecheck`、`git diff --check`、应用签名验证均通过；构建明确跳过 Apple 公证，没有上传、改版本或修改公开更新源。

## 视觉结论

- 现有 Sherlock 深色 token、字体、间距、图标和页签顶栏均直接复用，没有引入第二套研究侧栏视觉。
- 当前实现解决了参考图 3 中统计信息遮挡消息动作、输入区在窄栏中挤压的主要问题。
- 同画面对照未发现残留 P0/P1/P2：无裁切正文、无错误页、无重复输入、无可关闭的固定对话页签、无窄屏横向溢出。

final result: passed

## 研究画布选中内容生成工具栏 QA（2026-08-31）

### 比较证据

- Source visual truth: `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-2b9becae-be06-4343-bfce-365bbc4b02e4.png`，556 × 328 px。
- Rendered implementation: `/tmp/sherlock-research-selection-toolbar-final-622d9ccc.jpeg`，1178 × 768 px；真实本地包 `/Users/heyafeng/Documents/ChatGPT/dsh/.worktrees/integration-20260831-03/dist-notarized/mac-arm64/Sherlock.app`，集成提交 `622d9ccc6f1b97d273492207aecdb3ffd65a73ec`，版本 0.7.5。
- Viewport: Sherlock 标准窗口 1178 × 768 CSS px；系统截图为 1178 × 768 px，device density normalization 为 1:1。参考图没有可验证的 CSS viewport，因此只比较组件结构、位置、密度、字体层级、图标风格和表面处理，不虚构逐像素比例结论。
- State: Research 深色主题；一个完整可见的 PDF 组件处于选中状态，工具栏位于选择框上方。参考图为浅色主题且包含更多通用画布操作；本实现按用户范围只预置“生成思维导图”“总结提炼”。
- Full-view comparison: 参考图与实机图已在同一比较输入中以原始分辨率并列检查。实机保留右侧共享对话区、点阵画布和选中描边；工具栏没有挤压或遮挡持久控件。
- Focused-region comparison: 未另做裁切。两张原始图中的工具栏文字、16 px 图标、边框、圆角、间距和阴影均可直接辨认，继续裁切不会增加判断信息。

### Findings

- 没有残留 P0/P1/P2。工具栏以 42 px 高、13 px 圆角、细边框和轻阴影呈现，中心对齐在选区上方；两个操作均使用 Sherlock 现有图标库与字体 token。深色实现与浅色参考的色面差异来自当前用户主题，语义层级和对比度一致。
- 字体与排版：13 px 强调字重、图文 6 px 间距，两个中文标签完整显示，无截断、异常换行或字重漂移。
- 间距与布局：工具栏与选择框保持约 8–10 px 间隔；滚动画布后继续跟随选区。选区贴近或越出视口上缘时，工具栏会优先保持可见，这是有意的边界约束，不作为与完整可见参考状态的视觉偏差。
- 颜色与 token：深色背景、悬浮表面、边框、文本和蓝色选中描边均复用现有 Sherlock token；未引入第二套颜色体系。
- 图像与资产：本功能没有新增产品图像；两个图标使用 `IconBranchOutline16` 和 `IconListPenOutline16`，没有自绘 SVG、Emoji 或占位资产。
- 文案与内容：“生成思维导图”“总结提炼”与用户指定文案一致；`aria-label` 与可见文本一致。

### Open Questions

- 无。参考图中的其他通用操作不在本次范围内，未复制到 Sherlock。

### Implementation Checklist

- [x] 单选组件后显示工具栏；点击画布空白处后隐藏。
- [x] 框选多组件、选择包围盒与工具栏显隐由聚焦 DOM 测试覆盖。
- [x] 两项操作进入现有会话队列且不替换未发送草稿。
- [x] 加载、完成、失败、原位重试和重启中断恢复均由聚焦测试覆盖。
- [x] 思维导图层级节点/连接结构和总结富文本渲染均由聚焦测试覆盖。
- [x] 本地包校验、Developer ID 签名和真实 Sherlock 主界面检查通过；明确跳过 Apple 公证、上传、版本变化和源码推送。

### Comparison History

- Pass 1: 初次实机捕获时选中组件本身越出画布上缘，工具栏按可见性约束落在组件可见区域内；该状态与参考图的完整可见选区不等价，没有据此提出错误的像素偏差。
- Normalization: 通过画布滚动让同一组件完整进入视口，再次选择并捕获 `/tmp/sherlock-research-selection-toolbar-final-622d9ccc.jpeg`。
- Pass 2: 在等价的完整可见选区状态下，未发现可操作 P0/P1/P2；没有因视觉比较而修改实现。

### Follow-up Polish

- 无阻塞项。若以后扩展第三个以上动作，可沿用同一高度和分组节奏，并在窄视口验证水平碰撞策略。

final result: passed

## Research canvas visual components QA (2026-08-28)

- Exact packaged app: `/Users/heyafeng/Documents/ChatGPT/dsh/.worktrees/research-canvas-file-drop/dist-notarized/mac-arm64/Sherlock.app` (`0.7.3`). The app was built and launched with `./script/build_and_run.sh --verify`; Apple notarization, uploads, the public update feed, version changes, tags, and pushes were intentionally skipped.
- Real packaged new-conversation proof: `/tmp/sherlock-new-conversation-qa.jpeg`. The centered composer keeps the established 780 px card width, the Sherlock logo and loading treatment remain present, and the composer stays anchored instead of joining page scroll.
- Real packaged Research proof: `/tmp/sherlock-research-conversation-qa.jpeg`. Research uses the global right sidebar, keeps `对话` pinned first, shows the selected canvas attachment as an inline composer tag, and renders one 102 px composer card without a second attachment area.
- Real packaged Files proof: `/tmp/sherlock-research-files-qa.jpeg`. The global `Files` tab lists the active workspace files and each file row exposes the packaged draggable source contract; the center remains a pure canvas.
- Live production-frontend rich-message proof: `/tmp/sherlock-research-rich-assistant-qa.jpeg`, served by the packaged app at `127.0.0.1:52220`. `添加到画布` created a 360 × 672 assistant component whose body retained the complete Markdown paragraphs, emphasis, path, table, and source affordance instead of truncating to a summary.
- Exact live geometry at a 1280 × 720 viewport: Chat composer card `780 × 102`; Research sidebar composer card `432 × 102`. Both share the same 36 px editable region and the requested 8 px vertical increase, while Chat preserves the established width and Research narrows only with the global sidebar.
- The live production frontend emitted zero warning/error console entries during the Research, Files, composer, and assistant-component pass.
- Electron Computer Use and browser CUA can move the pointer but do not preserve Chromium's custom HTML5 `DataTransfer` payload or the component pointer-capture sequence. The QA therefore does not claim that a visible cursor movement itself proved Files/Finder drop or corner resize. Those exact paths are instead covered by mounted DOM behavior tests for `application/x-sherlock-file`, secure admission, proportional image geometry, free assistant/HTML geometry, aspect-locked image/PDF geometry, PDF wheel ownership, canvas non-movement, selection/group movement, keyboard/context deletion, session switching, restart restoration, and capability cleanup.
- PDF packaging was separately verified from an isolated dependency install: the library and worker are byte-identical to `pdfjs-dist`, 169 CMaps and 16 standard fonts are staged, no staging remnants remain, and the app excludes the raw dependency/native canvas package. HTML preview remains an opaque `sandbox="allow-scripts"` iframe with exact-token CSP and capability-scoped local subresources.
- Focused feature gate: 4 files, 239/239 tests passed. Sidebar/loading/security regression gate: 5 files, 20/20 tests passed. Main/preload trust gate: 3 files, 9/9 tests passed. Typecheck, `git diff --check`, 24/24 dependency patch replay, package verification, and Developer ID signature verification all passed.

final result: passed

## Retired memory plugins and new-turn execution QA (2026-08-27)

- User references: `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-1898d630-d3fd-40c5-97c4-aa09f56979d5.png` and `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-e30df5a3-2c9f-4877-9b3c-80aebd6f0bef.png`.
- Sherlock 0.7.3 now retires both `dsh-memory-evolve` and `@vectorize-io/hindsight-coding-agents`; neither appears in the active plugin manifest, copied profile modules, copied vendor packages, or profile loader rows.
- The bundled upgrade manifest carries both identifiers as retired plugins. Startup removes their exact directories from `harness/custom-plugins`, including when the current profile fingerprint was already installed, so an existing user upgrade does not keep a stale plugin card.
- Real packaged Settings verification returned zero plugin-list matches for both `hindsight` and `memory evolve`. Visual proof: `/tmp/sherlock-0.7.3-memory-plugins-removed.jpg`.
- The latest real Research turn (`0.7.3 最终功能复验，请仅回复“通过”。`) exposed no `memory` tool, performed no tool call, and ended with the standalone reply `通过`. It also stayed at the conversation tail with the fixed composer visible. Visual proof: `/tmp/sherlock-0.7.3-final-research.jpg`.
- Historical `unknown tool "memory"` rows remain only inside old persisted conversation records; the migration intentionally does not rewrite prior message history or erase user-owned memory data.
- Focused tests, typecheck, package verification, Developer ID signature verification, runtime profile assertions, and real-window checks passed. Notarization, upload, public update-source changes, and source/tag push were intentionally skipped for this local test build.

final result: passed

## Memory Evolve removal QA (2026-08-27)

- User references: `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-a415a313-9878-4faf-a31c-461bdb03d745.png` and `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-c1d1bb37-5c52-41b5-859e-d1ba20c8d4aa.png`.
- Root-cause evidence from the affected persisted session showed Memory Evolve forced a complete reply before its maintenance tool calls and then forced a `dtodo list` check. That ordering caused the useful answer to be grouped into `执行过程`, while an empty todo result induced a second low-value closing reply.
- Memory Evolve is now excluded from both the packaged plugin dependencies and bundles. The 0.7.3 upgrade profile therefore removes its code and injected memory/todo instructions instead of attempting another compatibility patch.
- Existing user-owned memory data remains on disk for recoverability, but the plugin package, tools, UI, and prompt injection are no longer loaded by Sherlock.
- Focused profile tests assert that `dsh-memory-evolve` is absent from both plugin lists and exercise an upgrade from an older profile that contains the plugin. The real 0.7.3 package and installed runtime contain no Memory Evolve directory, while the retired profile remains available in the timestamped rollback backup.
- A real packaged 0.7.3 conversation returned only `0.7.3验证通过` after the collapsed `执行过程`; DOM inspection confirmed the reply is outside the execution `section`, and the rendered message contains no empty-todo status. Live proof: `/tmp/sherlock-0.7.3-live-reply-validation.png`; About/version proof: `/tmp/sherlock-0.7.3-memory-evolve-removed.png`.
- Apple notarization, upload, public update-source changes, and source/tag push were intentionally skipped for this local 0.7.3 test build.

final result: passed

## Light theme contrast QA (2026-08-27)

- User references: `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-e623a2b5-b094-4f54-bb16-035b445c73ef.png` and `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-3e22d756-bb3a-4522-9688-d99b2c0addfb.png`.
- Real packaged Research screenshot: `/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/com.openai.sky.CUAService/Sherlock Screenshot 2026-08-27 at 11.56.59 AM.jpeg`.
- Light-theme inline file tags now use the neutral module surface with dark text and a visible outline; filenames and icons remain readable.
- After the latest visual direction, light-theme user messages use the same neutral module surface as the reference with dark text in both Chat and the Research conversation pane.
- The focused style contract expects tag and message backgrounds at `rgb(245, 246, 247)` with text at `rgb(15, 17, 21)`; packaged visual verification is repeated after each rebuild.
- The light-theme selectors are scoped so the existing dark-theme appearance remains unchanged.
- Clean packaged screenshot after a normal theme restore: `/tmp/sherlock-light-neutral-native.png`.
- The transient gray sidebar was reproduced only after a direct DOM theme-attribute toggle during QA; a clean app restart using the persisted `ui-theme.preference: light` restored the normal sidebar without any sidebar code change.

final result: passed
