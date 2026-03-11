/**
 * DM auto-responder — HTTP server that receives Instagram Messenger webhooks
 * and instantly replies with keyword-matched templates.
 *
 * Keyword → Response mapping:
 *   BUILD      → full project inquiry response
 *   GUIDE      → free investor checklist
 *   TULUM      → Tulum-specific response
 *   INVESTOR   → foreign investor welcome
 *   CARPENTRY  → carpentry portfolio
 *   PRICE      → pricing breakdown
 *   HOLA/HELLO → greeting
 *   (default)  → general welcome
 *
 * Setup: configure webhook in Meta Developer console to POST to:
 *   http://your-server.com:3000/webhook
 * with verify_token = WEBHOOK_VERIFY_TOKEN from your .env
 */

import http from "http";
import type { IgWebhookBody, ParsedDm } from "../types/index.js";
import { logDm } from "../sheets/sheets-client.js";
import {
  notifyHotLead,
  notifyError,
} from "../telegram/notifier.js";

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN!;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN!;
const PORT = Number(process.env.PORT ?? 3000);
const GRAPH_BASE = "https://graph.facebook.com/v19.0";

// ─── Response library ─────────────────────────────────────────────────────────

const RESPONSES: Record<string, { text: string; isHotLead: boolean }> = {
  build: {
    isHotLead: true,
    text: `Hi! 👋 Thanks for reaching out to RECREA Construcción!

We've been building villas, homes, and commercial spaces in the Riviera Maya for 18 years — 196 completed projects and counting.

To send you the right info, could you tell us:
📍 Where is your land? (Tulum, Playa, Cancún, Puerto Aventuras?)
🏡 What do you want to build?
📐 Approximate size or budget?

We'll get back to you with a full breakdown — no commitment needed! 🙌`,
  },
  guide: {
    isHotLead: true,
    text: `Thanks for your interest! 📋

Here's our FREE Investor Checklist:

✅ 10 questions to ask before hiring a contractor in Mexico
✅ Permit timeline and costs breakdown
✅ Materials guide for tropical climate
✅ Budget calculator template

👉 Full guide: construction-recrea.com/mx/guide

Any specific questions? Just reply here — we love helping investors! 🏗️`,
  },
  tulum: {
    isHotLead: true,
    text: `Tulum is one of our favorite areas to build! 🌴

We've completed multiple projects in the Tulum corridor — from the hotel zone to jungle lots near the biosphere reserve.

To give you the best info for your Tulum project:
📐 What are your lot dimensions?
🏡 What type of project? (Villa, renovation, commercial?)
📅 When are you thinking of starting?

DM us the details and we'll prepare a free estimate! 🏗️`,
  },
  investor: {
    isHotLead: true,
    text: `Welcome! You've come to the right place. 🌎

85% of our clients are foreign investors — we know exactly how to make building in Mexico smooth and stress-free.

Here's what we offer international investors:
✅ Full bilingual communication
✅ Weekly video/photo updates during construction
✅ We handle ALL permits and paperwork
✅ Transparent fixed-price contracts
✅ 18 years of experience in Riviera Maya

Want to start with a free consultation? Tell us about your project! 📲`,
  },
  carpentry: {
    isHotLead: false,
    text: `Our carpentry team is one of the best in the Riviera Maya! 🪵✨

We do 100% in-house custom work:
🚪 Custom doors and frames
🛋️ Built-in furniture
🍽️ Kitchen cabinetry
🪞 Walk-in closets
🪟 Custom windows

We'd love to show you our portfolio. What type of project are you working on?

👉 See examples: construction-recrea.com/mx/carpentry`,
  },
  price: {
    isHotLead: true,
    text: `Great question! Construction costs in the Riviera Maya depend on several factors:

📐 Size (m²)
📍 Location
🏗️ Project type
✨ Finish level

Rough ranges (USD):
• Standard residential: from $800/m²
• Mid-range villa: $1,200–$1,800/m²
• Luxury finishes: $2,000+/m²

Send us your project details and we'll give you a real estimate within 48h — no commitment needed! 👍`,
  },
  greeting: {
    isHotLead: false,
    text: `Hola! 👋 Welcome to RECREA Construcción!

We're a full-service construction company with 18 years in the Riviera Maya, Mexico.

We specialize in:
🏡 Luxury villas and residences
🏢 Commercial spaces
🔨 Full renovations

How can we help you? Tell us about your project! 🏗️

(Or type one of these: BUILD / PRICE / TULUM / GUIDE / INVESTOR)`,
  },
};

const DEFAULT_RESPONSE = `Hi! Thanks for messaging RECREA Construcción. 👋

We build luxury villas and commercial spaces in the Riviera Maya for 18 years.

Our team will get back to you shortly! In the meantime, tell us about your project:
📍 Location
🏡 Type of build
📐 Size / budget

Or visit: construction-recrea.com/mx`;

// ─── Keyword detection ────────────────────────────────────────────────────────

interface KeywordMatch {
  key: string;
  label: string;
}

function detectKeyword(text: string): KeywordMatch {
  const upper = text.toUpperCase();

  const mapping: Array<[string[], KeywordMatch]> = [
    [["BUILD", "CONSTRUIR", "QUIERO CONSTRUIR"], { key: "build", label: "BUILD" }],
    [["GUIDE", "GUIA", "CHECKLIST", "LISTA"], { key: "guide", label: "GUIDE" }],
    [["TULUM"], { key: "tulum", label: "TULUM" }],
    [["INVESTOR", "INVERSION", "INVERSIÓN", "INVEST"], { key: "investor", label: "INVESTOR" }],
    [["CARPENTRY", "CARPINTERIA", "CARPINTERÍA", "MUEBLES"], { key: "carpentry", label: "CARPENTRY" }],
    [["PRICE", "PRECIO", "COSTO", "COST", "QUOTE", "CUANTO", "CUÁNTO"], { key: "price", label: "PRICE" }],
    [["HOLA", "HELLO", "HI", "BUENOS DIAS", "BUENOS DÍAS"], { key: "greeting", label: "GREETING" }],
  ];

  for (const [keywords, match] of mapping) {
    if (keywords.some((k) => upper.includes(k))) return match;
  }

  return { key: "default", label: "NO KEYWORD" };
}

// ─── Send reply via Messenger API ────────────────────────────────────────────

async function sendReply(recipientId: string, text: string): Promise<void> {
  const url = `${GRAPH_BASE}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const body = JSON.stringify({
    recipient: { id: recipientId },
    message: { text },
    messaging_type: "RESPONSE",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Messenger API error: ${err}`);
  }
}

// ─── Parse webhook body ───────────────────────────────────────────────────────

async function parseBody(req: http.IncomingMessage): Promise<IgWebhookBody> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function extractDms(body: IgWebhookBody): ParsedDm[] {
  const dms: ParsedDm[] = [];
  for (const entry of body.entry ?? []) {
    for (const msg of entry.messaging ?? []) {
      if (msg.message?.text) {
        dms.push({
          senderId: msg.sender.id,
          messageText: msg.message.text,
          messageId: msg.message.mid,
          timestamp: msg.timestamp,
        });
      }
    }
  }
  return dms;
}

// ─── Process a single DM ─────────────────────────────────────────────────────

async function processDm(dm: ParsedDm): Promise<void> {
  const { key, label } = detectKeyword(dm.messageText);
  const responseData = key === "default" ? null : RESPONSES[key];
  const responseText = responseData?.text ?? DEFAULT_RESPONSE;
  const responseKey = key === "default" ? "default" : key;
  const isHotLead = responseData?.isHotLead ?? false;

  try {
    await sendReply(dm.senderId, responseText);
    console.log(`[DM] Replied to ${dm.senderId} — keyword: ${label}`);
  } catch (err) {
    console.error(`[DM] Failed to send reply: ${err}`);
  }

  // Log to Google Sheets
  try {
    await logDm({
      timestamp: new Date().toISOString(),
      senderId: dm.senderId,
      originalMessage: dm.messageText.slice(0, 500),
      keywordMatched: label,
      responseSent: responseKey,
      autoReplied: "YES",
      followUpNeeded: key === "default" ? "YES" : "NO",
      leadStatus: "new",
    });
  } catch (err) {
    console.warn(`[DM] Failed to log to Sheets: ${err}`);
  }

  // Alert Telegram for hot leads
  if (isHotLead || key === "default") {
    await notifyHotLead({
      keyword: label,
      originalMessage: dm.messageText,
      senderId: dm.senderId,
      responseKey,
    }).catch(console.warn);
  }
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

export function startDmServer(): void {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    // ── Webhook verification (GET) ──
    if (req.method === "GET" && url.pathname === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
        console.log("[Webhook] Verification successful ✅");
        res.writeHead(200);
        res.end(challenge);
      } else {
        res.writeHead(403);
        res.end("Forbidden");
      }
      return;
    }

    // ── Incoming DM events (POST) ──
    if (req.method === "POST" && url.pathname === "/webhook") {
      // Respond 200 immediately — Instagram requires fast response
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("EVENT_RECEIVED");

      try {
        const body = await parseBody(req);
        const dms = extractDms(body);

        for (const dm of dms) {
          processDm(dm).catch((err) =>
            notifyError("DM processing", String(err))
          );
        }
      } catch (err) {
        console.error("[Webhook] Error processing body:", err);
      }
      return;
    }

    // ── Health check ──
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(PORT, () => {
    console.log(`\n🤖 DM Responder running on port ${PORT}`);
    console.log(`   Webhook URL: http://your-server.com:${PORT}/webhook`);
    console.log(`   Health:      http://localhost:${PORT}/health`);
    console.log("\n   Waiting for Instagram DMs...\n");
  });
}
