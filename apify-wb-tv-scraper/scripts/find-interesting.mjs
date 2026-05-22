#!/usr/bin/env node
// Pick the most interesting products from watchlist.json and broadcast them.
//
// Buckets (ordered by interestingness):
//   🟢 AT-LOW       — current price ≤ minSeen × 1.01 (basically at all-time low)
//   🔥 DEEP-OFF-MAX — current ≤ maxSeen × 0.75   (≥25% off historical max)
//   ⚡ HOT-DEAL     — current ≤ maxSeen × 0.85 AND in stock AND rating ≥ 4.7
//   📦 URGENT      — stock 1–5, rating ≥ 4.7, available
//
// Each product is scored; up to N items per bucket are sent as separate
// messages with inline cards + per-product buttons.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { env, argv, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const watchlistPath = arg('watchlist', 'apify-wb-tv-scraper/report/watchlist.json');
const statePath = arg('state', 'apify-wb-tv-scraper/report/alerts-state.json');
const chat = parseInt(arg('chat', env.TELEGRAM_CHAT_ID || ''), 10);
const perBucket = parseInt(arg('per-bucket', '3'), 10);
const dedupHours = parseInt(arg('dedup-hours', '24'), 10);  // suppress repeats within N hours
const token = env.TELEGRAM_BOT_TOKEN;

if (!token || !chat) { console.error('TG env missing'); exit(1); }

// Load dedup state — alerts-state.json reused with "int:" prefix so the same
// interesting card doesn't re-broadcast every hour.
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { dispatched: {} };
const now = Date.now();
const cutoff = now - dedupHours * 3600 * 1000;
const wasSent = (id) => {
    const t = state.dispatched[`int:${id}`];
    return t && new Date(t).getTime() > cutoff;
};

const wl = JSON.parse(readFileSync(watchlistPath, 'utf8'));
const all = (wl.entries || []).filter((e) => e.productId && e.chatId === chat && e.lastSnapshot?.price);

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trim = (s, n = 60) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tg = (method, body) => fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
}).then((r) => r.json());

// ---------- scoring ----------

const enriched = all.map((e) => {
    const s = e.lastSnapshot;
    const cur = s.price;
    const min = e.minSeen || cur;
    const max = e.maxSeen || cur;
    const offMaxPct = max > cur ? Math.round((1 - cur / max) * 100) : 0;
    const aboveMinPct = min > 0 ? Math.round((cur / min - 1) * 100) : 0;
    const atLow = min > 0 && cur <= min * 1.01;
    return { e, snap: s, cur, min, max, offMaxPct, aboveMinPct, atLow };
});

const skipSent = (x) => !wasSent(`${x.e.productId}:${x.cur}`);

const atLow = enriched
    .filter((x) => x.atLow && x.snap.stock > 0).filter(skipSent)
    .sort((a, b) => b.offMaxPct - a.offMaxPct)
    .slice(0, perBucket);

const deepOff = enriched
    .filter((x) => !x.atLow && x.offMaxPct >= 25 && x.snap.stock > 0).filter(skipSent)
    .sort((a, b) => b.offMaxPct - a.offMaxPct)
    .slice(0, perBucket);

const hotDeal = enriched
    .filter((x) => !atLow.includes(x) && !deepOff.includes(x)
        && x.offMaxPct >= 15 && x.snap.stock > 0
        && (x.snap.rating ?? 0) >= 4.7).filter(skipSent)
    .sort((a, b) => b.offMaxPct - a.offMaxPct)
    .slice(0, perBucket);

const urgent = enriched
    .filter((x) => !atLow.includes(x) && !deepOff.includes(x) && !hotDeal.includes(x)
        && x.snap.stock > 0 && x.snap.stock <= 5
        && (x.snap.rating ?? 0) >= 4.7).filter(skipSent)
    .sort((a, b) => a.snap.stock - b.snap.stock)
    .slice(0, perBucket);

// ---------- render ----------

function productCardKeyboard(id) {
    return {
        inline_keyboard: [
            [{ text: '📈 Динамика', callback_data: `p:dyn:${id}` }, { text: '✏️ Имя', callback_data: `p:ren:${id}` }],
            [{ text: '🎯 Порог', callback_data: `p:thr:${id}` }, { text: '🗑 Удалить', callback_data: `p:del:${id}` }],
        ],
    };
}

function render(item, tier) {
    const { e, snap, cur, min, max, offMaxPct, aboveMinPct, atLow } = item;
    const tierEmoji = { atlow: '🟢', deep: '🔥', hot: '⚡', urgent: '📦' }[tier];
    const tierName = {
        atlow: 'AT-LOW — цена на историческом минимуме',
        deep: `DEEP-OFF-MAX — −${offMaxPct}% от максимума`,
        hot: `HOT-DEAL — −${offMaxPct}% от max, рейтинг ${snap.rating}`,
        urgent: `URGENT — осталось ${snap.stock} шт, рейтинг ${snap.rating}`,
    }[tier];
    const lines = [
        `${tierEmoji} <b>${tierName}</b>`,
        '',
        `🛒 <b>${esc(e.alias || trim(snap.name, 70))}</b>`,
        '',
    ];
    if (snap.rating) lines.push(`⭐ <b>${snap.rating}</b>${snap.feedbacks ? ` (${snap.feedbacks} оценок)` : ''}`);
    if (snap.supplier) lines.push(`🏪 ${esc(snap.supplier)}`);
    if (snap.brand) lines.push(`🏷 ${esc(snap.brand)}`);
    lines.push(`🔢 Артикул: <code>${e.productId}</code>`);
    lines.push(`💰 Цена: <b>${fmt(cur)} ₽</b>`);
    lines.push(`📊 Min / Max: ${fmt(min)} / ${fmt(max)} ₽`);
    if (atLow) lines.push(`🟢 Сейчас на минимуме за всё время отслеживания`);
    else lines.push(`📍 От min: +${aboveMinPct}% · от max: −${offMaxPct}%`);
    if (snap.stock != null) lines.push(`📦 Остаток: <b>${snap.stock} шт</b>`);
    if (e.threshold) lines.push(`🎯 Твой порог: ≤ ${fmt(e.threshold)} ₽`);
    lines.push('');
    lines.push(`<a href="https://www.wildberries.ru/catalog/${e.productId}/detail.aspx">Открыть на WB →</a>`);
    return lines.join('\n');
}

// ---------- broadcast ----------

const total = atLow.length + deepOff.length + hotDeal.length + urgent.length;
if (!total) {
    console.log('nothing interesting after dedup');
    exit(0);
}

await tg('sendMessage', {
    chat_id: chat, parse_mode: 'HTML', disable_web_page_preview: true,
    text: [
        `🎯 <b>Интересные позиции прямо сейчас — ${total}</b>`,
        '',
        `🟢 На минимуме: <b>${atLow.length}</b>`,
        `🔥 Скидка ≥25% от max: <b>${deepOff.length}</b>`,
        `⚡ Hot-deal (≥15% off, рейтинг ≥4.7): <b>${hotDeal.length}</b>`,
        `📦 Urgent (стока ≤5, рейтинг ≥4.7): <b>${urgent.length}</b>`,
        '',
        '<i>Дальше прилетят отдельные карточки по каждой позиции.</i>',
    ].join('\n'),
});

const buckets = [
    ['atlow', atLow],
    ['deep', deepOff],
    ['hot', hotDeal],
    ['urgent', urgent],
];
let sent = 0;
const nowIso = new Date().toISOString();
for (const [tier, items] of buckets) {
    for (const item of items) {
        const r = await tg('sendMessage', {
            chat_id: chat, parse_mode: 'HTML', disable_web_page_preview: true,
            text: render(item, tier),
            reply_markup: productCardKeyboard(item.e.productId),
        });
        if (r.ok) {
            state.dispatched[`int:${item.e.productId}:${item.cur}`] = nowIso;
            sent++;
        }
        await sleep(800);   // pace
    }
}

// Trim 90-day expired entries (same policy as other alerts)
const trimCutoff = now - 90 * 86400 * 1000;
for (const [k, v] of Object.entries(state.dispatched)) {
    if (new Date(v).getTime() < trimCutoff) delete state.dispatched[k];
}
writeFileSync(statePath, JSON.stringify({ updatedAt: nowIso, dispatched: state.dispatched }, null, 2));

console.log(`broadcast: 1 summary + ${sent} product cards`);
