import { Actor, log } from 'apify';
import { gotScraping } from 'got-scraping';

const WB_SEARCH_URL = 'https://search.wb.ru/exactmatch/ru/common/v9/search';
const WB_ITEM_URL = (id) => `https://www.wildberries.ru/catalog/${id}/detail.aspx`;

const ACCESSORY_WORDS = [
  'кронштейн',
  'пульт',
  'подставка',
  'крепление',
  'чехол',
  'защитн',
  'плёнк',
  'пленк',
  'кабель',
  'переходник',
  'адаптер',
  'тумба',
  'настенн',
  'sat-ресивер',
  'ресивер',
  'антенн',
  'очки',
  'наклейк',
  'окб для',
];

const TV_HINT_WORDS = ['телевизор', 'smart tv', 'led', 'qled', 'oled', 'uhd', 'tv'];

const DIAGONAL_BUCKETS = [19, 22, 24, 28, 32, 39, 40, 43, 49, 50, 55, 58, 60, 65, 70, 75, 77, 82, 85, 98, 100];

function isAccessory(name = '') {
    const n = name.toLowerCase();
    const looksLikeTV = TV_HINT_WORDS.some((w) => n.includes(w));
    const looksLikeAccessory = ACCESSORY_WORDS.some((w) => n.includes(w));
    return looksLikeAccessory && !looksLikeTV;
}

function parseDiagonal(name = '') {
    const explicit = name.match(/(\d{2,3})\s*(?:["'″''`″]|дюйм(?:а|ов|)?|inch|in\b)/i);
    if (explicit) {
        const v = Number(explicit[1]);
        if (v >= 15 && v <= 120) return v;
    }
    for (const d of DIAGONAL_BUCKETS) {
        const re = new RegExp(`\\b${d}\\b`);
        if (re.test(name)) return d;
    }
    return null;
}

function pickSupplierRating(p) {
    const candidates = [p.supplierRating, p.supplier_rating, p.sellerRating];
    for (const c of candidates) {
        const n = Number(c);
        if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
    }
    return null;
}

function priceFromProduct(p) {
    const size = Array.isArray(p.sizes) && p.sizes.length ? p.sizes[0] : null;
    const price = size?.price ?? {};

    const productKopecks = price.product ?? price.total ?? p.salePriceU ?? 0;
    const basicKopecks = price.basic ?? p.priceU ?? productKopecks;

    return {
        price: Math.round(productKopecks) / 100,
        basicPrice: Math.round(basicKopecks) / 100,
    };
}

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    query = 'телевизор',
    maxPages = 100,
    sort = 'priceup',
    dest = -1257786,
    minPrice = 0,
    maxPrice = 0,
    minRating = 4,
    minFeedbacks = 5,
    topN = 50,
    onlyTVs = true,
    useProxy = true,
    proxyGroups = [],
    delayMs = 600,
} = input;

log.info('Starting Wildberries TV scraper', {
    query,
    maxPages,
    sort,
    dest,
    onlyTVs,
    useProxy,
});

let proxyUrl;
if (useProxy) {
    try {
        const proxyConfiguration = await Actor.createProxyConfiguration(
            proxyGroups.length ? { groups: proxyGroups, countryCode: 'RU' } : { countryCode: 'RU' },
        );
        proxyUrl = await proxyConfiguration?.newUrl();
        log.info('Apify Proxy enabled', { groups: proxyGroups });
    } catch (err) {
        log.warning('Apify Proxy not available, continuing without proxy', { err: err.message });
    }
}

const seen = new Set();
const products = [];
let consecutiveEmpty = 0;

for (let page = 1; page <= maxPages; page++) {
    const url = new URL(WB_SEARCH_URL);
    url.searchParams.set('ab_testid', 'false');
    url.searchParams.set('appType', '1');
    url.searchParams.set('curr', 'rub');
    url.searchParams.set('dest', String(dest));
    url.searchParams.set('query', query);
    url.searchParams.set('resultset', 'catalog');
    url.searchParams.set('sort', sort);
    url.searchParams.set('spp', '30');
    url.searchParams.set('suppressSpellcheck', 'false');
    url.searchParams.set('page', String(page));

    let body;
    try {
        const res = await gotScraping({
            url: url.toString(),
            responseType: 'json',
            proxyUrl,
            timeout: { request: 30_000 },
            retry: { limit: 3 },
            headers: {
                Accept: '*/*',
                'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.6',
                Referer: 'https://www.wildberries.ru/',
                Origin: 'https://www.wildberries.ru',
            },
        });
        body = res.body;
    } catch (err) {
        log.warning(`Page ${page} failed`, { err: err.message });
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) {
            log.warning('Stopping after 3 consecutive failures');
            break;
        }
        continue;
    }

    const list = body?.data?.products ?? [];
    if (list.length === 0) {
        consecutiveEmpty++;
        log.info(`Page ${page}: empty`);
        if (consecutiveEmpty >= 2) {
            log.info('No more products, stopping');
            break;
        }
        continue;
    }
    consecutiveEmpty = 0;

    let newOnPage = 0;
    for (const p of list) {
        if (!p?.id || seen.has(p.id)) continue;
        if (onlyTVs && isAccessory(p.name)) continue;

        const { price, basicPrice } = priceFromProduct(p);
        if (!price) continue;
        if (minPrice && price < minPrice) continue;
        if (maxPrice && price > maxPrice) continue;

        seen.add(p.id);
        const rating = p.reviewRating ?? p.rating ?? 0;
        const feedbacks = p.feedbacks ?? p.nmFeedbacks ?? 0;
        const discount = basicPrice > 0 && basicPrice > price
            ? Math.round((1 - price / basicPrice) * 100)
            : 0;

        const item = {
            id: p.id,
            name: p.name,
            brand: p.brand ?? null,
            supplier: p.supplier ?? null,
            supplierId: p.supplierId ?? null,
            supplierRating: pickSupplierRating(p),
            diagonal: parseDiagonal(p.name),
            subjectId: p.subjectId ?? p.subjectParentId ?? null,
            rating,
            feedbacks,
            price,
            basicPrice,
            discount,
            url: WB_ITEM_URL(p.id),
        };
        products.push(item);
        await Actor.pushData(item);
        newOnPage++;
    }

    log.info(`Page ${page}: got ${list.length} cards, +${newOnPage} new, total ${products.length}`);

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
}

const qualified = products.filter((p) => p.rating >= minRating && p.feedbacks >= minFeedbacks);
const ranked = [...qualified].sort((a, b) => a.price - b.price).slice(0, topN);

function median(nums) {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function fmtRub(n) {
    return Math.round(n).toLocaleString('ru-RU');
}

function safe(s) {
    return String(s ?? '').replace(/\|/g, '/');
}

function escName(name, len = 70) {
    return safe(name).slice(0, len);
}

function brandBreakdown(items, limit = 15) {
    const byBrand = new Map();
    for (const p of items) {
        const key = p.brand || '—';
        const bucket = byBrand.get(key) ?? { brand: key, items: [] };
        bucket.items.push(p);
        byBrand.set(key, bucket);
    }
    const rows = [...byBrand.values()].map((b) => {
        const prices = b.items.map((x) => x.price);
        const ratings = b.items.map((x) => x.rating).filter((x) => x > 0);
        const cheapest = [...b.items].sort((a, b) => a.price - b.price)[0];
        return {
            brand: b.brand,
            count: b.items.length,
            minPrice: Math.min(...prices),
            medianPrice: median(prices),
            avgRating: ratings.length ? Math.round((ratings.reduce((a, c) => a + c, 0) / ratings.length) * 10) / 10 : 0,
            cheapest,
        };
    });
    rows.sort((a, b) => b.count - a.count || a.minPrice - b.minPrice);
    return rows.slice(0, limit);
}

function diagonalBreakdown(items, perBucket = 3) {
    const byDiag = new Map();
    for (const p of items) {
        if (!p.diagonal) continue;
        const bucket = byDiag.get(p.diagonal) ?? [];
        bucket.push(p);
        byDiag.set(p.diagonal, bucket);
    }
    const buckets = [...byDiag.entries()]
        .map(([diag, arr]) => ({
            diag,
            count: arr.length,
            minPrice: Math.min(...arr.map((x) => x.price)),
            top: [...arr].sort((a, b) => a.price - b.price).slice(0, perBucket),
        }))
        .sort((a, b) => a.diag - b.diag);
    return buckets;
}

const brandRows = brandBreakdown(qualified, 15);
const diagonalRows = diagonalBreakdown(qualified, 3);

const lines = [];
lines.push(`# Wildberries — лучшие цены на «${query}»`);
lines.push('');
lines.push(`- Дата отчёта: ${new Date().toISOString()}`);
lines.push(`- Собрано уникальных карточек: **${products.length}** (страниц обработано до ${maxPages}, сортировка \`${sort}\`)`);
lines.push(`- В выборке для топа (рейтинг ≥ ${minRating}, отзывов ≥ ${minFeedbacks}): **${qualified.length}**`);
lines.push(`- Итоговый топ артикулов: **${ranked.length}**`);
lines.push('');

lines.push('## 1. Топ артикулов по цене');
lines.push('');
lines.push('| # | Артикул | Диаг. | Цена, ₽ | Без скидки | Скидка | ★ | Отзывов | Продавец (★) | Бренд | Название | Ссылка |');
lines.push('|---|---------|-------|---------|------------|--------|---|---------|--------------|-------|----------|--------|');
ranked.forEach((p, i) => {
    const supplier = p.supplier
        ? `${safe(p.supplier).slice(0, 24)}${p.supplierRating ? ` (${p.supplierRating})` : ''}`
        : '—';
    lines.push(
        `| ${i + 1} | \`${p.id}\` | ${p.diagonal ? `${p.diagonal}"` : '—'} | ${fmtRub(p.price)} | ${fmtRub(p.basicPrice)} | ${p.discount}% | ${p.rating || '—'} | ${p.feedbacks || 0} | ${supplier} | ${safe(p.brand || '—')} | ${escName(p.name)} | [открыть](${p.url}) |`,
    );
});

lines.push('');
lines.push('## 2. Разбивка по брендам (топ-15 по числу карточек)');
lines.push('');
lines.push('| Бренд | Карточек | Мин. цена, ₽ | Медиана, ₽ | Ср. ★ | Самый дешёвый артикул |');
lines.push('|-------|----------|--------------|------------|-------|------------------------|');
for (const b of brandRows) {
    const cheapestCell = b.cheapest
        ? `[${b.cheapest.id} — ${fmtRub(b.cheapest.price)} ₽](${b.cheapest.url})`
        : '—';
    lines.push(
        `| ${safe(b.brand)} | ${b.count} | ${fmtRub(b.minPrice)} | ${fmtRub(b.medianPrice)} | ${b.avgRating || '—'} | ${cheapestCell} |`,
    );
}

lines.push('');
lines.push('## 3. Разбивка по диагоналям');
lines.push('');
if (!diagonalRows.length) {
    lines.push('_Диагонали не удалось распарсить из названий._');
} else {
    lines.push('| Диагональ | Карточек | Мин. цена, ₽ | Топ-3 дешёвых |');
    lines.push('|-----------|----------|--------------|----------------|');
    for (const d of diagonalRows) {
        const top = d.top
            .map((p) => `[${p.id} — ${fmtRub(p.price)} ₽ • ${safe(p.brand || '?')}](${p.url})`)
            .join(' <br> ');
        lines.push(`| **${d.diag}"** | ${d.count} | ${fmtRub(d.minPrice)} | ${top} |`);
    }
}

lines.push('');
lines.push('---');
lines.push('_Сгенерировано Apify Actor `wildberries-tv-scraper`. Источник: search.wb.ru / wildberries.ru._');

const report = lines.join('\n');
const kvs = await Actor.openKeyValueStore();
await kvs.setValue('REPORT', report, { contentType: 'text/markdown; charset=utf-8' });
await kvs.setValue('REPORT_JSON', {
    generatedAt: new Date().toISOString(),
    query,
    totalScraped: products.length,
    qualified: qualified.length,
    top: ranked,
    byBrand: brandRows,
    byDiagonal: diagonalRows,
});

log.info(`Done. Scraped ${products.length} TVs, top ${ranked.length} saved to KV store key REPORT`);

await Actor.exit();
