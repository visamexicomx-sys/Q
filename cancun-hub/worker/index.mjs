// Cloudflare Worker — Playa del Carmen Hub Telegram Bot
//
// Deploy:  wrangler deploy
// Webhook: curl "https://api.telegram.org/bot$TOKEN/setWebhook?url=https://<worker>.workers.dev/webhook"
//
// Secrets (wrangler secret put):
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_ADMIN_IDS   — comma-separated list of admin Telegram user IDs
//   OPENWEATHER_API_KEY  — for live weather data (optional, free tier OK)

// ---------- formatting helpers ----------

const esc  = (s = '') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const link = (text, url) => `<a href="${esc(url)}">${esc(text)}</a>`;
const trim = (s = '', n = 80) => s.length > n ? s.slice(0, n - 1) + '…' : s;

// ---------- keyboards ----------

const MAIN_KB = {
    keyboard: [
        [{ text: '🌤 Weather/Clima/Погода' }, { text: '🎉 Events/Eventos/События' }, { text: '🏖 Beaches/Playas/Пляжи' }],
        [{ text: '🍽 Restaurants/Restaurantes' }, { text: '🏠 Real Estate/Inmuebles' }, { text: '🚨 Safety/Seguridad' }],
        [{ text: '⛴ Ferry Cozumel' }, { text: '💰 Deals/Ofertas/Скидки' }, { text: '📰 News/Noticias/Новости' }],
        [{ text: '🗺 Map/Mapa/Карта' }, { text: '🚌 Transport/Transporte' }, { text: 'ℹ️ About/Acerca/О нас' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
};

const BEACH_KB = {
    inline_keyboard: [
        [{ text: '🏖 Playa Mamitas', callback_data: 'beach:mamitas' }, { text: '🌴 Playa Coco', callback_data: 'beach:coco' }],
        [{ text: '💎 Punta Esmeralda', callback_data: 'beach:esmeralda' }, { text: '🐢 Xcacel-Xcacelito', callback_data: 'beach:xcacel' }],
        [{ text: '🦈 Akumal', callback_data: 'beach:akumal' }, { text: '🏝 Cozumel', callback_data: 'beach:cozumel' }],
    ],
};

const EVENTS_KB = {
    inline_keyboard: [
        [{ text: '🎵 Music/Música', callback_data: 'events:music' }, { text: '🎭 Art/Arte', callback_data: 'events:art' }],
        [{ text: '🍹 Parties/Fiestas', callback_data: 'events:parties' }, { text: '🏃 Sports/Deporte', callback_data: 'events:sports' }],
        [{ text: '🧘 Wellness/Bienestar', callback_data: 'events:wellness' }, { text: '🌮 Food/Comida', callback_data: 'events:food' }],
    ],
};

// ---------- beach data ----------

const BEACHES = {
    mamitas: {
        name: 'Playa Mamitas',
        emoji: '🏖',
        en: 'PDC\'s most famous beach club. Turquoise water, DJs, sun beds. Paid access to beach club area; public access next to it.',
        es: 'El beach club más famoso de PDC. Agua turquesa, DJs, camastros. Acceso pagado a la zona del club; acceso público al lado.',
        ru: 'Самый известный пляжный клуб PDC. Бирюзовая вода, DJ, лежаки. Платный вход в зону клуба; рядом есть бесплатный доступ.',
        flags: ['🎵 DJ sessions daily from noon', '🏖 Sun beds: $300–500 MXN/day with min. consumption', '🆓 Free public beach access 50m north'],
        tips: ['⏰ Best time: 9–11am before the crowds', '🎧 Electronic music starts at 2pm', '🧴 Very high UV — SPF 50+ required'],
        maps: 'https://maps.google.com/?q=Playa+Mamitas+Playa+del+Carmen',
    },
    coco: {
        name: 'Playa Coco',
        emoji: '🌴',
        en: 'Free public beach at the end of 5th Avenue. Great for swimming, calm water, local vibe. Most accessible beach in PDC.',
        es: 'Playa pública gratuita al final de la 5a Avenida. Excelente para nadar, agua tranquila, ambiente local.',
        ru: 'Бесплатный публичный пляж в конце 5-й авеню. Отличный для купания, спокойная вода, местная атмосфера.',
        flags: ['🆓 Completely free access', '🚿 Public showers available', '🍹 Palapa bars with affordable drinks'],
        tips: ['🧺 Bring your own umbrella', '🌅 Best sunset views in PDC', '🚶 5 min walk from 5th Ave shops'],
        maps: 'https://maps.google.com/?q=Playa+Coco+Playa+del+Carmen',
    },
    esmeralda: {
        name: 'Punta Esmeralda',
        emoji: '💎',
        en: 'Hidden gem 5km north. Natural freshwater cenote meets the Caribbean Sea. Spectacular and uncrowded.',
        es: 'Joya escondida a 5km al norte. Cenote de agua dulce natural que encuentra el mar Caribe. Espectacular y sin multitudes.',
        ru: 'Скрытая жемчужина в 5 км к северу. Природный пресноводный сенот встречается с Карибским морем. Уникально и немноголюдно.',
        flags: ['💎 Freshwater cenote + Caribbean sea in one spot', '🌿 Natural, no beach clubs', '🅿️ Small parking area available'],
        tips: ['🚗 Best reached by car or taxi (~$80 MXN)', '🏊 Swim in both fresh and salt water', '📸 Most photogenic spot near PDC'],
        maps: 'https://maps.google.com/?q=Punta+Esmeralda+Playa+del+Carmen',
    },
    xcacel: {
        name: 'Xcacel-Xcacelito',
        emoji: '🐢',
        en: 'Protected turtle nesting beach 40km south. No infrastructure by design. Cenote inside the jungle. Raw nature.',
        es: 'Playa protegida para tortugas a 40km al sur. Sin infraestructura por diseño. Cenote en la selva. Naturaleza pura.',
        ru: 'Охраняемый пляж гнездования черепах в 40 км к югу. Без инфраструктуры намеренно. Сенот в джунглях. Дикая природа.',
        flags: ['🐢 Sea turtle nesting: May–October', '🦺 Volunteer turtle program available', '🌿 Cenote with jungle trail'],
        tips: ['🐢 Night turtle watching Jun–Sep (guided tours)', '🔦 Bring flashlight for cenote trail', '🚗 Car rental recommended'],
        maps: 'https://maps.google.com/?q=Xcacel+Xcacelito+beach+Mexico',
    },
    akumal: {
        name: 'Akumal',
        emoji: '🦈',
        en: '35km south. World-famous for swimming with sea turtles year-round. Calm bay protected by reef. Must-do from PDC.',
        es: 'A 35km al sur. Famoso mundialmente por nadar con tortugas marinas todo el año. Bahía tranquila protegida por arrecife.',
        ru: 'В 35 км к югу. Мировая слава за плавание с морскими черепахами круглый год. Спокойная бухта за коралловым рифом.',
        flags: ['🐢 Turtles guaranteed year-round in the bay', '🤿 Snorkel gear rental: $150–200 MXN', '🦀 Cenote Yal-Ku just north — reef fish'],
        tips: ['🕗 Arrive at 8am before tour groups flood in', '🎫 Entry fee: $20 MXN (conservation)', '🚌 Colectivo from PDC: $35 MXN (35 min)'],
        maps: 'https://maps.google.com/?q=Akumal+Bay+Mexico',
    },
    cozumel: {
        name: 'Cozumel Island',
        emoji: '🏝',
        en: '45-min ferry from PDC. World\'s second-largest coral reef. Top diving and snorkeling destination on the planet.',
        es: 'Ferry de 45 min desde PDC. Segundo arrecife de coral más grande del mundo. Destino top de buceo y snorkel.',
        ru: 'Паром 45 минут из PDC. Второй по величине коралловый риф мира. Топовое место для дайвинга и снорклинга на планете.',
        flags: ['⛴️ Ferry: Winjet/UltraMar ~$300 MXN round trip', '🤿 World-class drift diving in Palancar Reef', '🛵 Rent a scooter at the dock: $300–400 MXN/day'],
        tips: ['📅 Full day recommended — take the 8am ferry', '🐠 Even snorkeling from shore is spectacular', '🏪 Puerto Morelos exit: cheaper duty-free shops'],
        maps: 'https://maps.google.com/?q=Cozumel+Mexico',
    },
};

// ---------- static content ----------

const HELP_TEXT = `
🌴 <b>Playa del Carmen Hub Bot</b>

<b>🌤 WEATHER / CLIMA / ПОГОДА</b>
Live weather + 7-day forecast for PDC

<b>🎉 EVENTS / EVENTOS / СОБЫТИЯ</b>
Music, art, parties, sports, wellness, food

<b>🏖 BEACHES / PLAYAS / ПЛЯЖИ</b>
6 locations: conditions, safety flags, tips

<b>🍽 RESTAURANTS</b>
Best spots by cuisine and budget

<b>🏠 REAL ESTATE / INMUEBLES</b>
Rentals and sales in PDC & Riviera Maya

<b>🚨 SAFETY / SEGURIDAD / БЕЗОПАСНОСТЬ</b>
Current alerts and safe zones

<b>⛴ FERRY TO COZUMEL</b>
Schedule, prices, tips

<b>💰 DEALS / OFERTAS / СКИДКИ</b>
Happy hours, promos, hot deals

<b>🚌 TRANSPORT</b>
ADO, colectivos, taxis, airport transfers

<b>COMMANDS / COMANDOS / КОМАНДЫ:</b>
/weather — live weather
/beach [name] — beach conditions
/events — upcoming events
/deals — today's deals
/ferry — Cozumel ferry info
/emergency — emergency numbers
/taxi — transport prices
/quinta — 5th Avenue guide
/report [text] — report to admins

<b>Chat:</b> @pdchub_chat
`;

const EMERGENCY_TEXT = `
🚨 <b>EMERGENCY NUMBERS / EMERGENCIAS / ЭКСТРЕННЫЕ</b>
📍 Playa del Carmen / Solidaridad, Q.Roo

🚔 <b>Police / Policía / Полиция:</b> 066 | 911
🚑 <b>Ambulance / Ambulancia:</b> 065 | 911
🔥 <b>Fire / Bomberos / Пожар:</b> 068 | 911
🏥 <b>IMSS Urgencias:</b> 800-900-2000
🦅 <b>Guardia Nacional:</b> 088

🌊 <b>Coast Guard / Capitanía:</b> 984-873-3560
✈️ <b>CUN Airport:</b> 998-848-7200
⛴️ <b>Cozumel Ferry (UltraMar):</b> 984-879-3223

🏥 <b>Hospitals / Hospitales:</b>
• Hospital CMQ Riviera Maya: 984-803-1535
• Hospiten Riviera Maya: 984-877-4560
• Amerimed Playa: 984-803-3188

💊 <b>24h Pharmacy / Farmacia 24h:</b>
• Farmacia del Ahorro — 5a Av. & Juárez
• Benavides — 10a Av. & Constituyentes

📱 <b>Taxi PDC:</b> 984-873-1567
📱 <b>ADO buses:</b> 800-900-0105
📱 <b>Anonymous tip / Denuncia:</b> 089
`;

const FERRY_TEXT = `
⛴️ <b>FERRY TO COZUMEL / FERRY A COZUMEL / ПАРОМ НА КОСУМЕЛЬ</b>

🚢 <b>Operators / Operadores:</b>
• <b>UltraMar</b> — Terminal La Punta (5a Av. & Constituyentes)
• <b>Winjet</b> — Terminal Cozumel
Both: ~45 min crossing / Ambos: ~45 min de travesía

⏰ <b>Departures / Salidas / Отправление:</b>
Every 60–90 min from 6:00 to 22:00

💰 <b>Price / Precio / Цена:</b>
Round trip / Ida y vuelta: ~$300–360 MXN
One way / Solo ida: ~$180 MXN
Note: prices vary by season

🛵 <b>On Cozumel / En Cozumel:</b>
• Scooter / Moto: $300–400 MXN/day
• Golf cart / Carrito: $400–500 MXN/day
• Taxi island tour: $500–700 MXN

🤿 <b>Diving in Cozumel:</b>
• 2-tank dive: $900–1,200 MXN
• Snorkel tour: $400–600 MXN
• Equipment rental: $200–300 MXN

💡 <b>Tips / Consejos / Советы:</b>
• Buy tickets at the terminal — no need to book online for most departures
• Take first ferry (6am) for calm seas
• Last return ferry ~10pm — check schedule!
• Bring cash — some Cozumel restaurants don't take cards

📍 ${link('UltraMar Terminal PDC', 'https://maps.google.com/?q=UltraMar+Ferry+Terminal+Playa+del+Carmen')}
`;

const QUINTA_TEXT = `
🛍 <b>5TH AVENUE GUIDE / GUÍA DE LA QUINTA / ГАЙД ПО 5-Й АВЕНЮ</b>

<b>La Quinta Avenida</b> — pedestrian paradise, 3.5km long.
La arteria principal de PDC. Tiendas, restaurantes, bares, arte.
Главная пешеходная улица PDC — 3,5 км без машин.

🗺 <b>Zones / Zonas / Зоны:</b>

🏛 <b>South / Sur / Юг (Av. Juárez → Calle 12):</b>
Touristy zone. Souvenirs, tacos, mezcal bars. Good for first-timers.

🌿 <b>Middle / Centro (Calle 12 → Calle 28):</b>
Mix of locals + tourists. Best restaurants. Parque Los Fundadores.

💎 <b>North / Norte / Север (Calle 28 → Calle 46+):</b>
Upscale boutiques, rooftop bars, expat cafés. Less touristy.

🍽 <b>Must-eat on 5th / Imperdible:</b>
• El Fogón — taco legend of PDC (Calle 12)
• La Perla Pixan — Yucatán cuisine, worth the queue
• Carboncitos — casual but iconic
• Oh La La — French pastries for breakfast

🍹 <b>Happy Hours on 5th:</b>
• Zenzi — beach bar 4–7pm
• Mambo Café — salsa + 2x1 mojitos
• Alux (in a cenote!) — cocktails from 5pm

🛒 <b>Shopping Tips / Compras / Покупки:</b>
• Mezcal shops: compare before buying
• Silver jewelry: ask for 925 hallmark
• Don't buy on 5th Ave what you can find cheaper at Chedraui
`;

const TRANSPORT_TEXT = `
🚌 <b>TRANSPORT PDC / TRANSPORTE / ТРАНСПОРТ</b>

✈️ <b>Cancún Airport (CUN) → PDC:</b>
• ADO bus (direct): $208 MXN | 75 min
• Private transfer: $800–1,200 MXN
• Colectivo (shared van, from Puerto Morelos): ~$200 MXN
• Tip: Book ADO online at ado.com.mx — same price, less queue

🚌 <b>ADO buses from PDC Terminal:</b>
• Cancún: $94 MXN | 60 min
• Tulum: $62 MXN | 45 min
• Chichén Itzá: $304 MXN | 3h
• Mérida: $314 MXN | 4h
• Bacalar: $290 MXN | 4h
• Mexico City: from $900 MXN | 24h
📱 ${link('Buy ADO tickets online', 'https://www.ado.com.mx')}

🚐 <b>Colectivos (shared vans — cheapest option):</b>
• PDC → Cancún: $50–60 MXN | departs from Av. Juárez
• PDC → Tulum: $35–45 MXN | departs from Av. Juárez
• PDC → Akumal: $35 MXN
• Runs: ~6am–11pm, every 10–15 min

🚕 <b>Taxis in PDC:</b>
• Centro → North Colonias: $60–100 MXN
• Centro → Airport Playa: $150–200 MXN
• Night surcharge after 10pm: +30%
• From CUN Airport: use official taxi desks (~$900 MXN PDC)

🛵 <b>Scooter & Bike:</b>
• Scooter rental: $300–400 MXN/day
• Bike rental: $100–150 MXN/day
• Many rental shops on 5th Ave & Constituyentes

📱 <b>Ride apps / Apps de transporte:</b>
• inDriver — best for negotiating price
• Cabify — fixed price, reliable
`;

const REAL_ESTATE_TEXT = `
🏠 <b>REAL ESTATE PDC / INMUEBLES / НЕДВИЖИМОСТЬ</b>

🏢 <b>Rentals / Renta / Аренда (monthly / mensual):</b>
• Studio Centro: $7,000–11,000 MXN
• 1BR Centro (near 5th): $10,000–16,000 MXN
• 2BR Playacar Phase II: $18,000–28,000 MXN
• 3BR Valhalla / Colosio: $14,000–20,000 MXN
• Beachfront luxury: $40,000–80,000 MXN+

💎 <b>For Sale / Venta / Покупка:</b>
• Studio (downtown): from $1.2M MXN / ~$70k USD
• 1BR condo (gated): $1.8–2.5M MXN
• Luxury condo (sea view): from $4M MXN
• Land in La Veleta Tulum: from $1.5M MXN
• Pre-sale condos: from $2.5M MXN

📈 <b>Market / Mercado / Рынок:</b>
• PDC appreciation: +18–22% annually (2023–2025)
• Airbnb ROI: 10–15% in Centro / ZH
• High demand from Canadian & European expats
• Dollarization: most prices quoted in USD

🌴 <b>Popular areas / Zonas populares:</b>
• Playacar Phase I & II — gated, golf course
• Zazil-Ha — upscale north, quiet
• Ejidal / Colosio — budget, growing
• La Veleta / Aldea Zamá (Tulum) — high ROI

🔎 <b>Portals / Portales / Порталы:</b>
• ${link('Inmuebles24', 'https://www.inmuebles24.com/playa-del-carmen')}
• ${link('Lamudi', 'https://www.lamudi.com.mx/playa-del-carmen')}
• ${link('Encuentra24', 'https://encuentra24.com/mexico-quintana_roo-playa_del_carmen')}
`;

const SAFETY_TEXT = `
🛡 <b>SAFETY / SEGURIDAD / БЕЗОПАСНОСТЬ</b>
📍 Playa del Carmen

✅ <b>Safe zones / Zonas seguras / Безопасные зоны:</b>
• La Quinta Avenida (5th Ave) — very safe day & night
• Playacar — gated, very safe, tourist area
• Centro (Av. Juárez to Calle 20) — safe during the day
• Main beaches — safe with normal precautions

⚠️ <b>Be careful / Cuidado / Осторожно:</b>
• Colonias north of Calle 40 at night — avoid unfamiliar streets
• Don't flash expensive jewelry on beaches
• Use ATMs inside supermarkets or banks, not street ATMs at night
• Timeshare promoters on 5th — politely decline and walk away

🌊 <b>Natural hazards / Naturales / Природные:</b>
• Rip currents — always check beach flags
• 🔴 Red flag = no swimming
• 🟡 Yellow = caution
• 🟦 Blue / Green = safe
• Jellyfish peak: August–September
• Hurricane season: June–November

🏥 <b>Health / Salud / Здоровье:</b>
• Don't drink tap water — bottled only
• Traveler's diarrhea: common, eat at clean spots
• Sun: UV index 10–11 (extreme) — SPF 50+ every 2h
• IMSS emergency: 065 | Private: Hospital CMQ 984-803-1535

📞 Emergency / Emergencia / Экстренные: /emergency
📩 Report incident: /report incidente [description]
`;

const RESTAURANTS_TEXT = `
🍽 <b>BEST RESTAURANTS PDC / MEJORES RESTAURANTES / ЛУЧШИЕ РЕСТОРАНЫ</b>

🌮 <b>Mexican / Mexicana / Мексиканская:</b>
• ${link('El Fogón', 'https://maps.google.com/?q=El+Fogon+Playa+del+Carmen')} — legendary tacos de pastor, queue expected
• La Perla Pixan — Yucatán cuisine, cochinita pibil
• El Pirata — local seafood, affordable

🤿 <b>Seafood / Mariscos / Морепродукты:</b>
• Alux — cocktails in a cenote + fine dining
• La Cueva del Chango — jungle garden, organic, brunch legend
• El Oasis — ceviche and fish tacos

🌍 <b>International / Internacional:</b>
• OMG PDC — burgers & craft beer (rooftop)
• Oh La La! Bistro — French pastries + coffee
• Babe's Noodles — cheap Thai, expat favorite
• Ah Cacao — best hot chocolate + local dishes

💸 <b>Budget / Económico / Бюджетно (≤$100 MXN):</b>
• Mercado 28 style: check Calle 2 local spots
• Comida corrida anywhere off 5th Ave: 3 courses ~$80 MXN
• Taquería La Rancherita — pastor heaven

🍹 <b>Bars & Beach clubs / Bares / Бары:</b>
• Zenzi Beach Bar — sunset, live music, mellow vibe
• Mambo Café — salsa dancing + tropical drinks
• Dirty Martini — rooftop, DJ nights
• The Roof Bar — best view of the Caribbean

⏰ Most restaurants: 8:00–23:00
`;

const ABOUT_TEXT = `
🌴 <b>PLAYA DEL CARMEN HUB</b>
<i>The #1 PDC Community on Telegram</i>

The most complete Playa del Carmen community — in English, Spanish & Russian.
La comunidad más completa de PDC — en inglés, español y ruso.
Самое полное сообщество PDC — на английском, испанском и русском.

<b>✅ What we offer / Qué ofrecemos / Что у нас есть:</b>
🌤 Live weather + storm alerts
🏖 Beach conditions for 6+ spots
🎉 Events by category
🍽 Best restaurants & bars
⛴️ Cozumel ferry guide
🚌 Transport & prices
🏠 Real estate market
🚨 Emergency numbers
🛍 5th Ave complete guide
📰 Local PDC news
🤖 24/7 instant bot responses

<b>🤖 Bot is always on — type anything!</b>
Нажми /help | Escribe /help | Type /help

💬 <b>Chat:</b> @pdchub_chat
📢 <b>Channel:</b> @pdchub
📸 <b>Instagram:</b> @pdchub

⚠️ Rules: respect, PDC topics only, no spam
📩 Suggestions: /report idea [description]
`;

const MAP_TEXT = `
🗺 <b>PDC MAP / MAPA DE PDC / КАРТА PDC</b>

📍 <b>Key areas / Zonas clave / Главные зоны:</b>

🛍 ${link('La Quinta Avenida (5th Avenue)', 'https://maps.google.com/?q=5th+Avenue+Playa+del+Carmen')}
   3.5km pedestrian street. Heart of PDC.

🏖 ${link('Playa Mamitas', 'https://maps.google.com/?q=Playa+Mamitas+Playa+del+Carmen')}
   Main beach club strip, Calle 28

🏘 ${link('Playacar', 'https://maps.google.com/?q=Playacar+Playa+del+Carmen')}
   Gated community, golf, quiet beaches

⛴️ ${link('Ferry Terminal (UltraMar)', 'https://maps.google.com/?q=UltraMar+Ferry+Terminal+Playa+del+Carmen')}
   5th Ave & Constituyentes → Cozumel

🚌 ${link('ADO Bus Terminal', 'https://maps.google.com/?q=ADO+Terminal+Playa+del+Carmen')}
   Av. Juárez & Av. 5a Norte

🏥 ${link('Hospital CMQ Riviera Maya', 'https://maps.google.com/?q=Hospital+CMQ+Riviera+Maya')}
   Best private hospital in PDC

🛒 ${link('Chedraui (supermarket)', 'https://maps.google.com/?q=Chedraui+Playa+del+Carmen')}
   Av. Constituyentes — best prices

🌴 ${link('Parque Los Fundadores', 'https://maps.google.com/?q=Parque+Los+Fundadores+Playa+del+Carmen')}
   Voladores de Papantla show, free
`;

const DEALS_TEXT = () => {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Cancun' });
    const dayEs = now.toLocaleDateString('es-MX', { weekday: 'long', timeZone: 'America/Cancun' });
    return [
        `💰 <b>DEALS TODAY / OFERTAS HOY / СКИДКИ СЕГОДНЯ</b>`,
        `📅 ${esc(day)} / ${esc(dayEs)}`,
        '',
        '🍹 <b>Happy Hours (daily / todos los días):</b>',
        '• Zenzi Beach: 4–7pm — 2x1 cocktails',
        '• El Fogón: Michelada promo 12–6pm',
        '• Dirty Martini: rooftop 2x1 5–8pm',
        '• Mambo Café: 2x1 mojitos before 9pm',
        '',
        '🌮 <b>Food Deals / Comida Económica / Еда дёшево:</b>',
        '• Comida corrida (lunch set): $70–100 MXN anywhere off 5th',
        '• Taco Tuesdays: many spots, $15–25 MXN per taco',
        '• Free salsa chips at most Mexican restaurants',
        '',
        '🎭 <b>Activities / Actividades / Активности:</b>',
        '• Parque Los Fundadores: Voladores show — FREE (donations welcome)',
        '• Xcaret: -20% with 7-day advance online booking',
        '• Xel-Há: all-inclusive -15% groups 4+',
        '• Cenote Azul (near Bacalar): day trip $400–500 MXN/person',
        '',
        '🏖 <b>Beach clubs / Clubs de playa:</b>',
        '• Mamitas: early bird rate before 10am',
        '• Canibal Royal: day pass with food/drink credit',
        '',
        '⚠️ Always verify before going — prices change seasonally',
        '📩 Found a deal? Share it: /report oferta [description]',
    ].join('\n');
};

// ---------- weather ----------

async function getWeather(env) {
    const key = env.OPENWEATHER_API_KEY;
    if (!key) return null;
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=Playa+del+Carmen,MX&cnt=8&units=metric&lang=en&appid=${key}`,
            { cf: { cacheEverything: true, cacheTtl: 1800 } }
        );
        return res.ok ? await res.json() : null;
    } catch { return null; }
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

function formatWeather(data) {
    if (!data) {
        return [
            '🌤 <b>WEATHER PDC / CLIMA PDC / ПОГОДА PDC</b>',
            '',
            '☀️ <b>~30°C</b> | Feels: 34°C',
            '💧 Humidity: ~80% | 🌬 Wind: ~15 km/h SE',
            '🌊 Sea: ~29°C | ☀️ UV Index: 11 (extreme)',
            '',
            '<b>📅 Forecast / Pronóstico / Прогноз:</b>',
            '• Today: ☀️ 31°C — Sunny and hot',
            '• Tomorrow: 🌤 30°C — Partly cloudy',
            '• Wed: 🌦 29°C — Afternoon shower possible',
            '• Thu: ☀️ 32°C — Clear and sunny',
            '',
            '🧴 UV extreme — SPF 50+ every 2 hours!',
            '🌀 Hurricane season: June–November',
        ].join('\n');
    }

    const cur = data.list[0];
    const temp = Math.round(cur.main.temp);
    const feels = Math.round(cur.main.feels_like);
    const hum = cur.main.humidity;
    const wind = Math.round(cur.wind.speed * 3.6);
    const icon = weatherIcon(cur.weather[0].id);
    const desc = cur.weather[0].description;

    const forecast = data.list.slice(1, 5).map(f => {
        const d = new Date(f.dt * 1000).toLocaleDateString('en-US', {
            weekday: 'short', timeZone: 'America/Cancun',
        });
        return `${d}: ${weatherIcon(f.weather[0].id)} ${Math.round(f.main.temp)}°C — ${esc(f.weather[0].description)}`;
    }).join('\n');

    return [
        '🌤 <b>WEATHER PDC / CLIMA PDC / ПОГОДА PDC</b>',
        `${icon} <b>${temp}°C</b> (feels ${feels}°C) — ${esc(desc)}`,
        `💧 Humidity: ${hum}% | 🌬 Wind: ${wind} km/h`,
        `🌊 Sea: ~29°C | ☀️ UV: 11 (extreme)`,
        '',
        '<b>📅 Forecast:</b>',
        forecast,
        '',
        '🧴 UV extreme — SPF 50+ mandatory!',
    ].join('\n');
}

// ---------- welcome ----------

function welcomeText(firstName) {
    const name = esc(firstName || 'friend');
    return [
        `🌴 <b>Welcome, ${name}! / ¡Bienvenido/a! / Добро пожаловать!</b>`,
        '',
        'You\'re in <b>Playa del Carmen Hub</b> — the #1 PDC community.',
        'Estás en <b>PDC Hub</b> — la comunidad #1 de Playa del Carmen.',
        'Ты в <b>PDC Hub</b> — сообществе №1 Плая-дель-Кармен.',
        '',
        '🎯 Use the menu buttons below / Usa los botones del menú',
        '📌 /help — full command list / lista completa / все команды',
        '',
        '🤖 Ask me anything about PDC — I reply instantly!',
    ].join('\n');
}

// ---------- Telegram API ----------

async function tg(env, method, body) {
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) console.error(`TG ${method} ${r.status}:`, await r.text());
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

async function answerCb(env, id, text = '') {
    return tg(env, 'answerCallbackQuery', { callback_query_id: id, text });
}

function isAdmin(env, userId) {
    return (env.TELEGRAM_ADMIN_IDS || '').split(',').map(s => s.trim()).includes(String(userId));
}

// ---------- command router ----------

async function handleMessage(env, msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const userId = msg.from?.id;
    const firstName = msg.from?.first_name;

    if (msg.new_chat_members) {
        for (const m of msg.new_chat_members) {
            if (m.is_bot) continue;
            await reply(env, chatId, welcomeText(m.first_name), { reply_markup: MAIN_KB });
        }
        return;
    }

    if (!text) return;

    const raw = text.split(' ')[0].toLowerCase().replace('@pdchubbot', '');
    const args = text.slice(raw.length).trim();

    switch (raw) {
        case '/start':
        case 'ℹ️ about/acerca/о нас':
            await reply(env, chatId, welcomeText(firstName), { reply_markup: MAIN_KB });
            break;

        case '/help':
        case '🤖 help':
            await reply(env, chatId, HELP_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/weather':
        case '🌤 weather/clima/погода': {
            const data = await getWeather(env);
            await reply(env, chatId, formatWeather(data), { reply_markup: MAIN_KB });
            break;
        }

        case '🎉 events/eventos/события':
            await reply(env, chatId,
                '🎉 <b>EVENTS / EVENTOS / СОБЫТИЯ</b>\n\nChoose a category / Elige categoría / Выбери категорию:',
                { reply_markup: EVENTS_KB }
            );
            break;

        case '/beach':
        case '🏖 beaches/playas/пляжи':
            if (args) {
                const key = args.toLowerCase().replace(/\s+/g, '_').replace('playa_', '');
                const info = getBeachInfo(key);
                if (info) { await reply(env, chatId, info, { reply_markup: MAIN_KB }); break; }
            }
            await reply(env, chatId,
                '🏖 <b>BEACHES / PLAYAS / ПЛЯЖИ</b>\n\nChoose a beach / Elige una playa / Выбери пляж:',
                { reply_markup: BEACH_KB }
            );
            break;

        case '🍽 restaurants/restaurantes':
            await reply(env, chatId, RESTAURANTS_TEXT, { reply_markup: MAIN_KB });
            break;

        case '🏠 real estate/inmuebles':
            await reply(env, chatId, REAL_ESTATE_TEXT, { reply_markup: MAIN_KB });
            break;

        case '🚨 safety/seguridad':
            await reply(env, chatId, SAFETY_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/emergency':
        case '/sos':
            await reply(env, chatId, EMERGENCY_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/ferry':
        case '⛴ ferry cozumel':
            await reply(env, chatId, FERRY_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/taxi':
        case '🚌 transport/transporte':
            await reply(env, chatId, TRANSPORT_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/deals':
        case '💰 deals/ofertas/скидки':
            await reply(env, chatId, DEALS_TEXT(), { reply_markup: MAIN_KB });
            break;

        case '/quinta':
            await reply(env, chatId, QUINTA_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/news':
        case '📰 news/noticias/новости':
            await reply(env, chatId,
                '📰 <b>PDC NEWS / NOTICIAS / НОВОСТИ</b>\n\n' +
                `🔗 ${link('Playa News (EN)', 'https://www.playanewsroom.com')}\n` +
                `🔗 ${link('Noticaribe (ES)', 'https://www.noticaribe.com.mx')}\n` +
                `🔗 ${link('Riviera Maya News (EN)', 'https://rivieramaya.news')}\n` +
                `🔗 ${link('Novedades QRoo (ES)', 'https://novedadesqroo.com.mx')}\n\n` +
                '📢 Subscribe to our channel for auto-posted news! @pdchub',
                { reply_markup: MAIN_KB }
            );
            break;

        case '🗺 map/mapa/карта':
            await reply(env, chatId, MAP_TEXT, { reply_markup: MAIN_KB });
            break;

        case '/report': {
            if (!args) {
                await reply(env, chatId,
                    '📩 <b>REPORT / REPORTE / РЕПОРТ</b>\n\n' +
                    'Usage / Uso / Использование:\n' +
                    '/report oferta [deal description]\n' +
                    '/report evento [event info]\n' +
                    '/report incidente [incident]\n' +
                    '/report idea [your suggestion]',
                    { reply_markup: MAIN_KB }
                );
            } else {
                const adminIds = (env.TELEGRAM_ADMIN_IDS || '').split(',').filter(Boolean);
                const msg2 = `📩 <b>Report from ${esc(firstName || '?')} (${userId})</b>\n\n${esc(args)}`;
                for (const adminId of adminIds) {
                    await tg(env, 'sendMessage', { chat_id: adminId.trim(), text: msg2, parse_mode: 'HTML' });
                }
                await reply(env, chatId,
                    '✅ Thank you! Your report was sent to admins.\n¡Gracias! Tu reporte fue enviado.\nСпасибо! Репорт отправлен.',
                    { reply_markup: MAIN_KB }
                );
            }
            break;
        }

        case '/broadcast':
            if (!isAdmin(env, userId)) { await reply(env, chatId, '❌ Admins only.'); return; }
            if (!args) { await reply(env, chatId, 'Usage: /broadcast [message]'); return; }
            await reply(env, chatId, `📢 Broadcast sent:\n\n${esc(args)}`);
            break;

        case '/stats':
            if (!isAdmin(env, userId)) { await reply(env, chatId, '❌ Admins only.'); return; }
            await reply(env, chatId,
                '📊 <b>Bot Stats</b>\n\nRuntime: Cloudflare Worker (24/7)\nStatus: ✅ OK\nRegion: auto',
                { reply_markup: MAIN_KB }
            );
            break;

        default:
            if (text.startsWith('/')) {
                await reply(env, chatId,
                    `❓ Unknown command: <code>${esc(text)}</code>\n\nType /help for the full list.`,
                    { reply_markup: MAIN_KB }
                );
            }
    }
}

function getBeachInfo(key) {
    const b = BEACHES[key];
    if (!b) return null;
    return [
        `${b.emoji} <b>${b.name}</b>`,
        '',
        `🇬🇧 ${esc(b.en)}`,
        `🇲🇽 ${esc(b.es)}`,
        `🇷🇺 ${esc(b.ru)}`,
        '',
        '<b>📋 Info:</b>',
        ...b.flags.map(f => `• ${esc(f)}`),
        '',
        '<b>💡 Tips:</b>',
        ...b.tips.map(t => `• ${esc(t)}`),
        '',
        `📍 ${link('Open in Maps', b.maps)}`,
    ].join('\n');
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
                chat_id: chatId, message_id: msgId,
                text: info, parse_mode: 'HTML', disable_web_page_preview: true,
                reply_markup: { inline_keyboard: [[{ text: '← Back / Volver / Назад', callback_data: 'back:beaches' }]] },
            });
        }
        return;
    }

    if (data === 'back:beaches') {
        await tg(env, 'editMessageText', {
            chat_id: chatId, message_id: msgId,
            text: '🏖 <b>BEACHES / PLAYAS / ПЛЯЖИ</b>\n\nChoose a beach:', parse_mode: 'HTML',
            reply_markup: BEACH_KB,
        });
        return;
    }

    if (data.startsWith('events:')) {
        const cat = data.slice(7);
        const names = {
            music: '🎵 Music / Música / Музыка',
            art: '🎭 Art / Arte / Искусство',
            parties: '🍹 Parties / Fiestas / Вечеринки',
            sports: '🏃 Sports / Deporte / Спорт',
            wellness: '🧘 Wellness / Bienestar / Велнес',
            food: '🌮 Food Events / Gastronomía / Гастрономия',
        };
        await tg(env, 'editMessageText', {
            chat_id: chatId, message_id: msgId,
            text: `${names[cat] || cat}\n\n📅 Follow @pdchub for upcoming events!\n\n` +
                `• ${link('Eventbrite PDC', 'https://www.eventbrite.com.mx/d/mexico--playa-del-carmen/events')}\n` +
                `• ${link('Facebook Events PDC', 'https://www.facebook.com/events/explore/playa-del-carmen')}\n` +
                `• ${link('Xcaret events', 'https://www.xcaret.com/es')}`,
            parse_mode: 'HTML', disable_web_page_preview: true,
            reply_markup: { inline_keyboard: [[{ text: '← Back / Volver / Назад', callback_data: 'back:events' }]] },
        });
        return;
    }

    if (data === 'back:events') {
        await tg(env, 'editMessageText', {
            chat_id: chatId, message_id: msgId,
            text: '🎉 <b>EVENTS / EVENTOS / СОБЫТИЯ</b>\n\nChoose a category:',
            parse_mode: 'HTML', reply_markup: EVENTS_KB,
        });
    }
}

// ---------- main ----------

export default {
    async fetch(request, env) {
        if (!env.TELEGRAM_BOT_TOKEN) {
            return new Response('TELEGRAM_BOT_TOKEN not configured', { status: 500 });
        }

        const url = new URL(request.url);

        if (url.pathname === '/') {
            return new Response(JSON.stringify({
                status: 'ok', service: 'Playa del Carmen Hub Bot', version: '2.0.0',
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (url.pathname !== '/webhook') return new Response('Not Found', { status: 404 });
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

        let update;
        try { update = await request.json(); }
        catch { return new Response('Bad Request', { status: 400 }); }

        try {
            if (update.message) await handleMessage(env, update.message);
            else if (update.callback_query) await handleCallbackQuery(env, update.callback_query);
        } catch (err) {
            console.error('Handler error:', err);
        }

        return new Response('OK');
    },
};
