#!/usr/bin/env node
// Import a TSV / CSV-style product list into watchlist.json.
//
// Expected columns (tab-separated; empty cells stay empty):
//   id  name  size  alias  rating  price  minPrice  maxPrice  stock  available  threshold  store  brand
//
// The first ROW may be a header — it's auto-detected (id column not a number).
//
// Usage:
//   TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… node import-watchlist-tsv.mjs \
//     --input report/imported-products.tsv \
//     --chat 1312189374

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { argv, env, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const input = arg('input', 'apify-wb-tv-scraper/report/imported-products.tsv');
const watchlistPath = arg('watchlist', 'apify-wb-tv-scraper/report/watchlist.json');
const chatId = parseInt(arg('chat', env.TELEGRAM_CHAT_ID || ''), 10);
const dryRun = argv.includes('--dry-run');
const skipNotify = argv.includes('--no-notify');

if (!chatId) { console.error('--chat or TELEGRAM_CHAT_ID required'); exit(1); }
if (!existsSync(input)) { console.error(`input not found: ${input}`); exit(2); }

const raw = readFileSync(input, 'utf8');
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- parse ----------

const lines = raw.split(/\r?\n/);
const products = [];
let skipped = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split('\t');
    // Need at least: id, name, ..., brand → ≥13 cols
    if (cols.length < 12) { skipped++; continue; }
    const id = cols[0]?.trim();
    if (!/^\d{6,12}$/.test(id)) { skipped++; continue; }   // header row or malformed

    const name = (cols[1] || '').trim();
    const alias = (cols[3] || '').trim() || null;
    const rating = parseFloat((cols[4] || '').replace(',', '.')) || null;
    const price = parseInt((cols[5] || '').replace(/\D/g, ''), 10) || null;
    const minPrice = parseInt((cols[6] || '').replace(/\D/g, ''), 10) || null;
    const maxPrice = parseInt((cols[7] || '').replace(/\D/g, ''), 10) || null;
    const stock = parseInt((cols[8] || '').replace(/\D/g, ''), 10) || 0;
    const available = (cols[9] || '').trim() === 'Да';
    const thresholdRaw = (cols[10] || '').trim();
    const threshold = thresholdRaw && !/не\s*установлен/i.test(thresholdRaw)
        ? parseInt(thresholdRaw.replace(/\D/g, ''), 10) || null
        : null;
    const store = (cols[11] || '').trim();
    const brand = (cols[12] || '').trim();

    if (!price) { skipped++; continue; }    // can't track without a price

    products.push({
        id, name, alias, rating, price, minPrice, maxPrice, stock,
        available, threshold, store, brand,
    });
}

console.log(`parsed: ${products.length} products (skipped ${skipped} malformed rows)`);

if (!products.length) { console.error('nothing to import'); exit(2); }

// ---------- merge into watchlist ----------

const wl = existsSync(watchlistPath)
    ? JSON.parse(readFileSync(watchlistPath, 'utf8'))
    : { entries: [] };

const now = new Date().toISOString();
let added = 0, updated = 0;

for (const p of products) {
    const idx = wl.entries.findIndex((e) => e.chatId === chatId && e.productId === p.id);
    const existing = idx >= 0 ? wl.entries[idx] : {};
    const lastSnapshot = {
        price: p.price,
        originalPrice: p.maxPrice,
        discount: (p.maxPrice && p.maxPrice > p.price) ? Math.round((1 - p.price / p.maxPrice) * 100) : 0,
        stock: p.stock,
        at: now,
        name: p.name,
        brand: p.brand,
        supplier: p.store,
        rating: p.rating,
        feedbacks: existing.lastSnapshot?.feedbacks ?? null,
        deliveryAt: existing.lastSnapshot?.deliveryAt || null,
        deliveryType: existing.lastSnapshot?.deliveryType || null,
    };
    const entry = {
        chatId,
        productId: p.id,
        kind: 'product',
        alias: p.alias || existing.alias || null,
        threshold: p.threshold ?? existing.threshold ?? null,
        region: existing.region || 'Санкт-Петербург',
        dest: existing.dest || '-1123300',
        addedAt: existing.addedAt || now,
        lastSnapshot,
        history: [...(existing.history || []), { at: now, price: p.price, stock: p.stock }].slice(-30),
        minSeen: Math.min(p.minPrice ?? p.price, existing.minSeen ?? p.price),
        maxSeen: Math.max(p.maxPrice ?? p.price, existing.maxSeen ?? p.price),
    };
    if (idx >= 0) { wl.entries[idx] = entry; updated++; }
    else { wl.entries.push(entry); added++; }
}

if (dryRun) {
    console.log(`DRY: would add ${added}, update ${updated}`);
    exit(0);
}

writeFileSync(watchlistPath, JSON.stringify({ updatedAt: now, entries: wl.entries }, null, 2));
console.log(`watchlist: +${added} new, ${updated} updated, total now ${wl.entries.length}`);

// ---------- notify ----------

if (skipNotify || !env.TELEGRAM_BOT_TOKEN) {
    console.log('skipping TG notify');
    exit(0);
}

const token = env.TELEGRAM_BOT_TOKEN;

// Aggregate by brand for the summary
const byBrand = {};
for (const p of products) {
    const b = p.brand || '—';
    if (!byBrand[b]) byBrand[b] = { count: 0, available: 0, value: 0 };
    byBrand[b].count++;
    if (p.available) byBrand[b].available++;
    byBrand[b].value += p.price || 0;
}
const brandLines = Object.entries(byBrand)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([b, s]) => `• <b>${esc(b)}</b> — ${s.count} тов. · в наличии ${s.available}`);

const availCount = products.filter((p) => p.available).length;
const totalValue = products.reduce((a, p) => a + (p.price || 0), 0);

const text = [
    `📥 <b>Импортировано в watchlist: ${products.length} товаров</b>`,
    '',
    `Новых: <b>${added}</b> · обновлено: <b>${updated}</b>`,
    `В наличии сейчас: <b>${availCount}</b> / ${products.length}`,
    `Суммарная стоимость (по текущей цене): <b>${fmt(totalValue)} ₽</b>`,
    '',
    `<b>Топ брендов:</b>`,
    ...brandLines,
    '',
    `<b>Дальше:</b>`,
    `<code>/list</code> — посмотреть весь список`,
    `<code>/threshold &lt;арт&gt; &lt;руб&gt;</code> — поставить порог по нужным`,
    `<code>/exportcsv</code> — скачать как .csv`,
    '',
    `<i>Свежие данные (цена/остаток/доставка) подтянутся при следующем cron-прогоне scraper'а с RU-egress. До этого работают значения из импорта.</i>`,
].join('\n');

const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    }),
});
const j = await r.json();
if (!j.ok) console.error('tg fail:', j.description);
else console.log('confirmation sent.');
