#!/usr/bin/env node
// Detect price anomalies in the WB TV dataset.
//
// Usage:
//   node anomalies.mjs --input report/REPORT.json --out-dir report \
//                      [--prev report/history/prev.json] \
//                      [--models report/MODELS.json] \
//                      [--history report/models-history.json]
//
// Writes ANOMALIES.md + ANOMALIES.json.
//
// Categories (in detection order — earlier ones get dedup priority):
//   1. sentinels      — placeholder prices (1₽, 999999₽, …)
//   2. absurdPrice    — price clearly impossible for diagonal (65" < 15k₽ etc.)
//   3. fakeDiscounts  — discount ≥70% AND the same item has shown that discount
//                       in at least 1 prior snapshot (persistent RRP inflation)
//   4. dupes          — same model code across ≥2 sellers, ≥1.4× spread
//   5. expensiveOutliers — log-price MAD z ≥ 2.5 within its diagonal
//   6. cheapOutliers     — log-price MAD z ≤ −2 within its diagonal
//   7. premiumLow    — premium brand < 60% of diagonal median
//   8. modelMoved    — model-level: median moved ≥15% vs prior snapshot
//                      (uses MODELS.json + models-history.json — more reliable
//                      than per-item id matching which breaks when WB rotates IDs)
//
// Items already classified in a higher category are removed from lower
// categories — no double-counting.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const inputPath = arg('input', 'apify-wb-tv-scraper/report/REPORT.json');
const outDir = arg('out-dir', 'apify-wb-tv-scraper/report');
const prevPath = arg('prev', '');
const modelsPath = arg('models', resolve(outDir, 'MODELS.json'));
const historyPath = arg('history', resolve(outDir, 'models-history.json'));

if (!existsSync(inputPath)) { console.error(`input not found: ${inputPath}`); exit(2); }
mkdirSync(outDir, { recursive: true });

const data = JSON.parse(readFileSync(inputPath, 'utf8'));
const items = data.all || [];
const prev = prevPath && existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, 'utf8')).all || [] : [];
const modelsData = existsSync(modelsPath) ? JSON.parse(readFileSync(modelsPath, 'utf8')) : { models: [] };
const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')).models || {} : {};

// ---- helpers ---------------------------------------------------------------

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mad = (a, med) => median(a.map((x) => Math.abs(x - med))) || 1e-9;
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const safe = (s = '') => String(s).replace(/\|/g, '/');
const trim = (s, n) => safe(s).length > n ? safe(s).slice(0, n - 1) + '…' : safe(s);

const STOP_TOKENS = new Set([
    'телевизор', 'смарт', 'smart', 'android', 'google', 'салют', 'wifi', 'wi-fi',
    'black', 'white', 'серый', 'чёрный', 'full', 'ultra', 'ultrahd', 'miniled',
    'qled', 'oled', 'uhd', 'hdr', 'dvb-t2', '4k', '60гц', '120гц', '144гц',
    'full-hd', 'ultra-hd', 'hd-ready', 'тюнер', 'wi', 'dvb',
    '60hz', '120hz', '144hz', 'dual', 'quad', 'octa', 'mini-led',
    'wi-fi5', 'wi-fi6', 'evo',
    '2024', '2025', '2026',
    '17', '19', '22', '24', '28', '32', '39', '40', '43', '49', '50',
    '55', '58', '60', '65', '70', '75', '77', '82', '85', '98', '100',
]);

function extractModelCode(name = '') {
    const tokens = name.toLowerCase().match(/\b[a-z0-9-]{4,}\b/g) || [];
    for (const t of tokens) {
        if (STOP_TOKENS.has(t)) continue;
        if (!/\d/.test(t)) continue;
        if (!/[a-z]/.test(t)) continue;
        if (/^\d+led$/.test(t)) continue;
        return t;
    }
    return null;
}

// Sane price floor per diagonal (in ₽). Anything below this for the given
// size is almost certainly a typo, sentinel, or scam — flagged separately.
// Values are deliberately generous (true 32" TVs do exist sub-10k₽ etc.) so
// only clearly broken listings get caught.
const PRICE_FLOOR_BY_DIAG = {
    24: 4000, 32: 7000, 39: 9000, 40: 9000, 43: 11000, 49: 14000, 50: 14000,
    55: 18000, 58: 20000, 60: 22000, 65: 25000, 70: 28000, 75: 32000,
    77: 40000, 82: 50000, 85: 60000, 98: 130000, 100: 150000,
};

// ---- detection -------------------------------------------------------------

const claimed = new Set();    // item ids already assigned to a higher-priority bucket
const claim = (it, bucket) => { claimed.add(`${bucket}:${it.id}`); };
const isClaimed = (it) => {
    // An item is claimed if it appears in ANY higher bucket
    for (const c of claimed) if (c.endsWith(`:${it.id}`)) return true;
    return false;
};

// 1) Sentinel prices ---------------------------------------------------------

const SENTINEL_SET = new Set([1, 99, 100, 999, 1000, 9999, 99999, 999999, 9999999, 111111, 123456]);
const sentinels = items.filter((x) => SENTINEL_SET.has(x.price) || x.price < 100);
for (const s of sentinels) claim(s, 'sentinels');

// 2) Absurd price for diagonal ----------------------------------------------

const absurdPrice = items.filter((it) => {
    if (isClaimed(it)) return false;
    if (!it.diagonal || !it.price) return false;
    const floor = PRICE_FLOOR_BY_DIAG[it.diagonal];
    if (!floor) return false;
    return it.price < floor;
});
for (const a of absurdPrice) claim(a, 'absurdPrice');

// 3) Persistent fake discounts ----------------------------------------------
//
// "Fake" if discount ≥70% AND we've seen this same item.id in the previous
// snapshot with the same kind of huge discount → indicates the seller keeps
// a permanently inflated RRP rather than running a genuine sale.

const prevById = new Map(prev.map((x) => [x.id, x]));
const fakeDiscounts = items.filter((it) => {
    if (isClaimed(it)) return false;
    if (!it.discount || !it.originalPrice || !it.price) return false;
    if (it.discount < 70) return false;
    const p = prevById.get(it.id);
    // If no prev snapshot data, fall back to 80%+ as a more conservative cutoff
    if (!p) return it.discount >= 80;
    return p.discount >= 60;
}).sort((a, b) => b.discount - a.discount);
for (const f of fakeDiscounts) claim(f, 'fakeDiscounts');

// 4) Same model code, big spread --------------------------------------------

const byModel = new Map();
for (const it of items) {
    if (!it.brand) continue;
    const code = extractModelCode(it.name);
    if (!code) continue;
    const k = `${it.brand.toLowerCase()}|${code}`;
    if (!byModel.has(k)) byModel.set(k, []);
    byModel.get(k).push(it);
}
const dupes = [];
for (const [k, arr] of byModel) {
    if (arr.length < 2) continue;
    const prices = arr.map((x) => x.price);
    const min = Math.min(...prices), max = Math.max(...prices);
    if (max / min < 1.4) continue;
    const sorted = arr.sort((a, b) => a.price - b.price);
    dupes.push({ key: k, min, max, spread: +(max / min).toFixed(2), arr: sorted });
    for (const it of sorted) claim(it, 'dupes');
}
dupes.sort((a, b) => b.spread - a.spread);

// 5-6) Statistical outliers per diagonal ------------------------------------

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
        if (isClaimed(it)) continue;
        const z = (Math.log(it.price) - med) / (1.4826 * m);
        if (z <= -2) { cheapOutliers.push({ ...it, zscore: +z.toFixed(2), medianPrice }); claim(it, 'cheapOutliers'); }
        else if (z >= 2.5) { expensiveOutliers.push({ ...it, zscore: +z.toFixed(2), medianPrice }); claim(it, 'expensiveOutliers'); }
    }
}
cheapOutliers.sort((a, b) => a.zscore - b.zscore);
expensiveOutliers.sort((a, b) => b.zscore - a.zscore);

// 7) Premium brand at suspiciously low price --------------------------------

const PREMIUM = ['samsung', 'sony', 'lg', 'philips', 'panasonic'];
const premiumLow = [];
for (const it of items) {
    if (isClaimed(it)) continue;
    if (!it.brand || !it.diagonal) continue;
    if (!PREMIUM.includes(it.brand.toLowerCase())) continue;
    const peers = byDiag.get(it.diagonal);
    if (!peers || peers.length < 3) continue;
    const med = median(peers.map((p) => p.price));
    if (it.price < med * 0.6) {
        premiumLow.push({ ...it, medianPrice: Math.round(med) });
        claim(it, 'premiumLow');
    }
}

// 8) Model-level moves (uses models-history.json — robust to ID rotation) ---

const modelMoved = [];
for (const m of (modelsData.models || [])) {
    const h = history[m.key];
    const snaps = h?.snapshots || [];
    if (snaps.length < 2) continue;
    const prev = snaps[snaps.length - 2];
    const cur = snaps[snaps.length - 1];
    if (!prev.med || !cur.med) continue;
    const moveMed = (cur.med / prev.med - 1) * 100;
    const moveMin = prev.min > 0 ? (cur.min / prev.min - 1) * 100 : 0;
    if (Math.abs(moveMed) < 15 && Math.abs(moveMin) < 15) continue;
    modelMoved.push({
        key: m.key,
        brand: m.brand,
        model: m.model,
        diagonal: m.diagonals[0] || null,
        prevMedian: prev.med,
        curMedian: cur.med,
        prevMin: prev.min,
        curMin: cur.min,
        moveMed: +moveMed.toFixed(1),
        moveMin: +moveMin.toFixed(1),
        url: m.items?.[0]?.url || null,
        cheapId: m.items?.[0]?.id || null,
    });
}
modelMoved.sort((a, b) => Math.abs(b.moveMin) - Math.abs(a.moveMin));

// Backward-compat: keep dropped/jumped arrays computed from the model moves so
// existing bot UI buttons keep working.
const dropped = modelMoved.filter((x) => x.moveMin <= -10).map((x) => ({
    id: x.cheapId, name: `${x.brand} ${x.model}`, brand: x.brand,
    price: x.curMin, prevPrice: x.prevMin, diagonal: x.diagonal,
    discount: null, url: x.url, change: x.moveMin,
}));
const jumped = modelMoved.filter((x) => x.moveMin >= 15).map((x) => ({
    id: x.cheapId, name: `${x.brand} ${x.model}`, brand: x.brand,
    price: x.curMin, prevPrice: x.prevMin, diagonal: x.diagonal,
    discount: null, url: x.url, change: x.moveMin,
}));

// ---- Severity --------------------------------------------------------------

const severity = {
    high: sentinels.length + absurdPrice.length + expensiveOutliers.filter((x) => x.zscore >= 5).length,
    medium: fakeDiscounts.length + premiumLow.length + dropped.length + jumped.length,
    low: cheapOutliers.length + expensiveOutliers.filter((x) => x.zscore < 5).length + dupes.length,
};

// ---- Markdown --------------------------------------------------------------

const stamp = new Date().toISOString().replace(/T/, ' ').slice(0, 16) + ' UTC';
const out = [];
const link = (p) => `[${p.id}](${p.url})`;

out.push('# 🚨 WB TV — анализ аномальных цен');
out.push('');
out.push(`> Снимок: **${stamp}** · карточек: **${items.length}**${prev.length ? ` · предыдущий: **${prev.length}**` : ''}${modelsData.models?.length ? ` · моделей: **${modelsData.models.length}**` : ''}`);
out.push('');
out.push(`**Severity:** high=${severity.high}, medium=${severity.medium}, low=${severity.low}`);
out.push('');
out.push('_Каждая карточка попадает максимум в одну категорию (приоритет сверху вниз)._');
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
    '1. Sentinel-цены (заглушки)',
    sentinels,
    '| Цена ₽ | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **${fmt(p.price)}** | ${p.diagonal ? p.diagonal + '"' : '—'} | ${trim(p.brand || '—', 16)} | ${trim(p.name, 60)} | ${link(p)} |`,
);

section(
    '2. Невозможная цена для диагонали',
    absurdPrice,
    '| Цена ₽ | Floor ₽ | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **${fmt(p.price)}** | ${fmt(PRICE_FLOOR_BY_DIAG[p.diagonal])} | ${p.diagonal}" | ${trim(p.brand || '—', 14)} | ${trim(p.name, 55)} | ${link(p)} |`,
);

section(
    '3. Устойчивые фейк-скидки (≥70% и держится snapshot за snapshot)',
    fakeDiscounts.slice(0, 30),
    '| Скидка | Цена ₽ | Было ₽ | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **−${p.discount}%** | ${fmt(p.price)} | ${fmt(p.originalPrice)} | ${p.diagonal ? p.diagonal + '"' : '—'} | ${trim(p.brand || '—', 12)} | ${trim(p.name, 55)} | ${link(p)} |`,
);

out.push(`## 4. Дубликаты модели (≥×1.4 разброс) — ${dupes.length} групп`);
out.push('');
if (dupes.length === 0) { out.push('_Не найдено._'); out.push(''); }
for (const g of dupes.slice(0, 12)) {
    out.push(`### \`${g.key}\` · ×${g.spread} (${fmt(g.min)}₽ → ${fmt(g.max)}₽)`);
    out.push('');
    out.push('| Цена ₽ | Диаг. | Название | Артикул |');
    out.push('|---|---|---|---|');
    for (const p of g.arr) out.push(`| ${fmt(p.price)} | ${p.diagonal || '?'}" | ${trim(p.name, 55)} | ${link(p)} |`);
    out.push('');
}

section(
    '5. Подозрительно ДОРОГИЕ (z ≥ 2.5 по диагонали)',
    expensiveOutliers,
    '| z | Цена ₽ | Медиана | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **+${p.zscore}σ** | ${fmt(p.price)} | ${fmt(p.medianPrice)} | ${p.diagonal}" | ${trim(p.brand || '—', 14)} | ${trim(p.name, 55)} | ${link(p)} |`,
);

section(
    '6. Подозрительно ДЕШЁВЫЕ (z ≤ -2 по диагонали)',
    cheapOutliers,
    '| z | Цена ₽ | Медиана | Диаг. | Бренд | Название | Артикул |',
    (p) => `| **${p.zscore}σ** | ${fmt(p.price)} | ${fmt(p.medianPrice)} | ${p.diagonal}" | ${trim(p.brand || '—', 14)} | ${trim(p.name, 55)} | ${link(p)} |`,
);

section(
    '7. Премиум-бренд по подозрительно низкой цене (< 60% медианы диаг.)',
    premiumLow,
    '| Цена ₽ | Медиана | Диаг. | Бренд | Название | Артикул |',
    (p) => `| ${fmt(p.price)} | ${fmt(p.medianPrice)} | ${p.diagonal}" | ${trim(p.brand || '—', 12)} | ${trim(p.name, 55)} | ${link(p)} |`,
);

out.push(`## 8. Модели с большим движением (≥15% по min или median) — ${modelMoved.length}`);
out.push('');
if (modelMoved.length === 0) {
    out.push('_Снимков недостаточно для трендов (нужно ≥2)._');
    out.push('');
} else {
    out.push('| Δmin | Δmed | Бренд | Модель | Диаг. | Было min | Стало min | Артикул |');
    out.push('|---|---|---|---|---|---|---|---|');
    for (const m of modelMoved.slice(0, 40)) {
        const dmin = m.moveMin > 0 ? `+${m.moveMin}%` : `${m.moveMin}%`;
        const dmed = m.moveMed > 0 ? `+${m.moveMed}%` : `${m.moveMed}%`;
        out.push(`| **${dmin}** | ${dmed} | ${trim(m.brand, 14)} | \`${m.model}\` | ${m.diagonal || '?'}" | ${fmt(m.prevMin)} | ${fmt(m.curMin)} | ${m.cheapId ? `[${m.cheapId}](${m.url})` : '—'} |`);
    }
    out.push('');
}

out.push('---');
out.push('_Сгенерировано `scripts/anomalies.mjs`. Категории взаимоисключающие — карточка попадает только в самую важную. Severity: high = sentinel + absurdPrice + экстремальные выбросы; medium = persistent fake-discounts + премиум-аномалии + резкие движения; low = умеренные выбросы и дубликаты._');

const md = out.join('\n');
writeFileSync(resolve(outDir, 'ANOMALIES.md'), md);
writeFileSync(resolve(outDir, 'ANOMALIES.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    snapshotSize: items.length,
    prevSize: prev.length,
    severity,
    sentinels,
    absurdPrice,
    fakeDiscounts,
    dupes,
    expensiveOutliers,
    cheapOutliers,
    premiumLow,
    modelMoved,
    dropped,        // backward-compat aliases for bot UI
    jumped,
}, null, 2));

console.log(`OK: anomalies high=${severity.high} medium=${severity.medium} low=${severity.low}` +
    ` · sent=${sentinels.length} absurd=${absurdPrice.length} fake=${fakeDiscounts.length} dupes=${dupes.length}` +
    ` exp=${expensiveOutliers.length} cheap=${cheapOutliers.length} prem=${premiumLow.length} moved=${modelMoved.length}`);
exit(0);
