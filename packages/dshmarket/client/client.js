window.__ModuleLoader__.load({ id: "dshmarket", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/locales.ts
		/** zh/en dictionaries for the Market settings section and install toast. */
		const zh = {
			nav: "插件市场",
			setCardDesc: "查看插件市场版本与设置。",
			setSelfUpToDate: "已是最新版本",
			setSelfUpdateReady: "有新版本",
			setSelfUpdateHint: "更新会下载新版本，重启后生效。",
			setSelfUpToDateHint: "",
			setSelfUpdate: "更新",
			setSelfUpdatedHint: "已下载完成。重启 DeepSeek Harness 后新版本才会生效——前端页面会立即更新，服务端不会。",
			setRegion: "下载区域",
			setRegionGlobal: "全球",
			setRegionChina: "中国大陆",
			setRegionGlobalHint: "从 npm 和 GitHub 官方源下载。",
			setRegionChinaHint: "中国大陆访问更快。仅改变下载线路，插件来源不变。",
			setRegionAuto: "已根据网络状况自动选择，可随时切换。",
			setChannel: "更新通道",
			setChannelStable: "稳定版",
			setChannelBeta: "Beta",
			setChannelStableHint: "仅接收正式发布版本。",
			setChannelBetaHint: "提前获取待验证版本，可能不稳定。仅影响插件市场自身。",
			setChannelDev: "开发版",
			setChannelDevHint: "开发分支构建，未经验证，不建议普通用户使用。",
			setChannelSwitch: "切换至",
			setChannelSwitchHint: "该版本低于当前已安装版本。",
			setSelfRemove: "卸载插件市场",
			setSelfRemoveHint: "从这个 profile 卸载市场。已装的其它插件不受影响。",
			setSelfConfirm: "确定要卸载插件市场吗？卸载后需使用命令行重新安装。",
			setSelfPurge: "同时清除市场自己的数据",
			setSelfPurgeOn: "将删除：市场的停用清单与自定义分组，以及市场写进 profile 补丁文件的停用行——被市场停用的插件将恢复运行。不涉及密码或令牌，市场从不把它们存在磁盘上。",
			setSelfPurgeOff: "保留市场数据。注意：被市场停用的插件会保持停用，且移除后将没有界面可将其重新启用。",
			setSelfRemoveConfirm: "确认卸载",
			setSelfCancel: "取消",
			setSelfWorking: "正在卸载…",
			setSelfRemoved: "已卸载",
			setSelfRemovedHint: "重启 DeepSeek Harness 后完全清理。",
			setSelfFailed: "操作失败",
			versionHint: "插件市场版本 — 反馈问题时请附上",
			subtitle: "发现社区为 DeepSeek Harness 开发的插件",
			submitPlugin: "申请收录插件 ↗",
			descExpand: "展开",
			descCollapse: "收起",
			searchPh: "搜索插件，例如：通知、终端、记忆…",
			tabDiscover: "发现",
			tabInstalled: "已安装",
			tabAdvanced: "高级",
			all: "全部",
			install: "安装",
			installing: "安装中…",
			installedBadge: "✓ 已安装",
			alreadyInstalled: "✓ 已安装",
			restartBanner: "项变更完成，重启 DeepSeek Harness 后生效",
			uninstall: "卸载",
			confirmRemove: "确认卸载？",
			uninstalling: "卸载中…",
			uninstallConfirmDesc: "将从当前 profile 中移除该插件。",
			restartHint: "重启方式：关闭当前 dsh 进程后重新运行（例如 dsh web）",
			restartHintSupervised: "本进程是 {0} 服务的主进程，重启交给它负责——市场自己重启会连带杀掉 cgroup 里的接管进程，服务将起不来。请执行 systemctl restart <你的 unit>。确认你的配置能承受市场自行重启（如 KillMode=process），可在本插件配置里手动打开「允许重启」。",
			restartHintDebugged: "当前 dsh 进程正在被调试器附着。请从 IDE 或终端停止该进程后重新启动，市场不能从 UI 里杀掉正在调试的宿主。",
			confirmTitle: "安装",
			confirmWarn: "插件是社区第三方代码。安装即表示你信任该来源；构建脚本默认被禁止执行。",
			cancel: "取消",
			empty: "没有匹配的插件",
			installedEmpty: "尚未安装社区插件，可前往「发现」页浏览",
			loadFail: "插件目录加载失败，请稍后重试",
			loadRetry: "重试",
			installFail: "安装失败",
			viewSource: "源码",
			refreshBanner: "项变更需刷新页面生效",
			refresh: "刷新页面",
			update: "更新",
			updating: "更新中…",
			updated: "✓ 已更新，重启后生效",
			cancelOp: "取消",
			cancelled: "已取消",
			busyWait: "已有操作正在进行，请等待其完成（同一时间只执行一个安装/更新/卸载）",
			agentBusyUpdate: "有 agent 正在运行，请等待其完成或将其取消后再更新——更新会直接替换插件文件，运行中的 agent 可能中途报错或新旧版本混用。",
			agentBusyInstall: "有 agent 正在运行，请等待其完成或将其取消后再安装——安装会修改插件文件，运行中的 agent 可能中途报错。",
			compatRiskBanner: "检测到兼容性风险，建议重启前到诊断页处理，或一键回滚本次操作。",
			compatRiskBannerNoRollback: "检测到兼容性风险，建议重启前到诊断页处理。",
			shadowNameBanner: "本次操作让同一个插件名在两个层里同时存在，重启后只有一个会生效：",
			brokenBundleBanner: "下列插件的前端文件已损坏、无法解析，刷新后界面可能空白，建议回滚：",
			goDiagnose: "前往诊断页修复",
			rollbackNow: "回滚本次操作",
			rollingBack: "回滚中…",
			rollbackUnavailable: "无法确认更新前的准确来源，自动回滚不可用。",
			approveBuilds: "放行构建脚本并重试",
			buildsSkipped: "该插件需要运行构建脚本才能工作，出于安全考虑已默认阻止。确认来源可信后，可放行并重新安装：",
			restartNow: "立即重启",
			dismiss: "关闭提示",
			dismissNotice: "关闭此提示",
			restarting: "正在重启…",
			restartFail: "重启失败",
			restartTimeout: "等待 DeepSeek Harness 启动超时",
			updateNow: "立即更新",
			updateFail: "更新失败",
			upToDate: "已是最新",
			linkedDev: "本地开发",
			notesLink: "更新内容",
			notesRelease: "版本说明",
			notesCommits: "提交记录",
			notesCommitsRecent: "最近提交（未能对齐你当前安装的版本，仅供参考）",
			notesNpm: "版本发布时间",
			notesNone: "该插件未提供更新说明。",
			notesLoadFail: "暂时读不到更新说明，稍后再试。",
			restore: "恢复",
			restoreOnline: "换用线上版本",
			restoreHint: "会卸载本地版本，重新安装线上版本，并保持更新检测。无法回退，请二次确认。",
			restoreContinue: "继续更新",
			restoreNoCatalog: "精选目录里没有这个插件，无法恢复到线上版本。可以卸载本地版，或继续用本地开发。",
			restoreFail: "恢复失败",
			exportLog: "导出日志",
			exportingLog: "导出中…",
			exportedLog: "日志已导出：dsh-market-log.txt，请将其附在 issue 中",
			exportLogFail: "日志导出失败",
			readme: "使用说明",
			comments: "评论",
			commentsTitle: "评论",
			commentsNote: "评论来自 GitHub Discussions。打开后会连接 giscus.app 与 GitHub；发表评论需要 GitHub 账号。",
			commentsLoading: "正在加载评论…",
			commentsError: "评论加载失败。请检查网络连接后重试。",
			commentsRetry: "重试",
			commentsOnGitHub: "前往 GitHub 查看讨论",
			terminalWarn: "这看起来是终端/命令行插件：安装到网页版 profile 可能不会生效，甚至导致 DeepSeek Harness 无法启动。建议先阅读其使用说明，并按说明安装到对应的 profile。",
			conflictTitle: "无法安装：与已安装的插件冲突",
			conflictBody: "和已安装的插件冲突，只能留一个：",
			conflictReverted: "已自动撤销，未改动任何插件",
			conflictKeep: "保留已安装的插件",
			conflictKeepNote: "",
			conflictSwap: "改为安装这个",
			conflictSwapNote: "被卸载的插件配置会保留，可以再装回来",
			conflictDetails: "详情",
			conflictOutcomeInstall: "安装",
			conflictOutcomeSkip: "不安装",
			conflictOutcomeKeep: "保留",
			conflictOutcomeRemove: "卸载",
			conflictWhy: "cordis 不接受包含重复条目 id 的插件树，保留该插件将导致 DeepSeek Harness 下次启动失败。",
			opTitle: "任务",
			opInstalling: "正在安装",
			opNeedsYou: "项需处理",
			opQueued: "排队中",
			opQueuedAhead: "前面还有",
			opRunning: "正在处理",
			opNeedsChoice: "无法安装 · 已自动撤销，未改动任何插件",
			opDone: "已完成",
			opDoneRefresh: "已安装 · 刷新页面后生效",
			opLeaveHint: "可离开本页面，完成后将通知你",
			opEmpty: "暂无进行中的操作",
			opEmptyHint: "安装、更新与卸载的进度将显示在这里",
			opClose: "收起",
			opClear: "清空已完成",
			opDequeue: "移出队列",
			opRetry: "重试",
			opKind_install: "安装",
			opKind_update: "更新",
			opKind_uninstall: "卸载",
			opBlockedCard: "无法安装 · 查看详情",
			conflictDeclined: "已选择保留现有插件，未安装",
			conflictReplacing: "正在替换…",
			conflictReplaceFailed: "替换未完成。下列插件已卸载且未自动恢复，请手动确认：",
			lightboxClose: "关闭预览",
			lightboxPrev: "上一张",
			lightboxNext: "下一张",
			envMissing: "安装插件前需要先配置 pnpm 环境",
			envFix: "自动配置",
			envFixing: "正在配置…",
			envFixFail: "自动配置失败。请使用「导出日志」，并将文件附在 issue 中",
			loading: "正在加载插件目录…",
			backTop: "回到顶部",
			confirm: "确认",
			confirmInstall: "确认安装",
			cmdDetails: "安装命令",
			catsMore: "更多分类",
			catsLess: "收起",
			filter: "筛选",
			filterSort: "排序字段",
			filterDir: "排序方向",
			filterTime: "发布时间范围",
			sortDownloads: "npm 下载量(近 30 天)",
			sortStars: "Star 数",
			sortAdded: "发布时间",
			sortDesc: "降序",
			sortAsc: "升序",
			sortNewest: "最新",
			sortOldest: "最旧",
			timeAll: "全部时间",
			timeDay: "最近 1 天",
			timeWeek: "最近 7 天",
			timeMonth: "最近 30 天",
			timeQuarter: "最近 90 天",
			timeYear: "最近 1 年",
			published: "发布于",
			prevPage: "上一页",
			nextPage: "下一页",
			firstPage: "首页",
			lastPage: "末页",
			pageInfo: "第 {0} / {1} 页",
			perPage: "每页",
			marketUpdate: "更新插件市场",
			updateAll: "全部更新",
			ignoreUpdateNotice: "本次不再提醒",
			ignoreAllUpdateNotices: "本次全部忽略",
			updateNoticeIgnored: "本次已忽略提醒",
			tabThemes: "主题",
			tabBackup: "备份与恢复",
			backupLocal: "本地文件",
			backupDownload: "导出备份",
			backupImport: "导入并预览",
			backupHint: "仅包含插件清单和 profile 配置，不包含 node_modules；恢复会按清单重新安装插件。",
			webdav: "WebDAV",
			webdavPreset: "服务商预设",
			webdavUrl: "备份文件 URL",
			webdavUser: "用户名（可选）",
			webdavPassword: "密码（可选）",
			webdavUpload: "上传备份",
			webdavRestore: "从 WebDAV 恢复",
			autoBackup: "每天自动备份（打开市场时）",
			webdavNote: "WebDAV 地址与用户名仅保存在当前浏览器；密码只存于服务端，每次会话需重新输入。",
			localOnly: "WebDAV 地址和凭证仅保存在当前浏览器。",
			credsWarning: "请注意：备份包含 profile 配置，以及可能含密钥的文件（config.toml、.env 等）。本地导出的文件会原样包含这些内容，上传 WebDAV 前请确认目标可信。",
			gist: "GitHub Gist",
			gistToken: "GitHub token（仅本次会话内存，刷新后需重新输入；留空则使用服务端 DSH_GITHUB_TOKEN 或已登录的 gh CLI）",
			gistId: "Gist ID 或链接（导出留空则新建私有 Gist）",
			gistVerify: "验证连接",
			gistExport: "导出到 Gist…",
			gistImport: "从 Gist 导入",
			gistExportDone: "已导出到 Gist",
			gistVerifySource: "验证通过（Token 来源：{0}）",
			gistSrcToken: "手动输入",
			gistSrcEnv: "环境变量 DSH_GITHUB_TOKEN",
			gistSrcGh: "gh CLI",
			gistExportSelect: "选择要导出的插件",
			gistExportHint: "全部勾选 = 完整备份（含配置文件）；取消勾选 = 仅导出所选插件，可另行勾选「包含配置文件」。",
			gistSelectAll: "全选",
			gistSelectNone: "全不选",
			gistIncludeConfig: "包含配置文件（可能含密钥，请确认）",
			gistNoPlugins: "当前 profile 没有可导出的插件",
			gistSpecLocal: "本地",
			gistExportGo: "导出",
			gistCreated: "已导出：",
			gistErrTimeout: "GitHub 请求超时，请检查网络后重试",
			gistErrNetwork: "无法连接 GitHub，请检查网络或代理设置",
			gistErrAuth: "GitHub 认证失败：Token 无效、已过期，或 gh CLI 未登录",
			gistErrNotFound: "未找到该 Gist，请检查 ID 或链接",
			gistErrRateLimit: "GitHub 限流或 Token 权限不足",
			gistErrInvalid: "Gist 内容无效或备份格式不受支持",
			gistModeUpdate: "更新到输入框中的 Gist",
			gistModeCreate: "新建一个私有 Gist",
			gistErrNoId: "更新模式需要 Gist ID：请填写，或切换为「新建」",
			gistNote: "与本地导出（本机存档）不同，Gist 用于跨机器同步：导出到私有 Gist 后，可在其他电脑用同一账号导入复用。Token 仅保存在本次会话内存中，绝不写入浏览器存储；已登录 gh CLI 或设置 DSH_GITHUB_TOKEN 则无需输入。Gist 为私有，单文件上限 1 MB。",
			backupWorking: "处理中…",
			backupDone: "备份已上传",
			restoreDone: "恢复完成，请重启 DeepSeek Harness",
			restorePartial: "恢复已完成，但下列插件安装失败：",
			restoreUnportable: "依赖指向另一台机器上的绝对路径，本机不存在。请手动改为本机路径，或重新安装该插件",
			restoreBootError: "恢复后仍无法启动：",
			orphanBundle: "⚠️ 下次启动会失败：profile 声明了这些 bundle，但它们没有安装。请重新安装，或从 profile 的 package.json 的 dsh.profile.bundles 中删除：",
			restoreConfirm: "恢复将覆盖当前 profile 配置并重新安装插件，确定继续吗？",
			restorePreviewDone: "备份已导入，请在「已安装」中确认后开始恢复",
			restoreMissing: "备份中有 {0} 个插件尚未安装",
			restoreStart: "开始恢复",
			notInstalled: "未安装",
			themeApply: "使用",
			themeActive: "使用中",
			themeDeactivate: "停用",
			themeEmpty: "目录中暂无主题",
			themePreview: "预览",
			themePreviewLoading: "正在查找预览…",
			themePreviewMissing: "暂无预览",
			themePreviewCount: "{0} 张预览",
			themeResultCount: "{0} 款主题",
			themeFullscreen: "全屏浏览",
			themeExitFullscreen: "退出全屏",
			progressHint: "首次安装需要下载与解析依赖，大型插件可能需要 1-3 分钟",
			toastReady: "已安装并已生效",
			toastTheme: "已启用。可在 设置 → 插件市场 → 主题 中随时切换",
			toastToggledOn: "已启用",
			toastToggledOff: "已停用，相关功能立即停止",
			gotIt: "关闭",
			stateLive: "已生效",
			stateRestart: "已安装，重启后生效",
			stateInert: "已安装，未生效",
			stateBroken: "已安装，校验未通过",
			stateDisabled: "已停用",
			phaseResolving: "解析依赖",
			phaseDownloading: "下载中",
			phaseLinking: "链接依赖",
			phaseBuilding: "运行构建脚本",
			cancelling: "正在取消…",
			packagesDone: "已处理 {0} 个包",
			updatedLive: "✓ 已更新，已生效",
			partialNote: "已取消，部分变更已写入",
			reconciledNote: "已卸载，但 pnpm 在收尾阶段报错（通常是文件被占用）；配置已同步，无需重试",
			actWhy: "为什么未生效？",
			tabList: "列表",
			tabGroups: "分组",
			repoLink: "在 GitHub 上查看仓库",
			disabledState: "已停用",
			noteAdd: "添加备注",
			noteEdit: "编辑备注",
			noteTheirs: "原文",
			noteMine: "我的备注",
			noteSave: "保存",
			notePlaceholder: "用你自己的话描述这个插件，将代替作者简介显示",
			noteSeeTheirs: "查看作者写的简介",
			noteSeeMine: "返回我的备注",
			switchOnLabel: "启用中",
			enable: "启用",
			disable: "停用",
			toggleFail: "切换失败",
			deprecatedBadge: "已废弃",
			deprecatedWarn: "该插件已被目录标记为废弃，不建议新用户安装。",
			viewReplacement: "查看替代品",
			installReplacement: "安装替代品",
			replacementHint: "目录建议改用",
			groupNew: "新建分组",
			groupNamePh: "分组名称",
			groupRename: "重命名",
			groupDelete: "删除分组",
			groupConfirmDelete: "确认删除？",
			ungrouped: "未分组",
			groupAssign: "分配",
			groupRemove: "移出",
			groupEmpty: "该组暂无成员",
			groupMixed: "部分启用",
			noGroups: "尚无分组，请先新建",
			groupCreate: "创建",
			groupAdd: "加入插件",
			groupAddTheme: "加入主题",
			groupAddEmpty: "所有已安装插件都已在该组中",
			tabDiagnostics: "诊断",
			checkIssues: "发现问题",
			checkErrors: "错误",
			checkWarnings: "警告",
			checkLoading: "正在分析 profile…",
			checkLoadFail: "诊断加载失败：",
			checkProfile: "profile",
			checkErrorsEmpty: "没有错误",
			checkWarningsEmpty: "没有警告",
			checkBundles: "插件加载顺序（bundle）",
			checkBundlesEmpty: "未声明任何插件层",
			checkOfficial: "官方",
			checkCommunity: "社区",
			checkSource: "来源",
			checkEntries: "加载条目（loader id）",
			checkPatch: "patch 文件",
			checkDir: "目录",
			checkDuplicates: "重复的插件条目",
			checkDuplicatesEmpty: "没有重复的插件条目",
			checkHoisted: "顶层",
			checkPeerMismatches: "依赖版本不匹配",
			checkPeerEmpty: "没有依赖版本不匹配",
			checkPeerInfo: "另有 {0} 条信息（未确认问题）",
			checkPeerOverview: "{0} 不匹配 · {1} 条信息",
			checkRange: "声明范围",
			checkResolved: "实际版本",
			checkSatisfied: "满足",
			checkUnsatisfied: "不满足",
			checkUnknown: "未知",
			checkPeerRisk: "依赖风险",
			checkPeerRiskEmpty: "没有风险级依赖不匹配",
			checkPeerWarning: "依赖警告",
			checkPeerWarningEmpty: "没有警告级依赖不匹配",
			checkPeerInfoTier: "依赖信息",
			checkPeerInfoTierEmpty: "没有信息级依赖条目",
			checkPeerSatisfied: "已满足的依赖",
			checkPeerSatisfiedEmpty: "没有已满足的依赖条目",
			peerRiskBelowMin: "低于声明下界",
			peerRiskAboveMax: "高于显式上界",
			peerWarnOptional: "可选依赖",
			peerWarnAboveMax: "超出声明上界",
			peerInfoUnverified: "未达判定",
			checkMultiVersion: "核心包多版本",
			checkMultiEmpty: "没有多版本核心包",
			checkOverrides: "覆盖关系",
			checkOverridesEmpty: "没有覆盖关系",
			checkOverridden: "覆盖了",
			checkOrphans: "无效的配置条目",
			checkOrphansEmpty: "没有无效配置条目",
			orphanInsertNotArray: "格式错误",
			orphanInsertTargetMissing: "目标不存在",
			orphanInsertTargetNotGroup: "目标不是分组",
			orphanIdRequired: "缺少标识",
			orphanPatchTargetMissing: "目标不存在",
			orphanNameMismatch: "名称不匹配",
			orphanReasonOther: "其他",
			diagExplain: "术语说明",
			diagExplainText: "本页检查插件之间的冲突、依赖版本不匹配与加载顺序问题。常用术语：",
			diagTermBundle: "bundle = 一个插件包，会按顺序叠加加载",
			diagTermEntry: "加载条目 = 插件在运行组合里注册的每一项",
			diagTermPeer: "对等依赖 = 插件要求宿主环境提供的另一个包",
			diagTermShadow: "遮蔽 = 插件自带的旧版包盖住了宿主的新版",
			diagTermOrphan: "无效条目 = 配置里引用了不存在的东西",
			diagTermOrder: "加载顺序 = 插件被激活的先后，后加载者可能覆盖先加载者",
			orderSection: "排序",
			orderUp: "↑",
			orderDown: "↓",
			orderApply: "应用顺序",
			orderDrag: "拖拽排序",
			orderDragHint: "拖动 ⠿ 调整顺序，选择「应用顺序」后才会保存",
			orderConflicts: "当前顺序的 before/after 冲突",
			orderApplied: "✓ 已应用，重启后生效",
			orderSuggestApply: "采用建议顺序",
			orderSuggestHint: "建议顺序（按 before/after 规则自动排序）：",
			orderAutoSort: "自动排序",
			orderAlreadyOptimal: "当前顺序已满足全部规则与插件依赖，无需调整",
			orderTrialFail: "静态组合校验未通过：{0}",
			orderDiffHint: "该顺序会改变组合：{0} 处覆盖、{1} 个无效条目、{2} 个重复条目",
			duplicateNames: "同名插件（仅信息展示，不视为冲突）",
			orderReset: "重置草稿",
			checkRefresh: "重新检查",
			aiFix: "AI 修复",
			aiFixHint: "将诊断问题交由新对话中的 Agent 修复（内容已复制到剪贴板，由你决定是否发送）",
			aiFixIntro: "请帮我修复 DeepSeek Harness 的插件问题（profile：{0}）。诊断发现如下：",
			aiFixDetect: "【第一步·先判断身份】开始前先判断：当前 Agent 所运行的进程，是否就是这个 profile 对应的 DeepSeek Harness 本机实例（即：诊断出的这套组合，就是你现在运行中的组合）？判断依据：当前工作目录 / $DSH_HOME / 进程命令行是否指向该 profile，或你是否运行在 deepseek-harness 进程内。若无法确定，一律按【是你】处理（更安全）。",
			aiFixIfSelf: "【是 → 你就是这个 harness】严禁原地改动组合、harness 或核心包：不修改 cordis.patch.yml、不调整 bundle 顺序或启停、不安装/卸载/升级插件、不重新安装依赖、不升级或重启 dsh。三步：① 先只读分析，不改任何东西；② 给出 apply.sh/.bat（本次修复的改动）与 rollback.sh/.bat（完整撤销 apply）；两者都幂等——apply 仅在无已有快照时才创建快照（否则不覆盖；已存在说明 apply 跑过，先回滚或确认再重跑），rollback 从这份快照恢复，因此 apply 跑到一半失败也能回滚、重复回滚也安全；③ 由我在外部终端执行 apply，并将 stdout/stderr 回贴给你判断。每步先说明理由、等我确认；绝不自行执行。",
			aiFixScope: "【否 → 保守执行】你要是判定自己并非运行在目标 harness 内（独立进程），才可考虑：修改 dsh.profile.bundles 顺序、停用/启用插件、调整 cordis.patch.yml。注意：官方 bundle 不可移动；动手前先说明计划。",
			aiFixConservative: "请保持保守：只修复上面列出的明确错误（启动失败/重复条目/风险级依赖不匹配）。警告和信息级问题（如可选依赖、未确认的依赖范围）仅在它们与明确错误相关时处理。不要做不必要的升级或重新排序；每项改动前说明理由并等待确认。",
			aiFixCopied: "已复制修复提示词，请粘贴到新对话后发送",
			aiFixFail: "无法访问剪贴板，请手动复制下面的诊断内容",
			catConflict: "冲突",
			catDeps: "依赖",
			catRisk: "风险",
			catWarn: "警告",
			catInfo: "信息",
			catOrder: "顺序",
			/** Summary-strip tooltip for the order count (before/after rule conflicts). */
			checkOrderTip: "社区 bundle 加载顺序与插件声明的 before/after 规则冲突",
			diagOkAll: "未发现冲突、依赖或加载顺序问题",
			presetSection: "插件组合",
			presetHint: "把当前的 bundle 顺序与停用列表保存为组合，随时切换；应用前会做试启动校验并自动创建快照。",
			presetName: "组合名称",
			presetSave: "保存当前状态",
			presetSaving: "保存中…",
			presetSaved: "组合已保存",
			presetApply: "应用",
			presetApplied: "已应用，重启后生效",
			presetDelete: "删除",
			presetDeleted: "组合已删除",
			presetEmpty: "还没有保存过组合",
			presetNameEmpty: "请输入组合名称",
			presetFail: "组合操作失败：",
			presetListFail: "组合列表加载失败：",
			presetBundleCount: "{0} 个 bundle",
			presetPreview: "预览",
			presetPreviewTitle: "应用此组合将：",
			presetReorder: "重排 {0} 个 bundle 的位置",
			presetEnable: "启用 {0} 个插件",
			presetDisable: "停用 {0} 个插件",
			presetNoop: "无变更",
			presetPreviewFail: "预览失败：",
			snapSection: "快照与回滚",
			snapHint: "应用变更前会自动创建快照；也可以手动创建快照，随时回滚到任意状态。",
			snapCreate: "创建快照",
			snapCreating: "创建中…",
			snapCreated: "快照已创建",
			snapEmpty: "还没有快照",
			snapListFail: "快照列表加载失败：",
			snapCreateFail: "创建快照失败：",
			snapRestore: "回滚",
			snapRestoring: "回滚中…",
			snapRestored: "已回滚，重启后生效",
			snapRestoreFail: "回滚失败：",
			snapRestoreConfirm: "确认回滚",
			snapRestoreConfirmText: "回滚会用快照覆盖当前 profile 的 package.json 与配置，且不可撤销（可先创建新快照再回滚）。",
			snapFiles: "包含文件",
			snapDelete: "删除",
			snapDeleting: "删除中…",
			snapDeleted: "快照已删除",
			snapDeleteFail: "删除快照失败：",
			snapDeleteConfirm: "确认删除",
			snapDeleteConfirmText: "删除后该快照将无法恢复。",
			marketNoToggle: "市场自身不能停用",
			hostDependencyWarning: "插件在 dependencies 中声明了已知的 DSH 共享宿主包，可能遮蔽宿主版本（仅依据清单，未确认运行时重复）：",
			hostDependencyMore: "另有 {0} 条，已省略"
		};
		const en = {
			nav: "Plugin Market",
			setCardDesc: "View the plugin market version and settings.",
			setSelfUpToDate: "Up to date",
			setSelfUpdateReady: "New version available:",
			setSelfUpdateHint: "Updating downloads the new version; it takes effect after a restart.",
			setSelfUpToDateHint: "",
			setSelfUpdate: "Update",
			setSelfUpdatedHint: "Downloaded. Restart DeepSeek Harness for it to take effect — the frontend updates at once, the server does not.",
			setRegion: "Download region",
			setRegionGlobal: "Global",
			setRegionChina: "China mainland",
			setRegionGlobalHint: "Downloads directly from npm and GitHub.",
			setRegionChinaHint: "Faster in mainland China. Changes the download route, not the source.",
			setRegionAuto: "Selected from a network check. Change it anytime.",
			setChannel: "Update channel",
			setChannelStable: "Stable",
			setChannelBeta: "Beta",
			setChannelStableHint: "Released versions only.",
			setChannelBetaHint: "Early access to unverified versions. Affects the plugin market only.",
			setChannelDev: "Dev",
			setChannelDevHint: "Unverified builds from a development branch. Not recommended for general use.",
			setChannelSwitch: "Switch to",
			setChannelSwitchHint: "This version is lower than the one installed.",
			setSelfRemove: "Uninstall the plugin market",
			setSelfRemoveHint: "Uninstall the market from this profile. Your other plugins are untouched.",
			setSelfConfirm: "Uninstall the plugin market? Reinstalling it requires the command line.",
			setSelfPurge: "Also clear the market's own data",
			setSelfPurgeOn: "Will delete: the market's disable list and custom groups, and the disable rows it wrote into the profile patch file — plugins the market switched off start running again. No passwords or tokens are involved; the market never stores those on disk.",
			setSelfPurgeOff: "Keeps the market's data. Note: plugins the market switched off stay off, and once it is removed there is no UI left to switch them back on.",
			setSelfRemoveConfirm: "Uninstall",
			setSelfCancel: "Cancel",
			setSelfWorking: "Uninstalling…",
			setSelfRemoved: "Uninstalled",
			setSelfRemovedHint: "Restart DeepSeek Harness to finish cleaning up.",
			setSelfFailed: "The operation failed",
			versionHint: "Plugin market version — include it when reporting an issue",
			subtitle: "Discover community plugins for DeepSeek Harness",
			submitPlugin: "Submit a plugin ↗",
			descExpand: "Show more",
			descCollapse: "Show less",
			searchPh: "Search plugins: notify, terminal, memory…",
			tabDiscover: "Discover",
			tabInstalled: "Installed",
			tabAdvanced: "Advanced",
			all: "All",
			install: "Install",
			installing: "Installing…",
			installedBadge: "✓ Installed",
			alreadyInstalled: "✓ Installed",
			restartBanner: "change(s) done — restart DeepSeek Harness to apply",
			uninstall: "Uninstall",
			confirmRemove: "Uninstall?",
			uninstalling: "Uninstalling…",
			uninstallConfirmDesc: "This removes the plugin from the current profile.",
			restartHint: "To restart: stop the current dsh process and run it again (e.g. dsh web)",
			restartHintSupervised: "This process is {0}'s own service process, so restarts belong to it — restarting from here would kill the takeover process along with the cgroup and the service would not come back. Use systemctl restart &lt;your unit&gt;. If your unit can survive a self-restart (KillMode=process), turn Allow restart on in this plugin's configuration.",
			restartHintDebugged: "This dsh process is under a debugger. Stop it from your IDE or terminal and start it again — the market cannot kill a debug-attached host from the UI.",
			confirmTitle: "Install",
			confirmWarn: "Plugins are third-party community code. Installing means you trust this source; build scripts are blocked by default.",
			cancel: "Cancel",
			empty: "No plugins match",
			installedEmpty: "No community plugins yet — browse the Discover tab",
			loadFail: "The plugin catalog failed to load. Try again later.",
			loadRetry: "Retry",
			installFail: "Install failed",
			viewSource: "Source",
			refreshBanner: "change(s) applied — refresh the page to see them",
			refresh: "Refresh",
			update: "Update",
			updating: "Updating…",
			updated: "✓ Updated — restart to apply",
			cancelOp: "Cancel",
			cancelled: "Cancelled",
			busyWait: "Another operation is already running — please wait for it to finish (one install/update/uninstall at a time)",
			agentBusyUpdate: "An agent is currently working — wait for it to finish (or cancel it) before updating. Updates replace plugin files in place, so a working agent can fail or mix versions mid-turn.",
			agentBusyInstall: "An agent is currently working — wait for it to finish (or cancel it) before installing. Installing changes plugin files, so a working agent can fail mid-turn.",
			compatRiskBanner: "Compatibility risk detected — open Diagnostics before restarting, or roll this operation back.",
			compatRiskBannerNoRollback: "Compatibility risk detected — open Diagnostics before restarting.",
			shadowNameBanner: "This operation left one plugin name defined in two layers; only one will load after a restart:",
			brokenBundleBanner: "These plugins now have a client bundle that will not parse; the page may come up blank after a refresh — rolling back is recommended:",
			goDiagnose: "Open Diagnostics",
			rollbackNow: "Roll back",
			rollingBack: "Rolling back…",
			rollbackUnavailable: "Automatic rollback is unavailable because the previous exact source could not be verified.",
			approveBuilds: "Allow build scripts and retry",
			buildsSkipped: "This plugin needs its build scripts to run; they are blocked by default for safety. If you trust the source, allow them and reinstall:",
			restartNow: "Restart now",
			dismiss: "Dismiss",
			dismissNotice: "Dismiss this notice",
			restarting: "Restarting…",
			restartFail: "Restart failed",
			restartTimeout: "Timed out waiting for DeepSeek Harness to start",
			updateNow: "Update now",
			updateFail: "Update failed",
			upToDate: "Up to date",
			linkedDev: "local",
			notesLink: "What changed",
			notesRelease: "Release notes",
			notesCommits: "Commits",
			notesCommitsRecent: "Recent commits (could not be aligned with your installed version — for reference only)",
			notesNpm: "Version publish times",
			notesNone: "This plugin does not publish update notes.",
			notesLoadFail: "Update notes are unavailable right now — try again later.",
			restore: "Restore",
			restoreOnline: "Use online version",
			restoreHint: "This will uninstall the local version, reinstall the catalog version, and keep update checks. This cannot be undone — please confirm again.",
			restoreContinue: "Continue update",
			restoreNoCatalog: "This plugin is not in the curated catalog, so it cannot be restored. Uninstall the local copy, or keep developing it locally.",
			restoreFail: "Restore failed",
			exportLog: "Export log",
			exportingLog: "Exporting…",
			exportedLog: "Log exported: dsh-market-log.txt — please attach it to your issue",
			exportLogFail: "Log export failed",
			readme: "README",
			comments: "Comments",
			commentsTitle: "Comments",
			commentsNote: "Comments come from GitHub Discussions. Opening this connects to giscus.app and GitHub; posting needs a GitHub account.",
			commentsLoading: "Loading comments…",
			commentsError: "Comments could not be loaded. Check your connection and try again.",
			commentsRetry: "Try again",
			commentsOnGitHub: "Read the discussion on GitHub",
			terminalWarn: "This looks like a terminal/CLI plugin: installing it into the web profile may do nothing, or even break DeepSeek Harness startup. Read its README and install it into the profile it targets.",
			conflictTitle: "Cannot install: conflicts with an installed plugin",
			conflictBody: "It conflicts with an installed plugin — only one can stay:",
			conflictReverted: "Reverted automatically; nothing was changed",
			conflictKeep: "Keep the installed plugin",
			conflictKeepNote: "",
			conflictSwap: "Switch to this one",
			conflictSwapNote: "Settings of the uninstalled plugins are kept, so you can reinstall later",
			conflictDetails: "Details",
			conflictOutcomeInstall: "install",
			conflictOutcomeSkip: "skip",
			conflictOutcomeKeep: "keep",
			conflictOutcomeRemove: "uninstall",
			conflictWhy: "cordis refuses a plugin tree that contains duplicate entry ids; keeping this plugin would stop DeepSeek Harness from starting.",
			opTitle: "Tasks",
			opInstalling: "Installing",
			opNeedsYou: "need attention",
			opQueued: "Queued",
			opQueuedAhead: "ahead:",
			opRunning: "In progress",
			opNeedsChoice: "Cannot install · reverted automatically, nothing changed",
			opDone: "Done",
			opDoneRefresh: "Installed · refresh the page to apply",
			opLeaveHint: "You can leave this page; you will be notified when it finishes",
			opEmpty: "No operations in progress",
			opEmptyHint: "Install, update and uninstall progress appears here",
			opClose: "Collapse",
			opClear: "Clear finished",
			opDequeue: "Remove from queue",
			opRetry: "Retry",
			opKind_install: "Install",
			opKind_update: "Update",
			opKind_uninstall: "Uninstall",
			opBlockedCard: "Cannot install · details",
			conflictDeclined: "You kept the installed plugins; this one was not installed",
			conflictReplacing: "Replacing…",
			conflictReplaceFailed: "Replace did not finish. The plugins below were uninstalled and not restored — please check them:",
			lightboxClose: "Close preview",
			lightboxPrev: "Previous",
			lightboxNext: "Next",
			envMissing: "pnpm needs to be set up before installing plugins",
			envFix: "Set up automatically",
			envFixing: "Setting up…",
			envFixFail: "Automatic setup failed — export the log and attach it to your issue",
			loading: "Loading the catalog…",
			backTop: "Back to top",
			confirm: "Confirm",
			confirmInstall: "Confirm install",
			cmdDetails: "Install command",
			catsMore: "More",
			catsLess: "Less",
			filter: "Filter",
			filterSort: "Sort field",
			filterDir: "Order",
			filterTime: "Released within",
			sortDownloads: "npm downloads (30d)",
			sortStars: "Stars",
			sortAdded: "Release date",
			sortDesc: "Descending",
			sortAsc: "Ascending",
			sortNewest: "Newest",
			sortOldest: "Oldest",
			timeAll: "Any time",
			timeDay: "Last day",
			timeWeek: "Last 7 days",
			timeMonth: "Last 30 days",
			timeQuarter: "Last 90 days",
			timeYear: "Last year",
			published: "released",
			prevPage: "Previous",
			nextPage: "Next",
			firstPage: "First",
			lastPage: "Last",
			pageInfo: "Page {0} of {1}",
			perPage: "Per page",
			marketUpdate: "Update the plugin market",
			updateAll: "Update all",
			ignoreUpdateNotice: "Ignore for this boot",
			ignoreAllUpdateNotices: "Ignore all for this boot",
			updateNoticeIgnored: "Reminder ignored for this boot",
			tabThemes: "Themes",
			tabBackup: "Backup & Restore",
			backupLocal: "Local file",
			backupDownload: "Export backup",
			backupImport: "Import and preview",
			backupHint: "Includes the plugin list and profile configuration, never node_modules. Restore reinstalls plugins from the list.",
			webdav: "WebDAV",
			webdavPreset: "Provider preset",
			webdavUrl: "Backup file URL",
			webdavUser: "Username (optional)",
			webdavPassword: "Password (optional)",
			webdavUpload: "Upload backup",
			webdavRestore: "Restore from WebDAV",
			autoBackup: "Back up daily (when the market opens)",
			webdavNote: "The WebDAV URL and username stay in this browser only; the password is kept server-side and must be re-entered each session.",
			localOnly: "The WebDAV URL and credentials stay in this browser only.",
			credsWarning: "Note: backups include profile configuration and files that may hold secrets (config.toml, .env, …). Local exports are unmodified, so upload only to a WebDAV target you trust.",
			gist: "GitHub Gist",
			gistToken: "GitHub token (session memory only — re-enter after refresh; leave empty to use server-side DSH_GITHUB_TOKEN or a logged-in gh CLI)",
			gistId: "Gist ID or URL (leave empty on export to create a new private Gist)",
			gistVerify: "Verify connection",
			gistExport: "Export to Gist…",
			gistImport: "Import from Gist",
			gistExportDone: "Exported to Gist",
			gistVerifySource: "Verified — token source: {0}",
			gistSrcToken: "manually entered",
			gistSrcEnv: "DSH_GITHUB_TOKEN env var",
			gistSrcGh: "gh CLI",
			gistExportSelect: "Select plugins to export",
			gistExportHint: "All checked = full backup (config included); unchecking any exports only the selected plugins, with an optional “include config” flag.",
			gistSelectAll: "Select all",
			gistSelectNone: "Select none",
			gistIncludeConfig: "Include config files (may contain secrets)",
			gistNoPlugins: "This profile has no plugins to export",
			gistSpecLocal: "local",
			gistExportGo: "Export",
			gistCreated: "Exported:",
			gistErrTimeout: "GitHub request timed out — check your network and retry",
			gistErrNetwork: "Cannot reach GitHub — check your network or proxy",
			gistErrAuth: "GitHub authentication failed: invalid/expired token, or gh CLI not logged in",
			gistErrNotFound: "Gist not found — check the ID or URL",
			gistErrRateLimit: "GitHub rate limit hit, or the token lacks the gist scope",
			gistErrInvalid: "Gist content is invalid or uses an unsupported backup format",
			gistModeUpdate: "Update the Gist in the field",
			gistModeCreate: "Create a new private Gist",
			gistErrNoId: "Update mode needs a Gist ID — fill it in, or switch to “Create”",
			gistNote: "Unlike local export (this-machine archive), Gist is for cross-machine sync: export to a private Gist, then import it on another computer with the same account to reuse your plugins. The token lives in this session's memory only and is never written to browser storage; a logged-in gh CLI or DSH_GITHUB_TOKEN skips entering it. Gists are private, 1 MB per file.",
			backupWorking: "In progress…",
			backupDone: "Backup uploaded",
			restoreDone: "Restore complete — restart DeepSeek Harness",
			restorePartial: "Restore completed, but these plugins failed to install:",
			restoreUnportable: "points at an absolute path from another machine that does not exist here — repoint it locally or reinstall the plugin",
			restoreBootError: "Still cannot boot after the restore:",
			orphanBundle: "⚠️ The next start will fail: the profile declares these bundles but they are not installed. Reinstall them, or remove them from dsh.profile.bundles in the profile package.json:",
			restoreConfirm: "Restore will overwrite this profile configuration and reinstall plugins. Continue?",
			restorePreviewDone: "Backup imported. Review Installed, then start restore.",
			restoreMissing: "{0} plugins from this backup are not installed",
			restoreStart: "Start restore",
			notInstalled: "Not installed",
			themeApply: "Use",
			themeActive: "Active",
			themeDeactivate: "Deactivate",
			themeEmpty: "No themes in the catalog yet",
			themePreview: "Preview",
			themePreviewLoading: "Finding preview…",
			themePreviewMissing: "Preview unavailable",
			themePreviewCount: "{0} previews",
			themeResultCount: "{0} themes",
			themeFullscreen: "Browse full screen",
			themeExitFullscreen: "Exit full screen",
			progressHint: "First installs download and resolve dependencies — large plugins can take 1-3 minutes",
			toastReady: "installed and live",
			toastTheme: "is now active. Switch any time in Settings → Plugin Market → Themes",
			toastToggledOn: "is now on",
			toastToggledOff: "is now off; it stopped working immediately",
			gotIt: "Dismiss",
			stateLive: "Active",
			stateRestart: "Installed — restart to apply",
			stateInert: "Installed, not active",
			stateBroken: "Installed, verification failed",
			stateDisabled: "Disabled",
			phaseResolving: "Resolving dependencies",
			phaseDownloading: "Downloading",
			phaseLinking: "Linking",
			phaseBuilding: "Running build scripts",
			cancelling: "Cancelling…",
			packagesDone: "{0} packages processed",
			updatedLive: "✓ Updated — live",
			partialNote: "Cancelled — some changes were applied",
			reconciledNote: "Removed, but pnpm reported an error while finishing up (usually a locked file). The profile is already reconciled — no retry needed.",
			actWhy: "Why not live?",
			tabList: "List",
			tabGroups: "Groups",
			repoLink: "View the repository on GitHub",
			disabledState: "Disabled",
			noteAdd: "Add note",
			noteEdit: "Edit note",
			noteTheirs: "Original",
			noteMine: "My note",
			noteSave: "Save",
			notePlaceholder: "Describe it in your own words. This replaces the author description.",
			noteSeeTheirs: "Show the author description",
			noteSeeMine: "Back to my note",
			switchOnLabel: "Enabled",
			enable: "Enable",
			disable: "Disable",
			toggleFail: "Toggle failed",
			deprecatedBadge: "Deprecated",
			deprecatedWarn: "This plugin is marked as deprecated by the catalog; new users are advised against installing it.",
			viewReplacement: "View replacement",
			installReplacement: "Install replacement",
			replacementHint: "Catalog suggests",
			groupNew: "New group",
			groupNamePh: "Group name",
			groupRename: "Rename",
			groupDelete: "Delete group",
			groupConfirmDelete: "Delete group?",
			ungrouped: "Ungrouped",
			groupAssign: "Assign",
			groupRemove: "Remove",
			groupEmpty: "No members yet",
			groupMixed: "Partially enabled",
			noGroups: "No groups yet. Create one to begin.",
			groupCreate: "Create",
			groupAdd: "Add plugin",
			groupAddTheme: "Add theme",
			groupAddEmpty: "Every installed plugin is already in this group",
			tabDiagnostics: "Diagnostics",
			checkIssues: "Issues found",
			checkErrors: "Errors",
			checkWarnings: "Warnings",
			checkLoading: "Analyzing the profile…",
			checkLoadFail: "Failed to load diagnostics: ",
			checkProfile: "profile",
			checkErrorsEmpty: "No errors",
			checkWarningsEmpty: "No warnings",
			checkBundles: "Plugin load order (bundles)",
			checkBundlesEmpty: "No plugin layers declared",
			checkOfficial: "official",
			checkCommunity: "community",
			checkSource: "source",
			checkEntries: "entries (loader ids)",
			checkPatch: "patch file",
			checkDir: "directory",
			checkDuplicates: "Duplicate plugin entries",
			checkDuplicatesEmpty: "No duplicate plugin entries",
			checkHoisted: "hoisted",
			checkPeerMismatches: "Dependency version mismatches",
			checkPeerEmpty: "No dependency version mismatches",
			checkPeerInfo: "{0} informational entries (unconfirmed)",
			checkPeerOverview: "{0} mismatch(es) · {1} informational",
			checkRange: "declared range",
			checkResolved: "resolved version",
			checkSatisfied: "satisfied",
			checkUnsatisfied: "not satisfied",
			checkUnknown: "unknown",
			checkPeerRisk: "Dependency risks",
			checkPeerRiskEmpty: "No risk-level dependency mismatches",
			checkPeerWarning: "Dependency warnings",
			checkPeerWarningEmpty: "No warning-level dependency mismatches",
			checkPeerInfoTier: "Dependency info",
			checkPeerInfoTierEmpty: "No informational dependency entries",
			checkPeerSatisfied: "Satisfied dependencies",
			checkPeerSatisfiedEmpty: "No satisfied dependency entries",
			peerRiskBelowMin: "below declared minimum",
			peerRiskAboveMax: "above explicit maximum",
			peerWarnOptional: "optional peer",
			peerWarnAboveMax: "above declared upper bound",
			peerInfoUnverified: "unverified",
			checkMultiVersion: "Multi-version core packages",
			checkMultiEmpty: "No multi-version core packages",
			checkOverrides: "Overrides",
			checkOverridesEmpty: "No overrides",
			checkOverridden: "overrides",
			checkOrphans: "Invalid config entries",
			checkOrphansEmpty: "No invalid config entries",
			orphanInsertNotArray: "malformed",
			orphanInsertTargetMissing: "target not found",
			orphanInsertTargetNotGroup: "target is not a group",
			orphanIdRequired: "missing id",
			orphanPatchTargetMissing: "target not found",
			orphanNameMismatch: "name mismatch",
			orphanReasonOther: "other",
			diagExplain: "About this page",
			diagExplainText: "This page checks for plugins that conflict with each other, mismatched dependencies, or wrong load order. Terms used:",
			diagTermBundle: "bundle = one plugin package, applied in order",
			diagTermEntry: "entry = one item a plugin registers in the running composition",
			diagTermPeer: "peer dependency = another package a plugin requires from the host",
			diagTermShadow: "shadowing = a plugin’s old copy covers the host’s newer one",
			diagTermOrphan: "invalid entry = config references something that does not exist",
			diagTermOrder: "load order = the order plugins activate; the later one may override the earlier",
			orderSection: "Ordering",
			orderUp: "↑",
			orderDown: "↓",
			orderApply: "Apply order",
			orderDrag: "Drag to reorder",
			orderDragHint: "Drag ⠿ to reorder. Changes are saved when you apply the order.",
			orderConflicts: "before/after conflicts in the current order",
			orderApplied: "✓ Applied — restart to apply",
			orderSuggestApply: "Apply suggested order",
			orderSuggestHint: "Suggested order (auto-sorted by before/after rules):",
			orderAutoSort: "Auto-sort",
			orderAlreadyOptimal: "Current order already satisfies every rule and plugin dependency — nothing to reorder",
			orderTrialFail: "Static composition validation failed: {0}",
			orderDiffHint: "This order would change the composition: {0} override(s), {1} orphan(s), {2} duplicate(s)",
			duplicateNames: "Same-name plugins (informational only, not a conflict)",
			orderReset: "Reset draft",
			checkRefresh: "Re-check",
			aiFix: "AI fix",
			aiFixHint: "Hand the diagnostics to a new Agent session (copied to the clipboard; you decide whether to send)",
			aiFixIntro: "Please help me fix the plugin issues of DeepSeek Harness (profile: {0}). Diagnostics found:",
			aiFixDetect: "Step 1 — identify yourself first. Before touching anything, determine whether the process you are running in IS the DeepSeek Harness instance this profile belongs to (i.e. this diagnosed composition is the one you are running in right now). Check whether the cwd / $DSH_HOME / command line points at this profile, or whether you are running inside a deepseek-harness process. If you cannot tell, assume the answer is \"yes\" (the safe choice).",
			aiFixIfSelf: "If YES — you are this harness: never change the live composition, the harness or core packages in place (don't edit cordis.patch.yml, don't reorder/enable/disable bundles, don't install/remove/upgrade a plugin, don't reinstall deps, don't upgrade/restart dsh). Three steps: 1) read-only analysis only, change nothing; 2) produce apply.sh/.bat (this fix's changes) and rollback.sh/.bat (fully reverts it); both are idempotent — apply snapshots only when none exists yet and never overwrites an existing snapshot (an existing one means apply already ran, so roll back or confirm before re-running), while rollback restores from that snapshot, so a half-run apply can still be rolled back and repeated rollback is safe; 3) have me run apply in an external terminal and paste the stdout/stderr back to you. State the reason and wait for my confirmation at each step — never run these yourself.",
			aiFixScope: "If NO — you are a process outside the target harness: you may then consider reordering dsh.profile.bundles, disabling / enabling plugins, or adjusting cordis.patch.yml. Note: official bundles are fixed; state your plan before changing anything.",
			aiFixConservative: "Be conservative: only fix the clear errors listed above (boot failures / duplicate entries / risk-level dependency mismatches). Treat warnings and informational entries (e.g. optional or unconfirmed peer ranges) only when they relate to a clear error. Do not perform unnecessary upgrades or reordering; explain each change and wait for confirmation.",
			aiFixCopied: "Fix prompt copied — paste it into a new conversation and send when ready",
			aiFixFail: "Clipboard unavailable — copy the diagnostics below manually",
			catConflict: "Conflicts",
			catDeps: "Dependencies",
			catRisk: "Risk",
			catWarn: "Warning",
			catInfo: "Info",
			catOrder: "Order",
			/** Summary-strip tooltip for the order count (before/after rule conflicts). */
			checkOrderTip: "community bundle load order conflicts with declared before/after rules",
			diagOkAll: "No conflict, dependency or ordering issues found",
			presetSection: "Plugin presets",
			presetHint: "Save the current bundle order and disabled list as a preset and switch anytime; applying runs a trial-start check and creates a snapshot first.",
			presetName: "Preset name",
			presetSave: "Save current state",
			presetSaving: "Saving…",
			presetSaved: "Preset saved",
			presetApply: "Apply",
			presetApplied: "Applied — restart to apply",
			presetDelete: "Delete",
			presetDeleted: "Preset deleted",
			presetEmpty: "No presets saved yet",
			presetNameEmpty: "Enter a preset name",
			presetFail: "Preset operation failed: ",
			presetListFail: "Failed to load presets: ",
			presetBundleCount: "{0} bundles",
			presetPreview: "Preview",
			presetPreviewTitle: "Applying this preset will:",
			presetReorder: "reorder {0} bundles",
			presetEnable: "enable {0} plugins",
			presetDisable: "disable {0} plugins",
			presetNoop: "no changes",
			presetPreviewFail: "Preview failed: ",
			snapSection: "Snapshots & Rollback",
			snapHint: "Snapshots are taken automatically before applying changes; you can also create one manually and roll back anytime.",
			snapCreate: "Create snapshot",
			snapCreating: "Creating…",
			snapCreated: "Snapshot created",
			snapEmpty: "No snapshots yet",
			snapListFail: "Failed to load snapshots: ",
			snapCreateFail: "Failed to create snapshot: ",
			snapRestore: "Restore",
			snapRestoring: "Restoring…",
			snapRestored: "Restored — restart to apply",
			snapRestoreFail: "Failed to restore: ",
			snapRestoreConfirm: "Confirm restore",
			snapRestoreConfirmText: "Restoring overwrites the current profile package.json and configuration from the snapshot; this cannot be undone (create a fresh snapshot first if unsure).",
			snapFiles: "files",
			snapDelete: "Delete",
			snapDeleting: "Deleting…",
			snapDeleted: "Snapshot deleted",
			snapDeleteFail: "Failed to delete snapshot: ",
			snapDeleteConfirm: "Confirm delete",
			snapDeleteConfirmText: "This snapshot cannot be recovered after deletion.",
			marketNoToggle: "The market itself cannot be disabled",
			hostDependencyWarning: "A plugin lists known shared DSH host packages in dependencies. This may shadow the host version; the check is manifest-only and does not confirm a duplicate runtime instance:",
			hostDependencyMore: "{0} more finding(s) omitted"
		};
		//#endregion
		//#region src/client/market-data.ts
		/** One registry entry from /dsh-market/registry. */
		/**
		* Resolve a market API path against the page the UI is served from.
		*
		* Every call used to be root-absolute (`/dsh-market/…`), which the browser
		* resolves against the ORIGIN — so behind a reverse proxy that mounts dsh
		* under a prefix (`https://host/app/my-dsh/`), the panel rendered and then
		* every request in it went to `https://host/dsh-market/…`, missed the prefix
		* rule entirely, and 404'd (#345).
		*
		* Anchored on `document.baseURI`, which is the directory the host serves its
		* UI from. Safe for root deployments because that directory is `/` there, and
		* safe generally because the dsh web UI does not use path routing — measured
		* against a real dsh: `location.pathname` is `/` on the market page, not
		* `/settings/...`, so the directory really is the mount point rather than
		* wherever the user happens to have navigated.
		*/
		function api(path) {
			const relative = path.replace(/^\/+/, "");
			if (typeof document === "undefined") return `/${relative}`;
			return new URL(relative, document.baseURI).pathname;
		}
		/** Category ids for one entry, de-duplicated in declaration order. */
		function pluginCategories(plugin) {
			const values = Array.isArray(plugin.category) ? plugin.category : [plugin.category];
			const categories = [];
			const seen = /* @__PURE__ */ new Set();
			for (const value of values) {
				if (typeof value !== "string" || value === "" || seen.has(value)) continue;
				seen.add(value);
				categories.push(value);
			}
			return categories;
		}
		/**
		* Add active profile Bundles as presence-only catalog entries.
		*
		* The returned map is for catalog matching only. Update and uninstall flows
		* must keep using the dependency-only map because a Bundle supplied by the
		* dsh installation is not owned by the profile package manager.
		*/
		function installedForCatalog(installed, bundles) {
			return Object.fromEntries([...bundles.map((name) => [name, "*"]), ...Object.entries(installed)]);
		}
		function groupSwitchState(members, disabled) {
			const list = members ?? [];
			if (list.length === 0) return "empty";
			let anyOn = false;
			let anyOff = false;
			for (const member of list) if (disabled.has(member)) anyOff = true;
			else anyOn = true;
			return anyOn && anyOff ? "mixed" : anyOff ? "off" : "on";
		}
		function avatarColor(name) {
			let hash = 0;
			for (let i = 0; i < name.length; i++) hash = hash * 31 + name.charCodeAt(i) | 0;
			return "hsl(" + (hash % 360 + 360) % 360 + " 55% 52%)";
		}
		function readSession(key) {
			try {
				return JSON.parse(sessionStorage.getItem(key) || "null");
			} catch {
				return null;
			}
		}
		/** Heuristic: plugins that target a terminal surface rather than the web UI. */
		function looksTerminal(plugin, lang) {
			const positiveDesc = (plugin.description && (plugin.description[lang] || plugin.description.en) || "").replace(/\b(?:no|without)\b[^.!?;:，。！？；\n]{0,80}\b(?:tui|cli|tty|terminal)\b/gi, "").replace(/(?:无需|无须|不需要|不用)[^。！？；\n]{0,48}(?:tui|cli|tty|terminal|终端|命令行)/gi, "");
			return /\b(tui|cli|tty|terminal)\b|终端|命令行/i.test(plugin.name + " " + positiveDesc);
		}
		/** Days per TimeRange (`all` has no cutoff and is handled by the caller). */
		const TIME_RANGE_DAYS = {
			day: 1,
			week: 7,
			month: 30,
			quarter: 90,
			year: 365
		};
		/** True when `added` is a date within the last `days` days (inclusive). */
		function withinDays(added, days) {
			if (added === void 0 || added === "") return false;
			const time = Date.parse(added);
			if (Number.isNaN(time)) return false;
			const age = Date.now() - time;
			return age >= 0 && age <= days * 864e5;
		}
		/**
		* Whether a catalog entry IS the market itself. The catalog still carries
		* it — nothing about the data changes, and the Installed tab still shows it
		* — this is purely "a store has no reason to sell itself to someone already
		* standing in it."
		*/
		function isMarketItself(plugin) {
			return plugin.name === "dsh-market" || plugin.npm === "dshmarket";
		}
		/** Normalize punctuation-separated package names and human text alike. */
		function searchText(value) {
			return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
		}
		/**
		* Normalized catalog fields are immutable for the lifetime of one registry
		* entry. Keep them with that entry so typing does not repeat unicode
		* normalization across the whole catalog, while replaced catalogs remain
		* collectible. The raw query is intentionally not cached: it is normalized
		* once per call and would otherwise grow the cache on every keystroke.
		*/
		const pluginSearchTextCache = /* @__PURE__ */ new WeakMap();
		function cachedPluginSearchText(plugin, value) {
			let fields = pluginSearchTextCache.get(plugin);
			if (fields === void 0) {
				fields = /* @__PURE__ */ new Map();
				pluginSearchTextCache.set(plugin, fields);
			}
			const hit = fields.get(value);
			if (hit !== void 0) return hit;
			const normalized = searchText(value);
			fields.set(value, normalized);
			return normalized;
		}
		/**
		* Relevance within one field. Exact and prefix matches beat phrase matches;
		* for a multi-word query every word must occur in the same field.
		*/
		function fieldRelevance(plugin, value, query, tokens, weight) {
			if (!value) return 0;
			const text = cachedPluginSearchText(plugin, value);
			if (text === "" || !tokens.every((token) => text.includes(token))) return 0;
			if (text === query) return weight + 300;
			if (text.startsWith(query)) return weight + 250;
			if (text.includes(query)) return weight + 200;
			return weight + 150;
		}
		/**
		* Search ranking is field-aware rather than a popularity-only filter:
		* package identities outrank owners, descriptions, and categories. The
		* selected popularity/date sort remains the tie-breaker between equally
		* relevant entries.
		*/
		function pluginRelevance(plugin, query, tokens, lang, categories) {
			const descriptions = plugin.description ?? {};
			const preferredLocale = descriptions[lang] ? lang : descriptions.en ? "en" : null;
			const preferredDescription = descriptions[lang] || descriptions.en;
			const otherDescriptions = Object.entries(descriptions).filter(([locale, value]) => locale !== preferredLocale && typeof value === "string").map(([, value]) => value);
			const categoryIds = pluginCategories(plugin);
			const categoryLabels = categoryIds.flatMap((category) => Object.values(categories?.[category] ?? {}));
			return Math.max(fieldRelevance(plugin, plugin.name, query, tokens, 700), fieldRelevance(plugin, plugin.npm, query, tokens, 700), fieldRelevance(plugin, plugin.owner, query, tokens, 400), fieldRelevance(plugin, preferredDescription, query, tokens, 280), ...otherDescriptions.map((value) => fieldRelevance(plugin, value, query, tokens, 240)), ...categoryIds.map((value) => fieldRelevance(plugin, value, query, tokens, 180)), ...categoryLabels.map((value) => fieldRelevance(plugin, value, query, tokens, 180)));
		}
		/** Compare two already-filtered entries using the user's selected sort. */
		function comparePlugins(a, b, sort) {
			const hasDownloads = (p) => typeof p.downloads === "number";
			if (sort === "downloads-desc") {
				if (hasDownloads(a) && hasDownloads(b)) return b.downloads - a.downloads;
				if (hasDownloads(a)) return -1;
				if (hasDownloads(b)) return 1;
				return (b.stars ?? -1) - (a.stars ?? -1);
			}
			if (sort === "downloads-asc") {
				if (hasDownloads(a) && hasDownloads(b)) return a.downloads - b.downloads;
				if (hasDownloads(a)) return -1;
				if (hasDownloads(b)) return 1;
				return (a.stars ?? -1) - (b.stars ?? -1);
			}
			if (sort === "stars-desc") return (b.stars ?? -1) - (a.stars ?? -1);
			if (sort === "stars-asc") return (a.stars ?? -1) - (b.stars ?? -1);
			if (sort === "added-desc") return String(b.added).localeCompare(String(a.added));
			if (sort === "added-asc") return String(a.added).localeCompare(String(b.added));
			return 0;
		}
		/**
		* The discover list: category filter, then the published-within window, then
		* relevance-ranked search across package identity / owner / every localized
		* description / category ids and labels. With no search, only the selected
		* sort applies, preserving the existing discover-list behaviour.
		* Pure — the section renders exactly this.
		*/
		function visiblePlugins(plugins, options) {
			const query = searchText(options.query);
			const tokens = query.split(" ").filter(Boolean);
			return plugins.flatMap((plugin, index) => {
				if (isMarketItself(plugin)) return [];
				const categories = pluginCategories(plugin);
				if (options.category !== "all" && !categories.includes(options.category)) return [];
				if (options.sinceDays !== void 0 && !withinDays(plugin.added, options.sinceDays)) return [];
				const relevance = query === "" ? 0 : pluginRelevance(plugin, query, tokens, options.lang, options.categories);
				return relevance === 0 && query !== "" ? [] : [{
					plugin,
					relevance,
					index
				}];
			}).sort((a, b) => b.relevance - a.relevance || comparePlugins(a.plugin, b.plugin, options.sort) || a.index - b.index).map((row) => row.plugin);
		}
		/** The themes tab listing: theme category only, most-starred first. */
		function themePlugins(plugins) {
			return plugins.filter((p) => pluginCategories(p).includes("theme")).sort((a, b) => (b.stars || 0) - (a.stars || 0));
		}
		/**
		* Category chip order: collapsed with an active non-'all' chip that would
		* otherwise be clipped out of the two-row preview, the active one moves to
		* the front so it stays visible.
		*
		* Reported as "点了某个分类，标签就跑到前面来了，好奇怪": the earlier version
		* moved the active chip to the front unconditionally, so clicking a category
		* that was ALREADY visible inside the two rows still reshuffled it — and
		* every chip after it — for no reason, since nothing was at risk of being
		* hidden. `visibleCount` is how many chips (the 'all' chip included) the
		* two-row clip fits; a category already within that budget in its natural
		* position is left exactly where it was.
		*
		* `visibleCount === null` (not yet measured, e.g. the very first collapsed
		* render) keeps the old unconditional behaviour: with no measurement to
		* check against, guaranteeing visibility is the safe default.
		*/
		function orderedCategories(categories, active, open, visibleCount = null) {
			if (open || active === "all") return categories;
			if (visibleCount !== null) {
				const budget = Math.max(0, visibleCount - 1);
				const naturalIndex = categories.indexOf(active);
				if (naturalIndex !== -1 && naturalIndex < budget) return categories;
			}
			return [active, ...categories.filter((id) => id !== active)];
		}
		/**
		* Page-number list for the discover pager. With few pages it is simply
		* 1..total; with many it windows around the current page and inserts '…'
		* so a 400-plugin catalog stays a compact `1 … 4 5 6 … 17` instead of a
		* long row of numbered buttons. Always begins with 1 and ends with total.
		*/
		function pageItems(current, total) {
			if (total <= 7) {
				const all = [];
				for (let i = 1; i <= total; i++) all.push(i);
				return all;
			}
			const items = [1];
			let start = Math.max(2, current - 1);
			let end = Math.min(total - 1, current + 1);
			if (current <= 4) end = 5;
			if (current >= total - 3) start = total - 4;
			if (start > 2) items.push("…");
			for (let i = start; i <= end; i++) items.push(i);
			if (end < total - 1) items.push("…");
			items.push(total);
			return items;
		}
		/**
		* Unified installed-state matching (#15): both sides collapse to lowercase
		* identity sets — the registry entry contributes its bare name, npm name and
		* owner/repo; the dependency contributes its key and the repo inside its
		* spec — and any exact intersection counts. Exact equality, not substrings,
		* so prefix-related repo names cannot cross-match.
		*/
		/**
		* Memo for entryIdentities, keyed on the catalog entry object itself.
		*
		* Catalog entries are parsed once and never mutated, so the identity set is
		* a pure function of an object that outlives every call — a WeakMap holds
		* it for exactly as long as the catalog is alive and not one render longer.
		* Worth caching because this is the innermost step of the installed-state
		* matching that runs for every card on screen (#262).
		*/
		const entryIdCache = /* @__PURE__ */ new WeakMap();
		function entryIdentities(plugin) {
			const cached = entryIdCache.get(plugin);
			if (cached !== void 0) return cached;
			const ids = /* @__PURE__ */ new Set([plugin.name.toLowerCase()]);
			if (plugin.npm) ids.add(plugin.npm.toLowerCase());
			const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(plugin.url);
			if (m !== null) ids.add(m[2] !== void 0 ? `${m[1].toLowerCase()}#path:/${m[2].toLowerCase()}` : m[1].toLowerCase());
			entryIdCache.set(plugin, ids);
			return ids;
		}
		const REPO_ID_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#path:\/[A-Za-z0-9_./-]+)?$/;
		function addRepoIdentities(ids, values) {
			for (const value of values) {
				if (!REPO_ID_RE.test(value)) continue;
				const subpath = value.split("#path:/")[1];
				if (subpath !== void 0 && subpath.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) continue;
				ids.add(value.toLowerCase());
			}
		}
		/** Repo identities carried by a github shortcut, including `#sha&path:`. */
		function githubSpecRepoIds(spec) {
			const ids = /* @__PURE__ */ new Set();
			const match = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?(?:#(.*))?$/i.exec(spec);
			if (match === null) return ids;
			const repo = match[1].toLowerCase();
			let subpath = null;
			for (const selector of (match[2] ?? "").split("&")) {
				if (!selector.startsWith("path:/")) continue;
				const candidate = selector.slice(6);
				if (!REPO_ID_RE.test(`${repo}#path:/${candidate}`) || candidate.split("/").some((seg) => seg === "" || seg === "." || seg === "..") || subpath !== null) return /* @__PURE__ */ new Set();
				subpath = candidate.toLowerCase();
			}
			ids.add(repo);
			if (subpath !== null) ids.add(`${repo}#path:/${subpath}`);
			return ids;
		}
		function depIdentities(name, spec, repoIdentities = []) {
			const ids = /* @__PURE__ */ new Set([name.toLowerCase()]);
			const scoped = /^@([^/]+)\/(.+)$/.exec(name);
			if (scoped !== null) ids.add(`${scoped[1].toLowerCase()}/${scoped[2].toLowerCase()}`);
			for (const id of githubSpecRepoIds(spec)) ids.add(id);
			addRepoIdentities(ids, repoIdentities);
			return ids;
		}
		/**
		* Repo identities stated by the dependency SPEC itself (github: installs) —
		* hard evidence of where the package came from, unlike the name-derived
		* mirror in depIdentities, which is only a matching aid.
		*/
		function depRepoIds(spec, repoIdentities = []) {
			const ids = githubSpecRepoIds(spec);
			addRepoIdentities(ids, repoIdentities);
			return ids;
		}
		/** Repo identity of a registry entry's source url (repo or repo#path form). */
		function entryRepoIds(plugin) {
			const ids = /* @__PURE__ */ new Set();
			const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(plugin.url);
			if (m !== null) ids.add(m[2] !== void 0 ? `${m[1].toLowerCase()}#path:/${m[2].toLowerCase()}` : m[1].toLowerCase());
			return ids;
		}
		/**
		* The curated registry lists distinct plugins sharing one name — twelve
		* name-groups at the time of #66 (both dsh-usage-stats, four dsh-memory…).
		* A name coincidence must not survive contradicting repo evidence: when the
		* dependency's spec pins a github repo AND the entry states one, the repos
		* decide — the loose name/npm identities only apply when at least one side
		* carries no repo evidence (npm installs, non-github entries).
		*/
		function sameSourceConflict(plugin, spec, repoIdentities = []) {
			const entry = entryRepoIds(plugin);
			const dep = depRepoIds(spec, repoIdentities);
			if (entry.size === 0 || dep.size === 0) return false;
			for (const id of dep) if (entry.has(id)) return false;
			return true;
		}
		function repoHintMatches(plugin, hints) {
			const entry = entryRepoIds(plugin);
			const values = /* @__PURE__ */ new Set();
			addRepoIdentities(values, hints);
			for (const id of values) if (entry.has(id)) return true;
			return false;
		}
		/**
		* Memo for looseMatchCount, keyed on the catalog array then the dep name.
		*
		* This is THE hot path behind "the plugin list is very laggy" (#262). The
		* count answers "how many catalog entries could this installed dependency
		* be?", which depends only on the catalog and the name — not on the card
		* being drawn. But it was called from matchInstalledName, which runs once
		* per installed dependency, which runs once per rendered card: a full scan
		* of ~1800 entries, repeated cards × installed times, on every single
		* render. A profile from the reporter put it at 2.9 seconds, 28% of the
		* whole trace, and a local benchmark measured 48ms per render at 24 cards
		* and 224ms at 96 against a smaller 839-entry catalog.
		*
		* Keyed on the array identity so a refetched catalog gets a fresh map for
		* free — a new parse is a new array, and the old one is collectable.
		*/
		const looseMatchCountCache = /* @__PURE__ */ new WeakMap();
		function looseMatchCount(plugins, name) {
			let byName = looseMatchCountCache.get(plugins);
			if (byName === void 0) {
				byName = /* @__PURE__ */ new Map();
				looseMatchCountCache.set(plugins, byName);
			}
			const hit = byName.get(name);
			if (hit !== void 0) return hit;
			const dep = depIdentities(name, "");
			let count = 0;
			for (const plugin of plugins) for (const id of entryIdentities(plugin)) if (dep.has(id)) {
				count += 1;
				break;
			}
			byName.set(name, count);
			return count;
		}
		function looseMatches(plugin, name) {
			const dep = depIdentities(name, "");
			for (const id of entryIdentities(plugin)) if (dep.has(id)) return true;
			return false;
		}
		/** The installed dependency name a registry entry corresponds to, or null. */
		function matchInstalledName(plugin, installed, repoIdentities = {}, plugins, repoHints = {}) {
			const ids = entryIdentities(plugin);
			for (const [name, spec] of Object.entries(installed)) {
				const repos = repoIdentities[name] ?? [];
				if (depRepoIds(String(spec), repos).size === 0 && plugins !== void 0 && looseMatchCount(plugins, name) > 1 && !repoHintMatches(plugin, repoHints[name] ?? [])) continue;
				if (sameSourceConflict(plugin, String(spec), repos)) continue;
				for (const id of depIdentities(name, String(spec), repos)) if (ids.has(id)) return name;
			}
			return null;
		}
		/** The registry entry an installed dependency corresponds to, or undefined. */
		function entryForDep(plugins, name, spec, repoIdentities = [], repoHints = []) {
			if (depRepoIds(String(spec), repoIdentities).size === 0 && looseMatchCount(plugins, name) > 1) {
				if (plugins.find((plugin) => repoHintMatches(plugin, repoHints) && looseMatches(plugin, name)) === void 0) return void 0;
			}
			const ids = depIdentities(name, String(spec), repoIdentities);
			return plugins.find((plugin) => {
				if (sameSourceConflict(plugin, String(spec), repoIdentities)) return false;
				for (const id of entryIdentities(plugin)) if (ids.has(id)) return true;
				return false;
			});
		}
		function isInstalled(plugin, installed, repoIdentities = {}, plugins, repoHints = {}) {
			return matchInstalledName(plugin, installed, repoIdentities, plugins, repoHints) !== null;
		}
		/**
		* The header brand mark now lives in MarketSection.tsx as an inline SVG
		* (official-style monochrome glyph, fill="currentColor") so it follows the
		* active theme; the colored assets/logo.svg tile is no longer inlined here.
		*/
		/** Four representative colors for a theme card's preview strip. */
		function themeSwatch(def) {
			const tk = def.tokens || {};
			const pick = (names) => {
				for (const n of names) if (tk[n]) return tk[n];
				return null;
			};
			const dark = def.colorScheme === "dark";
			return [
				pick(["--dsw-alias-bg-base", "--dsw-alias-bg-layer-1"]) || (dark ? "#0f1115" : "#ffffff"),
				pick(["--dsw-alias-bg-layer-2", "--dsw-alias-bg-overlay"]) || (dark ? "#1a1d23" : "#f3f4f6"),
				pick(["--dsw-alias-brand-primary"]) || "#4f6ef7",
				pick(["--dsw-alias-label-primary"]) || (dark ? "#e5e7eb" : "#1f2328")
			];
		}
		/**
		* Prefix for github.com URLs this page loads, or null to address them
		* directly. Set from the status poll, which gets it from the download region.
		*
		* Module state rather than a prop: the URLs it applies to are built in four
		* places across two files (avatars, README fetches, screenshot thumbnails),
		* and threading one string through every card would put it in signatures
		* that have no other reason to know about networking.
		*
		* Applied at the LAST moment, never stored. Extracted image URLs stay
		* canonical, so changing region re-renders against the new route instead of
		* leaving a page full of links to a proxy the user just switched away from.
		*/
		let githubProxy = null;
		/** Point browser-side github.com requests at a proxy, or null for direct. */
		function setGithubProxy(proxy) {
			githubProxy = proxy;
		}
		/** The proxy in force, for callers that must decide between two URL shapes. */
		function githubProxyInUse() {
			return githubProxy;
		}
		/** `url` through the proxy in force, or unchanged when there is none. */
		function githubUrl(url) {
			return githubProxy === null ? url : `${githubProxy}/${url}`;
		}
		/**
		* Image hosts screenshots may load from (#61) — GitHub's own hosting only.
		* Any other host is dropped BEFORE an <img> is created: a screenshot URL is
		* a request carrying the user's IP, so registry data and README content are
		* both treated as untrusted here, matching the upstream build gate.
		*/
		const SCREENSHOT_HOSTS = /* @__PURE__ */ new Set([
			"raw.githubusercontent.com",
			"user-images.githubusercontent.com",
			"camo.githubusercontent.com",
			"github.com"
		]);
		const MAX_SCREENSHOTS = 6;
		/** Return one safe screenshot URL without applying the public list limit. */
		function safeScreenshot(value) {
			if (typeof value !== "string") return null;
			let parsed;
			try {
				parsed = new URL(value);
			} catch {
				return null;
			}
			if (parsed.protocol !== "https:" || !SCREENSHOT_HOSTS.has(parsed.hostname)) return null;
			if (/\.svg$/iu.test(parsed.pathname)) return null;
			return value;
		}
		/** Keep only https URLs on allowlisted image hosts; SVG dropped (logos/badges). */
		function safeScreenshots(urls) {
			if (!Array.isArray(urls)) return [];
			const safe = [];
			for (const value of urls) {
				const src = safeScreenshot(value);
				if (src === null) continue;
				if (!safe.includes(src)) safe.push(src);
				if (safe.length >= MAX_SCREENSHOTS) break;
			}
			return safe;
		}
		const PREVIEW_WORDS = /(?:preview|screen[ -]?shots?|shots?|demo|showcase|gallery|theme|skin|appearance|效果|预览|截图|演示|展示|界面|主题|皮肤)/iu;
		const FULL_PREVIEW_WORDS = /(?:full|overview|home|main|conversation|chat|workspace|dashboard|完整|主页|首页|全景|主界面)/iu;
		const PARTIAL_PREVIEW_WORDS = /(?:settings?|panel|dialog|modal|picker|menu|controls?|fragment|crop|detail|配置|设置|面板|弹窗|局部|细节)/iu;
		const NON_PREVIEW_WORDS = /(?:badge|shield|logo|icon|avatar|sponsor|donat|fund|qr(?:code)?|wechat|qq(?:group)?|npm|build|coverage|license|status|button|favicon|徽章|图标|头像|赞助|捐赠|二维码|微信|交流群)/iu;
		/** A quoted or unquoted HTML attribute; README HTML is data, never rendered. */
		function htmlAttribute(html, name) {
			const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "iu").exec(html);
			return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
		}
		function numericDimension(raw) {
			if (!/^\d+(?:\.\d+)?$/u.test(raw.trim())) return null;
			const value = Number(raw);
			return Number.isFinite(value) && value > 0 ? value : null;
		}
		/** Resolve one README image path to the canonical GitHub-hosted URL. */
		function resolveReadmeImage(raw, owner, repo, base) {
			const src = raw.trim().replace(/^<|>$/g, "");
			if (src === "" || src.startsWith("data:")) return null;
			let absolute;
			if (/^https?:\/\//iu.test(src)) absolute = src;
			else if (src.startsWith("/")) absolute = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD${src}`;
			else try {
				absolute = new URL(src, base).href;
			} catch {
				return null;
			}
			return safeScreenshot(absolute);
		}
		/** Score evidence available without downloading the image itself. */
		function readmeSemanticScore(image, heading, nearby, order, offset) {
			const label = `${image.alt} ${image.title}`;
			const path = (() => {
				try {
					const parsed = new URL(image.src);
					if (parsed.hostname === "raw.githubusercontent.com") return "/" + parsed.pathname.split("/").slice(4).join("/");
					return parsed.pathname;
				} catch {
					return image.src;
				}
			})();
			let score = 20 + Math.max(0, 8 - order);
			if (PREVIEW_WORDS.test(label)) score += 55;
			if (PREVIEW_WORDS.test(path)) score += 40;
			if (PREVIEW_WORDS.test(heading)) score += 32;
			if (PREVIEW_WORDS.test(nearby)) score += 12;
			if (FULL_PREVIEW_WORDS.test(`${label} ${path}`)) score += 35;
			if (PARTIAL_PREVIEW_WORDS.test(`${label} ${path}`)) score -= 30;
			if (NON_PREVIEW_WORDS.test(label)) score -= 140;
			if (NON_PREVIEW_WORDS.test(path)) score -= 120;
			if (NON_PREVIEW_WORDS.test(heading)) score -= 55;
			if (NON_PREVIEW_WORDS.test(nearby)) score -= 18;
			if (offset < 500 && !PREVIEW_WORDS.test(`${label} ${path} ${heading}`)) score -= 20;
			if (image.width !== null && image.height !== null) score += previewDimensionScore(image.width, image.height) ?? -500;
			else if ((image.width ?? image.height ?? Number.POSITIVE_INFINITY) < 240) score -= 100;
			return score;
		}
		/**
		* Ranked README image candidates for use when the catalog has no curated
		* screenshots. Ranking uses the image label/path, nearest heading, nearby
		* prose, declared dimensions and document position. This prevents a title
		* logo or a row of tiny badges from consuming the six-candidate limit before
		* a later Screenshots section is reached.
		*/
		function extractReadmeImageCandidates(markdown, owner, repo, subpath) {
			const base = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${subpath === null ? "" : subpath + "/"}`;
			const headings = [...markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gmu)].map((match) => ({
				offset: match.index,
				text: match[1] ?? ""
			}));
			const found = /* @__PURE__ */ new Map();
			let headingIndex = -1;
			let order = 0;
			for (const match of markdown.matchAll(/!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*\)|<img\b([^>]*?)\/?\s*>/gimu)) {
				while (headingIndex + 1 < headings.length && headings[headingIndex + 1].offset < match.index) headingIndex += 1;
				const html = match[7] ?? "";
				const src = resolveReadmeImage(match[2] ?? match[3] ?? htmlAttribute(html, "src"), owner, repo, base);
				if (src === null) continue;
				const candidate = {
					src,
					semanticScore: readmeSemanticScore({
						src,
						alt: match[1] ?? htmlAttribute(html, "alt"),
						title: match[4] ?? match[5] ?? match[6] ?? htmlAttribute(html, "title"),
						width: numericDimension(htmlAttribute(html, "width")),
						height: numericDimension(htmlAttribute(html, "height"))
					}, headings[headingIndex]?.text ?? "", markdown.slice(Math.max(0, match.index - 100), Math.min(markdown.length, match.index + match[0].length + 100)), order, match.index),
					order,
					curated: false
				};
				const previous = found.get(src);
				if (previous === void 0 || candidate.semanticScore > previous.semanticScore) found.set(src, candidate);
				order += 1;
			}
			return [...found.values()].filter((candidate) => candidate.semanticScore >= 20).sort((a, b) => b.semanticScore - a.semanticScore || a.order - b.order).slice(0, MAX_SCREENSHOTS);
		}
		/**
		* Score dimensions from a 240px-high, no-upscale probe.
		*
		* A theme preview should resemble a complete desktop surface: landscape,
		* neither a narrow crop nor a panoramic strip, and large enough to inspect.
		* Small square logos and portrait fragments intentionally return null.
		*/
		function previewDimensionScore(width, height) {
			if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
			const ratio = width / height;
			const area = width * height;
			if (width < 280 || height < 150 || area < 48e3 || ratio < 1.05 || ratio > 3.2) return null;
			let score = Math.min(28, Math.round(area / 4e3));
			if (ratio >= 1.35 && ratio <= 2.05) score += 48;
			else if (ratio >= 1.18 && ratio <= 2.4) score += 28;
			else score += 8;
			if (width >= 320 && height >= 180) score += 14;
			return score;
		}
		/** Combine README semantics with measured geometry and return the best set. */
		function rankThemeScreenshots(candidates, measurements) {
			const bySrc = new Map(measurements.map((item) => [item.src, item]));
			return candidates.flatMap((candidate) => {
				const measured = bySrc.get(candidate.src);
				if (measured === void 0) return [];
				const dimensionScore = previewDimensionScore(measured.width, measured.height);
				return dimensionScore === null ? [] : [{
					candidate,
					score: candidate.semanticScore + dimensionScore
				}];
			}).sort((a, b) => b.score - a.score || a.candidate.order - b.candidate.order).slice(0, MAX_SCREENSHOTS).map((item) => item.candidate.src);
		}
		const readmeShotsCache = /* @__PURE__ */ new Map();
		/**
		* Screenshot candidates for a plugin: the registry's curated list when
		* present, otherwise lazily extracted and semantically ranked from README.
		*/
		function pluginScreenshotCandidates(plugin) {
			const curated = safeScreenshots(plugin.screenshots);
			if (curated.length > 0) return Promise.resolve(curated.map((src, order) => ({
				src,
				order,
				semanticScore: 1e3 - order,
				curated: true
			})));
			const m = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(plugin.url);
			if (m === null) return Promise.resolve([]);
			const [, owner, repo, subpath = null] = m;
			const cacheKey = plugin.url;
			const cached = readmeShotsCache.get(cacheKey);
			if (cached !== void 0) return cached;
			const fetchReadme = async (path) => {
				try {
					const res = await fetch(githubUrl(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path === null ? "" : path + "/"}README.md`));
					return res.ok ? await res.text() : null;
				} catch {
					return null;
				}
			};
			const task = (async () => {
				const sub = subpath === null ? null : await fetchReadme(subpath);
				if (sub !== null) return extractReadmeImageCandidates(sub, owner, repo, subpath);
				const root = await fetchReadme(null);
				return root === null ? [] : extractReadmeImageCandidates(root, owner, repo, null);
			})().catch(() => []);
			readmeShotsCache.set(cacheKey, task);
			return task;
		}
		/** Screenshot URLs for dialogs; theme covers use the richer candidate API. */
		async function pluginScreenshots(plugin) {
			return (await pluginScreenshotCandidates(plugin)).map((candidate) => candidate.src);
		}
		/**
		* The human-readable part of a failed command's output.
		*
		* pnpm's ndjson reporter writes one JSON object per progress tick, and a
		* large `github:` download emits thousands of them. When a failure matches
		* none of the known signatures there is no diagnosis to show, so the UI
		* falls back to the tail of stdout/stderr — which for exactly that case is
		* 600 characters of `{"name":"pnpm:fetching-progress","downloaded":…}`.
		* The user is handed machine noise at the one moment they need a sentence
		* (#148, and the same shape behind #161).
		*
		* Progress objects are dropped; anything else — including JSON carrying a
		* real message — is kept, because an unrecognized failure is precisely when
		* throwing information away is most expensive.
		*/
		function humanOutput(raw) {
			const lines = raw.split(/\r?\n/);
			const kept = [];
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed === "") continue;
				if (!trimmed.startsWith("{")) {
					kept.push(line);
					continue;
				}
				try {
					const parsed = JSON.parse(trimmed);
					const name = typeof parsed.name === "string" ? parsed.name : "";
					if (parsed.err !== void 0 || typeof parsed.message === "string") {
						kept.push(line);
						continue;
					}
					if (name.startsWith("pnpm:")) continue;
					kept.push(line);
				} catch {
					kept.push(line);
				}
			}
			return kept.join("\n").trim();
		}
		/**
		* The plugin's own name, for display.
		*
		* The catalog's `name` is an IDENTITY, and for the 104 entries that live in
		* a repository holding several plugins it is a compound one:
		* `dsh-web#packages/dsh-web-all`. Shown verbatim it puts a repository
		* path in front of a user who did not ask about repositories — and worse, it
		* disagrees with the market's own installed list, which reads names out of
		* the profile manifest and calls the same plugin `dsh-web-all`. The same
		* thing had two names either side of the Install button.
		*
		* A card answers two questions: who made it, and what is it called. The
		* author is drawn beside their avatar as one unit, so the title is free to
		* be just the plugin. Duplicate titles across authors are fine — the byline
		* is what separates them — which is why this does not try to keep the
		* repository as a qualifier.
		*
		* The repository name IS the plugin name in the ordinary case, because a
		* repository holding one plugin is named after it. Only the compound form
		* needs unpicking, and its last segment is the plugin's own directory.
		*
		* Not a substitute for the identity: every key, lookup and install still
		* uses `name` unchanged.
		*/
		function pluginName(name) {
			const hash = name.indexOf("#");
			if (hash === -1) return name;
			const sub = name.slice(hash + 1);
			const leaf = sub.slice(sub.lastIndexOf("/") + 1);
			return leaf === "" ? name.slice(0, hash) : leaf;
		}
		/**
		* Compact display for a count that can run into the tens of thousands
		* (npm downloads, star counts): "11.9k" instead of "11862". Reported —
		* the raw number made the card byline visibly cramped once downloads was
		* added alongside stars.
		*
		* Below 1000 the exact number is shown; a small count is exactly the case
		* where the precision matters and abbreviating it buys nothing.
		*/
		function formatCount(n) {
			if (!Number.isFinite(n) || n < 1e3) return String(n);
			const k = Math.round(n / 100) / 10;
			return `${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`;
		}
		//#endregion
		//#region src/client/InstallToast.tsx
		/**
		* Post-reload confirmation via the official Toast primitive: shown once after
		* the refresh that follows a hot install or theme switch, so the user lands
		* back in their flow with visible proof.
		*/
		function InstallToast(props) {
			const t = props.t;
			const [mode] = (0, react.useState)(() => {
				const value = sessionStorage.getItem("dshm-toast-mode");
				sessionStorage.removeItem("dshm-toast-mode");
				return value;
			});
			const [names, setNames] = (0, react.useState)(() => {
				const value = readSession("dshm-toast");
				sessionStorage.removeItem("dshm-toast");
				return Array.isArray(value) ? value : [];
			});
			if (names.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				text: names.join(", ") + " " + t(mode === "theme" ? "toastTheme" : "toastReady"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 }),
				onDone: () => setNames([])
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/Market.module.css.mjs
		const css = ".nUhMVa_root{min-width:0;height:100%;color:var(--dsw-alias-label-primary,#1f2328);flex-direction:column;display:flex;position:relative;container-type:inline-size}.nUhMVa_head{flex-direction:column;gap:12px;padding:4px 4px 6px;display:flex}.nUhMVa_title{margin:0;font-size:16px;font-weight:500;line-height:24px}.nUhMVa_sub{color:var(--dsw-alias-label-tertiary,#8b93a1);align-items:center;gap:8px;margin:0;font-size:12px;line-height:18px;display:flex}.nUhMVa_submitLink{color:var(--dsw-alias-label-tertiary,#8b93a1);white-space:nowrap;font-size:11px;line-height:18px;text-decoration:none}.nUhMVa_submitLink:hover{color:var(--dsw-alias-brand-primary,#4f6ef7);text-decoration:underline}.nUhMVa_tabs{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);align-items:flex-end;gap:2px;display:flex}.nUhMVa_tab{font:inherit;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-bottom:2px solid #0000;padding:7px 12px;font-size:13px}.nUhMVa_tab.nUhMVa_on{color:var(--dsw-alias-brand-primary,#4f6ef7);border-bottom-color:var(--dsw-alias-brand-primary,#4f6ef7);font-weight:600}.nUhMVa_subTabs{align-items:flex-end;gap:2px;margin:-4px 0 4px;display:flex}.nUhMVa_banner{background:var(--dsw-alias-bg-layer-2,#fdf3e3);border:1px solid var(--dsw-alias-border-l2,#f3e3c3);border-radius:8px;align-items:center;gap:8px;margin:0;padding:8px 12px;font-size:12px;display:flex}.nUhMVa_bannerIcon{color:var(--dsw-alias-label-secondary,#6b7280);flex-shrink:0}.nUhMVa_bannerHint{color:var(--dsw-alias-label-tertiary,#8b93a1);cursor:help;display:inline-flex}.nUhMVa_body{overflow-anchor:none;flex:1;padding:12px 4px 24px;overflow-x:hidden;overflow-y:auto}.nUhMVa_stickyHead{z-index:5;background:var(--dsw-alias-bg-layer-2,#f7f8fa);position:sticky;top:-1px}.nUhMVa_stickyHead:before{content:\"\";background:inherit;pointer-events:none;height:14px;position:absolute;bottom:100%;left:0;right:0}.nUhMVa_cats{margin:0 -4px 2px;padding:12px 4px 4px}.nUhMVa_catsRow{align-items:flex-start;gap:8px;display:flex;position:relative}.nUhMVa_star{color:var(--dsw-alias-label-secondary,#9ca3af);white-space:nowrap;flex:none;font-size:11px}.nUhMVa_top{z-index:20;display:inline-flex;position:absolute;bottom:18px;right:18px}.nUhMVa_topBtn{border-radius:99px;width:38px;height:38px;padding:0}.nUhMVa_tag{border:1px solid var(--dsw-alias-border-l3,#d9dde3);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:4px;flex-shrink:0;padding:1px 6px;font-size:11px;line-height:16px}.nUhMVa_okState{color:var(--dsw-alias-state-success-primary,#16a34a);white-space:nowrap;font-size:12px;font-weight:600}.nUhMVa_catsWrap{flex-wrap:wrap;flex:1;align-items:center;gap:6px;min-width:0;display:flex}.nUhMVa_catsCollapsed{max-height:62px;overflow:hidden}.nUhMVa_catsToggle.nUhMVa_catsToggle{height:26px;min-height:26px;color:var(--dsw-alias-label-secondary,#6b7280);padding:0 6px}.nUhMVa_shots{-webkit-overflow-scrolling:touch;scrollbar-width:thin;gap:8px;margin:6px 0 8px;padding:2px 0 6px;display:flex;overflow-x:auto}.nUhMVa_shot{object-fit:cover;border:1px solid var(--dsw-alias-border-default,#e5e7eb);background:var(--dsw-alias-bg-layer-2,#f3f4f6);cursor:pointer;border-radius:8px;flex:none;width:220px;height:150px}.nUhMVa_cardShots{-webkit-overflow-scrolling:touch;scrollbar-width:thin;gap:6px;margin:0 0 6px;padding:0 0 2px;display:flex;overflow-x:auto}.nUhMVa_cardShot{object-fit:contain;border:1px solid var(--dsw-alias-border-default,#e5e7eb);background:var(--dsw-alias-bg-layer-2,#f3f4f6);cursor:pointer;border-radius:8px;flex:none;width:132px;height:88px;display:block}.nUhMVa_lightbox{z-index:10000;cursor:zoom-out;background:#000000d9;justify-content:center;align-items:center;display:flex;position:fixed;top:0;bottom:0;left:0;right:0}.nUhMVa_lightboxImg{object-fit:contain;cursor:default;border-radius:4px;max-width:90vw;max-height:85vh}.nUhMVa_lightboxClose{color:#fff;cursor:pointer;background:#ffffff1f;border:none;border-radius:99px;place-items:center;width:36px;height:36px;font-size:22px;line-height:1;display:grid;position:absolute;top:16px;right:16px}.nUhMVa_lightboxClose:hover{background:#ffffff38}.nUhMVa_lightboxNav{color:#fff;cursor:pointer;background:#ffffff1f;border:none;border-radius:99px;place-items:center;width:44px;height:44px;display:grid;position:absolute;top:50%;transform:translateY(-50%)}.nUhMVa_lightboxNav:hover{background:#ffffff38}.nUhMVa_lightboxPrev{left:16px}.nUhMVa_lightboxNext{right:16px}.nUhMVa_lightboxDots{gap:8px;display:flex;position:absolute;bottom:20px;left:50%;transform:translate(-50%)}.nUhMVa_lightboxDot{cursor:pointer;background:#fff6;border-radius:99px;width:7px;height:7px}.nUhMVa_lightboxDotOn{background:#fff}.nUhMVa_cmd{background:var(--dsw-alias-bg-layer-2,#f3f4f6);word-break:break-all;border-radius:6px;margin:8px 0 0;padding:8px 10px;font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:18px}.nUhMVa_warnLine{color:var(--dsw-alias-state-warn-primary,#b45309);flex-wrap:wrap;align-items:center;gap:4px;margin:0;font-size:12px;font-weight:600;line-height:18px;display:flex}.nUhMVa_modalNote{color:var(--dsw-alias-label-tertiary,#8b93a1);align-items:center;gap:4px;margin:12px 0 0;font-size:12px;line-height:18px;display:flex}.nUhMVa_grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:10px;display:grid}.nUhMVa_masonry{align-items:flex-start;gap:10px;display:flex}.nUhMVa_masonryCol{flex-direction:column;flex:1;gap:10px;min-width:0;display:flex}.nUhMVa_masonry>.nUhMVa_masonryCol>*{align-self:stretch;min-width:0}@media (max-width:680px){.nUhMVa_masonry{flex-direction:column}.nUhMVa_masonryCol{width:100%}.nUhMVa_grid{grid-template-columns:minmax(0,1fr)}}.nUhMVa_swatches{border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;gap:0;height:34px;display:flex;overflow:hidden}.nUhMVa_themesGrid{margin-bottom:12px}.nUhMVa_swatches i{flex:1}.nUhMVa_themeToolbar{grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:0 4px 12px;display:grid}.nUhMVa_themeSearch{box-sizing:border-box;width:100%;min-width:0}.nUhMVa_themeToolbarActions{justify-content:flex-end;align-items:center;gap:8px;display:flex}.nUhMVa_themeFullscreenBtn.nUhMVa_themeFullscreenBtn{width:28px;min-width:28px;padding:0}.nUhMVa_themeResultBar{min-height:24px;color:var(--dsw-alias-label-tertiary,#8b93a1);align-items:center;padding:0 4px 8px;font-size:12px;line-height:18px;display:flex}.nUhMVa_themeGallery{grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;gap:10px;display:grid}.nUhMVa_themeCard{border:1px solid var(--dsw-alias-border-l2,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#fff);border-radius:8px;flex-direction:column;min-width:0;transition:border-color .16s cubic-bezier(.16,1,.3,1),box-shadow .16s cubic-bezier(.16,1,.3,1),transform .16s cubic-bezier(.16,1,.3,1);display:flex;overflow:hidden}.nUhMVa_themeCard:hover{border-color:var(--dsw-alias-border-l3,#d9dde3);box-shadow:var(--dsw-shadow-lv1,0 4px 12px #1f232814);transform:translateY(-1px)}.nUhMVa_themeCover{aspect-ratio:16/10;border:0;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);background:var(--dsw-alias-bg-layer-2,#f3f4f6);width:100%;color:var(--dsw-alias-label-secondary,#6b7280);cursor:zoom-in;border-radius:0;padding:0;display:block;position:relative;overflow:hidden}.nUhMVa_themeCover img{object-fit:contain;background:var(--dsw-alias-bg-layer-2,#f3f4f6);width:100%;height:100%;transition:transform .18s cubic-bezier(.16,1,.3,1);display:block}.nUhMVa_themeCover:hover img{transform:scale(1.012)}.nUhMVa_themeCover:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4f6ef7);outline-offset:-3px}.nUhMVa_themeCoverEmpty{cursor:default;color:var(--dsw-alias-label-tertiary,#8b93a1);flex-direction:column;justify-content:center;align-items:center;gap:8px;font-size:12px;line-height:18px;display:flex}.nUhMVa_themePreviewAction,.nUhMVa_themePreviewCount{color:#fff;-webkit-backdrop-filter:blur(8px);background:#14181fc7;border:1px solid #ffffff57;border-radius:4px;align-items:center;height:24px;padding:0 8px;font-size:11px;line-height:16px;display:inline-flex;position:absolute;bottom:8px}.nUhMVa_themePreviewAction{gap:4px;right:8px}.nUhMVa_themePreviewCount{left:8px}.nUhMVa_themeCardBody{flex-direction:column;flex:1;gap:8px;padding:12px;display:flex}.nUhMVa_themeCardHead{align-items:flex-start;gap:8px;min-width:0;display:flex}.nUhMVa_themeIdentity{flex:1;min-width:0}.nUhMVa_themeStatus,.nUhMVa_themeStatusMuted{white-space:nowrap;border-radius:4px;flex:none;align-items:center;min-height:22px;padding:0 8px;font-size:11px;font-weight:600;display:inline-flex}.nUhMVa_themeStatus{background:var(--dsw-alias-state-success-tertiary,#16a34a1a);color:var(--dsw-alias-state-success-primary,#15803d)}.nUhMVa_themeStatusMuted{background:var(--dsw-alias-bg-layer-2,#f3f4f6);color:var(--dsw-alias-label-secondary,#6b7280)}.nUhMVa_themeDescription{min-height:36px;color:var(--dsw-alias-label-tertiary,#8b93a1);-webkit-line-clamp:3;-webkit-box-orient:vertical;margin:0;font-size:12px;line-height:18px;display:-webkit-box;overflow:hidden}.nUhMVa_themeCardFooter{justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding-top:4px;display:flex}.nUhMVa_themeLifecycle{min-width:0;color:var(--dsw-alias-label-tertiary,#8b93a1);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:18px;overflow:hidden}.nUhMVa_themeActions{flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;margin-left:auto;display:flex}@container (width<=900px){.nUhMVa_themeGallery{grid-template-columns:repeat(3,minmax(0,1fr))}}@container (width<=680px){.nUhMVa_themeGallery{grid-template-columns:repeat(2,minmax(0,1fr))}}@container (width<=460px){.nUhMVa_themeGallery{grid-template-columns:minmax(0,1fr)}}@container (width<=420px){.nUhMVa_sub{grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:2px 8px;display:grid}.nUhMVa_sub>span:first-child{grid-area:1/1}.nUhMVa_sub>.nUhMVa_grow{display:none}.nUhMVa_submitLink{grid-area:2/1}.nUhMVa_exportLogBtn{flex-shrink:0;grid-area:1/2/span 2}.nUhMVa_themeToolbar{grid-template-columns:minmax(0,1fr)}.nUhMVa_themeCardHead{flex-wrap:wrap}.nUhMVa_themeStatus,.nUhMVa_themeStatusMuted{order:3}}@container (width<=280px){.nUhMVa_themeCardFooter{flex-direction:column;align-items:flex-start}.nUhMVa_themeActions{justify-content:flex-start;width:100%;margin-left:0}}@media (max-width:560px){[role=dialog]:has([data-dsh-market-root])>nav{display:none}[role=dialog]:has([data-dsh-market-root])>div{flex:100%;width:100%;min-width:0}}[role=dialog]:has([data-dsh-market-fullscreen=true]){border-radius:0;width:100vw;max-width:none;height:100vh;max-height:none;position:fixed;top:0;bottom:0;left:0;right:0}@media (prefers-reduced-motion:reduce){.nUhMVa_themeCard,.nUhMVa_themeCover img{transition:none}.nUhMVa_themeCard:hover{transform:none}}.nUhMVa_card{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;flex-direction:column;align-self:start;gap:12px;padding:12px 14px;display:flex}.nUhMVa_row1{align-items:flex-start;gap:10px;min-width:0;display:flex}.nUhMVa_cardAction{flex-shrink:0;align-items:center;display:inline-flex}.nUhMVa_installBtn.nUhMVa_installBtn{min-width:64px}.nUhMVa_av{color:#fff;object-fit:cover;background:var(--dsw-alias-bg-layer-2,#f3f4f6);border-radius:50%;flex-shrink:0;place-items:center;width:16px;height:16px;font-size:9px;font-weight:700;display:grid}.nUhMVa_nm{text-overflow:ellipsis;white-space:nowrap;font-size:15px;font-weight:600;line-height:22px;overflow:hidden}.nUhMVa_nmLink{color:inherit;text-decoration:none;display:block}.nUhMVa_nmLink:hover{color:var(--dsw-alias-brand-primary,#4f6ef7);text-decoration:underline}.nUhMVa_repoMark{color:var(--dsw-alias-label-secondary,#6b7280);vertical-align:-1px;flex-shrink:0;margin-left:5px;display:inline-block}.nUhMVa_nmLink:hover .nUhMVa_repoMark{color:var(--dsw-alias-brand-primary,#4f6ef7)}.nUhMVa_byline{flex-wrap:wrap;align-items:center;gap:6px;min-width:0;margin-top:2px;display:flex}.nUhMVa_meta{color:var(--dsw-alias-label-secondary,#9ca3af);margin-top:2px;font-size:11px}.nUhMVa_metaInline{color:var(--dsw-alias-label-secondary,#9ca3af);font-size:11px}.nUhMVa_owner{color:var(--dsw-alias-label-secondary,#9ca3af);text-overflow:ellipsis;white-space:nowrap;flex:0 auto;min-width:44px;font-size:11px;overflow:hidden}.nUhMVa_desc{color:var(--dsw-alias-label-tertiary,#8b93a1);margin:0;font-size:12px;line-height:18px}.nUhMVa_descClamp{-webkit-line-clamp:5;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.nUhMVa_descToggle{width:20px;height:16px;color:var(--dsw-alias-label-tertiary,#8b93a1);cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;margin-top:2px;padding:0;display:flex}.nUhMVa_descToggle:hover{color:var(--dsw-alias-brand-primary,#4f6ef7)}.nUhMVa_foot{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.nUhMVa_foot .nUhMVa_metaInline,.nUhMVa_foot .nUhMVa_src{white-space:nowrap}.nUhMVa_grow{flex:1}.nUhMVa_titleRow{align-items:center;gap:10px;display:flex}.nUhMVa_version{color:var(--dsw-alias-label-tertiary,#8b93a1);font-variant-numeric:tabular-nums;flex-shrink:0;font-size:12px;line-height:20px}.nUhMVa_repoLink{color:var(--dsw-alias-label-tertiary,#8b93a1);flex-shrink:0;font-size:12px;line-height:20px;text-decoration:none}.nUhMVa_repoLink:hover{color:var(--dsw-alias-brand-primary,#4f6ef7)}.nUhMVa_noteRow{flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0;display:flex}.nUhMVa_noteMine{color:var(--dsw-alias-label-primary,#1f2328)}.nUhMVa_noteToggle{font:inherit;color:var(--dsw-alias-label-tertiary,#8b93a1);cursor:pointer;white-space:nowrap;background:0 0;border:none;flex-shrink:0;padding:0;font-size:11px;line-height:16px}.nUhMVa_noteToggle:hover{color:var(--dsw-alias-brand-primary,#4f6ef7);text-decoration:underline}.nUhMVa_noteAction{color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-bg-layer-2,#f3f4f6);border:1px solid var(--dsw-alias-border-l3,#d9dde3);border-radius:4px;align-items:center;padding:0 5px;font-weight:600;text-decoration:none;display:inline-flex}.nUhMVa_noteAction:hover{color:var(--dsw-alias-label-primary,#1f2328);border-color:var(--dsw-alias-brand-primary,#4f6ef7);text-decoration:none}.nUhMVa_noteEdit{flex-wrap:wrap;align-items:center;gap:6px;min-width:0;margin-top:2px;display:flex}.nUhMVa_noteInput{flex:1;min-width:160px}.nUhMVa_descTight{min-height:0}.nUhMVa_src{color:var(--dsw-alias-label-secondary,#9ca3af);font-size:11px;text-decoration:none}.nUhMVa_src:hover{color:var(--dsw-alias-brand-primary,#4f6ef7)}.nUhMVa_dot{vertical-align:2px;margin-left:5px}.nUhMVa_act{flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px;font-size:11px;display:flex}.nUhMVa_actLive{color:var(--dsw-alias-state-success-primary,#16a34a);align-items:center;gap:4px;font-weight:600;display:inline-flex}.nUhMVa_actWarn{color:var(--dsw-alias-state-warn-primary,#b45309);align-items:center;gap:4px;font-weight:600;display:inline-flex}.nUhMVa_actBroken{color:var(--dsw-alias-state-error-primary,#dc2626);align-items:center;gap:4px;font-weight:600;display:inline-flex}.nUhMVa_actWhy{color:var(--dsw-alias-label-secondary,#6b7280);margin-top:2px}.nUhMVa_loading{color:var(--dsw-alias-label-secondary,#9ca3af);flex-direction:column;align-items:center;gap:12px;padding:48px;font-size:13px;display:flex}.nUhMVa_spin{color:var(--dsw-alias-brand-primary,#4f6ef7);flex-shrink:0;animation:.8s linear infinite nUhMVa_sp;display:inline-flex}.nUhMVa_logoMark{color:var(--dsw-alias-brand-primary,#4f6ef7);flex-shrink:0;display:inline-flex}.nUhMVa_logoPlug{transform-box:fill-box;transform-origin:50%;animation:1.5s cubic-bezier(.4,0,.2,1) infinite nUhMVa_dshmPlug}@keyframes nUhMVa_dshmPlug{0%,12%{transform:rotate(9deg)}45%,62%{transform:translate(-1.28px,1.27px)rotate(0)}95%,to{transform:rotate(9deg)}}@media (prefers-reduced-motion:reduce){.nUhMVa_logoPlug,.nUhMVa_spin{animation:1.5s ease-in-out infinite nUhMVa_dshmPlugFade}}@keyframes nUhMVa_dshmPlugFade{0%,to{opacity:1}50%{opacity:.35}}@keyframes nUhMVa_sp{to{transform:rotate(360deg)}}.nUhMVa_progress{background:var(--dsw-alias-bg-layer-2,#f3f4f6);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:8px;flex-wrap:wrap;align-items:center;gap:9px;margin:0;padding:8px 12px;font-size:12px;display:flex}.nUhMVa_bar{background:var(--dsw-alias-border-l1,#e5e7eb);border-radius:99px;width:100%;height:4px;overflow:hidden}.nUhMVa_barFill{background:var(--dsw-alias-brand-primary,#4f6ef7);border-radius:99px;height:100%;transition:width .6s}.nUhMVa_barWave{width:30%;animation:1.2s ease-in-out infinite nUhMVa_dshmSlide}@keyframes nUhMVa_dshmSlide{0%{margin-left:-30%}to{margin-left:100%}}.nUhMVa_irow .nUhMVa_progress{margin-top:8px}.nUhMVa_progress code{text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,Menlo,monospace;font-size:11px;overflow:hidden}.nUhMVa_empty{color:var(--dsw-alias-label-secondary,#9ca3af);text-align:center;padding:32px;font-size:13px}.nUhMVa_err{color:var(--dsw-alias-state-error-primary,#dc2626);white-space:pre-wrap;word-break:break-all;margin:8px 0;font-size:12px}.nUhMVa_cardBlocked{border-color:var(--dsw-alias-state-error-primary,#dc2626)}.nUhMVa_conflictHead{align-items:flex-start;gap:8px;display:flex}.nUhMVa_conflictIcon{color:var(--dsw-alias-state-error-primary,#dc2626);flex-shrink:0;margin-top:1px}.nUhMVa_conflictTitle{color:var(--dsw-alias-state-error-primary,#dc2626);font-size:13px;font-weight:600;line-height:18px}.nUhMVa_conflictBody{margin:0;font-size:12px;line-height:19px}.nUhMVa_roster{background:var(--dsw-alias-border-l2,#e5e7eb);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;flex-direction:column;gap:1px;display:flex;overflow:hidden}.nUhMVa_rosterRow{background:var(--dsw-alias-bg-layer-1,#fff);align-items:center;gap:8px;padding:7px 10px;display:flex}.nUhMVa_rosterMain{flex-direction:column;min-width:0;display:flex}.nUhMVa_rosterName{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:12px;font-weight:600;overflow:hidden}.nUhMVa_rosterAuthor{color:var(--dsw-alias-label-secondary,#9ca3af);text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;overflow:hidden}.nUhMVa_rosterTag{border-radius:4px;flex-shrink:0;margin-left:auto;padding:1px 6px;font-size:10.5px;font-weight:600}.nUhMVa_rosterTagKeep{color:var(--dsw-alias-state-success-primary,#16a34a);background:#16a34a1f}.nUhMVa_rosterTagDrop{color:var(--dsw-alias-state-error-primary,#dc2626);background:#dc26261f}.nUhMVa_rosterRowOut .nUhMVa_rosterName{text-decoration:line-through}.nUhMVa_rosterRowOut{opacity:.62}.nUhMVa_rosterSplit{background:var(--dsw-alias-border-l2,#e5e7eb);height:1px}.nUhMVa_reassure{color:var(--dsw-alias-label-secondary,#6b7280);align-items:center;gap:5px;margin:0;font-size:11.5px;line-height:17px;display:flex}.nUhMVa_reassureOk{color:var(--dsw-alias-state-success-primary,#16a34a);flex-shrink:0}.nUhMVa_conflictWhy{color:var(--dsw-alias-label-tertiary,#8b93a1);overflow-wrap:anywhere;margin-top:2px;font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:17px}.nUhMVa_conflictWhyText{margin-top:5px;font-family:-apple-system,BlinkMacSystemFont,PingFang SC,sans-serif}.nUhMVa_choices{flex-direction:column;gap:7px;display:flex}.nUhMVa_choice{text-align:left;font:inherit;cursor:pointer;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,#d9dde3);border-radius:9px;align-items:flex-start;gap:9px;padding:9px 11px;display:flex}.nUhMVa_choice:has(input:disabled){cursor:default;opacity:.6}.nUhMVa_choiceOn{border-color:var(--dsw-alias-brand-primary,#4f6ef7);background:var(--dsw-alias-bg-layer-2,#f5f7ff)}.nUhMVa_choiceRadio{width:13px;height:13px;accent-color:var(--dsw-alias-brand-primary,#4f6ef7);flex-shrink:0;margin:2px 0 0}.nUhMVa_choiceMain{flex-direction:column;gap:3px;min-width:0;display:flex}.nUhMVa_choiceTitle{font-size:12px;font-weight:600;line-height:17px}.nUhMVa_choiceNote{color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:11px;line-height:16px}.nUhMVa_choiceSafe{color:var(--dsw-alias-state-success-primary,#16a34a)}.nUhMVa_stateTag{white-space:nowrap;background:var(--dsw-alias-bg-layer-2,#f3f4f6);min-height:20px;color:var(--dsw-alias-label-secondary,#6b7280);border-radius:5px;flex-shrink:0;align-items:center;gap:5px;padding:1px 7px;font-size:11px;line-height:16px;display:inline-flex}.nUhMVa_stateTag[data-on=true]{color:var(--dsw-alias-state-success-primary,#16a34a);background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#16a34a) 10%, transparent)}.nUhMVa_stateDot{background:var(--dsw-alias-label-tertiary,#8b93a1);border-radius:999px;flex:none;width:6px;height:6px}.nUhMVa_stateDot[data-on=true]{background:var(--dsw-alias-state-success-primary,#16a34a)}.nUhMVa_metaTag{text-overflow:ellipsis;white-space:nowrap;background:var(--dsw-alias-bg-layer-2,#f3f4f6);min-width:0;max-width:100%;min-height:20px;color:var(--dsw-alias-label-tertiary,#8b93a1);border-radius:5px;flex-shrink:1;padding:1px 7px;font-size:11px;line-height:18px;display:inline-block;overflow:hidden}.nUhMVa_metaTagOk{color:var(--dsw-alias-state-success-primary,#16a34a);background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#16a34a) 10%, transparent)}.nUhMVa_nameLink{color:inherit;text-decoration:none}.nUhMVa_irowName{text-overflow:clip;flex-wrap:wrap;align-items:baseline;gap:6px;min-width:0;display:flex;overflow:visible}.nUhMVa_irowNameText{overflow-wrap:anywhere;white-space:normal;min-width:0}.nUhMVa_irowName>.nUhMVa_owner{flex:none}.nUhMVa_nameLink:hover{color:var(--dsw-alias-brand-primary,#4f6ef7);text-decoration:underline}.nUhMVa_opWrap{flex-shrink:0;margin-bottom:6px;display:inline-flex;position:relative}.nUhMVa_opEntry{font:inherit;cursor:pointer;white-space:nowrap;color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,#d9dde3);border-radius:7px;align-items:center;gap:6px;padding:4px 10px;font-size:12px;display:inline-flex;position:relative}.nUhMVa_opEntryQuiet{color:var(--dsw-alias-label-secondary,#6b7280);background:0 0;border-color:#0000}.nUhMVa_opEntryAlert{border-color:var(--dsw-alias-state-error-primary,#dc2626);color:var(--dsw-alias-state-error-primary,#dc2626)}.nUhMVa_opDot{background:var(--dsw-alias-state-error-primary,#dc2626);border-radius:99px;width:8px;height:8px;position:absolute;top:-3px;right:-3px}.nUhMVa_opPanel{z-index:40;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l3,#d9dde3);border-radius:12px;width:460px;max-width:86vw;max-height:70vh;position:absolute;top:calc(100% + 6px);right:0;overflow-y:auto;box-shadow:0 20px 52px #00000047}.nUhMVa_opHead{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);align-items:center;gap:8px;padding:9px 14px;display:flex}.nUhMVa_opPanelTitle{font-size:12.5px;font-weight:600}.nUhMVa_opCloseBtn.nUhMVa_opCloseBtn{min-width:0;color:var(--dsw-alias-label-secondary,#6b7280);padding:0 6px}.nUhMVa_opAggregate{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);background:var(--dsw-alias-bg-layer-2,#f7f8fa);padding:9px 14px}.nUhMVa_opAggregateTop{font-variant-numeric:tabular-nums;font-size:12px;font-weight:600}.nUhMVa_opAggregateHint{color:var(--dsw-alias-label-tertiary,#8b93a1);margin-top:4px;font-size:10.5px}.nUhMVa_opRow{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);align-items:flex-start;gap:9px;padding:9px 14px;display:flex}.nUhMVa_opRow:last-child{border-bottom:none}.nUhMVa_opRowAlert{background:#dc26260f}.nUhMVa_opIcon{flex-shrink:0;place-items:center;width:14px;margin-top:1px;display:grid}.nUhMVa_opQueuedIcon{color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:12px}.nUhMVa_opMain{flex-direction:column;flex:1;gap:3px;min-width:0;display:flex}.nUhMVa_opTop{align-items:baseline;gap:6px;min-width:0;display:flex}.nUhMVa_opVerb{color:var(--dsw-alias-label-secondary,#6b7280);flex-shrink:0;font-size:12px}.nUhMVa_opName{text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;overflow:hidden}.nUhMVa_opStatus{color:var(--dsw-alias-label-tertiary,#8b93a1);overflow-wrap:anywhere;font-size:10.5px;line-height:16px}.nUhMVa_opStatusBad{color:var(--dsw-alias-state-error-primary,#dc2626)}.nUhMVa_opActions{flex-shrink:0;align-items:center;gap:6px;margin-top:1px;display:flex}.nUhMVa_opDecision{border-top:1px dashed var(--dsw-alias-border-l2,#e5e7eb);flex-direction:column;gap:8px;margin-top:8px;padding-top:8px;display:flex}.nUhMVa_opDecisionFoot{align-items:center;gap:8px;display:flex}.nUhMVa_conflictDetailsToggle{font:inherit;cursor:pointer;color:var(--dsw-alias-label-tertiary,#8b93a1);background:0 0;border:none;align-items:center;gap:4px;padding:2px 0;font-size:11px;display:inline-flex}.nUhMVa_conflictDetailsToggle:hover{color:var(--dsw-alias-label-secondary,#6b7280)}.nUhMVa_opEmpty{text-align:center;color:var(--dsw-alias-label-secondary,#6b7280);padding:30px 14px;font-size:12px}.nUhMVa_opEmptyHint{color:var(--dsw-alias-label-tertiary,#8b93a1);margin-top:4px;font-size:11px}.nUhMVa_cardBlockedMark{font:inherit;cursor:pointer;color:var(--dsw-alias-state-error-primary,#dc2626);border:1px solid var(--dsw-alias-state-error-primary,#dc2626);background:#dc262614;border-radius:7px;align-items:center;gap:5px;padding:4px 9px;font-size:11px;display:inline-flex}.nUhMVa_dangerBtn.nUhMVa_dangerBtn{color:var(--dsw-alias-state-error-primary,#dc2626);border-color:var(--dsw-alias-state-error-primary,#dc2626)}.nUhMVa_dangerBtn.nUhMVa_dangerBtn:hover:not(:disabled){background:var(--dsw-alias-state-error-primary,#dc2626);color:#fff}.nUhMVa_dangerArmed.nUhMVa_dangerArmed{background:var(--dsw-alias-state-error-primary,#dc2626);border-color:var(--dsw-alias-state-error-primary,#dc2626);color:#fff}.nUhMVa_retryBtn{margin-top:4px}.nUhMVa_irow{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:10px;flex-direction:column;gap:10px;min-width:0;padding:12px 14px;display:flex}.nUhMVa_irowActions{flex-wrap:wrap;justify-content:flex-start;align-items:center;gap:8px;min-width:0;display:flex}.nUhMVa_irowTrailing{flex-wrap:nowrap;align-items:center;gap:8px;min-width:0;display:inline-flex}.nUhMVa_irowMissing{filter:grayscale();opacity:.5}.nUhMVa_irow>.nUhMVa_src,.nUhMVa_irow>.nUhMVa_owner,.nUhMVa_irow button{white-space:nowrap;flex-shrink:0}.nUhMVa_tabSearchRow{padding:0 4px 6px;display:flex}.nUhMVa_tabSearch{width:100%}.nUhMVa_spec{color:var(--dsw-alias-label-secondary,#9ca3af);overflow-wrap:anywhere;min-width:0;font-family:ui-monospace,Menlo,monospace;font-size:11px}.nUhMVa_specTag{white-space:nowrap;border-radius:4px;flex-shrink:0;align-items:center;height:16px;padding:0 5px;font-size:10px;font-weight:600;display:inline-flex}.nUhMVa_specTagGit{color:#0b7285;background:#12a3c41f}.nUhMVa_specTagFile{color:#b07d1b;background:#f0b42924}.nUhMVa_backupCheckList .nUhMVa_grow{white-space:nowrap;text-overflow:ellipsis;flex:70%;min-width:0;overflow:hidden}.nUhMVa_backupCheckList .nUhMVa_spec{text-align:right;white-space:nowrap;text-overflow:ellipsis;flex:0 30%;max-width:30%;overflow:hidden}.nUhMVa_staleAction{margin-top:8px}.nUhMVa_pct{color:var(--dsw-alias-label-secondary,#6b7280);flex-shrink:0;font-size:11px;font-weight:600}.nUhMVa_pager{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;margin:16px 0 4px;display:flex}.nUhMVa_pagerPages{flex-wrap:wrap;flex:1;justify-content:center;align-items:center;gap:6px;min-width:0;display:flex}.nUhMVa_pageEllipsis{color:var(--dsw-alias-label-secondary,#9ca3af);padding:0 2px;font-size:12px}.nUhMVa_pageInfo{color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;font-size:12px}.nUhMVa_depBadge{border:1px solid var(--dsw-alias-state-warn-primary,#b45309);color:var(--dsw-alias-state-warn-primary,#b45309);white-space:nowrap;border-radius:4px;flex-shrink:0;margin-left:6px;padding:1px 6px;font-size:11px;font-weight:600;line-height:16px}.nUhMVa_deprecate{color:var(--dsw-alias-state-warn-primary,#b45309);background:var(--dsw-alias-bg-layer-2,#fdf3e3);border:1px solid var(--dsw-alias-border-l2,#f3e3c3);border-radius:8px;margin:0;padding:8px 10px;font-size:12px;line-height:18px}.nUhMVa_deprecate a{color:var(--dsw-alias-state-warn-primary,#b45309);text-decoration:underline}.nUhMVa_deprecate .nUhMVa_src{margin-left:8px}.nUhMVa_depLine{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.nUhMVa_switch{border:1px solid var(--dsw-alias-border-l2,#d9dde3);background:var(--dsw-alias-bg-layer-2,#e5e7eb);cursor:pointer;border-radius:99px;flex-shrink:0;width:38px;height:22px;padding:0;transition:background .15s,border-color .15s;position:relative}.nUhMVa_switchOn{background:var(--dsw-alias-state-success-primary,#16a34a);border-color:var(--dsw-alias-state-success-primary,#16a34a)}.nUhMVa_switchMixed{background:var(--dsw-alias-state-warn-primary,#b45309);border-color:var(--dsw-alias-state-warn-primary,#b45309)}.nUhMVa_switchKnob{background:#fff;border-radius:99px;width:16px;height:16px;transition:left .15s;position:absolute;top:2px;left:2px;box-shadow:0 1px 2px #00000040}.nUhMVa_switchOn .nUhMVa_switchKnob,.nUhMVa_switchMixed .nUhMVa_switchKnob{left:18px}.nUhMVa_switch:disabled{opacity:.5;cursor:default}.nUhMVa_viewBar{border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;align-items:center;gap:2px;width:fit-content;margin-bottom:12px;padding:2px;display:flex}.nUhMVa_viewBtn{font:inherit;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:6px;padding:4px 10px;font-size:12px;line-height:18px}.nUhMVa_viewBtn:hover{color:var(--dsw-alias-brand-primary,#4f6ef7)}.nUhMVa_viewOn{background:var(--dsw-alias-bg-layer-2,#eef0f4);color:var(--dsw-alias-label-primary,#1f2328);font-weight:600}.nUhMVa_groupRow{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;margin-bottom:10px;padding:12px 14px}.nUhMVa_groupHead{align-items:center;gap:10px;min-width:0;display:flex}.nUhMVa_groupName{text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600;line-height:20px;overflow:hidden}.nUhMVa_groupActions{flex-shrink:0;align-items:center;gap:6px;display:flex}.nUhMVa_groupMembers{flex-direction:column;gap:6px;margin-top:10px;display:flex}.nUhMVa_groupMember{background:var(--dsw-alias-bg-layer-2,#f7f8fa);border-radius:8px;align-items:center;gap:8px;padding:6px 8px;font-size:12px;line-height:18px;display:flex}.nUhMVa_groupMember .nUhMVa_nm{flex:1;min-width:0;font-size:12px}.nUhMVa_groupAddPanel{border-top:1px dashed var(--dsw-alias-border-l2,#e5e7eb);flex-direction:column;gap:6px;margin-top:10px;padding-top:10px;display:flex}.nUhMVa_groupCreate{align-items:center;gap:8px;margin-bottom:10px;display:flex}.nUhMVa_inlineInput{flex:1;min-width:120px}.nUhMVa_assignRow{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.nUhMVa_assignSelect{border:1px solid var(--dsw-alias-border-l2,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1f2328);font:inherit;border-radius:6px;padding:3px 6px;font-size:12px;line-height:18px}.nUhMVa_groupHint{color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:11px}.nUhMVa_sectAction{color:var(--dsw-alias-label-secondary,#6b7280);align-items:center;gap:8px;margin:14px 2px 8px;font-size:12px;font-weight:600;display:flex}.nUhMVa_backupGrid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;display:grid}.nUhMVa_backupCard{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;flex-direction:column;gap:10px;padding:16px;display:flex}.nUhMVa_backupCard h3{margin:0;font-size:14px}.nUhMVa_backupCard p{color:var(--dsw-alias-label-secondary,#6b7280);margin:0;font-size:12px;line-height:18px}.nUhMVa_backupActions{flex-wrap:wrap;gap:8px;display:flex;position:relative}.nUhMVa_hiddenFile{opacity:0;pointer-events:none;width:1px;height:1px;position:absolute}.nUhMVa_backupInput{box-sizing:border-box;width:100%}.nUhMVa_backupCheck{cursor:pointer;align-items:center;gap:6px;font-size:12px;display:flex}.nUhMVa_backupWarn{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-warn-primary,#b45309)!important}.nUhMVa_backupMessage{color:var(--dsw-alias-label-secondary,#6b7280);grid-column:1/-1;font-size:12px}.nUhMVa_backupCheckList{flex-direction:column;gap:6px;max-height:260px;margin:10px 0 4px;padding-right:4px;display:flex;overflow-y:auto}.nUhMVa_backupCheckList .nUhMVa_backupCheck{justify-content:space-between;gap:8px}.nUhMVa_diagPage{flex-direction:column;gap:12px;height:100%;min-height:0;display:flex;overflow-y:auto}.nUhMVa_diagSummary{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 14px;font-size:12px;display:flex}.nUhMVa_diagSummaryItem{color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;align-items:center;gap:6px;display:inline-flex}.nUhMVa_diagSummaryMeta{color:var(--dsw-alias-label-tertiary,#9ca3af);text-overflow:ellipsis;white-space:nowrap;max-width:320px;font-family:ui-monospace,Menlo,monospace;font-size:11px;overflow:hidden}.nUhMVa_diagSection{background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;flex-direction:column;gap:8px;padding:12px 14px;display:flex}.nUhMVa_diagSection h3{color:var(--dsw-alias-label-primary,#1f2328);margin:0;font-size:13px;font-weight:600}.nUhMVa_diagCount{color:var(--dsw-alias-label-tertiary,#9ca3af);font-size:11px;font-weight:400}.nUhMVa_diagEmpty{color:var(--dsw-alias-label-secondary,#9ca3af);padding:8px 0;font-size:12px}.nUhMVa_diagBundle{border-top:1px solid var(--dsw-alias-border-l2,#f0f1f3);flex-direction:column;gap:6px;padding-top:8px;display:flex}.nUhMVa_diagBundle:first-of-type{border-top:none;padding-top:0}.nUhMVa_diagRow{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;font-size:12px;line-height:18px;display:flex}.nUhMVa_diagMeta{align-items:baseline;gap:8px;min-width:0;font-size:12px;display:flex}.nUhMVa_diagKey{color:var(--dsw-alias-label-tertiary,#9ca3af);flex-shrink:0;min-width:64px;font-size:11px}.nUhMVa_diagVal{color:var(--dsw-alias-label-primary,#1f2328);overflow-wrap:anywhere;min-width:0;font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:500}.nUhMVa_diagIndex{background:var(--dsw-alias-bg-layer-2,#f3f4f6);min-width:18px;height:18px;color:var(--dsw-alias-label-secondary,#6b7280);border-radius:9px;flex-shrink:0;justify-content:center;align-items:center;font-size:11px;font-weight:600;display:inline-flex}.nUhMVa_diagArrow{color:var(--dsw-alias-label-tertiary,#9ca3af);flex-shrink:0;font-size:12px}.nUhMVa_diagBadgeOfficial{background:var(--dsw-alias-brand-primary,#4f6ef7);color:#fff;border-radius:9px;flex-shrink:0;align-items:center;height:18px;padding:0 8px;font-size:11px;font-weight:600;display:inline-flex}.nUhMVa_diagBadgeCommunity{background:var(--dsw-alias-bg-layer-2,#f3f4f6);height:18px;color:var(--dsw-alias-label-secondary,#6b7280);border-radius:9px;flex-shrink:0;align-items:center;padding:0 8px;font-size:11px;display:inline-flex}.nUhMVa_diagBadgeShadow{background:var(--dsw-alias-state-error-primary,#dc2626);color:#fff;border-radius:9px;flex-shrink:0;align-items:center;height:18px;padding:0 8px;font-size:11px;font-weight:600;display:inline-flex}.nUhMVa_diagBadgeWarn{background:var(--dsw-alias-state-warn-primary,#b45309);color:#fff;white-space:nowrap;border-radius:9px;flex-shrink:0;align-items:center;height:18px;padding:0 8px;font-size:11px;font-weight:600;display:inline-flex}.nUhMVa_diagBadgeInfo{background:var(--dsw-alias-bg-layer-2,#f3f4f6);height:18px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;border-radius:9px;flex-shrink:0;align-items:center;padding:0 8px;font-size:11px;display:inline-flex}.nUhMVa_diagList{flex-direction:column;gap:6px;display:flex}.nUhMVa_sectionOverview{color:var(--dsw-alias-label-tertiary,#8b93a1);text-overflow:ellipsis;white-space:nowrap;max-width:100%;padding:2px 0 6px;font-size:12px;line-height:18px;overflow:hidden}.nUhMVa_diagAlert{color:var(--dsw-alias-state-warn-primary,#b45309)}.nUhMVa_ovRow{background:var(--dsw-alias-bg-layer-2,#f7f8fa);border-radius:8px;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;padding:6px 10px;font-size:12px;line-height:18px;display:flex}.nUhMVa_ovArrow{color:var(--dsw-alias-label-tertiary,#9ca3af);flex-shrink:0;font-size:12px}.nUhMVa_ovByTag{background:var(--dsw-alias-brand-primary,#4f6ef7);color:#fff;text-overflow:ellipsis;white-space:nowrap;border-radius:9px;flex-shrink:0;align-items:center;max-width:260px;height:18px;padding:0 8px;font-size:11px;font-weight:600;display:inline-flex;overflow:hidden}.nUhMVa_ovFrom{color:var(--dsw-alias-label-secondary,#6b7280);text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:12px;overflow:hidden}.nUhMVa_orphRow{background:var(--dsw-alias-bg-layer-2,#f7f8fa);border-radius:8px;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;padding:6px 10px;font-size:12px;line-height:18px;display:flex}.nUhMVa_orphBadge{background:var(--dsw-alias-state-warn-primary,#b45309);color:#fff;white-space:nowrap;border-radius:9px;flex-shrink:0;align-items:center;height:18px;padding:0 8px;font-size:11px;font-weight:600;display:inline-flex}.nUhMVa_dragHandle{width:20px;height:20px;color:var(--dsw-alias-label-tertiary,#9ca3af);cursor:grab;-webkit-user-select:none;user-select:none;flex-shrink:0;justify-content:center;align-items:center;font-size:12px;line-height:20px;display:inline-flex}.nUhMVa_dragOver{outline:2px dashed var(--dsw-alias-brand-primary,#4f6ef7);outline-offset:2px;background:var(--dsw-alias-bg-layer-2,#f0f2f8);border-radius:8px}.nUhMVa_dragging{opacity:.45;background:var(--dsw-alias-bg-layer-2,#f3f4f6)}.nUhMVa_collapseHead{font:inherit;color:var(--dsw-alias-label-primary,#1f2328);cursor:pointer;text-align:left;background:0 0;border:none;align-items:center;gap:8px;width:100%;padding:0;font-size:13px;font-weight:600;display:flex}.nUhMVa_collapseIcon{color:var(--dsw-alias-label-secondary,#6b7280);flex-shrink:0;display:inline-flex}.nUhMVa_collapseTitle{flex:1;min-width:0}.nUhMVa_collapseBody{border-top:1px solid var(--dsw-alias-border-l2,#f0f1f3);overflow-wrap:anywhere;flex-direction:column;gap:10px;min-width:0;margin-top:8px;padding-top:10px;display:flex}.nUhMVa_orderPanel{flex-direction:column;gap:10px;min-width:0;display:flex}.nUhMVa_panelNote{color:var(--dsw-alias-label-secondary,#6b7280);margin:0;font-size:12px;line-height:18px}.nUhMVa_panelActions{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.nUhMVa_presetList{flex-direction:column;gap:6px;min-width:0;display:flex}.nUhMVa_presetRow{background:var(--dsw-alias-bg-layer-2,#f7f8fa);border-radius:8px;flex-direction:column;align-items:stretch;gap:6px;min-width:0;max-width:100%;padding:8px 10px;font-size:12px;line-height:18px;display:flex}.nUhMVa_presetName{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:13px;font-weight:600;overflow:hidden}.nUhMVa_snapList{flex-direction:column;gap:6px;min-width:0;display:flex}.nUhMVa_snapRow{background:var(--dsw-alias-bg-layer-2,#f7f8fa);border-radius:8px;flex-direction:column;align-items:stretch;gap:8px;padding:10px 12px;font-size:12px;line-height:18px;display:flex}.nUhMVa_snapMeta{flex-wrap:wrap;align-items:center;gap:8px;min-width:0;display:flex}.nUhMVa_snapConfirmText{color:var(--dsw-alias-state-warn-primary,#b45309);margin:0;font-size:12px;line-height:18px}.nUhMVa_confirmRow{flex-wrap:wrap;align-items:center;gap:6px;display:inline-flex}.nUhMVa_fixFallback{flex-direction:column;gap:6px;margin:8px 0;display:flex}.nUhMVa_fixFallbackText{box-sizing:border-box;width:100%;color:var(--dsw-alias-label-primary,#1f2328);background:var(--dsw-alias-bg-layer-2,#f3f4f6);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);resize:vertical;white-space:pre-wrap;word-break:break-all;border-radius:6px;padding:8px 10px;font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:16px}.nUhMVa_setCard{border:1px solid var(--dsw-alias-border-l2,#e5e7eb);background:var(--dsw-alias-bg-layer-3,#fff);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.nUhMVa_setCard:hover{border-color:var(--dsw-alias-label-dimmed,#c8ccd4)}.nUhMVa_setCardOpen{background:var(--dsw-alias-bg-layer-2,#f7f8fa);border-color:var(--dsw-alias-label-dimmed,#c8ccd4)}.nUhMVa_setHeader{-webkit-appearance:none;appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.nUhMVa_setHeader:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4f6ef7);outline-offset:-2px}.nUhMVa_setHeadText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.nUhMVa_setName{color:var(--dsw-alias-label-primary,#1f2328);font-size:15px;font-weight:600;line-height:1.4}.nUhMVa_setDesc{color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:13px;line-height:1.5}.nUhMVa_setChevron{color:var(--dsw-alias-label-tertiary,#8b93a1);flex:none;transition:transform .16s;display:inline-flex}.nUhMVa_setChevronOpen{transform:rotate(180deg)}.nUhMVa_setBody{border-top:1px solid var(--dsw-alias-border-l2,#e5e7eb);margin:0 16px;padding-bottom:8px}.nUhMVa_setRow{align-items:center;gap:12px;padding:12px 0;display:flex}.nUhMVa_setRow+.nUhMVa_setRow{border-top:1px solid var(--dsw-alias-border-l2,#e5e7eb)}.nUhMVa_setLabelBox{flex-direction:column;flex:1;gap:3px;min-width:0;display:flex}.nUhMVa_setLabel{font-size:13px;line-height:20px}.nUhMVa_setHint{color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:12px;line-height:18px}.nUhMVa_setConfirm{border-top:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex-direction:column;gap:8px;padding:12px 0 4px;display:flex}.nUhMVa_setCheck{cursor:pointer;align-items:center;gap:8px;font-size:12px;line-height:18px;display:flex}.nUhMVa_setActions{border-top:1px solid var(--dsw-alias-border-l2,#e5e7eb);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.nUhMVa_setDanger{color:var(--dsw-alias-state-error-primary,#dc2626)}.nUhMVa_setSeg{border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:8px;flex-shrink:0;gap:2px;padding:2px;display:inline-flex}.nUhMVa_setSegBtn{font:inherit;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:3px 10px;font-size:12px;line-height:18px}.nUhMVa_setSegBtn:disabled{cursor:default;opacity:.5}.nUhMVa_setSegOn{background:var(--dsw-alias-bg-layer-2,#eef0f4);color:var(--dsw-alias-label-primary,#1f2328);font-weight:600}.nUhMVa_setBetaTag{background:var(--dsw-alias-bg-module-platform,#eef0f4);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:9px;margin-left:6px;padding:0 6px;font-size:11px;font-weight:600;line-height:17px}.nUhMVa_commentsLink{cursor:pointer;white-space:nowrap;color:var(--dsw-alias-label-secondary,#9ca3af);background:0 0;border:0;padding:0;font-size:11px;line-height:16px}.nUhMVa_commentsLink:hover{color:var(--dsw-alias-brand-primary,#4f6ef7)}.nUhMVa_commentsNote{color:var(--dsw-alias-label-secondary,#9ca3af);margin:0 0 8px;font-size:11px;line-height:16px}.nUhMVa_commentsStatus{color:var(--dsw-alias-label-secondary,#9ca3af);margin:0;font-size:12px}.nUhMVa_commentsStatus:empty{display:none}.nUhMVa_commentsError{color:var(--dsw-alias-label-primary,#1f2328);margin:0 0 8px;font-size:12px}.nUhMVa_commentsFail{flex-direction:column;align-items:flex-start;gap:8px;padding:12px 0;display:flex}.nUhMVa_commentsMount{width:100%;min-height:240px;max-height:56vh;overflow:auto}.nUhMVa_commentsMount iframe{width:100%}.nUhMVa_notesLink{font:inherit;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;text-align:left;background:0 0;border:none;margin:2px 0 0;padding:0;font-size:12px;line-height:18px;display:block}.nUhMVa_notesLink:hover{color:var(--dsw-alias-label-primary,#1f2328)}.nUhMVa_notesBody{flex-direction:column;gap:8px;min-width:0;display:flex}.nUhMVa_notesRange{align-items:center;gap:8px;margin-bottom:4px;font-size:12px;line-height:18px;display:flex}.nUhMVa_notesArrow{color:var(--dsw-alias-label-tertiary,#8b93a1)}.nUhMVa_notesMeta{letter-spacing:.02em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#6b7280);flex-wrap:wrap;align-items:baseline;gap:6px;margin-top:12px;font-size:12px;line-height:18px;display:flex}.nUhMVa_notesPre{white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-layer-2,#eef0f4);border-radius:8px;max-height:40vh;margin:0;padding:10px 12px;font-size:13px;line-height:20px;overflow:auto}.nUhMVa_notesList{flex-direction:column;gap:6px;margin:0;padding-left:18px;font-size:13px;line-height:20px;display:flex}.nUhMVa_notesRendered{flex-direction:column;gap:6px;min-width:0;display:flex}.nUhMVa_notesH{margin-top:6px;font-size:13px;font-weight:650;line-height:20px}.nUhMVa_notesP{font-size:13px;line-height:20px}.nUhMVa_notesCode{font-family:var(--dsw-alias-font-mono,ui-monospace,monospace);background:var(--dsw-alias-bg-layer-2,#eef0f4);border-radius:5px;padding:1px 5px;font-size:12px}.nUhMVa_notesList{flex-direction:column;margin:0;padding:0;list-style:none;display:flex}.nUhMVa_notesRow{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);align-items:baseline;gap:12px;padding:6px 0;display:flex}.nUhMVa_notesRow:last-child{border-bottom:none}.nUhMVa_notesDate{color:var(--dsw-alias-label-tertiary,#8b93a1);font-variant-numeric:tabular-nums;flex-shrink:0;font-size:12px}.nUhMVa_notesMsg{word-break:break-word;word-break:break-word;-webkit-line-clamp:3;-webkit-box-orient:vertical;min-width:0;font-size:13px;line-height:20px;display:-webkit-box;overflow:hidden}.nUhMVa_notesSha{color:var(--dsw-alias-label-secondary,#6b7280);font-variant-numeric:tabular-nums;flex-shrink:0;margin-left:auto;font-size:12px;text-decoration:none}.nUhMVa_notesSha:hover{color:var(--dsw-alias-label-primary,#1f2328);text-decoration:underline}.nUhMVa_notesVer{color:inherit;font-weight:600;text-decoration:none}.nUhMVa_notesVer:hover{text-decoration:underline}";
		const tagId = "dshmarket/Market.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dshmarket";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var Market_module_css_default = {
			"act": "nUhMVa_act",
			"actBroken": "nUhMVa_actBroken",
			"actLive": "nUhMVa_actLive",
			"actWarn": "nUhMVa_actWarn",
			"actWhy": "nUhMVa_actWhy",
			"assignRow": "nUhMVa_assignRow",
			"assignSelect": "nUhMVa_assignSelect",
			"av": "nUhMVa_av",
			"backupActions": "nUhMVa_backupActions",
			"backupCard": "nUhMVa_backupCard",
			"backupCheck": "nUhMVa_backupCheck",
			"backupCheckList": "nUhMVa_backupCheckList",
			"backupGrid": "nUhMVa_backupGrid",
			"backupInput": "nUhMVa_backupInput",
			"backupMessage": "nUhMVa_backupMessage",
			"backupWarn": "nUhMVa_backupWarn",
			"banner": "nUhMVa_banner",
			"bannerHint": "nUhMVa_bannerHint",
			"bannerIcon": "nUhMVa_bannerIcon",
			"bar": "nUhMVa_bar",
			"barFill": "nUhMVa_barFill",
			"barWave": "nUhMVa_barWave",
			"body": "nUhMVa_body",
			"byline": "nUhMVa_byline",
			"card": "nUhMVa_card",
			"cardAction": "nUhMVa_cardAction",
			"cardBlocked": "nUhMVa_cardBlocked",
			"cardBlockedMark": "nUhMVa_cardBlockedMark",
			"cardShot": "nUhMVa_cardShot",
			"cardShots": "nUhMVa_cardShots",
			"cats": "nUhMVa_cats",
			"catsCollapsed": "nUhMVa_catsCollapsed",
			"catsRow": "nUhMVa_catsRow",
			"catsToggle": "nUhMVa_catsToggle",
			"catsWrap": "nUhMVa_catsWrap",
			"choice": "nUhMVa_choice",
			"choiceMain": "nUhMVa_choiceMain",
			"choiceNote": "nUhMVa_choiceNote",
			"choiceOn": "nUhMVa_choiceOn",
			"choiceRadio": "nUhMVa_choiceRadio",
			"choices": "nUhMVa_choices",
			"choiceSafe": "nUhMVa_choiceSafe",
			"choiceTitle": "nUhMVa_choiceTitle",
			"cmd": "nUhMVa_cmd",
			"collapseBody": "nUhMVa_collapseBody",
			"collapseHead": "nUhMVa_collapseHead",
			"collapseIcon": "nUhMVa_collapseIcon",
			"collapseTitle": "nUhMVa_collapseTitle",
			"commentsError": "nUhMVa_commentsError",
			"commentsFail": "nUhMVa_commentsFail",
			"commentsLink": "nUhMVa_commentsLink",
			"commentsMount": "nUhMVa_commentsMount",
			"commentsNote": "nUhMVa_commentsNote",
			"commentsStatus": "nUhMVa_commentsStatus",
			"confirmRow": "nUhMVa_confirmRow",
			"conflictBody": "nUhMVa_conflictBody",
			"conflictDetailsToggle": "nUhMVa_conflictDetailsToggle",
			"conflictHead": "nUhMVa_conflictHead",
			"conflictIcon": "nUhMVa_conflictIcon",
			"conflictTitle": "nUhMVa_conflictTitle",
			"conflictWhy": "nUhMVa_conflictWhy",
			"conflictWhyText": "nUhMVa_conflictWhyText",
			"dangerArmed": "nUhMVa_dangerArmed",
			"dangerBtn": "nUhMVa_dangerBtn",
			"depBadge": "nUhMVa_depBadge",
			"depLine": "nUhMVa_depLine",
			"deprecate": "nUhMVa_deprecate",
			"desc": "nUhMVa_desc",
			"descClamp": "nUhMVa_descClamp",
			"descTight": "nUhMVa_descTight",
			"descToggle": "nUhMVa_descToggle",
			"diagAlert": "nUhMVa_diagAlert",
			"diagArrow": "nUhMVa_diagArrow",
			"diagBadgeCommunity": "nUhMVa_diagBadgeCommunity",
			"diagBadgeInfo": "nUhMVa_diagBadgeInfo",
			"diagBadgeOfficial": "nUhMVa_diagBadgeOfficial",
			"diagBadgeShadow": "nUhMVa_diagBadgeShadow",
			"diagBadgeWarn": "nUhMVa_diagBadgeWarn",
			"diagBundle": "nUhMVa_diagBundle",
			"diagCount": "nUhMVa_diagCount",
			"diagEmpty": "nUhMVa_diagEmpty",
			"diagIndex": "nUhMVa_diagIndex",
			"diagKey": "nUhMVa_diagKey",
			"diagList": "nUhMVa_diagList",
			"diagMeta": "nUhMVa_diagMeta",
			"diagPage": "nUhMVa_diagPage",
			"diagRow": "nUhMVa_diagRow",
			"diagSection": "nUhMVa_diagSection",
			"diagSummary": "nUhMVa_diagSummary",
			"diagSummaryItem": "nUhMVa_diagSummaryItem",
			"diagSummaryMeta": "nUhMVa_diagSummaryMeta",
			"diagVal": "nUhMVa_diagVal",
			"dot": "nUhMVa_dot",
			"dragging": "nUhMVa_dragging",
			"dragHandle": "nUhMVa_dragHandle",
			"dragOver": "nUhMVa_dragOver",
			"dshmPlug": "nUhMVa_dshmPlug",
			"dshmPlugFade": "nUhMVa_dshmPlugFade",
			"dshmSlide": "nUhMVa_dshmSlide",
			"empty": "nUhMVa_empty",
			"err": "nUhMVa_err",
			"exportLogBtn": "nUhMVa_exportLogBtn",
			"fixFallback": "nUhMVa_fixFallback",
			"fixFallbackText": "nUhMVa_fixFallbackText",
			"foot": "nUhMVa_foot",
			"grid": "nUhMVa_grid",
			"groupActions": "nUhMVa_groupActions",
			"groupAddPanel": "nUhMVa_groupAddPanel",
			"groupCreate": "nUhMVa_groupCreate",
			"groupHead": "nUhMVa_groupHead",
			"groupHint": "nUhMVa_groupHint",
			"groupMember": "nUhMVa_groupMember",
			"groupMembers": "nUhMVa_groupMembers",
			"groupName": "nUhMVa_groupName",
			"groupRow": "nUhMVa_groupRow",
			"grow": "nUhMVa_grow",
			"head": "nUhMVa_head",
			"hiddenFile": "nUhMVa_hiddenFile",
			"inlineInput": "nUhMVa_inlineInput",
			"installBtn": "nUhMVa_installBtn",
			"irow": "nUhMVa_irow",
			"irowActions": "nUhMVa_irowActions",
			"irowMissing": "nUhMVa_irowMissing",
			"irowName": "nUhMVa_irowName",
			"irowNameText": "nUhMVa_irowNameText",
			"irowTrailing": "nUhMVa_irowTrailing",
			"lightbox": "nUhMVa_lightbox",
			"lightboxClose": "nUhMVa_lightboxClose",
			"lightboxDot": "nUhMVa_lightboxDot",
			"lightboxDotOn": "nUhMVa_lightboxDotOn",
			"lightboxDots": "nUhMVa_lightboxDots",
			"lightboxImg": "nUhMVa_lightboxImg",
			"lightboxNav": "nUhMVa_lightboxNav",
			"lightboxNext": "nUhMVa_lightboxNext",
			"lightboxPrev": "nUhMVa_lightboxPrev",
			"loading": "nUhMVa_loading",
			"logoMark": "nUhMVa_logoMark",
			"logoPlug": "nUhMVa_logoPlug",
			"masonry": "nUhMVa_masonry",
			"masonryCol": "nUhMVa_masonryCol",
			"meta": "nUhMVa_meta",
			"metaInline": "nUhMVa_metaInline",
			"metaTag": "nUhMVa_metaTag",
			"metaTagOk": "nUhMVa_metaTagOk",
			"modalNote": "nUhMVa_modalNote",
			"nameLink": "nUhMVa_nameLink",
			"nm": "nUhMVa_nm",
			"nmLink": "nUhMVa_nmLink",
			"noteAction": "nUhMVa_noteAction",
			"noteEdit": "nUhMVa_noteEdit",
			"noteInput": "nUhMVa_noteInput",
			"noteMine": "nUhMVa_noteMine",
			"noteRow": "nUhMVa_noteRow",
			"notesArrow": "nUhMVa_notesArrow",
			"notesBody": "nUhMVa_notesBody",
			"notesCode": "nUhMVa_notesCode",
			"notesDate": "nUhMVa_notesDate",
			"notesH": "nUhMVa_notesH",
			"notesLink": "nUhMVa_notesLink",
			"notesList": "nUhMVa_notesList",
			"notesMeta": "nUhMVa_notesMeta",
			"notesMsg": "nUhMVa_notesMsg",
			"notesP": "nUhMVa_notesP",
			"notesPre": "nUhMVa_notesPre",
			"notesRange": "nUhMVa_notesRange",
			"notesRendered": "nUhMVa_notesRendered",
			"notesRow": "nUhMVa_notesRow",
			"notesSha": "nUhMVa_notesSha",
			"notesVer": "nUhMVa_notesVer",
			"noteToggle": "nUhMVa_noteToggle",
			"okState": "nUhMVa_okState",
			"on": "nUhMVa_on",
			"opActions": "nUhMVa_opActions",
			"opAggregate": "nUhMVa_opAggregate",
			"opAggregateHint": "nUhMVa_opAggregateHint",
			"opAggregateTop": "nUhMVa_opAggregateTop",
			"opCloseBtn": "nUhMVa_opCloseBtn",
			"opDecision": "nUhMVa_opDecision",
			"opDecisionFoot": "nUhMVa_opDecisionFoot",
			"opDot": "nUhMVa_opDot",
			"opEmpty": "nUhMVa_opEmpty",
			"opEmptyHint": "nUhMVa_opEmptyHint",
			"opEntry": "nUhMVa_opEntry",
			"opEntryAlert": "nUhMVa_opEntryAlert",
			"opEntryQuiet": "nUhMVa_opEntryQuiet",
			"opHead": "nUhMVa_opHead",
			"opIcon": "nUhMVa_opIcon",
			"opMain": "nUhMVa_opMain",
			"opName": "nUhMVa_opName",
			"opPanel": "nUhMVa_opPanel",
			"opPanelTitle": "nUhMVa_opPanelTitle",
			"opQueuedIcon": "nUhMVa_opQueuedIcon",
			"opRow": "nUhMVa_opRow",
			"opRowAlert": "nUhMVa_opRowAlert",
			"opStatus": "nUhMVa_opStatus",
			"opStatusBad": "nUhMVa_opStatusBad",
			"opTop": "nUhMVa_opTop",
			"opVerb": "nUhMVa_opVerb",
			"opWrap": "nUhMVa_opWrap",
			"orderPanel": "nUhMVa_orderPanel",
			"orphBadge": "nUhMVa_orphBadge",
			"orphRow": "nUhMVa_orphRow",
			"ovArrow": "nUhMVa_ovArrow",
			"ovByTag": "nUhMVa_ovByTag",
			"ovFrom": "nUhMVa_ovFrom",
			"ovRow": "nUhMVa_ovRow",
			"owner": "nUhMVa_owner",
			"pageEllipsis": "nUhMVa_pageEllipsis",
			"pageInfo": "nUhMVa_pageInfo",
			"pager": "nUhMVa_pager",
			"pagerPages": "nUhMVa_pagerPages",
			"panelActions": "nUhMVa_panelActions",
			"panelNote": "nUhMVa_panelNote",
			"pct": "nUhMVa_pct",
			"presetList": "nUhMVa_presetList",
			"presetName": "nUhMVa_presetName",
			"presetRow": "nUhMVa_presetRow",
			"progress": "nUhMVa_progress",
			"reassure": "nUhMVa_reassure",
			"reassureOk": "nUhMVa_reassureOk",
			"repoLink": "nUhMVa_repoLink",
			"repoMark": "nUhMVa_repoMark",
			"retryBtn": "nUhMVa_retryBtn",
			"root": "nUhMVa_root",
			"roster": "nUhMVa_roster",
			"rosterAuthor": "nUhMVa_rosterAuthor",
			"rosterMain": "nUhMVa_rosterMain",
			"rosterName": "nUhMVa_rosterName",
			"rosterRow": "nUhMVa_rosterRow",
			"rosterRowOut": "nUhMVa_rosterRowOut",
			"rosterSplit": "nUhMVa_rosterSplit",
			"rosterTag": "nUhMVa_rosterTag",
			"rosterTagDrop": "nUhMVa_rosterTagDrop",
			"rosterTagKeep": "nUhMVa_rosterTagKeep",
			"row1": "nUhMVa_row1",
			"sectAction": "nUhMVa_sectAction",
			"sectionOverview": "nUhMVa_sectionOverview",
			"setActions": "nUhMVa_setActions",
			"setBetaTag": "nUhMVa_setBetaTag",
			"setBody": "nUhMVa_setBody",
			"setCard": "nUhMVa_setCard",
			"setCardOpen": "nUhMVa_setCardOpen",
			"setCheck": "nUhMVa_setCheck",
			"setChevron": "nUhMVa_setChevron",
			"setChevronOpen": "nUhMVa_setChevronOpen",
			"setConfirm": "nUhMVa_setConfirm",
			"setDanger": "nUhMVa_setDanger",
			"setDesc": "nUhMVa_setDesc",
			"setHeader": "nUhMVa_setHeader",
			"setHeadText": "nUhMVa_setHeadText",
			"setHint": "nUhMVa_setHint",
			"setLabel": "nUhMVa_setLabel",
			"setLabelBox": "nUhMVa_setLabelBox",
			"setName": "nUhMVa_setName",
			"setRow": "nUhMVa_setRow",
			"setSeg": "nUhMVa_setSeg",
			"setSegBtn": "nUhMVa_setSegBtn",
			"setSegOn": "nUhMVa_setSegOn",
			"shot": "nUhMVa_shot",
			"shots": "nUhMVa_shots",
			"snapConfirmText": "nUhMVa_snapConfirmText",
			"snapList": "nUhMVa_snapList",
			"snapMeta": "nUhMVa_snapMeta",
			"snapRow": "nUhMVa_snapRow",
			"sp": "nUhMVa_sp",
			"spec": "nUhMVa_spec",
			"specTag": "nUhMVa_specTag",
			"specTagFile": "nUhMVa_specTagFile",
			"specTagGit": "nUhMVa_specTagGit",
			"spin": "nUhMVa_spin",
			"src": "nUhMVa_src",
			"staleAction": "nUhMVa_staleAction",
			"star": "nUhMVa_star",
			"stateDot": "nUhMVa_stateDot",
			"stateTag": "nUhMVa_stateTag",
			"stickyHead": "nUhMVa_stickyHead",
			"sub": "nUhMVa_sub",
			"submitLink": "nUhMVa_submitLink",
			"subTabs": "nUhMVa_subTabs",
			"swatches": "nUhMVa_swatches",
			"switch": "nUhMVa_switch",
			"switchKnob": "nUhMVa_switchKnob",
			"switchMixed": "nUhMVa_switchMixed",
			"switchOn": "nUhMVa_switchOn",
			"tab": "nUhMVa_tab",
			"tabs": "nUhMVa_tabs",
			"tabSearch": "nUhMVa_tabSearch",
			"tabSearchRow": "nUhMVa_tabSearchRow",
			"tag": "nUhMVa_tag",
			"themeActions": "nUhMVa_themeActions",
			"themeCard": "nUhMVa_themeCard",
			"themeCardBody": "nUhMVa_themeCardBody",
			"themeCardFooter": "nUhMVa_themeCardFooter",
			"themeCardHead": "nUhMVa_themeCardHead",
			"themeCover": "nUhMVa_themeCover",
			"themeCoverEmpty": "nUhMVa_themeCoverEmpty",
			"themeDescription": "nUhMVa_themeDescription",
			"themeFullscreenBtn": "nUhMVa_themeFullscreenBtn",
			"themeGallery": "nUhMVa_themeGallery",
			"themeIdentity": "nUhMVa_themeIdentity",
			"themeLifecycle": "nUhMVa_themeLifecycle",
			"themePreviewAction": "nUhMVa_themePreviewAction",
			"themePreviewCount": "nUhMVa_themePreviewCount",
			"themeResultBar": "nUhMVa_themeResultBar",
			"themeSearch": "nUhMVa_themeSearch",
			"themesGrid": "nUhMVa_themesGrid",
			"themeStatus": "nUhMVa_themeStatus",
			"themeStatusMuted": "nUhMVa_themeStatusMuted",
			"themeToolbar": "nUhMVa_themeToolbar",
			"themeToolbarActions": "nUhMVa_themeToolbarActions",
			"title": "nUhMVa_title",
			"titleRow": "nUhMVa_titleRow",
			"top": "nUhMVa_top",
			"topBtn": "nUhMVa_topBtn",
			"version": "nUhMVa_version",
			"viewBar": "nUhMVa_viewBar",
			"viewBtn": "nUhMVa_viewBtn",
			"viewOn": "nUhMVa_viewOn",
			"warnLine": "nUhMVa_warnLine"
		};
		//#endregion
		//#region src/client/comments.ts
		/**
		* giscus wiring for the in-market comment thread.
		*
		* A plugin has ONE discussion, whether the reader reached it from
		* dshmarket.com, from the awesome-dsh-plugin catalog, or from inside the
		* market itself. That is only true as long as three things agree across the
		* three surfaces: the repository ids below, the `plugin:<slug>` term, and the
		* slug those terms are built from. The ids here mirror site/comments.mjs and
		* the slug mirrors scripts/build-site.mjs; both are asserted in
		* tests/client/comments.client.spec.ts against the real files, because a
		* silent disagreement does not fail — it forks the conversation in half and
		* nobody notices until someone asks why their comment vanished.
		*/
		const GISCUS = Object.freeze({
			repo: "awesome-dsh-plugin/awesome-dsh-plugin",
			repoId: "R_kgDOT3ajCQ",
			category: "Plugins",
			categoryId: "DIC_kwDOT3ajCc4DES8_"
		});
		/**
		* The plugin's slug, derived from its GitHub URL exactly as the two site
		* builders derive it. Entries that live in a subdirectory of a monorepo
		* (`.../tree/<ref>/packages/x`) get the `owner/repo--packages-x` form, so two
		* plugins from one repository do not share a thread.
		*/
		function pluginSlug(url) {
			const repoPath = url.replace("https://github.com/", "");
			const repo = repoPath.split("/").slice(0, 2).join("/");
			const sub = repoPath.includes("/tree/") ? repoPath.split("/tree/")[1].replace(/^[^/]+\//, "") : null;
			return sub ? `${repo}--${sub.replaceAll("/", "-")}` : repo;
		}
		/** The giscus discussion term for a plugin. */
		const commentsTerm = (url) => `plugin:${pluginSlug(url)}`;
		/** giscus's own locale codes, which are not the ones this plugin uses. */
		const giscusLang = (lang) => lang === "zh" ? "zh-CN" : "en";
		//#endregion
		//#region src/client/CommentsModal.tsx
		/**
		* The comment thread for one plugin, rendered inside the market.
		*
		* Opening this is the request to read the comments, so it loads on open —
		* there is no second click to confirm what the first one already said. What
		* the reader does have to be told, once and plainly, is that reading here
		* contacts giscus.app and GitHub: nothing else in the market talks to a third
		* party at the reader's request, and a comment box that quietly opens that
		* connection would be a surprise, not a feature.
		*
		* The thread itself lives in GitHub Discussions, keyed on the same
		* `plugin:<slug>` term the two websites use — see comments.ts.
		*/
		/**
		* Whether the host is currently showing a dark theme.
		*
		* Read off the rendered page rather than from `prefers-color-scheme`: the host
		* lets the reader pick a theme (including custom ones) independently of the
		* OS, and a light comment box dropped into a dark window is the kind of seam
		* that makes an embed look bolted on.
		*/
		function hostIsDark() {
			if (typeof window === "undefined") return false;
			const bg = getComputedStyle(document.body).backgroundColor;
			const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(bg);
			if (!m) return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
			const [r, g, b] = [
				Number(m[1]),
				Number(m[2]),
				Number(m[3])
			];
			return .299 * r + .587 * g + .114 * b < 128;
		}
		function CommentsModal(props) {
			const { name, url, lang, onClose, t } = props;
			const mount = (0, react.useRef)(null);
			const [state, setState] = (0, react.useState)("loading");
			const [attempt, setAttempt] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const host = mount.current;
				if (host === null) return;
				host.replaceChildren();
				setState("loading");
				const script = document.createElement("script");
				script.src = "https://giscus.app/client.js";
				script.async = true;
				script.crossOrigin = "anonymous";
				Object.assign(script.dataset, {
					repo: GISCUS.repo,
					repoId: GISCUS.repoId,
					category: GISCUS.category,
					categoryId: GISCUS.categoryId,
					mapping: "specific",
					term: commentsTerm(url),
					strict: "1",
					reactionsEnabled: "1",
					emitMetadata: "0",
					inputPosition: "bottom",
					theme: hostIsDark() ? "dark" : "light",
					lang: giscusLang(lang),
					loading: "lazy"
				});
				script.onload = () => setState("ready");
				script.onerror = () => {
					script.remove();
					setState("failed");
				};
				host.append(script);
				return () => {
					host.replaceChildren();
				};
			}, [
				url,
				lang,
				attempt
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: t("commentsTitle") + " — " + name,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Market_module_css_default.commentsNote,
						children: t("commentsNote")
					}),
					state === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.commentsFail,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Market_module_css_default.commentsError,
								children: t("commentsError")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setAttempt((n) => n + 1),
								children: t("commentsRetry")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: Market_module_css_default.src,
								href: `https://github.com/${GISCUS.repo}/discussions`,
								target: "_blank",
								rel: "noreferrer",
								children: t("commentsOnGitHub")
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Market_module_css_default.commentsStatus,
						role: "status",
						"aria-live": "polite",
						children: state === "loading" ? t("commentsLoading") : ""
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: mount,
						className: Market_module_css_default.commentsMount,
						"aria-busy": state === "loading"
					})
				]
			});
		}
		//#endregion
		//#region src/client/operations.ts
		const BUCKETS = {
			queued: "busy",
			running: "busy",
			input: "attention",
			failed: "attention",
			done: "ok",
			warned: "ok"
		};
		/** Which of the three visual groups a state belongs to. */
		function bucketOf(state) {
			return BUCKETS[state];
		}
		/** Whether a record has stopped moving on its own. */
		function isSettled(record) {
			return record.state === "done" || record.state === "warned" || record.state === "failed";
		}
		/** Whether a record is waiting on the user rather than on the host. */
		function needsUser(record) {
			return record.state === "input";
		}
		/** Append a record. Ids are supplied by the caller so tests stay deterministic. */
		function enqueue(list, record) {
			return [...list, record];
		}
		/**
		* Apply changes to one record.
		* @returns a new list; unchanged (same contents) when no record matches.
		*/
		function patch(list, id, changes) {
			return list.map((record) => record.id === id ? {
				...record,
				...changes
			} : record);
		}
		/** Drop one record outright — the panel's per-row dismiss. */
		function drop(list, id) {
			return list.filter((record) => record.id !== id);
		}
		/**
		* Clear finished records, keeping anything still moving or still waiting on
		* the user. A record in `input` survives: the user has not answered it yet,
		* and clearing it would delete the only route back to that decision.
		*/
		function clearSettled(list) {
			return list.filter((record) => !isSettled(record));
		}
		/**
		* How many queued records sit ahead of this one. The panel shows it because
		* "queued" without a position reads as stuck; the host runs one mutation at a
		* time, so the order shown is the order that will run.
		* @returns the count ahead, or null when the record is not queued.
		*/
		function queuePosition(list, id) {
			const index = list.filter((record) => record.state === "queued").findIndex((record) => record.id === id);
			return index < 0 ? null : index;
		}
		/**
		* Counts for the panel entry. The entry reports the batch, never one row:
		* one aggregate line beats seven notifications racing each other.
		*/
		function summarize(list) {
			let running = 0;
			let queued = 0;
			let attention = 0;
			let settled = 0;
			for (const record of list) if (record.state === "running") running += 1;
			else if (record.state === "queued") queued += 1;
			else if (needsUser(record)) attention += 1;
			else settled += 1;
			return {
				running,
				queued,
				attention,
				settled,
				total: running + queued + settled,
				progressed: settled + running
			};
		}
		/**
		* Panel order: what needs the user first, then what is still moving, then
		* what is finished. Within a group the original order is kept so a queue
		* reads top-to-bottom in the order it will run.
		*/
		function sortForPanel(list) {
			const rank = (record) => needsUser(record) ? 0 : isSettled(record) ? 2 : 1;
			return [...list].map((record, index) => ({
				record,
				index
			})).sort((a, b) => rank(a.record) - rank(b.record) || a.index - b.index).map((entry) => entry.record);
		}
		/**
		* The record a plugin card should reflect, newest first. A card shows the
		* button state for an operation in flight and a terminal marker for one that
		* ended without installing — without that marker a rejected install leaves
		* the card looking untouched, and the obvious next move is to press Install
		* again.
		*/
		function recordForUrl(list, url) {
			for (let index = list.length - 1; index >= 0; index -= 1) {
				const record = list[index];
				if (record.url === url) return record;
			}
			return null;
		}
		//#endregion
		//#region src/client/OperationsPanel.tsx
		/**
		* The activity entry and its panel: every install, update and uninstall the
		* user started, with the action each outcome calls for.
		*
		* The entry lives in the tab row rather than above the plugin grid, so
		* paginating, searching or switching tab cannot take a record — or a pending
		* decision — off screen. It reports the batch as one aggregate ("installing
		* 3 / 7") instead of one line per plugin.
		*/
		/** What the two clash outcomes are, in the order they are offered. */
		const CHOICES = [{
			id: "keep",
			label: "conflictKeep",
			note: "conflictKeepNote"
		}, {
			id: "swap",
			label: "conflictSwap",
			note: "conflictSwapNote"
		}];
		/**
		* What each plugin ends up as under the selected outcome.
		*
		* The consequence is drawn ON the plugins rather than described beside them:
		* pick "keep what I have" and the installed rows tick while the candidate
		* crosses out; pick the other and they swap. The candidate is in this list
		* for the same reason — a decision about which plugin survives has to show
		* what happens to the one being installed, not only to the others.
		*/
		function OutcomePreview(props) {
			const { t, record, choice } = props;
			const swap = choice === "swap";
			const candidate = props.describe(record.name);
			const row = (key, info, kept, tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: kept ? Market_module_css_default.rosterRow : `${Market_module_css_default.rosterRow} ${Market_module_css_default.rosterRowOut}`,
				children: [
					info.avatar,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Market_module_css_default.rosterMain,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.rosterName,
							title: key,
							children: info.title
						}), info.author !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.rosterAuthor,
							children: info.author
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: kept ? `${Market_module_css_default.rosterTag} ${Market_module_css_default.rosterTagKeep}` : `${Market_module_css_default.rosterTag} ${Market_module_css_default.rosterTagDrop}`,
						children: [
							kept ? "✓" : "✕",
							" ",
							tag
						]
					})
				]
			}, key);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.roster,
				children: [
					row(record.name, candidate, swap, t(swap ? "conflictOutcomeInstall" : "conflictOutcomeSkip")),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: Market_module_css_default.rosterSplit }),
					(record.conflicts ?? []).map((group) => row(group.owner, props.describe(group.owner), !swap, t(swap ? "conflictOutcomeRemove" : "conflictOutcomeKeep")))
				]
			});
		}
		/**
		* The decision attached to a clash. Two outcomes rather than an error plus a
		* destructive button: the default changes nothing, and selecting the other
		* one is itself the consent step, so its cost is stated here.
		*/
		function ConflictChoice(props) {
			const { t, record, replacing, envReady } = props;
			const [choice, setChoice] = (0, react.useState)("keep");
			const [whyOpen, setWhyOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.opDecision,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Market_module_css_default.conflictBody,
						children: t("conflictBody")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutcomePreview, {
						t,
						record,
						choice,
						describe: props.describe
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.choices,
						children: CHOICES.map(({ id, label, note }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: choice === id ? `${Market_module_css_default.choice} ${Market_module_css_default.choiceOn}` : Market_module_css_default.choice,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "radio",
								className: Market_module_css_default.choiceRadio,
								name: `dshm-conflict-${record.id}`,
								checked: choice === id,
								disabled: replacing,
								onChange: () => setChoice(id)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.choiceMain,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.choiceTitle,
									children: t(label)
								}), t(note) !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.choiceNote,
									children: t(note)
								})]
							})]
						}, id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.opDecisionFoot,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: Market_module_css_default.conflictDetailsToggle,
								"aria-expanded": whyOpen,
								onClick: () => setWhyOpen((open) => !open),
								children: [t("conflictDetails"), whyOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 12 })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: choice === "swap" ? "outline" : "primary",
								size: "sm",
								className: choice === "swap" ? Market_module_css_default.dangerBtn : void 0,
								disabled: replacing || choice === "swap" && !envReady,
								onClick: () => props.onResolve(choice),
								children: replacing ? t("conflictReplacing") : t("confirm")
							})
						]
					}),
					whyOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.conflictWhy,
						children: [(record.conflicts ?? []).map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							group.owner,
							": ",
							group.ids.join(", ")
						] }, group.owner)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.conflictWhyText,
							children: t("conflictWhy")
						})]
					})
				]
			});
		}
		/** Icon for a record's visual bucket — three, not one per state. */
		function BucketIcon(props) {
			const bucket = bucketOf(props.record.state);
			if (bucket === "busy") return props.record.state === "running" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Market_module_css_default.spin,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 13 })
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Market_module_css_default.opQueuedIcon,
				children: "⋯"
			});
			if (bucket === "ok") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {
				size: 13,
				className: Market_module_css_default.reassureOk
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {
				size: 14,
				className: Market_module_css_default.conflictIcon
			});
		}
		/** The one-line status under a record's name; the bucket carries the rest. */
		function statusLine(t, record, ahead) {
			switch (record.state) {
				case "queued": return ahead === null || ahead === 0 ? t("opQueued") : `${t("opQueued")} · ${t("opQueuedAhead")} ${String(ahead)}`;
				case "running": return record.detail ?? t("opRunning");
				case "input": return t("opNeedsChoice");
				case "failed": return record.reason ?? t("installFail");
				case "warned": return record.reason ?? t("opDone");
				case "done": return record.needsRefresh === true ? t("opDoneRefresh") : t("opDone");
			}
		}
		function OperationsPanel(props) {
			const { t, records, open } = props;
			const setOpen = props.onOpenChange;
			const wrapRef = (0, react.useRef)(null);
			const summary = summarize(records);
			const busy = summary.running + summary.queued > 0;
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onKey = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				const onPointer = (event) => {
					const wrap = wrapRef.current;
					if (wrap !== null && !wrap.contains(event.target)) setOpen(false);
				};
				document.addEventListener("keydown", onKey);
				document.addEventListener("mousedown", onPointer);
				return () => {
					document.removeEventListener("keydown", onKey);
					document.removeEventListener("mousedown", onPointer);
				};
			}, [open, setOpen]);
			const label = busy ? `${t("opInstalling")} ${String(summary.progressed)}/${String(summary.total)}` : summary.attention > 0 ? `${String(summary.attention)} ${t("opNeedsYou")}` : t("opTitle");
			const quiet = records.length === 0 && !open;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.opWrap,
				ref: wrapRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: quiet ? `${Market_module_css_default.opEntry} ${Market_module_css_default.opEntryQuiet}` : summary.attention > 0 ? `${Market_module_css_default.opEntry} ${Market_module_css_default.opEntryAlert}` : Market_module_css_default.opEntry,
					"aria-expanded": open,
					onClick: () => setOpen(quiet ? true : !open),
					children: [
						!quiet && busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.spin,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 12 })
						}),
						quiet ? t("opTitle") : label,
						!quiet && summary.attention > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.opDot })
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Market_module_css_default.opPanel,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.opHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.opPanelTitle,
									children: t("opTitle")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
								summary.settled > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: props.onClearSettled,
									children: t("opClear")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									"aria-label": t("opClose"),
									title: t("opClose"),
									className: Market_module_css_default.opCloseBtn,
									onClick: () => setOpen(false),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, { size: 14 })
								})
							]
						}),
						busy && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.opAggregate,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.opAggregateTop,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										t("opInstalling"),
										" ",
										summary.progressed,
										"/",
										summary.total
									] })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.bar,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: Market_module_css_default.barFill,
										style: { width: `${String(Math.round(summary.progressed / Math.max(1, summary.total) * 100))}%` }
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.opAggregateHint,
									children: t("opLeaveHint")
								})
							]
						}),
						records.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.opEmpty,
							children: [t("opEmpty"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.opEmptyHint,
								children: t("opEmptyHint")
							})]
						}),
						sortForPanel(records).map((record) => {
							const ahead = queuePosition(records, record.id);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: needsUser(record) ? `${Market_module_css_default.opRow} ${Market_module_css_default.opRowAlert}` : Market_module_css_default.opRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.opIcon,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BucketIcon, { record })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.opMain,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: Market_module_css_default.opTop,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Market_module_css_default.opVerb,
													children: t(`opKind_${record.kind}`)
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Market_module_css_default.opName,
													title: record.name,
													children: record.name
												})]
											}),
											record.state === "running" && typeof record.percent === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: Market_module_css_default.bar,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: Market_module_css_default.barFill,
													style: { width: `${String(record.percent)}%` }
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: bucketOf(record.state) === "attention" ? `${Market_module_css_default.opStatus} ${Market_module_css_default.opStatusBad}` : Market_module_css_default.opStatus,
												children: statusLine(t, record, ahead)
											}),
											needsUser(record) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConflictChoice, {
												t,
												record,
												replacing: props.replacing,
												envReady: props.envReady,
												describe: props.describe,
												onResolve: (choice) => props.onResolveConflict(record, choice)
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.opActions,
										children: [
											record.state === "running" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												onClick: () => props.onCancel(record),
												children: t("cancelOp")
											}),
											record.state === "queued" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => props.onDismiss(record),
												children: t("opDequeue")
											}),
											record.state === "done" && record.needsRefresh === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "primary",
												size: "sm",
												onClick: props.onRefresh,
												children: t("refresh")
											}),
											record.state === "failed" && (record.blockedBuilds ?? []).length > 0 && props.onApproveBuilds !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "primary",
												size: "sm",
												onClick: () => props.onApproveBuilds?.(record),
												children: t("approveBuilds")
											}),
											record.state === "failed" && (record.blockedBuilds ?? []).length === 0 && props.onRetry !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												onClick: () => props.onRetry?.(record),
												children: t("opRetry")
											}),
											isSettled(record) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => props.onDismiss(record),
												children: t("dismissNotice")
											})
										]
									})
								]
							}, record.id);
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/preset-panel.tsx
		/**
		* Diagnostics sub-panel — issue #98 phase 3 (plugin presets).
		*
		* Rendered at the bottom of the Diagnostics tab inside a collapsible section
		* (the parent keeps it mounted and passes `open`, so it lazy-loads on first
		* expand and keeps its state across collapses). Lists named presets
		* (GET /dsh-market/presets), saves the current community bundle order as a
		* new preset (POST /dsh-market/presets {action:'save', name, bundleOrder,
		* disabled}), applies one (action:'apply' — the host trial-validates and
		* auto-snapshots before writing; on success the parent refreshes the check
		* report) and deletes one after an inline double confirmation
		* (action:'delete').
		*
		* The list payload is read defensively (bare array or {presets: [...]}).
		*/
		async function postJson$1(url, body) {
			let res;
			try {
				res = await fetch(url, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				});
			} catch {
				return {
					status: 0,
					body: null
				};
			}
			let payload = null;
			try {
				payload = await res.json();
			} catch {}
			return {
				status: res.status,
				body: payload
			};
		}
		const errorText = (status, body, fallback) => body !== null && typeof body.error === "string" ? body.error : status === 0 ? fallback + "network error" : fallback + `HTTP ${String(status)}`;
		function PresetPanel(props) {
			const { t, open, bundleOrder, onRefresh } = props;
			const [presets, setPresets] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [msg, setMsg] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			const [name, setName] = (0, react.useState)("");
			/** Preset name awaiting the second confirm click, or null. */
			const [confirmDelete, setConfirmDelete] = (0, react.useState)(null);
			/** Hidden <input type="file"> for the import action. */
			const loaded = (0, react.useRef)(false);
			const load = (0, react.useCallback)(() => {
				fetch(api("/dsh-market/presets"), { cache: "no-store" }).then((res) => res.json()).then((body) => {
					const list = Array.isArray(body) ? body : Array.isArray(body.presets) ? body.presets : [];
					setPresets(list.map((item) => {
						const preset = item ?? {};
						return {
							name: String(preset.name ?? ""),
							bundleOrder: Array.isArray(preset.bundleOrder) ? preset.bundleOrder.map(String) : [],
							disabled: Array.isArray(preset.disabled) ? preset.disabled.map(String) : []
						};
					}));
					setError(null);
					loaded.current = true;
				}).catch(() => setError(t("presetListFail") + "network"));
			}, [t]);
			(0, react.useEffect)(() => {
				if (open && !loaded.current) load();
			}, [open, load]);
			(0, react.useCallback)(() => {
				const presetName = name.trim();
				if (presetName === "") {
					setError(t("presetNameEmpty"));
					return;
				}
				if (busy !== null) return;
				setBusy("save");
				setMsg(null);
				setError(null);
				fetch(api("/dsh-market/installed"), { cache: "no-store" }).then((res) => res.json()).then((installed) => postJson$1(api("/dsh-market/presets"), {
					action: "save",
					name: presetName,
					bundleOrder,
					disabled: Array.isArray(installed.disabled) ? installed.disabled.map(String) : []
				})).then(({ status, body }) => {
					if (status >= 200 && status < 300 && body?.ok === true) {
						setName("");
						setMsg(t("presetSaved"));
						load();
					} else setError(errorText(status, body, t("presetFail")));
				}).catch(() => setError(t("presetFail") + "network")).finally(() => setBusy(null));
			}, [
				busy,
				bundleOrder,
				load,
				name,
				t
			]);
			const apply = (0, react.useCallback)((presetName) => {
				if (busy !== null) return;
				setBusy("apply");
				setMsg(null);
				setError(null);
				postJson$1(api("/dsh-market/presets"), {
					action: "apply",
					name: presetName
				}).then(({ status, body }) => {
					if (status >= 200 && status < 300 && body?.ok === true) {
						setMsg(t("presetApplied"));
						onRefresh();
					} else setError(errorText(status, body, t("presetFail")));
				}).catch(() => setError(t("presetFail") + "network")).finally(() => setBusy(null));
			}, [
				busy,
				onRefresh,
				t
			]);
			const remove = (0, react.useCallback)((presetName) => {
				if (busy !== null) return;
				setBusy("delete");
				setMsg(null);
				setError(null);
				postJson$1(api("/dsh-market/presets"), {
					action: "delete",
					name: presetName
				}).then(({ status, body }) => {
					if (status >= 200 && status < 300 && body?.ok === true) {
						setConfirmDelete(null);
						setMsg(t("presetDeleted"));
						load();
					} else setError(errorText(status, body, t("presetFail")));
				}).catch(() => setError(t("presetFail") + "network")).finally(() => setBusy(null));
			}, [
				busy,
				load,
				t
			]);
			/** Change preview of one preset: {reordered[], enabled[], disabled[], noop}. */
			const [previewed, setPreviewed] = (0, react.useState)(null);
			const preview = (0, react.useCallback)((presetName) => {
				if (busy !== null) return;
				setBusy("preview");
				setMsg(null);
				setError(null);
				if (previewed?.name === presetName) {
					setPreviewed(null);
					setBusy(null);
					return;
				}
				postJson$1(api("/dsh-market/presets"), {
					action: "preview",
					name: presetName
				}).then(({ status, body }) => {
					if (status >= 200 && status < 300 && body?.ok === true && body.changes !== null && typeof body.changes === "object") {
						const changes = body.changes;
						setPreviewed({
							name: presetName,
							changes: {
								reordered: Array.isArray(changes.reordered) ? changes.reordered.map(String) : [],
								enabled: Array.isArray(changes.enabled) ? changes.enabled.map(String) : [],
								disabled: Array.isArray(changes.disabled) ? changes.disabled.map(String) : [],
								noop: changes.noop === true
							}
						});
					} else setError(errorText(status, body, t("presetPreviewFail")));
				}).catch(() => setError(t("presetPreviewFail") + "network")).finally(() => setBusy(null));
			}, [
				busy,
				previewed,
				t
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.orderPanel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Market_module_css_default.panelNote,
						children: t("presetHint")
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.err,
						children: error
					}),
					presets === null || presets.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.diagEmpty,
						children: t("presetEmpty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.presetList,
						children: presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.presetRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.confirmRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.presetName,
										children: preset.name
									}),
									preset.bundleOrder.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: t("presetBundleCount").replace("{0}", String(preset.bundleOrder.length))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
									confirmDelete === preset.name ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.confirmRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "primary",
											size: "sm",
											disabled: busy !== null,
											onClick: () => remove(preset.name),
											children: t("presetDelete")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											disabled: busy !== null,
											onClick: () => setConfirmDelete(null),
											children: t("cancel")
										})]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.confirmRow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												disabled: busy !== null,
												onClick: () => apply(preset.name),
												children: t("presetApply")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												disabled: busy !== null,
												onClick: () => preview(preset.name),
												children: previewed?.name === preset.name ? t("cancel") : t("presetPreview")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												size: "sm",
												disabled: busy !== null,
												onClick: () => setConfirmDelete(preset.name),
												children: t("presetDelete")
											})
										]
									})
								]
							}), previewed?.name === preset.name && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagList,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.diagKey,
									children: t("presetPreviewTitle")
								}), previewed.changes.noop ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.spec,
									children: t("presetNoop")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.spec,
									children: [
										previewed.changes.reordered.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.warnLine,
											children: [
												t("presetReorder").replace("{0}", String(previewed.changes.reordered.length)),
												": ",
												previewed.changes.reordered.join(", ")
											]
										}),
										previewed.changes.enabled.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.warnLine,
											children: [
												t("presetEnable").replace("{0}", String(previewed.changes.enabled.length)),
												": ",
												previewed.changes.enabled.join(", ")
											]
										}),
										previewed.changes.disabled.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.warnLine,
											children: [
												t("presetDisable").replace("{0}", String(previewed.changes.disabled.length)),
												": ",
												previewed.changes.disabled.join(", ")
											]
										})
									]
								})]
							})]
						}, preset.name))
					}),
					msg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.okState,
						children: msg
					})
				]
			});
		}
		//#endregion
		//#region src/client/snapshot-panel.tsx
		/**
		* Diagnostics sub-panel — issue #98 phase 3 (snapshots & rollback).
		*
		* Rendered at the bottom of the Diagnostics tab inside a collapsible section
		* (the parent keeps it mounted and passes `open`, so it lazy-loads on first
		* expand and keeps its state across collapses). Lists profile snapshots
		* (GET /dsh-market/snapshots), creates one (POST /dsh-market/snapshots) and
		* restores one after an inline double confirmation
		* (POST /dsh-market/restore-snapshot {snapshot}).
		*
		* The list payload is read defensively (bare array or {snapshots: [...]});
		* `files` entries are {path, json|lines} objects, from which only `path` is
		* displayed.
		*/
		async function postJson(url, body) {
			let res;
			try {
				res = await fetch(url, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				});
			} catch {
				return {
					status: 0,
					body: null
				};
			}
			let payload = null;
			try {
				payload = await res.json();
			} catch {}
			return {
				status: res.status,
				body: payload
			};
		}
		/** Snapshot file entries may be plain names or {path, json|lines} objects. */
		function fileNames(files) {
			if (!Array.isArray(files)) return [];
			const names = [];
			for (const file of files) if (typeof file === "string") names.push(file);
			else if (file !== null && typeof file === "object") {
				const path = file.path;
				if (typeof path === "string") names.push(path);
			}
			return names;
		}
		function snapshotOf(value) {
			if (value === null || typeof value !== "object") return null;
			const item = value;
			if (typeof item.id !== "string" && typeof item.id !== "number") return null;
			return {
				id: String(item.id),
				createdAt: typeof item.createdAt === "string" || typeof item.createdAt === "number" ? item.createdAt : 0,
				files: fileNames(item.files)
			};
		}
		function formatTime(value) {
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
		}
		function SnapshotPanel(props) {
			const { t, open, onRefresh } = props;
			const [snapshots, setSnapshots] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [msg, setMsg] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			/** Snapshot id awaiting the second confirm click (restore), or null. */
			const [confirmId, setConfirmId] = (0, react.useState)(null);
			/** Snapshot id awaiting the second confirm click (delete), or null. */
			const [confirmDeleteId, setConfirmDeleteId] = (0, react.useState)(null);
			const loaded = (0, react.useRef)(false);
			const load = (0, react.useCallback)(() => {
				fetch(api("/dsh-market/snapshots"), { cache: "no-store" }).then((res) => res.json()).then((body) => {
					const list = Array.isArray(body) ? body : Array.isArray(body.snapshots) ? body.snapshots : [];
					setSnapshots(list.map(snapshotOf).filter((snap) => snap !== null));
					setError(null);
					loaded.current = true;
				}).catch(() => setError(t("snapListFail") + "network"));
			}, [t]);
			(0, react.useEffect)(() => {
				if (open && !loaded.current) load();
			}, [open, load]);
			const create = (0, react.useCallback)(() => {
				if (busy !== null) return;
				setBusy("create");
				setMsg(null);
				setError(null);
				postJson(api("/dsh-market/snapshots"), {}).then(({ status, body }) => {
					if (status >= 200 && status < 300 && body?.ok === true) {
						setMsg(t("snapCreated"));
						load();
					} else {
						const detail = body !== null && typeof body.error === "string" ? body.error : status === 0 ? "network error" : `HTTP ${String(status)}`;
						setError(t("snapCreateFail") + detail);
					}
				}).catch(() => setError(t("snapCreateFail") + "network")).finally(() => setBusy(null));
			}, [
				busy,
				load,
				t
			]);
			const restore = (0, react.useCallback)((id) => {
				if (busy !== null) return;
				setBusy("restore");
				setMsg(null);
				setError(null);
				postJson(api("/dsh-market/restore-snapshot"), { snapshot: id }).then(({ status, body }) => {
					if (status >= 200 && status < 300 && body?.ok === true) {
						setConfirmId(null);
						setMsg(t("snapRestored"));
						onRefresh();
					} else {
						const detail = body !== null && typeof body.error === "string" ? body.error : status === 0 ? "network error" : `HTTP ${String(status)}`;
						setError(t("snapRestoreFail") + detail);
					}
				}).catch(() => setError(t("snapRestoreFail") + "network")).finally(() => setBusy(null));
			}, [
				busy,
				onRefresh,
				t
			]);
			/** Delete one snapshot after inline double confirmation. */
			const remove = (0, react.useCallback)((id) => {
				if (busy !== null) return;
				setBusy("delete");
				setMsg(null);
				setError(null);
				postJson(api("/dsh-market/delete-snapshot"), { snapshot: id }).then(({ status, body }) => {
					if (status >= 200 && status < 300 && body?.ok === true) {
						setConfirmDeleteId(null);
						setMsg(t("snapDeleted"));
						load();
					} else {
						const detail = body !== null && typeof body.error === "string" ? body.error : status === 0 ? "network error" : `HTTP ${String(status)}`;
						setError(t("snapDeleteFail") + detail);
					}
				}).catch(() => setError(t("snapDeleteFail") + "network")).finally(() => setBusy(null));
			}, [
				busy,
				load,
				t
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.orderPanel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Market_module_css_default.panelNote,
						children: t("snapHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.panelActions,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							size: "sm",
							disabled: busy !== null,
							onClick: create,
							children: busy === "create" ? t("snapCreating") : t("snapCreate")
						})
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.err,
						children: error
					}),
					snapshots === null || snapshots.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.diagEmpty,
						children: t("snapEmpty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.snapList,
						children: snapshots.map((snap) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.snapRow,
							children: confirmId === snap.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Market_module_css_default.snapConfirmText,
								children: t("snapRestoreConfirmText")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.confirmRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									disabled: busy !== null,
									onClick: () => restore(snap.id),
									children: busy === "restore" ? t("snapRestoring") : t("snapRestoreConfirm")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: busy !== null,
									onClick: () => setConfirmId(null),
									children: t("cancel")
								})]
							})] }) : confirmDeleteId === snap.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Market_module_css_default.snapConfirmText,
								children: t("snapDeleteConfirmText")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.confirmRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									disabled: busy !== null,
									onClick: () => remove(snap.id),
									children: busy === "delete" ? t("snapDeleting") : t("snapDeleteConfirm")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: busy !== null,
									onClick: () => setConfirmDeleteId(null),
									children: t("cancel")
								})]
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.snapMeta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagVal,
										children: formatTime(snap.createdAt)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: snap.id
									}),
									snap.files.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("snapFiles"),
											": ",
											snap.files.join(", ")
										]
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.confirmRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									disabled: busy !== null,
									onClick: () => setConfirmId(snap.id),
									children: t("snapRestore")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: busy !== null,
									onClick: () => setConfirmDeleteId(snap.id),
									children: t("snapDelete")
								})]
							})] })
						}, snap.id))
					}),
					msg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.okState,
						children: msg
					})
				]
			});
		}
		//#endregion
		//#region src/client/Diagnostics.tsx
		/**
		* Diagnostics tab — issue #98: renders the profile composition check report
		* served by the host route /dsh-market/check (see src/check.ts). Below the
		* report sit the phase 2/3 action panels: a community-bundle ordering block
		* (reorder locally with ↑/↓, POST to /dsh-market/bundle-order) and a
		* snapshots & rollback panel (snapshot-panel.tsx) — collapsible, default
		* collapsed, and lazy-fetching on first expand. The plugin presets panel
		* ships in a later stacked PR.
		*
		* Read-only view of the loading-layer stack and the conflict surface: bundle
		* order (official vs community), duplicate loader entry ids, peer dependency
		* mismatches, multi-version core packages, overrides and orphan patches. The
		* report
		* shape mirrors the CheckReport interface in src/check.ts; it is re-declared
		* here because the client bundle is built independently of the host tree.
		*/
		/**
		* A collapsible report section: header shows title + count + chevron; the
		* body stays mounted (hidden via CSS when collapsed) so every block keeps
		* its state. ALL blocks are collapsed by default — the summary strip above
		* gives the overview, and a problem block's title is highlighted and its
		* collapsed `overview` line shows the first issue, so nothing important is
		* hidden. Expand a block to see its full content.
		*/
		function Section(props) {
			const { title, count, empty, defaultOpen, problem = true, overview, alwaysShowBody = false, children } = props;
			const [open, setOpen] = (0, react.useState)(defaultOpen ?? false);
			const alert = problem && count > 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: Market_module_css_default.diagSection,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: Market_module_css_default.collapseHead,
						onClick: () => setOpen((o) => !o),
						"aria-expanded": open,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Market_module_css_default.collapseIcon,
								children: open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 14 })
							}),
							alert && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Market_module_css_default.diagAlert,
								children: "⚠"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${Market_module_css_default.collapseTitle}${alert ? ` ${Market_module_css_default.diagAlert}` : ""}`,
								children: title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagCount,
								children: [
									"(",
									count,
									")"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow })
						]
					}),
					!open && overview !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.sectionOverview,
						children: overview
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.collapseBody,
						style: open ? void 0 : { display: "none" },
						children: count === 0 && !alwaysShowBody ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagEmpty,
							children: empty
						}) : children
					})
				]
			});
		}
		/** A collapsible section that KEEPS its children mounted (hidden via CSS when
		* collapsed) so the phase 3 panels below retain their loaded data and
		* in-progress edits across collapses. Children mount from the start, but the
		* panels only fetch when `open` first becomes true.
		*/
		function CollapsibleSection(props) {
			const { title, count, open, onToggle, children } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: Market_module_css_default.diagSection,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: Market_module_css_default.collapseHead,
					onClick: onToggle,
					"aria-expanded": open,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.collapseIcon,
							children: open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 14 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.collapseTitle,
							children: title
						}),
						count !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: Market_module_css_default.diagCount,
							children: [
								"(",
								count,
								")"
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow })
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Market_module_css_default.collapseBody,
					style: open ? void 0 : { display: "none" },
					children
				})]
			});
		}
		/** Map an orphan patch reason (src/check.ts) to a locale key for its badge. */
		function orphanKindLabel(reason) {
			if (reason === "insert is not an array") return "orphanInsertNotArray";
			if (reason === "insert target not found") return "orphanInsertTargetMissing";
			if (reason === "insert target is not a group") return "orphanInsertTargetNotGroup";
			if (reason === "id required for non-insert patch") return "orphanIdRequired";
			if (reason === "patch target not found") return "orphanPatchTargetMissing";
			if (reason.startsWith("name mismatch")) return "orphanNameMismatch";
			return "orphanReasonOther";
		}
		/** Badge label for one risk-tier peer row (#201). */
		function peerRiskLabel(peer, t) {
			return peer.verdict?.kind === "risk" && peer.verdict.risk.direction === "aboveMax" ? t("peerRiskAboveMax") : t("peerRiskBelowMin");
		}
		/** Badge label for one warning-tier peer row (optional / aboveMax / legacy). */
		function peerWarningLabel(peer, t) {
			if (peer.verdict?.kind !== "warning") return t("checkUnsatisfied");
			return peer.verdict.warning.reason === "optional" ? t("peerWarnOptional") : t("peerWarnAboveMax");
		}
		/**
		* Fetch and render the profile check report. Refetches on every mount, so
		* switching tabs away and back re-runs the (cheap, read-only) analysis; the
		* phase 3 panels below call `refresh()` after applying changes.
		*/
		function Diagnostics(props) {
			const { t } = props;
			const [report, setReport] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [orderOpen, setOrderOpen] = (0, react.useState)(false);
			const [explainOpen, setExplainOpen] = (0, react.useState)(false);
			const [snapOpen, setSnapOpen] = (0, react.useState)(false);
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const [fixMsg, setFixMsg] = (0, react.useState)(null);
			/** The built AI-fix prompt when the clipboard path failed — rendered as a
			* selectable text block so the user can still copy it manually. */
			const [fixFallback, setFixFallback] = (0, react.useState)(null);
			/** Bump to re-run the /dsh-market/check fetch after an order/snapshot-restore apply. */
			const [version, setVersion] = (0, react.useState)(0);
			const refresh = (0, react.useCallback)(() => setVersion((v) => v + 1), []);
			/** Community bundle names from the report, in declared order. */
			const communityNames = (0, react.useMemo)(() => report === null ? [] : report.bundles.filter((bundle) => bundle.kind === "community").map((bundle) => bundle.name), [report]);
			/** Local editing state: re-synced whenever the report (re)loads. */
			const [order, setOrder] = (0, react.useState)(communityNames);
			const [orderMsg, setOrderMsg] = (0, react.useState)(null);
			const [orderErr, setOrderErr] = (0, react.useState)(null);
			const [orderBusy, setOrderBusy] = (0, react.useState)(false);
			/** Current-vs-candidate composition diff from a rejected static-composition
			* validation (#125 review): what the candidate would change, shown as a hint. */
			const [orderDiff, setOrderDiff] = (0, react.useState)(null);
			/**
			* Content identity of the last community order this draft synced to. A
			* refresh() refetch returns a NEW array even when the order is unchanged,
			* so a naive `setOrder(communityNames)` effect would wipe the user's
			* in-progress drag/↑↓ edits on every unrelated re-check. Only resync when
			* the report's community order actually CHANGED (apply order / snapshot
			* restore) — an identical refetch keeps the draft (review M2).
			*/
			const syncedOrderRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const synced = syncedOrderRef.current;
				if (synced !== null && synced.length === communityNames.length && communityNames.every((name, i) => name === synced[i])) return;
				syncedOrderRef.current = communityNames;
				setOrder(communityNames);
			}, [communityNames]);
			/** Swap one community bundle with its neighbour (-1 up, +1 down). */
			const moveBundle = (index, delta) => {
				setOrder((prev) => {
					const next = [...prev];
					const target = index + delta;
					if (target < 0 || target >= next.length) return prev;
					[next[index], next[target]] = [next[target], next[index]];
					return next;
				});
			};
			/** Row being dragged (index into the local `order` draft). */
			const [dragIndex, setDragIndex] = (0, react.useState)(null);
			/** Row currently under the pointer, highlighted as the drop target. */
			const [dragOverIndex, setDragOverIndex] = (0, react.useState)(null);
			const onRowDragStart = (index) => (event) => {
				if (orderBusy) {
					event.preventDefault();
					return;
				}
				setDragIndex(index);
				event.dataTransfer?.setData?.("text/plain", order[index] ?? "");
				if (event.dataTransfer !== void 0) event.dataTransfer.effectAllowed = "move";
			};
			const onRowDragOver = (index) => (event) => {
				if (dragIndex === null || dragIndex === index) return;
				event.preventDefault();
				if (event.dataTransfer !== void 0) event.dataTransfer.dropEffect = "move";
				setDragOverIndex(index);
			};
			const onRowDragLeave = (index) => () => {
				setDragOverIndex((prev) => prev === index ? null : prev);
			};
			const onRowDrop = (index) => (event) => {
				event.preventDefault();
				const from = dragIndex;
				setDragIndex(null);
				setDragOverIndex(null);
				if (from === null || from === index) return;
				setOrder((prev) => {
					const next = [...prev];
					const [moved] = next.splice(from, 1);
					next.splice(index, 0, moved);
					return next;
				});
			};
			const onRowDragEnd = () => {
				setDragIndex(null);
				setDragOverIndex(null);
			};
			/** POST the current community order; the host statically validates the
			* candidate composition (dry-run replay) before writing. */
			const applyOrder = (target) => {
				if (orderBusy) return;
				setOrderBusy(true);
				setOrderMsg(null);
				setOrderErr(null);
				setOrderDiff(null);
				fetch(api("/dsh-market/bundle-order"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ order: target ?? order })
				}).then(async (res) => {
					const body = await res.json().catch(() => null);
					if (!res.ok || body?.ok !== true) {
						const diff = body?.trial?.diff;
						const overrides = diff?.overrides?.length ?? 0;
						const orphans = diff?.orphans?.length ?? 0;
						const duplicates = diff?.duplicates?.length ?? 0;
						setOrderDiff(overrides + orphans + duplicates > 0 ? {
							overrides,
							orphans,
							duplicates
						} : null);
						const firstMessage = body?.trial?.errors?.[0]?.message;
						setOrderErr(body?.trial !== void 0 ? t("orderTrialFail").replace("{0}", firstMessage !== void 0 ? String(firstMessage) : "") : String(body?.error ?? `HTTP ${String(res.status)}`));
						return;
					}
					setOrderDiff(null);
					setOrderMsg(t("orderApplied"));
					refresh();
				}).catch((err) => setOrderErr(err instanceof Error ? err.message : String(err))).finally(() => setOrderBusy(false));
			};
			(0, react.useEffect)(() => {
				let live = true;
				setError(null);
				fetch(api("/dsh-market/check"), { cache: "no-store" }).then(async (res) => {
					if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
					const body = await res.json();
					if (live) setReport(body);
				}).catch((err) => {
					if (live) setError(err instanceof Error ? err.message : String(err));
				});
				return () => {
					live = false;
				};
			}, [version]);
			if (error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.err,
				children: [t("checkLoadFail"), error]
			});
			if (report === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.loading,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Market_module_css_default.spin,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 22 })
				}), t("checkLoading")]
			});
			const summary = report.summary;
			const suggested = report.suggestedOrder ?? null;
			const peerRisk = report.peerMismatches.filter((peer) => peer.satisfied === false && peer.verdict?.kind === "risk");
			const peerWarning = report.peerMismatches.filter((peer) => peer.satisfied === false && (peer.verdict === void 0 || peer.verdict.kind === "warning"));
			const peerInfo = report.peerMismatches.filter((peer) => peer.satisfied === false && peer.verdict?.kind === "none" || peer.satisfied === null);
			const peerSatisfied = report.peerMismatches.filter((peer) => peer.satisfied === true);
			const catConflict = report.duplicates.length;
			const catRisk = peerRisk.length;
			const catWarn = peerWarning.length;
			const catInfo = peerInfo.length;
			const catMulti = report.multiVersion.length;
			const catOrder = report.orderConflicts?.length ?? 0;
			const anyIssue = catConflict + catRisk + catWarn + catInfo + catMulti + catOrder > 0;
			const hasHardIssues = summary.errors.length > 0 || report.duplicates.length > 0 || catRisk > 0;
			/**
			* Build the AI-fix prompt (structured errors / duplicates / peer risks /
			* order conflicts + scope) and copy it to the clipboard. The user pastes it
			* into a new conversation and decides whether to send — the agent never runs
			* automatically.
			* (A previous auto-open/prefill attempt was dropped: it was unreliable
			* across host versions, so plain copy + toast is the contract.)
			*/
			const startAgentFix = () => {
				const lines = [];
				lines.push(t("aiFixIntro").replace("{0}", report.profile));
				lines.push("");
				lines.push(t("aiFixDetect"));
				lines.push("");
				lines.push(t("aiFixIfSelf"));
				lines.push("");
				const errorLines = summary.errors.filter((line) => !line.startsWith("duplicate loader entry id"));
				if (errorLines.length > 0) {
					lines.push(`${t("checkErrors")}:`);
					for (const e of errorLines) lines.push(`- ${e}`);
					lines.push("");
				}
				if (report.duplicates.length > 0) {
					lines.push(`${t("checkDuplicates")}:`);
					for (const dup of report.duplicates) lines.push(`- ${dup.id} × ${dup.count} (${dup.layers.join(" / ")})`);
					lines.push("");
				}
				if (peerRisk.length > 0) {
					lines.push(`${t("checkPeerRisk")}:`);
					for (const peer of peerRisk) {
						const direction = peer.verdict?.kind === "risk" && peer.verdict.risk.direction === "aboveMax" ? t("peerRiskAboveMax") : t("peerRiskBelowMin");
						lines.push(`- ${peer.plugin} → ${peer.name}@${peer.range} (${t("checkResolved")}: ${peer.resolved ?? "—"}, ${direction})`);
					}
					lines.push("");
				}
				if ((report.orderConflicts ?? []).length > 0) {
					lines.push(`${t("catOrder")}:`);
					for (const c of report.orderConflicts ?? []) lines.push(`- ${c.name}: ${c.reason}`);
					lines.push("");
				}
				lines.push(t("aiFixScope"));
				lines.push("");
				lines.push(t("aiFixConservative"));
				const prompt = lines.join("\n");
				setFixMsg(null);
				setFixFallback(null);
				const fallback = () => setFixFallback(prompt);
				if (typeof navigator.clipboard?.writeText === "function") navigator.clipboard.writeText(prompt).then(() => setFixMsg(t("aiFixCopied"))).catch(fallback);
				else fallback();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.diagPage,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.diagSummary,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: summary.ok ? Market_module_css_default.okState : Market_module_css_default.err,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
									state: summary.ok ? "done" : "error",
									size: 8
								}), summary.ok ? anyIssue ? t("checkIssues") : t("diagOkAll") : t("checkIssues")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagSummaryItem,
								title: t("checkDuplicates"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: "error",
										size: 8
									}),
									t("catConflict"),
									": ",
									catConflict
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagSummaryItem,
								title: t("checkPeerRisk"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: "error",
										size: 8
									}),
									t("catRisk"),
									": ",
									catRisk
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagSummaryItem,
								title: t("checkPeerWarning"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: "warning",
										size: 8
									}),
									t("catWarn"),
									": ",
									catWarn
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagSummaryItem,
								title: t("checkPeerInfoTier"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: "ongoing",
										size: 8
									}),
									t("catInfo"),
									": ",
									catInfo
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagSummaryItem,
								title: t("checkMultiVersion"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: "warning",
										size: 8
									}),
									t("checkMultiVersion"),
									": ",
									catMulti
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagSummaryItem,
								title: t("checkOrderTip"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
										state: "warning",
										size: 8
									}),
									t("catOrder"),
									": ",
									catOrder
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
							hasHardIssues && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: startAgentFix,
								title: t("aiFixHint"),
								children: t("aiFix")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								"aria-label": t("checkRefresh"),
								onClick: refresh,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, { size: 14 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.diagSummaryMeta,
								title: report.profile,
								children: [
									t("checkProfile"),
									": ",
									report.profile
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Market_module_css_default.diagSummaryMeta,
								children: new Date(report.scannedAt).toLocaleString()
							})
						]
					}),
					fixMsg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.okState,
						children: fixMsg
					}),
					fixFallback !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.fixFallback,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Market_module_css_default.panelNote,
							children: t("aiFixFail")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							readOnly: true,
							rows: 10,
							className: Market_module_css_default.fixFallbackText,
							value: fixFallback,
							onFocus: (e) => e.currentTarget.select()
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(CollapsibleSection, {
						title: t("diagExplain"),
						open: explainOpen,
						onToggle: () => setExplainOpen((o) => !o),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: Market_module_css_default.panelNote,
							children: t("diagExplainText")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.diagList,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.spec,
									children: t("diagTermBundle")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.spec,
									children: t("diagTermEntry")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.spec,
									children: t("diagTermPeer")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.spec,
									children: t("diagTermShadow")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.spec,
									children: t("diagTermOrphan")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.spec,
									children: t("diagTermOrder")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkErrors"),
						count: summary.errors.length,
						empty: t("checkErrorsEmpty"),
						overview: summary.errors.length > 0 ? summary.errors[0] : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: summary.errors.map((line, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.err,
								children: line
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkWarnings"),
						count: summary.warnings.length,
						empty: t("checkWarningsEmpty"),
						overview: summary.warnings.length > 0 ? summary.warnings[0] : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: summary.warnings.map((line, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.warnLine,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: line })
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkBundles"),
						count: report.bundles.length,
						empty: t("checkBundlesEmpty"),
						problem: false,
						overview: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							t("checkOfficial"),
							" × ",
							report.bundles.filter((b) => b.kind === "official").length,
							" · ",
							t("checkCommunity"),
							" × ",
							report.bundles.filter((b) => b.kind === "community").length
						] }),
						children: report.bundles.map((bundle, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.diagBundle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.diagRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.diagIndex,
											children: i + 1
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.diagArrow,
											children: "→"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.nm,
											children: bundle.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: bundle.kind === "official" ? Market_module_css_default.diagBadgeOfficial : Market_module_css_default.diagBadgeCommunity,
											children: bundle.kind === "official" ? t("checkOfficial") : t("checkCommunity")
										}),
										bundle.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.err,
											children: bundle.error
										}),
										bundle.parseError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: Market_module_css_default.err,
											children: [
												t("checkPatch"),
												": ",
												bundle.parseError
											]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.diagMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagKey,
										children: t("checkSource")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.spec,
										children: bundle.source
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.diagMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagKey,
										children: t("checkEntries")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.spec,
										children: bundle.entries.length > 0 ? bundle.entries.join(", ") : "—"
									})]
								}),
								bundle.directory !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.diagMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagKey,
										children: t("checkDir")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.spec,
										children: bundle.directory
									})]
								}),
								bundle.patchPath !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.diagMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagKey,
										children: t("checkPatch")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.spec,
										children: bundle.patchPath
									})]
								})
							]
						}, bundle.name))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkDuplicates"),
						count: report.duplicates.length,
						empty: t("checkDuplicatesEmpty"),
						overview: report.duplicates.length > 0 ? `${report.duplicates[0]?.id} × ${report.duplicates[0]?.count}` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: report.duplicates.map((dup) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: dup.id
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.err,
										children: ["× ", dup.count]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: dup.layers.join(" / ")
									})
								]
							}, dup.id))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkPeerRisk"),
						count: peerRisk.length,
						empty: t("checkPeerRiskEmpty"),
						overview: peerRisk.length > 0 ? `${peerRisk[0].plugin} → ${peerRisk[0].name}@${peerRisk[0].range}（${t("checkResolved")}: ${peerRisk[0].resolved ?? "—"}）` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: peerRisk.map((peer, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: peer.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.nm,
										children: peer.plugin
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkRange"),
											": ",
											peer.range
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkResolved"),
											": ",
											peer.resolved ?? "—"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagBadgeShadow,
										children: peerRiskLabel(peer, t)
									})
								]
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkPeerWarning"),
						count: peerWarning.length,
						empty: t("checkPeerWarningEmpty"),
						overview: peerWarning.length > 0 ? `${peerWarning[0].plugin} → ${peerWarning[0].name}@${peerWarning[0].range}（${peerWarningLabel(peerWarning[0], t)}）` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: peerWarning.map((peer, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: peer.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.nm,
										children: peer.plugin
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkRange"),
											": ",
											peer.range
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkResolved"),
											": ",
											peer.resolved ?? "—"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagBadgeWarn,
										children: peerWarningLabel(peer, t)
									})
								]
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkPeerInfoTier"),
						count: peerInfo.length,
						empty: t("checkPeerInfoTierEmpty"),
						problem: false,
						overview: peerInfo.length > 0 ? `${peerInfo[0].plugin} → ${peerInfo[0].name}@${peerInfo[0].range}` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: peerInfo.map((peer, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: peer.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.nm,
										children: peer.plugin
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkRange"),
											": ",
											peer.range
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkResolved"),
											": ",
											peer.resolved ?? "—"
										]
									}),
									peer.satisfied === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagBadgeInfo,
										children: t("checkUnknown")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.diagBadgeInfo,
										children: t("peerInfoUnverified")
									})
								]
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkPeerSatisfied"),
						count: peerSatisfied.length,
						empty: t("checkPeerSatisfiedEmpty"),
						problem: false,
						overview: peerSatisfied.length > 0 ? `${peerSatisfied[0].plugin} → ${peerSatisfied[0].name}@${peerSatisfied[0].range}` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: peerSatisfied.map((peer, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: peer.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.nm,
										children: peer.plugin
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkRange"),
											": ",
											peer.range
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkResolved"),
											": ",
											peer.resolved ?? "—"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.okState,
										children: t("checkSatisfied")
									})
								]
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkMultiVersion"),
						count: report.multiVersion.length,
						empty: t("checkMultiEmpty"),
						overview: report.multiVersion.length > 0 ? `${report.multiVersion[0]?.name}: ${report.multiVersion[0]?.versions.join(" / ")}` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: report.multiVersion.map((mv) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: mv.name
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: mv.versions.join(" / ")
									}),
									mv.hoisted !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.spec,
										children: [
											t("checkHoisted"),
											": ",
											mv.hoisted
										]
									})
								]
							}, mv.name))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkOverrides"),
						count: report.overrides.length,
						empty: t("checkOverridesEmpty"),
						overview: report.overrides.length > 0 ? `${report.overrides[0]?.id} ← ${report.overrides[0]?.layer}` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: report.overrides.map((ov, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.ovRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: ov.id
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.ovArrow,
										children: "←"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.ovByTag,
										children: ov.layer
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: t("checkOverridden")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.ovFrom,
										children: ov.overriddenLayers.join(", ")
									})
								]
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
						title: t("checkOrphans"),
						count: report.orphans.length,
						empty: t("checkOrphansEmpty"),
						overview: report.orphans.length > 0 ? `${report.orphans[0]?.id}（${t(orphanKindLabel(report.orphans[0]?.reason ?? ""))}）` : void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.diagList,
							children: report.orphans.map((orphan, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.orphRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.orphBadge,
										children: t(orphanKindLabel(orphan.reason))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.diagVal,
										children: orphan.id
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.nm,
										children: orphan.layer
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: orphan.reason
									})
								]
							}, i))
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(CollapsibleSection, {
						title: t("orderSection"),
						count: order.length,
						open: orderOpen,
						onToggle: () => setOrderOpen((o) => !o),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Market_module_css_default.panelNote,
								children: t("orderDragHint")
							}),
							report.orderConflicts !== void 0 && report.orderConflicts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagList,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.diagKey,
									children: t("orderConflicts")
								}), report.orderConflicts.map((conflict, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.warnLine,
									children: [
										conflict.name,
										" — ",
										conflict.reason
									]
								}, i))]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 8,
									flexWrap: "wrap"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: order.length === 0 || orderBusy,
										onClick: () => applyOrder(),
										children: orderBusy ? "…" : t("orderApply")
									}),
									suggested !== null && suggested.ok === true && suggested.order.join("\0") !== communityNames.join("\0") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										disabled: orderBusy,
										onClick: () => applyOrder(suggested.order),
										children: t("orderSuggestApply")
									}),
									suggested !== null && suggested.ok === true && suggested.order.join("\0") === communityNames.join("\0") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.okState,
										children: t("orderAlreadyOptimal")
									}),
									order.join("\0") !== communityNames.join("\0") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										disabled: orderBusy,
										onClick: () => setOrder(communityNames),
										children: t("orderReset")
									}),
									orderMsg !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.okState,
										children: orderMsg
									}),
									orderErr !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.err,
										children: orderErr
									})
								]
							}),
							orderDiff !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.panelNote,
								children: t("orderDiffHint").replace("{0}", String(orderDiff.overrides)).replace("{1}", String(orderDiff.orphans)).replace("{2}", String(orderDiff.duplicates))
							}),
							suggested !== null && suggested.ok === false && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.warnLine,
								children: [
									t("orderSuggestHint"),
									" ⚠ ",
									suggested.cycle.join(" → ")
								]
							}),
							report.duplicateNames !== void 0 && report.duplicateNames.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.diagList,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.diagKey,
									children: t("duplicateNames")
								}), report.duplicateNames.map((dup, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.panelNote,
									children: [
										dup.name,
										" × ",
										dup.count,
										" — ",
										dup.layers.join(" / ")
									]
								}, i))]
							}),
							order.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.diagEmpty,
								children: "—"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.diagList,
								children: order.map((name, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									draggable: !orderBusy,
									className: [
										Market_module_css_default.diagRow,
										dragIndex === i ? Market_module_css_default.dragging : "",
										dragOverIndex === i ? Market_module_css_default.dragOver : ""
									].filter(Boolean).join(" "),
									onDragStart: onRowDragStart(i),
									onDragOver: onRowDragOver(i),
									onDragLeave: onRowDragLeave(i),
									onDrop: onRowDrop(i),
									onDragEnd: onRowDragEnd,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.dragHandle,
											"aria-label": t("orderDrag"),
											title: t("orderDrag"),
											children: "⠿"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.diagIndex,
											children: i + 1
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.nm,
											children: name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											draggable: false,
											"aria-label": t("orderUp"),
											disabled: i === 0 || orderBusy,
											onClick: () => moveBundle(i, -1),
											children: t("orderUp")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											draggable: false,
											"aria-label": t("orderDown"),
											disabled: i >= order.length - 1 || orderBusy,
											onClick: () => moveBundle(i, 1),
											children: t("orderDown")
										})
									]
								}, name))
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollapsibleSection, {
						title: t("presetSection"),
						open: presetOpen,
						onToggle: () => setPresetOpen((o) => !o),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PresetPanel, {
							t,
							open: presetOpen,
							bundleOrder: order,
							onRefresh: refresh
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollapsibleSection, {
						title: t("snapSection"),
						open: snapOpen,
						onToggle: () => setSnapOpen((o) => !o),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SnapshotPanel, {
							t,
							open: snapOpen,
							onRefresh: refresh
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/self-check.ts
		/**
		* What the browser can see about the market that the server cannot.
		*
		* This exists because of a pattern, not a hypothesis. #293 ("市场显示空白")
		* and #384 ("lightbox cannot be closed") are both reproducible for their
		* reporters and for nobody else, on clean profiles, across host versions.
		* Both investigations then stalled in the same place: I asked the reporter to
		* open a console and paste the result of an expression. That costs a day per
		* question, asks a non-developer to run code from a stranger, and is the one
		* step where a report goes quiet.
		*
		* Meanwhile the exported log — which the issue template already asks for, and
		* which reporters do send — describes only the server: dependencies, bundle
		* resolution, events. Everything it says was already true of a machine where
		* the bug does not happen. The interesting half was in a page nobody looked
		* at.
		*
		* So the browser answers the questions I have actually had to ask, in the
		* artefact people already know how to produce. Nothing here diagnoses
		* anything on its own; it is evidence, collected before it is needed.
		*/
		/**
		* How many times this module has been evaluated in this page.
		*
		* Module scope runs once per module instance, so >1 means the market's client
		* bundle was loaded twice — two React copies, two of every module singleton,
		* two portal containers. That is a specific hypothesis for #384: two React
		* roots each attach delegated listeners to their own portal container, and a
		* click lands on whichever container is last in `body` while the handlers
		* live on the other one, so the buttons look present and do nothing.
		*
		* Counted on `window` rather than in a module variable for the obvious
		* reason: a module variable would be duplicated along with everything else
		* and each copy would confidently report 1.
		*/
		const globals = globalThis;
		globals.__dshmarketClientLoads = (globals.__dshmarketClientLoads ?? 0) + 1;
		/** Whether `value` looks like a browser environment worth inspecting. */
		const hasDom = () => typeof document !== "undefined" && document.body !== null;
		/**
		* The browser-side section of the exported log.
		*
		* Deliberately facts, not verdicts. "portal containers: 2" is something a
		* reporter can paste without judging it, and something I can act on; "your
		* bundle is double-loaded" would be a guess printed in the user's face, and
		* wrong the first time a host legitimately renders two markets.
		* @returns the lines to append, or an empty array outside a browser.
		*/
		function clientDiagnostics() {
			if (!hasDom()) return [];
			const portals = document.querySelectorAll("[data-dsh-market-portal]");
			const roots = document.querySelectorAll("[data-dsh-market-root]");
			const last = portals.length > 0 ? portals[portals.length - 1] : null;
			return [
				`client bundle evaluations: ${String(globals.__dshmarketClientLoads ?? 0)}`,
				`market roots in the document: ${String(roots.length)}`,
				`portal containers: ${String(portals.length)}` + (last === null ? "" : ` (last one is body's last child: ${String(last === document.body.lastElementChild)})`),
				`plugin cards rendered: ${String(document.querySelectorAll("[data-dsh-market-root] [class*=\"_card\"]").length)}`,
				`document baseURI: ${document.baseURI}`,
				`page URL: ${location.origin}${location.pathname}`,
				`user agent: ${navigator.userAgent}`
			];
		}
		//#endregion
		//#region src/client/MarketSection.tsx
		/**
		* The Market settings section: Discover / Themes / Installed tabs over the
		* /dsh-market/* host routes, with install/update/uninstall flows and the
		* pending-restart bookkeeping in sessionStorage.
		*/
		function isHostDependencyFinding(value) {
			if (value === null || typeof value !== "object") return false;
			const finding = value;
			return finding.code === "shared-host-package-dependency" && finding.severity === "warning" && finding.subject?.kind === "package" && typeof finding.subject.name === "string" && finding.evidence?.basis === "manifest-declaration" && typeof finding.evidence?.dependency === "string" && typeof finding.evidence.declaredRange === "string" && finding.evidence.declaredIn === "dependencies";
		}
		const HOST_DEPENDENCY_PREVIEW_LIMIT = 5;
		const IGNORED_UPDATES_SESSION_KEY = "dshm-updates-ignored";
		/**
		* Read the update reminders dismissed for this host process. The boot id is
		* part of the value rather than the key so sessionStorage never accumulates
		* one orphaned entry per process. Invalid and stale records fail open: an
		* update reminder is safer than silently hiding one we cannot account for.
		*/
		function ignoredUpdatesForBoot(boot) {
			const saved = readSession(IGNORED_UPDATES_SESSION_KEY);
			if (!(saved !== null && typeof saved === "object" && !Array.isArray(saved) && saved.boot === boot && Array.isArray(saved.names) && saved.names.every((name) => typeof name === "string" && name !== ""))) {
				try {
					sessionStorage.removeItem(IGNORED_UPDATES_SESSION_KEY);
				} catch {}
				return [];
			}
			return [...new Set(saved.names)];
		}
		function HostDependencyDiagnostics({ findings, t }) {
			if (findings.length === 0) return null;
			const preview = findings.slice(0, HOST_DEPENDENCY_PREVIEW_LIMIT);
			const remaining = findings.length - preview.length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.banner,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {
					size: 14,
					className: Market_module_css_default.bannerIcon
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: Market_module_css_default.grow,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("hostDependencyWarning") }),
						preview.map((finding) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.spec,
							children: [
								finding.subject.name,
								" → ",
								finding.evidence.dependency,
								"@",
								finding.evidence.declaredRange
							]
						}, `${finding.subject.name}:${finding.evidence.dependency}`)),
						remaining > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.spec,
							children: t("hostDependencyMore").replace("{0}", String(remaining))
						})
					]
				})]
			});
		}
		/** The state label + dot for one activation result (P0-2). */
		function activationMeta(state, t) {
			if (state === "live") return {
				label: t("stateLive"),
				dot: "done"
			};
			if (state === "restart") return {
				label: t("stateRestart"),
				dot: "warning"
			};
			if (state === "inert") return {
				label: t("stateInert"),
				dot: "warning"
			};
			if (state === "broken") return {
				label: t("stateBroken"),
				dot: "error"
			};
			if (state === "disabled") return {
				label: t("stateDisabled"),
				dot: "warning"
			};
			return {
				label: "—",
				dot: "warning"
			};
		}
		function phaseLabel(phase, t) {
			if (phase === "resolving") return t("phaseResolving");
			if (phase === "downloading") return t("phaseDownloading");
			if (phase === "linking") return t("phaseLinking");
			return t("phaseBuilding");
		}
		/**
		* Page/page-size state shared by every paged list in this file (Discover,
		* Themes) — each caller owns its OWN instance (their filters are
		* independent, a search in one tab has no business resetting the other's
		* page), but the mechanics (clamp against a shrinking list, reset to page 1
		* when the filters that produced `count` change, scroll back to the top of
		* the shared body on any page move) are one implementation, not two.
		*/
		function usePagination(count, resetDeps, scrollToTop) {
			const [page, setPage] = (0, react.useState)(1);
			const [pageSize, setPageSize] = (0, react.useState)(DEFAULT_PAGE_SIZE);
			(0, react.useEffect)(() => {
				setPage(1);
			}, resetDeps);
			const totalPages = Math.max(1, Math.ceil(count / pageSize));
			const currentPage = Math.min(page, totalPages);
			const goToPage = (next) => {
				setPage(Math.max(1, Math.min(next, totalPages)));
				scrollToTop();
			};
			const changePageSize = (size) => {
				setPageSize(size);
				setPage(1);
				scrollToTop();
			};
			return {
				currentPage,
				totalPages,
				pageSize,
				goToPage,
				changePageSize
			};
		}
		/**
		* The sort/time-range dropdown (primitives Menu): three independent option
		* groups, ids namespaced so one onSelect routes by prefix. Owns its own
		* open state — a caller wires only the sort VALUES, not the dropdown's UI
		* state, so Discover and Themes can each mount one without threading an
		* extra `filterOpen`/`setFilterOpen` pair through their own state.
		*/
		function FilterMenu({ sortField, sortDir, timeRange, onSortField, onSortDir, onTimeRange, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const sortDirLabel = (dir) => sortField === "added" ? dir === "desc" ? "sortNewest" : "sortOldest" : dir === "desc" ? "sortDesc" : "sortAsc";
			const items = (0, react.useMemo)(() => [
				{
					type: "label",
					id: "f-sort",
					text: t("filterSort")
				},
				...SORT_FIELD_OPTIONS.map((opt) => ({
					id: "field:" + opt.key,
					label: t(opt.label)
				})),
				{
					type: "separator",
					id: "f-sep1"
				},
				{
					type: "label",
					id: "f-dir",
					text: t("filterDir")
				},
				...SORT_DIR_OPTIONS.map((dir) => ({
					id: "dir:" + dir,
					label: t(sortDirLabel(dir))
				})),
				{
					type: "separator",
					id: "f-sep2"
				},
				{
					type: "label",
					id: "f-time",
					text: t("filterTime")
				},
				...TIME_OPTIONS.map((opt) => ({
					id: "time:" + opt.key,
					label: t(opt.label)
				}))
			], [t, sortField]);
			const selectedIds = (0, react.useMemo)(() => [
				"field:" + sortField,
				"dir:" + sortDir,
				"time:" + timeRange
			], [
				sortField,
				sortDir,
				timeRange
			]);
			const onSelect = (id) => {
				if (id.startsWith("field:")) onSortField(id.slice(6));
				else if (id.startsWith("dir:")) onSortDir(id.slice(4));
				else if (id.startsWith("time:")) onTimeRange(id.slice(5));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => setOpen(false),
				onSelect,
				selectedIds,
				align: "end",
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					size: "sm",
					icon: open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }),
					onClick: () => setOpen((o) => !o),
					children: t("filter")
				}),
				items
			});
		}
		/** First/prev/numbered/next/last controls plus a per-page-size menu — one
		* implementation for every paged list, driven entirely by `usePagination`'s
		* return value. Owns its own page-size dropdown open state for the same
		* reason `FilterMenu` owns its own. */
		function Pager({ currentPage, totalPages, pageSize, onGoToPage, onChangePageSize, t }) {
			const [sizeOpen, setSizeOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.pager,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Market_module_css_default.pagerPages,
					children: totalPages > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							disabled: currentPage === 1,
							onClick: () => onGoToPage(1),
							"aria-label": t("firstPage"),
							children: "«"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, { size: 14 }),
							disabled: currentPage === 1,
							onClick: () => onGoToPage(currentPage - 1),
							children: t("prevPage")
						}),
						pageItems(currentPage, totalPages).map((item, i) => item === "…" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.pageEllipsis,
							children: "…"
						}, "e" + i) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: item === currentPage ? "primary" : "outline",
							size: "sm",
							onClick: () => onGoToPage(item),
							children: item
						}, item)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							disabled: currentPage === totalPages,
							onClick: () => onGoToPage(currentPage + 1),
							children: [t("nextPage"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 14 })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							disabled: currentPage === totalPages,
							onClick: () => onGoToPage(totalPages),
							"aria-label": t("lastPage"),
							children: "»"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.pageInfo,
							children: t("pageInfo").replace("{0}", String(currentPage)).replace("{1}", String(totalPages))
						})
					] })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: sizeOpen,
					onClose: () => setSizeOpen(false),
					onSelect: (id) => onChangePageSize(Number(id)),
					selectedId: String(pageSize),
					align: "end",
					portal: true,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }),
						onClick: () => setSizeOpen((o) => !o),
						children: t("perPage") + " " + pageSize
					}),
					items: PAGE_SIZES.map((size) => ({
						id: String(size),
						label: String(size)
					}))
				})]
			});
		}
		/**
		* Card avatar: the plugin owner's GitHub avatar (no API, browser-cached),
		* falling back to the initial-letter tile when it can't load.
		*/
		/** Inline pass: `code` spans and **bold**, everything else plain text. */
		function mdInline(text) {
			return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
				if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: part.slice(2, -2) }, i);
				if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
					className: Market_module_css_default.notesCode,
					children: part.slice(1, -1)
				}, i);
				return part;
			});
		}
		/**
		* Release-body markdown, reduced to what a reading dialog needs: headings,
		* bullets, paragraphs, bold, inline code. Every character arrives as a React
		* text child (auto-escaped) — nothing from the repo is ever interpreted as
		* markup, so this stays free of the HTML surface real markdown parsers open.
		*/
		function renderMarkdown(md) {
			const out = [];
			let bullets = null;
			const flushList = () => {
				if (bullets === null) return;
				const items = bullets;
				out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: Market_module_css_default.notesList,
					children: items.map((item, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: mdInline(item) }, i))
				}, `l${out.length}`));
				bullets = null;
			};
			for (const line of md.split("\n")) {
				const trimmed = line.trim();
				if (trimmed === "") {
					flushList();
					continue;
				}
				const heading = /^#{1,6}\s+(.*)$/.exec(trimmed);
				if (heading !== null) {
					flushList();
					out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.notesH,
						children: mdInline(heading[1])
					}, `h${out.length}`));
					continue;
				}
				const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
				if (bullet !== null) {
					(bullets ??= []).push(bullet[1]);
					continue;
				}
				flushList();
				out.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Market_module_css_default.notesP,
					children: mdInline(line)
				}, `p${out.length}`));
			}
			flushList();
			return out;
		}
		function OwnerAvatar({ name, owner }) {
			const [failed, setFailed] = (0, react.useState)(false);
			if (failed || owner === "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Market_module_css_default.av,
				style: { background: avatarColor(name) },
				children: name.replace(/^dsh[-_]/i, "").charAt(0).toUpperCase() || "P"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
				className: Market_module_css_default.av,
				src: avatarUrl(owner),
				alt: "",
				loading: "lazy",
				onError: () => setFailed(true)
			});
		}
		/**
		* AppStore-style screenshot strip in the install detail dialog (#61).
		* Curated registry screenshots win; otherwise images are extracted from the
		* repo README. Requests start only once the dialog opens; failures — no
		* README, no images, broken links — degrade to rendering nothing at all.
		*/
		function ScreenshotStrip({ plugin, onOpen }) {
			const [shots, setShots] = (0, react.useState)([]);
			const [broken, setBroken] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				let live = true;
				setShots([]);
				setBroken([]);
				pluginScreenshots(plugin).then((list) => {
					if (live) setShots(list);
				});
				return () => {
					live = false;
				};
			}, [plugin]);
			const visible = shots.filter((src) => !broken.includes(src));
			if (visible.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Market_module_css_default.shots,
				children: visible.map((src, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: Market_module_css_default.shot,
					src: thumbUrl(src, 300),
					alt: "",
					loading: "lazy",
					decoding: "async",
					referrerPolicy: "no-referrer",
					onClick: () => onOpen(visible, i),
					onError: () => setBroken((prev) => prev.includes(src) ? prev : prev.concat(src))
				}, src))
			});
		}
		/**
		* Advances an index every `intervalMs` while `count > 1` — the shared clock
		* behind both a card's auto-cycling thumbnail and the lightbox. A manual
		* jump (clicking a dot, an arrow, opening on a specific shot) restarts the
		* clock instead of letting it fire again moments later: without that, a
		* deliberate "go back one" reads as broken when it auto-advances right past
		* where the user just navigated to.
		*
		* `intervalMs <= 0` disables the timer entirely (no auto-advance at all);
		* manual jumps still work. The lightbox uses this: a full-bleed image needs
		* to stay put until the viewer moves on, so it must never page itself.
		*/
		function useAutoCarousel(count, initial, intervalMs = 3500) {
			const [index, setIndexState] = (0, react.useState)(initial);
			const [resetTick, setResetTick] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				if (count <= 1 || intervalMs <= 0) return;
				const timer = setInterval(() => {
					setIndexState((i) => (i + 1) % count);
				}, intervalMs);
				return () => clearInterval(timer);
			}, [
				count,
				intervalMs,
				resetTick
			]);
			const setIndex = (i) => {
				if (count <= 0) return;
				setIndexState((i % count + count) % count);
				setResetTick((t) => t + 1);
			};
			return [index, setIndex];
		}
		/**
		* A card thumbnail (or dialog strip image) renders at well under 150px on
		* screen; the curated screenshot behind it can be a full-resolution PNG
		* several hundred KB to a few MB — GitHub's own hosts offer no resized
		* variant, so rendering the original meant downloading full-size images for
		* a strip nobody asked to see full-size. images.weserv.nl resizes
		* server-side (by decoded HEIGHT, `fit=inside` so it never crops, `we=1` so
		* it never upscales something already smaller) before the bytes reach the
		* browser. The lightbox — an explicit "show me this big" — still requests
		* the ORIGINAL directly: proxying that one too would add a hop with nothing
		* left to save, and once the thumbnail is genuinely smaller it can no longer
		* share a cache entry with the full-size open anyway.
		*/
		function thumbUrl(src, height) {
			return `https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ""))}&h=${String(height)}&fit=inside&we=1`;
		}
		/**
		* The owner's GitHub avatar, addressed so the region's proxy can serve it.
		*
		* `github.com/<owner>.png` is a redirect to the avatar host, and gh-proxy
		* does not follow it — measured from an unproxied mainland connection, that
		* URL hangs until the client gives up (60s), while naming the avatar host
		* directly through the same proxy answers in 1.07s. So a proxied region
		* addresses the destination itself.
		*
		* The redirect is left in place when there is no proxy: it is the form that
		* has always worked, and this is not the release to change it on a path
		* nobody has reported a problem with.
		*/
		function avatarUrl(owner) {
			const name = encodeURIComponent(owner);
			return githubProxyInUse() === null ? `https://github.com/${name}.png?size=96` : githubUrl(`https://avatars.githubusercontent.com/${name}?size=96`);
		}
		/**
		* True once the wrapped element has scrolled within `rootMargin` of the
		* viewport. Falls back to true immediately where IntersectionObserver is
		* unavailable (old browsers, jsdom without a stub) — a missing observer
		* should degrade to eager loading, not a permanently empty thumbnail.
		* Native `img loading="lazy"` already defers the network fetch on its own,
		* but its trigger distance isn't ours to tune, and scrolling a 400+ entry
		* catalog queues every off-screen card's request the instant the browser
		* decides to start prefetching — this hook is what lets CardShot not even
		* SET `src` until a card is actually close.
		*/
		function useNearViewport(rootMargin = "200px") {
			const [near, setNear] = (0, react.useState)(typeof IntersectionObserver === "undefined");
			const [node, setNode] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (near || node === null) return;
				const obs = new IntersectionObserver((entries) => {
					if (entries.some((entry) => entry.isIntersecting)) setNear(true);
				}, { rootMargin });
				obs.observe(node);
				return () => obs.disconnect();
			}, [
				near,
				node,
				rootMargin
			]);
			return [setNode, near];
		}
		/**
		* A card's own thumbnail strip — curated screenshots only (#61 supplement):
		* this data already rode along with the catalog fetch that drew the grid,
		* so showing it costs nothing extra. README-scraped fallback images stay
		* dialog-only, where fetching one repo's README on click is a single
		* request instead of one per visible card.
		*
		* Horizontal scroll at each image's own aspect ratio, not an auto-cycling
		* single crop: cropping every shot into one fixed box hid most of a tall
		* screenshot, and cycling on a timer meant the card you were looking at
		* kept changing under you. Scrolling is a gesture the user drives.
		*/
		/** Thumbnails per card. The dialog shows every screenshot; a grid of cards
		* pulling six full-size PNGs each is what makes the first paint crawl. */
		const CARD_SHOT_LIMIT = 3;
		function CardShot({ plugin, onOpen }) {
			const shots = safeScreenshots(plugin.screenshots);
			const [broken, setBroken] = (0, react.useState)([]);
			const visible = shots.filter((src) => !broken.includes(src)).slice(0, CARD_SHOT_LIMIT);
			const [setStripRef, near] = useNearViewport();
			if (visible.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: setStripRef,
				className: Market_module_css_default.cardShots,
				children: visible.map((src, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: Market_module_css_default.cardShot,
					src: near ? thumbUrl(src, 200) : void 0,
					alt: "",
					loading: "lazy",
					decoding: "async",
					fetchPriority: "low",
					referrerPolicy: "no-referrer",
					onClick: (e) => {
						e.stopPropagation();
						onOpen(visible, i);
					},
					onError: () => setBroken((prev) => prev.includes(src) ? prev : prev.concat(src))
				}, src))
			});
		}
		/**
		* Read dimensions through the same low-resolution, no-upscale route used by
		* card thumbnails. Large originals therefore stay off the wire, while a
		* genuinely tiny image remains tiny and can be rejected by the scorer.
		*/
		function measureThemeCandidates(candidates) {
			if (typeof Image === "undefined") return Promise.resolve([]);
			return Promise.all(candidates.map((candidate) => new Promise((resolve) => {
				const probe = new Image();
				let settled = false;
				const finish = (measurement) => {
					if (settled) return;
					settled = true;
					window.clearTimeout(timer);
					probe.onload = null;
					probe.onerror = null;
					resolve(measurement);
				};
				const timer = window.setTimeout(() => finish(null), 6e3);
				probe.onload = () => finish({
					src: candidate.src,
					width: probe.naturalWidth,
					height: probe.naturalHeight
				});
				probe.onerror = () => finish(null);
				probe.referrerPolicy = "no-referrer";
				probe.decoding = "async";
				probe.src = thumbUrl(candidate.src, 240);
			}))).then((results) => results.filter((result) => result !== null));
		}
		const measuredThemePreviewTasks = /* @__PURE__ */ new Map();
		const measuredThemePreviewResults = /* @__PURE__ */ new Map();
		/** README fetch + geometry probes, shared across search/page remounts. */
		function measuredThemePreview(plugin) {
			const cached = measuredThemePreviewTasks.get(plugin.url);
			if (cached !== void 0) return cached;
			const task = pluginScreenshotCandidates(plugin).then(async (candidates) => {
				const ranked = rankThemeScreenshots(candidates, await measureThemeCandidates(candidates));
				measuredThemePreviewResults.set(plugin.url, ranked);
				return ranked;
			}).catch(() => {
				measuredThemePreviewResults.set(plugin.url, []);
				return [];
			});
			measuredThemePreviewTasks.set(plugin.url, task);
			return task;
		}
		/**
		* Themes are chosen visually, so their catalog card gets one stable, large
		* preview instead of the generic plugin card's horizontal thumbnail strip.
		* Curated screenshots keep their declared order. A missing curated set is
		* filled lazily from README only when the card nears the viewport, then
		* ranked by both README semantics and measured image geometry.
		*/
		function ThemeCover({ plugin, onOpen, t }) {
			const curated = safeScreenshots(plugin.screenshots);
			const curatedKey = curated.join("\n");
			const cachedFallback = curated.length === 0 ? measuredThemePreviewResults.get(plugin.url) : void 0;
			const [fallback, setFallback] = (0, react.useState)({
				loading: curated.length === 0 && cachedFallback === void 0,
				shots: cachedFallback ?? []
			});
			const [broken, setBroken] = (0, react.useState)([]);
			const [setCoverRef, near] = useNearViewport();
			(0, react.useEffect)(() => {
				setBroken([]);
				if (curated.length > 0) {
					setFallback({
						loading: false,
						shots: []
					});
					return;
				}
				const cached = measuredThemePreviewResults.get(plugin.url);
				if (cached !== void 0) {
					setFallback({
						loading: false,
						shots: cached
					});
					return;
				}
				setFallback({
					loading: true,
					shots: []
				});
				if (!near) return;
				let live = true;
				measuredThemePreview(plugin).then((shots) => {
					if (live) setFallback({
						loading: false,
						shots
					});
				});
				return () => {
					live = false;
				};
			}, [
				curatedKey,
				near,
				plugin.url
			]);
			const visible = (curated.length > 0 ? curated : fallback.shots).filter((src) => !broken.includes(src));
			const name = pluginName(plugin.name);
			if (visible.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref: setCoverRef,
				type: "button",
				className: `${Market_module_css_default.themeCover} ${Market_module_css_default.themeCoverEmpty}`,
				"aria-label": `${name}: ${fallback.loading ? t("themePreviewLoading") : t("themePreviewMissing")}`,
				disabled: true,
				children: [fallback.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Market_module_css_default.spin,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 20 })
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 20 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fallback.loading ? t("themePreviewLoading") : t("themePreviewMissing") })]
			});
			const src = visible[0];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref: setCoverRef,
				type: "button",
				className: Market_module_css_default.themeCover,
				"aria-label": `${t("themePreview")} ${name}`,
				onClick: () => onOpen(visible, 0),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: near ? thumbUrl(src, 520) : void 0,
						alt: "",
						loading: "lazy",
						decoding: "async",
						fetchPriority: "low",
						referrerPolicy: "no-referrer",
						onError: () => setBroken((prev) => prev.includes(src) ? prev : prev.concat(src))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Market_module_css_default.themePreviewAction,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }), t("themePreview")]
					}),
					visible.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Market_module_css_default.themePreviewCount,
						children: t("themePreviewCount").replace("{0}", String(visible.length))
					})
				]
			});
		}
		/**
		* Masonry columns holding items in their input order.
		*
		* Items are dealt alternately (0,2,4… left; 1,3,5… right) rather than split
		* down the middle, so the sort order still reads left-to-right then down —
		* the ranking is the whole point of the sort menu above it. Each column is
		* its own flex stack, so a tall item only pushes down the items beneath IT
		* instead of leaving a hole beside its shorter neighbour.
		*
		* Below the two-up breakpoint the CSS collapses to one column, and dealing
		* alternately would then interleave the list wrongly — so at one column the
		* items stay in a single stack in their original order.
		*/
		function Masonry({ items, render, columns = 2 }) {
			if (!useMediaWide() || columns < 2) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Market_module_css_default.masonry,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Market_module_css_default.masonryCol,
					children: items.map(render)
				})
			});
			const buckets = Array.from({ length: columns }, () => []);
			items.forEach((item, index) => {
				buckets[index % columns].push(item);
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Market_module_css_default.masonry,
				children: buckets.map((bucket, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Market_module_css_default.masonryCol,
					children: bucket.map(render)
				}, index))
			});
		}
		/**
		* Whether the layout is at its two-up width. Matches the CSS breakpoint
		* exactly: the column split is decided in JS but rendered by CSS, and the
		* two disagreeing would deal cards into columns the stylesheet has already
		* stacked.
		*/
		function useMediaWide() {
			const query = "(min-width: 681px)";
			const subscribe = (0, react.useCallback)((notify) => {
				if (typeof matchMedia !== "function") return () => {};
				const list = matchMedia(query);
				list.addEventListener("change", notify);
				return () => list.removeEventListener("change", notify);
			}, []);
			return (0, react.useSyncExternalStore)(subscribe, () => typeof matchMedia === "function" ? matchMedia(query).matches : true, () => true);
		}
		/**
		* A card's description, clamped to 5 lines so one wordy entry doesn't blow
		* the two-up grid's row height out for whatever sits beside it — the grid
		* already tolerates SOME height variance by design (`.card`'s `align-self:
		* start`), just not an unbounded one. The toggle only renders when the text
		* actually overflows the clamp: a two-line description has nothing to
		* "expand", so no button beats a button that does nothing.
		*/
		function CardDesc({ text, t }) {
			const ref = (0, react.useRef)(null);
			const [expanded, setExpanded] = (0, react.useState)(false);
			const [canExpand, setCanExpand] = (0, react.useState)(false);
			(0, react.useLayoutEffect)(() => {
				const el = ref.current;
				if (el === null) return;
				setCanExpand(el.scrollHeight > el.clientHeight + 1);
			}, [text]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref,
				className: expanded ? Market_module_css_default.desc : `${Market_module_css_default.desc} ${Market_module_css_default.descClamp}`,
				children: text
			}), canExpand && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: Market_module_css_default.descToggle,
				"aria-label": expanded ? t("descCollapse") : t("descExpand"),
				onClick: () => setExpanded((e) => !e),
				children: expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 })
			})] });
		}
		/**
		* Full-bleed image preview, opened from a card thumbnail or a dialog's
		* screenshot strip. Not the shared Modal primitive: Modal is chrome for a
		* decision (title, description, footer actions); this is just the same
		* already-downloaded image shown bigger — there is no separate "thumbnail"
		* vs "full size" asset to fetch.
		*/
		function ScreenshotLightbox({ shots, startIndex, onClose, t }) {
			const [index, setIndex] = useAutoCarousel(shots.length, startIndex, 0);
			const host = useMarketPortalHost();
			(0, react.useEffect)(() => {
				const onKey = (e) => {
					if (e.key === "Escape") {
						e.stopPropagation();
						onClose();
					} else if (e.key === "ArrowLeft") {
						e.stopPropagation();
						setIndex(index - 1);
					} else if (e.key === "ArrowRight") {
						e.stopPropagation();
						setIndex(index + 1);
					}
				};
				window.addEventListener("keydown", onKey, true);
				return () => window.removeEventListener("keydown", onKey, true);
			}, [index]);
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.lightbox,
				onClick: onClose,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: Market_module_css_default.lightboxClose,
						"aria-label": t("lightboxClose"),
						onClick: onClose,
						children: "×"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: Market_module_css_default.lightboxImg,
						src: shots[index],
						alt: "",
						onClick: (e) => e.stopPropagation()
					}),
					shots.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: `${Market_module_css_default.lightboxNav} ${Market_module_css_default.lightboxPrev}`,
							"aria-label": t("lightboxPrev"),
							onClick: (e) => {
								e.stopPropagation();
								setIndex(index - 1);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, { size: 18 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: `${Market_module_css_default.lightboxNav} ${Market_module_css_default.lightboxNext}`,
							"aria-label": t("lightboxNext"),
							onClick: (e) => {
								e.stopPropagation();
								setIndex(index + 1);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { size: 18 })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.lightboxDots,
							onClick: (e) => e.stopPropagation(),
							children: shots.map((src, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: i === index ? `${Market_module_css_default.lightboxDot} ${Market_module_css_default.lightboxDotOn}` : Market_module_css_default.lightboxDot,
								onClick: () => setIndex(i)
							}, src))
						})
					] })
				]
			}), host);
		}
		/**
		* The one DOM node this package portals into, created on first use and kept
		* for the life of the page.
		*
		* Created imperatively rather than rendered, and never removed: the point is
		* that `document.body`'s child list stops being shared state between two
		* React roots. A container that came and went would put the same churn back
		* into body, just less often — and "less often" is what made this bug
		* intermittent and hard to believe in the first place.
		*
		* Re-appended on every open so it stays last among body's children. That is
		* what keeps the lightbox above the host's own portalled dialog, which is
		* why the portal exists at all; moving a node we own is not something the
		* host's root tracks, so it cannot disturb it.
		*/
		let portalHost = null;
		function marketPortalHost() {
			if (portalHost === null) {
				portalHost = document.createElement("div");
				portalHost.setAttribute("data-dsh-market-portal", "");
			}
			return portalHost;
		}
		/**
		* Move the container to the end of `document.body`, which is what keeps this
		* package's layers above the host's own portalled dialog.
		*
		* In a layout effect, NOT during render. `createPortal` needs the element
		* while rendering, but appending it does not belong there: React may start a
		* render, abandon it and start again, so a mutation in the render body runs
		* for passes that never commit — and this particular mutation reorders
		* `document.body`, the one container this package shares with the host's
		* separate React root. That is the same shared-child-list hazard #293 was
		* about, just arrived at from the other side. Committing it in an effect
		* means it happens once, after React is done, in the order React expects.
		*/
		function useMarketPortalHost() {
			const host = marketPortalHost();
			(0, react.useLayoutEffect)(() => {
				document.body.appendChild(host);
			}, [host]);
			return host;
		}
		/**
		* Official-style market glyph: the shared block-grid brand mark converted to
		* the official monochrome icon form (16×16, fill="currentColor") so it
		* follows the active theme. Mirrors the settings-nav glyph used for the
		* "market" section id.
		*/
		function MarketLogo({ size = 16, style, animated = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				style,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					fill: "currentColor",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "1.96",
							y: "3.36",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "5.71",
							y: "3.36",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "1.96",
							y: "7.11",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "5.71",
							y: "7.11",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "9.46",
							y: "7.11",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "1.96",
							y: "10.86",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "5.71",
							y: "10.86",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							x: "9.46",
							y: "10.86",
							width: "3.3",
							height: "3.3",
							rx: "0.53"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					className: animated ? Market_module_css_default.logoPlug : void 0,
					x: "10.74",
					y: "2.09",
					width: "3.3",
					height: "3.3",
					rx: "0.53",
					fill: "currentColor",
					transform: animated ? void 0 : "rotate(9 12.39 3.74)"
				})]
			});
		}
		/**
		* GitHub mark beside catalog card titles (#256, #365). Catalog intake in
		* awesome-dsh-plugin rejects any entry whose `url` is not
		* `https://github.com/owner/repo` (scripts/lib/entries.mjs), so this renders
		* unconditionally — not a bet that today's snapshot happens to be all
		* GitHub. The generic outbound arrow did not say so until hover. This rides
		* the title's own line — no second link, no extra row.
		*/
		function GithubRepoMark({ size = 12, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "currentColor",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fillRule: "evenodd",
					d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
				})
			});
		}
		/**
		* Module-scope caches so re-entering the section renders instantly instead
		* of refetching and rebuilding from a spinner (#30 by @StarsTom). Module
		* state survives section switches; a background refetch keeps it current.
		*/
		let cachedRegistry = null;
		let cachedInstalled = null;
		let cachedRepoIdentities = null;
		let cachedRepoHints = null;
		/** Discover grid page-size choices — the catalog grows daily, so cap each page. */
		const PAGE_SIZES = [
			24,
			48,
			96
		];
		const DEFAULT_PAGE_SIZE = 24;
		const WEBDAV_STORAGE_KEY = "dshm-webdav";
		function savedWebdav() {
			try {
				const value = JSON.parse(localStorage.getItem(WEBDAV_STORAGE_KEY) ?? "{}");
				return {
					url: typeof value.url === "string" ? value.url : "",
					username: typeof value.username === "string" ? value.username : "",
					password: "",
					auto: value.auto === true
				};
			} catch {
				return {
					url: "",
					username: "",
					password: "",
					auto: false
				};
			}
		}
		function backupDependencies(value) {
			if (value === null || typeof value !== "object") throw new Error("invalid backup");
			const backup = value;
			if (backup.format !== "dsh-profile-backup" || backup.version !== .2) throw new Error("unsupported backup format");
			const files = backup.files;
			if (!Array.isArray(files)) throw new Error("unsupported backup format");
			const manifest = files.find((file) => file !== null && typeof file === "object" && file.path === "package.json");
			if (manifest?.json === null || typeof manifest?.json !== "object" || Array.isArray(manifest.json)) throw new Error("backup package.json is invalid");
			const dependencies = manifest.json.dependencies;
			if (dependencies === null || typeof dependencies !== "object" || Array.isArray(dependencies)) return {};
			if (!Object.values(dependencies).every((spec) => typeof spec === "string")) throw new Error("backup dependencies are invalid");
			return dependencies;
		}
		function installedRepoIdentities(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const identities = {};
			for (const [name, ids] of Object.entries(value)) {
				if (!Array.isArray(ids)) continue;
				const strings = ids.filter((id) => typeof id === "string");
				if (strings.length > 0) identities[name] = strings;
			}
			return identities;
		}
		function installedRepoHints(value) {
			return installedRepoIdentities(value);
		}
		function installedMap(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
			const installed = {};
			for (const [name, spec] of Object.entries(value)) if (typeof spec === "string") installed[name] = spec;
			return installed;
		}
		function sameInstalledMap(left, right) {
			const names = Object.keys(left);
			return names.length === Object.keys(right).length && names.every((name) => left[name] === right[name]);
		}
		/** Sort field choices in the filter panel. */
		const SORT_FIELD_OPTIONS = [
			{
				key: "downloads",
				label: "sortDownloads"
			},
			{
				key: "stars",
				label: "sortStars"
			},
			{
				key: "added",
				label: "sortAdded"
			}
		];
		/** Sort direction choices in the filter panel (labels depend on the field). */
		const SORT_DIR_OPTIONS = ["desc", "asc"];
		/** Published-within choices in the filter panel. */
		const TIME_OPTIONS = [
			{
				key: "all",
				label: "timeAll"
			},
			{
				key: "day",
				label: "timeDay"
			},
			{
				key: "week",
				label: "timeWeek"
			},
			{
				key: "month",
				label: "timeMonth"
			},
			{
				key: "quarter",
				label: "timeQuarter"
			},
			{
				key: "year",
				label: "timeYear"
			}
		];
		function MarketSection(props) {
			const t = props.t;
			const initialWebdav = (0, react.useMemo)(savedWebdav, []);
			const localeSnap = (0, react.useSyncExternalStore)((cb) => props.locale.subscribe(cb), () => props.locale.getSnapshot());
			const lang = String(localeSnap.active).toLowerCase().startsWith("zh") ? "zh" : "en";
			const themeSnap = (0, react.useSyncExternalStore)(props.themeStore.subscribe, props.themeStore.getSnapshot);
			const [data, setData] = (0, react.useState)(cachedRegistry);
			const [loadError, setLoadError] = (0, react.useState)(null);
			const [installed, setInstalledState] = (0, react.useState)(cachedInstalled ?? {});
			const setInstalled = (0, react.useCallback)((value) => {
				cachedInstalled = value;
				setInstalledState(value);
			}, []);
			const [repoIdentities, setRepoIdentitiesState] = (0, react.useState)(cachedRepoIdentities ?? {});
			const setRepoIdentities = (0, react.useCallback)((value) => {
				cachedRepoIdentities = value;
				setRepoIdentitiesState(value);
			}, []);
			const [repoHints, setRepoHintsState] = (0, react.useState)(cachedRepoHints ?? {});
			const setRepoHints = (0, react.useCallback)((value) => {
				cachedRepoHints = value;
				setRepoHintsState(value);
			}, []);
			const [installedFiles, setInstalledFiles] = (0, react.useState)([]);
			const [skins, setSkins] = (0, react.useState)([]);
			const [tab, setTab] = (0, react.useState)(() => {
				const saved = sessionStorage.getItem("dshm-tab");
				if (saved !== null) sessionStorage.removeItem("dshm-tab");
				return saved || "discover";
			});
			const [q, setQ] = (0, react.useState)("");
			/** Per-tab searches stay independent: discover / themes / installed. */
			const [qThemes, setQThemes] = (0, react.useState)("");
			const [qInstalled, setQInstalled] = (0, react.useState)("");
			const [cat, setCat] = (0, react.useState)("all");
			(0, react.useEffect)(() => {
				const target = props.preferredSubsectionId;
				if (target === void 0) return;
				const separator = target.indexOf(":");
				const kind = separator === -1 ? target : target.slice(0, separator);
				const value = separator === -1 ? "" : target.slice(separator + 1);
				if (kind === "installed") {
					setTab("installed");
					setQInstalled(value);
				} else if (kind === "discover") {
					setTab("discover");
					setCat("all");
					setQ(value);
				}
			}, [props.preferredSubsectionId]);
			const [confirming, setConfirming] = (0, react.useState)(null);
			/** The plugin whose comment thread is open, or null. */
			const [commentsFor, setCommentsFor] = (0, react.useState)(null);
			/**
			* Every mutating operation the user started. Records outlive the card that
			* started them, so paginating or searching cannot take a pending decision
			* off screen.
			*/
			const [records, setRecords] = (0, react.useState)([]);
			const recordSeq = (0, react.useRef)(0);
			/** The synthetic install task rebuilt from dshm-pending after a remount. */
			const recoveredInstall = (0, react.useRef)(null);
			/** The synthetic task rebuilt from dshm-updating after this section remounts. */
			const recoveredUpdateRecordId = (0, react.useRef)(null);
			/** Raised by the card marker, so "查看详情" lands on the record itself. */
			const [operationsOpen, setOperationsOpen] = (0, react.useState)(false);
			const openOperations = (0, react.useCallback)(() => setOperationsOpen(true), []);
			/**
			* Two plugins can ship under one name from different authors, so a roster
			* row that shows only the package name cannot tell the user which of their
			* plugins a swap would uninstall. Resolve through the catalog for the
			* author and avatar a card would show, and fall back to the bare name for
			* anything installed outside it.
			*/
			const describePlugin = (0, react.useCallback)((name) => {
				const entry = data?.plugins.find((plugin) => plugin.npm === name || plugin.name === name);
				if (entry === void 0) return { title: name };
				return {
					title: pluginName(entry.name),
					author: entry.owner === "" ? void 0 : entry.owner,
					avatar: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OwnerAvatar, {
						name: entry.name,
						owner: entry.owner || ""
					})
				};
			}, [data]);
			/** Ids are sequential rather than random so a replayed session is stable. */
			const nextRecordId = (0, react.useCallback)(() => {
				recordSeq.current += 1;
				return `op-${String(recordSeq.current)}`;
			}, []);
			const [replacing, setReplacing] = (0, react.useState)(false);
			/** Shared by every screenshot source (card thumbnail, dialog strip). */
			const [lightbox, setLightbox] = (0, react.useState)(null);
			const openLightbox = (shots, index) => setLightbox({
				shots,
				index
			});
			const [themesFullscreen, setThemesFullscreen] = (0, react.useState)(false);
			const [busyUrl, setBusyUrl] = (0, react.useState)(null);
			/** Consecutive idle polls with a pending install that never landed (#32). */
			const idleStrikes = (0, react.useRef)(0);
			/** Same idle-strike bookkeeping for an update whose response was lost. */
			const updateIdleStrikes = (0, react.useRef)(0);
			const [doneUrls, setDoneUrls] = (0, react.useState)([]);
			const [installError, setInstallError] = (0, react.useState)(null);
			const [compatibilityNotice, setCompatibilityNotice] = (0, react.useState)(null);
			const [rollingBack, setRollingBack] = (0, react.useState)(false);
			/** Log export lifecycle for visible feedback (#84): idle → busy → done/fail. */
			const [exportState, setExportState] = (0, react.useState)("idle");
			/**
			* Programmatic log download with explicit feedback (#84) — the plain
			* `<a download>` gave no sign anything happened, and the error banner's
			* "export the log" wording pointed at text that was not clickable at all.
			* Success/failure surface as a primitives Toast (body portal, no layout
			* impact) instead of inline text.
			*/
			const doExportLog = (0, react.useCallback)(() => {
				setExportState("busy");
				fetch(api("/dsh-market/logs")).then(async (res) => {
					if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
					const serverText = await res.text();
					const browser = clientDiagnostics();
					const blob = new Blob([serverText, ...browser.length > 0 ? [
						"## browser\n",
						browser.join("\n"),
						"\n"
					] : []], { type: "text/plain;charset=utf-8" });
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = "dsh-market-log.txt";
					document.body.appendChild(anchor);
					anchor.click();
					anchor.remove();
					URL.revokeObjectURL(url);
					setExportState("done");
				}).catch(() => setExportState("fail"));
			}, []);
			/** Stable onDone for the export Toast — a fresh closure per render would
			* reset the Toast's auto-dismiss timer on every parent re-render. */
			const exportToastDone = (0, react.useCallback)(() => setExportState("idle"), []);
			const [updates, setUpdates] = (0, react.useState)({});
			/** Update reminders dismissed for this host boot. The Installed tab still
			* shows these plugins and their update actions; only proactive prompts use
			* this set. */
			const [ignoredUpdateNames, setIgnoredUpdateNames] = (0, react.useState)([]);
			const [updatingName, setUpdatingName] = (0, react.useState)(null);
			/** Update-notes dialog (#294): which row opened it, and what it resolved to. */
			const [notesFor, setNotesFor] = (0, react.useState)(null);
			const [updateNotes, setUpdateNotes] = (0, react.useState)(null);
			const [notesState, setNotesState] = (0, react.useState)("loading");
			const [staleName, setStaleName] = (0, react.useState)(null);
			const [restoreName, setRestoreName] = (0, react.useState)(null);
			/** Determinate percent parsed from pnpm's Progress line, when available. */
			const [progressPct, setProgressPct] = (0, react.useState)(null);
			/**
			* Blocked build scripts from the last install or update: enables
			* approve-and-retry (#6; updates in #69). Exactly one of `plugin`
			* (retry installs it) / `updateName` (retry re-runs the update) is set.
			*/
			const [buildsSkipped, setBuildsSkipped] = (0, react.useState)(null);
			const [updatingAll, setUpdatingAll] = (0, react.useState)(false);
			const [updatedNames, setUpdatedNames] = (0, react.useState)([]);
			const [hotUrls, setHotUrls] = (0, react.useState)([]);
			const [hotNames, setHotNames] = (0, react.useState)([]);
			const [progressLine, setProgressLine] = (0, react.useState)(null);
			/** Per-package activation states from /dsh-market/installed + operations. */
			const [activations, setActivations] = (0, react.useState)({});
			/** #60: persisted disable list + custom groups, straight from /installed. */
			const [disabledNames, setDisabledNames] = (0, react.useState)([]);
			/** The user's own note per plugin (#347): package name → text. */
			const [notes, setNotes] = (0, react.useState)({});
			/** Rows the user asked to show the AUTHOR's description on, despite a note. */
			const [showTheirs, setShowTheirs] = (0, react.useState)([]);
			/** The row whose note is being edited, and the text in the box. */
			const [notingName, setNotingName] = (0, react.useState)(null);
			const [noteDraft, setNoteDraft] = (0, react.useState)("");
			/** The disable set as of the first load; null until it arrives. */
			const loadedDisabled = (0, react.useRef)(null);
			/**
			* Patch-layer flags (port of dsh-plugin-hub): packages whose bundle rows
			* the user patch layer disables / force-enables. The UI treats them as the
			* real switch state so hand-edited cordis.patch.yml toggles are visible.
			*/
			const [patchDisabledNames, setPatchDisabledNames] = (0, react.useState)([]);
			const [groups, setGroups] = (0, react.useState)({});
			const [groupOrder, setGroupOrder] = (0, react.useState)([]);
			/** Installed-tab sub-view: flat list or groups (All-plugins was removed —
			* it duplicated the Discover tab). */
			const [installedView, setInstalledView] = (0, react.useState)("list");
			const [togglingName, setTogglingName] = (0, react.useState)(null);
			const [creatingGroup, setCreatingGroup] = (0, react.useState)(false);
			const [newGroupName, setNewGroupName] = (0, react.useState)("");
			const [renamingGroup, setRenamingGroup] = (0, react.useState)(null);
			const [renamingValue, setRenamingValue] = (0, react.useState)("");
			const [deletingGroup, setDeletingGroup] = (0, react.useState)(null);
			/** Open group picker: which group and whether it adds plugins or themes. */
			const [addPanel, setAddPanel] = (0, react.useState)(null);
			const [assignFor, setAssignFor] = (0, react.useState)(null);
			const [assignTarget, setAssignTarget] = (0, react.useState)("");
			/** Structured progress from pnpm ndjson (P1-6). */
			const [progressPhase, setProgressPhase] = (0, react.useState)(null);
			const [progressCurrent, setProgressCurrent] = (0, react.useState)(null);
			const [progressDone, setProgressDone] = (0, react.useState)(0);
			const [cancelling, setCancelling] = (0, react.useState)(false);
			/** Server-side operation lock from /dsh-market/status (#91). */
			const [hostBusy, setHostBusy] = (0, react.useState)(false);
			/**
			* The market's own version, shown beside the heading. Most bug reports
			* arrive as a photo of the screen, and without a version in frame the
			* first reply always has to ask which one it was.
			*/
			const [version, setVersion] = (0, react.useState)(null);
			/** Non-live activation results from the last operation, shown as a banner. */
			const [activationWarnings, setActivationWarnings] = (0, react.useState)([]);
			const [hostDependencyFindings, setHostDependencyFindings] = (0, react.useState)([]);
			/** Plugin name awaiting uninstall confirmation (Modal). */
			const [removeConfirm, setRemoveConfirm] = (0, react.useState)(null);
			const [removingName, setRemovingName] = (0, react.useState)(null);
			const [removedCount, setRemovedCount] = (0, react.useState)(0);
			/** Toggles whose live fiber did not follow the switch — restart to apply. */
			const [toggleRestart, setToggleRestart] = (0, react.useState)(0);
			/** Last completed toggle, shown as a toast (#299). The switch and the row
			* tag already say the new state, but both live in a row the user may have
			* scrolled past — a mis-click there goes unnoticed. The toast is fixed on
			* screen, so it is the part that actually catches an accident. */
			const [toggled, setToggled] = (0, react.useState)(null);
			const toggledDone = (0, react.useCallback)(() => setToggled(null), []);
			/**
			* Dismissal of the host-reported restart notice, keyed to the current boot
			* so it reappears after a restart that did not happen and after any new
			* change. sessionStorage, not local: closing the tab is a fresh start.
			*/
			const [restartNoticeDismissed, setRestartNoticeDismissed] = (0, react.useState)(false);
			/** Client-part plugins toggled this session — their UI needs a refresh. */
			const [refreshNames, setRefreshNames] = (0, react.useState)([]);
			const [envReady, setEnvReady] = (0, react.useState)(true);
			const [envFixing, setEnvFixing] = (0, react.useState)(false);
			const [envFailed, setEnvFailed] = (0, react.useState)(false);
			const [bootId, setBootId] = (0, react.useState)(null);
			/** One-click restart (#14 by @ysyyhhh): server capability + in-flight state. */
			const [restartEnabled, setRestartEnabled] = (0, react.useState)(false);
			/** Supervisor the host detected around itself, when it named one (#229). */
			const [supervisor, setSupervisor] = (0, react.useState)(null);
			/** Debugger latch when one-click restart must not kill the host (#447). */
			const [debuggerLatch, setDebuggerLatch] = (0, react.useState)(null);
			const [restarting, setRestarting] = (0, react.useState)(false);
			const [showTop, setShowTop] = (0, react.useState)(false);
			const [backupBusy, setBackupBusy] = (0, react.useState)(false);
			const [backupMessage, setBackupMessage] = (0, react.useState)(null);
			const [backupRestored, setBackupRestored] = (0, react.useState)(false);
			const [pendingBackup, setPendingBackup] = (0, react.useState)(null);
			const [pendingDependencies, setPendingDependencies] = (0, react.useState)({});
			const [webdavUrl, setWebdavUrl] = (0, react.useState)(initialWebdav.url);
			const [webdavUser, setWebdavUser] = (0, react.useState)(initialWebdav.username);
			const [webdavPassword, setWebdavPassword] = (0, react.useState)(initialWebdav.password);
			const [autoBackup, setAutoBackup] = (0, react.useState)(initialWebdav.auto);
			/** GitHub token — session memory only, never written to any storage. */
			const [gistToken, setGistToken] = (0, react.useState)("");
			/** Gist id — persisted across reloads (non-sensitive: the Gist itself is private). */
			const [gistId, setGistId] = (0, react.useState)(() => {
				try {
					return localStorage.getItem("dshm-gist-id") ?? "";
				} catch {
					return "";
				}
			});
			/** Export mode: 'update' PATCHes the Gist in the field, 'create' makes a new one. */
			const [gistMode, setGistMode] = (0, react.useState)(() => {
				try {
					return localStorage.getItem("dshm-gist-id") ? "update" : "create";
				} catch {
					return "create";
				}
			});
			const [gistBusy, setGistBusy] = (0, react.useState)(false);
			const [gistMessage, setGistMessage] = (0, react.useState)(null);
			const [gistOk, setGistOk] = (0, react.useState)(false);
			const [gistResult, setGistResult] = (0, react.useState)(null);
			/** Export picker: open state, selected plugin names, include-config flag. */
			const [exportOpen, setExportOpen] = (0, react.useState)(false);
			const [exportSelection, setExportSelection] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [exportIncludeConfig, setExportIncludeConfig] = (0, react.useState)(false);
			/** Export failure shown INSIDE the picker so it is never hidden behind it. */
			const [exportError, setExportError] = (0, react.useState)(null);
			/** Bundle-only plugin names from /dsh-market/installed (picker list). */
			const [installedBundles, setInstalledBundles] = (0, react.useState)([]);
			const bodyRef = (0, react.useRef)(null);
			/** Hidden file input behind the Import button (a Button can't host an <input>). */
			const fileInputRef = (0, react.useRef)(null);
			const [sortField, setSortField] = (0, react.useState)("downloads");
			const [sortDir, setSortDir] = (0, react.useState)("desc");
			const [timeRange, setTimeRange] = (0, react.useState)("all");
			const [catsOpen, setCatsOpen] = (0, react.useState)(false);
			/** Themes tab: independent from Discover's sort/time state above — a
			* search or sort choice in one tab has no business resetting the other. */
			const [themeSortField, setThemeSortField] = (0, react.useState)("downloads");
			const [themeSortDir, setThemeSortDir] = (0, react.useState)("desc");
			const [themeTimeRange, setThemeTimeRange] = (0, react.useState)("all");
			/** WebDAV provider-preset dropdown (primitives Menu). */
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			/** Install-command disclosure inside the confirm dialog. */
			const [cmdOpen, setCmdOpen] = (0, react.useState)(false);
			/** Per-row "why is it not live" disclosure (installed tab). */
			const [whyOpen, setWhyOpen] = (0, react.useState)(null);
			/** Restore-confirm dialog (replaces window.confirm). */
			const [restoreConfirmOpen, setRestoreConfirmOpen] = (0, react.useState)(false);
			/** Plugins that failed to install during a restore (replaces window.alert). */
			const [restoreErrors, setRestoreErrors] = (0, react.useState)([]);
			const [visibleCats, setVisibleCats] = (0, react.useState)(null);
			/** Same idea as `visibleCats`, but how many fit in a single row — used to
			*  shrink an expanded (2+ row) category list while the sticky header is
			*  pinned during scroll, distinct from the two-row collapsed default. */
			const [visibleCatsOneRow, setVisibleCatsOneRow] = (0, react.useState)(null);
			const catsWrapRef = (0, react.useRef)(null);
			const [catsStuck, setCatsStuck] = (0, react.useState)(false);
			const [catsSentinel, setCatsSentinel] = (0, react.useState)(null);
			const refreshInstalled = (0, react.useCallback)((force) => {
				fetch(api("/dsh-market/installed"), { cache: "no-store" }).then((res) => res.json()).then((body) => {
					setInstalled(body.installed || {});
					setRepoIdentities(installedRepoIdentities(body.repoIdentities));
					setRepoHints(installedRepoHints(body.repoHints));
					setInstalledFiles(Array.isArray(body.present) ? body.present : Object.keys(body.installed || {}));
					setSkins(body.live || []);
					if (Array.isArray(body.disabled)) {
						setDisabledNames(body.disabled);
						if (loadedDisabled.current === null) loadedDisabled.current = new Set(body.disabled);
					}
					if (body.notes !== null && typeof body.notes === "object" && !Array.isArray(body.notes)) setNotes(body.notes);
					if (Array.isArray(body.patchDisabled)) setPatchDisabledNames(body.patchDisabled);
					if (body.groups && typeof body.groups === "object") setGroups(body.groups);
					if (Array.isArray(body.groupOrder)) setGroupOrder(body.groupOrder);
					setInstalledBundles(Array.isArray(body.bundles) ? body.bundles.filter((name) => typeof name === "string") : []);
					if (body.activation && typeof body.activation === "object") setActivations(body.activation);
					const findings = body.diagnostics?.schema === "dsh-market/diagnostics/v1" && Array.isArray(body.diagnostics.findings) ? body.diagnostics.findings.filter(isHostDependencyFinding) : [];
					setHostDependencyFindings(findings);
				}).catch(() => {});
				fetch(api("/dsh-market/updates") + (force === true ? "?force=1" : ""), { cache: "no-store" }).then((res) => res.json()).then((body) => setUpdates(body.updates || {})).catch(() => {});
			}, []);
			/** Active Bundles count as installed in Discover without becoming package-manager targets. */
			const catalogInstalled = (0, react.useMemo)(() => installedForCatalog(installed, installedBundles), [installed, installedBundles]);
			(0, react.useMemo)(() => new Set(disabledNames), [disabledNames]);
			/** Effective switch state: market disable list ∪ user-patch-layer disables. */
			const effectiveDisabledSet = (0, react.useMemo)(() => /* @__PURE__ */ new Set([...disabledNames, ...patchDisabledNames]), [disabledNames, patchDisabledNames]);
			(0, react.useEffect)(() => {
				if (tab !== "themes" && themesFullscreen) setThemesFullscreen(false);
			}, [tab, themesFullscreen]);
			(0, react.useEffect)(() => {
				if (!themesFullscreen || lightbox !== null) return;
				const onKey = (event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					setThemesFullscreen(false);
				};
				window.addEventListener("keydown", onKey, true);
				return () => window.removeEventListener("keydown", onKey, true);
			}, [lightbox, themesFullscreen]);
			const loadCatalog = (0, react.useCallback)(() => {
				setLoadError(null);
				return fetch(api("/dsh-market/registry"), { cache: "no-store" }).then(async (res) => {
					const body = await res.json().catch(() => ({}));
					if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : `HTTP ${String(res.status)}`);
					return body;
				}).then((body) => {
					if (body.registry === void 0) throw new Error("the catalog response carried no data");
					cachedRegistry = body.registry;
					setData(body.registry);
					setLoadError(null);
				}).catch((error) => {
					setLoadError(error instanceof Error ? error.message : String(error));
				});
			}, []);
			(0, react.useEffect)(() => {
				loadCatalog();
				fetch(api("/dsh-market/status"), { cache: "no-store" }).then((res) => res.json()).then((status) => {
					setEnvReady(status.pnpm !== false);
					setGithubProxy(typeof status.githubProxy === "string" ? status.githubProxy : null);
					if (typeof status.boot === "string") {
						setBootId(status.boot);
						setIgnoredUpdateNames(ignoredUpdatesForBoot(status.boot));
						try {
							setRestartNoticeDismissed(sessionStorage.getItem("dshm-restart-dismissed") === status.boot);
						} catch {}
					}
					setRestartEnabled(status.restart === true);
					setSupervisor(typeof status.supervisor === "string" ? status.supervisor : null);
					setDebuggerLatch(typeof status.debugger === "string" ? status.debugger : null);
					if (typeof status.version === "string" && status.version !== "") setVersion(status.version);
				}).catch(() => {});
				refreshInstalled();
			}, [refreshInstalled, loadCatalog]);
			(0, react.useEffect)(() => {
				if (bootId === null) return;
				const saved = readSession("dshm-restart");
				if (saved === null) return;
				if (saved.boot !== bootId) {
					sessionStorage.removeItem("dshm-restart");
					return;
				}
				if (Array.isArray(saved.doneUrls) && saved.doneUrls.length > 0) setDoneUrls(saved.doneUrls);
				if (Array.isArray(saved.updated) && saved.updated.length > 0) setUpdatedNames(saved.updated);
				if (typeof saved.removed === "number" && saved.removed > 0) setRemovedCount(saved.removed);
				if (typeof saved.toggled === "number" && saved.toggled > 0) setToggleRestart(saved.toggled);
			}, [bootId]);
			(0, react.useEffect)(() => {
				if (bootId === null) return;
				if (doneUrls.length === 0 && updatedNames.length === 0 && removedCount === 0 && toggleRestart === 0) {
					sessionStorage.removeItem("dshm-restart");
					return;
				}
				sessionStorage.setItem("dshm-restart", JSON.stringify({
					boot: bootId,
					doneUrls,
					updated: updatedNames,
					removed: removedCount,
					toggled: toggleRestart
				}));
			}, [
				bootId,
				doneUrls,
				updatedNames,
				removedCount,
				toggleRestart
			]);
			const fixEnv = (0, react.useCallback)(() => {
				setEnvFixing(true);
				setEnvFailed(false);
				fetch(api("/dsh-market/setup-pnpm"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{}"
				}).then((res) => res.json()).then((body) => {
					if (body.ok) setEnvReady(true);
					else {
						setEnvFailed(true);
						if (typeof body.error === "string") setInstallError(body.error);
					}
				}).catch(() => setEnvFailed(true)).finally(() => setEnvFixing(false));
			}, []);
			(0, react.useEffect)(() => {
				const pending = readSession("dshm-pending");
				if (pending !== null && typeof pending.url === "string") {
					setBusyUrl(pending.url);
					recoveredInstall.current = {
						id: `recovered-install:${pending.url}`,
						url: pending.url,
						...typeof pending.name === "string" && pending.name !== "" ? { name: pending.name } : {}
					};
				}
				const updating = readSession("dshm-updating");
				if (updating !== null && typeof updating.name === "string" && updating.name !== "") {
					setUpdatingName(updating.name);
					const id = `recovered-update:${updating.name}`;
					recoveredUpdateRecordId.current = id;
					setRecords((list) => list.some((record) => record.kind === "update" && record.name === updating.name && record.state === "running") ? list : enqueue(list, {
						id,
						kind: "update",
						name: updating.name,
						state: "running"
					}));
				}
			}, []);
			(0, react.useEffect)(() => {
				const recovered = recoveredInstall.current;
				if (recovered === null) return;
				const name = recovered.name ?? data?.plugins.find((plugin) => plugin.url === recovered.url)?.name;
				if (name === void 0) return;
				recovered.name = name;
				setRecords((list) => list.some((record) => record.id === recovered.id) ? list : enqueue(list, {
					id: recovered.id,
					kind: "install",
					name,
					url: recovered.url,
					state: "running"
				}));
			}, [data]);
			(0, react.useEffect)(() => {
				if (busyUrl === null && updatingName === null) {
					setHostBusy(false);
					setProgressLine(null);
					setProgressPhase(null);
					setProgressCurrent(null);
					setProgressDone(0);
					setCancelling(false);
					return;
				}
				const timer = setInterval(() => {
					fetch(api("/dsh-market/status"), { cache: "no-store" }).then((res) => res.json()).then((status) => {
						setHostBusy(status.busy === true);
						setDebuggerLatch(typeof status.debugger === "string" ? status.debugger : null);
						if (status.active) {
							setCancelling(status.cancelling === true);
							if (status.phase !== null && status.phase !== void 0) {
								setProgressPhase(status.phase);
								setProgressCurrent(status.currentPackage ?? null);
								setProgressDone(status.done ?? 0);
								setProgressLine(null);
								if (typeof status.size === "number" && status.size > 0 && typeof status.downloaded === "number") setProgressPct(Math.max(4, Math.min(96, Math.round(status.downloaded / status.size * 100))));
							} else {
								setProgressLine((status.lastLine || "…") + "  (" + status.seconds + "s)");
								setProgressPhase(null);
								setProgressCurrent(null);
								setProgressDone(0);
								const m = /resolved (\d+), reused (\d+), downloaded (\d+), added (\d+)/.exec(status.lastLine || "");
								if (m !== null && Number(m[1]) > 0) {
									const done = Number(m[2]) + Number(m[3]) + Number(m[4]);
									setProgressPct(Math.max(4, Math.min(96, Math.round(done / Number(m[1]) * 100))));
								}
							}
						} else {
							setProgressLine(null);
							setProgressPct(null);
							setProgressPhase(null);
							setProgressCurrent(null);
							setProgressDone(0);
							setCancelling(false);
							const statusInstalled = installedMap(status.installed);
							if (!sameInstalledMap(installed, statusInstalled)) refreshInstalled();
							if (readSession("dshm-pending") !== null && busyUrl !== null && status.busy !== true) {
								if (data !== null && data.plugins.some((p) => p.url === busyUrl && isInstalled(p, statusInstalled, repoIdentities, data.plugins, repoHints))) {
									idleStrikes.current = 0;
									sessionStorage.removeItem("dshm-pending");
									const recovered = recoveredInstall.current;
									if (recovered !== null) {
										setRecords((list) => drop(list, recovered.id));
										recoveredInstall.current = null;
									}
									setDoneUrls((urls) => urls.includes(busyUrl) ? urls : urls.concat(busyUrl));
									setBusyUrl(null);
								} else if (++idleStrikes.current >= 2) {
									idleStrikes.current = 0;
									sessionStorage.removeItem("dshm-pending");
									const recovered = recoveredInstall.current;
									if (recovered !== null) {
										setRecords((list) => drop(list, recovered.id));
										recoveredInstall.current = null;
									}
									setBusyUrl(null);
									setInstallError(t("installFail") + " — " + t("exportLog"));
								}
							}
							if (updatingName !== null && status.busy !== true) {
								if (++updateIdleStrikes.current >= 2) {
									updateIdleStrikes.current = 0;
									sessionStorage.removeItem("dshm-updating");
									const recoveredId = recoveredUpdateRecordId.current;
									if (recoveredId !== null) {
										setRecords((list) => drop(list, recoveredId));
										recoveredUpdateRecordId.current = null;
									}
									setUpdatingName(null);
									refreshInstalled();
								}
							} else updateIdleStrikes.current = 0;
						}
					}).catch(() => {});
				}, 2e3);
				return () => clearInterval(timer);
			}, [
				busyUrl,
				updatingName,
				data,
				installed,
				repoIdentities,
				repoHints,
				refreshInstalled
			]);
			const scrollToTop = () => {
				const el = bodyRef.current;
				if (el) {
					if (typeof el.scrollTo === "function") el.scrollTo({
						top: 0,
						behavior: "smooth"
					});
					else el.scrollTop = 0;
				}
			};
			(0, react.useLayoutEffect)(() => {
				const el = bodyRef.current;
				if (el !== null) el.scrollTop = 0;
				setShowTop(false);
			}, [
				tab,
				q,
				cat,
				sortField,
				sortDir,
				timeRange,
				qThemes,
				themeSortField,
				themeSortDir,
				themeTimeRange,
				qInstalled,
				installedView
			]);
			const plugins = (0, react.useMemo)(() => data === null ? [] : visiblePlugins(data.plugins, {
				category: cat,
				query: q,
				lang,
				categories: data.categories,
				sort: `${sortField}-${sortDir}`,
				sinceDays: timeRange === "all" ? void 0 : TIME_RANGE_DAYS[timeRange]
			}), [
				data,
				q,
				cat,
				lang,
				sortField,
				sortDir,
				timeRange
			]);
			const { currentPage, totalPages, pageSize, goToPage, changePageSize } = usePagination(plugins.length, [
				q,
				cat,
				sortField,
				sortDir,
				timeRange
			], scrollToTop);
			const pagePlugins = plugins.slice((currentPage - 1) * pageSize, currentPage * pageSize);
			const themePlugins$1 = (0, react.useMemo)(() => data === null ? [] : visiblePlugins(data.plugins, {
				category: "theme",
				query: qThemes,
				lang,
				categories: data.categories,
				sort: `${themeSortField}-${themeSortDir}`,
				sinceDays: themeTimeRange === "all" ? void 0 : TIME_RANGE_DAYS[themeTimeRange]
			}), [
				data,
				qThemes,
				lang,
				themeSortField,
				themeSortDir,
				themeTimeRange
			]);
			const themePagination = usePagination(themePlugins$1.length, [
				qThemes,
				themeSortField,
				themeSortDir,
				themeTimeRange
			], scrollToTop);
			const themePagePlugins = themePlugins$1.slice((themePagination.currentPage - 1) * themePagination.pageSize, themePagination.currentPage * themePagination.pageSize);
			/** Download a host endpoint as a file — primitives Button can't be an <a download>.
			* Prefers the server's Content-Disposition filename (e.g. the timestamped
			* backup export) and falls back to the caller's name. */
			const downloadFile = (0, react.useCallback)((url, filename) => {
				fetch(url).then((res) => {
					if (!res.ok) throw new Error("HTTP " + res.status);
					const disposition = res.headers.get("content-disposition");
					if (disposition !== null) {
						const match = /filename="?([^";]+)"?/.exec(disposition);
						if (match !== null && match[1] !== void 0 && match[1] !== "") filename = match[1];
					}
					return res.blob();
				}).then((blob) => {
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = filename;
					a.click();
					setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
				}).catch((error) => setInstallError(String(error)));
			}, []);
			const doRollback = (0, react.useCallback)((rollbackId) => {
				setRollingBack(true);
				setInstallError(null);
				fetch(api("/dsh-market/rollback"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ rollbackId })
				}).then((res) => res.json().then((body) => ({
					status: res.status,
					body
				}))).then(({ status, body }) => {
					if (status === 200 && body.ok) {
						setCompatibilityNotice(null);
						refreshInstalled();
					} else setInstallError(String(body.error || body.detail || "rollback failed"));
				}).catch((error) => setInstallError(String(error))).finally(() => setRollingBack(false));
			}, [refreshInstalled]);
			const compatibilitySummary = (risks) => {
				if (risks.length === 0) return "";
				const first = risks[0];
				return `${first.plugin}: ${first.peer} ${first.range} vs ${first.resolved}`;
			};
			/** Which name now resolves from two layers, and which layers those are. */
			const shadowSummary = (entries) => {
				if (entries.length === 0) return "";
				const first = entries[0];
				const rest = entries.length > 1 ? ` (+${entries.length - 1})` : "";
				return `${first.name} — ${first.layers.join(" / ")}${rest}`;
			};
			const doInstall = (0, react.useCallback)((plugin) => {
				setBuildsSkipped(null);
				setConfirming(null);
				setInstallError(null);
				setActivationWarnings([]);
				setBusyUrl(plugin.url);
				const recordId = nextRecordId();
				setRecords((list) => enqueue(list, {
					id: recordId,
					kind: "install",
					name: plugin.name,
					url: plugin.url,
					state: "running"
				}));
				sessionStorage.setItem("dshm-pending", JSON.stringify({
					url: plugin.url,
					name: plugin.name
				}));
				fetch(api("/dsh-market/install"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ url: plugin.url })
				}).then((res) => res.json().then((body) => ({
					status: res.status,
					body
				}))).then(({ status, body }) => {
					setBusyUrl(null);
					sessionStorage.removeItem("dshm-pending");
					if (status === 200 && body.ok && body.hot && pluginCategories(plugin).includes("theme")) {
						sessionStorage.setItem("dshm-toast", JSON.stringify([plugin.name]));
						sessionStorage.setItem("dshm-tab", "themes");
						location.reload();
						return;
					}
					if (body.cancelled === true) {
						setRecords((list) => drop(list, recordId));
						refreshInstalled();
						if (body.partial === true) setInstallError(t("partialNote"));
						return;
					}
					if (status === 200 && body.ok) {
						sessionStorage.setItem("dshm-tab", "installed");
						if (body.activation && typeof body.activation === "object") {
							setActivations((prev) => ({
								...prev,
								...body.activation
							}));
							const warns = Object.entries(body.activation).filter(([, info]) => info.state !== "live" && info.state !== "missing").map(([name, info]) => ({
								name,
								info
							}));
							setActivationWarnings(warns);
						}
						if (body.hot) {
							setDoneUrls((urls) => urls.filter((url) => url !== plugin.url));
							setHotUrls((urls) => urls.includes(plugin.url) ? urls : urls.concat(plugin.url));
							setHotNames((names) => names.includes(plugin.name) ? names : names.concat(plugin.name));
						} else setDoneUrls((urls) => urls.includes(plugin.url) ? urls : urls.concat(plugin.url));
						if (body.compatibility?.code === "soft-incompatible") setCompatibilityNotice(body.compatibility);
						setRecords((list) => patch(list, recordId, body.compatibility?.code === "soft-incompatible" ? {
							state: "warned",
							reason: t("compatRiskBanner")
						} : {
							state: "done",
							needsRefresh: body.hot !== true
						}));
						refreshInstalled();
					} else {
						if (status === 409) {
							const busyReason = body.agentsBusy === true ? t("agentBusyInstall") + (Array.isArray(body.runningAgents) && body.runningAgents.length > 0 ? ` (${body.runningAgents.join(", ")})` : "") : t("busyWait");
							setRecords((list) => patch(list, recordId, {
								state: "failed",
								reason: busyReason
							}));
							setOperationsOpen(true);
							return;
						}
						if (Array.isArray(body.conflictGroups) && body.conflictGroups.length > 0) {
							setRecords((list) => patch(list, recordId, {
								state: "input",
								conflicts: body.conflictGroups
							}));
							setOperationsOpen(true);
							return;
						}
						const blocked = Array.isArray(body.ignoredBuilds) ? body.ignoredBuilds.map(String) : [];
						if (blocked.length > 0) setBuildsSkipped({
							plugin,
							names: blocked
						});
						const text = (v) => typeof v === "string" ? v : v && typeof v.text === "string" ? v.text : v == null ? "" : JSON.stringify(v);
						const orphans = Array.isArray(body.orphanBundles) ? body.orphanBundles.map(String) : [];
						const failure = text(body.error) || humanOutput([text(body.stderr), text(body.stdout)].filter(Boolean).join("\n")) || "exit " + body.exitCode;
						const staleEntry = typeof body.staleEntry === "string" ? body.staleEntry : null;
						const detail = [
							orphans.length > 0 ? `${t("orphanBundle")} ${orphans.join(", ")}` : null,
							staleEntry,
							failure
						].filter(Boolean).join("\n");
						setRecords((list) => patch(list, recordId, {
							state: "failed",
							reason: detail.trim().slice(-600),
							...blocked.length > 0 ? { blockedBuilds: blocked } : {}
						}));
						setOperationsOpen(true);
					}
				}).catch(() => {});
			}, [
				nextRecordId,
				refreshInstalled,
				t
			]);
			/**
			* Resolve a loader-id clash the only way one profile allows: uninstall the
			* plugins holding the ids, then retry the install. Sequential because each
			* route takes the host's mutation lock, so a parallel burst would 409.
			*
			* A failure part-way leaves plugins already gone. Nothing reinstalls them
			* automatically (a rollback would itself be an install that can fail), so
			* the message names them — reporting only "failed" would leave the user
			* guessing which of their plugins survived.
			*/
			const doReplace = (0, react.useCallback)(async (record, plugin) => {
				setInstallError(null);
				setReplacing(true);
				const removed = [];
				try {
					for (const group of record.conflicts ?? []) {
						const response = await fetch(api("/dsh-market/uninstall"), {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ name: group.owner })
						});
						const body = await response.json();
						if (response.status !== 200 || body.ok !== true) {
							const text = (v) => typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
							const detail = (text(body.error) || humanOutput(text(body.stderr)) || "error").trim().slice(-400);
							const reason = removed.length === 0 ? `${t("installFail")}: ${group.owner} — ${detail}` : `${t("conflictReplaceFailed")} ${removed.join(", ")} — ${detail}`;
							setRecords((list) => patch(list, record.id, {
								state: "failed",
								conflicts: void 0,
								reason
							}));
							setOperationsOpen(true);
							refreshInstalled();
							return;
						}
						removed.push(group.owner);
					}
				} finally {
					setReplacing(false);
				}
				setRecords((list) => drop(list, record.id));
				refreshInstalled();
				doInstall(plugin);
			}, [
				doInstall,
				refreshInstalled,
				t
			]);
			/**
			* Answer a clash. `keep` is not a no-op to skip: it is the user declining
			* the install, so the record retires rather than lingering as unanswered.
			*/
			const resolveConflict = (0, react.useCallback)((record, choice) => {
				if (choice === "keep") {
					setRecords((list) => patch(list, record.id, {
						state: "failed",
						conflicts: void 0,
						reason: t("conflictDeclined")
					}));
					return;
				}
				const plugin = data?.plugins.find((candidate) => candidate.url === record.url);
				if (plugin === void 0) return;
				doReplace(record, plugin);
			}, [
				data,
				doReplace,
				t
			]);
			/**
			* Restart the host and reload once the boot id changes (#14 by @ysyyhhh).
			* The 202 races the process's SIGTERM, so network errors on the initial
			* request are expected and treated as "restart under way".
			*/
			const doRestart = (0, react.useCallback)(() => {
				if (bootId === null || restarting) return;
				const previousBoot = bootId;
				setRestarting(true);
				setInstallError(null);
				const awaitNewBoot = () => {
					const deadline = Date.now() + 6e4;
					const poll = () => {
						fetch(api("/dsh-market/status"), { cache: "no-store" }).then((res) => res.json()).then((next) => {
							if (typeof next.boot === "string" && next.boot !== previousBoot) {
								location.reload();
								return;
							}
							retry();
						}).catch(retry);
					};
					const retry = () => {
						if (Date.now() > deadline) {
							setRestarting(false);
							setInstallError(t("restartTimeout"));
							return;
						}
						setTimeout(poll, 1500);
					};
					poll();
				};
				const requestRestart = (attemptsLeft) => {
					fetch(api("/dsh-market/restart"), {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: "{}"
					}).then((res) => res.json().then((body) => ({
						status: res.status,
						body
					}))).then(({ status, body }) => {
						if (status === 202 && body.ok === true) {
							awaitNewBoot();
							return;
						}
						if (status === 409 && attemptsLeft > 0) {
							setTimeout(() => requestRestart(attemptsLeft - 1), 1500);
							return;
						}
						setRestarting(false);
						setInstallError(t("restartFail") + ": " + String(body.error || "HTTP " + String(status)));
					}).catch(awaitNewBoot);
				};
				requestRestart(10);
			}, [
				bootId,
				restarting,
				t
			]);
			/** Cancel the running plugin command (#6 by @qichuang321). */
			const doCancel = (0, react.useCallback)(() => {
				fetch(api("/dsh-market/cancel"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{}"
				}).catch(() => {});
			}, []);
			const doUpdate = (0, react.useCallback)((name, force = false, restore = false) => {
				setInstallError(null);
				setActivationWarnings([]);
				setStaleName((prev) => prev === name ? null : prev);
				setRestoreName((prev) => prev === name ? null : prev);
				setUpdatingName(name);
				updateIdleStrikes.current = 0;
				sessionStorage.setItem("dshm-updating", JSON.stringify({ name }));
				const updateRecordId = nextRecordId();
				setRecords((list) => enqueue(list, {
					id: updateRecordId,
					kind: "update",
					name,
					state: "running"
				}));
				return fetch(api("/dsh-market/update"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						name,
						...force ? { force: true } : {},
						...restore ? { restore: true } : {}
					})
				}).then((res) => res.json().then((body) => ({
					status: res.status,
					body
				}))).then(({ status, body }) => {
					sessionStorage.removeItem("dshm-updating");
					setUpdatingName(null);
					if (body.cancelled === true) {
						setRecords((list) => drop(list, updateRecordId));
						refreshInstalled();
						if (body.partial === true) setInstallError(t("partialNote"));
						return;
					}
					if (status === 200 && body.ok) {
						setRecords((list) => patch(list, updateRecordId, { state: "done" }));
						setUpdatedNames((names) => names.concat(name));
						if (body.activation && typeof body.activation === "object") setActivations((prev) => ({
							...prev,
							...body.activation
						}));
						if (body.compatibility?.code === "soft-incompatible") setCompatibilityNotice(body.compatibility);
						refreshInstalled();
					} else {
						if (status === 409) {
							if (body.agentsBusy === true) {
								const running = Array.isArray(body.runningAgents) && body.runningAgents.length > 0 ? ` (${body.runningAgents.join(", ")})` : "";
								setRecords((list) => patch(list, updateRecordId, {
									state: "failed",
									reason: t("agentBusyUpdate") + running
								}));
								setInstallError(t("agentBusyUpdate") + running);
								return;
							}
							setRecords((list) => patch(list, updateRecordId, {
								state: "failed",
								reason: t("busyWait")
							}));
							setInstallError(t("busyWait"));
							return;
						}
						if (body.stale === true) setStaleName(name);
						if (Array.isArray(body.ignoredBuilds) && body.ignoredBuilds.length > 0) setBuildsSkipped({
							updateName: name,
							names: body.ignoredBuilds.map(String),
							restore
						});
						const text = (v) => typeof v === "string" ? v : v && typeof v.text === "string" ? v.text : v == null ? "" : JSON.stringify(v);
						const orphans = Array.isArray(body.orphanBundles) ? body.orphanBundles.map(String) : [];
						const failure = text(body.error) || humanOutput([text(body.stderr), text(body.stdout)].filter(Boolean).join("\n")) || "exit " + body.exitCode;
						const staleEntry = typeof body.staleEntry === "string" ? body.staleEntry : null;
						const detail = [
							orphans.length > 0 ? `${t("orphanBundle")} ${orphans.join(", ")}` : null,
							staleEntry,
							failure
						].filter(Boolean).join("\n");
						setRecords((list) => patch(list, updateRecordId, {
							state: "failed",
							reason: detail.trim().slice(-600)
						}));
						setInstallError((restore ? t("restoreFail") : t("updateFail")) + ": " + name + " — " + detail.trim().slice(-600));
					}
				}).catch(() => {});
			}, [refreshInstalled, t]);
			const askRestore = (0, react.useCallback)((name) => {
				const spec = installed[name];
				const entry = data === null || spec === void 0 ? void 0 : entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name]);
				setStaleName(null);
				if (entry === void 0) {
					setRestoreName(null);
					setInstallError(t("restoreNoCatalog"));
					return;
				}
				setRestoreName(name);
				setInstallError(t("restoreHint"));
			}, [
				data,
				installed,
				repoHints,
				repoIdentities,
				t
			]);
			/** Open the update-notes dialog and start its fetch. Lazy: the request only
			exists while a user is actually looking at one plugin's notes, and
			closing the dialog abandons the render — the server side caches the
			payload, so reopening is cheap. */
			const openNotes = (0, react.useCallback)((name, current, latest, repoUrl) => {
				setNotesFor({
					name,
					current,
					latest,
					repoUrl
				});
				setUpdateNotes(null);
				setNotesState("loading");
				fetch(`${api("/dsh-market/changelog")}?name=${encodeURIComponent(name)}`).then((res) => res.json()).then((body) => {
					setUpdateNotes(body);
					setNotesState("ready");
				}).catch(() => setNotesState("fail"));
			}, []);
			const doUseSkin = (0, react.useCallback)((name) => {
				setInstallError(null);
				fetch(api("/dsh-market/use-skin"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name })
				}).then((res) => res.json().then((body) => ({
					status: res.status,
					body
				}))).then(({ status, body }) => {
					if (status === 200 && body.ok) {
						sessionStorage.setItem("dshm-toast", JSON.stringify([name]));
						sessionStorage.setItem("dshm-toast-mode", "theme");
						sessionStorage.setItem("dshm-tab", "themes");
						location.reload();
					} else setInstallError(String(body.error || "failed"));
				}).catch((error) => setInstallError(String(error)));
			}, []);
			/**
			* Forget a pending page-refresh for a plugin that is no longer here.
			*
			* The banner counts what the page has not caught up with. Install then
			* uninstall and the page is level again — there is nothing left to load —
			* but both sets were append-only, so it kept asking for a refresh that
			* would show nothing (#340). It conflated "something needs doing" with
			* "something happened in this session".
			*/
			/** Write (or clear, when empty) this plugin's note. */
			const saveNote = (0, react.useCallback)((name, text) => {
				setNotingName(null);
				fetch(api("/dsh-market/note"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						name,
						text
					})
				}).then((res) => res.json()).then((body) => {
					if (body.ok && body.notes !== null && typeof body.notes === "object") setNotes(body.notes);
					else setInstallError(String(body.error || "note failed"));
				}).catch((error) => setInstallError(String(error)));
			}, []);
			const clearPendingRefresh = (0, react.useCallback)((name) => {
				setHotNames((names) => names.filter((entry) => entry !== name));
				setRefreshNames((names) => names.filter((entry) => entry !== name));
			}, []);
			const doUninstall = (0, react.useCallback)((name) => {
				setRemoveConfirm(null);
				setInstallError(null);
				setActivationWarnings([]);
				setRemovingName(name);
				return fetch(api("/dsh-market/uninstall"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name })
				}).then((res) => res.json().then((body) => ({
					status: res.status,
					body
				}))).then(({ status, body }) => {
					if (status === 200 && body.ok) {
						if (!body.hot) setRemovedCount((n) => n + 1);
						const neverLoadedHere = hotNames.includes(name) || refreshNames.includes(name);
						if (body.refresh === true && !neverLoadedHere) setRefreshNames((names) => names.includes(name) ? names : names.concat(name));
						else clearPendingRefresh(name);
						refreshInstalled();
					} else {
						if (body.cancelled === true) {
							refreshInstalled();
							if (body.partial === true) setInstallError(t("partialNote"));
							return;
						}
						if (body.reconciled === true) {
							if (!body.hot) setRemovedCount((n) => n + 1);
							clearPendingRefresh(name);
							refreshInstalled();
							setInstallError(t("reconciledNote"));
							return;
						}
						const text = (v) => typeof v === "string" ? v : v && typeof v.text === "string" ? v.text : v == null ? "" : JSON.stringify(v);
						setInstallError((text(body.error) || humanOutput(text(body.stderr)) || "error").trim().slice(-600));
					}
				}).catch((error) => setInstallError(String(error))).finally(() => setRemovingName(null));
			}, [
				refreshInstalled,
				hotNames,
				refreshNames
			]);
			/** Live enable/disable of one installed plugin (#60). `reload` opts the
			* card-level theme flow into a page refresh so the visual result lands
			* immediately (mirrors the use-skin reload on activate). */
			const doToggle = (0, react.useCallback)((name, enabled, reload = false) => {
				setTogglingName(name);
				setInstallError(null);
				return fetch(api("/dsh-market/toggle"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						name,
						enabled
					})
				}).then((res) => res.json().then((body) => ({
					status: res.status,
					body
				}))).then(({ status, body }) => {
					if (status === 200 && body.ok) {
						if (Array.isArray(body.disabled)) setDisabledNames(body.disabled);
						if (Array.isArray(body.live)) setSkins(body.live);
						if (body.activation && typeof body.activation === "object") setActivations((prev) => ({
							...prev,
							...body.activation
						}));
						if (body.restart === true) setToggleRestart((n) => n + 1);
						if (body.refresh === true) {
							if ((loadedDisabled.current?.has(name) ?? false) === !enabled) clearPendingRefresh(name);
							else setRefreshNames((names) => names.includes(name) ? names : names.concat(name));
						}
						if (!reload) setToggled({
							name,
							enabled
						});
						refreshInstalled();
						if (reload) {
							sessionStorage.removeItem("dshm-toast");
							sessionStorage.removeItem("dshm-toast-mode");
							sessionStorage.setItem("dshm-tab", "themes");
							location.reload();
						}
					} else {
						const text = (v) => typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
						setInstallError(text(body.reason) || text(body.error) || t("toggleFail"));
						if (body.restart === true) setToggleRestart((n) => n + 1);
						if (body.refresh === true) setRefreshNames((names) => names.includes(name) ? names : names.concat(name));
					}
				}).catch((error) => setInstallError(String(error))).finally(() => setTogglingName(null));
			}, [
				clearPendingRefresh,
				refreshInstalled,
				t
			]);
			/** Adopt the groups payload returned by POST /dsh-market/groups. */
			const setGroupPayload = (0, react.useCallback)((body) => {
				if (body.groups && typeof body.groups === "object") setGroups(body.groups);
				if (Array.isArray(body.groupOrder)) setGroupOrder(body.groupOrder);
				if (Array.isArray(body.disabled)) setDisabledNames(body.disabled);
			}, []);
			/** One POST /dsh-market/groups round trip (create/rename/delete/members/toggle). */
			const doGroupAction = (0, react.useCallback)((payload) => {
				setInstallError(null);
				return fetch(api("/dsh-market/groups"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				}).then((res) => res.json().then((body) => ({
					status: res.status,
					body
				}))).then(({ status, body }) => {
					if (status === 200 && body.ok) {
						setGroupPayload(body);
						if (Array.isArray(body.restartMembers) && body.restartMembers.length > 0) setToggleRestart((n) => n + body.restartMembers.length);
						if (Array.isArray(body.refreshMembers) && body.refreshMembers.length > 0) setRefreshNames((names) => [.../* @__PURE__ */ new Set([...names, ...body.refreshMembers])]);
						refreshInstalled();
						return true;
					}
					const text = (v) => typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
					setInstallError(text(body.error) || t("toggleFail"));
					if (Array.isArray(body.restartMembers) && body.restartMembers.length > 0) setToggleRestart((n) => n + body.restartMembers.length);
					if (Array.isArray(body.refreshMembers) && body.refreshMembers.length > 0) setRefreshNames((names) => [.../* @__PURE__ */ new Set([...names, ...body.refreshMembers])]);
					return false;
				}).catch((error) => {
					setInstallError(String(error));
					return false;
				});
			}, [
				refreshInstalled,
				setGroupPayload,
				t
			]);
			/** Approve the build scripts pnpm refused, then rerun what was blocked. */
			const approveAndRetry = (0, react.useCallback)((names, resume) => {
				fetch(api("/dsh-market/approve-builds"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ packages: names })
				}).then((res) => res.json()).then((body) => {
					if (!body.ok) setInstallError(String(body.error || "approve failed"));
					else resume();
				}).catch((error) => setInstallError(String(error)));
			}, []);
			const doGroupToggle = (0, react.useCallback)((name, enabled) => {
				return doGroupAction({
					action: "toggle",
					name,
					enabled
				});
			}, [doGroupAction]);
			const doCreateGroup = (0, react.useCallback)(() => {
				const name = newGroupName.trim();
				if (name === "") return;
				doGroupAction({
					action: "create",
					name
				}).then((ok) => {
					if (ok) {
						setCreatingGroup(false);
						setNewGroupName("");
					}
				});
			}, [doGroupAction, newGroupName]);
			const doRenameGroup = (0, react.useCallback)((name) => {
				const newName = renamingValue.trim();
				if (newName === "" || newName === name) {
					setRenamingGroup(null);
					return;
				}
				doGroupAction({
					action: "rename",
					name,
					newName
				}).then((ok) => {
					if (ok) {
						setRenamingGroup(null);
						setRenamingValue("");
					}
				});
			}, [doGroupAction, renamingValue]);
			const doDeleteGroup = (0, react.useCallback)((name) => {
				doGroupAction({
					action: "delete",
					name
				}).then((ok) => {
					if (ok) setDeletingGroup(null);
				});
			}, [doGroupAction]);
			const doAssign = (0, react.useCallback)((name) => {
				const group = assignTarget;
				if (group === "") return;
				const members = groups[group] ?? [];
				doGroupAction({
					action: "set-members",
					name: group,
					members: [...members, name]
				}).then((ok) => {
					if (ok) {
						setAssignFor(null);
						setAssignTarget("");
					}
				});
			}, [
				assignTarget,
				doGroupAction,
				groups
			]);
			const doRemoveMember = (0, react.useCallback)((group, name) => {
				const members = (groups[group] ?? []).filter((member) => member !== name);
				doGroupAction({
					action: "set-members",
					name: group,
					members
				});
			}, [doGroupAction, groups]);
			/** Add one installed plugin to a group (picker stays open for batch adds). */
			const doAddMember = (0, react.useCallback)((group, name) => {
				const members = groups[group] ?? [];
				doGroupAction({
					action: "set-members",
					name: group,
					members: [...members, name]
				});
			}, [doGroupAction, groups]);
			const selfName = installed["dshmarket"] !== void 0 ? "dshmarket" : "dsh-market";
			const updatableNames = Object.keys(installed).filter((name) => name !== selfName && !updatedNames.includes(name) && updates[name] && updates[name].updateAvailable);
			const batchUpdatableNames = updatableNames.filter((name) => updates[name]?.restoreRequired !== true);
			const ignoredUpdateSet = (0, react.useMemo)(() => new Set(ignoredUpdateNames), [ignoredUpdateNames]);
			const reminderUpdatableNames = updatableNames.filter((name) => !ignoredUpdateSet.has(name));
			const reminderBatchUpdatableNames = batchUpdatableNames.filter((name) => !ignoredUpdateSet.has(name));
			const reminderUpdateNames = [...updates[selfName]?.updateAvailable === true && !updatedNames.includes(selfName) ? [selfName] : [], ...updatableNames].filter((name) => !ignoredUpdateSet.has(name));
			const installedOtherCount = Object.keys(installed).filter((name) => name !== selfName).length;
			const ignoreUpdateNotices = (0, react.useCallback)((names) => {
				if (bootId === null || names.length === 0) return;
				setIgnoredUpdateNames((current) => {
					const next = [.../* @__PURE__ */ new Set([...current, ...names])];
					try {
						sessionStorage.setItem(IGNORED_UPDATES_SESSION_KEY, JSON.stringify({
							boot: bootId,
							names: next
						}));
					} catch {}
					return next;
				});
			}, [bootId]);
			const doUpdateAll = (0, react.useCallback)(() => {
				const names = reminderBatchUpdatableNames.slice();
				setUpdatingAll(true);
				const next = () => {
					const name = names.shift();
					if (name === void 0) {
						setUpdatingAll(false);
						return;
					}
					doUpdate(name).then(next, next);
				};
				next();
			}, [reminderBatchUpdatableNames, doUpdate]);
			const finishRestore = (0, react.useCallback)((body) => {
				const errors = Array.isArray(body.errors) ? body.errors : [];
				const unportable = Array.isArray(body.unportable) ? body.unportable : [];
				const bootErrors = Array.isArray(body.bootErrors) ? body.bootErrors.map(String) : [];
				setRestoreErrors([
					...errors.map((item) => `${String(item.name)}: ${String(item.error)}`),
					...unportable.map((item) => `${String(item.name)}: ${t("restoreUnportable")} (${String(item.spec)})`),
					...bootErrors.map((line) => `${t("restoreBootError")} ${line}`)
				]);
				setBackupRestored(true);
				setBackupMessage(t("restoreDone"));
				if (errors.length === 0) {
					setPendingBackup(null);
					setPendingDependencies({});
				}
				refreshInstalled(true);
			}, [refreshInstalled, t]);
			const previewBackup = (0, react.useCallback)((backup) => {
				const dependencies = backupDependencies(backup);
				setPendingBackup(backup);
				setPendingDependencies(dependencies);
				setBackupMessage(t("restorePreviewDone"));
				setRestoreErrors([]);
				setTab("installed");
			}, [t]);
			/** Actually run the restore; the confirm dialog gates this (previously window.confirm). */
			const doRestore = (0, react.useCallback)(() => {
				if (pendingBackup === null) return Promise.resolve();
				setRestoreConfirmOpen(false);
				setBackupBusy(true);
				setBackupMessage(null);
				setRestoreErrors([]);
				return fetch(api("/dsh-market/restore"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ backup: pendingBackup })
				}).then(async (response) => {
					const body = await response.json();
					if (!response.ok) throw new Error(String(body.error || "restore failed"));
					finishRestore(body);
				}).catch((error) => setBackupMessage(String(error))).finally(() => setBackupBusy(false));
			}, [finishRestore, pendingBackup]);
			const runWebdav = (0, react.useCallback)((action) => {
				if (webdavUrl.trim() === "") return;
				setBackupBusy(true);
				setBackupMessage(null);
				setRestoreErrors([]);
				fetch(api("/dsh-market/webdav"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action,
						url: webdavUrl.trim(),
						username: webdavUser,
						password: webdavPassword
					})
				}).then(async (response) => {
					const body = await response.json();
					if (!response.ok) throw new Error(String(body.error || "WebDAV failed"));
					if (action === "restore") previewBackup(body.backup);
					if (action === "backup") {
						try {
							localStorage.setItem("dshm-webdav-last", String(Date.now()));
						} catch {}
						setBackupMessage(t("backupDone"));
					}
				}).catch((error) => setBackupMessage(String(error))).finally(() => setBackupBusy(false));
			}, [
				previewBackup,
				t,
				webdavPassword,
				webdavUrl,
				webdavUser
			]);
			/** Map the server's token-source string to a localized label. */
			const gistSourceLabel = (source) => {
				if (source === "token") return t("gistSrcToken");
				if (source === "env") return t("gistSrcEnv");
				if (source === "gh") return t("gistSrcGh");
				return source;
			};
			/** Turn any failure (server error, network error, timeout) into a friendly message. */
			const gistErrorMessage = (error) => {
				const err = error;
				const name = typeof err?.name === "string" ? err.name : "";
				const code = typeof err?.code === "string" ? err.code : "";
				if (code === "timeout" || name === "TimeoutError" || name === "AbortError") return t("gistErrTimeout");
				if (code === "network") return t("gistErrNetwork");
				if (code === "auth") return t("gistErrAuth");
				if (code === "notfound") return t("gistErrNotFound");
				if (code === "rate-limit") return t("gistErrRateLimit");
				if (code === "invalid") return t("gistErrInvalid");
				if (error instanceof TypeError) return t("gistErrNetwork");
				return String(error);
			};
			const runGist = (0, react.useCallback)((action) => {
				setGistBusy(true);
				setGistMessage(null);
				setGistOk(false);
				setGistResult(null);
				setRestoreErrors([]);
				setExportError(null);
				const body = {
					action,
					token: gistToken.trim()
				};
				if (action === "import") body.gistId = gistId.trim();
				if (action === "export" && gistMode === "update") {
					if (gistId.trim() === "") {
						setGistBusy(false);
						setGistMessage(t("gistErrNoId"));
						setGistOk(false);
						return;
					}
					body.gistId = gistId.trim();
				}
				if (action === "export") {
					const allNames = /* @__PURE__ */ new Set([...Object.keys(installed), ...installedBundles]);
					if (!(exportSelection.size === allNames.size && exportSelection.size > 0)) {
						body.includeDeps = [...exportSelection];
						if (exportIncludeConfig) body.includeConfig = true;
					}
				}
				fetch(api("/dsh-market/gist"), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
					signal: AbortSignal.timeout(3e4)
				}).then(async (response) => {
					let body = {};
					try {
						body = await response.json();
					} catch {}
					if (!response.ok) {
						const error = new Error(String(body.error || "Gist failed"));
						if (typeof body.code === "string") error.code = body.code;
						throw error;
					}
					if (action === "export") {
						setGistResult(body);
						const ref = body;
						if (typeof ref.gistId === "string" && ref.gistId !== "") {
							setGistId(ref.gistId);
							setGistMode("update");
							try {
								localStorage.setItem("dshm-gist-id", ref.gistId);
							} catch {}
						}
						setGistMessage(t("gistExportDone"));
						setGistOk(true);
						setExportOpen(false);
					} else if (action === "import") previewBackup(body.backup);
					else {
						const source = typeof body.source === "string" ? body.source : "";
						setGistMessage(t("gistVerifySource").replace("{0}", gistSourceLabel(source)));
						setGistOk(true);
					}
				}).catch((error) => {
					const message = gistErrorMessage(error);
					setGistMessage(message);
					setGistOk(false);
					if (action === "export") setExportError(message);
				}).finally(() => setGistBusy(false));
			}, [
				exportIncludeConfig,
				exportSelection,
				gistId,
				gistToken,
				installed,
				installedBundles,
				previewBackup,
				t
			]);
			/** The picker list: dependency plugins + bundle-only plugins, deduplicated. */
			const exportOptions = (0, react.useMemo)(() => {
				return [.../* @__PURE__ */ new Set([...Object.keys(installed), ...installedBundles])].sort();
			}, [installed, installedBundles]);
			/** Classify an install spec for the export picker badge. */
			const specKind = (spec) => {
				if (spec === void 0) return "bundle";
				if (/^file:/i.test(spec)) return "file";
				if (/^(github:|git\+|git:)/i.test(spec)) return "git";
				return "npm";
			};
			const openExportPicker = (0, react.useCallback)(() => {
				const names = /* @__PURE__ */ new Set([...Object.keys(installed), ...installedBundles]);
				setExportSelection(new Set(names));
				setExportIncludeConfig(false);
				setExportOpen(true);
			}, [installed, installedBundles]);
			(0, react.useEffect)(() => {
				try {
					localStorage.setItem(WEBDAV_STORAGE_KEY, JSON.stringify({
						url: webdavUrl,
						username: webdavUser,
						auto: autoBackup
					}));
				} catch {}
				if (!autoBackup || webdavUrl.trim() === "") return;
				let last = 0;
				try {
					last = Number(localStorage.getItem("dshm-webdav-last")) || 0;
				} catch {}
				if (Date.now() - last >= 864e5) runWebdav("backup");
			}, [
				autoBackup,
				runWebdav,
				webdavUrl,
				webdavUser
			]);
			const sessionPendingRestart = doneUrls.length + updatedNames.length + removedCount + toggleRestart + (backupRestored ? 1 : 0);
			/**
			* Plugins the HOST reports as restart-pending, independent of what this
			* browser session happens to remember. Installing and then reloading the
			* page used to leave no restart affordance at all: the banner is built
			* from session state, while the Installed tab only says "activates on
			* restart" in passing — so the user was told a restart was needed and
			* given nothing to press. Dismissible, because a standing banner nobody
			* wants to act on right now is just noise (it returns next session, or
			* as soon as another change lands).
			*/
			const hostPendingNames = Object.keys(activations).filter((name) => activations[name]?.state === "restart");
			const showHostPending = hostPendingNames.length > 0 && !restartNoticeDismissed && sessionPendingRestart === 0;
			const pendingRestart = sessionPendingRestart > 0 ? sessionPendingRestart : showHostPending ? hostPendingNames.length : 0;
			const displayedInstalled = pendingBackup === null ? installed : {
				...pendingDependencies,
				...installed
			};
			const missingRestoreCount = Object.keys(pendingDependencies).filter((name) => !installedFiles.includes(name)).length;
			const hasUpdates = reminderUpdatableNames.length > 0;
			/** Live status line: structured phase, or the human-line fallback. */
			const phasePart = progressPhase != null ? phaseLabel(progressPhase, t) + (progressCurrent !== null ? " · " + progressCurrent : "") + (progressDone > 0 ? " · " + t("packagesDone").replace("{0}", String(progressDone)) : "") : progressLine || t("progressHint");
			const progressText = cancelling ? t("cancelling") + " · " + phasePart : phasePart;
			/** Whether the catalog carries ANY theme-category entry at all — distinct
			* from `themePlugins.length === 0` above (which also fires the instant a
			* search/sort/time filter matches nothing) so the two empty states read
			* differently: "there's nothing here yet" vs "nothing matches your filter". */
			const anyThemePlugins = data === null ? [] : themePlugins(data.plugins);
			/** The catalog entry a deprecated plugin's `replacement` names, if any. */
			const replacementOf = (p) => p.deprecated === true && p.replacement !== void 0 ? data?.plugins.find((r) => r.name === p.replacement) : void 0;
			const pluginCard = (p) => {
				const desc = p.description && (p.description[lang] || p.description.en) || "";
				const done = doneUrls.includes(p.url) || hotUrls.includes(p.url);
				const already = isInstalled(p, catalogInstalled, repoIdentities, data?.plugins, repoHints);
				const busy = busyUrl === p.url;
				const replacement = replacementOf(p);
				const record = recordForUrl(records, p.url);
				const blocked = record !== null && (record.state === "input" || record.state === "failed");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: blocked ? `${Market_module_css_default.card} ${Market_module_css_default.cardBlocked}` : Market_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.row1,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { minWidth: 0 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
										className: `${Market_module_css_default.nm} ${Market_module_css_default.nmLink}`,
										href: p.url,
										target: "_blank",
										rel: "noreferrer",
										title: p.name,
										"aria-label": `${p.name} — ${t("repoLink")}`,
										children: [
											pluginName(p.name),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GithubRepoMark, { className: Market_module_css_default.repoMark }),
											p.deprecated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: Market_module_css_default.depBadge,
												children: t("deprecatedBadge")
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.byline,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OwnerAvatar, {
												name: p.name,
												owner: p.owner || ""
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: Market_module_css_default.owner,
												title: p.owner,
												children: p.owner
											}),
											typeof p.downloads === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: String(p.downloads),
												side: "top",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Market_module_css_default.star,
													children: "· ↓ " + formatCount(p.downloads)
												})
											}),
											typeof p.stars === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: String(p.stars),
												side: "top",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Market_module_css_default.star,
													children: "· ★ " + formatCount(p.stars)
												})
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.cardAction,
									children: done ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.okState,
										children: t("installedBadge")
									}) : already ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.okState,
										children: t("alreadyInstalled")
									}) : busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										className: Market_module_css_default.installBtn,
										disabled: true,
										children: t("installing")
									}) : blocked ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: Market_module_css_default.cardBlockedMark,
										onClick: openOperations,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 13 }), t("opBlockedCard")]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										className: Market_module_css_default.installBtn,
										disabled: busyUrl !== null || !envReady,
										onClick: () => setConfirming(p),
										children: t("install")
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardDesc, {
							text: desc,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardShot, {
							plugin: p,
							onOpen: openLightbox
						}),
						p.deprecated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Market_module_css_default.deprecate,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.depLine,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["⚠️ ", t("deprecatedWarn")] }), replacement !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									className: Market_module_css_default.src,
									href: replacement.url,
									target: "_blank",
									rel: "noreferrer",
									children: t("replacementHint") + " " + replacement.name
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.foot,
							children: [
								pluginCategories(p).map((category) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.tag,
									children: data.categories[category] && (data.categories[category][lang] || data.categories[category].en) || category
								}, category)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: Market_module_css_default.commentsLink,
									onClick: () => setCommentsFor(p),
									children: t("comments")
								})
							]
						}),
						busy && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.progress,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.spin,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 14 })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
									className: Market_module_css_default.grow,
									children: progressText
								}),
								progressPct !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: Market_module_css_default.pct,
									children: [progressPct, "%"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									disabled: cancelling,
									onClick: doCancel,
									children: cancelling ? t("cancelling") : t("cancelOp")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.bar,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: progressPct !== null ? Market_module_css_default.barFill : `${Market_module_css_default.barFill} ${Market_module_css_default.barWave}`,
										style: progressPct !== null ? { width: `${progressPct}%` } : void 0
									})
								})
							]
						})
					]
				}, p.url);
			};
			const installedNameOf = (p) => matchInstalledName(p, installed, repoIdentities, data?.plugins, repoHints);
			const bootEntries = typeof window !== "undefined" && window.__DSH_BOOT__ && Array.isArray(window.__DSH_BOOT__.entries) ? window.__DSH_BOOT__.entries : [];
			const themePluginCard = (p) => {
				const instName = installedNameOf(p);
				const desc = p.description && (p.description[lang] || p.description.en) || "";
				const replacement = replacementOf(p);
				const done = doneUrls.includes(p.url) || hotUrls.includes(p.url);
				const busy = busyUrl === p.url;
				const record = recordForUrl(records, p.url);
				const blocked = record !== null && (record.state === "input" || record.state === "failed");
				const mounted = instName !== null && (skins.includes(instName) || bootEntries.some((e) => e.id === instName)) && !effectiveDisabledSet.has(instName);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
					className: blocked ? `${Market_module_css_default.themeCard} ${Market_module_css_default.cardBlocked}` : Market_module_css_default.themeCard,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeCover, {
						plugin: p,
						onOpen: openLightbox,
						t
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.themeCardBody,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.themeCardHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.themeIdentity,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
											className: `${Market_module_css_default.nm} ${Market_module_css_default.nmLink}`,
											href: p.url,
											target: "_blank",
											rel: "noreferrer",
											title: p.name,
											"aria-label": `${p.name} — ${t("repoLink")}`,
											children: [pluginName(p.name), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GithubRepoMark, { className: Market_module_css_default.repoMark })]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.byline,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OwnerAvatar, {
													name: p.name,
													owner: p.owner || ""
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Market_module_css_default.owner,
													title: p.owner,
													children: p.owner
												}),
												typeof p.downloads === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
													label: String(p.downloads),
													side: "top",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.star,
														children: "· ↓ " + formatCount(p.downloads)
													})
												}),
												typeof p.stars === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
													label: String(p.stars),
													side: "top",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.star,
														children: "· ★ " + formatCount(p.stars)
													})
												})
											]
										})]
									}),
									p.deprecated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.depBadge,
										children: t("deprecatedBadge")
									}),
									mounted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.themeStatus,
										children: t("themeActive")
									}),
									instName !== null && !mounted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.themeStatusMuted,
										children: effectiveDisabledSet.has(instName) ? t("disabledState") : t("alreadyInstalled")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Market_module_css_default.themeDescription,
								title: desc,
								children: desc
							}),
							p.deprecated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.deprecate,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.depLine,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["⚠️ ", t("deprecatedWarn")] }), replacement !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: Market_module_css_default.src,
										href: replacement.url,
										target: "_blank",
										rel: "noreferrer",
										children: t("replacementHint") + " " + replacement.name
									})]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.themeCardFooter,
								children: [instName === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.themeLifecycle,
									children: done ? t("installedBadge") : t("notInstalled")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.themeActions,
									children: instName === null ? done ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.okState,
										children: t("installedBadge")
									}) : busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										className: Market_module_css_default.installBtn,
										disabled: true,
										children: t("installing")
									}) : blocked ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: Market_module_css_default.cardBlockedMark,
										onClick: openOperations,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 13 }), t("opBlockedCard")]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										className: Market_module_css_default.installBtn,
										disabled: busyUrl !== null || !envReady,
										onClick: () => setConfirming(p),
										children: t("install")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [removingName === instName ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										disabled: true,
										children: t("uninstalling")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => setRemoveConfirm(instName),
										children: t("uninstall")
									}), mounted ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										disabled: togglingName !== null,
										onClick: () => doToggle(instName, false, true),
										children: t("themeDeactivate")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										onClick: () => doUseSkin(instName),
										children: t("themeApply")
									})] })
								})]
							}),
							busy && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.progress,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spin,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 14 })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: Market_module_css_default.grow,
										children: progressText
									}),
									progressPct !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.pct,
										children: [progressPct, "%"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										disabled: cancelling,
										onClick: doCancel,
										children: cancelling ? t("cancelling") : t("cancelOp")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: Market_module_css_default.bar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: progressPct !== null ? Market_module_css_default.barFill : `${Market_module_css_default.barFill} ${Market_module_css_default.barWave}`,
											style: progressPct !== null ? { width: `${progressPct}%` } : void 0
										})
									})
								]
							})
						]
					})]
				}, p.url);
			};
			const themeCard = (id, label, swatch) => {
				const active = themeSnap !== null && themeSnap.preference === id;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Market_module_css_default.card,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.swatches,
						children: swatch.map((c, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: c } }, i))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.foot,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Market_module_css_default.nm,
								children: label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
							active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Market_module_css_default.okState,
								children: t("themeActive")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								onClick: () => {
									try {
										props.theme.setTheme(id);
									} catch (error) {
										setInstallError(String(error));
									}
								},
								children: t("themeApply")
							})
						]
					})]
				}, "th-" + id);
			};
			const categories = data === null ? [] : Object.keys(data.categories);
			(0, react.useLayoutEffect)(() => {
				setVisibleCats(null);
				setVisibleCatsOneRow(null);
			}, [lang, categories.length]);
			(0, react.useLayoutEffect)(() => {
				if (catsOpen || visibleCats !== null) return;
				const el = catsWrapRef.current;
				if (el === null) return;
				const chips = [...el.children].filter((c) => c.dataset?.chip === "1");
				if (chips.length === 0) return;
				const first = chips[0];
				const rowThreeTop = first.offsetTop + (first.offsetHeight + 6) * 2 - 3;
				let fits = 0;
				for (const chip of chips) if (chip.offsetTop < rowThreeTop) fits += 1;
				setVisibleCats(fits >= chips.length ? fits : Math.max(1, fits - 1));
				const rowTwoTop = first.offsetTop + first.offsetHeight + 6 - 3;
				let fitsOneRow = 0;
				for (const chip of chips) if (chip.offsetTop < rowTwoTop) fitsOneRow += 1;
				setVisibleCatsOneRow(fitsOneRow >= chips.length ? fitsOneRow : Math.max(1, fitsOneRow - 1));
			}, [
				catsOpen,
				visibleCats,
				data
			]);
			(0, react.useEffect)(() => {
				if (catsSentinel === null || typeof IntersectionObserver === "undefined") return;
				const observer = new IntersectionObserver(([entry]) => {
					const leftView = entry !== void 0 && !entry.isIntersecting;
					const root = bodyRef.current;
					const wrap = catsWrapRef.current;
					if (leftView && root !== null && wrap !== null) {
						if (root.scrollHeight - root.clientHeight <= wrap.offsetHeight) return;
					}
					setCatsStuck(leftView);
				}, {
					root: bodyRef.current,
					threshold: 0
				});
				observer.observe(catsSentinel);
				return () => observer.disconnect();
			}, [catsSentinel]);
			/**
			* Becoming stuck auto-collapses an open row — a REAL `catsOpen` flip, not
			* a display-only override. An earlier version faked this by computing a
			* separate "effectively open" value for rendering while leaving `catsOpen`
			* itself true; the chevron's own click handler only ever toggled the real
			* `catsOpen`, so while stuck it flipped a value the render path had
			* already stopped consulting — clicking "expand" did nothing visible
			* (reported: "吸顶滚动了之后，展开没反应了"). Driving the same state the
			* chevron drives means the chevron always works, stuck or not.
			*/
			const catsAutoCollapsedRef = (0, react.useRef)(false);
			(0, react.useLayoutEffect)(() => {
				if (catsStuck) {
					if (catsOpen) {
						setCatsOpen(false);
						catsAutoCollapsedRef.current = true;
					}
				} else if (catsAutoCollapsedRef.current) {
					setCatsOpen(true);
					catsAutoCollapsedRef.current = false;
				}
			}, [catsStuck]);
			/**
			* A fresh install (hotUrls/hotNames) and a toggle/group action
			* (refreshNames) both end in the same place — "reload the page" — and
			* used to render as two near-identical banners stacked on top of each
			* other when both happened in one session (reported as "为啥有三个状态横幅
			* 啊，太奇怪了"). They're merged into one count and one banner; only the
			* restart banner (a full host restart, a different action entirely) stays
			* separate.
			*/
			const pendingRefreshNames = (0, react.useMemo)(() => [.../* @__PURE__ */ new Set([...hotNames, ...refreshNames])], [hotNames, refreshNames]);
			/** Installed plugins the market itself cannot group (#60). */
			const groupableNames = Object.keys(installed).filter((name) => name !== "dsh-market" && name !== "dshmarket");
			/** Names already inside some group; everything else shows under "ungrouped". */
			const groupedNames = (0, react.useMemo)(() => new Set(Object.values(groups).flat()), [groups]);
			const ungroupedNames = groupableNames.filter((name) => !groupedNames.has(name));
			/** Installed package names the catalog classifies as themes (client-side
			* mirror of the server's classification; themes are exclusive per group). */
			const installedThemeNames = (0, react.useMemo)(() => {
				const names = /* @__PURE__ */ new Set();
				if (data === null) return names;
				for (const [name, spec] of Object.entries(installed)) {
					const entry = entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name]);
					if (entry !== void 0 && pluginCategories(entry).includes("theme")) names.add(name);
				}
				return names;
			}, [
				data,
				installed,
				repoIdentities,
				repoHints
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Market_module_css_default.root,
				"data-dsh-market-root": true,
				"data-dsh-market-tab": tab,
				"data-dsh-market-fullscreen": tab === "themes" && themesFullscreen ? "true" : void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.titleRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarketLogo, {
										size: 22,
										style: { flexShrink: 0 }
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										className: Market_module_css_default.title,
										children: t("nav")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: Market_module_css_default.repoLink,
										href: "https://github.com/dsh-market/dsh-market",
										target: "_blank",
										rel: "noreferrer",
										title: "dsh-market · GitHub",
										children: "dsh-market"
									}),
									version !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.version,
										title: t("versionHint"),
										children: ["v", version]
									}),
									(() => {
										const self = installed["dshmarket"] !== void 0 ? "dshmarket" : "dsh-market";
										const status = updates[self];
										return status && status.updateAvailable && !updatedNames.includes(self) && !ignoredUpdateSet.has(self) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "primary",
											size: "sm",
											disabled: updatingName !== null || busyUrl !== null,
											onClick: () => {
												setTab("installed");
												if (status.restoreRequired === true) askRestore(self);
												else doUpdate(self);
											},
											children: updatingName === self ? t("updating") : status.restoreRequired === true ? t("restoreOnline") : t("marketUpdate")
										});
									})(),
									reminderBatchUpdatableNames.length >= 2 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: updatingAll || updatingName !== null || busyUrl !== null || removingName !== null,
										onClick: () => {
											setTab("installed");
											doUpdateAll();
										},
										children: updatingAll ? t("updating") : t("updateAll") + " (" + reminderBatchUpdatableNames.length + ")"
									}),
									bootId !== null && reminderUpdateNames.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onClick: () => ignoreUpdateNotices(reminderUpdateNames),
										children: t("ignoreAllUpdateNotices")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.sub,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("subtitle") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: Market_module_css_default.submitLink,
										href: "https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md",
										target: "_blank",
										rel: "noreferrer",
										children: t("submitPlugin")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										className: Market_module_css_default.exportLogBtn,
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 14 }),
										disabled: exportState === "busy",
										onClick: doExportLog,
										children: exportState === "busy" ? t("exportingLog") : t("exportLog")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.tabs,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: tab === "discover" ? `${Market_module_css_default.tab} ${Market_module_css_default.on}` : Market_module_css_default.tab,
										onClick: () => setTab("discover"),
										children: t("tabDiscover")
									}),
									themeSnap !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: tab === "themes" ? `${Market_module_css_default.tab} ${Market_module_css_default.on}` : Market_module_css_default.tab,
										onClick: () => setTab("themes"),
										children: t("tabThemes")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										className: tab === "installed" ? `${Market_module_css_default.tab} ${Market_module_css_default.on}` : Market_module_css_default.tab,
										onClick: () => {
											setTab("installed");
											refreshInstalled(true);
										},
										children: [t("tabInstalled") + (installedOtherCount > 0 ? " (" + installedOtherCount + ")" : ""), hasUpdates && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
											state: "error",
											size: 7,
											className: Market_module_css_default.dot
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: tab === "backup" || tab === "diagnostics" ? `${Market_module_css_default.tab} ${Market_module_css_default.on}` : Market_module_css_default.tab,
										onClick: () => {
											if (tab !== "backup" && tab !== "diagnostics") setTab("backup");
										},
										children: t("tabAdvanced")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OperationsPanel, {
										t,
										describe: describePlugin,
										records,
										open: operationsOpen,
										onOpenChange: setOperationsOpen,
										replacing,
										envReady,
										onClearSettled: () => setRecords((list) => clearSettled(list)),
										onCancel: () => doCancel(),
										onDismiss: (record) => setRecords((list) => drop(list, record.id)),
										onRefresh: () => location.reload(),
										onResolveConflict: resolveConflict,
										onApproveBuilds: (record) => {
											const names = record.blockedBuilds ?? [];
											if (names.length === 0) return;
											setRecords((list) => drop(list, record.id));
											const plugin = record.url === void 0 ? void 0 : data?.plugins.find((p) => p.url === record.url);
											approveAndRetry(names, () => {
												if (plugin !== void 0) doInstall(plugin);
												else doUpdate(record.name, false, false);
											});
										}
									})
								]
							}),
							(tab === "backup" || tab === "diagnostics") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.subTabs,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: tab === "backup" ? `${Market_module_css_default.tab} ${Market_module_css_default.on}` : Market_module_css_default.tab,
										onClick: () => setTab("backup"),
										children: t("tabBackup")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: tab === "diagnostics" ? `${Market_module_css_default.tab} ${Market_module_css_default.on}` : Market_module_css_default.tab,
										onClick: () => setTab("diagnostics"),
										children: t("tabDiagnostics")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow })
								]
							}),
							!envReady && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.banner,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, {
										size: 14,
										className: Market_module_css_default.bannerIcon
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.grow,
										children: envFailed ? t("envFixFail") : t("envMissing")
									}),
									!envFailed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: envFixing,
										onClick: fixEnv,
										children: envFixing ? t("envFixing") : t("envFix")
									})
								]
							}),
							backupMessage !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.backupMessage,
								children: backupMessage
							}),
							restoreErrors.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.banner,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {
									size: 14,
									className: Market_module_css_default.bannerIcon
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: Market_module_css_default.grow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("restorePartial") }) }), restoreErrors.map((error) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: Market_module_css_default.spec,
										children: error
									}, error))]
								})]
							}),
							tab === "installed" && pendingBackup !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.banner,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {
										size: 14,
										className: Market_module_css_default.bannerIcon
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.grow,
										children: t("restoreMissing").replace("{0}", String(missingRestoreCount))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: backupBusy,
										onClick: () => setRestoreConfirmOpen(true),
										children: backupBusy ? t("backupWorking") : t("restoreStart")
									})
								]
							}),
							pendingRefreshNames.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.banner,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {
										size: 14,
										className: Market_module_css_default.bannerIcon
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.grow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: pendingRefreshNames.length }),
											" ",
											t("refreshBanner")
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										onClick: () => {
											if (hotNames.length > 0) sessionStorage.setItem("dshm-toast", JSON.stringify(hotNames));
											sessionStorage.setItem("dshm-tab", "installed");
											location.reload();
										},
										children: t("refresh")
									})
								]
							}),
							pendingRestart > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.banner,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {
										size: 14,
										className: Market_module_css_default.bannerIcon
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Market_module_css_default.grow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: pendingRestart }),
											" ",
											t("restartBanner")
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: debuggerLatch !== null ? t("restartHintDebugged") : supervisor === null ? t("restartHint") : t("restartHintSupervised").replace("{0}", supervisor),
										side: "bottom",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.bannerHint,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14, { size: 14 })
										})
									}),
									restartEnabled && debuggerLatch === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: restarting || hostBusy || busyUrl !== null || updatingName !== null || removingName !== null,
										onClick: doRestart,
										children: restarting ? t("restarting") : t("restartNow")
									}),
									showHostPending && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										"aria-label": t("dismissNotice"),
										onClick: () => {
											setRestartNoticeDismissed(true);
											try {
												sessionStorage.setItem("dshm-restart-dismissed", String(bootId ?? ""));
											} catch {}
										},
										children: t("dismiss")
									})
								]
							}),
							activationWarnings.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.banner,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {
									size: 14,
									className: Market_module_css_default.bannerIcon
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.grow,
									children: activationWarnings.map(({ name, info }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: name }),
										" — ",
										activationMeta(info.state, t).label,
										info.reasons.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: Market_module_css_default.spec,
											children: [
												"（",
												info.reasons.join(" / "),
												"）"
											]
										})
									] }, name))
								})]
							}),
							tab === "installed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HostDependencyDiagnostics, {
								findings: hostDependencyFindings,
								t
							})
						]
					}),
					buildsSkipped !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.banner,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {
								size: 14,
								className: Market_module_css_default.bannerIcon
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.grow,
								children: [
									t("buildsSkipped"),
									" ",
									buildsSkipped.names.join(", ")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								disabled: busyUrl !== null,
								onClick: () => {
									const { plugin, updateName, names, restore } = buildsSkipped;
									setBuildsSkipped(null);
									approveAndRetry(names, () => {
										if (plugin !== void 0) doInstall(plugin);
										else if (updateName !== void 0) doUpdate(updateName, false, restore === true);
									});
								},
								children: t("approveBuilds")
							})
						]
					}),
					compatibilityNotice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.banner,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Market_module_css_default.grow,
								children: [
									compatibilityNotice.risks.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t(compatibilityNotice.rollbackId === void 0 ? "compatRiskBannerNoRollback" : "compatRiskBanner") }),
										" ",
										compatibilitySummary(compatibilityNotice.risks)
									] }),
									compatibilityNotice.shadowedNames !== void 0 && compatibilityNotice.shadowedNames.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										compatibilityNotice.risks.length > 0 && " · ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("shadowNameBanner") }),
										" ",
										shadowSummary(compatibilityNotice.shadowedNames)
									] }),
									compatibilityNotice.brokenBundles !== void 0 && compatibilityNotice.brokenBundles.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										(compatibilityNotice.risks.length > 0 || (compatibilityNotice.shadowedNames?.length ?? 0) > 0) && " · ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("brokenBundleBanner") }),
										" ",
										compatibilityNotice.brokenBundles.map((entry) => entry.name).join(", ")
									] })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setTab("diagnostics"),
								children: t("goDiagnose")
							}),
							compatibilityNotice.rollbackId === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: compatibilityNotice.rollbackUnavailable ?? t("rollbackUnavailable") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								disabled: rollingBack,
								onClick: () => void doRollback(compatibilityNotice.rollbackId),
								children: rollingBack ? t("rollingBack") : t("rollbackNow")
							})
						]
					}),
					installError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Market_module_css_default.err,
						children: [installError, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.staleAction,
							children: [
								staleName !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									onClick: () => doUpdate(staleName, true),
									children: t("updateNow")
								}),
								restoreName !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									onClick: () => doUpdate(restoreName, false, true),
									children: t("restoreContinue")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "outline",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 14 }),
									disabled: exportState === "busy",
									onClick: doExportLog,
									children: exportState === "busy" ? t("exportingLog") : t("exportLog")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Market_module_css_default.body,
						ref: bodyRef,
						onScroll: (e) => setShowTop(e.currentTarget.scrollTop > 400),
						children: tab === "backup" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.backupGrid,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: Market_module_css_default.backupCard,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("backupLocal") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("backupHint") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: Market_module_css_default.backupWarn,
											children: t("credsWarning")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.backupActions,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "primary",
													size: "sm",
													icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, { size: 14 }),
													disabled: backupBusy,
													onClick: () => downloadFile(api("/dsh-market/backup"), "dsh-profile-backup.json"),
													children: backupBusy ? t("backupWorking") : t("backupDownload")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "outline",
													size: "sm",
													icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, { size: 14 }),
													disabled: backupBusy,
													onClick: () => fileInputRef.current?.click(),
													children: backupBusy ? t("backupWorking") : t("backupImport")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													ref: fileInputRef,
													type: "file",
													accept: "application/json,.json",
													className: Market_module_css_default.hiddenFile,
													tabIndex: -1,
													"aria-hidden": "true",
													disabled: backupBusy,
													onChange: (event) => {
														const file = event.currentTarget.files?.[0];
														event.currentTarget.value = "";
														if (file !== void 0) file.text().then((text) => previewBackup(JSON.parse(text))).catch((error) => setBackupMessage(String(error)));
													}
												})
											]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: Market_module_css_default.backupCard,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("webdav") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
											open: presetOpen,
											onClose: () => setPresetOpen(false),
											onSelect: (id) => {
												const urls = {
													jianguoyun: "https://dav.jianguoyun.com/dav/dsh-profile-backup.json",
													koofr: "https://app.koofr.net/dav/Koofr/dsh-profile-backup.json",
													nextcloud: "https://nextcloud.example/remote.php/dav/files/USERNAME/dsh-profile-backup.json"
												};
												if (urls[id] !== void 0) setWebdavUrl(urls[id]);
											},
											align: "start",
											anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }),
												onClick: () => setPresetOpen((o) => !o),
												children: t("webdavPreset")
											}),
											items: [
												{
													id: "custom",
													label: t("webdavPreset")
												},
												{
													id: "jianguoyun",
													label: "坚果云 / Nutstore"
												},
												{
													id: "koofr",
													label: "Koofr"
												},
												{
													id: "nextcloud",
													label: "Nextcloud"
												}
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: Market_module_css_default.backupInput,
											icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline14, { size: 14 }),
											type: "url",
											value: webdavUrl,
											placeholder: t("webdavUrl"),
											onChange: (e) => setWebdavUrl(e.target.value)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: Market_module_css_default.backupInput,
											autoComplete: "username",
											value: webdavUser,
											placeholder: t("webdavUser"),
											onChange: (e) => setWebdavUser(e.target.value)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: Market_module_css_default.backupInput,
											type: "password",
											autoComplete: "current-password",
											value: webdavPassword,
											placeholder: t("webdavPassword"),
											onChange: (e) => setWebdavPassword(e.target.value)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.backupActions,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "primary",
												size: "sm",
												disabled: backupBusy || webdavUrl.trim() === "",
												onClick: () => runWebdav("backup"),
												children: backupBusy ? t("backupWorking") : t("webdavUpload")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												disabled: backupBusy || webdavUrl.trim() === "",
												onClick: () => runWebdav("restore"),
												children: t("webdavRestore")
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: Market_module_css_default.backupCheck,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: autoBackup,
												onChange: (e) => setAutoBackup(e.target.checked)
											}), t("autoBackup")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("webdavNote") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: Market_module_css_default.backupWarn,
											children: t("credsWarning")
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: Market_module_css_default.backupCard,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("gist") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: Market_module_css_default.backupInput,
											type: "password",
											autoComplete: "off",
											value: gistToken,
											placeholder: t("gistToken"),
											onChange: (e) => setGistToken(e.target.value)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: Market_module_css_default.backupInput,
											icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline14, { size: 14 }),
											value: gistId,
											placeholder: t("gistId"),
											onChange: (e) => setGistId(e.target.value)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.backupActions,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
												className: Market_module_css_default.backupCheck,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													type: "radio",
													name: "gist-mode",
													checked: gistMode === "update",
													onChange: () => setGistMode("update")
												}), t("gistModeUpdate")]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
												className: Market_module_css_default.backupCheck,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													type: "radio",
													name: "gist-mode",
													checked: gistMode === "create",
													onChange: () => setGistMode("create")
												}), t("gistModeCreate")]
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.backupActions,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "outline",
													size: "sm",
													disabled: gistBusy,
													onClick: () => runGist("verify"),
													children: gistBusy ? t("backupWorking") : t("gistVerify")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "primary",
													size: "sm",
													disabled: gistBusy || gistMode === "update" && gistId.trim() === "",
													onClick: openExportPicker,
													children: gistBusy ? t("backupWorking") : t("gistExport")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "outline",
													size: "sm",
													disabled: gistBusy || gistId.trim() === "",
													onClick: () => runGist("import"),
													children: t("gistImport")
												})
											]
										}),
										gistResult !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
											className: Market_module_css_default.backupCheck,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("gistCreated") }),
												" ",
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
													className: Market_module_css_default.src,
													href: gistResult.gistUrl,
													target: "_blank",
													rel: "noreferrer",
													children: gistResult.gistUrl
												})
											]
										}),
										gistMessage !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: gistOk ? Market_module_css_default.backupMessage : Market_module_css_default.backupWarn,
											children: gistMessage
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("gistNote") })
									]
								})
							]
						}) : tab === "discover" ? loadError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.empty,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: t("loadFail") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.err,
									children: loadError
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									className: Market_module_css_default.retryBtn,
									onClick: () => {
										loadCatalog();
									},
									children: t("loadRetry")
								})
							]
						}) : data === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Market_module_css_default.loading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Market_module_css_default.logoMark,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarketLogo, {
									size: 26,
									animated: true
								})
							}), t("loading")]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { ref: setCatsSentinel }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.stickyHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.tabSearchRow,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										className: Market_module_css_default.tabSearch,
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }),
										placeholder: t("searchPh"),
										value: q,
										onChange: (e) => setQ(e.target.value)
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.cats,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.catsRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											ref: catsWrapRef,
											className: visibleCats === null ? `${Market_module_css_default.catsWrap} ${Market_module_css_default.catsCollapsed}` : Market_module_css_default.catsWrap,
											children: (() => {
												const budget = catsStuck ? visibleCatsOneRow : visibleCats;
												const ordered = orderedCategories(categories, cat, catsOpen, budget);
												const shown = catsOpen || budget === null ? ordered : ordered.slice(0, Math.max(0, budget - 1));
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
														"data-chip": "1",
														active: cat === "all",
														onClick: () => setCat("all"),
														children: t("all") + " (" + formatCount(data.count) + ")"
													}),
													shown.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
														"data-chip": "1",
														active: cat === id,
														onClick: () => setCat(id),
														children: data.categories[id] && (data.categories[id][lang] || data.categories[id].en) || id
													}, id)),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														className: Market_module_css_default.catsToggle,
														icon: catsOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }),
														"aria-label": catsOpen ? t("catsLess") : t("catsMore"),
														onClick: () => {
															catsAutoCollapsedRef.current = false;
															setCatsOpen((o) => !o);
														}
													})
												] });
											})()
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FilterMenu, {
											sortField,
											sortDir,
											timeRange,
											onSortField: setSortField,
											onSortDir: setSortDir,
											onTimeRange: setTimeRange,
											t
										})]
									})
								})]
							}),
							plugins.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.empty,
								children: t("empty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Masonry, {
								items: pagePlugins,
								render: pluginCard
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pager, {
								currentPage,
								totalPages,
								pageSize,
								onGoToPage: goToPage,
								onChangePageSize: changePageSize,
								t
							})] })
						] }) : tab === "themes" && themeSnap !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.themeToolbar,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: Market_module_css_default.themeSearch,
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }),
									placeholder: t("searchPh"),
									value: qThemes,
									onChange: (e) => setQThemes(e.target.value)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.themeToolbarActions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FilterMenu, {
										sortField: themeSortField,
										sortDir: themeSortDir,
										timeRange: themeTimeRange,
										onSortField: setThemeSortField,
										onSortDir: setThemeSortDir,
										onTimeRange: setThemeTimeRange,
										t
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: themesFullscreen ? t("themeExitFullscreen") : t("themeFullscreen"),
										side: "top",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											className: Market_module_css_default.themeFullscreenBtn,
											icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFullscreenOutline16, { size: 16 }),
											"aria-label": themesFullscreen ? t("themeExitFullscreen") : t("themeFullscreen"),
											"aria-pressed": themesFullscreen,
											onClick: () => setThemesFullscreen((value) => !value)
										})
									})]
								})]
							}),
							(() => {
								const extra = themeSnap.themes.filter((def) => def.id !== "light" && def.id !== "dark");
								return extra.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: `${Market_module_css_default.grid} ${Market_module_css_default.themesGrid}`,
									children: extra.map((def) => themeCard(def.id, def.id, themeSwatch(def)))
								});
							})(),
							data === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.loading,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Market_module_css_default.logoMark,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarketLogo, {
										size: 26,
										animated: true
									})
								}), t("loading")]
							}) : anyThemePlugins.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.empty,
								children: t("themeEmpty")
							}) : themePlugins$1.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.empty,
								children: t("empty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.themeResultBar,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("themeResultCount").replace("{0}", String(themePlugins$1.length)) })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.themeGallery,
									children: themePagePlugins.map(themePluginCard)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pager, {
									currentPage: themePagination.currentPage,
									totalPages: themePagination.totalPages,
									pageSize: themePagination.pageSize,
									onGoToPage: themePagination.goToPage,
									onChangePageSize: themePagination.changePageSize,
									t
								})
							] })
						] }) : tab === "diagnostics" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Diagnostics, { t }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.viewBar,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: installedView === "list" ? `${Market_module_css_default.viewBtn} ${Market_module_css_default.viewOn}` : Market_module_css_default.viewBtn,
									onClick: () => setInstalledView("list"),
									children: t("tabList")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: installedView === "groups" ? `${Market_module_css_default.viewBtn} ${Market_module_css_default.viewOn}` : Market_module_css_default.viewBtn,
									onClick: () => setInstalledView("groups"),
									children: t("tabGroups")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.tabSearchRow,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: Market_module_css_default.tabSearch,
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }),
									placeholder: t("searchPh"),
									value: qInstalled,
									onChange: (e) => setQInstalled(e.target.value)
								})
							}),
							installedView === "groups" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.groupCreate,
									children: creatingGroup ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											className: Market_module_css_default.inlineInput,
											placeholder: t("groupNamePh"),
											value: newGroupName,
											onChange: (e) => setNewGroupName(e.target.value),
											onKeyDown: (e) => {
												if (e.key === "Enter") doCreateGroup();
											},
											autoFocus: true
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "primary",
											size: "sm",
											onClick: doCreateGroup,
											children: t("groupCreate")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											onClick: () => {
												setCreatingGroup(false);
												setNewGroupName("");
											},
											children: t("cancel")
										})
									] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										onClick: () => setCreatingGroup(true),
										children: t("groupNew")
									})
								}),
								groupOrder.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.empty,
									children: t("noGroups")
								}) : groupOrder.map((gid) => {
									const members = groups[gid] ?? [];
									const sw = groupSwitchState(members, effectiveDisabledSet);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.groupRow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: Market_module_css_default.groupHead,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														role: "switch",
														"aria-checked": sw === "on" ? true : sw === "off" ? false : "mixed",
														"aria-label": (sw !== "on" ? t("enable") : t("disable")) + " " + gid,
														className: sw === "on" ? `${Market_module_css_default.switch} ${Market_module_css_default.switchOn}` : sw === "mixed" ? `${Market_module_css_default.switch} ${Market_module_css_default.switchMixed}` : Market_module_css_default.switch,
														disabled: togglingName !== null || sw === "empty",
														onClick: () => doGroupToggle(gid, sw !== "on"),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.switchKnob })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.groupName,
														children: gid
													}),
													sw === "mixed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.groupHint,
														children: t("groupMixed")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: Market_module_css_default.groupActions,
														children: [
															renamingGroup === gid ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
																	className: Market_module_css_default.inlineInput,
																	placeholder: t("groupNamePh"),
																	value: renamingValue,
																	onChange: (e) => setRenamingValue(e.target.value),
																	onKeyDown: (e) => {
																		if (e.key === "Enter") doRenameGroup(gid);
																	},
																	autoFocus: true
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																	variant: "primary",
																	size: "sm",
																	onClick: () => doRenameGroup(gid),
																	children: t("groupRename")
																}),
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																	variant: "ghost",
																	size: "sm",
																	onClick: () => {
																		setRenamingGroup(null);
																		setRenamingValue("");
																	},
																	children: t("cancel")
																})
															] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																variant: "ghost",
																size: "sm",
																onClick: () => {
																	setRenamingGroup(gid);
																	setRenamingValue(gid);
																},
																children: t("groupRename")
															}),
															deletingGroup === gid ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																variant: "primary",
																size: "sm",
																className: Market_module_css_default.dangerArmed,
																onClick: () => doDeleteGroup(gid),
																children: t("groupConfirmDelete")
															}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																variant: "outline",
																size: "sm",
																className: Market_module_css_default.dangerBtn,
																onClick: () => setDeletingGroup(gid),
																children: t("groupDelete")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																variant: "outline",
																size: "sm",
																onClick: () => setAddPanel(addPanel !== null && addPanel.group === gid && addPanel.kind === "plugin" ? null : {
																	group: gid,
																	kind: "plugin"
																}),
																children: t("groupAdd")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																variant: "outline",
																size: "sm",
																disabled: members.some((member) => installedThemeNames.has(member)),
																onClick: () => setAddPanel(addPanel !== null && addPanel.group === gid && addPanel.kind === "theme" ? null : {
																	group: gid,
																	kind: "theme"
																}),
																children: t("groupAddTheme")
															})
														]
													})
												]
											}),
											addPanel !== null && addPanel.group === gid && (() => {
												const candidates = addPanel.kind === "theme" ? [...installedThemeNames].filter((name) => !members.includes(name)) : groupableNames.filter((name) => !members.includes(name) && !installedThemeNames.has(name));
												return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: Market_module_css_default.groupAddPanel,
													children: candidates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
														className: Market_module_css_default.groupHint,
														children: t("groupAddEmpty")
													}) : candidates.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: Market_module_css_default.groupMember,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: Market_module_css_default.nm,
																children: name
															}),
															effectiveDisabledSet.has(name) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: Market_module_css_default.spec,
																children: t("disabledState")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
																variant: "outline",
																size: "sm",
																onClick: () => doAddMember(gid, name),
																children: addPanel.kind === "theme" ? t("groupAddTheme") : t("groupAdd")
															})
														]
													}, name))
												});
											})(),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: Market_module_css_default.groupMembers,
												children: [members.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: Market_module_css_default.groupHint,
													children: t("groupEmpty")
												}), members.map((member) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: Market_module_css_default.groupMember,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: Market_module_css_default.nm,
															children: member
														}),
														effectiveDisabledSet.has(member) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: Market_module_css_default.spec,
															children: t("disabledState")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															role: "switch",
															"aria-checked": !effectiveDisabledSet.has(member),
															"aria-label": (effectiveDisabledSet.has(member) ? t("enable") : t("disable")) + " " + member,
															className: effectiveDisabledSet.has(member) ? Market_module_css_default.switch : `${Market_module_css_default.switch} ${Market_module_css_default.switchOn}`,
															disabled: togglingName !== null,
															onClick: () => doToggle(member, effectiveDisabledSet.has(member)),
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.switchKnob })
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
															variant: "ghost",
															size: "sm",
															onClick: () => doRemoveMember(gid, member),
															children: t("groupRemove")
														})
													]
												}, member))]
											})
										]
									}, gid);
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.sect,
									children: t("ungrouped")
								}),
								ungroupedNames.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.empty,
									children: t("installedEmpty")
								}) : ungroupedNames.map((name) => {
									const entry = data === null ? void 0 : entryForDep(data.plugins, name, String(installed[name]), repoIdentities[name], repoHints[name]);
									const off = effectiveDisabledSet.has(name);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.irow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: { minWidth: 0 },
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: Market_module_css_default.nm,
													children: [name, entry?.deprecated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.depBadge,
														children: t("deprecatedBadge")
													})]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: Market_module_css_default.act,
													children: off ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: Market_module_css_default.actWarn,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
															state: "warning",
															size: 7
														}), t("disabledState")]
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: Market_module_css_default.actLive,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
															state: "done",
															size: 7
														}), t("stateLive")]
													})
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
											assignFor === name ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: Market_module_css_default.assignRow,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
														className: Market_module_css_default.assignSelect,
														value: assignTarget,
														onChange: (e) => setAssignTarget(e.target.value),
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
															value: "",
															children: t("groupNamePh")
														}), groupOrder.map((gid) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
															value: gid,
															children: gid
														}, gid))]
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "primary",
														size: "sm",
														disabled: assignTarget === "",
														onClick: () => doAssign(name),
														children: t("groupAssign")
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "ghost",
														size: "sm",
														onClick: () => {
															setAssignFor(null);
															setAssignTarget("");
														},
														children: t("cancel")
													})
												]
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "outline",
												size: "sm",
												disabled: groupOrder.length === 0,
												onClick: () => {
													setAssignFor(name);
													setAssignTarget("");
												},
												children: t("groupAssign")
											})
										]
									}, "ug-" + name);
								})
							] }) : Object.keys(displayedInstalled).filter((name) => name !== selfName).length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.empty,
								children: t("installedEmpty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Masonry, {
								items: Object.entries(displayedInstalled).filter(([name, spec]) => {
									if (name === selfName) return false;
									const needle = qInstalled.trim().toLowerCase();
									if (needle === "") return true;
									if (name.toLowerCase().includes(needle)) return true;
									if (String(spec).toLowerCase().includes(needle)) return true;
									const entry = data === null ? void 0 : entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name]);
									if (entry !== void 0) {
										if ((entry.description && (entry.description[lang] || entry.description.en) || "").toLowerCase().includes(needle)) return true;
										if ((entry.owner || "").toLowerCase().includes(needle)) return true;
									}
									return false;
								}),
								render: ([name, spec]) => {
									const missing = pendingBackup !== null && !installedFiles.includes(name);
									const entry = data === null ? void 0 : entryForDep(data.plugins, name, String(spec), repoIdentities[name], repoHints[name]);
									const status = updates[name];
									const localDev = /^(?:link|file):/i.test(String(spec)) || status?.kind === "linked";
									const act = activations[name];
									const meta = act !== void 0 ? activationMeta(act.state, t) : null;
									const version = status && status.version ? "v" + status.version : "";
									const specText = String(spec);
									const specRedundant = version !== "" && /^[\^~]?\d/.test(specText);
									const ghSpec = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:#|$)/.exec(specText);
									const repoUrl = entry !== void 0 ? entry.url : ghSpec !== null ? "https://github.com/" + ghSpec[1] : null;
									const off = effectiveDisabledSet.has(name);
									const toggleable = off || act !== void 0 && (act.state === "live" || act.state === "restart");
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: missing ? `${Market_module_css_default.irow} ${Market_module_css_default.irowMissing}` : Market_module_css_default.irow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: { minWidth: 0 },
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: `${Market_module_css_default.nm} ${Market_module_css_default.irowName}`,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: Market_module_css_default.irowNameText,
															children: repoUrl !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
																className: Market_module_css_default.nameLink,
																href: repoUrl + "#readme",
																target: "_blank",
																rel: "noreferrer",
																title: name,
																"aria-label": `${name} — ${t("readme")}`,
																children: name
															}) : name
														}),
														entry?.deprecated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: Market_module_css_default.depBadge,
															children: t("deprecatedBadge")
														}),
														version && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: Market_module_css_default.owner,
															title: version,
															children: version
														})
													]
												}),
												specRedundant ? null : repoUrl !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
													className: `${Market_module_css_default.spec} ${Market_module_css_default.src}`,
													href: repoUrl,
													target: "_blank",
													rel: "noreferrer",
													style: { display: "inline-block" },
													children: specText
												}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: Market_module_css_default.spec,
													children: specText
												}),
												notingName === name ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: Market_module_css_default.noteEdit,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
															className: Market_module_css_default.noteInput,
															value: noteDraft,
															maxLength: 200,
															autoFocus: true,
															placeholder: t("notePlaceholder"),
															onChange: (e) => setNoteDraft(e.target.value),
															onKeyDown: (e) => {
																if (e.key === "Enter") saveNote(name, noteDraft);
																if (e.key === "Escape") setNotingName(null);
															}
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
															variant: "outline",
															size: "sm",
															onClick: () => saveNote(name, noteDraft),
															children: t("noteSave")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
															variant: "ghost",
															size: "sm",
															onClick: () => setNotingName(null),
															children: t("cancel")
														})
													]
												}) : (() => {
													const note = notes[name];
													const authored = entry?.description && (entry.description[lang] || entry.description.en) || "";
													const theirs = showTheirs.includes(name);
													const shown = note !== void 0 && !theirs ? note : authored;
													if (shown === "" && note === void 0) return null;
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: `${Market_module_css_default.desc} ${Market_module_css_default.descTight} ${Market_module_css_default.noteRow}`,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: note !== void 0 && !theirs ? Market_module_css_default.noteMine : void 0,
																children: shown
															}),
															note !== void 0 && authored !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: Market_module_css_default.noteToggle,
																title: theirs ? t("noteSeeMine") : t("noteSeeTheirs"),
																"aria-label": theirs ? t("noteSeeMine") : t("noteSeeTheirs"),
																onClick: () => setShowTheirs((list) => theirs ? list.filter((n) => n !== name) : list.concat(name)),
																children: theirs ? t("noteMine") : t("noteTheirs")
															}),
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																type: "button",
																className: `${Market_module_css_default.noteToggle} ${Market_module_css_default.noteAction}`,
																title: note === void 0 ? t("noteAdd") : t("noteEdit"),
																"aria-label": note === void 0 ? t("noteAdd") : t("noteEdit"),
																onClick: () => {
																	setNoteDraft(note ?? "");
																	setNotingName(name);
																},
																children: note === void 0 ? t("noteAdd") : t("noteEdit")
															})
														]
													});
												})(),
												status !== void 0 && status.updateAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: Market_module_css_default.noteRow,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: Market_module_css_default.notesLink,
														onClick: () => openNotes(name, status.current ?? null, status.latest ?? null, repoUrl),
														children: `▸ ${t("notesLink")}`
													}), bootId !== null && (ignoredUpdateSet.has(name) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.metaInline,
														children: t("updateNoticeIgnored")
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: Market_module_css_default.noteToggle,
														"aria-label": `${t("ignoreUpdateNotice")} ${name}`,
														onClick: () => ignoreUpdateNotices([name]),
														children: t("ignoreUpdateNotice")
													}))]
												}),
												!off && act !== void 0 && meta !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: Market_module_css_default.act,
													children: [meta.dot !== "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: meta.dot === "error" ? Market_module_css_default.actBroken : Market_module_css_default.actWarn,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
															state: meta.dot,
															size: 7
														}), meta.label]
													}), act.state !== "live" && act.reasons.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
														icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14, { size: 14 }),
														title: t("actWhy"),
														open: whyOpen === name,
														expandable: true,
														expandOnRowClick: true,
														onToggle: () => setWhyOpen(whyOpen === name ? null : name),
														className: Market_module_css_default.actWhy,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: Market_module_css_default.spec,
															children: act.reasons.join(" / ")
														})
													})]
												}),
												entry !== void 0 && entry.deprecated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: Market_module_css_default.deprecate,
													style: { marginTop: 8 },
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: Market_module_css_default.depLine,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["⚠️ ", t("deprecatedWarn")] }), entry.replacement !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: Market_module_css_default.src,
															children: t("replacementHint") + " " + entry.replacement
														})]
													})
												}),
												updatingName === name && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: Market_module_css_default.progress,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: Market_module_css_default.spin,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 14 })
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
															className: Market_module_css_default.grow,
															children: progressText
														}),
														progressPct !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: Market_module_css_default.pct,
															children: [progressPct, "%"]
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
															variant: "outline",
															size: "sm",
															disabled: cancelling,
															onClick: doCancel,
															children: cancelling ? t("cancelling") : t("cancelOp")
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
															className: Market_module_css_default.bar,
															children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
																className: progressPct !== null ? Market_module_css_default.barFill : `${Market_module_css_default.barFill} ${Market_module_css_default.barWave}`,
																style: progressPct !== null ? { width: `${progressPct}%` } : void 0
															})
														})
													]
												})
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: Market_module_css_default.irowActions,
											children: [
												!missing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: Market_module_css_default.stateTag,
													"data-on": off ? "false" : "true",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.stateDot,
														"data-on": off ? "false" : "true"
													}), off ? t("disabledState") : t("switchOnLabel")]
												}),
												toggleable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													role: "switch",
													"aria-checked": !off,
													"aria-label": (off ? t("enable") : t("disable")) + " " + name,
													className: off ? Market_module_css_default.switch : `${Market_module_css_default.switch} ${Market_module_css_default.switchOn}`,
													disabled: togglingName !== null || busyUrl !== null || updatingName !== null || removingName !== null,
													onClick: () => doToggle(name, off),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.switchKnob })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
												entry !== void 0 && entry.deprecated === true && entry.replacement !== void 0 && (() => {
													const replacement = data?.plugins.find((r) => r.name === entry.replacement);
													if (replacement === void 0) return null;
													return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														size: "sm",
														onClick: () => {
															setCat("all");
															setQ(entry.replacement);
															setTab("discover");
														},
														children: t("viewReplacement")
													}), !isInstalled(replacement, catalogInstalled, repoIdentities, data?.plugins, repoHints) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														size: "sm",
														onClick: () => setConfirming(replacement),
														children: t("installReplacement")
													})] });
												})(),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: Market_module_css_default.irowTrailing,
													children: [missing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.metaTag,
														children: t("notInstalled")
													}) : updatedNames.includes(name) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: `${Market_module_css_default.metaTag} ${Market_module_css_default.metaTagOk}`,
														children: act?.state === "live" ? t("updatedLive") : t("updated")
													}) : updatingName === name ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "primary",
														size: "sm",
														className: Market_module_css_default.warnBtn,
														disabled: true,
														children: t("updating")
													}) : status && status.updateAvailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "primary",
														size: "sm",
														className: Market_module_css_default.warnBtn,
														disabled: updatingName !== null,
														onClick: () => {
															if (status.restoreRequired === true) askRestore(name);
															else doUpdate(name);
														},
														children: status.restoreRequired === true ? t("restoreOnline") : t("update")
													}) : localDev ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.metaTag,
														title: t("linkedDev"),
														children: t("linkedDev")
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: Market_module_css_default.metaTag,
														title: t("upToDate"),
														children: t("upToDate")
													}), !missing && name !== "dsh-market" && name !== "dshmarket" && (removingName === name ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														size: "sm",
														className: Market_module_css_default.dangerBtn,
														disabled: true,
														children: t("uninstalling")
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [localDev && status?.restoreRequired !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														size: "sm",
														disabled: removingName !== null || busyUrl !== null || updatingName !== null,
														onClick: () => askRestore(name),
														children: t("restore")
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
														variant: "outline",
														size: "sm",
														className: Market_module_css_default.dangerBtn,
														disabled: removingName !== null || busyUrl !== null || updatingName !== null,
														onClick: () => setRemoveConfirm(name),
														children: t("uninstall")
													})] }))]
												})
											]
										})]
									}, name);
								}
							})
						] })
					}),
					showTop && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
						label: t("backTop"),
						side: "top",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Market_module_css_default.top,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								className: Market_module_css_default.topBtn,
								"aria-label": t("backTop"),
								onClick: () => {
									const el = bodyRef.current;
									if (el) el.scrollTo({
										top: 0,
										behavior: "smooth"
									});
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, { size: 16 })
							})
						})
					}),
					confirming !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setConfirming(null);
							setCmdOpen(false);
						},
						title: t("confirmTitle") + " " + confirming.name + "?",
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: () => {
								setConfirming(null);
								setCmdOpen(false);
							},
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							onClick: () => doInstall(confirming),
							children: t("confirmInstall")
						})] }),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.byline,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OwnerAvatar, {
										name: confirming.name,
										owner: confirming.owner || ""
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.owner,
										title: confirming.owner,
										children: confirming.owner
									}),
									typeof confirming.downloads === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: String(confirming.downloads),
										side: "top",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.star,
											children: "· ↓ " + formatCount(confirming.downloads)
										})
									}),
									typeof confirming.stars === "number" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: String(confirming.stars),
										side: "top",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.star,
											children: "· ★ " + formatCount(confirming.stars)
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Market_module_css_default.grow }),
									pluginCategories(confirming).map((category) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.tag,
										children: data.categories[category] && (data.categories[category][lang] || data.categories[category].en) || category
									}, category))
								]
							}),
							confirming.added && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.metaInline,
								children: t("published") + " " + confirming.added
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardDesc, {
								text: confirming.description && (confirming.description[lang] || confirming.description.en) || "",
								t
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScreenshotStrip, {
								plugin: confirming,
								onOpen: openLightbox
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, { size: 16 }),
								title: t("cmdDetails"),
								open: cmdOpen,
								expandable: true,
								expandOnRowClick: true,
								onToggle: () => setCmdOpen((o) => !o),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.cmd,
									children: confirming.install
								})
							}),
							looksTerminal(confirming, lang) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: Market_module_css_default.warnLine,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {
										size: 14,
										className: Market_module_css_default.bannerIcon
									}),
									" " + t("terminalWarn") + " ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: Market_module_css_default.src,
										href: confirming.url + "#readme",
										target: "_blank",
										rel: "noreferrer",
										children: t("readme")
									})
								]
							}),
							confirming.deprecated === true && (() => {
								const replacement = replacementOf(confirming);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.deprecate,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: Market_module_css_default.depLine,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["⚠️ ", t("deprecatedWarn")] }), replacement !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
											className: Market_module_css_default.src,
											href: replacement.url,
											target: "_blank",
											rel: "noreferrer",
											children: t("replacementHint") + " " + replacement.name
										})]
									})
								});
							})(),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: Market_module_css_default.modalNote,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {
									size: 14,
									className: Market_module_css_default.bannerIcon
								}), " " + t("confirmWarn")]
							})
						]
					}),
					commentsFor !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommentsModal, {
						name: pluginName(commentsFor.name),
						url: commentsFor.url,
						lang,
						onClose: () => setCommentsFor(null),
						t
					}, commentsFor.url),
					lightbox !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScreenshotLightbox, {
						shots: lightbox.shots,
						startIndex: lightbox.index,
						onClose: () => setLightbox(null),
						t
					}),
					removeConfirm !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => setRemoveConfirm(null),
						title: t("uninstall") + " " + removeConfirm + "?",
						description: t("uninstallConfirmDesc"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: () => setRemoveConfirm(null),
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: removingName !== null,
							onClick: () => doUninstall(removeConfirm),
							children: t("uninstall")
						})] })
					}),
					notesFor !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => setNotesFor(null),
						title: notesFor.repoUrl !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: Market_module_css_default.nameLink,
							href: notesFor.repoUrl + "#readme",
							target: "_blank",
							rel: "noreferrer",
							children: notesFor.name
						}) : notesFor.name,
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: () => setNotesFor(null),
							children: t("cancel")
						}),
						children: [
							(notesFor.current !== null || notesFor.latest !== null) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.notesRange,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: notesFor.current !== null && notesFor.current.length === 40 ? notesFor.current.slice(0, 7) : notesFor.current
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.notesArrow,
										children: "→"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Market_module_css_default.spec,
										children: notesFor.latest !== null && notesFor.latest.length === 40 ? notesFor.latest.slice(0, 7) : notesFor.latest
									})
								]
							}),
							notesState === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.spec,
								children: t("loading")
							}),
							notesState === "fail" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.spec,
								children: t("notesLoadFail")
							}),
							notesState === "ready" && updateNotes !== null && (updateNotes.kind === "release" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.notesBody,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: Market_module_css_default.notesMeta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("notesRelease") }),
										updateNotes.release.tag !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: " " + updateNotes.release.tag }),
										updateNotes.release.publishedAt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: " · " + updateNotes.release.publishedAt.slice(0, 10) })
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.notesRendered,
									children: renderMarkdown(updateNotes.release.body || t("notesNone"))
								})]
							}) : updateNotes.kind === "commits" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.notesBody,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: Market_module_css_default.notesMeta,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("notesCommits") })
									}),
									!updateNotes.commits.found && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: Market_module_css_default.notesMeta,
										children: t("notesCommitsRecent")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: Market_module_css_default.notesList,
										children: updateNotes.commits.items.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
											className: Market_module_css_default.notesRow,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Market_module_css_default.notesDate,
													children: c.date !== null ? c.date.slice(0, 10) : ""
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Market_module_css_default.notesMsg,
													children: mdInline(c.message)
												}),
												notesFor.repoUrl !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
													className: Market_module_css_default.notesSha,
													href: notesFor.repoUrl + "/commit/" + c.sha,
													target: "_blank",
													rel: "noreferrer",
													title: c.message,
													children: c.sha.slice(0, 7)
												})
											]
										}, c.sha))
									})
								]
							}) : updateNotes.kind === "npm" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.notesBody,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Market_module_css_default.notesMeta,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("notesNpm") })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: Market_module_css_default.notesList,
									children: updateNotes.npmTimes.map((v) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: Market_module_css_default.notesRow,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.notesDate,
											children: v.date.slice(0, 10)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
											className: Market_module_css_default.notesVer,
											href: `https://www.npmjs.com/package/${encodeURIComponent(notesFor.name)}/v/${encodeURIComponent(v.version)}`,
											target: "_blank",
											rel: "noreferrer",
											children: v.version
										})]
									}, v.version))
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.spec,
								children: t("notesNone")
							}))
						]
					}),
					restoreConfirmOpen && pendingBackup !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => setRestoreConfirmOpen(false),
						title: t("restoreConfirm"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: () => setRestoreConfirmOpen(false),
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: backupBusy,
							onClick: doRestore,
							children: t("confirm")
						})] })
					}),
					exportOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => setExportOpen(false),
						title: t("gistExportSelect"),
						description: t("gistExportHint"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: () => setExportOpen(false),
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: gistBusy || exportSelection.size === 0,
							onClick: () => runGist("export"),
							children: gistBusy ? t("backupWorking") : t("gistExportGo")
						})] }),
						children: [exportOptions.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("gistNoPlugins") }), exportOptions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Market_module_css_default.backupActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "outline",
									onClick: () => setExportSelection(new Set(exportOptions)),
									children: t("gistSelectAll")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "outline",
									onClick: () => setExportSelection(/* @__PURE__ */ new Set()),
									children: t("gistSelectNone")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Market_module_css_default.backupCheckList,
								children: exportOptions.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: Market_module_css_default.backupCheck,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: exportSelection.has(name),
											onChange: (e) => {
												const next = new Set(exportSelection);
												if (e.currentTarget.checked) next.add(name);
												else next.delete(name);
												setExportSelection(next);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.grow,
											children: name
										}),
										specKind(installed[name]) === "git" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `${Market_module_css_default.specTag} ${Market_module_css_default.specTagGit}`,
											children: "git"
										}),
										specKind(installed[name]) === "file" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: `${Market_module_css_default.specTag} ${Market_module_css_default.specTagFile}`,
											children: t("gistSpecLocal")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Market_module_css_default.spec,
											title: installed[name],
											children: installed[name] ?? t("bundleTag")
										})
									]
								}, name))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: Market_module_css_default.backupCheck,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: exportIncludeConfig,
									onChange: (e) => setExportIncludeConfig(e.target.checked)
								}), t("gistIncludeConfig")]
							}),
							exportIncludeConfig && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Market_module_css_default.backupWarn,
								children: t("credsWarning")
							}),
							exportError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: Market_module_css_default.backupWarn,
								children: exportError
							})
						] })]
					}),
					exportState === "done" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: t("exportedLog"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 }),
						onDone: exportToastDone
					}),
					exportState === "fail" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: t("exportLogFail"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 14 }),
						onDone: exportToastDone
					}),
					toggled !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: toggled.name + " " + t(toggled.enabled ? "toastToggledOn" : "toastToggledOff"),
						icon: toggled.enabled ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 14 }),
						onDone: toggledDone
					})
				]
			});
		}
		//#endregion
		//#region src/client/SettingsCard.tsx
		/**
		* The market's card on the plugin configuration page (dsh >= 0.1.0-rc.7).
		*
		* It manages the market ITSELF — version, update, remove — when the current
		* profile owns the dependency. A host-provided market keeps only its version
		* display and download-region controls. This page is where a user goes to deal
		* with a plugin,
		* and "which version am I on / update it / get rid of it" is the part of
		* that anybody can act on without knowing how DSH is put together.
		*
		* `allowRestart` deliberately does NOT appear here. It exists for hosts
		* where a supervisor (systemd, launchd, pm2, Docker `restart: always`, a
		* desktop wrapper) owns the process, and its audience is whoever wrote that
		* deployment — a person already editing config, not someone browsing
		* settings. As a switch it read as jargon to everyone else, which is worse
		* than absent: a control you cannot evaluate is a control you cannot safely
		* touch. It remains a config option.
		*
		* ## Why the chrome is hand-built (again), and why it now matches
		*
		* The host's own contract is that "a plugin that ships a browser half owns
		* its own card" — the plugins tab only lays out a flex column and dispatches
		* `settings.plugin.item`. So the container IS ours to draw, and a value
		* import from `dsh-client-ui-settings-plugins` would fail the client
		* bundle-purity gate anyway.
		*
		* What the first version got wrong was drawing something of its own
		* invention: a flat, always-expanded box next to rows that collapse and
		* carry a chevron. The fix is not a different component — `DisclosureRow` is
		* 24px chrome for compact flow rows, a different thing — but the same design
		* tokens, laid out the way the host lays out `PluginCard`. Classes below
		* mirror it one for one, so the market stops looking like it wandered in
		* from another product.
		*/
		/** Keys the market leaves in the browser; cleared when the user purges. */
		const BROWSER_KEYS = ["dshm-webdav", "dshm-gist-id"];
		const CHANNELS = [
			"stable",
			"beta",
			"dev"
		];
		const asChannel = (value) => CHANNELS.includes(value) ? value : null;
		const CHANNEL_LABEL = {
			stable: "setChannelStable",
			beta: "setChannelBeta",
			dev: "setChannelDev"
		};
		const CHANNEL_HINT = {
			stable: "setChannelStableHint",
			beta: "setChannelBetaHint",
			dev: "setChannelDevHint"
		};
		const REGIONS = ["global", "china"];
		const asRegion = (value) => REGIONS.includes(value) ? value : null;
		const REGION_LABEL = {
			global: "setRegionGlobal",
			china: "setRegionChina"
		};
		const REGION_HINT = {
			global: "setRegionGlobalHint",
			china: "setRegionChinaHint"
		};
		/**
		* Read the server's answer, taking the list of channels FROM it.
		*
		* The card does not decide which channels exist: the server is what accepts
		* or refuses a selection, so a card drawing its own list could only ever
		* disagree with it.
		*/
		function readStatus(body) {
			const offered = (body.channels ?? []).map(asChannel).filter((c) => c !== null);
			const regions = (body.regions ?? []).map(asRegion).filter((r) => r !== null);
			return {
				version: body.version ?? null,
				restart: body.restart === true,
				channel: asChannel(body.channel) ?? "stable",
				channels: offered.length > 0 ? offered : ["stable", "beta"],
				region: asRegion(body.region) ?? "global",
				regions: regions.length > 0 ? regions : REGIONS,
				regionAuto: body.regionAuto === true,
				selfManaged: body.selfManaged !== false
			};
		}
		function readUpdate(own) {
			return {
				updateAvailable: own.updateAvailable === true,
				latest: own.latest ?? null,
				channelSwitch: own.channelSwitch ?? null,
				restoreRequired: own.restoreRequired === true
			};
		}
		/**
		* Clear the market's browser-side leftovers.
		*
		* These are the only two things the market keeps in the browser, and the
		* server cannot reach either. Neither holds a credential — the WebDAV
		* password is never persisted and a Gist token is read from the environment,
		* never from disk — so this is tidiness, not a security step, and the copy
		* must not imply otherwise.
		*/
		function clearBrowserState(storage) {
			for (const key of BROWSER_KEYS) try {
				storage.removeItem(key);
			} catch {}
		}
		function SettingsCard({ t, onRemoved }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [status, setStatus] = (0, react.useState)(null);
			const [update, setUpdate] = (0, react.useState)(null);
			const [phase, setPhase] = (0, react.useState)("idle");
			const [restoreConfirming, setRestoreConfirming] = (0, react.useState)(false);
			const [purge, setPurge] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			/**
			* The last self-update was refused by pnpm's fresh-release safety wait
			* (#39). Only the market's own card can update the market, so without a
			* retry here there is NO way to take a just-published version — the
			* discover list's retry button covers every plugin except this one (#255).
			*/
			const [stale, setStale] = (0, react.useState)(false);
			const probed = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				if (!open || probed.current) return;
				probed.current = true;
				let live = true;
				(async () => {
					try {
						const body = await (await fetch(api("/dsh-market/status"), { cache: "no-store" })).json();
						if (live) setStatus(readStatus(body));
						setGithubProxy(typeof body.githubProxy === "string" ? body.githubProxy : null);
					} catch {
						if (live) setStatus({
							version: null,
							restart: false,
							channel: "stable",
							channels: ["stable", "beta"],
							region: "global",
							regions: REGIONS,
							regionAuto: false,
							selfManaged: true
						});
					}
					try {
						const body = await (await fetch(api("/dsh-market/updates"), { cache: "no-store" })).json();
						const own = body.updates?.["dshmarket"] ?? body.updates?.["dsh-market"];
						if (live && own !== void 0) setUpdate(readUpdate(own));
					} catch {}
				})();
				return () => {
					live = false;
				};
			}, [open]);
			const post = (0, react.useCallback)(async (path, payload) => {
				return await (await fetch(path, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				})).json();
			}, []);
			const onUpdate = (0, react.useCallback)((force = false) => {
				setRestoreConfirming(false);
				setPhase("working");
				setError(null);
				setStale(false);
				(async () => {
					try {
						const body = await post(api("/dsh-market/update"), {
							name: "dshmarket",
							...update?.restoreRequired === true ? { restore: true } : {},
							...force ? { force: true } : {}
						});
						if (body.ok === true) setPhase("updated");
						else {
							setStale(body.stale === true);
							setError(body.error ?? t("setSelfFailed"));
							setPhase("failed");
						}
					} catch (cause) {
						setError(cause instanceof Error ? cause.message : String(cause));
						setPhase("failed");
					}
				})();
			}, [
				post,
				t,
				update?.restoreRequired
			]);
			const onRemove = (0, react.useCallback)(() => {
				setPhase("working");
				setError(null);
				(async () => {
					try {
						const body = await post(api("/dsh-market/self-uninstall"), {
							confirm: true,
							purge
						});
						if (body.ok === true) {
							if (purge) clearBrowserState(localStorage);
							setPhase("removed");
							onRemoved?.();
						} else {
							setError(body.error ?? t("setSelfFailed"));
							setPhase("failed");
						}
					} catch (cause) {
						setError(cause instanceof Error ? cause.message : String(cause));
						setPhase("failed");
					}
				})();
			}, [
				onRemoved,
				post,
				purge,
				t
			]);
			const busy = phase === "working";
			const version = status?.version ?? null;
			const prerelease = version !== null && version.includes("-");
			/** Re-ask what this channel offers; the previous answer was for another one. */
			const refreshUpdate = (0, react.useCallback)(async () => {
				const body = await (await fetch(api("/dsh-market/updates") + "?force=1", { cache: "no-store" })).json();
				const own = body.updates?.["dshmarket"] ?? body.updates?.["dsh-market"];
				setUpdate(own === void 0 ? null : readUpdate(own));
			}, []);
			/**
			* Select a channel — and show the one the SERVER accepted.
			*
			* This used to move the control first and ignore the answer, which was
			* harmless while every channel was permitted. It stopped being harmless
			* the moment one of them can be refused: a 403 would have left "dev"
			* highlighted on a profile that is not on it.
			*/
			const onChannel = (0, react.useCallback)((next) => {
				setError(null);
				(async () => {
					try {
						const body = await post(api("/dsh-market/channel"), { channel: next });
						if (body.ok !== true) {
							setError(body.error ?? t("setSelfFailed"));
							return;
						}
						setStatus((current) => current === null ? current : {
							...current,
							channel: asChannel(body.channel) ?? next
						});
						await refreshUpdate();
					} catch (cause) {
						setError(cause instanceof Error ? cause.message : String(cause));
					}
				})();
			}, [
				post,
				refreshUpdate,
				t
			]);
			/**
			* Select a download region — and show the one the SERVER accepted, on the
			* same reasoning as the channel above.
			*
			* A hand-made choice retires the one-time notice: the market no longer has
			* anything to explain once the user has answered for themselves.
			*/
			const onRegion = (0, react.useCallback)((next) => {
				setError(null);
				(async () => {
					try {
						const body = await post(api("/dsh-market/region"), { region: next });
						if (body.ok !== true) {
							setError(body.error ?? t("setSelfFailed"));
							return;
						}
						const accepted = asRegion(body.region) ?? next;
						setStatus((current) => current === null ? current : {
							...current,
							region: accepted,
							regionAuto: false
						});
						try {
							const status = await (await fetch(api("/dsh-market/status"), { cache: "no-store" })).json();
							setGithubProxy(typeof status.githubProxy === "string" ? status.githubProxy : null);
						} catch {}
					} catch (cause) {
						setError(cause instanceof Error ? cause.message : String(cause));
					}
				})();
			}, [post, t]);
			/** One label + hint block with an optional action, the host's row shape. */
			const row = (label, hint, action) => (0, react.createElement)("div", { className: Market_module_css_default.setRow }, (0, react.createElement)("div", { className: Market_module_css_default.setLabelBox }, (0, react.createElement)("div", { className: Market_module_css_default.setLabel }, label), (0, react.createElement)("div", { className: Market_module_css_default.setHint }, hint)), action);
			const body = phase === "removed" ? row(t("setSelfRemoved"), t("setSelfRemovedHint"), null) : (0, react.createElement)(react.Fragment, null, status?.selfManaged === true ? row(update?.updateAvailable === true && update.latest !== null ? `${t("setSelfUpdateReady")} ${update.latest}` : update?.channelSwitch != null ? `${t("setChannelSwitch")} ${update.channelSwitch}` : t("setSelfUpToDate"), phase === "updated" ? t("setSelfUpdatedHint") : update?.channelSwitch != null ? t("setChannelSwitchHint") : update?.updateAvailable === true ? t("setSelfUpdateHint") : t("setSelfUpToDateHint"), phase === "updated" ? null : update?.updateAvailable === true ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				size: "sm",
				disabled: busy,
				onClick: () => {
					if (update.restoreRequired) setRestoreConfirming(true);
					else onUpdate();
				}
			}, update.restoreRequired ? t("restoreOnline") : t("setSelfUpdate")) : update?.channelSwitch != null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				disabled: busy,
				onClick: () => onUpdate()
			}, t("setChannelSwitch")) : null) : null, status?.selfManaged === true && restoreConfirming ? (0, react.createElement)("div", { className: Market_module_css_default.setConfirm }, (0, react.createElement)("div", { className: Market_module_css_default.setHint }, t("restoreHint")), (0, react.createElement)("div", { className: Market_module_css_default.setActions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					setRestoreConfirming(false);
				}
			}, t("setSelfCancel")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				size: "sm",
				onClick: () => onUpdate()
			}, t("restoreContinue")))) : null, status?.selfManaged === true ? row(t("setChannel"), t(CHANNEL_HINT[status.channel]), (0, react.createElement)("div", { className: Market_module_css_default.setSeg }, (status?.channels ?? ["stable", "beta"]).map((id) => (0, react.createElement)("button", {
				key: id,
				type: "button",
				className: status?.channel === id ? `${Market_module_css_default.setSegBtn} ${Market_module_css_default.setSegOn}` : Market_module_css_default.setSegBtn,
				disabled: busy || status === null,
				title: id === "dev" ? t("setChannelDevHint") : void 0,
				onClick: () => {
					onChannel(id);
				}
			}, t(CHANNEL_LABEL[id]))))) : null, row(t("setRegion"), status?.regionAuto === true ? `${t(REGION_HINT[status.region])} ${t("setRegionAuto")}` : t(REGION_HINT[status?.region ?? "global"]), (0, react.createElement)("div", { className: Market_module_css_default.setSeg }, (status?.regions ?? REGIONS).map((id) => (0, react.createElement)("button", {
				key: id,
				type: "button",
				className: status?.region === id ? `${Market_module_css_default.setSegBtn} ${Market_module_css_default.setSegOn}` : Market_module_css_default.setSegBtn,
				disabled: busy || status === null,
				onClick: () => {
					onRegion(id);
				}
			}, t(REGION_LABEL[id]))))), status?.selfManaged === true ? row(t("setSelfRemove"), t("setSelfRemoveHint"), phase === "confirming" || busy ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				className: Market_module_css_default.setDanger,
				disabled: busy,
				onClick: () => {
					setPhase("confirming");
				}
			}, t("setSelfRemove"))) : null, status?.selfManaged === true && (phase === "confirming" || busy) ? (0, react.createElement)("div", { className: Market_module_css_default.setConfirm }, (0, react.createElement)("div", { className: Market_module_css_default.setHint }, t("setSelfConfirm")), (0, react.createElement)("label", { className: Market_module_css_default.setCheck }, (0, react.createElement)("input", {
				type: "checkbox",
				checked: purge,
				onChange: () => {
					setPurge(!purge);
				}
			}), (0, react.createElement)("span", null, t("setSelfPurge"))), (0, react.createElement)("div", { className: Market_module_css_default.setHint }, purge ? t("setSelfPurgeOn") : t("setSelfPurgeOff")), (0, react.createElement)("div", { className: Market_module_css_default.setActions }, busy ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				onClick: () => {
					setPhase("idle");
					setPurge(false);
				}
			}, t("setSelfCancel")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				size: "sm",
				className: Market_module_css_default.setDanger,
				disabled: busy,
				icon: busy ? (0, react.createElement)("span", { className: Market_module_css_default.spin }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, { size: 16 })) : void 0,
				onClick: onRemove
			}, busy ? t("setSelfWorking") : t("setSelfRemoveConfirm")))) : null, error !== null ? (0, react.createElement)("div", { className: Market_module_css_default.err }, error) : null, stale ? (0, react.createElement)("div", { className: Market_module_css_default.setActions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				size: "sm",
				onClick: () => onUpdate(true)
			}, t("updateNow"))) : null);
			return (0, react.createElement)("div", { className: open ? `${Market_module_css_default.setCard} ${Market_module_css_default.setCardOpen}` : Market_module_css_default.setCard }, (0, react.createElement)("button", {
				type: "button",
				className: Market_module_css_default.setHeader,
				"aria-expanded": open,
				onClick: () => {
					setOpen(!open);
				}
			}, (0, react.createElement)("div", { className: Market_module_css_default.setHeadText }, (0, react.createElement)("div", { className: Market_module_css_default.setName }, t("nav"), version !== null ? (0, react.createElement)("span", { className: Market_module_css_default.version }, ` v${version}`) : null, prerelease ? (0, react.createElement)("span", { className: Market_module_css_default.setBetaTag }, t("setChannelBeta")) : null), (0, react.createElement)("div", { className: Market_module_css_default.setDesc }, t("setCardDesc"))), (0, react.createElement)("span", { className: open ? `${Market_module_css_default.setChevron} ${Market_module_css_default.setChevronOpen}` : Market_module_css_default.setChevron }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 }))), open ? (0, react.createElement)("div", { className: Market_module_css_default.setBody }, body) : null);
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-market client: registers a "Market" settings section rendering the
		* plugin market UI, plus the post-install toast in the shell overlay layer.
		* Built by tsdown into the __ModuleLoader__ factory bundle at
		* client/client.js; the only externals are the loader module table's react
		* entries.
		*/
		const NS = "dsh-market";
		/**
		* Primitives this bundle relies on that did not exist before rc.6. The
		* primitives module is host-injected (external at build time), so on an
		* older host the module resolves but these named exports are undefined —
		* rendering would throw and blank the whole settings dialog. Returning the
		* gaps lets apply() skip registration for a clean downgrade instead.
		*/
		const REQUIRED_PRIMITIVES = [
			"Menu",
			"DisclosureRow",
			"Tooltip",
			"Toast"
		];
		function missingPrimitives(mod, required = REQUIRED_PRIMITIVES) {
			return required.filter((name) => mod[name] === void 0);
		}
		const name = "dsh-market";
		const inject = [
			"slots",
			"locale",
			"theme"
		];
		function apply(ctx) {
			const gaps = missingPrimitives(_deepseek_ai_dsh_client_ui_primitives);
			if (gaps.length > 0) {
				console.warn("[dsh-market] host ui-primitives missing " + gaps.join(", ") + " — market section disabled (dsh web >= 0.1.0-rc.6 required)");
				return;
			}
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-market: dictionaries");
			const t = ctx.locale.bind(NS);
			let retireSection = null;
			ctx.slots.inject("settings.section", () => {
				const off = ctx.slots.register({
					name: "settings.section",
					id: "market",
					order: 40,
					label: () => t("nav"),
					locale: NS,
					inject: () => ({ t })
				}, (ownerProps = {}) => (0, react.createElement)(MarketSection, {
					t,
					locale: ctx.locale,
					theme: ctx.theme,
					themeStore: {
						subscribe: (cb) => ctx.on("theme/change", cb),
						getSnapshot: () => ctx.theme.getTheme()
					},
					preferredSubsectionId: ownerProps.preferredSubsectionId
				}));
				if (typeof off === "function") retireSection = off;
				return off;
			});
			ctx.inject(["settingsScope"], (scoped) => {
				scoped.slots.inject("settings.plugin.item", () => scoped.slots.register({
					name: "settings.plugin.item",
					key: NS,
					locale: NS,
					inject: () => ({ t })
				}, () => (0, react.createElement)(SettingsCard, {
					t,
					onRemoved: () => {
						const off = retireSection;
						retireSection = null;
						off?.();
					}
				})));
			});
			const Toast = () => (0, react.createElement)(InstallToast, { t });
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-market-toast",
				label: () => "dsh-market"
			}, Toast));
		}
		//#endregion
		exports.REQUIRED_PRIMITIVES = REQUIRED_PRIMITIVES;
		exports.apply = apply;
		exports.inject = inject;
		exports.missingPrimitives = missingPrimitives;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map