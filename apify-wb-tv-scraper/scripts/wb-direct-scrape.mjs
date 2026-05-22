#!/usr/bin/env node
// Direct Wildberries scraper — no Apify, no headless browser, just the public
// search.wb.ru JSON endpoint that wildberries.ru itself uses.
//
// ⚠️ Requires a Russian-IP origin. WB returns HTTP 200 with empty data (or 451)
// from non-RU IPs. Recommended deployment targets:
//   1. Yandex Cloud Functions (free 1M invocations/mo, native RU colo)
//   2. Cheap RU VPS (~$3/mo) running cron
//   3. Local run with a Russian VPN
//
// Usage:
//   node wb-direct-scrape.mjs --out report/REPORT-raw.jsonl
//
// Flags:
//   --out <file>        output JSONL (one product per line)
//   --dest <id>         WB region code (default −1123300 = St-Petersburg)
//   --max-pages <n>     pages per query (default 5; ≤100 items per page)
//   --brands a,b,c      override default 8-brand list
//   --quiet             suppress per-page logs
//
// Output rows are shaped to mirror what powerai actor produces, so
// build-report.mjs can consume them unchanged.

import { writeFileSync, appendFileSync, existsSync, unlinkSync } from 'node:fs';
import { argv, exit, env } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);

const OUT = arg('out', 'apify-wb-tv-scraper/report/REPORT-raw.jsonl');
const DEST = arg('dest', '-1123300');         // SPb
const MAX_PAGES = parseInt(arg('max-pages', '5'), 10);
const QUIET = flag('quiet');
const BRANDS = (arg('brands', 'samsung,sony,tcl,hisense,haier,xiaomi,яндекс,sber'))
    .split(',').map((b) => b.trim()).filter(Boolean);
const SORTS = ['popular', 'priceup'];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const log = (...a) => { if (!QUIET) console.log(...a); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- request ----------

async function fetchPage(query, sort, page, attempt = 1) {
    const params = new URLSearchParams({
        ab_testing: 'false',
        appType: '1',
        curr: 'rub',
        dest: DEST,
        hide_dtype: '10',
        lang: 'ru',
        page: String(page),
        query: `${query} телевизор`,
        resultset: 'catalog',
        sort,
        spp: '30',
        suppressSpellcheck: 'false',
    });
    const url = `https://search.wb.ru/exactmatch/ru/common/v9/search?${params}`;

    try {
        const r = await fetch(url, {
            headers: {
                'User-Agent': UA,
                'Accept': 'application/json',
                'Accept-Language': 'ru-RU,ru;q=0.9',
                'Origin': 'https://www.wildberries.ru',
                'Referer': 'https://www.wildberries.ru/',
            },
        });
        if (r.status === 451 || r.status === 403) {
            throw new Error(`geo-blocked (HTTP ${r.status}) — origin must be Russia`);
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        return j?.data?.products || [];
    } catch (err) {
        if (attempt < 3) {
            await sleep(1500 * attempt);
            return fetchPage(query, sort, page, attempt + 1);
        }
        throw err;
    }
}

// ---------- normalize ----------

const DIAG_RE = /\b(\d{2,3})\s*(?:["”]|дюйм|inch|inches)/i;
const DIAG_FALLBACK_RE = /\b(24|28|32|39|40|43|49|50|55|58|60|65|70|75|77|82|85|98|100)\b/;

function extractDiagonal(name = '') {
    const m = name.match(DIAG_RE);
    if (m) return parseInt(m[1], 10);
    const f = name.match(DIAG_FALLBACK_RE);
    return f ? parseInt(f[1], 10) : null;
}

function normalize(p) {
    // WB sizes: take min price across all size variants; price is in kopecks (×100)
    let priceKop = Infinity, originalKop = Infinity;
    for (const s of (p.sizes || [])) {
        const pp = s?.price?.product ?? s?.price?.total;
        const bb = s?.price?.basic;
        if (pp && pp < priceKop) priceKop = pp;
        if (bb && bb < originalKop) originalKop = bb;
    }
    if (!isFinite(priceKop)) return null;
    if (!isFinite(originalKop)) originalKop = priceKop;
    const price = Math.round(priceKop / 100);
    const originalPrice = Math.round(originalKop / 100);
    const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
    return {
        id: String(p.id),
        name: p.name || '',
        brand: p.brand || '',
        price,
        originalPrice,
        discount,
        rating: p.reviewRating ?? (p.rating ? p.rating / 10 : null),
        reviews: p.feedbacks ?? 0,
        diagonal: extractDiagonal(p.name || ''),
        url: `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
    };
}

// ---------- main ----------

if (existsSync(OUT)) unlinkSync(OUT);

let total = 0;
const seen = new Set();

for (const brand of BRANDS) {
    for (const sort of SORTS) {
        let collected = 0;
        for (let page = 1; page <= MAX_PAGES; page++) {
            try {
                const products = await fetchPage(brand, sort, page);
                if (!products.length) break;
                for (const p of products) {
                    if (seen.has(p.id)) continue;
                    seen.add(p.id);
                    const norm = normalize(p);
                    if (!norm) continue;
                    appendFileSync(OUT, JSON.stringify(norm) + '\n');
                    collected++;
                    total++;
                }
                if (products.length < 50) break;     // last page
                await sleep(500);                    // gentle pacing
            } catch (err) {
                log(`  ! ${brand}/${sort}/p${page}: ${err.message}`);
                if (/geo-blocked/i.test(err.message)) {
                    console.error(`\n❌ Geo-block detected. Run from a Russian IP.\n` +
                        `   Deployment guide: apify-wb-tv-scraper/docs/SCRAPER-WITHOUT-APIFY.md\n`);
                    exit(3);
                }
                break;
            }
        }
        log(`  ▸ ${brand}/${sort}: +${collected}`);
    }
}

console.log(`wb-direct-scrape: ${total} unique products → ${OUT} (dest=${DEST})`);
if (total === 0) {
    console.error('::warning::no products collected — likely geo-block or upstream change');
    exit(2);
}
