#!/usr/bin/env node
// One-off test broadcast: send one synthesized alert per tier at 1-min intervals.

import { readFileSync } from 'node:fs';
import { env, exit } from 'node:process';

const token = env.TELEGRAM_BOT_TOKEN;
const chat = env.TELEGRAM_ALERT_CHAT_ID || env.TELEGRAM_CHAT_ID;
if (!token || !chat) { console.error('test-broadcast: env missing'); exit(1); }

const data = JSON.parse(readFileSync('apify-wb-tv-scraper/report/MODELS.json', 'utf8'));
const allModels = data.models || [];

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

// Pick six DIFFERENT models (largest-spread first) so each tier shows a distinct example
const candidates = allModels
    .filter((m) => m.sellers >= 2 && m.median > 0 && m.items?.length)
    .sort((a, b) => (b.max / b.min) - (a.max / a.min));

const pick = (i) => candidates[i] || allModels[i];

const tiers = [
    {
        emoji: '💥',
        name: 'DYNAMITE',
        sub: '−35% от медианы (сэмпл)',
        model: pick(0),
        priceFn: (m) => Math.round(m.median * 0.65),
        body: (m, p) => `Цена: <b>${fmt(p)} ₽</b> (медиана модели ${fmt(m.median)} ₽, продавцов ${m.sellers})\n${link('Открыть → ' + m.items[0].id, m.items[0].url)}`,
    },
    {
        emoji: '🔥',
        name: 'HOT DEAL',
        sub: '−25% от медианы (сэмпл)',
        model: pick(1),
        priceFn: (m) => Math.round(m.median * 0.75),
        body: (m, p) => `Цена: <b>${fmt(p)} ₽</b> (медиана модели ${fmt(m.median)} ₽, продавцов ${m.sellers})\n${link('Открыть → ' + m.items[0].id, m.items[0].url)}`,
    },
    {
        emoji: '💥',
        name: 'EARTHQUAKE — обвал цены',
        sub: '−32%',
        model: pick(2),
        priceFn: (m) => Math.round(m.min * 0.68),
        body: (m, p) => `Было: <b>${fmt(m.min)} ₽</b> → стало: <b>${fmt(p)} ₽</b>\nПродавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽\n${link('Самый дешёвый → ' + m.items[0].id, m.items[0].url)}`,
    },
    {
        emoji: '📉📉',
        name: 'BIG DROP',
        sub: '−22%',
        model: pick(3),
        priceFn: (m) => Math.round(m.min * 0.78),
        body: (m, p) => `Было: <b>${fmt(m.min)} ₽</b> → стало: <b>${fmt(p)} ₽</b>\nПродавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽\n${link('Самый дешёвый → ' + m.items[0].id, m.items[0].url)}`,
    },
    {
        emoji: '📉',
        name: 'Падение',
        sub: '−12%',
        model: pick(4),
        priceFn: (m) => Math.round(m.min * 0.88),
        body: (m, p) => `Было: <b>${fmt(m.min)} ₽</b> → стало: <b>${fmt(p)} ₽</b>\nПродавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽\n${link('Самый дешёвый → ' + m.items[0].id, m.items[0].url)}`,
    },
    {
        emoji: '🟢',
        name: 'Новый all-time low',
        sub: '',
        model: pick(5),
        priceFn: (m) => m.min,
        body: (m, p) => `Новый ATL: <b>${fmt(p)} ₽</b>\nПродавцов: ${m.sellers} · Медиана: ${fmt(m.median)} ₽\n${link('Открыть → ' + m.items[0].id, m.items[0].url)}`,
    },
];

async function tg(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!j.ok) console.error('tg fail:', j.description);
    return j;
}

await tg('sendMessage', {
    chat_id: chat, parse_mode: 'HTML',
    text: '🧪 <b>Тестовая рассылка алёртов</b>\n\nСейчас прилетит 6 сообщений (по одному на каждый тип сигнала) с интервалом 1 минута.\n\nЭто <b>сэмплы</b> — данные настоящие, но цены и проценты подставные для демонстрации формата.',
});
console.log('intro sent');

for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (i > 0) {
        console.log(`waiting 60s before tier ${i + 1}/${tiers.length}…`);
        await new Promise((r) => setTimeout(r, 60_000));
    }
    const m = t.model;
    const price = t.priceFn(m);
    const diag = m.diagonals.join('/') + '"';
    const subLine = t.sub ? ` · ${t.sub}` : '';
    const text = [
        `${t.emoji} <b>${t.name}</b>${subLine} <i>[ТЕСТ ${i + 1}/${tiers.length}]</i>`,
        '',
        `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${diag}</b>`,
        t.body(m, price),
    ].join('\n');
    await tg('sendMessage', { chat_id: chat, parse_mode: 'HTML', disable_web_page_preview: true, text });
    console.log(`sent ${i + 1}/${tiers.length}: ${t.name}`);
}

await tg('sendMessage', {
    chat_id: chat, parse_mode: 'HTML',
    text: '✅ <b>Тест завершён</b>\n\nВ боевом режиме такие сообщения будут уходить только при <i>реальных</i> срабатываниях после каждого скрапа. Дубликаты не присылаются (alerts-state.json).',
});
console.log('outro sent. done.');
