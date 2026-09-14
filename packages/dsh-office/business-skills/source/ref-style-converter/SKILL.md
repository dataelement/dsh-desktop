---
name: ref-style-converter
description: "参考文献格式转换工具，可在APA、MLA、IEEE、Harvard四种主流学术格式间相互转换，支持批量处理和格式错误检查。当用户需要转换参考文献格式、检查引用是否正确，或提到citation、bibliography、APA/MLA/IEEE/Harvard格式、批量格式化引用等关键词时触发。"
license: MIT
---

# Citation Formatter

参考文献格式转换工具，支持 APA (7th)、MLA (9th)、IEEE、Harvard 四种主流学术引用格式之间的相互转换，同时提供格式错误检查和批量处理能力。

## 支持的格式

| 格式 | 说明 | 示例 |
|------|------|------|
| APA | American Psychological Association 第7版 | `Smith, J. A. (2023). Title. *Journal*, *1*(2), 10-20.` |
| MLA | Modern Language Association 第9版 | `Smith, John A. "Title." *Journal*, vol. 1, no. 2, 2023, pp. 10-20.` |
| IEEE | Institute of Electrical and Electronics Engineers | `[1] J. A. Smith, "Title," *Journal*, vol. 1, no. 2, pp. 10-20, 2023.` |
| Harvard | Harvard Referencing Style | `Smith, J.A. (2023) 'Title', *Journal*, 1(2), pp. 10-20.` |

## Quick Start

### 1. 格式转换（文本输入）

将 APA 格式引用转为 IEEE 格式：

```bash
python3 scripts/citation_formatter.py convert --to ieee "Smith, J. A. (2023). Machine learning approaches. Nature, 12(3), 45-67."
```

### 2. 格式转换（结构化 JSON 输入，更精确）

```bash
echo '{"authors":["Smith, John A.","Jones, Mary B."],"year":"2023","title":"Machine learning approaches","journal":"Nature","volume":"12","issue":"3","pages":"45-67","entry_type":"article"}' | python3 scripts/citation_formatter.py format --style ieee
```

### 3. 格式错误检查

```bash
python3 scripts/citation_formatter.py check --style apa "Smith J (2023) Machine learning. Nature 12(3) 45-67"
```

### 4. 批量处理

```bash
# 从文件批量转换（每行一条引用）
python3 scripts/citation_formatter.py convert --to mla --input refs.txt

# 批量检查
python3 scripts/citation_formatter.py check --style apa --input refs.txt
```

### 5. 自动检测格式

```bash
python3 scripts/citation_formatter.py detect "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
```

## 子命令详细说明

### `format` — 结构化数据格式化

将 JSON 格式的结构化引用数据转为指定格式的引用文本。**这是最可靠的方式**，因为不需要解析文本。

```bash
# 通过 stdin 传入 JSON
echo '{"authors":["Zhang, Wei"],"year":"2024","title":"Deep Learning","publisher":"Springer","entry_type":"book"}' | python3 scripts/citation_formatter.py format --style harvard

# 通过 --data 参数传入
python3 scripts/citation_formatter.py format --style apa --data '{"authors":["Li, Ming"],"year":"2024","title":"AI Methods","journal":"Science","volume":"5","pages":"1-10","entry_type":"article"}'

# 批量：传入 JSON 数组文件
python3 scripts/citation_formatter.py format --style mla --input citations.json
```

**JSON 字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `authors` | `string[]` | ✓ | 作者列表，格式 `"姓, 名"` |
| `year` | `string` | ✓ | 出版年份 |
| `title` | `string` | ✓ | 标题 |
| `journal` | `string` | 期刊文章必填 | 期刊名称 |
| `volume` | `string` | | 卷号 |
| `issue` | `string` | | 期号 |
| `pages` | `string` | | 页码，如 `"45-67"` |
| `publisher` | `string` | 书籍必填 | 出版社 |
| `doi` | `string` | | DOI |
| `url` | `string` | | URL |
| `entry_type` | `string` | | `article` / `book` / `chapter` / `webpage` |
| `edition` | `string` | | 版次 |
| `city` | `string` | | 出版城市 |

### `parse` — 文本解析为结构化数据

```bash
python3 scripts/citation_formatter.py parse "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
# 输出 JSON 结构化数据
```

### `convert` — 格式互转

```bash
# 自动检测源格式，转为目标格式
python3 scripts/citation_formatter.py convert --to harvard "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."

# 指定源格式
python3 scripts/citation_formatter.py convert --from apa --to ieee "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."

# JSON 输出
python3 scripts/citation_formatter.py convert --to mla --json "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
```

### `check` — 格式错误检查

```bash
# 检查 APA 格式是否正确
python3 scripts/citation_formatter.py check --style apa "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."

# JSON 输出（方便程序处理）
python3 scripts/citation_formatter.py check --style apa --json "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
```

检查项目包括：
- 必填字段缺失（作者、标题、年份）
- 年份格式正确性
- 期刊文章的期刊名、卷号、页码
- 书籍的出版社信息
- DOI 格式
- 各格式特有的标点和结构规范

### `detect` — 自动检测格式

```bash
python3 scripts/citation_formatter.py detect "[1] J. Smith, \"Title,\" Nature, vol. 1, 2023."
# 输出: ieee
```

## 使用建议

1. **最可靠的方式**：先从用户输入中提取结构化信息，构造 JSON，然后用 `format` 子命令格式化
2. **快速转换**：如果用户已有标准格式的引用文本，直接用 `convert` 子命令
3. **批量处理**：将引用放入文件（每行一条），使用 `--input` 参数
4. **质量检查**：转换后用 `check` 子命令验证结果

## 前置条件

- Python 3.7+
- 无需安装额外依赖（仅使用标准库）
- 无需 API Key
