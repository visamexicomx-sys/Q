# RECREA Content Farm — Complete n8n Setup Guide
## From zero to fully automated in ~3 hours

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECREA CONTENT FARM                          │
│                                                                 │
│  [YOU] Add brief      [CLAUDE AI] Generate     [YOU] Approve   │
│  → Google Sheets  →   caption + hashtags   →   image + status  │
│  Content Briefs        (Workflow 1)             Content Queue   │
│                                                                 │
│  [AUTO] Post to       [AUTO] DM reply       [AUTO] Daily       │
│  Instagram 3x/week  + lead alerts          + engagement        │
│  (Workflow 2)          (Workflow 3)           (Workflow 4)      │
│                                                                 │
│  ALL notifications → Telegram → Your phone                     │
└─────────────────────────────────────────────────────────────────┘
```

**What runs automatically:**
- Mon/Wed/Fri 7am → Generate captions from your briefs
- Mon 9am / Wed 11am / Fri 10am → Publish approved posts
- Always on → Respond to DMs with keywords (BUILD, GUIDE, TULUM...)
- Weekdays 10:30am → Engage with target hashtags
- Weekdays 6pm → Daily Telegram summary report

**What YOU do (15 min/day):**
- Add content briefs to Google Sheet (2 min)
- Review + approve generated captions (5 min)
- Add image URLs to approved posts (3 min)
- Review DM log for hot leads (5 min)

---

## PREREQUISITES

Before starting, you need:
- [ ] n8n instance (cloud at n8n.cloud or self-hosted)
- [ ] Google account (for Google Sheets)
- [ ] Anthropic API account (for Claude) — anthropic.com
- [ ] Instagram Business account connected to a Facebook Page
- [ ] Telegram account + a Telegram Bot (for notifications)
- [ ] Meta Developer account (for Instagram API)

---

## STEP 1 — Create Your Google Sheet

1. Go to sheets.google.com → Create new spreadsheet
2. Name it: **"RECREA Content Farm"**
3. Create these 5 tabs (right-click tab → "Insert sheet"):
   - `Content Briefs`
   - `Content Queue`
   - `DM Log`
   - `Engagement Log`
   - `Analytics Dashboard`
4. Add all columns per `sheets-schema/google-sheets-structure.md`
5. Copy the **Spreadsheet ID** from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_ID/edit`
   - Save it — you'll use it in all 4 workflows

---

## STEP 2 — Get Your Anthropic (Claude) API Key

1. Go to console.anthropic.com
2. Click **API Keys** → Create new key
3. Name it: `recrea-content-farm`
4. Copy and save the key (`sk-ant-...`)

**In n8n:**
1. Go to Settings → Credentials → New
2. Type: **HTTP Header Auth**
3. Name: `Anthropic API Key`
4. Header Name: `x-api-key`
5. Header Value: `YOUR_SK-ANT-KEY`
6. Save

---

## STEP 3 — Connect Google Sheets to n8n

1. In n8n → Settings → Credentials → New
2. Type: **Google Sheets OAuth2**
3. Follow the OAuth flow (sign in with Google)
4. Grant access to spreadsheets
5. Name it: `Google Sheets account`
6. Save

---

## STEP 4 — Create Your Telegram Bot

1. Open Telegram → search for `@BotFather`
2. Send `/newbot`
3. Give it a name: `RECREA Content Farm`
4. Give it a username: `recrea_content_farm_bot`
5. Copy the **Bot Token** (`123456:ABC-DEF...`)

**Get your Chat ID:**
1. Message your new bot (send anything)
2. Visit: `https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates`
3. Find `"chat":{"id":XXXXXXXXX}` — that number is your Chat ID

**In n8n:**
1. Settings → Credentials → New
2. Type: **Telegram**
3. Name: `Telegram Bot`
4. Access Token: paste your Bot Token
5. Save

---

## STEP 5 — Set Up Instagram Business API

This is the most complex step. Follow carefully.

### 5a. Create Meta Developer App
1. Go to developers.facebook.com
2. Create a new App → Type: **Business**
3. Add product: **Instagram Graph API**
4. Add product: **Messenger** (for DM auto-responder)

### 5b. Connect Your Instagram Business Account
1. In your app: Instagram Graph API → Settings
2. Add Instagram account → Connect your business account
3. Generate a **User Access Token** with permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_read_engagement`

### 5c. Get a Long-Lived Token
Short-lived tokens expire in 1 hour. Get a long-lived token (60 days):
```
GET https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

### 5d. Get Your Instagram User ID
```
GET https://graph.facebook.com/v19.0/me/accounts?access_token={TOKEN}
```
Find your Instagram account's `id` in the response.

### 5e. Save these values:
- `YOUR_IG_USER_ID` = your Instagram user ID
- `YOUR_INSTAGRAM_ACCESS_TOKEN` = your long-lived token
- `YOUR_PAGE_ACCESS_TOKEN` = your Facebook Page token (for Messenger/DMs)

---

## STEP 6 — Import the 4 Workflows into n8n

For each workflow JSON file:
1. In n8n → Workflows → **Import from file**
2. Select the JSON file from `workflows/` folder
3. After import, open each workflow and:
   - Update all `YOUR_GOOGLE_SHEET_ID` → your actual Sheet ID
   - Update all `YOUR_IG_USER_ID` → your Instagram User ID
   - Update all `YOUR_INSTAGRAM_ACCESS_TOKEN` → your token
   - Update all `YOUR_PAGE_ACCESS_TOKEN` → your Page token
   - Update all `YOUR_TELEGRAM_CHAT_ID` → your Chat ID
   - Connect credentials in each node (click the credential dropdown)

**Order to import:**
1. `workflow-1-content-generator.json`
2. `workflow-2-auto-publisher.json`
3. `workflow-3-dm-responder.json`
4. `workflow-4-engagement-bot.json`

---

## STEP 7 — Set Up DM Webhook (Workflow 3 only)

The DM responder needs Instagram to send webhooks to your n8n:

1. In n8n, open Workflow 3
2. Click the **Webhook** node → copy the webhook URL
   - It looks like: `https://your-n8n.com/webhook/recrea-instagram-dm`

3. In your Meta Developer app:
   - Webhooks → Instagram → Subscribe to events:
     - ✅ `messages`
     - ✅ `messaging_seen`
   - Callback URL: paste your n8n webhook URL
   - Verify Token: create any string (e.g., `recrea2026`) and add it to your webhook node settings

4. Test: send a DM with the word "BUILD" to your Instagram account
5. Check your Telegram — you should get an alert within seconds

---

## STEP 8 — Activate All Workflows

1. Open each workflow
2. Click the **Active** toggle (top right)
3. Confirm activation

**Activation order:**
1. Workflow 3 (DM Responder) — activate first, it's always-on
2. Workflow 4 (Engagement Bot) — activate
3. Workflow 1 (Content Generator) — activate
4. Workflow 2 (Auto-Publisher) — activate LAST (only after you have approved content)

---

## STEP 9 — Add Your First Content Briefs

In Google Sheets → **Content Briefs** tab, add 6–10 rows:

| Row ID | Row Number | Topic | Post Type | Tone | CTA | Location Focus | Audience | Status |
|--------|-----------|-------|-----------|------|-----|---------------|---------|--------|
| BRIEF-001 | 2 | Before and after villa Tulum | carousel | inspiring | DM us BUILD | Tulum | foreign investors | pending |
| BRIEF-002 | 3 | 5 mistakes investors make in Mexico | educational post | educational | DM us CHECKLIST | Riviera Maya | US/Canada investors | pending |
| BRIEF-003 | 4 | Custom carpentry kitchen and closets | carousel | professional | DM us CARPENTRY | Playa del Carmen | luxury buyers | pending |

Workflow 1 will pick them up on Mon/Wed/Fri at 7am automatically.

---

## STEP 10 — Test Each Workflow Manually

Before going live, test each workflow:

**Test Workflow 1:**
- Add 1 brief to Google Sheets with status = `pending`
- Click "Execute Workflow" (play button) in n8n
- Check Google Sheets Content Queue for new generated caption
- Check Telegram for notification

**Test Workflow 2:**
- In Content Queue, change one row's Status to `approved` and add an Image URL
- Click "Execute Workflow"
- Check Instagram — post should appear
- Check Telegram for published notification

**Test Workflow 3:**
- Send a DM to your Instagram account: `BUILD`
- Check if you get an auto-reply
- Check Telegram for lead alert
- Check Google Sheets DM Log for entry

**Test Workflow 4:**
- Click "Execute Workflow"
- Check Engagement Log in Google Sheets
- Check Telegram for summary (it runs at 6pm daily, but you can test manually)

---

## MONTHLY TOKEN COST ESTIMATE (Claude API)

| Usage | Tokens | Cost |
|-------|--------|------|
| 12 captions/month (input) | ~12,000 tokens | ~$0.04 |
| 12 captions/month (output) | ~12,000 tokens | ~$0.18 |
| **Total Claude API cost** | | **~$0.22/month** |

Claude `claude-sonnet-4-6` pricing: $3/M input + $15/M output tokens.
At 3 posts/week = ~12 posts/month = less than $0.25/month. Essentially free.

---

## TROUBLESHOOTING

### "Instagram returns 400 error on media container"
- Image URL must be a direct, public HTTPS URL (not a Google Drive share link)
- Image must be JPEG or PNG, minimum 320x320px
- File size max 8MB

### "Webhook not receiving DMs"
- Check your Meta app has `messages` webhook subscription enabled
- Verify your n8n webhook URL is correct and reachable from the internet
- Check that your n8n instance is not behind a firewall

### "Claude API returns empty response"
- Check your API key is correct (starts with `sk-ant-`)
- Check your Anthropic account has credits
- Check the `x-api-key` header is set correctly

### "Google Sheets node fails"
- Re-authenticate the Google Sheets credential
- Check the Spreadsheet ID is correct (not the full URL)
- Check the sheet tab names match exactly (case-sensitive)

### "Long-lived Instagram token expired"
- Tokens last 60 days. Refresh 5 days before expiry
- Set a reminder in your calendar every 55 days
- Or implement token refresh automation (advanced)

---

## WEEKLY MAINTENANCE (10 minutes)

Every Monday:
- [ ] Add 3 new content briefs to Google Sheets
- [ ] Review DM Log — follow up on hot leads
- [ ] Check Engagement Log — is the bot working?
- [ ] Review Analytics Dashboard — update weekly stats
- [ ] Refresh Instagram access token if within 5 days of expiry

Every month:
- [ ] Review top-performing posts
- [ ] Update comment library in Workflow 4 (keep it fresh)
- [ ] Add new DM keywords/responses if needed
- [ ] Adjust posting schedule based on analytics data
