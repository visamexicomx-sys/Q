#!/usr/bin/env node
// Real-time alert engine for the WB TV Tracker.
//
// Reads MODELS.json + models-history.json and emits prioritized alerts:
//
//   💥 DYNAMITE   — item ≥30% below its model's median, or new all-time low
//                   (and the all-time series has ≥3 prior data points)
//   🔥 HOT DEAL   — item 20–30% below median
//   📉 DROP       — model min dropped ≥10% vs previous snapshot
//   📉📉 BIG DROP — model min dropped ≥20%
//   🟢 NEW ATL    — model hit a new all-time low this snapshot
//
// State is tracked in alerts-state.json (which alerts have already been
// dispatched), so each anomaly fires exactly once across runs.
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID         — primary target (channel or DM)
//   TELEGRAM_ALERT_CHAT_ID   — optional override for alerts only

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, env, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);

const modelsPath = arg('models', 'apify-wb-tv-scraper/report/MODELS.json');
const historyPath = arg('history', 'apify-wb-tv-scraper/report/models-history.json');
const statePath = arg('state', 'apify-wb-tv-scraper/report/alerts-state.json');
const dryRun = has('dry-run');

const token = env.TELEGRAM_BOT_TOKEN;
const chat = env.TELEGRAM_ALERT_CHAT_ID || env.TELEGRAM_CHAT_ID;

if (!dryRun && (!token || !chat)) {
    console.log('alerts: missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — skipping');
    exit(0);
}
if (!existsSync(modelsPath)) { console.error('alerts: MODELS.json not found'); exit(0); }

const data = JSON.parse(readFileSync(modelsPath, 'utf8'));
const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')).models || {} : {};
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { dispatched: {} };

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trim = (s = '', n = 55) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

// ---------- detect alerts ----------

const now = new Date().toISOString();
const allModels = data.models || [];
const fresh = [];

for (const m of allModels) {
    const h = history[m.key];
    const snapshots = h?.snapshots || [];

    // 1. Item-level hot deals (price vs same model's median)
    for (const it of (m.dealItems || m.items.filter((x) => x.price < m.median * 0.8))) {
        const pct = Math.round((1 - it.price / m.median) * 100);
        if (pct < 20) continue;
        const tier = pct >= 30 ? 'dynamite' : 'hot';
        const id = `deal:${m.key}:${it.id}`;
        if (state.dispatched[id]) continue;
        fresh.push({ id, tier, model: m, item: it, pct });
    }

    // 2. Model min drop vs previous snapshot
    if (snapshots.length >= 2) {
        const prev = snapshots[snapshots.length - 2].min;
        const cur = m.min;
        const dropPct = prev > 0 ? Math.round((cur / prev - 1) * 100) : 0;
        if (dropPct <= -10) {
            const tier = dropPct <= -30 ? 'earthquake' : (dropPct <= -20 ? 'bigdrop' : 'drop');
            const id = `drop:${m.key}:${now.slice(0, 10)}`;
            if (!state.dispatched[id]) {
                fresh.push({ id, tier, model: m, prev, cur, dropPct });
            }
        }
    }

    // 3. New all-time low (only meaningful if history has ≥3 snapshots; otherwise it's noise)
    if (m.newAllTimeLow && snapshots.length >= 3) {
        const id = `atl:${m.key}:${m.min}`;
        if (!state.dispatched[id]) {
            fresh.push({ id, tier: 'atl', model: m });
        }
    }

    // 4. Near-ATL — within 2% of dot, but not the dot itself
    if (m.nearAtl && snapshots.length >= 3) {
        const id = `nearatl:${m.key}:${m.min}`;
        if (!state.dispatched[id]) {
            fresh.push({ id, tier: 'nearatl', model: m });
        }
    }

    // 5. Panic-sale — sustained drop ≥3 %/day
    if (m.velocityTag === 'panic-sale' && snapshots.length >= 4) {
        const id = `panic:${m.key}:${now.slice(0, 10)}`;
        if (!state.dispatched[id]) {
            fresh.push({ id, tier: 'panic', model: m });
        }
    }
}

if (!fresh.length) {
    console.log('alerts: no fresh anomalies to broadcast');
    exit(0);
}

// Sort: dynamite > earthquake > panic > bigdrop > hot > drop > nearatl > atl
const PRIORITY = { dynamite: 0, earthquake: 1, panic: 2, bigdrop: 3, hot: 4, drop: 5, nearatl: 6, atl: 7 };
fresh.sort((a, b) => PRIORITY[a.tier] - PRIORITY[b.tier]);

// ---------- shape messages (one per alert, with a leading summary) ----------

const TIER_HEADERS = {
    dynamite: '💥 <b>DYNAMITE</b>',
    earthquake: '💥 <b>EARTHQUAKE — обвал цены</b>',
    panic: '🚨 <b>PANIC SALE</b>',
    bigdrop: '📉📉 <b>BIG DROP</b>',
    hot: '🔥 <b>HOT DEAL</b>',
    drop: '📉 <b>Падение</b>',
    nearatl: '🔴 <b>Почти-ATL</b>',
    atl: '🟢 <b>Новый all-time low</b>',
};

function renderAlert(a) {
    const m = a.model;
    const diag = m.diagonals.join('/') + '"';
    const header = TIER_HEADERS[a.tier];

    if (a.tier === 'hot' || a.tier === 'dynamite') {
        const it = a.item;
        return [
            `${header} · −${a.pct}% от медианы`,
            '',
            `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
            `Цена: <b>${fmt(it.price)} ₽</b> (медиана модели ${fmt(m.median)} ₽, продавцов ${m.sellers})`,
            `${link('Открыть на Wildberries → ' + it.id, it.url)}`,
        ].join('\n');
    }

    if (a.tier === 'drop' || a.tier === 'bigdrop' || a.tier === 'earthquake') {
        const cheap = m.items[0];
        return [
            `${header} · ${a.dropPct}%`,
            '',
            `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
            `Было: <b>${fmt(a.prev)} ₽</b> → стало: <b>${fmt(a.cur)} ₽</b>`,
            `Продавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽`,
            `${link('Самый дешёвый сейчас → ' + cheap.id, cheap.url)}`,
        ].join('\n');
    }

    if (a.tier === 'atl') {
        const cheap = m.items[0];
        return [
            `${header}`,
            '',
            `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
            `Новый ATL: <b>${fmt(m.allTimeMin)} ₽</b>`,
            `Продавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽`,
            `${link('Открыть → ' + cheap.id, cheap.url)}`,
        ].join('\n');
    }

    if (a.tier === 'nearatl') {
        const cheap = m.items[0];
        const gap = m.min - m.allTimeMin;
        return [
            `${header} · в ${m.nearAtlPct}% от дна`,
            '',
            `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
            `Текущий мин: <b>${fmt(m.min)} ₽</b> · ATL: ${fmt(m.allTimeMin)} ₽ (разница ${fmt(gap)} ₽)`,
            `Продавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽`,
            `<i>Ещё толчок — и новый low.</i>`,
            `${link('Открыть → ' + cheap.id, cheap.url)}`,
        ].join('\n');
    }

    if (a.tier === 'panic') {
        const cheap = m.items[0];
        return [
            `${header} · ${m.velocity}%/день`,
            '',
            `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
            `Цена падает <b>${m.velocity}%/день</b> несколько снимков подряд.`,
            `Текущий мин: <b>${fmt(m.min)} ₽</b> · Медиана: ${fmt(m.median)} ₽ · ATL: ${fmt(m.allTimeMin)}`,
            `<i>Продавец срочно сбрасывает остатки.</i>`,
            `${link('Самый дешёвый → ' + cheap.id, cheap.url)}`,
        ].join('\n');
    }
    return '';
}

// ---------- send ----------

async function tg(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
}

if (fresh.length > 1) {
    // Send a one-line digest first
    const counts = fresh.reduce((acc, a) => { acc[a.tier] = (acc[a.tier] || 0) + 1; return acc; }, {});
    const parts = Object.entries(counts).map(([t, n]) => `${TIER_HEADERS[t].replace(/<[^>]+>/g, '').trim()}×${n}`);
    const digest = `⚡️ <b>${fresh.length} новых сигналов</b>\n${parts.join(' · ')}`;
    if (dryRun) {
        console.log('---DRY DIGEST---'); console.log(digest);
    } else {
        await tg('sendMessage', { chat_id: chat, text: digest, parse_mode: 'HTML', disable_web_page_preview: true });
    }
}

for (const a of fresh.slice(0, 30)) {
    const text = renderAlert(a);
    if (!text) continue;
    if (dryRun) {
        console.log('---DRY ALERT---');
        console.log(text);
        console.log('');
    } else {
        const r = await tg('sendMessage', {
            chat_id: chat,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
        if (!r.ok) { console.error('alerts: send failed', JSON.stringify(r)); continue; }
        await new Promise((res) => setTimeout(res, 300));   // pace
    }
    state.dispatched[a.id] = now;
}

// Trim dispatched cache: keep only ids seen in the last 90 days.
const cutoff = Date.now() - 90 * 86400 * 1000;
for (const [k, v] of Object.entries(state.dispatched)) {
    if (new Date(v).getTime() < cutoff) delete state.dispatched[k];
}

if (!dryRun) {
    writeFileSync(statePath, JSON.stringify({ updatedAt: now, dispatched: state.dispatched }, null, 2));
}
console.log(`alerts: dispatched ${fresh.length} alert(s)${dryRun ? ' (dry-run)' : ''}`);
