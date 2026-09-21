# 创建 Word 文档

`office_build` 接受 `language="javascript"`、`source`、`inputs` 和新的 `output_file`。运行时提供 docx-js 9.6.1 的 `docx` 命名空间，以及 `office.inputs`（按声明顺序排列的输入副本绝对路径）、`office.output`（主要 DOCX 路径）、`office.directory`（临时工作目录）。每个输入为 `{file_path, expected_revision}`；先通过 `office_source` 获取文件哈希。脚本最多 128 KiB，输入最多 8 个。

脚本在隔离目录中运行，目录外只开放所需运行库和系统资源；网络关闭。通过 `inputs` 声明需要的材料、图片和参考文件。使用 Node 标准库处理输入，使用 `docx` 命名空间生成原生对象。

可运行的最小例子：

```javascript
import { writeFile } from 'node:fs/promises';
const { Document, Paragraph, TextRun, HeadingLevel, Packer } = docx;
const document = new Document({
  styles: { default: { document: { run: { font: { ascii: 'Arial', eastAsia: 'PingFang SC' }, size: 22 } } } },
  sections: [{ children: [
    new Paragraph({ text: '项目进展', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: '本周结果', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun('根据项目材料填写真实结果。')] })
  ] }]
});
await writeFile(office.output, await Packer.toBuffer(document));
```

复杂文档继续使用 docx-js 的原生 `Table`、`ImageRun`、`Header`、`Footer`、`PageNumber`、`FootnoteReferenceRun`、`TableOfContents` 与分节配置。图片从声明的输入读取，保持宽高比；目录和页码按最终排版结果核对。正文先组织为数据，再生成段落，保留中文字体映射、合理页边距和表格列宽。

生成成功后检查 `inspection`，通过 `office_preview(file_path, expected_revision, output_file)` 生成 PDF，再逐页核对。生成失败返回具体执行信息，可修正脚本后重试；同名已有产物保留。

官方 API：[docx 文档](https://docx.js.org/api/modules.html)。现有 Word 局部修改使用 `word-edit` 参考。
