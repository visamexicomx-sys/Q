"""
Vivanuncios.com.mx Spider — Real estate in Quintana Roo
Uses scrapy-playwright to bypass Cloudflare/403 blocks.
"""
import scrapy
from scrapy_playwright.page import PageMethod
from recrea_scrapy.items import LeadItem

LOCATION_URLS = {
    "Playa del Carmen": "/s-venta-inmuebles/playa-del-carmen/v1c1096l311p1",
    "Tulum":            "/s-venta-inmuebles/tulum/v1c1096l315p1",
    "Cancun":           "/s-venta-inmuebles/cancun/v1c1096l302p1",
    "Bacalar":          "/s-venta-inmuebles/bacalar/v1c1096l300p1",
    "Puerto Morelos":   "/s-venta-inmuebles/puerto-morelos/v1c1096l313p1",
    "Cozumel":          "/s-venta-inmuebles/cozumel/v1c1096l303p1",
    "Holbox":           "/s-venta-inmuebles/isla-holbox/v1c1096l307p1",
}

class VivanunciosSpider(scrapy.Spider):
    name = "vivanuncios"
    base_url = "https://www.vivanuncios.com.mx"

    def start_requests(self):
        for city, path in LOCATION_URLS.items():
            yield scrapy.Request(
                f"{self.base_url}{path}",
                callback=self.parse,
                meta={
                    "playwright": True,
                    "playwright_context": "default",
                    "playwright_page_methods": [
                        PageMethod("wait_for_load_state", "networkidle"),
                        PageMethod(
                            "wait_for_selector",
                            '[class*="postingCard"], .normal-ad, [class*="listing"]',
                            timeout=20000,
                        ),
                    ],
                    "city": city,
                },
                errback=self.errback,
            )

    def parse(self, response):
        city = response.meta["city"]

        for card in response.css('[class*="postingCard"], .normal-ad, [class*="Posting"]'):
            agency  = card.css('[class*="publisher"]::text, [class*="seller"]::text, [class*="Publisher"]::text').get('').strip()
            title   = card.css('h2::text, h3::text, [class*="title"]::text').get('').strip()
            price   = card.css('[class*="price"]::text, [class*="Price"]::text').get('').strip()
            phone   = card.css('[href^="tel:"]::attr(href)').get('').replace('tel:', '')
            address = card.css('[class*="location"]::text, [class*="address"]::text, [class*="Location"]::text').get('').strip()
            link    = card.css('a::attr(href)').get('')

            if not agency and not title:
                continue

            item = LeadItem()
            item['source']       = 'Vivanuncios'
            item['businessName'] = agency
            item['contactName']  = ''
            item['email']        = ''
            item['phone']        = phone
            item['website']      = ''
            item['address']      = address
            item['city']         = city
            item['state']        = 'Quintana Roo'
            item['country']      = 'Mexico'
            item['category']     = 'Real Estate'
            item['rating']       = ''
            item['description']  = f"{title} — {price}".strip(' — ')
            item['listingUrl']   = link if link.startswith('http') else f"{self.base_url}{link}"
            item['googleMapsUrl'] = ''
            item['tags']         = 'real-estate, vivanuncios'
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
        self.logger.error(f"[Vivanuncios] Request failed: {failure.request.url} — {failure.value}")
