# 运行环境兼容约定

本技能不绑定特定厂商、模型或办公套件。执行环境通过下列能力约定接入。

## 1. 必需能力

- 读取 PPTX 的页尺寸、母版、主题、文本、图片、图表、组合和对象几何。
- 从指定源页复制幻灯片，并保持对象 ID 或建立稳定的新旧对象映射。
- 从指定母版的命名布局新建幻灯片，并保留源母版画布尺寸、品牌构件和占位符语义；不得套用编辑引擎的默认页面尺寸。
- 修改继承文本、图片、图表数据和基本图形，不破坏未修改对象。
- 支持为新建文本对象写入稳定对象名、`textRole`、四侧 `textInsets`、逐 run 字号/字重/Latin 与 East Asian 字体，以及逐段百分比行距；标准证据双区页必须能保留 `standard-narrative-title`、`standard-narrative-body`、`standard-visual-title` 三个对象名，并在布局数据中导出真实行数、字号、字重和段落对齐，以检查 150% 行距、10pt 常规图表标题、正文左对齐和图形内文字安全距离。
- 对封面源页与成品页执行对象级精确比对，包括画布、布局关系、Shape ID、坐标、尺寸、段落数、有效字号、字体、字重、文本框设置，以及布局层右侧品牌图的对象类型、媒体、裁切和其他品牌家具。
- 能检查可见幻灯片对象的 DrawingML 效果列表；发现 `outerShdw`、`innerShdw` 或 `prstShdw` 时以 `shape-shadow-forbidden` 硬错误终止。
- 按逻辑页序读取可见文本对象，并执行模板化句式与口号化表达检查；支持按页码和 Shape ID 记录有来源的例外。
- 将每页渲染为 PNG，分辨率不低于 1600×900。
- 导出逐页对象布局数据，至少包含页框、最终可见的继承与页面层对象、对象名称、类型、边界框、文本角色、文本、字体、字号、文本行数、段落对齐、文字内边距，以及形状的填充色、线条色和线宽。连接线还必须导出 `lineStart` / `lineEnd` 或 `points`，坐标与 `bbox` 使用同一归一化坐标系。
- 执行 Python 3 标准库脚本；封面、结构、文案、字号、布局检查及属性清理脚本均不依赖第三方 Python 包。
- 读取并注册技能内 `assets/fonts/STHeiti_YFD.ttf`；至少能在生成进程或渲染进程中把它解析为 `华文黑体_易方达` / `STHeiti_YFD`。字体资产先通过 `scripts/check_efund_font_asset.py` 的哈希和内部名称检查。

缺少“保真复制、逐页渲染、对象检查”中的任一项时，不得交付正式成品。

## 2. 路径约定

- 从 `SKILL.md` 所在目录解析 `SKILL_DIR`。
- 模板、预览和品牌资产始终通过 `SKILL_DIR/assets/...` 访问。
- 不在成品、记录或脚本参数中写入开发机器的用户名、主目录或绝对路径。
- 临时文件写入独立 scratch 目录；正式输出只包含 PPTX 和用户要求的交付附件。
- 对外发布前运行 `scripts/sanitize_pptx_metadata.py` 清理编辑者、修改者、时间戳、应用名称和自定义属性；清理后的 PPTX 必须重新通过结构 QA 与逐页渲染检查。

## 3. 布局 JSON 接口

每页输出一个 `*.layout.json`。推荐文件名为 `slide-001.layout.json`。最小结构：

```json
{
  "slide": {
    "slide": 1,
    "frame": {"left": 0, "top": 0, "width": 960, "height": 540}
  },
  "elements": [
    {
      "id": "stable-object-id",
      "name": "Title 1",
      "kind": "text",
      "textRole": "page-title",
      "scope": "slide",
      "bbox": [38, 22, 650, 28],
      "text": "结论型标题",
      "resolvedFontSize": 32,
      "resolvedTextStyle": {"fontSize": 32, "fontFamily": "华文黑体_易方达"},
      "textLayout": {"lineCount": 1},
      "fillColor": "#005096",
      "lineColor": "#005096",
      "lineWidth": 0,
      "paragraphs": []
    }
  ]
}
```

`bbox` 单位使用归一化 960×540 画布像素，顺序为 `[x, y, width, height]`。若运行环境使用其他坐标系，导出时按比例转换。组合子元素可保留，但最终可见的母版/布局家具也必须展开到对象清单，`scope` 统一写 `slide`，否则无法检查完整页脚。`fillColor`、`lineColor` 和 `lineWidth` 对形状必须输出；无填充可写 `transparent` 或 `none`，无边线时 `lineWidth` 写 0。

正文、解释、模块说明、表格正文、来源、注释、建议和结论使用 `textRole`：`body`、`explanation`、`module-description`、`table-body`、`source`、`note`、`recommendation` 或 `conclusion`；这些角色必须导出实际段落对齐并左对齐。短节点标签、表头、指标数字和页码可分别使用 `node-label`、`table-header`、`metric-value`、`page-number`。含正文的图形导出 `textInsets: {"left": 12, "top": 10, "right": 12, "bottom": 10}`，四侧不得小于 10px。

连接线示例：

```json
{
  "id": "connector-7",
  "name": "relationship-connector",
  "kind": "shape",
  "geometry": "line",
  "scope": "slide",
  "bbox": [340, 180, 220, 90],
  "lineStart": [340, 225],
  "lineEnd": [560, 260],
  "fromId": "node-2",
  "toId": "node-5"
}
```

`fromId` / `toId` 只标记连接线合法接触的节点；不得把附近的普通文字对象登记为端点来绕过 8px 文字安全区检查。

## 4. 保真检查接口

`template-frame-map.json` 至少记录输出页、叙事角色、内容关系、构建模式、品牌来源、布局决策、图文语义绑定和对象操作。构建模式只允许 `reuse`、`controlled-recomposition`、`original-in-brand-shell`；新正文页默认使用 `original-in-brand-shell`。封面必须使用 `reuse`，并记录 `coverProfile` 与 `sourceSlide`。母版原创页额外记录 `reuseMode: "master-layout"`。案例复用或重组页记录 `sourceSlide`；品牌壳原创页记录干净 `sourceSlide` 或 `sourceLayout`。

`outputSlide` 与 `sourceSlide` 都是演示文稿中的 1-based 逻辑页码，不是压缩包内 `slideN.xml` 的文件编号。删除或重排页面后两者可能不同；检查器必须通过 `presentation.xml` 及其关系表解析实际 slide 部件。

顶层页数组固定命名为 `outputSlides`，不得使用 `pages` 或其他别名。最小骨架：

```json
{
  "schemaVersion": "1.0",
  "singleSourcePptx": "assets/efund-ai-platform-v21.pptx",
  "outputSlides": [
    {
      "outputSlide": 1,
      "sourceSlide": 14,
      "buildMode": "controlled-recomposition",
      "moduleCount": 3,
      "layoutDecision": {
        "contentStructure": "比较",
        "readingOrder": "左侧基线 → 中央差异 → 右侧建议",
        "primaryVisual": "中央深蓝实心差异块",
        "geometryPlan": "按证据量形成30/40/30非对称三段",
        "caseInfluence": ["V21 第14页：大数字语法"],
        "whyNotDirectReuse": "模块数与阅读顺序不同",
        "originalityEvidence": ["列宽由证据量决定", "中央焦点由决策重要性决定"]
      },
      "visualTextBinding": {
        "visualType": "comparison-visual",
        "supportsClaim": "共享治理先行在速度、风险和复用范围上更优",
        "textAnchor": "底部推进建议，Shape 18",
        "sourceOrGeneration": "本页可编辑矩形、比较分区和实心结论带",
        "whyThisVisual": "两条路径需要在三个共同维度上同时比较并收束为推荐",
        "informationCarried": "三项评价维度、两条路径差异和唯一推荐方向",
        "visualObjectIds": ["3", "4", "5", "6", "7", "8", "9"]
      },
      "alignmentGroups": [
        {
          "name": "三项评价维度",
          "objectIds": ["3", "4", "5"],
          "checks": ["top", "width", "height", "horizontal-gap"],
          "tolerancePx": 2
        }
      ],
      "editTargets": []
    }
  ]
}
```

`original-in-brand-shell` 和 `controlled-recomposition` 的 `layoutDecision` 必须包含上述七个字段，且内容具体到本页。`moduleCount` 为 2 或更大时必须提供非空 `alignmentGroups`；每组至少包含两个 `objectIds`，`checks` 可使用 `left`、`right`、`top`、`bottom`、`width`、`height`、`center-x`、`center-y`、`horizontal-gap`、`vertical-gap`，`tolerancePx` 必须在 0–4 之间。只把语义同级的对象放在一组；非对称主焦点与辅助区不强求等宽，但仍应声明适用的顶部、底部或中心线约束。每个普通内容页的 `visualTextBinding` 必须包含 `visualType`、`supportsClaim`、`textAnchor`、`sourceOrGeneration`、`whyThisVisual`、`informationCarried` 和非空 `visualObjectIds`；检查器会核对对象 ID 是否存在于对应 `*.layout.json`。固定封面、目录、法务和纯结束页可使用 `exempt: true`，但必须填写允许的 `pageKind` 与具体 `reason`。封面声明 `pageKind: "cover"` 时，`coverProfile` 只能使用 [cover-contract.md](cover-contract.md) 的内置配置或 `user-template`，且 `buildMode` 必须为 `reuse`。`reuse` 还必须包含：

```json
{
  "reuseEligibility": {
    "sameRelationship": true,
    "sameModuleCount": true,
    "sameDensity": true,
    "sameFocalHierarchy": true,
    "sameReadingOrder": true,
    "reason": "固定中文目录页，沿用标准目录版式"
  }
}
```

任一布尔值为假、字段缺失或理由只是“可以换字”“看起来相近”，均不得使用 `reuse`。

所有对象变更统一放在 `editTargets` 中：

- `rewrite`：原位改写继承对象，记录源 `shapeId`；成品 ID 改变时再记录 `finalShapeId`。
- `rewrite-and-reposition`：改写并移动继承对象，除上述字段外记录目标区域和理由。
- `delete`：删除继承对象，记录源 `shapeId` 和删除理由。
- `add`：新增可编辑对象，记录 `finalShapeIds`、`textRole`、`expectedFontSizesPt` 或 `allowedFontSizesPt`、区域、理由及与继承对象的覆盖限制。

字号检查通过 `scripts/check_efund_typography.py` 比较继承 Shape 的可见字号集合，并核验原创 Shape 的字号合同。任何无法解析、找不到 Shape 或缺少字号声明的警告都必须处理。交付前比较 starter 与 final：

- 顶栏标题对象使用 `page-title` / `textRole: page-title`，必须单行、左对齐且右边界停在 Logo 前 16px 保护带之外；两行、人工换行或侵入保护带分别触发 `wrapped-title` / `title-logo-clearance-violation`。
- 普通内容页的标题条、Logo、页脚线、公司名、保密提示和页码不得缺失；页脚四件套不完整触发 `missing-brand-footer-furniture`。
- 标题条、Logo、页脚线、公司名、保密提示和页码不得重复叠加；母版已提供的品牌构件不得在页面层再次绘制。
- 未列入可编辑/删除清单的对象不得发生文本、媒体、几何或样式变化。
- 继承图标和图片可用媒体哈希验证；相同资产应保持相同哈希。
- 任何工具兼容性修复都写入 `deviation-log.txt`，注明页码、对象、原因、处理和渲染结论。
- 普通正文页的三个及以上大面积空心线框容器会触发 `wireframe-heavy`；仅表格、矩阵、泳道或责任边界等语义明确的结构可人工说明后保留。
- QA 必须把页脚分割线以上 8px 设为正文安全下沿。任何非页脚家具越过该线均触发 `footer-clearance-violation`。
- 正文类 `textRole` 出现居中或右对齐时触发 `body-text-not-left-aligned`；含正文图形未导出 `textInsets` 或任一侧小于 10px 时，分别触发 `missing-text-insets` / `text-inset-clearance`。
- 关系连接线未导出端点时触发 `connector-endpoints-missing`；线段进入非端点文字对象外扩 8px 的安全区时触发 `connector-text-clearance`。
- `moduleCount >= 2` 的原创/受控重组页缺少 `alignmentGroups` 时触发 `missing-alignment-groups`；声明组内的边缘、尺寸、中心线或间距超出 `tolerancePx` 时触发 `alignment-group-violation`。
- `standard-narrative-body` 的真实行数 × 实际字号 × 150% 行距加内边距若超过文本框，触发 `standard-narrative-text-overflow`；其真实文字底边与下方总结块间距不足 16px，触发 `narrative-callout-clearance`。
- `standard-visual-title` 必须在结构 QA 中通过 10pt、常规、不加粗和显式 `华文黑体_易方达` 检查；任何偏差均为硬错误。
- 名称含 `takeaway`、`recommendation`、`suggestion` 或 `advice` 的建议/结论框只要出现居中或右对齐段落，就触发 `advisory-callout-not-left-aligned`。
- 普通内容页达到 6 页时，包含 `standard-narrative-title`、`standard-narrative-body`、`standard-visual-title` 三个具名对象的基础证据双区页必须不少于三分之一，否则触发 `insufficient-standard-evidence-layouts`。
- 名称含 `label` 的图表类别标签与名称含 `bar`、`column`、`mark`、`point` 或 `area` 的数据标记相交时，触发 `chart-label-mark-overlap`。数值标签必须使用 `value` 或 `data-label` 命名以区别类别标签。
- 模式 B 分组表对象使用 `grouped-table-*` 命名；其正文区存在 `rule` 或 `separator` 线条时，触发 `grouped-table-separator-line`。
- `source`、`note`、`来源`、`注释`、`脚注` 等对象始终按正文内容检查，不得因为接近底部而被误判为页脚家具。
- 原创或受控重组页缺少布局决策，或直接复用页缺少完整资格证明时，布局检查必须失败。
- 普通内容页缺少图文语义绑定、声明的视觉对象不存在、理由空泛或仅有装饰作用时，布局检查必须失败。
- 封面缺少 `coverProfile`、使用非 `reuse` 模式、源页不匹配，右侧品牌图缺失/换图/改裁切/被色块替代，或未通过 `scripts/check_efund_cover.py` 的逐对象精确比对时，必须失败。
- 文案命中 `scripts/check_efund_writing_style.py` 的模板化反差、无证据排比或口号规则且没有逐 Shape 来源说明时，必须失败。
- 任一可见幻灯片对象使用外阴影、内阴影或预设阴影时，结构检查必须失败。
- 具名标准证据页文本不符合 15pt/12pt、标题加粗、正文 150% 行距或显式 `华文黑体_易方达` / Arial 时，结构检查必须失败。

## 5. 渲染判定

优先使用最终观看环境的渲染器；条件允许时再使用第二种独立渲染器交叉检查。两种渲染结果若在字体换行、图片裁切、透明度、阴影或图表上不一致，以风险更高的结果为准并修复。备用母版页还必须逐页检查布局名称、重复品牌构件、占位提示语和垂直重心。
