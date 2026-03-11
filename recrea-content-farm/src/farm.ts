/**
 * RECREA Content Farm — Main CLI entry point
 *
 * Usage:
 *   npx tsx src/farm.ts generate      # generate captions from pending briefs
 *   npx tsx src/farm.ts publish        # post next approved content to Instagram
 *   npx tsx src/farm.ts engage         # run daily hashtag engagement bot
 *   npx tsx src/farm.ts dm-server      # start the DM auto-responder webhook server
 *   npx tsx src/farm.ts all            # generate + publish + engage (full daily run)
 *
 * Configure all credentials in .env (copy from .env.example)
 */

import "dotenv/config";
import { generateBatch } from "./generator/caption-generator.js";
import { publishPost, validateImageUrl } from "./publisher/instagram-publisher.js";
import { runDailyEngagement } from "./engagement/engagement-bot.js";
import { startDmServer } from "./responder/dm-responder.js";
import {
  getPendingBriefs,
  markBriefAsGenerated,
  saveToQueue,
  getApprovedPost,
  markAsPublished,
} from "./sheets/sheets-client.js";
import {
  notifyCaptionReady,
  notifyPublished,
  notifyNoContent,
  notifyError,
} from "./telegram/notifier.js";

// ─── Validate required env vars ───────────────────────────────────────────────

function requireEnv(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`\n❌ Missing environment variables: ${missing.join(", ")}`);
    console.error("   Copy .env.example to .env and fill in your credentials.\n");
    process.exit(1);
  }
}

// ─── Command: generate ────────────────────────────────────────────────────────

async function cmdGenerate(): Promise<void> {
  requireEnv([
    "ANTHROPIC_API_KEY",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_SPREADSHEET_ID",
  ]);

  console.log("\n📋 RECREA Content Farm — Caption Generator");
  console.log("==========================================");

  const briefs = await getPendingBriefs();

  if (briefs.length === 0) {
    console.log("\n✅ No pending briefs found in Google Sheets.");
    console.log("   Add rows with status='pending' in the Content Briefs tab.");
    return;
  }

  const results = await generateBatch(briefs);

  let generated = 0;
  for (const { brief, caption } of results) {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]!;
    const timeStr = now.toTimeString().split(" ")[0]!;

    // Save to Content Queue sheet
    await saveToQueue({
      rowId: brief.rowId,
      topic: brief.topic,
      postType: brief.postType,
      hook: caption.hook,
      captionFull: caption.captionFull,
      captionOnly: caption.captionOnly,
      hashtags: caption.hashtags,
      hashtagCount: caption.hashtagCount,
      charCount: caption.charCount,
      generatedDate: dateStr,
      generatedTime: timeStr,
      status: "review_needed",
      inputTokens: caption.inputTokens,
      outputTokens: caption.outputTokens,
    });

    // Mark brief as done
    await markBriefAsGenerated(brief.rowIndex);

    // Telegram notification
    await notifyCaptionReady({
      topic: brief.topic,
      postType: brief.postType,
      hook: caption.hook,
      charCount: caption.charCount,
      hashtagCount: caption.hashtagCount,
    }).catch(console.warn);

    generated++;
    console.log(`\n✅ Saved: ${brief.rowId} → Content Queue`);
  }

  console.log(`\n🎉 Done! Generated ${generated} caption(s).`);
  console.log("   → Open Google Sheets → Content Queue");
  console.log("   → Review captions, add Image URLs, set status to 'approved'");
  console.log("   → Then run: npm run publish-post");
}

// ─── Command: publish ─────────────────────────────────────────────────────────

async function cmdPublish(): Promise<void> {
  requireEnv([
    "INSTAGRAM_ACCESS_TOKEN",
    "INSTAGRAM_USER_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_SPREADSHEET_ID",
  ]);

  console.log("\n📸 RECREA Content Farm — Auto Publisher");
  console.log("========================================");

  const post = await getApprovedPost();

  if (!post) {
    console.log("\n⚠️  No approved posts found in Content Queue.");
    console.log("   Set at least one row's status to 'approved' in Google Sheets.");
    await notifyNoContent().catch(() => {});
    return;
  }

  console.log(`\n📄 Found approved post: ${post.rowId}`);
  console.log(`   Topic: ${post.topic}`);
  console.log(`   Image: ${post.imageUrl || "(none)"}`);

  if (!post.imageUrl) {
    console.error("\n❌ This post has no Image URL. Add one in the Content Queue sheet.");
    return;
  }

  // Validate image is accessible
  console.log("\n   Validating image URL...");
  const valid = await validateImageUrl(post.imageUrl);
  if (!valid) {
    console.error(`\n❌ Image URL is not publicly accessible: ${post.imageUrl}`);
    console.error("   Make sure it's a direct HTTPS image link (not a Google Drive share URL).");
    console.error("   Use: https://drive.google.com/uc?export=view&id=FILE_ID");
    return;
  }
  console.log("   ✅ Image URL is valid.");

  try {
    const postId = await publishPost(post);
    const postedAt = new Date().toISOString();

    await markAsPublished(post.rowIndex!, postId, postedAt);
    await notifyPublished({ postId, postedAt }).catch(console.warn);

    console.log("\n🎉 Post published successfully!");
    console.log(`   Instagram Post ID: ${postId}`);
    console.log(`   Posted at: ${postedAt}`);
    console.log("\n⏰ Reminder: Reply to comments within the first 60 minutes for max reach!");
  } catch (err) {
    const msg = String(err);
    console.error(`\n❌ Publishing failed: ${msg}`);
    await notifyError("Auto-Publisher", msg).catch(() => {});
    process.exit(1);
  }
}

// ─── Command: engage ─────────────────────────────────────────────────────────

async function cmdEngage(): Promise<void> {
  requireEnv([
    "INSTAGRAM_ACCESS_TOKEN",
    "INSTAGRAM_USER_ID",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_SPREADSHEET_ID",
  ]);

  await runDailyEngagement();
}

// ─── Command: dm-server ───────────────────────────────────────────────────────

async function cmdDmServer(): Promise<void> {
  requireEnv([
    "PAGE_ACCESS_TOKEN",
    "WEBHOOK_VERIFY_TOKEN",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_PRIVATE_KEY",
    "GOOGLE_SPREADSHEET_ID",
  ]);

  startDmServer();
  // Keep process alive
  process.on("SIGINT", () => {
    console.log("\n\nShutting down DM server...");
    process.exit(0);
  });
}

// ─── Command: all (full daily run) ───────────────────────────────────────────

async function cmdAll(): Promise<void> {
  console.log("\n🚀 RECREA Content Farm — Full Daily Run");
  console.log("========================================");

  try {
    await cmdGenerate();
  } catch (err) {
    console.error("Generate step failed:", err);
    await notifyError("Generate step", String(err)).catch(() => {});
  }

  console.log("\n---\n");

  try {
    await cmdPublish();
  } catch (err) {
    console.error("Publish step failed:", err);
    await notifyError("Publish step", String(err)).catch(() => {});
  }

  console.log("\n---\n");

  try {
    await cmdEngage();
  } catch (err) {
    console.error("Engage step failed:", err);
    await notifyError("Engage step", String(err)).catch(() => {});
  }

  console.log("\n✅ Daily run complete.\n");
}

// ─── Router ───────────────────────────────────────────────────────────────────

const command = process.argv[2];

const COMMANDS: Record<string, () => Promise<void>> = {
  generate: cmdGenerate,
  publish: cmdPublish,
  engage: cmdEngage,
  "dm-server": cmdDmServer,
  all: cmdAll,
};

if (!command || !COMMANDS[command]) {
  console.log(`
RECREA Content Farm 🏗️

Commands:
  generate    — Generate captions from Google Sheets briefs (uses Claude Opus 4.6)
  publish     — Post next approved caption to Instagram
  engage      — Run daily hashtag engagement bot
  dm-server   — Start DM auto-responder (runs continuously)
  all         — Run generate + publish + engage in sequence

Usage:
  npm run generate
  npm run publish-post
  npm run engage
  npm run dm-server
  npm run run-all
`);
  process.exit(0);
}

COMMANDS[command]!().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  notifyError(command, String(err)).finally(() => process.exit(1));
});
