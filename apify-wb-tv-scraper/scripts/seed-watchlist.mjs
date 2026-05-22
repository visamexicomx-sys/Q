#!/usr/bin/env node
// Seed watchlist with a fixed list of products for a given chatId.
// One-shot helper — not called from cron.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { env, exit } from 'node:process';

const token = env.TELEGRAM_BOT_TOKEN;
const chat = parseInt(env.TELEGRAM_CHAT_ID || '0', 10);
if (!token || !chat) { console.error('env missing'); exit(1); }

const WATCHLIST = 'apify-wb-tv-scraper/report/watchlist.json';
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Products from the demo broadcast — "эти именно товары".
const products = [
    { id: '357676897', alias: 'Roborock Zeo Lite (стиралка)', threshold: 50000 },
    { id: '458921344', alias: 'iPhone 15 Pro 256GB',           threshold: null },
    { id: '391105672', alias: 'Sony WH-1000XM5',                threshold: 25000 },
    { id: '312445678', alias: 'Haier Grand',                    threshold: null },
];

const wl = existsSync(WATCHLIST) ? JSON.parse(readFileSync(WATCHLIST, 'utf8')) : { entries: [] };
const now = new Date().toISOString();
let added = 0, updated = 0;

for (const p of products) {
    const idx = wl.entries.findIndex((e) => e.chatId === chat && e.productId === p.id);
    const entry = {
        chatId: chat,
        productId: p.id,
        kind: 'product',
        alias: p.alias,
        threshold: p.threshold,
        region: 'Санкт-Петербург',
        dest: '-1123300',
        addedAt: idx >= 0 ? wl.entries[idx].addedAt : now,
        lastSnapshot: idx >= 0 ? wl.entries[idx].lastSnapshot : null,
        history: idx >= 0 ? wl.entries[idx].history : [],
        minSeen: idx >= 0 ? wl.entries[idx].minSeen : null,
        maxSeen: idx >= 0 ? wl.entries[idx].maxSeen : null,
    };
    if (idx >= 0) { wl.entries[idx] = entry; updated++; }
    else { wl.entries.push(entry); added++; }
}

writeFileSync(WATCHLIST, JSON.stringify({ updatedAt: now, entries: wl.entries }, null, 2));
console.log(`seeded: +${added} new, ${updated} updated → ${WATCHLIST}`);

// Send a confirmation to TG so the user sees the new watchlist.
const lines = [
    `✅ <b>Добавил в твой watchlist ${added + updated} товаров:</b>`,
    '',
];
for (const p of products) {
    const th = p.threshold ? ` · 🎯 ≤ ${fmt(p.threshold)} ₽` : '';
    lines.push(`• <code>${p.id}</code> · <b>${esc(p.alias)}</b>${th}`);
    lines.push(`  <a href="https://www.wildberries.ru/catalog/${p.id}/detail.aspx">Открыть на WB →</a>`);
}
lines.push('');
lines.push('<i>Текущие данные (цена/остаток/доставка) подтянутся при следующем cron-прогоне scraper\'а — для этого нужен RU egress (Yandex Cloud Function или RU VPS, см. <code>docs/SCRAPER-WITHOUT-APIFY.md</code>).</i>');
lines.push('');
lines.push('Команды для управления:');
lines.push('<code>/list</code> — показать все мои товары');
lines.push('<code>/threshold &lt;арт&gt; &lt;руб&gt;</code> — изменить порог');
lines.push('<code>/rename &lt;арт&gt; &lt;имя&gt;</code> — переименовать');
lines.push('<code>/untrack &lt;арт&gt;</code> — снять с отслеживания');

const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        chat_id: chat, text: lines.join('\n'),
        parse_mode: 'HTML', disable_web_page_preview: true,
    }),
});
const j = await r.json();
if (!j.ok) console.error('tg fail:', j.description);
else console.log('confirmation sent.');
