#!/usr/bin/env node
// Personal watchlist alerter.
//
// Reads report/watchlist.json (entries written by /watch bot command):
//   { entries: [ { chatId, modelKey, threshold, addedAt, label } ] }
//
// For each entry, if current MODELS.json[modelKey].min ≤ threshold (or any threshold),
// sends a DM to that chatId and marks the alert as fired in alerts-state.json
// to avoid spam (re-fires only if min drops further).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, env, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const modelsPath = arg('models', 'apify-wb-tv-scraper/report/MODELS.json');
const watchlistPath = arg('watchlist', 'apify-wb-tv-scraper/report/watchlist.json');
const statePath = arg('state', 'apify-wb-tv-scraper/report/alerts-state.json');
const token = env.TELEGRAM_BOT_TOKEN;

if (!token) { console.log('watchlist-check: TELEGRAM_BOT_TOKEN missing — skip'); exit(0); }
if (!existsSync(watchlistPath)) { console.log('watchlist-check: no watchlist yet'); exit(0); }
if (!existsSync(modelsPath)) { console.log('watchlist-check: MODELS.json missing'); exit(0); }

const wl = JSON.parse(readFileSync(watchlistPath, 'utf8'));
const models = JSON.parse(readFileSync(modelsPath, 'utf8'));
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { dispatched: {} };

const byKey = new Map(models.models.map((m) => [m.key, m]));
const now = new Date().toISOString();
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tg(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
}

let sent = 0;
for (const entry of (wl.entries || [])) {
    const m = byKey.get(entry.modelKey);
    if (!m) continue;
    if (entry.threshold && m.min > entry.threshold) continue;
    const stateKey = `watch:${entry.chatId}:${entry.modelKey}:${m.min}`;
    if (state.dispatched[stateKey]) continue;

    const cheap = m.items[0];
    const diag = m.diagonals.join('/') + '"';
    const thresholdLine = entry.threshold
        ? `\nВаш порог: <b>${fmt(entry.threshold)} ₽</b>`
        : '';
    const text = [
        `👀 <b>Ваша подписка сработала</b>`,
        '',
        `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
        `Текущий минимум: <b>${fmt(m.min)} ₽</b>${thresholdLine}`,
        `Медиана: ${fmt(m.median)} ₽ · продавцов: ${m.sellers}`,
        `<a href="${esc(cheap.url)}">Открыть на Wildberries → ${esc(cheap.id)}</a>`,
        '',
        `<i>Отписаться: /unwatch ${esc(m.model)}</i>`,
    ].join('\n');

    const r = await tg('sendMessage', {
        chat_id: entry.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
    if (r.ok) {
        state.dispatched[stateKey] = now;
        sent += 1;
        await new Promise((res) => setTimeout(res, 300));
    } else {
        console.error('watchlist tg fail:', r.description);
    }
}

writeFileSync(statePath, JSON.stringify({ updatedAt: now, dispatched: state.dispatched }, null, 2));
console.log(`watchlist-check: ${sent} personal alerts sent (${(wl.entries || []).length} entries)`);
