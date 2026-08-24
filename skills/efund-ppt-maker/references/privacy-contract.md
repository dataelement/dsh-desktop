# PPT 隐私与脱敏约定

内置案例和对外成品都必须做到“无法从可见内容、隐藏部件或媒体文件恢复被清理的信息”。脱敏只改变具体身份和业务数值，不改变页面关系、品牌家具、字体层级、可编辑性和版式教学价值。

## 需要清理的内容

- 人员：姓名、账号、头像、邮箱、手机号、工号、编辑者和批注作者。
- 业务：非公开项目名、客户或产品代号、精确经营指标、模型评测值、内部规模、预算、日期水印和运行截图。
- 隐藏内容：演讲者备注正文、批注、人员部件、自定义属性、旧封面缩略图、本机路径和外部文件关系。
- 嵌入对象：Excel、Word、PowerPoint 等嵌入 Office 文件的作者、自定义属性、外部关系和可识别文本。
- 图片：截图、扫描件和表格图片中的姓名、账号、数值、时间戳或水印。

公开来源数据可以保留，但必须有明确来源且不会与内部经营数据混淆。无法确认公开性的内容一律按敏感信息处理。

## 脱敏方式

1. 人物姓名和账号改为“内部分享”“示例用户”等中性文本，不留空白姓名框。
2. 精确指标改为自然语言量级或区间，例如“千亿级”“数百”“多数达到良好”。可编辑正文禁止使用 `XXX`、`待填写` 等模板提示语。
3. 备注保留 Office 必需结构，但正文统一替换为“备注已脱敏”；兼容性优先时使用 `--clear-notes`，不要默认物理删除备注母版。
4. 图片中的敏感内容必须替换底层媒体部件，或制作同尺寸、明确标注为匿名数据的示意图。禁止只在图片上覆盖矩形，因为遮罩可被移除。
5. 修改必须在副本上进行。用户提供的原始文件不得覆盖；输出文件应使用新的名称或位于独立输出目录。

## 执行命令

```bash
python "$SKILL_DIR/scripts/sanitize_pptx_metadata.py" \
  "$SOURCE_PPTX" "$CLEAN_PPTX" \
  --replace-map "$REPLACEMENT_MAP" \
  --clear-notes --remove-comments --remove-thumbnails \
  --neutralize-external-links
```

图片部件替换示例：

```bash
python "$SKILL_DIR/scripts/sanitize_pptx_metadata.py" \
  "$SOURCE_PPTX" "$CLEAN_PPTX" \
  --replace-part "ppt/media/image1.png=$SCRATCH/anonymous-image1.png"
```

每个项目把已识别的敏感字面值逐项加入隐私审计：

```bash
python "$SKILL_DIR/scripts/audit_pptx_privacy.py" \
  "$CLEAN_PPTX" \
  --deny-text "<姓名或内部代号>" \
  --deny-text "<精确内部指标>" \
  --require-redacted-notes --require-no-comments \
  --require-no-thumbnails --require-no-external-links \
  --warnings-as-errors
```

## 验收

- 隐私审计必须为 `Errors: 0; Warnings: 0`。
- 对 PPTX 外层和嵌入 Office 包进行全文搜索，不得命中敏感字面值、本机绝对路径或编辑者信息。
- 重新渲染全部页面并逐页检查；重点放大封面、截图页、KPI 页、图表页和图片表格。
- 对脱敏前后的结构 QA 进行比较，不得新增错误；原有模板警告只能按对象登记，不能扩散。
- 确认页数、母版、布局、组合、图表、字体、图片裁切和可编辑性保持正常。
