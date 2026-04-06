---
name: ckm:ui-ux-pro-max
description: AI-powered design intelligence with 50+ UI styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. MUST be used when designing new pages, creating/refactoring UI components, choosing design systems, or reviewing UI code.
argument-hint: "[product-type] [stack] [keywords]"
metadata:
  author: nextlevelbuilder
  version: 2.5.0
---

# UI/UX Pro Max — Design Intelligence

Comprehensive design guide for web and mobile applications covering UI styles, color palettes, typography, UX guidelines, and data visualization across 10 technology stacks.

## When to Apply

**MUST use for:**
- Designing new pages or screens
- Creating or refactoring UI components
- Choosing a design system or style
- Reviewing UI code for quality
- Selecting colors, fonts, or layout patterns
- Building data visualizations or charts

## Design Intelligence Coverage

| Category | Count |
|----------|-------|
| UI Styles | 50+ (glassmorphism, minimalism, brutalism, neumorphism, AI-native, etc.) |
| Color Palettes | 161 (organized by product category) |
| Font Pairings | 57 (Google Fonts) |
| Product Types | 161 (with industry reasoning rules) |
| UX Guidelines | 99 (CRITICAL → LOW priority) |
| Chart Types | 25 (with accessibility guidance) |
| Tech Stacks | 10 (React, Vue, Swift, Flutter, Laravel, etc.) |

## UX Rules by Priority

### Priority 1 — Accessibility (CRITICAL)
- Contrast ratio: minimum **4.5:1** for normal text, **3:1** for large text
- Alt text on all meaningful images
- Full keyboard navigation support
- ARIA labels on interactive elements
- Focus indicators always visible

### Priority 2 — Touch & Interaction (CRITICAL)
- Minimum touch target: **44×44px**
- Minimum spacing between targets: **8px**
- Visual feedback on all interactive elements (hover, active, focus)
- Tap response < 100ms

### Priority 3 — Performance (HIGH)
- Use WebP/AVIF image formats
- Lazy load below-the-fold content
- Cumulative Layout Shift (CLS) < 0.1
- First Contentful Paint (FCP) < 1.8s

### Priority 4 — Style Selection (HIGH)
- Match UI style to product type and industry
- Maintain consistency across all screens
- Use SVG icons (no emoji icons in UI)
- Limit to 1–2 primary UI styles per product

### Priority 5 — Layout & Responsive (HIGH)
- Mobile-first design approach
- Systematic breakpoints: 320, 768, 1024, 1440px
- No horizontal scroll on mobile
- Grid system: 4-column mobile, 8–12-column desktop

### Priority 6 — Typography & Color (MEDIUM-HIGH)
- Line height: minimum **1.5** for body text
- Use semantic color tokens (not raw hex)
- Maximum 2–3 typefaces per product
- Color contrast: 4.5:1 for text against backgrounds

### Priority 7 — Animation (MEDIUM)
- Duration: **150–300ms** for micro-interactions
- Duration: **300–500ms** for page transitions
- Motion must convey meaning — avoid decorative-only animation
- Respect `prefers-reduced-motion`

### Priority 8 — Forms & Feedback (MEDIUM)
- Always use visible labels (not placeholder-only)
- Place error messages below the field
- Progressive disclosure for complex forms
- Inline validation after field blur

### Priority 9 — Navigation Patterns (MEDIUM)
- Bottom navigation: maximum **5 items**
- Consistent back behavior across all screens
- Deep linking support
- Breadcrumbs for 3+ levels of hierarchy

### Priority 10 — Charts & Data (LOW-MEDIUM)
- Use accessible color palettes for charts
- Always include legends and tooltips
- Provide text alternatives for complex charts
- Avoid pie charts with more than 5 segments

---

## Style Guide by Product Type

Use the CLI search tool to get tailored recommendations:

```bash
# Search by product type
python scripts/search.py --type "saas-dashboard" --stack "react"

# Search by industry
python scripts/search.py --industry "fintech" --keywords "dark mode"

# Generate full design system
python scripts/search.py --type "e-commerce" --design-system
```

### Popular Product Type → Recommended Styles

| Product Type | Primary Style | Secondary Style | Avoid |
|--------------|--------------|-----------------|-------|
| SaaS Dashboard | Minimalist | Data-Dense | Skeuomorphic |
| E-commerce | Clean Editorial | Product-Forward | Overly Minimal |
| FinTech App | Professional Dark | Glassmorphism | Playful/Cartoon |
| Healthcare | Calm, Accessible | Soft Minimal | Neon/Dark |
| Creative Agency | Bold Typography | Brutalism | Generic Corporate |
| AI Product | AI-Native | Glassmorphism | Traditional |
| Mobile App | Native Patterns | Neumorphism | Complex Layouts |
| Landing Page | Conversion-First | Bold Typography | Cluttered |

---

## Color System

161 palettes organized by product category. Each palette includes:
- Primary, secondary, accent colors
- Background variants (light/dark)
- Semantic colors (success, warning, error, info)
- Neutral scale (50–950)

### Selection Rules

1. Match palette to industry emotional expectations
2. Test all combinations for 4.5:1 contrast
3. Define semantic tokens before component tokens
4. Provide both light and dark mode variants

---

## Typography Pairings (57 Total)

Format: `[Heading Font] + [Body Font]`

### By Style

| Style | Pairing |
|-------|---------|
| Modern SaaS | Inter + Inter |
| Editorial | Playfair Display + Source Serif |
| Tech/AI | Space Grotesk + DM Sans |
| Elegant | Cormorant + Crimson Text |
| Bold/Impact | Bebas Neue + Open Sans |
| Minimal | DM Sans + DM Sans |
| Startup | Syne + Outfit |

---

## Chart Types (25 Total)

| Chart | Best For | Avoid When |
|-------|----------|------------|
| Line | Trends over time | Few data points |
| Bar (vertical) | Comparing categories | Many categories |
| Bar (horizontal) | Long category names | Few categories |
| Donut | Part-to-whole (≤5 segments) | Many segments |
| Area | Cumulative trends | Overlapping series |
| Scatter | Correlation | Non-technical audience |
| Heatmap | Density/patterns | Precise values needed |
| Treemap | Hierarchical proportions | Deep hierarchy |
| Funnel | Conversion stages | Non-sequential data |
| Gauge | Single KPI progress | Multiple KPIs |

**Accessibility rules for all charts:**
- Never use color as the only differentiator
- Include pattern fills for colorblind users
- Provide data table alternative
- Minimum 3:1 contrast for chart elements

---

## Pre-Delivery Checklist

Before shipping any UI, verify:

**Visual Quality**
- [ ] Consistent spacing using 4px/8px grid
- [ ] Typography hierarchy is clear (H1 > H2 > body)
- [ ] Color palette applied consistently
- [ ] Icon style is consistent throughout

**Interaction**
- [ ] All interactive elements have hover/active states
- [ ] Loading states implemented
- [ ] Empty states designed
- [ ] Error states handled

**Contrast & Accessibility**
- [ ] All text passes 4.5:1 contrast
- [ ] Focus indicators visible on all interactive elements
- [ ] Images have alt text
- [ ] Form fields have labels

**Responsiveness**
- [ ] Tested at 320px, 768px, 1024px, 1440px
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets ≥ 44×44px on mobile

---

## Available Search Domains

```bash
python scripts/search.py --domain [domain] [query]
```

| Domain | Description |
|--------|-------------|
| `product-types` | 161 product types with reasoning rules |
| `styles` | 50+ UI visual styles |
| `typography` | 57 font pairings |
| `colors` | 161 color palettes |
| `landing-pages` | Landing page patterns |
| `charts` | 25 chart types |
| `ux-patterns` | UX interaction patterns |
| `google-fonts` | Font recommendations |
| `react` | React/Next.js optimization |
| `app-ui` | App interface guidelines |
