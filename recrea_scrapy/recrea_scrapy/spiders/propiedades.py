"""
Propiedades.com Spider — Quintana Roo real estate developers & agencies
Uses scrapy-playwright to bypass Cloudflare/403 blocks.
"""
import scrapy
from scrapy_playwright.page import PageMethod
from recrea_scrapy.items import LeadItem

LOCATION_SLUGS = {
    "Playa del Carmen": "quintana-roo/playa-del-carmen",
    "Tulum":            "quintana-roo/tulum",
    "Cancun":           "quintana-roo/cancun",
    "Bacalar":          "quintana-roo/bacalar",
    "Puerto Morelos":   "quintana-roo/puerto-morelos",
    "Akumal":           "quintana-roo/akumal",
    "Cozumel":          "quintana-roo/cozumel",
    "Holbox":           "quintana-roo/holbox",
    "Mahahual":         "quintana-roo/mahahual",
}

class PropiedadesSpider(scrapy.Spider):
    name = "propiedades"
    base_url = "https://www.propiedades.com"

    def start_requests(self):
        for city, slug in LOCATION_SLUGS.items():
            yield scrapy.Request(
                f"{self.base_url}/{slug}/",
                callback=self.parse,
                meta={
                    "playwright": True,
                    "playwright_context": "default",
                    "playwright_page_methods": [
                        PageMethod("wait_for_load_state", "networkidle"),
                        PageMethod(
                            "wait_for_selector",
                            '[class*="listing"], [class*="property"], article',
                            timeout=20000,
                        ),
                    ],
                    "city": city,
                },
                errback=self.errback,
            )

    def parse(self, response):
        city = response.meta["city"]

        for card in response.css('[class*="listing-card"], [class*="property-card"], article.listing, [class*="PropertyCard"]'):
            agency  = card.css('[class*="agency"]::text, [class*="developer"]::text').get('').strip()
            agent   = card.css('[class*="agent"]::text, [class*="contact-name"]::text').get('').strip()
            title   = card.css('h2::text, h3::text').get('').strip()
            price   = card.css('[class*="price"]::text').get('').strip()
            phone   = card.css('[href^="tel:"]::attr(href)').get('').replace('tel:', '')
            email   = card.css('[href^="mailto:"]::attr(href)').get('').replace('mailto:', '')
            address = card.css('[class*="location"]::text, address::text').get('').strip()
            link    = card.css('a::attr(href)').get('')

            if not agency and not agent and not title:
                continue

            item = LeadItem()
            item['source']       = 'Propiedades.com'
            item['businessName'] = agency
            item['contactName']  = agent
            item['email']        = email
            item['phone']        = phone
            item['website']      = ''
            item['address']      = address
            item['city']         = city
            item['state']        = 'Quintana Roo'
            item['country']      = 'Mexico'
            item['category']     = 'Real Estate Developer/Agency'
            item['rating']       = ''
            item['description']  = f"{title} — {price}".strip(' — ')
            item['listingUrl']   = link if link.startswith('http') else f"{self.base_url}{link}"
            item['googleMapsUrl'] = ''
            item['tags']         = 'real-estate, propiedades-com'
            yield item

        next_page = response.css('a[rel="next"]::attr(href), [class*="next"] a::attr(href)').get()
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
        self.logger.error(f"[Propiedades] Request failed: {failure.request.url} — {failure.value}")
