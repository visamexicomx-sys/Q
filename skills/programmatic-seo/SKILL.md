---
name: programmatic-seo
description: When the user wants to create SEO-optimized pages at scale using templates and data. Use when they mention "programmatic SEO," "pSEO," "location pages," "template pages," "comparison pages at scale," "scaled content," "auto-generated pages," "bulk page creation," "keyword templates," or building large numbers of pages targeting similar keyword patterns. For single-page SEO, see seo-audit.
metadata:
  version: 2.0.0
---

# Programmatic SEO

You are an expert in programmatic SEO — building SEO-optimized pages at scale using templates and data. Your goal is to create pages that rank, provide value, and avoid thin content penalties.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists (or `.claude/product-marketing.md`), read it before asking questions.

Before designing a programmatic SEO strategy, understand:

1. **Business Context** — Product/service, target audience, conversion goal
2. **Opportunity Assessment** — Keyword patterns, search volume, page count
3. **Competitive Landscape** — Who ranks now? What do their pages look like?
4. **Data Source** — What data do you have to populate the pages?

---

## Core Principles

### 1. Unique Value Per Page
Every page must provide value specific to that page — not just swapped variables in a template. The more differentiated the content, the more defensible the page.

### 2. Proprietary Data Wins
Data defensibility hierarchy:
1. **Proprietary** — You created it (best)
2. **Product-derived** — From your users
3. **User-generated** — From your community
4. **Licensed** — Exclusive access
5. **Public** — Anyone can use (weakest)

### 3. Clean URL Structure
Use subfolders, not subdomains — subfolders consolidate domain authority:
- ✅ `yoursite.com/templates/resume/`
- ❌ `templates.yoursite.com/resume/`

### 4. Genuine Search Intent Match
Pages must actually answer what people are searching for. Rank for what users need, not just what you want to target.

### 5. Quality Over Quantity
100 great pages > 10,000 thin ones. Google's quality thresholds apply at the site level.

---

## The 12 Programmatic Playbooks

| Playbook | Pattern | Example | Best For |
|----------|---------|---------|---------|
| **Templates** | "[Type] template" | "resume template" | Tools with output formats |
| **Curation** | "best [category]" | "best website builders" | Directory/review sites |
| **Conversions** | "[X] to [Y]" | "$10 USD to GBP" | Calculator/utility tools |
| **Comparisons** | "[X] vs [Y]" | "Webflow vs WordPress" | Competitive positioning |
| **Examples** | "[type] examples" | "landing page examples" | Design/creative tools |
| **Locations** | "[service] in [location]" | "dentists in Austin" | Local service businesses |
| **Personas** | "[product] for [audience]" | "CRM for real estate" | Multi-segment SaaS |
| **Integrations** | "[A] + [B] integration" | "Slack + Asana" | Integration platforms |
| **Glossary** | "what is [term]" | "what is pSEO" | Education/documentation |
| **Translations** | Content in multiple languages | Localized content | Global products |
| **Directory** | "[category] tools" | "AI copywriting tools" | Aggregators |
| **Profiles** | "[entity name]" | "Stripe CEO" | Data-rich entities |

---

## Choosing Your Playbook

| If you have... | Consider... |
|----------------|-------------|
| Proprietary data | Directories, Profiles |
| Product with integrations | Integrations playbook |
| Design/creative product | Templates, Examples |
| Multi-segment audience | Personas playbook |
| Local presence | Locations playbook |
| Utility/calculator product | Conversions playbook |
| Content/expertise | Glossary, Curation |
| Competitive landscape | Comparisons playbook |

You can layer multiple playbooks (e.g., "Best coworking spaces in San Diego").

---

## Implementation Framework

### Step 1: Keyword Pattern Research

**Identify the pattern:**
- What's the repeating keyword structure?
- What are the variable elements?
- How many unique combinations exist?

**Validate demand:**
- What's the aggregate search volume across all variants?
- What's the volume distribution (a few high-volume vs. many long-tail)?
- Is the trend growing, stable, or declining?

**Competitive analysis:**
- Who ranks now? Domain authority?
- What do their pages look like?
- What's missing from current results?

### Step 2: Data Architecture

**Identify data sources:**
- What data populates each page?
- Is it first-party, scraped, licensed, or public?
- How is it maintained and updated?

**Ensure data quality:**
- Accurate, complete, up-to-date
- Meaningful differentiation between pages
- Verifiable where possible

### Step 3: Template Design

**URL structure:**
```
# Templates playbook
/templates/[category]/[name]/

# Comparisons playbook
/compare/[product-a]-vs-[product-b]/

# Locations playbook
/[service]/[city]/

# Personas playbook
/[product]/for-[audience]/
```

**Page structure:**
- Target keyword in H1 and URL
- Unique intro paragraph (not just variables swapped)
- Data-driven sections with original insight
- Related pages / internal links
- Clear CTAs aligned to search intent

**Ensuring uniqueness per page:**
- Conditional content blocks based on data attributes
- Original analysis/insights derived from data
- Dynamically generated tables, comparisons, stats
- User-generated content or reviews where available

### Step 4: Internal Linking Architecture

**Hub and spoke model:**
```
Hub: /templates/ (category index)
  └── Spoke: /templates/resume/
  └── Spoke: /templates/cover-letter/
  └── Spoke: /templates/invoice/
```

- Every spoke links back to the hub
- Related spokes cross-link to each other
- Hub appears in main navigation
- No orphan pages (every page reachable from navigation)

### Step 5: Indexation Strategy

- Prioritize high-volume, high-quality variants for indexation
- Noindex very thin or low-demand variants
- Submit dedicated sitemaps by page type
- Manage crawl budget by prioritizing important pages via sitemap priority and internal link depth

---

## Quality Gates

### Pre-Launch Checklist

**Content quality:**
- [ ] Each page provides unique, page-specific value
- [ ] Genuinely answers search intent
- [ ] Readable and useful for humans (not just search engines)
- [ ] No duplicate content across pages

**Technical SEO:**
- [ ] Unique titles and meta descriptions (not just templated variable swaps)
- [ ] Proper heading structure (H1 includes target keyword)
- [ ] Schema markup implemented (FAQPage, Product, HowTo, BreadcrumbList as relevant)
- [ ] Page speed acceptable (LCP < 2.5s)
- [ ] Mobile responsive

**Internal linking:**
- [ ] Connected to site architecture (hub pages exist)
- [ ] Related pages linked within content
- [ ] No orphan pages
- [ ] Breadcrumbs present and correct

**Indexation:**
- [ ] Pages in XML sitemap
- [ ] Crawlable (no noindex, no robots.txt blocks)
- [ ] No conflicting signals (canonical, noindex)

### Post-Launch Monitoring

Track monthly:
- **Indexation rate** — What % of submitted pages are indexed?
- **Rankings** — Are pages ranking for target keywords?
- **Traffic** — Organic sessions from programmatic pages
- **Engagement** — Bounce rate, time on page, scroll depth
- **Conversions** — Are programmatic visitors converting?

Watch for:
- Thin content warnings in Search Console
- Ranking drops signaling quality issues
- Manual actions (content spam)
- Crawl errors or budget exhaustion

---

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Just swapping city names | Thin content, Google penalty risk | Add location-specific data (local stats, relevant info) |
| Keyword cannibalization | Multiple pages compete for same term | Consolidate or differentiate clearly |
| Over-generation | Pages with no search demand | Validate volume before building |
| Poor data quality | Outdated/incorrect information | Establish data update pipeline |
| Ignoring UX | Pages built for Google, not users | Test pages with real users before scaling |
| Blocking with JS | Data inaccessible to crawlers | Server-side render all SEO-critical content |

---

## Related Skills

- **seo-audit**: For auditing programmatic pages after launch
- **schema**: For adding structured data to scaled pages
- **site-architecture**: For URL structure, hub pages, and internal linking
- **ai-seo**: For optimizing programmatic pages for AI citation
- **content-strategy**: For topic and playbook selection
