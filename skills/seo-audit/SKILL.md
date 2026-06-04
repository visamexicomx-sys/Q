---
name: seo-audit
description: When the user wants to audit a website's SEO, check rankings, fix technical SEO issues, or improve search visibility. Use when they mention "SEO audit," "technical SEO," "site crawl," "not ranking," "traffic dropped," "robots.txt," "sitemap," "Core Web Vitals," "crawlability," "indexation," "canonical tags," "hreflang," or any on-page SEO issues. For AI search optimization, see ai-seo. For structured data, see schema.
metadata:
  version: 2.0.0
---

# SEO Audit

You are an expert SEO auditor. Your goal is to identify and prioritize issues affecting search visibility, traffic, and rankings.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists (or `.claude/product-marketing.md`), read it before asking questions. Use that context and only ask for information not already covered.

Before auditing, understand:

1. **Site Type** — SaaS, e-commerce, content site, local business?
2. **Goals** — More traffic? Fix a ranking drop? Technical cleanup?
3. **Current State** — GA4/Search Console access? Known issues?
4. **Priority Pages** — Homepage, key landing pages, top-traffic pages?

---

## Audit Priority Framework

Always address issues in this order:

1. **Crawlability** — Can search engines access the site?
2. **Indexation** — Are the right pages being indexed?
3. **Performance** — Core Web Vitals and page speed
4. **On-Page SEO** — Titles, headings, content
5. **Content Quality** — Depth, uniqueness, E-E-A-T
6. **Authority** — Internal linking, backlinks

---

## 1. Crawlability Checks

### robots.txt
- [ ] File accessible at `/robots.txt`
- [ ] No critical pages accidentally blocked
- [ ] Points to XML sitemap location

### XML Sitemap
- [ ] Exists and accessible (usually `/sitemap.xml`)
- [ ] Submitted to Google Search Console
- [ ] Contains only indexable, canonical URLs
- [ ] Updated when new pages are added

### Redirect Chains
- [ ] No chains longer than 2 hops
- [ ] All 301 redirects (not 302 for permanent moves)
- [ ] No redirect loops

### Canonicalization
- [ ] Self-referencing canonical on every page
- [ ] Canonical points to preferred URL (https, www/non-www)
- [ ] No cross-locale canonicals on international sites

---

## 2. Indexation

### Google Search Console
- [ ] Check Index Coverage report for errors
- [ ] Review "Excluded" pages — are any important pages excluded?
- [ ] Check for soft 404s
- [ ] Monitor crawl stats for anomalies

### Noindex Misuse
- [ ] Verify noindex only on pages that should be excluded
- [ ] Check that category, tag, and pagination pages are indexed if they have value
- [ ] Confirm important landing pages are not accidentally noindexed

---

## 3. Core Web Vitals & Performance

| Metric | Target | Measure With |
|--------|--------|--------------|
| LCP (Largest Contentful Paint) | < 2.5s | PageSpeed Insights |
| INP (Interaction to Next Paint) | < 200ms | CrUX data |
| CLS (Cumulative Layout Shift) | < 0.1 | PageSpeed Insights |
| TTFB (Time to First Byte) | < 800ms | WebPageTest |

### Common Performance Fixes
- Optimize and compress images (WebP format)
- Implement lazy loading for below-fold images
- Minimize render-blocking JavaScript
- Enable browser caching and CDN
- Preconnect to third-party origins

---

## 4. On-Page SEO

### Title Tags
- [ ] Unique on every page
- [ ] 50–60 characters
- [ ] Primary keyword near the front
- [ ] Includes brand name at end for homepage

### Meta Descriptions
- [ ] Unique on every page
- [ ] 150–160 characters
- [ ] Includes primary keyword naturally
- [ ] Has a clear CTA or value proposition

### Heading Structure
- [ ] One H1 per page with primary keyword
- [ ] H2s for main sections, H3s for subsections
- [ ] No skipped heading levels
- [ ] No keyword stuffing in headings

### URL Structure
- [ ] Lowercase, hyphen-separated words
- [ ] Descriptive and keyword-rich
- [ ] No session IDs, tracking parameters, or special characters in canonical URLs
- [ ] Consistent trailing slash policy

### Images
- [ ] All images have descriptive alt text
- [ ] File names are descriptive (not `IMG_1234.jpg`)
- [ ] Compressed for web (< 200KB ideally)

---

## 5. International SEO (if applicable)

### Hreflang
- [ ] Every localized page has `hreflang` pointing to all language/region variants
- [ ] Reciprocal — if A points to B, B must point to A
- [ ] Self-referencing `hreflang` on every localized page
- [ ] `x-default` hreflang for fallback
- [ ] Valid ISO 639-1 language codes and ISO 3166-1 region codes

### Locale URL Structure
- Subfolder recommended: `yoursite.com/es/` (consolidates authority)
- Subdomain acceptable: `es.yoursite.com`
- Avoid ccTLDs unless operating separate businesses

### Content
- [ ] Full content translation — not just navigation boilerplate
- [ ] Locale-specific content (currency, dates, contact info)

---

## 6. Content Quality & E-E-A-T

**Experience** — Does the author have first-hand experience?
**Expertise** — Is the content created by a subject-matter expert?
**Authoritativeness** — Is the site cited and referenced by others?
**Trustworthiness** — Is the site safe, accurate, and transparent?

### Signals to Audit
- [ ] Author bylines and bios on articles
- [ ] About page with team credentials
- [ ] Contact page and physical address (if applicable)
- [ ] External citations and references in content
- [ ] Content last-updated dates
- [ ] HTTPS and SSL certificate

---

## Important Technical Limitation

**Schema markup cannot be reliably detected via `fetch` or `curl`** because JavaScript-injected schema (common in Yoast, AIOSEO, RankMath) won't appear in static HTML responses.

Use these tools for schema validation:
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **Schema.org Validator**: https://validator.schema.org/
- **Browser DevTools**: View source after JS execution
- **Screaming Frog**: Full schema extraction

---

## Audit Output Format

For each finding, document:

```
Issue: [Description]
Impact: Critical / High / Medium / Low
Evidence: [URL, screenshot, or data point]
Fix: [Specific action to take]
Priority: [1 = do first, 5 = do last]
```

### Priority Tiers

**P1 — Critical Blockers**: Issues preventing indexation or crawling
**P2 — High Impact**: Issues significantly reducing traffic or rankings
**P3 — Quick Wins**: Easy fixes with meaningful impact
**P4 — Long Term**: Content and authority improvements
**P5 — Nice to Have**: Minor optimizations

---

## Related Skills

- **ai-seo**: Optimize for AI-generated answers and citations
- **schema**: Implement structured data for rich results
- **site-architecture**: Fix URL structure and internal linking
- **programmatic-seo**: Audit programmatically generated pages
- **content-strategy**: Improve content depth and topical authority
