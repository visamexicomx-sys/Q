// Cloudflare Worker — Telegram bot webhook for WB TV Tracker.
//
// Deploy with `wrangler deploy`, then point Telegram at it:
//
//   curl "https://api.telegram.org/bot$TG/setWebhook?url=https://<worker>.workers.dev"
//
// The worker fetches REPORT.json / MODELS.json / ANOMALIES.json from this
// repo's raw GitHub URL on each invocation, with a 5-minute edge cache.
// All command logic mirrors apify-wb-tv-scraper/scripts/bot-poller.mjs;
// keep them in sync until they get extracted into a shared module.

const REPO = 'visamexicomx-sys/Q';
const BRANCH = 'claude/scrape-wildberries-tvs-oUS2f';

// WB CDN image URL builder. Inlined here so the worker stays a single file
// (mirror of scripts/wb-image.mjs — keep in sync). Empirical basket ranges.
function wbBasket(id) {
    const t = Math.floor(id / 1e5);
    if (t <= 143) return '01';
    if (t <= 287) return '02';
    if (t <= 431) return '03';
    if (t <= 719) return '04';
    if (t <= 1006) return '05';
    if (t <= 1061) return '06';
    if (t <= 1115) return '07';
    if (t <= 1181) return '08';
    if (t <= 1319) return '09';
    if (t <= 1454) return '10';
    if (t <= 1655) return '11';
    if (t <= 1837) return '12';
    if (t <= 2045) return '13';
    if (t <= 2189) return '14';
    if (t <= 2389) return '15';
    if (t <= 2706) return '16';
    if (t <= 2864) return '17';
    if (t <= 2873) return '18';
    if (t <= 3261) return '19';
    if (t <= 3433) return '20';
    if (t <= 3643) return '21';
    if (t <= 3804) return '22';
    if (t <= 3963) return '23';
    if (t <= 4231) return '24';
    if (t <= 4385) return '25';
    if (t <= 4677) return '26';
    if (t <= 4885) return '27';
    if (t <= 5405) return '28';
    if (t <= 5646) return '29';
    if (t <= 5995) return '30';
    if (t <= 6190) return '31';
    if (t <= 6390) return '32';
    if (t <= 6590) return '33';
    if (t <= 6790) return '34';
    if (t <= 6990) return '35';
    if (t <= 7995) return '36';
    if (t <= 8500) return '37';
    if (t <= 8800) return '38';
    if (t <= 9100) return '39';
    if (t <= 9500) return '40';
    if (t <= 9999) return '41';
    return '42';
}
function wbImageUrl(id) {
    const n = parseInt(id, 10);
    if (!n) return null;
    return `https://basket-${wbBasket(n)}.wbbasket.ru/vol${Math.floor(n / 1e5)}/part${Math.floor(n / 1e3)}/${n}/images/big/1.webp`;
}
const REPORT_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/apify-wb-tv-scraper/report`;
const CACHE_TTL = 300;   // 5 minutes
const WATCHLIST_PATH = 'apify-wb-tv-scraper/report/watchlist.json';

// ---------- helpers ----------

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trim = (s = '', n = 70) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;
const PAGE_SIZE = 10;

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

// ---------- UI: keyboards ----------

// Legacy reply-keyboard kept for /keyboard command (one-time pop-up).
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

// Pop-up inline menu (shown by /menu, lives above the chat, disappears on tap).
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
    fakeDiscounts: { title: '🎭 Устойчивые фейк-скидки', desc: 'Скидка ≥70%, которая держится snapshot за snapshot' },
    dupes: { title: '🔄 Дубли модели', desc: 'Один артикул у нескольких продавцов с разбросом ≥1.4×' },
    expensiveOutliers: { title: '📈 Дорогие выбросы', desc: 'Цена выше типовой для своей диагонали (z ≥ 2.5)' },
    cheapOutliers: { title: '📉 Дешёвые выбросы', desc: 'Цена ниже типовой — может быть deal или ошибка (z ≤ −2)' },
    premiumLow: { title: '💎 Дешёвый премиум', desc: 'Премиум-бренд по подозрительно низкой цене' },
    modelMoved: { title: '📊 Движение моделей', desc: 'Модель сдвинулась ≥15% по min или median vs прошлый снимок' },
    dropped: { title: '⬇ Подешевели', desc: 'Модели, у которых min упал ≥10% к прошлому снимку' },
    jumped: { title: '⬆ Подорожали', desc: 'Модели, у которых min вырос ≥15% к прошлому снимку' },
};

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

// ---------- data fetch with edge cache ----------

let DATA = null;  // populated per-request, but cached at the Cloudflare cache layer.

async function fetchJson(name, ctx) {
    const url = `${REPORT_BASE}/${name}.json`;
    const cache = caches.default;
    const cacheKey = new Request(url, { method: 'GET' });
    let cached = await cache.match(cacheKey);
    if (cached) return cached.json();

    const resp = await fetch(url, {
        cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
        headers: { 'User-Agent': 'wb-tv-tracker-worker/1.0' },
    });
    if (!resp.ok) throw new Error(`fetch ${name}.json → ${resp.status}`);

    const cloned = new Response(resp.body, resp);
    cloned.headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
    const data = await cloned.clone().json();
    ctx.waitUntil(cache.put(cacheKey, cloned));
    return data;
}

async function loadData(ctx) {
    const [report, models, anomalies, twins, sellers, history, watchlist] = await Promise.all([
        fetchJson('REPORT', ctx).catch(() => ({ all: [], byBrand: [], generatedAt: null })),
        fetchJson('MODELS', ctx).catch(() => ({ models: [], generatedAt: null })),
        fetchJson('ANOMALIES', ctx).catch(() => null),
        fetchJson('TWINS', ctx).catch(() => ({ twins: [] })),
        fetchJson('SELLERS', ctx).catch(() => ({ listings: [] })),
        fetchJson('models-history', ctx).catch(() => ({ models: {} })),
        fetchJson('watchlist', ctx).catch(() => ({ entries: [] })),
    ]);
    return {
        report,
        models,
        anomalies,
        twins,
        sellers,
        history,
        watchlist,
        items: report.all || [],
        allModels: models.models || [],
    };
}

// ---------- GitHub Contents API (for watchlist mutations) ----------

async function ghReadWatchlist(token) {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${WATCHLIST_PATH}?ref=${BRANCH}`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'wb-tv-tracker-worker' },
    });
    if (r.status === 404) return { sha: null, entries: [] };
    if (!r.ok) throw new Error(`gh read failed: ${r.status}`);
    const j = await r.json();
    const decoded = JSON.parse(atob(j.content.replace(/\n/g, '')));
    return { sha: j.sha, entries: decoded.entries || [] };
}

async function ghWriteWatchlist(token, entries, sha) {
    const body = {
        message: `chore(watchlist): bot update (${entries.length} entries)`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify({
            updatedAt: new Date().toISOString(), entries,
        }, null, 2)))),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
    };
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${WATCHLIST_PATH}`, {
        method: 'PUT',
        headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'wb-tv-tracker-worker',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!r.ok) {
        const t = await r.text();
        throw new Error(`gh write failed: ${r.status} ${t.slice(0, 200)}`);
    }
}

// ---------- command handlers (mirror bot-poller.mjs) ----------

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
        '/cheap — самые дешёвые TV ≥32"',
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

function cmdSnapshot({ items, allModels, report }) {
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

function cmdAtl({ allModels }, _arg, page = 0) {
    const all = allModels.filter((m) => m.newAllTimeLow).sort((a, b) => b.sellers - a.sellers || a.min - b.min);
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

function cmdDeals({ allModels }, _arg, page = 0) {
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

function cmdDrops({ allModels }, _arg, page = 0) {
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

function cmdAnomalies({ anomalies }) {
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

function cmdAnomalyCategory({ anomalies }, cat, page = 0) {
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
        for (const d of slice) {
            const [brand, model] = (d.key || '').split('|');
            lines.push(`• <code>${esc(model)}</code> · ${esc(brand || '—')} · ${d.arr.length} продавцов · ${fmt(d.min)}–${fmt(d.max)} ₽ (×${d.spread?.toFixed?.(2)})`);
            const cheap = d.arr[0];
            if (cheap) lines.push(`  └ ${link('арт. ' + cheap.id, cheap.url)} — ${fmt(cheap.price)} ₽`);
        }
    } else if (cat === 'modelMoved') {
        for (const m of slice) {
            const dmin = m.moveMin > 0 ? `+${m.moveMin}%` : `${m.moveMin}%`;
            const dmed = m.moveMed > 0 ? `+${m.moveMed}%` : `${m.moveMed}%`;
            const arrow = m.moveMin <= -10 ? '📉' : m.moveMin >= 10 ? '📈' : '↔';
            lines.push(`• ${arrow} <code>${esc(m.model)}</code> · ${esc(m.brand)} ${m.diagonal || '?'}" · min ${dmin} (${fmt(m.prevMin)}→<b>${fmt(m.curMin)}</b>) · med ${dmed}${m.cheapId ? ' · ' + link('арт. ' + m.cheapId, m.url || '#') : ''}`);
        }
    } else {
        for (const it of slice) {
            const disc = it.discount ? ` −${it.discount}%` : '';
            const diag = it.diagonal ? ` ${it.diagonal}"` : '';
            lines.push(`• <b>${fmt(it.price)} ₽</b>${disc}${diag} · ${esc(it.brand || '—')} · ${link(trim(it.name, 50), it.url)}`);
        }
    }
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:anom:${cat}`, page, arr.length) };
}

function cmdBrand({ items }, arg, page = 0) {
    if (!arg) return { text: '🏷 <b>Выберите бренд:</b>', reply_markup: BRAND_KEYBOARD };
    const q = arg.toLowerCase();
    const matches = items.filter((x) => (x.brand || '').toLowerCase().includes(q)).sort((a, b) => a.price - b.price);
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

function cmdDiagonal({ items }, arg, page = 0) {
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

function cmdUnder({ items }, arg, page = 0) {
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

function cmdCheap({ items }, _arg, page = 0) {
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

function cmdFind({ items }, arg, page = 0) {
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
    const cbArg = encodeURIComponent(q).slice(0, 40);
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:find:${cbArg}`, page, matches.length) };
}

function cmdModel({ allModels }, arg) {
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

function cmdNow({ report, models }) {
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

// ---------- new: chart / forecast / twins / sellers / watch ----------

function findModel(allModels, q) {
    if (!q) return null;
    const norm = q.toLowerCase().replace(/[`'"]/g, '');
    return allModels.find((x) => x.model.toLowerCase() === norm)
        || allModels.find((x) => x.model.toLowerCase().includes(norm));
}

function chartUrl(m, history) {
    const h = history?.models?.[m.key];
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

function cmdChart({ allModels, history }, arg) {
    if (!arg) return 'Использование: <code>/chart qe75qn990fuxru</code>';
    const m = findModel(allModels, arg);
    if (!m) return `Модель <code>${esc(arg)}</code> не найдена.`;
    const url = chartUrl(m, history);
    if (!url) return `<b>${esc(m.brand)} <code>${esc(m.model)}</code></b>\nЕщё нет истории для графика (нужно ≥2 снимков).`;
    return {
        text: [
            `<b>📈 ${esc(m.brand)} <code>${esc(m.model)}</code> · ${m.diagonals.join('/')}"</b>`,
            `Текущий мин: <b>${fmt(m.min)} ₽</b> · ATL: ${fmt(m.allTimeMin)} ₽`,
            `<a href="${esc(url)}">График открыть в полном размере →</a>`,
        ].join('\n'),
        disable_web_page_preview: false,
    };
}

function cmdForecast({ allModels }, arg) {
    if (!arg) return 'Использование: <code>/forecast qe75qn990fuxru</code>';
    const m = findModel(allModels, arg);
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
            'flat': '➡ Стабильно — равновесие',
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
        lines.push(`🔴 <b>Внимание: в ${m.nearAtlPct}% от дна.</b> Любое движение вниз = новый ATL.`);
    }
    return lines.join('\n');
}

function cmdTwins({ twins }, arg, page = 0) {
    const all = twins?.twins || [];
    let filtered = all;
    if (arg) {
        const d = parseInt(arg, 10);
        if (d) filtered = all.filter((t) => t.diagonal === d);
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
        `<i>Те же диагональ/разрешение/тех — разные бренды и цены.</i>`,
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

function cmdSellers({ sellers }, _arg, page = 0) {
    const list = sellers?.listings || [];
    if (!list.length) return 'Данных по листингам пока недостаточно (нужно ≥2 истории снимка).';
    const start = page * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);
    const lastPage = Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1);
    const lines = [
        `<b>🏪 Подозрительные листинги — ${list.length} · стр. ${page + 1}/${lastPage + 1}</b>`,
        `<i>Худшие первыми (высокая волатильность / фейк-скидки).</i>`,
        '',
    ];
    for (const r of slice) {
        const fr = Math.round(r.fakeDiscountRate * 100);
        const vol = Math.round(r.volatility * 100);
        lines.push(`• score <b>${r.score}</b> · ${esc(r.brand)} · ${fmt(r.priceMin)}–${fmt(r.priceMax)}₽ (vol ${vol}%, fake-disc ${fr}%) · ${link('арт. ' + r.id, r.url)}`);
    }
    return { text: lines.join('\n'), reply_markup: navMarkup(`pg:sellers:_`, page, list.length) };
}

async function cmdWatch({ allModels }, arg, ctx) {
    if (!ctx?.chatId) return 'Подписка возможна только из чата с ботом.';
    if (!arg) return 'Использование: <code>/watch &lt;модель&gt; [потолок_₽]</code>\nПример: <code>/watch qe75qn990fuxru 100000</code>';
    if (!ctx.env?.GH_PAT) return '⚠️ Подписки временно недоступны — администратор не настроил <code>GH_PAT</code> секрет в worker. Цена-алёрты по каналу продолжают работать.';
    const parts = arg.trim().split(/\s+/);
    const modelArg = parts[0];
    const threshold = parts[1] ? parseInt(parts[1].replace(/\D/g, ''), 10) : null;
    const m = findModel(allModels, modelArg);
    if (!m) return `Модель <code>${esc(modelArg)}</code> не найдена.`;
    const { sha, entries } = await ghReadWatchlist(ctx.env.GH_PAT);
    const idx = entries.findIndex((e) => e.chatId === ctx.chatId && e.modelKey === m.key);
    const entry = {
        chatId: ctx.chatId,
        modelKey: m.key,
        threshold: threshold || null,
        label: `${m.brand} ${m.model}`,
        addedAt: new Date().toISOString(),
    };
    if (idx >= 0) entries[idx] = entry; else entries.push(entry);
    await ghWriteWatchlist(ctx.env.GH_PAT, entries, sha);
    const thresholdLine = threshold
        ? `\nПорог: <b>${fmt(threshold)} ₽</b> (триггер только при цене ≤)`
        : '\n<i>Без порога — алёрт при любом снижении.</i>';
    return [
        `👀 <b>Подписка добавлена</b>`,
        '',
        `${esc(m.brand)} <code>${esc(m.model)}</code> · ${m.diagonals.join('/')}"`,
        `Текущий мин: <b>${fmt(m.min)} ₽</b>${thresholdLine}`,
        '',
        `Список: /watchlist · Отписаться: <code>/unwatch ${esc(m.model)}</code>`,
    ].join('\n');
}

async function cmdUnwatch({ allModels }, arg, ctx) {
    if (!ctx?.chatId) return 'Отписка возможна только из чата с ботом.';
    if (!arg) return 'Использование: <code>/unwatch &lt;модель&gt;</code>';
    if (!ctx.env?.GH_PAT) return '⚠️ Подписки временно недоступны.';
    const m = findModel(allModels, arg);
    const { sha, entries } = await ghReadWatchlist(ctx.env.GH_PAT);
    const before = entries.length;
    const filtered = m
        ? entries.filter((e) => !(e.chatId === ctx.chatId && e.modelKey === m.key))
        : entries.filter((e) => !(e.chatId === ctx.chatId && e.label.toLowerCase().includes(arg.toLowerCase())));
    await ghWriteWatchlist(ctx.env.GH_PAT, filtered, sha);
    const removed = before - filtered.length;
    return removed > 0 ? `🚫 Отписан от ${removed} модел${removed === 1 ? 'и' : 'ей'}.` : `Подписки на «${esc(arg)}» не было.`;
}

function cmdWatchlist({ watchlist, allModels }, _arg, ctx) {
    if (!ctx?.chatId) return 'Список подписок доступен только из чата с ботом.';
    const mine = (watchlist?.entries || []).filter((e) => e.chatId === ctx.chatId);
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

// ---------- per-product tracker ----------

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

function renderProductCard(entry, snap, change = null) {
    const url = `https://www.wildberries.ru/catalog/${entry.productId}/detail.aspx`;
    const name = entry.alias || snap.name || 'Товар WB';
    const lines = [];
    lines.push(`<b>Товар:</b> <a href="${esc(url)}">${esc(name)}</a>`);
    lines.push('');
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
        out.push(`${big ? '💥' : '🔻'} <b>Цена снизилась</b> на ${fmt(Math.abs(delta))} ₽ (${pct}%)`);
        if (big) out.push(`🚨 <b>Сильное падение</b> — <i>продавец может срочно сбрасывать остатки.</i>`);
    } else if (kind === 'price-up') {
        const big = pct >= 20;
        out.push(`${big ? '⚠' : '🔺'} <b>Цена выросла</b> на ${fmt(delta)} ₽ (+${pct}%)`);
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

async function mutateWatchlist({ env, chatId }, mutator) {
    if (!env?.GH_PAT) return { error: '⚠️ Подписки временно недоступны — нет worker-секрета <code>GH_PAT</code>.' };
    const { sha, entries } = await ghReadWatchlist(env.GH_PAT);
    const next = mutator(entries, chatId);
    await ghWriteWatchlist(env.GH_PAT, next, sha);
    return { entries: next };
}

async function cmdTrack({ allModels }, arg, ctx) {
    if (!ctx?.chatId) return 'Доступно только из чата с ботом.';
    if (!arg) return [
        '🛒 <b>/track</b> — добавить любой товар WB в отслеживание.',
        '',
        '<code>/track 357676897</code>',
        '<code>/track https://www.wildberries.ru/catalog/357676897/detail.aspx</code>',
        '<code>/track 357676897 --threshold 50000 --alias Стиралка</code>',
        '',
        'Или пришли мне ссылку WB — я сам распознаю.',
    ].join('\n');
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
    const result = await mutateWatchlist(ctx, (entries) => {
        const idx = entries.findIndex((e) => e.chatId === ctx.chatId && e.productId === id);
        const existing = idx >= 0 ? entries[idx] : {};
        const e = {
            chatId: ctx.chatId,
            productId: id,
            kind: 'product',
            alias: alias || existing.alias || null,
            threshold: threshold || existing.threshold || null,
            region: existing.region || 'Санкт-Петербург',
            dest: existing.dest || '-1123300',
            addedAt: existing.addedAt || new Date().toISOString(),
            lastSnapshot: existing.lastSnapshot || null,
            history: existing.history || [],
            minSeen: existing.minSeen || null,
            maxSeen: existing.maxSeen || null,
        };
        if (idx >= 0) entries[idx] = e; else entries.push(e);
        return entries;
    });
    if (result.error) return result.error;
    return {
        text: `<b>Добавил в watchlist</b>\n\nАртикул: <b><code>${id}</code></b>${alias ? `\nИмя: <b>${esc(alias)}</b>` : ''}\nРегион: Санкт-Петербург${threshold ? `\nПорог: ≤ <b>${fmt(threshold)} ₽</b>` : ''}\n\n<i>Свежие данные появятся при следующем прогоне скрапера.</i>`,
        photo: wbImageUrl(id),
        reply_markup: productCardKeyboard(id),
    };
}

async function cmdUntrack(_data, arg, ctx) {
    if (!ctx?.chatId) return 'Доступно только из чата с ботом.';
    if (!arg) return 'Использование: <code>/untrack &lt;артикул&gt;</code>';
    const id = parseUrlOrId(arg);
    if (!id) return `Не похоже на артикул: <code>${esc(arg)}</code>`;
    let removed = 0;
    const result = await mutateWatchlist(ctx, (entries) => {
        const before = entries.length;
        const next = entries.filter((e) => !(e.chatId === ctx.chatId && e.productId === id));
        removed = before - next.length;
        return next;
    });
    if (result.error) return result.error;
    return removed > 0 ? `🗑 Удалил <code>${id}</code> из watchlist.` : `Этого товара в твоём watchlist нет.`;
}

async function cmdRename(_data, arg, ctx) {
    if (!ctx?.chatId) return 'Доступно только из чата с ботом.';
    const m = arg.match(/^(\d{6,11})\s+(.+)$/);
    if (!m) return 'Использование: <code>/rename &lt;артикул&gt; &lt;новое имя&gt;</code>';
    const [, id, alias] = m;
    let found = false;
    const result = await mutateWatchlist(ctx, (entries) => {
        const e = entries.find((x) => x.chatId === ctx.chatId && x.productId === id);
        if (e) { e.alias = alias.trim().slice(0, 80); found = true; }
        return entries;
    });
    if (result.error) return result.error;
    return found ? `✏️ Переименовал <code>${id}</code> в «<b>${esc(alias.trim().slice(0, 80))}</b>».` : `Товар <code>${id}</code> не отслеживается.`;
}

async function cmdThreshold(_data, arg, ctx) {
    if (!ctx?.chatId) return 'Доступно только из чата с ботом.';
    const m = arg.match(/^(\d{6,11})\s+(.+)$/);
    if (!m) return 'Использование: <code>/threshold &lt;артикул&gt; &lt;рублей&gt;</code>';
    const [, id, raw] = m;
    const threshold = parseInt(String(raw).replace(/\D/g, ''), 10);
    if (!threshold) return 'Цена должна быть числом в рублях.';
    let found = false;
    const result = await mutateWatchlist(ctx, (entries) => {
        const e = entries.find((x) => x.chatId === ctx.chatId && x.productId === id);
        if (e) { e.threshold = threshold; found = true; }
        return entries;
    });
    if (result.error) return result.error;
    return found ? `🎯 Установлен порог для <code>${id}</code>: ≤ <b>${fmt(threshold)} ₽</b>` : `Товар <code>${id}</code> не отслеживается.`;
}

function cmdList({ watchlist, allModels }, _arg, ctx) {
    if (!ctx?.chatId) return 'Доступно только из чата с ботом.';
    const mine = (watchlist?.entries || []).filter((e) => e.chatId === ctx.chatId);
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

// ---------- dispatcher ----------

async function dispatch(data, cmd, arg, ctx = {}) {
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
        case '/interesting': return { text: '🎯 Чтобы увидеть интересные позиции — подождите ежечасный прогон, или используй /list для всего watchlist\'а.' };
        case '/snapshot':
        case '/summary': return cmdSnapshot(data);
        case '/atl': return cmdAtl(data, arg, 0);
        case '/deals': return cmdDeals(data, arg, 0);
        case '/drops': return cmdDrops(data, arg, 0);
        case '/anomalies': return cmdAnomalies(data);
        case '/brand': return cmdBrand(data, arg, 0);
        case '/d':
        case '/diag':
        case '/diagonal': return cmdDiagonal(data, arg, 0);
        case '/under': return cmdUnder(data, arg, 0);
        case '/cheap': return cmdCheap(data, arg, 0);
        case '/find': return cmdFind(data, arg, 0);
        case '/model': return cmdModel(data, arg);
        case '/chart': return cmdChart(data, arg);
        case '/forecast': return cmdForecast(data, arg);
        case '/twins': return cmdTwins(data, arg, 0);
        case '/sellers': return cmdSellers(data, arg, 0);
        case '/watch': return await cmdWatch(data, arg, ctx);
        case '/unwatch': return await cmdUnwatch(data, arg, ctx);
        case '/watchlist': return cmdWatchlist(data, arg, ctx);
        case '/track': return await cmdTrack(data, arg, ctx);
        case '/untrack': return await cmdUntrack(data, arg, ctx);
        case '/rename': return await cmdRename(data, arg, ctx);
        case '/threshold': return await cmdThreshold(data, arg, ctx);
        case '/list': return cmdList(data, arg, ctx);
        case '/now': return cmdNow(data);
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
        case '/scrape': return 'Команда /scrape поддерживается только через GitHub Actions polling. Используйте https://github.com/' + REPO + '/actions';
        default: return 'Неизвестная команда. /help — список.';
    }
}

async function dispatchCallback(data, cbData) {
    if (cbData.startsWith('pg:')) {
        const rest = cbData.slice(3);
        const lastColon = rest.lastIndexOf(':');
        const page = parseInt(rest.slice(lastColon + 1), 10) || 0;
        const middle = rest.slice(0, lastColon);
        const firstColon = middle.indexOf(':');
        const type = middle.slice(0, firstColon);
        const arg = middle.slice(firstColon + 1);
        switch (type) {
            case 'brand': return cmdBrand(data, arg, page);
            case 'd': return cmdDiagonal(data, arg, page);
            case 'under': return cmdUnder(data, arg, page);
            case 'cheap': return cmdCheap(data, arg, page);
            case 'find': return cmdFind(data, decodeURIComponent(arg), page);
            case 'atl': return cmdAtl(data, arg, page);
            case 'deals': return cmdDeals(data, arg, page);
            case 'drops': return cmdDrops(data, arg, page);
            case 'anom': return cmdAnomalyCategory(data, arg, page);
            case 'twins': return cmdTwins(data, arg === '_' ? '' : arg, page);
            case 'sellers': return cmdSellers(data, arg === '_' ? '' : arg, page);
            default: return 'Неизвестная страница.';
        }
    }
    if (cbData.startsWith('anom:')) {
        const rest = cbData.slice(5);
        const colon = rest.lastIndexOf(':');
        const cat = colon > 0 ? rest.slice(0, colon) : rest;
        const page = colon > 0 ? parseInt(rest.slice(colon + 1), 10) || 0 : 0;
        return cmdAnomalyCategory(data, cat, page);
    }
    if (cbData.startsWith('menu:')) {
        // Pop-up menu tap — translate to slash command and run dispatch
        const cmd = '/' + cbData.slice(5);
        return await dispatch(data, cmd, '', { chatId: undefined, env: undefined, ctx: undefined });
    }
    if (cbData.startsWith('brand:')) return cmdBrand(data, cbData.slice(6), 0);
    if (cbData.startsWith('d:')) return cmdDiagonal(data, cbData.slice(2), 0);
    if (cbData.startsWith('under:')) return cmdUnder(data, cbData.slice(6), 0);
    if (cbData.startsWith('p:')) {
        const m = cbData.match(/^p:(\w+):(\d+)$/);
        if (!m) return 'Битый callback.';
        const [, action, id] = m;
        switch (action) {
            case 'del': return 'Чтобы удалить пришли <code>/untrack ' + id + '</code>';
            case 'ren': return `✏️ Переименовать:\n<code>/rename ${id} &lt;новое имя&gt;</code>`;
            case 'thr': return `🎯 Поставить порог:\n<code>/threshold ${id} &lt;рублей&gt;</code>`;
            case 'dyn': return `📈 График по артикулу появится, когда накопится история. Пока: <a href="https://www.wildberries.ru/catalog/${id}/detail.aspx">открыть WB</a>.`;
            case 'twin': return `🪞 Поиск двойников по артикулу — для TV /twins.`;
            case 'fc': return `🔮 Прогноз появится после ≥3 ежедневных проверок цены.`;
            default: return `Неизвестное действие: ${esc(action)}`;
        }
    }
    return 'Неизвестное действие.';
}

// ---------- response shaping ----------

function shapeReply(chatId, payload) {
    // Array: flatten into multiple sendMessage calls (used by /start, /menu —
    // first message removes the old reply keyboard, second shows the inline menu).
    if (Array.isArray(payload)) {
        return payload.flatMap((p) => shapeReply(chatId, p));
    }
    const text = typeof payload === 'string' ? payload : payload.text;
    const markup = (typeof payload === 'object' && payload.reply_markup) ? payload.reply_markup : undefined;
    const photo = (typeof payload === 'object') ? payload.photo : null;
    // Photo path: sendPhoto with caption when image URL is provided and caption fits.
    if (photo && text && text.length <= 1024) {
        return [{
            method: 'sendPhoto',
            chat_id: chatId,
            photo,
            caption: text,
            parse_mode: 'HTML',
            ...(markup ? { reply_markup: markup } : {}),
        }];
    }
    // Telegram 4096 cap: split conservatively at 3800 on paragraph boundaries.
    const chunks = [];
    let cur = '';
    for (const para of String(text).split('\n')) {
        if ((cur + '\n' + para).length > 3800 && cur) { chunks.push(cur); cur = para; }
        else cur = cur ? cur + '\n' + para : para;
    }
    if (cur) chunks.push(cur);
    return chunks.map((c, i) => ({
        method: 'sendMessage',
        chat_id: chatId,
        text: c,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...(i === chunks.length - 1 && markup ? { reply_markup: markup } : {}),
    }));
}

// ---------- Telegram update handlers ----------

async function handleMessage(data, msg, env, ctx) {
    if (!msg) return null;
    const chatId = msg.chat.id;
    let text = (msg.text || '').trim();
    if (!text) return null;
    if (TEXT_TO_COMMAND[text]) text = TEXT_TO_COMMAND[text];
    if (!text.startsWith('/')) {
        const wbId = parseUrlOrId(text);
        if (wbId) text = '/track ' + wbId;
        else text = '/find ' + text;
    }

    const [cmdRaw, ...rest] = text.split(/\s+/);
    const cmd = cmdRaw.split('@')[0].toLowerCase();
    const arg = rest.join(' ');
    const reply = await dispatch(data, cmd, arg, { chatId, env, ctx });
    return shapeReply(chatId, reply);
}

async function handleCallback(data, cq, env, ctx) {
    const cbData = cq.data || '';
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;
    if (!chatId) return null;

    if (cbData === 'noop') {
        return [{ method: 'answerCallbackQuery', callback_query_id: cq.id }];
    }

    const reply = await dispatchCallback(data, cbData);
    const text = typeof reply === 'string' ? reply : reply.text;
    const markup = typeof reply === 'object' ? reply.reply_markup : undefined;

    // For paginated callbacks we EDIT the message in place; for initial brand/d/under
    // callbacks (no "pg:" prefix) we also edit since the user already saw the keyboard.
    const editInPlace = !!messageId;

    const responses = [{ method: 'answerCallbackQuery', callback_query_id: cq.id }];
    if (editInPlace) {
        responses.push({
            method: 'editMessageText',
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...(markup ? { reply_markup: markup } : {}),
        });
    } else {
        responses.push(...shapeReply(chatId, reply));
    }
    return responses;
}

// ---------- Worker entrypoint ----------

async function sendOne(token, body) {
    const r = await fetch(`https://api.telegram.org/bot${token}/${body.method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) {
        const t = await r.text();
        console.error(`tg ${body.method} failed: ${r.status} ${t}`);
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Health check + setup helpers
        if (url.pathname === '/' && request.method === 'GET') {
            return new Response('WB TV Tracker bot — alive. POST /webhook for Telegram.\n', { headers: { 'Content-Type': 'text/plain' } });
        }
        if (url.pathname === '/setup' && request.method === 'POST') {
            // Returns the URL you should pass to setWebhook
            return Response.json({
                setWebhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=${url.origin}/webhook`,
                deleteWebhook: `https://api.telegram.org/bot<TOKEN>/deleteWebhook`,
            });
        }
        if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

        let update;
        try { update = await request.json(); }
        catch { return new Response('Bad JSON', { status: 400 }); }

        const token = env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response('TELEGRAM_BOT_TOKEN not configured', { status: 500 });

        const data = await loadData(ctx);

        let responses = null;
        try {
            if (update.message) responses = await handleMessage(data, update.message, env, ctx);
            else if (update.callback_query) responses = await handleCallback(data, update.callback_query, env, ctx);
        } catch (err) {
            console.error('handler error:', err.stack || err.message);
            if (update.message?.chat?.id) {
                responses = [{
                    method: 'sendMessage',
                    chat_id: update.message.chat.id,
                    text: `Ошибка: <code>${esc(err.message || String(err))}</code>`,
                    parse_mode: 'HTML',
                }];
            }
        }

        if (!responses?.length) return new Response('OK');

        // Cloudflare lets us return the FIRST response inline (zero extra latency)
        // and dispatch the rest via the Bot API.
        const [first, ...rest] = responses;
        if (rest.length) ctx.waitUntil(Promise.all(rest.map((b) => sendOne(token, b))));
        return Response.json(first);
    },
};
