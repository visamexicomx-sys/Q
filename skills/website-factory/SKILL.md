---
name: website-factory
description: Autonomous website factory — finds local businesses without websites, scrapes their real data and photos, generates a bespoke professional website with Claude AI, deploys it live to Vercel, and sends SMS outreach to the business owner. Use when the user asks to build websites for local businesses at scale, run a website outreach pipeline, or automate website creation for businesses without an online presence.
---

# Website Factory

Autonomously builds and deploys professional websites for local businesses that have no web presence, then sends them an SMS with the live link.

## What It Does

1. **Discovers** businesses in a location + category with no website (Google Places API)
2. **Scrapes** their real photos, phone number, address, services, and reviews
3. **Generates** a beautiful, mobile-responsive single-page website tailored to each business (Claude AI)
4. **Deploys** each site live to Vercel with a custom subdomain
5. **Sends SMS** to the business owner with the live link (Twilio)
6. **Repeats** for every business in the batch — handles 50–200+ sites per run

## Required Setup

### Environment Variables

```bash
# Core (required)
GOOGLE_PLACES_API_KEY=your_key    # Google Cloud Console → Places API
ANTHROPIC_API_KEY=your_key        # console.anthropic.com
VERCEL_TOKEN=your_token           # vercel.com/account/tokens

# SMS outreach (optional — skipped if not set)
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+14155551234
```

### Install Vercel CLI

```bash
npm install -g vercel
vercel login  # authenticate once
```

## Running the Pipeline

```bash
# Build 20 plumbing sites in Manchester
npx tsx scripts/website-factory/index.ts \
  --location "Manchester, UK" \
  --category plumbing \
  --limit 20

# 50 roofing sites in London, with SMS
TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=... \
npx tsx scripts/website-factory/index.ts \
  --location "London" \
  --category roofing \
  --limit 50

# Test run (no real deploy, no SMS)
npx tsx scripts/website-factory/index.ts \
  --location "Birmingham, UK" \
  --category electrical \
  --limit 5 \
  --dry-run
```

### CLI Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--location` | `-l` | `London, UK` | City or region to target |
| `--category` | `-c` | `plumbing` | Business type to search for |
| `--limit` | `-n` | `20` | Max number of sites to build |
| `--dry-run` | `-d` | false | Simulate without deploying or sending SMS |

### Supported Categories

Any trade or service works. Built-in service list templates for:
`plumbing`, `roofing`, `electrical`, `cleaning`, `landscaping`, `plastering`, `painting`, `carpentry`

## How Claude Runs This Skill

When the user asks to build websites for local businesses, run:

```bash
npx tsx scripts/website-factory/index.ts [flags]
```

Monitor the live output — each line shows progress:
```
[Thornton Plumbing] generating site...
[Thornton Plumbing] deploying to Vercel...
[Thornton Plumbing] site live → https://thornton-plumbing.vercel.app
[Thornton Plumbing] SMS sent to +441234567890
[Thornton Plumbing] ✓ pipeline complete
```

Final summary shows total sites deployed, SMS sent, and any failures.

## Pipeline Architecture

```
scripts/website-factory/
├── index.ts           # CLI entry point + arg parsing
├── pipeline.ts        # Orchestrator (concurrency, progress, reporting)
├── find-businesses.ts # Google Places API discovery + filtering
├── generate-site.ts   # Claude AI site generation
├── deploy-vercel.ts   # Vercel CLI deployment
├── send-sms.ts        # Twilio SMS outreach
└── types.ts           # Shared TypeScript types
```

## Costs

| Service | Cost |
|---------|------|
| Google Places API | ~$0.017/detail request |
| Anthropic (claude-sonnet-4-6) | ~$0.003/site |
| Vercel | Free tier: 100 deploys/day |
| Twilio SMS | ~$0.0079/SMS (US) |

**Rough total: ~$0.05–0.10 per business site including SMS**

## Tips

- Run with `--dry-run` first to validate discovery before spending API credits
- Vercel free tier allows 100 deploys/day; upgrade for higher volume
- UK phone numbers need `+44` prefix — handled automatically
- Pipeline runs 3 sites concurrently; adjust `CONCURRENCY` in `pipeline.ts` as needed
