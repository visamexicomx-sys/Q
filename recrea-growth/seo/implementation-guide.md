# SEO Implementation Guide — Recrea Construction

## Target: Rank #1 in Google for construction searches in Riviera Maya (6–12 months)

---

## Phase 1: Technical SEO (Week 1–2)

### 1.1 Meta Tags — Every Page

**Homepage:**
```html
<title>Recrea Construction | Custom Home & Commercial Builder in Riviera Maya</title>
<meta name="description" content="Recrea Construction — 18 years building custom homes, villas & commercial spaces in Playa del Carmen, Cancun & Tulum. Free quote. English-speaking team. 196+ projects.">
<link rel="canonical" href="https://www.recrea.mx/">
```

**Services Page:**
```html
<title>Construction Services in Cancun, PDC & Tulum | Recrea Construction</title>
<meta name="description" content="Full-service construction in Riviera Maya: custom homes, villas, commercial spaces & renovations. Licensed, bilingual team. Free estimate in 24 hours.">
```

**Projects Page:**
```html
<title>Our Projects | 196+ Completed Builds in Riviera Maya | Recrea Construction</title>
<meta name="description" content="View our portfolio of 196+ completed construction projects in Playa del Carmen, Cancun & Tulum. Custom villas, commercial spaces, renovations and more.">
```

**Contact Page:**
```html
<title>Contact Recrea Construction | Free Construction Quote Riviera Maya</title>
<meta name="description" content="Get a free construction quote from Recrea Construction. Call, WhatsApp or visit our office in Playa del Carmen. We respond within 24 hours.">
```

---

### 1.2 Schema Markup (Add to Homepage `<head>`)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Recrea Construction",
  "image": "https://www.recrea.mx/images/logo.png",
  "url": "https://www.recrea.mx",
  "telephone": "+529844525333",
  "priceRange": "$$$",
  "description": "Full-service construction company in Riviera Maya with 18 years of experience. Custom homes, villas, commercial spaces and renovations in Cancun, Playa del Carmen and Tulum.",
  "foundingDate": "2007",
  "numberOfEmployees": "40",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Your Street Address]",
    "addressLocality": "Playa del Carmen",
    "addressRegion": "Quintana Roo",
    "postalCode": "77710",
    "addressCountry": "MX"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 20.6296,
    "longitude": -87.0739
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "09:00",
      "closes": "14:00"
    }
  ],
  "sameAs": [
    "https://www.facebook.com/recreaconstruction",
    "https://www.instagram.com/recreaconstruction"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "47"
  }
}
```

---

### 1.3 Google Business Profile Optimization

**Profile fields to complete:**
- Business name: Recrea Construction
- Category: General Contractor (primary) + Home Builder + Commercial Building Constructor
- Description (750 chars):
```
Recrea Construction is a full-service construction company based in Playa del Carmen with 18 years of experience in Riviera Maya. We specialize in custom residential homes, luxury villas, commercial spaces, and renovations in Cancun, Playa del Carmen, and Tulum. Our bilingual (English/Spanish) team of 40+ professionals handles everything from architectural design and permits to construction and finishing. With 196+ completed projects for clients from the USA, Canada, Europe, and Mexico, we bring expertise, transparency, and craftsmanship to every build. Contact us for a free quote in 24 hours.
```
- Add 20+ project photos (name them: "custom-villa-tulum.jpg", "construction-playa-del-carmen.jpg")
- Post weekly Google Business updates (use same content as Facebook posts)
- Ask every completed client for a Google Review (send them the direct review link)

**Review request template:**
```
Hi [Name], it was a pleasure building your [project] in [location]! 🏡

If you have a moment, a Google review would mean the world to us and helps other people find trustworthy builders in Riviera Maya.

Direct link: [Google Review Link]

Takes 2 minutes and makes a huge difference. Thank you! 🙏
— [Name], Recrea Construction
```

---

## Phase 2: Content Strategy (Month 1–3)

### 2.1 Target Keywords by Priority

**Tier 1 — High value, medium competition (TARGET FIRST):**
```
construction company playa del carmen
build a house tulum
home builder cancun
custom home construction riviera maya
villa construction playa del carmen
construction services tulum
residential construction cancun
```

**Tier 2 — Local + specific (easier to rank):**
```
construction company near me playa del carmen
best construction company tulum
licensed contractor playa del carmen
bilingual contractor riviera maya
english speaking builder cancun
how much to build a house in playa del carmen
cost to build a villa tulum
```

**Tier 3 — Spanish keywords:**
```
constructora playa del carmen
empresa constructora cancun
construccion de casas tulum
remodelacion playa del carmen
constructora riviera maya
cotizar construccion cancun
```

**Tier 4 — Long-tail blog targets:**
```
how to build a house in mexico as a foreigner
cost of building in riviera maya 2025
how long does construction take in mexico
best area to build in tulum
can foreigners build in mexico
construction permit process mexico
hiring a contractor in playa del carmen
```

---

### 2.2 Blog Content Plan (Publish 2x per month)

**Month 1:**
- **Post 1:** "How Much Does It Cost to Build a House in Playa del Carmen in 2025?"
  - Target keywords: "cost to build house playa del carmen", "construction cost riviera maya"
  - ~1,500 words with cost breakdown tables

- **Post 2:** "How to Hire a Contractor in Mexico (Without Getting Scammed)"
  - Target keywords: "hiring contractor mexico", "find builder playa del carmen"
  - ~1,200 words with checklist

**Month 2:**
- **Post 3:** "Can Foreigners Build a House in Mexico? Complete Guide (2025)"
  - Target keywords: "foreigners build house mexico", "expat construction mexico"
  - ~2,000 words covering legal requirements

- **Post 4:** "How Long Does Construction Take in Riviera Maya?"
  - Target: "construction timeline mexico", "how long build house cancun"
  - ~1,000 words with phase breakdown

**Month 3:**
- **Post 5:** "Building in Tulum vs Playa del Carmen: Which Is Better for Investment?"
  - Target: "tulum vs playa del carmen real estate"
  - ~1,500 words comparison

- **Post 6:** "Construction Permits in Mexico: What You Need to Know"
  - Target: "construction permit mexico", "building permit playa del carmen"
  - ~1,200 words step-by-step

**Month 4+: Ongoing:**
- "Best Areas to Build in Riviera Maya"
- "Condo vs Villa Investment in Tulum"
- "Architecture Styles Popular in Riviera Maya"
- "Our 10 Favorite Projects (Portfolio Deep Dive)"
- One seasonal post per quarter

---

### 2.3 Blog Post Template (SEO Optimized)

```markdown
# [Primary Keyword + Year] — [Compelling Angle]
*Example: "How Much Does It Cost to Build a House in Playa del Carmen in 2025?"*

[100-word intro that uses primary keyword in first sentence]

## Quick Summary
[3-5 bullet points with key takeaways — for people who skim]

## [H2 Section 1 — Main Topic]
[400–600 words]

## [H2 Section 2 — Supporting Topic]
[400–600 words]

## [H2 Section 3 — FAQ or Practical Steps]
[300–400 words]

## Get a Free Quote from Recrea Construction
[100-word CTA paragraph with WhatsApp link and phone number]

---
*Recrea Construction has been building custom homes, villas and commercial spaces in Riviera Maya since 2007. If you're planning a project in Cancun, Playa del Carmen or Tulum, contact us for a free consultation.*
```

---

## Phase 3: Link Building (Month 2–6)

### 3.1 Local Citations (Submit to All)

Submit your NAP (Name, Address, Phone) to:
```
1. Google Business Profile ✅
2. Bing Places
3. Apple Maps
4. Yelp Mexico
5. Yellow Pages Mexico (PaginasAmarillas.com)
6. Hotfrog Mexico
7. Cylex Mexico
8. Foursquare
9. Tripadvisor (if applicable)
10. Thumbtack
11. Houzz (great for construction/home)
12. HomeAdvisor (international)
```

---

### 3.2 Link Building Targets

**Expat Websites (Reach out for featured articles or directory listings):**
- mexconnect.com
- expatexchange.com
- internations.org (Cancun/Playa chapter)
- justlanded.com (Mexico section)
- todoexpat.com
- expatforum.com (Mexico)

**Real Estate Portals (List your services):**
- Point2homes.com
- Lamudi.com.mx
- Vivanuncios.com.mx
- inmuebles24.com
- Private Selections (luxury real estate Mexico)

**Local News & Blogs (Guest post or press release):**
- The Playa Times
- Cancun Sun
- Tulum Magazine
- Riviera Maya News

**Guest Post Angle:**
```
Pitch title: "A Local Builder's Guide to Safe Construction in Riviera Maya for Foreigners"
Pitch to: expat blogs, real estate blogs, Mexico travel blogs
What you offer: Expert knowledge, 18 years experience, local credibility
What they get: Valuable content for their readers
```

---

## Phase 4: Page Speed & Core Web Vitals

**Run these tests first:**
- Google PageSpeed Insights: pagespeed.web.dev
- GTMetrix: gtmetrix.com
- Google Search Console: search.google.com/search-console

**Quick wins:**
1. Compress all images (use TinyPNG or WebP format)
2. Enable browser caching
3. Use a CDN (Cloudflare free tier works)
4. Minify CSS/JS
5. Fix any broken links
6. Ensure HTTPS is active
7. Make sure site is mobile responsive

**Target scores:**
- PageSpeed (mobile): 70+
- PageSpeed (desktop): 85+
- LCP (Largest Contentful Paint): < 2.5s
- CLS (Cumulative Layout Shift): < 0.1
- FID/INP: < 200ms

---

## Monthly SEO Tracking

| Metric | Month 1 | Month 3 | Month 6 | Goal |
|--------|---------|---------|---------|------|
| Organic clicks/month | — | — | — | 500+ |
| Ranking keywords | — | — | — | 50+ |
| Google Business views | — | — | — | 1,000+/mo |
| Avg. position (top keywords) | — | — | — | Top 5 |
| Organic leads | — | — | — | 10+/mo |

**Track with:** Google Search Console (free) + Google Analytics 4 (free)
