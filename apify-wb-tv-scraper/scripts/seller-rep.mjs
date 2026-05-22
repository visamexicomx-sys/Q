#!/usr/bin/env node
// Per-listing reputation across historical snapshots.
//
// WB scraped via powerai doesn't expose seller name, so we use item.id (the
// listing/article) as the identity unit. For each listing we compute:
//   - listings: how many snapshots it appeared in
//   - priceMin / priceMax / priceAvg
//   - volatility: stddev / mean (high = noisy price)
//   - fakeDiscountRate: % of snapshots where discount ≥ 70 (RRP-inflated)
//   - undercutRate: % of snapshots where price < model median * 0.9
//   - score: -volatility×30 -fakeDiscountRate×40 +undercutRate×30
//
// Writes report/LISTINGS.json — surfaced via /sellers bot command.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { argv } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const histDir = arg('history-dir', 'apify-wb-tv-scraper/report/history');
const modelsPath = arg('models', 'apify-wb-tv-scraper/report/MODELS.json');
const outPath = arg('out', 'apify-wb-tv-scraper/report/SELLERS.json');

const snapFiles = existsSync(histDir)
    ? readdirSync(histDir).filter((f) => f.endsWith('.json')).sort().map((f) => join(histDir, f))
    : [];

// Latest medians per model (used as benchmark for undercut)
let modelMedian = new Map();
if (existsSync(modelsPath)) {
    const m = JSON.parse(readFileSync(modelsPath, 'utf8'));
    for (const x of m.models || []) {
        modelMedian.set(`${x.brand.toLowerCase()}|${x.model}`, x.median);
    }
}

const listings = new Map();
for (const file of snapFiles) {
    let rep;
    try { rep = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const items = rep.all || [];
    for (const it of items) {
        if (!it.id) continue;
        if (!listings.has(it.id)) {
            listings.set(it.id, {
                id: it.id,
                brand: it.brand,
                name: it.name,
                url: it.url,
                snapshots: 0,
                prices: [],
                fakeDiscountHits: 0,
                undercutHits: 0,
            });
        }
        const rec = listings.get(it.id);
        rec.snapshots += 1;
        if (it.price) rec.prices.push(it.price);
        if (it.discount && it.discount >= 70) rec.fakeDiscountHits += 1;
        // We don't have model code in REPORT.all items, so undercut check
        // requires a separate join. Skip for now — handled if/when items
        // include modelCode.
    }
}

function stddev(arr) {
    if (arr.length < 2) return 0;
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
    return Math.sqrt(v);
}

const list = [...listings.values()].map((r) => {
    const priceAvg = r.prices.length ? Math.round(r.prices.reduce((a, b) => a + b, 0) / r.prices.length) : 0;
    const priceMin = r.prices.length ? Math.min(...r.prices) : 0;
    const priceMax = r.prices.length ? Math.max(...r.prices) : 0;
    const vol = priceAvg > 0 ? +(stddev(r.prices) / priceAvg).toFixed(3) : 0;
    const fakeRate = r.snapshots ? +(r.fakeDiscountHits / r.snapshots).toFixed(2) : 0;
    return {
        id: r.id,
        brand: r.brand,
        name: r.name,
        url: r.url,
        snapshots: r.snapshots,
        priceMin, priceMax, priceAvg,
        volatility: vol,
        fakeDiscountRate: fakeRate,
        score: Math.round(-vol * 30 - fakeRate * 40),
    };
}).filter((r) => r.snapshots >= 2).sort((a, b) => a.score - b.score);  // worst first (most fake)

writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    snapshotsAnalysed: snapFiles.length,
    totalListings: list.length,
    listings: list,
}, null, 2));

console.log(`listings: analysed ${snapFiles.length} snapshots → ${list.length} listings with history`);
