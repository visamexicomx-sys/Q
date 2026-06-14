#!/usr/bin/env node
// Posts and pins the welcome message for Playa del Carmen Hub channel.
// Run manually from GitHub Actions → "Post welcome message".
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHANNEL_ID

import { env, exit } from 'node:process';

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHANNEL = env.TELEGRAM_CHANNEL_ID;

if (!TOKEN || !CHANNEL) { console.log('welcome: missing env vars'); exit(0); }

async function tg(method, body = {}) {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
}

async function run() {
    const text = [
        `🌴 <b>WELCOME TO PLAYA DEL CARMEN HUB!</b>`,
        `🌴 <b>¡BIENVENIDOS AL PDC HUB!</b>`,
        `🌴 <b>ДОБРО ПОЖАЛОВАТЬ В PDC HUB!</b>`,
        '',
        `The #1 Playa del Carmen community — in English 🇬🇧, Spanish 🇲🇽 and Russian 🇷🇺.`,
        `La comunidad #1 de PDC — en inglés, español y ruso.`,
        `Сообщество №1 PDC — на английском, испанском и русском.`,
        '',
        `<b>🤖 What the bot can do / Qué puede el bot / Что умеет бот:</b>`,
        `🌤 /weather — live weather & forecast / clima en vivo / погода`,
        `🏖 /beach — beach conditions for 6 spots / playas / пляжи`,
        `🎉 /events — upcoming events by category`,
        `💰 /deals — today's happy hours & deals`,
        `⛴ /ferry — Cozumel ferry schedule & tips`,
        `🚨 /emergency — all emergency numbers`,
        `🚌 /taxi — transport prices & options`,
        `🛍 /quinta — complete 5th Avenue guide`,
        `🏠 /realestate — rentals & sales PDC`,
        `📩 /report — send a tip to admins`,
        '',
        `📌 Type /help for the full command list`,
        `📌 Escribe /help para todos los comandos`,
        `📌 Нажми /help для всех команд`,
        '',
        `💬 Group chat: @pdchub_chat`,
        `📢 Channel: @pdchub`,
    ].join('\n');

    const res = await tg('sendMessage', {
        chat_id: CHANNEL, text, parse_mode: 'HTML', disable_web_page_preview: true,
    });

    if (res.ok && res.result?.message_id) {
        await tg('pinChatMessage', {
            chat_id: CHANNEL,
            message_id: res.result.message_id,
            disable_notification: true,
        });
        console.log('Welcome posted & pinned:', res.result.message_id);
    } else {
        console.error('Failed:', res);
    }
}

run().catch(err => { console.error(err); exit(1); });
