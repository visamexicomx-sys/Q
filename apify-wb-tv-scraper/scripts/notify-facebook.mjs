#!/usr/bin/env node
// Post a WB TV scrape summary to a Facebook Page and Instagram Business account
// via the Meta Graph API.
//
// Required env vars:
//   FB_PAGE_ACCESS_TOKEN  — long-lived page access token from Graph API
//   FB_PAGE_ID            — numeric page ID (optional; auto-detected from token)
//
// Optional env vars:
//   IG_POST_IMAGE_URL     — publicly accessible image URL to attach to Instagram post
//                           (Instagram API requires media; skipped if not set)
//
// Usage:
//   node notify-facebook.mjs \
//     --models report/MODELS.json \
//     --report report/REPORT.json \
//     --anomalies report/ANOMALIES.json \
//     [--repo-url https://github.com/owner/repo/tree/branch/path] \
//     [--dry-run]
//
// Exits 0 silently when env vars are missing so the workflow can no-op gracefully.

import { readFileSync, existsSync } from 'node:fs';
import { argv, env, exit } from 'node:process';

const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);

const modelsPath    = arg('models',     'apify-wb-tv-scraper/report/MODELS.json');
const reportPath    = arg('report',     'apify-wb-tv-scraper/report/REPORT.json');
const anomaliesPath = arg('anomalies',  'apify-wb-tv-scraper/report/ANOMALIES.json');
const repoUrl       = arg('repo-url',   '');
const dryRun        = has('dry-run');

const token      = env.FB_PAGE_ACCESS_TOKEN;
const pageId     = env.FB_PAGE_ID || null;
const igImageUrl = env.IG_POST_IMAGE_URL || null;

const FB_API = 'https://graph.facebook.com/v21.0';

if (!dryRun && !token) {
    console.log('facebook/instagram: FB_PAGE_ACCESS_TOKEN not set — skipping');
    exit(0);
}
if (!existsSync(modelsPath) || !existsSync(reportPath)) {
    console.error('facebook/instagram: required input files missing — skipping');
    exit(0);
}

const models    = JSON.parse(readFileSync(modelsPath, 'utf8'));
const report    = JSON.parse(readFileSync(reportPath, 'utf8'));
const anomalies = existsSync(anomaliesPath) ? JSON.parse(readFileSync(anomaliesPath, 'utf8')) : null;

const fmt  = (n) => Math.round(n).toLocaleString('ru-RU');
const trim = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

// Strip HTML tags and decode common entities for plain-text posts.
function htmlToText(html = '') {
    return html
        .replace(/<\/?(b|i|code|a)[^>]*>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

const allModels   = models.models || [];
const newAtls     = allModels.filter((m) => m.newAllTimeLow);
const dealsWithin = allModels
    .filter((m) => m.dealItems?.length)
    .map((m) => m.dealItems.map((d) => ({ ...d, model: m })))
    .flat()
    .sort((a, b) => (a.price / a.model.median) - (b.price / b.model.median));
const dropped = allModels
    .filter((m) => m.dropPct != null && m.dropPct <= -10)
    .sort((a, b) => a.dropPct - b.dropPct);
const stamp = (models.generatedAt || new Date().toISOString()).slice(0, 16).replace('T', ' ');

// ---------- message builders ----------

function buildSummary() {
    const byBrand = (report.byBrand || []).slice(0, 12);
    const lines = [];
    lines.push(`📺 WB TV — снимок ${stamp} UTC`);
    lines.push('');
    lines.push(`Карточек в выборке: ${report.totalReal ?? report.all?.length ?? 0}`);
    lines.push(`Моделей в трекере: ${allModels.length} · с ≥2 продавцами: ${models.multiSeller ?? '—'}`);
    lines.push(`Новых all-time low: ${newAtls.length} · сделок ниже медианы модели: ${dealsWithin.length}`);
    if (anomalies?.summary) {
        const s = anomalies.summary;
        lines.push(`Аномалии: high=${s.high || 0} · medium=${s.medium || 0} · low=${s.low || 0}`);
    }
    lines.push('');
    lines.push('По брендам:');
    for (const b of byBrand) {
        lines.push(`• ${b.brand} — ${b.count} карт., мин ${fmt(b.min)} ₽, медиана ${fmt(b.median)} ₽`);
    }
    if (repoUrl) {
        lines.push('');
        lines.push(`Подробно: ${repoUrl}/apify-wb-tv-scraper/report/`);
    }
    return lines.join('\n');
}

function buildAtl() {
    if (!newAtls.length) return null;
    const lines = [];
    lines.push(`🟢 Новые all-time low — ${newAtls.length}`);
    lines.push('Модели, у которых сегодня зафиксирован новый исторический минимум.');
    lines.push('');
    const top = [...newAtls].sort((a, b) => b.sellers - a.sellers || a.min - b.min).slice(0, 25);
    for (const r of top) {
        const cheap = r.items[0];
        lines.push(`• ${r.model} · ${r.brand} ${r.diagonals.join('/')}" · ${fmt(r.min)} ₽ · ${cheap.url}`);
    }
    if (newAtls.length > top.length) lines.push(`…и ещё ${newAtls.length - top.length} моделей.`);
    return lines.join('\n');
}

function buildDeals() {
    if (!dealsWithin.length) return null;
    const lines = [];
    lines.push(`💸 Сделки: цена ниже 80% медианы своей же модели — ${dealsWithin.length}`);
    lines.push('Кандидаты «купить сейчас»: тот же товар у других продавцов стоит заметно дороже.');
    lines.push('');
    for (const d of dealsWithin.slice(0, 25)) {
        const diff = Math.round((1 - d.price / d.model.median) * 100);
        lines.push(`• -${diff}% · ${d.model.model} · ${d.model.brand} ${d.model.diagonals.join('/')}" · ${fmt(d.price)} ₽ (медиана ${fmt(d.model.median)}) · ${d.url}`);
    }
    if (dealsWithin.length > 25) lines.push(`…и ещё ${dealsWithin.length - 25} предложений.`);
    return lines.join('\n');
}

function buildDrops() {
    if (!dropped.length) return null;
    const lines = [];
    lines.push(`📉 Подешевели ≥10% с прошлого снимка — ${dropped.length}`);
    lines.push('');
    for (const r of dropped.slice(0, 20)) {
        const cheap = r.items[0];
        lines.push(`• ${r.dropPct}% · ${r.model} · ${r.brand} ${r.diagonals.join('/')}" · ${fmt(r.min)} ₽ · ${cheap.url}`);
    }
    return lines.join('\n');
}

// ---------- resolve IDs ----------

async function resolvePageId() {
    if (pageId) return pageId;
    const resp = await fetch(`${FB_API}/me?fields=id,name&access_token=${token}`);
    const body = await resp.json();
    if (!resp.ok || body.error) throw new Error(`/me failed — ${body.error?.message ?? resp.status}`);
    console.log(`facebook: resolved page "${body.name}" (id=${body.id})`);
    return body.id;
}

async function resolveIgUserId(pid) {
    const resp = await fetch(`${FB_API}/${pid}?fields=instagram_business_account&access_token=${token}`);
    const body = await resp.json();
    if (!resp.ok || body.error) throw new Error(`/page/instagram failed — ${body.error?.message ?? resp.status}`);
    const igId = body.instagram_business_account?.id;
    if (!igId) throw new Error('No Instagram Business Account linked to this Facebook Page');
    console.log(`instagram: resolved ig_user_id=${igId}`);
    return igId;
}

// ---------- Facebook post ----------

async function postToFacebook(pid, message) {
    if (dryRun) {
        console.log('---DRY RUN Facebook---');
        console.log(message);
        console.log('');
        return;
    }
    const resp = await fetch(`${FB_API}/${pid}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: token }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || body.error) {
        console.error(`facebook: post failed: ${resp.status} ${JSON.stringify(body)}`);
        exit(1);
    }
    console.log(`facebook: posted id=${body.id}`);
    await new Promise((r) => setTimeout(r, 500));
}

// ---------- Instagram post ----------
// Instagram requires an image URL. Posts the first (summary) message as caption.

async function postToInstagram(igId, caption) {
    if (dryRun) {
        console.log('---DRY RUN Instagram---');
        console.log(`image: ${igImageUrl}`);
        console.log(caption);
        console.log('');
        return;
    }

    // Step 1: create media container
    const createResp = await fetch(`${FB_API}/${igId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_url: igImageUrl,
            caption,
            access_token: token,
        }),
    });
    const createBody = await createResp.json().catch(() => ({}));
    if (!createResp.ok || createBody.error) {
        console.error(`instagram: create media failed: ${createResp.status} ${JSON.stringify(createBody)}`);
        exit(1);
    }
    const creationId = createBody.id;
    console.log(`instagram: media container created id=${creationId}`);

    // Step 2: publish
    const pubResp = await fetch(`${FB_API}/${igId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationId, access_token: token }),
    });
    const pubBody = await pubResp.json().catch(() => ({}));
    if (!pubResp.ok || pubBody.error) {
        console.error(`instagram: publish failed: ${pubResp.status} ${JSON.stringify(pubBody)}`);
        exit(1);
    }
    console.log(`instagram: published id=${pubBody.id}`);
}

// ---------- main ----------

const messages = [buildSummary(), buildDrops(), buildDeals(), buildAtl()].filter(Boolean);

const pid = dryRun ? 'dry-run' : await resolvePageId();

// Post all messages to Facebook
for (const m of messages) {
    await postToFacebook(pid, m);
}
console.log(`facebook: posted ${messages.length} message(s)${dryRun ? ' (dry-run)' : ''}`);

// Post summary to Instagram (requires image URL)
if (igImageUrl) {
    const igId = dryRun ? 'dry-run' : await resolveIgUserId(pid);
    // Instagram caption limit is 2200 chars; use first message (summary)
    const caption = messages[0].slice(0, 2200);
    await postToInstagram(igId, caption);
    console.log(`instagram: posted${dryRun ? ' (dry-run)' : ''}`);
} else {
    console.log('instagram: IG_POST_IMAGE_URL not set — skipping Instagram post');
}
