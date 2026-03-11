# RECREA Content Farm — Google Sheets Structure
## Create ONE Google Sheet with these 5 tabs

> Copy the spreadsheet ID from your Google Sheets URL after creating it.
> Replace `YOUR_GOOGLE_SHEET_ID` with that ID in all 4 n8n workflows.

---

## TAB 1: "Content Briefs"
> You fill this in manually. Workflow 1 reads from here.

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| **Row ID** | Text | BRIEF-001 | Unique ID, e.g. BRIEF-001, BRIEF-002... |
| **Row Number** | Number | 2 | Actual row number in the sheet (for updates) |
| **Topic** | Text | Before and after villa transformation in Tulum | What the post should be about |
| **Post Type** | Dropdown | carousel / reel / single photo / stories | Format of the post |
| **Tone** | Dropdown | professional / inspiring / educational / casual | Tone of voice |
| **CTA** | Text | DM us BUILD to see our portfolio | What action you want followers to take |
| **Location Focus** | Text | Tulum | Location to mention (optional) |
| **Audience** | Text | foreign investors from USA and Canada | Who the post targets |
| **Status** | Dropdown | pending / generated | pending = not yet processed; generated = Claude wrote caption |
| **Created At** | Date | 2026-03-11 | When you added the brief |
| **Notes** | Text | Focus on the pool area transformation | Extra context for Claude |

**Dropdown validation values:**
- Post Type: `carousel`, `reel`, `single photo`, `educational post`, `testimonial`
- Tone: `professional`, `inspiring`, `educational`, `casual`, `urgent`
- Status: `pending`, `generated`

**Sample briefs to add on Day 1:**
```
BRIEF-001 | 2  | Before and after villa transformation Tulum | carousel | inspiring | DM us BUILD | Tulum | foreign investors | pending | 2026-03-11
BRIEF-002 | 3  | 5 mistakes foreign investors make in Mexico | educational post | educational | DM us CHECKLIST | Riviera Maya | foreign investors USA/Canada | pending | 2026-03-11
BRIEF-003 | 4  | Custom carpentry showcase kitchen and closets | carousel | professional | DM us CARPENTRY | Playa del Carmen | luxury home buyers | pending | 2026-03-11
BRIEF-004 | 5  | Why 85% of our clients are foreign investors | single photo | inspiring | DM us to start your project | Riviera Maya | international investors | pending | 2026-03-11
BRIEF-005 | 6  | Commercial projects 7-Eleven and retail spaces | reel | professional | DM us for commercial quote | Quintana Roo | business investors | pending | 2026-03-11
BRIEF-006 | 7  | Team behind the scenes Monday morning | single photo | casual | Tag someone who works this hard | Riviera Maya | general audience | pending | 2026-03-11
```

---

## TAB 2: "Content Queue"
> Workflow 1 writes here. You review and approve. Workflow 2 reads and publishes.

| Column | Type | Notes |
|--------|------|-------|
| **Row ID** | Text | Links back to Content Briefs |
| **Row Number** | Number | For update operations |
| **Topic** | Text | From the brief |
| **Post Type** | Text | From the brief |
| **Hook** | Text | First line of caption (auto-extracted) |
| **Caption (Full)** | Long text | Full caption + hashtags combined |
| **Caption Only** | Long text | Caption without hashtags |
| **Hashtags** | Long text | Hashtag block only |
| **Hashtag Count** | Number | Auto-counted |
| **Char Count** | Number | Total character count |
| **Image URL** | URL | **YOU ADD THIS MANUALLY** — public URL to your photo |
| **Location Tag** | Text | Optional Instagram location tag |
| **Generated Date** | Date | When Claude generated it |
| **Generated Time** | Time | When Claude generated it |
| **Status** | Dropdown | `review_needed` / `approved` / `published` / `rejected` |
| **Approved By** | Text | Your name when you approve |
| **Scheduled Date** | Date | When you want it posted (optional) |
| **Scheduled Time** | Time | Optimal time (optional) |
| **Instagram Post ID** | Text | Auto-filled after publishing |
| **Posted At** | DateTime | Auto-filled after publishing |
| **Likes** | Number | Fill manually after 24h |
| **Comments** | Number | Fill manually after 24h |
| **Reach** | Number | Fill manually from Instagram Insights |
| **Input Tokens** | Number | Claude API cost tracking |
| **Output Tokens** | Number | Claude API cost tracking |

**Your workflow:**
1. Workflow 1 generates caption → status = `review_needed`
2. **YOU** review, edit if needed, add Image URL, change status to `approved`
3. Workflow 2 detects `approved` → posts to Instagram → status = `published`

**IMPORTANT:** The Image URL must be a publicly accessible HTTPS URL to your photo.
Use Google Drive (set to "Anyone with link"), Dropbox, Cloudinary, or your own server.

---

## TAB 3: "DM Log"
> Workflow 3 writes here automatically. Review leads daily.

| Column | Type | Notes |
|--------|------|-------|
| **Timestamp** | DateTime | When DM was received |
| **Sender ID** | Text | Instagram user ID (not username) |
| **Original Message** | Text | What they wrote |
| **Keyword Matched** | Text | Which keyword triggered (BUILD, GUIDE, etc.) |
| **Response Sent** | Text | Which template was sent |
| **Auto-Replied** | YES/NO | Was auto-reply sent? |
| **Follow-up Needed** | YES/NO | Flag for manual follow-up |
| **Lead Status** | Dropdown | `new` / `contacted` / `qualified` / `proposal` / `closed` / `lost` |
| **Lead Name** | Text | Fill manually when you identify the person |
| **Lead Email** | Text | Collect during follow-up |
| **Lead Country** | Text | Where they're from |
| **Project Type** | Text | What they want to build |
| **Budget Range** | Text | Their budget (when shared) |
| **Notes** | Text | Your sales notes |

**Review this sheet every morning** — sort by `Follow-up Needed = YES` to prioritize.

---

## TAB 4: "Engagement Log"
> Workflow 4 writes here automatically. Use for analytics.

| Column | Type | Notes |
|--------|------|-------|
| **Date** | Date | Date of engagement |
| **Hashtag** | Text | Hashtag used |
| **Post ID** | Text | Instagram post ID liked/commented |
| **Action** | Text | `like + comment` |
| **Comment Text** | Text | Comment that was posted |
| **Timestamp** | DateTime | Exact time |

**Weekly review:** Count total engagements. Track if followers increase on days with more engagement.

---

## TAB 5: "Analytics Dashboard"
> Fill this manually each week from Instagram Insights.

| Column | Type | Notes |
|--------|------|-------|
| **Week** | Text | e.g., 2026-W11 |
| **Followers Start** | Number | Followers at week start |
| **Followers End** | Number | Followers at week end |
| **Net New Followers** | Formula | =End-Start |
| **Posts Published** | Number | From Content Queue count |
| **Total Reach** | Number | Sum from Instagram Insights |
| **Total Impressions** | Number | Sum from Instagram Insights |
| **Avg Engagement Rate** | % | From Instagram Insights |
| **Story Views** | Number | Total story views |
| **DMs Received** | Number | From DM Log tab |
| **Hot Leads** | Number | DMs with BUILD/INVEST/TULUM keywords |
| **Consultations Booked** | Number | Track manually |
| **Top Post** | Text | Link to best performing post |
| **Top Post Reach** | Number | Reach of top post |
| **Engagement Actions** | Number | From Engagement Log tab |
| **API Cost (USD)** | Formula | =(SUM Input Tokens/1M*3) + (SUM Output Tokens/1M*15) |

---

## GOOGLE DRIVE FOLDER STRUCTURE (for images)

Create this folder structure in Google Drive:
```
RECREA Instagram/
├── 01 - Content Queue/
│   ├── 2026-03/
│   │   ├── post-001-before-after/
│   │   │   ├── slide-1.jpg
│   │   │   ├── slide-2.jpg
│   │   │   └── slide-3.jpg
│   │   └── post-002-carpentry/
│   │       └── hero.jpg
│   └── 2026-04/
├── 02 - Published/
│   └── (move posts here after publishing)
├── 03 - Brand Assets/
│   ├── logo-white.png
│   ├── logo-dark.png
│   └── fonts/
└── 04 - Inspiration/
    └── (reference images)
```

**To get a public image URL from Google Drive:**
1. Right-click the image → Share → Anyone with link → Viewer
2. Copy the link (it looks like: `https://drive.google.com/file/d/FILE_ID/view`)
3. Convert to direct image URL: `https://drive.google.com/uc?export=view&id=FILE_ID`
4. Paste that direct URL in the "Image URL" column of Content Queue
