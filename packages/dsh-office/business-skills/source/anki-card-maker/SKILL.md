---
name: anki-card-maker
description: "Extract key knowledge from study materials (text, Markdown, notes) and generate front-question + back-answer flashcards, producing an Anki-compatible CSV file ready for import. Trigger when users mention flashcards, Anki, spaced repetition, need to convert notes into Q&A pairs, or request memory cards or review cards from their study content."
license: MIT
---

# anki-card-maker

Automatically extracts knowledge points from study materials and generates flashcards in "front question + back answer" format, outputting a CSV file ready for direct import into [Anki](https://apps.ankiweb.net/).

Two working modes are supported:
- **auto mode**: Rule-based extraction of definitions, Q&A pairs, lists, and other structured knowledge from Markdown/plain text
- **json mode**: Accepts pre-constructed JSON flashcard data and formats it as Anki CSV

## Quick Start

```bash
# Auto-extract flashcards from Markdown notes
python scripts/generate_flashcards.py --input notes.md --output flashcards.csv

# Generate Anki CSV from JSON data (ideal for agent calls)
python scripts/generate_flashcards.py --mode json --input cards.json --output flashcards.csv

# Use via stdin/stdout
cat notes.md | python scripts/generate_flashcards.py > flashcards.csv
```

## Agent Workflow

When a user provides study materials and requests flashcard generation, the recommended workflow is:

1. **Read the material**: Read the study material file provided by the user
2. **Intelligent extraction**: Analyze the material content, extract core knowledge points, and generate high-quality Q&A pairs. Follow these principles:
   - Each card focuses on a single knowledge point (minimum information principle)
   - Use precise question format on the front; avoid vague questions
   - Provide concise but complete answers on the back
   - Cover core concepts, definitions, formulas, cause-and-effect relationships, comparisons, etc.
3. **Generate CSV**: Write the extracted Q&A pairs as JSON, then call the script to convert to Anki CSV
4. **Deliver the file**: Inform the user of the output path and import instructions

### Agent Call Example

Construct extracted knowledge points as a JSON array and convert to CSV via `--mode json`:

```bash
cat <<'EOF' > /tmp/cards.json
[
  {"front": "What is photosynthesis?", "back": "The process by which plants use light energy to convert CO₂ and H₂O into organic matter while releasing O₂", "tags": "biology"},
  {"front": "What is the chemical equation for photosynthesis?", "back": "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", "tags": "biology"}
]
EOF
python scripts/generate_flashcards.py --mode json --input /tmp/cards.json --output flashcards.csv
```

## Parameters

| Parameter | Description | Default |
|---|---|---|
| `--input, -i` | Input file path | stdin |
| `--output, -o` | Output CSV file path | stdout |
| `--mode, -m` | Extraction mode: `auto` (rule-based) or `json` (structured input) | auto |
| `--no-tags` | Omit the tags column | tags included |
| `--separator, -s` | CSV separator: `\t`, `;`, `,` | Tab |

## Output Format

The generated CSV follows the Anki import specification:

```
#separator:Tab
#html:true
#columns:Front	Back	Tags
What is photosynthesis?	The process by which plants use light energy to convert CO₂ and H₂O into organic matter while releasing O₂	biology
```

### How to Import into Anki

1. Open Anki → File → Import
2. Select the generated CSV file
3. Anki will automatically detect the separator and column mapping
4. Confirm and click "Import"

## Knowledge Structures Supported in Auto Mode

| Structure Type | Example | Generated Flashcard |
|---|---|---|
| Definition (Term: Definition) | `Photosynthesis: Plants use light energy...` | Q: What is photosynthesis? A: Plants use light energy... |
| Q&A pair | `Q: What is DNA? A: Deoxyribonucleic acid` | Extracted directly as a flashcard |
| Heading + list | `## Organelles - Mitochondria - Ribosome` | Q: What are the key points of Organelles? A: List |
| Heading + paragraph | `## Newton's First Law An object at rest...` | Q: Explain: Newton's First Law A: Paragraph content |

## Prerequisites

- Python 3.6+
- No additional dependencies required (uses standard library only)
