"""
Inmuebles24.com Spider — Real estate agencies & agents in Riviera Maya
Uses scrapy-playwright to bypass Cloudflare/403 blocks.
"""
import scrapy
from scrapy_playwright.page import PageMethod
from recrea_scrapy.items import LeadItem

LOCATION_SLUGS = {
    "Playa del Carmen": "playa-del-carmen",
    "Tulum":            "tulum",
    "Cancun":           "cancun",
    "Bacalar":          "bacalar",
    "Puerto Morelos":   "puerto-morelos",
    "Akumal":           "akumal",
    "Holbox":           "holbox",
    "Cozumel":          "cozumel",
    "Mahahual":         "mahahual",
}

class Inmuebles24Spider(scrapy.Spider):
    name = "inmuebles24"
    base_url = "https://www.inmuebles24.com"

    def start_requests(self):
        for city, slug in LOCATION_SLUGS.items():
            url = f"{self.base_url}/inmuebles-en-venta-en-{slug}.html"
            yield scrapy.Request(
                url,
                callback=self.parse,
                meta={
                    "playwright": True,
                    "playwright_context": "default",
                    "playwright_page_methods": [
                        PageMethod("wait_for_load_state", "networkidle"),
                        PageMethod(
                            "wait_for_selector",
                            '[data-qa="posting PROPERTY"], .posting-card, article',
                            timeout=20000,
                        ),
                    ],
                    "city": city,
                },
                errback=self.errback,
            )

    def parse(self, response):
        city = response.meta["city"]

        for card in response.css('[data-qa="posting PROPERTY"], .posting-card, article.avisoNormal'):
            agency  = card.css('[data-qa="posting-card-publisher-name"], .publisher-name').css('::text').get('').strip()
            agent   = card.css('[data-qa="posting-card-publisher-agent"], .agent-name').css('::text').get('').strip()
            phone   = card.css('[data-qa="posting-card-phone"], [href^="tel:"]').css('::text').get('').strip()
            title   = card.css('[data-qa="posting-card-title"], h2, h3').css('::text').get('').strip()
            price   = card.css('[data-qa="posting-card-price"], .price').css('::text').get('').strip()
            address = card.css('[data-qa="posting-card-location"], .address').css('::text').get('').strip()
            link    = card.css('a::attr(href)').get('')

            if not agency and not agent:
                continue

            item = LeadItem()
            item['source']       = 'Inmuebles24'
            item['businessName'] = agency
            item['contactName']  = agent
            item['email']        = ''
            item['phone']        = phone
            item['website']      = ''
            item['address']      = address
            item['city']         = city
            item['state']        = 'Quintana Roo'
            item['country']      = 'Mexico'
            item['category']     = 'Real Estate Agency'
            item['rating']       = ''
            item['description']  = f"{title} — {price}".strip(' — ')
            item['listingUrl']   = link if link.startswith('http') else f"{self.base_url}{link}"
            item['googleMapsUrl'] = ''
            item['tags']         = 'real-estate, inmuebles24'
            yield item

        # Pagination
        next_page = response.css('[data-qa="PAGING_NEXT"] a::attr(href), a[rel="next"]::attr(href)').get()
        if next_page:
            yield response.follow(
                next_page,
                self.parse,
                meta={
                    "playwright": True,
                    "playwright_context": "default",
                    "playwright_page_methods": [
                        PageMethod("wait_for_load_state", "networkidle"),
                    ],
                    "city": city,
                },
                errback=self.errback,
            )

    def errback(self, failure):
        self.logger.error(f"[Inmuebles24] Request failed: {failure.request.url} — {failure.value}")
