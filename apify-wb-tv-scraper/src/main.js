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

function isAccessory(name = '') {
    const n = name.toLowerCase();
    const looksLikeTV = TV_HINT_WORDS.some((w) => n.includes(w));
    const looksLikeAccessory = ACCESSORY_WORDS.some((w) => n.includes(w));
    return looksLikeAccessory && !looksLikeTV;
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

const ranked = [...products]
    .filter((p) => p.rating >= minRating && p.feedbacks >= minFeedbacks)
    .sort((a, b) => a.price - b.price)
    .slice(0, topN);

const lines = [];
lines.push(`# Wildberries — лучшие цены на «${query}»`);
lines.push('');
lines.push(`- Дата отчёта: ${new Date().toISOString()}`);
lines.push(`- Собрано уникальных карточек: **${products.length}** (страниц обработано до ${maxPages}, сортировка \`${sort}\`)`);
lines.push(`- Фильтр для топа: рейтинг ≥ ${minRating}, отзывов ≥ ${minFeedbacks}`);
lines.push(`- Топ артикулов: **${ranked.length}**`);
lines.push('');
lines.push('| # | Артикул | Цена, ₽ | Без скидки, ₽ | Скидка | ★ | Отзывов | Бренд | Название | Ссылка |');
lines.push('|---|---------|---------|---------------|--------|---|---------|-------|----------|--------|');
ranked.forEach((p, i) => {
    const name = (p.name || '').replace(/\|/g, '/').slice(0, 80);
    const brand = (p.brand || '-').replace(/\|/g, '/');
    lines.push(
        `| ${i + 1} | \`${p.id}\` | ${p.price.toLocaleString('ru-RU')} | ${p.basicPrice.toLocaleString('ru-RU')} | ${p.discount}% | ${p.rating || '-'} | ${p.feedbacks || 0} | ${brand} | ${name} | [открыть](${p.url}) |`,
    );
});

const report = lines.join('\n');
const kvs = await Actor.openKeyValueStore();
await kvs.setValue('REPORT', report, { contentType: 'text/markdown; charset=utf-8' });
await kvs.setValue('REPORT_JSON', ranked);

log.info(`Done. Scraped ${products.length} TVs, top ${ranked.length} saved to KV store key REPORT`);

await Actor.exit();
