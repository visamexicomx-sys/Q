---
name: smm-automation-agent
description: Full-service Social Media Marketing automation agent. Automates content creation, scheduling, multi-platform publishing, analytics, engagement, campaign management, A/B testing, hashtag research, competitor analysis, and content calendar planning across all major social platforms.
---

# SMM Automation Agent

A fully automatic Social Media Marketing agent that manages your entire social media presence end-to-end. From content creation to analytics — zero manual intervention required.

## When to Use This Skill

Use this skill when the user asks to:

- Set up automated social media marketing
- Create and schedule social media posts across platforms
- Build a content calendar for social media
- Automate social media engagement and responses
- Analyze social media performance and generate reports
- Run A/B tests on social media content
- Research hashtags and trending topics
- Monitor competitors on social media
- Create social media campaigns
- Manage multi-platform social media publishing
- Generate social media content in bulk
- Set up auto-reply and engagement bots
- Track social media KPIs and ROI

## Architecture Overview

```
smm-automation-agent/
├── SKILL.md                    # This skill file
├── smm_agent/
│   ├── __init__.py             # Package init
│   ├── config.py               # Configuration & API keys management
│   ├── core.py                 # Core orchestrator engine
│   ├── platforms/
│   │   ├── __init__.py
│   │   ├── base.py             # Abstract platform connector
│   │   ├── twitter.py          # Twitter/X API connector
│   │   ├── instagram.py        # Instagram Graph API connector
│   │   ├── linkedin.py         # LinkedIn API connector
│   │   ├── facebook.py         # Facebook Pages API connector
│   │   ├── tiktok.py           # TikTok API connector
│   │   ├── youtube.py          # YouTube Data API connector
│   │   ├── pinterest.py        # Pinterest API connector
│   │   └── threads.py          # Threads API connector
│   ├── content/
│   │   ├── __init__.py
│   │   ├── generator.py        # AI content generation engine
│   │   ├── templates.py        # Content templates library
│   │   ├── media.py            # Image/video processing
│   │   └── hashtags.py         # Hashtag research & optimization
│   ├── scheduler/
│   │   ├── __init__.py
│   │   ├── calendar.py         # Content calendar management
│   │   ├── queue.py            # Post queue & scheduling engine
│   │   └── optimal_times.py    # Best posting time calculator
│   ├── analytics/
│   │   ├── __init__.py
│   │   ├── tracker.py          # Metrics collection & tracking
│   │   ├── reports.py          # Report generation
│   │   ├── ab_testing.py       # A/B test framework
│   │   └── competitor.py       # Competitor analysis
│   ├── engagement/
│   │   ├── __init__.py
│   │   ├── auto_reply.py       # Automated response system
│   │   ├── monitor.py          # Mention & comment monitoring
│   │   └── community.py        # Community management
│   └── campaigns/
│       ├── __init__.py
│       ├── manager.py          # Campaign lifecycle management
│       ├── budget.py           # Budget allocation & tracking
│       └── funnel.py           # Marketing funnel automation
├── config/
│   ├── default_config.yaml     # Default configuration
│   └── platform_limits.yaml    # Platform-specific limits
├── templates/
│   ├── content_calendar.json   # Calendar template
│   └── report_template.html    # Analytics report template
└── requirements.txt            # Python dependencies
```

## Setup & Configuration

### Step 1: Install Dependencies

```bash
pip install -r skills/smm-automation-agent/requirements.txt
```

### Step 2: Configure API Keys

Create a `.env` file or set environment variables:

```bash
# Twitter/X API
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_TOKEN_SECRET=your_token_secret
TWITTER_BEARER_TOKEN=your_bearer_token

# Instagram / Facebook (Meta)
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_account_id
FACEBOOK_PAGE_ID=your_page_id

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token

# TikTok
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_ACCESS_TOKEN=your_access_token

# YouTube
YOUTUBE_API_KEY=your_api_key
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret

# Pinterest
PINTEREST_ACCESS_TOKEN=your_access_token

# Threads
THREADS_ACCESS_TOKEN=your_access_token

# AI Content Generation (optional - uses Claude by default)
ANTHROPIC_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key

# Storage
DATABASE_URL=sqlite:///smm_agent.db
REDIS_URL=redis://localhost:6379
```

### Step 3: Initialize

```bash
python -m smm_agent.core init
```

## Workflow — Fully Automatic Mode

### Phase 1: Strategy Setup (One-Time)

The agent will ask for:

1. **Brand Identity** — Name, voice, values, visual style
2. **Target Platforms** — Which platforms to manage
3. **Target Audience** — Demographics, interests, pain points
4. **Content Pillars** — 3-5 content themes (e.g., educational, behind-the-scenes, promotional)
5. **Posting Frequency** — Posts per platform per week
6. **Goals** — Followers, engagement rate, conversions, brand awareness
7. **Competitors** — 3-5 competitor accounts to monitor

### Phase 2: Automated Content Pipeline

```
[Content Pillars] → [AI Generator] → [Brand Voice Filter] → [Media Attachment]
       ↓                                                           ↓
[Hashtag Research] → [Platform Optimization] → [Schedule Queue] → [Auto-Post]
       ↓                                                           ↓
[A/B Variants] → [Performance Tracking] → [ML Optimization] → [Next Cycle]
```

### Phase 3: Continuous Operations

The agent runs these loops automatically:

| Loop | Frequency | Action |
|------|-----------|--------|
| Content Generation | Daily | Generate next day's content batch |
| Scheduling | Every 6 hours | Fill queue gaps, adjust timing |
| Publishing | Per schedule | Post content at optimal times |
| Engagement | Every 15 min | Reply to comments, DMs, mentions |
| Analytics | Hourly | Collect metrics from all platforms |
| Reporting | Weekly/Monthly | Generate performance reports |
| Optimization | Weekly | Adjust strategy based on data |
| Competitor Watch | Daily | Monitor competitor activity |
| Trend Detection | Every 2 hours | Detect trending topics to capitalize on |
| A/B Analysis | After 48 hours | Evaluate variant performance |

## Content Generation System

### Supported Content Types

| Type | Platforms | Auto-Generated |
|------|-----------|----------------|
| Text posts | All | Yes |
| Image posts | Instagram, Facebook, Pinterest, LinkedIn | Yes (AI + templates) |
| Stories | Instagram, Facebook | Yes |
| Reels/Short video | Instagram, TikTok, YouTube Shorts | Script + captions |
| Carousels | Instagram, LinkedIn | Yes |
| Threads | Twitter/X, Threads | Yes |
| Polls | Twitter/X, LinkedIn, Instagram | Yes |
| Articles | LinkedIn | Yes |
| Pins | Pinterest | Yes |

### Content Pillars Framework

```yaml
content_pillars:
  educational:
    weight: 30%
    formats: [tips, how-to, explainer, myth-busting]
    tone: authoritative, helpful

  engagement:
    weight: 25%
    formats: [polls, questions, challenges, UGC-prompts]
    tone: conversational, fun

  promotional:
    weight: 15%
    formats: [product-highlight, case-study, testimonial, offer]
    tone: compelling, value-driven

  behind_the_scenes:
    weight: 15%
    formats: [team, process, culture, milestones]
    tone: authentic, personal

  trending:
    weight: 15%
    formats: [newsjacking, trend-commentary, memes]
    tone: timely, relevant
```

### AI Content Generation Rules

1. **Never repeat** — Track all generated content, ensure uniqueness
2. **Platform-native** — Adapt format, length, and style per platform
3. **Brand voice lock** — Every piece passes through brand voice filter
4. **Hook-first** — First line must stop the scroll
5. **CTA rotation** — Cycle through different calls-to-action
6. **Emoji calibration** — Platform-appropriate emoji usage
7. **Accessibility** — Alt text for images, captions for video

## Hashtag Engine

### Research Process

```
[Seed Keywords] → [Expansion] → [Volume Check] → [Competition Score]
                                                        ↓
[Final Selection] ← [Brand Safety Check] ← [Relevance Filter]
```

### Hashtag Strategy

| Category | Count | Purpose |
|----------|-------|---------|
| Brand hashtags | 1-2 | Brand recognition (#YourBrand) |
| Campaign hashtags | 1 | Track campaign performance |
| Industry hashtags | 3-5 | Reach target audience |
| Trending hashtags | 1-2 | Ride trending waves |
| Niche hashtags | 3-5 | High engagement, low competition |
| Location hashtags | 1-2 | Local reach (if applicable) |

### Platform-Specific Limits

| Platform | Max Hashtags | Recommended |
|----------|-------------|-------------|
| Instagram | 30 | 8-15 |
| Twitter/X | No limit | 2-3 |
| LinkedIn | No limit | 3-5 |
| TikTok | No limit | 4-6 |
| Facebook | No limit | 1-3 |
| Pinterest | 20 | 2-5 |

## Scheduling Intelligence

### Optimal Posting Times (Auto-Calculated)

The agent learns your audience's active hours from analytics data. Default starting points:

| Platform | Best Times (UTC) | Best Days |
|----------|-----------------|-----------|
| Twitter/X | 09:00, 12:00, 17:00 | Tue-Thu |
| Instagram | 11:00, 14:00, 19:00 | Tue, Wed, Fri |
| LinkedIn | 07:30, 12:00, 17:30 | Tue-Thu |
| Facebook | 09:00, 13:00, 16:00 | Wed-Fri |
| TikTok | 10:00, 14:00, 21:00 | Tue, Thu, Fri |
| Pinterest | 14:00, 20:00, 23:00 | Sat, Sun |

### Queue Management

```
Priority Levels:
  P0 — Time-sensitive (trending topics, crisis response)
  P1 — Campaign content (scheduled launches)
  P2 — Evergreen content (regular posts)
  P3 — Filler content (quotes, repurposed)

Queue Rules:
  - Never post within 2 hours of last post on same platform
  - Spread content types across the day
  - Prioritize engagement windows
  - Auto-reschedule if breaking news detected
```

## Analytics & Reporting

### Tracked Metrics

| Category | Metrics |
|----------|---------|
| Reach | Impressions, reach, profile visits |
| Engagement | Likes, comments, shares, saves, clicks |
| Growth | Follower count, follow/unfollow rate |
| Content | Top posts, content type performance |
| Audience | Demographics, active hours, interests |
| Conversion | Link clicks, CTR, website traffic |
| ROI | Cost per engagement, revenue attribution |

### Automated Reports

**Daily Digest** (Slack/Email):
- Posts published today
- Engagement summary
- Notable comments/mentions
- Trending topics in your niche

**Weekly Report**:
- Week-over-week growth
- Top performing content
- Engagement rate trends
- Competitor comparison
- Recommendations for next week

**Monthly Report**:
- Month-over-month trends
- Campaign performance
- ROI analysis
- Audience growth analysis
- Content pillar performance
- Strategic recommendations

### A/B Testing Framework

```yaml
ab_test:
  name: "CTA Style Test"
  variable: cta_text
  variants:
    a: "Learn more →"
    b: "Try it free today"
  success_metric: click_through_rate
  sample_size: 1000
  duration: 48h
  auto_winner: true  # Automatically deploy winning variant
```

## Engagement Automation

### Auto-Reply System

```yaml
auto_reply_rules:
  - trigger: "question"
    action: "ai_response"
    tone: "helpful"
    max_delay: "5m"

  - trigger: "positive_sentiment"
    action: "thank_and_engage"
    responses: ["Thanks! Glad you enjoyed it 🙏", "Appreciate the love! ❤️"]
    max_delay: "15m"

  - trigger: "negative_sentiment"
    action: "empathize_and_redirect"
    escalate_to: "human"
    max_delay: "5m"

  - trigger: "purchase_intent"
    action: "provide_link"
    include_cta: true
    max_delay: "2m"

  - trigger: "mention"
    action: "acknowledge"
    max_delay: "10m"

  - trigger: "spam"
    action: "hide_and_report"
    max_delay: "1m"
```

### Community Management

- **Welcome new followers** — Automated DM with value offer
- **Engage with industry accounts** — Like/comment on relevant posts
- **UGC curation** — Detect and reshare user-generated content
- **Influencer detection** — Flag high-value engagement opportunities
- **Crisis detection** — Alert on negative sentiment spikes

## Campaign Management

### Campaign Lifecycle

```
[Plan] → [Create Assets] → [Schedule] → [Launch] → [Monitor] → [Optimize] → [Report]
```

### Campaign Types

| Type | Duration | Content Volume | Platforms |
|------|----------|---------------|-----------|
| Product Launch | 2-4 weeks | 20-40 posts | All |
| Event Promotion | 1-3 weeks | 15-30 posts | All |
| Brand Awareness | Ongoing | 5-10/week | All |
| Lead Generation | 2-8 weeks | 10-20 posts | LinkedIn, Facebook |
| Seasonal | 1-2 weeks | 10-15 posts | All |
| Contest/Giveaway | 1 week | 5-10 posts | Instagram, Twitter |

### Budget Tracking

```yaml
campaign_budget:
  total: 5000
  allocation:
    content_creation: 20%
    paid_promotion: 50%
    influencer_collab: 20%
    tools_and_analytics: 10%
  tracking:
    cost_per_click: auto
    cost_per_engagement: auto
    cost_per_follower: auto
    roas: auto
```

## Competitor Analysis

### Monitoring Framework

```yaml
competitors:
  - handle: "@competitor1"
    platforms: [twitter, instagram, linkedin]
    track:
      - posting_frequency
      - content_types
      - engagement_rates
      - hashtag_strategy
      - top_performing_content
      - follower_growth
      - campaign_detection
```

### Competitive Intelligence Reports

- **Content gap analysis** — Topics competitors cover that you don't
- **Engagement benchmarking** — Your metrics vs. industry average
- **Trend adoption speed** — How fast competitors jump on trends
- **Audience overlap** — Shared audience analysis
- **Strategy recommendations** — Data-driven suggestions

## Platform-Specific Optimizations

### Twitter/X
- Thread creation for long-form content
- Quote tweet strategy
- Space/audio event promotion
- Community tab management
- Poll engagement loops

### Instagram
- Carousel optimization (hook slide + value slides + CTA)
- Story sequence planning (polls → content → swipe-up)
- Reel trend detection and script generation
- Bio link rotation
- Highlight curation

### LinkedIn
- Document/carousel posts for thought leadership
- Newsletter integration
- Employee advocacy coordination
- Company page + personal brand sync
- Lead gen form integration

### TikTok
- Trend sound detection
- Duet/stitch opportunity identification
- Hook optimization (first 3 seconds)
- Comment pinning strategy
- Live scheduling

### Facebook
- Group management automation
- Event creation and promotion
- Marketplace integration
- Messenger bot coordination
- Watch party scheduling

## CLI Commands

```bash
# Initialize the SMM agent
python -m smm_agent.core init

# Start the fully automatic agent
python -m smm_agent.core start

# Generate content for today
python -m smm_agent.core generate --date today

# Schedule content
python -m smm_agent.core schedule --platform all

# View analytics dashboard
python -m smm_agent.core analytics --period 7d

# Run competitor analysis
python -m smm_agent.core competitors --report

# Manage campaigns
python -m smm_agent.core campaign create "Summer Launch"
python -m smm_agent.core campaign status "Summer Launch"

# Generate reports
python -m smm_agent.core report --type weekly --format html

# A/B test management
python -m smm_agent.core ab-test create --name "CTA Test"
python -m smm_agent.core ab-test results --name "CTA Test"

# Hashtag research
python -m smm_agent.core hashtags --seed "marketing,AI,startup"

# Health check
python -m smm_agent.core health

# Stop the agent
python -m smm_agent.core stop
```

## Safety & Compliance

### Content Safety Rules

1. **Human approval queue** — Flag sensitive content for review
2. **Brand safety filter** — Block controversial topics
3. **Legal compliance** — FTC disclosure for sponsored content (#ad, #sponsored)
4. **Rate limiting** — Respect platform API limits
5. **Data privacy** — GDPR/CCPA compliant data handling
6. **Sentiment guard** — Pause auto-engagement during crises
7. **Duplicate prevention** — Never post identical content twice
8. **Time-zone awareness** — Respect audience local times

### Error Handling

```yaml
error_handling:
  api_failure:
    retry: 3
    backoff: exponential
    fallback: queue_for_later

  content_rejection:
    action: flag_for_review
    notify: slack

  rate_limit:
    action: pause_and_resume
    respect_reset_header: true

  auth_expired:
    action: refresh_token
    fallback: notify_admin
```

## Quality Checklist

Before any content is published, the agent verifies:

- [ ] Matches brand voice and tone guidelines
- [ ] Contains no spelling or grammar errors
- [ ] Has appropriate hashtags for the platform
- [ ] Includes media (image/video) where applicable
- [ ] CTA is clear and actionable
- [ ] No duplicate or near-duplicate recent content
- [ ] Complies with platform-specific formatting rules
- [ ] Passes brand safety check
- [ ] Scheduled at an optimal time
- [ ] A/B variant created (if testing is active)
- [ ] Alt text provided for accessibility
- [ ] Links are valid and tracked (UTM parameters)
