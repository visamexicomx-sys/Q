/**
 * Telegram notifier — sends real-time alerts to your phone.
 * Create a bot via @BotFather, start a chat, get your chat ID
 * from https://api.telegram.org/bot{TOKEN}/getUpdates
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

async function send(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("[Telegram] Skipped (no credentials configured)");
    return;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = JSON.stringify({
    chat_id: CHAT_ID,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`[Telegram] Failed to send: ${err}`);
  }
}

// ─── Notification templates ───────────────────────────────────────────────────

export async function notifyCaptionReady(params: {
  topic: string;
  postType: string;
  hook: string;
  charCount: number;
  hashtagCount: number;
}): Promise<void> {
  await send(
    `🤖 *RECREA Content Farm*\n\n` +
      `✅ Nueva caption generada y lista para revisión:\n\n` +
      `*Topic:* ${params.topic}\n` +
      `*Type:* ${params.postType}\n` +
      `*Hook:* _${params.hook.slice(0, 80)}_\n` +
      `*Chars:* ${params.charCount} | *Hashtags:* ${params.hashtagCount}\n\n` +
      `👉 Revisa y aprueba en Google Sheets → Content Queue\n` +
      `Cambia status a *approved* cuando esté lista para publicar.`
  );
}

export async function notifyPublished(params: {
  postId: string;
  postedAt: string;
}): Promise<void> {
  await send(
    `✅ *RECREA — Post Publicado!*\n\n` +
      `📸 Publicado en Instagram exitosamente.\n\n` +
      `*Post ID:* \`${params.postId}\`\n` +
      `*Publicado:* ${params.postedAt}\n\n` +
      `⏳ Responde comentarios en los primeros 60 minutos para máximo alcance!`
  );
}

export async function notifyNoContent(): Promise<void> {
  await send(
    `⚠️ *RECREA Content Farm — Sin contenido*\n\n` +
      `No hay posts con status *approved* en Google Sheets.\n\n` +
      `👉 Abre Content Queue y cambia el status de algún post a \`approved\`.`
  );
}

export async function notifyHotLead(params: {
  keyword: string;
  originalMessage: string;
  senderId: string;
  responseKey: string;
}): Promise<void> {
  await send(
    `🔥 *RECREA — Nuevo Lead por DM!*\n\n` +
      `📩 Keyword: *${params.keyword}*\n\n` +
      `💬 Mensaje:\n_"${params.originalMessage.slice(0, 150)}"_\n\n` +
      `✅ Auto-respuesta enviada: *${params.responseKey}*\n` +
      `👤 Sender ID: \`${params.senderId}\`\n\n` +
      `⚡ Responde en Instagram para cerrar el lead!`
  );
}

export async function notifyEngagementSummary(params: {
  date: string;
  actionsCount: number;
  hashtagsUsed: string[];
}): Promise<void> {
  await send(
    `📊 *RECREA — Engagement Diario*\n` +
      `📅 ${params.date}\n\n` +
      `✅ Acciones completadas: *${params.actionsCount}*\n` +
      `#️⃣ Hashtags trabajados: ${params.hashtagsUsed.join(", ")}\n\n` +
      `🤖 El engagement bot completó su trabajo de hoy. 📈`
  );
}

export async function notifyError(context: string, error: string): Promise<void> {
  await send(
    `❌ *RECREA Content Farm — Error*\n\n` +
      `*Context:* ${context}\n` +
      `*Error:* \`${error.slice(0, 300)}\``
  );
}
