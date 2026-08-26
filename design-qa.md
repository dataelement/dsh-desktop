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
