---
name: cite-style-converter
description: "Convert academic citations between APA, MLA, IEEE, and Harvard styles with batch processing and format validation. Trigger when users ask to convert, check, or fix their references, mention specific citation styles, or talk about their bibliography."
license: MIT
---

# Cite Style Converter

An academic citation style conversion tool supporting APA (7th), MLA (9th), IEEE, and Harvard — the four most widely used citation formats. It enables cross-format conversion, format validation, and batch processing.

## Supported Styles

| Style | Description | Example |
|-------|-------------|---------|
| APA | American Psychological Association, 7th ed. | `Smith, J. A. (2023). Title. *Journal*, *1*(2), 10-20.` |
| MLA | Modern Language Association, 9th ed. | `Smith, John A. "Title." *Journal*, vol. 1, no. 2, 2023, pp. 10-20.` |
| IEEE | Institute of Electrical and Electronics Engineers | `[1] J. A. Smith, "Title," *Journal*, vol. 1, no. 2, pp. 10-20, 2023.` |
| Harvard | Harvard Referencing Style | `Smith, J.A. (2023) 'Title', *Journal*, 1(2), pp. 10-20.` |

## Quick Start

### 1. Convert by Text Input

Convert an APA citation to IEEE format:

```bash
python3 scripts/citation_formatter.py convert --to ieee "Smith, J. A. (2023). Machine learning approaches. Nature, 12(3), 45-67."
```

### 2. Convert by Structured JSON Input (More Precise)

```bash
echo '{"authors":["Smith, John A.","Jones, Mary B."],"year":"2023","title":"Machine learning approaches","journal":"Nature","volume":"12","issue":"3","pages":"45-67","entry_type":"article"}' | python3 scripts/citation_formatter.py format --style ieee
```

### 3. Format Validation

```bash
python3 scripts/citation_formatter.py check --style apa "Smith J (2023) Machine learning. Nature 12(3) 45-67"
```

### 4. Batch Processing

```bash
# Batch convert from a file (one citation per line)
python3 scripts/citation_formatter.py convert --to mla --input refs.txt

# Batch validate
python3 scripts/citation_formatter.py check --style apa --input refs.txt
```

### 5. Auto-Detect Style

```bash
python3 scripts/citation_formatter.py detect "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
```

## Subcommand Reference

### `format` — Format Structured Data

Converts structured citation data in JSON into a formatted citation string. **This is the most reliable method** since it doesn't require text parsing.

```bash
# Pass JSON via stdin
echo '{"authors":["Zhang, Wei"],"year":"2024","title":"Deep Learning","publisher":"Springer","entry_type":"book"}' | python3 scripts/citation_formatter.py format --style harvard

# Pass JSON via --data flag
python3 scripts/citation_formatter.py format --style apa --data '{"authors":["Li, Ming"],"year":"2024","title":"AI Methods","journal":"Science","volume":"5","pages":"1-10","entry_type":"article"}'

# Batch: pass a JSON array file
python3 scripts/citation_formatter.py format --style mla --input citations.json
```

**JSON Field Reference:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `authors` | `string[]` | Yes | List of authors in `"Last, First"` format |
| `year` | `string` | Yes | Publication year |
| `title` | `string` | Yes | Title of the work |
| `journal` | `string` | For articles | Journal name |
| `volume` | `string` | | Volume number |
| `issue` | `string` | | Issue number |
| `pages` | `string` | | Page range, e.g. `"45-67"` |
| `publisher` | `string` | For books | Publisher name |
| `doi` | `string` | | DOI |
| `url` | `string` | | URL |
| `entry_type` | `string` | | `article` / `book` / `chapter` / `webpage` |
| `edition` | `string` | | Edition |
| `city` | `string` | | City of publication |

### `parse` — Parse Text into Structured Data

```bash
python3 scripts/citation_formatter.py parse "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
# Outputs structured JSON
```

### `convert` — Convert Between Styles

```bash
# Auto-detect source style, convert to target
python3 scripts/citation_formatter.py convert --to harvard "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."

# Specify source style explicitly
python3 scripts/citation_formatter.py convert --from apa --to ieee "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."

# JSON output
python3 scripts/citation_formatter.py convert --to mla --json "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
```

### `check` — Validate Citation Format

```bash
# Check if a citation conforms to APA style
python3 scripts/citation_formatter.py check --style apa "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."

# JSON output (useful for programmatic processing)
python3 scripts/citation_formatter.py check --style apa --json "Smith, J. A. (2023). Title. Nature, 12(3), 45-67."
```

Validation checks include:
- Missing required fields (author, title, year)
- Year format correctness
- Journal name, volume, and page numbers for journal articles
- Publisher information for books
- DOI format
- Style-specific punctuation and structural conventions

### `detect` — Auto-Detect Citation Style

```bash
python3 scripts/citation_formatter.py detect "[1] J. Smith, \"Title,\" Nature, vol. 1, 2023."
# Output: ieee
```

## Usage Tips

1. **Most reliable method**: Extract structured information from user input, build the JSON, then use the `format` subcommand
2. **Quick conversion**: If the user already has properly formatted citation text, use the `convert` subcommand directly
3. **Batch processing**: Place citations in a file (one per line) and use the `--input` flag
4. **Quality assurance**: After conversion, verify results with the `check` subcommand

## Prerequisites

- Python 3.7+
- No additional dependencies required (uses only the standard library)
- No API key needed
