# 技能展示名与调用键契约

目标版本为 Harness 0.2.2-rc.1。当前官方 SkillSummary、skills/list 与输入候选链仅携带调用 name，无法表达独立的人类可读名称；候选已有 label 但默认总显示内部 alias，不能直接用于提供方的隔离调用键。

本次兼容层在 dsh-skill 增加可选 displayName 并验证类型，保留 runtime 注册、provider 发现、加载与 summary 的字段；api-session-controller 同步实际投影、声明、host/remote typert codec、JSON Schema 和 FaceModel 声明。api-remotes 的生成客户端内联 codec/JSON Schema 同步此字段，避免客户端校验时剥离展示名。所有 name 与调用键保持不变。

client-ui-skill 使用 displayName（非空时）搜索并提供 label/hideAlias，description 独立保留。未设置或为空的展示名沿用 name 与既有 userOnly 说明。client-ui-input-trigger 的可选 hideAlias 仅抑制显式 label 后的内部调用键；其他命令默认别名行为保持。鼠标悬停仅更新高亮；显式键盘移动只滚动列表 viewport，不调用会滚动页面祖先的 scrollIntoView。

补丁均为当前版本 patch-package 原子文件，保留各包既有补丁行为。上游原生提供等价展示名链路与输入菜单行为后，应删除本项兼容变更，不重复注入。

行为回归为 test/skill-display-name-contract.test.mjs、test/skill-display-name-menu.test.mjs、test/input-trigger-scroll.test.mjs，覆盖真实 SkillRegistry、冷 Session API 的 lease 释放、host/remote/内联生成 codec、候选排名及实际 React MenuView。通用 fixture 不依赖企业插件或企业凭据。

已在隔离目录从 npm 原始五包 0.2.2-rc.1 归档重放并执行行为测试；另复制下游企业 provider 与三个 enterprise 技能套件验证组合。此验证未修改下游 node_modules；未执行全量 npm ci、全应用打包、真实浏览器 UI 或 Windows 验收，不能将单元/隔离重放通过表述为正式安装应用已生效。
