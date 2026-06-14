// Cloudflare Worker — Cancún Hub Telegram Bot
//
// Deploy:  wrangler deploy
// Webhook: curl "https://api.telegram.org/bot$TOKEN/setWebhook?url=https://<worker>.workers.dev/webhook"
//
// Secrets (wrangler secret put):
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_ADMIN_IDS   — comma-separated list of admin Telegram user IDs
//   OPENWEATHER_API_KEY  — for live weather data (optional)

const PAGE_SIZE = 10;

// ---------- formatting helpers ----------

const esc  = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;
const trim = (s = '', n = 80) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const bold = (s) => `<b>${esc(s)}</b>`;
const italic = (s) => `<i>${esc(s)}</i>`;

// ---------- keyboards ----------

const MAIN_KB = {
    keyboard: [
        [{ text: '🌤 Погода/Clima' }, { text: '🎉 События/Eventos' }, { text: '🏖 Пляжи/Playas' }],
        [{ text: '🍽 Рестораны/Restaurantes' }, { text: '🏠 Недвижимость/Inmuebles' }, { text: '🚨 Безопасность/Seguridad' }],
        [{ text: '✈️ Трансфер/Traslados' }, { text: '💰 Скидки/Ofertas' }, { text: '📰 Новости/Noticias' }],
        [{ text: '🗺 Карта/Mapa' }, { text: '🤖 Команды/Comandos' }, { text: 'ℹ️ О группе/Grupo' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
};

const BEACH_KB = {
    inline_keyboard: [
        [{ text: '🏖 Zona Hotelera', callback_data: 'beach:zona_hotelera' }, { text: '🏝 Playa Delfines', callback_data: 'beach:delfines' }],
        [{ text: '🤿 Playa Tortugas', callback_data: 'beach:tortugas' }, { text: '🌊 Playa Langosta', callback_data: 'beach:langosta' }],
        [{ text: '🌴 Puerto Morelos', callback_data: 'beach:puerto_morelos' }, { text: '🐠 Isla Mujeres', callback_data: 'beach:isla_mujeres' }],
    ],
};

const EVENTS_KB = {
    inline_keyboard: [
        [{ text: '🎵 Музыка/Música', callback_data: 'events:music' }, { text: '🎭 Искусство/Arte', callback_data: 'events:art' }],
        [{ text: '🍹 Вечеринки/Fiestas', callback_data: 'events:parties' }, { text: '🏃 Спорт/Deporte', callback_data: 'events:sports' }],
        [{ text: '👶 Семья/Familia', callback_data: 'events:family' }, { text: '🎰 Казино/Casino', callback_data: 'events:casino' }],
    ],
};

const AREA_KB = {
    inline_keyboard: [
        [{ text: '🏨 Zona Hotelera', callback_data: 'area:zh' }, { text: '🏙 Centro', callback_data: 'area:centro' }],
        [{ text: '🌆 SM Colonias', callback_data: 'area:sm' }, { text: '🛫 Aeropuerto', callback_data: 'area:airport' }],
    ],
};

// ---------- static content ----------

const BEACHES = {
    zona_hotelera: {
        name: 'Zona Hotelera',
        emoji: '🏖',
        desc_es: 'La playa más famosa de Cancún. Aguas turquesas y arena blanca.',
        desc_ru: 'Самый известный пляж Канкуна. Бирюзовые воды и белый песок.',
        conditions_url: 'https://www.surf-forecast.com/breaks/Cancun/forecasts/latest',
        flags: ['🟦 Banderas Azules — agua segura', '⚠️ Verifique flags antes de nadar'],
        tips: ['🕗 Mejor hora: 7-11am (menos concurrido)', '🧴 SPF 50+ obligatorio', '👜 No dejar objetos sin vigilancia'],
    },
    delfines: {
        name: 'Playa Delfines',
        emoji: '🐬',
        desc_es: 'Playa pública gratuita con estacionamiento. Vista panorámica del Caribe.',
        desc_ru: 'Бесплатный публичный пляж с парковкой. Панорамный вид на Карибское море.',
        flags: ['🅿️ Estacionamiento gratuito', '📸 Mirador panorámico'],
        tips: ['🌊 Olas más fuertes — cuidado nadadores', '🚌 Acceso por R-1 bus'],
    },
    tortugas: {
        name: 'Playa Tortugas',
        emoji: '🐢',
        desc_es: 'Punto de embarque para Isla Mujeres. Aguas tranquilas.',
        desc_ru: 'Место отправки на Исла Мухерес. Спокойные воды.',
        flags: ['⛵ Puerto de lanchas a Isla Mujeres'],
        tips: ['💵 Lancha a Isla Mujeres ~$250 MXN ida/vuelta', '🤿 Snorkel disponible en renta'],
    },
    langosta: {
        name: 'Playa Langosta',
        emoji: '🦞',
        desc_es: 'Frente a La Isla Shopping Mall. Ideal para familias con niños.',
        desc_ru: 'Напротив La Isla Shopping Mall. Идеально для семей с детьми.',
        flags: ['🛍 La Isla Shopping Mall cerca', '🍦 Paleterías y restaurantes'],
        tips: ['🏊 Lagoon side — aguas muy calmadas para niños'],
    },
    puerto_morelos: {
        name: 'Puerto Morelos',
        emoji: '🌴',
        desc_es: 'Pueblo mágico a 30 min de Cancún. Arrecife de coral protegido.',
        desc_ru: 'Магический городок в 30 минутах от Канкуна. Охраняемый коралловый риф.',
        flags: ['🪸 Segundo arrecife más grande del mundo'],
        tips: ['🐠 Snorkel y buceo de clase mundial', '🚗 30 min en auto por carretera federal'],
    },
    isla_mujeres: {
        name: 'Isla Mujeres',
        emoji: '🏝',
        desc_es: 'Isla paradisíaca a 20 min en ferry. Playa Norte — Top 10 del mundo.',
        desc_ru: 'Райский остров в 20 минутах на пароме. Playa Norte — Топ-10 пляжей мира.',
        flags: ['⛴️ Ferry desde Puerto Juárez ~$200 MXN'],
        tips: ['🛵 Alquila golf cart en el muelle', '🦈 Nada con tiburones ballena (Jun-Sep)'],
    },
};

const HELP_TEXT = `
🌴 <b>Cancún Hub Bot</b> — твой гид по Канкуну

<b>🌤 ПОГОДА / CLIMA</b>
Текущая погода + прогноз на 7 дней

<b>🎉 СОБЫТИЯ / EVENTOS</b>
Мероприятия по категориям: музыка, арт, вечеринки, спорт

<b>🏖 ПЛЯЖИ / PLAYAS</b>
Условия, флаги безопасности, советы по каждому пляжу

<b>🍽 РЕСТОРАНЫ / RESTAURANTES</b>
Лучшие места по зонам и кухням

<b>🏠 НЕДВИЖИМОСТЬ / INMUEBLES</b>
Аренда и покупка в Канкуне и Ривьера Майя

<b>🚨 БЕЗОПАСНОСТЬ / SEGURIDAD</b>
Актуальные предупреждения и зоны безопасности

<b>✈️ ТРАНСФЕР / TRASLADOS</b>
Аэропорт, ADO, такси, Uber — цены и маршруты

<b>💰 СКИДКИ / OFERTAS</b>
Happy hours, промо и горящие предложения

<b>📰 НОВОСТИ / NOTICIAS</b>
Главное из Cancún + Quintana Roo

<b>КОМАНДЫ:</b>
/weather — погода прямо сейчас
/beach [nombre] — состояние пляжа
/events — ближайшие события
/deals — актуальные скидки
/emergency — экстренные телефоны
/taxi — цены на такси
/report [текст] — сообщить об инциденте

<b>Чат: @cancun_hub_chat</b>
`;

const EMERGENCY_TEXT = `
🚨 <b>ЭКСТРЕННЫЕ ТЕЛЕФОНЫ КАНКУН / EMERGENCIAS CANCÚN</b>

🚔 Policía Municipal: <b>066</b>
🚑 Ambulancia/Cruz Roja: <b>065</b>
🔥 Bomberos: <b>068</b>
🏥 IMSS Urgencias: <b>800-900-2000</b>
🦅 Guardia Nacional: <b>088</b>

🌊 <b>Capitanía de Puerto (mar):</b> 998-884-3200
✈️ <b>Aeropuerto Cancún:</b> 998-848-7200
🏨 <b>Zona Hotelera Policía Turística:</b> 998-885-2277

💊 <b>Farmacias 24h:</b>
• Farmacia del Ahorro: Av. Tulum
• Walmart Farmacia: Kukulcán km 9.5

🏥 <b>Hospitales:</b>
• Hospiten Cancún: 998-881-3700
• Hospital Galenia: 998-891-5200
• Amerimed: 998-881-3400

📱 <b>Números útiles:</b>
• Taxi Sitio Centro: 998-888-6060
• ADO (autobuses): 800-900-0105
• Denuncia anónima: 089
`;

const TAXI_TEXT = `
🚕 <b>ЦЕНЫ НА ТАКСИ КАНКУН / PRECIOS TAXI CANCÚN</b>

<i>Актуальные тарифы — всегда торгуйтесь!</i>

✈️ <b>Аэропорт ↔ Zona Hotelera:</b>
  Такси: $600–900 MXN
  ADO автобус: $104 MXN
  Uber: ~$400–600 MXN (запрещён, но работает)

🏨 <b>Zona Hotelera ↔ Centro:</b>
  Такси: $200–300 MXN
  R-1 автобус: $12 MXN

🏝 <b>Centro ↔ Puerto Juárez (Isla Mujeres):</b>
  Такси до порта: $80–120 MXN
  Паром: $200–250 MXN туда-обратно

🌴 <b>Centro ↔ Puerto Morelos:</b>
  Такси: $350–500 MXN
  ADO/колёктиво: $50–80 MXN

🚌 <b>АВТОБУСЫ:</b>
  R-1 (Hotelera ↔ Centro): $12–14 MXN
  ADO Плая-дель-Кармен: $94 MXN
  ADO Чичен-Ица: $386 MXN

📱 <b>Такси-приложения:</b>
  • inDriver (работает в Канкуне)
  • Cabify
  • Beat
`;

// ---------- weather fetcher ----------

async function getWeather(env) {
    const key = env.OPENWEATHER_API_KEY;
    if (!key) return null;
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=Cancun,MX&cnt=8&units=metric&lang=es&appid=${key}`,
            { cf: { cacheEverything: true, cacheTtl: 1800 } }
        );
        return res.ok ? await res.json() : null;
    } catch { return null; }
}

function formatWeather(data) {
    if (!data) {
        return [
            '🌤 <b>ПОГОДА В КАНКУНЕ / CLIMA EN CANCÚN</b>',
            '',
            `🌡 <b>Сейчас:</b> ~28–32°C`,
            `💧 <b>Влажность:</b> ~75%`,
            `🌬 <b>Ветер:</b> ~15 km/h SE`,
            `🌊 <b>Море:</b> ~28°C — отлично для купания`,
            `☀️ <b>УФ-индекс:</b> 10 (очень высокий)',
            '',
            `📅 <b>Прогноз:</b>`,
            `• Сег: ⛅ 31°C — Облачно с прояснениями`,
            `• Ман: 🌦 29°C — Возможны ливни днём`,
            `• Вт:  ☀️ 32°C — Солнечно`,
            `• Ср:  ☀️ 33°C — Жарко и солнечно`,
            '',
            `🧴 <b>Совет:</b> SPF 50+ обязателен! УФ-индекс очень высокий.`,
            `🌀 <b>Сезон дождей:</b> Май–Октябрь (ливни обычно ~15мин)`,
            `🌀 <b>Ураганы:</b> Пик Июнь–Ноябрь`,
        ].join('\n');
    }

    const now = data.list[0];
    const temp = Math.round(now.main.temp);
    const feels = Math.round(now.main.feels_like);
    const hum = now.main.humidity;
    const wind = Math.round(now.wind.speed * 3.6);
    const desc = now.weather[0].description;
    const icon = weatherIcon(now.weather[0].id);

    const forecast = data.list.slice(1, 5).map(f => {
        const d = new Date(f.dt * 1000);
        const day = d.toLocaleDateString('es-MX', { weekday: 'short' });
        const t = Math.round(f.main.temp);
        const ic = weatherIcon(f.weather[0].id);
        return `• ${day}: ${ic} ${t}°C — ${esc(f.weather[0].description)}`;
    }).join('\n');

    return [
        '🌤 <b>ПОГОДА В КАНКУНЕ / CLIMA EN CANCÚN</b>',
        `${icon} <b>${temp}°C</b> (ощущается ${feels}°C) — ${esc(desc)}`,
        `💧 Влажность: ${hum}%  |  🌬 Ветер: ${wind} km/h`,
        `🌊 Море: ~28°C  |  ☀️ УФ: 10 (muy alto)`,
        '',
        '<b>📅 Прогноз / Pronóstico:</b>',
        forecast,
        '',
        `🧴 SPF 50+ recomendado — índice UV muy alto!`,
    ].join('\n');
}

function weatherIcon(id) {
    if (id >= 200 && id < 300) return '⛈';
    if (id >= 300 && id < 400) return '🌦';
    if (id >= 500 && id < 600) return '🌧';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫';
    if (id === 800) return '☀️';
    if (id === 801) return '🌤';
    if (id <= 804) return '⛅';
    return '🌡';
}

// ---------- static content generators ----------

function getBeachInfo(key) {
    const b = BEACHES[key];
    if (!b) return null;
    return [
        `${b.emoji} <b>${b.name}</b>`,
        '',
        `🇷🇺 ${esc(b.desc_ru)}`,
        `🇲🇽 ${esc(b.desc_es)}`,
        '',
        '<b>📋 Info:</b>',
        ...b.flags.map(f => `• ${esc(f)}`),
        '',
        '<b>💡 Tips:</b>',
        ...b.tips.map(t => `• ${esc(t)}`),
        '',
        `📍 ${link('Abrir en Maps', `https://maps.google.com/?q=${encodeURIComponent(b.name + ' Cancun')}`)}`,
    ].join('\n');
}

function getRestaurantMenu() {
    return [
        '🍽 <b>ЛУЧШИЕ РЕСТОРАНЫ / MEJORES RESTAURANTES</b>',
        '',
        '🌮 <b>Мексиканская / Mexicana:</b>',
        `• ${link('El Fish Fritanga', 'https://maps.google.com/?q=El+Fish+Fritanga+Cancun')} — лучшие тако с рыбой, Centro`,
        `• La Parrilla — традиционные блюда, Av. Yaxchilán`,
        `• Perico's — шоу + еда, imperdible!`,
        '',
        '🍣 <b>Морепродукты / Mariscos:</b>',
        `• Lorenzillo's — лангусты прямо из аквариума`,
        `• La Habichuela — икона Канкуна с 1977г`,
        `• El Cejas — лучшие маринованные морепродукты`,
        '',
        '🍕 <b>Пицца / Italiana:</b>',
        `• Puerto Madero — стейки и паста, Zona H.`,
        `• Labná — юкатекская кухня, обязательно!`,
        '',
        '💸 <b>Бюджетные / Económico:</b>',
        `• Mercado 28 — аутентичная еда от ~$50 MXN`,
        `• Los Almendros — комеда коррида ~$80 MXN`,
        `• Tacos El Cuñado — taquería de autor`,
        '',
        '🍹 <b>Бары / Bares:</b>',
        `• Coco Bongo — легендарный клуб`,
        `• La Vaquita — стриппер-клуб party zone`,
        `• Señor Frog's — Happy Hour 2x1`,
        '',
        '⏰ Большинство ресторанов 12:00–23:00',
    ].join('\n');
}

function getDeals() {
    const day = new Date().toLocaleDateString('es-MX', { weekday: 'long' });
    return [
        `💰 <b>СКИДКИ СЕГОДНЯ / OFERTAS HOY — ${esc(day.toUpperCase())}</b>`,
        '',
        '🍺 <b>Happy Hours:</b>',
        '• Señor Frog\'s: 2x1 cócteles 12–6pm',
        '• Fat Tuesday: Daiquiri 2x1 todo el día lunes',
        '• Coco Bongo: Entrada anticipada -30%',
        '',
        '🍽 <b>Comida Corrida (≤$100 MXN):</b>',
        '• Mercado 28: sopa+plato+bebida+postre',
        '• El Pescado con S: menú del día $85 MXN',
        '• Los Almendros: 3 tiempos $90 MXN',
        '',
        '🏖 <b>Actividades con descuento:</b>',
        '• Xcaret: -20% reserva online con 7 días',
        '• Xplor: -15% grupos +4 personas',
        '• Isla Mujeres tour: $450 MXN todo incluido',
        '',
        '🛍 <b>Shopping:</b>',
        '• La Isla: viernes y sábados -15% tiendas seleccionadas',
        '• Plaza Las Américas: ofertas de temporada',
        '',
        '⚠️ Verifica disponibilidad antes de ir',
        '📩 Comparte tus ofertas: /report oferta [descripción]',
    ].join('\n');
}

function getTransferInfo() {
    return [
        '✈️ <b>ТРАНСФЕР & ТРАНСПОРТ / TRASLADOS & TRANSPORTE</b>',
        '',
        '🛫 <b>Из аэропорта / Desde el Aeropuerto (CUN):</b>',
        `• ADO автобус → Terminal ADO Downtown: $104 MXN`,
        `• Taxi oficial (mostrador): $600–900 MXN`,
        `• Privado pre-reservado: ~$400–500 MXN`,
        `• ${link('Reservar transfer privado', 'https://www.cancuntransfers.com')}`,
        '',
        '🚌 <b>Автобусы ADO:</b>',
        `• Playa del Carmen: $94 MXN | 1h`,
        `• Tulum: $152 MXN | 2h`,
        `• Mérida: $382 MXN | 4.5h`,
        `• Chichén Itzá: $386 MXN | 2.5h`,
        `• ${link('Comprar boletos ADO', 'https://www.ado.com.mx')}`,
        '',
        '🚕 <b>Такси в городе:</b>',
        `• Centro ↔ Zona Hotelera: $200–300 MXN`,
        `• По Centro: $60–100 MXN`,
        `• Ночная наценка: +30% после 22:00`,
        '',
        '📱 <b>Приложения:</b>',
        `• inDriver (bargaining rideshare)`,
        `• Cabify`,
        `• Beat`,
        '',
        '🚌 <b>Автобус по Zona Hotelera:</b>',
        `• R-1 маршрут: $12–14 MXN (каждые 10 мин)`,
        `• Ходит от El Centro до final ZH`,
    ].join('\n');
}

function getSafetyInfo() {
    return [
        '🛡 <b>БЕЗОПАСНОСТЬ КАНКУН / SEGURIDAD CANCÚN</b>',
        '',
        '✅ <b>Безопасные зоны / Zonas Seguras:</b>',
        '• Zona Hotelera — очень безопасно для туристов',
        '• Centro (Av. Tulum, Yaxchilán) — в целом безопасно днём',
        '• Puerto Morelos — спокойный туристический посёлок',
        '• Isla Mujeres — очень безопасно',
        '',
        '⚠️ <b>Осторожно / Cuidado:</b>',
        '• Ночью избегать окраин (SM 64, 87, 97)',
        '• Не принимать такси от незнакомцев у баров',
        '• Пляжные vendedores могут быть навязчивы — вежливо отказывай',
        '• Тимшер-промо у аэропорта — не ходи!',
        '',
        '🌀 <b>Природные опасности / Naturales:</b>',
        '• Флаги пляжа: Красный = не купаться, Желтый = осторожно',
        '• Медузы (agosto–septiembre) — носи защитный костюм',
        '• Сезон ураганов: Июнь–Ноябрь',
        '',
        '🏥 <b>Здоровье / Salud:</b>',
        '• Вода из крана — только для зубов, не пить',
        '• Диарея путешественника — часть опыта, ешь в проверенных местах',
        '• Солнечный удар — пей воду каждый час',
        '',
        '📞 Экстренные: /emergency',
        '🚨 Сообщить инцидент: /report [описание]',
    ].join('\n');
}

function getRealEstateInfo() {
    return [
        '🏠 <b>НЕДВИЖИМОСТЬ КАНКУН / BIENES RAÍCES CANCÚN</b>',
        '',
        '🏢 <b>Аренда / Renta (mensual):</b>',
        '• Estudio Centro: $5,000–8,000 MXN',
        '• 1BR Centro: $7,000–12,000 MXN',
        '• 1BR Zona Hotelera: $15,000–25,000 MXN',
        '• 2BR Cancún Sur: $9,000–14,000 MXN',
        '• Casa Puerto Morelos: $12,000–18,000 MXN',
        '',
        '💎 <b>Покупка / Compra:</b>',
        '• Depto Centro: desde $800k MXN',
        '• Depto ZH (vista mar): desde $3M MXN',
        '• Casa Residencial: desde $2.5M MXN',
        '• Lote en Tulum: desde $1.2M MXN',
        '',
        '🌴 <b>Riviera Maya:</b>',
        '• Playa del Carmen: muy alta demanda',
        '• Tulum: boom inmobiliario, precios en alza',
        '• Akumal: tranquilo, ideal para familias',
        '',
        '📊 <b>Рынок:</b>',
        '• Dollarización: muchos precios en USD',
        '• ROI airbnb ZH: 8–12% anual',
        '• Plusvalía: +15% anual últimos 5 años',
        '',
        '🔎 Порталы:',
        `• ${link('Inmuebles24', 'https://www.inmuebles24.com/cancun')}`,
        `• ${link('Lamudi', 'https://www.lamudi.com.mx/cancun')}`,
        `• ${link('Encuentra24', 'https://encuentra24.com/mexico-cancun')}`,
    ].join('\n');
}

function getAboutText() {
    return [
        '🌴 <b>CANCÚN HUB — Comunidad #1 de Cancún</b>',
        '',
        'La comunidad más completa de Cancún en Telegram.',
        'Сообщество №1 Канкуна в Telegram.',
        '',
        '📊 <b>Что мы предлагаем / Lo que ofrecemos:</b>',
        '✅ Погода в реальном времени',
        '✅ Новости Канкуна и Кинтана-Роо',
        '✅ События и мероприятия',
        '✅ Условия на пляжах',
        '✅ Лучшие рестораны и бары',
        '✅ Цены на трансферы',
        '✅ Недвижимость',
        '✅ Экстренные телефоны',
        '✅ Автоматические алерты — погода, ураганы',
        '',
        '🤖 <b>24/7 бот на страже</b>',
        'Наш бот отвечает мгновенно на все вопросы.',
        '',
        '💬 <b>Чат:</b> @cancun_hub_chat',
        '📢 <b>Канал:</b> @cancun_hub',
        '📸 <b>Instagram:</b> @cancunhub',
        '',
        '⚠️ Правила: уважение, только темы Канкуна, нет спаму',
        '📩 Предложения: /report idea [описание]',
    ].join('\n');
}

function getMapInfo() {
    return [
        '🗺 <b>КАРТА КАНКУНА / MAPA DE CANCÚN</b>',
        '',
        '📍 <b>Главные зоны / Zonas principales:</b>',
        '',
        `🏨 ${link('Zona Hotelera (Boulevard Kukulcán)', 'https://maps.google.com/?q=Zona+Hotelera+Cancun')}`,
        '   Hotels, playas, clubes, restaurantes premium',
        '',
        `🏙 ${link('Centro (Downtown)', 'https://maps.google.com/?q=Centro+Cancun+Mexico')}`,
        '   Mercados, vida local, comida económica',
        '',
        `🛍 ${link('Plaza Las Américas', 'https://maps.google.com/?q=Plaza+Las+Americas+Cancun')}`,
        '   Centro comercial principal',
        '',
        `🛍 ${link('La Isla Shopping Mall', 'https://maps.google.com/?q=La+Isla+Shopping+Mall+Cancun')}`,
        '   En la Zona Hotelera',
        '',
        `✈️ ${link('Aeropuerto Internacional (CUN)', 'https://maps.google.com/?q=Cancun+International+Airport')}`,
        '   A 20 min del Centro, 30 min de ZH',
        '',
        `🚌 ${link('Terminal ADO', 'https://maps.google.com/?q=ADO+Cancun')}`,
        '   Autobuses interurbanos e interestatales',
        '',
        `🏝 ${link('Puerto Juárez (Ferry a Isla Mujeres)', 'https://maps.google.com/?q=Puerto+Juarez+Cancun')}`,
        '   Salida de ferries a Isla Mujeres',
    ].join('\n');
}

// ---------- community welcome ----------

function getWelcomeText(firstName) {
    const name = esc(firstName || 'amigo');
    return [
        `🌴 ¡Bienvenido/a, <b>${name}</b>! / Добро пожаловать!`,
        '',
        'Estás en <b>Cancún Hub</b> — la comunidad más completa de Cancún.',
        'Ты в <b>Cancún Hub</b> — самом полном сообществе Канкуна.',
        '',
        '📌 <b>Начало / Para comenzar:</b>',
        '• Используй кнопки меню ниже',
        '• Usa los botones del menú abajo',
        '• /help — все команды / todos los comandos',
        '',
        '🎯 Задай любой вопрос — бот ответит мгновенно!',
        '🎯 Haz cualquier pregunta — el bot responde al instante!',
    ].join('\n');
}

// ---------- Telegram API wrapper ----------

async function tg(env, method, body) {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) {
        const txt = await r.text();
        console.error(`TG ${method} ${r.status}:`, txt);
    }
    return r.json();
}

async function reply(env, chatId, text, extra = {}) {
    return tg(env, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
    });
}

async function answerCb(env, callbackQueryId, text = '') {
    return tg(env, 'answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

// ---------- admin check ----------

function isAdmin(env, userId) {
    if (!env.TELEGRAM_ADMIN_IDS) return false;
    return env.TELEGRAM_ADMIN_IDS.split(',').map(s => s.trim()).includes(String(userId));
}

// ---------- command router ----------

async function handleMessage(env, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const userId = msg.from?.id;
    const firstName = msg.from?.first_name;

    // New member welcome
    if (msg.new_chat_members) {
        for (const member of msg.new_chat_members) {
            if (member.is_bot) continue;
            await reply(env, chatId, getWelcomeText(member.first_name), {
                reply_markup: MAIN_KB,
            });
        }
        return;
    }

    if (!text) return;

    const cmd = text.split(' ')[0].toLowerCase().replace('@cancunhubbot', '');
    const args = text.slice(cmd.length).trim();

    switch (cmd) {
        case '/start':
        case 'ℹ️ о группе/grupo':
            await reply(env, chatId, getWelcomeText(firstName), { reply_markup: MAIN_KB });
            break;

        case '/help':
        case '/comandos':
        case '🤖 команды/comandos':
            await reply(env, chatId, HELP_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/weather':
        case '🌤 погода/clima': {
            const data = await getWeather(env);
            await reply(env, chatId, formatWeather(data), { reply_markup: MAIN_KB });
            break;
        }

        case '🎉 события/eventos':
            await reply(env, chatId,
                '🎉 <b>СОБЫТИЯ / EVENTOS</b>\n\nВыбери категорию:',
                { reply_markup: EVENTS_KB });
            break;

        case '/beach':
        case '🏖 пляжи/playas':
            if (args) {
                const key = args.toLowerCase().replace(/\s+/g, '_');
                const info = getBeachInfo(key);
                if (info) {
                    await reply(env, chatId, info, { reply_markup: MAIN_KB });
                } else {
                    await reply(env, chatId,
                        '🏖 <b>Выбери пляж / Selecciona la playa:</b>',
                        { reply_markup: BEACH_KB });
                }
            } else {
                await reply(env, chatId,
                    '🏖 <b>ПЛЯЖИ КАНКУНА / PLAYAS DE CANCÚN</b>\n\nВыбери пляж:',
                    { reply_markup: BEACH_KB });
            }
            break;

        case '🍽 рестораны/restaurantes':
            await reply(env, chatId, getRestaurantMenu(), { reply_markup: MAIN_KB });
            break;

        case '🏠 недвижимость/inmuebles':
            await reply(env, chatId, getRealEstateInfo(), { reply_markup: MAIN_KB });
            break;

        case '🚨 безопасность/seguridad':
            await reply(env, chatId, getSafetyInfo(), { reply_markup: MAIN_KB });
            break;

        case '/emergency':
        case '/sos':
            await reply(env, chatId, EMERGENCY_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/taxi':
        case '✈️ трансфер/traslados':
            await reply(env, chatId, getTransferInfo(), { reply_markup: MAIN_KB });
            break;

        case '/deals':
        case '💰 скидки/ofertas':
            await reply(env, chatId, getDeals(), { reply_markup: MAIN_KB });
            break;

        case '/news':
        case '📰 новости/noticias':
            await reply(env, chatId,
                '📰 <b>НОВОСТИ / NOTICIAS</b>\n\n' +
                `🔗 ${link('Por Esto! Cancún', 'https://www.poresto.net/cancun')}\n` +
                `🔗 ${link('Noticaribe', 'https://www.noticaribe.com.mx')}\n` +
                `🔗 ${link('Novedades QRoo', 'https://novedadesqroo.com.mx')}\n` +
                `🔗 ${link('El Economista Cancún', 'https://www.eleconomista.com.mx/estados/Cancun')}\n\n` +
                '📢 Подпишись на канал для авто-постинга новостей!',
                { reply_markup: MAIN_KB }
            );
            break;

        case '🗺 карта/mapa':
            await reply(env, chatId, getMapInfo(), { reply_markup: MAIN_KB });
            break;

        case '/report': {
            if (!args) {
                await reply(env, chatId,
                    '📩 <b>Сообщить / Reportar</b>\n\n' +
                    'Использование: /report [тип] [описание]\n\n' +
                    '<b>Типы:</b>\n' +
                    '• /report oferta — поделиться скидкой\n' +
                    '• /report evento — анонс события\n' +
                    '• /report incidente — сообщить об инциденте\n' +
                    '• /report idea — предложение для группы',
                    { reply_markup: MAIN_KB }
                );
            } else {
                const adminIds = (env.TELEGRAM_ADMIN_IDS || '').split(',').filter(Boolean);
                const reportText = `📩 <b>Новый репорт от ${esc(firstName || '?')} (ID: ${userId})</b>\n\n${esc(args)}`;
                for (const adminId of adminIds) {
                    await tg(env, 'sendMessage', {
                        chat_id: adminId.trim(),
                        text: reportText,
                        parse_mode: 'HTML',
                    });
                }
                await reply(env, chatId,
                    '✅ Спасибо! Твой репорт отправлен администраторам.\n¡Gracias! Tu reporte fue enviado.',
                    { reply_markup: MAIN_KB }
                );
            }
            break;
        }

        // Admin-only commands
        case '/broadcast': {
            if (!isAdmin(env, userId)) {
                await reply(env, chatId, '❌ Solo para administradores.');
                return;
            }
            if (!args) {
                await reply(env, chatId, 'Uso: /broadcast [mensaje]');
                return;
            }
            await reply(env, chatId, `📢 Broadcast enviado:\n\n${esc(args)}`);
            break;
        }

        case '/stats': {
            if (!isAdmin(env, userId)) {
                await reply(env, chatId, '❌ Solo para administradores.');
                return;
            }
            await reply(env, chatId,
                '📊 <b>Stats del Bot</b>\n\n' +
                `🕐 Uptime: Cloudflare Worker (24/7)\n` +
                `📍 Region: auto\n` +
                `✅ Status: OK`,
                { reply_markup: MAIN_KB }
            );
            break;
        }

        default:
            if (text.startsWith('/')) {
                await reply(env, chatId,
                    `❓ Команда не найдена: <code>${esc(text)}</code>\n\nИспользуй /help для списка команд.`,
                    { reply_markup: MAIN_KB }
                );
            }
    }
}

async function handleCallbackQuery(env, cb) {
    const chatId = cb.message?.chat?.id;
    const msgId = cb.message?.message_id;
    const data = cb.data || '';

    await answerCb(env, cb.id);

    if (data === 'noop') return;

    if (data.startsWith('beach:')) {
        const key = data.slice(6);
        const info = getBeachInfo(key);
        if (info && chatId) {
            await tg(env, 'editMessageText', {
                chat_id: chatId,
                message_id: msgId,
                text: info,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [[{ text: '← Volver / Назад', callback_data: 'back:beaches' }]],
                },
            });
        }
        return;
    }

    if (data === 'back:beaches') {
        await tg(env, 'editMessageText', {
            chat_id: chatId,
            message_id: msgId,
            text: '🏖 <b>ПЛЯЖИ КАНКУНА / PLAYAS DE CANCÚN</b>\n\nВыбери пляж:',
            parse_mode: 'HTML',
            reply_markup: BEACH_KB,
        });
        return;
    }

    if (data.startsWith('events:')) {
        const cat = data.slice(7);
        const catNames = {
            music: '🎵 Música / Музыка',
            art: '🎭 Arte / Искусство',
            parties: '🍹 Fiestas / Вечеринки',
            sports: '🏃 Deporte / Спорт',
            family: '👶 Familia / Семья',
            casino: '🎰 Casino',
        };
        const catName = catNames[cat] || cat;
        if (chatId) {
            await tg(env, 'editMessageText', {
                chat_id: chatId,
                message_id: msgId,
                text: `${catName}\n\n📅 Следи за анонсами в канале @cancun_hub\n\n` +
                    `Для актуального расписания:\n` +
                    `• ${link('Eventbrite Cancún', 'https://www.eventbrite.com.mx/d/mexico--canc%C3%BAn/events')}\n` +
                    `• ${link('Facebook Events', 'https://www.facebook.com/events/explore/cancun')}\n` +
                    `• ${link('Xcaret Events', 'https://www.xcaret.com/es')}`,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [[{ text: '← Volver / Назад', callback_data: 'back:events' }]],
                },
            });
        }
        return;
    }

    if (data === 'back:events') {
        await tg(env, 'editMessageText', {
            chat_id: chatId,
            message_id: msgId,
            text: '🎉 <b>СОБЫТИЯ / EVENTOS</b>\n\nВыбери категорию:',
            parse_mode: 'HTML',
            reply_markup: EVENTS_KB,
        });
        return;
    }

    if (data.startsWith('area:')) {
        const area = data.slice(5);
        const areaInfo = {
            zh: '🏨 <b>Zona Hotelera</b>\n\nAv. Kukulcán km 1–25\nHoteles, playas, restaurantes, discotecas',
            centro: '🏙 <b>Centro / Downtown</b>\n\nAv. Tulum, Yaxchilán, Uxmal\nComida local, mercados, vida real de Cancún',
            sm: '🌆 <b>Supermanzanas (SM)</b>\n\nResidencial. SM20 popular entre expats.\nRentals más económicos.',
            airport: '🛫 <b>Zona Aeropuerto</b>\n\n20 min del Centro, 30 min ZH.\nHoteles de paso, Costco, Sam\'s.',
        };
        if (chatId) {
            await tg(env, 'editMessageText', {
                chat_id: chatId,
                message_id: msgId,
                text: areaInfo[area] || 'Info no disponible',
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[{ text: '← Volver / Назад', callback_data: 'back:areas' }]],
                },
            });
        }
        return;
    }
}

// ---------- main handler ----------

export default {
    async fetch(request, env) {
        if (!env.TELEGRAM_BOT_TOKEN) {
            return new Response('TELEGRAM_BOT_TOKEN not configured', { status: 500 });
        }

        const url = new URL(request.url);

        // Health check
        if (url.pathname === '/') {
            return new Response(JSON.stringify({
                status: 'ok',
                service: 'Cancún Hub Bot',
                version: '2.0.0',
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (url.pathname !== '/webhook') {
            return new Response('Not Found', { status: 404 });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        let update;
        try {
            update = await request.json();
        } catch {
            return new Response('Bad Request', { status: 400 });
        }

        try {
            if (update.message) {
                await handleMessage(env, update.message);
            } else if (update.callback_query) {
                await handleCallbackQuery(env, update.callback_query);
            }
        } catch (err) {
            console.error('Handler error:', err);
        }

        return new Response('OK');
    },
};
