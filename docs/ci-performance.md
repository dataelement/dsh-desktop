# CI 耗时与缓存分析

本次实测来自 [开发构建 40464243986](https://github.com/dataelement/dsh-desktop/actions/runs/40464243986)，提交 `b9476b1bda`，target=windows、mode=development。对照为 [40439065931](https://github.com/dataelement/dsh-desktop/actions/runs/40439065931)。两次都是托管 runner；第一次验证缓存修正前的调度，不能据此宣称后续缓存修正的提速已经验收，也不能把一次冷缓存运行当作稳定基准。

最终方案取消独立 prepare/validate job：通用检查在本来就要构建的平台执行一次（all/macOS 选 Apple Silicon，Windows-only/PR 选 Windows）；Office/PPT 生成回到原有 build，并用可跨 OS 的生成资产缓存复用。以下表格保留拆分方案的过程基线，不表示最终调度仍保留这些独立阶段。

第二轮 [40467160649](https://github.com/dataelement/dsh-desktop/actions/runs/40467160649) 中，缓存命中后的 npm ci：Ubuntu 23 秒、macOS 31 秒。结构化计时分别显示 reify:unpack 15.6 秒和 26.4 秒，说明热缓存后仍有大量解包/磁盘工作；依赖节点的 timer 互相重叠，不能逐项相加。该轮尚未采用最后取消独立阶段的调度。

## 已测阶段

| 阶段 | 本次耗时 | 原因及必要性 | 处理 |
| --- | ---: | --- | --- |
| Ubuntu npm ci | 119 秒 | npm 下载缓存未命中；清洁安装、完整性检查及补丁重放必须保留 | 保留 npm 下载缓存和 prefer-offline；增加结构化计时 |
| macOS npm ci | 148 秒 | npm 缓存未命中；约 145 秒发生在根 postinstall 之前，根 postinstall 约 3 秒 | 不能把慢归因于 patch-package；补 Electron 下载缓存，计时区分依赖安装阶段 |
| Windows npm ci | 168 秒 | npm 缓存未命中；临时 runner 每次重新下载/解包依赖，安装后才恢复 Electron 缓存也无法加速安装 | 将下载缓存移到安装前，设置 Electron 43 实际读取的 electron_config_cache |
| Ubuntu PPT 生成 | 11 秒 | 生成维护的模板、预览和宿主插件 bundle，是打包输入 | 移到 Ubuntu；命中输入指纹后只投影现有产物 |
| 公共资产准备和编译 | 164 秒 | Office 生成多份 Word/Excel 预览；一次 Kit 超时重试额外约 30 秒。Vite 编译本身很短 | 缓存 Office 模板；保留失败与重试边界，不能直接缓存失败输出 |
| 公共测试 | 186 秒 | 2609 项通过、5 项跳过；包括真实子进程、Python、Office 和插件组合验证 | 只运行一次，不在平台打包阶段再跑一整遍 |
| Windows build | 119 秒 | Windows 自动 CRLF 转换导致共享 Office 指纹改变，再次生成模板预览 | checkout 前关闭 CRLF 自动转换，复用同一输入的共享资产；目标平台的运行时仍单独组装 |
| Windows 专项测试 | 168 秒 | 698 项通过、8 项跳过；覆盖 Windows 路径、进程、Profile/generation、更新、Office 等真实平台差异 | 对照完整 Windows 测试 364 秒，专项测试减少 196 秒；保留完整套件手动开关 |
| Windows 开发包 | 183 秒 | 原生打包、ASAR/资源处理、afterPack 和 NSIS。日志中打包 Harness/原生模块及 Office 转换均通过 | 保留 afterPack；缓存 electron-builder/NSIS 下载。安装器生成区间还包含压缩和下载，当前不能精确拆分二者 |
| 三档恢复 UI | 本次关闭；对照 58 秒 | 对 DPI、恢复页面改动有价值，不必每个普通构建都做 | windows_recovery_ui 手动开关 |
| 额外桌面 smoke | 本次关闭；对照 39 秒 | 验证真实桌面启动、workspace/session，覆盖面与 afterPack 不同 | windows_smoke 手动开关；afterPack 始终执行 |
| 资源下载/上传、缓存操作 | 大多 1–11 秒 | 跨 runner 交付同一产物，避免生成更多副本 | 保留，不是当前主要瓶颈 |

公共测试中较慢的文件：host-disabled-plugins 42.8 秒、office-runtime 42.7 秒、ppt-validation 26.8 秒、office-templates 20.3 秒、mcp-startup-deadline 13.2 秒、safe-mode-runtime 12.7 秒。它们验证真实运行时或失败/超时路径；文件可并行执行，这些时长不能直接相加得到 suite 墙钟耗时。Windows 文件串行执行沿用现有防 EBUSY/子进程资源争用的约束。

## npm 缓存为何未必快

- actions/setup-node 的 `cache: npm` 缓存下载内容，不缓存 `node_modules`。npm ci 仍要清理、校验、解包、建立链接和执行安装脚本。本地 macOS 的 node_modules 约 1.4 GB；锁文件含 1257 个条目，本次 macOS 实际安装 1102 个包。
- 缓存受平台、CPU、锁文件和 GitHub 分支可见性限制。本次三个安装步骤均明确打印 `npm cache is not found`；其他 feature 分支有同名缓存，不表示本分支可以恢复它。首轮成功后保存的缓存可供后续同分支运行使用。
- 锁文件中 1234 个 HTTP resolved 地址指向 registry.npmmirror.com。托管 runner 跨地域下载可能影响冷安装，但本次没有逐请求计时，不能确认它占了多少秒，也没有改写锁文件或供应源。
- 根 postinstall 必须应用第三方补丁、品牌资产并安装匹配的 Electron，不能用 ignore-scripts 换速度。当前 macOS 日志表明根 postinstall 只占约 3 秒，并非 148 秒的主体。
- npm 的 audit 通知原本不作为失败 gate；重复安装改用 no-audit/no-fund，避免重复 advisory 请求。安全问题应单独处理，此改动不表示依赖漏洞已修复。
- 增加 `--timing`，仅上传 `*-timing.json`，后续可按 reify、依赖节点、脚本等阶段核对。计时产物不上传完整 npm debug 日志。

## 共享模板指纹复算

prepare-templates 对脚本和模板源文件的原始字节做 hash。使用同一输入和参数（Python 3.12.14、Kit 0.1.5）：

- 原始 LF 输入：`c9de80805c17`，与 macOS CI 一致。
- 仅把文本输入转成 CRLF：`60e891258050`，与 Windows CI 一致。

这证明当时的跨平台缓存失效来自 checkout 的换行转换，不能归因于模板不兼容。关闭 Windows 的自动 CRLF 转换不修改 Git 源文件；仍保留目标平台的 Python/原生模块及 afterPack 验证。

## 本次未执行的发布阶段

macOS 双架构打包、Apple 签名/公证、Windows UKey 内层签名/重打包、正式发布/ModelScope 镜像及发布说明生成没有在本次 Windows development 运行中执行。

补充对照原始失败运行 [40458660225](https://github.com/dataelement/dsh-desktop/actions/runs/40458660225)：其中成功的 Apple Silicon signed package 为 451 秒、DMG 签名/公证/staple 为 199 秒；Intel 分别为 679 秒和 195 秒。signed package 本身包含 app 签名/公证及压缩，不应全算作 TypeScript 编译。DMG 对最终分发容器签名、公证和 stapling；它与 app 的处理对象不同，当前没有实验证明可安全删去任一门禁。Windows 在 tar 归档步骤失败，因此该次 UKey 和发布阶段均跳过，不能给出实测耗时。

- 双架构 native packaging 和 verify-target 保证安装包对应目标平台；不能仅靠 arm64 单测替代 Intel 包验收。
- 签名、公证、时间戳和证书校验是正式分发链路的要求；受签名设备、Apple 服务和重试影响，development 模式不执行。
- UKey 依赖单个签名 worker，排队时间与实际签名时间要分别统计。复用 unsigned artifact 的 resign 模式避免从头重建。
- 发布资产和索引写入必须等待所有目标完成；上传耗时由文件体积和网络决定。发布说明生成与 Feishu 通知只在相应发布模式执行，不应混入普通测试路径。

## Windows 归档修复

原生 tar 的 Unicode 路径回归在 Windows CI 复现访问冲突（0xC0000005）。#801 的修复合入本 PR 后改用已锁定的 Node tar 实现，保留流式压缩、超时、完整性校验和失败保护。发布必跑；development 通过 `windows_archive_check=true` 验证完整产物，默认省去无签名用途的压缩。
