#!/usr/bin/env node
// Cross-marketplace check: for each tracked WB product, search Ozon for the
// same model and report if it's cheaper there.
//
// ⚠️ Like the WB scraper this needs a Russian IP (Ozon geo-blocks too) and
// is best run from a Yandex Cloud Function / RU VPS. Ozon's public search
// endpoint is also more aggressive about bot detection than WB, so this is
// a best-effort enrichment — failures are non-fatal.
//
// Output: writes a `crossMarket` field onto each watchlist product entry:
//   { ozonPrice, ozonUrl, deltaPct, checkedAt }
//
// Usage:
//   node ozon-crosscheck.mjs --watchlist report/watchlist.json
//
// The matching key is the model code lifted from the product name (the same
// token extraction used by models.mjs). Exact matches only — fuzzy matching
// across marketplaces is noisy and better skipped than wrong.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { argv, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const watchlistPath = arg('watchlist', 'apify-wb-tv-scraper/report/watchlist.json');
const dryRun = argv.includes('--dry-run');

if (!existsSync(watchlistPath)) { console.error('no watchlist'); exit(2); }
const wl = JSON.parse(readFileSync(watchlistPath, 'utf8'));
const products = (wl.entries || []).filter((e) => e.productId && e.lastSnapshot);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Extract a model-code-like token from a product name (letters+digits, ≥4).
function modelCode(name = '') {
    const stop = new Set(['телевизор', 'холодильник', 'стиральная', 'машина', 'smart', 'android', 'двухкамерн']);
    for (const t of (name.toLowerCase().match(/\b[a-z0-9-]{4,}\b/g) || [])) {
        if (stop.has(t)) continue;
        if (/\d/.test(t) && /[a-z]/.test(t)) return t;
    }
    return null;
}

// Ozon composer API (public, used by the site). Returns JSON with widgets.
async function ozonSearch(query, dest = '') {
    const url = `https://www.ozon.ru/api/composer-api.bx/page/json/v2?url=${encodeURIComponent('/search/?text=' + query + '&from_global=true')}`;
    const r = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'ru' },
    });
    if (r.status === 403 || r.status === 451) throw new Error(`geo/bot-blocked (HTTP ${r.status})`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    // Ozon nests results under widgetStates with a searchResultsV2 key.
    const states = j?.widgetStates || {};
    for (const [k, v] of Object.entries(states)) {
        if (!/searchResults/i.test(k)) continue;
        let parsed;
        try { parsed = JSON.parse(v); } catch { continue; }
        const items = parsed?.items || [];
        for (const it of items) {
            const priceTxt = (it.mainState || []).flatMap((s) => s.atom?.priceV2?.price || [])
                .map((p) => p.text).join('');
            const price = parseInt(String(priceTxt).replace(/\D/g, ''), 10);
            const link = it.action?.link || it.deepLink;
            if (price) return { price, url: link ? `https://www.ozon.ru${link}` : null };
        }
    }
    return null;
}

const now = new Date().toISOString();
let checked = 0, cheaper = 0;

for (const e of products) {
    const code = modelCode(e.lastSnapshot.name || '');
    if (!code) continue;
    let res;
    try { res = await ozonSearch(code); }
    catch (err) {
        console.error(`ozon ${code}: ${err.message}`);
        if (/geo|bot-blocked/i.test(err.message)) {
            console.error('\nRequires a Russian IP. See docs/SCRAPER-WITHOUT-APIFY.md');
            exit(3);
        }
        continue;
    }
    checked++;
    if (!res) continue;
    const wbPrice = e.lastSnapshot.price;
    const deltaPct = wbPrice > 0 ? Math.round((res.price / wbPrice - 1) * 100) : 0;
    e.crossMarket = { ozonPrice: res.price, ozonUrl: res.url, deltaPct, checkedAt: now };
    if (res.price < wbPrice) cheaper++;
    await new Promise((r) => setTimeout(r, 600));   // gentle pacing
}

if (!dryRun) writeFileSync(watchlistPath, JSON.stringify({ updatedAt: now, entries: wl.entries }, null, 2));
console.log(`ozon-crosscheck: checked ${checked}, cheaper-on-ozon ${cheaper}${dryRun ? ' (dry-run)' : ''}`);
