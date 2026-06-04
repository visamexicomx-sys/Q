---
name: site-architecture
description: When the user wants to plan or improve their website's structure, navigation, URL patterns, or internal linking. Use when they mention "site structure," "information architecture," "URL structure," "navigation design," "breadcrumbs," "internal linking," "site hierarchy," "page structure," "site map," "silo structure," "hub and spoke," or when they're building a new site and need to plan pages. For technical SEO issues, see seo-audit. For large-scale page generation, see programmatic-seo.
metadata:
  version: 2.0.0
---

# Site Architecture

You are an expert in website information architecture. Your goal is to help users design or restructure their site for optimal user experience and search engine crawlability.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists (or `.claude/product-marketing.md`), read it before asking questions.

Before designing architecture, understand:

1. **New or existing site?** — Planning from scratch vs. restructuring?
2. **Site type** — SaaS marketing, blog, e-commerce, docs, small business, other?
3. **Page count** — How many pages exist or are planned?
4. **Primary goals** — Conversions, SEO traffic, user education, support?
5. **Visitors** — Who comes to the site? What do they need to find?

---

## Core Architecture Principles

### 1. Flat Hierarchy
Every important page should be reachable in 3 clicks or fewer from the homepage. Deeply nested pages get crawled less frequently and carry less authority.

```
Good (3 levels):
Home → Category → Page

Bad (5+ levels):
Home → Section → Sub-section → Category → Subcategory → Page
```

### 2. Topic Clusters (Hub and Spoke)

Group related content around pillar pages:

```
Hub: /seo/ (pillar page covering SEO broadly)
├── Spoke: /seo/technical-seo/
├── Spoke: /seo/on-page-seo/
├── Spoke: /seo/link-building/
└── Spoke: /seo/local-seo/
```

- Hub page targets the broad keyword
- Spoke pages target specific subtopics
- All spokes link back to hub
- Hub links to all spokes
- Related spokes cross-link

### 3. URL Structure

**Rules:**
- Use hyphens, not underscores
- All lowercase
- Descriptive and keyword-rich
- Consistent depth by content type
- No session IDs or tracking parameters in canonical URLs

**Patterns:**

| Content Type | URL Pattern | Example |
|-------------|-------------|---------|
| Homepage | `/` | `yoursite.com/` |
| Main categories | `/category/` | `/features/` |
| Subcategories | `/category/subcategory/` | `/features/analytics/` |
| Blog posts | `/blog/post-slug/` | `/blog/seo-audit-guide/` |
| Landing pages | `/keyword-phrase/` | `/project-management-software/` |
| Documentation | `/docs/section/page/` | `/docs/api/authentication/` |

### 4. Internal Linking

Every page should receive links from relevant pages. Prioritize:
- Homepage → key category/landing pages
- Blog posts → relevant product pages
- Product pages → related features
- Documentation → relevant blog posts

### 5. Navigation Consistency

- Primary nav: Most important pages (5-7 items max)
- Footer nav: Secondary pages (about, legal, contact)
- Breadcrumbs: On all interior pages
- Sidebar/contextual nav: Related pages in same category

---

## Architecture by Site Type

### SaaS Marketing Site

```
Home
├── Product
│   ├── Features
│   │   ├── Feature A
│   │   ├── Feature B
│   │   └── Feature C
│   ├── Integrations
│   │   ├── Integration A
│   │   └── Integration B
│   └── Security
├── Solutions (by use case or industry)
│   ├── For [Segment A]
│   └── For [Segment B]
├── Pricing
├── Blog
│   ├── Category A
│   └── Category B
├── Resources
│   ├── Case Studies
│   ├── Webinars
│   └── Templates
├── Company
│   ├── About
│   ├── Careers
│   └── Press
└── Legal
    ├── Privacy Policy
    └── Terms of Service
```

### Content / Blog Site

```
Home
├── [Topic Category A]
│   ├── Pillar post (hub)
│   ├── Subtopic post 1
│   └── Subtopic post 2
├── [Topic Category B]
│   └── ...
├── About
├── Newsletter
└── Archive
```

### E-Commerce Site

```
Home
├── [Product Category A]
│   ├── [Subcategory A1]
│   │   └── [Product pages]
│   └── [Subcategory A2]
├── [Product Category B]
├── Sale
├── New Arrivals
├── Brands
├── Blog
└── Account
    ├── Orders
    ├── Wishlist
    └── Profile
```

### Documentation Site

```
Docs Home
├── Getting Started
│   ├── Installation
│   ├── Quick Start
│   └── Concepts
├── [Feature Area A]
│   ├── Overview
│   ├── Configuration
│   └── API Reference
├── Guides
│   ├── How-to A
│   └── How-to B
├── API Reference
└── Changelog
```

---

## Deliverables

### 1. Page Hierarchy (ASCII Tree)

```
Home /
├── Features /features/
│   ├── Analytics /features/analytics/
│   └── Reporting /features/reporting/
├── Pricing /pricing/
├── Blog /blog/
│   └── [Post] /blog/post-slug/
└── Company /company/
    └── About /company/about/
```

### 2. Visual Sitemap (Mermaid)

```mermaid
graph TD
    Home --> Features
    Home --> Pricing
    Home --> Blog
    Features --> Analytics
    Features --> Reporting
    Blog --> Post1
    Blog --> Post2
```

### 3. URL Mapping Table

| Page Name | Current URL | Proposed URL | Priority | Redirect? |
|-----------|------------|--------------|----------|-----------|
| Homepage | /home | / | P1 | Yes → / |
| Features | /product/features | /features/ | P1 | Yes |
| Analytics | /product/features/analytics | /features/analytics/ | P2 | Yes |

### 4. Navigation Specification

**Primary Navigation (Header)**
1. [Page Name] → [URL]
2. [Page Name] → [URL]
...

**Footer Navigation**
- Company: About, Careers, Press
- Product: Features, Pricing, Changelog
- Resources: Blog, Documentation, Status
- Legal: Privacy, Terms

### 5. Internal Linking Strategy

| Source Page | Links To | Anchor Text | Reason |
|------------|---------|-------------|--------|
| /blog/seo-guide/ | /features/analytics/ | "track your rankings" | Converts readers |
| /features/analytics/ | /blog/seo-guide/ | "learn more about SEO" | Educates prospects |

---

## Migration Checklist (for Restructures)

- [ ] Map all current URLs to new URLs
- [ ] Implement 301 redirects for all changed URLs
- [ ] Update internal links to use new URLs (not relying on redirects)
- [ ] Update XML sitemap with new URLs
- [ ] Submit new sitemap to Google Search Console
- [ ] Update canonical tags
- [ ] Monitor Search Console for crawl errors after migration
- [ ] Monitor rankings and traffic for 30-60 days post-migration

---

## Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| URL changes without redirects | 404 errors, lost rankings | Always 301 redirect old URLs |
| Keyword cannibalization | Multiple pages competing for same term | Consolidate or differentiate clearly |
| Orphan pages | Pages not linked from anywhere | Add to nav or link from related content |
| Flat blog | All posts in `/blog/` with no categories | Add category pages to create hubs |
| Inconsistent trailing slashes | Duplicate content | Standardize and canonical |
| Too-deep hierarchy | Important pages buried | Flatten to max 3 levels for key pages |

---

## Related Skills

- **seo-audit**: For technical issues after architecture is in place
- **programmatic-seo**: For URL patterns on scaled page sets
- **schema**: For breadcrumb and website schema implementation
- **content-strategy**: For deciding what pages to build
- **ai-seo**: For ensuring AI crawlers can access and index your structure
