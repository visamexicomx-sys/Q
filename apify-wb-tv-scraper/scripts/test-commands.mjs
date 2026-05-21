#!/usr/bin/env node
// Smoke test: invoke every command handler against current data and confirm output.

process.env.TELEGRAM_BOT_TOKEN = 'fake:fake';
const { dispatch } = await import('./bot-poller.mjs');

const tests = [
    { cmd: '/snapshot', expect: /Карточек.*Моделей/s },
    { cmd: '/atl', expect: /all-time low|нет/i },
    { cmd: '/deals', expect: /Сделки|нет/i },
    { cmd: '/drops', expect: /Подешевели|подешевела/i },
    { cmd: '/anomalies', expect: /Аномалии|high/i },
    { cmd: '/cheap', expect: /Топ-15/ },
    { cmd: '/brand samsung', expect: /SAMSUNG.*карт/s },
    { cmd: '/brand sony', expect: /SONY.*карт/s },
    { cmd: '/brand tcl', expect: /TCL.*карт/s },
    { cmd: '/brand hisense', expect: /HISENSE.*карт/s },
    { cmd: '/brand haier', expect: /HAIER.*карт/s },
    { cmd: '/brand xiaomi', expect: /XIAOMI.*карт/s },
    { cmd: '/brand яндекс', expect: /ЯНДЕКС.*карт/s },
    { cmd: '/brand sber', expect: /SBER.*карт/s },
    { cmd: '/brand', expect: /Выберите бренд/ },
    { cmd: '/d 55', expect: /55".*топ/s },
    { cmd: '/d 75', expect: /75".*топ/s },
    { cmd: '/d 32', expect: /32".*топ/s },
    { cmd: '/d', expect: /Выберите диагональ/ },
    { cmd: '/under 30000', expect: /30 ?000.*карт/s },
    { cmd: '/under 100000', expect: /100 ?000.*карт/s },
    { cmd: '/under', expect: /Выберите потолок/ },
    { cmd: '/find qled', expect: /Найдено|не найдено/ },
    { cmd: '/find 4k', expect: /Найдено|не найдено/ },
    { cmd: '/model qe75qn990fuxru', expect: /Продавцов.*Мин/s },
    { cmd: '/model qe77s95fauxru', expect: /Продавцов.*Мин/s },
    { cmd: '/now', expect: /Снимки/ },
    { cmd: '/help', expect: /команд/i },
    { cmd: '/start', expect: /WB TV Tracker/ },
    { cmd: '/menu', expect: /Меню/ },
];

let pass = 0, fail = 0;
const failed = [];
for (const t of tests) {
    const [cmdRaw, ...rest] = t.cmd.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const arg = rest.join(' ');
    try {
        const result = await dispatch(cmd, arg);
        const text = typeof result === 'string' ? result : (result?.text || '');
        const ok = t.expect.test(text);
        const tag = ok ? 'OK ' : 'FAIL';
        const preview = text.replace(/\n/g, ' / ').slice(0, 110);
        console.log(`${tag}  ${t.cmd.padEnd(28)} → ${preview}`);
        if (ok) pass++;
        else { fail++; failed.push({ cmd: t.cmd, expect: t.expect.source, got: preview }); }
    } catch (err) {
        console.log(`THROW  ${t.cmd.padEnd(28)} → ${err.message}`);
        fail++;
        failed.push({ cmd: t.cmd, error: err.message });
    }
}
console.log(`\n${pass} passed, ${fail} failed`);
if (failed.length) {
    console.log('\nFAILURES:');
    for (const f of failed) console.log(JSON.stringify(f));
}
process.exit(fail ? 1 : 0);
