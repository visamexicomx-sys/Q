---
name: schema
description: When the user wants to add, fix, or optimize schema markup and structured data on their site. Use when they mention "schema markup," "structured data," "JSON-LD," "rich snippets," "schema.org," "FAQ schema," "product schema," "review schema," "breadcrumb schema," "Google rich results," "knowledge panel," "star ratings in search," or "add structured data." For broader SEO issues, see seo-audit. For AI search optimization, see ai-seo.
metadata:
  version: 2.0.0
---

# Schema Markup

You are an expert in structured data and schema markup. Your goal is to implement schema.org markup that helps search engines understand content and enables rich results in search.

## Initial Assessment

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists (or `.claude/product-marketing.md`), read it before asking questions.

Before implementing schema, understand:

1. **Page Type** — What kind of page? What's the primary content?
2. **Current State** — Any existing schema? Errors in Search Console?
3. **Goals** — Which rich results are you targeting?
4. **Tech Stack** — Static HTML, CMS (WordPress), React/Next.js, other?

---

## Core Principles

### 1. Accuracy First
- Schema must accurately represent the visible page content
- Never markup content that doesn't exist on the page
- Keep schema updated when content changes

### 2. Use JSON-LD
- Google recommends JSON-LD format
- Easier to implement and maintain than Microdata
- Place in `<head>` or end of `<body>`

### 3. Follow Google's Guidelines
- Only use schema types Google supports for rich results
- Avoid manipulative tactics
- Review eligibility requirements per type

### 4. Validate Everything
- Test before deploying
- Monitor Search Console Enhancements reports
- Fix errors and warnings promptly

---

## Common Schema Types

| Type | Use For | Rich Result |
|------|---------|-------------|
| `Organization` | Company homepage/about | Knowledge panel |
| `WebSite` | Homepage | Sitelinks search box |
| `Article` / `BlogPosting` | Blog posts, news | Article rich result |
| `Product` | Product pages | Price, ratings, availability |
| `SoftwareApplication` | SaaS/app pages | App info, ratings |
| `FAQPage` | FAQ content | FAQ accordion in SERPs |
| `HowTo` | Tutorials, guides | Step-by-step rich result |
| `BreadcrumbList` | Any page with breadcrumbs | Breadcrumb trail in URL |
| `LocalBusiness` | Physical business pages | Local pack, knowledge panel |
| `Event` | Events, webinars | Event rich result |
| `Review` | Review pages | Star ratings |
| `VideoObject` | Pages with videos | Video rich result |

---

## JSON-LD Examples

### Organization (Homepage/About)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company",
  "url": "https://yoursite.com",
  "logo": "https://yoursite.com/logo.png",
  "sameAs": [
    "https://twitter.com/yourcompany",
    "https://linkedin.com/company/yourcompany"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "support@yoursite.com"
  }
}
```

### Article / Blog Post

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Your Article Title",
  "image": "https://yoursite.com/article-image.jpg",
  "datePublished": "2025-01-15T08:00:00Z",
  "dateModified": "2025-06-01T08:00:00Z",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://yoursite.com/author/name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Company",
    "logo": {
      "@type": "ImageObject",
      "url": "https://yoursite.com/logo.png"
    }
  },
  "description": "Brief article summary (150-160 chars)."
}
```

### FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is your product?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your product is a [description]. It helps [audience] by [benefit]."
      }
    },
    {
      "@type": "Question",
      "name": "How much does it cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Plans start at $X/month. See our pricing page for full details."
      }
    }
  ]
}
```

### HowTo

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Do X",
  "description": "A guide to doing X",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Step 1: Setup",
      "text": "First, install the package using npm install yourpackage."
    },
    {
      "@type": "HowToStep",
      "name": "Step 2: Configure",
      "text": "Add your API key to the configuration file."
    }
  ]
}
```

### Product (SaaS)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Your App",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "29.00",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "247"
  }
}
```

### BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://yoursite.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://yoursite.com/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Article Title",
      "item": "https://yoursite.com/blog/article"
    }
  ]
}
```

---

## Multiple Schema Types on One Page

Combine with `@graph`:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://yoursite.com/pricing",
      "name": "Pricing",
      "url": "https://yoursite.com/pricing"
    },
    {
      "@type": "SoftwareApplication",
      "name": "Your Product",
      "offers": { ... }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [ ... ]
    }
  ]
}
```

---

## Implementation by Tech Stack

### Static HTML
```html
<head>
  <script type="application/ld+json">
    { ... your schema ... }
  </script>
</head>
```

### Next.js
```tsx
// components/SchemaMarkup.tsx
export function SchemaMarkup({ schema }: { schema: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### WordPress
- Yoast SEO, Rank Math, or Schema Pro plugins handle most cases
- For custom schema: add via `wp_head` action hook

---

## Validation Checklist

- [ ] Validates in [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] No errors or warnings in validator
- [ ] Schema matches visible page content
- [ ] All required properties included
- [ ] Dates in ISO 8601 format
- [ ] URLs are fully qualified (include `https://`)
- [ ] Monitored in Search Console Enhancements

---

## Common Errors

| Error | Fix |
|-------|-----|
| Missing required property | Check Google's requirements for that schema type |
| Invalid date format | Use ISO 8601: `2025-01-15T08:00:00Z` |
| URL not absolute | Use full URL with `https://` |
| Schema doesn't match content | Only markup what's visible on the page |
| Duplicate schema types | Combine with `@graph` |

---

## Related Skills

- **seo-audit**: For overall SEO including schema review
- **ai-seo**: Schema helps AI systems understand and cite your content
- **programmatic-seo**: For templated schema at scale
- **site-architecture**: For breadcrumb structure planning
