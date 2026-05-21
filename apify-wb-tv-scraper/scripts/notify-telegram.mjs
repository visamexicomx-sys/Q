#!/usr/bin/env node
// Post a WB TV scrape summary to a Telegram channel.
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN  — from @BotFather (123456:ABCdef…)
//   TELEGRAM_CHAT_ID    — @channel_name OR -1001234567890
//
// Usage:
//   node notify-telegram.mjs \
//     --models report/MODELS.json \
//     --report report/REPORT.json \
//     --anomalies report/ANOMALIES.json \
//     [--repo-url https://github.com/owner/repo/tree/branch/path] \
//     [--dry-run]
//
// Designed to be silent and exit 0 when env vars are missing (so the workflow
// can no-op gracefully when Telegram isn't configured).

import { readFileSync, existsSync } from 'node:fs';
import { argv, env, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);

const modelsPath = arg('models', 'apify-wb-tv-scraper/report/MODELS.json');
const reportPath = arg('report', 'apify-wb-tv-scraper/report/REPORT.json');
const anomaliesPath = arg('anomalies', 'apify-wb-tv-scraper/report/ANOMALIES.json');
const repoUrl = arg('repo-url', '');
const dryRun = has('dry-run');

const token = env.TELEGRAM_BOT_TOKEN;
const chatId = env.TELEGRAM_CHAT_ID;

if (!dryRun && (!token || !chatId)) {
    console.log('telegram: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping');
    exit(0);
}
if (!existsSync(modelsPath) || !existsSync(reportPath)) {
    console.error('telegram: required input files missing — skipping');
    exit(0);
}

const models = JSON.parse(readFileSync(modelsPath, 'utf8'));
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const anomalies = existsSync(anomaliesPath) ? JSON.parse(readFileSync(anomaliesPath, 'utf8')) : null;

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const esc = (s = '') => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trim = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

const allModels = models.models || [];
const newAtls = allModels.filter((m) => m.newAllTimeLow);
const dealsWithin = allModels
    .filter((m) => m.dealItems?.length)
    .map((m) => m.dealItems.map((d) => ({ ...d, model: m })))
    .flat()
    .sort((a, b) => (a.price / a.model.median) - (b.price / b.model.median));
const dropped = allModels.filter((m) => m.dropPct != null && m.dropPct <= -10).sort((a, b) => a.dropPct - b.dropPct);
const stamp = (models.generatedAt || new Date().toISOString()).slice(0, 16).replace('T', ' ');

// ---------- message 1: SUMMARY ----------
function buildSummary() {
    const byBrand = (report.byBrand || []).slice(0, 12);
    const lines = [];
    lines.push(`<b>📺 WB TV — снимок ${esc(stamp)} UTC</b>`);
    lines.push('');
    lines.push(`Карточек в выборке: <b>${report.totalReal ?? report.all?.length ?? 0}</b>`);
    lines.push(`Моделей в трекере: <b>${allModels.length}</b> · с ≥2 продавцами: <b>${models.multiSeller ?? '—'}</b>`);
    lines.push(`Новых all-time low: <b>${newAtls.length}</b> · сделок ниже медианы модели: <b>${dealsWithin.length}</b>`);
    if (anomalies?.summary) {
        const s = anomalies.summary;
        lines.push(`Аномалии: high=<b>${s.high || 0}</b> · medium=<b>${s.medium || 0}</b> · low=<b>${s.low || 0}</b>`);
    }
    lines.push('');
    lines.push('<b>По брендам:</b>');
    for (const b of byBrand) {
        lines.push(`• <b>${esc(b.brand)}</b> — ${b.count} карт., мин <b>${fmt(b.min)} ₽</b>, медиана ${fmt(b.median)} ₽`);
    }
    if (repoUrl) {
        lines.push('');
        lines.push(`Подробно: ${link('MODELS.md', repoUrl + '/apify-wb-tv-scraper/report/MODELS.md')} · ${link('REPORT.md', repoUrl + '/apify-wb-tv-scraper/report/REPORT.md')} · ${link('ANOMALIES.md', repoUrl + '/apify-wb-tv-scraper/report/ANOMALIES.md')}`);
    }
    return lines.join('\n');
}

// ---------- message 2: NEW ATL ----------
function buildAtl() {
    if (!newAtls.length) return null;
    const lines = [];
    lines.push(`<b>🟢 Новые all-time low — ${newAtls.length}</b>`);
    lines.push(`<i>Модели, у которых сегодня зафиксирован новый исторический минимум.</i>`);
    lines.push('');
    const top = [...newAtls].sort((a, b) => b.sellers - a.sellers || a.min - b.min).slice(0, 25);
    for (const r of top) {
        const cheap = r.items[0];
        const diag = r.diagonals.join('/') + '"';
        lines.push(`• <code>${esc(r.model)}</code> · ${esc(r.brand)} ${diag} · <b>${fmt(r.min)} ₽</b> · ${link('арт. ' + cheap.id, cheap.url)}`);
    }
    if (newAtls.length > top.length) {
        lines.push('');
        lines.push(`<i>…и ещё ${newAtls.length - top.length} моделей.</i>`);
    }
    return lines.join('\n');
}

// ---------- message 3: DEALS WITHIN MODEL ----------
function buildDeals() {
    if (!dealsWithin.length) return null;
    const lines = [];
    lines.push(`<b>💸 Сделки: цена ниже 80% медианы своей же модели — ${dealsWithin.length}</b>`);
    lines.push(`<i>Кандидаты «купить сейчас»: тот же товар у других продавцов стоит заметно дороже.</i>`);
    lines.push('');
    const top = dealsWithin.slice(0, 25);
    for (const d of top) {
        const diff = Math.round((1 - d.price / d.model.median) * 100);
        const diag = d.model.diagonals.join('/') + '"';
        lines.push(`• −<b>${diff}%</b> · <code>${esc(d.model.model)}</code> · ${esc(d.model.brand)} ${diag} · <b>${fmt(d.price)} ₽</b> (медиана ${fmt(d.model.median)}) · ${link('арт. ' + d.id, d.url)}`);
    }
    if (dealsWithin.length > top.length) {
        lines.push('');
        lines.push(`<i>…и ещё ${dealsWithin.length - top.length} предложений.</i>`);
    }
    return lines.join('\n');
}

// ---------- message 4: BIG DROPS vs prev snapshot ----------
function buildDrops() {
    if (!dropped.length) return null;
    const lines = [];
    lines.push(`<b>📉 Подешевели ≥10% с прошлого снимка — ${dropped.length}</b>`);
    lines.push('');
    for (const r of dropped.slice(0, 20)) {
        const cheap = r.items[0];
        const diag = r.diagonals.join('/') + '"';
        lines.push(`• <b>${r.dropPct}%</b> · <code>${esc(r.model)}</code> · ${esc(r.brand)} ${diag} · <b>${fmt(r.min)} ₽</b> · ${link('арт. ' + cheap.id, cheap.url)}`);
    }
    return lines.join('\n');
}

const messages = [buildSummary(), buildDrops(), buildDeals(), buildAtl()].filter(Boolean);

async function send(text) {
    // Telegram caps text at 4096 chars; split on \n\n boundaries if needed.
    const chunks = [];
    let buf = '';
    for (const para of text.split('\n\n')) {
        if ((buf + '\n\n' + para).length > 3800 && buf) {
            chunks.push(buf);
            buf = para;
        } else {
            buf = buf ? buf + '\n\n' + para : para;
        }
    }
    if (buf) chunks.push(buf);

    for (const c of chunks) {
        if (dryRun) {
            console.log('---DRY RUN---');
            console.log(c);
            console.log('');
            continue;
        }
        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: c,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok || !body.ok) {
            console.error(`telegram: send failed: ${resp.status} ${JSON.stringify(body)}`);
            exit(1);
        }
        // Pace ourselves: Telegram allows ~30 msg/sec to channels but be polite
        await new Promise((r) => setTimeout(r, 400));
    }
}

for (const m of messages) {
    await send(m);
}

console.log(`telegram: posted ${messages.length} message(s)${dryRun ? ' (dry-run)' : ''}`);
