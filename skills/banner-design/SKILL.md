---
name: ckm:banner-design
description: Multi-format creative banner design for social media, advertising, web, and print. Generates multiple art direction options per request with AI-powered visual elements. Use for social headers, ad banners, website hero sections, and campaign creative assets.
argument-hint: "[platform] [purpose] [style]"
metadata:
  author: claudekit
  version: 1.0.0
---

# Banner Design — Multi-Format Creative Banner System

Create banners across social media, advertising, web, and print platforms with multiple design options using AI-powered visuals.

## When to Use

- Social media headers and cover images
- Digital ad banners (Google, Meta, LinkedIn)
- Website hero sections and page headers
- Campaign creative assets
- Event promotion banners
- Product launch visuals

## Core Workflow

### Step 1: Gather Requirements

Collect the following via structured questions:

1. **Purpose** — What is this banner for? (brand awareness, promotion, event, product)
2. **Platform/Dimensions** — Which platform(s)? (see specs below)
3. **Content** — Headline, subtext, CTA, key visuals, logo
4. **Brand Guidelines** — Colors, fonts, logo files, brand voice
5. **Style Preferences** — Modern, minimal, bold, playful, corporate?
6. **Quantity** — How many variants or formats?

### Step 2: Research & Art Direction

1. Activate `ui-ux-pro-max` skill for design intelligence
2. Research Pinterest for 2–3 complementary art direction styles from established references
3. Select styles that align with brand and goal

**Top Art Direction Styles:**
- Minimalist — clean, whitespace-driven, typographic focus
- Bold Typography — large statement text as the primary visual
- Gradient — smooth color transitions, modern feel
- Photo-Based — hero image with text overlay
- Geometric — shapes, patterns, structured layouts
- Glassmorphism — frosted glass effects, depth
- Neon / Dark Mode — high contrast on dark backgrounds
- Retro / Vintage — nostalgic textures and color palettes
- Editorial — magazine-style layouts
- 3D — dimensional objects and spatial depth

### Step 3: Design & Generate

Use `frontend-design`, `ai-artist`, and `ai-multimodal` skills to:

1. Create HTML/CSS banners respecting platform dimensions and safe zones
2. Generate visual elements:
   - **Standard model** — fast iterations, backgrounds, textures
   - **Pro model** — complex illustrations, product mockups

**Design Constraints:**
- Max 2 typefaces per banner
- Single CTA button
- Minimum 4.5:1 contrast ratio for text
- Safe zone: critical content in central 70–80% of canvas
- Text ratio: under 20% for ad banners

### Step 4: Export to Images

1. Serve HTML files locally
2. Screenshot at exact platform dimensions using `chrome-devtools`
3. Auto-compress files exceeding 5MB
4. Output naming: `[platform]-[purpose]-[variant].png`

### Step 5: Present & Iterate

- Display all options side-by-side
- Include: style name, design rationale, file path, dimensions
- Gather feedback and refine

---

## Platform Specifications

| Platform | Dimensions | Format | Notes |
|----------|-----------|--------|-------|
| Facebook Cover | 820×312 | PNG/JPG | Text in center 560×312 safe zone |
| Twitter/X Header | 1500×500 | PNG/JPG | Logo/text above fold (1500×252) |
| LinkedIn Cover | 1584×396 | PNG/JPG | Avoid edges — desktop/mobile crop differs |
| YouTube Channel Art | 2560×1440 | PNG | Safe zone: 1546×423 center |
| Instagram Post | 1080×1080 | PNG/JPG | Square, 1:1 |
| Instagram Story | 1080×1920 | PNG/JPG | 9:16, keep CTAs in center 60% |
| Google Display Ads | Various | PNG/JPG | 300×250, 728×90, 160×600, 320×50 |
| Website Hero | 1440×600+ | PNG/JPG/WebP | Full-width, mobile-adaptive |

---

## Design Checklist

Before delivering banners, verify:

- [ ] Dimensions match platform specifications exactly
- [ ] Critical content inside safe zone
- [ ] Text contrast ≥ 4.5:1 against background
- [ ] Max 2 typefaces used
- [ ] Single, clear CTA
- [ ] File size under platform limits
- [ ] At least 2 design variants delivered
- [ ] Each variant has a named art direction style
