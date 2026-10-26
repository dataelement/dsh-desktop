# GPU 与内存故障保护

本方案属于 Electron 宿主的进程编排和恢复，不修改 Harness 插件解析、Profile 投影或用户会话数据。普通 Profile 与 Safe Mode 使用相同的资源保护。预算由 Desktop 生成，启动参数作用于当前安装携带的 Electron；不依赖开发目录。超限/OOM 保留原始日志和原有故障上报，并转入独立于 Harness UI 的原生恢复窗口。

## GPU 故障

- `0xC000026B` 保留上报。只有已经收到 `session-end` 或应用 `quit` 才分类为退出阶段；`query-session-end`、`before-quit` 可以取消，不能据此忽略故障。没有证据时标为影响待确认；晚到的信号不追溯改写旧报告。
- `34` 设备丢失先交给 Chromium 恢复。两分钟内三次丢失触发一次有三秒期限的页面响应检查；成功就继续使用，失败则提供退出或关闭硬件加速并重启。单次进程生命周期最多提示一次。响应检查证明页面 JS 可以执行，不证明所有 GPU 表面已正常绘制。
- 原生访问冲突和断点异常继续进入有限降级路径。自动降级直接使用软件渲染，不移除 GPU sandbox；旧的 `sandbox-disabled` 状态按软件渲染加载。软件渲染仍无法恢复时交由用户选择，避免不断重载。
- 软件渲染的 CPU 成本仍然存在。稳定启动达到原有阈值后再尝试默认加速模式。自动重新启动通过应用正常退出清理 Harness，不直接 `app.exit()` 遗留后台进程。

## 内存边界

| 机器内存 | Harness 老生代预算 | 每个 renderer 老生代预算 | Harness RSS 停止阈值 | Electron 进程合计停止阈值 |
| --- | --- | --- | --- | --- |
| 4 GiB | 1 GiB | 512 MiB | 1.5 GiB | 2 GiB |
| 8 GiB | 2 GiB | 1 GiB | 2.5 GiB | 4 GiB |
| 16 GiB 及以上 | 2 GiB | 1 GiB | 2.5 GiB | 最多 6 GiB |

- Windows Harness 使用 Electron Node 模式的 `--max-old-space-size`。renderer 使用 Chromium 的 `js-flags`。这是 V8 老生代预算，不是整个进程 RSS 上限。
- **Electron 43 的 macOS UtilityProcess 实测不应用 Node execArgv 中的堆上限**。因此不能把参数存在当成保护已经生效。主进程通过实际 UtilityProcess PID 检查 RSS，即使 Harness 的事件循环阻塞也能触发停止。
- 主进程每 30 秒检查 Electron 进程指标；Windows 优先使用 private bytes，其他平台使用 working set，后者可能包含共享页。Harness 入口每 30 秒检查自己的 heapUsed/RSS，用于补充 Windows 普通子进程不在 Electron 指标中的缺口。健康时不写日志、不上传这些样本，也不生成 heap snapshot。
- `DSH_DESKTOP_MEMORY_BUDGET_MB` 只在宿主到启动入口间传递，入口读后删除，避免工具子进程继承这项宿主协议。入口超限通知父进程停止；父进程不可用时五秒后退出。
- renderer/GPU 明确 OOM、Harness 当前启动的 V8 OOM 或超限后，停止 Harness 和手机桥接、释放主页面，禁止自动重载、插件自动修复及迁移失败后的自动重试；由用户选择退出或重启。保留已持久化的会话、Profile 和恢复材料。正在执行的任务可能中断，未持久化内容无法保证恢复。

这不是整个电脑或完整进程树的硬配额：原生分配、外部工具后代、两次检查间的瞬时峰值不都能由此拦截。macOS 保护是采样后停止，不是 V8 硬限制。内存泄漏、历史恢复复制和特定驱动故障仍须根据原始 Profile、操作步骤及对象保留路径定位，不能把这些止损措施宣称为全部根因修复。

## 诊断与验收

故障时追加系统版本、GPU 的有限字段、硬件加速状态、系统总量/空闲内存，以及最多八个 Electron 进程的 PID/类型/资源指标。不采集进程命令、路径或完整 GPU 对象。已经退出的进程可能不在快照中；快照不提供此前的增长曲线。采集失败不得丢弃原故障。上传仍经过原有单次确认入口，确认文案同步列出新增信息。

本地执行：

```bash
npm run typecheck
npm run build
npm test
node scripts/verify-stability-runtime.mjs
```

原生脚本使用临时 userData/DSH_HOME，检查实际 renderer 堆和 Harness 子进程限制；macOS 输出明确标记无 Harness V8 硬上限。Windows 原生环境可手动运行同一脚本与相关回归。它们不执行系统注销，也不能代替正式安装包中的注销/取消注销、远程桌面、睡眠唤醒、低内存长任务和真实用户 Profile 验收。
