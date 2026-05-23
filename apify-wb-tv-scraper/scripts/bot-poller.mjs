#!/usr/bin/env node
// Interactive Telegram bot for WB TV Tracker.
//
// Long-polls getUpdates for up to ~4 minutes, handles commands, then exits.
// State (last processed update_id) is persisted to bot-state.json so a
// cron-driven workflow can run this script every ~5 minutes without losing
// or double-processing messages.
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   (optional) GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_REF_NAME  — for /scrape

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { wbImageUrl, resolveWbImageUrl } from './wb-image.mjs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN missing'); process.exit(1); }

const REPORT_DIR = 'apify-wb-tv-scraper/report';
const STATE_PATH = resolve(REPORT_DIR, 'bot-state.json');
const REPORT_PATH = resolve(REPORT_DIR, 'REPORT.json');
const MODELS_PATH = resolve(REPORT_DIR, 'MODELS.json');
const ANOMALIES_PATH = resolve(REPORT_DIR, 'ANOMALIES.json');
const TWINS_PATH = resolve(REPORT_DIR, 'TWINS.json');
const SELLERS_PATH = resolve(REPORT_DIR, 'SELLERS.json');
const WATCHLIST_PATH = resolve(REPORT_DIR, 'watchlist.json');
const HISTORY_PATH = resolve(REPORT_DIR, 'models-history.json');

const POLL_DEADLINE_MS = Date.now() + 230_000;  // ~4 min, leaves buffer for cron 5-min slot

const tg = async (method, body) => {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
};

// ---------- UI: keyboards & command menu ----------

// Legacy reply-keyboard kept for /keyboard command (one-time, pops up & hides).
const REPLY_KEYBOARD = {
    keyboard: [
        [{ text: '📊 Сводка' }, { text: '🟢 ATL' }, { text: '💸 Сделки' }],
        [{ text: '📉 Падения' }, { text: '🪙 Дёшево' }, { text: '🚨 Аномалии' }],
        [{ text: '🏷 Бренд' }, { text: '📏 Диагональ' }, { text: '💰 До цены' }],
        [{ text: '📋 Мой список' }, { text: '🕐 Время снимка' }, { text: 'ℹ️ Помощь' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
};

// Pop-up inline menu (shown by /menu — appears on top of the chat, dismisses on tap).
const INLINE_MENU = {
    inline_keyboard: [
        [{ text: '📊 Сводка', callback_data: 'menu:snapshot' }, { text: '🟢 ATL', callback_data: 'menu:atl' }, { text: '💸 Сделки', callback_data: 'menu:deals' }],
        [{ text: '📉 Падения', callback_data: 'menu:drops' }, { text: '🪙 Дёшево', callback_data: 'menu:cheap' }, { text: '🚨 Аномалии', callback_data: 'menu:anomalies' }],
        [{ text: '🏷 Бренд', callback_data: 'menu:brand' }, { text: '📏 Диагональ', callback_data: 'menu:d' }, { text: '💰 До цены', callback_data: 'menu:under' }],
        [{ text: '📋 Мой список', callback_data: 'menu:list' }, { text: '🎯 Интересное', callback_data: 'menu:interesting' }, { text: '🕐 Время', callback_data: 'menu:now' }],
        [{ text: 'ℹ️ Помощь', callback_data: 'menu:help' }],
    ],
};

const BRAND_KEYBOARD = {
    inline_keyboard: [
        [{ text: 'Samsung', callback_data: 'brand:samsung' }, { text: 'Sony', callback_data: 'brand:sony' }],
        [{ text: 'TCL', callback_data: 'brand:tcl' }, { text: 'Hisense', callback_data: 'brand:hisense' }],
        [{ text: 'Haier', callback_data: 'brand:haier' }, { text: 'Xiaomi', callback_data: 'brand:xiaomi' }],
        [{ text: 'Яндекс', callback_data: 'brand:яндекс' }, { text: 'SBER', callback_data: 'brand:sber' }],
    ],
};

const DIAGONAL_KEYBOARD = {
    inline_keyboard: [
        [{ text: '24"', callback_data: 'd:24' }, { text: '32"', callback_data: 'd:32' }, { text: '40"', callback_data: 'd:40' }, { text: '43"', callback_data: 'd:43' }],
        [{ text: '50"', callback_data: 'd:50' }, { text: '55"', callback_data: 'd:55' }, { text: '65"', callback_data: 'd:65' }],
        [{ text: '70"', callback_data: 'd:70' }, { text: '75"', callback_data: 'd:75' }, { text: '85"', callback_data: 'd:85' }, { text: '98"', callback_data: 'd:98' }],
    ],
};

const PRICE_KEYBOARD = {
    inline_keyboard: [
        [{ text: '≤ 15 000 ₽', callback_data: 'under:15000' }, { text: '≤ 25 000 ₽', callback_data: 'under:25000' }],
        [{ text: '≤ 40 000 ₽', callback_data: 'under:40000' }, { text: '≤ 60 000 ₽', callback_data: 'under:60000' }],
        [{ text: '≤ 100 000 ₽', callback_data: 'under:100000' }, { text: '≤ 200 000 ₽', callback_data: 'under:200000' }],
    ],
};

const ANOMALY_KEYBOARD = {
    inline_keyboard: [
        [{ text: '🚨 Заглушки', callback_data: 'anom:sentinels:0' }, { text: '🤖 Невозможная цена', callback_data: 'anom:absurdPrice:0' }],
        [{ text: '🎭 Фейк-скидки', callback_data: 'anom:fakeDiscounts:0' }, { text: '🔄 Дубли модели', callback_data: 'anom:dupes:0' }],
        [{ text: '📈 Дорогие выбросы', callback_data: 'anom:expensiveOutliers:0' }, { text: '📉 Дешёвые выбросы', callback_data: 'anom:cheapOutliers:0' }],
        [{ text: '💎 Дешёвый премиум', callback_data: 'anom:premiumLow:0' }, { text: '📊 Движение моделей', callback_data: 'anom:modelMoved:0' }],
        [{ text: '⬇ Подешевели', callback_data: 'anom:dropped:0' }, { text: '⬆ Подорожали', callback_data: 'anom:jumped:0' }],
    ],
};

const ANOMALY_LABELS = {
    sentinels: { title: '🚨 Sentinel-цены', desc: 'Заглушки продавцов (1 ₽, 999999 ₽ и т.п.)' },
    absurdPrice: { title: '🤖 Невозможная цена', desc: 'Цена ниже физического минимума для своей диагонали — typo/scam' },
    fakeDiscounts: { title: '🎭 Устойчивые фейк-скидки', desc: 'Скидка ≥70%, которая держится snapshot за snapshot (RRP надут)' },
    dupes: { title: '🔄 Дубли модели', desc: 'Один артикул у нескольких продавцов с разбросом ≥1.4×' },
    expensiveOutliers: { title: '📈 Дорогие выбросы', desc: 'Цена выше типовой для своей диагонали (z ≥ 2.5)' },
    cheapOutliers: { title: '📉 Дешёвые выбросы', desc: 'Цена ниже типовой — может быть deal или ошибка (z ≤ −2)' },
    premiumLow: { title: '💎 Дешёвый премиум', desc: 'Премиум-бренд по подозрительно низкой цене' },
    modelMoved: { title: '📊 Движение моделей', desc: 'Модель сдвинулась ≥15% по min или median vs прошлый снимок' },
    dropped: { title: '⬇ Подешевели', desc: 'Модели, у которых min упал ≥10% к прошлому снимку' },
    jumped: { title: '⬆ Подорожали', desc: 'Модели, у которых min вырос ≥15% к прошлому снимку' },
};

// Map free-text reply-keyboard taps to slash-commands
const TEXT_TO_COMMAND = {
    '📊 Сводка': '/snapshot',
    '🟢 ATL': '/atl',
    '💸 Сделки': '/deals',
    '📉 Падения': '/drops',
    '🪙 Дёшево': '/cheap',
    '🚨 Аномалии': '/anomalies',
    '🏷 Бренд': '/brand',
    '📏 Диагональ': '/d',
    '💰 До цены': '/under',
    '📋 Мой список': '/list',
    '🕐 Время снимка': '/now',
    'ℹ️ Помощь': '/help',
};

async function registerBotCommands() {
    await tg('setMyCommands', {
        commands: [
            { command: 'snapshot', description: '📊 Общая сводка по брендам' },
            { command: 'atl', description: '🟢 Модели с новыми all-time low' },
            { command: 'deals', description: '💸 Сделки ниже медианы модели' },
            { command: 'drops', description: '📉 Подешевели ≥10% к прошлому снимку' },
            { command: 'anomalies', description: '🚨 High-severity аномалии цены' },
            { command: 'cheap', description: '🪙 Топ-15 самых дешёвых TV ≥32"' },
            { command: 'brand', description: '🏷 Бренд (samsung/sony/tcl/…)' },
            { command: 'd', description: '📏 Диагональ (24/32/43/55/65/75…)' },
            { command: 'under', description: '💰 Модели до цены (₽)' },
            { command: 'find', description: '🔍 Поиск по названию' },
            { command: 'model', description: '📺 Детально по модели' },
            { command: 'chart', description: '📈 График цены модели (PNG)' },
            { command: 'forecast', description: '🔮 Прогноз: куда движется цена' },
            { command: 'twins', description: '🪞 Panel-twins: те же экраны у разных брендов' },
            { command: 'sellers', description: '🏪 Топ нестабильных листингов' },
            { command: 'watch', description: '👀 Подписаться: /watch <модель> [потолок_₽]' },
            { command: 'unwatch', description: '🚫 Отписаться: /unwatch <модель>' },
            { command: 'watchlist', description: '📋 Мои подписки (модели TV)' },
            { command: 'track', description: '🛒 Трекать любой товар: пришли ссылку или /track <арт>' },
            { command: 'untrack', description: '🗑 Снять с трекинга: /untrack <арт>' },
            { command: 'rename', description: '✏️ Имя товара: /rename <арт> <имя>' },
            { command: 'threshold', description: '🎯 Порог цены: /threshold <арт> <руб>' },
            { command: 'list', description: '📋 Все мои товары + модели' },
            { command: 'exportcsv', description: '📄 Скачать список (.csv)' },
            { command: 'now', description: '🕐 Время последнего снимка' },
            { command: 'scrape', description: '🔄 Запросить новый скрап' },
            { command: 'menu', description: '⌨️ Показать меню кнопок' },
            { command: 'help', description: 'ℹ️ Список команд' },
        ],
    });
}

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trim = (s = '', n = 70) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf8')) : {};
let offset = state.lastUpdateId ? state.lastUpdateId + 1 : 0;
let processed = 0;

const report = existsSync(REPORT_PATH) ? JSON.parse(readFileSync(REPORT_PATH, 'utf8')) : { all: [], byBrand: [], generatedAt: null };
const models = existsSync(MODELS_PATH) ? JSON.parse(readFileSync(MODELS_PATH, 'utf8')) : { models: [], generatedAt: null };
const anomalies = existsSync(ANOMALIES_PATH) ? JSON.parse(readFileSync(ANOMALIES_PATH, 'utf8')) : null;
const twins = existsSync(TWINS_PATH) ? JSON.parse(readFileSync(TWINS_PATH, 'utf8')) : { twins: [] };
const sellersReport = existsSync(SELLERS_PATH) ? JSON.parse(readFileSync(SELLERS_PATH, 'utf8')) : { listings: [] };
const history = existsSync(HISTORY_PATH) ? JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) : { models: {} };
let watchlist = existsSync(WATCHLIST_PATH) ? JSON.parse(readFileSync(WATCHLIST_PATH, 'utf8')) : { entries: [] };

const items = report.all || [];
const allModels = models.models || [];

// ---------- command handlers ----------

function cmdHelp() {
    return [
        '<b>📺 WB TV Tracker</b>',
        '',
        'Тыкайте кнопки внизу — или пишите команды вручную:',
        '',
        '<b>📊 Сводки</b>',
        '/snapshot — общая сводка по брендам',
        '/atl — новые all-time low',
        '/deals — артикулы ниже 80% медианы своей модели',
        '/drops — модели подешевевшие ≥10%',
        '/anomalies — high-severity ценовые аномалии',
        '',
        '<b>🔍 Поиск</b>',
        '/brand — кнопки выбора бренда',
        '/d — кнопки выбора диагонали',
        '/under — кнопки выбора потолка цены',
        '/cheap — топ-15 самых дешёвых TV ≥32"',
        '/find &lt;text&gt; — поиск по названию',
        '/model &lt;code&gt; — детально по модели',
        '',
        '<b>📈 Аналитика</b>',
        '/chart &lt;code&gt; — график цены модели (PNG)',
        '/forecast &lt;code&gt; — куда движется цена + лучший день недели',
        '/twins [diag] — те же экраны у разных брендов',
        '/sellers — подозрительные листинги',
        '',
        '<b>👀 Подписки</b>',
        '/watch &lt;code&gt; [₽] — подписаться на модель',
        '/unwatch &lt;code&gt; — отписаться',
        '/watchlist — мои подписки',
        '',
        '<b>⚙️ Прочее</b>',
        '/now — время последнего снимка',
        '/scrape — попросить новый скрап',
        '/menu — вернуть меню кнопок',
        '/help — это сообщение',
    ].join('\n');
}

function cmdStart() {
    return [
        '<b>👋 Привет! Это WB TV Tracker</b>',
        '',
        'Отслеживаю минимальные цены на телевизоры Wildberries по 8 брендам:',
        'Samsung · Sony · TCL · Hisense · Haier · Xiaomi · Яндекс · SBER',
        '',
        '<b>Что я умею:</b>',
        '• Сводка по брендам и моделям (/snapshot)',
        '• Алёрты на новые all-time low (/atl)',
        '• Поиск сделок дешевле медианы своей модели (/deals)',
        '• Поиск по бренду / диагонали / цене / тексту',
        '• Детальная история по конкретной модели (/model qe75qn990fuxru)',
        '',
        'Используйте кнопки внизу или /help для полного списка.',
    ].join('\n');
}

function cmdSnapshot() {
    const byBrand = report.byBrand || [];
    const lines = [];
    const stamp = (report.generatedAt || '').slice(0, 16).replace('T', ' ');
    lines.push(`<b>📺 WB TV — снимок ${esc(stamp)} UTC</b>`);
    lines.push(`Карточек: <b>${items.length}</b> · Моделей: <b>${allModels.length}</b>`);
    lines.push('');
    for (const b of byBrand) {
        lines.push(`• <b>${esc(b.brand)}</b> — ${b.count} карт., мин <b>${fmt(b.min)} ₽</b>, медиана ${fmt(b.median)} ₽`);
    }
    return lines.join('\n');
}

function cmdAtl(arg, page = 0) {
    const all = allModels.filter((m) => m.newAllTimeLow)
        .sort((a, b) => b.sellers - a.sellers || a.min - b.min);
    if (!all.length) return 'Новых all-time low в последнем снимке нет.';
    const start = page * PAGE_SIZE;
    const slice = all.slice(start, start + PAGE_SIZE);
    const lastPage = Math.max(0, Math.ceil(all.length / PAGE_SIZE) - 1);
    const lines = [`<b>🟢 Новые all-time low — ${all.length} · стр. ${page + 1}/${lastPage + 1}</b>`, ''];
    for (const r of slice) {
        const cheap = r.items[0];
        lines.push(`• <code>${esc(r.model)}</code> · ${esc(r.brand)} ${r.diagonals.join('/')}" · <b>${fmt(r.min)} ₽</b> · ${link('арт. ' + cheap.id, cheap.url)}`);
    }
    return { text: lines.join('\n'), reply_markup: navMarkup('pg:atl:_', page, all.length) };
}

function cmdDeals(arg, page = 0) {
    const deals = allModels
        .filter((m) => m.dealItems?.length)
        .flatMap((m) => m.dealItems.map((d) => ({ ...d, model: m })))
        .sort((a, b) => (a.price / a.model.median) - (b.price / b.model.median));
    if (!deals.length) return 'Сделок ниже 80% медианы своей модели сейчас нет.';
    const start = page * PAGE_SIZE;
    const slice = deals.slice(start, start + PAGE_SIZE);
    const lastPage = Math.max(0, Math.ceil(deals.length / PAGE_SIZE) - 1);
    const lines = [
        `<b>💸 Сделки внутри модели — ${deals.length} · стр. ${page + 1}/${lastPage + 1}</b>`,
        '<i>Артикул дешевле, чем тот же товар у других продавцов.</i>',
        '',
    ];
    for (const d of slice) {
        const diff = Math.round((1 - d.price / d.model.median) * 100);
        lines.push(`• −<b>${diff}%</b> · <code>${esc(d.model.model)}</code> · ${esc(d.model.brand)} ${d.model.diagonals.join('/')}" · <b>${fmt(d.price)} ₽</b> (медиана ${fmt(d.model.median)}) · ${link('арт. ' + d.id, d.url)}`);
    }
    return { text: lines.join('\n'), reply_markup: navMarkup('pg:deals:_', page, deals.length) };
}

function cmdDrops(arg, page = 0) {
    const drops = allModels.filter((m) => m.dropPct != null && m.dropPct <= -10).sort((a, b) => a.dropPct - b.dropPct);
    if (!drops.length) return 'Никакая модель не подешевела ≥10% к прошлому снимку.';
    const start = page * PAGE_SIZE;
    const slice = drops.slice(start, start + PAGE_SIZE);
    const lastPage = Math.max(0, Math.ceil(drops.length / PAGE_SIZE) - 1);
    const lines = [`<b>📉 Подешевели ≥10% — ${drops.length} · стр. ${page + 1}/${lastPage + 1}</b>`, ''];
    for (const r of slice) {
        const cheap = r.items[0];
        lines.push(`• <b>${r.dropPct}%</b> · <code>${esc(r.model)}</code> · ${esc(r.brand)} ${r.diagonals.join('/')}" · <b>${fmt(r.min)} ₽</b> · ${link('арт. ' + cheap.id, cheap.url)}`);
    }
    return { text: lines.join('\n'), reply_markup: navMarkup('pg:drops:_', page, drops.length) };
}

function cmdAnomalies() {
    if (!anomalies) return 'Файл аномалий не найден.';
    const sev = anomalies.severity || { high: 0, medium: 0, low: 0 };
    const lines = [
        `<b>🚨 Аномалии — снимок ${esc((anomalies.generatedAt || '').slice(0, 16).replace('T', ' '))} UTC</b>`,
        `Severity: high=<b>${sev.high}</b> · medium=<b>${sev.medium}</b> · low=<b>${sev.low}</b>`,
        '',
        '<b>По категориям:</b>',
    ];
    for (const [key, label] of Object.entries(ANOMALY_LABELS)) {
        const n = (anomalies[key] || []).length;
        const mark = n > 0 ? '•' : '·';
        lines.push(`${mark} ${label.title}: <b>${n}</b> — <i>${label.desc}</i>`);
    }
    lines.push('');
    lines.push('Тыкайте категорию ↓ для деталей.');
    return { text: lines.join('\n'), reply_markup: ANOMALY_KEYBOARD };
}

function cmdAnomalyCategory(cat, page = 0) {
    if (!anomalies) return 'Файл аномалий не найден.';
    const label = ANOMALY_LABELS[cat];
    if (!label) return 'Неизвестная категория аномалии.';
    const arr = anomalies[cat] || [];
    if (!arr.length) return `<b>${label.title}</b>\n<i>${label.desc}</i>\n\nВ этом снимке пусто.`;
    const start = page * PAGE_SIZE;
    const slice = arr.slice(start, start + PAGE_SIZE);
    if (!slice.length) return `Страница ${page + 1} пуста.`;
    const lastPage = Math.max(0, Math.ceil(arr.length / PAGE_SIZE) - 1);
    const lines = [
        `<b>${label.title} — ${arr.length} · стр. ${page + 1}/${lastPage + 1}</b>`,
        `<i>${label.desc}</i>`,
        '',
    ];

    if (cat === 'dupes') {
        // dupes have a different shape: {key, min, max, spread, arr: [items]}
        for (const d of slice) {
            const [brand, model] = (d.key || '').split('|');
            lines.push(`• <code>${esc(model)}</code> · ${esc(brand || '—')} · ${d.arr.length} продавцов · ${fmt(d.min)}–${fmt(d.max)} ₽ (×${d.spread?.toFixed?.(2)})`);
            const cheap = d.arr[0];
            if (cheap) lines.push(`  └ ${link('арт. ' + cheap.id, cheap.url)} — ${fmt(cheap.price)} ₽`);
        }
    } else if (cat === 'modelMoved') {
        // modelMoved: {key, brand, model, diagonal, prevMin, curMin, prevMedian, curMedian, moveMin, moveMed, ...}
        for (const m of slice) {
            const dmin = m.moveMin > 0 ? `+${m.moveMin}%` : `${m.moveMin}%`;
            const dmed = m.moveMed > 0 ? `+${m.moveMed}%` : `${m.moveMed}%`;
            const arrow = m.moveMin <= -10 ? '📉' : m.moveMin >= 10 ? '📈' : '↔';
            lines.push(`• ${arrow} <code>${esc(m.model)}</code> · ${esc(m.brand)} ${m.diagonal || '?'}" · min ${dmin} (${fmt(m.prevMin)}→<b>${fmt(m.curMin)}</b>) · med ${dmed}${m.cheapId ? ' · ' + link('арт. ' + m.cheapId, m.url || '#') : ''}`);
        }
    } else {
        // Plain item shape
        for (const it of slice) {
            const disc = it.discount ? ` −${it.discount}%` : '';
            const diag = it.diagonal ? ` ${it.diagonal}"` : '';
            lines.push(`• <b>${fmt(it.price)} ₽</b>${disc}${diag} · ${esc(it.brand || '—')} · ${link(trim(it.name, 50), it.url)}`);
        }
    }

    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:anom:${cat}`, page, arr.length) };
}

const PAGE_SIZE = 10;

// Build a "← / →" nav row for paginated answers. cbPrefix is the callback_data
// prefix (e.g. "pg:brand:samsung") — page index gets appended.
function navMarkup(cbPrefix, page, total) {
    const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
    const row = [];
    if (page > 0) row.push({ text: '← Назад', callback_data: `${cbPrefix}:${page - 1}` });
    row.push({ text: `${page + 1}/${lastPage + 1}`, callback_data: 'noop' });
    if (page < lastPage) row.push({ text: 'Ещё →', callback_data: `${cbPrefix}:${page + 1}` });
    return { inline_keyboard: [row] };
}

function fmtItemLine(p, { showBrand = true, showDiag = true } = {}) {
    const diag = showDiag && p.diagonal ? ` ${p.diagonal}"` : '';
    const brand = showBrand ? ` ${esc(p.brand || '—')}` : '';
    const disc = p.discount ? ` −${p.discount}%` : '';
    return `• <b>${fmt(p.price)}₽</b>${disc}${diag}${brand} · ${link(trim(p.name, 50), p.url)}`;
}

function cmdBrand(arg, page = 0) {
    if (!arg) return { text: '🏷 <b>Выберите бренд:</b>', reply_markup: BRAND_KEYBOARD };
    const q = arg.toLowerCase();
    const matches = items
        .filter((x) => (x.brand || '').toLowerCase().includes(q))
        .sort((a, b) => a.price - b.price);
    if (!matches.length) return `По бренду «${esc(arg)}» ничего не найдено.`;
    const start = page * PAGE_SIZE;
    const slice = matches.slice(start, start + PAGE_SIZE);
    if (!slice.length) return `Страница ${page + 1} пуста.`;
    const lastPage = Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1);
    const lines = [
        `<b>${esc(arg.toUpperCase())} — ${matches.length} карт. · стр. ${page + 1}/${lastPage + 1}</b>`,
        `Мин <b>${fmt(matches[0].price)} ₽</b> · Макс ${fmt(matches[matches.length - 1].price)} ₽`,
        '',
    ];
    for (const p of slice) lines.push(fmtItemLine(p, { showBrand: false }));
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:brand:${q}`, page, matches.length) };
}

function cmdDiagonal(arg, page = 0) {
    const n = parseInt(arg, 10);
    if (!n) return { text: '📏 <b>Выберите диагональ:</b>', reply_markup: DIAGONAL_KEYBOARD };
    const matches = items.filter((x) => x.diagonal === n).sort((a, b) => a.price - b.price);
    if (!matches.length) return `Карточек с диагональю ${n}" нет.`;
    const start = page * PAGE_SIZE;
    const slice = matches.slice(start, start + PAGE_SIZE);
    if (!slice.length) return `Страница ${page + 1} пуста.`;
    const lastPage = Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1);
    const lines = [`<b>${n}" — ${matches.length} карт. · стр. ${page + 1}/${lastPage + 1}</b>`, ''];
    for (const p of slice) lines.push(fmtItemLine(p, { showDiag: false }));
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:d:${n}`, page, matches.length) };
}

function cmdUnder(arg, page = 0) {
    const max = parseInt(String(arg).replace(/\D/g, ''), 10);
    if (!max) return { text: '💰 <b>Выберите потолок цены:</b>', reply_markup: PRICE_KEYBOARD };
    const matches = items.filter((x) => x.price <= max).sort((a, b) => a.price - b.price);
    if (!matches.length) return `Ничего не дешевле ${fmt(max)} ₽.`;
    const start = page * PAGE_SIZE;
    const slice = matches.slice(start, start + PAGE_SIZE);
    if (!slice.length) return `Страница ${page + 1} пуста.`;
    const lastPage = Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1);
    const lines = [`<b>До ${fmt(max)} ₽ — ${matches.length} карт. · стр. ${page + 1}/${lastPage + 1}</b>`, ''];
    for (const p of slice) lines.push(fmtItemLine(p));
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:under:${max}`, page, matches.length) };
}

function cmdCheap(arg, page = 0) {
    const matches = items.filter((x) => x.diagonal && x.diagonal >= 32).sort((a, b) => a.price - b.price);
    if (!matches.length) return 'Нет данных.';
    const start = page * PAGE_SIZE;
    const slice = matches.slice(start, start + PAGE_SIZE);
    if (!slice.length) return `Страница ${page + 1} пуста.`;
    const lastPage = Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1);
    const lines = [`<b>🪙 Самые дешёвые TV ≥32" — ${matches.length} карт. · стр. ${page + 1}/${lastPage + 1}</b>`, ''];
    for (const p of slice) lines.push(fmtItemLine(p));
    return { text: lines.join('\n'), reply_markup: navMarkup('pg:cheap:_', page, matches.length) };
}

function cmdFind(arg, page = 0) {
    if (!arg) return 'Использование: <code>/find qled</code>';
    const q = arg.toLowerCase();
    const matches = items.filter((x) => x.name.toLowerCase().includes(q)).sort((a, b) => a.price - b.price);
    if (!matches.length) return `По запросу «${esc(arg)}» ничего не найдено.`;
    const start = page * PAGE_SIZE;
    const slice = matches.slice(start, start + PAGE_SIZE);
    if (!slice.length) return `Страница ${page + 1} пуста.`;
    const lastPage = Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1);
    const lines = [`<b>«${esc(arg)}» — найдено ${matches.length} · стр. ${page + 1}/${lastPage + 1}</b>`, ''];
    for (const p of slice) lines.push(fmtItemLine(p));
    // Find arg can contain spaces/colons; sanitize for callback_data (max 64 bytes).
    // Use a short hash-like key (truncate aggressively).
    const cbArg = encodeURIComponent(q).slice(0, 40);
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:find:${cbArg}`, page, matches.length) };
}

function cmdModel(arg) {
    if (!arg) return 'Использование: <code>/model qe75qn990fuxru</code>';
    const q = arg.toLowerCase().replace(/[`'"]/g, '');
    const m = allModels.find((x) => x.model.toLowerCase() === q) || allModels.find((x) => x.model.toLowerCase().includes(q));
    if (!m) return `Модель <code>${esc(arg)}</code> в трекере не найдена.`;
    const lines = [
        `<b>${esc(m.brand)} <code>${esc(m.model)}</code> · ${m.diagonals.join('/')}"</b>`,
        `Продавцов: <b>${m.sellers}</b> · Мин <b>${fmt(m.min)} ₽</b> · Медиана ${fmt(m.median)} ₽ · Макс ${fmt(m.max)} ₽`,
        `All-time low: <b>${fmt(m.allTimeMin)} ₽</b>${m.newAllTimeLow ? ' 🟢 (новый ATL)' : ''}`,
        '',
        '<b>Артикулы (по возрастанию цены):</b>',
    ];
    for (const it of m.items.slice(0, 10)) {
        const diff = Math.round((1 - it.price / m.median) * 100);
        const tag = diff >= 10 ? ` (−${diff}% к медиане)` : '';
        lines.push(`• <b>${fmt(it.price)}₽</b>${tag} · ${link('арт. ' + it.id, it.url)}`);
    }
    if (m.items.length > 10) lines.push(`<i>…и ещё ${m.items.length - 10} артикулов.</i>`);
    return lines.join('\n');
}

function cmdNow() {
    const r = (report.generatedAt || '?').slice(0, 16).replace('T', ' ');
    const m = (models.generatedAt || '?').slice(0, 16).replace('T', ' ');
    return [
        `<b>🕐 Снимки</b>`,
        `REPORT.json: ${esc(r)} UTC`,
        `MODELS.json: ${esc(m)} UTC`,
        '',
        `<i>Cron расписание: ежедневно 06:00 UTC (09:00 МСК).</i>`,
    ].join('\n');
}

async function cmdScrape() {
    const ghToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPOSITORY;
    const ref = process.env.GITHUB_REF_NAME;
    if (!ghToken || !repo) return 'Команда доступна только при запуске из GitHub Actions с правом `actions: write`.';
    const url = `https://api.github.com/repos/${repo}/actions/workflows/wb-tv-report.yml/dispatches`;
    const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        body: JSON.stringify({ ref: ref || 'main' }),
    });
    if (r.status === 204) return '✅ Скрап запрошен. Когда новый снимок будет готов, я пришлю свежую сводку.';
    const body = await r.text();
    return `❌ Не удалось запустить скрап: HTTP ${r.status}\n<code>${esc(body.slice(0, 200))}</code>`;
}

// ---------- new commands: chart / forecast / twins / sellers / watch ----------

function findModel(q) {
    if (!q) return null;
    const norm = q.toLowerCase().replace(/[`'"]/g, '');
    return allModels.find((x) => x.model.toLowerCase() === norm)
        || allModels.find((x) => x.model.toLowerCase().includes(norm));
}

function chartUrl(m) {
    const h = history.models?.[m.key];
    const snaps = h?.snapshots || [];
    if (snaps.length < 2) return null;
    const labels = snaps.map((s) => s.at.slice(5, 10));
    const min = snaps.map((s) => s.min);
    const med = snaps.map((s) => s.med);
    const cfg = {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Мин ₽', data: min, borderColor: '#3fb950', fill: false, tension: 0.2 },
                { label: 'Медиана ₽', data: med, borderColor: '#d29922', fill: false, tension: 0.2, borderDash: [4, 4] },
            ],
        },
        options: {
            title: { display: true, text: `${m.brand} ${m.model} · ${m.diagonals.join('/')}"` },
            legend: { position: 'bottom' },
        },
    };
    return `https://quickchart.io/chart?bkg=white&w=720&h=360&c=${encodeURIComponent(JSON.stringify(cfg))}`;
}

function cmdChart(arg) {
    if (!arg) return 'Использование: <code>/chart qe75qn990fuxru</code>';
    const m = findModel(arg);
    if (!m) return `Модель <code>${esc(arg)}</code> не найдена.`;
    const url = chartUrl(m);
    if (!url) return `<b>${esc(m.brand)} <code>${esc(m.model)}</code></b>\nЕщё нет истории для графика (нужно ≥2 снимков).`;
    return {
        text: [
            `<b>📈 ${esc(m.brand)} <code>${esc(m.model)}</code> · ${m.diagonals.join('/')}"</b>`,
            `Текущий мин: <b>${fmt(m.min)} ₽</b> · ATL: ${fmt(m.allTimeMin)} ₽`,
            `<a href="${esc(url)}">График открыть в полном размере →</a>`,
        ].join('\n'),
        // Preview enabled — Telegram renders the QuickChart PNG inline.
        disable_web_page_preview: false,
    };
}

function cmdForecast(arg) {
    if (!arg) return 'Использование: <code>/forecast qe75qn990fuxru</code>';
    const m = findModel(arg);
    if (!m) return `Модель <code>${esc(arg)}</code> не найдена.`;
    const lines = [
        `<b>🔮 ${esc(m.brand)} <code>${esc(m.model)}</code> · ${m.diagonals.join('/')}"</b>`,
        '',
        `Текущий мин: <b>${fmt(m.min)} ₽</b>`,
        `Медиана: ${fmt(m.median)} ₽ · ATL: ${fmt(m.allTimeMin)} ₽`,
    ];
    if (m.velocity != null) {
        const arrow = m.velocity <= -1 ? '📉' : m.velocity >= 1 ? '📈' : '➡';
        const tagLabel = {
            'panic-sale': '🚨 PANIC SALE — продавец сбрасывает остатки, бери сейчас',
            'falling': '📉 Падает — стоит подождать ещё пару дней',
            'rising': '📈 Растёт — покупать прямо сейчас',
            'flat': '➡ Стабильно — равновесие, drop'+`'у неоткуда взяться`,
        }[m.velocityTag] || '';
        lines.push(`Скорость: <b>${m.velocity > 0 ? '+' : ''}${m.velocity}%/день</b> ${arrow}`);
        if (tagLabel) lines.push(`<i>${tagLabel}</i>`);
    } else {
        lines.push('<i>Недостаточно истории для скорости (нужно ≥3 снимков).</i>');
    }
    if (m.bestDow) {
        lines.push('');
        lines.push(`📅 Лучший день для покупки исторически: <b>${m.bestDow.day}</b> (средний мин ${fmt(m.bestDow.avg)} ₽, ${m.bestDow.samples} снимков)`);
    }
    if (m.nearAtl) {
        lines.push('');
        lines.push(`🔴 <b>Внимание: в ${m.nearAtlPct}% от исторического дна.</b> Любое движение вниз = новый ATL.`);
    }
    return lines.join('\n');
}

function cmdTwins(arg, page = 0) {
    const all = twins.twins || [];
    let filtered = all;
    if (arg) {
        const diag = parseInt(arg, 10);
        if (diag) filtered = all.filter((t) => t.diagonal === diag);
    }
    if (!filtered.length) return arg
        ? `Panel-twins с диагональю ${esc(arg)}" не найдены.`
        : 'Panel-twins пока не обнаружены.';
    const start = page * PAGE_SIZE;
    const slice = filtered.slice(start, start + PAGE_SIZE);
    const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
    const title = arg ? `🪞 Panel-twins ${esc(arg)}" — ${filtered.length}` : `🪞 Panel-twins — ${filtered.length}`;
    const lines = [
        `<b>${title} · стр. ${page + 1}/${lastPage + 1}</b>`,
        `<i>Те же диагональ/разрешение/тех — разные бренды и разная цена.</i>`,
        '',
    ];
    for (const t of slice) {
        lines.push(`<b>${t.diagonal}" · ${esc(t.resolution)} · ${esc(t.tech)}</b> — разброс <b>${t.spreadPct}%</b>`);
        for (const mem of t.members.slice(0, 4)) {
            lines.push(`  • ${esc(mem.brand)} <code>${esc(mem.model)}</code> — <b>${fmt(mem.min)} ₽</b> · ${link('арт. ' + mem.id, mem.url || '#')}`);
        }
        if (t.members.length > 4) lines.push(`  <i>…и ещё ${t.members.length - 4}</i>`);
        lines.push('');
    }
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:twins:${arg || '_'}`, page, filtered.length) };
}

function cmdSellers(arg, page = 0) {
    const list = sellersReport.listings || [];
    if (!list.length) return 'Данных по листингам пока недостаточно (нужно ≥2 истории снимка).';
    // Worst score first = most fake/volatile
    const start = page * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);
    const lastPage = Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1);
    const lines = [
        `<b>🏪 Подозрительные листинги — ${list.length} · стр. ${page + 1}/${lastPage + 1}</b>`,
        `<i>Сортировка: худшие первыми (высокая волатильность / фейк-скидки).</i>`,
        '',
    ];
    for (const r of slice) {
        const fr = Math.round(r.fakeDiscountRate * 100);
        const vol = Math.round(r.volatility * 100);
        lines.push(`• score <b>${r.score}</b> · ${esc(r.brand)} · ${fmt(r.priceMin)}–${fmt(r.priceMax)}₽ (vol ${vol}%, fake-disc ${fr}%) · ${link('арт. ' + r.id, r.url)}`);
    }
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:sellers:_`, page, list.length) };
}

function reloadWatchlist() {
    watchlist = existsSync(WATCHLIST_PATH) ? JSON.parse(readFileSync(WATCHLIST_PATH, 'utf8')) : { entries: [] };
}
function saveWatchlist() {
    writeFileSync(WATCHLIST_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), entries: watchlist.entries }, null, 2));
}

function cmdWatch(arg, ctx = {}) {
    if (!ctx.chatId) return 'Подписка возможна только из чата с ботом.';
    if (!arg) return 'Использование: <code>/watch &lt;модель&gt; [потолок_₽]</code>\nПример: <code>/watch qe75qn990fuxru 100000</code>';
    const parts = arg.trim().split(/\s+/);
    const modelArg = parts[0];
    const threshold = parts[1] ? parseInt(parts[1].replace(/\D/g, ''), 10) : null;
    const m = findModel(modelArg);
    if (!m) return `Модель <code>${esc(modelArg)}</code> не найдена. Точный код модели в /atl или /deals.`;
    reloadWatchlist();
    const existing = watchlist.entries.findIndex((e) => e.chatId === ctx.chatId && e.modelKey === m.key);
    const entry = {
        chatId: ctx.chatId,
        modelKey: m.key,
        threshold: threshold || null,
        label: `${m.brand} ${m.model}`,
        addedAt: new Date().toISOString(),
    };
    if (existing >= 0) watchlist.entries[existing] = entry;
    else watchlist.entries.push(entry);
    saveWatchlist();
    const thresholdLine = threshold
        ? `\nПорог: <b>${fmt(threshold)} ₽</b> (триггер только при цене ≤)`
        : '\n<i>Без порога — алёрт при любом снижении.</i>';
    return [
        `👀 <b>Подписка добавлена</b>`,
        '',
        `${esc(m.brand)} <code>${esc(m.model)}</code> · ${m.diagonals.join('/')}"`,
        `Текущий мин: <b>${fmt(m.min)} ₽</b>${thresholdLine}`,
        '',
        `Список ваших подписок: /watchlist`,
        `Отписаться: <code>/unwatch ${esc(m.model)}</code>`,
    ].join('\n');
}

function cmdUnwatch(arg, ctx = {}) {
    if (!ctx.chatId) return 'Отписка возможна только из чата с ботом.';
    if (!arg) return 'Использование: <code>/unwatch &lt;модель&gt;</code>';
    const m = findModel(arg);
    const key = m?.key;
    reloadWatchlist();
    const before = watchlist.entries.length;
    if (key) {
        watchlist.entries = watchlist.entries.filter((e) => !(e.chatId === ctx.chatId && e.modelKey === key));
    } else {
        // fallback: substring match on label
        const q = arg.toLowerCase();
        watchlist.entries = watchlist.entries.filter((e) => !(e.chatId === ctx.chatId && e.label.toLowerCase().includes(q)));
    }
    saveWatchlist();
    const removed = before - watchlist.entries.length;
    return removed > 0
        ? `🚫 Отписан от ${removed} модел${removed === 1 ? 'и' : 'ей'}.`
        : `Подписки на «${esc(arg)}» не было.`;
}

function cmdWatchlist(arg, ctx = {}) {
    if (!ctx.chatId) return 'Список подписок доступен только из чата с ботом.';
    reloadWatchlist();
    const mine = watchlist.entries.filter((e) => e.chatId === ctx.chatId);
    if (!mine.length) return [
        '📋 <b>Ваших подписок нет.</b>',
        '',
        'Подпишитесь: <code>/watch &lt;модель&gt; [потолок_₽]</code>',
        'Пример: <code>/watch qe75qn990fuxru 100000</code>',
    ].join('\n');
    const byKey = new Map(allModels.map((m) => [m.key, m]));
    const lines = [`📋 <b>Ваши подписки — ${mine.length}</b>`, ''];
    for (const e of mine) {
        const m = byKey.get(e.modelKey);
        const cur = m ? `мин <b>${fmt(m.min)} ₽</b>` : 'модели нет в текущем снимке';
        const th = e.threshold ? ` · порог ${fmt(e.threshold)} ₽` : '';
        lines.push(`• <code>${esc(e.modelKey.split('|')[1])}</code> · ${esc(e.label)} — ${cur}${th}`);
    }
    lines.push('');
    lines.push('Отписаться: <code>/unwatch &lt;модель&gt;</code>');
    return lines.join('\n');
}

// ---------- per-product tracker (universal — not just TV) ----------

const WB_URL_RE = /(?:wildberries\.ru|wb\.ru)\/catalog\/(\d{6,11})/i;
const RAW_ID_RE = /^\d{6,11}$/;

function parseUrlOrId(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (RAW_ID_RE.test(s)) return s;
    const m = s.match(WB_URL_RE);
    return m ? m[1] : null;
}

function productCardKeyboard(id) {
    return {
        inline_keyboard: [
            [{ text: 'Динамика', callback_data: `p:dyn:${id}` }, { text: 'Имя', callback_data: `p:ren:${id}` }],
            [{ text: 'Порог', callback_data: `p:thr:${id}` }, { text: 'Удалить', callback_data: `p:del:${id}` }],
            [{ text: 'Двойник', callback_data: `p:twin:${id}` }, { text: 'Прогноз', callback_data: `p:fc:${id}` }],
        ],
    };
}

// Render a product card in the "WB Tracker" style: labelled fields, no
// per-field icons, optional price-change banner + footer. `change` is
// optional — when present (after a snapshot diff) it emits the highlighted
// delta block + "fixed price" footer.
// Each row is "<b>Label:</b> value" — bold lead-in, regular value.
// Footer line is italic so the eye lands on the data, then trails off.
function renderProductCard(entry, snap, change = null) {
    const url = `https://www.wildberries.ru/catalog/${entry.productId}/detail.aspx`;
    const name = entry.alias || snap.name || 'Товар WB';
    const lines = [];
    lines.push(`🛒 <b>Товар:</b> <a href="${esc(url)}">${esc(name)}</a>`);
    lines.push('');
    if (snap.rating) lines.push(`⭐ <b>Рейтинг:</b> ${snap.rating}${snap.feedbacks ? ` <i>(оценок: ${snap.feedbacks})</i>` : ''}`);
    if (snap.supplier) lines.push(`🏪 <b>Магазин:</b> ${esc(snap.supplier)}`);
    if (snap.brand) lines.push(`🏷 <b>Бренд:</b> ${esc(snap.brand)}`);
    lines.push(`📍 <b>Регион:</b> ${esc(entry.region || 'Санкт-Петербург')}`);
    lines.push(`🔢 <b>Артикул:</b> ${entry.productId}`);
    if (snap.price) lines.push(`💰 <b>Цена:</b> ${fmt(snap.price)} ₽`);
    if (snap.reviewBonus) lines.push(`✦ <b>Рубли за отзыв:</b> ${fmt(snap.reviewBonus)} ₽`);
    if (snap.stock != null) lines.push(`📦 <b>Осталось:</b> ${snap.stock} шт`);
    if (snap.deliveryType) lines.push(`🚚 <b>Доставка:</b> ${esc(snap.deliveryType)}`);
    if (snap.deliveryAt) lines.push(`📅 <b>Дата доставки:</b> ${snap.deliveryAt}`);
    if (entry.minSeen && entry.maxSeen && entry.minSeen !== entry.maxSeen) {
        lines.push(`📊 <b>Мин. / Макс. цена:</b> ${fmt(entry.minSeen)} / ${fmt(entry.maxSeen)} ₽`);
    }
    if (entry.threshold) lines.push(`🎯 <b>Порог:</b> ≤ ${fmt(entry.threshold)} ₽`);

    if (change) {
        lines.push('');
        for (const banner of changeBanners(change, entry, snap)) lines.push(banner);
        lines.push('');
        lines.push(`<i>☀ Для дальнейшего отслеживания зафиксирована текущая цена ${fmt(snap.price)} ₽</i>`);
    }
    return lines.join('\n');
}

// Banner pattern matches the reference card: bright marker, bold phrase,
// direction triangle with the percent in parentheses.
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
    } else if (kind === 'near-atl') {
        out.push(`🔴 <b>Почти ATL</b> — до исторического дна осталось ${fmt(snap.price - entry.minSeen)} ₽`);
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

async function cmdTrack(arg, ctx = {}) {
    if (!ctx.chatId) return 'Доступно только из чата с ботом.';
    if (!arg) return [
        '🛒 <b>/track</b> — добавить любой товар WB в отслеживание.',
        '',
        '<b>Примеры:</b>',
        '<code>/track 357676897</code>',
        '<code>/track https://www.wildberries.ru/catalog/357676897/detail.aspx</code>',
        '<code>/track 357676897 --threshold 50000 --alias Стиралка</code>',
        '',
        'Или просто пришли мне ссылку с WB — я сам распознаю.',
    ].join('\n');
    // parse: first token = id/url, --threshold N, --alias rest
    const tokens = arg.trim().split(/\s+/);
    const id = parseUrlOrId(tokens[0]);
    if (!id) return `Не похоже на артикул или ссылку WB: <code>${esc(tokens[0])}</code>`;
    let threshold = null, alias = null;
    for (let i = 1; i < tokens.length; i++) {
        if (tokens[i] === '--threshold' || tokens[i] === '-t') {
            threshold = parseInt(String(tokens[++i] || '').replace(/\D/g, ''), 10) || null;
        } else if (tokens[i] === '--alias' || tokens[i] === '-a') {
            alias = tokens.slice(i + 1).join(' '); break;
        }
    }
    reloadWatchlist();
    const idx = watchlist.entries.findIndex((e) => e.chatId === ctx.chatId && e.productId === id);
    const entry = {
        chatId: ctx.chatId,
        productId: id,
        kind: 'product',
        alias: alias || (idx >= 0 ? watchlist.entries[idx].alias : null),
        threshold: threshold || (idx >= 0 ? watchlist.entries[idx].threshold : null),
        region: 'Санкт-Петербург',
        dest: '-1123300',
        addedAt: idx >= 0 ? watchlist.entries[idx].addedAt : new Date().toISOString(),
        lastSnapshot: idx >= 0 ? watchlist.entries[idx].lastSnapshot : null,
        history: idx >= 0 ? watchlist.entries[idx].history : [],
        minSeen: idx >= 0 ? watchlist.entries[idx].minSeen : null,
        maxSeen: idx >= 0 ? watchlist.entries[idx].maxSeen : null,
    };
    if (idx >= 0) watchlist.entries[idx] = entry;
    else watchlist.entries.push(entry);
    saveWatchlist();

    const verb = idx >= 0 ? 'Обновил' : 'Добавил';
    const snap = entry.lastSnapshot || {};
    const card = entry.lastSnapshot
        ? renderProductCard(entry, snap)
        : [
            `<b>${esc(alias || 'Товар WB')}</b>`,
            `Регион: ${esc(entry.region)}`,
            `Артикул: <b><code>${id}</code></b>`,
            entry.threshold ? `Порог: ≤ <b>${fmt(entry.threshold)} ₽</b>` : '',
            '',
            '<i>Свежие данные подгрузятся при следующем cron-прогоне scraper\'а.</i>',
        ].filter(Boolean).join('\n');
    return {
        text: `<b>${verb} в watchlist</b>\n\n` + card,
        photo: await resolveWbImageUrl(id),
        reply_markup: productCardKeyboard(id),
    };
}

function cmdUntrack(arg, ctx = {}) {
    if (!ctx.chatId) return 'Доступно только из чата с ботом.';
    if (!arg) return 'Использование: <code>/untrack &lt;артикул&gt;</code>';
    const id = parseUrlOrId(arg);
    if (!id) return `Не похоже на артикул: <code>${esc(arg)}</code>`;
    reloadWatchlist();
    const before = watchlist.entries.length;
    watchlist.entries = watchlist.entries.filter((e) => !(e.chatId === ctx.chatId && e.productId === id));
    saveWatchlist();
    return before > watchlist.entries.length
        ? `🗑 Удалил <code>${id}</code> из watchlist.`
        : `Этого товара в твоём watchlist нет.`;
}

function cmdRename(arg, ctx = {}) {
    if (!ctx.chatId) return 'Доступно только из чата с ботом.';
    const m = arg.match(/^(\d{6,11})\s+(.+)$/);
    if (!m) return 'Использование: <code>/rename &lt;артикул&gt; &lt;новое имя&gt;</code>';
    const [, id, alias] = m;
    reloadWatchlist();
    const e = watchlist.entries.find((x) => x.chatId === ctx.chatId && x.productId === id);
    if (!e) return `Товар <code>${id}</code> не отслеживается.`;
    e.alias = alias.trim().slice(0, 80);
    saveWatchlist();
    return `✏️ Переименовал <code>${id}</code> в «<b>${esc(e.alias)}</b>».`;
}

function cmdThreshold(arg, ctx = {}) {
    if (!ctx.chatId) return 'Доступно только из чата с ботом.';
    const m = arg.match(/^(\d{6,11})\s+(.+)$/);
    if (!m) return 'Использование: <code>/threshold &lt;артикул&gt; &lt;рублей&gt;</code>';
    const [, id, raw] = m;
    const threshold = parseInt(String(raw).replace(/\D/g, ''), 10);
    if (!threshold) return 'Цена должна быть числом в рублях.';
    reloadWatchlist();
    const e = watchlist.entries.find((x) => x.chatId === ctx.chatId && x.productId === id);
    if (!e) return `Товар <code>${id}</code> не отслеживается.`;
    e.threshold = threshold;
    saveWatchlist();
    return `🎯 Установлен порог для <code>${id}</code>: ≤ <b>${fmt(threshold)} ₽</b>`;
}

function cmdList(arg, ctx = {}) {
    if (!ctx.chatId) return 'Доступно только из чата с ботом.';
    reloadWatchlist();
    const mine = watchlist.entries.filter((e) => e.chatId === ctx.chatId);
    const products = mine.filter((e) => e.productId);
    const modelsList = mine.filter((e) => e.modelKey && !e.productId);
    if (!mine.length) return [
        '📋 <b>Ваших отслеживаемых товаров нет.</b>',
        '',
        'Добавить: пришли ссылку WB или <code>/track &lt;арт&gt;</code>',
    ].join('\n');
    const lines = [];
    if (products.length) {
        lines.push(`📋 <b>Товары — ${products.length}</b>`, '');
        for (const e of products) {
            const snap = e.lastSnapshot || {};
            const price = snap.price ? `${fmt(snap.price)} ₽` : '—';
            const stock = snap.stock != null ? ` · ${snap.stock} шт` : '';
            const th = e.threshold ? ` · 🎯 ${fmt(e.threshold)}` : '';
            lines.push(`• <code>${e.productId}</code> · <b>${esc(e.alias || snap.name || 'товар')}</b> — ${price}${stock}${th}`);
        }
        lines.push('');
    }
    if (modelsList.length) {
        const byKey = new Map(allModels.map((m) => [m.key, m]));
        lines.push(`📺 <b>Модели TV — ${modelsList.length}</b>`, '');
        for (const e of modelsList) {
            const m = byKey.get(e.modelKey);
            const cur = m ? `${fmt(m.min)} ₽` : '—';
            const th = e.threshold ? ` · 🎯 ${fmt(e.threshold)}` : '';
            lines.push(`• <code>${esc(e.modelKey.split('|')[1])}</code> · ${esc(e.label)} — ${cur}${th}`);
        }
        lines.push('');
    }
    lines.push('<i>Команды:</i>');
    lines.push('/track &lt;ссылка&gt; · /untrack &lt;арт&gt; · /rename &lt;арт&gt; &lt;имя&gt;');
    lines.push('/threshold &lt;арт&gt; &lt;руб&gt; · /exportcsv');
    return lines.join('\n');
}

async function cmdExportCsv(arg, ctx = {}) {
    if (!ctx.chatId) return 'Доступно только из чата с ботом.';
    reloadWatchlist();
    const mine = watchlist.entries.filter((e) => e.chatId === ctx.chatId);
    if (!mine.length) return 'Watchlist пуст — нечего экспортировать.';
    const cols = ['kind', 'id_or_key', 'alias', 'currentPrice', 'stock', 'threshold', 'minSeen', 'maxSeen', 'addedAt', 'url'];
    const rows = mine.map((e) => {
        const snap = e.lastSnapshot || {};
        const id = e.productId || e.modelKey;
        const url = e.productId ? `https://www.wildberries.ru/catalog/${e.productId}/detail.aspx` : '';
        return [
            e.productId ? 'product' : 'model',
            id, e.alias || e.label || '',
            snap.price ?? '', snap.stock ?? '',
            e.threshold ?? '', e.minSeen ?? '', e.maxSeen ?? '',
            e.addedAt || '', url,
        ];
    });
    const csv = [cols, ...rows].map((r) => r.map((c) => {
        const s = String(c ?? '');
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n') + '\n';

    // Telegram sendDocument with inline content (multipart/form-data)
    const stamp = new Date().toISOString().replace(/[:T.]/g, '-').slice(0, 16);
    const filename = `wb-watchlist_${stamp}_UTC.csv`;
    const form = new FormData();
    form.append('chat_id', String(ctx.chatId));
    form.append('document', new Blob([csv], { type: 'text/csv' }), filename);
    form.append('caption', `📋 Список отслеживаемых товаров (${mine.length})`);
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, { method: 'POST', body: form });
    return null; // we already sent the document
}

// ---------- dispatcher ----------

async function sendReply(chatId, payload, keyboard) {
    // payload can be a string, an object { text, reply_markup }, or an ARRAY of those
    // (used by commands like /start and /menu that emit multiple messages — e.g.
    // remove-keyboard followed by the inline menu).
    if (Array.isArray(payload)) {
        for (const p of payload) await sendReply(chatId, p, keyboard);
        return;
    }
    const text = typeof payload === 'string' ? payload : payload.text;
    const markup = (typeof payload === 'object' && payload.reply_markup) ? payload.reply_markup : keyboard;
    const photo = (typeof payload === 'object') ? payload.photo : null;

    // If the payload has a photo URL and the caption fits in 1024 chars, try
    // sendPhoto first and fall back to sendMessage on any failure.
    if (photo && text && text.length <= 1024) {
        const r = await tg('sendPhoto', {
            chat_id: chatId, photo, caption: text,
            parse_mode: 'HTML', reply_markup: markup,
        });
        if (r.ok) return;
        // else: fall through to plain text below
    }

    // Telegram limit: 4096 chars; cap defensively at 3800 with paragraph-aware split.
    const chunks = [];
    let cur = '';
    for (const para of String(text).split('\n')) {
        if ((cur + '\n' + para).length > 3800 && cur) {
            chunks.push(cur);
            cur = para;
        } else {
            cur = cur ? cur + '\n' + para : para;
        }
    }
    if (cur) chunks.push(cur);

    for (let i = 0; i < chunks.length; i++) {
        const body = {
            chat_id: chatId,
            text: chunks[i],
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        };
        // Attach reply markup only to the LAST chunk (Telegram shows one keyboard per message).
        if (i === chunks.length - 1 && markup) body.reply_markup = markup;
        await tg('sendMessage', body);
    }
}

async function dispatch(cmd, arg, ctx = {}) {
    switch (cmd) {
        case '/start': return [
            { text: '🧹 Старая клавиатура снизу убрана.', reply_markup: { remove_keyboard: true } },
            { text: cmdStart(), reply_markup: INLINE_MENU },
        ];
        case '/menu': return [
            { text: '⌨️ Скрываю нижнюю клавиатуру.', reply_markup: { remove_keyboard: true } },
            { text: '🛒 <b>Меню</b>\n<i>Нажми на пункт — отвечу прямо здесь.</i>', reply_markup: INLINE_MENU },
        ];
        case '/keyboard': return { text: '⌨️ Клавиатура снизу (исчезнет после одного тапа):', reply_markup: REPLY_KEYBOARD };
        case '/hidekb': return { text: '✅ Нижняя клавиатура убрана.', reply_markup: { remove_keyboard: true } };
        case '/help': return { text: cmdHelp(), reply_markup: INLINE_MENU };
        case '/snapshot':
        case '/summary': return cmdSnapshot();
        case '/atl': return cmdAtl();
        case '/deals': return cmdDeals();
        case '/drops': return cmdDrops();
        case '/anomalies': return cmdAnomalies();
        case '/brand': return cmdBrand(arg);
        case '/d':
        case '/diag':
        case '/diagonal': return cmdDiagonal(arg);
        case '/under': return cmdUnder(arg);
        case '/cheap': return cmdCheap();
        case '/find': return cmdFind(arg);
        case '/model': return cmdModel(arg);
        case '/chart': return cmdChart(arg);
        case '/forecast': return cmdForecast(arg);
        case '/twins': return cmdTwins(arg);
        case '/sellers': return cmdSellers(arg);
        case '/watch': return cmdWatch(arg, ctx);
        case '/unwatch': return cmdUnwatch(arg, ctx);
        case '/watchlist': return cmdWatchlist(arg, ctx);
        case '/track': return await cmdTrack(arg, ctx);
        case '/untrack': return cmdUntrack(arg, ctx);
        case '/rename': return cmdRename(arg, ctx);
        case '/threshold': return cmdThreshold(arg, ctx);
        case '/list': return cmdList(arg, ctx);
        case '/exportcsv': return await cmdExportCsv(arg, ctx);
        case '/now': return cmdNow();
        case '/myid':
        case '/whoami': return ctx.chatId
            ? [
                `🆔 <b>Твой chat_id: <code>${ctx.chatId}</code></b>`,
                '',
                'Передай этот номер админу бота — он добавит тебя в общую рассылку алёртов.',
                '',
                'Или сразу начни вести свой watchlist:',
                '<code>/track &lt;ссылка-WB&gt;</code>',
            ].join('\n')
            : 'chat_id недоступен.';
        case '/scrape': return await cmdScrape();
        default: return 'Неизвестная команда. /help — список.';
    }
}

async function handleMessage(msg) {
    if (!msg) return;
    const chatId = msg.chat.id;
    let text = (msg.text || '').trim();
    if (!text) return;

    // Reply-keyboard taps come as plain text; map to slash-commands.
    if (TEXT_TO_COMMAND[text]) text = TEXT_TO_COMMAND[text];

    if (!text.startsWith('/')) {
        // Auto-detect WB URL — if the message contains a wildberries.ru link
        // or a bare 6-11 digit article id, treat it as /track to add to watchlist.
        const wbId = parseUrlOrId(text);
        if (wbId) text = '/track ' + wbId;
        else text = '/find ' + text;
    }

    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.split('@')[0].toLowerCase();
    const arg = rest.join(' ');

    let reply;
    try {
        reply = await dispatch(cmd, arg, { chatId });
    } catch (err) {
        console.error('handler error', err);
        reply = `Ошибка: <code>${esc(err.message || String(err))}</code>`;
    }
    if (reply) await sendReply(chatId, reply);
}

async function handleCallback(cq) {
    if (!cq) return;
    const data = cq.data || '';
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;
    if (!chatId) return;

    // No-op buttons (e.g. page indicator) — just ack and return
    if (data === 'noop') {
        await tg('answerCallbackQuery', { callback_query_id: cq.id });
        return;
    }

    // Ack so the spinner on the button stops
    await tg('answerCallbackQuery', { callback_query_id: cq.id });

    let reply;
    let editInPlace = false;
    try {
        if (data.startsWith('pg:')) {
            // pg:<type>:<arg>:<page> — paginated nav, edit existing message
            const rest = data.slice(3);
            const lastColon = rest.lastIndexOf(':');
            const page = parseInt(rest.slice(lastColon + 1), 10) || 0;
            const middle = rest.slice(0, lastColon);
            const firstColon = middle.indexOf(':');
            const type = middle.slice(0, firstColon);
            const arg = middle.slice(firstColon + 1);
            editInPlace = true;
            switch (type) {
                case 'brand': reply = cmdBrand(arg, page); break;
                case 'd': reply = cmdDiagonal(arg, page); break;
                case 'under': reply = cmdUnder(arg, page); break;
                case 'cheap': reply = cmdCheap(arg, page); break;
                case 'find': reply = cmdFind(decodeURIComponent(arg), page); break;
                case 'atl': reply = cmdAtl(arg, page); break;
                case 'deals': reply = cmdDeals(arg, page); break;
                case 'drops': reply = cmdDrops(arg, page); break;
                case 'anom': reply = cmdAnomalyCategory(arg, page); break;
                case 'twins': reply = cmdTwins(arg === '_' ? '' : arg, page); break;
                case 'sellers': reply = cmdSellers(arg === '_' ? '' : arg, page); break;
                default: reply = 'Неизвестная страница.';
            }
        } else if (data.startsWith('anom:')) {
            // initial drill-in from /anomalies overview: anom:<category>:0
            const rest = data.slice(5);
            const colon = rest.lastIndexOf(':');
            const cat = colon > 0 ? rest.slice(0, colon) : rest;
            const page = colon > 0 ? parseInt(rest.slice(colon + 1), 10) || 0 : 0;
            editInPlace = true;
            reply = cmdAnomalyCategory(cat, page);
        } else if (data.startsWith('menu:')) {
            // Pop-up menu button tap — route to the underlying command, edit message in place
            const cmd = '/' + data.slice(5);
            editInPlace = true;
            reply = await dispatch(cmd, '', { chatId });
        }
        else if (data.startsWith('brand:')) reply = cmdBrand(data.slice(6));
        else if (data.startsWith('d:')) reply = cmdDiagonal(data.slice(2));
        else if (data.startsWith('under:')) reply = cmdUnder(data.slice(6));
        else if (data.startsWith('p:')) {
            // Per-product card buttons: p:<action>:<id>
            const m = data.match(/^p:(\w+):(\d+)$/);
            if (m) {
                const [, action, id] = m;
                const ctx2 = { chatId };
                switch (action) {
                    case 'del': reply = cmdUntrack(id, ctx2); break;
                    case 'ren': reply = `✏️ Чтобы переименовать <code>${id}</code>:\n<code>/rename ${id} &lt;новое имя&gt;</code>`; break;
                    case 'thr': reply = `🎯 Чтобы поставить порог на <code>${id}</code>:\n<code>/threshold ${id} &lt;рублей&gt;</code>`; break;
                    case 'dyn': reply = `📈 График по конкретному артикулу будет, когда накопится история (≥3 ежедневных снимка). Пока: <a href="https://www.wildberries.ru/catalog/${id}/detail.aspx">открыть на WB</a>.`; break;
                    case 'twin': reply = `🪞 Поиск двойников по артикулу ${id} — пока работает только для трекаемых TV-моделей. /twins покажет все панель-близнецы.`; break;
                    case 'fc': reply = `🔮 Прогноз по артикулу появится после ≥3 ежедневных проверок цены. Для TV-моделей: /forecast &lt;модель&gt;.`; break;
                    default: reply = `Неизвестное действие: ${esc(action)}`;
                }
            } else reply = 'Битый callback.';
        }
        else reply = 'Неизвестное действие.';
    } catch (err) {
        reply = `Ошибка: <code>${esc(err.message || String(err))}</code>`;
    }

    if (!reply) return;
    const text = typeof reply === 'string' ? reply : reply.text;
    const markup = typeof reply === 'object' ? reply.reply_markup : undefined;

    if (editInPlace && messageId) {
        // Edit the existing message instead of spamming a new one
        const r = await tg('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: markup,
        });
        if (!r.ok) {
            // Telegram returns 400 "message is not modified" if same content — silently ignore
            if (!/not modified/i.test(r.description || '')) {
                console.error('editMessageText failed:', r.description);
            }
        }
    } else {
        await sendReply(chatId, reply);
    }
}

// ---------- module exports (for tests / reuse) ----------

export { dispatch, handleMessage, handleCallback, REPLY_KEYBOARD };

// Only enter the polling loop when invoked directly, not when imported.
const invokedDirectly = import.meta.url === `file://${process.argv[1]}`;
if (!invokedDirectly) {
    // Imported as a module — skip the long-polling loop and state writes.
} else {

// ---------- main loop ----------

// Register slash-commands in Telegram UI on the first run after a state reset.
// Cheap to call (idempotent) but skip if we've already done it to keep logs tidy.
if (!state.commandsRegistered) {
    try {
        await registerBotCommands();
        state.commandsRegistered = true;
        console.log('bot: setMyCommands registered');
    } catch (err) {
        console.error('bot: setMyCommands failed', err);
    }
}

console.log(`bot: starting from offset=${offset}`);
while (Date.now() < POLL_DEADLINE_MS) {
    const remainingSec = Math.floor((POLL_DEADLINE_MS - Date.now()) / 1000);
    const timeout = Math.max(2, Math.min(25, remainingSec - 2));
    if (timeout < 2) break;

    const resp = await tg('getUpdates', { offset, timeout, allowed_updates: ['message', 'callback_query'] });
    if (!resp.ok) {
        console.error('getUpdates failed:', JSON.stringify(resp));
        break;
    }
    const updates = resp.result || [];
    for (const u of updates) {
        offset = u.update_id + 1;
        if (u.message) {
            console.log(`bot: msg ${u.message.from?.username || u.message.from?.id}: ${u.message.text || ''}`);
            await handleMessage(u.message);
            processed++;
        } else if (u.callback_query) {
            console.log(`bot: cq ${u.callback_query.from?.username || u.callback_query.from?.id}: ${u.callback_query.data}`);
            await handleCallback(u.callback_query);
            processed++;
        }
    }
}

const newState = {
    lastUpdateId: offset > 0 ? offset - 1 : 0,
    updatedAt: new Date().toISOString(),
    processedThisRun: processed,
    commandsRegistered: state.commandsRegistered === true,
};
writeFileSync(STATE_PATH, JSON.stringify(newState, null, 2));
console.log(`bot: done. processed=${processed}, lastUpdateId=${newState.lastUpdateId}`);

}  // end invokedDirectly block
