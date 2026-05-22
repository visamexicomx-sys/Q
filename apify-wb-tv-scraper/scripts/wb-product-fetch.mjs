#!/usr/bin/env node
// Fetch one or many WB products by article ID from the public card.wb.ru
// detail endpoint. Returns rich per-product data (name, brand, seller,
// price, stock, delivery, image URL) — same shape used by the Telegram
// product-card renderer and watchlist-products checker.
//
// Like wb-direct-scrape.mjs this REQUIRES a Russian IP — WB blocks non-RU.
//
// CLI:
//   node wb-product-fetch.mjs --ids 357676897,420399999 --dest -1123300 \
//                             --out report/tracked-products.jsonl
//
// Module:
//   import { fetchProduct, parseUrlOrId } from './wb-product-fetch.mjs';

import { writeFileSync, appendFileSync, existsSync, unlinkSync } from 'node:fs';
import { argv, exit, env } from 'node:process';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REGIONS = {
    '-1257786': 'Москва',
    '-1123300': 'Санкт-Петербург',
    '-2133462': 'Краснодар',
    '-1029256': 'Екатеринбург',
    '-72690': 'Новосибирск',
};

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const URL_RE = /(?:wildberries\.ru\/catalog\/|wb\.ru\/catalog\/)?(\d{6,11})(?:\/detail\.aspx)?/i;

// Accept a raw article ID, a wildberries.ru URL, or anything ID-shaped.
export function parseUrlOrId(input) {
    if (!input) return null;
    const s = String(input).trim();
    if (/^\d{6,11}$/.test(s)) return s;
    const m = s.match(URL_RE);
    return m ? m[1] : null;
}

export async function fetchProduct(id, dest = '-1123300') {
    const url = `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=${dest}&spp=30&hide_dtype=10&ab_testing=false&lang=ru&nm=${id}`;
    const r = await fetch(url, {
        headers: {
            'User-Agent': UA,
            'Accept': 'application/json',
            'Accept-Language': 'ru-RU,ru;q=0.9',
            'Origin': 'https://www.wildberries.ru',
            'Referer': 'https://www.wildberries.ru/',
        },
    });
    if (r.status === 451 || r.status === 403 || r.status === 429) {
        throw new Error(`geo-blocked (HTTP ${r.status}) — fetch from a Russian IP`);
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const p = j?.data?.products?.[0];
    if (!p) return null;

    // Roll up sizes: pick the lowest price across all size variants, sum stock.
    let priceKop = Infinity, basicKop = Infinity, totalStock = 0;
    let time1 = 0, time2 = 0, dtype = 0;
    for (const s of (p.sizes || [])) {
        const pp = s?.price?.product ?? s?.price?.total;
        const bb = s?.price?.basic;
        if (pp && pp < priceKop) priceKop = pp;
        if (bb && bb < basicKop) basicKop = bb;
        for (const st of (s.stocks || [])) totalStock += (st.qty || 0);
        if ((s.time1 || 0) > time1) time1 = s.time1;
        if ((s.time2 || 0) > time2) time2 = s.time2;
        if (s.dtype) dtype = s.dtype;
    }
    if (!isFinite(priceKop)) return null;
    if (!isFinite(basicKop)) basicKop = priceKop;
    const price = Math.round(priceKop / 100);
    const originalPrice = Math.round(basicKop / 100);
    const discount = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;

    // Delivery date estimate (hours → days, conservative)
    const deliveryDays = Math.ceil((time1 + time2) / 24);
    const deliveryAt = new Date(Date.now() + deliveryDays * 86400 * 1000)
        .toISOString().slice(0, 10).split('-').reverse().join('.');

    // dtype: 4 = "грузовая, продавцом", 2 = курьер, etc.
    const DTYPE = { 1: 'самовывоз', 2: 'курьером', 3: 'почтой', 4: 'грузовая, продавцом', 5: 'продавцом' };

    return {
        id: String(p.id),
        name: p.name || '',
        brand: p.brand || '',
        brandId: p.brandId ?? null,
        supplier: p.supplier || '',
        supplierId: p.supplierId ?? null,
        supplierRating: p.supplierRating ?? null,
        rating: p.reviewRating ?? (p.rating ? p.rating / 10 : null),
        feedbacks: p.feedbacks ?? 0,
        price,
        originalPrice,
        discount,
        stock: totalStock,
        deliveryAt,
        deliveryType: DTYPE[dtype] || 'стандарт',
        dest,
        region: REGIONS[dest] || dest,
        url: `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
        fetchedAt: new Date().toISOString(),
    };
}

// ---------- CLI ----------

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    const idsArg = arg('ids', '');
    const dest = arg('dest', '-1123300');
    const out = arg('out', '');
    if (!idsArg) { console.error('--ids required (comma-separated WB article IDs or URLs)'); exit(2); }
    const ids = idsArg.split(',').map(parseUrlOrId).filter(Boolean);
    if (!ids.length) { console.error('no valid IDs parsed'); exit(2); }
    if (out && existsSync(out)) unlinkSync(out);
    let ok = 0, fail = 0;
    for (const id of ids) {
        try {
            const p = await fetchProduct(id, dest);
            if (!p) { console.error(`✗ ${id}: not found`); fail++; continue; }
            const line = JSON.stringify(p);
            if (out) appendFileSync(out, line + '\n');
            else console.log(line);
            ok++;
        } catch (err) {
            console.error(`✗ ${id}: ${err.message}`);
            fail++;
            if (/geo-blocked/i.test(err.message)) {
                console.error('\nRequires a Russian IP. See docs/SCRAPER-WITHOUT-APIFY.md');
                exit(3);
            }
        }
        await new Promise((r) => setTimeout(r, 400));   // pace
    }
    console.error(`wb-product-fetch: ${ok} ok, ${fail} failed${out ? ' → ' + out : ''}`);
    exit(fail > 0 && ok === 0 ? 2 : 0);
}
