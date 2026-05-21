#!/usr/bin/env node
// Render REPORT.md from an already-normalized REPORT.json (no raw scrape needed).
// Used when REPORT.json was produced or post-filtered externally.
//
// Usage:
//   node render-report.mjs --input report/REPORT.json --out report/REPORT.md

import { readFileSync, writeFileSync } from 'node:fs';
import { argv } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const inputPath = arg('input', 'apify-wb-tv-scraper/report/REPORT.json');
const outPath = arg('out', 'apify-wb-tv-scraper/report/REPORT.md');
const title = arg('title', 'Wildberries — телевизоры по целевым брендам');

const rep = JSON.parse(readFileSync(inputPath, 'utf8'));
const items = rep.all || [];
const byBrand = rep.byBrand || [];
const bestPerDiagonal = rep.bestPerDiagonal || [];
const bestDeals = rep.bestDeals || [];

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const safe = (s = '') => String(s).replace(/\|/g, '/');
const trim = (s, n) => safe(s).length > n ? safe(s).slice(0, n - 1) + '…' : safe(s);
const stamp = (rep.generatedAt || new Date().toISOString()).slice(0, 16).replace('T', ' ') + ' UTC';

const out = [];
out.push(`# ${title}`);
out.push('');
out.push(`> Снимок: **${stamp}** · карточек: **${items.length}** · диагоналей: **${bestPerDiagonal.length}** · брендов: **${byBrand.length}**`);
out.push('');

out.push('## TL;DR — по брендам');
out.push('');
out.push('| Бренд | Карточек | Мин ₽ | Медиана ₽ | Самый дешёвый |');
out.push('|-------|----------|-------|-----------|----------------|');
for (const b of byBrand) {
    out.push(`| **${trim(b.brand, 22)}** | ${b.count} | **${fmt(b.min)}** | ${fmt(b.median)} | [${b.cheapest.id} — ${trim(b.cheapest.name, 50)}](${b.cheapest.url}) |`);
}
out.push('');

out.push('## Топ-3 по каждой диагонали');
out.push('');
for (const { diag, total, best } of bestPerDiagonal) {
    out.push(`### ${diag}" — ${total} карточек`);
    out.push('');
    out.push('| # | Цена ₽ | Скидка | RRP ₽ | ★ | Отзывов | Бренд | Название | Артикул |');
    out.push('|---|--------|--------|-------|---|---------|-------|----------|---------|');
    best.forEach((p, i) => {
        out.push(`| ${i + 1} | **${fmt(p.price)}** | ${p.discount ? '−' + p.discount + '%' : '—'} | ${p.originalPrice ? fmt(p.originalPrice) : '—'} | ${p.rating ?? '—'} | ${p.reviews || 0} | ${trim(p.brand || '—', 16)} | ${trim(p.name, 70)} | [${p.id}](${p.url}) |`);
    });
    out.push('');
}

if (bestDeals.length) {
    out.push(`## Топ-скидки (≥30%) — ${bestDeals.length}`);
    out.push('');
    out.push('| # | Скидка | Цена ₽ | RRP ₽ | Диаг. | Бренд | Название | Артикул |');
    out.push('|---|--------|--------|-------|-------|-------|----------|---------|');
    bestDeals.forEach((p, i) => {
        out.push(`| ${i + 1} | **−${p.discount}%** | ${fmt(p.price)} | ${p.originalPrice ? fmt(p.originalPrice) : '—'} | ${p.diagonal ? p.diagonal + '"' : '—'} | ${trim(p.brand || '—', 14)} | ${trim(p.name, 70)} | [${p.id}](${p.url}) |`);
    });
    out.push('');
}

out.push('---');
out.push(`_Источник: wildberries.ru (актор powerai/wildberries-products-search-scraper)._`);

writeFileSync(outPath, out.join('\n'));
console.log(`OK: ${items.length} items → ${outPath}`);
