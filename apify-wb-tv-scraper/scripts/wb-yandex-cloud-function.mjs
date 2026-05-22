// Yandex Cloud Function entrypoint — scrape WB → push to GitHub.
//
// Deploy:
//   yc serverless function create --name wb-tv-scraper
//   yc serverless function version create \
//     --function-name wb-tv-scraper \
//     --runtime nodejs20 \
//     --entrypoint wb-yandex-cloud-function.handler \
//     --memory 512m \
//     --execution-timeout 540s \
//     --source-path . \
//     --environment GH_TOKEN=ghp_…,GH_REPO=visamexicomx-sys/Q,GH_BRANCH=claude/scrape-wildberries-tvs-oUS2f
//
// Trigger:
//   yc serverless trigger create timer \
//     --name wb-tv-daily \
//     --cron-expression "0 6 ? * * *" \
//     --invoke-function-name wb-tv-scraper \
//     --invoke-function-service-account-id <SA-ID>
//
// The function:
//   1. Pulls WB catalog JSON for the 8 target brands (uses scraper logic inline)
//   2. Normalises to REPORT.json structure (mimics build-report.mjs output)
//   3. PUTs REPORT.json + models-history.json into the repo via Contents API
//   4. The existing wb-tv-postproc workflow listens for that push and runs
//      enrich/alerts/watchlist on a regular GitHub runner (no WB calls there).

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEST = '-1123300';                    // SPb
const BRANDS = ['samsung', 'sony', 'tcl', 'hisense', 'haier', 'xiaomi', 'яндекс', 'sber'];
const SORTS = ['popular', 'priceup'];
const MAX_PAGES = 5;

const DIAG_RE = /\b(\d{2,3})\s*(?:["”]|дюйм|inch)/i;
const DIAG_FB = /\b(24|28|32|39|40|43|49|50|55|58|60|65|70|75|77|82|85|98|100)\b/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(query, sort, page) {
    const u = `https://search.wb.ru/exactmatch/ru/common/v9/search?ab_testing=false&appType=1&curr=rub&dest=${DEST}&hide_dtype=10&lang=ru&page=${page}&query=${encodeURIComponent(query + ' телевизор')}&resultset=catalog&sort=${sort}&spp=30&suppressSpellcheck=false`;
    const r = await fetch(u, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'ru-RU' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return j?.data?.products || [];
}

function normalize(p) {
    let pk = Infinity, bk = Infinity;
    for (const s of (p.sizes || [])) {
        const pp = s?.price?.product ?? s?.price?.total;
        const bb = s?.price?.basic;
        if (pp && pp < pk) pk = pp;
        if (bb && bb < bk) bk = bb;
    }
    if (!isFinite(pk)) return null;
    if (!isFinite(bk)) bk = pk;
    const price = Math.round(pk / 100);
    const original = Math.round(bk / 100);
    const m = (p.name || '').match(DIAG_RE) || (p.name || '').match(DIAG_FB);
    return {
        id: String(p.id),
        name: p.name || '',
        brand: p.brand || '',
        price,
        originalPrice: original,
        discount: original > price ? Math.round((1 - price / original) * 100) : 0,
        rating: p.reviewRating ?? (p.rating ? p.rating / 10 : null),
        reviews: p.feedbacks ?? 0,
        diagonal: m ? parseInt(m[1], 10) : null,
        url: `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
    };
}

async function scrape() {
    const items = [];
    const seen = new Set();
    for (const b of BRANDS) {
        for (const sort of SORTS) {
            for (let pg = 1; pg <= MAX_PAGES; pg++) {
                let prods;
                try { prods = await fetchPage(b, sort, pg); }
                catch { break; }
                if (!prods.length) break;
                for (const p of prods) {
                    if (seen.has(p.id)) continue;
                    seen.add(p.id);
                    const n = normalize(p);
                    if (n) items.push(n);
                }
                if (prods.length < 50) break;
                await sleep(300);
            }
        }
    }
    return items;
}

async function ghPut(token, repo, branch, path, content, message) {
    // Read SHA if exists
    const readR = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
        headers: { Authorization: `token ${token}`, 'User-Agent': 'wb-yc-fn' },
    });
    const sha = readR.ok ? (await readR.json()).sha : null;
    const body = {
        message,
        content: Buffer.from(content, 'utf8').toString('base64'),
        branch,
        ...(sha ? { sha } : {}),
    };
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'wb-yc-fn' },
        body: JSON.stringify(body),
    });
    if (!r.ok) {
        const t = await r.text();
        throw new Error(`gh PUT ${path} → ${r.status}: ${t.slice(0, 200)}`);
    }
}

export async function handler(_event, _ctx) {
    const token = process.env.GH_TOKEN;
    const repo = process.env.GH_REPO;
    const branch = process.env.GH_BRANCH || 'main';
    if (!token || !repo) {
        return { statusCode: 500, body: 'GH_TOKEN / GH_REPO env vars missing' };
    }

    const items = await scrape();
    if (!items.length) return { statusCode: 502, body: 'no products' };

    // Push raw JSONL so the existing build-report.mjs (run via GH Action)
    // produces REPORT.json with brand whitelist + diagonal extraction.
    const jsonl = items.map((x) => JSON.stringify(x)).join('\n') + '\n';
    const stamp = new Date().toISOString();
    await ghPut(token, repo, branch,
        'apify-wb-tv-scraper/report/REPORT-raw.jsonl',
        jsonl,
        `chore(scrape): WB direct scrape ${stamp.slice(0, 16)} (${items.length} items)`,
    );

    return {
        statusCode: 200,
        body: JSON.stringify({ items: items.length, pushedAt: stamp }),
    };
}
