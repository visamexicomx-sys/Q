/**
 * Stealth browser configuration for PlaywrightCrawler.
 *
 * Bypasses common bot-detection (403 blocks) used by Mexican real estate
 * portals (Inmuebles24, Lamudi, Vivanuncios, Propiedades.com).
 */

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
];

function randomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Returns PlaywrightCrawler options that defeat basic bot detection.
 *
 * @param {object} [extra] - Extra options merged into the config
 * @returns {object}
 */
export function stealthCrawlerOptions(extra = {}) {
    return {
        // Random fingerprints built into Crawlee
        browserPoolOptions: {
            useFingerprints: true,
            fingerprintOptions: {
                fingerprintGeneratorOptions: {
                    browsers: ['chrome', 'firefox'],
                    devices: ['desktop'],
                    operatingSystems: ['windows', 'macos'],
                },
            },
        },

        launchContext: {
            userAgent: randomUA(),
            launchOptions: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                ],
            },
        },

        // Hook: inject stealth overrides before each page load
        preNavigationHooks: [
            async ({ page }) => {
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                });
                await page.addInitScript(() => {
                    // Hide automation signals
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                    Object.defineProperty(navigator, 'languages', { get: () => ['es-MX', 'es', 'en-US'] });
                    window.chrome = { runtime: {} };
                });
            },
        ],

        // Slow down to avoid rate-limiting
        maxConcurrency: 2,
        minConcurrency: 1,
        requestHandlerTimeoutSecs: 45,

        ...extra,
    };
}
