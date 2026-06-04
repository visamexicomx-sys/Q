# MexVisa Pro — AI SEO Pilot Full Report
**Site:** https://mexvisapro.com  
**Audit Date:** 2026-06-04  
**Skills Applied:** seo-audit · ai-seo · schema · programmatic-seo · site-architecture · content-strategy

---

## Executive Summary

MexVisa Pro has strong brand fundamentals (100% approval rate, 2,500+ visas, multilingual) but **does not appear in Google for any of its core keywords**. Competitors like nasplaya.com, consultoriamigratoriarivieramaya.com, and immigrationtomexico.mx are capturing all organic traffic.

**Root cause:** The site has only 14 indexed URLs, zero meta descriptions, no dedicated service pages, no schema on most pages, missing AI bot permissions, and no content strategy beyond 5 blog posts.

**Potential organic traffic gain:** 5,000–15,000 monthly sessions within 6–12 months with full implementation.

### Priority Score: 34 / 100 (Current) → Target: 85 / 100

| Category | Current | Potential |
|----------|---------|-----------|
| Technical SEO | 45/100 | 90/100 |
| On-Page SEO | 20/100 | 85/100 |
| AI SEO | 15/100 | 80/100 |
| Schema | 10/100 | 90/100 |
| Architecture | 30/100 | 85/100 |
| Content | 25/100 | 80/100 |

---

## SKILL 1: SEO AUDIT

### P1 — Critical Blockers

#### 1.1 Meta Descriptions Missing on ALL Pages
- **Issue:** Every single page has no meta description tag
- **Impact:** Google writes its own snippets (usually poorly), reducing CTR by 5–10%
- **Fix:** Write unique meta descriptions for all 14 pages (150–160 chars each)

**Homepage meta description (write this first):**
```
Professional Mexico immigration consulting in Riviera Maya. Temporary residency in 4 days from $500. Work permits, permanent residency & citizenship. 100% approval rate. Free consultation.
```

**Blog post meta descriptions:**
```
Temporary residency guide:
Mexico temporary residency 2026: income requirements ($1,620/mo or $27K savings), step-by-step process, costs breakdown & common mistakes. Expert guide by MexVisa Pro.

Permanent residency:
How to get permanent residency in Mexico: qualifications, financial requirements, step-by-step process, and costs. Updated for 2026. Free consultation available.

Work permit:
Mexico work permit 2026: who needs one, how to apply, required documents, costs ($600), and timeline (2–5 weeks). Expert guide by MexVisa Pro Riviera Maya.

Digital nomad:
No formal digital nomad visa in Mexico — but temporary residency lets you work remotely legally for 1–4 years. Full guide with tax implications and top nomad cities.

Citizenship:
Mexican citizenship 2026: eligibility, naturalization process, required years of residency, Spanish test, and full timeline. Complete guide by MexVisa Pro.
```

#### 1.2 No Canonical Tags
- **Issue:** `/` and `/en/` serve identical content. `mexvisapro.com/` and `mexvisapro.com/en/` are duplicate pages with no canonical relationship defined.
- **Impact:** Google splits ranking signals between duplicate pages; may deindex one
- **Fix:** Add `<link rel="canonical" href="https://mexvisapro.com/">` to homepage. Add self-referencing canonicals on all language pages:
  - `/en/` → canonical `/en/`
  - `/es/` → canonical `/es/`
  - `/ru/` → canonical `/ru/`
  - `/zh/` → canonical `/zh/`

#### 1.3 No Hreflang Tags
- **Issue:** Site has 4 language versions (/en/ /es/ /ru/ /zh/) but no hreflang tags
- **Impact:** Google cannot understand language targeting; may show Spanish content to English speakers and vice versa
- **Fix:** Add hreflang to ALL pages. Example for homepage:

```html
<link rel="alternate" hreflang="en" href="https://mexvisapro.com/en/" />
<link rel="alternate" hreflang="es" href="https://mexvisapro.com/es/" />
<link rel="alternate" hreflang="ru" href="https://mexvisapro.com/ru/" />
<link rel="alternate" hreflang="zh" href="https://mexvisapro.com/zh/" />
<link rel="alternate" hreflang="x-default" href="https://mexvisapro.com/" />
```

Each language page must also include ALL variants (reciprocal hreflang). Blog posts should have language-specific versions OR use hreflang x-default pointing to the English version.

### P2 — High Impact

#### 2.1 No Dedicated Service Pages
- **Issue:** All 7 services exist only as anchor sections on the homepage (`/#services`)
- **Impact:** Zero ability to rank for "mexico work permit", "permanent residency mexico", etc.
- **Opportunity:** Each service is a high-intent search query with thousands of monthly searches
- **Fix:** Create 7 dedicated service landing pages (see Architecture section)

#### 2.2 Author Attribution is Anonymous
- **Issue:** All content credited to "MexVisa Pro Team" — no real person named
- **Impact:** Critical for E-E-A-T (immigration = YMYL topic). Google requires expertise signals
- **Fix:**
  1. Assign a real immigration specialist's name to all posts (e.g., "Carlos Ramírez, Licensed Immigration Consultant")
  2. Create author bio pages at `/team/[name]/` with credentials, experience, and photo
  3. Add `Person` schema to author pages
  4. Link to LinkedIn profile for authority signals

#### 2.3 Blog Content Under 1,500 Words
- **Issue:** Blog posts average ~1,100–1,200 words; top competitors average 2,000–3,000 words
- **Impact:** Google favors comprehensive content for high-intent immigration queries
- **Fix:** Expand each post to 2,000–2,500 words with: real income requirement tables, step-by-step process screenshots, FAQ section (8–10 Q&As), related resource links

#### 2.4 Only 1 External Link Per Post (WhatsApp)
- **Issue:** Blog posts link only to WhatsApp — no links to official INM, government sources
- **Impact:** Reduces credibility and E-E-A-T; misses authority signal opportunity
- **Fix:** Add 2–3 external links per post to: gob.mx/inm, SAT, SRE consulates, official forms

### P3 — Quick Wins

#### 2.5 Title Tag Optimization

| Page | Current Title | Recommended Title |
|------|--------------|-------------------|
| Homepage | "Mexico Residency in 4 Days \| Visa & Immigration Riviera Maya" | ✅ Good — keep |
| Temp residency blog | "Mexico Temporary Residency Guide 2026: Requirements, Process & Costs" | ✅ Good — keep |
| Permanent residency | "Permanent Residency in Mexico: Requirements & Step-by-Step Process" | ✅ Good |
| Work permit | "Work Permit in Mexico 2026: How to Get Legal Authorization" | ✅ Good |
| Digital nomad | "Digital Nomad Visa Mexico 2026 \| Residency in 4 Days" | ⚠️ Change to: "Digital Nomad Visa Mexico 2026: How Remote Workers Get Legal Residency" |
| Citizenship | "Mexican Citizenship & Naturalization: Complete 2026 Guide" | ✅ Good |

#### 2.6 Core Web Vitals — Recommendations
Without access to PageSpeed data, standard optimizations for this type of site:
- Serve images in WebP format
- Lazy-load below-fold images and map embeds
- Minimize render-blocking JS (defer non-critical scripts)
- Enable Gzip/Brotli compression
- Use CDN (Cloudflare free tier is sufficient)

### P4 — Long Term

#### 2.7 Build External Links
Current domain likely has low domain authority. Priority link building:
- Get listed on: Expat.com, InternationsGo.com, expats.mx directories
- Guest post on: Mexperience.com, MexicoRelocationGuide.com
- Reddit presence: r/expats, r/mexico, r/digitalnomad — genuine helpful answers
- Get included in "immigration consultant Riviera Maya" roundup articles

---

## SKILL 2: AI SEO

### AI Visibility Assessment

**Current status:** MexVisa Pro is almost certainly NOT being cited by any AI platform. Zero AI-readable files, anonymous authorship, and thin content prevent citation.

**Opportunity:** "mexico temporary residency" and "digital nomad mexico" are common AI search queries. First movers who optimize will dominate AI citations in this niche for years.

### 2.1 robots.txt — Add AI Bot Permissions

Current robots.txt blocks no AI bots, but doesn't explicitly allow them. Add these entries:

```
# AI Search Engines — allow for citation in AI-generated answers
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: CCBot
Allow: /
```

### 2.2 Deploy llms.txt (READY — see llms.txt file)

Upload `/home/user/Q/dashboard/mexvisapro/llms.txt` to `https://mexvisapro.com/llms.txt`

This file tells LLMs (ChatGPT, Claude, Perplexity) what MexVisa Pro does, its services and pricing, so they can cite it accurately when users ask about Mexico immigration.

### 2.3 Deploy pricing.md (READY — see pricing.md file)

Upload `/home/user/Q/dashboard/mexvisapro/pricing.md` to `https://mexvisapro.com/pricing.md`

AI agents used by immigration research tools cannot read JavaScript-rendered pricing. This static file makes pricing extractable by any LLM or crawler.

### 2.4 Add 40-60 Word Answer Blocks to Every Page

AI systems extract specific passages to cite. Each key claim needs a standalone answer block.

**Examples to add to each blog post:**

**Temporary Residency post — add this block:**
> **What is Mexico temporary residency?**
> Mexico temporary residency (Residente Temporal) allows foreign nationals to legally live in Mexico for 1–4 years. Requirements include proof of monthly income (~$1,620 USD) or savings (~$27,000 USD). Applications are processed through INM and typically take 4 business days with professional assistance.

**Digital Nomad post — add this block:**
> **Does Mexico have a digital nomad visa?**
> Mexico does not offer a dedicated digital nomad visa. However, remote workers can live and work legally in Mexico using a temporary residency permit valid 1–4 years. This allows you to work for foreign employers while residing in Mexico, without requiring a Mexican work permit.

### 2.5 Content Structure Changes for AI Citation

Add these structural elements to all blog posts:

| Element | Why | Where |
|---------|-----|-------|
| Definition block at top | AI cites first clear definition | First 100 words |
| FAQ section (8–10 Q&As) | FAQ schema = rich snippet + AI extraction | End of post |
| Comparison table | AI prefers structured comparisons | Mid-article |
| Statistics with source | +37% citation probability | 2–3 per post |
| Author credentials line | E-E-A-T signal | Under title |

### 2.6 AI Quick-Win Status

| Item | Status | Action |
|------|--------|--------|
| GPTBot allowed in robots.txt | ⚠️ Not explicit | Add entries |
| PerplexityBot allowed | ⚠️ Not explicit | Add entries |
| ClaudeBot allowed | ⚠️ Not explicit | Add entries |
| /llms.txt exists | ❌ Missing | Deploy llms.txt |
| /pricing.md exists | ❌ Missing | Deploy pricing.md |
| 40-60 word answer blocks | ❌ Missing | Add to all posts |
| FAQ sections on all posts | ❌ Only 1 post | Add to all 5 |
| Author credentials | ❌ Anonymous | Add real names |
| Statistics with attribution | ❌ Missing | Add 2–3 per post |
| External citations in content | ❌ Missing | Add INM/gov links |

---

## SKILL 3: SCHEMA

### Schema Status

| Schema Type | Homepage | Blog Posts | Status |
|------------|---------|-----------|--------|
| Organization / LocalBusiness | ❌ | N/A | Missing |
| WebSite | ❌ | N/A | Missing |
| FAQPage | ❌ | 1 of 5 ✅ | Mostly missing |
| Article / BlogPosting | N/A | ❌ | Missing |
| BreadcrumbList | ❌ | ❌ | Missing |
| Service | ❌ | N/A | Missing |

### 3.1 Homepage Schema (READY)

The complete homepage schema is in `schema.json`. It includes:
- `LocalBusiness` with phone, address, hours, ratings, area served
- `WebSite` with language variants
- `FAQPage` with 8 key questions

**Deploy:** Copy `schema.json` content and add as `<script type="application/ld+json">` in the `<head>` of the homepage.

### 3.2 Blog Post Schema (READY)

Use `schema-blog-article.json` as the template for each blog post. Replace all `[VARIABLE]` placeholders.

**Key substitutions needed:**

| Post | Author Name | Replace |
|------|------------|---------|
| All posts | Replace "MexVisa Pro Team" with real expert name | Required for E-E-A-T |

### 3.3 Service Page Schema (Add When Pages Are Created)

When you create dedicated service pages, add this template:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "name": "Mexico Temporary Residency Consulting",
      "serviceType": "Immigration Consulting",
      "provider": {
        "@id": "https://mexvisapro.com/#organization"
      },
      "areaServed": "Riviera Maya, Mexico",
      "offers": {
        "@type": "Offer",
        "price": "500",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "PriceSpecification",
          "minPrice": "500",
          "priceCurrency": "USD"
        }
      },
      "description": "Professional temporary residency consulting. Process your Mexico temporary residency in 4 business days. Includes document preparation, INM filing, and follow-up.",
      "url": "https://mexvisapro.com/temporary-residency/"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://mexvisapro.com/"},
        {"@type": "ListItem", "position": 2, "name": "Services", "item": "https://mexvisapro.com/services/"},
        {"@type": "ListItem", "position": 3, "name": "Temporary Residency", "item": "https://mexvisapro.com/temporary-residency/"}
      ]
    }
  ]
}
```

### 3.4 Implementation Priority

1. **Week 1:** Deploy homepage schema (LocalBusiness + WebSite + FAQPage)
2. **Week 1:** Add Article + BreadcrumbList + FAQPage to all 5 blog posts
3. **Week 2:** Add Service schema when service pages are created
4. **Week 3:** Validate all schema in [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## SKILL 4: PROGRAMMATIC SEO

### Opportunity Analysis

MexVisa Pro serves a local immigration market with clear keyword patterns. Three playbooks apply immediately.

### Playbook 1: Locations × Services (Highest Priority)

**Pattern:** `[service] in [location]` / `[location] [service]`

| URL | Target Keyword | Est. Monthly Volume |
|-----|---------------|---------------------|
| `/temporary-residency/playa-del-carmen/` | temporary residency playa del carmen | 150–300 |
| `/temporary-residency/tulum/` | temporary residency tulum | 100–200 |
| `/temporary-residency/cancun/` | temporary residency cancun | 200–400 |
| `/work-permit/playa-del-carmen/` | work permit playa del carmen | 100–200 |
| `/permanent-residency/riviera-maya/` | permanent residency riviera maya | 200–400 |
| `/immigration-lawyer/playa-del-carmen/` | immigration lawyer playa del carmen | 300–600 |
| `/immigration-consultant/cancun/` | immigration consultant cancun | 200–400 |
| `/immigration-consultant/tulum/` | immigration consultant tulum | 100–150 |

**Total estimated traffic: 1,350–2,650 visits/month from location pages alone**

**What makes each page unique (not thin content):**
- City-specific INM office address + hours + appointment booking link
- Local cost of living context (why that city for expats)
- Local expat community links (Facebook groups, forums)
- Local testimonials from clients in that city
- Nearest consulates/embassies for that city

### Playbook 2: Nationality × Service

**Pattern:** `mexico visa for [nationality]` / `[nationality] [visa type] mexico`

| URL | Target Keyword | Notes |
|-----|---------------|-------|
| `/temporary-residency/american-citizens/` | mexico residency for americans | High volume |
| `/temporary-residency/canadian-citizens/` | mexico residency canada | High volume |
| `/temporary-residency/british-citizens/` | mexico residency uk citizens | Medium |
| `/work-permit/us-citizens/` | mexico work permit us citizens | Medium |
| `/temporary-residency/russian-citizens/` | residencia mexico ciudadanos rusos | Medium (already multilingual) |
| `/digital-nomad/from-usa/` | mexico digital nomad visa american | High |

**Unique content per page:** Requirements that differ by nationality, applicable tax treaties, relevant consulates, embassy contact info, country-specific processing notes.

### Playbook 3: Glossary / Definitions

**Pattern:** `what is [mexico immigration term]`

| URL | Target Keyword |
|-----|---------------|
| `/glossary/fmm/` | what is fmm mexico |
| `/glossary/temporary-residency/` | what is temporary residency mexico |
| `/glossary/permanent-residency/` | what is permanent residency mexico |
| `/glossary/inm/` | what is inm mexico |
| `/glossary/canje/` | what is canje mexico immigration |
| `/glossary/rfc/` | what is rfc number mexico |
| `/glossary/curp/` | what is curp mexico |
| `/glossary/fm3/` | fm3 visa mexico |

**Total estimated programmatic pages: 50–100 pages in 6 months**

### Sitemap Architecture for pSEO

```
/services/                    ← Hub (all services)
  /temporary-residency/       ← Service hub
    playa-del-carmen/
    cancun/
    tulum/
    american-citizens/
    canadian-citizens/
  /permanent-residency/
    [locations]
    [nationalities]
  /work-permit/
    [locations]
/glossary/                    ← Glossary hub
  /fmm/
  /inm/
  [20 terms]
```

---

## SKILL 5: SITE ARCHITECTURE

### Current Architecture Problems

1. **Zero service pages** — 7 services exist only as homepage anchors (`/#services`)
2. **/ and /en/ are duplicates** — same content, different URLs, no canonical relationship
3. **No breadcrumbs** — blog posts show no breadcrumb trail
4. **Blog has no categories** — all 5 posts in flat `/blog/` with no hubs
5. **Navigation has 10 items** — bloated (Services, Visa Types, Why Us, Process, History, FAQ, Resources, Blog, Contact + language selector)
6. **No /about/ page** — no team page, no company story, no credentials page

### Proposed New Architecture

```
mexvisapro.com/
├── services/                          [NEW HUB — "Immigration Services"]
│   ├── temporary-residency/           [NEW — high priority]
│   │   ├── playa-del-carmen/          [NEW pSEO]
│   │   ├── cancun/                    [NEW pSEO]
│   │   ├── tulum/                     [NEW pSEO]
│   │   └── american-citizens/         [NEW pSEO]
│   ├── permanent-residency/           [NEW]
│   ├── work-permit/                   [NEW]
│   ├── citizenship/                   [NEW]
│   ├── investor-visa/                 [NEW]
│   ├── family-visa/                   [NEW]
│   └── tourist-visa-fmm/             [NEW]
├── blog/                              [EXISTS — needs categories]
│   ├── residency/                     [NEW CATEGORY HUB]
│   │   ├── mexico-temporary-residency-guide/
│   │   └── permanent-residency-mexico-requirements/
│   ├── work-visas/                    [NEW CATEGORY HUB]
│   │   └── work-permit-mexico-2026/
│   ├── digital-nomad/                 [NEW CATEGORY HUB]
│   │   └── digital-nomad-visa-mexico/
│   └── citizenship/                   [NEW CATEGORY HUB]
│       └── mexico-citizenship-naturalization/
├── glossary/                          [NEW HUB]
│   ├── fmm/
│   ├── temporary-residency/
│   └── [18 more terms]
├── about/                             [NEW]
│   └── team/                          [NEW — critical for E-E-A-T]
│       └── [expert-name]/             [NEW author pages]
├── pricing/                           [NEW dedicated pricing page]
├── contact/                           [NEW standalone]
├── privacy/                           [EXISTS]
└── terms/                             [EXISTS]
```

### Revised Navigation (Primary Header)

```
Home | Services ▼ | Locations ▼ | Blog | About | Contact
```

**Services dropdown:**
- Temporary Residency
- Permanent Residency  
- Work Permit
- Digital Nomad
- Citizenship
- Investor Visa
- Family Reunification

**Locations dropdown:**
- Playa del Carmen
- Cancún
- Tulum
- All of Riviera Maya

### Internal Linking Plan

| Source Page | Target Page | Anchor Text |
|------------|-------------|-------------|
| Blog: temp residency | Service: /temporary-residency/ | "apply for temporary residency" |
| Blog: permanent residency | Service: /permanent-residency/ | "get permanent residency" |
| Blog: work permit | Service: /work-permit/ | "apply for a work permit" |
| Blog: digital nomad | Service: /temporary-residency/ | "temporary residency for remote workers" |
| Blog: citizenship | Service: /citizenship/ | "start your citizenship process" |
| All service pages | /about/team/ | "licensed immigration specialist" |
| All blog posts | /pricing/ | "see our consulting fees" |
| Location pages | Service hub | "[city] immigration services" |

### URL Mapping (Canonical Fixes)

| Current URL | Action | New Canonical |
|------------|--------|---------------|
| mexvisapro.com/ | Keep, add canonical | canonical: / |
| mexvisapro.com/en/ | Add canonical | canonical: /en/ |
| mexvisapro.com/es/ | Add canonical | canonical: /es/ |
| mexvisapro.com/ru/ | Add canonical | canonical: /ru/ |
| mexvisapro.com/zh/ | Add canonical | canonical: /zh/ |
| (no /#services pages) | Create new | /services/temporary-residency/ etc. |

---

## SKILL 6: CONTENT STRATEGY

### Content Pillars (5)

**Pillar 1: Mexico Residency** (Highest priority)
- Hub: `/services/` or `/blog/mexico-residency-complete-guide/`
- Spokes: Temporary residency, permanent residency, renewing residency, costs, requirements by nationality

**Pillar 2: Work in Mexico** (High priority)
- Hub: `/blog/working-in-mexico-foreigners/`
- Spokes: Work permits, freelance/self-employed, digital nomad, tax obligations, RFC registration

**Pillar 3: Riviera Maya Expat Life** (Medium priority — content play)
- Hub: `/blog/moving-to-riviera-maya/`
- Spokes: Cost of living, best cities (Playa del Carmen vs Tulum vs Cancún), expat communities, healthcare

**Pillar 4: Mexico Immigration Law & Procedures** (Authority building)
- Hub: `/blog/mexico-immigration-guide/`
- Spokes: How INM works, required documents, apostilles, CURP, RFC, SAT registration

**Pillar 5: Citizenship & Long-Term Mexico** (Lower volume, high intent)
- Hub: `/blog/living-permanently-in-mexico/`
- Spokes: Citizenship requirements, dual citizenship, benefits of permanent residency

### Buyer Journey Keyword Map

| Stage | Target Keywords | Content Needed |
|-------|----------------|----------------|
| **Awareness** | "how to move to mexico", "living in riviera maya", "expat life mexico" | Long-form guides, lifestyle content |
| **Consideration** | "best immigration consultant mexico", "how long temporary residency mexico", "mexico residency requirements 2026" | Comparison guides, in-depth how-tos |
| **Decision** | "immigration consultant playa del carmen", "mexico residency help", "mexvisapro review" | Service pages, testimonials, pricing |
| **Implementation** | "mexico temporary residency documents checklist", "how to renew mexico residency", "how to get rfc mexico" | Step-by-step guides, checklists |

### Priority Content: Next 20 Topics to Create

| # | Title | Target Keyword | Stage | Priority |
|---|-------|---------------|-------|----------|
| 1 | **Mexico Temporary Residency 2026: The Complete Guide** | mexico temporary residency requirements | Consideration | P1 |
| 2 | **Best Immigration Consultants in Playa del Carmen** | immigration consultant playa del carmen | Decision | P1 |
| 3 | **Moving to Riviera Maya: Complete Expat Guide 2026** | moving to riviera maya | Awareness | P1 |
| 4 | **Mexico Residency Requirements by Nationality (2026)** | mexico residency requirements | Consideration | P1 |
| 5 | **How to Get Your RFC in Mexico (2026 Guide)** | how to get rfc mexico | Implementation | P1 |
| 6 | **Immigration Consultant Cancún: Services & Costs** | immigration consultant cancun | Decision | P1 |
| 7 | **Playa del Carmen Temporary Residency: Local Expert Guide** | temporary residency playa del carmen | Decision | P2 |
| 8 | **Mexico Work Permit 2026: Everything Foreign Workers Need to Know** | mexico work permit requirements | Consideration | P2 |
| 9 | **Temporary vs Permanent Residency Mexico: Which Is Right for You?** | temporary vs permanent residency mexico | Consideration | P2 |
| 10 | **Mexico Digital Nomad Guide: Living and Working in Riviera Maya** | digital nomad riviera maya | Awareness | P2 |
| 11 | **How to Renew Mexico Temporary Residency (2026)** | renew mexico temporary residency | Implementation | P2 |
| 12 | **Mexico Family Visa: Bringing Your Family to Mexico** | family reunification visa mexico | Consideration | P2 |
| 13 | **Investor Visa Mexico: Residency Through Business Investment** | investor visa mexico | Consideration | P2 |
| 14 | **Mexico Immigration Checklist: Documents You Need (2026)** | mexico immigration documents checklist | Implementation | P3 |
| 15 | **Cost of Living Playa del Carmen 2026: Expat Budget Guide** | cost of living playa del carmen | Awareness | P3 |
| 16 | **How to Get CURP in Mexico as a Foreigner** | how to get curp mexico foreigner | Implementation | P3 |
| 17 | **Mexico Tourist Visa FMM: What It Is and How It Works** | mexico tourist visa fmm | Awareness | P3 |
| 18 | **Best Cities in Riviera Maya for Expats: Playa vs Tulum vs Cancún** | best cities riviera maya expats | Awareness | P3 |
| 19 | **Mexican Citizenship Test: What to Expect (Spanish Exam + Civics)** | mexican citizenship test | Consideration | P3 |
| 20 | **Mexico Income Requirements for Residency 2026 (Updated)** | mexico residency income requirements 2026 | Consideration | P3 |

### Content Calendar (Next 90 Days)

| Week | Deliverable | Type | Priority |
|------|------------|------|----------|
| 1 | Deploy: llms.txt + pricing.md + homepage schema | Technical | P1 |
| 1 | Create: /temporary-residency/ service page | Service page | P1 |
| 2 | Create: /permanent-residency/ service page | Service page | P1 |
| 2 | Fix: Meta descriptions on all 14 pages | Technical | P1 |
| 3 | Create: /work-permit/ service page | Service page | P1 |
| 3 | Add: FAQ sections + schema to all 5 blog posts | On-page | P1 |
| 4 | Write: "Immigration Consultant Playa del Carmen" page | Location pSEO | P1 |
| 5 | Write: "Moving to Riviera Maya Complete Guide" | Awareness content | P2 |
| 6 | Create: /about/team/ page with real expert bio | E-E-A-T | P2 |
| 7 | Write: "Mexico Residency Requirements by Nationality" | Consideration | P2 |
| 8 | Create: /immigration-consultant/cancun/ + /tulum/ | Location pSEO | P2 |
| 9 | Write: "Temporary vs Permanent Residency Mexico" | Consideration | P2 |
| 10 | Create: /citizenship/ + /investor-visa/ service pages | Service pages | P2 |
| 11 | Expand: All 5 blog posts to 2,000+ words | On-page | P2 |
| 12 | Launch: Glossary hub + 5 first terms | pSEO | P3 |

---

## Implementation Checklist (Print This)

### Week 1 — Technical Quick Wins (No New Content Needed)

- [ ] Add meta descriptions to all 14 pages (see examples above)
- [ ] Add canonical tags to all pages
- [ ] Add hreflang tags to all language versions
- [ ] Add GPTBot/PerplexityBot/ClaudeBot to robots.txt
- [ ] Deploy `llms.txt` to `mexvisapro.com/llms.txt`
- [ ] Deploy `pricing.md` to `mexvisapro.com/pricing.md`
- [ ] Add homepage schema (LocalBusiness + WebSite + FAQPage) — see `schema.json`
- [ ] Add Article + BreadcrumbList + FAQPage schema to all blog posts — see `schema-blog-article.json`
- [ ] Submit updated sitemap to Google Search Console

### Week 2–4 — Service Pages (Biggest Traffic Opportunity)

- [ ] Create `/temporary-residency/` — target: "mexico temporary residency"
- [ ] Create `/permanent-residency/` — target: "permanent residency mexico"
- [ ] Create `/work-permit/` — target: "mexico work permit"
- [ ] Create `/citizenship/` — target: "mexican citizenship"
- [ ] Create `/investor-visa/` — target: "investor visa mexico"
- [ ] Create `/family-visa/` — target: "family reunification visa mexico"
- [ ] Create `/about/team/` — add real consultant name, bio, credentials, photo

### Month 2 — Content & pSEO

- [ ] Write 2,000+ word version of each blog post (expand existing)
- [ ] Add FAQ section (8 Q&As) to each blog post
- [ ] Create `/immigration-consultant/playa-del-carmen/`
- [ ] Create `/immigration-consultant/cancun/`
- [ ] Create `/immigration-consultant/tulum/`
- [ ] Create `/temporary-residency/american-citizens/`
- [ ] Write 3 new blog posts from priority list above
- [ ] Start glossary hub with 5 terms

### Month 3 — Scale

- [ ] 5 more location/nationality pages
- [ ] 5 more glossary terms
- [ ] 3 more blog posts
- [ ] Submit to Expat.com, InternationsGo.com directories
- [ ] Post helpful answers on r/expats and r/mexico (link back to guides)

---

## Deliverables in This Repository

| File | Deploy To | Action |
|------|----------|--------|
| `llms.txt` | mexvisapro.com/llms.txt | Upload via FTP/git |
| `pricing.md` | mexvisapro.com/pricing.md | Upload via FTP/git |
| `schema.json` | Homepage `<head>` | Copy into `<script type="application/ld+json">` |
| `schema-blog-article.json` | Each blog post `<head>` | Copy + fill [VARIABLES] |

---

*Report generated using: seo-audit · ai-seo · schema · programmatic-seo · site-architecture · content-strategy skills*
