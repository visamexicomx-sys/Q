---
name: ai-seo
description: When the user wants to optimize content for AI search engines, get cited by LLMs, or improve visibility in AI-generated answers. Use when they mention "AI SEO," "AEO," "GEO," "LLMO," "AI Overviews," "ChatGPT citations," "Perplexity mentions," "answer engine optimization," "generative engine optimization," "get cited by AI," "llms.txt," "AI visibility," "AI search rankings," or optimizing for ChatGPT, Perplexity, Claude, Gemini, or Copilot. For traditional SEO issues, see seo-audit.
metadata:
  version: 2.0.0
---

# AI SEO (AEO / GEO / LLMO)

You are an expert in AI search optimization — the practice of making content discoverable, extractable, and citable by AI systems including Google AI Overviews, ChatGPT, Perplexity, Claude, Gemini, and Copilot.

## The Core Distinction

**Traditional SEO** gets you ranked in blue links.
**AI SEO** gets you cited in AI-generated answers.

A well-structured page can be cited even if it ranks on page 2 or 3, because AI systems select sources based on content quality, structure, and relevance — not position alone. Optimized content receives up to 3x more citations than non-optimized content.

---

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists (or `.claude/product-marketing.md`), read it before asking questions.

Before optimizing, understand:

1. **Current AI Visibility** — Are you appearing in AI Overviews or Perplexity answers now?
2. **Target Queries** — Which queries should you be cited for?
3. **Competitor Citations** — Who is being cited instead of you?
4. **Content Type** — Blog posts, landing pages, product pages, documentation?

---

## AI Visibility Audit

Run this check before optimizing:

1. Search 10–20 target queries in:
   - Google (check for AI Overview appearance)
   - Perplexity
   - ChatGPT (with web browsing)
   - Claude (if web-enabled)

2. Record:
   - Are you cited? If not, who is?
   - What content format do cited pages use?
   - What makes cited pages more extractable?

3. Check `robots.txt` for blocked AI bots:
   ```
   # These should NOT be blocked if you want citations
   User-agent: GPTBot        # ChatGPT
   User-agent: PerplexityBot # Perplexity
   User-agent: ClaudeBot     # Claude
   User-agent: Google-Extended # Google AI
   User-agent: Amazonbot     # Amazon AI
   ```

---

## Three Optimization Pillars

### Pillar 1: Structure — Make Content Extractable

AI systems extract specific passages to cite. Structure content so the right answers are easy to find.

**Definition Blocks**
```
[Term]: [40-60 word clear definition that can stand alone]
```

**Step-by-Step Sections**
```
1. [Step title]: [Clear, complete explanation]
2. [Step title]: [Clear, complete explanation]
```

**Comparison Tables**
```markdown
| Option A | Option B | Difference |
|----------|----------|------------|
| ...      | ...      | ...        |
```

**FAQ Blocks**
```markdown
## Frequently Asked Questions

**Q: [Common question about your topic]**
A: [40-60 word direct answer. Complete enough to stand alone as a citation.]
```

**40-60 Word Answer Passages**
Every key claim should be expressible in 40-60 words — the ideal "citation window" for AI systems.

---

### Pillar 2: Authority — Build Citation-Worthiness

AI systems prefer citing credible, well-sourced content.

| Signal | Impact |
|--------|--------|
| Source citations with links | +40% citation visibility |
| Statistics with attribution | +37% citation visibility |
| Expert quotations | +30% citation visibility |
| Author credentials | +25% citation visibility |
| Last-updated dates | Freshness signal |
| E-E-A-T signals | Foundation |

**Practical actions:**
- [ ] Add author bio with credentials to articles
- [ ] Cite external sources inline (not just a reference list)
- [ ] Include stats with the source and year: "According to [Source], [stat] (2025)"
- [ ] Show last-updated date prominently
- [ ] Add first-hand examples and original research

---

### Pillar 3: Presence — Appear Where AI Looks

AI systems train on and cite third-party sources more frequently than brand domains.

**High-citation third-party platforms:**
- Wikipedia — if you can earn a mention
- Reddit — community discussions mentioning your brand
- Industry publications — guest posts, press coverage
- Review sites — G2, Capterra, Trustpilot, Trustradius
- YouTube — videos mentioning your product
- Quora — detailed answers on relevant questions
- LinkedIn — thought leadership posts

**Action:** Track where your brand is mentioned and actively build presence on platforms cited by AI systems in your niche.

---

## Machine-Readable Files

Create these files to help AI agents evaluate your product:

### `/llms.txt`
A plain-text summary of what your site offers, intended for LLM consumption. Follows the [llmstxt.org standard](https://llmstxt.org/).

```markdown
# [Company Name]

> [One-line description]

[Company Name] is [what you do] for [who you serve].

## Products
- [Product name]: [Description] — [URL]

## Key pages
- [About]: [URL]
- [Pricing]: [URL]
- [Documentation]: [URL]
```

### `/pricing.md`
Machine-readable pricing page that AI agents can parse without JavaScript rendering:

```markdown
# [Company Name] Pricing

## Plans

### Free
- [Feature 1]
- [Feature 2]
- Price: $0/month

### Pro
- Everything in Free
- [Feature 3]
- Price: $29/month

### Enterprise
- Everything in Pro
- [Feature 4]
- Price: Contact us
```

---

## Schema Markup for AI

Schema markup helps AI systems categorize and understand your content:

| Schema Type | Benefit |
|-------------|---------|
| `Article` | Identifies content type and author |
| `FAQPage` | Direct FAQ extraction for AI answers |
| `HowTo` | Step-by-step content recognition |
| `Product` | Product details for AI shopping queries |
| `Organization` | Brand identity signals |

---

## Monitoring AI Visibility

Track monthly across platforms:

| Tool | Measures |
|------|---------|
| Otterly AI | Google AI Overview tracking |
| Peec AI | Multi-platform citation monitoring |
| ZipTie | LLM citation tracking |
| LLMrefs | LLM mention analytics |
| Google Search Console | AI Overview impressions (limited) |

**Note:** Google Search Console provides no AI-specific citation data. Use third-party tools for cross-platform citation tracking.

---

## What Doesn't Work (Avoid These)

| Don't | Why |
|-------|-----|
| Create separate "AI-only" content | Google flags as spam; backfires |
| Chunk content into AI-bait fragments | Reduces page quality and UX |
| Block AI crawlers while wanting citations | Contradictory — bots can't cite blocked content |
| Hide pricing behind JS or login walls | AI agents can't read dynamic content |
| Keyword stuff | Reduces AI citation likelihood by ~10% |
| Gate all authoritative content | Cited content must be publicly accessible |

---

## Quick-Win Checklist

- [ ] Enable GPTBot, PerplexityBot, ClaudeBot in robots.txt
- [ ] Add 40-60 word answer blocks to key pages
- [ ] Add FAQ section with schema markup
- [ ] Add `/llms.txt` to your site root
- [ ] Add `/pricing.md` to your site root
- [ ] Add author bios with credentials to articles
- [ ] Add last-updated dates to all content
- [ ] Cite external sources inline in your content
- [ ] Add statistics with attribution
- [ ] Build presence on Reddit, G2/Capterra, YouTube

---

## Related Skills

- **seo-audit**: For technical SEO foundations (AI SEO builds on top)
- **schema**: For schema markup implementation
- **content-strategy**: For building topical authority
- **programmatic-seo**: For scaling AI-optimized pages
- **competitors**: For benchmarking AI citation share
