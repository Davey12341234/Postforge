# BabyGPT — Onboarding flow & paths (product spec)

Canonical copy for design and implementation. This document is **not** fully wired in the shipped UI yet; see `docs/BabyGPT-App-Diagnostic.md` for code vs spec gaps.

---

## Onboarding flow — improvements

### 1. The opening line needs more edge

Your current line is warm but generic. It doesn't earn the right to ask 7 deep questions. The user just opened an app — they haven't committed yet.

**Current:**

> "Hey… most people never take a moment to think about where they're really headed. Want me to help you see your future more clearly?"

**Problems:**

- "Most people" is preachy from something you just met
- "See your future more clearly" is vague — doesn't create urgency
- No stakes. What do I lose by saying no?

**Improved versions (test these):**

| Variant | Hook |
|--------|------|
| Curiosity gap | "I'm going to ask you 7 questions. Most people can't answer question 3 honestly. Want to try?" |
| Value upfront | "Answer 7 questions and I'll write you a letter from the person you'll become. It takes 2 minutes. You'll keep it forever." |
| Anti-marketing | "I could ask you to sign up. Or I could ask you 7 questions that'll change how you see your week. Your call." |
| Direct | "Before we talk — I want to understand who you are. 7 quick questions. Then I'll never ask again." |

The best openers do three things: promise a specific reward, name the cost, and create a reason to start now rather than later.

### 2. Question order — proposed reorder (mountaintop at Q2)

**Current order (with dropout risk mapped):**

| # | Question | Dropout risk | Emotional hook |
|---|----------|----------------|------------------|
| 1 | What are you hoping I can help with? | Low | Weak — feels like a support ticket |
| 2 | Perfect day tomorrow | Medium | Good imagery but abstract |
| 3 | Your mountaintop | High drop zone | Strong but arrives at the worst moment |
| 4 | Perfect day on mountaintop | High | Redundant with Q2 |
| 5 | Flow activities | High | Interesting but lacks urgency |
| 6 | One habit | Medium | Practical — good |
| 7 | One thing I should never forget | Low | Strong — but buried |

**Proposed reorder:**

| # | Question | Why here |
|---|----------|----------|
| 1 | What's one thing you're really hoping I can help you with? | Entry ramp — low friction, sets context |
| 2 | What's your mountaintop — that big thing you're ultimately working toward? | Move the biggest question up. If they answer this, they're committed. |
| 3 | If you woke up tomorrow and your life was exactly how you want it, what would that perfect day look like? | Now they see it — anchored by the mountaintop they just named |
| 4 | What are the things you love doing so much that time just disappears? | Lighter — recovers energy before the hard questions |
| 5 | What's the one habit you know would change everything if you actually stuck with it? | Self-awareness pivot — they know the answer, it's vulnerable |
| 6 | When you're finally on that mountaintop, what does a perfect day there actually feel like? | Moved from Q4 → Q6. Now it hits different — they've been thinking about their gap, not their dream |
| 7 | What's one thing about you that I should never forget? | Perfect closer — it's the line that makes the letter personal |

**Key principle:** Q2 (mountaintop) is your commitment question. Once someone names their mountaintop, they psychologically can't quit — they've declared an identity. Put it second, not third.

### 3. Small warm reaction after each answer — reaction framework

Generic reactions ("That's beautiful!" / "I love that!") feel hollow after question 2. The reaction needs to reflect the answer back with a twist — proving the AI actually understood something.

| Question | Bad reaction | Good reaction |
|----------|----------------|---------------|
| Q1: Help with | "I'd love to help with that!" | "So this is about [their word] — that's the thread I'll pull through everything." |
| Q2: Mountaintop | "What a great goal!" | "[Their mountaintop]. That's not a fantasy — that's a coordinate. I can work with a coordinate." |
| Q3: Perfect day | "Sounds amazing!" | "Notice what's missing from that day — that's the gap we're going to close." |
| Q4: Flow activities | "Those sound fun!" | "That's not a hobby list. That's your fuel gauge. When those disappear, you're running on empty." |
| Q5: One habit | "That's a powerful habit!" | "You already know the medicine. The question isn't what — it's what's been standing between you and actually doing it." |
| Q6: Mountaintop day | "Wonderful vision!" | "You just described the finish line. Now I know what the race looks like." |
| Q7: Never forget | "I'll remember that." | "[Their answer]. Written in ink. Let's make sure everything we do from here honors that." |

**Pattern:** Each reaction mirrors their words, reveals a layer they didn't explicitly state, and sets up the next question.

### 4. Skip that doesn't feel like quitting

After Q3 or Q4, offer:

> "That's enough for me to start. We can go deeper anytime."

If they tap this, still generate the **Letter** from 3–4 answers. The letter is less specific but still resonant. Never let someone leave onboarding without the letter — that's the conversion moment.

### 5. Six paths menu (add Quick Fire)

**Proposed six paths:**

| Path | Purpose | Frequency | When they open it |
|------|---------|-----------|---------------------|
| Quick Fire | Fast answers, no ceremony | Multiple times daily | "I need a thing" moments |
| Deep Talk | Full conversation with context | 1–2x daily | When they want to go deep |
| Future Self | Talk to achieved-you | Weekly | When they need courage |
| Life Mirror | Mood reflection | Daily | When feelings are messy |
| Clarity Engine | Decision framework | Weekly | When stuck between options |
| Daily Anchor | 15-sec check-in + streak | Daily | Habit layer |

**Why Quick Fire:** Prevents "I'll just use ChatGPT for this quick thing." Quick Fire: no heavy system prompt about goals; fast competent answers; still uses context when relevant.

### 6. Daily anchor — more than streaks

| Element | Description |
|---------|-------------|
| 1-tap mood | 5 emoji options (not 10 — decision fatigue) |
| AI micro-reflection | 1 sentence tying today's mood to their mountaintop |
| Streak counter | Visual but not dominant |
| Weekly pattern | After 7 days, show mood pattern (e.g. dip Wednesdays, peak Saturdays) |
| Streak forgiveness | Miss a day → pause, not reset; gentle nudge |

### 7. Future Self — ritual design

- Entry animation: transition signaling a different space (e.g. particles, mirror).
- Future Self speaks first from context: e.g. "You've been working hard on [mountaintop]. I remember this phase. What's weighing on you?"
- Tone guard: perspective, not instructions — "Here's what I wish I'd known" not "You should do X".
- Time capsule: messages to Future Self delivered after 30/90/365 days.
- Letter archive: one-paragraph summaries → "Letters from the Mountaintop" collection.

### 8. Clarity Engine — 4-card decision spread

After they describe a decision, the AI deals four "cards" (metaphor):

| Card | Question | Purpose |
|------|----------|---------|
| Mirror | What does [their mountaintop] say about this? | Aligns with long-term goals |
| Scale | What would you gain? What would you lose? | Tradeoffs |
| Consequence | In 10 minutes, 10 months, 10 years — how does each option look? | 10/10/10 (Suzy Welch) |
| Anchor | Which option would the person you're becoming choose? | Ties to Future Self |

### 9. Life Mirror — guardrails

- **Reflect → Redirect → Resource:** validate, then agency ("What's one small thing you could do today?"), then resources if distress keywords.
- Never diagnose or therapize — "thinking partner" not counselor.
- Weekly review: bias toward growth and resilience, not only negative clusters.
- Escalation: self-harm / crisis language → warm crisis resource message.

### 10. Onboarding answers should evolve — 90-day realignment

Every ~90 days or on detected theme shift, offer **Realignment** (3 questions):

- Is [their mountaintop] still the mountain you're climbing?
- What's changed since we last talked about what matters most?
- Is there something new I should never forget?

---

## Summary: the 10 improvements

| # | Improvement | Impact |
|---|-------------|--------|
| 1 | Sharper opening line (reward + cost) | Higher start rate |
| 2 | Reorder questions — mountaintop at Q2 | Lower dropout at Q3–4 |
| 3 | Reactions that reveal, not only validate | Conversation, not survey |
| 4 | Skip option that still delivers the letter | Catch 30–40% who'd bounce |
| 5 | Add Quick Fire path | Own quick-use moments |
| 6 | Enhanced Daily Anchor + patterns | Habit beyond streaks |
| 7 | Future Self as ritual + time capsules | Compounding value |
| 8 | Clarity Engine — 4-card framework | Repeatable structure |
| 9 | Life Mirror safety guardrails | Reflect → Redirect → Resource |
| 10 | 90-day Realignment | Identity stays current |

---

## Chase Hughes–inspired framing (no "Spark" naming)

Behavior-aware questioning and elicitation patterns are often discussed in relation to **Chase Hughes**' work on clarity and influence. This product spec uses that **inspiration** for tone and sequence — it is **not** a licensed curriculum. **Do not** use the mis-typed label "Spark" for this flow; the canonical name here is **onboarding** / **seven questions** / **paths**.
