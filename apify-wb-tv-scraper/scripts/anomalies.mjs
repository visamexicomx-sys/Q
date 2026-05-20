#!/usr/bin/env node
// Detect price anomalies in the Wildberries TV dataset.
//
// Usage:
//   node anomalies.mjs --input report/REPORT.json --out-dir report [--prev report/history/prev.json]
//
// Writes:
//   <out-dir>/ANOMALIES.md   — human-readable report grouped by anomaly type
//   <out-dir>/ANOMALIES.json — machine-readable structure with severity scores
//   Exit code = 0 always (so CI can post the report); use ANOMALIES.json for gating.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const inputPath = arg('input', 'apify-wb-tv-scraper/report/REPORT.json');
const outDir = arg('out-dir', 'apify-wb-tv-scraper/report');
const prevPath = arg('prev', '');

if (!existsSync(inputPath)) { console.error(`input not found: ${inputPath}`); exit(2); }
mkdirSync(outDir, { recursive: true });

const data = JSON.parse(readFileSync(inputPath, 'utf8'));
const items = data.all || [];
const prev = prevPath && existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, 'utf8')).all || [] : [];

// ---- helpers ----------------------------------------------------------------
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mad = (a, med) => median(a.map((x) => Math.abs(x - med))) || 1e-9;
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const safe = (s = '') => String(s).replace(/\|/g, '/');
const trim = (s, n) => safe(s).length > n ? safe(s).slice(0, n - 1) + '…' : safe(s);

// ---- 1) Statistical outliers per diagonal -----------------------------------
const byDiag = new Map();
for (const it of items) {
    if (!it.diagonal || !it.price) continue;
    if (!byDiag.has(it.diagonal)) byDiag.set(it.diagonal, []);
    byDiag.get(it.diagonal).push(it);
}
const cheapOutliers = [];
const expensiveOutliers = [];
for (const [diag, arr] of byDiag) {
    if (arr.length < 5) continue;
    const lp = arr.map((x) => Math.log(x.price));
    const med = median(lp);
    const m = mad(lp, med);
    const medianPrice = Math.round(Math.exp(med));
    for (const it of arr) {
        const z = (Math.log(it.price) - med) / (1.4826 * m);
        if (z <= -2) cheapOutliers.push({ ...it, zscore: +z.toFixed(2), medianPrice });
        else if (z >= 2.5) expensiveOutliers.push({ ...it, zscore: +z.toFixed(2), medianPrice });
    }
}
cheapOutliers.sort((a, b) => a.zscore - b.zscore);
expensiveOutliers.sort((a, b) => b.zscore - a.zscore);

// ---- 2) Sentinel / placeholder prices ---------------------------------------
const sentinels = items.filter((x) => {
    const p = x.price;
    return p === 999999 || p === 99999 || p === 9999999 || p === 1 || p === 111111 || p === 123456;
});

// ---- 3) Inflated MSRP (huge "discount") -------------------------------------
const fakeDiscounts = items
    .filter((x) => x.discount >= 60 && x.originalPrice && x.price)
    .sort((a, b) => b.discount - a.discount);

// ---- 4) Duplicate models, big price spread ----------------------------------
function modelKey(name = '') {
    // Skip generic words; require at least one letter + one digit (e.g. "Q7D", "S43NFCH001", "QE77S90FAEXRU").
    const tokens = name.toLowerCase().match(/\b[a-z0-9-]{4,}\b/g) || [];
    const STOP = new Set(['телевизор','смарт','smart','android','google','салют','wi-fi','wifi','black','white','серый','чёрный','full','ultra','ultrahd','miniled','qled','oled','uhd','hdr','dvb-t2','4k','60гц','120гц','144гц']);
    for (const t of tokens) {
        if (STOP.has(t)) continue;
        if (!/\d/.test(t)) continue;     // must have a digit (real model code)
        if (!/[a-z]/.test(t)) continue;  // must have a letter
        return t;
    }
    return null;
}
const byModel = new Map();
for (const it of items) {
    const key = modelKey(it.name);
    if (!key || !it.brand) continue;
    const k = `${it.brand.toLowerCase()}|${key}`;
    if (!byModel.has(k)) byModel.set(k, []);
    byModel.get(k).push(it);
}
const dupes = [];
for (const [k, arr] of byModel) {
    if (arr.length < 2) continue;
    const prices = arr.map((x) => x.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    if (max / min >= 1.4) dupes.push({ key: k, min, max, spread: +(max / min).toFixed(2), arr: arr.sort((a, b) => a.price - b.price) });
}
dupes.sort((a, b) => b.spread - a.spread);

// ---- 5) Premium brand at suspiciously low price -----------------------------
const PREMIUM = ['samsung', 'lg', 'sony', 'philips', 'panasonic', 'hisense', 'tcl'];
const premiumLow = [];
for (const it of items) {
    if (!it.brand || !it.diagonal) continue;
    if (!PREMIUM.includes(it.brand.toLowerCase())) continue;
    const peers = byDiag.get(it.diagonal);
    if (!peers || peers.length < 3) continue;
    const med = median(peers.map((p) => p.price));
    if (it.price < med * 0.6) premiumLow.push({ ...it, medianPrice: Math.round(med) });
}

// ---- 6) Trend vs previous snapshot (if provided) ----------------------------
const prevById = new Map(prev.map((x) => [x.id, x]));
const dropped = [];
const jumped = [];
for (const it of items) {
    const p = prevById.get(it.id);
    if (!p || !p.price) continue;
    const change = (it.price - p.price) / p.price;
    if (change <= -0.2) dropped.push({ ...it, prevPrice: p.price, change: +(change * 100).toFixed(1) });
    else if (change >= 0.3) jumped.push({ ...it, prevPrice: p.price, change: +(change * 100).toFixed(1) });
}
dropped.sort((a, b) => a.change - b.change);
jumped.sort((a, b) => b.change - a.change);

// ---- Severity ---------------------------------------------------------------
const severity = {
    high: sentinels.length + expensiveOutliers.filter((x) => x.zscore >= 5).length,
    medium: fakeDiscounts.length + premiumLow.length + dropped.length + jumped.length,
    low: cheapOutliers.length + expensiveOutliers.filter((x) => x.zscore < 5).length + dupes.length,
};

// ---- Markdown ---------------------------------------------------------------
const stamp = new Date().toISOString().replace(/T/, ' ').slice(0, 16) + ' UTC';
const out = [];
const link = (p) => `[${p.id}](${p.url})`;

out.push('# 🚨 WB TV — анализ аномальных цен');
out.push('');
out.push(`> Снимок: **${stamp}** · карточек на входе: **${items.length}**${prev.length ? ` · предыдущий снимок: **${prev.length}**` : ''}`);
out.push('');
out.push(`**Severity:** high=${severity.high}, medium=${severity.medium}, low=${severity.low}`);
out.push('');

function section(title, rows, header, mkRow) {
    out.push(`## ${title} — ${rows.length}`);
    out.push('');
    if (rows.length === 0) { out.push('_Ничего не найдено._'); out.push(''); return; }
    out.push(header);
    out.push(header.replace(/[^|]/g, '-').replace(/-\|/g, '--|'));
    for (const r of rows) out.push(mkRow(r));
    out.push('');
}

section(
    '1. Sentinel-цены (заглушки продавцов)',
    sentinels,
    '| Цена, ₽ | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **${fmt(p.price)}** | ${p.diagonal ? p.diagonal + '"' : '—'} | ${trim(p.brand || '—', 16)} | ${trim(p.name, 70)} | ${link(p)} |`,
);

section(
    '2. Подозрительно ДОРОГИЕ (z ≥ 2.5 по диагонали)',
    expensiveOutliers,
    '| z | Цена, ₽ | Медиана диаг. | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **+${p.zscore}σ** | ${fmt(p.price)} | ${fmt(p.medianPrice)} | ${p.diagonal}" | ${trim(p.brand || '—', 16)} | ${trim(p.name, 60)} | ${link(p)} |`,
);

section(
    '3. Подозрительно ДЕШЁВЫЕ (z ≤ -2 по диагонали)',
    cheapOutliers,
    '| z | Цена, ₽ | Медиана диаг. | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **${p.zscore}σ** | ${fmt(p.price)} | ${fmt(p.medianPrice)} | ${p.diagonal}" | ${trim(p.brand || '—', 16)} | ${trim(p.name, 60)} | ${link(p)} |`,
);

section(
    '4. Скидки ≥60% (вероятно завышенный MSRP)',
    fakeDiscounts.slice(0, 30),
    '| Скидка | Цена, ₽ | Было, ₽ | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **−${p.discount}%** | ${fmt(p.price)} | ${fmt(p.originalPrice)} | ${p.diagonal ? p.diagonal + '"' : '—'} | ${trim(p.brand || '—', 14)} | ${trim(p.name, 60)} | ${link(p)} |`,
);

out.push(`## 5. Дубликаты модели с разбросом цен ≥ ×1.4 — ${dupes.length} групп`);
out.push('');
if (dupes.length === 0) out.push('_Дубликатов не найдено._');
for (const g of dupes.slice(0, 12)) {
    out.push(`### \`${g.key}\` · ×${g.spread} (${fmt(g.min)}₽ → ${fmt(g.max)}₽)`);
    out.push('');
    out.push('| Цена, ₽ | Диаг. | Название | Артикул |');
    out.push('|---------|-------|----------|---------|');
    for (const p of g.arr) out.push(`| ${fmt(p.price)} | ${p.diagonal || '?'}" | ${trim(p.name, 60)} | ${link(p)} |`);
    out.push('');
}

section(
    '6. Премиум-бренд по подозрительно низкой цене (< 60% медианы)',
    premiumLow,
    '| Цена, ₽ | Медиана диаг. | Диаг. | Бренд | Название | Артикул |',
    (p) => `| ${fmt(p.price)} | ${fmt(p.medianPrice)} | ${p.diagonal}" | ${trim(p.brand || '—', 12)} | ${trim(p.name, 60)} | ${link(p)} |`,
);

if (prev.length) {
    section(
        '7. Резкое падение цены vs прошлый снимок (≤ -20%)',
        dropped,
        '| Δ% | Сейчас, ₽ | Было, ₽ | Диаг. | Бренд | Название | Артикул |',
        (p) => `| **${p.change}%** | ${fmt(p.price)} | ${fmt(p.prevPrice)} | ${p.diagonal || '—'}"  | ${trim(p.brand || '—', 14)} | ${trim(p.name, 60)} | ${link(p)} |`,
    );
    section(
        '8. Резкий рост цены vs прошлый снимок (≥ +30%)',
        jumped,
        '| Δ% | Сейчас, ₽ | Было, ₽ | Диаг. | Бренд | Название | Артикул |',
        (p) => `| **+${p.change}%** | ${fmt(p.price)} | ${fmt(p.prevPrice)} | ${p.diagonal || '—'}"  | ${trim(p.brand || '—', 14)} | ${trim(p.name, 60)} | ${link(p)} |`,
    );
} else {
    out.push('## 7-8. Трендовые аномалии');
    out.push('');
    out.push('_Предыдущий снимок не передан (--prev). Положите свежий REPORT.json в `report/history/` и в следующий запуск передайте его — появятся секции «резко подешевело» / «резко подорожало»._');
    out.push('');
}

out.push('---');
out.push('_Сгенерировано `scripts/anomalies.mjs`. Severity high = sentinel/placeholder + экстремальные ценовые выбросы; medium = фейк-скидки, премиум-аномалии, трендовые скачки; low = умеренные выбросы, дубликаты._');

const md = out.join('\n');
writeFileSync(resolve(outDir, 'ANOMALIES.md'), md);
writeFileSync(resolve(outDir, 'ANOMALIES.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    snapshotSize: items.length,
    prevSize: prev.length,
    severity,
    sentinels,
    expensiveOutliers,
    cheapOutliers,
    fakeDiscounts,
    dupes,
    premiumLow,
    dropped,
    jumped,
}, null, 2));

console.log(`OK: severity high=${severity.high} medium=${severity.medium} low=${severity.low} → ${outDir}/ANOMALIES.md`);
exit(0);
