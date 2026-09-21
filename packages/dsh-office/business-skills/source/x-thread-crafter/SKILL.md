---
name: x-thread-crafter
description: "Craft engaging Twitter/X threads from long-form content, with ≤280-character tweets, a compelling hook opener, and a clear CTA closing. Triggered when users provide articles, blog posts, or essays and ask to \"make this a thread,\" \"tweet this,\" \"break this into tweets,\" or repurpose content for Twitter/X."
license: MIT
---

# Twitter/X Thread Composer

Transform long-form content into compelling Twitter/X threads that maximize engagement. Each tweet stays within the 280-character limit, the first tweet hooks the reader, and the final tweet drives action.

## When to Use

- User provides a long article, blog post, essay, or any text and wants it turned into a Twitter/X thread
- User asks to "make this a thread," "tweet this," or "break this into tweets"
- User wants to repurpose content for Twitter/X

## Input

The user provides long-form text (article, blog post, notes, talking points, etc.) and optionally specifies:

- Target audience
- Desired tone (professional, casual, provocative, educational)
- Specific CTA (e.g., "follow me," "check out the link," "share this")
- Whether to include thread numbering

## SOP — Step-by-Step Process

### Step 1: Analyze the Source Text

Read the full input and identify:

1. **Core thesis** — the single main idea in one sentence
2. **Key supporting points** — 3-7 distinct arguments, facts, or stories
3. **Most surprising or counterintuitive element** — this becomes hook material
4. **Natural conclusion or takeaway** — this feeds the CTA

### Step 2: Craft the Hook (Tweet 1)

The first tweet must stop the scroll. Use one of these proven hook patterns:

| Pattern | Example |
|---|---|
| Contrarian claim | "Most people think X. They're wrong. Here's why:" |
| Surprising statistic | "87% of startups fail for a reason nobody talks about:" |
| Bold promise | "I spent 5 years studying X. Here are 7 lessons that changed everything:" |
| Relatable pain point | "You've been doing X wrong your entire career. A thread 🧵" |
| Story opener | "In 2019, I lost everything. What happened next taught me more than any MBA:" |

Rules for the hook tweet:

- Must be ≤ 280 characters (hard limit)
- End with a thread indicator: 🧵 or "A thread:" or "Thread 👇"
- Do NOT start with "Thread:" or "1/" — the hook must stand alone in the timeline
- No hashtags in the hook tweet — they reduce engagement on tweet 1

### Step 3: Split Content into Body Tweets

Break the key points into individual tweets following these rules:

1. **Character limit**: Every tweet MUST be ≤ 280 characters. Count carefully. If a tweet exceeds 280 characters, split it further or tighten the wording.
2. **One idea per tweet**: Each tweet conveys exactly one point, fact, or story beat.
3. **Logical flow**: Tweets should read naturally in sequence — each one builds on the previous.
4. **Self-contained clarity**: Each tweet should make sense even if read in isolation (some readers jump in mid-thread).
5. **Transition signals**: Use light connectors between tweets — "But here's the thing:", "The result?", "Why does this matter?" — to maintain momentum.
6. **Line breaks for readability**: Use line breaks within tweets to create visual breathing room.

Splitting strategies:

- If a paragraph has two distinct facts → two tweets
- If one point needs elaboration → lead tweet + evidence tweet
- Use short punchy tweets (under 100 chars) between dense tweets for rhythm variation
- Lists work well: "3 reasons this matters:" followed by one tweet per reason

### Step 4: Craft the CTA (Final Tweet)

The last tweet should drive a specific action. Match the CTA to the content:

| Content Type | CTA Pattern |
|---|---|
| Educational | "If this was helpful, follow me @handle for more on [topic]." |
| Opinion/Analysis | "Agree or disagree? Reply with your take." |
| Story | "If this resonated, repost to help someone who needs to hear it." |
| How-to | "Bookmark this thread so you can come back to it. And follow for the next one." |
| Promotional | "Want the full guide? Link in bio / Link below 👇" |

Rules for the CTA:

- Must be ≤ 280 characters
- Include exactly ONE action (not "follow AND retweet AND comment")
- Feel natural, not salesy — match the thread's tone
- If the user specified a CTA, use it; otherwise choose the best fit

### Step 5: Add Thread Numbering (Optional)

If the thread has more than 5 tweets, or if the user requests it, add numbering:

- Format: `1/` at the start, or `(1/12)` at the end of each tweet
- The hook tweet (tweet 1) typically does NOT get a number — it should look like a standalone tweet
- Numbering starts from tweet 2 as `2/` or include tweet 1 in the count
- Recalculate character count after adding numbers — they eat into the 280 limit

### Step 6: Final Review Checklist

Before presenting the thread, verify:

- [ ] **Every tweet is ≤ 280 characters** — count each one explicitly
- [ ] **Tweet 1 is a compelling hook** — would you stop scrolling for this?
- [ ] **Final tweet has a clear CTA** — exactly one action requested
- [ ] **Logical flow** — read the thread top-to-bottom; does it tell a coherent story?
- [ ] **No orphan context** — no tweet references something only explained in a later tweet
- [ ] **Tone consistency** — all tweets feel like they came from the same voice
- [ ] **Total thread length** — ideally 5-15 tweets; if over 15, consider tightening

## Output Format

Present the thread as a numbered list. Indicate the character count for each tweet.

```
🧵 Thread (X tweets)

[1] <hook tweet>
(### chars)

[2] <body tweet>
(### chars)

...

[X] <CTA tweet>
(### chars)
```

After the thread, add a brief note:

- **Thread summary**: One sentence describing the thread's arc
- **Suggestions** (if any): Optional improvements the user could make (e.g., "Adding a personal anecdote in tweet 4 could boost engagement")

## Important Notes

- **Character counting accuracy is critical.** Double-check every tweet. URLs count as 23 characters on Twitter regardless of actual length. Emojis count as 2 characters.
- **Preserve the author's voice.** Do not rewrite into generic "LinkedIn influencer" style. Match the tone of the original text.
- **No fabricated statistics or claims.** Only include facts present in the source text.
- **Respect platform norms.** Avoid excessive emojis, ALL CAPS sentences, or clickbait that doesn't deliver.
