/**
 * Vivanuncios.com.mx Scraper (stealth edition)
 */

import { PlaywrightCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
import { stealthCrawlerOptions } from '../utils/stealth.js';

const BASE_URL = 'https://www.vivanuncios.com.mx';

const LOCATION_URLS = {
    'Playa del Carmen': '/s-venta-inmuebles/playa-del-carmen/v1c1096l311p1',
    'Tulum':            '/s-venta-inmuebles/tulum/v1c1096l315p1',
    'Cancun':           '/s-venta-inmuebles/cancun/v1c1096l302p1',
    'Bacalar':          '/s-venta-inmuebles/bacalar/v1c1096l300p1',
    'Puerto Morelos':   '/s-venta-inmuebles/puerto-morelos/v1c1096l313p1',
    'Cozumel':          '/s-venta-inmuebles/cozumel/v1c1096l303p1',
    'Holbox':           '/s-venta-inmuebles/isla-holbox/v1c1096l307p1',
};

export async function scrapeVivanuncios({ locations, maxLeadsPerSource }) {
    const leads = [];

    const startUrls = locations
        .filter(loc => LOCATION_URLS[loc])
        .map(loc => ({ url: `${BASE_URL}${LOCATION_URLS[loc]}`, userData: { city: loc } }));

    const crawler = new PlaywrightCrawler({
        ...stealthCrawlerOptions({ maxRequestsPerCrawl: startUrls.length * 2 }),

        async requestHandler({ page, request }) {
            const { city } = request.userData;
            await page.waitForSelector('[class*="postingCard"], .normal-ad, .sc-card-description', { timeout: 20000 }).catch(() => {});

            const html = await page.content();
            const $ = cheerio.load(html);

            $('[class*="postingCard"], .normal-ad, .sc-card-description').each((_, el) => {
                const agency  = $(el).find('[class*="publisher"], [class*="agency"], [class*="seller"]').first().text().trim();
                const title   = $(el).find('h2, h3, [class*="title"]').first().text().trim();
                const price   = $(el).find('[class*="price"], .price').first().text().trim();
                const phone   = $(el).find('[href^="tel:"]').attr('href')?.replace('tel:', '') ?? '';
                const address = $(el).find('[class*="location"], [class*="address"]').first().text().trim();
                const link    = $(el).find('a').first().attr('href') ?? '';

                if (!agency && !title) return;

                leads.push({
                    source: 'Vivanuncios',
                    businessName: agency,
                    contactName: '',
                    email: '',
                    phone,
                    website: '',
                    address,
                    city,
                    state: 'Quintana Roo',
                    country: 'Mexico',
                    category: 'Real Estate',
                    rating: '',
                    reviewCount: 0,
                    googleMapsUrl: '',
                    description: `${title} — ${price}`.trim(),
                    listingUrl: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    tags: 'real-estate, vivanuncios',
                });
            });
        },

        failedRequestHandler({ request, error }) {
            console.warn(`  [Vivanuncios] Failed: ${request.url} — ${error.message}`);
        },
    });

    await crawler.run(startUrls.map(r => r.url));
    return dedup(leads).slice(0, maxLeadsPerSource);
}

function dedup(leads) {
    const seen = new Set();
    return leads.filter(l => {
        const key = `${l.businessName}|${l.description}|${l.city}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
