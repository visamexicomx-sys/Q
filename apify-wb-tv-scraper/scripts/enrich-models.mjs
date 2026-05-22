#!/usr/bin/env node
// Enrich MODELS.json with forecast/velocity/near-ATL/best-day-of-week metrics
// and write a panel-twin index (TWINS.json).
//
// Pure derived data — no scraping, runs on existing MODELS.json + models-history.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const modelsPath = arg('models', 'apify-wb-tv-scraper/report/MODELS.json');
const historyPath = arg('history', 'apify-wb-tv-scraper/report/models-history.json');
const outDir = arg('out-dir', 'apify-wb-tv-scraper/report');

if (!existsSync(modelsPath)) { console.error('MODELS.json missing'); exit(2); }

const models = JSON.parse(readFileSync(modelsPath, 'utf8'));
const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')).models || {} : {};

// ---------- helpers ----------

const DAY_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

// Least-squares slope on (t, min) pairs across snapshots. Returns %/day.
function velocity(snapshots) {
    if (!snapshots || snapshots.length < 3) return null;
    const recent = snapshots.slice(-7);
    const t0 = new Date(recent[0].at).getTime();
    const pts = recent.map((s) => ({
        x: (new Date(s.at).getTime() - t0) / 86_400_000, // days
        y: s.min,
    }));
    const n = pts.length;
    const sx = pts.reduce((a, p) => a + p.x, 0);
    const sy = pts.reduce((a, p) => a + p.y, 0);
    const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
    const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
    const denom = n * sxx - sx * sx;
    if (denom === 0) return null;
    const slope = (n * sxy - sx * sy) / denom;          // ₽/day
    const meanY = sy / n;
    if (meanY === 0) return null;
    return +((slope / meanY) * 100).toFixed(2);         // %/day
}

function bestDayOfWeek(snapshots) {
    if (!snapshots || snapshots.length < 7) return null;
    const buckets = new Array(7).fill(null).map(() => ({ sum: 0, n: 0 }));
    for (const s of snapshots) {
        const dow = new Date(s.at).getUTCDay();
        buckets[dow].sum += s.min;
        buckets[dow].n += 1;
    }
    const avgs = buckets.map((b, i) => ({ dow: i, avg: b.n ? b.sum / b.n : Infinity, n: b.n }));
    const valid = avgs.filter((a) => a.n > 0);
    if (valid.length < 3) return null;
    valid.sort((a, b) => a.avg - b.avg);
    return { day: DAY_RU[valid[0].dow], avg: Math.round(valid[0].avg), samples: valid[0].n };
}

// ---------- panel tech extraction ----------
// Looks at the full corpus of item names for the model + model-code patterns.
// Falls back to brand+model heuristics that catch common Samsung/Hisense lines.

function detectTech(names, modelCode = '', brand = '') {
    const blob = names.join(' ').toLowerCase();
    const code = modelCode.toLowerCase();
    if (/qd[\s-]?oled|qdoled/.test(blob)) return 'QD-OLED';
    if (/\boled\b/.test(blob)) return 'OLED';
    if (/mini[\s-]?led|miniled/.test(blob)) return 'Mini-LED';
    if (/\bqled\b/.test(blob)) return 'QLED';
    if (/\bnanocell\b/.test(blob)) return 'NanoCell';
    // Samsung code prefixes
    if (brand.toLowerCase() === 'samsung') {
        if (/^qn9|^qn8|qn90|qn95|qn900|qn990/.test(code)) return 'Neo QLED';
        if (/^q[en]/.test(code)) return 'QLED';
        if (/^s9|s95|s90/.test(code)) return 'OLED';
        if (/^ue/.test(code)) return 'LED';
    }
    // Hisense code patterns
    if (brand.toLowerCase() === 'hisense') {
        if (/u8|u7q|ux/.test(code)) return 'Mini-LED';
        if (/u6|u7s|u77/.test(code)) return 'QLED';
    }
    // TCL
    if (brand.toLowerCase() === 'tcl') {
        if (/c7|c8|c9|x9|qm8/.test(code)) return 'Mini-LED';
        if (/c6|c64|c65/.test(code)) return 'QLED';
    }
    return 'LED';
}

function detectResolution(names, diagonal = 0) {
    const blob = names.join(' ').toLowerCase();
    if (/8k|7680|qn900|qn990/.test(blob)) return '8K';
    if (/4k|uhd|3840|ultra[\s-]?hd|ultrahd/.test(blob)) return '4K';
    if (/full[\s-]?hd|fhd|1920/.test(blob)) return 'FHD';
    if (/\bhd\b|hd[\s-]?ready|1366|1280/.test(blob)) return 'HD';
    // Heuristic: TVs ≥43" with no resolution mention are almost always 4K nowadays
    return diagonal >= 43 ? '4K' : 'HD';
}

// ---------- enrich ----------

const enriched = models.models.map((m) => {
    const h = history[m.key];
    const snaps = h?.snapshots || [];
    const v = velocity(snaps);
    const dow = bestDayOfWeek(snaps);
    const nearAtl = m.min > 0 && m.allTimeMin > 0 && m.min !== m.allTimeMin
        && (m.min / m.allTimeMin - 1) <= 0.02;

    // Panel tech / resolution from full corpus of item names + model-code patterns
    const names = (m.items || []).map((it) => it.name || '');
    const diag = m.diagonals[0] || null;
    const tech = detectTech(names, m.model, m.brand);
    const res = detectResolution(names, diag);

    let dropTag = null;
    if (v != null) {
        if (v <= -3) dropTag = 'panic-sale';        // dropping >=3%/day → grab
        else if (v <= -1) dropTag = 'falling';
        else if (v >= 1) dropTag = 'rising';
        else dropTag = 'flat';
    }

    return {
        ...m,
        velocity: v,
        velocityTag: dropTag,
        nearAtl,
        nearAtlPct: nearAtl ? +(((m.min / m.allTimeMin) - 1) * 100).toFixed(1) : null,
        bestDow: dow,
        tech,
        resolution: res,
        twinKey: diag ? `${diag}|${res}|${tech}` : null,
    };
});

// ---------- panel-twins index ----------

const twinGroups = new Map();
for (const m of enriched) {
    if (!m.twinKey || m.sellers < 1 || !m.min) continue;
    if (!twinGroups.has(m.twinKey)) twinGroups.set(m.twinKey, []);
    twinGroups.get(m.twinKey).push(m);
}

const twins = [];
for (const [key, group] of twinGroups) {
    const brands = new Set(group.map((g) => g.brand.toLowerCase()));
    if (brands.size < 2) continue;
    const sorted = [...group].sort((a, b) => a.min - b.min);
    const cheapest = sorted[0];
    const expensive = sorted[sorted.length - 1];
    const spread = expensive.min / cheapest.min;
    if (spread < 1.15) continue;          // < 15% spread is noise
    twins.push({
        key,
        diagonal: cheapest.diagonals[0],
        resolution: cheapest.resolution,
        tech: cheapest.tech,
        brandsCount: brands.size,
        spreadPct: +((spread - 1) * 100).toFixed(1),
        members: sorted.map((g) => ({
            key: g.key,
            brand: g.brand,
            model: g.model,
            min: g.min,
            median: g.median,
            url: g.items[0]?.url,
            id: g.items[0]?.id,
        })),
    });
}
twins.sort((a, b) => b.spreadPct - a.spreadPct);

// ---------- write ----------

writeFileSync(modelsPath, JSON.stringify({ ...models, models: enriched, enrichedAt: new Date().toISOString() }, null, 2));
writeFileSync(resolve(outDir, 'TWINS.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalGroups: twins.length,
    twins,
}, null, 2));

const panic = enriched.filter((m) => m.velocityTag === 'panic-sale').length;
const nearAtl = enriched.filter((m) => m.nearAtl).length;
console.log(`enrich: ${enriched.length} models · ${panic} panic-sale · ${nearAtl} near-ATL · ${twins.length} panel-twin groups`);
