#!/usr/bin/env node
// Standalone welcome script — can run in polling mode via GitHub Actions
// or be triggered manually to welcome recent new members.
//
// The main welcome logic lives in the Cloudflare Worker (webhook-based),
// this script is a fallback for channels where new_chat_members events
// might be missed.
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHANNEL_ID

import { env, exit } from 'node:process';

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHANNEL = env.TELEGRAM_CHANNEL_ID;

if (!TOKEN || !CHANNEL) {
    console.log('welcome: missing env vars — skipping');
    exit(0);
}

async function tg(method, body = {}) {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return r.json();
}

// Post a periodic "pin" welcome message to keep it visible for new members
async function postPinnedWelcome() {
    const text = [
        `🌴 <b>BIENVENIDOS A CANCÚN HUB / ДОБРО ПОЖАЛОВАТЬ В CANCÚN HUB!</b>`,
        '',
        `🇲🇽 La comunidad #1 de Cancún en Telegram.`,
        `🇷🇺 Сообщество №1 Канкуна в Telegram.`,
        '',
        `<b>✅ Что есть в боте / Qué tiene el bot:</b>`,
        `🌤 /weather — погода / clima`,
        `🏖 /beach — пляжи / playas`,
        `🎉 /events — события / eventos`,
        `💰 /deals — скидки / ofertas`,
        `🚨 /emergency — экстренные / emergencias`,
        `🚕 /taxi — трансферы / traslados`,
        `🍽 /restaurants — рестораны`,
        `🏠 /realestate — недвижимость`,
        '',
        `📢 Канал: @cancun_hub`,
        `💬 Чат: @cancun_hub_chat`,
        '',
        `📌 Нажми /help чтобы начать | Escribe /help para comenzar`,
    ].join('\n');

    const res = await tg('sendMessage', {
        chat_id: CHANNEL,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });

    if (res.ok && res.result?.message_id) {
        // Pin the welcome message
        await tg('pinChatMessage', {
            chat_id: CHANNEL,
            message_id: res.result.message_id,
            disable_notification: true,
        });
        console.log('Welcome message posted and pinned:', res.result.message_id);
    } else {
        console.error('Failed to post welcome:', res);
    }
}

postPinnedWelcome().catch(err => { console.error(err); exit(1); });
