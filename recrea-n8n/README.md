# RECREA Content Farm — n8n Automation System
## Instagram on autopilot. Leads while you build.

---

## What This Does

| Workflow | What it automates | When it runs |
|----------|------------------|--------------|
| **1. Content Generator** | Claude AI writes captions + hashtags from your briefs | Mon/Wed/Fri 7am |
| **2. Auto-Publisher** | Posts approved content to Instagram automatically | Mon 9am / Wed 11am / Fri 10am |
| **3. DM Responder** | Detects keywords in DMs → instant auto-reply + lead alert | Always on (webhook) |
| **4. Engagement Bot** | Likes + comments on target hashtag posts daily | Weekdays 10:30am |

All notifications → **Telegram** → your phone in real-time.

---

## Files

```
recrea-n8n/
├── workflows/
│   ├── workflow-1-content-generator.json   ← Import to n8n first
│   ├── workflow-2-auto-publisher.json      ← Import second
│   ├── workflow-3-dm-responder.json        ← Import third
│   └── workflow-4-engagement-bot.json      ← Import fourth
├── sheets-schema/
│   └── google-sheets-structure.md         ← Create your Google Sheet from this
└── docs/
    └── setup-guide.md                     ← START HERE — full setup instructions
```

## Quick Start

1. Read `docs/setup-guide.md` completely
2. Create Google Sheet from `sheets-schema/google-sheets-structure.md`
3. Import 4 JSON files into your n8n instance
4. Configure credentials (Anthropic, Google, Instagram, Telegram)
5. Add content briefs → activate workflows → done

## Time to set up: ~3 hours
## Time to maintain: ~15 min/day

---

*RECREA Construcción | construction-recrea.com/mx*
