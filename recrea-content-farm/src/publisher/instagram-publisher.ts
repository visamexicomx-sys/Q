/**
 * Instagram publisher — posts to Instagram Business via the Meta Graph API.
 *
 * Flow:
 *  1. Create media container  → get creation_id
 *  2. Wait 30 seconds          (Instagram processes the image)
 *  3. Publish container        → get post media_id
 *
 * Requires:
 *  - INSTAGRAM_ACCESS_TOKEN  (long-lived, 60-day expiry)
 *  - INSTAGRAM_USER_ID       (your IG Business account numeric ID)
 *
 * Image URL must be a publicly accessible HTTPS direct image URL.
 * Use Google Drive (direct link), Cloudinary, or your own server.
 */

import type { ContentQueueRow } from "../types/index.js";

const IG_USER_ID = process.env.INSTAGRAM_USER_ID!;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;
const GRAPH_BASE = "https://graph.facebook.com/v19.0";

function graphUrl(path: string): string {
  return `${GRAPH_BASE}${path}`;
}

// ─── Step 1: Create media container ──────────────────────────────────────────

async function createMediaContainer(imageUrl: string, caption: string): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption: caption.slice(0, 2200), // IG limit
    access_token: ACCESS_TOKEN,
  });

  const res = await fetch(graphUrl(`/${IG_USER_ID}/media`), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = (await res.json()) as { id?: string; error?: { message: string } };

  if (!res.ok || !data.id) {
    throw new Error(
      `Failed to create media container: ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  return data.id;
}

// ─── Step 2: Check container status (optional but safer) ─────────────────────

async function waitForContainer(creationId: string, maxWaitMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      graphUrl(`/${creationId}?fields=status_code&access_token=${ACCESS_TOKEN}`)
    );
    const data = (await res.json()) as { status_code?: string };

    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`Container status: ${data.status_code}`);
    }

    // Still IN_PROGRESS — wait 5s and retry
    await new Promise((r) => setTimeout(r, 5000));
  }
  // Timed out — try publishing anyway (often works after 30s)
}

// ─── Step 3: Publish the container ───────────────────────────────────────────

async function publishContainer(creationId: string): Promise<string> {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: ACCESS_TOKEN,
  });

  const res = await fetch(graphUrl(`/${IG_USER_ID}/media_publish`), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const data = (await res.json()) as { id?: string; error?: { message: string } };

  if (!res.ok || !data.id) {
    throw new Error(
      `Failed to publish: ${data.error?.message ?? JSON.stringify(data)}`
    );
  }

  return data.id;
}

// ─── Main publish function ────────────────────────────────────────────────────

export async function publishPost(post: ContentQueueRow): Promise<string> {
  if (!post.imageUrl) {
    throw new Error(`Post "${post.rowId}" has no image URL — add one in Google Sheets.`);
  }

  const caption = post.captionFull.trim();

  console.log(`\n📸 Publishing post: "${post.topic}"`);
  console.log(`   Image: ${post.imageUrl}`);

  // 1. Create container
  console.log("   → Creating media container...");
  const creationId = await createMediaContainer(post.imageUrl, caption);
  console.log(`   ✅ Container created: ${creationId}`);

  // 2. Wait for Instagram to process the image
  console.log("   → Waiting for Instagram to process image...");
  await waitForContainer(creationId);

  // 3. Publish
  console.log("   → Publishing...");
  const postId = await publishContainer(creationId);

  console.log(`   ✅ Published! Post ID: ${postId}`);
  return postId;
}

// ─── Validate image URL is publicly accessible ────────────────────────────────

export async function validateImageUrl(url: string): Promise<boolean> {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("content-type") ?? "";
    return res.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}
