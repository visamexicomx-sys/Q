#!/usr/bin/env node
// Weather & hurricane alert system for Playa del Carmen Hub.
//
// Checks:
//   - OpenWeatherMap for storms / severe alerts (Playa del Carmen coords)
//   - NHC RSS for active Atlantic / Caribbean hurricanes
//   - Posts urgent alerts to channel if new
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHANNEL_ID
//   OPENWEATHER_API_KEY    (optional but recommended)
//   STATE_PATH             (optional, default: cancun-hub/data/weather-state.json)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, exit } from 'node:process';

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHANNEL = env.TELEGRAM_CHANNEL_ID;
const OW_KEY = env.OPENWEATHER_API_KEY;
const STATE_PATH = resolve(env.STATE_PATH || 'cancun-hub/data/weather-state.json');

if (!TOKEN || !CHANNEL) {
    console.log('weather-alert: missing credentials — skipping');
    exit(0);
}

const esc  = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;

function loadState() {
    return existsSync(STATE_PATH)
        ? JSON.parse(readFileSync(STATE_PATH, 'utf8'))
        : { sentAlerts: [], lastHurricaneCheck: 0 };
}

function saveState(state) {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function tg(method, body) {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
}

async function sendAlert(text) {
    return tg('sendMessage', {
        chat_id: CHANNEL, text, parse_mode: 'HTML', disable_web_page_preview: true,
    });
}

// Playa del Carmen coords: 20.6296° N, 87.0739° W
async function checkAlerts() {
    if (!OW_KEY) return [];
    try {
        const r = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=20.6296&lon=-87.0739&exclude=minutely,hourly,daily&appid=${OW_KEY}&lang=en`
        );
        if (!r.ok) return [];
        const data = await r.json();
        return data.alerts || [];
    } catch { return []; }
}

async function checkCurrentWeather() {
    if (!OW_KEY) return null;
    try {
        const r = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=Playa+del+Carmen,MX&units=metric&lang=en&appid=${OW_KEY}`
        );
        return r.ok ? r.json() : null;
    } catch { return null; }
}

async function checkHurricanes() {
    try {
        const r = await fetch('https://www.nhc.noaa.gov/index-at.xml', {
            headers: { 'Accept': 'application/xml, text/xml' },
        });
        if (!r.ok) return null;
        const text = await r.text();
        const hasStorm = /Tropical Storm|Hurricane|Tropical Depression/i.test(text);
        const nearMexico = /Gulf of Mexico|Caribbean|Yucatan|Quintana|Roo/i.test(text);
        return { hasStorm, nearMexico };
    } catch { return null; }
}

const STORM_IDS = [200,201,202,210,211,212,221,230,231,232];
const HEAVY_RAIN = [502,503,504,511,521,522,531];

function analyzeSeverity(w) {
    if (!w) return null;
    const id = w.weather[0].id;
    const wind = (w.wind?.speed || 0) * 3.6;
    const rain = w.rain?.['1h'] || 0;
    if (STORM_IDS.includes(id)) return 'DANGER';
    if (HEAVY_RAIN.includes(id) || rain > 30) return 'WARNING';
    if (wind > 60) return 'WARNING';
    return null;
}

async function run() {
    const state = loadState();
    const now = Date.now();
    let changed = false;

    const [alerts, weather, hurricane] = await Promise.all([
        checkAlerts(), checkCurrentWeather(), checkHurricanes(),
    ]);

    // Official OWM alerts
    for (const alert of alerts) {
        const key = `owm:${alert.event}:${alert.start}`;
        if (state.sentAlerts.includes(key)) continue;

        const startFmt = new Date(alert.start * 1000).toLocaleString('en-US', { timeZone: 'America/Cancun' });
        const endFmt   = new Date(alert.end   * 1000).toLocaleString('en-US', { timeZone: 'America/Cancun' });

        await sendAlert([
            `🚨 <b>WEATHER ALERT / ALERTA METEOROLÓGICA / МЕТЕО-ПРЕДУПРЕЖДЕНИЕ</b>`,
            `📍 Playa del Carmen`,
            '',
            `⚠️ <b>${esc(alert.event)}</b>`,
            `🕐 From: ${esc(startFmt)}`,
            `🕐 Until: ${esc(endFmt)}`,
            '',
            esc((alert.description || '').slice(0, 300)),
            '',
            `📞 Emergency / Emergencia: <b>911</b>`,
            `🌐 ${link('CONAGUA', 'https://smn.conagua.gob.mx')}`,
        ].join('\n'));

        state.sentAlerts.push(key);
        changed = true;
        console.log('Sent OWM alert:', key);
    }

    // Severe current weather
    const severity = analyzeSeverity(weather);
    if (severity === 'DANGER') {
        const key = `danger:${Math.floor(now / 3_600_000)}`;
        if (!state.sentAlerts.includes(key) && weather) {
            const temp = Math.round(weather.main.temp);
            const wind = Math.round(weather.wind.speed * 3.6);
            await sendAlert([
                `⛈🚨 <b>STORM WARNING / TORMENTA / ГРОЗА — PLAYA DEL CARMEN</b>`,
                '',
                `🌡 ${temp}°C | 🌬 Wind: ${wind} km/h | ${esc(weather.weather[0].description)}`,
                '',
                `⚠️ Avoid beaches, low-lying areas, construction zones`,
                `⚠️ Evita playas, zonas bajas, estructuras inestables`,
                `⚠️ Избегай пляжи, низины, стройки`,
                '',
                `📞 Emergency / Emergencia: <b>911</b>`,
                `🌊 Coast Guard PDC: 984-873-3560`,
            ].join('\n'));
            state.sentAlerts.push(key);
            changed = true;
            console.log('Sent danger weather alert.');
        }
    }

    // Hurricane check — every 6 hours
    if (hurricane && (now - state.lastHurricaneCheck) > 6 * 3_600_000) {
        state.lastHurricaneCheck = now;
        changed = true;

        if (hurricane.hasStorm && hurricane.nearMexico) {
            const key = `hurricane:${Math.floor(now / 86_400_000)}`;
            if (!state.sentAlerts.includes(key)) {
                await sendAlert([
                    `🌀 <b>HURRICANE ACTIVITY DETECTED / ACTIVIDAD DE HURACÁN / АКТИВНОСТЬ УРАГАНА</b>`,
                    '',
                    `⚠️ Tropical activity detected in Gulf of Mexico or Caribbean — may affect Quintana Roo.`,
                    `⚠️ Actividad tropical detectada en el Golfo o Caribe — puede afectar Q.Roo.`,
                    `⚠️ Тропическая активность в Мексиканском заливе/Карибском море — возможно влияние на Q.Roo.`,
                    '',
                    `📡 ${link('NHC Tracker', 'https://www.nhc.noaa.gov')}`,
                    `📡 ${link('CONAGUA Huracanes', 'https://smn.conagua.gob.mx/es/ciclones-tropicales')}`,
                    `📡 ${link('Radar PDC', 'https://smn.conagua.gob.mx/es/observando-el-tiempo/radar')}`,
                    '',
                    `🏨 Follow Protección Civil Quintana Roo instructions`,
                    `📞 Emergency: <b>911</b>  |  Civil Protection: <b>800-507-5778</b>`,
                ].join('\n'));
                state.sentAlerts.push(key);
                console.log('Sent hurricane alert.');
            }
        }
    }

    // Keep state lean
    state.sentAlerts = state.sentAlerts.slice(-200);
    if (changed) saveState(state);
    console.log(`weather-alert done. Alerts tracked: ${state.sentAlerts.length}`);
}

run().catch(err => { console.error(err); exit(1); });
