#!/usr/bin/env node
// Daily content poster for Cancún Hub Telegram channel.
//
// Posts a morning digest to the channel with:
//   - Weather summary
//   - Beach conditions
//   - Today's deals & events
//   - Tips of the day
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHANNEL_ID   — e.g. @cancun_hub  or -100xxxxxxxx

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
    if (DRY_RUN) {
        console.log(`[DRY RUN] ${method}:`, JSON.stringify(body, null, 2));
        return { ok: true };
    }
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!json.ok) console.error(`TG error (${method}):`, json);
    return json;
}

async function sendMessage(text, extra = {}) {
    return tg('sendMessage', {
        chat_id: CHANNEL,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
    });
}

// ---------- weather via OpenWeatherMap ----------

async function fetchWeather() {
    const key = env.OPENWEATHER_API_KEY;
    if (!key) return null;
    try {
        const r = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=Cancun,MX&cnt=8&units=metric&lang=es&appid=${key}`
        );
        return r.ok ? r.json() : null;
    } catch { return null; }
}

function weatherIcon(id) {
    if (id >= 200 && id < 300) return '⛈';
    if (id >= 300 && id < 400) return '🌦';
    if (id >= 500 && id < 600) return '🌧';
    if (id >= 700 && id < 800) return '🌫';
    if (id === 800) return '☀️';
    if (id <= 802) return '🌤';
    return '⛅';
}

// ---------- day-of-week helpers ----------

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const DAILY_TIPS = [
    // Воскресенье
    [
        '🌅 Воскресенье идеально для неспешного бранча в Zona Hotelera.',
        '🚌 Mercado 28 закрывается раньше — успей до 18:00.',
        '🏖 Волны в воскресенье обычно спокойнее — хорошо для снорклинга.',
    ],
    // Понедельник
    [
        '💸 Понедельник — лучший день для бюджетных ресторанов: меньше туристов.',
        '🤿 Fat Tuesday: Daiquiri 2x1 весь день!',
        '🏖 Delfines — народу меньше, флаги спокойнее после выходных.',
    ],
    // Вторник
    [
        '🎵 Taco Tuesday по всему Канкуну — ищи акции в барах!',
        '🌴 Хороший день для поездки в Ч Чичен-Ицу: меньше автобусов.',
        '🛍 Plaza Las Américas — средняя загрузка, комфортный шопинг.',
    ],
    // Среда
    [
        '🍹 Happy Wednesday во многих барах ZH — проверь Instagram заведений.',
        '🤿 Снорклинг-туры: спрос ниже — можно торговаться за цену.',
        '✈️ Авиабилеты в среду часто дешевле — следи за ценами!',
    ],
    // Четверг
    [
        '🎭 Coco Bongo по четвергам — акционный вход до 22:00.',
        '🌊 Пик заезда туристов — выходи на пляж пораньше (7–9am).',
        '🏃 Reggae Night в некоторых барах — проверь афишу!',
    ],
    // Пятница
    [
        '🎉 TGIF! Лучшие вечеринки Канкуна начинаются сегодня.',
        '⚠️ Пробки на бульваре Куколькан с 17:00 — закладывай время.',
        '🍽 Бронируй рестораны заранее — пятница очень загружена!',
    ],
    // Суббота
    [
        '🏖 Самый оживлённый день на пляжах — приходи до 9am.',
        '🚨 Максимум туристов = максимум карманников. Будь внимателен!',
        '🌅 Закат на Delfines в субботу — одно из лучших зрелищ Канкуна.',
    ],
];

const WEEKLY_EVENTS = {
    0: '🎭 Xoximilco Cancún — fiesta mexicana tradicional cada noche',
    1: '🎵 Live Jazz @ La Habichuela Sunset (lunes)',
    2: '🎸 Taco & Rock night @ varios bares',
    3: '🎤 Open Mic @ La Taberna (miércoles)',
    4: '💃 Salsa Night @ Roots Bar (jueves)',
    5: '🎆 Salida de sol party @ Mandala (viernes noche)',
    6: '🎊 Party principal en Coco Bongo (sábado)',
};

// ---------- MAIN ----------

async function run() {
    const now = new Date();
    const dowIdx = now.getDay();
    const dayES = DAYS_ES[dowIdx];
    const dayRU = DAYS_RU[dowIdx];
    const dateStr = now.toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Cancun',
    });

    console.log(`Posting daily digest for ${dayES}, ${dateStr}`);

    // 1. Weather block
    const weather = await fetchWeather();
    let weatherBlock;
    if (weather) {
        const cur = weather.list[0];
        const temp = Math.round(cur.main.temp);
        const icon = weatherIcon(cur.weather[0].id);
        const desc = cur.weather[0].description;
        const wind = Math.round(cur.wind.speed * 3.6);
        const forecast = weather.list.slice(1, 4).map(f => {
            const d = new Date(f.dt * 1000).toLocaleDateString('es-MX', {
                weekday: 'short', timeZone: 'America/Cancun',
            });
            return `${d}: ${weatherIcon(f.weather[0].id)} ${Math.round(f.main.temp)}°C`;
        }).join(' | ');
        weatherBlock = `${icon} <b>${temp}°C</b> — ${esc(desc)}\n🌬 ${wind} km/h  |  💧 ${cur.main.humidity}%\n📅 ${forecast}`;
    } else {
        weatherBlock = '☀️ <b>~30°C</b> — Típico día caribeño\n🌬 ~15 km/h SE  |  🌊 Mar ~28°C';
    }

    // 2. Tips del día
    const tips = DAILY_TIPS[dowIdx];
    const tipBlock = tips.map((t, i) => `${i + 1}. ${t}`).join('\n');

    // 3. Event del día
    const eventOfDay = WEEKLY_EVENTS[dowIdx];

    // Compose morning digest
    const digest = [
        `🌴 <b>BUENOS DÍAS CANCÚN! / ДОБРОЕ УТРО, КАНКУН!</b>`,
        `📅 ${dayES} / ${dayRU}, ${esc(dateStr)}`,
        '',
        `🌤 <b>CLIMA HOY / ПОГОДА СЕГОДНЯ</b>`,
        weatherBlock,
        '',
        `🎯 <b>CONSEJOS DEL DÍA / СОВЕТЫ ДНЯ</b>`,
        tipBlock,
        '',
        `🎭 <b>EVENTO DESTACADO</b>`,
        eventOfDay,
        '',
        `🏖 <b>PLAYAS / ПЛЯЖИ</b>`,
        `Verifica banderas antes de nadar. 🟦=seguro 🟡=precaución 🔴=peligro`,
        link('Forecast olas', 'https://www.surf-forecast.com/breaks/Cancun/forecasts/latest'),
        '',
        `💬 Dudas y chat: @cancun_hub_chat`,
        `🤖 Bot: /help — todo lo que necesitas saber de Cancún`,
    ].join('\n');

    await sendMessage(digest);
    console.log('Morning digest sent.');

    // Afternoon deals post (if Friday)
    if (dowIdx === 5) {
        await new Promise(r => setTimeout(r, 3000));
        const fridayDeals = [
            `🎉 <b>¡ES VIERNES! / ПЯТНИЦА! VAMOS!</b>`,
            '',
            `🍹 <b>HAPPY HOURS ACTIVOS:</b>`,
            `• Señor Frog's: 2x1 cócteles hasta 6pm`,
            `• Fat Tuesday: Daiquiri especial viernes`,
            `• Coco Bongo: entrada anticipada -30% hasta 10pm`,
            `• Mandala: Pre-party entrada libre hasta 11pm`,
            '',
            `🎆 <b>ESTA NOCHE / ESTA NOITE:</b>`,
            `• Salida de sol after party @ Mandala (viernes noche)`,
            `• DJ Internacional @ Coco Bongo`,
            `• Roof party @ Hotel Krystal`,
            '',
            `⚠️ Tráfico pesado en Kukulcán 5–8pm.`,
            `🚕 Usa inDriver para comparar precios de taxis.`,
        ].join('\n');
        await sendMessage(fridayDeals);
        console.log('Friday deals posted.');
    }

    console.log('Done.');
}

run().catch(err => { console.error(err); exit(1); });
