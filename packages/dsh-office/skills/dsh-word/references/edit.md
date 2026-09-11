# 修改已有 Word

1. `office_word_read(file_path, offset?, max_items?)` 读取正文、表格、页眉页脚和注释部件的段落，返回文件 `sha256`、段落 `id`、文本、样式和 `editable`。
2. 按 `nextOffset` 继续读取。`textTruncated=true` 表示只返回文本片段，选择可完整判断的目标。
3. 调用 `office_word_edit(file_path, expected_revision, output_file, operations)`。原件作为本次修改的不可变基线；输出使用新名称。

操作格式：

```json
[
  {"paragraph_id":"读取结果中的完整 id", "type":"replace_text", "find":"原始片段", "replace":"修改后的片段"},
  {"paragraph_id":"另一个完整 id", "type":"set_paragraph_style", "style_id":"Heading1"}
]
```

查找片段在目标段落中应当恰好出现一次。替换支持跨文本片段，保留原运行格式、超链接关系和书签/批注标记。新增文字继承第一个受影响片段的格式。换行、域、现有修订和绘图段落会标记为需要专用编辑能力。样式操作使用文件中已存在的段落样式。

段落 id 同时包含部件、位置和内容指纹，与读取的文件修订绑定。一个批次内使用同一次读取的定位符；下一批次重新读取最新输出。工具先完成整个批次的检查，再发布输出。

检查返回的 `changes`：文字修改范围符合请求；纯样式操作的 `before` 与 `after` 文字一致。`preservation` 列出保留部件和发生变化的部件，新增书签、批注和脚注链问题会阻止发布。基线已有问题单独列出。

最后用输出哈希调用 `office_preview` 并逐页查看。渲染与结构检查之后，Word/WPS 打开、编辑、保存、重开仍需实际执行证据。
