---
name: scholarly-writing-refiner
description: "Polishes academic English paragraph by paragraph, reviewing grammar, word choice, voice, coherence, and sentence structure. Outputs revision suggestions alongside polished text. Triggered by phrases like 'polish this paragraph,' 'check the grammar,' 'rewrite in academic English,' or keywords like manuscript editing, SCI polishing, and journal submission editing."
license: MIT
---

# Scholarly Writing Refiner — Academic Paper English Polishing Knowledge Base

Helps users review and polish English papers paragraph by paragraph according to international academic journal standards. Covers grammar correction, academic word choice optimization, voice normalization, coherence strengthening, sentence variety, and more. Outputs revision suggestions along with the polished text.

## Quick Start

Users only need to provide:
1. **Text to polish**: One or more paragraphs of English paper content
2. **Paper type** (optional): Journal article / Conference paper / Thesis or dissertation / Review article
3. **Target journal/field** (optional): e.g., Nature, IEEE, AAAI, Medicine, Computer Science, etc.
4. **Polishing focus** (optional): Comprehensive polish / Grammar only / Word choice only / Coherence only

Example:
> "Polish this Introduction for me. The target venue is NeurIPS, and I'd like the language to sound more natural with better logical flow."

---

## 1. Review Dimensions Overview

Polishing is carried out across 5 dimensions. Each dimension is rated independently with specific revision suggestions:

| Dimension | Label | Review Focus |
|-----------|-------|-------------|
| Grammar | Grammar | Subject-verb agreement, tense, articles, prepositions, clause structure, punctuation |
| Word Choice | Word Choice | Academic register, precision, collocation, avoidance of colloquialisms |
| Voice | Voice & Tense | Active/passive voice selection, tense consistency |
| Coherence | Coherence & Cohesion | Intra-paragraph and inter-paragraph transitions, argumentation chain, use of signaling words |
| Sentence Structure | Sentence Structure | Sentence variety, balance of long and short sentences, coordination and subordination |

---

## 2. Grammar Review Rules

### 2.1 Common Grammar Errors Checklist

| Error Type | Incorrect Example | Correction | Explanation |
|-----------|------------------|------------|-------------|
| Subject-verb disagreement | The results of the experiment **shows**... | The results of the experiment **show**... | Subject is "results" (plural) |
| Missing/misused article | We propose **method** to solve... | We propose **a method** to solve... | Singular countable nouns require an article |
| Dangling modifier | **Using the proposed method,** the accuracy was improved. | **Using the proposed method, we** improved the accuracy. | The implied subject of a participial phrase must match the main clause subject |
| Run-on sentence | The model performs well **,** it achieves 95% accuracy. | The model performs well**;** it achieves 95% accuracy. / The model performs well**. It** achieves 95% accuracy. | A comma cannot join two independent clauses |
| Incomplete comparison | Our method is **more efficient**. | Our method is **more efficient than the baseline**. | Comparatives require an explicit object of comparison |
| Broken parallelism | The system can **detect, classify,** and **is able to segment**... | The system can **detect, classify, and segment**... | Coordinated elements must share the same grammatical form |
| that/which confusion | The model **which** we proposed... | The model **that** we proposed... | Restrictive relative clauses use "that" |
| Irregular plurals | These **phenomenon** indicate... | These **phenomena** indicate... | Watch for irregular plural forms |

### 2.2 Punctuation Rules

| Rule | Correct Usage | Common Mistake |
|------|--------------|----------------|
| Serial comma (Oxford comma) | A, B**,** and C | A, B and C (the Oxford comma is recommended in academic writing) |
| Em dash | We used three models — A, B, and C — for comparison. | An em dash with spaces on both sides, or without spaces (depends on journal style) |
| Capitalization after colon | Capitalize if a complete sentence follows: **The** result is clear: **The** model outperforms... | Do not capitalize if a fragment follows |
| Quotation marks and periods | American style: period **inside** quotes. British style: period **outside** quotes. | Choose based on the target journal's regional convention |
| Abbreviation periods | e.g., i.e., et al., etc. | Note the comma: e.g.**,** / i.e.**,** |

### 2.3 Tense Guidelines by Paper Section

| Section | Recommended Tense | Example |
|---------|-------------------|---------|
| Abstract | Past tense (what was done) + present tense (conclusions) | "We **proposed** a method... The results **show** that..." |
| Introduction | Present tense (current knowledge/consensus) + past tense (prior work) | "Deep learning **has become**... Smith et al. **demonstrated** that..." |
| Methods | Past tense (experimental procedures) | "We **trained** the model on... The data **were** preprocessed..." |
| Results | Past tense (experimental findings) | "The model **achieved** 95% accuracy. Table 2 **shows**..." |
| Discussion | Present tense (interpreting significance) + past tense (citing results) | "This result **suggests** that... Our findings **indicated** that..." |
| Conclusion | Past tense (summarizing work) + present tense (contributions/significance) | "We **proposed** and **evaluated**... This work **contributes** to..." |

---

## 3. Word Choice Optimization Rules

### 3.1 Colloquial → Academic Substitution Table

| Colloquial | Academic Alternative | Context Notes |
|-----------|---------------------|---------------|
| a lot of | numerous / a substantial number of / considerable | Choose based on what is being modified |
| get | obtain / acquire / achieve / attain | Choose based on collocation |
| show | demonstrate / illustrate / indicate / reveal | "demonstrate" emphasizes proof; "indicate" emphasizes suggestion |
| big / huge | substantial / significant / considerable | |
| thing | factor / aspect / element / component | |
| good | effective / favorable / advantageous / robust | |
| bad | adverse / detrimental / suboptimal / inferior | |
| use | employ / utilize / leverage / adopt | "utilize" is more formal than "use"; "leverage" emphasizes exploiting an advantage |
| about | approximately / roughly / circa | Use "approximately" for numerical descriptions |
| try | attempt / endeavor | |
| look at | examine / investigate / analyze / explore | |
| find out | determine / ascertain / identify / discover | |
| go up / go down | increase / decrease / rise / decline | |
| point out | highlight / emphasize / underscore | |
| deal with | address / tackle / handle / mitigate | |
| make sure | ensure / verify / confirm | |
| kind of / sort of | somewhat / to some extent / partially | |
| start / begin | initiate / commence / undertake | |
| end / finish | conclude / terminate / complete | |
| help | facilitate / enable / assist / contribute to | |
| need | require / necessitate | |
| can | is capable of / is able to / has the potential to | Avoid over-substitution — "can" is acceptable in academic writing |

### 3.2 Vague → Precise Expression

| Vague Expression | Precise Alternative | Notes |
|-----------------|---------------------|-------|
| very good results | statistically significant improvement / a 12% increase in accuracy | Replace vague modifiers with concrete data |
| some researchers | Several studies (Chen et al., 2023; Li et al., 2024) | Replace vague references with specific citations |
| recently | In the past five years / Since 2020 | Provide a time range |
| a few | three / a small number of (n=3) | Specify the quantity |
| it is known that | Prior work has established that (citation) | Support with a citation |
| this is important | This is critical for / This has significant implications for | Explain why it matters |

### 3.3 Reducing Redundancy

| Redundant Expression | Concise Version |
|---------------------|----------------|
| in order to | to |
| due to the fact that | because / since |
| at the present time | currently / now |
| it is worth noting that | Notably, / Note that |
| it should be pointed out that | (state the content directly) |
| a total of 50 samples | 50 samples |
| the vast majority of | most |
| in the event that | if |
| has the ability to | can |
| on a daily basis | daily |
| in close proximity to | near |
| take into consideration | consider |
| is in agreement with | agrees with |
| serves the function of | functions as |

---

## 4. Voice Guidelines

### 4.1 Active vs. Passive Voice Selection

| Scenario | Recommended Voice | Example |
|----------|-------------------|---------|
| Describing the authors' actions | Active (We) | **We** trained the model using... |
| Describing general methods/established facts | Passive | The data **were** collected from... |
| Emphasizing the object of an action | Passive | The samples **were analyzed** using mass spectrometry. |
| Reporting results | Prefer active | **Our method achieves** 95% accuracy. |
| Describing equipment/materials | Passive | The solution **was heated** to 100°C. |

### 4.2 Common Voice Issues

| Issue | Incorrect Example | Correction |
|-------|-------------------|------------|
| Overuse of passive | It was found by us that the results were improved by the method. | We found that our method improved the results. |
| Inconsistent person | The author proposes... We then evaluate... | Use "We" or "The authors" consistently |
| Meaningless passive | It can be seen that accuracy increases. | Accuracy increases. / The results show that accuracy increases. |

### 4.3 Academic Person Conventions

| Person | Use Case | Notes |
|--------|----------|-------|
| We | Describing the authors' own work (most common) | Many journals accept "We" even for single-author papers |
| The authors | A more formal alternative | Some journals prefer this usage |
| I | Single-author theses and dissertations | Some journals do not accept this |
| One | Generic/hypothetical statements | Somewhat old-fashioned; less common in modern academic writing |

---

## 5. Coherence and Cohesion Rules

### 5.1 Intra-Paragraph Signaling Words

| Logical Relationship | Signal Words/Phrases | Example |
|---------------------|---------------------|---------|
| Addition | Furthermore, Moreover, Additionally, In addition | Furthermore, our method generalizes well to unseen data. |
| Contrast | However, In contrast, Conversely, On the other hand, Nevertheless | However, this approach suffers from high computational cost. |
| Cause & Effect | Therefore, Consequently, As a result, Hence, Thus | Therefore, we adopt a two-stage training strategy. |
| Exemplification | For example, For instance, Specifically, In particular | Specifically, we focus on the image classification task. |
| Emphasis | Indeed, Notably, Importantly, It is worth noting that | Notably, the improvement is consistent across all datasets. |
| Concession | Although, Despite, Notwithstanding, While, Even though | Although the model is simple, it achieves competitive results. |
| Summary | In summary, To summarize, Overall, In conclusion | Overall, the proposed method outperforms existing baselines. |
| Qualification | Yet, Still, Nonetheless, That said | That said, there are several limitations to our approach. |
| Sequence | First, Second, Finally, Subsequently, Then | First, we preprocess the data. Subsequently, we train the model. |
| Condition | If, Provided that, Given that, Assuming that | Given that the dataset is imbalanced, we apply oversampling. |

### 5.2 Inter-Paragraph Transition Patterns

| Pattern | Description | Example Opening Sentence |
|---------|-------------|--------------------------|
| Hook | The end of one paragraph leads into the next topic | "This raises the question of how to efficiently scale the model." |
| Recap | The next paragraph opens by revisiting the prior conclusion | "Having established the effectiveness of our approach, we now turn to..." |
| Contrast Bridge | Points out the shortcomings of the prior approach, introducing the current one | "While these methods achieve reasonable accuracy, they fail to address..." |
| Question Bridge | Uses a question to create a transition | "How can we overcome this limitation? In this section, we propose..." |
| Topic Sentence | The first sentence of each paragraph summarizes the core argument | "The key advantage of our method is its ability to..." |

### 5.3 Common Coherence Problems

| Problem | Description | Fix Strategy |
|---------|-------------|-------------|
| Jumping argumentation | Leaping from A to C without the B step | Add intermediate reasoning steps or transitional sentences |
| Signal word overuse | Starting every sentence with However / Moreover | Reduce signal words; use sentence structure to convey logic |
| Signal word misuse | Using "Furthermore" to express contrast | Use "However" for contrast; "Furthermore" for addition |
| Overly long paragraphs | A single paragraph exceeding 8–10 sentences | Split into 2–3 paragraphs by argument point |
| Overly short paragraphs | A paragraph with only 1–2 sentences | Merge into a related paragraph or expand the discussion |
| Unclear reference | "This shows..." — what does "this" refer to? | "This result shows..." / "This finding indicates..." |

---

## 6. Sentence Structure Optimization Rules

### 6.1 Strategies for Sentence Variety

| Strategy | Original | Improved |
|----------|----------|----------|
| Participial phrase opening | We use attention mechanism, and we improve accuracy. | **Leveraging** the attention mechanism, we improve accuracy. |
| Inversion for emphasis | The improvement is particularly notable in low-resource settings. | **Particularly notable** is the improvement in low-resource settings. |
| Appositive insertion | The model, which was proposed by Smith, achieves... | The model, **proposed by Smith (2023),** achieves... |
| Nominalization | We improved the model, and this led to... | **The improvement of the model** led to... |
| Parallel structure | The method is fast. It is also accurate. It is scalable too. | The method is **fast, accurate, and scalable**. |
| Fronted adverbial | Accuracy improved significantly when we added data augmentation. | **With data augmentation,** accuracy improved significantly. |

### 6.2 Sentence Structure Problems to Avoid

| Problem | Example | Fix |
|---------|---------|-----|
| Overly long sentences (>40 words) | We trained the model on the dataset which was collected from ... and preprocessed using ... and then evaluated on ... | Split into 2–3 shorter sentences |
| Consecutive short sentences | The accuracy is high. The model is fast. It uses less memory. | Combine: The model achieves high accuracy with fast inference and low memory consumption. |
| Starting with There is/are | There are many studies that focus on... | Many studies focus on... |
| Overuse of It is...that cleft sentences | It is the attention mechanism that improves... | The attention mechanism improves... |
| Noun pile-ups | deep learning image classification model performance | the performance of a deep learning model for image classification |

---

## 7. Section-Specific Polishing Guide

### 7.1 Abstract

- **Length**: 150–300 words (follow the target journal's requirements)
- **Structure**: Background (1–2 sentences) → Problem/Motivation (1 sentence) → Method (2–3 sentences) → Results (1–2 sentences) → Conclusion/Significance (1 sentence)
- **Tense**: Past tense for describing the work, present tense for conclusions
- **Avoid**: No citations, no abbreviations without first defining them in full, no figure or table numbers

### 7.2 Introduction

- **Structure** (classic "funnel" approach): Broad context → Specific problem → Existing methods and their limitations → Proposed method/contributions → Paper outline
- **Key points**: Each paragraph must have a clear topic sentence; be objective when reviewing prior work — do not disparage
- **Common patterns**:
  - "In recent years, ... has attracted increasing attention."
  - "Despite significant progress, ... remains a challenge."
  - "To address this issue, we propose..."
  - "The main contributions of this paper are as follows:"

### 7.3 Related Work

- **Strategy**: Organize by theme (not chronologically); within each group, arrange chronologically
- **Key points**: Explain how each work relates to the current paper; avoid mere listing — provide commentary
- **Transitions**: Connect each group with transitional sentences
- **Common patterns**:
  - "A closely related line of work focuses on..."
  - "In contrast to these approaches, our method..."
  - "Building upon the work of X, we extend..."

### 7.4 Methods

- **Principle**: Reproducibility — the reader should be able to replicate the experiment from the description alone
- **Structure**: Problem formulation → Overall framework → Detailed module descriptions → Training/optimization details
- **Key points**: Define all mathematical symbols upon first appearance; describe steps in execution order

### 7.5 Results / Experiments

- **Structure**: Experimental setup → Main results → Ablation studies → Analysis/Discussion
- **Key points**: Describe trends in text first, then reference tables/figures; avoid repeating numbers already shown in tables or figures
- **Common patterns**:
  - "As shown in Table X, our method outperforms..."
  - "We observe a consistent improvement of X% across..."
  - "The ablation study reveals that..."

### 7.6 Discussion

- **Content**: Interpret the significance of results → Compare with prior work → Limitations → Future directions
- **Key points**: Do not shy away from limitations; the discussion should go beyond the results themselves and explore broader implications

### 7.7 Conclusion

- **Length**: Typically one paragraph, 150–250 words
- **Structure**: Summarize the method → Core findings → Significance/Contributions → Future work
- **Avoid**: Do not introduce new information or data; do not simply repeat the Abstract

---

## 8. Polishing Output Format

For each paragraph of text provided by the user, output in the following format:

```
### Original
[User's original text]

### Review

| Dimension | Rating | Key Issues |
|-----------|--------|-----------|
| Grammar | ✓ Good / △ Needs improvement / ✗ Significant issues | Brief description |
| Word Choice | ✓ / △ / ✗ | Brief description |
| Voice | ✓ / △ / ✗ | Brief description |
| Coherence | ✓ / △ / ✗ | Brief description |
| Sentence Structure | ✓ / △ / ✗ | Brief description |

### Detailed Changes
1. **Original**: "..."
   **Revised**: "..."
   **Reason**: [Specific rationale citing the rules above]

2. ...

### Polished Version
[Complete polished paragraph]
```

---

## 9. Domain-Specific Notes

Different disciplines have their own writing conventions. Respect field-specific norms when polishing:

| Field | Characteristics | Notes |
|-------|----------------|-------|
| Computer Science | Active voice ("We") is common | More colloquial phrasing is tolerated (e.g., "we run"); algorithm descriptions must be precise |
| Medicine/Biology | Passive voice predominates | "Patients were randomized..."; terminology must conform to MeSH standards |
| Physics | Concise, equation-driven | Mathematical derivations must be rigorous; "one can show that..." is common |
| Social Sciences | Frequent use of hedging | "may," "might," "suggests"; avoid overly absolute statements |
| Engineering | Results-oriented | Emphasis on performance metrics and experimental validation |

---

## 10. Agent Behavior Guide

When the user submits text for polishing, follow this workflow:

1. **Confirm details**: Paper type, target journal/conference (if any), polishing focus
2. **Identify the section**: Determine which part of the paper the text belongs to and apply the corresponding section guidelines
3. **Five-dimension review**: Check systematically: Grammar → Word Choice → Voice → Coherence → Sentence Structure
4. **Annotate sentence by sentence**: Provide a reason for every change, citing the specific rule
5. **Output the polished version**: Deliver the complete polished text
6. **Summarize recommendations**: Highlight the main categories of issues and directions for improvement

**Core Principles**:
- Preserve the author's original meaning and argumentation logic; do not alter technical content
- Minimize changes — if a single word can be changed instead of a whole sentence, change only the word; if a sentence can be changed instead of a whole paragraph, change only the sentence
- When uncertain whether something is an error, present it as a suggestion rather than making the change outright
- Defer to the author's terminology unless it is clearly incorrect
- Do not modify content the user has marked as "please keep"
