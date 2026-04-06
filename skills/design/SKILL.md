---
name: ckm:design
description: Comprehensive design skill covering brand identity, design tokens, UI styling, logo generation (55 styles, Gemini AI), corporate identity program (50 deliverables, CIP mockups), HTML presentations (Chart.js), banner design (22 styles, social/ads/web/print), icon design (15 styles, SVG, Gemini 3.1 Pro), and social photos (HTML→screenshot, multi-platform).
argument-hint: "[design-type] [context]"
license: MIT
metadata:
  author: claudekit
  version: 2.1.0
---

# Design

Comprehensive design skill unifying brand identity, design systems, UI styling, and creative asset generation.

## When to Use

- Brand identity, voice, and assets
- Design system tokens and specifications
- UI styling with shadcn/ui + Tailwind
- Logo design and AI generation
- Corporate identity program (CIP) deliverables
- Presentations and pitch decks
- Banner design for multiple platforms
- Icon design (SVG)
- Social photos for various platforms

## Sub-skill Routing

| Task | Route To |
|------|----------|
| Brand voice, guidelines, assets | `ckm:brand` |
| Design tokens, component specs | `ckm:design-system` |
| UI components, Tailwind, shadcn/ui | `ckm:ui-styling` |
| Logo design | Built-in: Logo subsystem |
| Corporate identity mockups | Built-in: CIP subsystem |
| Presentations / pitch decks | Built-in: Slides subsystem |
| Banners (social, ads, web, print) | Built-in: Banner subsystem |
| SVG icons | Built-in: Icon subsystem |
| Social media photos | Built-in: Social Photos subsystem |

## Logo Design

**Capabilities:** 55+ styles, 30 color palettes, 25 industry guides

**Powered by:** Gemini AI models

**Scripts:**
```bash
python scripts/logo/search.py "tech startup minimal"
python scripts/logo/generate.py --style "geometric" --industry "fintech" --palette "deep-blue"
```

## Corporate Identity Program (CIP)

**Capabilities:** 50+ deliverables, 20 styles, 20 industries

**Includes:** Business cards, letterheads, envelopes, email signatures, presentation templates, social media kits, signage

**Scripts:**
```bash
python scripts/cip/search.py "healthcare corporate"
python scripts/cip/generate.py --style "modern-clean" --industry "healthcare"
python scripts/cip/render-html.py --template "business-card" --brand "BrandName"
```

## Slides / Presentations

Strategic HTML presentations with Chart.js.

See `ckm:design-system` for full slide system documentation.

**Quick command:**
```bash
/slides:create "[topic] [slide-count]"
```

## Banner Design

22 art direction styles across social, ads, web, and print.

See `ckm:banner-design` for full banner workflow.

**Platform sizes:** Facebook 820×312, Twitter 1500×500, LinkedIn 1584×396, YouTube 2560×1440, Instagram 1080×1080/1080×1920

## Icon Design

**Capabilities:** 15 styles, 12 categories, SVG output

**Powered by:** Gemini 3.1 Pro

**Styles include:** Line, filled, duotone, gradient, glassmorphism, 3D, hand-drawn, pixel art, minimal, bold, outlined, flat, isometric, animated, brand

**Script:**
```bash
python scripts/icon/generate.py --style "line" --category "finance" --name "wallet"
```

## Social Photos

Multi-platform HTML/CSS designs exported to exact pixel dimensions.

**Platforms:** Instagram, Facebook, LinkedIn, Twitter/X, Pinterest, TikTok, Threads, YouTube

**Workflow:** Design in HTML/CSS → Screenshot via chrome-devtools → Export at exact platform dimensions

## Setup Requirements

```bash
export GEMINI_API_KEY="your-api-key"
pip install google-genai pillow
```

## Related Skills

- `ckm:brand` — Brand voice and visual identity
- `ckm:design-system` — Token architecture and slide generation
- `ckm:ui-styling` — shadcn/ui + Tailwind CSS components
- `ckm:banner-design` — Multi-format banner creation
- `ckm:ui-ux-pro-max` — UI/UX design intelligence
