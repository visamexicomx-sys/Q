#!/usr/bin/env node
// Daily check for product-level watchlist entries.
//
// Reads watchlist.json, picks entries with a `productId` (the new per-product
// kind), re-fetches each via wb-product-fetch.mjs, diffs against `lastSnapshot`,
// and pushes a Telegram alert per significant change:
//
//   - Price changed ≥3% (any direction) → 📈 / 📉
//   - Price crossed user's `threshold`   → 🔔
//   - Stock dropped to ≤3                → 📦
//   - Stock went to 0                    → ❌
//
// Updates the entry's lastSnapshot + history (capped at 30 entries) in place
// and writes watchlist.json back.
//
// Requires: RU IP (geo-block on card.wb.ru). Designed to run inside a Yandex
// Cloud Function or RU VPS cron — NOT on a GitHub-hosted runner.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { argv, env, exit } from 'node:process';
import { fetchProduct } from './wb-product-fetch.mjs';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const watchlistPath = arg('watchlist', 'apify-wb-tv-scraper/report/watchlist.json');
const statePath = arg('state', 'apify-wb-tv-scraper/report/alerts-state.json');
const dryRun = argv.includes('--dry-run');

const token = env.TELEGRAM_BOT_TOKEN;
if (!dryRun && !token) { console.error('TELEGRAM_BOT_TOKEN missing'); exit(1); }
if (!existsSync(watchlistPath)) { console.log('no watchlist file — skip'); exit(0); }

const wl = JSON.parse(readFileSync(watchlistPath, 'utf8'));
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { dispatched: {} };
const products = (wl.entries || []).filter((e) => e.productId);
if (!products.length) { console.log('no product entries to check'); exit(0); }

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tg(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
}

const now = new Date().toISOString();
let alerts = 0;

for (const e of products) {
    let fresh;
    try { fresh = await fetchProduct(e.productId, e.dest || '-1123300'); }
    catch (err) {
        console.error(`fetch ${e.productId}: ${err.message}`);
        if (/geo-blocked/i.test(err.message)) exit(3);
        continue;
    }
    if (!fresh) continue;

    const prev = e.lastSnapshot || {};
    const events = [];

    if (prev.price && fresh.price !== prev.price) {
        const pct = ((fresh.price - prev.price) / prev.price * 100);
        if (Math.abs(pct) >= 3) {
            const emoji = pct < 0 ? '📉' : '📈';
            events.push({ kind: 'price-change', emoji, pct: +pct.toFixed(1), oldPrice: prev.price });
        }
    }
    if (e.threshold && fresh.price <= e.threshold && (!prev.price || prev.price > e.threshold)) {
        events.push({ kind: 'threshold', emoji: '🔔', threshold: e.threshold });
    }
    if (prev.stock !== undefined) {
        if (fresh.stock === 0 && prev.stock > 0) events.push({ kind: 'out-of-stock', emoji: '❌' });
        else if (fresh.stock <= 3 && prev.stock > 3) events.push({ kind: 'low-stock', emoji: '📦', n: fresh.stock });
    }

    // Update snapshot + history (cap at 30)
    e.lastSnapshot = {
        price: fresh.price, stock: fresh.stock, at: now,
        name: fresh.name, brand: fresh.brand, supplier: fresh.supplier,
        rating: fresh.rating, feedbacks: fresh.feedbacks,
        deliveryAt: fresh.deliveryAt, deliveryType: fresh.deliveryType,
        originalPrice: fresh.originalPrice, discount: fresh.discount,
    };
    e.history = [...(e.history || []), { at: now, price: fresh.price, stock: fresh.stock }].slice(-30);

    // Update min/max for personal "лучше/хуже чем" line
    e.minSeen = Math.min(e.minSeen ?? fresh.price, fresh.price);
    e.maxSeen = Math.max(e.maxSeen ?? fresh.price, fresh.price);

    if (!events.length) continue;

    const alertId = `prod:${e.chatId}:${e.productId}:${events.map((x) => x.kind).join(',')}:${fresh.price}:${fresh.stock}`;
    if (state.dispatched[alertId]) continue;

    const lines = [];
    for (const ev of events) {
        if (ev.kind === 'price-change') {
            const sign = ev.pct > 0 ? '+' : '';
            lines.push(`${ev.emoji} <b>Цена ${sign}${ev.pct}%</b> · было ${fmt(ev.oldPrice)} → стало <b>${fmt(fresh.price)} ₽</b>`);
        } else if (ev.kind === 'threshold') {
            lines.push(`${ev.emoji} <b>Сработал порог!</b> Цена опустилась до <b>${fmt(fresh.price)} ₽</b> (порог ${fmt(ev.threshold)} ₽)`);
        } else if (ev.kind === 'out-of-stock') {
            lines.push(`${ev.emoji} <b>Закончился на складе</b>`);
        } else if (ev.kind === 'low-stock') {
            lines.push(`${ev.emoji} <b>Осталось мало: ${ev.n} шт</b>`);
        }
    }

    const label = e.alias || fresh.name;
    const text = [
        `<b>${esc(label)}</b>`,
        ...lines,
        '',
        `🔢 Артикул: <code>${fresh.id}</code> · 🏪 ${esc(fresh.supplier)} · 🏷 ${esc(fresh.brand)}`,
        `<a href="${esc(fresh.url)}">Открыть на WB →</a>`,
    ].join('\n');

    if (dryRun) {
        console.log('---DRY---'); console.log(text); console.log();
    } else {
        const r = await tg('sendMessage', {
            chat_id: e.chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
        });
        if (r.ok) {
            state.dispatched[alertId] = now;
            alerts++;
            await new Promise((res) => setTimeout(res, 300));
        } else console.error('tg fail:', r.description);
    }
}

if (!dryRun) {
    writeFileSync(watchlistPath, JSON.stringify({ updatedAt: now, entries: wl.entries }, null, 2));
    writeFileSync(statePath, JSON.stringify({ updatedAt: now, dispatched: state.dispatched }, null, 2));
}
console.log(`watchlist-products: ${alerts} alert(s) sent across ${products.length} tracked product(s)${dryRun ? ' (dry-run)' : ''}`);
