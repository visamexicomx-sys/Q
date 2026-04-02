---
name: scrape-competitors
description: Researches and analyzes competitor products, pricing, messaging, and positioning. Use when the user asks to analyze competitors, audit rival websites, compare features, benchmark pricing, or gather competitive intelligence.
---

# Scrape Competitors

A specialized skill for gathering and analyzing competitive intelligence across products, pricing, messaging, and positioning.

## When to Use This Skill

Use this skill when the user asks to:

- Analyze a competitor's website or product
- Compare features across competing products
- Benchmark pricing against rivals
- Audit competitor messaging and positioning
- Identify gaps in the competitive landscape
- Create a competitive analysis report
- Track changes in a competitor's strategy
- Find competitors' weaknesses or differentiation opportunities

## Workflow

### Step 1: Identify Competitors

Ask the user to confirm:

1. **Your product** — What are you competing with?
2. **Known competitors** — Any specific rivals to analyze?
3. **Market segment** — Direct, indirect, or aspirational competitors?
4. **Depth** — Quick snapshot or deep audit?

### Step 2: Gather Competitive Data

For each competitor, collect:

#### Positioning & Messaging
- Headline / hero copy on homepage
- Tagline or value proposition
- Target audience signals (language, imagery, use cases)
- Key differentiators they claim

#### Pricing
- Pricing tiers and names
- Price points at each tier
- What's included / excluded per tier
- Free trial or freemium offering
- Annual vs. monthly discount

#### Product & Features
- Core feature set
- Unique or flagship features
- Integrations offered
- Platforms supported (web, mobile, API)

#### Social Proof
- Customer logos / testimonials
- Review ratings (G2, Capterra, Product Hunt)
- Case study themes (industries, outcomes)

#### Content & SEO
- Blog topics and publishing frequency
- Top-ranking keywords (if available)
- Lead magnets or gated content

### Step 3: Synthesize Into a Comparison Table

Output a structured table:

```
| Attribute        | Your Product | Competitor A | Competitor B |
|------------------|-------------|--------------|--------------|
| Price (entry)    |             |              |              |
| Free tier        |             |              |              |
| Key differentiator |           |              |              |
| Target audience  |             |              |              |
| Positioning      |             |              |              |
| Top feature      |             |              |              |
| Weakness         |             |              |              |
```

### Step 4: Identify Strategic Gaps & Opportunities

After the comparison, provide:

1. **Where you win** — Advantages your product has
2. **Where you lose** — Gaps to address
3. **Whitespace** — Needs competitors aren't addressing
4. **Messaging steal** — Language or claims competitors use that resonates

### Step 5: Deliver Actionable Recommendations

End with 3–5 prioritized action items:

```
1. [Urgent] — Address pricing gap vs. Competitor A
2. [High] — Reframe positioning to own [whitespace]
3. [Medium] — Add [missing feature] to close parity gap
4. [Low] — Test competitor's headline framing in your own ads
```

---

## Output Templates

### Quick Snapshot (1 Competitor)

```
## Competitor: [Name]
**URL:** [website]
**Positioning:** [their tagline / hero headline]
**Target:** [who they're clearly speaking to]
**Price:** [lowest tier] – [highest tier]
**Key Claims:** [3 bullet points]
**Strengths:** [2–3 bullet points]
**Weaknesses:** [2–3 bullet points]
**Opportunity for You:** [1–2 sentences]
```

### Full Competitive Landscape Report

```
## Competitive Landscape: [Your Market]
Date: [date]

### Market Overview
[2–3 sentences on the competitive dynamics]

### Competitors Analyzed
- [Competitor A] — [one-line description]
- [Competitor B] — [one-line description]

### Comparison Table
[table]

### Strategic Gaps
[findings]

### Recommendations
[prioritized list]
```

---

## Quality Checklist

Before delivering the analysis, verify:

- [ ] Every competitor has pricing documented (even if "Contact for pricing")
- [ ] Positioning quotes are verbatim from their site, not paraphrased
- [ ] At least one clear opportunity is identified per competitor
- [ ] Recommendations are specific and actionable, not generic
- [ ] Comparison table is complete — no empty cells without explanation
