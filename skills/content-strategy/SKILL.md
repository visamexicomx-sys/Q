---
name: content-strategy
description: When the user wants to plan their content strategy, build a content calendar, define content pillars, or identify what content to create for SEO and marketing. Use when they mention "content strategy," "content plan," "editorial calendar," "content pillars," "topic clusters," "what content to write," "blog strategy," "SEO content plan," "thought leadership strategy," or "content marketing." For executing individual content pieces, see copywriting. For on-page SEO optimization, see seo-audit.
metadata:
  version: 2.0.0
---

# Content Strategy

You are an expert content strategist. Your goal is to build content plans that drive organic traffic, establish authority, and generate qualified leads.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists (or `.claude/product-marketing.md`), read it before asking questions.

Before building a strategy, understand:

1. **Business Context** — Product, audience, business model, revenue goals
2. **Current State** — Existing content, traffic levels, rankings, conversions
3. **Competitive Landscape** — Who are competitors? What do they publish?
4. **Resources** — How many pieces per month? Who creates them? Budget?

---

## Content Types Framework

### Searchable Content (Captures Existing Demand)

Search traffic is the foundation. Build these first.

| Format | Purpose | Example |
|--------|---------|---------|
| Use-case pages | Target buyer intent queries | "project management for agencies" |
| Hub pages | Pillar content for broad topics | "The Complete Guide to SEO" |
| Comparison pages | Bottom-funnel alternatives | "Notion vs Confluence" |
| Template pages | High-intent tool seekers | "Marketing plan template" |
| Glossary / definitions | Awareness queries | "What is CAC?" |
| How-to guides | Informational intent | "How to write a cold email" |

### Shareable Content (Creates New Demand)

These build authority and earn links. Create after search foundation is set.

| Format | Purpose | Distribution |
|--------|---------|--------------|
| Original research / data | Unique insight, earns links | Press, Twitter, LinkedIn |
| Thought leadership | POV, builds brand | LinkedIn, email |
| Expert roundups | Network reach | Guest shares |
| Case studies | Social proof | Sales, email |
| Behind-the-scenes | Brand humanization | Social, email |

---

## Building Content Pillars

### What Are Pillars?

Content pillars are 3–5 core topics that:
- Align with your product's value proposition
- Have strong search demand
- Match what your buyers care about
- You can genuinely be authoritative on

### Pillar Selection Criteria

Score each potential topic:

| Criterion | Weight | Score 1-5 | Weighted Score |
|-----------|--------|-----------|----------------|
| Customer impact — do customers care? | 40% | _ | _ |
| Search potential — volume + ranking feasibility | 30% | _ | _ |
| Content-market fit — can you produce great content here? | 20% | _ | _ |
| Resource requirements — effort to execute | 10% | _ | _ |

### Example Pillar Structure

**For a project management SaaS:**
```
Pillar 1: Project Management
├── What is project management?
├── Project management methodologies (Agile, Scrum, Waterfall)
├── Project management templates
├── Project management tools comparison
└── Project management for [team type]

Pillar 2: Team Productivity
├── Remote team management
├── Team collaboration tools
├── Meeting management
└── Async work guides

Pillar 3: Agile Methodology
├── What is Agile?
├── Scrum framework guide
├── Sprint planning templates
└── Kanban board setup
```

---

## Buyer Journey Keyword Mapping

Map content to buyer stages using these patterns:

| Stage | What They're Doing | Keyword Modifiers | Content Type |
|-------|-------------------|-------------------|--------------|
| **Awareness** | Learning about a problem | "what is," "how to," "why," "guide to" | Educational posts, glossary |
| **Consideration** | Evaluating solutions | "best," "top," "alternatives," "tools for" | Comparison pages, roundups |
| **Decision** | Ready to buy | "pricing," "vs," "review," "demo" | Comparison pages, case studies |
| **Implementation** | Already a customer | "how to set up," "tutorial," "template" | Docs, how-to guides |

---

## Content Ideation Sources

**Keyword data:**
- Seed keywords → keyword explorer (Ahrefs, Semrush)
- Look for: questions, long-tail, informational + commercial mix
- Check competitor gap analysis

**Customer intelligence:**
- Sales call transcripts (Gong, Chorus)
- Support tickets and chat logs
- Customer interviews and surveys
- Onboarding session notes
- NPS survey open-ends

**Community research:**
- Reddit threads in your niche
- Quora questions
- LinkedIn posts and comments
- Industry forums
- Twitter/X conversations

**Competitive analysis:**
- Competitor top-traffic pages (via Ahrefs/Semrush)
- Content they've published but covered poorly
- Topics they haven't covered yet

---

## Prioritization Matrix

Score each content idea across these dimensions:

| Dimension | Weight | Criteria |
|-----------|--------|---------|
| **Customer impact** | 40% | Does this genuinely help buyers? Will it drive conversions? |
| **Content-market fit** | 30% | Can you create something 10x better than what exists? |
| **Search potential** | 20% | Monthly search volume × ranking feasibility |
| **Resource requirements** | 10% | Lower resource cost = higher score |

### Scoring Example

| Topic | Customer Impact | CMF | Search | Resources | Total |
|-------|----------------|-----|--------|-----------|-------|
| "Project mgmt for nonprofits" | 5 | 4 | 3 | 4 | **4.0** |
| "What is Gantt chart" | 3 | 3 | 4 | 5 | **3.5** |
| "Asana vs Monday.com" | 4 | 3 | 5 | 3 | **3.8** |

---

## Content Calendar Template

| Week | Topic | Target Keyword | Stage | Format | Owner | CTA |
|------|-------|---------------|-------|--------|-------|-----|
| W1 | [Title] | [keyword] | Awareness | Guide | [Name] | Newsletter signup |
| W2 | [Title] | [keyword] | Decision | Comparison | [Name] | Free trial |
| W3 | [Title] | [keyword] | Consideration | Roundup | [Name] | Feature page |

---

## Deliverables

### 1. Content Pillars (3–5)
Each pillar includes:
- Topic name and rationale
- Core pillar page topic + URL
- 10–15 spoke page topics with target keywords
- Target buyer stage(s)

### 2. Prioritized Topic List
Top 20–30 topics to create, scored and ranked, with:
- Target keyword and estimated monthly search volume
- Buyer stage
- Content format
- Estimated word count
- Internal linking targets

### 3. Topic Cluster Map
Visual diagram showing how topics relate to each pillar and to each other.

---

## Quality Checklist

Before publishing any content:

- [ ] Directly addresses a specific search query
- [ ] Adds unique value vs. top-ranking competitors
- [ ] Optimized title (50-60 chars, keyword near front)
- [ ] Optimized meta description (150-160 chars, includes CTA)
- [ ] Includes internal links to relevant product pages
- [ ] Includes internal links to related blog posts
- [ ] Has clear CTA aligned to buyer stage
- [ ] Author bio present (for E-E-A-T)
- [ ] Publish date and last-updated date visible
- [ ] Schema markup added (Article, HowTo, FAQ as applicable)

---

## Related Skills

- **seo-audit**: Optimize individual pages after publishing
- **copywriting**: Write the actual content once strategy is set
- **ai-seo**: Optimize content for AI citation and visibility
- **programmatic-seo**: Scale content for keyword pattern opportunities
- **site-architecture**: Structure the site to support content pillars
