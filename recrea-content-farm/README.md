# RECREA Content Farm — Claude-Powered Instagram Automation

> No n8n needed. Pure TypeScript. Runs on any server or your laptop.

## How it works

```
YOU add brief to Google Sheets
  ↓
Claude Opus 4.6 generates caption + hashtags (streaming)
  ↓
YOU review in Sheets, add photo URL, set status = approved
  ↓
Farm publishes to Instagram at optimal time
  ↓
DM arrives → instant keyword auto-reply → Telegram lead alert
  ↓
Daily bot engages with target hashtags automatically
```

## Setup (30 minutes)

### 1. Install
```bash
cd recrea-content-farm
npm install
cp .env.example .env
```

### 2. Fill in your .env
```
ANTHROPIC_API_KEY=sk-ant-...          # from console.anthropic.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=...      # from Google Cloud Console
GOOGLE_PRIVATE_KEY="..."              # from service account JSON
GOOGLE_SPREADSHEET_ID=...            # from your Google Sheet URL
INSTAGRAM_ACCESS_TOKEN=...           # long-lived token from Meta Developer
INSTAGRAM_USER_ID=...                # your IG Business account ID
PAGE_ACCESS_TOKEN=...                # for DM auto-replies
WEBHOOK_VERIFY_TOKEN=recrea2026      # any string
TELEGRAM_BOT_TOKEN=...               # from @BotFather
TELEGRAM_CHAT_ID=...                 # your chat ID
```

### 3. Create Google Sheets
See `../recrea-n8n/sheets-schema/google-sheets-structure.md` for all 5 tabs.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run generate` | Reads pending briefs → Claude writes captions → saves to Sheets → Telegram alert |
| `npm run publish-post` | Reads next approved post → posts to Instagram → marks published |
| `npm run engage` | Likes + comments on 3 posts per target hashtag (daily) |
| `npm run dm-server` | Starts webhook server for Instagram DM auto-replies |
| `npm run run-all` | Runs generate + publish + engage in sequence |

## Cron example (runs automatically every day)

```cron
# Generate captions Mon/Wed/Fri at 7am
0 7 * * 1,3,5  cd /path/to/recrea-content-farm && npm run generate >> logs/generate.log 2>&1

# Publish Mon at 9am, Wed at 11am, Fri at 10am
0 9 * * 1      cd /path/to/recrea-content-farm && npm run publish-post >> logs/publish.log 2>&1
0 11 * * 3     cd /path/to/recrea-content-farm && npm run publish-post >> logs/publish.log 2>&1
0 10 * * 5     cd /path/to/recrea-content-farm && npm run publish-post >> logs/publish.log 2>&1

# Daily engagement bot at 10:30am weekdays
30 10 * * 1-5  cd /path/to/recrea-content-farm && npm run engage >> logs/engage.log 2>&1
```

## Run DM server forever (with PM2)

```bash
npm install -g pm2
pm2 start "npm run dm-server" --name "recrea-dm"
pm2 save
pm2 startup
```

## Claude API cost estimate

| Usage | Tokens | Cost |
|-------|--------|------|
| 12 captions/month | ~24k tokens | ~$0.25/month |

Model used: `claude-opus-4-6` with adaptive thinking.

## File structure

```
src/
├── farm.ts                    # CLI entry point — all commands
├── types/index.ts             # TypeScript types for all data
├── generator/
│   └── caption-generator.ts  # Claude Opus 4.6 streaming caption writer
├── publisher/
│   └── instagram-publisher.ts # Meta Graph API publisher
├── responder/
│   └── dm-responder.ts       # Webhook server + keyword detection + auto-reply
├── engagement/
│   └── engagement-bot.ts     # Daily hashtag likes + comments
├── sheets/
│   └── sheets-client.ts      # Google Sheets read/write for all 4 tabs
└── telegram/
    └── notifier.ts           # Telegram notification templates
```
