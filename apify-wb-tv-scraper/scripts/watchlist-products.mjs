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
import { wbImageUrl } from './wb-image.mjs';

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

// Mirror of the renderer in bot-poller.mjs — kept inline so this script
// stays self-contained and runs on YC/VPS without imports.
function productCardKeyboard(id) {
    return {
        inline_keyboard: [
            [{ text: 'Динамика', callback_data: `p:dyn:${id}` }, { text: 'Имя', callback_data: `p:ren:${id}` }],
            [{ text: 'Порог', callback_data: `p:thr:${id}` }, { text: 'Удалить', callback_data: `p:del:${id}` }],
        ],
    };
}
function renderProductCard(entry, snap, change = null) {
    const url = `https://www.wildberries.ru/catalog/${entry.productId}/detail.aspx`;
    const name = entry.alias || snap.name || 'Товар WB';
    const lines = [`<b>Товар:</b> <a href="${esc(url)}">${esc(name)}</a>`, ''];
    if (snap.rating) lines.push(`<b>Рейтинг:</b> ${snap.rating}${snap.feedbacks ? ` <i>(оценок: ${snap.feedbacks})</i>` : ''}`);
    if (snap.supplier) lines.push(`<b>Магазин:</b> ${esc(snap.supplier)}`);
    if (snap.brand) lines.push(`<b>Бренд:</b> ${esc(snap.brand)}`);
    lines.push(`<b>Регион:</b> ${esc(entry.region || 'Санкт-Петербург')}`);
    lines.push(`<b>Артикул:</b> ${entry.productId}`);
    if (snap.price) lines.push(`<b>Цена:</b> ${fmt(snap.price)} ₽`);
    if (snap.reviewBonus) lines.push(`<b>✦ Рубли за отзыв:</b> ${fmt(snap.reviewBonus)} ₽`);
    if (snap.stock != null) lines.push(`<b>Осталось:</b> ${snap.stock} шт`);
    if (snap.deliveryType) lines.push(`<b>Доставка:</b> ${esc(snap.deliveryType)}`);
    if (snap.deliveryAt) lines.push(`<b>Дата доставки:</b> ${snap.deliveryAt}`);
    if (entry.minSeen && entry.maxSeen && entry.minSeen !== entry.maxSeen) {
        lines.push(`<b>Мин. / Макс. цена:</b> ${fmt(entry.minSeen)} / ${fmt(entry.maxSeen)} ₽`);
    }
    if (entry.threshold) lines.push(`<b>Порог:</b> ≤ ${fmt(entry.threshold)} ₽`);
    if (change) {
        lines.push('');
        for (const banner of changeBanners(change, entry, snap)) lines.push(banner);
        lines.push('');
        lines.push(`<i>☀ Для дальнейшего отслеживания зафиксирована текущая цена ${fmt(snap.price)} ₽</i>`);
    }
    return lines.join('\n');
}
function changeBanners(change, entry, snap) {
    const out = [];
    const { delta, pct, kind } = change;
    if (kind === 'price-down') {
        const big = Math.abs(pct) >= 20;
        out.push(`${big ? '💥' : '🔶'} <b>Цена снизилась на ${fmt(Math.abs(delta))} ₽</b> (🔻 ${pct}%)`);
        if (big) out.push(`🚨 <b>Сильное падение</b> — <i>продавец может срочно сбрасывать остатки.</i>`);
    } else if (kind === 'price-up') {
        out.push(`🔶 <b>Цена выросла на ${fmt(delta)} ₽</b> (🔺 +${pct}%)`);
    } else if (kind === 'threshold-hit') {
        out.push(`🔔 <b>Сработал ваш порог</b> — цена достигла ≤ ${fmt(entry.threshold)} ₽`);
    } else if (kind === 'new-atl') {
        out.push(`🟢 <b>НОВЫЙ ИСТОРИЧЕСКИЙ МИНИМУМ</b>`);
        out.push(`<i>Цена ещё ни разу не была так низко за всё время отслеживания.</i>`);
    } else if (kind === 'low-stock') {
        out.push(`📦 <b>Осталось всего ${snap.stock} шт</b> — <i>может закончиться в любой момент.</i>`);
    } else if (kind === 'out-of-stock') {
        out.push(`❌ <b>Товар закончился</b> на складе.`);
    }
    if (kind === 'price-down' && entry.minSeen && snap.price <= entry.minSeen * 1.02 && snap.price > entry.minSeen) {
        out.push(`<i>🔴 В пределах 2% от исторического минимума (${fmt(entry.minSeen)} ₽).</i>`);
    }
    if (snap.stock != null && snap.stock <= 5 && kind !== 'low-stock' && kind !== 'out-of-stock') {
        out.push(`<i>📦 Остаток ${snap.stock} шт — спешите.</i>`);
    }
    return out;
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
    // Build a single primary `change` event ranked by importance.
    let change = null;
    const threshold = parseFloat(env.WATCHLIST_PCT_THRESHOLD || '3');
    if (prev.price && fresh.price !== prev.price) {
        const pct = ((fresh.price - prev.price) / prev.price * 100);
        if (Math.abs(pct) >= threshold) {
            const delta = fresh.price - prev.price;
            change = {
                kind: pct < 0 ? 'price-down' : 'price-up',
                delta, pct: +pct.toFixed(1), oldPrice: prev.price,
            };
        }
    }
    if (e.threshold && fresh.price <= e.threshold && (!prev.price || prev.price > e.threshold)) {
        change = { kind: 'threshold-hit', delta: prev.price ? fresh.price - prev.price : 0, pct: 0 };
    }
    // New all-time low — anytime current < minSeen so far
    if (e.minSeen && fresh.price < e.minSeen) {
        change = { kind: 'new-atl', delta: fresh.price - e.minSeen, pct: 0 };
    }
    if (prev.stock !== undefined) {
        if (fresh.stock === 0 && prev.stock > 0) change = { kind: 'out-of-stock', delta: 0, pct: 0 };
        else if (fresh.stock <= 3 && prev.stock > 3 && !change) change = { kind: 'low-stock', delta: 0, pct: 0 };
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

    if (!change) continue;

    const alertId = `prod:${e.chatId}:${e.productId}:${change.kind}:${fresh.price}:${fresh.stock}`;
    if (state.dispatched[alertId]) continue;

    const text = renderProductCard(e, e.lastSnapshot, change);
    const photo = wbImageUrl(fresh.id);
    const markup = productCardKeyboard(fresh.id);

    if (dryRun) {
        console.log('---DRY---'); console.log(text); console.log();
    } else {
        // Try sendPhoto first (caption ≤ 1024); fall back to sendMessage.
        let r;
        if (photo && text.length <= 1024) {
            r = await tg('sendPhoto', {
                chat_id: e.chatId, photo, caption: text,
                parse_mode: 'HTML', reply_markup: markup,
            });
            if (!r.ok) {
                r = await tg('sendMessage', {
                    chat_id: e.chatId, text, parse_mode: 'HTML',
                    disable_web_page_preview: true, reply_markup: markup,
                });
            }
        } else {
            r = await tg('sendMessage', {
                chat_id: e.chatId, text, parse_mode: 'HTML',
                disable_web_page_preview: true, reply_markup: markup,
            });
        }
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
