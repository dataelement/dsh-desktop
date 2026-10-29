# Models 发现能力兼容补丁

## 范围与版本

目标：@deepseek-ai/dsh-llm-pi-ai、@deepseek-ai/dsh-llm、@deepseek-ai/dsh-client-ui-settings-models **0.2.2-alpha.2**，wire 语义核对 @earendil-works/pi-ai **1.3.0**。

补丁修复现有发现 → LlmDiscoveredModel/服务序列化 → UI adopt 链路丢失明确能力元数据的问题，不新增协议或加载入口，不改变 Profile/Safe Mode 的解析基准。失败或未知元数据仍保留原有人工配置入口；不修改用户已有模型行。

权威输入在 patches/ 对应三个包的 patch 中；node_modules 仅供重放及行为验证。移除条件：上游端到端保留经校验的等价能力契约、采用时不覆盖已有用户配置，并通过本次行为/wire 回归；升级时重新核对 pi-ai 映射，不能只机械调整补丁上下文。

## 官方输入与保守边界

- [OpenRouter models](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties.md)：校验 architecture.input_modalities 数组及 reasoning 对象。supported_efforts 缺失是未知，null 才表示网关接受全部 effort 值。mandatory 为 true 时不提供关闭。none 对应 UI off，但实际 wire 必须为 none；max/xhigh 不降级。校验 default_effort/default_enabled/supports_max_tokens 的已知形状，不把这些默认值强制写成用户偏好，不从 supported_parameters 猜测等级。
- [Anthropic models](https://platform.claude.com/docs/en/api/models/list.md)：读取 capabilities.image_input.supported、thinking.supported/types、effort.supported 及各等级的 supported boolean。只有明确支持 adaptive 且披露可用 effort 才自动配置等级，并传递最小 forceAdaptiveThinking 开关，避免 pi-ai budget 路径把扩展等级折成 high。只有 disabled.supported 为 true 才加入 off；between_tools 不代表 disabled。
- OpenAI 标准 models 没有这些能力字段，缺失/畸形不能解释为“不支持”。未声明 reasoning、旧式 budget thinking 等继续人工配置。只投影 runtime 支持的 text/image，忽略合法但 runtime 未支持的 file/audio/video，不声称支持这些输入。
- 内置目录保留 reasoning=false 和显式 thinkingLevelMap 的支持/禁用及 wire 值，不凭 reasoning=true 发明 max/xhigh。

## 验证与限制

行为回归：test/model-discovery-capabilities.test.mjs，覆盖官方形状、缺失/畸形、目录 wire map、服务传递/隔离、UI adopt 与已有行保留。实际导入安装的 pi-ai streamSimple，并在 onPayload 处中止网络，验证 Anthropic off 发送 thinking.disabled、max/xhigh 精确 effort，OpenRouter off 发送 reasoning.effort=none、max/xhigh 精确传递。

补丁在独立临时树从反向重放所得基线重新应用并逐字节比对三包目标文件。patch-package 自动生成时其内部 npm install 退出 255（无诊断输出），因此采用本地已装版本及既有补丁反向基线生成，没有进行破坏性 npm ci；未宣称已验证全新联网安装。未重启正式安装应用、未做真实浏览器/UI 点击验收，行为测试不替代实际加载与保存流程验收。
