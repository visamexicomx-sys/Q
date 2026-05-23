// Shared analytics helpers for the WB tracker. Pure functions — no I/O.
// Imported by the Node scripts; an inlined copy lives in worker/index.mjs.

const SPARK = '▁▂▃▄▅▆▇█';

// 30-day ASCII sparkline from a list of prices.
export function sparkline(values) {
    const v = (values || []).filter((x) => x > 0);
    if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v);
    if (max === min) return SPARK[0].repeat(v.length);
    return v.map((x) => SPARK[Math.round((x - min) / (max - min) * (SPARK.length - 1))]).join('');
}

// Least-squares price velocity in %/day from history [{at, price}].
export function velocityFromHistory(history) {
    const pts = (history || []).filter((h) => h.price > 0).slice(-7);
    if (pts.length < 3) return null;
    const t0 = new Date(pts[0].at).getTime();
    const xs = pts.map((p) => (new Date(p.at).getTime() - t0) / 86_400_000);
    const ys = pts.map((p) => p.price);
    const n = pts.length;
    const sx = xs.reduce((a, b) => a + b, 0);
    const sy = ys.reduce((a, b) => a + b, 0);
    const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const sxx = xs.reduce((a, x) => a + x * x, 0);
    const denom = n * sxx - sx * sx;
    if (denom === 0) return null;
    const slope = (n * sxy - sx * sy) / denom;
    const mean = sy / n;
    if (!mean) return null;
    return +((slope / mean) * 100).toFixed(2);
}

// Traffic-light buy verdict from price position + velocity.
export function buyVerdict(entry, snap, velPctPerDay = null) {
    const cur = snap.price;
    const min = entry.minSeen || cur;
    const max = entry.maxSeen || cur;
    const span = max - min;
    const pos = span > 0 ? (cur - min) / span : 0;   // 0 = at min, 1 = at max
    let score = 0;
    if (pos <= 0.12) score += 2;
    else if (pos <= 0.40) score += 1;
    else if (pos >= 0.75) score -= 2;
    if (velPctPerDay != null) {
        if (velPctPerDay <= -1.5) score += 2;
        else if (velPctPerDay <= -0.4) score += 1;
        else if (velPctPerDay >= 1) score -= 1;
    }
    if (score >= 2) return { light: '🟢', text: 'БЕРИ — цена у исторического дна' };
    if (score <= -1) return { light: '🔴', text: 'ДОРОГО СЕЙЧАС — лучше подождать' };
    return { light: '🟡', text: 'МОЖНО ПОДОЖДАТЬ — цена в середине коридора' };
}

// Estimated days until price decays to the user's threshold.
export function daysToThreshold(snap, entry, velPctPerDay) {
    if (!entry.threshold || velPctPerDay == null || velPctPerDay >= 0) return null;
    if (snap.price <= entry.threshold) return 0;
    const r = 1 + velPctPerDay / 100;
    if (r <= 0 || r >= 1) return null;
    const days = Math.log(entry.threshold / snap.price) / Math.log(r);
    if (!isFinite(days) || days <= 0 || days > 365) return null;
    return Math.ceil(days);
}

// Coarse category from product name.
export function detectCategory(name = '') {
    const s = name.toLowerCase();
    if (/телевизор|smart\s?tv|\bqled\b|\boled\b|mini[\s-]?led|\bтв\b|station|станц/.test(s)) return 'Телевизоры';
    if (/холодильник|side[\s-]?by[\s-]?side|морозильн|многокамерн/.test(s)) return 'Холодильники';
    if (/стиральн|стиралк/.test(s)) return 'Стиральные машины';
    if (/сушильн/.test(s)) return 'Сушильные машины';
    if (/посудомоечн|пмм\b/.test(s)) return 'Посудомоечные';
    if (/кофемашина|кофеварк|кофе/.test(s)) return 'Кофемашины';
    if (/пылесос/.test(s)) return 'Пылесосы';
    if (/смартфон|iphone|galaxy\s?s|смартфона|mate\s|camon|9rt\b/.test(s)) return 'Смартфоны';
    if (/планшет|ipad|matepad|tab\s/.test(s)) return 'Планшеты';
    if (/ноутбук|macbook|magicbook/.test(s)) return 'Ноутбуки';
    if (/духов(ой|ка|ой шкаф)|варочн|панель/.test(s)) return 'Встройка';
    if (/колонка|акустическ|jbl|синтезатор/.test(s)) return 'Аудио';
    if (/mac\s?mini|системный блок/.test(s)) return 'Компьютеры';
    return 'Прочее';
}

// Next big WB sale relative to `now`. Dates are approximate recurring events.
export function nextWbSale(now = new Date()) {
    const y = now.getUTCFullYear();
    const candidates = [
        ['Гендерные дни (к 23 Февраля)', `${y}-02-15`],
        ['Распродажа к 8 Марта', `${y}-03-04`],
        ['Весенняя распродажа', `${y}-04-22`],
        ['Летняя распродажа', `${y}-06-24`],
        ['День холостяка 11.11', `${y}-11-08`],
        ['Чёрная пятница', `${y}-11-24`],
        ['Новогодняя распродажа', `${y}-12-18`],
        ['Гендерные дни (к 23 Февраля)', `${y + 1}-02-15`],
    ];
    const t = now.getTime();
    for (const [name, date] of candidates) {
        const dt = new Date(date + 'T00:00:00Z').getTime();
        if (dt >= t) {
            const days = Math.ceil((dt - t) / 86_400_000);
            return { name, date, days };
        }
    }
    return null;
}

// Portfolio stats over a user's product entries.
export function watchlistStats(entries) {
    const products = entries.filter((e) => e.productId && e.lastSnapshot?.price);
    const byCat = {};
    const byBrand = {};
    let totalValue = 0, totalSavingsFromMax = 0, inStock = 0, atLowCount = 0;
    const deals = [];
    for (const e of products) {
        const s = e.lastSnapshot;
        const cur = s.price, min = e.minSeen || cur, max = e.maxSeen || cur;
        const cat = detectCategory(s.name || e.alias || '');
        byCat[cat] = (byCat[cat] || 0) + 1;
        if (s.brand) byBrand[s.brand] = (byBrand[s.brand] || 0) + 1;
        totalValue += cur;
        if (max > cur) totalSavingsFromMax += (max - cur);
        if (s.stock > 0) inStock += 1;
        if (min > 0 && cur <= min * 1.01) atLowCount += 1;
        const offMax = max > cur ? Math.round((1 - cur / max) * 100) : 0;
        deals.push({ id: e.productId, name: e.alias || s.name, cur, offMax });
    }
    deals.sort((a, b) => b.offMax - a.offMax);
    return {
        total: products.length, inStock, atLowCount,
        totalValue, totalSavingsFromMax,
        byCat, byBrand,
        topDeals: deals.slice(0, 3),
    };
}
