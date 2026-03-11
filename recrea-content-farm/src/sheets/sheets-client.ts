/**
 * Google Sheets client — reads/writes all 4 farm tabs via the Sheets v4 API.
 * Uses a Service Account (no OAuth flow needed for server-side automation).
 *
 * Setup: console.cloud.google.com → IAM → Service Accounts → Create key (JSON)
 * Then share your spreadsheet with the service account email (Editor access).
 */
import { google, sheets_v4 } from "googleapis";
import type {
  ContentBrief,
  ContentQueueRow,
  DmLogRow,
  EngagementLogRow,
} from "../types/index.js";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// ─── Helper: get all rows from a tab ─────────────────────────────────────────

async function getRows(tab: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: tab,
  });
  return (res.data.values ?? []) as string[][];
}

// ─── Helper: append a row ─────────────────────────────────────────────────────

async function appendRow(tab: string, values: (string | number)[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

// ─── Helper: update a specific row ───────────────────────────────────────────

async function updateRow(
  tab: string,
  rowIndex: number, // 1-based
  values: (string | number)[]
): Promise<void> {
  const sheets = getSheetsClient();
  // Build a range like "Content Briefs!A5:Z5"
  const range = `${tab}!A${rowIndex}:Z${rowIndex}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

// ─── Content Briefs ───────────────────────────────────────────────────────────

const BRIEFS_TAB = "Content Briefs";

export async function getPendingBriefs(): Promise<ContentBrief[]> {
  const rows = await getRows(BRIEFS_TAB);
  if (rows.length < 2) return [];

  // Row 0 = header
  return rows
    .slice(1)
    .map((row, i) => ({
      rowIndex: i + 2, // +2 because slice starts at row 2
      rowId: row[0] ?? "",
      topic: row[2] ?? "",
      postType: row[3] ?? "single photo",
      tone: row[4] ?? "professional",
      cta: row[5] ?? "DM us",
      locationFocus: row[6] ?? "Riviera Maya",
      audience: row[7] ?? "foreign investors",
      status: (row[8] ?? "pending") as ContentBrief["status"],
      notes: row[10] ?? "",
    }))
    .filter((b) => b.status === "pending" && b.rowId !== "");
}

export async function markBriefAsGenerated(rowIndex: number): Promise<void> {
  const sheets = getSheetsClient();
  // Only update column I (index 8 = status)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${BRIEFS_TAB}!I${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["generated"]] },
  });
}

// ─── Content Queue ────────────────────────────────────────────────────────────

const QUEUE_TAB = "Content Queue";

export async function saveToQueue(row: ContentQueueRow): Promise<void> {
  await appendRow(QUEUE_TAB, [
    row.rowId,
    row.topic,
    row.postType,
    row.hook,
    row.captionFull,
    row.captionOnly,
    row.hashtags,
    row.hashtagCount,
    row.charCount,
    row.imageUrl ?? "",
    row.locationTag ?? "",
    row.generatedDate,
    row.generatedTime,
    row.status,
    row.approvedBy ?? "",
    "", // Scheduled Date
    "", // Scheduled Time
    "", // Instagram Post ID
    "", // Posted At
    "", // Likes
    "", // Comments
    "", // Reach
    row.inputTokens,
    row.outputTokens,
  ]);
}

export async function getApprovedPost(): Promise<(ContentQueueRow & { rowIndex: number }) | null> {
  const rows = await getRows(QUEUE_TAB);
  if (rows.length < 2) return null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const status = row[13] ?? "";
    if (status === "approved") {
      return {
        rowIndex: i + 1,
        rowId: row[0] ?? "",
        topic: row[1] ?? "",
        postType: row[2] ?? "",
        hook: row[3] ?? "",
        captionFull: row[4] ?? "",
        captionOnly: row[5] ?? "",
        hashtags: row[6] ?? "",
        hashtagCount: Number(row[7] ?? 0),
        charCount: Number(row[8] ?? 0),
        imageUrl: row[9] ?? "",
        locationTag: row[10] ?? "",
        generatedDate: row[11] ?? "",
        generatedTime: row[12] ?? "",
        status: "approved",
        inputTokens: Number(row[22] ?? 0),
        outputTokens: Number(row[23] ?? 0),
      };
    }
  }
  return null;
}

export async function markAsPublished(
  rowIndex: number,
  instagramPostId: string,
  postedAt: string
): Promise<void> {
  const sheets = getSheetsClient();
  // Update status (N), Instagram Post ID (R), Posted At (S)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        { range: `${QUEUE_TAB}!N${rowIndex}`, values: [["published"]] },
        { range: `${QUEUE_TAB}!R${rowIndex}`, values: [[instagramPostId]] },
        { range: `${QUEUE_TAB}!S${rowIndex}`, values: [[postedAt]] },
      ],
    },
  });
}

// ─── DM Log ───────────────────────────────────────────────────────────────────

const DM_TAB = "DM Log";

export async function logDm(row: DmLogRow): Promise<void> {
  await appendRow(DM_TAB, [
    row.timestamp,
    row.senderId,
    row.originalMessage,
    row.keywordMatched,
    row.responseSent,
    row.autoReplied,
    row.followUpNeeded,
    row.leadStatus,
    "", // Lead Name — filled manually
    "", // Lead Email
    "", // Lead Country
    "", // Project Type
    "", // Budget Range
    "", // Notes
  ]);
}

// ─── Engagement Log ───────────────────────────────────────────────────────────

const ENGAGEMENT_TAB = "Engagement Log";

export async function logEngagement(row: EngagementLogRow): Promise<void> {
  await appendRow(ENGAGEMENT_TAB, [
    row.date,
    row.hashtag,
    row.postId,
    row.action,
    row.commentText,
    row.timestamp,
  ]);
}

export async function getTodayEngagementCount(): Promise<number> {
  const rows = await getRows(ENGAGEMENT_TAB);
  const today = new Date().toISOString().split("T")[0]!;
  return rows.slice(1).filter((r) => (r[0] ?? "").startsWith(today)).length;
}
