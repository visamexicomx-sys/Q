#!/usr/bin/env node
// Demo broadcast of the new product-tracker UX. Sends 5 sample messages
// (rich card, alert variants, /list view) using mocked data so it works
// offline. Use to preview format before deploying the real fetcher.

import { env, exit } from 'node:process';

const token = env.TELEGRAM_BOT_TOKEN;
const chat = env.TELEGRAM_ALERT_CHAT_ID || env.TELEGRAM_CHAT_ID;
if (!token || !chat) { console.error('env missing'); exit(1); }

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tg = (method, body) => fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
}).then((r) => r.json());

// Sample product — mirrors the screenshot the user showed, but with our richer fields.
const sample = {
    id: '357676897',
    name: 'Стиральная машина с сушкой Zeo Lite, 10/6 кг, 1400 об/мин',
    brand: 'Roborock',
    supplier: 'ХОБОТ ДОСТАВИТ',
    rating: 4.9,
    feedbacks: 43,
    price: 56754,
    originalPrice: 61493,
    discount: 8,
    stock: 31,
    deliveryAt: '26.05.2026',
    deliveryType: 'грузовая, продавцом',
    region: 'Санкт-Петербург',
    minSeen: 52443,
    maxSeen: 61493,
    url: 'https://www.wildberries.ru/catalog/357676897/detail.aspx',
    velocity: -1.2,
    bestDow: 'пт',
};

function renderCard(p, opts = {}) {
    const { alias, threshold, deltaPct, deltaRub } = opts;
    const lines = [
        `🛒 <b>${esc(alias || p.name)}</b>`,
        '',
        `⭐ <b>${p.rating}</b> (${p.feedbacks} оценок)`,
        `🏪 Магазин: <b>${esc(p.supplier)}</b>`,
        `🏷 Бренд: <b>${esc(p.brand)}</b>`,
        `📍 Регион: ${esc(p.region)}`,
        `🔢 Артикул: <code>${p.id}</code>`,
        `💰 Цена: <b>${fmt(p.price)} ₽</b>${p.discount ? ` (−${p.discount}%, было ${fmt(p.originalPrice)})` : ''}`,
        `📦 Осталось: <b>${p.stock} шт</b>`,
        `🚚 Доставка: ${esc(p.deliveryType)} · ${p.deliveryAt}`,
        `📊 Min / Max за всё время: ${fmt(p.minSeen)} / ${fmt(p.maxSeen)} ₽`,
    ];
    if (threshold) lines.push(`🎯 Ваш порог: ≤ <b>${fmt(threshold)} ₽</b>`);
    if (deltaPct != null) {
        const arrow = deltaPct > 0 ? '📈' : '📉';
        const sign = deltaPct > 0 ? '+' : '';
        lines.push('');
        lines.push(`${arrow} Цена ${deltaPct > 0 ? 'повысилась' : 'упала'} на <b>${fmt(Math.abs(deltaRub))} ₽</b> (${sign}${deltaPct}%)`);
    }
    if (p.velocity != null) {
        const v = p.velocity;
        const tag = v <= -2 ? '🚨 быстро падает — бери' : v <= -0.5 ? '📉 плавно вниз' : v >= 0.5 ? '📈 ползёт вверх' : '➡ стабильно';
        lines.push(`🔮 Скорость: <b>${v > 0 ? '+' : ''}${v}%/день</b> · ${tag}`);
    }
    if (p.bestDow) lines.push(`📅 Лучший день для покупки: <b>${p.bestDow}</b>`);
    lines.push('');
    lines.push(`<a href="${esc(p.url)}">Открыть на Wildberries →</a>`);
    return lines.join('\n');
}

const itemKeyboard = (id) => ({
    inline_keyboard: [
        [{ text: '📈 Динамика', callback_data: `p:dyn:${id}` }, { text: '✏️ Имя', callback_data: `p:ren:${id}` }],
        [{ text: '🎯 Порог', callback_data: `p:thr:${id}` }, { text: '🗑 Удалить', callback_data: `p:del:${id}` }],
        [{ text: '🪞 Двойник', callback_data: `p:twin:${id}` }, { text: '🔮 Прогноз', callback_data: `p:fc:${id}` }],
    ],
});

const messages = [
    {
        label: 'intro',
        body: {
            text: [
                '🧪 <b>Демо: новый per-product tracker</b>',
                '',
                'Сейчас прилетят 5 сообщений с разными сценариями. Все данные — синтетические, кнопки в этом демо не активны (только в боевом боте после деплоя).',
                '',
                '<b>Что нового:</b>',
                '• Трекинг ЛЮБОГО товара WB (не только TV) — просто пришли ссылку',
                '• Уведомления о цене, пороге, остатках, доставке',
                '• Personal min/max + скорость + лучший день недели',
                '• Кнопки на каждом товаре: динамика / имя / порог / удалить / двойник / прогноз',
            ].join('\n'),
        },
    },
    {
        label: 'card-base',
        body: {
            text: renderCard(sample, { threshold: 50000 }),
            reply_markup: itemKeyboard(sample.id),
        },
    },
    {
        label: 'alert-price-up',
        body: {
            text: renderCard(sample, { threshold: 50000, deltaPct: 4, deltaRub: 1382 }) + '\n\n☀️ <i>Зафиксирована текущая цена для дальнейшего отслеживания.</i>',
            reply_markup: itemKeyboard(sample.id),
        },
    },
    {
        label: 'alert-threshold-hit',
        body: {
            text: [
                '🔔 <b>Сработал ваш порог!</b>',
                '',
                `<b>${esc(sample.name)}</b>`,
                `🎯 Порог: ≤ <b>50 000 ₽</b>`,
                `💰 Цена опустилась до <b>49 200 ₽</b> (−13% от прошлого снимка)`,
                `📦 На складе: <b>4 шт</b>`,
                `🏪 ${esc(sample.supplier)} · 🏷 ${esc(sample.brand)}`,
                '',
                `<a href="${esc(sample.url)}">Открыть на WB →</a>`,
                '',
                '<i>Быстро — стока мало.</i>',
            ].join('\n'),
            reply_markup: itemKeyboard(sample.id),
        },
    },
    {
        label: 'list-multi',
        body: {
            text: [
                '📋 <b>Ваши отслеживаемые товары — 4</b>',
                '',
                `1. <b>Стиралка Zeo Lite</b>`,
                `   ${sample.id} · <b>${fmt(56754)} ₽</b> · 31 шт · 🎯 50 000 · 📉 −1.2%/день`,
                '',
                `2. <b>iPhone 15 Pro 256gb</b>`,
                `   458921344 · <b>${fmt(89990)} ₽</b> · 12 шт · 🎯 — · ➡ стабильно`,
                '',
                `3. <b>Sony WH-1000XM5</b>`,
                `   391105672 · <b>${fmt(27340)} ₽</b> · 5 шт · 🎯 25 000 · 📈 +0.4%/день · 🔴 в 3% от ATL`,
                '',
                `4. <b>Хайер Гранд</b>`,
                `   <s>312445678</s> · <i>больше не доступен на WB</i>`,
                '',
                '<i>Команды:</i>',
                '/track &lt;ссылка&gt; — добавить',
                '/untrack &lt;арт&gt; — удалить',
                '/rename &lt;арт&gt; &lt;имя&gt;',
                '/threshold &lt;арт&gt; &lt;руб&gt;',
                '/exportcsv — список в виде .csv',
            ].join('\n'),
        },
    },
    {
        label: 'outro',
        body: {
            text: [
                '✅ <b>Демо завершено</b>',
                '',
                '<b>Чтобы запустить по-настоящему:</b>',
                '1. Деплой бесплатной Yandex Cloud Function (см. docs/SCRAPER-WITHOUT-APIFY.md) — она будет каждый день фетчить твои отслеживаемые товары.',
                '2. Деплой Cloudflare worker (новые команды /track /list /rename и т.д.).',
                '3. Готово — отправь боту любую ссылку с WB → начнёт следить.',
            ].join('\n'),
        },
    },
];

for (const m of messages) {
    const body = {
        chat_id: chat,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...m.body,
    };
    const r = await tg('sendMessage', body);
    if (!r.ok) console.error(`${m.label} failed:`, r.description);
    else console.log(`sent: ${m.label}`);
    await sleep(2000);
}

console.log('done.');
