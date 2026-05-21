#!/usr/bin/env node
// Group WB TV items by model code and track minimum prices over time.
//
// Usage:
//   node models.mjs --input report/REPORT.json --out-dir report [--history report/models-history.json]
//
// Writes:
//   <out-dir>/MODELS.md           — human-readable model tracker
//   <out-dir>/MODELS.json         — full structured data
//   <history>                     — persistent per-model min/max/last seen (in place)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const inputPath = arg('input', 'apify-wb-tv-scraper/report/REPORT.json');
const outDir = arg('out-dir', 'apify-wb-tv-scraper/report');
const historyPath = arg('history', resolve(outDir, 'models-history.json'));

if (!existsSync(inputPath)) { console.error(`input not found: ${inputPath}`); exit(2); }
mkdirSync(outDir, { recursive: true });

const data = JSON.parse(readFileSync(inputPath, 'utf8'));
const items = data.all || [];

// Tokens that look like model codes (letters + digits, length >= 4),
// excluding generic specs and common diagonal numbers.
const STOP_TOKENS = new Set([
    'телевизор', 'смарт', 'smart', 'android', 'google', 'салют', 'wifi', 'wi-fi',
    'black', 'white', 'серый', 'чёрный', 'full', 'ultra', 'ultrahd', 'miniled',
    'qled', 'oled', 'uhd', 'hdr', 'dvb-t2', '4k', '60гц', '120гц', '144гц',
    'full-hd', 'ultra-hd', 'hd-ready', 'тюнер', 'wi', 'dvb',
    '60hz', '120hz', '144hz', 'dual', 'quad', 'octa', 'mini-led',
    'wi-fi5', 'wi-fi6', 'evo',
    '2024', '2025', '2026',
    // common diagonals
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
        if (/^\d+(дюйм(а|ов)?|inch)$/.test(t)) continue;
        return t;
    }
    return null;
}

const groups = new Map();
let withoutModel = 0;
for (const it of items) {
    if (!it.brand || !it.price) { withoutModel++; continue; }
    const code = extractModelCode(it.name);
    if (!code) { withoutModel++; continue; }
    const key = `${it.brand.toLowerCase()}|${code}`;
    if (!groups.has(key)) {
        groups.set(key, { key, brand: it.brand, model: code, items: [], diagonals: new Set() });
    }
    const g = groups.get(key);
    g.items.push(it);
    if (it.diagonal) g.diagonals.add(it.diagonal);
}

let history = {};
if (existsSync(historyPath)) {
    try {
        const raw = JSON.parse(readFileSync(historyPath, 'utf8'));
        history = raw.models || {};
    } catch {}
}
const now = new Date().toISOString();

function median(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const result = [];
for (const g of groups.values()) {
    const prices = g.items.map((x) => x.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const med = Math.round(median(prices));
    const floor = Math.round(med * 0.8);
    const dealItems = g.items.filter((x) => x.price < floor).sort((a, b) => a.price - b.price);

    const h = history[g.key] || { firstSeen: now, snapshots: [] };
    const allTimeMin = h.allTimeMin ?? Infinity;
    const newAllTimeLow = min < allTimeMin;
    if (newAllTimeLow) { h.allTimeMin = min; h.allTimeMinAt = now; }
    if (h.allTimeMax == null || max > h.allTimeMax) { h.allTimeMax = max; }
    const drop = h.lastMin && h.lastMin > 0 ? +((min - h.lastMin) / h.lastMin * 100).toFixed(1) : null;
    h.snapshots = [...(h.snapshots || []), { at: now, min, med, sellers: g.items.length }].slice(-30);
    h.lastSeen = now;
    h.lastMin = min;
    h.lastMedian = med;
    history[g.key] = h;

    result.push({
        key: g.key,
        brand: g.brand,
        model: g.model,
        diagonals: [...g.diagonals].sort((a, b) => a - b),
        sellers: g.items.length,
        min,
        max,
        median: med,
        floor,
        allTimeMin: h.allTimeMin,
        allTimeMinAt: h.allTimeMinAt,
        newAllTimeLow,
        dropPct: drop,
        items: [...g.items].sort((a, b) => a.price - b.price),
        dealItems,
    });
}

writeFileSync(historyPath, JSON.stringify({ updatedAt: now, models: history }, null, 2));

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const safe = (s = '') => String(s).replace(/\|/g, '/');
const trim = (s, n) => safe(s).length > n ? safe(s).slice(0, n - 1) + '…' : safe(s);

const multiSeller = result.filter((r) => r.sellers >= 2).sort((a, b) => b.sellers - a.sellers || a.min - b.min);
const dealsWithin = result.filter((r) => r.dealItems.length > 0).sort((a, b) => a.dealItems[0].price / a.median - b.dealItems[0].price / b.median);
const newLows = result.filter((r) => r.newAllTimeLow);
const droppedMin = result.filter((r) => r.dropPct != null && r.dropPct <= -10).sort((a, b) => a.dropPct - b.dropPct);

const out = [];
out.push('# 🛰 WB TV — отслеживание цен по моделям');
out.push('');
out.push(`> Снимок: **${now.slice(0, 16).replace('T', ' ')} UTC** · моделей: **${result.length}** · карточек: **${items.length}** · без распознанного кода модели: ${withoutModel}`);
out.push('');
out.push(`- Моделей с ≥2 продавцами: **${multiSeller.length}**`);
out.push(`- Моделей с предложением ниже своей медианы на 20%+ : **${dealsWithin.length}**`);
out.push(`- Новых all-time low за этот прогон: **${newLows.length}**`);
out.push(`- Моделей, у которых текущий мин упал ≥10% vs прошлый снимок: **${droppedMin.length}**`);
out.push('');

out.push('## 1. Модели по числу продавцов');
out.push('');
out.push('Если одна модель продаётся ≥2 артикулов — там и видно реальный «коридор» цены и потенциал торга.');
out.push('');
out.push('| Модель | Бренд | Диаг. | Продавцов | Мин ₽ | Медиана ₽ | Макс ₽ | ATL ₽ | Δ vs прошлый | Самый дешёвый |');
out.push('|--------|-------|-------|-----------|-------|-----------|--------|-------|--------------|----------------|');
for (const r of multiSeller) {
    const cheap = r.items[0];
    const drop = r.dropPct == null ? '—' : (r.dropPct > 0 ? `+${r.dropPct}%` : `${r.dropPct}%`);
    const atl = r.newAllTimeLow ? `🟢 **${fmt(r.allTimeMin)}**` : fmt(r.allTimeMin);
    out.push(`| \`${r.model}\` | ${trim(r.brand, 16)} | ${r.diagonals.join('/')}" | ${r.sellers} | **${fmt(r.min)}** | ${fmt(r.median)} | ${fmt(r.max)} | ${atl} | ${drop} | [${cheap.id} — ${fmt(cheap.price)}₽](${cheap.url}) |`);
}
out.push('');

out.push(`## 2. Сделки ниже медианы своей же модели (item < 80% медианы) — ${dealsWithin.length}`);
out.push('');
out.push('Эти карточки стоят меньше, чем типичный артикул той же модели — кандидаты «купить сейчас».');
out.push('');
for (const r of dealsWithin.slice(0, 40)) {
    out.push(`### \`${r.model}\` · ${r.brand} · ${r.diagonals.join('/')}" · медиана **${fmt(r.median)} ₽**`);
    out.push('');
    out.push('| Цена ₽ | Δ от медианы | Артикул |');
    out.push('|--------|--------------|---------|');
    for (const it of r.dealItems) {
        const diff = Math.round((1 - it.price / r.median) * 100);
        out.push(`| **${fmt(it.price)}** | −${diff}% | [${it.id} — ${trim(it.name, 60)}](${it.url}) |`);
    }
    out.push('');
}

out.push(`## 3. Новый all-time low — ${newLows.length}`);
out.push('');
out.push('Модели, у которых в этом снимке зафиксирован новый исторический минимум (или это первый раз, когда модель попала в трекер).');
out.push('');
out.push('| Модель | Бренд | Диаг. | Текущий мин ₽ | Прошлый мин ₽ | Самый дешёвый |');
out.push('|--------|-------|-------|---------------|---------------|----------------|');
for (const r of newLows.slice(0, 80)) {
    const cheap = r.items[0];
    const prev = history[r.key]?.snapshots?.slice(-2, -1)?.[0]?.min;
    out.push(`| \`${r.model}\` | ${trim(r.brand, 16)} | ${r.diagonals.join('/')}" | **${fmt(r.min)}** | ${prev ? fmt(prev) : 'нет данных'} | [${cheap.id}](${cheap.url}) |`);
}
out.push('');

out.push(`## 4. Минимум упал ≥10% vs прошлый прогон — ${droppedMin.length}`);
out.push('');
if (droppedMin.length === 0) {
    out.push('_Пусто — либо это первый прогон, либо ни одна модель не подешевела на 10%+._');
} else {
    out.push('| Δ | Модель | Бренд | Диаг. | Текущий мин ₽ | Был мин ₽ | Самый дешёвый |');
    out.push('|---|--------|-------|-------|---------------|-----------|----------------|');
    for (const r of droppedMin) {
        const cheap = r.items[0];
        const prevMin = history[r.key].snapshots.slice(-2, -1)[0]?.min || 0;
        out.push(`| **${r.dropPct}%** | \`${r.model}\` | ${trim(r.brand, 16)} | ${r.diagonals.join('/')}" | **${fmt(r.min)}** | ${fmt(prevMin)} | [${cheap.id}](${cheap.url}) |`);
    }
}
out.push('');

out.push('---');
out.push('_Сгенерировано `scripts/models.mjs`. История моделей в `report/models-history.json` — обновляется каждый прогон, хранит до 30 последних снимков на модель. Чтобы стартовать с нуля — удалите этот файл._');

writeFileSync(resolve(outDir, 'MODELS.md'), out.join('\n'));
writeFileSync(resolve(outDir, 'MODELS.json'), JSON.stringify({
    generatedAt: now,
    totalModels: result.length,
    withoutModelCode: withoutModel,
    multiSeller: multiSeller.length,
    dealsWithin: dealsWithin.length,
    newAllTimeLows: newLows.length,
    droppedMin: droppedMin.length,
    models: result,
}, null, 2));

console.log(`OK: ${result.length} models · ${multiSeller.length} multi-seller · ${dealsWithin.length} with deals · ${newLows.length} new ATL · ${droppedMin.length} dropped ≥10%`);
exit(0);
