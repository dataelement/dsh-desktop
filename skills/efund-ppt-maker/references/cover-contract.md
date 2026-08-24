# 易方达封面硬合同

封面不是正文页，也不是可自由发挥的“品牌风格页”。它必须直接复用标准封面页，完整保留画布、布局、标题框、字号、字体、字重、行距、右侧山水品牌图、页脚、Logo、保密提示和留白。允许修改的只有指定文本槽内容，以及联名封面中既有 Logo 图片槽的底层图片。

## 强制规则

1. `pageKind` 必须为 `cover`，`buildMode` 必须为 `reuse`，并在 `template-frame-map.json` 中声明 `coverProfile` 和 `sourceSlide`。
2. 先从下表选择能容纳题名结构的封面配置，再精简文案；不得为了塞入长标题而移动、缩放标题框、减小字号、换窄字体或新增文本框。
3. 标题、副标题、姓名、部门和日期必须写入源页既有 Shape ID。不得把多个槽合并，也不得拆成新的对象。
4. 标题段落数必须与配置一致。单标题保持一段；主副标题保持两段。不得出现意外换行。
5. 中文使用 `华文黑体_易方达`，英文和数字使用 Arial；字号和字重必须与源页逐段一致。
6. 右侧山水品牌图是标准封面的锁定图片对象，必须保留原始媒体、裁切、坐标、尺寸和层级；不得删除、重绘、换图、改色或替换为实心色块。底部页脚图、Logo、免责声明和保密提示同样锁定。
7. 封面不新增第二张照片、装饰插图、背景图、图标、边框、标题条或额外 Logo。需要联名时只能使用 `v6-co-brand` 的既有 Logo 图片槽。
8. 用户另给模板时，以用户模板指定的封面页作为 `user-template` 精确参考，规则相同。

## 内置封面配置

尺寸单位为 EMU；`914400 EMU = 1 英寸`。坐标顺序为 `x, y, cx, cy`。

| coverProfile | 资产与源页 | 题名 Shape ID 与坐标 | 题名样式 | 身份信息 |
|---|---|---|---|---|
| `v6-cn-simple` | `assets/efund-template-v6.pptx` 第 2 页 | ID 3：`230192,1123498,5850468,515526` | 单段中文 28pt | ID 12：日期 14pt，`240278,3315494,1095172,415498` |
| `v6-cn-subtitle` | 同上第 3 页 | ID 3：`230192,1123498,5850468,938719` | 主标题 28pt；副标题 22pt 加粗；两段 | ID 12：姓名/部门与日期 14pt，`230192,3208945,1319592,738664` |
| `v6-bilingual` | 同上第 4 页 | ID 3：`230192,1123498,5850468,838691` | 中文 28pt；英文 21pt 加粗；两段 | ID 12：姓名 14/12pt；ID 11：日期 14/12pt |
| `v6-english` | 同上第 5 页 | ID 8：`219434,1177288,7933254,938719` | 英文主标题 28pt；副标题 18pt 加粗；两段 | ID 4：姓名与日期 14pt |
| `v6-co-brand` | 同上第 6 页 | ID 4：`233490,1159893,5850468,515526` | 单段中文 28pt | ID 13：姓名/部门与日期 14pt；Logo 槽为 ID 10、11、12 |
| `ai-tech-internal` | `assets/efund-ai-platform-v21.pptx` 第 1 页 | ID 8：`222430,1176610,6449589,482953` | 单段中文 24pt | 副标题 ID 3：16pt；部门 ID 4：14pt；日期 ID 9：14pt |

V6 画布固定为 `9144000 × 5148263 EMU`；AI 技术封面画布固定为 `9144000 × 5143500 EMU`。不得由编辑引擎换成近似的默认宽屏尺寸。

## 锁定品牌家具

V6 中文/双语/英文/联名封面和 AI 技术封面的右侧山水品牌图均为布局层 Shape ID 6，从 `x=6912769` 开始，宽 `2231231`；V6 高 `4367213`，AI 技术封面高 `4364431`。图片必须使用内置源媒体，并保持原始裁切 `l=30921, t=155, r=35021, b=-155`、拉伸方式和层级。其底边下方是独立的品牌页脚与 Logo 分区，不属于图片槽，不得被图片覆盖。英文封面使用源页对应的英文页脚文字和布局。以源文件 XML 为唯一精确值；本文数值用于人工审核，不替代自动比对。

`assets/brand/efund-cover-water.jpeg` 是同一源媒体的修复副本，只在编辑引擎丢失布局图片时使用。恢复时必须替换 Shape ID 6 的底层媒体并保留布局对象；不得在幻灯片层新建图片，也不得把该图用于正文、章节页或结束页。

联名 Logo 槽固定如下：

- ID 10：`345365,2478781,915198,237951`
- ID 11：`1501950,2480708,702610,256529`
- ID 12：`2327614,2374908,1101405,468128`

允许替换这三个槽的底层图片，但必须保持 Shape ID、坐标、尺寸、裁切方式和层级不变。没有足够 Logo 时保留适用的既有槽结构，不新增第四个 Logo。

## 映射示例

```json
{
  "outputSlide": 1,
  "narrativeRole": "封面",
  "buildMode": "reuse",
  "coverProfile": "v6-cn-subtitle",
  "sourceSlide": 3,
  "visualTextBinding": {
    "exempt": true,
    "pageKind": "cover",
    "reason": "固定品牌封面仅承载题名和身份信息，必须保持标准家具"
  },
  "reuseEligibility": {
    "sameRelationship": true,
    "sameModuleCount": true,
    "sameDensity": true,
    "sameFocalHierarchy": true,
    "sameReadingOrder": true,
    "reason": "使用易方达标准中文主副标题封面，题名结构和身份信息槽与源页完全一致"
  },
  "editTargets": [
    {"shapeId": 3, "action": "replace-text", "role": "title-and-subtitle"},
    {"shapeId": 12, "action": "replace-text", "role": "identity-and-date"}
  ]
}
```

## 自动门禁

内置配置：

```bash
python "$SKILL_DIR/scripts/check_efund_cover.py" "$FINAL_PPTX" \
  --final-slide 1 --profile "$COVER_PROFILE" \
  --json-output "$QA_DIR/efund-cover.json"
```

用户模板：

```bash
python "$SKILL_DIR/scripts/check_efund_cover.py" "$FINAL_PPTX" \
  --final-slide 1 \
  --reference-pptx "$SOURCE_PPTX" --reference-slide "$SOURCE_COVER_SLIDE" \
  --json-output "$QA_DIR/efund-cover.json"
```

用户模板若确有既定 Logo 图片槽，可为每个槽追加 `--allow-picture-replacement "$SHAPE_ID"`；该参数只允许替换底层媒体，不放宽槽位坐标、尺寸、裁切和层级。

该门禁必须检查：画布、布局、所有可见封面对象的 Shape ID/类型/坐标/尺寸、文本段落数、有效字号、字体、字重、文本框边距与对齐，以及布局层的品牌家具。内置配置必须额外确认 Shape ID 6 仍为图片对象，并核对源媒体哈希、裁切、拉伸、坐标和尺寸；缺图、换图、改裁切或用色块替代均为硬错误。任一误差为硬错误。
