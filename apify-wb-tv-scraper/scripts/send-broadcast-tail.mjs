#!/usr/bin/env node
// One-shot helper: send the missing tier 6 (ATL) + outro that got cut off.

import { readFileSync } from 'node:fs';
import { env, exit } from 'node:process';

const token = env.TELEGRAM_BOT_TOKEN;
const chat = env.TELEGRAM_ALERT_CHAT_ID || env.TELEGRAM_CHAT_ID;
if (!token || !chat) { console.error('env missing'); exit(1); }

const data = JSON.parse(readFileSync('apify-wb-tv-scraper/report/MODELS.json', 'utf8'));
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

const candidates = (data.models || [])
    .filter((m) => m.sellers >= 2 && m.median > 0 && m.items?.length)
    .sort((a, b) => (b.max / b.min) - (a.max / a.min));
const m = candidates[5] || candidates[0];
const diag = m.diagonals.join('/') + '"';
const cheap = m.items[0];

const tg = (method, body) => fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then((r) => r.json());

const text = [
    `🟢 <b>Новый all-time low</b> <i>[ТЕСТ 6/6]</i>`,
    '',
    `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
    `Новый ATL: <b>${fmt(m.min)} ₽</b>`,
    `Продавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽`,
    `${link('Открыть → ' + cheap.id, cheap.url)}`,
].join('\n');

await tg('sendMessage', { chat_id: chat, parse_mode: 'HTML', disable_web_page_preview: true, text });
console.log('tier 6 sent');

await tg('sendMessage', {
    chat_id: chat, parse_mode: 'HTML',
    text: '✅ <b>Тест завершён</b>\n\nВ боевом режиме такие сообщения уходят только при <i>реальных</i> срабатываниях после каждого скрапа. Дубликаты не присылаются (alerts-state.json).\n\n<b>Новое:</b> добавлены ещё 2 тира — 🚨 PANIC SALE (падение ≥3%/день) и 🔴 Почти-ATL (в 2% от дна).',
});
console.log('outro sent');
