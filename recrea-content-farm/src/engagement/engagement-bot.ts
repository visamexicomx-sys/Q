/**
 * Daily engagement bot — likes and comments on posts from target hashtags.
 *
 * Strategy:
 * - Rotates through 5 hashtag sets (one per weekday) to avoid spam detection
 * - Searches hashtag via Graph API → gets top recent posts → likes + comments
 * - Picks authentic, non-spammy comments from a curated library
 * - Logs every action to Google Sheets
 * - Sends a daily summary to Telegram
 *
 * Note: The Instagram Graph API hashtag search is rate-limited.
 * Max ~30 hashtag searches/hour per user. This bot stays well under that.
 */

import { logEngagement, getTodayEngagementCount } from "../sheets/sheets-client.js";
import { notifyEngagementSummary, notifyError } from "../telegram/notifier.js";

const IG_USER_ID = process.env.INSTAGRAM_USER_ID!;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;
const GRAPH_BASE = "https://graph.facebook.com/v19.0";

// ─── Hashtag sets — rotate by day of week ────────────────────────────────────

const HASHTAG_SETS: string[][] = [
  // Mon — Real estate investors
  ["TulumRealEstate", "RivieraMayaInvestment", "MexicoRealEstate", "InvestInMexico", "ForeignInvestorMexico"],
  // Tue — Expats and lifestyle
  ["ExpatMexico", "LivingInMexico", "MexicoLiving", "ExpatLife", "MovingToMexico"],
  // Wed — Luxury construction
  ["LuxuryVilla", "LuxuryConstruction", "VillaConstruction", "LuxuryHomes", "CustomHome"],
  // Thu — Tulum & Playa
  ["Tulum", "TulumMexico", "PlayaDelCarmen", "TulumVilla", "TulumStyle"],
  // Fri — General construction
  ["ConstructionMexico", "BuildInMexico", "MexicoConstruction", "ContractorMexico", "ConstructionLife"],
];

// ─── Authentic comment library ────────────────────────────────────────────────

const COMMENTS = [
  "🔥 Amazing space! The Riviera Maya never disappoints.",
  "🌴 Beautiful! This is exactly why we love building in Mexico.",
  "✨ Stunning. The quality of construction here keeps improving year by year!",
  "🏗️ Love seeing great projects in the Riviera Maya! This is what it's all about.",
  "🏡 Incredible. The Riviera Maya is truly a paradise for builders and investors.",
  "💎 This level of quality is what the Riviera Maya is known for. Beautiful work!",
  "🌊 Love this! The Caribbean light makes every space look incredible.",
  "🏗️ Great project! The Riviera Maya construction scene is really thriving right now.",
  "🌴 Beautiful space! Tulum's architecture is one of a kind.",
  "✅ This is what years of building experience looks like. Stunning results!",
];

function randomComment(): string {
  return COMMENTS[Math.floor(Math.random() * COMMENTS.length)]!;
}

// ─── Graph API helpers ────────────────────────────────────────────────────────

async function searchHashtagId(hashtag: string): Promise<string | null> {
  const url = `${GRAPH_BASE}/ig_hashtag_search?user_id=${IG_USER_ID}&q=${encodeURIComponent(hashtag)}&access_token=${ACCESS_TOKEN}`;
  const res = await fetch(url);
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  return data.data?.[0]?.id ?? null;
}

interface IgPost {
  id: string;
  media_type: string;
  like_count?: number;
}

async function getRecentPosts(hashtagId: string, limit = 10): Promise<IgPost[]> {
  const url =
    `${GRAPH_BASE}/${hashtagId}/recent_media` +
    `?user_id=${IG_USER_ID}` +
    `&fields=id,media_type,like_count,comments_count` +
    `&limit=${limit}` +
    `&access_token=${ACCESS_TOKEN}`;

  const res = await fetch(url);
  const data = (await res.json()) as { data?: IgPost[] };
  return data.data ?? [];
}

async function likePost(postId: string): Promise<boolean> {
  const url = `${GRAPH_BASE}/${postId}/likes?access_token=${ACCESS_TOKEN}`;
  const res = await fetch(url, { method: "POST" });
  return res.ok;
}

async function commentOnPost(postId: string, comment: string): Promise<boolean> {
  const url = `${GRAPH_BASE}/${postId}/comments`;
  const body = new URLSearchParams({ message: comment, access_token: ACCESS_TOKEN });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.ok;
}

// ─── Per-hashtag engagement run ───────────────────────────────────────────────

async function engageHashtag(
  hashtag: string,
  date: string,
  actionsLog: string[]
): Promise<number> {
  console.log(`   #${hashtag}...`);

  const hashtagId = await searchHashtagId(hashtag);
  if (!hashtagId) {
    console.log(`   ⚠️  Hashtag #${hashtag} not found — skipping`);
    return 0;
  }

  const posts = await getRecentPosts(hashtagId, 10);

  // Take top 3 image posts by like count
  const targets = posts
    .filter((p) => p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM")
    .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
    .slice(0, 3);

  let actionsThisHashtag = 0;

  for (const post of targets) {
    // Like
    const liked = await likePost(post.id);

    // Wait 5s between actions to avoid spam signals
    await new Promise((r) => setTimeout(r, 5000));

    // Comment
    const comment = randomComment();
    const commented = await commentOnPost(post.id, comment);

    if (liked || commented) {
      actionsThisHashtag++;
      actionsLog.push(`#${hashtag} | ${post.id}`);

      // Log to Sheets
      await logEngagement({
        date,
        hashtag,
        postId: post.id,
        action: "like + comment",
        commentText: comment,
        timestamp: new Date().toISOString(),
      }).catch(console.warn);
    }

    // 10s pause between posts
    await new Promise((r) => setTimeout(r, 10000));
  }

  return actionsThisHashtag;
}

// ─── Main daily engagement run ────────────────────────────────────────────────

export async function runDailyEngagement(): Promise<void> {
  const today = new Date();
  const date = today.toISOString().split("T")[0]!;

  // Rotate set based on day of week (0=Sun, skip; 1=Mon...5=Fri)
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log("📅 Weekend — engagement bot is resting.");
    return;
  }

  const setIndex = (dayOfWeek - 1) % HASHTAG_SETS.length;
  const todayHashtags = HASHTAG_SETS[setIndex]!;

  console.log(`\n🤖 Daily Engagement Bot — ${date}`);
  console.log(`   Hashtag set ${setIndex + 1}: ${todayHashtags.join(", ")}\n`);

  const actionsLog: string[] = [];
  let totalActions = 0;

  for (const hashtag of todayHashtags) {
    try {
      const actions = await engageHashtag(hashtag, date, actionsLog);
      totalActions += actions;
      console.log(`   ✅ #${hashtag} — ${actions} action(s)`);
    } catch (err) {
      console.warn(`   ⚠️  Error with #${hashtag}: ${err}`);
      await notifyError(`Engagement #${hashtag}`, String(err)).catch(() => {});
    }

    // 30s pause between hashtags
    await new Promise((r) => setTimeout(r, 30000));
  }

  console.log(`\n✅ Engagement complete. Total actions: ${totalActions}`);

  // Send summary to Telegram
  await notifyEngagementSummary({
    date,
    actionsCount: totalActions,
    hashtagsUsed: todayHashtags,
  }).catch(console.warn);
}
