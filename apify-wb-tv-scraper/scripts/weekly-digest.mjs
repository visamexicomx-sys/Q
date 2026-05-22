#!/usr/bin/env node
// Weekly Telegram digest — once a week, sends a synthesized "what happened this week"
// summary to the channel. Uses Claude Haiku 4.5 for compact, vivid prose.
//
// Env:
//   ANTHROPIC_API_KEY      (optional — falls back to deterministic local summary)
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID       (or TELEGRAM_ALERT_CHAT_ID)

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { env, argv, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const dry = argv.includes('--dry-run');

const modelsPath = arg('models', 'apify-wb-tv-scraper/report/MODELS.json');
const histDir = arg('history-dir', 'apify-wb-tv-scraper/report/history');

const token = env.TELEGRAM_BOT_TOKEN;
const chat = env.TELEGRAM_ALERT_CHAT_ID || env.TELEGRAM_CHAT_ID;
const apiKey = env.ANTHROPIC_API_KEY;

if (!dry && (!token || !chat)) { console.error('weekly-digest: TG env missing'); exit(1); }
if (!existsSync(modelsPath)) { console.error('MODELS.json missing'); exit(2); }

const models = JSON.parse(readFileSync(modelsPath, 'utf8')).models;
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

// Pull 7-day window of history snapshots
const cutoff = Date.now() - 7 * 86400 * 1000;
const snapFiles = existsSync(histDir)
    ? readdirSync(histDir).filter((f) => f.endsWith('.json')).map((f) => ({ f, t: new Date(f.replace('.json', '')).getTime() }))
        .filter((x) => x.t >= cutoff).sort((a, b) => a.t - b.t)
    : [];

// Aggregate week stats from enriched MODELS.json
const atl = models.filter((m) => m.newAllTimeLow).length;
const panic = models.filter((m) => m.velocityTag === 'panic-sale');
const rising = models.filter((m) => m.velocityTag === 'rising').length;
const falling = models.filter((m) => m.velocityTag === 'falling').length;
const nearAtl = models.filter((m) => m.nearAtl);
const biggestDrop = [...models].filter((m) => m.dropPct != null).sort((a, b) => a.dropPct - b.dropPct).slice(0, 3);
const byBrand = {};
for (const m of models) {
    const b = m.brand;
    if (!byBrand[b]) byBrand[b] = { models: 0, withDeals: 0, medianMin: 0 };
    byBrand[b].models += 1;
    if (m.dealItems?.length) byBrand[b].withDeals += 1;
    byBrand[b].medianMin += m.min;
}

const ctx = {
    weekStart: snapFiles[0]?.f.replace('.json', '') || 'нет данных',
    weekEnd: snapFiles[snapFiles.length - 1]?.f.replace('.json', '') || new Date().toISOString().slice(0, 10),
    totalModels: models.length,
    atl,
    panic: panic.length,
    rising,
    falling,
    nearAtl: nearAtl.length,
    biggestDrop: biggestDrop.map((m) => ({ brand: m.brand, model: m.model, dropPct: m.dropPct, min: m.min })),
    panicSamples: panic.slice(0, 5).map((m) => ({ brand: m.brand, model: m.model, min: m.min, velocity: m.velocity })),
    byBrand,
};

async function aiDigest() {
    if (!apiKey) return null;
    const prompt = `Ты — аналитик трекера цен на телевизоры Wildberries. Составь короткий (≤900 знаков), живой саммари недели на русском для Telegram-канала. Используй HTML (<b>, <i>, <code>), без markdown.

Данные за неделю:
${JSON.stringify(ctx, null, 2)}

Структура:
1) Заголовок (<b>📊 Неделя на WB</b> + даты)
2) 3-4 ключевых наблюдения с эмодзи
3) Конкретные модели — самые яркие движения (укажи бренд, код модели в <code>, цену в ₽)
4) Совет — что покупать прямо сейчас / чего ждать
Без оговорок типа "по данным из ..." — пиши уверенно и кратко.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    const j = await r.json();
    if (!r.ok) { console.error('anthropic err:', JSON.stringify(j)); return null; }
    return j.content?.[0]?.text || null;
}

function localDigest() {
    const lines = [
        `📊 <b>Неделя на WB</b> · ${ctx.weekStart} → ${ctx.weekEnd}`,
        '',
        `Всего отслеживается: <b>${ctx.totalModels}</b> моделей`,
        `🟢 Новых ATL за неделю: <b>${ctx.atl}</b>`,
        `💥 Panic-sale (быстрое падение): <b>${ctx.panic}</b>`,
        `🔴 Почти-ATL (в 2% от дна): <b>${ctx.nearAtl}</b>`,
        `📉 Падает: ${ctx.falling} · 📈 Растёт: ${ctx.rising}`,
        '',
    ];
    if (ctx.biggestDrop.length) {
        lines.push('<b>Топ-движения вниз:</b>');
        for (const d of ctx.biggestDrop) {
            lines.push(`• ${d.brand} <code>${d.model}</code>: ${d.dropPct}% → ${fmt(d.min)} ₽`);
        }
        lines.push('');
    }
    if (ctx.panicSamples.length) {
        lines.push('<b>Panic-sale (бери сейчас):</b>');
        for (const p of ctx.panicSamples) {
            lines.push(`• ${p.brand} <code>${p.model}</code>: ${fmt(p.min)} ₽ (${p.velocity}%/день)`);
        }
    }
    return lines.join('\n');
}

const text = (await aiDigest()) || localDigest();

if (dry) {
    console.log('---DRY---');
    console.log(text);
    exit(0);
}

const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true }),
});
const j = await r.json();
if (!j.ok) { console.error('tg fail:', j.description); exit(1); }
console.log('weekly-digest: sent');
