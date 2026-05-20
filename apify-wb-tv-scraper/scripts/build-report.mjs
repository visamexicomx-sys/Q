#!/usr/bin/env node
// Build REPORT.md / REPORT.json from a NDJSON / JSON-array file of powerai/wildberries items.
//
// Usage:
//   node build-report.mjs --input <combined.json|ndjson> --out-dir <dir>
//
// Accepts either NDJSON (one JSON per line) or a single JSON array.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { argv, exit } from 'node:process';

function arg(name, fallback) {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : fallback;
}

const inputPath = arg('input', 'combined.json');
const outDir = arg('out-dir', 'report');

if (!existsSync(inputPath)) {
    console.error(`input not found: ${inputPath}`);
    exit(2);
}
mkdirSync(outDir, { recursive: true });

const text = readFileSync(inputPath, 'utf8').trim();
let raw;
if (text.startsWith('[')) {
    raw = JSON.parse(text);
} else {
    raw = text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const byId = new Map();
for (const r of raw) {
    if (!r?.id) continue;
    if (!byId.has(r.id)) byId.set(r.id, r);
}
const items = [...byId.values()];

const ACCESSORY = [
    'подсветк', 'кронштейн', 'пульт ', 'дистанционн', 'чехол', 'защитн', 'плёнк',
    'пленк', 'кабель', 'переходник', 'адаптер', 'тумба', 'полка', 'настольн',
    'напольн', 'настенн', 'ресивер', 'антенн', 'наклейк', 'матриц', 'шлейф',
    'блок питания', 'инвертор', 'модул', 'шасси', 'панел', 'крышк', 'разъём',
    'разъем', 'плата', 't-con', 'led-планк', 'светодиодн', 'патрон', 'лампа',
    'sat-', 'тв-приставк', 'тв приставк', 'медиаплеер', 'очки', 'усилитель',
    'силиконов', 'микрофон',
];
const TV_HINTS = ['телевизор', 'smart tv', 'smart-tv', 'qled', 'oled', 'uhd', 'led tv'];

function isTV(name = '') {
    const n = name.toLowerCase();
    const hint = TV_HINTS.some((w) => n.includes(w));
    const accessory = ACCESSORY.some((w) => n.includes(w));
    if (accessory && !hint) return false;
    if (hint) return true;
    return /\b(android|smart|led|qled|oled|uhd|4k|hd)\b/i.test(name)
        && /(\d{2,3})\s*(?:[\"″]|дюйм)/i.test(name);
}

function parseDiagonal(name = '') {
    const m = name.match(/(\d{2,3})\s*(?:["″'']|дюйм(?:а|ов|)?|inch|in\b)/i);
    if (m) {
        const v = +m[1];
        if (v >= 15 && v <= 120) return v;
    }
    const buckets = [19, 22, 24, 28, 32, 39, 40, 43, 49, 50, 55, 58, 60, 65, 70, 75, 77, 82, 85, 98, 100];
    for (const d of buckets) {
        const re = new RegExp(`(^|[^\\d])${d}([^\\d]|$)`);
        if (re.test(name)) return d;
    }
    return null;
}

const parseNum = (s) => {
    if (s === null || s === undefined || s === '') return null;
    const n = Number(String(s).replace(/[^\d.,]/g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
};
const parsePct = (s) => {
    if (!s) return null;
    const m = String(s).match(/-?(\d{1,3})\s*%/);
    return m ? +m[1] : null;
};

const norm = items
    .filter((r) => isTV(r.productName))
    .map((r) => {
        const price = parseNum(r.price);
        const original = parseNum(r.originalPrice);
        const discount = original && price && original > price
            ? Math.round((1 - price / original) * 100)
            : parsePct(r.salePercent) || 0;
        return {
            id: r.id,
            name: (r.productName || '').replace(/\s+/g, ' ').trim(),
            brand: (r.brand || '').trim(),
            price,
            originalPrice: original,
            discount,
            rating: parseNum(r.rating),
            reviews: parseNum(r.reviewsCount) || 0,
            diagonal: parseDiagonal(r.productName),
            url: r.detailPageUrl,
        };
    })
    .filter((x) => x.price && x.url)
    .filter((x) => {
        if (!x.diagonal) return x.price >= 3000;
        const d = x.diagonal;
        if (d <= 24) return x.price >= 3000;
        if (d <= 32) return x.price >= 5000;
        if (d <= 43) return x.price >= 9000;
        if (d <= 55) return x.price >= 14000;
        if (d <= 65) return x.price >= 20000;
        return x.price >= 30000;
    });

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const safe = (s = '') => String(s).replace(/\|/g, '/');
const trim = (s, n) => safe(s).length > n ? safe(s).slice(0, n - 1) + '…' : safe(s);

function bestPerDiagonal() {
    const g = new Map();
    for (const it of norm) {
        if (!it.diagonal) continue;
        if (!g.has(it.diagonal)) g.set(it.diagonal, []);
        g.get(it.diagonal).push(it);
    }
    return [...g.entries()].sort((a, b) => a[0] - b[0]).map(([diag, arr]) => {
        arr.sort((a, b) => a.price - b.price);
        return { diag, total: arr.length, best: arr.slice(0, 3) };
    });
}

const bestDeals = [...norm]
    .filter((x) => x.discount >= 30)
    .sort((a, b) => b.discount - a.discount || a.price - b.price)
    .slice(0, 20);

function perBrand() {
    const m = new Map();
    for (const it of norm) {
        if (!it.brand) continue;
        if (!m.has(it.brand)) m.set(it.brand, []);
        m.get(it.brand).push(it);
    }
    const rows = [...m.entries()].map(([brand, arr]) => {
        arr.sort((a, b) => a.price - b.price);
        const prices = arr.map((x) => x.price);
        const sorted = [...prices].sort((a, b) => a - b);
        const median = sorted.length % 2
            ? sorted[(sorted.length - 1) >> 1]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
        return { brand, count: arr.length, min: Math.min(...prices), median, cheapest: arr[0] };
    });
    rows.sort((a, b) => b.count - a.count || a.min - b.min);
    return rows;
}

const stamp = new Date().toISOString().replace(/T/, ' ').slice(0, 16) + ' UTC';
const diagonals = bestPerDiagonal();
const brands = perBrand();

const out = [];
out.push('# Wildberries — лучшие телевизоры по всем диагоналям');
out.push('');
out.push(`> Сгенерировано **${stamp}** · источник: wildberries.ru (Apify Actor *powerai/wildberries-products-search-scraper*).`);
out.push('');
out.push('## TL;DR');
out.push('');
out.push(`- Карточек собрано: **${items.length}**`);
out.push(`- После фильтра аксессуаров — реальных телевизоров: **${norm.length}**`);
out.push(`- Распознано диагоналей: **${diagonals.length}**`);
out.push(`- Брендов: **${brands.length}**`);
out.push(`- Предложений со скидкой ≥ 30%: **${bestDeals.length}**`);
out.push('');

out.push('## 1. Лучшие предложения по каждой диагонали (топ-3)');
out.push('');
for (const grp of diagonals) {
    out.push(`### ${grp.diag}"  ·  всего ${grp.total} карточек`);
    out.push('');
    out.push('| # | Цена, ₽ | Скидка | Без скидки | ★ | Отзывов | Бренд | Название | Артикул |');
    out.push('|---|---------|--------|------------|---|---------|-------|----------|---------|');
    grp.best.forEach((p, i) => {
        out.push(`| ${i + 1} | **${fmt(p.price)}** | ${p.discount ? '−' + p.discount + '%' : '—'} | ${p.originalPrice ? fmt(p.originalPrice) : '—'} | ${p.rating ?? '—'} | ${p.reviews || 0} | ${trim(p.brand || '—', 16)} | ${trim(p.name, 70)} | [${p.id}](${p.url}) |`);
    });
    out.push('');
}

out.push('## 2. Лучшие скидки (топ-20, ≥30%)');
out.push('');
out.push('| # | Скидка | Цена, ₽ | Было, ₽ | Диаг. | Бренд | Название | Артикул |');
out.push('|---|--------|---------|---------|-------|-------|----------|---------|');
bestDeals.forEach((p, i) => {
    out.push(`| ${i + 1} | **−${p.discount}%** | ${fmt(p.price)} | ${p.originalPrice ? fmt(p.originalPrice) : '—'} | ${p.diagonal ? p.diagonal + '"' : '—'} | ${trim(p.brand || '—', 14)} | ${trim(p.name, 70)} | [${p.id}](${p.url}) |`);
});
out.push('');

out.push('## 3. Самые дешёвые модели по каждому бренду');
out.push('');
out.push('| Бренд | Карточек | Мин. цена, ₽ | Медиана, ₽ | Самый дешёвый |');
out.push('|-------|----------|--------------|------------|----------------|');
for (const b of brands) {
    out.push(`| ${trim(b.brand, 22)} | ${b.count} | **${fmt(b.min)}** | ${fmt(b.median)} | [${b.cheapest.id} — ${trim(b.cheapest.name, 50)}](${b.cheapest.url}) |`);
}
out.push('');

out.push('## 4. Полный отфильтрованный каталог, сортировка по цене');
out.push('');
out.push('| Цена, ₽ | Скидка | Диаг. | ★ | Бренд | Название | Артикул |');
out.push('|---------|--------|-------|---|-------|----------|---------|');
[...norm].sort((a, b) => a.price - b.price).forEach((p) => {
    out.push(`| ${fmt(p.price)} | ${p.discount ? '−' + p.discount + '%' : '—'} | ${p.diagonal ? p.diagonal + '"' : '—'} | ${p.rating ?? '—'} | ${trim(p.brand || '—', 16)} | ${trim(p.name, 70)} | [${p.id}](${p.url}) |`);
});
out.push('');
out.push('---');
out.push(`_Сгенерировано из ${items.length} карточек, оставлено ${norm.length} реальных телевизоров. Цены и наличие проверяйте по ссылкам._`);

const md = out.join('\n');
writeFileSync(resolve(outDir, 'REPORT.md'), md);
writeFileSync(resolve(outDir, 'REPORT.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalRaw: items.length,
    totalTVs: norm.length,
    byDiagonal: diagonals,
    bestDiscounts: bestDeals,
    byBrand: brands,
    all: norm,
}, null, 2));

console.log(`OK: ${norm.length} TVs across ${diagonals.length} diagonals → ${outDir}/REPORT.md`);
