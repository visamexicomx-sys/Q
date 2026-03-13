"""
Lamudi.com.mx Spider — Riviera Maya developers & agencies
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
    "Cozumel":          "cozumel",
    "Holbox":           "isla-holbox",
    "Mahahual":         "mahahual",
}

class LamudiSpider(scrapy.Spider):
    name = "lamudi"
    base_url = "https://www.lamudi.com.mx"

    def start_requests(self):
        for city, slug in LOCATION_SLUGS.items():
            url = f"{self.base_url}/quintana-roo/{slug}/buy/"
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
                            '[class*="ListingCell"], .js-listing-card, article',
                            timeout=20000,
                        ),
                    ],
                    "city": city,
                },
                errback=self.errback,
            )

    def parse(self, response):
        city = response.meta["city"]

        for card in response.css('[class*="ListingCell"], .js-listing-card, [class*="listing-card"]'):
            agency  = card.css('[class*="broker"]::text, [class*="agency"]::text').get('').strip()
            agent   = card.css('[class*="agent"]::text').get('').strip()
            phone   = card.css('[class*="phone"]::text, [href^="tel:"]::attr(href)').get('').replace('tel:', '').strip()
            title   = card.css('[class*="title"]::text, h2::text, h3::text').get('').strip()
            price   = card.css('[class*="FirstPrice"]::text, [class*="price"]::text').get('').strip()
            address = card.css('[class*="address"]::text, [class*="location"]::text').get('').strip()
            link    = card.css('a::attr(href)').get('')

            if not agency and not agent and not title:
                continue

            item = LeadItem()
            item['source']       = 'Lamudi'
            item['businessName'] = agency
            item['contactName']  = agent
            item['email']        = ''
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
            item['tags']         = 'real-estate, lamudi'
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
        self.logger.error(f"[Lamudi] Request failed: {failure.request.url} — {failure.value}")
