#!/usr/bin/env node
// Weather & hurricane alert system for Cancún Hub.
//
// Checks:
//   - OpenWeatherMap for storms / alerts
//   - NHC RSS for active Atlantic hurricanes
//   - Posts urgent alerts to channel immediately
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHANNEL_ID
//   OPENWEATHER_API_KEY
//   STATE_PATH (optional, default: cancun-hub/data/weather-state.json)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, exit } from 'node:process';

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHANNEL = env.TELEGRAM_CHANNEL_ID;
const OW_KEY = env.OPENWEATHER_API_KEY;
const STATE_PATH = resolve(env.STATE_PATH || 'cancun-hub/data/weather-state.json');

if (!TOKEN || !CHANNEL) {
    console.log('weather-alert: missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID — skipping');
    exit(0);
}

const esc = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

function loadState() {
    return existsSync(STATE_PATH)
        ? JSON.parse(readFileSync(STATE_PATH, 'utf8'))
        : { sentAlerts: [], lastHurricaneCheck: null };
}

function saveState(state) {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function tg(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
}

async function sendAlert(text) {
    return tg('sendMessage', {
        chat_id: CHANNEL,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
}

// ---------- OpenWeatherMap checks ----------

async function checkStormAlert() {
    if (!OW_KEY) return null;
    try {
        // One-call API for weather alerts
        const r = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=21.1743&lon=-86.8466&exclude=minutely,hourly,daily&appid=${OW_KEY}&lang=es`
        );
        if (!r.ok) return null;
        const data = await r.json();
        return data.alerts || [];
    } catch { return null; }
}

async function checkCurrentWeather() {
    if (!OW_KEY) return null;
    try {
        const r = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=Cancun,MX&units=metric&lang=es&appid=${OW_KEY}`
        );
        return r.ok ? r.json() : null;
    } catch { return null; }
}

// ---------- NHC hurricane check ----------

async function checkHurricanes() {
    try {
        const r = await fetch('https://www.nhc.noaa.gov/index-at.xml', {
            headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        });
        if (!r.ok) return null;
        const text = await r.text();
        // Simple check — if any active storm in Gulf of Mexico / Caribbean
        const hasStorm = text.includes('Tropical Storm') || text.includes('Hurricane') || text.includes('Tropical Depression');
        const nearMexico = text.includes('Gulf of Mexico') || text.includes('Caribbean') || text.includes('Yucatan');
        return { hasStorm, nearMexico, raw: text.slice(0, 500) };
    } catch { return null; }
}

// ---------- Severity analysis ----------

const STORM_IDS = [200, 201, 202, 210, 211, 212, 221, 230, 231, 232];
const HEAVY_RAIN_IDS = [502, 503, 504, 511, 521, 522, 531];

function analyzeWeather(w) {
    if (!w) return null;
    const id = w.weather[0].id;
    const windKph = (w.wind?.speed || 0) * 3.6;
    const rain1h = w.rain?.['1h'] || 0;

    if (STORM_IDS.includes(id)) {
        return {
            level: 'DANGER',
            emoji: '⛈🚨',
            msgRU: `Гроза в Канкуне прямо сейчас!`,
            msgES: `¡Tormenta eléctrica en Cancún ahora mismo!`,
        };
    }
    if (HEAVY_RAIN_IDS.includes(id) || rain1h > 30) {
        return {
            level: 'WARNING',
            emoji: '🌧⚠️',
            msgRU: `Сильный дождь в Канкуне`,
            msgES: `Lluvia intensa en Cancún`,
        };
    }
    if (windKph > 60) {
        return {
            level: 'WARNING',
            emoji: '🌬⚠️',
            msgRU: `Сильный ветер ${Math.round(windKph)} km/h`,
            msgES: `Viento fuerte ${Math.round(windKph)} km/h`,
        };
    }
    return null;
}

// ---------- MAIN ----------

async function run() {
    const state = loadState();
    const now = Date.now();
    let changed = false;

    // Check active weather alerts
    const [alerts, weather, hurricane] = await Promise.all([
        checkStormAlert(),
        checkCurrentWeather(),
        checkHurricanes(),
    ]);

    // Weather alerts from OWM
    if (alerts && alerts.length > 0) {
        for (const alert of alerts) {
            const alertKey = `owm:${alert.event}:${alert.start}`;
            if (state.sentAlerts.includes(alertKey)) continue;

            const text = [
                `🚨 <b>МЕТЕО-ПРЕДУПРЕЖДЕНИЕ КАНКУН / ALERTA METEOROLÓGICA CANCÚN</b>`,
                '',
                `⚠️ <b>${esc(alert.event)}</b>`,
                `🕐 Inicio: ${new Date(alert.start * 1000).toLocaleString('es-MX', { timeZone: 'America/Cancun' })}`,
                `🕐 Fin: ${new Date(alert.end * 1000).toLocaleString('es-MX', { timeZone: 'America/Cancun' })}`,
                '',
                esc(alert.description?.slice(0, 300)),
                '',
                `📞 Emergencias: 911 / 066`,
                `🌐 ${link('CONAGUA', 'https://smn.conagua.gob.mx')}`,
            ].join('\n');

            await sendAlert(text);
            state.sentAlerts.push(alertKey);
            changed = true;
            console.log(`Sent alert: ${alertKey}`);
        }
    }

    // Severe current weather
    const severity = analyzeWeather(weather);
    if (severity && severity.level === 'DANGER') {
        const weatherKey = `weather:danger:${Math.floor(now / 3_600_000)}`; // once per hour
        if (!state.sentAlerts.includes(weatherKey)) {
            const w = weather;
            const temp = Math.round(w.main.temp);
            const wind = Math.round(w.wind.speed * 3.6);
            const text = [
                `${severity.emoji} <b>${severity.msgES.toUpperCase()}</b>`,
                `${severity.emoji} <b>${severity.msgRU.toUpperCase()}</b>`,
                '',
                `🌡 Temperatura: ${temp}°C | 🌬 Viento: ${wind} km/h`,
                `🌧 ${esc(w.weather[0].description)}`,
                '',
                `⚠️ <b>Evita:</b> playas, zonas bajas, construcciones`,
                `⚠️ <b>Избегай:</b> пляжи, низины, стройки`,
                '',
                `📞 Emergencias / Экстренные: <b>911</b>`,
                `🌊 Capitanía Puerto: 998-884-3200`,
            ].join('\n');

            await sendAlert(text);
            state.sentAlerts.push(weatherKey);
            changed = true;
            console.log('Sent danger weather alert');
        }
    }

    // Hurricane check (once per 6 hours)
    const lastHurricane = state.lastHurricaneCheck || 0;
    if (hurricane && (now - lastHurricane) > 6 * 3_600_000) {
        state.lastHurricaneCheck = now;
        changed = true;

        if (hurricane.hasStorm && hurricane.nearMexico) {
            const hurricaneKey = `hurricane:${Math.floor(now / 86_400_000)}`; // once per day
            if (!state.sentAlerts.includes(hurricaneKey)) {
                const text = [
                    `🌀 <b>AVISO DE HURACÁN / ПРЕДУПРЕЖДЕНИЕ УРАГАНА</b>`,
                    '',
                    `⚠️ Hay actividad tropical activa cerca del Golfo de México / Caribe.`,
                    `⚠️ Есть тропическая активность вблизи Мексиканского залива / Карибского моря.`,
                    '',
                    `📡 ${link('Seguimiento NHC', 'https://www.nhc.noaa.gov')}`,
                    `📡 ${link('CONAGUA Huracanes', 'https://smn.conagua.gob.mx/es/ciclones-tropicales')}`,
                    `📡 ${link('Radar Cancún', 'https://smn.conagua.gob.mx/es/observando-el-tiempo/radar')}`,
                    '',
                    `🏨 En caso de emergencia:`,
                    `• Sigue instrucciones de Protección Civil`,
                    `• Refugios: ${link('ver ubicaciones', 'https://www.qroo.gob.mx/proteccion-civil')}`,
                    `• Emergencias: <b>911</b>`,
                ].join('\n');

                await sendAlert(text);
                state.sentAlerts.push(hurricaneKey);
                console.log('Sent hurricane alert');
            }
        }
    }

    // Cleanup old alert keys (older than 7 days)
    state.sentAlerts = state.sentAlerts.slice(-200);

    if (changed) saveState(state);
    console.log(`weather-alert done. Alerts in state: ${state.sentAlerts.length}`);
}

run().catch(err => { console.error(err); exit(1); });
