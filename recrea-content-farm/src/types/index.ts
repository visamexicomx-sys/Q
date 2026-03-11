// ─── Google Sheets row types ──────────────────────────────────────────────────

export interface ContentBrief {
  rowIndex: number; // 1-based row in the sheet
  rowId: string; // e.g. BRIEF-001
  topic: string;
  postType: string; // carousel | reel | single photo | educational post
  tone: string; // professional | inspiring | educational | casual
  cta: string;
  locationFocus: string;
  audience: string;
  status: "pending" | "generated";
  notes?: string;
}

export interface ContentQueueRow {
  rowIndex?: number;
  rowId: string;
  topic: string;
  postType: string;
  hook: string;
  captionFull: string;
  captionOnly: string;
  hashtags: string;
  hashtagCount: number;
  charCount: number;
  imageUrl?: string;
  locationTag?: string;
  generatedDate: string;
  generatedTime: string;
  status: "review_needed" | "approved" | "published" | "rejected";
  approvedBy?: string;
  instagramPostId?: string;
  postedAt?: string;
  inputTokens: number;
  outputTokens: number;
}

export interface DmLogRow {
  timestamp: string;
  senderId: string;
  originalMessage: string;
  keywordMatched: string;
  responseSent: string;
  autoReplied: "YES" | "NO";
  followUpNeeded: "YES" | "NO";
  leadStatus: "new" | "contacted" | "qualified" | "proposal" | "closed" | "lost";
}

export interface EngagementLogRow {
  date: string;
  hashtag: string;
  postId: string;
  action: string;
  commentText: string;
  timestamp: string;
}

// ─── Claude generation result ─────────────────────────────────────────────────

export interface GeneratedCaption {
  captionFull: string;
  captionOnly: string;
  hashtags: string;
  hashtagCount: number;
  charCount: number;
  hook: string;
  inputTokens: number;
  outputTokens: number;
}

// ─── Instagram API ────────────────────────────────────────────────────────────

export interface IgMediaCreateResponse {
  id: string; // creation_id
}

export interface IgPublishResponse {
  id: string; // post media id
}

export interface IgHashtagSearchResponse {
  data: Array<{ id: string }>;
}

export interface IgHashtagPostsResponse {
  data: Array<{
    id: string;
    media_type: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
  }>;
}

// ─── Webhook payload (Instagram Messenger) ────────────────────────────────────

export interface IgWebhookBody {
  object?: string;
  "hub.mode"?: string;
  "hub.challenge"?: string;
  "hub.verify_token"?: string;
  entry?: Array<{
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text: string;
      };
    }>;
  }>;
}

export interface ParsedDm {
  senderId: string;
  messageText: string;
  messageId: string;
  timestamp: number;
}
