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

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN missing'); process.exit(1); }

const REPORT_DIR = 'apify-wb-tv-scraper/report';
const STATE_PATH = resolve(REPORT_DIR, 'bot-state.json');
const REPORT_PATH = resolve(REPORT_DIR, 'REPORT.json');
const MODELS_PATH = resolve(REPORT_DIR, 'MODELS.json');
const ANOMALIES_PATH = resolve(REPORT_DIR, 'ANOMALIES.json');

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

const REPLY_KEYBOARD = {
    keyboard: [
        [{ text: '📊 Сводка' }, { text: '🟢 ATL' }, { text: '💸 Сделки' }],
        [{ text: '📉 Падения' }, { text: '🪙 Дёшево' }, { text: '🚨 Аномалии' }],
        [{ text: '🏷 Бренд' }, { text: '📏 Диагональ' }, { text: '💰 До цены' }],
        [{ text: '🔄 Новый скрап' }, { text: '🕐 Время снимка' }, { text: 'ℹ️ Помощь' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
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
    '🔄 Новый скрап': '/scrape',
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

function cmdAtl() {
    const news = allModels.filter((m) => m.newAllTimeLow);
    if (!news.length) return 'Новых all-time low в последнем снимке нет.';
    const top = [...news].sort((a, b) => b.sellers - a.sellers || a.min - b.min).slice(0, 20);
    const lines = [`<b>🟢 Новые all-time low — ${news.length}</b>`, ''];
    for (const r of top) {
        const cheap = r.items[0];
        lines.push(`• <code>${esc(r.model)}</code> · ${esc(r.brand)} ${r.diagonals.join('/')}" · <b>${fmt(r.min)} ₽</b> · ${link('арт. ' + cheap.id, cheap.url)}`);
    }
    if (news.length > top.length) lines.push(`<i>…и ещё ${news.length - top.length} моделей.</i>`);
    return lines.join('\n');
}

function cmdDeals() {
    const deals = allModels
        .filter((m) => m.dealItems?.length)
        .flatMap((m) => m.dealItems.map((d) => ({ ...d, model: m })))
        .sort((a, b) => (a.price / a.model.median) - (b.price / b.model.median));
    if (!deals.length) return 'Сделок ниже 80% медианы своей модели сейчас нет.';
    const lines = [`<b>💸 Сделки внутри модели — ${deals.length}</b>`, '<i>Артикул дешевле, чем тот же товар у других продавцов.</i>', ''];
    for (const d of deals.slice(0, 20)) {
        const diff = Math.round((1 - d.price / d.model.median) * 100);
        lines.push(`• −<b>${diff}%</b> · <code>${esc(d.model.model)}</code> · ${esc(d.model.brand)} ${d.model.diagonals.join('/')}" · <b>${fmt(d.price)} ₽</b> (медиана ${fmt(d.model.median)}) · ${link('арт. ' + d.id, d.url)}`);
    }
    return lines.join('\n');
}

function cmdDrops() {
    const drops = allModels.filter((m) => m.dropPct != null && m.dropPct <= -10).sort((a, b) => a.dropPct - b.dropPct);
    if (!drops.length) return 'Никакая модель не подешевела ≥10% к прошлому снимку.';
    const lines = [`<b>📉 Подешевели ≥10% — ${drops.length}</b>`, ''];
    for (const r of drops.slice(0, 20)) {
        const cheap = r.items[0];
        lines.push(`• <b>${r.dropPct}%</b> · <code>${esc(r.model)}</code> · ${esc(r.brand)} ${r.diagonals.join('/')}" · <b>${fmt(r.min)} ₽</b> · ${link('арт. ' + cheap.id, cheap.url)}`);
    }
    return lines.join('\n');
}

function cmdAnomalies() {
    if (!anomalies) return 'Файл аномалий не найден.';
    const hi = (anomalies.highSeverity || anomalies.high || []).slice(0, 15);
    if (!hi.length) return `Аномалии: high=${anomalies.summary?.high || 0}, medium=${anomalies.summary?.medium || 0}, low=${anomalies.summary?.low || 0}. High-severity нет.`;
    const lines = [`<b>🚨 High-severity — ${hi.length}</b>`, ''];
    for (const a of hi) {
        const it = a.item || a;
        lines.push(`• ${esc(a.reason || a.type || '?')} · <b>${fmt(it.price)} ₽</b> · ${esc(it.brand || '—')} · ${link('арт. ' + it.id, it.url)}`);
    }
    return lines.join('\n');
}

function cmdBrand(arg) {
    if (!arg) return { text: '🏷 <b>Выберите бренд:</b>', reply_markup: BRAND_KEYBOARD };
    const q = arg.toLowerCase();
    const matches = items.filter((x) => (x.brand || '').toLowerCase().includes(q));
    if (!matches.length) return `По бренду «${esc(arg)}» ничего не найдено.`;
    const sorted = [...matches].sort((a, b) => a.price - b.price);
    const lines = [`<b>${esc(arg.toUpperCase())} — ${matches.length} карт.</b>`, `Мин <b>${fmt(sorted[0].price)} ₽</b> · Макс ${fmt(sorted[sorted.length - 1].price)} ₽`, ''];
    for (const p of sorted.slice(0, 15)) {
        lines.push(`• <b>${fmt(p.price)}₽</b> ${p.diagonal ? p.diagonal + '"' : ''} ${link(trim(p.name, 60), p.url)}`);
    }
    return lines.join('\n');
}

function cmdDiagonal(arg) {
    const n = parseInt(arg, 10);
    if (!n) return { text: '📏 <b>Выберите диагональ:</b>', reply_markup: DIAGONAL_KEYBOARD };
    const matches = items.filter((x) => x.diagonal === n).sort((a, b) => a.price - b.price);
    if (!matches.length) return `Карточек с диагональю ${n}" нет.`;
    const lines = [`<b>${n}" — топ-10 самых дешёвых из ${matches.length}</b>`, ''];
    for (const p of matches.slice(0, 10)) {
        lines.push(`• <b>${fmt(p.price)}₽</b> ${p.discount ? '−' + p.discount + '% ' : ''}${esc(p.brand || '—')} · ${link(trim(p.name, 55), p.url)}`);
    }
    return lines.join('\n');
}

function cmdUnder(arg) {
    const max = parseInt(String(arg).replace(/\D/g, ''), 10);
    if (!max) return { text: '💰 <b>Выберите потолок цены:</b>', reply_markup: PRICE_KEYBOARD };
    const matches = items.filter((x) => x.price <= max).sort((a, b) => a.price - b.price);
    if (!matches.length) return `Ничего не дешевле ${fmt(max)} ₽.`;
    const lines = [`<b>До ${fmt(max)} ₽ — ${matches.length} карт.</b>`, ''];
    for (const p of matches.slice(0, 20)) {
        lines.push(`• <b>${fmt(p.price)}₽</b> ${p.diagonal ? p.diagonal + '" ' : ''}${esc(p.brand || '—')} · ${link(trim(p.name, 55), p.url)}`);
    }
    return lines.join('\n');
}

function cmdCheap() {
    const c = [...items].filter((x) => x.diagonal && x.diagonal >= 32).sort((a, b) => a.price - b.price).slice(0, 15);
    const lines = ['<b>🪙 Топ-15 самых дешёвых TV ≥32"</b>', ''];
    for (const p of c) {
        lines.push(`• <b>${fmt(p.price)}₽</b> ${p.diagonal}" ${esc(p.brand || '—')} · ${link(trim(p.name, 55), p.url)}`);
    }
    return lines.join('\n');
}

function cmdFind(arg) {
    if (!arg) return 'Использование: <code>/find qled</code>';
    const q = arg.toLowerCase();
    const matches = items.filter((x) => x.name.toLowerCase().includes(q));
    if (!matches.length) return `По запросу «${esc(arg)}» ничего не найдено.`;
    const sorted = [...matches].sort((a, b) => a.price - b.price);
    const lines = [`<b>Найдено ${matches.length} — топ-15 по цене</b>`, ''];
    for (const p of sorted.slice(0, 15)) {
        lines.push(`• <b>${fmt(p.price)}₽</b> ${p.diagonal ? p.diagonal + '" ' : ''}${esc(p.brand || '—')} · ${link(trim(p.name, 55), p.url)}`);
    }
    return lines.join('\n');
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

// ---------- dispatcher ----------

async function sendReply(chatId, payload, keyboard) {
    // payload can be a plain string or an object { text, reply_markup }
    const text = typeof payload === 'string' ? payload : payload.text;
    const markup = (typeof payload === 'object' && payload.reply_markup) ? payload.reply_markup : keyboard;

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

async function dispatch(cmd, arg) {
    switch (cmd) {
        case '/start': return { text: cmdStart(), reply_markup: REPLY_KEYBOARD };
        case '/menu': return { text: '⌨️ <b>Меню кнопок:</b>', reply_markup: REPLY_KEYBOARD };
        case '/help': return { text: cmdHelp(), reply_markup: REPLY_KEYBOARD };
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
        case '/now': return cmdNow();
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
        // Free-text fallback: treat as /find query.
        text = '/find ' + text;
    }

    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.split('@')[0].toLowerCase();
    const arg = rest.join(' ');

    let reply;
    try {
        reply = await dispatch(cmd, arg);
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
    if (!chatId) return;

    // Ack quickly so the spinner on the button stops
    await tg('answerCallbackQuery', { callback_query_id: cq.id });

    let reply;
    try {
        if (data.startsWith('brand:')) reply = cmdBrand(data.slice(6));
        else if (data.startsWith('d:')) reply = cmdDiagonal(data.slice(2));
        else if (data.startsWith('under:')) reply = cmdUnder(data.slice(6));
        else reply = 'Неизвестное действие.';
    } catch (err) {
        reply = `Ошибка: <code>${esc(err.message || String(err))}</code>`;
    }
    if (reply) await sendReply(chatId, reply);
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
