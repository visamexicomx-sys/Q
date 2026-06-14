#!/usr/bin/env node
// Daily morning digest for Playa del Carmen Hub Telegram channel.
// Posts at 8:00 AM CST (UTC-5 = 13:00 UTC) via GitHub Actions.
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHANNEL_ID   — @pdchub or -100xxxxxxxx

import { argv, env, exit } from 'node:process';

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHANNEL = env.TELEGRAM_CHANNEL_ID;
const DRY_RUN = argv.includes('--dry-run');

if (!DRY_RUN && (!TOKEN || !CHANNEL)) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID');
    exit(1);
}

const esc  = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

async function tg(method, body) {
    if (DRY_RUN) { console.log(`[DRY] ${method}:`, JSON.stringify(body, null, 2)); return { ok: true }; }
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!json.ok) console.error(`TG error (${method}):`, json);
    return json;
}

async function send(text, extra = {}) {
    return tg('sendMessage', {
        chat_id: CHANNEL, text, parse_mode: 'HTML',
        disable_web_page_preview: true, ...extra,
    });
}

// ---------- weather ----------

async function fetchWeather() {
    const key = env.OPENWEATHER_API_KEY;
    if (!key) return null;
    try {
        const r = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=Playa+del+Carmen,MX&cnt=8&units=metric&lang=en&appid=${key}`
        );
        return r.ok ? r.json() : null;
    } catch { return null; }
}

function weatherIcon(id) {
    if (id >= 200 && id < 300) return '⛈';
    if (id >= 300 && id < 400) return '🌦';
    if (id >= 500 && id < 600) return '🌧';
    if (id === 800) return '☀️';
    if (id <= 802) return '🌤';
    return '⛅';
}

// ---------- daily content ----------

const DAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DAYS_RU = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

const DAILY_TIPS = [
    // Sunday
    [
        '🌅 Sunday is perfect for a slow brunch on 5th Ave.',
        '🐢 Great day for the Akumal turtle snorkel — fewer crowds on Sundays.',
        '🎭 Voladores de Papantla show in Parque Los Fundadores — free, check times.',
    ],
    // Monday
    [
        '💸 Best day for budget dining — locals go back to work, restaurants less crowded.',
        '🤿 Monday dive trips have smaller groups — great for first-timers.',
        '🌴 Perfect low-season vibe: explore side streets off 5th Ave.',
    ],
    // Tuesday
    [
        '🌮 Taco Tuesday! Many bars and taquerías have special promos.',
        '🏛 Good day for Chichén Itzá day trip — less traffic on roads.',
        '🧘 Yoga on the beach — check local studios for morning classes.',
    ],
    // Wednesday
    [
        '🍹 Mid-week happy hours kick in — check Zenzi and Dirty Martini.',
        '🤿 Cozumel day trip: midweek ferries are less crowded.',
        '📸 Best photography light is Wednesday morning at Punta Esmeralda.',
    ],
    // Thursday
    [
        '🎵 Live music starts ramping up — check Mambo Café for salsa night.',
        '🌊 Surf check: Punta Brava has best swells Thu–Sat.',
        '🛍 Thursday shopping on 5th Ave: avoid the weekend rush.',
    ],
    // Friday
    [
        '🎉 TGIF! PDC nightlife is legendary on Fridays.',
        '⚠️ Traffic on Av. Constituyentes 5–8pm — plan ahead.',
        '🍽 Book restaurants in advance — Friday is packed!',
    ],
    // Saturday
    [
        '🏖 Busiest beach day — arrive at Mamitas or Coco before 9am.',
        '🛡 Saturday = max tourists = watch your belongings.',
        '🌅 Sunset at Playa Coco on Saturday is spectacular.',
    ],
];

const WEEKLY_HIGHLIGHT = {
    0: '🎭 Xcaret Night Festival — traditional Mexican show every Sunday',
    1: '🎵 Live acoustic set @ La Cueva del Chango (Monday evenings)',
    2: '🌮 Taco Tuesday @ El Fogón — best pastor tacos in PDC',
    3: '🎤 Open Mic Night @ Dirty Martini Rooftop (Wednesday)',
    4: '💃 Salsa Night @ Mambo Café — free dance lessons 8pm (Thursday)',
    5: '🎆 DJ Night @ Zenzi Beach — starts at 9pm (Friday)',
    6: '🎊 Main party @ Coco Bongo Playa (Saturday) — best show in town',
};

const FERRY_REMINDER = `⛴️ <b>Ferry to Cozumel:</b> Departs every 60–90 min from 6am. Round trip ~$300 MXN. Book at UltraMar terminal (5th Ave & Constituyentes).`;

// ---------- MAIN ----------

async function run() {
    const now = new Date();
    const dow = now.getDay();
    const dayEN = DAYS_EN[dow];
    const dayES = DAYS_ES[dow];
    const dayRU = DAYS_RU[dow];
    const dateStr = now.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Cancun',
    });

    console.log(`Posting digest: ${dayEN}, ${dateStr}`);

    const weather = await fetchWeather();
    let weatherBlock;

    if (weather) {
        const cur = weather.list[0];
        const temp = Math.round(cur.main.temp);
        const feels = Math.round(cur.main.feels_like);
        const wind = Math.round(cur.wind.speed * 3.6);
        const icon = weatherIcon(cur.weather[0].id);
        const forecast = weather.list.slice(1, 4).map(f => {
            const d = new Date(f.dt * 1000).toLocaleDateString('en-US', {
                weekday: 'short', timeZone: 'America/Cancun',
            });
            return `${d} ${weatherIcon(f.weather[0].id)} ${Math.round(f.main.temp)}°C`;
        }).join('  |  ');
        weatherBlock = [
            `${icon} <b>${temp}°C</b> (feels ${feels}°C)`,
            `💧 Humidity: ${cur.main.humidity}%  |  🌬 Wind: ${wind} km/h`,
            `🌊 Sea: ~29°C  |  ☀️ UV: 11 (extreme)`,
            `📅 ${forecast}`,
        ].join('\n');
    } else {
        weatherBlock = '☀️ <b>~30°C</b> | Sea: 29°C | UV: 11 (extreme) | 💧 80% humidity';
    }

    const tips = DAILY_TIPS[dow];
    const tipBlock = tips.map((t, i) => `${i + 1}. ${t}`).join('\n');

    const digest = [
        `🌴 <b>GOOD MORNING PDC! / ¡BUENOS DÍAS! / ДОБРОЕ УТРО!</b>`,
        `📅 ${dayEN} / ${dayES} / ${dayRU} — ${esc(dateStr)}`,
        '',
        `🌤 <b>WEATHER TODAY / CLIMA HOY / ПОГОДА:</b>`,
        weatherBlock,
        '',
        `🧴 UV extreme — SPF 50+ every 2h! Reapply after swimming.`,
        '',
        `🎯 <b>TIPS OF THE DAY / CONSEJOS / СОВЕТЫ:</b>`,
        tipBlock,
        '',
        `🌟 <b>TONIGHT'S HIGHLIGHT / ESTA NOCHE:</b>`,
        WEEKLY_HIGHLIGHT[dow],
        '',
        FERRY_REMINDER,
        '',
        `🏖 Check beach flags before swimming! 🟦 Safe  🟡 Caution  🔴 Danger`,
        '',
        `💬 Chat & questions: @pdchub_chat`,
        `🤖 Bot commands: /help`,
    ].join('\n');

    await send(digest);
    console.log('Morning digest sent.');

    // Friday evening bonus post
    if (dow === 5) {
        await new Promise(r => setTimeout(r, 3000));
        const fridayPost = [
            `🎉 <b>FRIDAY NIGHT IN PDC! / ¡NOCHE DE VIERNES! / ПЯТНИЦА!</b>`,
            '',
            `🍹 <b>HAPPY HOURS RIGHT NOW:</b>`,
            `• Zenzi Beach: 2x1 cocktails until 7pm`,
            `• Dirty Martini Rooftop: 2x1 5–8pm`,
            `• Mambo Café: 2x1 mojitos until 9pm`,
            `• El Fogón: Michelada promo ongoing`,
            '',
            `🎆 <b>TONIGHT:</b>`,
            `• DJ Night @ Zenzi from 9pm`,
            `• Live Latin music @ Mambo Café from 9pm`,
            `• Alux Cenote cocktails from 5pm`,
            `• 5th Ave at 10pm = electric atmosphere`,
            '',
            `🚕 Tip: book your inDriver/Cabify in advance after midnight — surge pricing!`,
            `🏖 Beach clubs close at sunset — switch to rooftop bars.`,
        ].join('\n');
        await send(fridayPost);
        console.log('Friday night post sent.');
    }

    console.log('Done.');
}

run().catch(err => { console.error(err); exit(1); });
