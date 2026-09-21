---
name: value-investing-scorecard
description: "Buffett/Graham value investing scorecard — evaluates a company across 20 criteria in four dimensions (moat, management, financials, valuation) for a 0-100 score. Triggered when users request a value-investing analysis, fundamental scoring, moat assessment, or ask 'is this company worth investing in', 'analyze the fundamentals of XX', or 'evaluate this using Buffett's method'."
license: MIT
---

# Buffett / Graham Value Investing Scorecard

A systematic **20-item** value investing evaluation framework built on the investment philosophies of Warren Buffett and Benjamin Graham. It covers four dimensions — Moat, Management, Financials, and Valuation — scoring each criterion for a target company to support rational investment decisions.

## How to Use

1. The user provides a target company name or stock ticker
2. Evaluate the company against all 20 criteria below
3. Score each item: **1** (Poor) / **2** (Below Average) / **3** (Good) / **4** (Excellent) / **5** (Outstanding)
4. Total possible score is 100; provide an overall rating at the end

### Rating Scale

| Score Range | Rating | Recommendation |
|-------------|--------|----------------|
| 85–100 | ★★★★★ Outstanding | Strong candidate — wait for a fair entry price |
| 70–84 | ★★★★ Excellent | Worthy of deep research; add to watchlist |
| 55–69 | ★★★ Average | Some risks present — carefully assess weaknesses |
| 40–54 | ★★ Weak | Does not meet value investing criteria; consider avoiding |
| < 40 | ★ Poor | Clearly not suitable for long-term holding |

---

## I. Moat — 5 Items

> Buffett: "The most important thing is determining the competitive advantage of a business, and above all, the durability of that advantage."

### 1. Brand Value & Consumer Mindshare

**Key Questions:**
- Do consumers choose this brand almost reflexively? (e.g., Coca-Cola, Apple)
- Does the brand have pricing power — can it raise prices without significantly losing volume?
- Does brand recognition span geographies and generations?

**Scoring Guide:**
- 5: Globally or nationally dominant brand with clear pricing power
- 3: Well-known within the industry, but limited pricing power
- 1: No brand recognition; competes purely on price

### 2. Switching Costs

**Key Questions:**
- How costly is it for customers to switch suppliers? (money, time, learning curve, data migration)
- Is the product deeply embedded in the customer's workflow or business systems?
- Are there contractual lock-ins, technical dependencies, or ecosystem ties?

**Scoring Guide:**
- 5: Extremely high switching costs — customers are virtually locked in (e.g., ERP systems, core banking platforms)
- 3: Moderate switching costs, but competitors can pry customers away with large incentives
- 1: Zero switching costs — customers can leave at any time

### 3. Network Effects

**Key Questions:**
- Does each new user increase the value for existing users?
- Are there two-sided market dynamics (more buyers attract more sellers, and vice versa)?
- Has the network reached critical mass, creating a winner-take-all dynamic?

**Scoring Guide:**
- 5: Strong two-sided network effects with monopoly or oligopoly dynamics (e.g., Visa's payment network)
- 3: Network effects present but not yet an absolute barrier
- 1: No network effects — product value is independent of user count

### 4. Cost Advantage & Economies of Scale

**Key Questions:**
- Is the company the lowest-cost producer in its industry?
- Does scaling up bring declining marginal costs?
- Is the cost advantage structural (resource endowments, patented processes, geographic location) rather than temporary?

**Scoring Guide:**
- 5: Structural cost advantage that competitors cannot replicate (e.g., Saudi Aramco's oil extraction costs)
- 3: Some scale advantage, but peers are not far behind
- 1: Cost structure on par with or higher than competitors

### 5. Barriers to Entry

**Key Questions:**
- How much capital would a new entrant need?
- Are there licensing, patent, or regulatory barriers?
- Is there a technology or know-how barrier?
- Has any successful new entrant disrupted the industry in the past 10 years?

**Scoring Guide:**
- 5: Extremely high barriers; no credible new entrant in the last decade (e.g., railroads, utilities)
- 3: Moderate barriers; occasional new entrants but unable to unseat leaders
- 1: Low barriers; new players flood in frequently

---

## II. Management — 5 Items

> Buffett: "I try to invest in businesses so good that even a fool can run them — because sooner or later, one will."

### 6. Management Integrity & Alignment with Shareholders

**Key Questions:**
- Does management candidly disclose risks and problems?
- Are there related-party transactions, self-dealing, or excessive compensation?
- Do management's actions match their words — have past promises been kept?
- How transparent and timely are disclosures?

**Scoring Guide:**
- 5: Highly principled management; proactively discloses bad news; compensation tied to performance
- 3: Generally acceptable, with occasional disclosure gaps
- 1: Integrity concerns on record; complex related-party transactions; questionable governance

### 7. Capital Allocation Skill

**Key Questions:**
- How does management deploy retained earnings? (reinvestment vs. dividends vs. buybacks vs. acquisitions)
- Have past acquisitions created value? Were acquisition multiples reasonable?
- Does ROIC consistently exceed WACC?
- Has management avoided large capex binges at cycle peaks?

**Scoring Guide:**
- 5: Outstanding capital allocation; long-term ROIC well above WACC; excellent M&A track record
- 3: Reasonable capital allocation with occasional missteps
- 1: Frequent value-destroying acquisitions or peak-cycle overexpansion

### 8. Insider Ownership & Buying Activity

**Key Questions:**
- What is the combined ownership stake of management and the board?
- Over the past 1–3 years, have insiders been net buyers or net sellers?
- Is ownership from open-market purchases (not just options)?

**Scoring Guide:**
- 5: Large insider ownership with continued buying — interests tightly aligned
- 3: Moderate ownership; neutral buying/selling activity
- 1: Persistent insider selling or negligible ownership

### 9. Management Track Record

**Key Questions:**
- How long has the CEO / core leadership been in place?
- How has the company performed (revenue, profit, share price) during their tenure?
- Has leadership successfully steered the company through industry downturns?
- How does management's execution compare to peers?

**Scoring Guide:**
- 5: Long tenure spanning multiple cycles; consistently outperforms the industry
- 3: Performance roughly in line with the industry average
- 1: Frequent leadership turnover, or persistent underperformance vs. peers

### 10. Corporate Culture & Succession Planning

**Key Questions:**
- Does the company have a clear mission, vision, and values that are genuinely practiced?
- How are employee satisfaction and talent retention?
- Is there a well-defined succession plan? Could the company run smoothly if the CEO left tomorrow?
- Is the organization capable of learning and adapting to change?

**Scoring Guide:**
- 5: Outstanding culture; robust succession plan; highly resilient organization
- 3: Reasonable culture; basic succession framework in place
- 1: Heavily reliant on one individual; no succession plan; high employee turnover

---

## III. Financials — 5 Items

> Graham: "An investment operation is one which, upon thorough analysis, promises safety of principal and an adequate return."

### 11. Long-Term ROE Consistency

**Key Questions:**
- Has ROE been consistently above 15% over the past 10 years?
- What drives ROE: high margins, high asset turnover, or high leverage? (DuPont analysis)
- Is the ROE trend stable/rising or declining?
- How does it compare to the industry average?

**Scoring Guide:**
- 5: ROE above 20% for 10 consecutive years, driven mainly by high margins and turnover
- 3: ROE fluctuates between 12%–18%, partly reliant on leverage
- 1: ROE consistently below 10% or highly volatile

### 12. Debt Levels & Solvency

**Key Questions:**
- Is the debt-to-asset ratio within a reasonable range for the industry?
- Is interest-bearing debt / EBITDA below 3×?
- Is the interest coverage ratio (EBIT / interest expense) above 5×?
- Short-term solvency: are the current and quick ratios healthy?
- Is the debt maturity profile well-spread, or is there concentration risk?

**Scoring Guide:**
- 5: Low debt or net cash position; interest coverage above 10×
- 3: Moderate debt; interest coverage 3–6×
- 1: High leverage; significant debt-service pressure; default risk

### 13. Free Cash Flow Generation

**Key Questions:**
- Has the company consistently produced positive free cash flow (FCF = operating cash flow − capex) over the past 5–10 years?
- Is FCF trending upward?
- Is FCF / net income above 80%? (measures cash quality of earnings)
- What is the split between maintenance capex and growth capex?

**Scoring Guide:**
- 5: Positive and steadily growing FCF for 10 consecutive years; FCF/net income above 90%
- 3: FCF positive in most years, with occasional fluctuations
- 1: FCF frequently negative; heavily dependent on external financing

### 14. Gross & Net Margin Trends

**Key Questions:**
- Is the gross margin stable or trending upward? (reflects pricing power and cost control)
- Where does the net margin rank within the industry?
- How volatile are margins? Are they highly cyclical?
- Are operating expenses (SG&A, R&D) well-controlled?

**Scoring Guide:**
- 5: Gross margin above 40% and stable over time; industry-leading net margin
- 3: Gross margin 20%–40%; average net margin
- 1: Gross margin below 20% and declining; razor-thin or negative net margin

### 15. Earnings Quality (Operating Cash Flow vs. Net Income)

**Key Questions:**
- Is operating cash flow / net income above 1×? (Are receivables and inventory healthy?)
- Are accounts receivable days trending worse?
- Are inventory days rising, indicating a buildup?
- Are there large non-recurring items or accounting adjustments inflating profits?

**Scoring Guide:**
- 5: Cash flow / net income above 1.2×; excellent receivables and inventory management; no accounting red flags
- 3: Cash flow / net income in the 0.8–1.1× range; occasional receivables growth
- 1: Cash flow / net income below 0.7×; surging receivables or bloated inventory

---

## IV. Valuation — 5 Items

> Graham: "The function of the margin of safety is, in essence, to make an accurate forecast of the future unnecessary."

### 16. Margin of Safety (Intrinsic Value vs. Market Price)

**Key Questions:**
- What is the estimated intrinsic value using DCF or an earnings-power model?
- Is the current price more than 25% below intrinsic value?
- Are the assumptions conservative? (growth rate, discount rate, terminal multiple)
- In the most pessimistic scenario, how large is the downside?

**Scoring Guide:**
- 5: Price more than 30% below conservative intrinsic value estimate — ample margin of safety
- 3: Price near fair value; margin of safety 10%–20%
- 1: Price above intrinsic value; no margin of safety or bubble territory

### 17. PE / PB Historical Percentile

**Key Questions:**
- Where does the current PE (price-to-earnings) sit relative to its 5–10 year range?
- Where does the current PB (price-to-book) sit historically?
- Is the valuation below the industry average and comparable peers?
- Is PE distorted by one-time or non-recurring items?

**Scoring Guide:**
- 5: PE/PB in the bottom 10% of their historical range; clearly below the industry average
- 3: PE/PB in the 30%–60% percentile range; neutral valuation
- 1: PE/PB in the top 20% of their historical range; expensive

### 18. Free Cash Flow Yield

**Key Questions:**
- FCF Yield = free cash flow / market cap — is it above 5%?
- Does it offer a significant premium over the 10-year government bond yield?
- Is FCF Yield improving or deteriorating?

**Scoring Guide:**
- 5: FCF Yield above 8%; well above the risk-free rate
- 3: FCF Yield between 4%–6%; slightly above the risk-free rate
- 1: FCF Yield below 2%; even lower than the risk-free rate

### 19. Earnings Yield vs. Risk-Free Rate

**Key Questions:**
- Is the earnings yield (E/P = 1/PE) meaningfully above the 10-year government bond yield?
- Graham's guideline: E/P should be at least 2× the risk-free rate
- In the current interest rate environment, how attractive are equities relative to bonds?

**Scoring Guide:**
- 5: E/P exceeds 2.5× the risk-free rate — highly attractive
- 3: E/P is roughly 1.5–2× the risk-free rate — moderately attractive
- 1: E/P below the risk-free rate — bonds look better

### 20. Dividend Yield & Dividend Growth

**Key Questions:**
- What is the current dividend yield? Is it above 2%?
- Has the dividend grown for multiple consecutive years? At what rate?
- Is the payout ratio sustainable? (below 70% is preferable)
- Does the company have a clear shareholder return policy (dividends + buybacks)?

**Scoring Guide:**
- 5: Dividend yield above 3%; 10+ consecutive years of growth; payout ratio below 60%
- 3: Dividend yield 1%–3%; growth is inconsistent
- 1: No dividend, or an extremely low yield with no growth

---

## Output Format

After completing the evaluation, present the results in the following format:

```
═══════════════════════════════════════════════════════════
            [Company Name] Value Investing Scorecard
═══════════════════════════════════════════════════════════

I. Moat                                   Subtotal: __/25
┌──────────────────────────────┬──────┬────────────────┐
│ Criterion                     │ Score│ Brief Note      │
├──────────────────────────────┼──────┼────────────────┤
│ 1. Brand Value & Mindshare    │ _/5  │                │
│ 2. Switching Costs            │ _/5  │                │
│ 3. Network Effects            │ _/5  │                │
│ 4. Cost Advantage & Scale     │ _/5  │                │
│ 5. Barriers to Entry          │ _/5  │                │
└──────────────────────────────┴──────┴────────────────┘

II. Management                            Subtotal: __/25
┌──────────────────────────────┬──────┬────────────────┐
│ Criterion                     │ Score│ Brief Note      │
├──────────────────────────────┼──────┼────────────────┤
│ 6. Integrity & Alignment      │ _/5  │                │
│ 7. Capital Allocation         │ _/5  │                │
│ 8. Insider Ownership          │ _/5  │                │
│ 9. Track Record               │ _/5  │                │
│ 10. Culture & Succession      │ _/5  │                │
└──────────────────────────────┴──────┴────────────────┘

III. Financials                           Subtotal: __/25
┌──────────────────────────────┬──────┬────────────────┐
│ Criterion                     │ Score│ Brief Note      │
├──────────────────────────────┼──────┼────────────────┤
│ 11. Long-Term ROE             │ _/5  │                │
│ 12. Debt & Solvency           │ _/5  │                │
│ 13. Free Cash Flow            │ _/5  │                │
│ 14. Margin Trends             │ _/5  │                │
│ 15. Earnings Quality          │ _/5  │                │
└──────────────────────────────┴──────┴────────────────┘

IV. Valuation                             Subtotal: __/25
┌──────────────────────────────┬──────┬────────────────┐
│ Criterion                     │ Score│ Brief Note      │
├──────────────────────────────┼──────┼────────────────┤
│ 16. Margin of Safety          │ _/5  │                │
│ 17. PE/PB Percentile          │ _/5  │                │
│ 18. FCF Yield                 │ _/5  │                │
│ 19. Earnings Yield vs Rf      │ _/5  │                │
│ 20. Dividend Yield & Growth   │ _/5  │                │
└──────────────────────────────┴──────┴────────────────┘

═══════════════════════════════════════════════════════════
Total: __/100    Rating: ★★★★★
═══════════════════════════════════════════════════════════

【Overall Assessment】
(2–3 paragraphs summarizing the company's investment merit, core strengths, key risks, and recommendations)

【Key Risk Warnings】
- Risk 1
- Risk 2
- Risk 3

【Investment Recommendation】
(Provide a clear recommendation: Strong Candidate / Worth Researching / Proceed with Caution / Avoid)
```

## Disclaimer

This scorecard is an analytical framework only and does not constitute investment advice. Investing involves risk; decisions should be made carefully. All scores are qualitative judgments and should be used alongside quantitative data and professional analysis.
